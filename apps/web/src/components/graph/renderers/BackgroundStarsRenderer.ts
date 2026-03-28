// Rendu des étoiles de fond pour créer un effet "carte du ciel"

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

// Cache global des étoiles pour éviter de les régénérer à chaque frame
let cachedStars: BackgroundStar[] | null = null;
let cachedViewport = { width: 0, height: 0 };

const STAR_COLORS = [
  '#ffffff',  // Blanc pur
  '#fff5e6',  // Blanc chaud
  '#e6f0ff',  // Blanc bleuté
  '#ffe6e6',  // Blanc rosé
  '#fff9e6',  // Blanc jaune
  '#e6ffff',  // Blanc cyan
];

/**
 * Génère les étoiles de fond de façon procédurale
 */
function generateStars(width: number, height: number, density: number = 0.00005): BackgroundStar[] {
  const stars: BackgroundStar[] = [];
  const area = width * height;
  // Limiter le nombre d'étoiles pour la performance (max 15000)
  const starCount = Math.min(Math.floor(area * density), 15000);
  
  for (let i = 0; i < starCount; i++) {
    // Distribution aléatoire avec quelques amas
    const isCluster = Math.random() < 0.1;
    let x, y;
    
    if (isCluster && stars.length > 0) {
      // Placer près d'une étoile existante (effet amas)
      const nearStar = stars[Math.floor(Math.random() * stars.length)];
      x = nearStar.x + (Math.random() - 0.5) * 100;
      y = nearStar.y + (Math.random() - 0.5) * 100;
    } else {
      x = (Math.random() - 0.5) * width * 2;
      y = (Math.random() - 0.5) * height * 2;
    }
    
    // Tailles variées avec majorité de petites étoiles
    const sizeRoll = Math.random();
    let size;
    if (sizeRoll < 0.7) {
      size = 0.3 + Math.random() * 0.5; // Petites (70%)
    } else if (sizeRoll < 0.9) {
      size = 0.8 + Math.random() * 0.7; // Moyennes (20%)
    } else {
      size = 1.5 + Math.random() * 1.0; // Grandes (10%)
    }
    
    stars.push({
      x,
      y,
      size,
      brightness: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinklePhase: Math.random() * Math.PI * 2,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    });
  }
  
  return stars;
}

/**
 * Dessine le fond spatial avec étoiles scintillantes
 */
export function renderSpaceBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  globalScale: number,
  density: number = 0.00005
): void {
  // Régénérer les étoiles si la taille a changé significativement
  if (!cachedStars || 
      Math.abs(cachedViewport.width - width) > 200 || 
      Math.abs(cachedViewport.height - height) > 200) {
    cachedStars = generateStars(width, height, density);
    cachedViewport = { width, height };
  }
  
  // Fond noir spatial avec léger gradient
  const bgGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(width, height));
  bgGradient.addColorStop(0, '#0a0a12');    // Centre très légèrement teinté
  bgGradient.addColorStop(0.5, '#050508');  // Mi-chemin
  bgGradient.addColorStop(1, '#020204');    // Bords presque noir pur
  
  ctx.fillStyle = bgGradient;
  ctx.fillRect(-width, -height, width * 2, height * 2);
  
  // Légère nébuleuse diffuse (optionnel, très subtil)
  renderNebulaGlow(ctx, width, height, time);
  
  // Dessiner les étoiles
  cachedStars.forEach(star => {
    const twinkle = 0.6 + Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.4;
    const finalBrightness = star.brightness * twinkle;
    
    // Ajuster la taille selon le zoom
    const adjustedSize = star.size / Math.sqrt(globalScale);
    
    if (adjustedSize < 0.5) {
      // Très petites étoiles : simples points
      ctx.fillStyle = `rgba(255, 255, 255, ${finalBrightness * 0.6})`;
      ctx.fillRect(star.x, star.y, adjustedSize, adjustedSize);
    } else {
      // Étoiles plus grandes avec halo
      const gradient = ctx.createRadialGradient(
        star.x, star.y, 0,
        star.x, star.y, adjustedSize * 2
      );
      
      gradient.addColorStop(0, `rgba(255, 255, 255, ${finalBrightness})`);
      gradient.addColorStop(0.3, hexToRgba(star.color, finalBrightness * 0.8));
      gradient.addColorStop(0.6, hexToRgba(star.color, finalBrightness * 0.3));
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(star.x, star.y, adjustedSize * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Point central lumineux
      ctx.beginPath();
      ctx.arc(star.x, star.y, adjustedSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${finalBrightness})`;
      ctx.fill();
    }
  });
}

/**
 * Effet de nébuleuse très subtil en fond
 */
function renderNebulaGlow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
): void {
  // Quelques zones colorées très subtiles
  const nebulae = [
    { x: -width * 0.3, y: -height * 0.2, color: '#1a0a2e', size: 400 },
    { x: width * 0.4, y: height * 0.3, color: '#0a1a2e', size: 350 },
    { x: width * 0.1, y: -height * 0.4, color: '#1a0a1e', size: 300 },
  ];
  
  nebulae.forEach((nebula, i) => {
    const pulse = 1 + Math.sin(time * 0.2 + i) * 0.1;
    const gradient = ctx.createRadialGradient(
      nebula.x, nebula.y, 0,
      nebula.x, nebula.y, nebula.size * pulse
    );
    
    gradient.addColorStop(0, nebula.color + '30');
    gradient.addColorStop(0.5, nebula.color + '15');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(-width, -height, width * 2, height * 2);
  });
}

/**
 * Convertit un hex en rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Force la régénération des étoiles (utile après un reset)
 */
export function resetBackgroundStars(): void {
  cachedStars = null;
}
