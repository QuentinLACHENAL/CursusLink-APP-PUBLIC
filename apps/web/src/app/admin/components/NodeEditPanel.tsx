'use client';

import { useState, useEffect } from 'react';
import { Edit, Plus, Save } from 'lucide-react';
import NodeGeneralForm from './node-edit/NodeGeneralForm';
import NodeContentManager from './node-edit/NodeContentManager';
import NodeLinksManager from './node-edit/NodeLinksManager';
import { useAuth } from '../../../context/AuthContext';
import { useGraph } from '../../../context/GraphContext';
import { useNodeForm } from '../../../hooks/useNodeForm';

interface NodeEditPanelProps {
  viewMode: '3d' | 'tree';
  selectedNodeData: any;
  setSelectedNodeData: (data: any) => void;
  // newNode props removed
  newLink: any;
  setNewLink: (link: any) => void;
  galaxyMode: 'select' | 'new';
  setGalaxyMode: (mode: 'select' | 'new') => void;
  systemMode: 'select' | 'new';
  setSystemMode: (mode: 'select' | 'new') => void;
  onCreateNode: (data: any) => void;
  onUpdateNode: (data: any) => void;
  onDeleteNode: () => void;
  onCreateLink: () => void;
  onRefresh: () => void;
  setShowExerciseBuilder: (show: boolean) => void;
  setExerciseBuilderType: (type: 'qcm' | 'schema' | 'matching' | 'order' | 'axis' | 'estimation' | 'text-fill' | 'none') => void;
  onOpenContentViewer?: (file: any, allFiles: any[]) => void;
  onOpenResourceLibrary?: (mode: 'browse' | 'select-for-node', nodeId?: string, nodeLabel?: string) => void;
  // Link Picking Props
  linkPickMode?: { mode: 'pick-parent' | 'pick-child', nodeId: string } | null;
  onEnterLinkPickMode?: (mode: 'pick-parent' | 'pick-child', nodeId: string) => void;
  onCancelLinkPickMode?: () => void;
}

export default function NodeEditPanel({
  viewMode,
  selectedNodeData,
  setSelectedNodeData,
  newLink,
  setNewLink,
  galaxyMode,
  setGalaxyMode,
  systemMode,
  setSystemMode,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
  onCreateLink,
  onRefresh,
  setShowExerciseBuilder,
  setExerciseBuilderType,
  onOpenContentViewer,
  onOpenResourceLibrary,
  linkPickMode,
  onEnterLinkPickMode,
  onCancelLinkPickMode
}: NodeEditPanelProps) {
  const { token } = useAuth();
  const { structure } = useGraph();
  const [hasChanges, setHasChanges] = useState(false);

  // Use the new hook for form management
  const form = useNodeForm(selectedNodeData);

  // Reset hasChanges when selecting a different node
  useEffect(() => {
    setHasChanges(false);
  }, [selectedNodeData?.id]);

  // En vue 3D, masquer le panneau si aucun nœud n'est sélectionné
  if (viewMode === '3d' && !selectedNodeData) {
    return null;
  }

  // Simple onChange handler - just update data and mark as changed
  const handleChange = (newData: any) => {
    form.updateFormData(newData);
    setHasChanges(true);
    // Update parent state for visual feedback in graph
    if (selectedNodeData) {
      setSelectedNodeData({ ...selectedNodeData, ...newData });
    }
  };

  // Convert form data to legacy "activeData" format for children
  const activeData = { ...form.formData, id: selectedNodeData?.id };

  // Simple save function
  const handleSave = () => {
    if (!selectedNodeData) {
      // Creation mode
      if (!form.validate()) {
        alert('Erreur: ' + Object.values(form.errors).join(', '));
        return;
      }
      onCreateNode(form.getSubmissionData());
      form.reset();
      return;
    }

    // Update mode - save to backend
    const data = form.getSubmissionData();
    onUpdateNode({ ...data, id: selectedNodeData.id });
    setHasChanges(false);
    form.markClean();
  };

  return (
    <div className={`${viewMode === 'tree' ? 'shrink-0 lg:border-l lg:border-slate-800 lg:pl-4 border-t border-slate-700 pt-4 lg:pt-0 lg:border-t-0' : 'w-full pt-4 border-t border-slate-700'} flex flex-col overflow-y-auto min-h-[50%]`}>
      <div className="flex items-center justify-between sticky top-0 bg-slate-900 py-2 z-10 border-b border-slate-800 mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          {selectedNodeData ? (
            <>
              <Edit size={14} className="text-yellow-500"/>
              <span className="truncate max-w-[120px]">{selectedNodeData.label}</span>
            </>
          ) : (
            <>
              <Plus size={14} className="text-blue-500"/>
              Création
            </>
          )}
        </h3>

        {/* Bouton Sauvegarder - visible uniquement si modifications */}
        {selectedNodeData && hasChanges && (
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg animate-pulse"
          >
            <Save size={14} />
            Sauvegarder
          </button>
        )}
      </div>
    
      {/* 1. Informations Générales */}
      <NodeGeneralForm
        data={activeData}
        onChange={handleChange}
        structure={structure}
        galaxyMode={galaxyMode}
        setGalaxyMode={setGalaxyMode}
        systemMode={systemMode}
        setSystemMode={setSystemMode}
      />

      {/* 2. Contenu (Cours, Exercices, Uploads) */}
      <NodeContentManager
        data={activeData}
        onChange={handleChange}
        token={token}
        onRefresh={onRefresh}
        setShowExerciseBuilder={setShowExerciseBuilder}
        setExerciseBuilderType={setExerciseBuilderType}
        onOpenContentViewer={onOpenContentViewer}
        onOpenResourceLibrary={onOpenResourceLibrary}
        onDeleteNode={onDeleteNode} // Pass delete handler
      />

      {/* Boutons d'action Principaux - Seulement pour création */}
      {!selectedNodeData && (
        <button onClick={handleSave} className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold mt-2">Créer le Nœud</button>
      )}
      
      {/* 3. Liens (Uniquement pour l'édition d'un nœud existant) */}
      {selectedNodeData && (
        <NodeLinksManager 
          data={selectedNodeData}
          onChange={setSelectedNodeData} // Links update the selection directly for now
          structure={structure}
          token={token}
          onRefresh={onRefresh}
          newLink={newLink}
          setNewLink={setNewLink}
          onCreateLink={onCreateLink}
          linkPickMode={linkPickMode}
          onEnterLinkPickMode={onEnterLinkPickMode}
          onCancelLinkPickMode={onCancelLinkPickMode}
        />
      )}
    </div>
  );
}