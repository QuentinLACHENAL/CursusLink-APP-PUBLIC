'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, Search, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';

export default function CorrectionsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [available, setAvailable] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const fetchEverything = () => {
    if(!user?.id || !token) return;
    
    const isAdmin = user.role === 'ADMIN' || user.role === 'PROF';
    
    // 1. Corrections dispos (autres users OU toutes si admin)
    fetch(`${API_BASE_URL}/corrections/available/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        console.log('Available corrections:', data);
        setAvailable(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Error fetching available corrections:', err);
        setAvailable([]);
      });
      
    // 2. Mes demandes (seulement pour non-admins)
    if (!isAdmin) {
      fetch(`${API_BASE_URL}/corrections/my-requests/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMyRequests(Array.isArray(data) ? data : []))
        .catch(() => setMyRequests([]));
    }
  };

  useEffect(() => {
    fetchEverything();
  }, [user]);

  const handleCorrect = (correctionId: string) => {
    router.push(`/corrections/grade/${correctionId}`);
  };

  const handleCancel = async (correctionId: string) => {
    if (!confirm('Annuler cette demande de correction ?')) return;
    try {
        await fetch(`${API_BASE_URL}/corrections/${correctionId}/${user?.id}`, {
            method: 'DELETE'
        });
        fetchEverything(); // Rafraichir la liste
    } catch(e) {
        alert("Erreur lors de l'annulation");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <button 
            onClick={() => router.push('/')} 
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
            <ArrowLeft />
        </button>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Centre de Corrections
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Colonne 1 : Trouver une correction (Gagner des XP) */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
                <Search size={20} />
                {(user?.role === 'ADMIN' || user?.role === 'PROF') ? 'Toutes les corrections' : 'Trouver une correction'}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
                {(user?.role === 'ADMIN' || user?.role === 'PROF') 
                  ? 'En tant qu\'admin, vous pouvez corriger tous les projets en attente.' 
                  : 'Corrigez vos pairs pour gagner des points de réputation et débloquer des slots de correction.'}
            </p>

            <div className="space-y-4">
                {available.length === 0 ? (
                    <div className="p-8 text-center bg-slate-800 rounded-xl border border-slate-700 border-dashed text-slate-500">
                        Aucune demande en attente pour le moment.
                        <br/> Revenez plus tard !
                        {(user?.role === 'ADMIN' || user?.role === 'PROF') && (
                          <div className="text-xs mt-2 text-slate-600">Mode Admin activé</div>
                        )}
                    </div>
                ) : (
                    available.map((c: any) => (
                        <div key={c.id} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700 hover:border-purple-500 transition-colors cursor-pointer group">
                            <div>
                                <p className="font-bold text-white group-hover:text-purple-400 transition-colors">
                                    {c.projectLabel || c.projectId}
                                </p>
                                <p className="text-xs text-slate-400">
                                  Demandé par {c.student ? `${c.student.firstName} ${c.student.lastName}` : `User #${c.studentId?.substring(0,8)}`}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  }) : 'Date inconnue'}
                                </p>
                            </div>
                            <button 
                                onClick={() => handleCorrect(c.id)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium text-sm transition-colors"
                            >
                                Corriger
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Colonne 2 : Mes demandes (Se faire corriger) */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                <Clock size={20} />
                Mes demandes en cours
            </h2>
            
            <div className="space-y-4">
                {myRequests.map((req: any) => (
                    <div key={req.id} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                            <div>
                                <p className="font-bold text-white">{req.projectLabel || req.projectId}</p>
                                <p className="text-xs text-slate-400">En attente d'un correcteur...</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleCancel(req.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Annuler
                        </button>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}
