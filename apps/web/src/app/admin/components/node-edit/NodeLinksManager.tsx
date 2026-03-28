'use client';

import { Link as LinkIcon, X, Plus, ArrowRight, ArrowLeft, MousePointer } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../../services/api';

interface NodeLinksManagerProps {
  data: any;
  onChange: (data: any) => void;
  structure: any;
  token: string | null;
  onRefresh: () => void;
  // Props héritées (peuvent être ignorées si on gère en local)
  newLink: any;
  setNewLink: (link: any) => void;
  onCreateLink: () => void;
  // Link Picking
  linkPickMode?: { mode: 'pick-parent' | 'pick-child', nodeId: string } | null;
  onEnterLinkPickMode?: (mode: 'pick-parent' | 'pick-child', nodeId: string) => void;
  onCancelLinkPickMode?: () => void;
}

export default function NodeLinksManager({
  data,
  structure,
  token,
  onRefresh,
  linkPickMode,
  onEnterLinkPickMode,
  onCancelLinkPickMode
}: NodeLinksManagerProps) {
  const [selectedParentToAdd, setSelectedParentToAdd] = useState<string>('');
  const [selectedChildToAdd, setSelectedChildToAdd] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // === HELPERS ===

  const getAllNodes = () => {
    if (!structure) return [];
    return Object.values(structure).flatMap((galaxy: any) =>
      Object.values(galaxy.groups).flatMap((group: any) =>
        group.nodes.map((node: any) => ({
          ...node,
          fullLabel: `${node.label} (${galaxy.name})` // Pour l'affichage
        }))
      )
    );
  };

  const allNodes = getAllNodes();

  // Retrieve the latest version of the current node from the structure
  // This ensures we have the latest 'unlocksIds' which might be missing from the 'data' prop (form state)
  const currentNode = allNodes.find(n => n.id === data.id) || data;

  const getPrerequisites = () => {
    // Search in all nodes for those who unlock the current node
    return allNodes.filter(node => node.unlocksIds?.includes(data.id));
  };

  const getChildren = () => {
    if (!currentNode.unlocksIds) return [];
    return currentNode.unlocksIds.map((targetId: string) => {
        const found = allNodes.find(n => n.id === targetId);
        return found ? found : null;
    }).filter((n: any) => n !== null);
  };

  const prerequisites = getPrerequisites();
  const children = getChildren();
  
  const isPickingParent = linkPickMode?.mode === 'pick-parent' && linkPickMode.nodeId === data.id;
  const isPickingChild = linkPickMode?.mode === 'pick-child' && linkPickMode.nodeId === data.id;

  // === ACTIONS ===

  const handleAddLink = async (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId) return;
    setLoading(true);
    try {
      await api.post('graph/relationship', {
        source: sourceId,
        target: targetId,
        type: 'UNLOCKS'
      }, token);
      onRefresh();
      setSelectedParentToAdd('');
      setSelectedChildToAdd('');
    } catch (e) {
      alert('Erreur lors de la création du lien');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (sourceId: string, targetId: string) => {
    if (!confirm('Supprimer ce lien ?')) return;
    setLoading(true);
    try {
      await api.delete(`graph/relationship/${sourceId}/${targetId}/UNLOCKS`, token);
      onRefresh();
    } catch (e) {
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  if (!data) return null;

  // Filter lists for dropdowns to avoid loops or duplicates
  const availableParents = allNodes.filter(n => 
    n.id !== data.id && 
    !prerequisites.some((p: any) => p.id === n.id) &&
    !children.some((c: any) => c.id === n.id) // Avoid immediate cycles for sanity
  );

  const availableChildren = allNodes.filter(n => 
    n.id !== data.id && 
    !children.some((c: any) => c.id === n.id) && 
    !prerequisites.some((p: any) => p.id === n.id)
  );

  return (
    <div className="mt-4 pt-4 border-t-2 border-purple-500/30">
      <h4 className="text-sm font-bold text-purple-400 uppercase mb-4 flex items-center gap-2">
        <LinkIcon size={16}/> Connexions & Déblocage
      </h4>

      {/* PARENTS SECTION */}
      <div className={`mb-6 bg-slate-900/50 p-4 rounded-lg border ${isPickingParent ? 'border-yellow-500 animate-pulse' : 'border-slate-700'}`}>
        <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2">
            <ArrowLeft size={12} /> Nœuds Parents (Prérequis)
            </label>
            {onEnterLinkPickMode && (
                <button
                    onClick={() => isPickingParent ? onCancelLinkPickMode?.() : onEnterLinkPickMode('pick-parent', data.id)}
                    className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                        isPickingParent 
                        ? 'bg-yellow-600 text-white border-yellow-500' 
                        : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700'
                    }`}
                >
                    <MousePointer size={10} />
                    {isPickingParent ? 'Annuler sélection' : 'Cliquer pour lier'}
                </button>
            )}
        </div>
        
        {/* List */}
        <div className="space-y-2 mb-3">
          {prerequisites.length > 0 ? prerequisites.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-slate-800 p-2 rounded text-xs border border-slate-700">
               <span className="text-slate-300">{p.label} <span className="text-slate-500">({p.galaxyName})</span></span>
               <button 
                 onClick={() => handleDeleteLink(p.id, data.id)}
                 className="text-red-400 hover:text-red-300 p-1"
               >
                 <X size={14} />
               </button>
            </div>
          )) : (
            <p className="text-xs text-slate-600 italic">Aucun parent (nœud racine ou indépendant)</p>
          )}
        </div>

        {/* Add */}
        <div className="flex gap-2">
            <select 
                className="flex-1 bg-slate-950 border border-slate-700 rounded text-xs p-2 text-white"
                value={selectedParentToAdd}
                onChange={(e) => setSelectedParentToAdd(e.target.value)}
            >
                <option value="">-- Ajouter un parent --</option>
                {availableParents.map(n => (
                    <option key={n.id} value={n.id}>{n.fullLabel}</option>
                ))}
            </select>
            <button 
                onClick={() => handleAddLink(selectedParentToAdd, data.id)}
                disabled={!selectedParentToAdd || loading}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded disabled:opacity-50"
            >
                <Plus size={16} />
            </button>
        </div>
      </div>

      {/* CHILDREN SECTION */}
      <div className={`bg-slate-900/50 p-4 rounded-lg border ${isPickingChild ? 'border-yellow-500 animate-pulse' : 'border-slate-700'}`}>
        <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2">
            <ArrowRight size={12} /> Nœuds Enfants (Débloqués)
            </label>
            {onEnterLinkPickMode && (
                <button
                    onClick={() => isPickingChild ? onCancelLinkPickMode?.() : onEnterLinkPickMode('pick-child', data.id)}
                    className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                        isPickingChild 
                        ? 'bg-yellow-600 text-white border-yellow-500' 
                        : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700'
                    }`}
                >
                    <MousePointer size={10} />
                    {isPickingChild ? 'Annuler sélection' : 'Cliquer pour lier'}
                </button>
            )}
        </div>

        {/* List */}
        <div className="space-y-2 mb-3">
          {children.length > 0 ? children.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between bg-slate-800 p-2 rounded text-xs border border-slate-700">
               <span className="text-slate-300">{c.label} <span className="text-slate-500">({c.galaxy || '?'})</span></span>
               <button 
                 onClick={() => handleDeleteLink(data.id, c.id)}
                 className="text-red-400 hover:text-red-300 p-1"
               >
                 <X size={14} />
               </button>
            </div>
          )) : (
            <p className="text-xs text-slate-600 italic">Aucun enfant (nœud final)</p>
          )}
        </div>

        {/* Add */}
        <div className="flex gap-2">
            <select 
                className="flex-1 bg-slate-950 border border-slate-700 rounded text-xs p-2 text-white"
                value={selectedChildToAdd}
                onChange={(e) => setSelectedChildToAdd(e.target.value)}
            >
                <option value="">-- Ajouter un enfant --</option>
                {availableChildren.map(n => (
                    <option key={n.id} value={n.id}>{n.fullLabel}</option>
                ))}
            </select>
            <button 
                onClick={() => handleAddLink(data.id, selectedChildToAdd)}
                disabled={!selectedChildToAdd || loading}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded disabled:opacity-50"
            >
                <Plus size={16} />
            </button>
        </div>
      </div>

    </div>
  );
}
