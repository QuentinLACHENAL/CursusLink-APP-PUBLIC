/**
 * @fileoverview Mocks et utilitaires pour les tests
 * 
 * Ce fichier centralise tous les mocks utilisés dans les tests unitaires
 * pour garantir la cohérence et faciliter la maintenance.
 */

import { User } from '../../src/users/entities/user.entity';

// ============================================================================
// NEO4J MOCKS
// ============================================================================

/**
 * Mock d'une session Neo4j
 */
export const createMockNeo4jSession = () => ({
  run: jest.fn().mockResolvedValue({ records: [] }),
  close: jest.fn().mockResolvedValue(undefined),
  beginTransaction: jest.fn().mockReturnValue({
    run: jest.fn().mockResolvedValue({ records: [] }),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  }),
});

/**
 * Mock du service Neo4j
 */
export const createMockNeo4jService = () => ({
  getReadSession: jest.fn().mockReturnValue(createMockNeo4jSession()),
  getWriteSession: jest.fn().mockReturnValue(createMockNeo4jSession()),
});

/**
 * Crée un record Neo4j mock
 */
export const createNeo4jRecord = (data: Record<string, any>) => ({
  get: (key: string) => data[key],
  keys: Object.keys(data),
  toObject: () => data,
});

/**
 * Crée un résultat Neo4j mock
 */
export const createNeo4jResult = (records: Array<Record<string, any>>) => ({
  records: records.map(createNeo4jRecord),
});

// ============================================================================
// USER MOCKS
// ============================================================================

/**
 * Crée un utilisateur de test
 */
export const createMockUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  user.id = overrides.id || 'test-user-id';
  user.email = overrides.email || 'test@example.com';
  user.passwordHash = overrides.passwordHash || '$2b$10$hashedPassword';
  user.firstName = overrides.firstName || 'Test';
  user.lastName = overrides.lastName || 'User';
  user.role = overrides.role || 'STUDENT';
  user.isBanned = overrides.isBanned || false;
  user.school = overrides.school || 'Test School';
  // Note: xp is stored in Neo4j, not in the User entity
  user.credits = overrides.credits || 100;
  user.inventory = overrides.inventory || [];
  return user;
};

/**
 * Mock du repository User
 */
export const createMockUserRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  findOneBy: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'generated-id' })),
  save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  remove: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
});

// ============================================================================
// GRAPH MOCKS
// ============================================================================

/**
 * Crée un noeud de graphe mock
 */
export const createMockGraphNode = (overrides: any = {}) => ({
  id: overrides.id || 'test-node-id',
  label: overrides.label || 'Test Node',
  type: overrides.type || 'planet',
  group: overrides.group || 'test-group',
  constellation: overrides.constellation || 'Test Constellation',
  xp: overrides.xp || 100,
  level: overrides.level || 1,
  unlockCondition: overrides.unlockCondition || 'AND',
  minimumScore: overrides.minimumScore || 80,
  exerciseType: overrides.exerciseType || 'none',
  exerciseData: overrides.exerciseData || '',
  courseContent: overrides.courseContent || '',
  ...overrides,
});

/**
 * Crée une relation mock
 */
export const createMockRelationship = (overrides: any = {}) => ({
  source: overrides.source || 'source-id',
  target: overrides.target || 'target-id',
  type: overrides.type || 'UNLOCKS',
  ...overrides,
});

// ============================================================================
// CORRECTION MOCKS
// ============================================================================

/**
 * Mock d'une correction
 */
export const createMockCorrection = (overrides: any = {}) => ({
  id: overrides.id || 'correction-id',
  studentId: overrides.studentId || 'student-id',
  correctorId: overrides.correctorId || null,
  projectId: overrides.projectId || 'project-id',
  status: overrides.status || 'PENDING',
  mark: overrides.mark || null,
  comments: overrides.comments || null,
  submissionData: overrides.submissionData || null,
  createdAt: overrides.createdAt || new Date(),
  updatedAt: overrides.updatedAt || new Date(),
  ...overrides,
});

/**
 * Mock du repository Correction
 */
export const createMockCorrectionRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'generated-id' })),
  save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  remove: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }),
});

// ============================================================================
// SERVICE MOCKS
// ============================================================================

/**
 * Mock du GraphService
 */
export const createMockGraphService = () => ({
  getGraph: jest.fn().mockResolvedValue({ nodes: [], links: [] }),
  getNodeById: jest.fn().mockResolvedValue(null),
  createNode: jest.fn().mockResolvedValue(createMockGraphNode()),
  updateNode: jest.fn().mockResolvedValue(createMockGraphNode()),
  deleteNode: jest.fn().mockResolvedValue({ success: true }),
  validateSkill: jest.fn().mockResolvedValue({ message: 'Skill validated', newXp: 100 }),
});

/**
 * Mock du UsersService
 */
export const createMockUsersService = () => ({
  create: jest.fn().mockResolvedValue(createMockUser()),
  findAll: jest.fn().mockResolvedValue([]),
  findOneByEmail: jest.fn().mockResolvedValue(null),
  setBanStatus: jest.fn().mockResolvedValue(createMockUser()),
  deleteUser: jest.fn().mockResolvedValue({ affected: 1 }),
  getUserProfile: jest.fn().mockResolvedValue({
    id: 'test-id',
    email: 'test@example.com',
    xp: 100,
    level: 1,
  }),
});

/**
 * Mock du JwtService
 */
export const createMockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 'test-user-id', email: 'test@example.com' }),
});

/**
 * Mock du CoalitionsService
 */
export const createMockCoalitionsService = () => ({
  findAll: jest.fn().mockResolvedValue([]),
  findBySchool: jest.fn().mockResolvedValue([]),
  addPointsToCoalition: jest.fn().mockResolvedValue({ success: true }),
});

// ============================================================================
// REQUEST/RESPONSE MOCKS
// ============================================================================

/**
 * Mock d'une requête Express avec user JWT
 */
export const createMockRequest = (overrides: any = {}) => ({
  user: {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'STUDENT',
    ...overrides.user,
  },
  body: overrides.body || {},
  params: overrides.params || {},
  query: overrides.query || {},
});

/**
 * Mock d'une réponse Express
 */
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

interface QCMQuestion {
  question: string;
  options: string[];
  correct: number;
  multipleAnswers: boolean;
}

/**
 * Génère des données QCM de test
 */
export const generateQCMData = (questionCount: number = 3): string => {
  const questions: QCMQuestion[] = [];
  for (let i = 0; i < questionCount; i++) {
    questions.push({
      question: `Question ${i + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: i % 4,
      multipleAnswers: false,
    });
  }
  return JSON.stringify(questions);
};

/**
 * Génère des réponses QCM correctes
 */
export const generateCorrectAnswers = (questionCount: number = 3) => {
  const answers: Record<string, number> = {};
  for (let i = 0; i < questionCount; i++) {
    answers[i.toString()] = i % 4;
  }
  return answers;
};

/**
 * Génère des réponses QCM incorrectes
 */
export const generateWrongAnswers = (questionCount: number = 3) => {
  const answers: Record<string, number> = {};
  for (let i = 0; i < questionCount; i++) {
    answers[i.toString()] = (i + 1) % 4; // Décalage pour avoir des mauvaises réponses
  }
  return answers;
};
