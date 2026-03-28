// Rendu des nébuleuses avec particules diffuses et effets de nuages

import { NodeVisualConfig } from '../types';

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  time: number;
  globalScale: number;
}

// Cache pour les particules de nébuleuse (pour éviter de recréer à chaque frame)
const nebulaParticleCache = new Map<string, NebulaParticle[]>();

interface NebulaParticle {
  angle: number;
  radius: number;
  size: number;
  color: string;
  speed: number;
  phaseOffset: number;
  opacity: number;
}

/**
 * Génère les particules d'une nébuleuse de manière déterministe
 */
function generateNebulaParticles(
  id: string,
  colors: string[],
  count: number = 50
): NebulaParticle[] {
  const particles: NebulaParticle[] = [];
  
  // Générateur pseudo-aléatoire basé sur l'ID
  const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (index: number) => {
    const x = Math.sin(seed * 9999 + index * 1234.5678) * 10000;
    return x - Math.floor(x);
  };
  
  for (let i = 0; i < count; i++) {
    const angle = random(i) * Math.PI * 2;
    const radius = random(i + 100) * 0.8 + 0.2; // 0.2 à 1.0
    const size = random(i + 200) * 0.4 + 0.1; // 0.1 à 0.5
    const colorIndex = Math.floor(random(i + 300) * colors.length);
    const speed = (random(i + 400) - 0.5) * 0.2;
    const phaseOffset = random(i + 500) * Math.PI * 2;
    const opacity = random(i + 600) * 0.5 + 0.2;
    
    particles.push({
      angle,
      radius,
      size,
      color: colors[colorIndex],
      speed,
      phaseOffset,
      opacity,
    });
  }
  
  return particles;
}

/**
 * Dessine une nébuleuse avec effet de nuages et particules
 */
export function renderNebula(
  context: RenderContext,
  config: Partial<NodeVisualConfig> = {},
  nodeId: string = 'default'
): void {
  const { ctx, x, y, size, time, globalScale } = context;
  
  const colors = config.nebulaColors || ['#4a90d9', '#9b59b6', '#3498db'];
  const spread = config.nebulaSpread || 1.2;
  const glowIntensity = config.glowIntensity ?? 0.6;
  
  const radius = size * spread;
  
  // Récupérer ou générer les particules
  const cacheKey = `${nodeId}-${colors.join('-')}`;
  if (!nebulaParticleCache.has(cacheKey)) {
    nebulaParticleCache.set(cacheKey, generateNebulaParticles(nodeId, colors, 60));
  }
  const particles = nebulaParticleCache.get(cacheKey)!;
  
  ctx.save();
  
  // 1. Halo externe diffus (effet de gaz)
  const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
  outerGlow.addColorStop(0, `${colors[0]}22`);
  outerGlow.addColorStop(0.3, `${colors[1]}15`);
  outerGlow.addColorStop(0.6, `${colors[2]}08`);
  outerGlow.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, radius * 2 * glowIntensity, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow;
  ctx.fill();
  
  // 2. Nuages de gaz (plusieurs couches)
  renderGasCloud(ctx, x, y, radius, colors[0], time, 0.4 * glowIntensity, 0);
  renderGasCloud(ctx, x, y, radius * 0.8, colors[1], time, 0.5 * glowIntensity, Math.PI / 3);
  renderGasCloud(ctx, x, y, radius * 0.6, colors[2], time, 0.6 * glowIntensity, Math.PI / 6);
  
  // 3. Particules/étoiles dans la nébuleuse
  particles.forEach((particle) => {
    const currentAngle = particle.angle + time * particle.speed + particle.phaseOffset;
    const currentRadius = radius * particle.radius * (0.9 + Math.sin(time * 0.5 + particle.phaseOffset) * 0.1);
    
    const px = x + Math.cos(currentAngle) * currentRadius;
    const py = y + Math.sin(currentAngle) * currentRadius;
    const pSize = size * particle.size * (0.8 + Math.sin(time * 2 + particle.phaseOffset) * 0.2);
    
    // Particule avec glow
    const particleGlow = ctx.createRadialGradient(px, py, 0, px, py, pSize * 3);
    particleGlow.addColorStop(0, `${particle.color}${Math.round(particle.opacity * 255).toString(16).padStart(2, '0')}`);
    particleGlow.addColorStop(0.5, `${particle.color}44`);
    particleGlow.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(px, py, pSize * 3, 0, Math.PI * 2);
    ctx.fillStyle = particleGlow;
    ctx.fill();
    
    // Point central brillant
    ctx.beginPath();
    ctx.arc(px, py, pSize * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * 0.8})`;
    ctx.fill();
  });
  
  // 4. Noyau central lumineux (optionnel, si c'est une nébuleuse avec étoile centrale)
  if (glowIntensity > 0.5) {
    const coreGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.3);
    coreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    coreGlow.addColorStop(0.3, `${colors[0]}88`);
    coreGlow.addColorStop(0.7, `${colors[1]}44`);
    coreGlow.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = coreGlow;
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Dessine un nuage de gaz avec forme organique
 */
function renderGasCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number,
  opacity: number,
  phaseOffset: number
): void {
  ctx.save();
  
  // Créer une forme organique avec plusieurs arcs
  const points: { x: number; y: number }[] = [];
  const segments = 12;
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2 + phaseOffset;
    // Variation du rayon pour forme organique
    const radiusVariation = 1 + 
      Math.sin(angle * 3 + time * 0.3) * 0.15 +
      Math.cos(angle * 2 - time * 0.2) * 0.1;
    
    const r = radius * radiusVariation;
    points.push({
      x: x + Math.cos(angle) * r,
      y: y + Math.sin(angle) * r,
    });
  }
  
  // Dessiner avec courbes de Bézier pour lisser
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const nextNext = points[(i + 2) % points.length];
    
    const cp1x = current.x + (next.x - points[(i - 1 + points.length) % points.length].x) * 0.2;
    const cp1y = current.y + (next.y - points[(i - 1 + points.length) % points.length].y) * 0.2;
    const cp2x = next.x - (nextNext.x - current.x) * 0.2;
    const cp2y = next.y - (nextNext.y - current.y) * 0.2;
    
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
  }
  
  ctx.closePath();
  
  // Gradient radial pour le nuage
  const cloudGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.2);
  cloudGradient.addColorStop(0, `${color}${Math.round(opacity * 200).toString(16).padStart(2, '0')}`);
  cloudGradient.addColorStop(0.5, `${color}${Math.round(opacity * 100).toString(16).padStart(2, '0')}`);
  cloudGradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = cloudGradient;
  ctx.fill();
  
  ctx.restore();
}

/**
 * Dessine une mini nébuleuse pour les vignettes
 */
export function renderMiniNebula(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: string[] = ['#4a90d9', '#9b59b6']
): void {
  // Version simplifiée pour les petites tailles
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, `${colors[0]}88`);
  gradient.addColorStop(0.4, `${colors[1]}55`);
  gradient.addColorStop(0.7, `${colors[0]}22`);
  gradient.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Points lumineux
  const points = 5;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = size * 0.5;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    
    ctx.beginPath();
    ctx.arc(px, py, 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }
}

/**
 * Nettoie le cache des particules
 */
export function cleanupNebulaCache(): void {
  nebulaParticleCache.clear();
}
