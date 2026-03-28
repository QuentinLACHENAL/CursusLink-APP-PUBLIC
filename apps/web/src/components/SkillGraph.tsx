'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ContentPanel from './ContentPanel';
import ProfileHUD from './ProfileHUD';
import { useAuth } from '../context/AuthContext';
import { useGraphTheme } from '../context/GraphThemeContext';
import { API_BASE_URL } from '../services/api';
import { GRAPH_CONFIG } from './graph/GraphConfig';

// Nouveaux renderers visuels
import {
  renderPlanet,
  renderStar,
  renderBlackHole,
  renderNebula,
  renderConstellation,
  renderSolarSystemGuide,     
  renderOrbitalGuides,
  renderGrid,
  getConstellation,
  DEFAULT_VISUALS,
  NodeVisualConfig,
} from './graph';
import { renderSpaceBackground } from './graph/renderers/BackgroundStarsRenderer';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="text-white p-10 flex items-center justify-center h-screen font-mono uppercase tracking-widest">Calcul de la Géométrie...</div>,
});

interface SkillGraphProps {
  userId?: string;
  readOnly?: boolean;
  onLayoutChange?: (positions: any[]) => void;
  onNodeSelect?: (node: any) => void;
  bgScale?: number;
  bgOffsetX?: number;
  bgOffsetY?: number;
  moveMode?: 'single' | 'group';
  refreshTrigger?: number;
  selectedNodeId?: string;
  showHud?: boolean;
  onRightClick?: (coords: { x: number; y: number; screenX: number; screenY: number }) => void;
  onNodeRightClick?: (node: any, coords: { screenX: number; screenY: number }) => void;
  disableContentPanel?: boolean;
  // Nouveaux props pour les overlays admin
  showConstellation?: string | null;
  showGrid?: boolean;
  showOrbitalGuide?: boolean;
  visibleGuides?: Set<string>;
  constellationPosition?: { x: number; y: number } | null;
  // Mode admin: centre sur dernière constellation modifiée avec dézoom
  // Mode utilisateur: centre sur prochain nœud disponible
  isAdminMode?: boolean;
  // ID du dernier nœud modifié (pour centrage admin)
  lastModifiedNodeId?: string;
}

const SkillGraph = ({ 
  userId: propUserId, 
  readOnly = false, 
  onLayoutChange, 
  onNodeSelect, 
  bgScale, 
  bgOffsetX, 
  bgOffsetY, 
  moveMode = 'single', 
  refreshTrigger = 0, 
  selectedNodeId, 
  showHud = true, 
  onRightClick, 
  onNodeRightClick, 
  disableContentPanel = false,
  showConstellation = null,
  showGrid = false,
  showOrbitalGuide = false,
  visibleGuides,
  constellationPosition = null,
  isAdminMode = false,
  lastModifiedNodeId,
}: SkillGraphProps) => {
  const { user: authUser } = useAuth();
  const { currentTheme, highPerformanceMode } = useGraphTheme();
  
  // State
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [internalBgConfig, setInternalBgConfig] = useState({ scale: 100, x: 0, y: 0 });
  const [isGraphReady, setIsGraphReady] = useState(false);
  const [hasCentered, setHasCentered] = useState(false);
  
  // Refs
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationTimeRef = useRef(0);
  const currentZoomRef = useRef(1);
  const isMountedRef = useRef(false);

  const effectiveScale = bgScale !== undefined ? bgScale : internalBgConfig.scale;
  const effectiveOffsetX = bgOffsetX !== undefined ? bgOffsetX : internalBgConfig.x;
  const effectiveOffsetY = bgOffsetY !== undefined ? bgOffsetY : internalBgConfig.y;

  // Mount/Unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (isMountedRef.current) {
          setDimensions({
            w: Math.round(entry.contentRect.width),
            h: Math.round(entry.contentRect.height)
          });
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fetch Data & Initial Layout Logic
  useEffect(() => {
    const effectiveUserId = propUserId || authUser?.id;
    const url = effectiveUserId
        ? `${API_BASE_URL}/graph?userId=${effectiveUserId}`
        : `${API_BASE_URL}/graph`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!isMountedRef.current) return;

        console.log('📊 Graph data loaded:', data.nodes.length, 'nodes');
        
        // Process Nodes
        const processedNodes = processNodes(data.nodes);
        
        setGraphData({
          nodes: processedNodes,
          links: data.links
        });
        setHasCentered(false); // Reset centering flag on new data
      })
      .catch((err) => console.error("Erreur graphe:", err));
  }, [propUserId, authUser?.id, refreshTrigger]);

  // Centering Logic - Différente selon le mode (admin vs utilisateur)
  useEffect(() => {
    if (graphData.nodes.length === 0 || !graphRef.current || hasCentered) return;

    // Wait slightly for graph engine to be ready
    const timer = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      let targetX = 0;
      let targetY = 0;
      let zoomLevel = 0.6;
      let foundTarget = false;

      // Correction pour devicePixelRatio et dimensions réelles du viewport
      // Le graphe utilise des coordonnées internes qui peuvent différer du viewport affiché
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const containerWidth = containerRef.current?.clientWidth || dimensions.w;
      const containerHeight = containerRef.current?.clientHeight || dimensions.h;
      
      // Log pour debug du viewport
      console.log(`📐 Viewport: ${containerWidth}x${containerHeight}, DPR: ${dpr}`);

      // ═══════════════════════════════════════════════════════════════
      // MODE ADMIN: Centre sur le dernier nœud modifié OU constellation sélectionnée
      // avec un zoom plus large pour voir plusieurs étoiles
      // ═══════════════════════════════════════════════════════════════
      if (isAdminMode) {
        // Utiliser les variables de config
        const ADMIN_OVERVIEW_ZOOM = GRAPH_CONFIG.ADMIN.OVERVIEW_ZOOM;
        const ADMIN_NODE_FOCUS_ZOOM = GRAPH_CONFIG.ADMIN.NODE_FOCUS_ZOOM;

        // 1. Si un nœud spécifique a été modifié récemment, centrer dessus
        if (lastModifiedNodeId) {
          const modifiedNode = graphData.nodes.find(n => n.id === lastModifiedNodeId);
          if (modifiedNode) {
            targetX = modifiedNode.fx || modifiedNode.x || 0;
            targetY = modifiedNode.fy || modifiedNode.y || 0;
            zoomLevel = ADMIN_NODE_FOCUS_ZOOM;
            foundTarget = true;
            console.log(`🎯 [Admin] Centré sur nœud modifié: ${modifiedNode.label}`);
          }
        }

        // 2. Sinon, si une constellation est sélectionnée dans le menu overlay
        if (!foundTarget && showConstellation) {
          const nodesInConstellation = graphData.nodes.filter(n => 
              (n.galaxy === showConstellation) || 
              (n.constellation === showConstellation) ||
              (n.group === showConstellation)
          );

          if (nodesInConstellation.length > 0) {
              const sumX = nodesInConstellation.reduce((acc, n) => acc + (n.fx || n.x || 0), 0);
              const sumY = nodesInConstellation.reduce((acc, n) => acc + (n.fy || n.y || 0), 0);
              targetX = sumX / nodesInConstellation.length;
              targetY = sumY / nodesInConstellation.length;
              zoomLevel = ADMIN_OVERVIEW_ZOOM;
              foundTarget = true;
              console.log(`🎯 [Admin] Centré sur constellation: ${showConstellation}`);
          }
        }

        // 3. Fallback admin: centre du graphe avec vue d'ensemble
        if (!foundTarget && graphData.nodes.length > 0) {
          const sumX = graphData.nodes.reduce((acc, n) => acc + (n.fx || n.x || 0), 0);
          const sumY = graphData.nodes.reduce((acc, n) => acc + (n.fy || n.y || 0), 0);
          targetX = sumX / graphData.nodes.length;
          targetY = sumY / graphData.nodes.length;
          zoomLevel = ADMIN_OVERVIEW_ZOOM;
          foundTarget = true;
          console.log(`🎯 [Admin] Centré sur barycentre du graphe`);
        }
      }
      // ═══════════════════════════════════════════════════════════════
      // MODE UTILISATEUR: Centre sur le PROCHAIN NŒUD DISPONIBLE
      // (débloqué mais non validé, ou première étoile disponible)
      // ═══════════════════════════════════════════════════════════════
      else {
        // Trouver le prochain nœud disponible (débloqué ET non validé)
        const availableNodes = graphData.nodes.filter(n => n.isUnlocked && !n.isMastered);
        
        // Priorité 1: Chercher une planète disponible dans une étoile validée
        const masteredStars = graphData.nodes.filter(n => n.isMastered && n.type === 'star');
        let targetNode = null;

        for (const star of masteredStars) {
          // Trouver les planètes de cette étoile qui ne sont pas validées
          const starPlanets = availableNodes.filter(n => 
            n.parentStar === star.id || 
            (n.constellation === star.constellation && n.type !== 'star' && !n.isMastered)
          );
          if (starPlanets.length > 0) {
            // Prendre la planète avec le plus petit orbitRing (la plus proche)
            targetNode = starPlanets.sort((a, b) => (a.orbitRing || 99) - (b.orbitRing || 99))[0];
            break;
          }
        }

        // Priorité 2: Si aucune planète disponible, chercher la prochaine étoile débloquée
        if (!targetNode) {
          const availableStars = availableNodes.filter(n => n.type === 'star');
          if (availableStars.length > 0) {
            targetNode = availableStars[0];
          }
        }

        // Priorité 3: Si tout est validé ou rien n'est débloqué, aller au dernier nœud validé
        if (!targetNode) {
          const masteredNodes = graphData.nodes.filter(n => n.isMastered);
          if (masteredNodes.length > 0) {
            // Dernier validé (approximation: par ordre de création ou dernière position)
            targetNode = masteredNodes[masteredNodes.length - 1];
          }
        }

        // Priorité 4: Fallback - première étoile ou nœud racine
        if (!targetNode) {
          targetNode = graphData.nodes.find(n => n.type === 'star') ||
                       graphData.nodes.find(n => n.type === 'root' || n.type === 'blackhole' || n.id === 'ROOT_START') ||
                       graphData.nodes[0];
        }

        if (targetNode) {
          targetX = targetNode.fx || targetNode.x || 0;
          targetY = targetNode.fy || targetNode.y || 0;
          // Zoom plus serré pour l'utilisateur (focus sur la zone de travail)
          zoomLevel = targetNode.type === 'star' ? 0.8 : 1.2;
          foundTarget = true;
          console.log(`🎯 [User] Centré sur prochain nœud disponible: ${targetNode.label} (${targetNode.type})`);
        }
      }

      // Execute Center avec correction du viewport
      // Note: react-force-graph utilise les coordonnées du graphe, pas du DOM
      // Le centerAt doit pointer vers les coordonnées graph (fx/fy), pas screen
      if (graphRef.current && foundTarget) {
        // D'abord zoomer pour que le centrage soit calculé correctement
        graphRef.current.zoom(zoomLevel, 800);
        // Puis centrer après un court délai pour laisser le zoom s'appliquer
        setTimeout(() => {
          if (graphRef.current && isMountedRef.current) {
            graphRef.current.centerAt(targetX, targetY, 800);
            console.log(`📍 Centrage final: (${targetX.toFixed(0)}, ${targetY.toFixed(0)}) @ zoom ${zoomLevel}`);
          }
        }, 100);
        setHasCentered(true);
      }

    }, 600); // 600ms delay to allow initial layout stabilization

    return () => clearTimeout(timer);
  }, [graphData.nodes, showConstellation, hasCentered, isAdminMode, lastModifiedNodeId]);

  // Sync selectedNodeId prop
  useEffect(() => {
    if (selectedNodeId && graphData.nodes.length > 0) {
        const node = graphData.nodes.find(n => n.id === selectedNodeId);
        if (node) {
            setSelectedNode(node);
            setTimeout(() => {
                graphRef.current?.centerAt(node.fx || node.x, node.fy || node.y, 600);
                graphRef.current?.zoom(3.5, 600);
            }, 50);
        }
    } else if (!selectedNodeId) {
        setSelectedNode(null);
    }
  }, [selectedNodeId, graphData.nodes]);

  // Data Processing Helper
  const processNodes = (rawNodes: any[]) => {
    const nodes = rawNodes.map(n => ({ ...n })); // Shallow copy
    const nodesMap = new Map(nodes.map(n => [n.id, n]));
    
    const solarRadius = GRAPH_CONFIG.LAYOUT.SOLAR_SYSTEM_RADIUS;
    const galaxySpacing = GRAPH_CONFIG.LAYOUT.GALAXY_SPACING;
    const baseOrbitRadius = GRAPH_CONFIG.ORBITS.BASE_RADIUS;
    const orbitSpacing = GRAPH_CONFIG.ORBITS.SPACING;

    // 1. Identify Stars (Centers)
    const starNodes = nodes.filter((n: any) => 
        n.orbitRing === 0 || 
        ['star', 'region', 'blackhole'].includes(n.type) ||
        (n.labels && n.labels.includes('Star'))
    );

    // 2. Layout Stars (Galaxy Spiral)
    const galaxies = Array.from(new Set(nodes.map((n:any) => n.galaxy || 'Default')));
    
    galaxies.forEach((galaxyName: any, gIndex: number) => {
        const angle = gIndex * 2.4; 
        const distance = gIndex === 0 ? 0 : (galaxySpacing * Math.sqrt(gIndex));
        const galaxyCenterX = Math.cos(angle) * distance;
        const galaxyCenterY = Math.sin(angle) * distance;

        const galaxyStars = starNodes.filter((n: any) => (n.galaxy || 'Default') === galaxyName);
        
        galaxyStars.forEach((star: any, sIndex: number) => {
            const starAngle = (sIndex / galaxyStars.length) * 2 * Math.PI;
            // Only set position if not already fixed from backend
            if (star.fx === undefined || star.fx === null) {
                star.fx = galaxyCenterX + Math.cos(starAngle) * solarRadius;
                star.fy = galaxyCenterY + Math.sin(starAngle) * solarRadius;
                star.x = star.fx;
                star.y = star.fy;
            }
        });
    });

    // 3. Layout Planets (Orbits)
    const planetNodes = nodes.filter((n: any) => !starNodes.includes(n));
    
    planetNodes.forEach((planet: any) => {
        // Find Parent Star
        let parentStar = null;
        if (planet.parentStarId) parentStar = nodesMap.get(planet.parentStarId);
        if (!parentStar && planet.group) parentStar = starNodes.find(s => s.group === planet.group);
        if (!parentStar) {
             const galaxyStars = starNodes.filter((s: any) => (s.galaxy || 'Default') === (planet.galaxy || 'Default'));
             if (galaxyStars.length === 1) parentStar = galaxyStars[0];
        }

        if (parentStar) {
            const ring = planet.orbitRing || 1;
            const orbitRadius = baseOrbitRadius + ((ring - 1) * orbitSpacing);
            
            // Stable Random Angle
            const seed = `${parentStar.id}_${planet.id}`;
            let h = 0xdeadbeef;
            for(let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
            const randomVal = ((h ^ h >>> 16) >>> 0) / 4294967296;
            const moonAngle = randomVal * Math.PI * 2;

            // Set Orbital Data
            planet.orbitRadius = orbitRadius;
            planet.orbitBaseAngle = moonAngle;
            planet.orbitSpeed = (GRAPH_CONFIG.ORBITS.ANIMATION_SPEED_BASE / (ring * 0.5 + 1)) * (randomVal > 0.5 ? 1 : -1);
            planet.parentStarId = parentStar.id;

            // Initial Position (relative to parent)
            // Use parent's fx/fy if available, else 0 (will be updated in animation)
            const pX = parentStar.fx || parentStar.x || 0;
            const pY = parentStar.fy || parentStar.y || 0;
            
            planet.fx = pX + Math.cos(moonAngle) * orbitRadius;
            planet.fy = pY + Math.sin(moonAngle) * orbitRadius;
            planet.x = planet.fx;
            planet.y = planet.fy;
        } else {
            // Orphan fallback - Place in a grid far away to avoid 0,0 clutter
            console.warn('Orphan node:', planet.label);
            planet.fx = -5000 + (Math.random() * 1000);
            planet.fy = 5000 + (Math.random() * 1000);
        }
    });

    // 4. Calculate arePlanetsValidated for each star
    // A star is "fully validated" if it's mastered AND all its planets are mastered
    starNodes.forEach((star: any) => {
        const starPlanets = planetNodes.filter((p: any) => p.parentStarId === star.id);
        
        if (!star.isMastered) {
            star.arePlanetsValidated = false;
        } else if (starPlanets.length === 0) {
            // If the star has no planets, just being mastered is enough
            star.arePlanetsValidated = true;
        } else {
            // All planets must be mastered
            star.arePlanetsValidated = starPlanets.every((p: any) => p.isMastered);
        }
    });

    return nodes;
  };

  // Rendering Callbacks
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Ralentir drastiquement l'animation pour les textures planètes
    animationTimeRef.current += highPerformanceMode ? 0.0002 : 0.0005;
    const UNIVERSE_SIZE = 60000;

    if (highPerformanceMode) {
      ctx.fillStyle = currentTheme.backgroundColor;
      ctx.fillRect(-UNIVERSE_SIZE, -UNIVERSE_SIZE, UNIVERSE_SIZE * 2, UNIVERSE_SIZE * 2);
    } else {
      renderSpaceBackground(ctx, UNIVERSE_SIZE, UNIVERSE_SIZE, animationTimeRef.current, globalScale, GRAPH_CONFIG.BACKGROUND.STAR_DENSITY);
    }
    
    if (bgImage) {
        const baseSize = 2000;
        const scaleFactor = (effectiveScale) / 100;
        const size = baseSize * scaleFactor;
        const ratio = bgImage.height / bgImage.width;
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.drawImage(bgImage, -size/2 + (effectiveOffsetX), (-size * ratio)/2 + (effectiveOffsetY), size, size * ratio);
        ctx.restore();
    }

    if (showGrid) renderGrid(ctx, dimensions.w * 2, dimensions.h * 2, 100, currentTheme.gridColor || 'rgba(255, 255, 255, 0.05)');

    if (showConstellation) {
      const constellation = getConstellation(showConstellation);
      if (constellation) {
        let posX = 0, posY = 0;
        
        if (constellationPosition) {
            posX = constellationPosition.x;
            posY = constellationPosition.y;
        } else if (graphRef.current) {
             // Center constellation on screen center coords in graph space
             const center = graphRef.current.screen2GraphCoords(dimensions.w / 2, dimensions.h / 2);
             posX = center.x;
             posY = center.y;
        }

        const GRAPH_UNIT_SCALE = 3000; 
        const offsetX = posX - (GRAPH_UNIT_SCALE * 0.5);
        const offsetY = posY - (GRAPH_UNIT_SCALE * 0.5);

        renderConstellation(ctx, constellation, GRAPH_UNIT_SCALE, GRAPH_UNIT_SCALE, {
          opacity: 0.2,
          scale: 1,
          offsetX: offsetX,
          offsetY: offsetY,
          showLabels: true
        }, globalScale);
      }
    }

    if (showOrbitalGuide) {
      renderSolarSystemGuide(ctx, 0, 0, 1200, 8, { opacity: 0.2 });
    }

    // Animation Loop for Planets
    if (!highPerformanceMode && graphData.nodes.length > 0) {
      const time = animationTimeRef.current;
      graphData.nodes.forEach((node: any) => {
        if (node.orbitRadius && node.parentStarId && node.id !== selectedNode?.id) {
          const star = graphData.nodes.find(n => n.id === node.parentStarId);
          if (star && Number.isFinite(star.x) && Number.isFinite(star.y)) {
            const speedMultiplier = node.isMastered ? 2 : 1;
            const angle = node.orbitBaseAngle + (time * node.orbitSpeed * speedMultiplier);
            node.fx = star.x + Math.cos(angle) * node.orbitRadius;
            node.fy = star.y + Math.sin(angle) * node.orbitRadius;
            node.x = node.fx; // Force sync
            node.y = node.fy;
          }
        }
      });
    }
  }, [bgImage, effectiveScale, effectiveOffsetX, effectiveOffsetY, showGrid, showConstellation, showOrbitalGuide, dimensions, highPerformanceMode, currentTheme, graphData, selectedNode, constellationPosition]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!Number.isFinite(node.x)) return;

    const isRoot = node.type === 'root' || node.type === 'blackhole';
    const isRegion = node.type === 'region' || node.type === 'star' || node.type === 'constellation';
    const isPlanet = node.type === 'planet' || node.type === 'topic';
    const isProject = node.labels?.includes('Project') || node.type === 'Project' || node.type === 'project';
    const isSelected = selectedNode?.id === node.id;
    const isMastered = node.isMastered;
    const isCentralStar = node.orbitRing === 0 || (isRegion && node.orbitRing === undefined);

    // LOD
    const LOD_PLANET_THRESHOLD = GRAPH_CONFIG.LOD.PLANET_VISIBILITY_THRESHOLD;
    const isOrbitalPlanet = !isCentralStar && (isPlanet || (node.orbitRing !== undefined && node.orbitRing > 0));

    if (isOrbitalPlanet && !isProject && !isSelected && currentZoomRef.current < LOD_PLANET_THRESHOLD) {
      return; 
    }
    
    let baseSize = GRAPH_CONFIG.NODES.SIZES.PLANET;
    if (isRoot) baseSize = GRAPH_CONFIG.NODES.SIZES.ROOT;
    if (isCentralStar || isRegion) baseSize = GRAPH_CONFIG.NODES.SIZES.STAR;
    if (isProject) baseSize = GRAPH_CONFIG.NODES.SIZES.PROJECT;
    if (isSelected) baseSize *= GRAPH_CONFIG.NODES.SIZES.SELECTED_MULTIPLIER;

    const renderContext = { ctx, x: node.x, y: node.y, size: baseSize, time: animationTimeRef.current, globalScale };

    let nodeVisualConfig: Partial<NodeVisualConfig> | undefined;
    if (typeof node.visualConfig === 'string' && node.visualConfig) {
      try { nodeVisualConfig = JSON.parse(node.visualConfig); } catch { nodeVisualConfig = undefined; }
    } else {
      nodeVisualConfig = node.visualConfig as Partial<NodeVisualConfig> | undefined;
    }
    
    const effectiveVisualStyle = nodeVisualConfig?.visualStyle ||
      (isRoot ? 'blackhole' : (isCentralStar || isRegion) ? 'star' : 'planet');

    // Draw Orbital Rings for Stars
    if (isCentralStar && !isRoot && (showOrbitalGuide || visibleGuides?.has(node.id) || globalScale > 0.4)) {
      const baseOrbitRadius = GRAPH_CONFIG.ORBITS.BASE_RADIUS;
      const orbitSpacing = GRAPH_CONFIG.ORBITS.SPACING;
      const orbits = [0, 1, 2, 3].map(i => baseOrbitRadius + i * orbitSpacing);
      
      orbits.forEach((radius, index) => {
          const isRingCompleted = node.completedRings?.[index + 1];
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = isRingCompleted ? '#22d3ee' : ((showOrbitalGuide || visibleGuides?.has(node.id)) ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)');
          ctx.lineWidth = isRingCompleted ? 1.5 / globalScale : 1 / globalScale;
          if (!isRingCompleted) ctx.setLineDash([4, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
      });
    }

    if (effectiveVisualStyle === 'blackhole' || isRoot) {
      renderBlackHole(renderContext, { ...DEFAULT_VISUALS.root, ...nodeVisualConfig, accretionDiskColor: isMastered ? '#22d3ee' : (nodeVisualConfig?.accretionDiskColor || '#ff6b35') });
    } else if (effectiveVisualStyle === 'star' || isRegion) {
      const starConfig = { ...DEFAULT_VISUALS.region, ...nodeVisualConfig };
      if (isMastered) { starConfig.starType = nodeVisualConfig?.starType || 'blue'; starConfig.glowColor = '#ffffff'; starConfig.glowIntensity = 4.0; }
      else if (node.isUnlocked) { starConfig.glowIntensity = GRAPH_CONFIG.UNLOCKED_GLOW.STAR_INTENSITY; starConfig.glowColor = GRAPH_CONFIG.UNLOCKED_GLOW.COLOR; }
      renderStar(renderContext, starConfig);
    } else if (effectiveVisualStyle === 'nebula') {
      renderNebula(renderContext, { ...DEFAULT_VISUALS.constellation, ...nodeVisualConfig }, node.id);
    } else {
      let planetConfig: Partial<NodeVisualConfig> = { ...DEFAULT_VISUALS[node.type] || DEFAULT_VISUALS.topic, ...nodeVisualConfig };
      if (isProject && !nodeVisualConfig?.primaryColor) {
        planetConfig.planetType = 'gas'; planetConfig.hasRings = true;
        planetConfig.primaryColor = isMastered ? '#22d3ee' : '#fbbf24';
      } else if (isMastered && !nodeVisualConfig?.primaryColor) {
        planetConfig.primaryColor = '#22d3ee';
      }
      if (node.isUnlocked && !isMastered) {
        planetConfig.glowIntensity = GRAPH_CONFIG.UNLOCKED_GLOW.PLANET_INTENSITY;
      }
      if (isSelected) { planetConfig.primaryColor = '#c084fc'; planetConfig.glowIntensity = 1.0; }
      renderPlanet(renderContext, planetConfig);
    }

    // Labels et informations
    const labelOffset = baseSize + (isRoot ? 15 : isRegion ? 12 : isProject ? 18 : 10);
    
    // Logique de visibilité du label basée sur le LOD (Level of Detail)
    // En mode Admin (!readOnly), on utilise les seuils spécifiques pour mieux voir les noms
    const starLabelThreshold = !readOnly ? GRAPH_CONFIG.ADMIN.LOD.STAR_LABEL_THRESHOLD : GRAPH_CONFIG.LOD.STAR_LABEL_VISIBILITY_THRESHOLD;
    const planetLabelThreshold = !readOnly ? GRAPH_CONFIG.ADMIN.LOD.PLANET_LABEL_THRESHOLD : GRAPH_CONFIG.LOD.LABEL_VISIBILITY_THRESHOLD;

    // Les Projets (BlackHole) suivent la même règle que les Étoiles/Régions
    const showStarLabel = (isRegion || isRoot || isProject) && (isSelected || globalScale > starLabelThreshold);
    const showPlanetLabel = !isRegion && !isRoot && !isProject && (isSelected || globalScale > planetLabelThreshold);

    if (showStarLabel || showPlanetLabel) {
      const fontSize = (isProject ? 14 : isRegion ? 12 : 10) / globalScale;
      ctx.font = `${isProject || isRegion ? 'bold' : 'normal'} ${fontSize}px Inter, Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? '#c084fc' : (isMastered ? currentTheme.linkMasteredColor : 'white');
      ctx.fillText(node.label, node.x, node.y + labelOffset);
    }
  }, [selectedNode, highPerformanceMode, currentTheme, showOrbitalGuide, visibleGuides]);

  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const sourceNode: any = graphData.nodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source));
    const targetNode: any = graphData.nodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target));
    if (!sourceNode || !targetNode || !Number.isFinite(sourceNode.x) || !Number.isFinite(targetNode.x)) return;
    
    // Filter: Draw links only between stars/regions/roots
    const isStar = (n: any) => (n.orbitRing === 0) || ['star', 'region', 'root', 'blackhole', 'constellation'].includes(n.type);
    if (!isStar(sourceNode) || !isStar(targetNode)) return;

    const sGal = sourceNode.galaxy || sourceNode.constellation || '';
    const tGal = targetNode.galaxy || targetNode.constellation || '';
    if (sGal !== tGal && sGal !== '' && sourceNode.type !== 'root' && sourceNode.type !== 'blackhole') return;

    // Determine link state:
    // 1. Fully validated: Both stars have arePlanetsValidated = true → Blue with glow
    // 2. Unlocked path: Source is mastered, target may or may not be fully validated → White, thicker
    // 3. Locked: Neither condition met → Very faint
    const isFullyValidated = sourceNode.arePlanetsValidated && targetNode.arePlanetsValidated;
    const isUnlockedPath = (sourceNode.isMastered || sourceNode.arePlanetsValidated) && 
                          (targetNode.isUnlocked || targetNode.isMastered) &&
                          !isFullyValidated;

    let lineColor: string;
    let lineWidth: number;
    let drawGlow = false;

    if (isFullyValidated) {
      // Blue with halo - fully validated link
      lineColor = GRAPH_CONFIG.LINKS.COLORS.UNLOCKED; // Cyan/Blue
      lineWidth = GRAPH_CONFIG.LINKS.WIDTH.UNLOCKED;
      drawGlow = true;
    } else if (isUnlockedPath) {
      // White, thicker - unlocked path
      lineColor = 'rgba(255, 255, 255, 0.7)';
      lineWidth = 1.5;
    } else {
      // Faint - locked
      lineColor = GRAPH_CONFIG.LINKS.COLORS.LOCKED;
      lineWidth = GRAPH_CONFIG.LINKS.WIDTH.LOCKED;
    }

    ctx.save();
    if (drawGlow && !highPerformanceMode) {
      ctx.shadowBlur = GRAPH_CONFIG.LINKS.GLOW.BLUR;
      ctx.shadowColor = GRAPH_CONFIG.LINKS.GLOW.COLOR;
    }
    ctx.beginPath();
    ctx.moveTo(sourceNode.x, sourceNode.y);
    ctx.lineTo(targetNode.x, targetNode.y);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth / globalScale;
    if (targetNode.unlockCondition === 'OR') {
      ctx.setLineDash([6, 4].map(d => d / globalScale));
      ctx.strokeStyle = GRAPH_CONFIG.LINKS.COLORS.OR_CONDITION;
    }
    ctx.stroke();
    ctx.restore();
  }, [graphData.nodes, highPerformanceMode, currentTheme]);

  return (
    <div className="w-full h-screen bg-[#020617] flex relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" 
           style={{
             background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, transparent 70%)',
             filter: 'blur(60px)'
           }}>
      </div>

      {!readOnly && showHud && <ProfileHUD />}

      <div className="flex-1 min-w-0 z-10" ref={containerRef}>
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.w}
          height={dimensions.h}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          d3VelocityDecay={1}
          onEngineStop={() => { setIsGraphReady(true); }}
          onRenderFramePre={drawBackground}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          linkCurvature={0}
          linkWidth={1}
          onNodeClick={(node: any) => {
            if (node.id === 'ROOT_START') return;
            if (onNodeSelect) {
                onNodeSelect(node);
                if (!disableContentPanel) setSelectedNode(node);
            } else {
                graphRef.current?.centerAt(node.x, node.y, 800);
                graphRef.current?.zoom(3.5, 800);
                if (!disableContentPanel) setSelectedNode(node);
            }
          }}
          onNodeRightClick={(node: any, event: any) => {
            if (onNodeRightClick && !readOnly && node.id !== 'ROOT_START') {
              event.preventDefault();
              onNodeRightClick(node, {
                screenX: event.clientX || event.pageX || 0,
                screenY: event.clientY || event.pageY || 0
              });
            }
          }}
          onBackgroundClick={() => setSelectedNode(null)}
          onBackgroundRightClick={(event: any) => {
            if (onRightClick && !readOnly) {
              event.preventDefault();
              const graphCoords = graphRef.current.screen2GraphCoords(event.layerX || event.offsetX || 0, event.layerY || event.offsetY || 0);
              onRightClick({ x: graphCoords.x, y: graphCoords.y, screenX: event.clientX || event.pageX || 0, screenY: event.clientY || event.pageY || 0 });
            }
          }}
          onZoom={(zoom: any) => { currentZoomRef.current = zoom.k; }}
          enableNodeDrag={!readOnly}
          onNodeDrag={(node: any) => {
             if (node.__prevX === undefined) { node.__prevX = node.x; node.__prevY = node.y; }
             if (readOnly) return;
             const dx = node.x - node.__prevX;
             const dy = node.y - node.__prevY;
             node.__prevX = node.x; node.__prevY = node.y;
             node.fx = node.x; node.fy = node.y;

             const isStar = node.orbitRing === 0 || node.type === 'star' || node.type === 'region';
             if (isStar) {
                 graphData.nodes.forEach((n: any) => {
                     if (n.group === node.group && n.galaxy === node.galaxy && n.id !== node.id) {
                         n.fx = (n.fx || n.x) + dx;
                         n.fy = (n.fy || n.y) + dy;
                         n.x = n.fx; n.y = n.fy;
                     }
                 });
             }
          }}
          onNodeDragEnd={(node: any) => {
            if (readOnly) return;
            node.fx = node.x; node.fy = node.y;
            delete node.__prevX; delete node.__prevY;
            if (onLayoutChange) {
                const positions = graphData.nodes.map((n: any) => ({ id: n.id, x: n.fx !== undefined ? n.fx : n.x, y: n.fy !== undefined ? n.fy : n.y }));
                onLayoutChange(positions);
            }
          }}
        />
      </div>

      {selectedNode && !disableContentPanel && (
        <ContentPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
};

export default SkillGraph;
