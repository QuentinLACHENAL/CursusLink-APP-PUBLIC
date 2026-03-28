// Rendu des étoiles avec effets de lumière

import { NodeVisualConfig, StarType, STAR_COLORS } from '../types';
import { GRAPH_CONFIG } from '../GraphConfig';

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  time: number;
  globalScale: number;
}

/**
 * Dessine une étoile avec corona et pulsation
 */
export function renderStar(
  context: RenderContext,
  config: Partial<NodeVisualConfig> = {}
): void {
  const { ctx, x, y, size, time, globalScale } = context;
  
  // LOGIQUE DE ZOOM:
  // Si on est loin (globalScale petit), l'étoile est blanche et scintille.
  // Si on est proche, elle prend sa vraie couleur.
  const isZoomedOut = globalScale < (GRAPH_CONFIG.BACKGROUND.ZOOM_COLOR_THRESHOLD || 0.6);
  
  // Choix de la couleur de base
  const starType = config.starType || 'yellow';
  
  // Si dézoomé, on force le type 'white' ou on modifie manuellement les couleurs
  let colors = STAR_COLORS[starType];
  
  if (isZoomedOut) {
    // Mode lointain : Blanc scintillant
    // On prend la base blanche mais on peut garder une légère teinte de la couleur originale si on veut
    // Pour l'instant, respectons la demande : "visibles en blanc"
    colors = STAR_COLORS['white']; 
  }

  const coronaIntensity = config.coronaIntensity ?? 0.8;
  const pulseSpeed = config.pulseSpeed ?? 2;
  const glowIntensity = config.glowIntensity ?? 1.2;

  // Utiliser la couleur de glow personnalisée si fournie (ex: Halo blanc)
  const effectiveGlowColor = config.glowColor || colors.glow;

  const radius = size * 0.6;
  
  // SCINTILLEMENT (TWINKLE)
  // Plus fort si dézoomé
  const twinkleBase = isZoomedOut ? (GRAPH_CONFIG.BACKGROUND.TWINKLE_INTENSITY || 0.5) : 0;
  // Variation aléatoire pseudo-stable basée sur la position et le temps
  const randomSeed = (x * y) % 100; 
  const twinkle = isZoomedOut 
    ? Math.sin(time * 5 + randomSeed) * twinkleBase 
    : 0;

  // Si dézoomé, on fait varier la taille (scintillement)
  const pulse = 1 + Math.sin(time * pulseSpeed) * 0.08 + twinkle;
  const pulseRadius = radius * pulse;

  // 1. Rayons externes (corona lointaine) - effet "feu"
  renderStarRays(ctx, x, y, pulseRadius, effectiveGlowColor, time, coronaIntensity);

  // 2. Protubérances solaires (effet flammes)
  renderSolarFlares(ctx, x, y, pulseRadius, colors.corona, time);

  // 3. Corona externe diffuse (halo chaud)
  const outerGlow = ctx.createRadialGradient(x, y, pulseRadius * 0.5, x, y, pulseRadius * 4);
  
  if (config.glowColor) {
     // Si une couleur de halo explicite est demandée (ex: Blanc), on l'utilise pour tout le dégradé externe
     outerGlow.addColorStop(0, `${effectiveGlowColor}99`);
     outerGlow.addColorStop(0.3, `${effectiveGlowColor}66`);
     outerGlow.addColorStop(0.6, `${effectiveGlowColor}22`);
     outerGlow.addColorStop(1, 'transparent');
  } else {
     outerGlow.addColorStop(0, `${effectiveGlowColor}88`);
     outerGlow.addColorStop(0.2, `${colors.corona}55`);
     outerGlow.addColorStop(0.5, `${colors.corona}22`);
     outerGlow.addColorStop(0.8, `${colors.corona}08`);
     outerGlow.addColorStop(1, 'transparent');
  }
  
  ctx.beginPath();
  ctx.arc(x, y, pulseRadius * 4 * glowIntensity, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow;
  ctx.fill();

  // 4. Corona moyenne avec turbulences
  const midGlow = ctx.createRadialGradient(x, y, pulseRadius * 0.7, x, y, pulseRadius * 2.2);
  midGlow.addColorStop(0, colors.corona);
  midGlow.addColorStop(0.4, `${colors.corona}aa`);
  midGlow.addColorStop(0.7, `${effectiveGlowColor}44`);
  midGlow.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, pulseRadius * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = midGlow;
  ctx.fill();

  // 5. Surface solaire avec texture de granulation
  renderSolarSurface(ctx, x, y, pulseRadius, colors, time);

  // 6. Noyau incandescent central
  const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius);
  coreGradient.addColorStop(0, '#ffffff');
  coreGradient.addColorStop(0.2, '#fffef0');
  coreGradient.addColorStop(0.4, colors.core);
  coreGradient.addColorStop(0.7, colors.corona);
  coreGradient.addColorStop(1, `${colors.corona}aa`);
  
  ctx.beginPath();
  ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();

  // 7. Scintillement central brillant
  const sparkle = 0.4 + Math.abs(Math.sin(time * 5)) * 0.4;
  ctx.beginPath();
  ctx.arc(x, y, pulseRadius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${sparkle})`;
  ctx.fill();

  // 8. Lens flare effect (croix de lumière)
  renderLensFlare(ctx, x, y, pulseRadius, effectiveGlowColor, time);
}

/**
 * Protubérances solaires (flammes qui s'élèvent)
 */
function renderSolarFlares(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number
): void {
  const flareCount = 6;
  ctx.save();
  
  for (let i = 0; i < flareCount; i++) {
    const baseAngle = (i / flareCount) * Math.PI * 2;
    const angle = baseAngle + Math.sin(time * 0.5 + i * 2) * 0.2;
    const flareHeight = radius * (0.8 + Math.sin(time * 2 + i * 1.5) * 0.4);
    
    // Position de base sur la surface
    const baseX = x + Math.cos(angle) * radius * 0.9;
    const baseY = y + Math.sin(angle) * radius * 0.9;
    
    // Point de contrôle pour la courbe (flamme arquée)
    const ctrlAngle = angle + Math.sin(time + i) * 0.3;
    const ctrlX = x + Math.cos(ctrlAngle) * (radius + flareHeight * 0.7);
    const ctrlY = y + Math.sin(ctrlAngle) * (radius + flareHeight * 0.7);
    
    // Sommet de la flamme
    const tipX = x + Math.cos(angle) * (radius + flareHeight);
    const tipY = y + Math.sin(angle) * (radius + flareHeight);
    
    // Gradient pour la flamme
    const flareGradient = ctx.createRadialGradient(baseX, baseY, 0, tipX, tipY, flareHeight);
    flareGradient.addColorStop(0, `${color}cc`);
    flareGradient.addColorStop(0.5, `${color}66`);
    flareGradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.moveTo(baseX - Math.cos(angle + Math.PI/2) * radius * 0.15, 
               baseY - Math.sin(angle + Math.PI/2) * radius * 0.15);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.quadraticCurveTo(ctrlX + Math.cos(angle + Math.PI/2) * radius * 0.1,
                         ctrlY + Math.sin(angle + Math.PI/2) * radius * 0.1,
                         baseX + Math.cos(angle + Math.PI/2) * radius * 0.15,
                         baseY + Math.sin(angle + Math.PI/2) * radius * 0.15);
    ctx.closePath();
    
    ctx.fillStyle = flareGradient;
    ctx.globalAlpha = 0.5 + Math.sin(time * 3 + i) * 0.2;
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Surface solaire avec granulation
 */
function renderSolarSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colors: { core: string; corona: string; glow: string },
  time: number
): void {
  ctx.save();
  
  // Clip au cercle
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.95, 0, Math.PI * 2);
  ctx.clip();
  
  // Granulation (cellules de convection)
  const cellCount = 8;
  for (let i = 0; i < cellCount; i++) {
    const cellAngle = (i / cellCount) * Math.PI * 2 + time * 0.1;
    const cellDist = radius * (0.3 + (i % 3) * 0.2);
    const cellX = x + Math.cos(cellAngle) * cellDist;
    const cellY = y + Math.sin(cellAngle) * cellDist;
    const cellSize = radius * (0.2 + Math.sin(time + i) * 0.05);
    
    const cellGradient = ctx.createRadialGradient(cellX, cellY, 0, cellX, cellY, cellSize);
    cellGradient.addColorStop(0, `${colors.core}40`);
    cellGradient.addColorStop(0.7, `${colors.corona}20`);
    cellGradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(cellX, cellY, cellSize, 0, Math.PI * 2);
    ctx.fillStyle = cellGradient;
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Dessine les rayons de la corona
 */
function renderStarRays(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number,
  intensity: number
): void {
  const rayCount = 12;
  
  ctx.save();
  ctx.globalAlpha = intensity * 0.4;
  
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + time * 0.1;
    const rayLength = radius * (2 + Math.sin(time * 3 + i) * 0.5);
    const rayWidth = radius * 0.15;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    const endX = x + Math.cos(angle) * rayLength;
    const endY = y + Math.sin(angle) * rayLength;
    
    // Gradient le long du rayon
    const rayGradient = ctx.createLinearGradient(x, y, endX, endY);
    rayGradient.addColorStop(0, color);
    rayGradient.addColorStop(0.3, `${color}88`);
    rayGradient.addColorStop(1, 'transparent');
    
    // Triangle pour le rayon
    const perpX = Math.cos(angle + Math.PI / 2) * rayWidth;
    const perpY = Math.sin(angle + Math.PI / 2) * rayWidth;
    
    ctx.moveTo(x + perpX, y + perpY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(x - perpX, y - perpY);
    ctx.closePath();
    
    ctx.fillStyle = rayGradient;
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Effet de lens flare (croix lumineuse)
 */
function renderLensFlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number
): void {
  const flareIntensity = 0.3 + Math.sin(time * 4) * 0.15;
  const flareLength = radius * 3;
  const flareWidth = radius * 0.1;
  
  ctx.save();
  ctx.globalAlpha = flareIntensity;
  
  // Croix principale
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    
    const gradient = ctx.createLinearGradient(
      x - Math.cos(angle) * flareLength,
      y - Math.sin(angle) * flareLength,
      x + Math.cos(angle) * flareLength,
      y + Math.sin(angle) * flareLength
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.4, `${color}44`);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(0.6, `${color}44`);
    gradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.moveTo(
      x - Math.cos(angle) * flareLength + Math.cos(angle + Math.PI/2) * flareWidth,
      y - Math.sin(angle) * flareLength + Math.sin(angle + Math.PI/2) * flareWidth
    );
    ctx.lineTo(
      x + Math.cos(angle) * flareLength + Math.cos(angle + Math.PI/2) * flareWidth,
      y + Math.sin(angle) * flareLength + Math.sin(angle + Math.PI/2) * flareWidth
    );
    ctx.lineTo(
      x + Math.cos(angle) * flareLength - Math.cos(angle + Math.PI/2) * flareWidth,
      y + Math.sin(angle) * flareLength - Math.sin(angle + Math.PI/2) * flareWidth
    );
    ctx.lineTo(
      x - Math.cos(angle) * flareLength - Math.cos(angle + Math.PI/2) * flareWidth,
      y - Math.sin(angle) * flareLength - Math.sin(angle + Math.PI/2) * flareWidth
    );
    ctx.closePath();
    
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Dessine une mini-étoile pour décoration
 */
export function renderMiniStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  time: number
): void {
  const pulse = 0.8 + Math.sin(time * 3) * 0.2;
  const actualSize = size * pulse;
  
  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, actualSize * 2);
  glow.addColorStop(0, color);
  glow.addColorStop(0.5, `${color}44`);
  glow.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, actualSize * 2, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  
  // Core
  ctx.beginPath();
  ctx.arc(x, y, actualSize, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}
