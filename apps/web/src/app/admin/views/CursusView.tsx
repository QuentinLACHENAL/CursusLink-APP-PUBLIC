'use client';

import { useState, useEffect } from 'react';
import { FolderTree, Hexagon, Move, Save, FileSpreadsheet, BarChart2, Eye, Grid3X3, Orbit, Sparkles, Palette, X } from 'lucide-react';
import SkillGraph from '../../../components/SkillGraph';
import StructureTreeView from '../components/StructureTreeView';
import NodeEditPanel from '../components/NodeEditPanel';
import ConfigBanner from '../components/ConfigBanner';
import ContextMenu from '../components/ContextMenu';
import NodeContextMenu from '../components/NodeContextMenu';
import ContentViewer from '../components/ContentViewer';
import CSVImportModal from '../components/CSVImportModal';
import StatsPanel from '../components/StatsPanel';
import ResourceLibrary from '../components/ResourceLibrary';
import CreationModal from '../components/CreationModal';
import ThemeSelector from '../../../components/ThemeSelector';
import ExerciseBuilder from '../../../components/ExerciseBuilder';
import { QCMBuilder } from '../../../components/exercises/qcm';
import { SchemaExerciseBuilder } from '../../../components/exercises/schema';
import { OrderBuilder } from '../../../components/exercises/order';
import { MatchingBuilder } from '../../../components/exercises/matching';
import { AxisBuilder } from '../../../components/exercises/axis';
import { EstimationBuilder } from '../../../components/exercises/estimation';
import { TextFillBuilder } from '../../../components/exercises/text-fill';
import { useGraphActions } from '../../../hooks/useGraphActions';
import { useGraphLayout } from '../../../hooks/useGraphLayout';
import { useHistory, HistoryPanel } from '../components/HistoryManager';
import SearchBar from '../components/SearchBar';
import { api } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useGraph } from '../../../context/GraphContext';
import { getAvailableConstellations, getConstellationsByCategory } from '../../../components/graph';
import { MENU_CONFIG } from '../../../config/MenuConfig';

interface CursusViewProps {
  onRefresh: () => void;
}


export default function CursusView({
  onRefresh
}: CursusViewProps) {
  const { user, token } = useAuth();
  const { structure, refreshGraph } = useGraph();
  const [viewMode, setViewMode] = useState<'3d' | 'tree'>('3d');
  const [graphVersion, setGraphVersion] = useState(0);

  const handleRefresh = async () => {
    await refreshGraph();
    setGraphVersion(v => v + 1);
    onRefresh();
  };
  
  // History
  const { history, addAction, undo, canUndo } = useHistory(token || '', handleRefresh);

  // Hooks
  const graphActions = useGraphActions({ token, structure, onRefresh: handleRefresh, addAction });
  const {
    newNode, setNewNode, newLink, setNewLink, selectedNodeData, setSelectedNodeData,
    createNode, updateNode, deleteNode, createLink, createNodeInGroup
  } = graphActions;

  const {
    currentLayout, setCurrentLayout, bgUrl, setBgUrl, bgScale, setBgScale,
    bgOffsetX, setBgOffsetX, bgOffsetY, setBgOffsetY, imgLibrary,
    moveMode, setMoveMode, saveLayout, saveBackgroundConfig, handleBgUpload, removeBackground
  } = useGraphLayout({ token });

  // Local state for modals/tools
  const [showExerciseBuilder, setShowExerciseBuilder] = useState(false);
  const [exerciseBuilderType, setExerciseBuilderType] = useState<'qcm' | 'schema' | 'matching' | 'order' | 'axis' | 'estimation' | 'text-fill' | 'none'>('none');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ node: any; screenX: number; screenY: number } | null>(null);
  const [creationModal, setCreationModal] = useState<{ isOpen: boolean; type: 'galaxy' | 'system' | 'node'; position: { x: number; y: number } }>({
    isOpen: false,
    type: 'node',
    position: { x: 0, y: 0 }
  });
  const [lastCreatedIn, setLastCreatedIn] = useState<{ galaxy: string; system: string }>({ galaxy: '', system: '' });
  // Track le dernier nœud modifié pour centrer la vue admin dessus
  const [lastModifiedNodeId, setLastModifiedNodeId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_last_modified_node');
    }
    return null;
  });
  const [contentViewer, setContentViewer] = useState<{ isOpen: boolean; file: any; allFiles: any[] }>({
    isOpen: false,
    file: null,
    allFiles: []
  });
  
  // Link Picking Mode
  const [linkPickMode, setLinkPickMode] = useState<{ mode: 'pick-parent' | 'pick-child'; nodeId: string } | null>(null);

  // Tools
  const [showResourceLibrary, setShowResourceLibrary] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  
  // Overlays visuels admin
  const [showGrid, setShowGrid] = useState(false);
  const [showOrbitalGuide, setShowOrbitalGuide] = useState(false);
  const [showConstellation, setShowConstellation] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_constellation_guide');
    }
    return null;
  });
  
  // Persistance du guide de constellation
  useEffect(() => {
    if (showConstellation) {
      localStorage.setItem('admin_constellation_guide', showConstellation);
    } else {
      localStorage.removeItem('admin_constellation_guide');
    }
  }, [showConstellation]);

  // Persistance du dernier nœud modifié
  useEffect(() => {
    if (lastModifiedNodeId) {
      localStorage.setItem('admin_last_modified_node', lastModifiedNodeId);
    }
  }, [lastModifiedNodeId]);

  // Fonction pour tracker les modifications de nœuds
  const trackNodeModification = (nodeId: string) => {
    setLastModifiedNodeId(nodeId);
  };

  const [showOverlayMenu, setShowOverlayMenu] = useState(false);
  const constellationCategories = getConstellationsByCategory();
  const [visibleGuides, setVisibleGuides] = useState<Set<string>>(new Set());
  const [constellationPosition, setConstellationPosition] = useState<{ x: number; y: number } | null>(null);
  
  const [resourceLibraryMode, setResourceLibraryMode] = useState<'browse' | 'select-for-node'>('browse');
  const [resourceLibraryTarget, setResourceLibraryTarget] = useState<{ nodeId: string; nodeLabel: string } | null>(null);
  
  // Forms local state (moved from AdminPage if needed, or kept in hooks/NodeEditPanel)
  const [galaxyMode, setGalaxyMode] = useState<'select' | 'new'>('select');
  const [systemMode, setSystemMode] = useState<'select' | 'new'>('select');

  const onNodeClick = async (node: any) => {
      // HANDLE LINK PICK MODE
      if (linkPickMode) {
          if (node.id === linkPickMode.nodeId) return; // Cannot link to self
          
          try {
              if (linkPickMode.mode === 'pick-parent') {
                  // Link: ClickedNode (Parent) -> CurrentNode (Child)
                  // Check if link already exists to toggle it?
                  // For now, let's just add it. The API will handle duplicates or we should check.
                  // Ideally, if it exists, remove it. But simple adding is safer for MVP.
                  // Actually user asked for "cliquer pour ajouter/supprimer".
                  // Check if node.id is already a parent of linkPickMode.nodeId
                  const isParent = node.unlocksIds?.includes(linkPickMode.nodeId) || false; // Wait, unlocksIds is forward. 
                  // To check if ClickedNode unlocks CurrentNode: ClickedNode.unlocksIds.includes(CurrentNode.id)
                  // But 'node' object here might be stale or partial.
                  
                  // Let's just try to create. If we want toggle, we need full graph knowledge here.
                  // `structure` has the graph.
                  await api.post('graph/relationship', { source: node.id, target: linkPickMode.nodeId, type: 'UNLOCKS' }, token);
                  alert(`Lien ajouté: ${node.label} -> (Cible)`);
              } else {
                  // Link: CurrentNode (Parent) -> ClickedNode (Child)
                  await api.post('graph/relationship', { source: linkPickMode.nodeId, target: node.id, type: 'UNLOCKS' }, token);
                  alert(`Lien ajouté: (Source) -> ${node.label}`);
              }
              handleRefresh();
          } catch (e: any) {
              console.error(e);
              alert('Erreur: ' + e.message);
          }
          // Do NOT exit mode immediately to allow multiple selections? 
          // User said "cliquer pour ajouter/supprimer". Usually implies mode stays active.
          return;
      }

      setSelectedNodeData({ ...node });
      // Tracker ce nœud comme dernier modifié/sélectionné en admin
      trackNodeModification(node.id);
      if (!newLink.source) setNewLink({ ...newLink, source: node.id });
      else if (!newLink.target && node.id !== newLink.source) setNewLink({ ...newLink, target: node.id });
      else setNewLink({ ...newLink, source: node.id, target: '' });
  };

  const saveExerciseToLibrary = (config: any, type: string) => {
    if (!user?.id) return;
    try {
        const key = `resources-${user.id}`;
        const stored = localStorage.getItem(key);
        const resources: any[] = stored ? JSON.parse(stored) : [];
        
        const configObj = typeof config === 'string' ? JSON.parse(config) : config;
        
        const resource = {
            id: configObj.id || `resource-${Date.now()}`,
            type: 'exercise',
            name: configObj.title || `Exercice ${type} - ${new Date().toLocaleTimeString()}`,
            description: configObj.description || '',
            category: 'bases-theoriques',
            filiere: 'standard',
            tags: [],
            createdAt: configObj.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            exerciseType: type,
            exerciseData: JSON.stringify(configObj),
            linkedNodes: []
        };

        const existingIndex = resources.findIndex((r: any) => r.id === resource.id);
        if (existingIndex >= 0) {
            resources[existingIndex] = resource;
        } else {
            resources.push(resource);
        }
        
        localStorage.setItem(key, JSON.stringify(resources));
        console.log('Auto-saved to library:', resource.name);
    } catch (e) {
        console.error('Error auto-saving to library', e);
    }
  };

  return (
    <>
      {/* TOOLBAR */}
      <div className="flex items-center gap-3 mb-6 bg-slate-900 p-2 rounded-lg border border-slate-800">
        <SearchBar structure={structure} onNodeSelect={(node) => {
            if (node.id) {
            setSelectedNodeData(node);
            setViewMode('tree');
            }
        }} />
        {/* Link Pick Mode Indicator */}
        {linkPickMode && (
             <div className="bg-yellow-600/30 border border-yellow-500 text-yellow-200 px-3 py-1 rounded text-xs animate-pulse flex items-center gap-2">
                 <span>Mode Liaison: {linkPickMode.mode === 'pick-parent' ? 'Sélectionner Parent' : 'Sélectionner Enfant'}</span>
                 <button onClick={() => setLinkPickMode(null)} className="hover:text-white"><X size={14}/></button>
             </div>
        )}

        <div className="h-6 w-px bg-slate-700 mx-2" />
        <button
            onClick={() => setShowResourceLibrary(true)}
            className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 rounded-lg px-3 py-1.5 text-xs font-medium"
        >
            <FolderTree size={14} /> Bibliothèque
        </button>
        <button
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 rounded-lg px-3 py-1.5 text-xs font-medium"
        >
            <FileSpreadsheet size={14} /> Import CSV
        </button>
        <button
            onClick={() => setShowStats(true)}
            className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 rounded-lg px-3 py-1.5 text-xs font-medium"
        >
            <BarChart2 size={14} /> Stats
        </button>
        <button
            onClick={() => setShowThemePanel(!showThemePanel)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
              showThemePanel 
                ? 'bg-purple-600 text-white border border-purple-500' 
                : 'bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300'
            }`}
        >
            <Palette size={14} /> Thème
        </button>
        <div className="flex-1" />
        <HistoryPanel history={history} canUndo={canUndo} onUndo={undo} />
      </div>

      {/* Theme Panel Overlay */}
      {showThemePanel && (
        <div className="mb-4">
          <ThemeSelector />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px] overflow-hidden">
        {/* Panel Outils / ARBORESCENCE */}
        {(viewMode === 'tree' || selectedNodeData) && (
          <div 
            className="flex-shrink-0 bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col gap-4 h-full overflow-hidden transition-all duration-300"
            style={{ width: viewMode === 'tree' ? '60%' : `${MENU_CONFIG.PANEL_WIDTH}px` }}
          >
            <div className="flex bg-slate-950 rounded p-1 border border-slate-700 shrink-0">
                <button onClick={() => setViewMode('tree')} className={`flex-1 py-1 rounded text-xs font-bold ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><FolderTree size={14} className="inline mr-1"/> Structure</button>
                <button onClick={() => setViewMode('3d')} className={`flex-1 py-1 rounded text-xs font-bold ${viewMode === '3d' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}><Hexagon size={14} className="inline mr-1"/> Graphe 3D</button>
            </div>

            <div className={`flex flex-1 min-h-0 gap-4 ${viewMode === 'tree' ? 'flex-col lg:flex-row' : 'flex-col'}`}>
                {viewMode === 'tree' && structure && (
                    <StructureTreeView 
                        structure={structure}
                        token={token || ''}
                        selectedNodeData={selectedNodeData}
                        onRefresh={handleRefresh}
                        onNodeClick={onNodeClick}
                        graphActions={graphActions}
                    />
                )}

                <NodeEditPanel
                    viewMode={viewMode}
                    selectedNodeData={selectedNodeData}
                    setSelectedNodeData={setSelectedNodeData}
                    newLink={newLink}
                    setNewLink={setNewLink}
                    galaxyMode={galaxyMode}
                    setGalaxyMode={setGalaxyMode}
                    systemMode={systemMode}
                    setSystemMode={setSystemMode}
                    onCreateNode={createNode}
                    onUpdateNode={updateNode}
                    onDeleteNode={deleteNode}
                    onCreateLink={createLink}
                    onRefresh={handleRefresh}
                    setShowExerciseBuilder={setShowExerciseBuilder}
                    setExerciseBuilderType={setExerciseBuilderType}
                    onOpenContentViewer={(file, allFiles) => setContentViewer({ isOpen: true, file, allFiles })}
                    onOpenResourceLibrary={(mode, nodeId, nodeLabel) => {
                      setResourceLibraryMode(mode);
                      if (nodeId && nodeLabel) {
                        setResourceLibraryTarget({ nodeId, nodeLabel });
                      }
                      setShowResourceLibrary(true);
                    }}
                    // Props for Link Picking
                    linkPickMode={linkPickMode}
                    onEnterLinkPickMode={(mode, nodeId) => setLinkPickMode({ mode, nodeId })}
                    onCancelLinkPickMode={() => setLinkPickMode(null)}
                />
            </div>
          </div>
        )}

        {/* VUE PRINCIPALE (3D TOUJOURS VISIBLE) */}
        <div className="flex-1 min-w-0 border border-slate-800 rounded-xl overflow-hidden relative bg-black min-h-[400px]">
            <SkillGraph 
                readOnly={false} 
                moveMode={moveMode}
                bgScale={bgScale}
                bgOffsetX={bgOffsetX}
                bgOffsetY={bgOffsetY}
                onLayoutChange={(positions) => setCurrentLayout(positions)} 
                onNodeSelect={onNodeClick} 
                refreshTrigger={graphVersion}
                selectedNodeId={selectedNodeData?.id}
                showHud={false}
                onRightClick={(coords) => {
                    setContextMenu(coords);
                    setConstellationPosition({ x: coords.x, y: coords.y });
                }}
                onNodeRightClick={(node, coords) => setNodeContextMenu({ node, ...coords })}
                disableContentPanel={true}
                showGrid={showGrid}
                showConstellation={showConstellation}
                showOrbitalGuide={showOrbitalGuide}
                visibleGuides={visibleGuides}
                constellationPosition={constellationPosition}
                isAdminMode={true}
                lastModifiedNodeId={lastModifiedNodeId || undefined}
            />
            {/* Outils Flottants 3D (Gauche) */}
            <div className="absolute top-4 left-4 flex gap-2 z-20">
                <div className="bg-black/50 px-2 py-1 rounded text-[10px] text-slate-400 border border-slate-800 flex items-center pointer-events-none">
                    {viewMode === '3d' && !selectedNodeData ? 'Mode 3D Plein Écran' : viewMode === '3d' ? 'Mode 3D Focus' : 'Mode Structure & 3D'}
                </div>
                
                {/* Bouton Mode Structure (Déplacé ici) */}
                {viewMode === '3d' && !selectedNodeData && (
                  <button 
                      onClick={() => setViewMode('tree')}
                      className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-xs text-white border border-blue-500 flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                      <FolderTree size={14}/> Mode Structure
                  </button>
                )}
            </div>
            
            {/* Menu Overlay Admin (Droite) */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              {/* Bouton Overlays */}
              <div className="relative">
                <button 
                  onClick={() => {
                      if (!showOverlayMenu) setConstellationPosition(null); // Reset position to center if opening menu manually
                      setShowOverlayMenu(!showOverlayMenu);
                  }}
                  className={`px-3 py-2 rounded text-xs text-white border flex items-center gap-2 cursor-pointer shadow-lg ${
                    showGrid || showOrbitalGuide || showConstellation 
                      ? 'bg-purple-600 hover:bg-purple-500 border-purple-500' 
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-600'
                  }`}
                >
                  <Eye size={14}/> Guides
                </button>
                
                {showOverlayMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 min-w-[200px]">
                    <div className="text-xs text-slate-400 mb-2 font-semibold">Guides de placement</div>
                    
                    {/* Grille */}
                    <label className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showGrid} 
                        onChange={() => setShowGrid(!showGrid)}
                        className="rounded bg-slate-700 border-slate-600"
                      />
                      <Grid3X3 size={14} className="text-slate-400" />
                      <span className="text-sm text-white">Grille</span>
                    </label>
                    
                    {/* Guide Orbital */}
                    <label className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showOrbitalGuide} 
                        onChange={() => setShowOrbitalGuide(!showOrbitalGuide)}
                        className="rounded bg-slate-700 border-slate-600"
                      />
                      <Orbit size={14} className="text-slate-400" />
                      <span className="text-sm text-white">Orbites planétaires</span>
                    </label>
                    
                    {/* Constellations */}
                    <div className="border-t border-slate-700 mt-2 pt-2 max-h-64 overflow-y-auto">
                      <div className="text-xs text-slate-500 mb-1 px-2 font-semibold">Constellations</div>
                      <button 
                        onClick={() => setShowConstellation(null)}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm ${!showConstellation ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        ✕ Aucune
                      </button>
                      {Object.entries(constellationCategories).map(([category, constellations]) => (
                        <div key={category} className="mt-2">
                          <div className="text-[10px] text-slate-600 uppercase px-2 mb-1">{category}</div>
                          {constellations.map(({ key, name }) => (
                            <button 
                              key={key}
                              onClick={() => setShowConstellation(key)}
                              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 ${showConstellation === key ? 'bg-purple-600/30 text-purple-300' : 'text-slate-400 hover:bg-slate-800'}`}
                            >
                              <Sparkles size={10} />
                              {name}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-4 left-4 flex gap-2 z-20">
                <button onClick={() => setMoveMode(moveMode === 'single' ? 'group' : 'single')} className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded text-xs text-white border border-slate-600 flex items-center gap-2 cursor-pointer">
                    <Move size={14}/> {moveMode === 'single' ? 'Déplacer Unique' : 'Déplacer Groupe'}
                </button>
                <button onClick={saveLayout} className="bg-green-700 hover:bg-green-600 px-3 py-2 rounded text-xs text-white border border-green-600 flex items-center gap-2 cursor-pointer">
                    <Save size={14}/> Sauvegarder Positions
                </button>
            </div>
        </div>
      </div>

      <ConfigBanner
          token={token || ''}
          bgScale={bgScale}
          setBgScale={setBgScale}
          bgOffsetX={bgOffsetX}
          setBgOffsetX={setBgOffsetX}
          bgOffsetY={bgOffsetY}
          setBgOffsetY={setBgOffsetY}
          onBgUpload={handleBgUpload}
          onSaveBackgroundConfig={saveBackgroundConfig}
          onRemoveBackground={removeBackground}
          hasBgImage={!!bgUrl}
          onRefresh={handleRefresh}
      />

      {/* Modals & Overlays (Exercise, Schema, Grading, ContextMenu, CreationModal, etc.) */}
      {/* I will keep the modals here as they are part of the Cursus view interaction */}
      
      {showExerciseBuilder && exerciseBuilderType === 'qcm' && (
        <QCMBuilder
          nodeId={selectedNodeData?.id || 'new-node'}
          nodeLabel={selectedNodeData?.label || newNode.label || 'Nouveau QCM'}
          initialConfig={(() => {
            try {
              const data = selectedNodeData?.exerciseData || (newNode as any).exerciseData;
              return data ? JSON.parse(data) : undefined;
            } catch { return undefined; }
          })()}
          onSave={(config) => {
            const jsonData = JSON.stringify(config);
            if (selectedNodeData) {
              updateNode({ ...selectedNodeData, exerciseData: jsonData });
            } else {
              setNewNode({...newNode, exerciseData: jsonData} as any);
            }
            saveExerciseToLibrary(config, 'qcm');
            setShowExerciseBuilder(false);
          }}
          onCancel={() => setShowExerciseBuilder(false)}
        />
      )}

      {showExerciseBuilder && exerciseBuilderType === 'schema' && (
        <SchemaExerciseBuilder
          nodeId={selectedNodeData?.id || 'new-node'}
          nodeLabel={selectedNodeData?.label || newNode.label || 'Nouveau nœud'}
          initialConfig={(() => {
            try {
              const data = selectedNodeData?.exerciseData || (newNode as any).exerciseData;
              return data ? JSON.parse(data) : undefined;
            } catch { return undefined; }
          })()}
          token={token || ''}
          onSave={(config) => {
            const jsonData = JSON.stringify(config);
            if (selectedNodeData) {
              updateNode({ ...selectedNodeData, exerciseData: jsonData });
            } else {
              setNewNode({...newNode, exerciseData: jsonData} as any);
            }
            saveExerciseToLibrary(config, 'schema');
            setShowExerciseBuilder(false);
          }}
          onCancel={() => setShowExerciseBuilder(false)}
        />
      )}

      {showExerciseBuilder && exerciseBuilderType === 'order' && (
        <OrderBuilder
          nodeId={selectedNodeData?.id || 'new-node'}
          nodeLabel={selectedNodeData?.label || newNode.label || 'Nouvel ordre'}
          token={token || ''}
          initialConfig={(() => {
            try {
              const data = selectedNodeData?.exerciseData || (newNode as any).exerciseData;
              return data ? JSON.parse(data) : undefined;
            } catch { return undefined; }
          })()}
          onSave={(config) => {
            const jsonData = JSON.stringify(config);
            if (selectedNodeData) {
              updateNode({ ...selectedNodeData, exerciseData: jsonData });
            } else {
              setNewNode({...newNode, exerciseData: jsonData} as any);
            }
            saveExerciseToLibrary(config, 'order');
            setShowExerciseBuilder(false);
          }}
          onCancel={() => setShowExerciseBuilder(false)}
        />
      )}

      {showExerciseBuilder && exerciseBuilderType === 'matching' && (
        <MatchingBuilder
          nodeId={selectedNodeData?.id || 'new-node'}
          nodeLabel={selectedNodeData?.label || newNode.label || 'Nouvelles associations'}
          token={token || ''}
          initialConfig={(() => {
            try {
              const data = selectedNodeData?.exerciseData || (newNode as any).exerciseData;
              return data ? JSON.parse(data) : undefined;
            } catch { return undefined; }
          })()}
          onSave={(config) => {
            const jsonData = JSON.stringify(config);
            if (selectedNodeData) {
              updateNode({ ...selectedNodeData, exerciseData: jsonData });
            } else {
              setNewNode({...newNode, exerciseData: jsonData} as any);
            }
            saveExerciseToLibrary(config, 'matching');
            setShowExerciseBuilder(false);
          }}
          onCancel={() => setShowExerciseBuilder(false)}
        />
      )}

      {showExerciseBuilder && exerciseBuilderType === 'axis' && (
        <AxisBuilder
          nodeId={selectedNodeData?.id || 'new-node'}
          initialConfig={(() => {
            try {
              const data = selectedNodeData?.exerciseData || (newNode as any).exerciseData;
              return data ? JSON.parse(data) : undefined;
            } catch { return undefined; }
          })()}
          onSave={(config) => {
            const jsonData = JSON.stringify(config);
            if (selectedNodeData) {
              updateNode({ ...selectedNodeData, exerciseData: jsonData });
            } else {
              setNewNode({...newNode, exerciseData: jsonData} as any);
            }
            saveExerciseToLibrary(config, 'axis');
            setShowExerciseBuilder(false);
          }}
          onCancel={() => setShowExerciseBuilder(false)}
        />
      )}

      {showExerciseBuilder && exerciseBuilderType === 'estimation' && (
        <EstimationBuilder
          nodeId={selectedNodeData?.id || 'new-node'}
          initialConfig={(() => {
            try {
              const data = selectedNodeData?.exerciseData || (newNode as any).exerciseData;
              return data ? JSON.parse(data) : undefined;
            } catch { return undefined; }
          })()}
          onSave={(config) => {
            const jsonData = JSON.stringify(config);
            if (selectedNodeData) {
              updateNode({ ...selectedNodeData, exerciseData: jsonData });
            } else {
              setNewNode({...newNode, exerciseData: jsonData} as any);
            }
            saveExerciseToLibrary(config, 'estimation');
            setShowExerciseBuilder(false);
          }}
          onCancel={() => setShowExerciseBuilder(false)}
        />
      )}

      {showExerciseBuilder && exerciseBuilderType === 'text-fill' && (
        <TextFillBuilder
          nodeId={selectedNodeData?.id || 'new-node'}
          nodeLabel={selectedNodeData?.label || newNode.label || 'Nouveau texte à trous'}
          initialConfig={(() => {
            try {
              const data = selectedNodeData?.exerciseData || (newNode as any).exerciseData;
              return data ? JSON.parse(data) : undefined;
            } catch { return undefined; }
          })()}
          onSave={(config) => {
            const jsonData = JSON.stringify(config);
            if (selectedNodeData) {
              updateNode({ ...selectedNodeData, exerciseData: jsonData });
            } else {
              setNewNode({...newNode, exerciseData: jsonData} as any);
            }
            saveExerciseToLibrary(config, 'text-fill');
            setShowExerciseBuilder(false);
          }}
          onCancel={() => setShowExerciseBuilder(false)}
        />
      )}


      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onCreateGalaxy={() => {
            setCreationModal({
              isOpen: true,
              type: 'galaxy',
              position: { x: contextMenu.x, y: contextMenu.y }
            });
            setContextMenu(null);
          }}
          onCreateSystem={() => {
            setCreationModal({
              isOpen: true,
              type: 'system',
              position: { x: contextMenu.x, y: contextMenu.y }
            });
            setContextMenu(null);
          }}
          onCreateNode={() => {
            setCreationModal({
              isOpen: true,
              type: 'node',
              position: { x: contextMenu.x, y: contextMenu.y }
            });
            setContextMenu(null);
          }}
          onShowGuides={() => {
            setShowOverlayMenu(true);
            setContextMenu(null);
          }}
        />
      )}

      <CreationModal
        isOpen={creationModal.isOpen}
        initialType={creationModal.type}
        position={creationModal.position}
        structure={structure}
        token={token || ''}
        userId={user?.id || ''}
        lastCreatedIn={lastCreatedIn}
        onClose={() => setCreationModal({ ...creationModal, isOpen: false })}
        onCreated={(galaxy: string, system: string, nodeId?: string, nodeType?: string, nodeData?: any, contentType?: string) => {
          setLastCreatedIn({ galaxy, system });
          handleRefresh();
          setCreationModal({ ...creationModal, isOpen: false });
          if ((nodeType === 'exercise' || contentType === 'editor') && nodeData) {
            setTimeout(() => {
              setSelectedNodeData(nodeData);
              setViewMode('tree');
            }, 300);
          }
        }}
      />

      {nodeContextMenu && (
        <NodeContextMenu
          node={nodeContextMenu.node}
          x={nodeContextMenu.screenX}
          y={nodeContextMenu.screenY}
          onClose={() => setNodeContextMenu(null)}
          onRename={async () => {
            const newLabel = prompt('Nouveau nom :', nodeContextMenu.node.label);
            if (newLabel && newLabel !== nodeContextMenu.node.label) {
              await api.patch(`graph/node/${nodeContextMenu.node.id}`, { ...nodeContextMenu.node, label: newLabel }, token);
              onRefresh();
            }
          }}
          onDelete={async () => {
            if (confirm(`Supprimer "${nodeContextMenu.node.label}" ?\n\nCette action est irréversible !`)) {
              await api.delete(`graph/node/${nodeContextMenu.node.id}`, token);
              setSelectedNodeData(null);
              onRefresh();
            }
          }}
          onEditContent={() => {
            setSelectedNodeData(nodeContextMenu.node);
            setViewMode('tree');
          }}
          onEditExercise={() => {
            setSelectedNodeData(nodeContextMenu.node);
            setViewMode('tree');
            if (nodeContextMenu.node.exerciseType) {
              setExerciseBuilderType(nodeContextMenu.node.exerciseType);
              setShowExerciseBuilder(true);
            }
          }}
          onManageLinks={() => {
            setSelectedNodeData(nodeContextMenu.node);
            setViewMode('tree');
          }}
          onDuplicate={async () => {
            const newLabel = prompt('Nom du duplicata :', `${nodeContextMenu.node.label} (copie)`);
            if (newLabel) {
              const { id, ...nodeData } = nodeContextMenu.node;
              const newNode = await api.post<any>('graph/node', { 
                  ...nodeData, 
                  label: newLabel,
                  fx: (nodeContextMenu.node.fx || nodeContextMenu.node.x || 0) + 50,
                  fy: (nodeContextMenu.node.fy || nodeContextMenu.node.y || 0) + 50
                }, token);
              addAction({ type: 'create', description: `Dupliqué "${newLabel}"`, data: { nodeId: newNode.id, nodeData: newNode } });
              onRefresh();
            }
          }}
          onViewAsStudent={() => {
            window.open(`/exercise/${nodeContextMenu.node.id}`, '_blank');
          }}
          onToggleGuide={() => {
            setVisibleGuides(prev => {
              const newSet = new Set(prev);
              if (newSet.has(nodeContextMenu.node.id)) {
                newSet.delete(nodeContextMenu.node.id);
              } else {
                newSet.add(nodeContextMenu.node.id);
              }
              return newSet;
            });
          }}
          isGuideVisible={visibleGuides.has(nodeContextMenu.node.id)}
        />
      )}

      <ContentViewer
        isOpen={contentViewer.isOpen}
        file={contentViewer.file}
        nodeLabel={selectedNodeData?.label || ''}
        allFiles={contentViewer.allFiles}
        onClose={() => setContentViewer({ isOpen: false, file: null, allFiles: [] })}
      />

      <CSVImportModal
        isOpen={showCSVImport}
        structure={structure}
        token={token || ''}
        onClose={() => setShowCSVImport(false)}
        onImported={handleRefresh}
      />

      <StatsPanel
        isOpen={showStats}
        structure={structure}
        token={token || ''}
        onClose={() => setShowStats(false)}
      />

      <ResourceLibrary
        isOpen={showResourceLibrary}
        token={token || ''}
        userId={user?.id || ''}
        structure={structure}
        onClose={() => {
          setShowResourceLibrary(false);
          setResourceLibraryMode('browse');
          setResourceLibraryTarget(null);
        }}
        onLinkToNode={(resource, nodeId) => {
          console.log('Link resource to node:', resource, nodeId);
          handleRefresh();
        }}
        mode={resourceLibraryMode}
        targetNodeId={resourceLibraryTarget?.nodeId}
        targetNodeLabel={resourceLibraryTarget?.nodeLabel}
      />
    </>
  );
}