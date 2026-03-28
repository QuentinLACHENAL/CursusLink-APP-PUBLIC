'use client';

import { Hexagon, Layers, MapPin, X, Eye } from 'lucide-react';

interface ContextMenuProps {
  position: { x: number; y: number; screenX: number; screenY: number };
  onClose: () => void;
  onCreateGalaxy: () => void;
  onCreateSystem: () => void;
  onCreateNode: () => void;
  onShowGuides?: () => void;
}

export default function ContextMenu({
  position,
  onClose,
  onCreateGalaxy,
  onCreateSystem,
  onCreateNode,
  onShowGuides
}: ContextMenuProps) {
  return (
    <>
      {/* Overlay pour fermer le menu */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      
      {/* Menu contextuel */}
      <div 
        className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 min-w-[200px]"
        style={{ 
          left: position.screenX, 
          top: position.screenY,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="px-3 py-2 border-b border-slate-700 flex justify-between items-center">
          <span className="text-xs text-slate-400 uppercase font-bold">Créer un élément</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={14} />
          </button>
        </div>
        
        <button
          onClick={() => { onCreateGalaxy(); onClose(); }}
          className="w-full px-4 py-3 text-left hover:bg-blue-900/30 flex items-center gap-3 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Hexagon size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">✨ Constellation</div>
            <div className="text-[10px] text-slate-500">Nouvelle matière</div>
          </div>
        </button>
        
        <button
          onClick={() => { onCreateSystem(); onClose(); }}
          className="w-full px-4 py-3 text-left hover:bg-purple-900/30 flex items-center gap-3 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Layers size={16} className="text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">⭐ Étoile</div>
            <div className="text-[10px] text-slate-500">Nouveau chapitre</div>
          </div>
        </button>
        
        <button
          onClick={() => { onCreateNode(); onClose(); }}
          className="w-full px-4 py-3 text-left hover:bg-green-900/30 flex items-center gap-3 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <MapPin size={16} className="text-green-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">🪐 Planète</div>
            <div className="text-[10px] text-slate-500">Nouveau cours/exercice</div>
          </div>
        </button>

        {onShowGuides && (
          <button
            onClick={() => { onShowGuides(); onClose(); }}
            className="w-full px-4 py-3 text-left hover:bg-cyan-900/30 flex items-center gap-3 transition-colors border-t border-slate-700/50"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Eye size={16} className="text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Guides</div>
              <div className="text-[10px] text-slate-500">Afficher les guides de placement</div>
            </div>
          </button>
        )}

        <div className="px-3 py-2 border-t border-slate-700 mt-1">
          <p className="text-[9px] text-slate-600 text-center">
            Position: ({Math.round(position.x)}, {Math.round(position.y)})
          </p>
        </div>
      </div>
    </>
  );
}
