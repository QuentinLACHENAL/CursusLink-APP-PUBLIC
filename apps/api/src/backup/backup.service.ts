import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { 
  validateBackupStructure, 
  isValidNodeLabel, 
  isValidRelationshipType,
  sanitizePropertyValue,
  withSession,
  VALID_NODE_LABELS,
  VALID_RELATIONSHIP_TYPES
} from '../common/utils/neo4j-validation';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  async exportFullGraph() {
    return withSession(
      () => this.neo4jService.getReadSession(),
      async (session) => {
        this.logger.log('Starting full graph export...');

        // Export nodes with their labels and properties
        const nodesQuery = await session.run(`
          MATCH (n) 
          WHERE NOT n:User  
          RETURN n.id as id, labels(n) as labels, properties(n) as props
        `);
        const cleanNodes = nodesQuery.records.map(r => ({
          id: r.get('id'),
          labels: r.get('labels'),
          props: r.get('props')
        }));

        // Export relationships
        const relsQuery = await session.run(`
          MATCH (n)-[r]->(m) 
          WHERE NOT n:User AND NOT m:User
          RETURN n.id as source, type(r) as type, m.id as target, properties(r) as props
        `);
        const cleanRels = relsQuery.records.map(r => ({
          source: r.get('source'),
          target: r.get('target'),
          type: r.get('type'),
          props: r.get('props')
        }));

        this.logger.log(`Export complete: ${cleanNodes.length} nodes, ${cleanRels.length} relationships`);

        return {
          timestamp: new Date().toISOString(),
          version: '2.0',
          data: {
            nodes: cleanNodes,
            relationships: cleanRels
          }
        };
      }
    );
  }

  /**
   * Import a backup - DANGEROUS: This will delete all existing data except Users
   * @param backupData Validated backup data structure
   * @param preserveUsers If true, User nodes are not deleted (default: true)
   */
  async importFullGraph(backupData: any, preserveUsers: boolean = true) {
    // 1. Validate backup structure first (prevents Cypher injection)
    let validated;
    try {
      validated = validateBackupStructure(backupData);
    } catch (e) {
      throw new BadRequestException(`Invalid backup format: ${e.message}`);
    }

    const session = this.neo4jService.getWriteSession();
    const txc = session.beginTransaction();

    try {
      this.logger.warn('Starting full graph import - this will delete existing data!');

      // 2. Clean existing data (preserve Users if requested)
      if (preserveUsers) {
        await txc.run('MATCH (n) WHERE NOT n:User DETACH DELETE n');
        this.logger.log('Deleted all non-User nodes');
      } else {
        await txc.run('MATCH (n) DETACH DELETE n');
        this.logger.warn('Deleted ALL nodes including Users');
      }

      // Helper to clean Neo4j integer values
      const cleanValue = (val: any): any => {
        if (val && typeof val === 'object') {
          if ('low' in val && 'high' in val) {
            return val.low;
          }
          if (Array.isArray(val)) {
            return val.map(cleanValue);
          }
          const cleaned: any = {};
          for (const key in val) {
            cleaned[key] = cleanValue(val[key]);
          }
          return cleaned;
        }
        return val;
      };

      // 3. Create nodes with validated labels
      let nodesCreated = 0;
      for (const node of validated.data.nodes) {
        // Filter to only valid labels (already validated but double-check)
        const safeLabels = node.labels.filter(isValidNodeLabel);
        if (safeLabels.length === 0) {
          this.logger.warn(`Skipping node ${node.id} - no valid labels`);
          continue;
        }

        const labelStr = safeLabels.join(':');
        const cleanedProps = sanitizePropertyValue(cleanValue(node.props));

        await txc.run(
          `CREATE (n:${labelStr}) SET n = $props`,
          { props: cleanedProps }
        );
        nodesCreated++;
      }

      // 4. Create relationships with validated types
      let relsCreated = 0;
      for (const rel of validated.data.relationships) {
        if (!isValidRelationshipType(rel.type)) {
          this.logger.warn(`Skipping relationship with invalid type: ${rel.type}`);
          continue;
        }

        const cleanedProps = sanitizePropertyValue(cleanValue(rel.props || {}));

        await txc.run(
          `
          MATCH (a {id: $source}), (b {id: $target})
          CREATE (a)-[r:${rel.type}]->(b)
          SET r = $props
          `,
          {
            source: rel.source,
            target: rel.target,
            props: cleanedProps
          }
        );
        relsCreated++;
      }

      // 5. Commit transaction
      await txc.commit();

      this.logger.log(`Import complete: ${nodesCreated} nodes, ${relsCreated} relationships`);

      return { 
        success: true, 
        nodesCreated,
        relationshipsCreated: relsCreated
      };
    } catch (e) {
      await txc.rollback();
      this.logger.error(`Import failed, rolled back: ${e.message}`);
      throw new InternalServerErrorException(`Import error: ${e.message}`);
    } finally {
      await session.close();
    }
  }
}
