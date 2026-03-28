'use client';

import { useState, useEffect } from 'react';
import {
  X, Plus, Search, FolderOpen, LayoutGrid, List, Link as LinkIcon, Trash2, Pencil, Play
} from 'lucide-react';
import CreateResourceModal, { Resource } from './CreateResourceModal';
import { api, API_BASE_URL } from '../../../services/api';
import ExerciseBuilder from '../../../components/ExerciseBuilder';
import { SchemaExerciseBuilder } from '../../../components/exercises/schema';
import { QCMBuilder } from '../../../components/exercises/qcm';
import { TextFillBuilder } from '../../../components/exercises/text-fill';
import { MatchingBuilder } from '../../../components/exercises/matching';
import { OrderBuilder } from '../../../components/exercises/order';
import { CategorizationBuilder } from '../../../components/exercises/categorization';
import { AxisBuilder } from '../../../components/exercises/axis';
import { EstimationBuilder } from '../../../components/exercises/estimation';

// Players
import { QCMPlayer } from '../../../components/exercises/qcm';
import { SchemaExercisePlayer } from '../../../components/exercises/schema';
import { TextFillPlayer } from '../../../components/exercises/text-fill';
import { MatchingPlayer } from '../../../components/exercises/matching';
import { OrderPlayer } from '../../../components/exercises/order';
import { CategorizationPlayer } from '../../../components/exercises/categorization';
import { AxisPlayer } from '../../../components/exercises/axis';
import { EstimationPlayer } from '../../../components/exercises/estimation';

interface ResourceLibraryProps {
  isOpen: boolean;
  token: string | null;
  userId: string;
  structure: any;
  onClose: () => void;
  onLinkToNode?: (resource: Resource, nodeId: string) => void;
  mode?: 'browse' | 'select-for-node';
  targetNodeId?: string;
  targetNodeLabel?: string;
}

const CATEGORIES = [
  { id: 'bases-theoriques', label: 'Bases Théoriques', icon: '📚', color: 'blue', description: 'QCM, Anatomie, Physiologie, Définitions' },
  { id: 'observation', label: 'Observation', icon: '👁️', color: 'purple', description: 'Vidéos, Photos, Placement de points' },
  { id: 'raisonnement', label: 'Raisonnement', icon: '🧠', color: 'cyan', description: 'Cas cliniques, Diagnostics, Tableaux' },
  { id: 'pratique', label: 'Pratique & Soins', icon: '🛠️', color: 'green', description: 'Médiations, Parcours, Étapes de séance' },
  { id: 'defis', label: 'Défis Ludiques', icon: '🏆', color: 'yellow', description: 'Millionnaire, Course de chevaux, Pendu' },
];

const FILIERES = [
  { id: 'standard', label: 'Standard', icon: '📋', description: 'Exercices génériques multi-filières' },
  { id: 'psychomot', label: 'Psychomotricité', icon: '🧘', description: 'Approche holistique du patient' },
];

// Helper pour le label du type d'exercice
const getExerciseTypeLabel = (type?: string): string => {
  const labels: Record<string, string> = {
    'qcm': '📋 QCM',
    'schema': '🖼️ Schéma',
    'text-fill': '✍️ Texte à trous',
    'order': '🔢 Ordre',
    'matching': '🔗 Associations',
    'axis': '📊 Classement',
    'estimation': '🎯 Estimation',
    'categorization': '📂 Catégorisation',
    'video': '🎥 Vidéo',
    'crossword': '🧩 Mots croisés',
    'millionaire': '💰 Millionnaire',
  };
  return labels[type || ''] || type || 'Inconnu';
};

// Composant pour prévisualiser le contenu d'un exercice
function ExerciseContentPreview({ exerciseType, exerciseData }: { exerciseType?: string; exerciseData: string }) {
  try {
    const data = JSON.parse(exerciseData);
    
    switch (exerciseType) {
      case 'qcm':
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-white font-medium">{data.title || 'QCM sans titre'}</p>
            <p className="text-gray-400 text-xs">{data.questions?.length || 0} question(s)</p>
            {data.questions?.slice(0, 2).map((q: any, i: number) => (
              <div key={i} className="pl-2 border-l-2 border-blue-500/50 text-xs text-gray-300">
                {i + 1}. {q.question?.substring(0, 60)}{q.question?.length > 60 ? '...' : ''}
              </div>
            ))}
            {(data.questions?.length || 0) > 2 && (
              <p className="text-xs text-gray-500 italic">+ {data.questions.length - 2} autres questions</p>
            )}
          </div>
        );
        
      case 'schema':
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-white font-medium">{data.title || 'Schéma sans titre'}</p>
            <p className="text-gray-400 text-xs">{data.points?.length || data.zones?.length || 0} zone(s) à identifier</p>
            {data.imageUrl && (
              <img src={data.imageUrl} alt="Schéma" className="w-full h-24 object-cover rounded border border-gray-700" />
            )}
          </div>
        );
        
      case 'text-fill':
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-white font-medium">{data.title || 'Texte à trous'}</p>
            <p className="text-gray-400 text-xs">{data.gaps?.length || 0} trou(s) à compléter</p>
            <p className="text-gray-400 text-xs">Mode: {data.mode === 'drag-drop' ? 'Glisser-déposer' : 'Saisie'}</p>
            {data.content && (
              <p className="text-xs text-gray-300 line-clamp-3">{data.content.substring(0, 100)}...</p>
            )}
          </div>
        );
        
      case 'order':
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-white font-medium">{data.title || 'Exercice d\'ordre'}</p>
            <p className="text-gray-400 text-xs">{data.items?.length || 0} élément(s) à ordonner</p>
            {data.items?.slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                <span className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-[10px]">{i + 1}</span>
                {item.text?.substring(0, 40)}{item.text?.length > 40 ? '...' : ''}
              </div>
            ))}
          </div>
        );
        
      case 'matching':
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-white font-medium">{data.title || 'Associations'}</p>
            <p className="text-gray-400 text-xs">{data.pairs?.length || 0} paire(s) à associer</p>
            {data.pairs?.slice(0, 2).map((pair: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-blue-300">{pair.left?.substring(0, 20)}</span>
                <span className="text-gray-500">↔</span>
                <span className="text-green-300">{pair.right?.substring(0, 20)}</span>
              </div>
            ))}
          </div>
        );
        
      case 'axis':
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-white font-medium">{data.title || 'Classement sur axe'}</p>
            <p className="text-gray-400 text-xs">{data.items?.length || 0} élément(s) à placer</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-300">{data.minLabel || data.minValue}</span>
              <div className="flex-1 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
              <span className="text-purple-300">{data.maxLabel || data.maxValue}</span>
            </div>
          </div>
        );
        
      case 'estimation':
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-white font-medium">{data.title || 'Estimation'}</p>
            <p className="text-gray-400 text-xs">{data.questions?.length || 0} question(s) d'estimation</p>
            {data.questions?.slice(0, 2).map((q: any, i: number) => (
              <div key={i} className="text-xs text-gray-300">
                • {q.question?.substring(0, 50)}... (±{q.tolerance || 5}%)
              </div>
            ))}
          </div>
        );
        
      case 'categorization':
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-white font-medium">{data.title || 'Catégorisation'}</p>
            <p className="text-gray-400 text-xs">{data.categories?.length || 0} catégorie(s)</p>
            {data.categories?.slice(0, 3).map((cat: any, i: number) => (
              <div key={i} className="text-xs text-gray-300">
                📁 {cat.name} ({cat.items?.length || 0} items)
              </div>
            ))}
          </div>
        );
        
      default:
        return (
          <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400">
            Aperçu non disponible pour ce type d'exercice
          </div>
        );
    }
  } catch (e) {
    return (
      <div className="bg-red-900/20 rounded-lg p-3 text-sm text-red-400">
        Erreur de lecture des données
      </div>
    );
  }
}

export default function ResourceLibrary({
  isOpen,
  token,
  userId,
  structure,
  onClose,
  onLinkToNode,
  mode = 'browse',
  targetNodeId,
  targetNodeLabel
}: ResourceLibraryProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'document' | 'exercise'>('all');
  const [selectedFiliere, setSelectedFiliere] = useState<'all' | 'standard' | 'psychomot'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'document' | 'exercise'>('document');
  
  // Builder state for editing
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderType, setBuilderType] = useState<'qcm' | 'schema' | 'text-fill' | 'matching' | 'order' | 'categorization' | 'axis' | 'estimation'>('qcm');
  
  // Player state for testing
  const [showPlayer, setShowPlayer] = useState(false);

  // Helper to extract image
  const getResourceImage = (resource: Resource) => {
    if (resource.type === 'exercise' && resource.exerciseType === 'schema' && resource.exerciseData) {
      try {
        const data = JSON.parse(resource.exerciseData);
        return data.imageUrl;
      } catch { return null; }
    }
    return null;
  };

  // Charger les ressources
  useEffect(() => {
    if (isOpen) {
      loadResources();
    }
  }, [isOpen]);

  const loadResources = async () => {
    setLoading(true);
    try {
      // Fallback localStorage (Simulated "API")
      const saved = localStorage.getItem(`resources-${userId}`);
      const savedResources = saved ? JSON.parse(saved) : [];
      setResources(savedResources);
    } catch {
      const saved = localStorage.getItem(`resources-${userId}`);
      const savedResources = saved ? JSON.parse(saved) : [];
      setResources(savedResources);
    }
    setLoading(false);
  };

  // Sauvegarder localement
  const saveResources = (newResources: Resource[]) => {
    const userResources = newResources.filter(r => !r.id.startsWith('example-'));
    localStorage.setItem(`resources-${userId}`, JSON.stringify(userResources));
    setResources(newResources);
  };

  // Filtrer les ressources
  const filteredResources = resources.filter(r => {
    if (selectedType !== 'all' && r.type !== selectedType) return false;
    if (selectedCategory && r.category !== selectedCategory) return false;
    if (selectedFiliere !== 'all' && r.filiere !== selectedFiliere) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || 
             r.description?.toLowerCase().includes(q) ||
             r.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  // Créer une ressource
  const handleCreateResource = (data: Partial<Resource>) => {
    const newResource: Resource = {
      id: `resource-${Date.now()}`,
      type: createType,
      name: data.name || 'Nouvelle ressource',
      description: data.description,
      category: data.category || 'autres',
      filiere: data.filiere,
      tags: data.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exerciseType: data.exerciseType,
      exerciseData: data.exerciseData,
      files: data.files,
      linkedNodes: []
    };
    saveResources([...resources, newResource]);
    setShowCreateModal(false);
    setSelectedResource(newResource);
  };

  // Supprimer une ressource
  const handleDeleteResource = (id: string) => {
    if (confirm('Supprimer cette ressource ?')) {
      saveResources(resources.filter(r => r.id !== id));
      if (selectedResource?.id === id) setSelectedResource(null);
    }
  };

  // Editer une ressource
  const handleEditResource = (resource: Resource) => {
    if (resource.type !== 'exercise' || !resource.exerciseType) {
        alert('Seuls les exercices peuvent être édités ici.');
        return;
    }
    // Set builder type - support all exercise types
    const supportedTypes = ['qcm', 'schema', 'text-fill', 'matching', 'order', 'categorization', 'axis', 'estimation'];
    if (supportedTypes.includes(resource.exerciseType)) {
        setBuilderType(resource.exerciseType as any);
        setSelectedResource(resource);
        setShowBuilder(true);
    } else {
        alert(`Type d'exercice "${resource.exerciseType}" non supporté par l'éditeur rapide.`);
    }
  };

  const handleSaveEditedResource = (data: any) => {
    if (!selectedResource) return;
    
    // Prepare updated resource
    const updatedResource: Resource = {
        ...selectedResource,
        exerciseData: typeof data === 'string' ? data : JSON.stringify(data),
        updatedAt: new Date().toISOString()
    };
    
    // Update local state and storage
    const newResources = resources.map(r => r.id === updatedResource.id ? updatedResource : r);
    saveResources(newResources);
    
    setShowBuilder(false);
    setSelectedResource(updatedResource); // Update selection to reflect changes immediately
  };

  // Lier à un nœud
  const handleLinkResource = (resource: Resource) => {
    if (mode === 'select-for-node' && onLinkToNode) {
      onLinkToNode(resource, targetNodeId || '');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1d24] w-[95vw] h-[95vh] rounded-xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151820]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bibliothèque de Ressources</h2>
              {mode === 'select-for-node' && targetNodeLabel && (
                <p className="text-xs text-purple-400">Sélectionner pour : {targetNodeLabel}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm w-64 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="all">Tous types</option>
              <option value="document">📄 Documents</option>
              <option value="exercise">🎯 Exercices</option>
            </select>

            <select
              value={selectedFiliere}
              onChange={(e) => setSelectedFiliere(e.target.value as any)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="all">Toutes filières</option>
              <option value="standard">📋 Standard</option>
              <option value="psychomot">🧘 Psychomotricité</option>
            </select>

            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
              >
                <List size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setCreateType('document'); setShowCreateModal(true); }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-xs font-bold"
              >
                <Plus size={14} /> Doc
              </button>
              <button
                onClick={() => { setCreateType('exercise'); setShowCreateModal(true); }}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-xs font-bold"
              >
                <Plus size={14} /> Exercice
              </button>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-red-600/20 rounded-lg text-red-400">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-[#151820] border-r border-white/10 p-4 overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Catégories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${!selectedCategory ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                <span>📚</span> Toutes
                <span className="ml-auto text-xs text-gray-500">{resources.length}</span>
              </button>
              {CATEGORIES.map(cat => {
                const count = resources.filter(r => r.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all group ${selectedCategory === cat.id ? `bg-${cat.color}-600/20 text-${cat.color}-400` : 'text-gray-400 hover:bg-gray-800'}`}
                    title={cat.description}
                  >
                    <span>{cat.icon}</span> 
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{cat.label}</div>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
            {/* Filières */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Filières</h3>
              {FILIERES.map(fil => (
                <button
                  key={fil.id}
                  onClick={() => setSelectedFiliere(selectedFiliere === fil.id ? 'all' : fil.id as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:bg-gray-800 rounded-lg text-sm mb-1 group ${selectedFiliere === fil.id ? 'bg-purple-600/20 text-purple-400' : ''}`}
                >
                  <span className="text-base">{fil.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="text-xs">{fil.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">Aucune ressource trouvée</p>
              </div>
            ) : (
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                {filteredResources.map(resource => (
                  <div 
                    key={resource.id} 
                    className="bg-[#252830] rounded-xl p-4 border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer group"
                    onClick={() => setSelectedResource(resource)}
                  >
                    <div className="flex items-start justify-between mb-3">
                        {getResourceImage(resource) ? (
                            <img 
                                src={getResourceImage(resource) || ''} 
                                className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-700"
                                alt="Thumbnail"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex';
                                }}
                            />
                        ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${resource.type === 'exercise' ? 'bg-purple-900/30' : 'bg-blue-900/30'}`}>
                                {resource.type === 'exercise' ? '🎯' : '📄'}
                            </div>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {mode === 'select-for-node' && (
                                <button onClick={(e) => { e.stopPropagation(); handleLinkResource(resource); }} className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white">
                                <LinkIcon size={12} />
                                </button>
                            )}
                            {!resource.id.startsWith('example-') && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); handleEditResource(resource); }} className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 rounded text-blue-400">
                                    <Pencil size={12} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteResource(resource.id); }} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded text-red-400">
                                    <Trash2 size={12} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <h4 className="text-white font-medium text-sm mb-1 line-clamp-2">{resource.name}</h4>
                    {resource.exerciseType && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600/20 text-amber-300 mb-2">
                        {getExerciseTypeLabel(resource.exerciseType)}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{resource.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel détail */}
          {selectedResource && (
            <div className="w-96 bg-[#151820] border-l border-white/10 p-4 overflow-y-auto">
               {getResourceImage(selectedResource) && (
                   <img 
                       src={getResourceImage(selectedResource) || ''} 
                       className="w-full h-48 object-cover rounded-lg mb-4 bg-slate-900 border border-slate-700 shadow-md"
                       alt="Preview"
                       onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                   />
               )}
               <h3 className="text-lg font-bold text-white mb-2">{selectedResource.name}</h3>
               
               {/* Type badge */}
               <div className="flex flex-wrap gap-2 mb-4">
                 <span className={`px-2 py-1 rounded-full text-xs font-bold ${selectedResource.type === 'exercise' ? 'bg-purple-600/30 text-purple-300' : 'bg-blue-600/30 text-blue-300'}`}>
                   {selectedResource.type === 'exercise' ? '🎯 Exercice' : '📄 Document'}
                 </span>
                 {selectedResource.exerciseType && (
                   <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-600/30 text-amber-300">
                     {getExerciseTypeLabel(selectedResource.exerciseType)}
                   </span>
                 )}
                 {selectedResource.filiere && (
                   <span className="px-2 py-1 rounded-full text-xs font-bold bg-cyan-600/30 text-cyan-300">
                     {selectedResource.filiere === 'psychomot' ? '🧘 Psychomot' : '📋 Standard'}
                   </span>
                 )}
               </div>

               {mode === 'select-for-node' && (
                    <button
                      onClick={() => handleLinkResource(selectedResource)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium mb-4"
                    >
                      <LinkIcon size={16} /> Utiliser cette ressource
                    </button>
               )}
               
               <p className="text-sm text-gray-400 mb-4">{selectedResource.description || 'Pas de description'}</p>
               
               {/* Tags */}
               {selectedResource.tags && selectedResource.tags.length > 0 && (
                 <div className="mb-4">
                   <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Tags</h4>
                   <div className="flex flex-wrap gap-1">
                     {selectedResource.tags.map((tag, i) => (
                       <span key={i} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                         {tag}
                       </span>
                     ))}
                   </div>
                 </div>
               )}
               
               {/* Exercise Content Preview */}
               {selectedResource.type === 'exercise' && selectedResource.exerciseData && (
                 <div className="mb-4">
                   <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Contenu de l'exercice</h4>
                   <ExerciseContentPreview 
                     exerciseType={selectedResource.exerciseType} 
                     exerciseData={selectedResource.exerciseData} 
                   />
                 </div>
               )}
               
               {/* Metadata */}
               <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-gray-500">
                 <p>📅 Créé le {new Date(selectedResource.createdAt).toLocaleDateString('fr-FR')}</p>
                 <p>🔄 Modifié le {new Date(selectedResource.updatedAt).toLocaleDateString('fr-FR')}</p>
                 {selectedResource.linkedNodes && selectedResource.linkedNodes.length > 0 && (
                   <p>🔗 Lié à {selectedResource.linkedNodes.length} nœud(s)</p>
                 )}
               </div>
               
               {/* Actions */}
               {!selectedResource.id.startsWith('example-') && (
                 <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                   {/* Play button for exercises */}
                   {selectedResource.type === 'exercise' && selectedResource.exerciseData && (
                     <button 
                       onClick={() => setShowPlayer(true)} 
                       className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white text-sm font-bold"
                     >
                       <Play size={16} /> Tester l'exercice
                     </button>
                   )}
                   <div className="flex gap-2">
                     <button 
                       onClick={() => handleEditResource(selectedResource)} 
                       className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm"
                     >
                       <Pencil size={14} /> Modifier
                     </button>
                     <button 
                       onClick={() => handleDeleteResource(selectedResource.id)} 
                       className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg text-red-400 text-sm"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateResourceModal
          type={createType}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateResource}
          token={token || ''}
        />
      )}

      {/* Builders for Editing */}
      {showBuilder && builderType === 'qcm' && selectedResource && (
        <div className="fixed inset-0 z-[70]">
          <QCMBuilder
            nodeId="library-resource"
            nodeLabel={selectedResource.name}
            initialConfig={selectedResource.exerciseData ? JSON.parse(selectedResource.exerciseData) : undefined}
            onSave={(config) => handleSaveEditedResource(config)}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'schema' && selectedResource && (
        <div className="fixed inset-0 z-[70]">
          <SchemaExerciseBuilder
            nodeId="library-resource"
            nodeLabel={selectedResource.name}
            initialConfig={selectedResource.exerciseData ? JSON.parse(selectedResource.exerciseData) : undefined}
            token={token || ''}
            onSave={(config) => handleSaveEditedResource(config)}
            onCancel={() => setShowBuilder(false)}
            onImageSelected={async (file) => {
               return URL.createObjectURL(file);
            }}
          />
        </div>
      )}

      {showBuilder && builderType === 'text-fill' && selectedResource && (
        <div className="fixed inset-0 z-[70]">
          <TextFillBuilder
            nodeId="library-resource"
            nodeLabel={selectedResource.name}
            initialConfig={selectedResource.exerciseData ? JSON.parse(selectedResource.exerciseData) : undefined}
            onSave={(config) => handleSaveEditedResource(config)}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'matching' && selectedResource && (
        <div className="fixed inset-0 z-[70]">
          <MatchingBuilder
            nodeId="library-resource"
            nodeLabel={selectedResource.name}
            token={token || ''}
            initialConfig={selectedResource.exerciseData ? JSON.parse(selectedResource.exerciseData) : undefined}
            onSave={(config) => handleSaveEditedResource(config)}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'order' && selectedResource && (
        <div className="fixed inset-0 z-[70]">
          <OrderBuilder
            nodeId="library-resource"
            nodeLabel={selectedResource.name}
            token={token || ''}
            initialConfig={selectedResource.exerciseData ? JSON.parse(selectedResource.exerciseData) : undefined}
            onSave={(config) => handleSaveEditedResource(config)}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'categorization' && selectedResource && (
        <div className="fixed inset-0 z-[70]">
          <CategorizationBuilder
            nodeId="library-resource"
            initialConfig={selectedResource.exerciseData ? JSON.parse(selectedResource.exerciseData) : undefined}
            onSave={(config) => handleSaveEditedResource(config)}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'axis' && selectedResource && (
        <div className="fixed inset-0 z-[70]">
          <AxisBuilder
            nodeId="library-resource"
            initialConfig={selectedResource.exerciseData ? JSON.parse(selectedResource.exerciseData) : undefined}
            onSave={(config) => handleSaveEditedResource(config)}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'estimation' && selectedResource && (
        <div className="fixed inset-0 z-[70]">
          <EstimationBuilder
            nodeId="library-resource"
            initialConfig={selectedResource.exerciseData ? JSON.parse(selectedResource.exerciseData) : undefined}
            onSave={(config) => handleSaveEditedResource(config)}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {/* Players for testing exercises */}
      {showPlayer && selectedResource && selectedResource.exerciseData && (
        <ExercisePlayerModal 
          exerciseType={selectedResource.exerciseType}
          exerciseData={selectedResource.exerciseData}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </div>
  );
}

// Modal wrapper for exercise players
function ExercisePlayerModal({ 
  exerciseType, 
  exerciseData, 
  onClose 
}: { 
  exerciseType?: string; 
  exerciseData: string; 
  onClose: () => void;
}) {
  const config = JSON.parse(exerciseData);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ score: number; total: number } | null>(null);
  
  const handleQCMComplete = (answers: Record<string, number[]>, score: number) => {
    const total = config.questions?.length || 1;
    setResults({ score, total: score }); // QCM returns score directly
    setShowResults(true);
  };
  
  const handleTextFillComplete = (answers: Record<string, string>, score: number) => {
    const total = config.gaps?.length || 1;
    setResults({ score, total });
    setShowResults(true);
  };
  
  const handleOrderSubmit = (submission: any) => {
    // Calculate score from submission
    const correct = submission.answers.filter((id: string, idx: number) => {
      const item = config.items?.find((i: any) => i.id === id);
      return item?.correctPosition === idx + 1;
    }).length;
    setResults({ score: correct, total: config.items?.length || 1 });
    setShowResults(true);
  };
  
  const handleMatchingSubmit = (submission: any) => {
    const correct = Object.entries(submission.answers || {}).filter(([leftId, rightId]) => {
      const pair = config.pairs?.find((p: any) => p.id === leftId);
      return pair?.rightId === rightId;
    }).length;
    setResults({ score: correct, total: config.pairs?.length || 1 });
    setShowResults(true);
  };
  
  const handleAxisSubmit = (submission: any) => {
    // Axis exercises - simplified scoring
    setResults({ score: 1, total: 1 });
    setShowResults(true);
  };
  
  const handleEstimationSubmit = (submission: any) => {
    setResults({ score: 1, total: 1 });
    setShowResults(true);
  };
  
  const handleCategorizationSubmit = (submission: any) => {
    setResults({ score: 1, total: 1 });
    setShowResults(true);
  };
  
  if (showResults && results) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4">
        <div className="bg-[#1a1d24] rounded-2xl w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4">{results.score >= results.total * 0.7 ? '🎉' : '💪'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Exercice terminé !</h3>
          <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-4">
            {Math.round(results.score / results.total * 100)}%
          </p>
          <p className="text-gray-400 mb-6">Score: {results.score}/{results.total}</p>
          <button 
            onClick={onClose} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4">
      <div className="bg-[#1a1d24] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Play size={20} className="text-green-400" />
            Test de l'exercice
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-red-600/20 rounded-lg text-red-400">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {exerciseType === 'qcm' && (
            <QCMPlayer 
              config={config} 
              onComplete={handleQCMComplete}
            />
          )}
          {exerciseType === 'text-fill' && (
            <TextFillPlayer 
              config={config} 
              onComplete={handleTextFillComplete}
            />
          )}
          {exerciseType === 'order' && (
            <OrderPlayer 
              config={config}
              studentId="test-user"
              studentName="Testeur"
              onSubmit={handleOrderSubmit}
              onCancel={onClose}
            />
          )}
          {exerciseType === 'matching' && (
            <MatchingPlayer 
              config={config}
              studentId="test-user"
              studentName="Testeur"
              onSubmit={handleMatchingSubmit}
              onCancel={onClose}
            />
          )}
          {exerciseType === 'axis' && (
            <AxisPlayer 
              config={config}
              studentId="test-user"
              studentName="Testeur"
              onSubmit={handleAxisSubmit}
              onCancel={onClose}
            />
          )}
          {exerciseType === 'estimation' && (
            <EstimationPlayer 
              config={config}
              studentId="test-user"
              studentName="Testeur"
              onSubmit={handleEstimationSubmit}
              onCancel={onClose}
            />
          )}
          {exerciseType === 'categorization' && (
            <CategorizationPlayer 
              config={config}
              studentId="test-user"
              studentName="Testeur"
              onSubmit={handleCategorizationSubmit}
              onCancel={onClose}
            />
          )}
          {exerciseType === 'schema' && (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">🖼️</div>
              <p>Le lecteur de schéma nécessite le contexte d'un nœud.</p>
              <p className="text-sm mt-2">Utilisez le mode "Étudiant" pour tester.</p>
            </div>
          )}
          {!['qcm', 'schema', 'text-fill', 'order', 'matching', 'axis', 'estimation', 'categorization'].includes(exerciseType || '') && (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">🚧</div>
              <p>Lecteur non disponible pour ce type d'exercice</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}