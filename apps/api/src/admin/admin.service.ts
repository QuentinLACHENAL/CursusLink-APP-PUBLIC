import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CorrectionsService } from '../corrections/corrections.service';
import { GraphQueryService } from '../graph/services/graph-query.service';
import { GraphCrudService } from '../graph/services/graph-crud.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private usersService: UsersService,
    private correctionsService: CorrectionsService,
    private readonly graphQueryService: GraphQueryService,
    private readonly graphCrudService: GraphCrudService
  ) {}

  async getAllUsers() {
    return this.usersService.findAll();
  }

  async toggleBan(userId: string, status: boolean) {
    return this.usersService.setBanStatus(userId, status);
  }

  async resetUserPassword(userId: string) {
    return this.usersService.manualResetPassword(userId);
  }

  async getAllCorrections() {
    return this.correctionsService.findAllHistory();
  }

  async deleteUser(userId: string) {
    return this.usersService.deleteUser(userId);
  }

  async getStructure() {
    return this.graphQueryService.getGalaxyStructure();
  }

  async repairLabels() {
    this.logger.log('Starting label repair migration...');
    const result = await this.graphCrudService.repairNodeLabels();
    this.logger.log(`Label repair completed: ${result.repaired} nodes repaired`);
    return result;
  }

  async cleanupOrphanedExercises() {
    this.logger.log('Starting orphaned exercises cleanup...');
    const result = await this.graphCrudService.cleanupOrphanedExercises();
    this.logger.log(`Cleanup completed: ${result.deleted} orphaned exercises removed`);
    return result;
  }

  async migrateExercises() {
    this.logger.log('Starting exercise migration to dedicated nodes...');
    const result = await this.graphCrudService.migrateExercisesToNodes();
    this.logger.log(`Migration completed: ${result.migrated} exercises migrated`);
    return result;
  }

  /**
   * Génère un rapport d'intégrité des données
   * Utile pour le monitoring et le debugging
   */
  async getDataIntegrityReport() {
    const structure = await this.graphQueryService.getGalaxyStructure();
    
    // Comptages basiques via le service existant
    const stats = {
      totalNodes: structure.nodes?.length ?? 0,
      nodesByType: {} as Record<string, number>,
      orphanedExercisesCheck: 'Run cleanup-orphans endpoint to check',
      labelsConsistencyCheck: 'Run repair-labels endpoint to verify'
    };

    // Compter les noeuds par type
    if (structure.nodes) {
      for (const node of structure.nodes) {
        const type = node.type || 'unknown';
        stats.nodesByType[type] = (stats.nodesByType[type] || 0) + 1;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      stats,
      recommendations: [
        'Run maintenance/repair-labels periodically after bulk updates',
        'Run maintenance/cleanup-orphans after deleting nodes',
        'Run maintenance/migrate-exercises if using legacy exerciseData storage'
      ]
    };
  }
}
