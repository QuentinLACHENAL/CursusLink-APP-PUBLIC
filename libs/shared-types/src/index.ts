/**
 * @fileoverview Types partagés entre le frontend et le backend CursusLink
 * 
 * Ce module contient les types de données utilisés à la fois par l'API NestJS
 * et l'application Next.js. Utiliser ces types garantit la cohérence des contrats
 * API et évite les erreurs de type à l'exécution.
 * 
 * @module @cursuslink/shared-types
 */

// ============================================================================
// HIERARCHY TYPES (Constellation System)
// ============================================================================

/**
 * Types de noeuds dans la nouvelle hiérarchie constellation
 * blackhole → constellation → star → planet → satellite
 */
export type NodeHierarchyType = 
  | 'blackhole'     // Centre de la galaxie (racine)
  | 'constellation' // Matière/Domaine
  | 'star'          // Chapitre
  | 'planet'        // Cours/Leçon
  | 'satellite'     // Exercice
  | 'project';      // Projet spécial

/**
 * Anciens types de noeuds (pour rétrocompatibilité)
 * @deprecated Utiliser NodeHierarchyType à la place
 */
export type LegacyNodeType = 
  | 'root' 
  | 'region' 
  | 'topic' 
  | 'Project' 
  | 'exercise';

/**
 * Type combiné acceptant les anciens et nouveaux types
 */
export type NodeType = NodeHierarchyType | LegacyNodeType;

/**
 * Mapping des anciens types vers les nouveaux
 */
export const NODE_TYPE_MIGRATION: Record<string, NodeHierarchyType> = {
  'root': 'blackhole',
  'galaxy': 'constellation',
  'region': 'star',
  'topic': 'planet',
  'exercise': 'satellite',
  'Project': 'project',
  // Nouveaux types (identité)
  'blackhole': 'blackhole',
  'constellation': 'constellation',
  'star': 'star',
  'planet': 'planet',
  'satellite': 'satellite',
  'project': 'project',
};

// ============================================================================
// EXERCISE TYPES
// ============================================================================

/**
 * Types d'exercices supportés
 */
export type ExerciseType = 
  | 'none'          // Pas d'exercice
  | 'qcm'           // Questions à choix multiples
  | 'schema'        // Schéma interactif
  | 'matching'      // Association
  | 'code'          // Exercice de code
  | 'text-fill'     // Texte à trous
  | 'order'         // Remise en ordre
  | 'categorization'// Catégorisation
  | 'axis'          // Placement sur un axe
  | 'estimation'    // Estimation
  | 'video';        // Vidéo interactive

/**
 * Condition de déblocage d'un noeud
 */
export type UnlockCondition = 'AND' | 'OR';

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

/**
 * Types de relations valides dans le graphe
 */
export const VALID_RELATIONSHIP_TYPES = [
  'UNLOCKS',    // Débloque un autre noeud
  'REQUIRES',   // Requiert un prérequis
  'MASTERED',   // Relation User -> Skill (maîtrisé)
  'CONTAINS',   // Contient (hiérarchie)
  'BELONGS_TO', // Appartient à
  'ORBITS',     // Orbite autour de (constellation)
  'PART_OF',    // Fait partie de
  'HAS_EXERCISE' // Lien vers un exercice
] as const;

export type RelationshipType = typeof VALID_RELATIONSHIP_TYPES[number];

// ============================================================================
// NODE ENTITIES
// ============================================================================

/**
 * Configuration visuelle d'un noeud
 */
export interface NodeVisualConfig {
  color?: string;
  size?: number;
  icon?: string;
  glow?: boolean;
  ringColor?: string;
}

/**
 * Représentation d'un noeud du graphe
 */
export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  group?: string;
  
  // Hiérarchie constellation
  galaxy?: string;
  constellation?: string;
  parentStar?: string;
  
  // Progression
  xp: number;
  level: number;
  unlockCondition: UnlockCondition;
  
  // Contenu éducatif
  courseContent?: string;
  exerciseDescription?: string;
  evaluationGrid?: string;
  gradingGrid?: string;
  minimumScore: number;
  
  // Exercice (legacy - préférer la relation HAS_EXERCISE)
  /** @deprecated Utiliser la relation HAS_EXERCISE vers un noeud Exercise */
  exerciseType?: ExerciseType;
  /** @deprecated Utiliser la relation HAS_EXERCISE vers un noeud Exercise */
  exerciseData?: string;
  
  // Position dans le graphe
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
  
  // Configuration visuelle
  visualConfig?: NodeVisualConfig;
}

/**
 * Représentation d'une relation entre noeuds
 */
export interface GraphLink {
  source: string;
  target: string;
  type: RelationshipType;
}

/**
 * Représentation d'un exercice
 */
export interface Exercise {
  id: string;
  type: ExerciseType;
  data: string; // JSON stringifié
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * Rôles utilisateur
 */
export type UserRole = 'STUDENT' | 'PROF' | 'ADMIN';

/**
 * Statut de correction
 */
export type CorrectionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/**
 * Représentation simplifiée d'un utilisateur
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  xp: number;
  level: number;
  isBanned: boolean;
  avatarUrl?: string;
  coalitionId?: string;
}

/**
 * Progression d'un utilisateur sur un skill
 */
export interface UserSkillProgress {
  skillId: string;
  skillLabel: string;
  masteredAt: string;
  xpAwarded: number;
  score: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Payload pour créer un noeud
 */
export interface CreateNodePayload {
  id?: string;
  label: string;
  type?: NodeType;
  group?: string;
  galaxy?: string;
  constellation?: string;
  parentStar?: string;
  xp?: number;
  level?: number;
  unlockCondition?: UnlockCondition;
  exerciseDescription?: string;
  evaluationGrid?: string;
  gradingGrid?: string;
  minimumScore?: number;
  courseContent?: string;
  exerciseType?: ExerciseType;
  exerciseData?: string;
  visualConfig?: NodeVisualConfig;
  fx?: number;
  fy?: number;
}

/**
 * Payload pour mettre à jour un noeud
 */
export type UpdateNodePayload = Partial<CreateNodePayload>;

/**
 * Payload pour créer une relation
 */
export interface CreateRelationshipPayload {
  source: string;
  target: string;
  type: RelationshipType;
}

/**
 * Payload pour soumettre un exercice
 */
export interface SubmitExercisePayload {
  nodeId: string;
  answers: Record<string, number | number[]>;
}

/**
 * Réponse d'un exercice soumis
 */
export interface ExerciseResult {
  success: boolean;
  score: number;
  passed: boolean;
  validation?: {
    message: string;
    newXp: number;
  };
  details: Array<{
    questionIndex: number;
    isCorrect: boolean;
  }>;
}

// ============================================================================
// GRAPH STRUCTURE TYPES
// ============================================================================

/**
 * Structure complète du graphe
 */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Structure hiérarchique pour l'admin
 */
export interface GalaxyStructure {
  constellations: ConstellationData[];
}

export interface ConstellationData {
  id: string;
  label: string;
  type: 'constellation';
  stars: StarData[];
}

export interface StarData {
  id: string;
  label: string;
  type: 'star';
  planets: PlanetData[];
}

export interface PlanetData {
  id: string;
  label: string;
  type: 'planet';
  xp: number;
  exerciseType?: ExerciseType;
  satellites: SatelliteData[];
}

export interface SatelliteData {
  id: string;
  label: string;
  type: 'satellite';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Migre un ancien type de noeud vers le nouveau système
 */
export function migrateNodeType(type: string): NodeHierarchyType {
  return NODE_TYPE_MIGRATION[type] || 'planet';
}

/**
 * Vérifie si un type de relation est valide
 */
export function isValidRelationshipType(type: string): type is RelationshipType {
  return (VALID_RELATIONSHIP_TYPES as readonly string[]).includes(type);
}
