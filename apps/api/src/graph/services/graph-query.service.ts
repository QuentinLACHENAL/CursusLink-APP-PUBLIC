import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Neo4jService } from '../../neo4j/neo4j.service';
import { migrateNodeType } from '../dto/graph.dto';

@Injectable()
export class GraphQueryService {
  private readonly logger = new Logger(GraphQueryService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  async getGraph(userId?: string) {
    const cypher = `
      MATCH (n)
      WHERE NOT n:User
      OPTIONAL MATCH (n)-[r]->(m)
      WHERE NOT m:User
      RETURN n, r, m
    `;

    const masteryCypher = userId ? `
      MATCH (u:User {id: $userId})-[r:MASTERED]->(n)
      RETURN n.id as masteredId, r.score as score, r.xpAwarded as xpAwarded
    ` : null;

    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(cypher);
      
      const masteryMap = new Map();
      if (userId && masteryCypher) {
        const masteryResult = await session.run(masteryCypher, { userId });
        masteryResult.records.forEach(r => {
          const scoreVal = r.get('score');
          const xpVal = r.get('xpAwarded');
          
          masteryMap.set(r.get('masteredId'), {
            score: scoreVal && scoreVal.low !== undefined ? scoreVal.low : scoreVal,
            xpAwarded: xpVal && xpVal.low !== undefined ? xpVal.low : xpVal
          });
        });
      }

      const cleanNodeProperties = (props: any) => {
        const cleaned: any = {};
        for (const key in props) {
          const val = props[key];
          if (val && typeof val === 'object' && 'low' in val && 'high' in val) {
            cleaned[key] = val.low;
          } else {
            cleaned[key] = val;
          }
        }
        // Migrate type to new hierarchy system
        if (cleaned.type) {
          cleaned.type = migrateNodeType(cleaned.type);
        }
        // Ensure constellation field exists (fallback to galaxy for retrocompat)
        if (!cleaned.constellation && cleaned.galaxy) {
          cleaned.constellation = cleaned.galaxy;
        }
        return cleaned;
      };

      const nodesMap = new Map();
      const links: any[] = [];

      result.records.forEach((record) => {
        const sourceNodeRaw = record.get('n').properties;
        const sourceNode = cleanNodeProperties(sourceNodeRaw);
        
        const targetNodeRaw = record.get('m')?.properties;
        const targetNode = targetNodeRaw ? cleanNodeProperties(targetNodeRaw) : null;
        const rel = record.get('r');

        if (!nodesMap.has(sourceNode.id)) {
          const mastery = masteryMap.get(sourceNode.id);
          nodesMap.set(sourceNode.id, { 
            ...sourceNode, 
            labels: record.get('n').labels,
            isMastered: !!mastery,
            score: mastery?.score,
            xpAwarded: mastery?.xpAwarded
          });
        }

        if (targetNode) {
            if (!nodesMap.has(targetNode.id)) {
            const mastery = masteryMap.get(targetNode.id);
            nodesMap.set(targetNode.id, { 
                ...targetNode, 
                labels: record.get('m').labels,
                isMastered: !!mastery,
                score: mastery?.score,
                xpAwarded: mastery?.xpAwarded
            });
            }
        }

        if (rel && targetNode) {
            links.push({
            source: sourceNode.id,
            target: targetNode.id,
            type: rel.type,
            });
        }
      });

      // Calcul du déblocage basé sur les relations UNLOCKS (prérequis directs)
      const nodes = Array.from(nodesMap.values());

      if (userId) {
        // Construire une map des parents pour chaque nœud (qui UNLOCK ce nœud)
        // links: { source: parentId, target: childId, type: 'UNLOCKS' }
        const parentsByNode: Map<string, string[]> = new Map();

        links.forEach(link => {
          if (link.type === 'UNLOCKS') {
            const childId = link.target;
            if (!parentsByNode.has(childId)) {
              parentsByNode.set(childId, []);
            }
            parentsByNode.get(childId)!.push(link.source);
          }
        });

        // Calculer isUnlocked pour chaque nœud
        nodes.forEach(node => {
          const parents = parentsByNode.get(node.id) || [];

          if (parents.length === 0) {
            // Nœud racine (pas de prérequis) → débloqué
            node.isUnlocked = true;
          } else {
            // Récupérer les nœuds parents
            const parentNodes = parents
              .map(parentId => nodesMap.get(parentId))
              .filter(n => n !== undefined);

            if (parentNodes.length === 0) {
              // Parents non trouvés (données corrompues) → bloqué par sécurité
              this.logger.warn(`Node ${node.id} has missing parent references`);
              node.isUnlocked = false;
            } else {
              // Vérifier la condition de déblocage (AND par défaut, OR si spécifié)
              const unlockCondition = node.unlockCondition || 'AND';

              if (unlockCondition === 'OR') {
                // Au moins UN parent doit être maîtrisé
                node.isUnlocked = parentNodes.some(p => p.isMastered === true);
              } else {
                // TOUS les parents doivent être maîtrisés (AND)
                node.isUnlocked = parentNodes.every(p => p.isMastered === true);
              }
            }
          }
        });

        // Log pour debug
        const lockedCount = nodes.filter(n => !n.isUnlocked).length;
        const unlockedCount = nodes.filter(n => n.isUnlocked).length;
        this.logger.debug(`Unlock calculation: ${unlockedCount} unlocked, ${lockedCount} locked for user ${userId}`);
      }

      return {
        nodes: nodes,
        links: links,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch graph: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch graph: ' + error.message);
    } finally {
      await session.close();
    }
  }

  async getNodeById(nodeId: string) {
    const session = this.neo4jService.getReadSession();
    try {
        const result = await session.run(`
            MATCH (n {id: $nodeId})
            OPTIONAL MATCH (n)-[:HAS_EXERCISE]->(e:Exercise)
            RETURN n, e
        `, { nodeId });
        
        if (result.records.length === 0) return null;
        
        const nodeProps = result.records[0].get('n').properties;
        const exerciseNode = result.records[0].get('e');
        
        // Si un exercice lié existe, on surcharge les propriétés locales (pour rétrocompatibilité frontend)
        if (exerciseNode) {
            const exerciseProps = exerciseNode.properties;
            nodeProps.exerciseType = exerciseProps.type;
            nodeProps.exerciseData = exerciseProps.data;
            nodeProps.exerciseId = exerciseProps.id;
        }
        
        return nodeProps;
    } finally {
        await session.close();
    }
  }

  async getGalaxyStructure() {
    // Renamed to constellations but keeping backward compat
    const cypher = `
      MATCH (n)
      WHERE n.id <> 'ROOT_START'
      OPTIONAL MATCH (n)-[:UNLOCKS]->(target)
      RETURN n, collect(target.id) as unlocksIds
      ORDER BY n.group, n.level
    `;
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(cypher);

      const nodes = result.records.map(r => {
        const props = r.get('n').properties;
        // Attach unlocksIds
        props.unlocksIds = r.get('unlocksIds') || [];
        
        // Migrate type
        if (props.type) {
          props.type = migrateNodeType(props.type);
        }
        return props;
      });
      
      // Structure: constellations > stars > planets
      const constellations: any = {};

      nodes.forEach(node => {
          const constellationName = node.constellation || node.galaxy || 'Général';
          if (!constellations[constellationName]) {
            constellations[constellationName] = { name: constellationName, groups: {}, stars: {} };
          }
          
          // Group by parentStar for new hierarchy, or by group for legacy
          const groupKey = node.parentStar || node.group || 'Non classé';
          if (!constellations[constellationName].groups[groupKey]) {
              constellations[constellationName].groups[groupKey] = { name: groupKey, nodes: [] };
          }
          
          constellations[constellationName].groups[groupKey].nodes.push(node);
      });

      return constellations;
    } finally {
      await session.close();
    }
  }

  async getNodeExercise(id: string) {
    const session = this.neo4jService.getReadSession();
    try {
      // Query both Skill AND Project nodes (not just Skill)
      const result = await session.run(`
        MATCH (n {id: $id})
        WHERE n:Skill OR n:Project
        RETURN n.exerciseType as type, n.exerciseData as data, n.exerciseUpdatedAt as updatedAt
      `, { id });

      if (result.records.length === 0) {
        return { type: 'none', data: null };
      }

      const record = result.records[0];
      return {
        type: record.get('type') || 'none',
        data: record.get('data'),
        updatedAt: record.get('updatedAt')
      };
    } finally {
      await session.close();
    }
  }

  async getStats() {
    const session = this.neo4jService.getReadSession();
    try {
        const result = await session.run(`
            OPTIONAL MATCH (u:User)
            WITH count(u) as usersCount,
                 count(case when u.role='STUDENT' then 1 end) as studentsCount,
                 count(case when u.role='ADMIN' OR u.role='PROF' then 1 end) as adminsCount
            OPTIONAL MATCH (n) WHERE NOT n:User
            WITH usersCount, studentsCount, adminsCount,
                 count(n) as nodesCount,
                 count(case when n.type='topic' then 1 end) as topicsCount,
                 count(case when n.type='Project' OR n.type='exercise' then 1 end) as projectsCount
            OPTIONAL MATCH ()-[r:MASTERED]->()
            RETURN usersCount, studentsCount, adminsCount, nodesCount, topicsCount, projectsCount, count(r) as validationsCount
        `);
        
        const record = result.records[0];
        if (!record) {
            return {
                usersCount: 0,
                studentsCount: 0,
                adminsCount: 0,
                nodesCount: 0,
                topicsCount: 0,
                projectsCount: 0,
                validationsCount: 0
            };
        }
        const toInt = (val: any) => val && val.low !== undefined ? val.low : val;

        return {
            usersCount: toInt(record.get('usersCount')),
            studentsCount: toInt(record.get('studentsCount')),
            adminsCount: toInt(record.get('adminsCount')),
            nodesCount: toInt(record.get('nodesCount')),
            topicsCount: toInt(record.get('topicsCount')),
            projectsCount: toInt(record.get('projectsCount')),
            validationsCount: toInt(record.get('validationsCount'))
        };
    } finally {
        await session.close();
    }
  }
}
