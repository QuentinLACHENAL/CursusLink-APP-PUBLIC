'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { CheckSquare, ArrowLeft, User, Calendar, Star, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';

export default function EvaluationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [received, setReceived] = useState<any[]>([]);
  const [given, setGiven] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        Promise.all([
            api.get<any[]>(`corrections/my-requests/${user.id}`),
            api.get<any[]>(`corrections/given/${user.id}`)
        ]).then(([recData, givenData]) => {
            setReceived(recData);
            setGiven(givenData);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'VALIDATED': return 'text-green-400 border-green-500/30 bg-green-500/10';
        case 'FAILED': return 'text-red-400 border-red-500/30 bg-red-500/10';
        case 'PENDING': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
        default: return 'text-slate-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
        case 'VALIDATED': return 'Validé';
        case 'FAILED': return 'Raté';
        case 'PENDING': return 'En attente';
        default: return status;
    }
  };

  // Fonction pour filtrer les commentaires techniques/JSON
  const formatComment = (comment: string | null | undefined): string | null => {
    if (!comment) return null;

    // Si le commentaire ressemble à du JSON, ne pas l'afficher
    const trimmed = comment.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return null;
    }

    // Supprimer les sections "Détails techniques:" et le JSON qui suit
    const cleanedComment = comment.replace(/Détails techniques:\s*\{[\s\S]*\}$/g, '').trim();

    // Si après nettoyage il ne reste rien de significatif, retourner null
    if (!cleanedComment || cleanedComment.length < 3) {
      return null;
    }

    return cleanedComment;
  };

  // Fonction pour formater la date et l'heure de manière sécurisée
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'Date inconnue';

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Date inconnue';
      }
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date inconnue';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700">
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <CheckSquare className="text-green-500" /> Historique des Évaluations
            </h1>
        </div>

        {loading ? (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Colonne Gauche : Reçus */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="bg-blue-600 w-2 h-6 rounded-full"></span>
                        Avis Reçus
                        <span className="text-sm font-normal text-slate-500 ml-2">({received.length})</span>
                    </h2>
                    
                    {received.length === 0 && <p className="text-slate-500 italic">Aucune évaluation reçue.</p>}

                    {received.map(c => (
                        <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg hover:border-slate-700 transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{c.projectLabel || 'Projet inconnu'}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                        <Calendar size={12}/> {formatDate(c.updatedAt || c.createdAt)}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(c.status)}`}>
                                    {getStatusLabel(c.status)}
                                </span>
                            </div>

                            {c.corrector ? (
                                <div className="flex items-center gap-3 mb-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    {c.corrector.avatarUrl ? (
                                        <img src={c.corrector.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                                            {c.corrector.firstName[0]}{c.corrector.lastName[0]}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-300">
                                            Corrigé par <span className="text-white font-bold">{c.corrector.firstName} {c.corrector.lastName}</span>
                                            {(c.corrector.role === 'ADMIN' || c.corrector.role === 'PROF') && (
                                                <span className="ml-2 text-xs text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                    {c.corrector.role === 'ADMIN' ? 'Admin' : 'Prof'}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-white">{c.finalMark}<span className="text-xs text-slate-500">/100</span></div>
                                    </div>
                                </div>
                            ) : c.correctorId ? (
                                <div className="flex items-center gap-3 mb-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                                        <User size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-300">Corrigé par un correcteur</p>
                                    </div>
                                    {c.finalMark !== null && c.finalMark !== undefined && (
                                        <div className="text-right">
                                            <div className="text-xl font-black text-white">{c.finalMark}<span className="text-xs text-slate-500">/100</span></div>
                                        </div>
                                    )}
                                </div>
                            ) : (c.status === 'VALIDATED' || c.status === 'FAILED') ? (
                                <div className="flex items-center gap-3 mb-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-300">Validation automatique</p>
                                    </div>
                                    {c.finalMark !== null && c.finalMark !== undefined && (
                                        <div className="text-right">
                                            <div className="text-xl font-black text-white">{c.finalMark}<span className="text-xs text-slate-500">/100</span></div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-3 text-sm text-slate-500">En attente de correcteur...</div>
                            )}

                            {formatComment(c.comments) && (
                                <div className="mt-3 text-sm text-slate-400 italic bg-slate-800/50 p-3 rounded border-l-2 border-blue-500">
                                    <MessageSquare size={14} className="inline mr-2 -mt-1"/>
                                    "{formatComment(c.comments)}"
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Colonne Droite : Donnés */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="bg-purple-600 w-2 h-6 rounded-full"></span>
                        Avis Donnés
                        <span className="text-sm font-normal text-slate-500 ml-2">({given.length})</span>
                    </h2>

                    {given.length === 0 && <p className="text-slate-500 italic">Aucune évaluation donnée.</p>}

                    {given.map(c => (
                        <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg hover:border-slate-700 transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{c.projectLabel || 'Projet inconnu'}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                        <Calendar size={12}/> {formatDate(c.updatedAt || c.createdAt)}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(c.status)}`}>
                                    {getStatusLabel(c.status)}
                                </span>
                            </div>

                            {c.student && (
                                <div className="flex items-center gap-3 mb-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                                        {c.student.firstName[0]}{c.student.lastName[0]}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-300">Étudiant : <span className="text-white font-bold">{c.student.firstName} {c.student.lastName}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-white">{c.finalMark}<span className="text-xs text-slate-500">/100</span></div>
                                    </div>
                                </div>
                            )}

                            {formatComment(c.comments) && (
                                <div className="mt-3 text-sm text-slate-400 italic bg-slate-800/50 p-3 rounded border-l-2 border-purple-500">
                                    <MessageSquare size={14} className="inline mr-2 -mt-1"/>
                                    "{formatComment(c.comments)}"
                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>
        )}
      </div>
    </div>
  );
}
