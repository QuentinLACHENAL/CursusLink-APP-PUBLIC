'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { X, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, HelpCircle, ChevronRight, Sparkles, Layout } from 'lucide-react';
import { API_BASE_URL } from '../../../services/api';
import { CONSTELLATIONS, Constellation } from '../../../components/graph/types';
import { GRAPH_CONFIG } from '../../../components/graph/GraphConfig';
import { EXAMPLE_CSV } from './ExampleCSV';
import { StarType, PlanetType } from '../../../components/graph/types';

interface CSVImportModalProps {
  isOpen: boolean;
  structure: any;
  token: string;
  onClose: () => void;
  onImported: () => void;
}

interface HierarchicalNode {
  type: 'constellation' | 'star' | 'planet';
  label: string;
  parentLabel?: string;
  constellationLabel?: string; // For planets: the constellation they belong to
  xp?: number;
  description?: string;
  valid: boolean;
  errors: string[];
  // For visual layout
  fx?: number;
  fy?: number;
  orbitRing?: number; // 0 for Star, 1+ for Planet
  // Random visuals
  visualConfig?: any;
}

export default function CSVImportModal({ isOpen, structure, token, onClose, onImported }: CSVImportModalProps) {
  const [step, setStep] = useState<'upload' | 'layout' | 'preview' | 'importing' | 'done'>('upload');
  const [csvNodes, setCsvNodes] = useState<HierarchicalNode[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });
  const [randomizeStars, setRandomizeStars] = useState(false);
  const [randomizePlanets, setRandomizePlanets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grouped structure for Layout step
  const constellations = useMemo(() => {
    const groups: Record<string, { stars: Set<string>; nodes: HierarchicalNode[] }> = {};
    csvNodes.forEach(node => {
      if (node.type === 'constellation') {
        if (!groups[node.label]) groups[node.label] = { stars: new Set(), nodes: [] };
      } else if (node.type === 'star') {
        // Find parent constellation
        const constellationName = node.parentLabel || 'Inconnue';
        if (!groups[constellationName]) groups[constellationName] = { stars: new Set(), nodes: [] };
        groups[constellationName].stars.add(node.label);
      }
    });
    return groups;
  }, [csvNodes]);

  const [selectedShapes, setSelectedShapes] = useState<Record<string, string>>({});

  // Example CSV moved to ExampleCSV.tsx
  const exampleCSV = EXAMPLE_CSV;

  const parseHierarchicalCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Normalize headers: lowercase, remove accents, remove (...) content
    const normalize = (h: string) => h.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/\(.*\)/g, "") // Remove content in parenthesis
        .trim();

    const headers = lines[0].split(';').map(normalize);
    const nodes: HierarchicalNode[] = [];
    const createdKeys = new Set<string>();
    
    // Randomization Helpers
    const starTypes: StarType[] = ['yellow', 'red', 'blue', 'white', 'orange', 'neutron'];
    const planetTypes: PlanetType[] = ['rocky', 'gas', 'ice', 'volcanic', 'ocean', 'desert', 'earth'];
    const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];


    // Helper to add node if unique
    // Key must include constellation context to allow same-named stars/planets in different constellations
    const addNode = (node: HierarchicalNode) => {
      let key: string;
      if (node.type === 'planet') {
        // For planets: include constellation to disambiguate (e.g., "Introduction" in multiple chapters)
        key = `${node.type}:${node.constellationLabel || ''}:${node.parentLabel || ''}:${node.label}`;
        // Randomize Planet Visuals OR Default to Earth
        if (!node.visualConfig) {
             if (randomizePlanets) {
                 node.visualConfig = {
                     planetType: random(planetTypes),
                     hasRings: Math.random() > 0.8 // 20% chance of rings
                 };
             } else {
                 // Default visual: Earth
                 node.visualConfig = {
                     planetType: 'earth',
                     hasRings: false
                 };
             }
        }
      } else if (node.type === 'star') {
        // For stars: parentLabel is the constellation
        key = `${node.type}:${node.parentLabel || ''}:${node.label}`;
        // Randomize Star Visuals OR Default to White
        if (!node.visualConfig) {
             if (randomizeStars) {
                 node.visualConfig = {
                     starType: random(starTypes)
                 };
             } else {
                 // Default visual: White Star
                 node.visualConfig = {
                     starType: 'white'
                 };
             }
        }
      } else {
        // For constellations: just the name
        key = `${node.type}:${node.label}`;
      }

      if (!createdKeys.has(key)) {
        createdKeys.add(key);
        nodes.push(node);
      }
    };

    // Compteur pour l'auto-distribution des orbites si non spécifié
    const planetCounters: Record<string, number> = {};

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, idx) => { row[header] = values[idx] || ''; });

      // Columns logic with normalized headers
      // "matiere (constellation)" -> "matiere"
      // "chapitre (etoile)" -> "chapitre"
      // "cours/exercice (planete)" -> "cours/exercice" -> startsWith "cours"
      
      const constName = row.constellation || row.matiere || row.galaxy;
      const starName = row.star || row.chapitre || row.system || row.etoile;
      const planetName = row.planet || row.cours || row.label || row['cours/exercice'] || row.planete; 
      const orbitVal = parseInt(row.orbit || row.orbite || row.ring);
      const xp = parseInt(row.xp || row['points d\'experience']) || 100;
      const desc = row.description || '';

      if (!constName) continue; // Skip empty rows

      // 1. Constellation Node
      addNode({
        type: 'constellation',
        label: constName,
        valid: true,
        errors: [],
        fx: 0, fy: 0 
      });

      if (starName) {
        // 2. Star Node (Child of Constellation)
        addNode({
          type: 'star',
          label: starName,
          parentLabel: constName,
          valid: true,
          errors: [],
          orbitRing: 0 
        });

        if (planetName) {
          // Calculate Orbit Ring
          const starKey = `${constName}:${starName}`;
          if (!planetCounters[starKey]) planetCounters[starKey] = 0;

          let ring = 1;
          if (!isNaN(orbitVal) && orbitVal > 0) {
              ring = orbitVal;
          } else {
              // Auto-distribute: 8 planets per ring
              ring = Math.floor(planetCounters[starKey] / 8) + 1;
              planetCounters[starKey]++;
          }

          // 3. Planet Node (Child of Star)
          // IMPORTANT: Store constellationLabel to disambiguate planets with same star name in different constellations
          addNode({
            type: 'planet',
            label: planetName,
            parentLabel: starName,
            constellationLabel: constName, // Track which constellation this planet belongs to
            xp: xp,
            description: desc,
            valid: true,
            errors: [],
            orbitRing: ring
          });
        }
      }
    }

    return nodes;
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvNodes(parseHierarchicalCSV(text));
      setStep('layout');
    };
    reader.readAsText(file);
  };

  const downloadExample = () => {
    const blob = new Blob([exampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_structure_cours.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Layout Logic
  const applyLayout = async () => {
    setStep('importing');
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    // Map to store created IDs: Label -> ID
    // Problem: Label might not be unique globally (e.g. "Introduction" in different chapters).
    // Better key: "ParentLabel->Label" or just use scoped logic.
    // For simplicity in this v1, we assume labels are somewhat distinct or we use the hierarchy.
    const createdIds: Record<string, string> = {}; // Key: NodeLabel (Simplification)
    // Better: Key = `Type:Label` to distinguish.
    
    // We need to fetch existing structure to avoid duplicates?
    // The "Smart Merge" logic is complex on client side.
    // Strategy: Try to CREATE. If fails (duplicate), Try to GET ID.
    
    // 1. Process Constellations (Global Positioning)
    const constList = Object.keys(constellations);
    const universeSpacing = GRAPH_CONFIG.LAYOUT.GALAXY_SPACING;
    const constellationSize = GRAPH_CONFIG.CONSTELLATIONS.IMPORT_SCALE;
    
    // Calculer l'espacement minimum pour éviter les superpositions
    // Chaque galaxie a une taille d'environ constellationSize, ajoutons une marge
    const minSpacing = constellationSize * 2.5; // Marge de sécurité de 2.5x
    
    for (let i = 0; i < constList.length; i++) {
        const constName = constList[i];
        
        // Distribute constellations using Golden Spiral (like SkillGraph.tsx)
        const angle = i * 2.4; // Angle d'or (approx 137.5°)
        // Utiliser le maximum entre l'espacement configuré et l'espacement minimum calculé
        const effectiveSpacing = Math.max(universeSpacing, minSpacing);
        const distance = i === 0 ? 0 : (effectiveSpacing * Math.sqrt(i));
        
        const cx = Math.cos(angle) * distance;
        const cy = Math.sin(angle) * distance;
        
        // Ensure Constellation Node Exists (Virtual Concept in Graph, usually implicit via 'galaxy' prop on nodes)
        // But here we might want to create a concrete 'Constellation' node?
        // Current backend uses 'galaxy' string property.
        // Let's stick to existing backend logic: Constellation = String Property.
        // BUT we need to position the STARS.
        
        const stars = Array.from(constellations[constName].stars);
        const shapeKey = selectedShapes[constName];
        const constellationShape = shapeKey ? CONSTELLATIONS[shapeKey] : null;
        const createdStarIds: (string | null)[] = new Array(stars.length).fill(null);
        
        // 2. Process Stars
        for (let j = 0; j < stars.length; j++) {
            const starLabel = stars[j];
            
            // Calculate Position
            let sx = cx, sy = cy;
            
            if (constellationShape && j < constellationShape.points.length) {
                // Map to shape points
                const p = constellationShape.points[j];
                // Scale shape (e.g. 2000 units wide)
                const scale = GRAPH_CONFIG.CONSTELLATIONS.IMPORT_SCALE; 
                sx = cx + (p.x - 0.5) * scale;
                sy = cy + (p.y - 0.5) * scale;
            } else {
                // Default Circle Layout
                const angle = (j / stars.length) * Math.PI * 2;
                const radius = 1000;
                sx = cx + Math.cos(angle) * radius;
                sy = cy + Math.sin(angle) * radius;
            }
            
            // Check if Star already exists in structure
            let starId = null;
            let existingStar = null;
            let targetGroup = `${constName} : ${starLabel}`; // Default new group name

            // Retrieve the star node from csvNodes to get visualConfig
            const starNode = csvNodes.find(n => n.type === 'star' && n.label === starLabel && n.parentLabel === constName);

            // FIXED: Search for existing star using multiple key formats
            // The backend indexes groups by (parentStar || group), which can be:
            // - A UUID (parentStar)
            // - "Constellation : StarLabel" (group format)
            // - Just the starLabel (legacy)
            if (structure && structure[constName] && structure[constName].groups) {
                const groups = structure[constName].groups;

                // Strategy 1: Try the expected group format first
                const expectedGroupKey = `${constName} : ${starLabel}`;
                if (groups[expectedGroupKey]) {
                    const groupNodes = groups[expectedGroupKey].nodes;
                    existingStar = groupNodes.find((n: any) => n.orbitRing === 0 || n.type === 'star' || n.type === 'region');
                }

                // Strategy 2: Try just the starLabel (legacy compatibility)
                if (!existingStar && groups[starLabel]) {
                    const groupNodes = groups[starLabel].nodes;
                    existingStar = groupNodes.find((n: any) => n.orbitRing === 0 || n.type === 'star' || n.type === 'region');
                }

                // Strategy 3: Iterate through all groups to find the star by label
                // This handles cases where the group key is a UUID (parentStar) or has slight formatting differences
                if (!existingStar) {
                    for (const groupKey of Object.keys(groups)) {
                        const groupNodes = groups[groupKey].nodes;
                        const foundStar = groupNodes.find((n: any) =>
                            n.label === starLabel &&
                            (n.orbitRing === 0 || n.type === 'star' || n.type === 'region')
                        );
                        if (foundStar) {
                            existingStar = foundStar;
                            break;
                        }
                    }
                }

                // If we found an existing star, use its exact group property
                if (existingStar) {
                    starId = existingStar.id;
                    createdStarIds[j] = starId;
                    // CRITICAL: Use the star's actual group property for perfect consistency
                    const previousGroup = targetGroup;
                    if (existingStar.group) {
                        targetGroup = existingStar.group;
                    }
                    console.log(`🔍 Found existing star "${starLabel}" | id: ${starId} | existingGroup: "${existingStar.group}" | targetGroup: "${targetGroup}" (was: "${previousGroup}")`);
                }
            }

            if (!starId) {
                // Create Star Node
                try {
                    const starPayload = {
                        label: starLabel,
                        type: 'star',
                        galaxy: constName,
                        group: targetGroup,
                        orbitRing: 0,
                        fx: sx,
                        fy: sy,
                        visualConfig: starNode?.visualConfig
                    };

                    // Debug log to verify correct group assignment
                    console.log(`⭐ Creating star "${starLabel}" | galaxy: "${constName}" | group: "${targetGroup}" | pos: (${Math.round(sx)}, ${Math.round(sy)})`);

                    const res = await fetch(`${API_BASE_URL}/graph/node`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(starPayload)
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        starId = data.id;
                        createdStarIds[j] = starId;
                        results.success++;
                    } else {
                        results.errors.push(`Échec création étoile ${starLabel}`);
                        continue; 
                    }
                } catch (err: any) {
                    results.failed++;
                    results.errors.push(`Erreur ${starLabel}: ${err.message}`);
                    continue;
                }
            }
            
            createdIds[`star:${constName}:${starLabel}`] = starId;

            // 3. Process Planets for this Star
            // IMPORTANT: Filter by BOTH parentLabel (star) AND constellationLabel to avoid cross-constellation duplicates
            const planets = csvNodes.filter(n =>
                n.type === 'planet' &&
                n.parentLabel === starLabel &&
                n.constellationLabel === constName
            );
            
            for (let k = 0; k < planets.length; k++) {
                const planet = planets[k];
                
                // Check if planet already exists
                // FIXED: Use the resolved targetGroup to find existing planets
                let planetExists = false;
                if (structure && structure[constName] && structure[constName].groups) {
                    const groups = structure[constName].groups;

                    // Try multiple group key formats (same logic as star search)
                    const possibleKeys = [targetGroup, `${constName} : ${starLabel}`, starLabel];
                    for (const key of possibleKeys) {
                        if (groups[key]) {
                            const groupNodes = groups[key].nodes;
                            if (groupNodes.some((n: any) => n.label === planet.label)) {
                                planetExists = true;
                                break;
                            }
                        }
                    }

                    // Fallback: search all groups for this planet
                    if (!planetExists) {
                        for (const groupKey of Object.keys(groups)) {
                            const groupNodes = groups[groupKey].nodes;
                            // Only check groups that contain our star
                            const hasStar = groupNodes.some((n: any) =>
                                n.label === starLabel && (n.orbitRing === 0 || n.type === 'star' || n.type === 'region')
                            );
                            if (hasStar && groupNodes.some((n: any) => n.label === planet.label)) {
                                planetExists = true;
                                break;
                            }
                        }
                    }
                }

                if (planetExists) {
                    // Skip or Update? Skip for now to avoid duplicates
                    continue;
                }

                try {
                    // NOTE: Do NOT send parentStar here!
                    // The backend groups nodes by (parentStar || group), so if we send parentStar=starId,
                    // planets will be grouped by the star's ID while the star itself is grouped by its label.
                    // This causes duplicate groups like "Cellule" (star) and "cellule_xxx" (planets).
                    // Instead, we rely on 'group' for hierarchy and UNLOCKS relationship for the graph links.
                    const planetPayload = {
                        label: planet.label,
                        type: 'topic',
                        galaxy: constName,
                        group: targetGroup,
                        // parentStar: starId, // REMOVED - causes grouping mismatch
                        orbitRing: planet.orbitRing ?? (Math.floor(k / 8) + 1),
                        xp: planet.xp,
                        exerciseDescription: planet.description,
                        visualConfig: planet.visualConfig
                    };

                    // Debug log to verify correct group assignment
                    console.log(`📍 Creating planet "${planet.label}" | galaxy: "${constName}" | group: "${targetGroup}" | star: "${starLabel}"`);

                    const pRes = await fetch(`${API_BASE_URL}/graph/node`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(planetPayload)
                    });
                    
                    if (pRes.ok) {
                        const pData = await pRes.json();
                        // Create Link
                        await fetch(`${API_BASE_URL}/graph/relationship`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                                source: starId,
                                target: pData.id,
                                type: 'UNLOCKS'
                            })
                        });
                        results.success++;
                    } else {
                        results.failed++;
                    }
                } catch (e) { results.failed++; }
            }
          }

        // 4. Create Links between Stars (Constellation Shape or Linear)
        if (createdStarIds.length > 1) {
            if (constellationShape && constellationShape.lines) {
                 // Use defined lines in shape
                 for (const line of constellationShape.lines) {
                     const sourceId = createdStarIds[line.from];
                     const targetId = createdStarIds[line.to];
                     if (sourceId && targetId) {
                          await fetch(`${API_BASE_URL}/graph/relationship`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({
                                  source: sourceId,
                                  target: targetId,
                                  type: 'UNLOCKS'
                              })
                          });
                     }
                 }
            } else {
                 // Default: Linear Linking (0->1->2...)
                 for (let j = 0; j < createdStarIds.length - 1; j++) {
                     const sourceId = createdStarIds[j];
                     const targetId = createdStarIds[j+1];
                     if (sourceId && targetId) {
                          await fetch(`${API_BASE_URL}/graph/relationship`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({
                                  source: sourceId,
                                  target: targetId,
                                  type: 'UNLOCKS'
                              })
                          });
                     }
                 }
            }
        }
    }
    
    setImportResults(results);
    setStep('done');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in scale-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-green-400" size={24} />
            <div>
              <h2 className="text-lg font-bold text-white">Assistant d'Importation de Cursus</h2>
              <p className="text-xs text-slate-500">Créez des Constellations, Chapitres et Cours en masse</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-slate-950 flex justify-between items-center border-b border-slate-800">
          {['upload', 'layout', 'importing', 'done'].map((s, i) => (
            <div key={s} className={`flex items-center gap-2 ${step === s ? 'text-blue-400' : 'text-slate-600'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${step === s ? 'border-blue-400 bg-blue-400/10' : 'border-slate-700'}`}>
                {i + 1}
              </div>
              <span className="uppercase text-[10px] font-bold tracking-wider">{s}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                
                {/* Zone Téléchargement Modèle */}
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center hover:border-blue-500/50 transition-colors">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 text-blue-400">
                    <Download size={24} />
                  </div>
                  <h3 className="font-bold text-white mb-2">1. Télécharger le modèle</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Obtenez un fichier CSV pré-formaté avec les colonnes nécessaires (Constellation, Chapitre, Cours).
                  </p>
                  <button 
                    onClick={downloadExample}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-sm transition-colors"
                  >
                    Télécharger .csv
                  </button>
                </div>

                {/* Zone Upload */}
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center hover:border-green-500/50 transition-colors">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-400">
                    <Upload size={24} />
                  </div>
                  <h3 className="font-bold text-white mb-2">2. Importer votre fichier</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Remplissez le modèle et glissez-le ici pour générer la structure.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold text-sm transition-colors"
                  >
                    Choisir un fichier
                  </button>
                </div>

              </div>

              {/* Options de randomisation */}
              <div className="mt-4 flex gap-4 text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input 
                          type="checkbox" 
                          checked={randomizeStars}
                          onChange={(e) => setRandomizeStars(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
                      />
                      <span>Apparence aléatoire des étoiles (sinon Blanches)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input 
                          type="checkbox" 
                          checked={randomizePlanets}
                          onChange={(e) => setRandomizePlanets(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
                      />
                      <span>Apparence aléatoire des planètes (sinon Terre)</span>
                  </label>
              </div>
              
              <div className="mt-8 bg-slate-900 p-4 rounded-lg border border-slate-800 max-w-2xl w-full">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <HelpCircle size={12}/> Structure du fichier
                </h4>
                <div className="grid grid-cols-5 gap-2 text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-2 mb-2">
                    <div>Constellation (Matière)</div>
                    <div>Star (Chapitre)</div>
                    <div>Planet (Cours)</div>
                    <div>Orbit (Cercle)</div>
                    <div>XP</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-[10px] text-slate-300">
                    <div>Anatomie</div>
                    <div>Membre Sup</div>
                    <div>Introduction</div>
                    <div className="text-slate-500">1 (optionnel)</div>
                    <div className="text-slate-500">100 (optionnel)</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LAYOUT / SHAPE SELECTION */}
          {step === 'layout' && (
            <div className="max-w-4xl mx-auto">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Layout className="text-purple-400" /> Configuration des Constellations
              </h3>
              
              <div className="space-y-6">
                {Object.keys(constellations).map(constName => {
                    const starCount = constellations[constName].stars.size;
                    const currentShapeKey = selectedShapes[constName];
                    const currentShape = currentShapeKey ? CONSTELLATIONS[currentShapeKey] : null;
                    
                    // Find suggested shapes based on star count
                    const allShapes = Object.entries(CONSTELLATIONS);
                    
                    // 1. Exact matches (Priorité absolue)
                    let suggestions = allShapes.filter(([_, shape]) => shape.points.length === starCount);
                    
                    // 2. Tolerance +/- 1 if no exact match
                    if (suggestions.length === 0) {
                        suggestions = allShapes.filter(([_, shape]) => Math.abs(shape.points.length - starCount) <= 1);
                    }
                    
                    // 3. Tolerance +/- 2 if still nothing
                    if (suggestions.length === 0) {
                        suggestions = allShapes.filter(([_, shape]) => Math.abs(shape.points.length - starCount) <= 2);
                    }

                    // Slice to 5
                    suggestions = suggestions.slice(0, 5);

                    return (
                        <div key={constName} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="text-lg font-bold text-white">{constName}</h4>
                                    <p className="text-sm text-slate-400">{starCount} Chapitres (Étoiles) détectés</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentShape ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 'bg-slate-700 text-slate-400'}`}>
                                        {currentShape ? `Forme : ${currentShape.name}` : 'Placement Automatique (Cercle)'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {/* Option Auto */}
                                <button
                                    onClick={() => setSelectedShapes({...selectedShapes, [constName]: ''})}
                                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                                        !currentShapeKey 
                                        ? 'bg-blue-600 border-blue-500 text-white' 
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-current opacity-50"></div>
                                    <span className="text-[10px] font-bold">Cercle Auto</span>
                                </button>

                                {/* Suggestions */}
                                {suggestions.map(([key, shape]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedShapes({...selectedShapes, [constName]: key})}
                                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                                            currentShapeKey === key
                                            ? 'bg-purple-600 border-purple-500 text-white' 
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                    >
                                        <Sparkles size={16} />
                                        <div className="text-center">
                                            <span className="text-[10px] font-bold block">{shape.name}</span>
                                            <span className="text-[9px] opacity-70">{shape.points.length} pts</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
              </div>

              <div className="flex justify-end mt-8">
                <button
                    onClick={applyLayout}
                    className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/20 transition-all flex items-center gap-2"
                >
                    <CheckCircle size={20} /> Lancer l'Importation
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold text-white mb-2">Construction de l'Univers...</h3>
                <p className="text-slate-400">Création des constellations, étoiles et planètes en cours.</p>
            </div>
          )}

          {/* STEP 4: DONE */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-6">
                    <CheckCircle size={48} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">Import Terminé !</h3>
                <p className="text-slate-400 mb-8 max-w-md">
                    <span className="text-green-400 font-bold">{importResults.success}</span> éléments ont été ajoutés à votre cursus.
                    {importResults.failed > 0 && <span className="text-red-400 block mt-2">{importResults.failed} erreurs rencontrées.</span>}
                </p>
                
                {importResults.errors.length > 0 && (
                    <div className="w-full max-w-2xl bg-slate-950 p-4 rounded-lg border border-red-900/50 text-left mb-8 max-h-40 overflow-y-auto">
                        <h4 className="text-red-400 font-bold text-xs mb-2">Détail des erreurs :</h4>
                        {importResults.errors.map((e, i) => (
                            <p key={i} className="text-[10px] text-red-300 font-mono">• {e}</p>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => { onImported(); onClose(); }}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-600 transition-all"
                >
                    Retour au Graphe
                </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
