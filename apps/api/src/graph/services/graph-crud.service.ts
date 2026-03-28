import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Neo4jService } from '../../neo4j/neo4j.service';
import { migrateNodeType, NODE_TYPE_MIGRATION, VALID_RELATIONSHIP_TYPES, RelationshipType } from '../dto/graph.dto';

// Réutilise les types du DTO pour éviter la duplication
function isValidRelationshipType(type: string): type is RelationshipType {
  return (VALID_RELATIONSHIP_TYPES as readonly string[]).includes(type);
}

// Détermine le label Neo4j selon le type de nœud
function getNodeLabel(type: string): string {
  const migratedType = migrateNodeType(type);
  switch (migratedType) {
    case 'blackhole': return 'BlackHole';
    case 'constellation': return 'Constellation';
    case 'star': return 'Star';
    case 'planet': return 'Planet';
    case 'satellite': return 'Satellite';
    case 'project': return 'Project';
    default: return 'Skill'; // Fallback
  }
}

@Injectable()
export class GraphCrudService {
  private readonly logger = new Logger(GraphCrudService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  async createNode(data: any) {
    const {
      id, label, type, group, galaxy, xp, level, unlockCondition,
      exerciseDescription, evaluationGrid, gradingGrid, minimumScore,
      courseContent, exerciseType, exerciseData, fx, fy, visualConfig,
      constellation, parentStar, orbitRing, unlockedBy,
      validationType, peerValidationConfig
    } = data;
    
    // Migration du type vers le nouveau système
    // Si orbitRing = 0, c'est l'étoile centrale, on force le type 'star'
    let migratedType = migrateNodeType(type || 'planet');
    if (orbitRing === 0) {
      migratedType = 'star';
    }

    // Détermine le label Neo4j (pour rétrocompatibilité, on garde aussi Skill/Project)
    const nodeLabel = type === 'Project' || migratedType === 'project' ? 'Project' : 'Skill';
    
    const generatedId = id || `${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`;
    
    const session = this.neo4jService.getWriteSession();
    try {
        // Step 1: Create the node
        const createNodeCypher = `
          CREATE (n:${nodeLabel} {
            id: $id,
            label: $label,
            group: $group,
            galaxy: $galaxy,
            constellation: $constellation,
            parentStar: $parentStar,
            orbitRing: $orbitRing,
            level: $level,
            type: $type,
            xp: $xp,
            unlockCondition: $unlockCondition,
            exerciseDescription: $exerciseDescription,
            evaluationGrid: $evaluationGrid,
            gradingGrid: $gradingGrid,
            minimumScore: $minimumScore,
            courseContent: $courseContent,
            exerciseType: $exerciseType,
            exerciseData: $exerciseData,
            visualConfig: $visualConfig,
            validationType: $validationType,
            peerValidationConfig: $peerValidationConfig,
            fx: $fx,
            fy: $fy
          })
          RETURN n
        `;
        
        const params = {
          id: generatedId,
          label,
          group: group || 'common',
          galaxy: galaxy || constellation || 'Default',
          constellation: constellation || galaxy || 'Default',
          parentStar: parentStar || null,
          orbitRing: orbitRing ?? 1, // Par défaut cercle 1 (0 = étoile centrale)
          level: level || 1,
          type: migratedType,
          xp: xp ?? 100,
          unlockCondition: unlockCondition || 'AND',
          exerciseDescription: exerciseDescription || '',
          evaluationGrid: evaluationGrid || '',
          gradingGrid: gradingGrid || '',
          minimumScore: minimumScore || 80,
          courseContent: courseContent || '',
          exerciseType: exerciseType || 'none',
          exerciseData: exerciseData || '',
          visualConfig: visualConfig ? JSON.stringify(visualConfig) : '',
          validationType: validationType || 'auto',
          peerValidationConfig: peerValidationConfig || '',
          fx: fx ?? null,
          fy: fy ?? null
        };
        
        const result = await session.run(createNodeCypher, params);
        
        if (!result.records || result.records.length === 0) {
          throw new Error('Failed to create node - no record returned');
        }
        
        const createdNode = result.records[0].get('n').properties;
        
        // Step 2: Create linked Exercise node if type is valid (separate query)
        if (exerciseType && exerciseType !== 'none') {
          const createExerciseCypher = `
            MATCH (n {id: $nodeId})
            CREATE (e:Exercise {
              id: $exerciseId,
              type: $exerciseType,
              data: $exerciseData,
              createdAt: datetime()
            })
            CREATE (n)-[:HAS_EXERCISE]->(e)
            RETURN e
          `;
          
          await session.run(createExerciseCypher, {
            nodeId: generatedId,
            exerciseId: `${generatedId}_exo_${Date.now()}`,
            exerciseType: exerciseType,
            exerciseData: exerciseData || ''
          });
        }
        
        // Step 3: Create UNLOCKS relationship if unlockedBy is specified
        if (unlockedBy) {
          const createUnlockCypher = `
            MATCH (source {id: $sourceId})
            MATCH (target {id: $targetId})
            MERGE (source)-[:UNLOCKS]->(target)
            RETURN source, target
          `;
          
          await session.run(createUnlockCypher, {
            sourceId: unlockedBy,
            targetId: generatedId
          });
          
          this.logger.log(`Created UNLOCKS relationship: ${unlockedBy} -> ${generatedId}`);
        }
        
        return createdNode;
    } finally {
        await session.close();
    }
  }

  async updateNode(id: string, data: any) {
    const getSession = this.neo4jService.getReadSession();
    let existingNode: any = {};
    
    try {
      const result = await getSession.run('MATCH (n {id: $id}) RETURN n', { id });
      if (result.records.length > 0) {
        existingNode = result.records[0].get('n').properties;
      }
    } finally {
      await getSession.close();
    }
    
    // Migration du type si fourni
    const rawType = data.type ?? existingNode.type ?? 'planet';
    const migratedType = migrateNodeType(rawType);
    
    // Determine labels for safe migration
    const oldType = existingNode.type ?? 'planet';
    const oldLabel = getNodeLabel(oldType);
    const newLabel = getNodeLabel(migratedType);

    const merged = {
      label: data.label ?? existingNode.label,
      group: data.group ?? existingNode.group,
      galaxy: data.galaxy ?? data.constellation ?? existingNode.galaxy ?? existingNode.constellation ?? 'Default',
      constellation: data.constellation ?? data.galaxy ?? existingNode.constellation ?? existingNode.galaxy ?? 'Default',
      parentStar: data.parentStar ?? existingNode.parentStar ?? null,
      orbitRing: data.orbitRing ?? existingNode.orbitRing ?? 1,
      xp: data.xp ?? existingNode.xp ?? 100,
      level: data.level ?? existingNode.level ?? 1,
      type: migratedType,
      unlockCondition: data.unlockCondition ?? existingNode.unlockCondition ?? 'AND',
      exerciseDescription: data.exerciseDescription ?? existingNode.exerciseDescription ?? '',
      evaluationGrid: data.evaluationGrid ?? existingNode.evaluationGrid ?? '',
      gradingGrid: data.gradingGrid ?? existingNode.gradingGrid ?? '',
      minimumScore: data.minimumScore ?? existingNode.minimumScore ?? 80,
      courseContent: data.courseContent ?? existingNode.courseContent ?? '',
      exerciseType: data.exerciseType ?? existingNode.exerciseType ?? 'none',
      exerciseData: data.exerciseData ?? existingNode.exerciseData ?? '',
      visualConfig: data.visualConfig ? JSON.stringify(data.visualConfig) : (existingNode.visualConfig ?? ''),
      validationType: data.validationType ?? existingNode.validationType ?? 'auto',
      peerValidationConfig: data.peerValidationConfig ?? existingNode.peerValidationConfig ?? ''
    };
    
    const cypher = `
      MATCH (n {id: $id})
      REMOVE n:${oldLabel}
      SET n:${newLabel}
      SET n.label = $label,
          n.group = $group,
          n.galaxy = $galaxy,
          n.constellation = $constellation,
          n.parentStar = $parentStar,
          n.orbitRing = $orbitRing,
          n.xp = $xp,
          n.level = $level,
          n.type = $type,
          n.unlockCondition = $unlockCondition,
          n.exerciseDescription = $exerciseDescription,
          n.evaluationGrid = $evaluationGrid,
          n.gradingGrid = $gradingGrid,
          n.minimumScore = $minimumScore,
          n.courseContent = $courseContent,
          n.exerciseType = $exerciseType,
          n.exerciseData = $exerciseData,
          n.visualConfig = $visualConfig,
          n.validationType = $validationType,
          n.peerValidationConfig = $peerValidationConfig

      // Sync linked Exercise node
      WITH n
      OPTIONAL MATCH (n)-[:HAS_EXERCISE]->(e:Exercise)
      FOREACH (_ IN CASE WHEN e IS NOT NULL THEN [1] ELSE [] END |
          SET e.data = $exerciseData, e.type = $exerciseType, e.updatedAt = datetime()
      )

      RETURN n
    `;

    const session = this.neo4jService.getWriteSession();
    try {
        const result = await session.run(cypher, { 
            id,
            ...merged
        });
        if (result.records.length === 0) throw new InternalServerErrorException('Node not found');
        return result.records[0].get('n').properties;
    } finally {
        await session.close();
    }
  }

  /**
   * Supprime un noeud et cascade:
   * 1. Supprime les exercices liés
   * 2. Recalcule l'XP des utilisateurs affectés (évite le "Phantom XP")
   * 
   * @throws NotFoundException si le noeud n'existe pas
   * @throws InternalServerErrorException si la transaction échoue
   */
  async deleteNode(nodeId: string) {
    const session = this.neo4jService.getWriteSession();
    const txc = session.beginTransaction();
    
    try {
      // 0. Vérifier que le noeud existe
      const existsResult = await txc.run(
        `MATCH (n {id: $nodeId}) RETURN n.label as label`,
        { nodeId }
      );
      
      if (existsResult.records.length === 0) {
        await txc.rollback();
        throw new NotFoundException(`Node with id "${nodeId}" not found`);
      }
      
      const nodeLabel = existsResult.records[0].get('label');
      this.logger.log(`Deleting node "${nodeLabel}" (${nodeId})`);
      
      // 1. Identifier les utilisateurs affectés AVANT suppression
      const findUsersQuery = `
        MATCH (u:User)-[r:MASTERED]->(n {id: $nodeId})
        RETURN u.id as userId, r.xpAwarded as xpAwarded
      `;
      const userResult = await txc.run(findUsersQuery, { nodeId });
      const affectedUsers = userResult.records.map(r => ({
        userId: r.get('userId'),
        xpToDeduct: r.get('xpAwarded')?.low ?? r.get('xpAwarded') ?? 0
      }));
      
      if (affectedUsers.length > 0) {
        this.logger.log(`Node deletion will affect ${affectedUsers.length} user(s)`);
      }

      // 2. Suppression en cascade: Node + Exercices liés
      // DETACH DELETE supprime automatiquement toutes les relations
      const deleteQuery = `
        MATCH (n {id: $nodeId})
        OPTIONAL MATCH (n)-[:HAS_EXERCISE]->(e:Exercise)
        WITH n, collect(e) as exercises
        DETACH DELETE n
        FOREACH (ex IN exercises | DETACH DELETE ex)
        RETURN count(*) as deleted
      `;
      await txc.run(deleteQuery, { nodeId });

      // 3. Recalculer l'XP pour chaque utilisateur affecté
      // Utilise une approche "recalcul total" pour éviter les inconsistances
      const recalcQuery = `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[r:MASTERED]->()
        WITH u, sum(coalesce(r.xpAwarded, 0)) as totalXp
        SET u.xp = totalXp
        RETURN u.xp as newXp
      `;
      
      for (const { userId, xpToDeduct } of affectedUsers) {
        const result = await txc.run(recalcQuery, { userId });
        const newXp = result.records[0]?.get('newXp');
        this.logger.debug(`User ${userId}: deducted ${xpToDeduct} XP, new total: ${newXp?.low ?? newXp}`);
      }

      // 4. Commit de la transaction atomique
      await txc.commit();
      
      return { 
        success: true, 
        deletedNode: nodeLabel,
        affectedUsers: affectedUsers.length 
      };
      
    } catch (error) {
      // Rollback en cas d'erreur
      await txc.rollback();
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Failed to delete node ${nodeId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete node: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  async deleteGalaxy(galaxyName: string) {
    const session = this.neo4jService.getWriteSession();
    const txc = session.beginTransaction();
    
    try {
      this.logger.log(`Deleting galaxy/constellation "${galaxyName}"`);
      
      // 1. Identifier les utilisateurs affectés (pour recalcul XP)
      const findUsersQuery = `
        MATCH (u:User)-[r:MASTERED]->(n)
        WHERE n.galaxy = $galaxyName OR n.constellation = $galaxyName
        RETURN distinct u.id as userId
      `;
      const userResult = await txc.run(findUsersQuery, { galaxyName });
      const affectedUserIds = userResult.records.map(r => r.get('userId'));

      // 2. Suppression de masse
      const deleteQuery = `
        MATCH (n)
        WHERE n.galaxy = $galaxyName OR n.constellation = $galaxyName
        OPTIONAL MATCH (n)-[:HAS_EXERCISE]->(e:Exercise)
        WITH n, e
        DETACH DELETE n, e
        RETURN count(n) as deletedNodes
      `;
      const deleteResult = await txc.run(deleteQuery, { galaxyName });
      const deletedCount = deleteResult.records[0].get('deletedNodes').low || deleteResult.records[0].get('deletedNodes');

      // 3. Recalcul de l'XP en batch
      if (affectedUserIds.length > 0) {
        this.logger.log(`Recalculating XP for ${affectedUserIds.length} users...`);
        const recalcQuery = `
          UNWIND $userIds as userId
          MATCH (u:User {id: userId})
          OPTIONAL MATCH (u)-[r:MASTERED]->()
          WITH u, sum(coalesce(r.xpAwarded, 0)) as totalXp
          SET u.xp = totalXp
        `;
        await txc.run(recalcQuery, { userIds: affectedUserIds });
      }

      await txc.commit();
      return { success: true, deletedCount };
    } catch (error) {
      await txc.rollback();
      this.logger.error(`Failed to delete galaxy ${galaxyName}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete galaxy: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  async deleteSystem(galaxyName: string, systemName: string) {
    const session = this.neo4jService.getWriteSession();
    const txc = session.beginTransaction();
    
    try {
      this.logger.log(`Deleting system "${systemName}" in galaxy "${galaxyName}"`);
      
      // 1. Identifier les utilisateurs affectés
      const findUsersQuery = `
        MATCH (u:User)-[r:MASTERED]->(n)
        WHERE (n.galaxy = $galaxyName OR n.constellation = $galaxyName) 
          AND (n.group = $systemName)
        RETURN distinct u.id as userId
      `;
      const userResult = await txc.run(findUsersQuery, { galaxyName, systemName });
      const affectedUserIds = userResult.records.map(r => r.get('userId'));

      // 2. Suppression de masse
      const deleteQuery = `
        MATCH (n)
        WHERE (n.galaxy = $galaxyName OR n.constellation = $galaxyName) 
          AND (n.group = $systemName)
        OPTIONAL MATCH (n)-[:HAS_EXERCISE]->(e:Exercise)
        WITH n, e
        DETACH DELETE n, e
        RETURN count(n) as deletedNodes
      `;
      const deleteResult = await txc.run(deleteQuery, { galaxyName, systemName });
      const deletedCount = deleteResult.records[0].get('deletedNodes').low || deleteResult.records[0].get('deletedNodes');

      // 3. Recalcul XP en batch
      if (affectedUserIds.length > 0) {
        const recalcQuery = `
          UNWIND $userIds as userId
          MATCH (u:User {id: userId})
          OPTIONAL MATCH (u)-[r:MASTERED]->()
          WITH u, sum(coalesce(r.xpAwarded, 0)) as totalXp
          SET u.xp = totalXp
        `;
        await txc.run(recalcQuery, { userIds: affectedUserIds });
      }

      await txc.commit();
      return { success: true, deletedCount };
    } catch (error) {
      await txc.rollback();
      this.logger.error(`Failed to delete system ${systemName}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete system: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Nettoie les exercices orphelins (sans noeud parent)
   * À exécuter périodiquement ou après migration
   */
  async cleanupOrphanedExercises(): Promise<{ deleted: number }> {
    const session = this.neo4jService.getWriteSession();
    try {
      const result = await session.run(`
        MATCH (e:Exercise)
        WHERE NOT ()-[:HAS_EXERCISE]->(e)
        WITH e, e.id as exId
        DELETE e
        RETURN count(*) as deleted
      `);
      
      const deleted = result.records[0]?.get('deleted')?.low ?? 0;
      this.logger.log(`Cleaned up ${deleted} orphaned exercise(s)`);
      
      return { deleted };
    } finally {
      await session.close();
    }
  }

  async repairNodeLabels() {
    const session = this.neo4jService.getWriteSession();
    try {
        // Retrieve all nodes with a 'type' property
        const result = await session.run(`MATCH (n) WHERE n.type IS NOT NULL RETURN n.id as id, n.type as type`);
        
        let count = 0;
        for (const record of result.records) {
            const id = record.get('id');
            const type = record.get('type');
            const label = getNodeLabel(type);
            
            // Remove all hierarchy labels and set the correct one
            // We keep 'Skill' or 'Project' as base labels if needed, but for now we enforce the specific label
            // Note: getNodeLabel returns 'Skill' as fallback.
            
            // Safer approach: Remove specific known labels, then add new one
            // We assume nodes don't have multiple structural labels
            const allLabels = ['BlackHole', 'Constellation', 'Star', 'Planet', 'Satellite', 'Project', 'Skill'];
            const labelsToRemove = allLabels.filter(l => l !== label);
            
            // Construct query dynamically? No, allow Neo4j to handle removing non-existent labels
            // Cypher: REMOVE n:A:B:C SET n:D
            
            await session.run(`
                MATCH (n {id: $id})
                REMOVE n:${labelsToRemove.join(':')}
                SET n:${label}
            `, { id });
            
            count++;
        }
        return { repaired: count };
    } finally {
        await session.close();
    }
  }

  async createRelationship(sourceId: string, targetId: string, type: string) {
    // Validation du type de relation pour éviter l'injection Cypher
    if (!isValidRelationshipType(type)) {
      throw new BadRequestException(
        `Type de relation invalide: ${type}. Types autorisés: ${VALID_RELATIONSHIP_TYPES.join(', ')}`
      );
    }
    
    const cypher = `
      MATCH (a {id: $sourceId}), (b {id: $targetId})
      MERGE (a)-[r:${type}]->(b)
      RETURN r
    `;
    const session = this.neo4jService.getWriteSession();
    try {
        await session.run(cypher, { sourceId, targetId });
        return { success: true };
    } finally {
        await session.close();
    }
  }

  async deleteRelationship(sourceId: string, targetId: string, type: string) {
    // Validation du type de relation pour éviter l'injection Cypher
    if (!isValidRelationshipType(type)) {
      throw new BadRequestException(
        `Type de relation invalide: ${type}. Types autorisés: ${VALID_RELATIONSHIP_TYPES.join(', ')}`
      );
    }
    
    const cypher = `
      MATCH (a {id: $sourceId})-[r:${type}]->(b {id: $targetId})
      DELETE r
    `;
    const session = this.neo4jService.getWriteSession();
    try {
        await session.run(cypher, { sourceId, targetId });
        return { success: true, message: 'Relation supprimée' };
    } finally {
        await session.close();
    }
  }

  async updatePositions(positions: { id: string, x: number, y: number }[]) {
    const session = this.neo4jService.getWriteSession();
    try {
        for (const pos of positions) {
            await session.run(
                `MATCH (n {id: $id}) SET n.fx = $x, n.fy = $y`,
                { id: pos.id, x: pos.x, y: pos.y }
            );
        }
        return { success: true };
    } finally {
        await session.close();
    }
  }

  async resetPositions() {
    const cypher = `MATCH (n) REMOVE n.fx, n.fy, n.x, n.y`;
    const session = this.neo4jService.getWriteSession();
    try {
      await session.run(cypher);
      return { success: true };
    } finally {
      await session.close();
    }
  }

  /**
   * Valide une compétence pour un utilisateur.
   * SÉCURITÉ: Vérifie que le nœud est débloqué avant d'accorder l'XP.
   */
  async validateSkill(userId: string, skillId: string, xpReward: number) {
    this.logger.log(`validateSkill: user=${userId}, skill=${skillId}, xp=${xpReward}`);

    const session = this.neo4jService.getWriteSession();
    try {
      // ÉTAPE 1: Vérifier que le nœud est débloqué pour cet utilisateur
      // Un nœud est débloqué si TOUS ses parents (via UNLOCKS) sont maîtrisés par l'utilisateur
      const unlockCheckCypher = `
        MATCH (s {id: $skillId})
        OPTIONAL MATCH (parent)-[:UNLOCKS]->(s)
        WITH s, collect(parent) as parents

        // Si pas de parents, le nœud est un nœud racine (débloqué)
        WITH s, parents,
             CASE WHEN size(parents) = 0 THEN true ELSE null END as isRootNode

        // Vérifier si tous les parents sont maîtrisés par l'utilisateur
        OPTIONAL MATCH (u:User {id: $userId})-[:MASTERED]->(masteredParent)
        WHERE masteredParent IN parents
        WITH s, parents, isRootNode, collect(masteredParent) as masteredParents

        // Calculer si le nœud est débloqué
        // unlockCondition: 'AND' = tous les parents doivent être maîtrisés
        // unlockCondition: 'OR' = au moins un parent doit être maîtrisé
        WITH s, parents, isRootNode, masteredParents,
             CASE
               WHEN isRootNode = true THEN true
               WHEN size(parents) = 0 THEN true
               WHEN coalesce(s.unlockCondition, 'AND') = 'OR' THEN size(masteredParents) > 0
               ELSE size(masteredParents) = size(parents)
             END as isUnlocked

        RETURN s.label as skillLabel, s.xp as skillXp, isUnlocked, size(parents) as parentCount
      `;

      const checkResult = await session.run(unlockCheckCypher, { userId, skillId });

      if (checkResult.records.length === 0) {
        this.logger.error(`validateSkill: Node ${skillId} not found`);
        throw new NotFoundException(`Compétence "${skillId}" introuvable`);
      }

      const checkRecord = checkResult.records[0];
      const isUnlocked = checkRecord.get('isUnlocked');
      const skillLabel = checkRecord.get('skillLabel');
      const parentCount = checkRecord.get('parentCount')?.low ?? checkRecord.get('parentCount') ?? 0;

      if (!isUnlocked) {
        this.logger.warn(`SECURITY: User ${userId} attempted to validate locked skill ${skillId} (${skillLabel}). Parents: ${parentCount}`);
        throw new BadRequestException(
          `Vous ne pouvez pas valider "${skillLabel}" car ses prérequis ne sont pas complétés.`
        );
      }

      // ÉTAPE 2: Procéder à la validation (le nœud est bien débloqué)
      // S'assurer que l'user existe dans le graph
      await session.run(`MERGE (u:User {id: $userId}) ON CREATE SET u.xp = 0`, { userId });

      const validateCypher = `
        MATCH (u:User {id: $userId})
        MATCH (s {id: $skillId})
        MERGE (u)-[r:MASTERED]->(s)
        ON CREATE
          SET r.date = datetime(),
              r.xpAwarded = $xpReward,
              r.score = 100,
              u.xp = coalesce(u.xp, 0) + $xpReward
        ON MATCH
          SET u.xp = u.xp + CASE WHEN $xpReward > coalesce(r.xpAwarded, 0) THEN $xpReward - coalesce(r.xpAwarded, 0) ELSE 0 END,
              r.xpAwarded = CASE WHEN $xpReward > coalesce(r.xpAwarded, 0) THEN $xpReward ELSE r.xpAwarded END,
              r.date = datetime()
        RETURN u.xp as totalXp, s.label as skillLabel
      `;

      const result = await session.run(validateCypher, { userId, skillId, xpReward });

      if (result.records.length === 0) {
        this.logger.error('validateSkill: No records returned after validation.');
        throw new InternalServerErrorException("Validation failed - unexpected error");
      }

      const record = result.records[0];
      const totalXp = record.get('totalXp');
      this.logger.log(`validateSkill success: ${skillLabel}, New XP=${totalXp?.low ?? totalXp}`);

      return {
        message: `Compétence ${record.get('skillLabel')} validée !`,
        newXp: totalXp?.low ?? totalXp
      };
    } catch (error: any) {
      // Re-throw known exceptions
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('validateSkill error:', error);
      throw new InternalServerErrorException('Failed to validate skill: ' + error.message);
    } finally {
      await session.close();
    }
  }

  async updateNodeExercise(id: string, exerciseType: string, exerciseData: string) {
    const session = this.neo4jService.getWriteSession();
    try {
      // 1. Update/Create Exercise Node linked to Topic
      const result = await session.run(`
        MATCH (n {id: $id})
        
        MERGE (n)-[:HAS_EXERCISE]->(e:Exercise)
        ON CREATE SET e.id = n.id + '_exo_' + toString(timestamp()), e.createdAt = datetime()
        
        SET e.type = $exerciseType,
            e.data = $exerciseData,
            e.updatedAt = datetime(),
            // Sync legacy fields on Topic for safety until full frontend migration
            n.exerciseType = $exerciseType,
            n.exerciseData = $exerciseData,
            n.exerciseUpdatedAt = datetime()
            
        RETURN n
      `, { id, exerciseType, exerciseData });

      if (result.records.length === 0) {
        throw new InternalServerErrorException(`Node ${id} not found`);
      }

      return { 
        message: 'Exercise configuration saved',
        node: result.records[0].get('n').properties
      };
    } finally {
      await session.close();
    }
  }

  async migrateExercisesToNodes() {
    const session = this.neo4jService.getWriteSession();
    try {
        // Récupérer les nœuds à migrer
        const result = await session.run(`
            MATCH (n)
            WHERE n.exerciseData IS NOT NULL AND n.exerciseData <> "" 
              AND NOT (n)-[:HAS_EXERCISE]->(:Exercise)
            RETURN n.id as id, n.exerciseType as type, n.exerciseData as data
        `);
        
        let count = 0;
        for (const record of result.records) {
            const id = record.get('id');
            const type = record.get('type') || 'none';
            const data = record.get('data');
            
            // Créer le nœud exercice et lier
            await session.run(`
                MATCH (n {id: $id})
                CREATE (e:Exercise {
                    id: $exoId,
                    type: $type,
                    data: $data,
                    createdAt: datetime()
                })
                CREATE (n)-[:HAS_EXERCISE]->(e)
            `, {
                id,
                exoId: `${id}_exo_${Date.now()}`,
                type,
                data
            });
            count++;
        }
        return { migrated: count };
    } finally {
        await session.close();
    }
  }
}
