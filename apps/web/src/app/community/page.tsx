'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Search, MessageSquare, Heart, Shield, Award, Users, Activity } from 'lucide-react';
import { api } from '../../services/api';

export default function CommunityPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [activities, setActivity] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Charger le fil d'actualité (Corrections récentes pour l'instant)
    api.get<any[]>('corrections/activity')
      .then(setActivity)
      .catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    api.get<any[]>(`users/search?q=${query}`)
      .then(setSearchResults)
      .catch(console.error);
  };

  const getCoalitionColor = (coalition: string) => {
    switch(coalition) {
      case 'The Order': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'Cyber-Syndicate': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      case 'Data-Mages': return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Users className="text-blue-500" /> Communauté
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonne Gauche : Recherche */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Search size={18}/> Trouver un pair</h2>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pseudo, Prénom..." 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-white">Go</button>
              </form>

              <div className="mt-4 space-y-2">
                {searchResults.map(u => (
                  <div key={u.id} onClick={() => router.push(`/u/${u.id}`)} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                    <img src={u.avatarUrl} className="w-8 h-8 rounded-full bg-slate-700" alt={u.username}/>
                    <div>
                      <p className="text-sm font-bold text-white">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-slate-500">@{u.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colonne Droite : Fil d'activité */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Activity size={20}/> Activité Récente</h2>
            
            {activities.map((act) => (
              <div key={act.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 items-start shadow-lg hover:border-slate-700 transition-colors">
                {act.student.avatarUrl ? (
                  <img
                    src={act.student.avatarUrl}
                    alt={`${act.student.firstName} ${act.student.lastName}`}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {act.student.firstName[0]}{act.student.lastName[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-300">
                    <span className="font-bold text-white cursor-pointer hover:underline" onClick={() => router.push(`/u/${act.student.id}`)}>
                      {act.student.firstName} {act.student.lastName}
                    </span>
                    {' '}a validé le projet{' '}
                    <span className="text-purple-400 font-bold">{act.projectLabel || act.projectId}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(act.updatedAt || act.createdAt)}
                  </p>
                  
                  <div className="mt-3 flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded border ${getCoalitionColor(act.student.coalition)}`}>
                      {act.student.coalition || 'Sans Coalition'}
                    </span>
                    <span className="text-xs text-green-400 font-bold">
                      +{act.finalMark} pts
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {activities.length === 0 && <p className="text-slate-500 italic">Aucune activité récente.</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
