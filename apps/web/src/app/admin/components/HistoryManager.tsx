'use client';

import { useState, useEffect } from 'react';
import { History, Undo, Clock, ArrowRight } from 'lucide-react';
import { api } from '../../../services/api';

interface Action {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move';
  description: string;
  timestamp: number;
  data: any; // Données nécessaires pour le rollback
}

export function useHistory(token: string, onRefresh: () => void) {
  const [history, setHistory] = useState<Action[]>([]);

  // Ajouter une action à l'historique
  const addAction = (action: Omit<Action, 'id' | 'timestamp'>) => {
    const newAction = {
      ...action,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setHistory(prev => [newAction, ...prev].slice(0, 50)); // Garder les 50 dernières
  };

  // Annuler la dernière action
  const undo = async () => {
    if (history.length === 0) return;
    const lastAction = history[0];

    try {
      switch (lastAction.type) {
        case 'create':
          // Undo create = delete
          if (lastAction.data.nodeId) {
            await api.delete(`graph/node/${lastAction.data.nodeId}`, token);
          }
          break;
        
        case 'delete':
          // Undo delete = restore (create)
          if (lastAction.data.nodeData) {
            // Restaurer le noeud
            await api.post('graph/node', lastAction.data.nodeData, token);
            // Restaurer les liens ? (Complexe si pas sauvegardés)
          }
          break;

        case 'update':
          // Undo update = revert to previous data
          if (lastAction.data.nodeId && lastAction.data.previousData) {
            await api.patch(`graph/node/${lastAction.data.nodeId}`, lastAction.data.previousData, token);
          }
          break;

        case 'move':
          // Undo move = revert positions
          // TODO: Implémenter le undo move global
          break;
      }

      setHistory(prev => prev.slice(1));
      onRefresh();
      alert(`Action annulée : ${lastAction.description}`);
    } catch (e) {
      console.error('Undo error:', e);
      alert('Erreur lors de l\'annulation');
    }
  };

  return { history, addAction, undo, canUndo: history.length > 0 };
}

export function HistoryPanel({ history, canUndo, onUndo }: { history: Action[], canUndo: boolean, onUndo: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium relative"
      >
        <History size={14} /> 
        Historique
        {history.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h3 className="font-bold text-white text-xs flex items-center gap-2"><Clock size={12}/> Historique Local</h3>
            {canUndo && (
                <button 
                    onClick={onUndo}
                    className="flex items-center gap-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
                >
                    <Undo size={10} /> Annuler
                </button>
            )}
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {history.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs italic">Aucune action récente</div>
            ) : (
                <div className="divide-y divide-slate-800">
                    {history.map(action => (
                        <div key={action.id} className="p-3 hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getActionColor(action.type)}`}>
                                    {action.type}
                                </span>
                                <span className="text-[9px] text-slate-600">{new Date(action.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-slate-300">{action.description}</p>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getActionColor(type: string) {
    switch(type) {
        case 'create': return 'bg-green-900/30 text-green-400 border border-green-900/50';
        case 'delete': return 'bg-red-900/30 text-red-400 border border-red-900/50';
        case 'update': return 'bg-blue-900/30 text-blue-400 border border-blue-900/50';
        default: return 'bg-slate-800 text-slate-400';
    }
}