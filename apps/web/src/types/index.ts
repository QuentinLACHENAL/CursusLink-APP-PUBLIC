/**
 * Types partagés pour CursusLink Frontend
 * Ce fichier centralise toutes les interfaces TypeScript du projet
 */

// ===========================================
// USER TYPES
// ===========================================

export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN' | 'PROF';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
  credits: number;
  inventory: string[];
  title?: string;
  nameColor?: string;
  avatarBorder?: string;
  coalition: string;
  role: UserRole;
  school?: string;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  xp: number;
  level: number;
  levelProgress: number;
  masteredSkills: MasteredSkill[];
  rank?: number;
}

export interface MasteredSkill {
  id: string;
  label: string;
  date: string;
  xpAwarded: number;
}

export interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  title?: string;
  nameColor?: string;
  avatarBorder?: string;
  coalition: string;
  xp: number;
  level: number;
  rank: number;
}

// ===========================================
// GRAPH / NODE TYPES
// ===========================================

export type NodeType = 
  // Legacy types
  | 'root' | 'region' | 'topic' | 'Project' | 'exercise'
  // New Hierarchy types
  | 'blackhole' | 'constellation' | 'star' | 'planet' | 'satellite' | 'project';

export type ExerciseType = 
  | 'none' | 'qcm' | 'schema' | 'matching' | 'code' | 'text-fill' 
  | 'order' | 'categorization' | 'axis' | 'estimation' | 'video';

export type UnlockCondition = 'AND' | 'OR';

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  galaxy: string;
  // Nouveaux champs hiérarchiques
  constellation?: string;
  parentStar?: string;
  orbitRing?: number; // Cercle orbital (0 = étoile centrale, 1+ = cercles concentriques)

  type: NodeType;
  level: number;
  xp: number;
  unlockCondition: UnlockCondition;
  validationType?: 'auto' | 'peer' | 'teacher'; // Mode de validation
  exerciseDescription?: string;
  evaluationGrid?: string;
  gradingGrid?: string;
  minimumScore: number;
  courseContent?: string;
  exerciseType: ExerciseType;
  exerciseData?: string;
  // Configuration pour la validation par les pairs
  peerValidationConfig?: string; // JSON string of PeerValidationConfig
  fx?: number;
  fy?: number;
  visualConfig?: string; // JSON string
  
  // Données calculées côté frontend
  x?: number;
  y?: number;
  isUnlocked?: boolean;
  isMastered?: boolean;
  userProgress?: number;
  exerciseUpdatedAt?: string;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'UNLOCKS' | 'REQUIRES' | 'MASTERED' | 'CONTAINS' | 'BELONGS_TO' | 'ORBITS' | 'PART_OF';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Configuration de la validation par les pairs
export interface PeerValidationConfig {
  type: 'grid' | 'questions';
  // Pour le type 'grid'
  grid?: { 
    id: string;
    label: string; 
    points?: number; // Optionnel, pour pondération
  }[];
  // Pour le type 'questions'
  questions?: { 
    pool: string[]; 
    countToAsk: number; 
  };
}

// Structure arborescente pour l'admin (remplace les 'any')
export interface StructureGroup {
    name: string;
    nodes: GraphNode[];
}

export interface StructureGalaxy {
    name: string;
    groups: Record<string, StructureGroup>;
}

export type Structure = Record<string, StructureGalaxy>;

// Deprecated (Legacy)
export interface GalaxyStructure {
  id: string;
  name: string;
  systems: SystemStructure[];
}

export interface SystemStructure {
  id: string;
  name: string;
  nodes: GraphNode[];
}

// ===========================================
// CORRECTION TYPES
// ===========================================

export type CorrectionStatus = 'PENDING' | 'IN_PROGRESS' | 'VALIDATED' | 'FAILED';

export interface Correction {
  id: string;
  studentId: string;
  correctorId?: string;
  projectId: string;
  submissionData?: string;
  finalMark?: number;
  comments?: string;
  status: CorrectionStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  student?: User;
  corrector?: User;
  projectLabel?: string;
  projectDetails?: GraphNode;
}

// ===========================================
// COALITION TYPES
// ===========================================

export interface Coalition {
  id: string;
  name: string;
  color: string;
  score: number;
  memberCount: number;
}

// ===========================================
// SHOP TYPES
// ===========================================

export type ItemType = 'title' | 'color' | 'border' | 'avatar';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  value: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  preview?: string;
}

// ===========================================
// EXERCISE TYPES
// ===========================================

export interface QCMQuestion {
  id: string;
  question: string;
  answers: QCMAnswer[];
  explanation?: string;
}

export interface QCMAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QCMConfig {
  id: string;
  title: string;
  description?: string;
  questions: QCMQuestion[];
  timeLimit?: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
}

export interface SchemaExerciseConfig {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  zones: SchemaZone[];
  timeLimit?: number;
}

export interface SchemaZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  correctAnswer: string;
}

export interface SchemaExerciseSubmission {
  answers: Record<string, string>;
  timeSpent: number;
}

// ===========================================
// RESOURCE / LIBRARY TYPES
// ===========================================

export interface Resource {
  id: string;
  type: 'exercise' | 'document' | 'video' | 'link';
  name: string;
  description?: string;
  category: string;
  filiere: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  exerciseType?: ExerciseType;
  exerciseData?: string;
  linkedNodes: string[];
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
}

// ===========================================
// ACTIVITY / FEED TYPES
// ===========================================

export interface ActivityItem {
  id: string;
  type: 'validation' | 'correction' | 'achievement' | 'purchase';
  userId: string;
  userName: string;
  userAvatar?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ===========================================
// SETTINGS TYPES
// ===========================================

export interface GlobalSettings {
  bgUrl?: string;
  bgScale?: number;
  bgOffsetX?: number;
  bgOffsetY?: number;
  theme?: 'dark' | 'light';
}
