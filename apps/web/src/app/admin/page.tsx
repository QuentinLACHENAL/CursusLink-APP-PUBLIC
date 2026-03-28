'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Shield, ArrowLeft, Users, Hexagon, ClipboardList } from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import UsersView from './views/UsersView';
import CursusView from './views/CursusView';
import LogsView from './views/LogsView';

export default function AdminPage() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'users' | 'cursus' | 'logs'>('cursus');
  const [refreshKey, setRefreshKey] = useState(0);

  // Hook qui charge les données selon l'onglet actif
  // Note: structure est maintenant gérée par GraphContext dans AdminLayout -> CursusView
  const { users, loadingUsers, logs, loadingLogs } = useAdminData(token, activeTab, refreshKey);

  // Redirection si non authentifié ou non admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user && user.role !== 'ADMIN' && user.role !== 'PROF'))) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mr-3"></div>
        Chargement...
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'ADMIN' && user.role !== 'PROF')) {
    return null;
  }

  // Fonctions passées à CursusView pour qu'il puisse interagir avec le "shell" si besoin
  // (Par exemple, si on voulait que le Header principal change selon l'état du CursusView)
  // Pour l'instant CursusView est autonome.

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-8">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header Principal */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button onClick={() => router.push('/')} className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700">
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Shield className="text-red-500" /> Panneau Admin / Prof
                </h1>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'users' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
                  <Users size={16} /> Utilisateurs
                </button>
                <button onClick={() => setActiveTab('cursus')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'cursus' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
                  <Hexagon size={16} /> Cursus
                </button>
                <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
                  <ClipboardList size={16} /> Logs
                </button>
            </div>
        </div>

        {/* Vue Actuelle */}
        {activeTab === 'users' && <UsersView users={users} loading={loadingUsers} />}
        
        {activeTab === 'cursus' && (
          <CursusView 
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        )}
        
        {activeTab === 'logs' && <LogsView loading={loadingLogs} />}

      </div>
    </div>
  );
}