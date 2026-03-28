'use client';

import { X, BookOpen, PlayCircle, Code, Loader2, Send, FileText, Download, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE_URL } from '../services/api';

interface ContentPanelProps {
  node: any;
  onClose: () => void;
}

export default function ContentPanel({ node, onClose }: ContentPanelProps) {
  const router = useRouter();
  const { token, user } = useAuth();
  const [lesson, setLesson] = useState<{title: string, content: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmission(''); // Reset submission text on node change
    if (node?.id) {
        setLoading(true);
        // Récupérer la leçon associée au noeud
        api.get<any>(`lessons/${node.id}`)
            .then(data => {
                if (data.content) {
                    setLesson(data);
                } else {
                    setLesson(null);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }
  }, [node]);

  if (!node) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-slate-800 border-l border-slate-700 shadow-2xl z-50 overflow-y-auto text-white p-6 animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-800 pb-4 border-b border-slate-700 z-10">
        <div>
            <h2 className="text-2xl font-bold text-blue-400">{node.label}</h2>
            <p className="text-xs font-mono text-slate-500 uppercase">{node.id} • {node.type}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-6">
        
        {/* Boutons d'accès au cours et exercice interactif */}
        <div className="grid grid-cols-2 gap-3">
          {node.courseContent && (
            <button
              onClick={() => {
                  if (node.isUnlocked !== false) {
                      router.push(`/exercise/${node.id}`);
                  } else {
                      alert('Ce cours est verrouillé. Validez les prérequis d\'abord !');
                  }
              }}
              disabled={node.isUnlocked === false}
              className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all shadow-lg ${
                  node.isUnlocked !== false
                  ? 'bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 hover:shadow-blue-500/20'
                  : 'bg-slate-700 opacity-50 cursor-not-allowed border border-slate-600'
              }`}
            >
              {node.isUnlocked !== false ? <BookOpen size={24} /> : <div className="text-2xl">🔒</div>}
              <span className="text-sm font-bold">{node.isUnlocked !== false ? "Voir le cours" : "Verrouillé"}</span>
            </button>
          )}
          
          {node.exerciseType && node.exerciseType !== 'none' && node.exerciseData && (
            <button
              onClick={() => {
                  if (node.isUnlocked !== false) { // Default to true if undefined
                      router.push(`/exercise/${node.id}?tab=exercise`);
                  } else {
                      alert('Cet exercice est verrouillé. Validez les prérequis d\'abord !');
                  }
              }}
              disabled={node.isUnlocked === false}
              className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all shadow-lg ${
                  node.isUnlocked !== false
                  ? 'bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 hover:shadow-purple-500/20'
                  : 'bg-slate-700 opacity-50 cursor-not-allowed border border-slate-600'
              }`}
            >
              {node.isUnlocked !== false ? <PlayCircle size={24} /> : <div className="text-2xl">🔒</div>}
              <span className="text-sm font-bold">{node.isUnlocked !== false ? "Faire l'exercice" : "Verrouillé"}</span>
              <span className="text-xs text-purple-200 uppercase">{node.exerciseType}</span>
            </button>
          )}
        </div>

        {/* Fichiers attachés (PDF, DOC, etc.) - HIDDEN for schema exercises (they contain the solution!) */}
        {node.attachedFiles && node.exerciseType !== 'schema' && (() => {
          try {
            const files = typeof node.attachedFiles === 'string' ? JSON.parse(node.attachedFiles) : node.attachedFiles;
            if (files.length > 0) {
              return (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <FileText size={16} /> Supports de cours
                  </h3>
                  <div className="space-y-2">
                    {files.map((file: any) => (
                      <div key={file.filename} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-blue-500 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {file.mimetype?.includes('pdf') ? '📄' : file.mimetype?.includes('image') ? '🖼️' : '📝'}
                          </span>
                          <div>
                            <p className="text-white font-medium text-sm">{file.originalName}</p>
                            <p className="text-xs text-slate-500">{Math.round(file.size / 1024)} Ko</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`${API_BASE_URL}/uploads/file/${file.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                            title="Ouvrir"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <a
                            href={`${API_BASE_URL}/uploads/file/${file.filename}`}
                            download={file.originalName}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          } catch { return null; }
          return null;
        })()}

        {/* Contenu Dynamique */}
        {loading ? (
            <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        ) : lesson ? (
            <div className="prose prose-invert prose-blue max-w-none">
                <h1 className="text-xl font-bold text-white mb-4">{lesson.title}</h1>
                <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>
        ) : !node.attachedFiles || (typeof node.attachedFiles === 'string' ? JSON.parse(node.attachedFiles || '[]') : node.attachedFiles).length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-600 rounded-xl">
                <p className="text-slate-500 italic">Aucun contenu pédagogique pour le moment.</p>
                {/* Fallback sur les types hardcodés pour la démo */}
                {node.contentType === 'exercise' && (
                    <div className="mt-4 flex justify-center">
                         <button 
                            onClick={() => router.push(`/exercise/${node.id}`)}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors border border-blue-500/30"
                            >
                            <Code className="text-green-400 shrink-0" size={16} />
                            <span>Démarrer l'exercice (Legacy)</span>
                        </button>
                    </div>
                )}
            </div>
        ) : null}

        {/* --- SECTION EXERCICE / PROJET --- */}
        {(node.exerciseDescription || node.type === 'Project') && (
            <div className="pt-6 border-t border-slate-700 mt-8 pb-10">
                <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                    <Code size={20}/> Exercice à réaliser
                </h3>
                
                {node.exerciseDescription && (
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-purple-500/20 mb-4 text-sm text-slate-300">
                        <ReactMarkdown>{node.exerciseDescription}</ReactMarkdown>
                    </div>
                )}

                <div className="space-y-3">
                    <button 
                        onClick={() => router.push(`/exercise/${node.id}`)}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <PlayCircle size={20} />
                        Accéder à l'exercice
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
