import { Test, TestingModule } from '@nestjs/testing';
import { ExercisesService } from '../../src/exercises/exercises.service';
import { Neo4jService } from '../../src/neo4j/neo4j.service';
import { GraphCrudService } from '../../src/graph/services/graph-crud.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  createMockNeo4jService,
  createMockNeo4jSession,
  createNeo4jResult,
  generateQCMData,
  generateCorrectAnswers,
  generateWrongAnswers,
} from '../utils/test-mocks';

describe('ExercisesService', () => {
  let exercisesService: ExercisesService;
  let neo4jService: any;
  let graphCrudService: any;
  let mockSession: any;

  beforeEach(async () => {
    mockSession = createMockNeo4jSession();
    const mockNeo4jService = createMockNeo4jService();
    mockNeo4jService.getReadSession.mockReturnValue(mockSession);

    const mockGraphCrudService = {
      validateSkill: jest.fn().mockResolvedValue({ message: 'Success', newXp: 100 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: Neo4jService, useValue: mockNeo4jService },
        { provide: GraphCrudService, useValue: mockGraphCrudService },
      ],
    }).compile();

    exercisesService = module.get<ExercisesService>(ExercisesService);
    neo4jService = module.get(Neo4jService);
    graphCrudService = module.get(GraphCrudService);
  });

  describe('submitQCM', () => {
    const userId = 'test-user-id';
    const nodeId = 'test-node-id';

    it('should return passed=true when score meets minimumScore', async () => {
      const qcmData = generateQCMData(3);
      const answers = generateCorrectAnswers(3);

      mockSession.run.mockResolvedValue(
        createNeo4jResult([{
          data: qcmData,
          xp: { low: 100 },
          minScore: { low: 80 },
        }])
      );

      const result = await exercisesService.submitQCM(userId, { nodeId, answers });

      expect(result.success).toBe(true);
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(graphCrudService.validateSkill).toHaveBeenCalledWith(userId, nodeId, 100);
    });

    it('should return passed=false when score is below minimumScore', async () => {
      const qcmData = generateQCMData(3);
      const answers = generateWrongAnswers(3);

      mockSession.run.mockResolvedValue(
        createNeo4jResult([{
          data: qcmData,
          xp: { low: 100 },
          minScore: { low: 80 },
        }])
      );

      const result = await exercisesService.submitQCM(userId, { nodeId, answers });

      expect(result.success).toBe(true);
      expect(result.score).toBeLessThan(80);
      expect(result.passed).toBe(false);
      expect(graphCrudService.validateSkill).not.toHaveBeenCalled();
    });

    it('should use dynamic minimumScore from database', async () => {
      const qcmData = generateQCMData(2);
      // 1 bonne réponse sur 2 = 50%
      const answers = { '0': 0, '1': 99 }; // Premier correct, second incorrect

      mockSession.run.mockResolvedValue(
        createNeo4jResult([{
          data: qcmData,
          xp: { low: 50 },
          minScore: { low: 50 }, // Score minimum de 50%
        }])
      );

      const result = await exercisesService.submitQCM(userId, { nodeId, answers });

      // 50% devrait passer avec un minimum de 50%
      expect(result.passed).toBe(true);
    });

    it('should throw NotFoundException when node does not exist', async () => {
      mockSession.run.mockResolvedValue(createNeo4jResult([]));

      await expect(
        exercisesService.submitQCM(userId, { nodeId: 'nonexistent', answers: {} })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when exercise data is missing', async () => {
      mockSession.run.mockResolvedValue(
        createNeo4jResult([{
          data: null,
          xp: { low: 100 },
          minScore: { low: 80 },
        }])
      );

      await expect(
        exercisesService.submitQCM(userId, { nodeId, answers: {} })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when exercise data is corrupted', async () => {
      mockSession.run.mockResolvedValue(
        createNeo4jResult([{
          data: 'invalid-json-{{{',
          xp: { low: 100 },
          minScore: { low: 80 },
        }])
      );

      await expect(
        exercisesService.submitQCM(userId, { nodeId, answers: {} })
      ).rejects.toThrow(BadRequestException);
    });

    it('should return detailed results for each question', async () => {
      const qcmData = generateQCMData(3);
      const answers = { '0': 0, '1': 99, '2': 2 }; // First and third correct

      mockSession.run.mockResolvedValue(
        createNeo4jResult([{
          data: qcmData,
          xp: { low: 100 },
          minScore: { low: 80 },
        }])
      );

      const result = await exercisesService.submitQCM(userId, { nodeId, answers });

      expect(result.details).toHaveLength(3);
      expect(result.details[0].isCorrect).toBe(true);
      expect(result.details[1].isCorrect).toBe(false);
      expect(result.details[2].isCorrect).toBe(true);
    });

    it('should handle multiple answer questions correctly', async () => {
      const multiAnswerQCM = JSON.stringify([{
        question: 'Select all correct options',
        options: ['A', 'B', 'C', 'D'],
        correct: [0, 2],
        multipleAnswers: true,
      }]);

      mockSession.run.mockResolvedValue(
        createNeo4jResult([{
          data: multiAnswerQCM,
          xp: { low: 100 },
          minScore: { low: 80 },
        }])
      );

      // Correct multiple answers
      const result = await exercisesService.submitQCM(userId, {
        nodeId,
        answers: { '0': [0, 2] },
      });

      expect(result.score).toBe(100);
      expect(result.details[0].isCorrect).toBe(true);
    });

    it('should close session after successful execution', async () => {
      const qcmData = generateQCMData(1);

      mockSession.run.mockResolvedValue(
        createNeo4jResult([{
          data: qcmData,
          xp: { low: 100 },
          minScore: { low: 80 },
        }])
      );

      await exercisesService.submitQCM(userId, { nodeId, answers: { '0': 0 } });

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even on error', async () => {
      mockSession.run.mockResolvedValue(createNeo4jResult([]));

      await expect(
        exercisesService.submitQCM(userId, { nodeId, answers: {} })
      ).rejects.toThrow();

      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});
