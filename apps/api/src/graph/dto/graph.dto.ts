import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, Min, Max, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// === NOUVEAUX TYPES (REFONTE CONSTELLATION) ===
// Hiérarchie: blackhole (centre) → constellation (matière) → star (chapitre) → planet (cours) → satellite (exercice)
export type NodeHierarchyType = 'blackhole' | 'constellation' | 'star' | 'planet' | 'satellite' | 'project';

// Anciens types (rétrocompatibilité)
export type LegacyNodeType = 'root' | 'region' | 'topic' | 'Project' | 'exercise';

// Type combiné pour accepter les deux
export type NodeType = NodeHierarchyType | LegacyNodeType;

// Mapping ancien → nouveau
export const NODE_TYPE_MIGRATION: Record<string, NodeHierarchyType> = {
  'root': 'blackhole',
  'galaxy': 'constellation',
  'region': 'star',
  'topic': 'planet',
  'exercise': 'satellite',
  'Project': 'project',
  // Nouveaux types (pas de migration)
  'blackhole': 'blackhole',
  'constellation': 'constellation',
  'star': 'star',
  'planet': 'planet',
  'satellite': 'satellite',
  'project': 'project',
};

// Fonction utilitaire pour migrer un type
export function migrateNodeType(type: string): NodeHierarchyType {
  return NODE_TYPE_MIGRATION[type] || 'planet';
}

export type ExerciseType = 'none' | 'qcm' | 'schema' | 'matching' | 'code' | 'text-fill' | 'order' | 'categorization' | 'axis' | 'estimation' | 'video';
export type UnlockCondition = 'AND' | 'OR';

// Liste de tous les types valides (anciens + nouveaux)
const ALL_VALID_TYPES = [
  'root', 'region', 'topic', 'Project', 'exercise', // Anciens
  'blackhole', 'constellation', 'star', 'planet', 'satellite', 'project' // Nouveaux
];

export class CreateNodeDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le label est requis' })
  label: string;

  @IsString()
  @IsOptional()
  @IsIn(ALL_VALID_TYPES, { message: 'Type de nœud invalide' })
  type?: NodeType;

  @IsString()
  @IsOptional()
  group?: string;

  @IsString()
  @IsOptional()
  galaxy?: string;
  
  // Nouveaux champs pour la hiérarchie constellation
  @IsString()
  @IsOptional()
  constellation?: string; // Remplace "galaxy" progressivement

  @IsString()
  @IsOptional()
  parentStar?: string; // ID de l'étoile parente (pour les planètes)

  @IsNumber()
  @IsOptional()
  @Min(0)
  orbitRing?: number; // Cercle orbital (0 = étoile centrale, 1 = premier cercle, 2 = second, etc.)

  @IsNumber()
  @IsOptional()
  @Min(0)
  xp?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  level?: number;

  @IsString()
  @IsOptional()
  @IsIn(['AND', 'OR'], { message: 'Condition de déblocage invalide' })
  unlockCondition?: UnlockCondition;

  @IsString()
  @IsOptional()
  exerciseDescription?: string;

  @IsString()
  @IsOptional()
  evaluationGrid?: string;

  @IsString()
  @IsOptional()
  gradingGrid?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minimumScore?: number;

  @IsString()
  @IsOptional()
  courseContent?: string;

  @IsString()
  @IsOptional()
  @IsIn(['none', 'qcm', 'schema', 'matching', 'code', 'text-fill', 'order', 'categorization', 'axis', 'estimation', 'video'], { message: 'Type d\'exercice invalide' })
  exerciseType?: ExerciseType;

  @IsString()
  @IsOptional()
  @IsIn(['auto', 'manual', 'peer', 'teacher'], { message: 'Type de validation invalide' })
  validationType?: 'auto' | 'manual' | 'peer' | 'teacher';

  @IsString()
  @IsOptional()
  peerValidationConfig?: string;

  @IsString()
  @IsOptional()
  exerciseData?: string;

  @IsOptional()
  visualConfig?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  fx?: number;

  @IsNumber()
  @IsOptional()
  fy?: number;

  @IsString()
  @IsOptional()
  unlockedBy?: string; // ID du nœud prérequis qui débloque celui-ci (crée automatiquement un lien UNLOCKS)
}

export class UpdateNodeDto extends CreateNodeDto {
  // Tous les champs sont optionnels pour la mise à jour
}

// Types de relations valides - doit correspondre à ALLOWED_RELATIONSHIP_TYPES dans le service
export const VALID_RELATIONSHIP_TYPES = [
  'UNLOCKS',    // Débloque un autre noeud
  'REQUIRES',   // Requiert un prérequis
  'MASTERED',   // Relation User -> Skill
  'CONTAINS',   // Contient (hiérarchie)
  'BELONGS_TO', // Appartient à
  'ORBITS',     // Orbite autour de (constellation)
  'PART_OF'     // Fait partie de
] as const;

export type RelationshipType = typeof VALID_RELATIONSHIP_TYPES[number];

export class CreateRelationshipDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'ID source est requis' })
  source: string;

  @IsString()
  @IsNotEmpty({ message: 'L\'ID cible est requis' })
  target: string;

  @IsString()
  @IsNotEmpty({ message: 'Le type de relation est requis' })
  @IsIn(VALID_RELATIONSHIP_TYPES, { message: 'Type de relation invalide. Valeurs autorisées: ' + VALID_RELATIONSHIP_TYPES.join(', ') })
  type: RelationshipType;
}

export class ValidateSkillDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'ID du skill est requis' })
  skillId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  xp?: number;
}

export class UpdatePositionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PositionDto)
  positions: PositionDto[];
}

export class PositionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class UpdateExerciseDto {
  @IsString()
  @IsNotEmpty({ message: 'Le type d\'exercice est requis' })
  @IsIn(['none', 'qcm', 'schema', 'matching', 'code', 'text-fill', 'order', 'categorization', 'axis', 'estimation', 'video'], { message: 'Type d\'exercice invalide' })
  exerciseType: ExerciseType;

  @IsString()
  @IsOptional()
  exerciseData?: string;
}
