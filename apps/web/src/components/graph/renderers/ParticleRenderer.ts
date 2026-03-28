// Rendu des particules de données entre les nœuds

import { DataParticleConfig, PARTICLE_PRESETS } from '../types';

interface Particle {
  progress: number; // 0 à 1 le long du lien
  speed: number;
  config: DataParticleConfig;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

interface LinkParticleState {
  sourceId: string;
  targetId: string;
  particles: Particle[];
  lastSpawnTime: number;
}

// Cache des particules par lien
const particleCache = new Map<string, LinkParticleState>();

/**
 * Initialise ou récupère les particules pour un lien
 */
export function getOrCreateLinkParticles(
  sourceId: string,
  targetId: string,
  linkType: 'normal' | 'mastered' | 'inProgress' | 'locked' = 'normal',
  particleCount: number = 3
): LinkParticleState {
  const key = `${sourceId}-${targetId}`;
  
  if (!particleCache.has(key)) {
    const config = PARTICLE_PRESETS[linkType] || PARTICLE_PRESETS.normal;
    const particles: Particle[] = [];
    
    // Créer des particules espacées
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        progress: i / particleCount,
        speed: config.speed * (0.8 + Math.random() * 0.4),
        config,
        trail: [],
      });
    }
    
    particleCache.set(key, {
      sourceId,
      targetId,
      particles,
      lastSpawnTime: 0,
    });
  }
  
  return particleCache.get(key)!;
}

/**
 * Met à jour et dessine les particules sur un lien
 */
export function renderLinkParticles(
  ctx: CanvasRenderingContext2D,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  state: LinkParticleState,
  time: number,
  deltaTime: number = 0.016
): void {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  for (const particle of state.particles) {
    // Mise à jour de la progression
    particle.progress += particle.speed * deltaTime * 60;
    
    // Boucle
    if (particle.progress >= 1) {
      particle.progress = 0;
      particle.trail = [];
    }
    
    // Position actuelle
    const x = sourceX + dx * particle.progress;
    const y = sourceY + dy * particle.progress;
    
    // Mise à jour de la traînée
    updateParticleTrail(particle, x, y, particle.config.trailLength);
    
    // Dessiner la traînée
    renderParticleTrail(ctx, particle, angle);
    
    // Dessiner la particule selon sa forme
    renderParticleShape(ctx, x, y, particle.config, time);
  }
}

/**
 * Met à jour la traînée d'une particule
 */
function updateParticleTrail(
  particle: Particle,
  x: number,
  y: number,
  maxLength: number
): void {
  particle.trail.unshift({ x, y, alpha: 1 });
  
  while (particle.trail.length > maxLength) {
    particle.trail.pop();
  }
  
  for (let i = 0; i < particle.trail.length; i++) {
    particle.trail[i].alpha = 1 - (i / maxLength);
  }
}

/**
 * Dessine la traînée de la particule
 */
function renderParticleTrail(
  ctx: CanvasRenderingContext2D,
  particle: Particle,
  angle: number
): void {
  if (particle.trail.length < 2) return;
  
  const { config } = particle;
  
  ctx.save();
  ctx.lineCap = 'round';
  
  for (let i = 0; i < particle.trail.length - 1; i++) {
    const p1 = particle.trail[i];
    const p2 = particle.trail[i + 1];
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    
    const alpha = p1.alpha * 0.5;
    ctx.strokeStyle = hexToRgba(config.color, alpha);
    ctx.lineWidth = config.size * p1.alpha;
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Dessine la particule selon sa forme
 */
function renderParticleShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  config: DataParticleConfig,
  time: number
): void {
  const pulse = 1 + Math.sin(time * 8) * 0.2;
  const size = config.size * pulse;
  
  // Lueur externe si configurée
  if (config.glowColor) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
    glow.addColorStop(0, config.glowColor);
    glow.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  }
  
  ctx.fillStyle = config.color;
  
  switch (config.shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'star':
      drawStar(ctx, x, y, size, 5);
      break;
      
    case 'diamond':
      drawDiamond(ctx, x, y, size);
      break;
      
    case 'comet':
      drawComet(ctx, x, y, size, config.color, time);
      break;
  }
}

/**
 * Dessine une étoile à n branches
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  points: number
): void {
  const outerRadius = size;
  const innerRadius = size * 0.4;
  
  ctx.beginPath();
  
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  
  ctx.closePath();
  ctx.fill();
}

/**
 * Dessine un losange
 */
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.7, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.7, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Dessine une comète avec queue
 */
function drawComet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  time: number
): void {
  // Queue de la comète (gradient)
  const tailLength = size * 5;
  const gradient = ctx.createLinearGradient(x + tailLength, y, x, y);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.5, `${color}44`);
  gradient.addColorStop(1, color);
  
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.5);
  ctx.lineTo(x + tailLength, y);
  ctx.lineTo(x, y + size * 0.5);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Tête de la comète
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Nettoie le cache des particules (pour les liens supprimés)
 */
export function cleanupParticleCache(activeLinks: Set<string>): void {
  for (const key of particleCache.keys()) {
    if (!activeLinks.has(key)) {
      particleCache.delete(key);
    }
  }
}

/**
 * Dessine un flux de données entre deux points avec effet de vague
 */
export function renderDataFlow(
  ctx: CanvasRenderingContext2D,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  color: string,
  time: number,
  intensity: number = 1
): void {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Dessiner une ligne ondulée
  const segments = Math.max(10, Math.floor(length / 10));
  const waveAmplitude = 2 * intensity;
  const waveFrequency = 0.3;
  
  ctx.save();
  ctx.strokeStyle = `${color}66`;
  ctx.lineWidth = 2 * intensity;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const baseX = sourceX + dx * t;
    const baseY = sourceY + dy * t;
    
    // Perpendiculaire au lien
    const perpX = -dy / length;
    const perpY = dx / length;
    
    // Ondulation
    const wave = Math.sin(t * Math.PI * 4 + time * 5) * waveAmplitude * Math.sin(t * Math.PI);
    
    const x = baseX + perpX * wave;
    const y = baseY + perpY * wave;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  ctx.restore();
}

// Utilitaire
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(255, 255, 255, ${alpha})`;
  
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
}
