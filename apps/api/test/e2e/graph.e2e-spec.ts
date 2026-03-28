import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Neo4jService } from '../../src/neo4j/neo4j.service';

// TODO: These tests need to be rewritten to match actual API routes
// Actual routes: /graph/node (singular), /graph/relationship, etc.
describe.skip('Graph Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let userToken: string;
  let mockSession: any;
  let mockNeo4jService: any;

  beforeAll(async () => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
      beginTransaction: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({ records: [] }),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      }),
    };

    mockNeo4jService = {
      getReadSession: jest.fn().mockReturnValue(mockSession),
      getWriteSession: jest.fn().mockReturnValue(mockSession),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Neo4jService)
      .useValue(mockNeo4jService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    adminToken = jwtService.sign({ sub: 1, login: 'admin', role: 'admin' });
    userToken = jwtService.sign({ sub: 2, login: 'user', role: 'user' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /graph', () => {
    it('should return graph data', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [{
          get: () => ({
            properties: { id: 'node-1', label: 'Test Node', type: 'planet' },
          }),
        }],
      });

      return request(app.getHttpServer())
        .get('/graph')
        .expect(200)
        .expect(res => {
          expect(res.body).toBeDefined();
        });
    });

    it('should work without authentication', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      return request(app.getHttpServer())
        .get('/graph')
        .expect(200);
    });
  });

  describe('POST /graph/nodes', () => {
    it('should return 401 without authentication', async () => {
      return request(app.getHttpServer())
        .post('/graph/nodes')
        .send({ label: 'Test', type: 'planet' })
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      return request(app.getHttpServer())
        .post('/graph/nodes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ label: 'Test', type: 'planet' })
        .expect(403);
    });

    it('should create node as admin', async () => {
      mockSession.run.mockResolvedValue({
        records: [{
          get: () => ({
            properties: { id: 'new-node', label: 'Test Node', type: 'planet' },
          }),
        }],
      });

      return request(app.getHttpServer())
        .post('/graph/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'Test Node', type: 'planet' })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('label', 'Test Node');
        });
    });

    it('should validate required fields', async () => {
      return request(app.getHttpServer())
        .post('/graph/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should reject invalid type', async () => {
      return request(app.getHttpServer())
        .post('/graph/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'Test', type: 'invalid_type' })
        .expect(400);
    });
  });

  describe('PUT /graph/nodes/:id', () => {
    it('should update node as admin', async () => {
      mockSession.run
        .mockResolvedValueOnce({
          records: [{
            get: () => ({ properties: { id: 'node-1', label: 'Old Label' } }),
          }],
        })
        .mockResolvedValueOnce({
          records: [{
            get: () => ({ properties: { id: 'node-1', label: 'New Label' } }),
          }],
        });

      return request(app.getHttpServer())
        .put('/graph/nodes/node-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'New Label' })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('label', 'New Label');
        });
    });

    it('should return 404 for non-existent node', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      return request(app.getHttpServer())
        .put('/graph/nodes/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /graph/nodes/:id', () => {
    it('should delete node as admin with XP recalculation', async () => {
      const mockTransaction = {
        run: jest.fn()
          .mockResolvedValueOnce({ records: [{ get: () => 'Test Node' }] })
          .mockResolvedValueOnce({ records: [] })
          .mockResolvedValueOnce({ records: [] }),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };
      mockSession.beginTransaction.mockReturnValue(mockTransaction);

      return request(app.getHttpServer())
        .delete('/graph/nodes/node-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('success', true);
        });
    });

    it('should return 403 for non-admin', async () => {
      return request(app.getHttpServer())
        .delete('/graph/nodes/node-1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /graph/relationships', () => {
    it('should create valid relationship', async () => {
      mockSession.run.mockResolvedValue({ records: [{}] });

      return request(app.getHttpServer())
        .post('/graph/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceId: 'node-1',
          targetId: 'node-2',
          type: 'UNLOCKS',
        })
        .expect(201);
    });

    it('should reject invalid relationship type', async () => {
      return request(app.getHttpServer())
        .post('/graph/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceId: 'node-1',
          targetId: 'node-2',
          type: 'INVALID_TYPE',
        })
        .expect(400);
    });

    it('should reject self-referencing relationship', async () => {
      return request(app.getHttpServer())
        .post('/graph/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceId: 'node-1',
          targetId: 'node-1',
          type: 'UNLOCKS',
        })
        .expect(400);
    });
  });

  describe('DELETE /graph/relationships', () => {
    it('should delete relationship', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      return request(app.getHttpServer())
        .delete('/graph/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceId: 'node-1',
          targetId: 'node-2',
          type: 'UNLOCKS',
        })
        .expect(200);
    });
  });

  describe('POST /graph/validate-skill', () => {
    it('should validate skill and update XP', async () => {
      mockSession.run
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({
          records: [{
            get: (key: string) => key === 'totalXp' ? { low: 100 } : 'Test Skill',
          }],
        });

      return request(app.getHttpServer())
        .post('/graph/validate-skill')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ skillId: 'skill-1', xp: 50 })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('newXp');
        });
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .post('/graph/validate-skill')
        .send({ skillId: 'skill-1', xp: 50 })
        .expect(401);
    });
  });
});

// TODO: These tests need to be rewritten to match actual API routes
describe.skip('Exercise Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userToken: string;
  let mockSession: any;
  let mockNeo4jService: any;

  beforeAll(async () => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockNeo4jService = {
      getReadSession: jest.fn().mockReturnValue(mockSession),
      getWriteSession: jest.fn().mockReturnValue(mockSession),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Neo4jService)
      .useValue(mockNeo4jService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userToken = jwtService.sign({ sub: 1, login: 'user', role: 'user' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /exercises/submit-qcm', () => {
    it('should evaluate QCM with dynamic pass rate', async () => {
      const mockSkillNode = {
        properties: {
          id: 'skill-1',
          label: 'Test Skill',
          exerciseData: JSON.stringify([
            { question: 'Q1?', options: ['A', 'B', 'C'], correctAnswer: 0 },
            { question: 'Q2?', options: ['A', 'B', 'C'], correctAnswer: 1 },
          ]),
          minimumScore: 80,
          xp: 100,
        },
      };

      mockSession.run
        .mockResolvedValueOnce({
          records: [{ get: () => mockSkillNode }],
        })
        .mockResolvedValueOnce({ records: [] }); // MASTERED creation

      return request(app.getHttpServer())
        .post('/exercises/submit-qcm')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          skillId: 'skill-1',
          answers: [0, 1], // Both correct = 100%
        })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('passed', true);
          expect(res.body).toHaveProperty('score', 100);
        });
    });

    it('should fail when below minimum score', async () => {
      const mockSkillNode = {
        properties: {
          id: 'skill-1',
          exerciseData: JSON.stringify([
            { question: 'Q1?', options: ['A', 'B'], correctAnswer: 0 },
            { question: 'Q2?', options: ['A', 'B'], correctAnswer: 0 },
          ]),
          minimumScore: 80,
        },
      };

      mockSession.run.mockResolvedValueOnce({
        records: [{ get: () => mockSkillNode }],
      });

      return request(app.getHttpServer())
        .post('/exercises/submit-qcm')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          skillId: 'skill-1',
          answers: [0, 1], // Only 50% correct
        })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('passed', false);
          expect(res.body.score).toBeLessThan(80);
        });
    });

    it('should validate answer array length', async () => {
      const mockSkillNode = {
        properties: {
          id: 'skill-1',
          exerciseData: JSON.stringify([
            { question: 'Q1?', options: ['A', 'B'], correctAnswer: 0 },
          ]),
        },
      };

      mockSession.run.mockResolvedValueOnce({
        records: [{ get: () => mockSkillNode }],
      });

      return request(app.getHttpServer())
        .post('/exercises/submit-qcm')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          skillId: 'skill-1',
          answers: [0, 1, 2], // Too many answers
        })
        .expect(400);
    });

    it('should return 404 for non-existent skill', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      return request(app.getHttpServer())
        .post('/exercises/submit-qcm')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          skillId: 'nonexistent',
          answers: [0],
        })
        .expect(404);
    });
  });
});
