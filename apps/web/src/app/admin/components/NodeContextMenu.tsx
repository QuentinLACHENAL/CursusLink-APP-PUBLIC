'use client';

import { Edit, Trash2, FileText, Gamepad2, Link2, Copy, Move, Eye, Plus } from 'lucide-react';

interface NodeContextMenuProps {
  node: any;
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onEditContent: () => void;
  onEditExercise: () => void;
  onManageLinks: () => void;
  onDuplicate: () => void;
  onViewAsStudent: () => void;
  onToggleGuide?: () => void;
  isGuideVisible?: boolean;
}

export default function NodeContextMenu({
  node,
  x,
  y,
  onClose,
  onRename,
  onDelete,
  onEditContent,
  onEditExercise,
  onManageLinks,
  onDuplicate,
  onViewAsStudent,
  onToggleGuide,
  isGuideVisible
}: NodeContextMenuProps) {
  const hasExercise = node.exerciseType || node.exerciseData;
  const isStar = node.orbitRing === 0 || node.type === 'star' || node.type === 'region';
  
  return (
    <>
      {/* Overlay pour fermer */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      
      {/* Menu */}
      <div 
        className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 min-w-[200px]"
        style={{ 
          left: Math.min(x, window.innerWidth - 220),
          top: Math.min(y, window.innerHeight - 350)
        }}
      >
        {/* Header avec info nœud */}
        <div className="px-3 py-2 border-b border-slate-700">
          <div className="font-bold text-white text-sm truncate max-w-[180px]">{node.label}</div>
          <div className="text-[10px] text-slate-500">{node.galaxy} / {node.group}</div>
          <div className="text-[10px] text-emerald-400">{node.xp || 0} XP</div>
        </div>

        {/* Actions */}
        <div className="py-1">
          <button
            onClick={() => { onRename(); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-3"
          >
            <Edit size={14} className="text-blue-400" />
            Renommer
          </button>
          
          <button
            onClick={() => { onEditContent(); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-3"
          >
            <FileText size={14} className="text-green-400" />
            Modifier le contenu
          </button>
          
          {/* Toujours afficher l'option exercice */}
          <button
            onClick={() => { onEditExercise(); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-3"
          >
            {hasExercise ? (
              <>
                <Gamepad2 size={14} className="text-purple-400" />
                <span>Modifier l'exercice</span>
                <span className="ml-auto text-[10px] bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded">
                  {node.exerciseType?.toUpperCase() || 'CONFIG'}
                </span>
              </>
            ) : (
              <>
                <Plus size={14} className="text-purple-400" />
                <span>Ajouter un exercice</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => { onManageLinks(); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-3"
          >
            <Link2 size={14} className="text-yellow-400" />
            Gérer les liens
          </button>

          <div className="border-t border-slate-700 my-1" />
          
          <button
            onClick={() => { onDuplicate(); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-3"
          >
            <Copy size={14} className="text-cyan-400" />
            Dupliquer
          </button>
          
          <button
            onClick={() => { onViewAsStudent(); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-3"
          >
            <Eye size={14} className="text-slate-400" />
            {hasExercise ? 'Vue exercice étudiant' : 'Vue étudiant'}
          </button>

          {isStar && onToggleGuide && (
            <button
              onClick={() => { onToggleGuide(); onClose(); }}
              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-3"
            >
              <Eye size={14} className={isGuideVisible ? "text-cyan-400" : "text-slate-500"} />
              {isGuideVisible ? 'Masquer le guide' : 'Afficher le guide'}
            </button>
          )}

          <div className="border-t border-slate-700 my-1" />
          
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/30 flex items-center gap-3"
          >
            <Trash2 size={14} />
            Supprimer
          </button>
        </div>
      </div>
    </>
  );
}
