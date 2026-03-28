import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from '../../src/backup/backup.service';
import { Neo4jService } from '../../src/neo4j/neo4j.service';
import { BadRequestException } from '@nestjs/common';

describe('BackupService', () => {
  let service: BackupService;
  let mockNeo4jService: any;
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

    mockNeo4jService = {
      getReadSession: jest.fn().mockReturnValue(mockSession),
      getWriteSession: jest.fn().mockReturnValue(mockSession),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: Neo4jService, useValue: mockNeo4jService },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportFullGraph', () => {
    it('should export all nodes and relationships', async () => {
      const mockNodes = [
        { get: (key: string) => {
          const data = { id: 'skill-1', labels: ['Skill'], props: { name: 'Node.js' } };
          return data[key];
        }},
        { get: (key: string) => {
          const data = { id: 'skill-2', labels: ['Skill'], props: { name: 'React' } };
          return data[key];
        }},
      ];

      const mockRelationships = [
        { get: (key: string) => {
          const data = { source: 'skill-1', target: 'skill-2', type: 'REQUIRES', props: {} };
          return data[key];
        }},
      ];

      mockSession.run
        .mockResolvedValueOnce({ records: mockNodes })
        .mockResolvedValueOnce({ records: mockRelationships });

      const result = await service.exportFullGraph();

      expect(result.data.nodes).toHaveLength(2);
      expect(result.data.relationships).toHaveLength(1);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even on error', async () => {
      mockSession.run.mockRejectedValue(new Error('Database error'));

      await expect(service.exportFullGraph()).rejects.toThrow();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should include metadata in export', async () => {
      mockSession.run
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({ records: [] });

      const result = await service.exportFullGraph();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('data');
    });

    it('should exclude User nodes from export', async () => {
      mockSession.run
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({ records: [] });

      await service.exportFullGraph();

      // Verify the query excludes User nodes
      expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('NOT n:User'));
    });
  });

  describe('importFullGraph', () => {
    const validBackupData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      data: {
        nodes: [
          { id: 'skill-1', labels: ['Skill'], props: { name: 'Node.js' } },
          { id: 'skill-2', labels: ['Skill'], props: { name: 'React' } },
        ],
        relationships: [
          { source: 'skill-1', target: 'skill-2', type: 'REQUIRES', props: {} },
        ],
      },
    };

    it('should import nodes and relationships', async () => {
      mockTransaction.run.mockResolvedValue({ records: [] });

      const result = await service.importFullGraph(validBackupData);

      expect(result.success).toBe(true);
      expect(result.nodesCreated).toBe(2);
      expect(result.relationshipsCreated).toBe(1);
    });

    it('should validate backup structure before import', async () => {
      const invalidBackup = {
        version: '2.0',
        // Missing data property
      };

      await expect(service.importFullGraph(invalidBackup as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject invalid node labels (Cypher injection prevention)', async () => {
      const maliciousBackup = {
        ...validBackupData,
        data: {
          nodes: [{ id: 'bad', labels: ['Skill` DETACH DELETE n //'], props: {} }],
          relationships: [],
        },
      };

      await expect(service.importFullGraph(maliciousBackup))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject invalid relationship types (Cypher injection prevention)', async () => {
      const maliciousBackup = {
        ...validBackupData,
        data: {
          nodes: validBackupData.data.nodes,
          relationships: [{ source: 'skill-1', target: 'skill-2', type: 'REQUIRES` DETACH DELETE n //', props: {} }],
        },
      };

      await expect(service.importFullGraph(maliciousBackup))
        .rejects.toThrow(BadRequestException);
    });

    it('should only allow whitelisted labels', async () => {
      const backupWithUnknownLabel = {
        ...validBackupData,
        data: {
          nodes: [{ id: 'bad', labels: ['MaliciousLabel'], props: {} }],
          relationships: [],
        },
      };

      await expect(service.importFullGraph(backupWithUnknownLabel))
        .rejects.toThrow(BadRequestException);
    });

    it('should only allow whitelisted relationship types', async () => {
      const backupWithUnknownType = {
        ...validBackupData,
        data: {
          nodes: validBackupData.data.nodes,
          relationships: [{ source: 'skill-1', target: 'skill-2', type: 'MALICIOUS_REL', props: {} }],
        },
      };

      await expect(service.importFullGraph(backupWithUnknownType))
        .rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on error', async () => {
      mockTransaction.run
        .mockResolvedValueOnce({ records: [] }) // Delete
        .mockRejectedValueOnce(new Error('Database error')); // First node fails

      await expect(service.importFullGraph(validBackupData))
        .rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should use transaction for atomicity', async () => {
      mockTransaction.run.mockResolvedValue({ records: [] });

      await service.importFullGraph(validBackupData);

      expect(mockSession.beginTransaction).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should close session after import', async () => {
      mockTransaction.run.mockResolvedValue({ records: [] });

      await service.importFullGraph(validBackupData);

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should preserve User nodes by default', async () => {
      mockTransaction.run.mockResolvedValue({ records: [] });

      await service.importFullGraph(validBackupData);

      // Should delete non-User nodes only
      expect(mockTransaction.run).toHaveBeenCalledWith('MATCH (n) WHERE NOT n:User DETACH DELETE n');
    });

    it('should delete User nodes when preserveUsers is false', async () => {
      mockTransaction.run.mockResolvedValue({ records: [] });

      await service.importFullGraph(validBackupData, false);

      // Should delete ALL nodes
      expect(mockTransaction.run).toHaveBeenCalledWith('MATCH (n) DETACH DELETE n');
    });
  });

  describe('Security tests', () => {
    it('should sanitize node properties during import', async () => {
      const backupWithSuspiciousProps = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        data: {
          nodes: [
            {
              id: 'skill-1',
              labels: ['Skill'],
              props: { name: '<script>alert("xss")</script>', level: 1 },
            },
          ],
          relationships: [],
        },
      };

      mockTransaction.run.mockResolvedValue({ records: [] });

      // Properties should be parameterized, not interpolated
      await service.importFullGraph(backupWithSuspiciousProps);

      // Verify the run was called with parameters, not string interpolation
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('$props'),
        expect.objectContaining({ props: expect.any(Object) })
      );
    });

    it('should not allow script injection in labels', async () => {
      const maliciousLabels = [
        'Skill<script>',
        'Skill\'); MATCH (n) DETACH DELETE n;//',
        'Skill`; DROP DATABASE neo4j;//',
      ];

      for (const label of maliciousLabels) {
        const backup = {
          version: '2.0',
          timestamp: new Date().toISOString(),
          data: {
            nodes: [{ id: 'bad', labels: [label], props: {} }],
            relationships: [],
          },
        };

        await expect(service.importFullGraph(backup))
          .rejects.toThrow(BadRequestException);
      }
    });
  });

  describe('validateBackupStructure', () => {
    it('should accept valid backup structure', async () => {
      const validBackup = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        data: {
          nodes: [{ id: 'skill-1', labels: ['Skill'], props: { name: 'Test' } }],
          relationships: [],
        },
      };

      mockTransaction.run.mockResolvedValue({ records: [] });

      await expect(service.importFullGraph(validBackup)).resolves.toBeDefined();
    });

    it('should reject backup without nodes array', async () => {
      const invalidBackup = {
        version: '2.0',
        data: { relationships: [] },
      };

      await expect(service.importFullGraph(invalidBackup as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject nodes without labels', async () => {
      const invalidBackup = {
        version: '2.0',
        data: { nodes: [{ id: 'bad', props: {} }], relationships: [] },
      };

      await expect(service.importFullGraph(invalidBackup as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject relationships without type', async () => {
      const invalidBackup = {
        version: '2.0',
        data: { nodes: [{ id: 'n1', labels: ['Skill'], props: {} }], relationships: [{ source: 'n1', target: 'n1' }] },
      };

      await expect(service.importFullGraph(invalidBackup as any))
        .rejects.toThrow(BadRequestException);
    });
  });
});
