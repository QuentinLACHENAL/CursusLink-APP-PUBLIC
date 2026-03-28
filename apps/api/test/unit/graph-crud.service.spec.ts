import { Test, TestingModule } from '@nestjs/testing';
import { GraphCrudService } from '../../src/graph/services/graph-crud.service';
import { Neo4jService } from '../../src/neo4j/neo4j.service';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import {
  createMockNeo4jService,
  createMockNeo4jSession,
  createNeo4jResult,
  createMockGraphNode,
} from '../utils/test-mocks';

describe('GraphCrudService', () => {
  let service: GraphCrudService;
  let mockSession: any;
  let mockTransaction: any;

  beforeEach(async () => {
    mockTransaction = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
      beginTransaction: jest.fn().mockReturnValue(mockTransaction),
    };

    const mockNeo4jService = {
      getReadSession: jest.fn().mockReturnValue(mockSession),
      getWriteSession: jest.fn().mockReturnValue(mockSession),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphCrudService,
        { provide: Neo4jService, useValue: mockNeo4jService },
      ],
    }).compile();

    service = module.get<GraphCrudService>(GraphCrudService);
  });

  describe('createNode', () => {
    it('should create a node with all required properties', async () => {
      const nodeData = {
        label: 'Test Node',
        type: 'planet',
        group: 'test-group',
        constellation: 'Test Constellation',
        xp: 100,
      };

      const mockNodeProps = { id: 'generated-id', ...nodeData };
      mockSession.run.mockResolvedValue({
        records: [{ get: () => ({ properties: mockNodeProps }) }],
      });

      const result = await service.createNode(nodeData);

      expect(result).toBeDefined();
      expect(mockSession.run).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should generate ID if not provided', async () => {
      const nodeData = { label: 'Test Node' };

      mockSession.run.mockResolvedValue({
        records: [{ get: () => ({ properties: { id: 'generated-id' } }) }],
      });

      await service.createNode(nodeData);

      const call = mockSession.run.mock.calls[0];
      expect(call[1].id).toMatch(/test_node_/);
    });

    it('should migrate legacy types to new types', async () => {
      const nodeData = { label: 'Test', type: 'topic' }; // Legacy type

      mockSession.run.mockResolvedValue({
        records: [{ get: () => ({ properties: { type: 'planet' } }) }],
      });

      await service.createNode(nodeData);

      const call = mockSession.run.mock.calls[0];
      expect(call[1].type).toBe('planet'); // Should be migrated
    });

    it('should create Exercise node when exerciseType is provided', async () => {
      const nodeData = {
        label: 'Test',
        exerciseType: 'qcm',
        exerciseData: '[]',
      };

      mockSession.run.mockResolvedValue({
        records: [{ get: () => ({ properties: nodeData }) }],
      });

      await service.createNode(nodeData);

      // Since the fix, exercise creation is now in a SECOND separate query
      expect(mockSession.run).toHaveBeenCalledTimes(2);
      
      const secondCypherCall = mockSession.run.mock.calls[1][0];
      expect(secondCypherCall).toContain('CREATE (e:Exercise');
      expect(secondCypherCall).toContain('HAS_EXERCISE');
    });
  });

  describe('updateNode', () => {
    it('should update node properties', async () => {
      const existingNode = createMockGraphNode({ id: 'test-id', label: 'Old Label' });

      // First call: get existing node
      mockSession.run
        .mockResolvedValueOnce({
          records: [{ get: () => ({ properties: existingNode }) }],
        })
        // Second call: update node
        .mockResolvedValueOnce({
          records: [{ get: () => ({ properties: { ...existingNode, label: 'New Label' } }) }],
        });

      const result = await service.updateNode('test-id', { label: 'New Label' });

      expect(result.label).toBe('New Label');
    });

    it('should throw InternalServerErrorException when node not found', async () => {
      mockSession.run
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({ records: [] });

      await expect(service.updateNode('nonexistent', { label: 'test' }))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('should sync Exercise node when updating exercise data', async () => {
      const existingNode = createMockGraphNode({
        exerciseType: 'qcm',
        exerciseData: '[]',
      });

      mockSession.run
        .mockResolvedValueOnce({
          records: [{ get: () => ({ properties: existingNode }) }],
        })
        .mockResolvedValueOnce({
          records: [{ get: () => ({ properties: existingNode }) }],
        });

      await service.updateNode('test-id', { exerciseData: '[{"q":"new"}]' });

      const updateCall = mockSession.run.mock.calls[1][0];
      expect(updateCall).toContain('SET e.data =');
    });
  });

  describe('deleteNode', () => {
    it('should delete node and cascade to exercises', async () => {
      // Mock: node exists
      mockTransaction.run
        .mockResolvedValueOnce({
          records: [{ get: () => 'Test Node' }],
        })
        // Mock: users with MASTERED relationships
        .mockResolvedValueOnce({ records: [] })
        // Mock: delete query
        .mockResolvedValueOnce({ records: [] });

      const result = await service.deleteNode('test-node-id');

      expect(result.success).toBe(true);
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw NotFoundException when node does not exist', async () => {
      mockTransaction.run.mockResolvedValueOnce({ records: [] });

      await expect(service.deleteNode('nonexistent'))
        .rejects.toThrow(NotFoundException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should recalculate XP for affected users', async () => {
      // Mock: node exists
      mockTransaction.run
        .mockResolvedValueOnce({
          records: [{ get: () => 'Test Node' }],
        })
        // Mock: users with MASTERED relationships
        .mockResolvedValueOnce({
          records: [
            { get: (key: string) => key === 'userId' ? 'user1' : { low: 100 } },
            { get: (key: string) => key === 'userId' ? 'user2' : { low: 50 } },
          ],
        })
        // Mock: delete query
        .mockResolvedValueOnce({ records: [] })
        // Mock: recalculate XP queries
        .mockResolvedValueOnce({ records: [{ get: () => ({ low: 200 }) }] })
        .mockResolvedValueOnce({ records: [{ get: () => ({ low: 150 }) }] });

      const result = await service.deleteNode('test-node-id');

      expect(result.affectedUsers).toBe(2);
      // Should have called recalc for each user
      expect(mockTransaction.run).toHaveBeenCalledTimes(5);
    });

    it('should rollback on error', async () => {
      mockTransaction.run
        .mockResolvedValueOnce({
          records: [{ get: () => 'Test Node' }],
        })
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(service.deleteNode('test-id'))
        .rejects.toThrow(InternalServerErrorException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('createRelationship', () => {
    it('should create a valid relationship', async () => {
      mockSession.run.mockResolvedValue({ records: [{}] });

      const result = await service.createRelationship('source', 'target', 'UNLOCKS');

      expect(result.success).toBe(true);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid relationship type', async () => {
      await expect(
        service.createRelationship('source', 'target', 'INVALID_TYPE')
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept all valid relationship types', async () => {
      mockSession.run.mockResolvedValue({ records: [{}] });

      const validTypes = ['UNLOCKS', 'REQUIRES', 'MASTERED', 'CONTAINS', 'BELONGS_TO', 'ORBITS', 'PART_OF'];

      for (const type of validTypes) {
        const result = await service.createRelationship('source', 'target', type);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('deleteRelationship', () => {
    it('should delete a valid relationship', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await service.deleteRelationship('source', 'target', 'UNLOCKS');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Relation supprimée');
    });

    it('should throw BadRequestException for invalid relationship type', async () => {
      await expect(
        service.deleteRelationship('source', 'target', 'INVALID_TYPE')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cleanupOrphanedExercises', () => {
    it('should delete orphaned exercises', async () => {
      mockSession.run.mockResolvedValue({
        records: [{ get: () => ({ low: 5 }) }],
      });

      const result = await service.cleanupOrphanedExercises();

      expect(result.deleted).toBe(5);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return 0 when no orphans exist', async () => {
      mockSession.run.mockResolvedValue({
        records: [{ get: () => ({ low: 0 }) }],
      });

      const result = await service.cleanupOrphanedExercises();

      expect(result.deleted).toBe(0);
    });
  });

  describe('validateSkill', () => {
    it('should create MASTERED relationship and update XP', async () => {
      mockSession.run
        .mockResolvedValueOnce({ records: [] }) // MERGE user
        .mockResolvedValueOnce({
          records: [{
            get: (key: string) => key === 'totalXp' ? { low: 100 } : 'Test Skill',
          }],
        });

      const result = await service.validateSkill('user-id', 'skill-id', 100);

      expect(result.message).toContain('Test Skill');
      expect(result.newXp).toBe(100);
    });

    it('should throw InternalServerErrorException on failure', async () => {
      mockSession.run
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({ records: [] });

      await expect(service.validateSkill('user-id', 'skill-id', 100))
        .rejects.toThrow(InternalServerErrorException);
    });
  });
});
