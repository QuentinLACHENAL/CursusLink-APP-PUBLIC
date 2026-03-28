'use client';

import { useEffect, useState } from 'react';
import { X, BarChart2, Users, Hexagon, CheckCircle } from 'lucide-react';
import { api } from '../../../services/api';

interface StatsPanelProps {
  isOpen: boolean;
  structure: any;
  token: string;
  onClose: () => void;
}

export default function StatsPanel({ isOpen, structure, token, onClose }: StatsPanelProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.get<any>('graph/stats', token)
        .then(data => { setStats(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#1a1d24] w-full max-w-4xl h-[80vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#151820]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Statistiques du Cursus</h2>
              <p className="text-sm text-gray-400">Vue d'ensemble de la progression et du contenu</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Carte Utilisateurs */}
              <div className="bg-[#20232a] p-5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Users size={20}/></div>
                    <h3 className="font-bold text-gray-200">Utilisateurs</h3>
                  </div>
                  <span className="text-2xl font-bold text-white">{stats.usersCount}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Étudiants</span>
                    <span className="text-gray-300">{stats.studentsCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Admins/Profs</span>
                    <span className="text-gray-300">{stats.adminsCount}</span>
                  </div>
                </div>
              </div>

              {/* Carte Noeuds */}
              <div className="bg-[#20232a] p-5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Hexagon size={20}/></div>
                    <h3 className="font-bold text-gray-200">Contenu</h3>
                  </div>
                  <span className="text-2xl font-bold text-white">{stats.nodesCount}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cours</span>
                    <span className="text-gray-300">{stats.topicsCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Projets/Exos</span>
                    <span className="text-gray-300">{stats.projectsCount}</span>
                  </div>
                </div>
              </div>

              {/* Carte Validations */}
              <div className="bg-[#20232a] p-5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><CheckCircle size={20}/></div>
                    <h3 className="font-bold text-gray-200">Validations</h3>
                  </div>
                  <span className="text-2xl font-bold text-white">{stats.validationsCount}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (stats.validationsCount / (stats.usersCount * stats.nodesCount || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">Taux de complétion global</p>
              </div>

            </div>
          ) : (
            <div className="text-center text-gray-500">Impossible de charger les statistiques.</div>
          )}
        </div>
      </div>
    </div>
  );
}