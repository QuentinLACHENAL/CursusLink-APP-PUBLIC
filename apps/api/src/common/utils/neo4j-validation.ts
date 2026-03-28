/**
 * @fileoverview Utilitaires de validation et sécurité pour Neo4j
 * 
 * Ce module fournit des fonctions de validation pour éviter les injections Cypher
 * et garantir l'intégrité des données.
 */

// ============================================================================
// LABELS VALIDES
// ============================================================================

/**
 * Labels Neo4j autorisés pour les noeuds
 * Utilisé pour prévenir les injections Cypher
 */
export const VALID_NODE_LABELS = [
  'User',
  'Skill',
  'Project',
  'Exercise',
  'BlackHole',
  'Constellation',
  'Star',
  'Planet',
  'Satellite',
  'Coalition',
  'Lesson',
  'Setting',
] as const;

export type ValidNodeLabel = typeof VALID_NODE_LABELS[number];

/**
 * Vérifie si un label est valide
 */
export function isValidNodeLabel(label: string): label is ValidNodeLabel {
  return (VALID_NODE_LABELS as readonly string[]).includes(label);
}

/**
 * Valide un tableau de labels et retourne seulement les labels valides
 * @throws Error si aucun label n'est valide
 */
export function validateLabels(labels: string[]): ValidNodeLabel[] {
  const validLabels = labels.filter(isValidNodeLabel);
  if (validLabels.length === 0) {
    throw new Error(`No valid labels found. Valid labels are: ${VALID_NODE_LABELS.join(', ')}`);
  }
  return validLabels;
}

/**
 * Construit une chaîne de labels sécurisée pour Cypher
 * @example buildLabelString(['Skill', 'Planet']) => ':Skill:Planet'
 */
export function buildLabelString(labels: string[]): string {
  const validated = validateLabels(labels);
  return validated.map(l => `:${l}`).join('');
}

// ============================================================================
// TYPES DE RELATIONS VALIDES
// ============================================================================

/**
 * Types de relations Neo4j autorisés
 */
export const VALID_RELATIONSHIP_TYPES = [
  'UNLOCKS',
  'REQUIRES',
  'MASTERED',
  'CONTAINS',
  'BELONGS_TO',
  'ORBITS',
  'PART_OF',
  'HAS_EXERCISE',
  'MEMBER_OF',
  'HAS_LESSON',
] as const;

export type ValidRelationshipType = typeof VALID_RELATIONSHIP_TYPES[number];

/**
 * Vérifie si un type de relation est valide
 */
export function isValidRelationshipType(type: string): type is ValidRelationshipType {
  return (VALID_RELATIONSHIP_TYPES as readonly string[]).includes(type);
}

/**
 * Valide un type de relation
 * @throws Error si le type n'est pas valide
 */
export function validateRelationshipType(type: string): ValidRelationshipType {
  if (!isValidRelationshipType(type)) {
    throw new Error(`Invalid relationship type: "${type}". Valid types are: ${VALID_RELATIONSHIP_TYPES.join(', ')}`);
  }
  return type;
}

// ============================================================================
// SANITIZATION
// ============================================================================

/**
 * Pattern pour les identifiants valides (alphanumeric, underscore, dash)
 */
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Valide un identifiant Neo4j
 * @throws Error si l'ID contient des caractères invalides
 */
export function validateNodeId(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Node ID must be a non-empty string');
  }
  
  if (id.length > 255) {
    throw new Error('Node ID must not exceed 255 characters');
  }
  
  // Permettre les UUIDs et IDs générés
  const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const customIdPattern = /^[a-zA-Z0-9_-]+$/;
  
  if (!uuidPattern.test(id) && !customIdPattern.test(id)) {
    throw new Error(`Invalid node ID format: "${id}"`);
  }
  
  return id;
}

/**
 * Sanitize une chaîne pour utilisation dans les propriétés
 * Empêche l'injection via les valeurs de propriétés
 */
export function sanitizePropertyValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (typeof value === 'string') {
    // Supprimer les caractères de contrôle
    return value.replace(/[\x00-\x1F\x7F]/g, '');
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizePropertyValue);
  }
  
  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      // Valider les noms de clés
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        sanitized[key] = sanitizePropertyValue(value[key]);
      }
    }
    return sanitized;
  }
  
  return value;
}

// ============================================================================
// BACKUP VALIDATION
// ============================================================================

/**
 * Interface pour la structure de backup
 */
export interface BackupData {
  timestamp: string;
  version: string;
  data: {
    nodes: BackupNode[];
    relationships: BackupRelationship[];
  };
}

export interface BackupNode {
  id: string;
  labels: string[];
  props: Record<string, any>;
}

export interface BackupRelationship {
  source: string;
  target: string;
  type: string;
  props: Record<string, any>;
}

/**
 * Valide la structure d'un backup avant import
 * @throws Error si la structure est invalide
 */
export function validateBackupStructure(data: any): BackupData {
  if (!data || typeof data !== 'object') {
    throw new Error('Backup data must be an object');
  }
  
  if (!data.data || typeof data.data !== 'object') {
    throw new Error('Backup must contain a "data" object');
  }
  
  if (!Array.isArray(data.data.nodes)) {
    throw new Error('Backup data.nodes must be an array');
  }
  
  if (!Array.isArray(data.data.relationships)) {
    throw new Error('Backup data.relationships must be an array');
  }
  
  // Valider chaque noeud
  for (const node of data.data.nodes) {
    if (!node.id || typeof node.id !== 'string') {
      throw new Error(`Invalid node: missing or invalid id`);
    }
    
    if (!Array.isArray(node.labels)) {
      throw new Error(`Invalid node ${node.id}: labels must be an array`);
    }
    
    // Valider les labels
    for (const label of node.labels) {
      if (!isValidNodeLabel(label)) {
        throw new Error(`Invalid label "${label}" in node ${node.id}. Valid labels: ${VALID_NODE_LABELS.join(', ')}`);
      }
    }
  }
  
  // Valider chaque relation
  for (const rel of data.data.relationships) {
    if (!rel.source || !rel.target || !rel.type) {
      throw new Error('Invalid relationship: missing source, target, or type');
    }
    
    if (!isValidRelationshipType(rel.type)) {
      throw new Error(`Invalid relationship type "${rel.type}". Valid types: ${VALID_RELATIONSHIP_TYPES.join(', ')}`);
    }
  }
  
  return data as BackupData;
}

// ============================================================================
// SESSION HELPERS
// ============================================================================

/**
 * Wrapper pour exécuter une opération avec gestion automatique de la session
 */
export async function withSession<T>(
  getSession: () => any,
  operation: (session: any) => Promise<T>
): Promise<T> {
  const session = getSession();
  try {
    return await operation(session);
  } finally {
    await session.close();
  }
}

/**
 * Wrapper pour exécuter une opération dans une transaction
 */
export async function withTransaction<T>(
  session: any,
  operation: (txc: any) => Promise<T>
): Promise<T> {
  const txc = session.beginTransaction();
  try {
    const result = await operation(txc);
    await txc.commit();
    return result;
  } catch (error) {
    await txc.rollback();
    throw error;
  }
}
