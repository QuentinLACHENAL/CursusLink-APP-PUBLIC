import { Test, TestingModule } from '@nestjs/testing';
import { Neo4jService } from '../../src/neo4j/neo4j.service';
import { ConfigService } from '@nestjs/config';

describe('Neo4jService', () => {
  let service: Neo4jService;
  let mockDriver: any;
  let mockSession: any;

  beforeEach(async () => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
      beginTransaction: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({ records: [] }),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      }),
    };

    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
      close: jest.fn().mockResolvedValue(undefined),
      verifyConnectivity: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NEO4J_URI: 'bolt://localhost:7687',
          NEO4J_USERNAME: 'neo4j',
          NEO4J_PASSWORD: 'password',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Neo4jService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<Neo4jService>(Neo4jService);
    // Inject mock driver after init
    (service as any).driver = mockDriver;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReadSession', () => {
    it('should return a read session', () => {
      const session = service.getReadSession();
      
      expect(session).toBeDefined();
      expect(mockDriver.session).toHaveBeenCalled();
    });

    it('should create sessions with correct database', () => {
      service.getReadSession('custom-db');

      expect(mockDriver.session).toHaveBeenCalledWith(
        expect.objectContaining({ database: 'custom-db' })
      );
    });
  });

  describe('getWriteSession', () => {
    it('should return a write session', () => {
      const session = service.getWriteSession();

      expect(session).toBeDefined();
      expect(mockDriver.session).toHaveBeenCalled();
    });
  });

  describe('read method', () => {
    it('should execute read query and close session', async () => {
      mockSession.run.mockResolvedValue({ records: [{ get: () => 'test' }] });
      
      const result = await service.read('MATCH (n) RETURN n');
      
      expect(mockSession.run).toHaveBeenCalledWith('MATCH (n) RETURN n', undefined);
      expect(mockSession.close).toHaveBeenCalled();
      expect(result.records).toBeDefined();
    });

    it('should close session even on error', async () => {
      mockSession.run.mockRejectedValue(new Error('Query failed'));
      
      await expect(service.read('MATCH (n) RETURN n')).rejects.toThrow('Query failed');
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('write method', () => {
    it('should execute write query and close session', async () => {
      mockSession.run.mockResolvedValue({ records: [] });
      
      await service.write('CREATE (n:Test) RETURN n', { name: 'test' });
      
      expect(mockSession.run).toHaveBeenCalledWith('CREATE (n:Test) RETURN n', { name: 'test' });
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('writeMany method', () => {
    it('should execute multiple queries in sequence', async () => {
      mockSession.run.mockResolvedValue({ records: [] });
      
      const queries = [
        { cypher: 'CREATE (n:Test1) RETURN n' },
        { cypher: 'CREATE (n:Test2) RETURN n', params: { name: 'test' } },
      ];
      
      const results = await service.writeMany(queries);
      
      expect(mockSession.run).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should close driver on module destroy', async () => {
      await service.onModuleDestroy();

      expect(mockDriver.close).toHaveBeenCalled();
    });
  });

  describe('Session Handling', () => {
    it('should handle session creation errors gracefully', () => {
      mockDriver.session.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      expect(() => service.getReadSession()).toThrow('Connection failed');
    });
  });
});
