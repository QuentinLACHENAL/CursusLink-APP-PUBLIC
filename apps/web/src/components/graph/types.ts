// Types visuels pour le graphe spatial

export type VisualStyle = 'planet' | 'star' | 'blackhole' | 'nebula' | 'satellite';
export type PlanetType = 'rocky' | 'gas' | 'ice' | 'volcanic' | 'ocean' | 'desert' | 'earth';
export type StarType = 'yellow' | 'red' | 'blue' | 'white' | 'orange' | 'neutron';

// === NOUVEAUX TYPES DE NŒUDS (REFONTE CONSTELLATION) ===
// Hiérarchie: blackhole (centre) → constellation (matière) → star (chapitre) → planet (cours) → satellite (exercice)
export type NodeHierarchyType = 'blackhole' | 'constellation' | 'star' | 'planet' | 'satellite' | 'project';

// Mapping ancien → nouveau (pour rétrocompatibilité)
export const NODE_TYPE_MIGRATION: Record<string, NodeHierarchyType> = {
  'root': 'blackhole',
  'galaxy': 'constellation', 
  'region': 'star',
  'topic': 'planet',
  'exercise': 'satellite',
  'Project': 'project',
  // Nouveaux types (pas de migration nécessaire)
  'blackhole': 'blackhole',
  'constellation': 'constellation',
  'star': 'star',
  'planet': 'planet',
  'satellite': 'satellite',
  'project': 'project',
};

// Labels affichés dans l'UI
export const NODE_TYPE_LABELS: Record<NodeHierarchyType, { singular: string; plural: string; icon: string }> = {
  blackhole: { singular: 'Trou Noir', plural: 'Trous Noirs', icon: '🕳️' },
  constellation: { singular: 'Constellation', plural: 'Constellations', icon: '✨' },
  star: { singular: 'Étoile', plural: 'Étoiles', icon: '⭐' },
  planet: { singular: 'Planète', plural: 'Planètes', icon: '🪐' },
  satellite: { singular: 'Satellite', plural: 'Satellites', icon: '🌙' },
  project: { singular: 'Projet', plural: 'Projets', icon: '🚀' },
};

// Descriptions pour l'aide
export const NODE_TYPE_DESCRIPTIONS: Record<NodeHierarchyType, string> = {
  blackhole: 'Point central du cursus, attire tout vers lui',
  constellation: 'Matière/Discipline (ex: Anatomie, Mathématiques)',
  star: 'Chapitre/Section (ex: Introduction, Les bases)',
  planet: 'Cours/Leçon (ex: Cours 1, TD 2)',
  satellite: 'Exercice/Quiz (ex: QCM, TP noté)',
  project: 'Projet évalué (ex: Projet final)',
};

export interface NodeVisualConfig {
  visualStyle: VisualStyle;
  // Pour les planètes
  planetType?: PlanetType;
  primaryColor?: string;
  secondaryColor?: string;
  hasRings?: boolean;
  ringColor?: string;
  ringAngle?: number;
  // Pour les étoiles
  starType?: StarType;
  coronaIntensity?: number;
  pulseSpeed?: number;
  // Pour les trous noirs
  accretionDiskColor?: string;
  eventHorizonSize?: number;
  // Pour les nébuleuses
  nebulaColors?: string[];
  nebulaSpread?: number;
  // Commun
  glowIntensity?: number;
  glowColor?: string;
  atmosphereColor?: string;
}

// Configurations par défaut selon le type de nœud (NOUVELLE HIÉRARCHIE)
export const DEFAULT_VISUALS: Record<string, NodeVisualConfig> = {
  // Nouveau système
  blackhole: {
    visualStyle: 'blackhole',
    accretionDiskColor: '#ff6b35',
    eventHorizonSize: 0.4,
    glowIntensity: 1.5,
  },
  constellation: {
    visualStyle: 'nebula',
    nebulaColors: ['#4a90d9', '#9b59b6', '#3498db'],
    nebulaSpread: 1.2,
    glowIntensity: 0.3,
  },
  star: {
    visualStyle: 'star',
    starType: 'yellow',
    coronaIntensity: 0.8,
    pulseSpeed: 2,
    glowIntensity: 1.2,
  },
  planet: {
    visualStyle: 'planet',
    planetType: 'earth',
    primaryColor: '#3498db',
    secondaryColor: '#2980b9',
    hasRings: false,
    glowIntensity: 0.4,
  },
  satellite: {
    visualStyle: 'satellite',
    primaryColor: '#95a5a6',
    secondaryColor: '#7f8c8d',
    glowIntensity: 0.3,
  },
  project: {
    visualStyle: 'planet',
    planetType: 'gas',
    primaryColor: '#f39c12',
    secondaryColor: '#e67e22',
    hasRings: true,
    ringColor: '#d4ac6e',
    glowIntensity: 0.6,
  },
  
  // Rétrocompatibilité (anciens types)
  root: {
    visualStyle: 'blackhole',
    accretionDiskColor: '#ff6b35',
    eventHorizonSize: 0.4,
    glowIntensity: 1.5,
  },
  region: {
    visualStyle: 'star',
    starType: 'yellow',
    coronaIntensity: 0.8,
    pulseSpeed: 2,
    glowIntensity: 1.2,
  },
  Project: {
    visualStyle: 'planet',
    planetType: 'gas',
    primaryColor: '#f39c12',
    secondaryColor: '#e67e22',
    hasRings: true,
    ringColor: '#d4ac6e',
    glowIntensity: 0.6,
  },
  topic: {
    visualStyle: 'planet',
    planetType: 'rocky',
    primaryColor: '#3498db',
    secondaryColor: '#2980b9',
    hasRings: false,
    glowIntensity: 0.4,
  },
  exercise: {
    visualStyle: 'planet',
    planetType: 'ice',
    primaryColor: '#9b59b6',
    secondaryColor: '#8e44ad',
    hasRings: false,
    glowIntensity: 0.5,
  },
};

// Palettes de couleurs pour les planètes
export const PLANET_PALETTES: Record<PlanetType, { primary: string; secondary: string; accent: string }> = {
  rocky: { primary: '#8b7355', secondary: '#6b5344', accent: '#a08060' },
  gas: { primary: '#e8c170', secondary: '#c9a050', accent: '#f0d090' },
  ice: { primary: '#a8d8ea', secondary: '#88c8da', accent: '#c8e8fa' },
  volcanic: { primary: '#8b4513', secondary: '#ff4500', accent: '#ff6347' },
  ocean: { primary: '#1e90ff', secondary: '#0066cc', accent: '#00bfff' },
  desert: { primary: '#daa520', secondary: '#b8860b', accent: '#f4a460' },
  earth: { primary: '#228b22', secondary: '#1e90ff', accent: '#87ceeb' }, // Vert/Bleu comme la Terre
};

// Couleurs des étoiles selon leur type
export const STAR_COLORS: Record<StarType, { core: string; corona: string; glow: string }> = {
  yellow: { core: '#fff8dc', corona: '#ffd700', glow: '#ffec8b' },
  red: { core: '#ff6b6b', corona: '#dc143c', glow: '#ff4444' },
  blue: { core: '#e6f3ff', corona: '#4169e1', glow: '#87ceeb' },
  white: { core: '#ffffff', corona: '#f0f8ff', glow: '#e8e8e8' },
  orange: { core: '#ffa500', corona: '#ff8c00', glow: '#ffb347' },
  neutron: { core: '#e0ffff', corona: '#00ced1', glow: '#40e0d0' }, // Étoile à neutrons (très brillante)
};

// Configuration des satellites
export interface SatelliteConfig {
  count: number;
  minRadius: number;
  maxRadius: number;
  minSize: number;
  maxSize: number;
  trailLength: number;
  colors: string[];
  speedVariation: number;
}

export const DEFAULT_SATELLITE_CONFIG: SatelliteConfig = {
  count: 3,
  minRadius: 8,
  maxRadius: 15,
  minSize: 1.5,
  maxSize: 2.5,
  trailLength: 8,
  colors: ['#ffffff', '#87ceeb', '#98fb98', '#ffd700'],
  speedVariation: 0.5,
};

// Configuration des particules de données
export interface DataParticleConfig {
  shape: 'circle' | 'star' | 'diamond' | 'comet';
  size: number;
  color: string;
  trailLength: number;
  speed: number;
  glowColor?: string;
}

export const PARTICLE_PRESETS: Record<string, DataParticleConfig> = {
  normal: {
    shape: 'circle',
    size: 2,
    color: '#00ffff',
    trailLength: 5,
    speed: 0.003,
    glowColor: '#00ffff44',
  },
  mastered: {
    shape: 'star',
    size: 3,
    color: '#ffd700',
    trailLength: 8,
    speed: 0.002,
    glowColor: '#ffd70044',
  },
  inProgress: {
    shape: 'diamond',
    size: 2.5,
    color: '#00ff88',
    trailLength: 6,
    speed: 0.0025,
    glowColor: '#00ff8844',
  },
  locked: {
    shape: 'circle',
    size: 1.5,
    color: '#666666',
    trailLength: 3,
    speed: 0.001,
  },
};

// Constellations pour l'overlay admin
export interface ConstellationPoint {
  x: number; // Position relative (0-1)
  y: number;
  name?: string;
}

export interface ConstellationLine {
  from: number; // Index dans points
  to: number;
}

export interface Constellation {
  name: string;
  points: ConstellationPoint[];
  lines: ConstellationLine[];
}

export const CONSTELLATIONS: Record<string, Constellation> = {
  // === CONSTELLATIONS ZODIACALES (12) ===
  aries: {
    name: 'Bélier (Aries)',
    points: [
      { x: 0.3, y: 0.4, name: 'Hamal' },
      { x: 0.45, y: 0.45, name: 'Sheratan' },
      { x: 0.6, y: 0.5, name: 'Mesarthim' },
      { x: 0.75, y: 0.48 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
    ],
  },
  taurus: {
    name: 'Taureau (Taurus)',
    points: [
      { x: 0.2, y: 0.3, name: 'Aldebaran' },
      { x: 0.35, y: 0.35 },
      { x: 0.5, y: 0.3 },
      { x: 0.6, y: 0.2, name: 'Elnath' },
      { x: 0.65, y: 0.4 },
      { x: 0.3, y: 0.5 }, // Hyades
      { x: 0.25, y: 0.45 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 2, to: 4 }, { from: 0, to: 5 }, { from: 5, to: 6 },
    ],
  },
  gemini: {
    name: 'Gémeaux (Gemini)',
    points: [
      { x: 0.3, y: 0.15, name: 'Castor' },
      { x: 0.4, y: 0.15, name: 'Pollux' },
      { x: 0.25, y: 0.35 },
      { x: 0.35, y: 0.35 },
      { x: 0.2, y: 0.55 },
      { x: 0.3, y: 0.55 },
      { x: 0.15, y: 0.75 },
      { x: 0.35, y: 0.75 },
    ],
    lines: [
      { from: 0, to: 2 }, { from: 2, to: 4 }, { from: 4, to: 6 },
      { from: 1, to: 3 }, { from: 3, to: 5 }, { from: 5, to: 7 },
      { from: 0, to: 1 }, { from: 2, to: 3 },
    ],
  },
  cancer: {
    name: 'Cancer',
    points: [
      { x: 0.5, y: 0.5, name: 'Asellus Australis' },
      { x: 0.5, y: 0.4, name: 'Asellus Borealis' },
      { x: 0.3, y: 0.6, name: 'Acubens' },
      { x: 0.7, y: 0.6, name: 'Altarf' },
      { x: 0.5, y: 0.25 }, // Praesepe cluster area
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 },
      { from: 1, to: 4 },
    ],
  },
  leo: {
    name: 'Lion (Leo)',
    points: [
      { x: 0.2, y: 0.3, name: 'Regulus' },
      { x: 0.3, y: 0.2 },
      { x: 0.45, y: 0.15 },
      { x: 0.55, y: 0.2 },
      { x: 0.65, y: 0.25, name: 'Denebola' },
      { x: 0.35, y: 0.35 },
      { x: 0.5, y: 0.4 },
      { x: 0.25, y: 0.45 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 1, to: 5 }, { from: 5, to: 6 },
      { from: 6, to: 4 }, { from: 0, to: 7 }, { from: 7, to: 5 },
    ],
  },
  virgo: {
    name: 'Vierge (Virgo)',
    points: [
      { x: 0.5, y: 0.8, name: 'Spica' },
      { x: 0.5, y: 0.5, name: 'Porrima' },
      { x: 0.3, y: 0.4, name: 'Zavijava' },
      { x: 0.7, y: 0.4, name: 'Auva' },
      { x: 0.4, y: 0.2, name: 'Vindemiatrix' },
      { x: 0.6, y: 0.6, name: 'Heze' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 1, to: 3 },
      { from: 2, to: 4 }, { from: 3, to: 5 }, { from: 1, to: 5 },
    ],
  },
  libra: {
    name: 'Balance (Libra)',
    points: [
      { x: 0.5, y: 0.2, name: 'Zubeneschamali' },
      { x: 0.3, y: 0.4, name: 'Zubenelgenubi' },
      { x: 0.7, y: 0.5, name: 'Brachium' },
      { x: 0.5, y: 0.7 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 },
    ],
  },
  scorpius: {
    name: 'Scorpion (Scorpius)',
    points: [
      { x: 0.3, y: 0.2, name: 'Antares' },
      { x: 0.25, y: 0.3 },
      { x: 0.2, y: 0.4 },
      { x: 0.25, y: 0.5 },
      { x: 0.35, y: 0.55 },
      { x: 0.45, y: 0.6 },
      { x: 0.55, y: 0.65 },
      { x: 0.65, y: 0.7, name: 'Shaula' },
      { x: 0.7, y: 0.65 },
      { x: 0.35, y: 0.15 }, // Pinces
      { x: 0.4, y: 0.25 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 6, to: 7 }, { from: 7, to: 8 }, { from: 0, to: 9 },
      { from: 0, to: 10 },
    ],
  },
  sagittarius: {
    name: 'Sagittaire (Sagittarius)',
    points: [
      { x: 0.4, y: 0.3 },
      { x: 0.5, y: 0.25 },
      { x: 0.6, y: 0.3 },
      { x: 0.5, y: 0.4, name: 'Kaus Media' },
      { x: 0.4, y: 0.5 },
      { x: 0.6, y: 0.5 },
      { x: 0.5, y: 0.55 },
      { x: 0.45, y: 0.65, name: 'Kaus Australis' },
      { x: 0.55, y: 0.65 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 0, to: 3 },
      { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 3, to: 5 },
      { from: 4, to: 6 }, { from: 5, to: 6 }, { from: 6, to: 7 },
      { from: 6, to: 8 },
    ],
  },
  capricorn: {
    name: 'Capricorne (Capricornus)',
    points: [
      { x: 0.2, y: 0.2, name: 'Algedi' },
      { x: 0.2, y: 0.3, name: 'Dabih' },
      { x: 0.5, y: 0.5 },
      { x: 0.8, y: 0.3, name: 'Nashira' },
      { x: 0.85, y: 0.35, name: 'Deneb Algedi' },
      { x: 0.5, y: 0.7 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 2, to: 5 }, { from: 0, to: 2 },
    ],
  },
  aquarius: {
    name: 'Verseau (Aquarius)',
    points: [
      { x: 0.5, y: 0.1, name: 'Sadalmelik' },
      { x: 0.6, y: 0.15, name: 'Sadalsuud' },
      { x: 0.4, y: 0.25 },
      { x: 0.5, y: 0.3 },
      { x: 0.6, y: 0.4 },
      { x: 0.5, y: 0.5, name: 'Skat' },
      { x: 0.4, y: 0.6 },
      { x: 0.3, y: 0.5 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 3, to: 5 }, { from: 5, to: 6 },
      { from: 6, to: 7 },
    ],
  },
  pisces: {
    name: 'Poissons (Pisces)',
    points: [
      { x: 0.2, y: 0.3 }, // West Fish
      { x: 0.3, y: 0.4 },
      { x: 0.4, y: 0.5 },
      { x: 0.5, y: 0.6, name: 'Alrescha' }, // The Knot
      { x: 0.6, y: 0.5 },
      { x: 0.7, y: 0.4 },
      { x: 0.8, y: 0.2 }, // North Fish
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
    ],
  },

  // === CONSTELLATIONS CIRCUMPOLAIRES ===
  orion: {
    name: 'Orion',
    points: [
      { x: 0.3, y: 0.15, name: 'Betelgeuse' },
      { x: 0.7, y: 0.15, name: 'Bellatrix' },
      { x: 0.35, y: 0.4, name: 'Alnitak' },
      { x: 0.5, y: 0.42, name: 'Alnilam' },
      { x: 0.65, y: 0.4, name: 'Mintaka' },
      { x: 0.25, y: 0.75, name: 'Saiph' },
      { x: 0.75, y: 0.75, name: 'Rigel' },
      { x: 0.5, y: 0.55, name: 'Épée' },
    ],
    lines: [
      { from: 0, to: 2 }, { from: 1, to: 4 },
      { from: 2, to: 3 }, { from: 3, to: 4 },
      { from: 2, to: 5 }, { from: 4, to: 6 },
      { from: 3, to: 7 }, { from: 0, to: 1 },
    ],
  },
  bigDipper: {
    name: 'Grande Ourse (Ursa Major)',
    points: [
      { x: 0.1, y: 0.3, name: 'Dubhe' },
      { x: 0.25, y: 0.35, name: 'Merak' },
      { x: 0.4, y: 0.32, name: 'Phecda' },
      { x: 0.55, y: 0.4, name: 'Megrez' },
      { x: 0.65, y: 0.55, name: 'Alioth' },
      { x: 0.8, y: 0.5, name: 'Mizar' },
      { x: 0.9, y: 0.65, name: 'Alkaid' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 0, to: 3 },
    ],
  },
  littleDipper: {
    name: 'Petite Ourse (Ursa Minor)',
    points: [
      { x: 0.5, y: 0.15, name: 'Polaris' },
      { x: 0.45, y: 0.3 },
      { x: 0.55, y: 0.35 },
      { x: 0.5, y: 0.45 },
      { x: 0.4, y: 0.55 },
      { x: 0.55, y: 0.6 },
      { x: 0.45, y: 0.7, name: 'Kochab' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 3, to: 6 },
    ],
  },
  cassiopeia: {
    name: 'Cassiopée',
    points: [
      { x: 0.1, y: 0.5, name: 'Caph' },
      { x: 0.3, y: 0.3, name: 'Schedar' },
      { x: 0.5, y: 0.5, name: 'Gamma Cas' },
      { x: 0.7, y: 0.35, name: 'Ruchbah' },
      { x: 0.9, y: 0.5, name: 'Segin' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 4 },
    ],
  },
  cygnus: {
    name: 'Cygne (Cygnus)',
    points: [
      { x: 0.5, y: 0.1, name: 'Deneb' },
      { x: 0.5, y: 0.3 },
      { x: 0.5, y: 0.5, name: 'Sadr' },
      { x: 0.3, y: 0.4 },
      { x: 0.7, y: 0.4 },
      { x: 0.5, y: 0.75, name: 'Albireo' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 5 },
      { from: 2, to: 3 }, { from: 2, to: 4 },
    ],
  },
  lyra: {
    name: 'Lyre (Lyra)',
    points: [
      { x: 0.5, y: 0.2, name: 'Vega' },
      { x: 0.4, y: 0.45 },
      { x: 0.6, y: 0.45 },
      { x: 0.35, y: 0.7 },
      { x: 0.65, y: 0.7 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 },
      { from: 1, to: 3 }, { from: 2, to: 4 },
      { from: 3, to: 4 }, { from: 1, to: 2 },
    ],
  },
  draco: {
    name: 'Dragon (Draco)',
    points: [
      { x: 0.15, y: 0.2, name: 'Eltanin' },
      { x: 0.25, y: 0.25 },
      { x: 0.2, y: 0.35 },
      { x: 0.3, y: 0.4 },
      { x: 0.45, y: 0.35 },
      { x: 0.55, y: 0.45 },
      { x: 0.65, y: 0.4 },
      { x: 0.75, y: 0.5 },
      { x: 0.7, y: 0.6 },
      { x: 0.6, y: 0.65 },
      { x: 0.5, y: 0.7, name: 'Thuban' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 6, to: 7 }, { from: 7, to: 8 }, { from: 8, to: 9 },
      { from: 9, to: 10 },
    ],
  },
  cepheus: {
    name: 'Céphée (Cepheus)',
    points: [
      { x: 0.5, y: 0.1, name: 'Errai' },
      { x: 0.3, y: 0.3, name: 'Alfirk' },
      { x: 0.7, y: 0.3, name: 'Alderamin' },
      { x: 0.3, y: 0.6 },
      { x: 0.7, y: 0.6 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
      { from: 2, to: 4 }, { from: 3, to: 4 },
    ],
  },

  // === AUTRES CONSTELLATIONS POPULAIRES ===
  hercules: {
    name: 'Hercule (Hercules)',
    points: [
      { x: 0.4, y: 0.2, name: 'Kornephoros' },
      { x: 0.6, y: 0.2 },
      { x: 0.35, y: 0.4 },
      { x: 0.65, y: 0.4 }, // The Keystone (torso)
      { x: 0.2, y: 0.6 }, // Legs
      { x: 0.8, y: 0.6 },
      { x: 0.5, y: 0.8, name: 'Rasalgethi' }, // Head
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
      { from: 2, to: 3 }, { from: 2, to: 4 }, { from: 3, to: 5 },
      { from: 0, to: 6 },
    ],
  },
  bootes: {
    name: 'Bouvier (Boötes)',
    points: [
      { x: 0.5, y: 0.8, name: 'Arcturus' },
      { x: 0.3, y: 0.5, name: 'Muphrid' },
      { x: 0.7, y: 0.5, name: 'Izar' },
      { x: 0.35, y: 0.3 },
      { x: 0.65, y: 0.3 },
      { x: 0.5, y: 0.1, name: 'Nekkar' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
      { from: 2, to: 4 }, { from: 3, to: 5 }, { from: 4, to: 5 },
    ],
  },
  coronaBorealis: {
    name: 'Couronne Boréale',
    points: [
      { x: 0.2, y: 0.6 },
      { x: 0.3, y: 0.4 },
      { x: 0.4, y: 0.3 },
      { x: 0.5, y: 0.25, name: 'Alphecca' },
      { x: 0.6, y: 0.3 },
      { x: 0.7, y: 0.4 },
      { x: 0.8, y: 0.6 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
    ],
  },
  auriga: {
    name: 'Cocher (Auriga)',
    points: [
      { x: 0.5, y: 0.1, name: 'Capella' },
      { x: 0.2, y: 0.3, name: 'Menkalinan' },
      { x: 0.8, y: 0.3 },
      { x: 0.3, y: 0.7 },
      { x: 0.7, y: 0.6, name: 'Elnath' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
      { from: 2, to: 4 }, { from: 3, to: 4 },
    ],
  },
  canisMajor: {
    name: 'Grand Chien (Canis Major)',
    points: [
      { x: 0.5, y: 0.2, name: 'Sirius' },
      { x: 0.3, y: 0.3, name: 'Mirzam' },
      { x: 0.7, y: 0.3, name: 'Muliphein' },
      { x: 0.5, y: 0.5, name: 'Wezen' },
      { x: 0.4, y: 0.7, name: 'Adhara' },
      { x: 0.6, y: 0.7, name: 'Aludra' },
      { x: 0.5, y: 0.85 }, // Tail
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 },
      { from: 3, to: 4 }, { from: 3, to: 5 }, { from: 3, to: 6 },
    ],
  },
  canisMinor: {
    name: 'Petit Chien (Canis Minor)',
    points: [
      { x: 0.3, y: 0.5, name: 'Procyon' },
      { x: 0.7, y: 0.4, name: 'Gomeisa' },
    ],
    lines: [
      { from: 0, to: 1 },
    ],
  },
  eridanus: {
    name: 'Éridan (Eridanus)',
    points: [
      { x: 0.1, y: 0.1, name: 'Cursa' },
      { x: 0.3, y: 0.2 },
      { x: 0.5, y: 0.3 },
      { x: 0.7, y: 0.2 },
      { x: 0.8, y: 0.4 },
      { x: 0.6, y: 0.5 },
      { x: 0.4, y: 0.6 },
      { x: 0.3, y: 0.8 },
      { x: 0.6, y: 0.9, name: 'Achernar' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
      { from: 6, to: 7 }, { from: 7, to: 8 },
    ],
  },
  cetus: {
    name: 'Baleine (Cetus)',
    points: [
      { x: 0.8, y: 0.2, name: 'Menkar' },
      { x: 0.6, y: 0.3 },
      { x: 0.9, y: 0.4 }, // Head
      { x: 0.5, y: 0.5, name: 'Mira' },
      { x: 0.3, y: 0.6 },
      { x: 0.2, y: 0.8, name: 'Diphda' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 },
    ],
  },

  // === CONSTELLATIONS D'ÉTÉ / HIVER (Suite) ===
  aquila: {
    name: 'Aigle (Aquila)',
    points: [
      { x: 0.5, y: 0.25, name: 'Altair' },
      { x: 0.35, y: 0.35 },
      { x: 0.65, y: 0.35 },
      { x: 0.25, y: 0.5 },
      { x: 0.75, y: 0.5 },
      { x: 0.5, y: 0.6 },
    ],
    lines: [
      { from: 1, to: 0 }, { from: 0, to: 2 },
      { from: 1, to: 3 }, { from: 2, to: 4 },
      { from: 0, to: 5 },
    ],
  },
  pegasus: {
    name: 'Pégase (Pegasus)',
    points: [
      { x: 0.3, y: 0.3, name: 'Markab' },
      { x: 0.7, y: 0.3, name: 'Scheat' },
      { x: 0.7, y: 0.7, name: 'Algenib' },
      { x: 0.3, y: 0.7, name: 'Alpheratz' },
      { x: 0.15, y: 0.5 },
      { x: 0.85, y: 0.5 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 },
      { from: 2, to: 3 }, { from: 3, to: 0 },
      { from: 0, to: 4 }, { from: 1, to: 5 },
    ],
  },
  andromeda: {
    name: 'Andromède',
    points: [
      { x: 0.15, y: 0.5, name: 'Alpheratz' },
      { x: 0.35, y: 0.45, name: 'Mirach' },
      { x: 0.55, y: 0.4, name: 'Almach' },
      { x: 0.75, y: 0.35 },
      { x: 0.4, y: 0.3 },
      { x: 0.45, y: 0.6 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 1, to: 4 }, { from: 1, to: 5 },
    ],
  },
  perseus: {
    name: 'Persée',
    points: [
      { x: 0.5, y: 0.15, name: 'Mirfak' },
      { x: 0.45, y: 0.3 },
      { x: 0.4, y: 0.45, name: 'Algol' },
      { x: 0.35, y: 0.6 },
      { x: 0.55, y: 0.35 },
      { x: 0.65, y: 0.45 },
      { x: 0.6, y: 0.55 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 0, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
    ],
  },

  // === CONSTELLATIONS AUSTRALES ===
  crux: {
    name: 'Croix du Sud (Crux)',
    points: [
      { x: 0.5, y: 0.2, name: 'Gacrux' },
      { x: 0.5, y: 0.7, name: 'Acrux' },
      { x: 0.3, y: 0.45, name: 'Delta Crucis' },
      { x: 0.7, y: 0.45, name: 'Mimosa' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 2, to: 3 },
    ],
  },
  centaurus: {
    name: 'Centaure (Centaurus)',
    points: [
      { x: 0.2, y: 0.3, name: 'Alpha Centauri' },
      { x: 0.35, y: 0.35, name: 'Hadar' },
      { x: 0.5, y: 0.3 },
      { x: 0.6, y: 0.4 },
      { x: 0.7, y: 0.5 },
      { x: 0.4, y: 0.55 },
      { x: 0.3, y: 0.65 },
      { x: 0.55, y: 0.7 },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 2, to: 5 }, { from: 5, to: 6 },
      { from: 5, to: 7 },
    ],
  },

  // === TRIANGLE D'ÉTÉ ===
  summerTriangle: {
    name: 'Triangle d\'Été',
    points: [
      { x: 0.5, y: 0.15, name: 'Vega (Lyre)' },
      { x: 0.2, y: 0.7, name: 'Deneb (Cygne)' },
      { x: 0.8, y: 0.75, name: 'Altair (Aigle)' },
    ],
    lines: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 },
    ],
  },

  // === GUIDE SYSTÈME SOLAIRE (conservé) ===
  solarSystem: {
    name: 'Système Solaire',
    points: [
      { x: 0.5, y: 0.5, name: 'Soleil' },
      { x: 0.58, y: 0.5, name: 'Mercure' },
      { x: 0.65, y: 0.5, name: 'Vénus' },
      { x: 0.72, y: 0.5, name: 'Terre' },
      { x: 0.8, y: 0.5, name: 'Mars' },
      { x: 0.9, y: 0.5, name: 'Jupiter' },
    ],
    lines: [],
  },
};

// Theme configuration
export interface GraphTheme {
  name: string;
  backgroundColor: string;
  backgroundImage?: string;
  defaultNodeGlow: string;
  linkColor: string;
  linkMasteredColor: string;
  particleColor: string;
  labelColor: string;
  gridColor?: string;
}

export const THEMES: Record<string, GraphTheme> = {
  deepSpace: {
    name: 'Espace Profond',
    backgroundColor: '#0a0a15',
    defaultNodeGlow: '#4a90d9',
    linkColor: '#334455',
    linkMasteredColor: '#00ff88',
    particleColor: '#00ffff',
    labelColor: '#ffffff',
  },
  nebula: {
    name: 'Nébuleuse',
    backgroundColor: '#1a0a2e',
    defaultNodeGlow: '#9b59b6',
    linkColor: '#4a2c5a',
    linkMasteredColor: '#e74c3c',
    particleColor: '#ff69b4',
    labelColor: '#f0e6ff',
  },
  solarSystem: {
    name: 'Système Solaire',
    backgroundColor: '#000510',
    defaultNodeGlow: '#ffd700',
    linkColor: '#2a2a4a',
    linkMasteredColor: '#ffa500',
    particleColor: '#ffec8b',
    labelColor: '#fffacd',
  },
};
