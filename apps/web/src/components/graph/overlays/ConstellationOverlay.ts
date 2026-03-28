// Overlay des constellations pour le mode admin

import { Constellation, CONSTELLATIONS } from '../types';
import { GRAPH_CONFIG } from '../GraphConfig';

interface ConstellationOverlayConfig {
  opacity: number;
  starColor: string;
  lineColor: string;
  labelColor: string;
  showLabels: boolean;
  showLines: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const DEFAULT_CONFIG: ConstellationOverlayConfig = {
  opacity: 0.3,
  starColor: '#ffffff',
  lineColor: '#4a90d9',
  labelColor: '#888888',
  showLabels: true,
  showLines: true,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

/**
 * Dessine une constellation comme guide de placement
 */
export function renderConstellation(
  ctx: CanvasRenderingContext2D,
  constellation: Constellation,
  canvasWidth: number,
  canvasHeight: number,
  config: Partial<ConstellationOverlayConfig> = {},
  // globalScale corresponds to the current graph zoom/scale (k in d3)
  globalScale: number = 1
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  ctx.save();
  ctx.globalAlpha = cfg.opacity;
  
  // Convertir les coordonnées relatives en coordonnées canvas
  const points = constellation.points.map(p => ({
    x: (p.x * canvasWidth * cfg.scale) + cfg.offsetX,
    y: (p.y * canvasHeight * cfg.scale) + cfg.offsetY,
    name: p.name,
  }));
  
  // Dessiner les lignes
  if (cfg.showLines) {
    ctx.strokeStyle = cfg.lineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    for (const line of constellation.lines) {
      const from = points[line.from];
      const to = points[line.to];
      
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
    }
    
    ctx.setLineDash([]);
  }
  
  // Dessiner les étoiles
  const starLabelThreshold = GRAPH_CONFIG.CONSTELLATIONS?.STAR_LABEL_ZOOM_THRESHOLD ?? GRAPH_CONFIG.LOD.STAR_LABEL_VISIBILITY_THRESHOLD;
  for (const point of points) {
    // Étoile avec croix
    drawConstellationStar(ctx, point.x, point.y, 8, cfg.starColor);
    
    // Label
    const alwaysShow = GRAPH_CONFIG.CONSTELLATIONS?.SHOW_STAR_LABELS_BY_DEFAULT === true;
    const showName = !!point.name && cfg.showLabels && (globalScale >= starLabelThreshold || alwaysShow);

    if (showName && point.name) {
      ctx.save();
      // Draw labels at full alpha so they remain readable even if the guide is faint
      ctx.globalAlpha = 1;
      ctx.fillStyle = cfg.labelColor;
      ctx.font = `${Math.max(9, 10 / Math.max(globalScale, 0.1))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(point.name, point.x, point.y + 15);
      ctx.restore();
    }
  }
  
  // Nom de la constellation (affiché seulement si on est assez zoomé ou si showLabels activé globalement)
  const showConstellationName = cfg.showLabels && (globalScale >= starLabelThreshold || GRAPH_CONFIG.CONSTELLATIONS?.SHOW_STAR_LABELS_BY_DEFAULT === true);
  if (showConstellationName) {
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const minY = Math.min(...points.map(p => p.y));
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = cfg.labelColor;
    ctx.font = `bold ${Math.max(12, 14 / Math.max(globalScale, 0.1))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(constellation.name, centerX, minY - 20);
    ctx.restore();
  }
  
  ctx.restore();
}

/**
 * Dessine une étoile de constellation (croix + cercle)
 */
function drawConstellationStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  // Lueur
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
  glow.addColorStop(0, `${color}44`);
  glow.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, size * 2, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  
  // Croix
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
  
  // Centre
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Dessine une grille de positionnement
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  cellSize: number = 50,
  color: string = '#ffffff11'
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  
  // Lignes verticales
  for (let x = 0; x <= canvasWidth; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  
  // Lignes horizontales
  for (let y = 0; y <= canvasHeight; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Dessine des orbites circulaires comme guide (système solaire)
 */
export function renderOrbitalGuides(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  orbits: number[],
  color: string = '#ffffff11'
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  
  for (const radius of orbits) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Dessine un système planétaire schématique comme guide
 */
export function renderSolarSystemGuide(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  maxRadius: number,
  planetCount: number = 6,
  config: Partial<ConstellationOverlayConfig> = {}
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  ctx.save();
  ctx.globalAlpha = cfg.opacity;
  
  // Soleil central
  const sunGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);
  sunGradient.addColorStop(0, '#ffd70044');
  sunGradient.addColorStop(0.5, '#ffa50022');
  sunGradient.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
  ctx.fillStyle = sunGradient;
  ctx.fill();
  
  // Orbites et positions des planètes
  for (let i = 0; i < planetCount; i++) {
    const orbitRadius = (maxRadius / planetCount) * (i + 1);
    
    // Orbite
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = cfg.lineColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Position suggérée de la planète (espacées régulièrement)
    const angle = (i / planetCount) * Math.PI * 2;
    const planetX = centerX + Math.cos(angle) * orbitRadius;
    const planetY = centerY + Math.sin(angle) * orbitRadius;
    
    // Indicateur de position
    ctx.beginPath();
    ctx.arc(planetX, planetY, 5, 0, Math.PI * 2);
    ctx.strokeStyle = cfg.starColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Numéro
    if (cfg.showLabels) {
      ctx.fillStyle = cfg.labelColor;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`P${i + 1}`, planetX, planetY + 15);
    }
  }
  
  ctx.restore();
}

/**
 * Dessine un hexagone comme guide (pour les graphes en nid d'abeille)
 */
export function renderHexGrid(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  hexSize: number,
  rings: number,
  color: string = '#ffffff11'
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  
  const sqrt3 = Math.sqrt(3);
  
  // Fonction pour dessiner un hexagone
  const drawHex = (cx: number, cy: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = cx + hexSize * Math.cos(angle);
      const y = cy + hexSize * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };
  
  // Hexagone central
  drawHex(centerX, centerY);
  
  // Anneaux concentriques
  for (let ring = 1; ring <= rings; ring++) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < ring; j++) {
        // Calculer la position dans l'anneau
        const angle1 = (i * Math.PI) / 3;
        const angle2 = ((i + 1) * Math.PI) / 3;
        
        const startX = centerX + ring * hexSize * sqrt3 * Math.cos(angle1 - Math.PI / 6);
        const startY = centerY + ring * hexSize * sqrt3 * Math.sin(angle1 - Math.PI / 6);
        
        const endX = centerX + ring * hexSize * sqrt3 * Math.cos(angle2 - Math.PI / 6);
        const endY = centerY + ring * hexSize * sqrt3 * Math.sin(angle2 - Math.PI / 6);
        
        const t = j / ring;
        const hx = startX + (endX - startX) * t;
        const hy = startY + (endY - startY) * t;
        
        drawHex(hx, hy);
      }
    }
  }
  
  ctx.restore();
}

/**
 * Obtient une constellation par son nom
 */
export function getConstellation(name: string): Constellation | undefined {
  return CONSTELLATIONS[name];
}

/**
 * Liste des constellations disponibles
 */
export function getAvailableConstellations(): string[] {
  return Object.keys(CONSTELLATIONS);
}

/**
 * Obtenir les constellations groupées par catégorie
 */
export function getConstellationsByCategory(): Record<string, { key: string; name: string }[]> {
  return {
    'Zodiacales': [
      { key: 'aries', name: CONSTELLATIONS.aries.name },
      { key: 'taurus', name: CONSTELLATIONS.taurus.name },
      { key: 'gemini', name: CONSTELLATIONS.gemini.name },
      { key: 'leo', name: CONSTELLATIONS.leo.name },
      { key: 'scorpius', name: CONSTELLATIONS.scorpius.name },
      { key: 'sagittarius', name: CONSTELLATIONS.sagittarius.name },
    ],
    'Circumpolaires': [
      { key: 'bigDipper', name: CONSTELLATIONS.bigDipper.name },
      { key: 'littleDipper', name: CONSTELLATIONS.littleDipper.name },
      { key: 'cassiopeia', name: CONSTELLATIONS.cassiopeia.name },
      { key: 'draco', name: CONSTELLATIONS.draco.name },
    ],
    'Célèbres': [
      { key: 'orion', name: CONSTELLATIONS.orion.name },
      { key: 'cygnus', name: CONSTELLATIONS.cygnus.name },
      { key: 'lyra', name: CONSTELLATIONS.lyra.name },
      { key: 'aquila', name: CONSTELLATIONS.aquila.name },
      { key: 'pegasus', name: CONSTELLATIONS.pegasus.name },
      { key: 'andromeda', name: CONSTELLATIONS.andromeda.name },
      { key: 'perseus', name: CONSTELLATIONS.perseus.name },
    ],
    'Australes': [
      { key: 'crux', name: CONSTELLATIONS.crux.name },
      { key: 'centaurus', name: CONSTELLATIONS.centaurus.name },
    ],
    'Guides': [
      { key: 'summerTriangle', name: CONSTELLATIONS.summerTriangle.name },
      { key: 'solarSystem', name: CONSTELLATIONS.solarSystem.name },
    ],
  };
}
