/**
 * ==================================================================================
 * 🎨 GRAPH CONFIGURATION - CURSUS LINK
 * ==================================================================================
 * Ce fichier centralise toutes les variables visuelles du graphe.
 * Modifiez les valeurs ici pour ajuster le rendu sans toucher au code logique.
 * ==================================================================================
 */

export const GRAPH_CONFIG = {
  
  // --------------------------------------------------------------------------------
  // 🌌 UNIVERS & DISPOSITION (LAYOUT)
  // --------------------------------------------------------------------------------
  LAYOUT: {
    // Taille de la zone de fond (en pixels). Doit être très grand pour couvrir le dézoom.
    // Augmentez si vous voyez des bords bleus en dézoomant.
    UNIVERSE_SIZE: 20000, 

    // Espace entre deux Galaxies (Constellations/Matières)
    GALAXY_SPACING: 5000,

    // Rayon du "Système Solaire" d'une Galaxie (Cercle sur lequel sont posées les étoiles/chapitres)
    SOLAR_SYSTEM_RADIUS: 2000,

    // Zoom appliqué lors du focus sur une constellation (Admin)
    // Plus la valeur est petite, plus la caméra recule pour voir l'ensemble
    // Valeur recommandée : 0.35 pour voir toute la constellation + les voisins
    CONSTELLATION_FOCUS_ZOOM: 0.35,
  },

  // --------------------------------------------------------------------------------
  // 🛠️ ADMIN & MODE ÉDITION
  // --------------------------------------------------------------------------------
  ADMIN: {
    // Zoom pour la vue d'ensemble admin (plus petit = plus dézoomé)
    // 0.2 permet de voir plusieurs constellations en même temps
    OVERVIEW_ZOOM: 0.2,

    // Zoom lors du focus sur un nœud spécifique en mode admin
    NODE_FOCUS_ZOOM: 0.4,

    LOD: {
      // Zoom min pour voir les noms des étoiles en mode admin (plus petit = visible de plus loin)
      STAR_LABEL_THRESHOLD: 0.1, 

      // Zoom min pour voir les noms des planètes en mode admin
      PLANET_LABEL_THRESHOLD: 0.4,
    }
  },

  // --------------------------------------------------------------------------------
  // 🪐 SYSTÈMES PLANÉTAIRES (ORBITES)
  // --------------------------------------------------------------------------------
  ORBITS: {
    // Rayon du premier cercle (distance entre l'étoile et la première planète)
    BASE_RADIUS: 100,

    // Espace supplémentaire ajouté pour chaque cercle suivant (Cercle 2 = BASE + SPACING, etc.)
    SPACING: 50,

    // Vitesse de base de l'animation des planètes validées (plus petit = plus lent)
    ANIMATION_SPEED_BASE: 0.05,
  },

  // --------------------------------------------------------------------------------
  // ⚪ NODES (TAILLES & APPARENCE)
  // --------------------------------------------------------------------------------
  NODES: {
    SIZES: {
      ROOT: 20,       // Trou noir central
      STAR: 14,       // Étoiles (Chapitres) - Ring 0
      PLANET: 8,      // Planètes (Cours/Exos) - Ring > 0
      PROJECT: 24,    // Projets (Gros nœuds de fin)
      SELECTED_MULTIPLIER: 1.2, // Grossissement quand sélectionné (x1.2)
    },
    COLORS: {
      ORBIT_COMPLETED: '#22d3ee', // Couleur des cercles orbitaux validés (Cyan)
      ORBIT_GUIDE: 'rgba(255, 255, 255, 0.03)', // Couleur des cercles guides non validés (très faible)
      ORBIT_GUIDE_HOVER: 'rgba(56, 189, 248, 0.25)', // Couleur des guides en mode "Guide" ou "Admin"
    }
  },

  // --------------------------------------------------------------------------------
  // 🔗 LIENS (TRAITS)
  // --------------------------------------------------------------------------------
  LINKS: {
    WIDTH: {
      LOCKED: 0.1,      // Trait fin pour les chemins non débloqués
      UNLOCKED: 2,    // Trait plus épais pour les chemins validés
      ROOT: 2.5,      // Trait très épais depuis le trou noir
    },
    COLORS: {
      LOCKED: 'rgba(255, 255, 255, 0.4)', // Blanc plus visible (augmenté de 0.15)
      UNLOCKED: '#22d3ee', // Cyan brillant
      OR_CONDITION: 'rgba(251, 191, 36, 0.3)', // Jaune pour les conditions "OU"
    },
    GLOW: {
      BLUR: 10,       // Flou du halo lumineux
      COLOR: '#22d3ee' // Couleur du halo
    }
  },

  // --------------------------------------------------------------------------------
  // ✨ HALO DES ÉLÉMENTS DÉBLOQUÉS (UNLOCKED GLOW)
  // --------------------------------------------------------------------------------
  // Configuration du halo lumineux pour les nœuds accessibles (débloqués mais pas validés)
  UNLOCKED_GLOW: {
    // Couleur du halo pour les étoiles et planètes débloquées
    COLOR: '#ffffff',

    // Intensité du glow pour les ÉTOILES débloquées (multiplicateur du rayon)
    // Plus c'est grand, plus le halo est étendu. Default étoile = 1.2, ici on met 3.5 pour être très visible
    STAR_INTENSITY: 3.5,

    // Intensité de la corona pour les ÉTOILES débloquées
    STAR_CORONA_INTENSITY: 1.5,

    // Intensité du glow pour les PLANÈTES débloquées
    // Plus c'est grand, plus l'atmosphère lumineuse est étendue
    PLANET_INTENSITY: 2.0,

    // Couleur de l'atmosphère lumineuse pour les planètes débloquées (avec transparence)
    PLANET_ATMOSPHERE_COLOR: 'rgba(255, 255, 255, 0.5)',
  },

  // --------------------------------------------------------------------------------
  // 🔍 LOD (LEVEL OF DETAIL) - GESTION DU ZOOM
  // --------------------------------------------------------------------------------
  // À quel niveau de zoom les éléments apparaissent-ils ?
  // (1 = zoom normal, <1 = dézoomé, >1 = zoomé)
  LOD: {
    // Zoom min pour voir les planètes (sinon cachées pour ne pas surcharger)
    // 1.5 signifie qu'il faut zoomer un peu pour voir les détails
    PLANET_VISIBILITY_THRESHOLD: 0.4, 

    // Zoom min pour voir les cercles orbitaux "fantomatiques" (guides subtils)
    ORBIT_VISIBILITY_THRESHOLD: 0.8,

    // Zoom min pour voir les labels (textes) des planètes non sélectionnées
    // 1.5 est un bon compromis pour voir les titres quand on s'approche
    LABEL_VISIBILITY_THRESHOLD: 1.5,

    // Zoom min pour voir le nom des étoiles
    STAR_LABEL_VISIBILITY_THRESHOLD: 1.2,

    // Zoom min pour voir l'XP et le Score (doit être très proche)
    XP_VISIBILITY_THRESHOLD: 5,
  },

  // --------------------------------------------------------------------------------
  // ✨ FOND ÉTOILÉ (BACKGROUND)
  // --------------------------------------------------------------------------------
  BACKGROUND: {
    // Densité des étoiles (nombre d'étoiles par pixel). 
    // Attention : augmenter drastiquement peut ralentir l'ordi.
    STAR_DENSITY: 0.0005, 

    // Limite absolue du nombre d'étoiles générées pour protéger la performance
    STAR_COUNT_LIMIT: 15000, 
    
    // Intensité du scintillement (0 = pas de scintillement, 1 = très fort)
    TWINKLE_INTENSITY: 0.5,

    // Zoom min pour que les étoiles affichent leur vraie couleur (sinon blanches)
    ZOOM_COLOR_THRESHOLD: 0.1,
  },

  // --------------------------------------------------------------------------------
  // 🌟 CONSTELLATIONS (GUIDES ADMIN & IMPORT CSV)
  // --------------------------------------------------------------------------------
  CONSTELLATIONS: {
    // Échelle du guide. 1.5 = 150% de la taille d'origine (pour bien espacer les étoiles)
    SCALE: 1.5,

    // Échelle lors de l'import CSV (distance entre étoiles d'une constellation)
    IMPORT_SCALE: 10000,

    // Transparence du guide (0.15 = 15% visible, très discret)
    OPACITY: 0.15,
    // Contrôle l'affichage des noms d'étoiles dans les guides : zoom minimal pour les afficher
    // Valeur par défaut : 0.8 (aligné sur LOD.STAR_LABEL_VISIBILITY_THRESHOLD)
    STAR_LABEL_ZOOM_THRESHOLD: 0.8,

    // Activer l'affichage des noms d'étoiles par défaut (si true, les noms s'affichent indépendamment du zoom)
    SHOW_STAR_LABELS_BY_DEFAULT: false,
  }
};
