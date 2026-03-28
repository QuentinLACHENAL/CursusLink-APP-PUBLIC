'use client';

import { X } from 'lucide-react';
import { API_BASE_URL } from '../../../services/api';

interface ContentViewerProps {
  isOpen: boolean;
  file: any;
  nodeLabel: string;
  allFiles: any[];
  onClose: () => void;
}

export default function ContentViewer({ isOpen, file, nodeLabel, allFiles = [], onClose }: ContentViewerProps) {
  if (!isOpen || !file) return null;

  // Si c'est une image, on l'affiche directement
  const isImage = file.mimetype?.startsWith('image/');
  const isPDF = file.mimetype?.includes('pdf');
  
  // URL du fichier
  const fileUrl = `${API_BASE_URL}/uploads/file/${file.filename}`;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {isImage ? '🖼️' : '📄'} {file.originalName}
            </h2>
            <p className="text-xs text-slate-400">Associé à : {nodeLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href={fileUrl} 
              download 
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Télécharger
            </a>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-black/50 overflow-auto flex items-center justify-center p-4">
          {isImage ? (
            <img 
              src={fileUrl} 
              alt={file.originalName} 
              className="max-w-full max-h-full object-contain rounded shadow-lg"
            />
          ) : isPDF ? (
            <iframe 
              src={fileUrl} 
              className="w-full h-full rounded border border-slate-700"
            />
          ) : (
            <div className="text-center">
              <p className="text-slate-400 mb-4">Ce type de fichier ne peut pas être prévisualisé directement.</p>
              <a 
                href={fileUrl} 
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold inline-block"
              >
                Télécharger le fichier
              </a>
            </div>
          )}
        </div>

        {/* Footer / Thumbnails (si plusieurs fichiers) */}
        {allFiles.length > 1 && (
          <div className="p-4 border-t border-slate-700 bg-slate-800 rounded-b-xl overflow-x-auto flex gap-2">
            {allFiles.map((f, i) => (
              <button 
                key={i}
                onClick={() => {/* TODO: Switch file logic needs state lift up or internal state */}}
                className={`w-20 h-20 rounded border ${f.filename === file.filename ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-600 opacity-50 hover:opacity-100'} bg-slate-900 flex items-center justify-center relative overflow-hidden`}
              >
                {f.mimetype?.startsWith('image/') ? (
                  <img src={`${API_BASE_URL}/uploads/file/${f.filename}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📄</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}