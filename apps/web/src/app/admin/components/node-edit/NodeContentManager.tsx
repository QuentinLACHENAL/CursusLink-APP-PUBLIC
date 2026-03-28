'use client';

import { useState } from 'react';
import { Upload, Trash2, Eye, FolderOpen, Settings, FileText, X } from 'lucide-react';
import { api, API_BASE_URL } from '../../../../services/api';

interface NodeContentManagerProps {
  data: any;
  onChange: (data: any) => void;
  token: string | null;
  onRefresh: () => void;
  setShowExerciseBuilder: (show: boolean) => void;
  setExerciseBuilderType: (type: 'qcm' | 'schema' | 'matching' | 'order' | 'axis' | 'estimation' | 'text-fill' | 'none') => void;
  onOpenContentViewer?: (file: any, allFiles: any[]) => void;
  onOpenResourceLibrary?: (mode: 'browse' | 'select-for-node', nodeId?: string, nodeLabel?: string) => void;
  onDeleteNode?: () => void;
}

export default function NodeContentManager({
  data,
  onChange,
  token,
  onRefresh,
  setShowExerciseBuilder,
  setExerciseBuilderType,
  onOpenContentViewer,
  onOpenResourceLibrary,
  onDeleteNode
}: NodeContentManagerProps) {
  const [showTextEditor, setShowTextEditor] = useState(false);

  const handleFileDelete = async (file: any) => {
    if (!confirm(`Supprimer "${file.originalName}" ?`)) return;
    try {
      await api.delete(`uploads/node/${data.id}/file/${file.filename}`, token);
      
      // Update local state immediately
      let currentFiles = typeof data.attachedFiles === 'string'
        ? JSON.parse(data.attachedFiles)
        : data.attachedFiles || [];
      
      const newFiles = currentFiles.filter((f: any) => f.filename !== file.filename);
      
      onChange({
        ...data,
        attachedFiles: newFiles
      });

      alert('✅ Fichier supprimé');
      onRefresh();
    } catch (e) {
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    try {
      const result = await api.post<any>(`uploads/node/${data.id}/multiple`, formData, token, true);
      alert(`✅ ${result.uploadedFiles.length} fichier(s) uploadé(s) avec succès !`);
      onRefresh();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('❌ Erreur lors de l\'upload: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Capture currentTarget before async operation
    const textarea = e.currentTarget;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (!data.id) {
        alert('Veuillez d\'abord sauvegarder le nœud avant de glisser des images.');
        return;
      }
      
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return;

      try {
        const formData = new FormData();
        formData.append('files', file);
        const result = await api.post<any>(`uploads/node/${data.id}/multiple`, formData, token, true);
        
        if (result.uploadedFiles && result.uploadedFiles.length > 0) {
            const uploadedFile = result.uploadedFiles[0];
            const imageUrl = `${API_BASE_URL}/uploads/file/${uploadedFile.filename}`;
            const markdownImage = `\n![${file.name}](${imageUrl})\n`;
            
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = data.courseContent || '';
            
            const newText = text.substring(0, start) + markdownImage + text.substring(end);
            
            onChange({...data, courseContent: newText});
        }
      } catch (err: any) {
        console.error(err);
        alert('Erreur upload image: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-700 mt-2">
      
      {/* 1. TEXTE DU COURS */}
      <div>
        <button 
          onClick={() => setShowTextEditor(true)}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold text-white flex items-center justify-center gap-2"
        >
          <FileText size={14} />
          Éditer le contenu textuel
        </button>
      </div>

      {/* Modal Éditeur Texte */}
      {showTextEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-blue-400" />
                Contenu du cours (Markdown)
              </h2>
              <button onClick={() => setShowTextEditor(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4">
              <textarea 
                className="w-full h-full bg-slate-950 border border-slate-700 rounded p-4 text-sm text-white font-mono focus:border-blue-500 outline-none resize-none"
                placeholder="# Titre du cours\n\nGlissez-déposez des images ici...\n\nVotre contenu..."
                value={data.courseContent || ''}
                onChange={(e) => onChange({...data, courseContent: e.target.value})}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              />
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
               <p className="text-xs text-slate-500">💡 Glissez-déposez une image pour l'insérer</p>
               <button 
                 onClick={() => setShowTextEditor(false)}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold"
               >
                 Terminer
               </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FICHIERS ATTACHÉS & SUPPRESSION */}
      <div>
        <h4 className="text-[10px] text-slate-400 font-bold uppercase mb-2">📎 Supports & Actions</h4>
        
        {data.id ? (
          <div className="mb-3">
            {data.attachedFiles && (() => {
              try {
                const files = typeof data.attachedFiles === 'string' 
                  ? JSON.parse(data.attachedFiles) 
                  : data.attachedFiles;
                return files.length > 0 ? (
                  <div className="space-y-1 mb-3">
                    {files.map((file: any) => (
                      <div key={file.filename} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-700 hover:border-blue-500 transition-colors group">
                        <button 
                          onClick={() => onOpenContentViewer?.(file, files)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        >
                          <span className="text-lg">
                            {file.mimetype?.includes('pdf') ? '📄' : file.mimetype?.includes('image') ? '🖼️' : '📝'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-slate-300 truncate block group-hover:text-blue-400">{file.originalName}</span>
                            <span className="text-[9px] text-slate-500">({Math.round(file.size / 1024)} Ko)</span>
                          </div>
                        </button>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => onOpenContentViewer?.(file, files)}
                            className="text-[9px] bg-blue-900/30 text-blue-400 px-2 py-1 rounded hover:bg-blue-900/50"
                          >
                            <Eye size={10}/>
                          </button>
                          <button
                            onClick={() => handleFileDelete(file)}
                            className="text-[9px] bg-red-900/30 text-red-400 px-2 py-1 rounded hover:bg-red-900/50"
                          >
                            <Trash2 size={10}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              } catch { return null; }
            })()}
            
            {/* Barre d'outils Fichiers + Bibliothèque + Poubelle */}
            <div className="flex gap-2">
              <label className="flex-1 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer text-xs">
                <Upload size={14} />
                Ajouter fichier
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              
              {onOpenResourceLibrary && (
                <button
                  onClick={() => onOpenResourceLibrary('select-for-node', data.id, data.label)}
                  className="py-2 px-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg text-xs"
                  title="Lier depuis la bibliothèque"
                >
                  <FolderOpen size={14} />
                </button>
              )}

              {onDeleteNode && (
                <button 
                  onClick={onDeleteNode} 
                  className="py-2 px-3 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-900/50 transition-all text-xs"
                  title="Supprimer le nœud"
                >
                  <Trash2 size={14}/>
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-2">
            Sauvegardez pour ajouter des fichiers
          </p>
        )}
      </div>

      {/* 3. EXERCICE INTERACTIF (Déplacé en bas) */}
      <div className="pt-2 border-t border-slate-700 mt-2">
        <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block">Type d'exercice interactif</label>
        
        {/* Cartes de sélection */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { value: 'none', label: 'Aucun', icon: '❌', desc: 'Pas d\'exercice' },
            { value: 'qcm', label: 'QCM', icon: '📋', desc: 'Questions à choix' },
            { value: 'schema', label: 'Schéma', icon: '🖼️', desc: 'Identifier sur image' },
            { value: 'text-fill', label: 'Texte à trous', icon: '✍️', desc: 'Compléter un texte' },
            { value: 'order', label: 'Ordre', icon: '🔢', desc: 'Remettre en ordre' },
            { value: 'matching', label: 'Associations', icon: '🔗', desc: 'Relier des paires' },
            { value: 'axis', label: 'Classement', icon: '📊', desc: 'Sur un axe' },
            { value: 'estimation', label: 'Estimation', icon: '🎯', desc: 'Curseur/Échelle' },
            { value: 'video', label: 'Vidéo', icon: '🎥', desc: 'Interactive', disabled: true },
          ].map((opt) => {
            const currentType = data.exerciseType || 'none';
            const isSelected = currentType === opt.value;
            return (
              <button
                key={opt.value}
                disabled={opt.disabled}
                onClick={() => {
                  onChange({...data, exerciseType: opt.value, exerciseData: opt.value === 'none' ? null : data.exerciseData});
                  if (opt.value !== 'none' && !opt.disabled) {
                    setExerciseBuilderType(opt.value as any);
                    setShowExerciseBuilder(true);
                  }
                }}
                className={`p-3 rounded-lg border text-left transition-all ${ 
                  isSelected 
                    ? 'border-purple-500 bg-purple-900/30 ring-1 ring-purple-500' 
                    : opt.disabled 
                      ? 'border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${isSelected ? 'text-purple-300' : 'text-white'}`}>{opt.label}</p>
                    <p className="text-[9px] text-slate-500 truncate">{opt.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bouton Configurer / Reconfigurer */}
        {data.exerciseType && data.exerciseType !== 'none' && (
          <button
            onClick={() => {
              setExerciseBuilderType(data.exerciseType);
              setShowExerciseBuilder(true);
            }}
            className={`w-full py-2.5 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all text-sm ${ 
              data.exerciseData
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 animate-pulse'
            }`}
          >
            <Settings size={16} />
            {data.exerciseData ? 'Modifier l\'exercice ✓' : '⚠️ Configurer l\'exercice'}
          </button>
        )}
      </div>

      {/* Aperçu JSON */}
      {data.exerciseData && (
        <details className="mt-2">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">Voir JSON (avancé)</summary>
          <pre className="text-[9px] bg-slate-950 p-2 rounded mt-1 overflow-auto max-h-32 text-slate-400">
            {data.exerciseData}
          </pre>
        </details>
      )}

      {/* Score minimum */}
      {data.exerciseType && data.exerciseType !== 'none' && (
        <div className="mt-3">
          <label className="text-xs text-slate-400 font-medium mb-2 block">
            Score minimum de validation (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={data.minimumScore || 80}
            onChange={(e) => onChange({...data, minimumScore: parseInt(e.target.value) || 80})}
            className="w-full bg-slate-950 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
      )}

    </div>
  );
}
