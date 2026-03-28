// Rendu des trous noirs avec disque d'accrétion et effet de lensing

import { NodeVisualConfig } from '../types';

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  time: number;
  globalScale: number;
}

/**
 * Dessine un trou noir avec disque d'accrétion et halo lumineux
 */
export function renderBlackHole(
  context: RenderContext,
  config: Partial<NodeVisualConfig> = {}
): void {
  const { ctx, x, y, size, time, globalScale } = context;
  
  const accretionColor = config.accretionDiskColor || '#ff6b35';
  const eventHorizonRatio = config.eventHorizonSize ?? 0.4;
  const glowIntensity = config.glowIntensity ?? 1.5;

  const radius = size * 0.8;
  const eventHorizonRadius = radius * eventHorizonRatio;

  // 0. HALO EXTERNE TRÈS VISIBLE (nouveau!)
  renderBlackHoleHalo(ctx, x, y, radius * 2.5, accretionColor, time, glowIntensity);

  // 1. Effet de gravitational lensing (anneau de lumière distordue)
  renderGravitationalLensing(ctx, x, y, radius, time);

  // 2. Disque d'accrétion externe (partie arrière)
  renderAccretionDisk(ctx, x, y, radius, eventHorizonRadius, accretionColor, time, 'back', glowIntensity);

  // 3. L'horizon des événements (noir absolu avec gradient subtil)
  const blackGradient = ctx.createRadialGradient(x, y, 0, x, y, eventHorizonRadius);
  blackGradient.addColorStop(0, '#000000');
  blackGradient.addColorStop(0.6, '#000000');
  blackGradient.addColorStop(0.85, '#020202');
  blackGradient.addColorStop(1, '#080808');
  
  ctx.beginPath();
  ctx.arc(x, y, eventHorizonRadius, 0, Math.PI * 2);
  ctx.fillStyle = blackGradient;
  ctx.fill();

  // 4. Photon sphere (anneau lumineux brillant autour de l'horizon)
  renderPhotonSphere(ctx, x, y, eventHorizonRadius, accretionColor, time);

  // 5. Disque d'accrétion (partie avant)
  renderAccretionDisk(ctx, x, y, radius, eventHorizonRadius, accretionColor, time, 'front', glowIntensity);

  // 6. Jets relativistes (optionnel, pour les gros trous noirs)
  if (size > 15) {
    renderRelativisticJets(ctx, x, y, radius, accretionColor, time);
  }

  // 7. Particules aspirées
  renderInfallingParticles(ctx, x, y, radius, eventHorizonRadius, accretionColor, time);
}

/**
 * Halo lumineux externe très visible
 */
function renderBlackHoleHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number,
  intensity: number
): void {
  const pulse = 1 + Math.sin(time * 1.5) * 0.1;
  const haloRadius = radius * pulse;
  
  // Halo externe diffus (très large)
  const outerHalo = ctx.createRadialGradient(x, y, radius * 0.3, x, y, haloRadius * 1.5);
  outerHalo.addColorStop(0, `${color}00`);
  outerHalo.addColorStop(0.3, `${color}15`);
  outerHalo.addColorStop(0.5, `${color}25`);
  outerHalo.addColorStop(0.7, `${color}10`);
  outerHalo.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, haloRadius * 1.5 * intensity, 0, Math.PI * 2);
  ctx.fillStyle = outerHalo;
  ctx.fill();
  
  // Anneau lumineux concentré
  const ringGlow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 0.9);
  ringGlow.addColorStop(0, 'transparent');
  ringGlow.addColorStop(0.6, `${color}40`);
  ringGlow.addColorStop(0.8, `${color}70`);
  ringGlow.addColorStop(0.9, `${color}40`);
  ringGlow.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = ringGlow;
  ctx.fill();
}

/**
 * Effet de lentille gravitationnelle
 */
function renderGravitationalLensing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number
): void {
  const lensRadius = radius * 2.5;
  
  // Anneau de lumière distordue (Einstein ring effect)
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const ringRadius = lensRadius * (0.8 + i * 0.15);
    const wobble = Math.sin(time * 2 + i) * 0.02;
    
    ctx.save();
    ctx.globalAlpha = 0.15 - i * 0.04;
    
    // Dessiner un anneau déformé
    ctx.beginPath();
    const segments = 60;
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      const distortion = 1 + Math.sin(angle * 4 + time) * wobble;
      const px = x + Math.cos(angle) * ringRadius * distortion;
      const py = y + Math.sin(angle) * ringRadius * distortion * 0.4; // Aplati
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Disque d'accrétion avec rotation
 */
function renderAccretionDisk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  color: string,
  time: number,
  position: 'front' | 'back',
  intensity: number
): void {
  const diskInner = innerRadius * 1.2;
  const diskOuter = outerRadius * 1.8;
  const tilt = 0.3; // Inclinaison du disque
  const rotationSpeed = 0.5;
  
  ctx.save();
  
  // Plusieurs couches de couleur pour l'effet de chaleur
  const layers = [
    { radius: diskOuter, color: `${color}22`, blur: 10 },
    { radius: diskOuter * 0.85, color: `${color}44`, blur: 5 },
    { radius: diskOuter * 0.7, color: `${color}88`, blur: 2 },
    { radius: diskInner * 1.5, color: '#ffffff66', blur: 1 },
  ];
  
  for (const layer of layers) {
    ctx.beginPath();
    
    const segments = 80;
    let started = false;
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2 + time * rotationSpeed;
      const yOffset = Math.sin(angle) * tilt;
      
      // Ne dessiner que la partie avant ou arrière
      if (position === 'back' && yOffset > 0) continue;
      if (position === 'front' && yOffset < 0) continue;
      
      // Variation de luminosité selon la position (effet Doppler)
      const dopplerFactor = 1 + Math.cos(angle) * 0.3;
      
      const r = layer.radius * (0.9 + Math.sin(angle * 3 + time * 2) * 0.1);
      const px = x + Math.cos(angle) * r;
      const py = y + yOffset * r;
      
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    
    ctx.globalAlpha = intensity * 0.6;
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = (diskOuter - diskInner) * 0.3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Sphère de photons (anneau lumineux intense)
 */
function renderPhotonSphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  eventHorizonRadius: number,
  color: string,
  time: number
): void {
  const photonRadius = eventHorizonRadius * 1.5;
  const pulse = 1 + Math.sin(time * 4) * 0.1;
  
  // Anneau intense
  const gradient = ctx.createRadialGradient(x, y, eventHorizonRadius, x, y, photonRadius * pulse);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.3, `${color}22`);
  gradient.addColorStop(0.6, `${color}88`);
  gradient.addColorStop(0.8, `${color}44`);
  gradient.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, photonRadius * pulse, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Bord lumineux net
  ctx.beginPath();
  ctx.arc(x, y, eventHorizonRadius * 1.05, 0, Math.PI * 2);
  ctx.strokeStyle = `${color}aa`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/**
 * Jets relativistes (pour les gros trous noirs)
 */
function renderRelativisticJets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number
): void {
  const jetLength = radius * 3;
  const jetWidth = radius * 0.3;
  
  ctx.save();
  ctx.globalAlpha = 0.4;
  
  // Jet du haut
  for (let i = 0; i < 2; i++) {
    const direction = i === 0 ? -1 : 1;
    const wobble = Math.sin(time * 3 + i) * 5;
    
    const gradient = ctx.createLinearGradient(x, y, x + wobble, y + direction * jetLength);
    gradient.addColorStop(0, `${color}88`);
    gradient.addColorStop(0.3, `${color}44`);
    gradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.moveTo(x - jetWidth / 2, y);
    ctx.quadraticCurveTo(
      x + wobble * 0.5, y + direction * jetLength * 0.5,
      x + wobble, y + direction * jetLength
    );
    ctx.quadraticCurveTo(
      x + wobble * 0.5, y + direction * jetLength * 0.5,
      x + jetWidth / 2, y
    );
    ctx.closePath();
    
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Particules aspirées vers le trou noir
 */
function renderInfallingParticles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  color: string,
  time: number
): void {
  const particleCount = 8;
  
  for (let i = 0; i < particleCount; i++) {
    // Position sur une spirale qui se rapproche
    const baseAngle = (i / particleCount) * Math.PI * 2;
    const spiralProgress = ((time * 0.3 + i * 0.1) % 1);
    const currentRadius = outerRadius * 1.5 - (outerRadius * 1.5 - innerRadius) * spiralProgress;
    const angle = baseAngle + spiralProgress * Math.PI * 4; // 2 tours pendant la chute
    
    const px = x + Math.cos(angle) * currentRadius;
    const py = y + Math.sin(angle) * currentRadius * 0.3; // Aplati comme le disque
    
    // Taille qui diminue en approchant
    const size = 2 * (1 - spiralProgress * 0.7);
    
    // Traînée
    const trailLength = 5;
    ctx.beginPath();
    for (let t = 0; t < trailLength; t++) {
      const trailProgress = spiralProgress - t * 0.02;
      if (trailProgress < 0) continue;
      const trailRadius = outerRadius * 1.5 - (outerRadius * 1.5 - innerRadius) * trailProgress;
      const trailAngle = baseAngle + trailProgress * Math.PI * 4;
      const tx = x + Math.cos(trailAngle) * trailRadius;
      const ty = y + Math.sin(trailAngle) * trailRadius * 0.3;
      
      if (t === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.strokeStyle = `${color}${Math.round((1 - spiralProgress) * 100).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = size * 0.5;
    ctx.stroke();
    
    // Particule elle-même
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/**
 * Mini trou noir pour les effets de décoration
 */
export function renderMiniBlackHole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number
): void {
  // Simple cercle noir avec anneau lumineux
  const gradient = ctx.createRadialGradient(x, y, size * 0.3, x, y, size);
  gradient.addColorStop(0, '#000000');
  gradient.addColorStop(0.5, '#0a0a0a');
  gradient.addColorStop(0.7, '#ff6b3544');
  gradient.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}
