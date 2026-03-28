'use client';

import { MapIcon, Upload, Save, Users, Trash2, X } from 'lucide-react';
import { API_BASE_URL } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

interface ConfigBannerProps {
  token: string;
  bgScale: number;
  setBgScale: (scale: number) => void;
  bgOffsetX: number;
  setBgOffsetX: (x: number) => void;
  bgOffsetY: number;
  setBgOffsetY: (y: number) => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveBackgroundConfig: () => void;
  onRemoveBackground: () => void;
  hasBgImage: boolean;
  onRefresh: () => void;
}

export default function ConfigBanner({
  token,
  bgScale,
  setBgScale,
  bgOffsetX,
  setBgOffsetX,
  bgOffsetY,
  setBgOffsetY,
  onBgUpload,
  onSaveBackgroundConfig,
  onRemoveBackground,
  hasBgImage,
  onRefresh
}: ConfigBannerProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const handleExport = async () => {
    if (!confirm('Télécharger une sauvegarde complète ?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/backup/export`, { 
        headers: { Authorization: `Bearer ${token}` }, 
        method: 'POST' 
      });
      const jsonData = await res.json();
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-cursus-${new Date().toISOString()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { 
      console.error('Erreur Backup:', e);
      alert('Erreur Backup'); 
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("ATTENTION: Cela va ÉCRASER toute la base de données ! Continuer ?")) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string);
        console.log('Données à importer:', data);
        
        if (!data.data || !data.data.nodes) {
          alert('❌ Fichier invalide : structure incorrecte');
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/backup/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur import:', errorText);
          alert('❌ Erreur Import: ' + errorText);
          return;
        }
        
        alert('✅ Import réussi !');
        onRefresh();
      } catch (err: any) { 
        console.error('Erreur:', err);
        alert('❌ Erreur Import: ' + (err?.message || err)); 
      }
    };
    reader.readAsText(file);
  };

  const handleSyncUsers = async () => {
    if (!confirm("Re-synchroniser les utilisateurs postgres vers le graphe ?\n(Utile si le leaderboard est vide)")) return;
    try {
      await fetch(`${API_BASE_URL}/users/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Users synchronisés !');
    } catch (e) { 
      alert('Erreur Sync'); 
    }
  };

  const handleReset = async () => {
    if (!confirm("DANGER: VOUS ALLEZ TOUT EFFACER !\nCela supprimera tous les noeuds et les liens.\nLes utilisateurs sont conservés.\n\nContinuer ?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/graph/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Graphe réinitialisé (Vide). Vous pouvez commencer à 0.');
        onRefresh();
      } else {
        const errorText = await res.text();
        console.error('Reset failed:', res.status, res.statusText, errorText);
        alert(`Erreur lors du reset (${res.status}): ${errorText || res.statusText}`);
      }
    } catch (e: any) {
      console.error('Network error during reset:', e);
      alert(`Erreur réseau: ${e.message}`);
    }
  };

  return (
    <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      
      {/* RANGÉE 1: Configuration du Fond */}
      <div className="flex items-center gap-4 flex-wrap">
        <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
          <MapIcon size={14}/> Fond
        </h4>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Zoom</span>
          <input 
            type="range" 
            min="10" 
            max="300" 
            value={bgScale} 
            onChange={(e) => setBgScale(parseInt(e.target.value))} 
            className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer" 
          />
          <span className="text-[10px] text-slate-400 w-8">{bgScale}%</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">X</span>
          <input 
            type="number" 
            value={bgOffsetX} 
            onChange={(e) => setBgOffsetX(parseInt(e.target.value) || 0)} 
            className="w-16 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white" 
            step="10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Y</span>
          <input 
            type="number" 
            value={bgOffsetY} 
            onChange={(e) => setBgOffsetY(parseInt(e.target.value) || 0)} 
            className="w-16 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white" 
            step="10"
          />
        </div>
        
        <label className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded cursor-pointer border border-slate-600 flex items-center gap-2 transition-colors text-slate-300 hover:text-white">
          <Upload size={12} /> Choisir Image
          <input type="file" className="hidden" accept="image/*" onChange={onBgUpload} />
        </label>
        
        {hasBgImage && (
          <button 
            onClick={onRemoveBackground}
            className="bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-200 text-xs px-3 py-1.5 rounded border border-red-900/50 flex items-center gap-2 transition-colors"
            title="Supprimer le fond"
          >
            <X size={12} /> Supprimer
          </button>
        )}
        
        <button onClick={onSaveBackgroundConfig} className="bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 hover:text-white text-xs px-3 py-1.5 rounded border border-purple-800/50 transition-colors">
          Appliquer
        </button>
      </div>

      {/* RANGÉE 2: Backup, Sync & Reset */}
      <div className="flex items-center gap-6 flex-wrap border-t border-slate-800 pt-4">
        {/* Sauvegarde Complète */}
        <div className="flex items-center gap-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
            <Save size={14}/> Backup
          </h4>
          <div className="flex gap-2">
            <button 
              onClick={handleExport} 
              className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 hover:text-blue-200 text-xs px-4 py-2 rounded border border-blue-900/50 flex items-center gap-2 transition-colors"
            >
              <Save size={14}/> Exporter
            </button>
            {isAdmin && (
              <label className="bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-200 text-xs px-4 py-2 rounded border border-red-900/50 flex items-center gap-2 cursor-pointer transition-colors">
                <Upload size={14} /> Importer
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
              </label>
            )}
          </div>
        </div>

        {/* Reset & Sync */}
        {isAdmin && (
          <div className="flex gap-3 items-center border-l border-slate-700 pl-6">
            <button 
              onClick={handleSyncUsers}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs px-4 py-2 rounded border border-slate-700 flex items-center gap-2 transition-colors uppercase font-bold"
            >
              <Users size={14}/> Sync Users
            </button>

            <button 
              onClick={handleReset}
              className="bg-red-950 hover:bg-red-900 text-red-500 hover:text-red-400 text-xs px-4 py-2 rounded border border-red-900/50 flex items-center gap-2 transition-colors uppercase font-bold"
            >
              <Trash2 size={14}/> Reset Zero
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
