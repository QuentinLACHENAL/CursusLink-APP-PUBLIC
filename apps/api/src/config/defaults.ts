/**
 * Constantes par défaut de l'application.
 * Ces valeurs peuvent être surchargées via GlobalSettings en base de données.
 *
 * IMPORTANT: Ne JAMAIS mettre de secrets ici !
 */
export const DEFAULTS = {
  // Système de niveau
  LEVEL_FORMULA_MULTIPLIER: 0.1, // Niveau = sqrt(XP) * MULTIPLIER

  // Exercices et validation
  DEFAULT_MINIMUM_SCORE: 80,
  DEFAULT_XP_REWARD: 100,

  // Pagination
  PAGINATION_DEFAULT_LIMIT: 50,
  PAGINATION_MAX_LIMIT: 100,

  // JWT
  JWT_EXPIRATION: '7d',

  // Graph layout (frontend devrait utiliser ces valeurs via API)
  GRAPH_SOLAR_RADIUS: 800,
  GRAPH_GALAXY_SPACING: 3000,
  GRAPH_MOON_RADIUS: 250,
  GRAPH_LOD_PLANET_THRESHOLD: 1.5,

  // Coalition - pas de défaut, doit être choisi explicitement
  DEFAULT_COALITION: null as string | null,
} as const;

export type DefaultsType = typeof DEFAULTS;
