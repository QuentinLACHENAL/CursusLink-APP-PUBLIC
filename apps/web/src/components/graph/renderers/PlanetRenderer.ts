// Rendu des planètes avec textures procédurales

import { 
  NodeVisualConfig, 
  PlanetType, 
  PLANET_PALETTES,
  DEFAULT_VISUALS 
} from '../types';

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  time: number;
  globalScale: number;
}

/**
 * Dessine une planète avec texture et effets
 */
export function renderPlanet(
  context: RenderContext,
  config: Partial<NodeVisualConfig> = {}
): void {
  const { ctx, x, y, size, time, globalScale } = context;
  
  const planetType = config.planetType || 'rocky';
  const palette = PLANET_PALETTES[planetType];
  const primaryColor = config.primaryColor || palette.primary;
  const secondaryColor = config.secondaryColor || palette.secondary;
  const hasRings = config.hasRings ?? false;
  const ringColor = config.ringColor || palette.accent;
  const glowIntensity = config.glowIntensity ?? 0.5;
  const atmosphereColor = config.atmosphereColor || `${primaryColor}66`;

  // Taille ajustée
  const radius = size * 0.7;

  // 1. Lueur atmosphérique externe (HALO)
  // Le rayon du halo dépend de glowIntensity:
  // - Default (0.5) → rayon = radius * 2.5
  // - Unlocked (2.0) → rayon = radius * 7 (très visible)
  if (glowIntensity > 0) {
    const glowRadius = radius * (1 + glowIntensity * 3);
    const glowGradient = ctx.createRadialGradient(x, y, radius * 0.8, x, y, glowRadius);
    glowGradient.addColorStop(0, `${atmosphereColor}`);
    glowGradient.addColorStop(0.4, `${primaryColor}44`);
    glowGradient.addColorStop(0.7, `${primaryColor}22`);
    glowGradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
  }

  // 2. Anneaux (derrière la planète si présents)
  if (hasRings) {
    renderRings(ctx, x, y, radius, ringColor, config.ringAngle || 0.3, 'back');
  }

  // 3. Corps de la planète avec gradient réaliste (éclairage directionnel)
  const planetGradient = ctx.createRadialGradient(
    x - radius * 0.35, y - radius * 0.35, radius * 0.1,
    x + radius * 0.2, y + radius * 0.2, radius * 1.1
  );
  planetGradient.addColorStop(0, lightenColor(primaryColor, 25));
  planetGradient.addColorStop(0.3, primaryColor);
  planetGradient.addColorStop(0.6, secondaryColor);
  planetGradient.addColorStop(0.85, darkenColor(secondaryColor, 40));
  planetGradient.addColorStop(1, darkenColor(secondaryColor, 60));

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = planetGradient;
  ctx.fill();

  // 4. Texture de surface selon le type
  // Ralentir l'animation visuelle des textures (diviser le temps)
  renderPlanetTexture(ctx, x, y, radius, planetType, time / 2000);

  // 5. Reflet de lumière subtil (pas trop "verre")
  const highlightGradient = ctx.createRadialGradient(
    x - radius * 0.35, y - radius * 0.35, 0,
    x - radius * 0.15, y - radius * 0.15, radius * 0.5
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  highlightGradient.addColorStop(1, 'transparent');

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = highlightGradient;
  ctx.fill();

  // 6. Ombre portée (terminateur jour/nuit)
  const shadowGradient = ctx.createRadialGradient(
    x + radius * 0.4, y + radius * 0.3, 0,
    x, y, radius
  );
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
  shadowGradient.addColorStop(1, 'transparent');

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = shadowGradient;
  ctx.fill();

  // 7. Anneaux (devant la planète)
  if (hasRings) {
    renderRings(ctx, x, y, radius, ringColor, config.ringAngle || 0.3, 'front');
  }

  // 8. Bordure subtile
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `${primaryColor}88`;
  ctx.lineWidth = 0.5 / globalScale;
  ctx.stroke();
}

/**
 * Rendu des anneaux de type Saturne
 */
function renderRings(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  planetRadius: number,
  color: string,
  tiltAngle: number,
  position: 'front' | 'back'
): void {
  const innerRadius = planetRadius * 1.3;
  const outerRadius = planetRadius * 2.0;
  const rings = 3; // Nombre de bandes

  ctx.save();
  
  for (let i = 0; i < rings; i++) {
    const r1 = innerRadius + (outerRadius - innerRadius) * (i / rings);
    const r2 = innerRadius + (outerRadius - innerRadius) * ((i + 0.8) / rings);
    
    // Dessiner comme une ellipse aplatie
    ctx.beginPath();
    
    const steps = 60;
    for (let j = 0; j <= steps; j++) {
      const angle = (j / steps) * Math.PI * 2;
      
      // Seulement la partie avant ou arrière selon position
      const yOffset = Math.sin(angle) * tiltAngle;
      if (position === 'back' && yOffset > 0) continue;
      if (position === 'front' && yOffset < 0) continue;

      const px = x + Math.cos(angle) * ((r1 + r2) / 2);
      const py = y + yOffset * ((r1 + r2) / 2);
      
      if (j === 0 || (position === 'back' && yOffset === 0)) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    
    const alpha = 0.3 - (i * 0.08);
    ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = (r2 - r1) * 0.8;
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Texture de surface selon le type de planète
 */
function renderPlanetTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  type: PlanetType,
  time: number
): void {
  ctx.save();
  
  // Clipper au cercle de la planète
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.98, 0, Math.PI * 2);
  ctx.clip();

  switch (type) {
    case 'gas':
      // Bandes horizontales de gaz
      renderGasBands(ctx, x, y, radius, time);
      break;
    case 'rocky':
      // Cratères
      renderCraters(ctx, x, y, radius);
      break;
    case 'ice':
      // Fissures glacées
      renderIceCracks(ctx, x, y, radius);
      break;
    case 'volcanic':
      // Points de lave
      renderLavaSpots(ctx, x, y, radius, time);
      break;
    case 'ocean':
      // Continents
      renderOceanContinents(ctx, x, y, radius);
      break;
    case 'desert':
      // Dunes
      renderDesertDunes(ctx, x, y, radius);
      break;
  }

  ctx.restore();
}

function renderGasBands(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number): void {
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const yPos = y - radius + (radius * 2 * i / bands);
    const waveOffset = Math.sin(time * 0.5 + i) * 2;
    
    ctx.beginPath();
    ctx.moveTo(x - radius, yPos + waveOffset);
    
    for (let j = 0; j <= 20; j++) {
      const px = x - radius + (radius * 2 * j / 20);
      const py = yPos + Math.sin(j * 0.5 + time + i) * 3 + waveOffset;
      ctx.lineTo(px, py);
    }
    
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = radius / bands * 0.8;
    ctx.stroke();
  }
}

function renderCraters(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  // Cratères fixes basés sur position (pseudo-aléatoire déterministe)
  const seed = Math.abs(x * 1000 + y * 100);
  const craterCount = 5 + (seed % 4);
  
  for (let i = 0; i < craterCount; i++) {
    const angle = ((seed + i * 137.5) % 360) * Math.PI / 180;
    const dist = ((seed + i * 73) % 80) / 100 * radius * 0.7;
    const craterX = x + Math.cos(angle) * dist;
    const craterY = y + Math.sin(angle) * dist;
    const craterR = radius * (0.05 + ((seed + i * 31) % 10) / 100);
    
    // Ombre du cratère
    const craterGradient = ctx.createRadialGradient(
      craterX - craterR * 0.3, craterY - craterR * 0.3, 0,
      craterX, craterY, craterR
    );
    craterGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    craterGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
    craterGradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(craterX, craterY, craterR, 0, Math.PI * 2);
    ctx.fillStyle = craterGradient;
    ctx.fill();
  }
}

function renderIceCracks(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  const seed = Math.abs(x * 1000 + y * 100);
  
  ctx.strokeStyle = 'rgba(200, 230, 255, 0.3)';
  ctx.lineWidth = 0.5;
  
  for (let i = 0; i < 8; i++) {
    const startAngle = ((seed + i * 45) % 360) * Math.PI / 180;
    const length = radius * (0.3 + ((seed + i * 17) % 50) / 100);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    let px = x, py = y;
    for (let j = 0; j < 5; j++) {
      const jitter = ((seed + i * j) % 20 - 10) * 0.05;
      px += Math.cos(startAngle + jitter) * (length / 5);
      py += Math.sin(startAngle + jitter) * (length / 5);
      ctx.lineTo(px, py);
    }
    
    ctx.stroke();
  }
}

function renderLavaSpots(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number): void {
  const seed = Math.abs(x * 1000 + y * 100);
  const spotCount = 4 + (seed % 3);
  
  for (let i = 0; i < spotCount; i++) {
    const angle = ((seed + i * 137.5) % 360) * Math.PI / 180;
    const dist = ((seed + i * 73) % 70) / 100 * radius * 0.6;
    const spotX = x + Math.cos(angle) * dist;
    const spotY = y + Math.sin(angle) * dist;
    const spotR = radius * (0.08 + ((seed + i * 31) % 8) / 100);
    const pulse = 1 + Math.sin(time * 3 + i) * 0.2;
    
    // Lueur de lave
    const lavaGradient = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotR * pulse);
    lavaGradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
    lavaGradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
    lavaGradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotR * pulse, 0, Math.PI * 2);
    ctx.fillStyle = lavaGradient;
    ctx.fill();
  }
}

function renderOceanContinents(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  const seed = Math.abs(x * 1000 + y * 100);
  
  // Quelques "continents" (formes irrégulières vertes/brunes)
  for (let i = 0; i < 3; i++) {
    const angle = ((seed + i * 120) % 360) * Math.PI / 180;
    const dist = ((seed + i * 50) % 60) / 100 * radius * 0.5;
    const cx = x + Math.cos(angle) * dist;
    const cy = y + Math.sin(angle) * dist;
    
    ctx.beginPath();
    const points = 6;
    for (let j = 0; j <= points; j++) {
      const a = (j / points) * Math.PI * 2;
      const r = radius * (0.15 + ((seed + i * j) % 10) / 100);
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(34, 139, 34, 0.4)';
    ctx.fill();
  }
}

function renderDesertDunes(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.strokeStyle = 'rgba(210, 180, 140, 0.3)';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < 8; i++) {
    const yOffset = -radius + (radius * 2 * i / 8);
    
    ctx.beginPath();
    ctx.moveTo(x - radius, y + yOffset);
    
    for (let j = 0; j <= 10; j++) {
      const px = x - radius + (radius * 2 * j / 10);
      const wave = Math.sin(j * 0.8 + i * 0.5) * 4;
      ctx.lineTo(px, y + yOffset + wave);
    }
    
    ctx.stroke();
  }
}

// Utilitaires couleur
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
