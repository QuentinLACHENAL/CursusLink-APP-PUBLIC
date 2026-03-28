import { Test, TestingModule } from '@nestjs/testing';
import { CorrectionsService } from '../../src/corrections/corrections.service';
import { GraphService } from '../../src/graph/graph.service';
import { CoalitionsService } from '../../src/coalitions/coalitions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Correction, CorrectionStatus } from '../../src/corrections/entities/correction.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockGraphNode } from '../utils/test-mocks';

describe('CorrectionsService', () => {
  let service: CorrectionsService;
  let mockCorrectionRepository: any;
  let mockGraphService: any;
  let mockCoalitionsService: any;

  const mockCorrection = {
    id: 'correction-1',
    studentId: 'student-1',
    correctorId: null,
    projectId: 'project-1',
    status: CorrectionStatus.PENDING,
    submissionData: '{}',
    mark: null,
    comments: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockCorrectionRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(dto => ({ id: 'new-id', ...dto })),
      save: jest.fn().mockImplementation(entity => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCorrection]),
        getOne: jest.fn().mockResolvedValue(mockCorrection),
      }),
    };

    mockGraphService = {
      getNodeById: jest.fn().mockResolvedValue(createMockGraphNode({ id: 'project-1', label: 'Test Project' })),
      validateSkill: jest.fn().mockResolvedValue({ message: 'Validated', newXp: 100 }),
    };

    mockCoalitionsService = {
      addPointsToCoalition: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorrectionsService,
        { provide: getRepositoryToken(Correction), useValue: mockCorrectionRepository },
        { provide: GraphService, useValue: mockGraphService },
        { provide: CoalitionsService, useValue: mockCoalitionsService },
      ],
    }).compile();

    service = module.get<CorrectionsService>(CorrectionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestCorrection', () => {
    it('should create a new correction request', async () => {
      mockCorrectionRepository.findOne.mockResolvedValue(null);

      const result = await service.requestCorrection('student-1', 'project-1', '{}');

      expect(result).toBeDefined();
      expect(mockCorrectionRepository.create).toHaveBeenCalledWith({
        studentId: 'student-1',
        projectId: 'project-1',
        submissionData: '{}',
        status: CorrectionStatus.PENDING,
      });
      expect(mockCorrectionRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if correction already exists', async () => {
      mockCorrectionRepository.findOne.mockResolvedValue(mockCorrection);

      await expect(
        service.requestCorrection('student-1', 'project-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAvailableCorrections', () => {
    it('should return available corrections excluding own requests', async () => {
      const result = await service.findAvailableCorrections('user-1', false);

      expect(result).toBeDefined();
      const queryBuilder = mockCorrectionRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'correction.studentId != :userId',
        { userId: 'user-1' }
      );
    });

    it('should return all corrections for admin', async () => {
      const result = await service.findAvailableCorrections('admin-1', true);

      expect(result).toBeDefined();
      const queryBuilder = mockCorrectionRepository.createQueryBuilder();
      expect(queryBuilder.where).toHaveBeenCalled();
    });

    it('should filter out corrections with deleted projects', async () => {
      mockGraphService.getNodeById.mockResolvedValue(null);

      const result = await service.findAvailableCorrections('user-1', false);

      expect(result).toHaveLength(0);
    });
  });

  describe('findMyRequests', () => {
    it('should return user correction requests', async () => {
      mockCorrectionRepository.find.mockResolvedValue([mockCorrection]);

      const result = await service.findMyRequests('student-1');

      expect(result).toHaveLength(1);
      expect(mockCorrectionRepository.find).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        relations: ['corrector'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should mark deleted projects', async () => {
      mockCorrectionRepository.find.mockResolvedValue([mockCorrection]);
      mockGraphService.getNodeById.mockResolvedValue(null);

      const result = await service.findMyRequests('student-1');

      expect(result[0].projectLabel).toBe('Projet supprimé');
    });
  });

  describe('findAllHistory', () => {
    it('should return all corrections with relations', async () => {
      mockCorrectionRepository.find.mockResolvedValue([mockCorrection]);

      const result = await service.findAllHistory();

      expect(mockCorrectionRepository.find).toHaveBeenCalledWith({
        relations: ['student', 'corrector'],
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });

    it('should limit results to 100', async () => {
      mockCorrectionRepository.find.mockResolvedValue([mockCorrection]);

      await service.findAllHistory();

      expect(mockCorrectionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });
});
