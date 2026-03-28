import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Neo4jService } from '../../neo4j/neo4j.service';

@Injectable()
export class GraphSeederService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async resetGraph() {
    const session = this.neo4jService.getWriteSession();
    try {
      await session.run(`MATCH (n) WHERE NOT n:User DETACH DELETE n`);
      return { message: 'Graphe réinitialisé avec succès (Utilisateurs conservés).' };
    } finally {
      await session.close();
    }
  }

  async seed() {
    const session = this.neo4jService.getWriteSession();

    try {
      await session.run(`MATCH (n) WHERE NOT n:User DETACH DELETE n`);

      const regions = [
        { id: 'epaule', label: 'Épaule', group: 'membre_sup' },
        { id: 'bras_coude', label: 'Bras & Coude', group: 'membre_sup' },
        { id: 'av_bras_main', label: 'Avant-bras & Main', group: 'membre_sup' },
        { id: 'bassin', label: 'Bassin', group: 'membre_inf' },
        { id: 'hanche_cuisse', label: 'Hanche & Cuisse', group: 'membre_inf' },
        { id: 'genou', label: 'Genou', group: 'membre_inf' },
        { id: 'jambe', label: 'Jambe', group: 'membre_inf' },
        { id: 'pied', label: 'Cheville & Pied', group: 'membre_inf' },
        { id: 'colonne', label: 'Colonne Vertébrale', group: 'tronc' },
        { id: 'crane', label: 'Crâne', group: 'tete' },
        { id: 'abdomen', label: 'Abdomen', group: 'tronc' },
        { id: 'thorax', label: 'Thorax', group: 'tronc' },
      ];

      const subTopics = [
        { id: 'osteo', label: 'Ostéologie' },
        { id: 'arthro', label: 'Arthrologie' },
        { id: 'myo', label: 'Myologie' },
        { id: 'cinesio', label: 'Cinésiologie' },
        { id: 'inner', label: 'Innervation' },
        { id: 'vascu', label: 'Vascularisation' },
      ];

      for (const region of regions) {
        await session.run(`
          CREATE (r:Skill {id: $id, label: $label, group: $id, level: 1, type: 'region'})
        `, region);

        let previousNodeId: string | null = null;

        for (const topic of subTopics) {
          const nodeId = `${region.id}_${topic.id}`;
          const nodeLabel = `${topic.label} (${region.label})`;

          await session.run(`
            CREATE (t:Skill {id: $id, label: $label, group: $group, level: 2, type: 'topic'})
          `, { id: nodeId, label: nodeLabel, group: region.id });

          if (!previousNodeId) {
            await session.run(`
              MATCH (r:Skill {id: $regionId}), (t:Skill {id: $nodeId})
              CREATE (r)-[:UNLOCKS]->(t)
            `, { regionId: region.id, nodeId });
          } else {
            await session.run(`
              MATCH (prev:Skill {id: $prevId}), (curr:Skill {id: $currId})
              CREATE (prev)-[:UNLOCKS]->(curr)
            `, { prevId: previousNodeId, currId: nodeId });
          }

          previousNodeId = nodeId;
        }

        const projectId = `proj_${region.id}`;
        await session.run(`
          CREATE (p:Project {id: $id, label: $label, xp: 500, group: $group})
        `, { id: projectId, label: `Quiz Final: ${region.label}`, group: region.id });

        await session.run(`
          MATCH (last:Skill {id: $lastId}), (p:Project {id: $projId})
          CREATE (last)-[:REQUIRES]->(p)
        `, { lastId: previousNodeId, projId: projectId });
      }

      return { message: 'Anatomy curriculum seeded successfully' };
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to seed graph: ' + error.message);
    } finally {
      session.close();
    }
  }
}
