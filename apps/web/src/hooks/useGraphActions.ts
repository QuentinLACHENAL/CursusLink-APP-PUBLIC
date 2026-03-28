import { useState } from 'react';
import { api } from '../services/api';

interface GraphActionsProps {
  token: string | null;
  structure: any;
  onRefresh: () => void;
  addAction: (action: any) => void;
}

export function useGraphActions({ token, structure, onRefresh, addAction }: GraphActionsProps) {
  // Local state for forms
  const [newNode, setNewNode] = useState({ id: '', label: '', group: '', type: 'topic', xp: 100, unlockCondition: 'AND', galaxy: 'Général' });
  const [newLink, setNewLink] = useState({ source: '', target: '', type: 'UNLOCKS' });
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  const createNode = (data?: any) => {
    const nodeToCreate = data || newNode;
    if (!nodeToCreate.label) return alert('Label requis');
    if (!nodeToCreate.group) return alert('Système requis');
    if (!nodeToCreate.galaxy) return alert('Galaxie requise');
    
    // Check duplicates
    if (structure && structure[nodeToCreate.galaxy]?.groups[nodeToCreate.group]) {
        const existingNode = structure[nodeToCreate.galaxy].groups[nodeToCreate.group].nodes.find(
            (n: any) => n.label.toLowerCase() === nodeToCreate.label.toLowerCase()
        );
        if (existingNode) {
            return alert(`❌ Un nœud avec le label "${nodeToCreate.label}" existe déjà dans ce système !`);
        }
    }
    
    api.createNode(nodeToCreate, token)
      .then((createdNode) => {
        alert(`Nœud "${nodeToCreate.label}" créé dans le système "${nodeToCreate.group}" !`);
        addAction({ type: 'create', description: `Créé "${nodeToCreate.label}"`, data: { nodeId: createdNode.id, nodeData: createdNode } });
        setNewNode({ id: '', label: '', group: nodeToCreate.group, type: 'topic', xp: 100, unlockCondition: 'AND', galaxy: nodeToCreate.galaxy });
        onRefresh();
      })
      .catch(err => alert('Erreur création: ' + err.message));
  };

  const updateNode = (data?: any, silent = true) => {
    const nodeToUpdate = data || selectedNodeData;
    if (!nodeToUpdate) return;
    const previousData = { ...nodeToUpdate };

    // Filter only DTO-allowed properties (remove frontend-computed fields)
    const allowedFields = [
      'label', 'type', 'group', 'galaxy', 'constellation', 'parentStar', 'orbitRing',
      'xp', 'level', 'unlockCondition', 'exerciseDescription', 'evaluationGrid',
      'gradingGrid', 'minimumScore', 'courseContent', 'exerciseType', 'validationType',
      'peerValidationConfig', 'exerciseData', 'visualConfig', 'fx', 'fy', 'unlockedBy'
    ];
    const filteredData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in nodeToUpdate && nodeToUpdate[key] !== undefined) {
        filteredData[key] = nodeToUpdate[key];
      }
    }

    api.updateNode(nodeToUpdate.id, filteredData, token)
      .then(() => {
        if (!silent) alert('✅ Noeud mis à jour !');
        addAction({ type: 'update', description: `Modifié "${nodeToUpdate.label}"`, data: { nodeId: nodeToUpdate.id, previousData, newData: nodeToUpdate } });
        // Update local selection if we are editing the selected node
        if (selectedNodeData && selectedNodeData.id === nodeToUpdate.id) {
             setSelectedNodeData(nodeToUpdate);
        }
        onRefresh();
      })
      .catch(err => alert('❌ Erreur mise à jour: ' + err.message));
  };

  const deleteNode = () => {
    if (!selectedNodeData || !confirm('Supprimer ce noeud ?')) return;
    const deletedData = { ...selectedNodeData };
    api.deleteNode(selectedNodeData.id, token)
      .then(() => {
        alert(' Noeud supprimé');
        addAction({ type: 'delete', description: `Supprimé "${deletedData.label}"`, data: { nodeId: deletedData.id, nodeData: deletedData } });
        setSelectedNodeData(null);
        onRefresh();
      })
      .catch(err => alert('Erreur suppression: ' + err.message));
  };

  const createLink = () => {
    if (!newLink.source || !newLink.target) return alert('Source et Cible requises');
    api.createRelationship(newLink.source, newLink.target, newLink.type, token)
      .then(() => {
        alert('Lien créé !');
        setNewLink({ ...newLink, source: '', target: '' });
        onRefresh();
      })
      .catch(err => alert('Erreur lien: ' + err.message));
  };

  const createNodeInGroup = async (galaxy: string, group: string, nodes: any[]) => {
      const label = prompt('Nom de la nouvelle planète (cours/exercice) ?');
      if (!label) return;
      
      const existingNode = nodes.find((n: any) => n.label.toLowerCase() === label.toLowerCase());
      if (existingNode) {
          alert(`❌ Une planète avec le label "${label}" existe déjà dans ce système !`);
          return;
      }
      
      try {
          let fx = undefined;
          let fy = undefined;
          
          if (nodes.length > 0) {
              const lastNode = nodes[nodes.length - 1];
              if (lastNode.fx !== undefined && lastNode.fy !== undefined) {
                  const angle = Math.random() * Math.PI * 2;
                  const distance = 150 + Math.random() * 50; 
                  fx = lastNode.fx + Math.cos(angle) * distance;
                  fy = lastNode.fy + Math.sin(angle) * distance;
              }
          }
          
          const nodeData: any = {
              galaxy,
              group,
              label,
              type: 'topic',
              xp: 100,
              unlockCondition: 'AND'
          };
          
          if (fx !== undefined && fy !== undefined) {
              nodeData.fx = fx;
              nodeData.fy = fy;
          }
          
          const newNodeData = await api.createNode(nodeData, token);
          
          if (nodes.length > 0) {
              const lastNode = nodes[nodes.length - 1];
              try {
                  await api.createRelationship(lastNode.id, newNodeData.id, 'UNLOCKS', token);
                  alert(`✅ Planète "${label}" créée et liée à "${lastNode.label}" !`);
              } catch (e) {
                  alert(`✅ Planète "${label}" créée, mais échec du lien automatique`);
              }
          } else {
              alert(`✅ Planète "${label}" créée (première du système) !`);
          }
          
          onRefresh();
      } catch (e: any) {
          console.error('Erreur:', e);
          alert('❌ Erreur lors de la création: ' + e.message);
      }
  };

  const createGalaxy = async () => {
    const galaxyName = prompt('Nom de la nouvelle constellation (matière) ?');
    if (!galaxyName) return;
    
    if (structure[galaxyName]) {
      alert('❌ Une constellation avec ce nom existe déjà !');
      return;
    }
    
    const groupName = prompt('Nom de la première étoile (chapitre) dans cette constellation ?', 'Introduction');
    if (!groupName) return;
    
    const label = prompt('Label de la première planète (cours/exercice) ?', 'Départ');
    if (!label) return;
    
    try {
      await api.createNode({
        galaxy: galaxyName,
        group: groupName,
        label: label,
        type: 'topic',
        xp: 100,
        unlockCondition: 'AND'
      }, token);
      
      alert(`✅ Constellation "${galaxyName}" créée avec le nœud "${label}" dans l'étoile "${groupName}"`);
      onRefresh();
    } catch (e: any) {
      alert('❌ Erreur lors de la création: ' + e.message);
    }
  };

  const renameGalaxy = async (oldName: string, newName: string) => {
    if (!structure[oldName]) return;
    try {
      // Pour renommer une galaxie, on doit mettre à jour tous ses nœuds.
      // C'est lourd, idéalement le backend devrait avoir un endpoint dédié pour renommer une Constellation.
      const nodeIds = Object.values(structure[oldName].groups).flatMap((g: any) => g.nodes.map((n: any) => n.id));
      
      // On le fait un par un pour l'instant (car pas d'endpoint batch update)
      // TODO: Créer endpoint batch update ou rename constellation
      for (const nodeId of nodeIds) {
        await api.updateNode(nodeId, { galaxy: newName }, token);
      }
      alert(`✅ Constellation renommée: "${oldName}" → "${newName}"`);
      onRefresh();
    } catch (e: any) {
      alert('❌ Erreur lors du renommage: ' + e.message);
    }
  };

  const createSystem = async (galaxyName: string) => {
    const groupName = prompt('Nom de la nouvelle étoile (chapitre) ?');
    if (!groupName) return;
    
    if (structure[galaxyName]?.groups[groupName]) {
      alert('❌ Une étoile avec ce nom existe déjà dans cette constellation !');
      return;
    }
    
    const label = prompt('Label de la première planète (cours/exercice) dans cette étoile ?', 'Nouveau cours');
    if (!label) return;
    
    try {
      await api.createNode({
        galaxy: galaxyName,
        group: groupName,
        label: label,
        type: 'topic',
        xp: 100,
        unlockCondition: 'AND'
      }, token);
      
      alert(`✅ Étoile "${groupName}" créée dans "${galaxyName}" avec le nœud "${label}"`);
      onRefresh();
    } catch (e: any) {
      alert('❌ Erreur lors de la création: ' + e.message);
    }
  };

  const deleteGalaxy = async (galaxyName: string) => {
    if (!confirm(`Supprimer TOUTE la constellation "${galaxyName}" et tous ses nœuds ?\n\nCette action est irréversible !`)) return;
    
    try {
      const result = await api.deleteGalaxy(galaxyName, token);
      alert(`✅ Constellation "${galaxyName}" supprimée (${result.deletedCount} nœuds effacés)`);
      onRefresh();
    } catch (e: any) {
      alert('❌ Erreur lors de la suppression: ' + e.message);
    }
  };

  const renameSystem = async (galaxyName: string, oldGroupName: string, newName: string) => {
    if (!structure[galaxyName]?.groups[oldGroupName]) return;
    
    try {
      const nodes = structure[galaxyName].groups[oldGroupName].nodes;
      for (const node of nodes) {
        await api.updateNode(node.id, { group: newName }, token);
      }
      alert(`✅ Étoile renommée: "${oldGroupName}" → "${newName}"`);
      onRefresh();
    } catch (e: any) {
      alert('❌ Erreur lors du renommage: ' + e.message);
    }
  };

  const deleteSystem = async (galaxyName: string, groupName: string) => {
    if (!confirm(`Supprimer l'étoile "${groupName}" et tous ses nœuds ?\n\nCette action est irréversible !`)) return;
    
    try {
      const result = await api.deleteSystem(galaxyName, groupName, token);
      alert(`✅ Étoile "${groupName}" supprimée (${result.deletedCount} nœuds effacés)`);
      onRefresh();
    } catch (e: any) {
      alert('❌ Erreur lors de la suppression: ' + e.message);
    }
  };

  const renameNode = async (node: any, newLabel: string) => {
      // Check duplicate in same group
      // Note: structure access might be tricky if not passed updated
      // Assuming caller did validation or backend will catch it (ID collision risk if ID based on name)
      // But updateNode doesn't change ID usually, just label.
      
      try {
        await api.updateNode(node.id, { label: newLabel }, token);
        alert(`✅ Planète renommée: "${node.label}" → "${newLabel}"`);
        onRefresh();
      } catch (e: any) {
        alert('❌ Erreur lors du renommage: ' + e.message);
      }
  };

  const deleteNodeById = async (node: any) => {
    if (!confirm(`Supprimer la planète "${node.label}" ?\n\nCette action est irréversible !`)) return;
    
    try {
      await api.deleteNode(node.id, token);
      alert(`✅ Planète "${node.label}" supprimée`);
      onRefresh();
    } catch (e: any) {
      alert('❌ Erreur lors de la suppression: ' + e.message);
    }
  };

  return {
    newNode,
    setNewNode,
    newLink,
    setNewLink,
    selectedNodeData,
    setSelectedNodeData,
    createNode,
    updateNode,
    deleteNode,
    createLink,
    createNodeInGroup,
    // Structural actions
    createGalaxy,
    renameGalaxy,
    deleteGalaxy,
    createSystem,
    renameSystem,
    deleteSystem,
    renameNode,
    deleteNodeById
  };
}
