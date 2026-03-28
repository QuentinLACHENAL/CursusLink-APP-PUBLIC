'use client';

import { FolderTree, Edit, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../../../services/api';

interface StructureTreeViewProps {
  structure: any;
  token: string;
  selectedNodeData: any;
  onRefresh: () => void;
  onNodeClick: (node: any) => void;
  // On passe toutes les actions ici
  graphActions: any; 
}

export default function StructureTreeView({ 
  structure, 
  token, 
  selectedNodeData,
  onRefresh,
  onNodeClick,
  graphActions
}: StructureTreeViewProps) {
  
  const { createGalaxy, renameGalaxy, createSystem, deleteGalaxy, renameSystem, deleteSystem, renameNode, deleteNodeById, createNodeInGroup } = graphActions;

  const handleCreateGalaxy = () => createGalaxy();

  const handleRenameGalaxy = (galaxy: any) => {
    const newName = prompt('Nouveau nom pour cette constellation (matière) ?', galaxy.name);
    if (!newName || newName === galaxy.name) return;
    renameGalaxy(galaxy.name, newName);
  };

  const handleCreateSystem = (galaxy: any) => createSystem(galaxy.name);

  const handleDeleteGalaxy = (galaxy: any) => deleteGalaxy(galaxy.name);

  const handleRenameSystem = (galaxy: any, group: any) => {
    const newName = prompt('Nouveau nom pour cette étoile (chapitre) ?', group.name);
    if (!newName || newName === group.name) return;
    renameSystem(galaxy.name, group.name, newName);
  };

  const handleDeleteSystem = (galaxy: any, group: any) => {
    if (!confirm(`Supprimer l'étoile "${group.name}" et tous ses nœuds ?\n\nCette action est irréversible !`)) return;
    deleteSystem(galaxy.name, group.name);
  };

  const handleRenameNode = (group: any, node: any) => {
    const newLabel = prompt('Nouveau nom pour cette planète (cours/exercice) ?', node.label);
    if (!newLabel || newLabel === node.label) return;
    renameNode(node, newLabel);
  };

  const handleDeleteNode = (node: any) => deleteNodeById(node);

  function safeNumber(val: any): number {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }

  const handleFileUpload = async (galaxy: any, group: any, files: FileList) => {
    // ... (Keep existing logic for now, migrated to use api service in next step if critical)
    // For now, let's keep it but use API_BASE_URL which is imported.
    // Ideally this should move to a useFileUpload hook.
    for (const file of Array.from(files)) {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const label = prompt(`Nom de la planète pour "${file.name}" ?`, fileName);
      if (!label) continue;
      
      try {
        // Use raw fetch for now as it's complex multipart logic specific to this view
        const nodeRes = await fetch(`${API_BASE_URL}/graph/node`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            galaxy: galaxy.name,
            group: group.name,
            label,
            type: file.name.toLowerCase().includes('exo') ? 'exercise' : 'topic',
            xp: 100,
            unlockCondition: 'AND'
          })
        });
        const newNodeData = await nodeRes.json();
        
        // Link to previous
        if (group.nodes.length > 0) {
          const lastNode = group.nodes[group.nodes.length - 1];
          await fetch(`${API_BASE_URL}/graph/relationship`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              source: lastNode.id,
              target: newNodeData.id,
              type: 'UNLOCKS'
            })
          });
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        await fetch(`${API_BASE_URL}/uploads/node/${newNodeData.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
      } catch (err) {
        console.error(err);
        alert(`❌ Erreur lors de la création pour "${file.name}"`);
      }
    }
    
    alert(`✅ ${files.length} planète(s) créée(s) avec fichiers attachés !`);
    onRefresh();
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 min-h-0 bg-slate-950/30 rounded-lg p-2 border border-slate-800/50">
      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 sticky top-0 bg-slate-900/90 pb-2 border-b border-slate-800 z-10 flex items-center gap-2">
        <FolderTree size={12}/> Hiérarchie
      </h4>
      
      <button 
        onClick={handleCreateGalaxy}
        className="w-full mb-4 py-2 bg-blue-900/30 text-blue-400 border border-blue-900/50 rounded text-xs font-bold hover:bg-blue-900/50 transition-colors"
      >
        + Nouvelle Constellation
      </button>

      {Object.values(structure).map((galaxy: any) => (
        <div key={galaxy.name} className="mb-6">
          <h3 className="font-black text-white uppercase text-sm mb-2 border-b border-slate-700 pb-1 flex justify-between items-center bg-slate-800/50 p-1 rounded">
            <span 
                className="cursor-pointer hover:text-blue-300 transition-colors"
                onClick={() => {
                    // Find first star in galaxy to zoom to
                    const firstGroup = Object.values(galaxy.groups)[0] as any;
                    if (firstGroup) {
                        const star = firstGroup.nodes.find((n: any) => n.orbitRing === 0 || n.type === 'star' || n.type === 'region');
                        if (star) onNodeClick(star);
                    }
                }}
            >
                {galaxy.name}
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => handleRenameGalaxy(galaxy)}
                className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-900/50 border border-blue-900/50"
              >
                <Edit size={10}/>
              </button>
              <button 
                onClick={() => handleCreateSystem(galaxy)}
                className="text-[10px] bg-slate-700 px-2 py-0.5 rounded hover:bg-slate-600 border border-slate-600"
              >
                + Étoile
              </button>
              <button 
                onClick={() => handleDeleteGalaxy(galaxy)}
                className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded hover:bg-red-900/50 border border-red-900/50"
              >
                <Trash2 size={10}/>
              </button>
            </div>
          </h3>
          
          {Object.values(galaxy.groups).map((group: any) => (
            <div key={group.name} className="ml-2 mb-3 border-l-2 border-slate-700 pl-3">
              <div className="flex items-center justify-between group mb-1 hover:bg-slate-900/50 rounded px-1 transition-colors">
                <span 
                    className="text-sm text-blue-300 font-bold cursor-pointer hover:text-blue-200"
                    onClick={() => {
                        // Find central star
                        const star = group.nodes.find((n: any) => n.orbitRing === 0 || n.type === 'star' || n.type === 'region');
                        if (star) onNodeClick(star);
                    }}
                >
                    {group.name}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => createNodeInGroup(galaxy.name, group.name, group.nodes)}
                    className="text-[10px] bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-800"
                  >
                    + Planète
                  </button>
                  <label className="text-[10px] bg-emerald-900/50 text-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-800 cursor-pointer">
                    📄 + Fichier
                    <input 
                      type="file" 
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(galaxy, group, e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                  <button 
                    onClick={() => handleRenameSystem(galaxy, group)}
                    className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-900/50"
                  >
                    <Edit size={10}/>
                  </button>
                  <button 
                    onClick={() => handleDeleteSystem(galaxy, group)}
                    className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded hover:bg-red-900/50"
                  >
                    <Trash2 size={10}/>
                  </button>
                </div>
              </div>
              
              <div className="space-y-0.5">
                {group.nodes.map((node: any) => (
                  <div 
                    key={node.id} 
                    className={`text-xs ml-2 px-2 py-1.5 rounded flex items-center justify-between group/node transition-colors ${selectedNodeData?.id === node.id ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-900/50' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => onNodeClick(node)}>
                      {node.type === 'Project' ? <span className="text-purple-400">★</span> : <span className="w-1.5 h-1.5 rounded-full bg-slate-600 block"></span>} 
                      <span className="truncate">{node.label}</span>
                      <span className="text-[9px] text-emerald-500 ml-auto mr-2 font-mono">{safeNumber(node.xp)} XP</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRenameNode(group, node)}
                        className="text-[9px] bg-blue-900/30 text-blue-400 px-1 py-0.5 rounded hover:bg-blue-900/50"
                      >
                        <Edit size={9}/>
                      </button>
                      <button 
                        onClick={() => handleDeleteNode(node)}
                        className="text-[9px] bg-red-900/30 text-red-400 px-1 py-0.5 rounded hover:bg-red-900/50"
                      >
                        <Trash2 size={9}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
