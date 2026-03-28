// Rendu des satellites améliorés avec traînées lumineuses

import { SatelliteConfig, DEFAULT_SATELLITE_CONFIG } from '../types';

interface SatelliteState {
  angle: number;
  radius: number;
  size: number;
  speed: number;
  color: string;
  eccentricity: number;
  inclination: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

/**
 * Génère les satellites pour un nœud (déterministe basé sur l'ID)
 */
export function generateSatellites(
  nodeId: string,
  masteryLevel: number,
  config: Partial<SatelliteConfig> = {}
): SatelliteState[] {
  const cfg = { ...DEFAULT_SATELLITE_CONFIG, ...config };
  
  // Nombre de satellites basé sur la maîtrise (1-4)
  const count = Math.min(cfg.count, Math.max(1, Math.floor(masteryLevel / 25) + 1));
  
  // Seed basé sur l'ID du nœud pour un résultat déterministe
  const seed = hashCode(nodeId);
  
  const satellites: SatelliteState[] = [];
  
  for (let i = 0; i < count; i++) {
    const s = seededRandom(seed + i * 1000);
    
    satellites.push({
      angle: (s(0) * Math.PI * 2),
      radius: cfg.minRadius + s(1) * (cfg.maxRadius - cfg.minRadius),
      size: cfg.minSize + s(2) * (cfg.maxSize - cfg.minSize),
      speed: (0.8 + s(3) * cfg.speedVariation) * (i % 2 === 0 ? 1 : -1), // Alternance de sens
      color: cfg.colors[Math.floor(s(4) * cfg.colors.length)],
      eccentricity: 0.2 + s(5) * 0.3, // Orbite plus ou moins elliptique
      inclination: s(6) * 0.4 - 0.2, // Légère inclinaison
      trail: [],
    });
  }
  
  return satellites;
}

/**
 * Met à jour et dessine les satellites
 */
export function renderSatellites(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  nodeRadius: number,
  satellites: SatelliteState[],
  time: number,
  config: Partial<SatelliteConfig> = {}
): void {
  const cfg = { ...DEFAULT_SATELLITE_CONFIG, ...config };
  
  for (const sat of satellites) {
    // Mise à jour de l'angle
    const currentAngle = sat.angle + time * sat.speed;
    
    // Position avec orbite elliptique
    const orbitRadius = sat.radius + nodeRadius;
    const ellipseX = orbitRadius;
    const ellipseY = orbitRadius * (1 - sat.eccentricity);
    
    const satX = x + Math.cos(currentAngle) * ellipseX;
    const satY = y + Math.sin(currentAngle) * ellipseY + Math.sin(currentAngle) * sat.inclination * 5;
    
    // Mise à jour de la traînée
    updateTrail(sat, satX, satY, cfg.trailLength);
    
    // Dessiner la traînée
    renderSatelliteTrail(ctx, sat);
    
    // Dessiner le satellite
    renderSatelliteBody(ctx, satX, satY, sat.size, sat.color, time);
  }
}

/**
 * Met à jour la traînée du satellite
 */
function updateTrail(
  sat: SatelliteState,
  x: number,
  y: number,
  maxLength: number
): void {
  // Ajouter le point actuel
  sat.trail.unshift({ x, y, alpha: 1 });
  
  // Limiter la longueur et mettre à jour les alphas
  while (sat.trail.length > maxLength) {
    sat.trail.pop();
  }
  
  // Diminuer l'alpha progressivement
  for (let i = 0; i < sat.trail.length; i++) {
    sat.trail[i].alpha = 1 - (i / maxLength);
  }
}

/**
 * Dessine la traînée du satellite
 */
function renderSatelliteTrail(
  ctx: CanvasRenderingContext2D,
  sat: SatelliteState
): void {
  if (sat.trail.length < 2) return;
  
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Dessiner chaque segment avec un alpha décroissant
  for (let i = 0; i < sat.trail.length - 1; i++) {
    const p1 = sat.trail[i];
    const p2 = sat.trail[i + 1];
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    
    const alpha = p1.alpha * 0.6;
    const width = sat.size * p1.alpha;
    
    ctx.strokeStyle = hexToRgba(sat.color, alpha);
    ctx.lineWidth = width;
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Dessine le corps du satellite
 */
function renderSatelliteBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  time: number
): void {
  // Légère pulsation
  const pulse = 1 + Math.sin(time * 5) * 0.15;
  const actualSize = size * pulse;
  
  // Lueur externe
  const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize * 3);
  glowGradient.addColorStop(0, `${color}88`);
  glowGradient.addColorStop(0.5, `${color}22`);
  glowGradient.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, actualSize * 3, 0, Math.PI * 2);
  ctx.fillStyle = glowGradient;
  ctx.fill();
  
  // Corps lumineux
  const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize);
  coreGradient.addColorStop(0, '#ffffff');
  coreGradient.addColorStop(0.4, color);
  coreGradient.addColorStop(1, `${color}88`);
  
  ctx.beginPath();
  ctx.arc(x, y, actualSize, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();
}

/**
 * Dessine l'orbite (optionnel, pour le mode admin)
 */
export function renderOrbit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  eccentricity: number = 0,
  color: string = '#ffffff22'
): void {
  const ellipseX = radius;
  const ellipseY = radius * (1 - eccentricity);
  
  ctx.beginPath();
  ctx.ellipse(x, y, ellipseX, ellipseY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Dessine une lune (version plus grosse d'un satellite, avec texture)
 */
export function renderMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  time: number
): void {
  // Corps de la lune
  const gradient = ctx.createRadialGradient(
    x - size * 0.3, y - size * 0.3, 0,
    x, y, size
  );
  gradient.addColorStop(0, '#e8e8e8');
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, '#666666');
  
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Cratères (déterministes basés sur la position)
  const seed = Math.abs(x * 100 + y * 10);
  for (let i = 0; i < 3; i++) {
    const angle = ((seed + i * 120) % 360) * Math.PI / 180;
    const dist = size * 0.3 + ((seed + i * 50) % 30) / 100 * size * 0.3;
    const craterX = x + Math.cos(angle) * dist;
    const craterY = y + Math.sin(angle) * dist;
    const craterSize = size * (0.15 + ((seed + i * 17) % 10) / 100);
    
    ctx.beginPath();
    ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();
  }
  
  // Reflet
  ctx.beginPath();
  ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fill();
}

// Utilitaires

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): (index: number) => number {
  return (index: number) => {
    const x = Math.sin(seed + index * 9999) * 10000;
    return x - Math.floor(x);
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(255, 255, 255, ${alpha})`;
  
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
}
