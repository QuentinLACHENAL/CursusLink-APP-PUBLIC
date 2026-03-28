import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../../src/admin/admin.service';
import { UsersService } from '../../src/users/users.service';
import { CorrectionsService } from '../../src/corrections/corrections.service';
import { GraphQueryService } from '../../src/graph/services/graph-query.service';
import { GraphCrudService } from '../../src/graph/services/graph-crud.service';
import { createMockUser, createMockGraphNode } from '../utils/test-mocks';

describe('AdminService', () => {
  let service: AdminService;
  let mockUsersService: any;
  let mockCorrectionsService: any;
  let mockGraphQueryService: any;
  let mockGraphCrudService: any;

  beforeEach(async () => {
    mockUsersService = {
      findAll: jest.fn().mockResolvedValue([createMockUser()]),
      findOne: jest.fn().mockResolvedValue(createMockUser()),
      setBanStatus: jest.fn().mockResolvedValue(createMockUser({ isBanned: true })),
      manualResetPassword: jest.fn().mockResolvedValue({ newPassword: 'newpass123' }),
      deleteUser: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    };

    mockCorrectionsService = {
      findAllHistory: jest.fn().mockResolvedValue([]),
    };

    mockGraphQueryService = {
      getGalaxyStructure: jest.fn().mockResolvedValue({ 
        nodes: [createMockGraphNode()], 
        links: [] 
      }),
    };

    mockGraphCrudService = {
      cleanupOrphanedExercises: jest.fn().mockResolvedValue({ deleted: 5 }),
      repairNodeLabels: jest.fn().mockResolvedValue({ repaired: 3 }),
      migrateExercisesToNodes: jest.fn().mockResolvedValue({ migrated: 10 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: CorrectionsService, useValue: mockCorrectionsService },
        { provide: GraphQueryService, useValue: mockGraphQueryService },
        { provide: GraphCrudService, useValue: mockGraphCrudService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const result = await service.getAllUsers();
      
      expect(result).toBeDefined();
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('toggleBan', () => {
    it('should toggle user ban status', async () => {
      const result = await service.toggleBan('user-id', true);
      
      expect(result).toBeDefined();
      expect(mockUsersService.setBanStatus).toHaveBeenCalledWith('user-id', true);
    });
  });

  describe('resetUserPassword', () => {
    it('should reset user password', async () => {
      const result = await service.resetUserPassword('user-id');
      
      expect(result).toBeDefined();
      expect(mockUsersService.manualResetPassword).toHaveBeenCalledWith('user-id');
    });
  });

  describe('getAllCorrections', () => {
    it('should return all corrections history', async () => {
      const result = await service.getAllCorrections();
      
      expect(result).toBeDefined();
      expect(mockCorrectionsService.findAllHistory).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const result = await service.deleteUser('user-id');
      
      expect(result).toBeDefined();
      expect(result.affected).toBe(1);
      expect(mockUsersService.deleteUser).toHaveBeenCalledWith('user-id');
    });
  });

  describe('getStructure', () => {
    it('should return galaxy structure', async () => {
      const result = await service.getStructure();
      
      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(mockGraphQueryService.getGalaxyStructure).toHaveBeenCalled();
    });
  });

  describe('repairLabels', () => {
    it('should repair node labels', async () => {
      const result = await service.repairLabels();
      
      expect(result.repaired).toBe(3);
      expect(mockGraphCrudService.repairNodeLabels).toHaveBeenCalled();
    });
  });

  describe('cleanupOrphanedExercises', () => {
    it('should cleanup orphaned exercises', async () => {
      const result = await service.cleanupOrphanedExercises();

      expect(result.deleted).toBe(5);
      expect(mockGraphCrudService.cleanupOrphanedExercises).toHaveBeenCalled();
    });
  });

  describe('migrateExercises', () => {
    it('should migrate exercises to nodes', async () => {
      const result = await service.migrateExercises();

      expect(result.migrated).toBe(10);
      expect(mockGraphCrudService.migrateExercisesToNodes).toHaveBeenCalled();
    });
  });

  describe('getDataIntegrityReport', () => {
    it('should return data integrity report', async () => {
      mockGraphQueryService.getGalaxyStructure.mockResolvedValue({
        nodes: [
          createMockGraphNode({ type: 'planet' }),
          createMockGraphNode({ type: 'planet' }),
          createMockGraphNode({ type: 'satellite' }),
        ],
        links: [],
      });

      const result = await service.getDataIntegrityReport();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('stats');
      expect(result.stats.totalNodes).toBe(3);
      expect(result.stats.nodesByType).toHaveProperty('planet', 2);
      expect(result.stats.nodesByType).toHaveProperty('satellite', 1);
    });

    it('should handle empty structure', async () => {
      mockGraphQueryService.getGalaxyStructure.mockResolvedValue({ nodes: null, links: [] });

      const result = await service.getDataIntegrityReport();

      expect(result.stats.totalNodes).toBe(0);
    });
  });
});
