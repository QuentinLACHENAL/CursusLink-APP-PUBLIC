'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Settings } from 'lucide-react';
import VisualConfigPanel from './VisualConfigPanel';
import PeerValidationBuilder from '../PeerValidationBuilder';
import { PeerValidationConfig } from '../../../../types';

interface NodeGeneralFormProps {
  data: any;
  onChange: (data: any) => void;
  structure: any;
  galaxyMode: 'select' | 'new';
  setGalaxyMode: (mode: 'select' | 'new') => void;
  systemMode: 'select' | 'new';
  setSystemMode: (mode: 'select' | 'new') => void;
}

export default function NodeGeneralForm({
  data,
  onChange,
  structure,
  galaxyMode,
  setGalaxyMode,
  systemMode,
  setSystemMode
}: NodeGeneralFormProps) {
  const [showVisualOptions, setShowVisualOptions] = useState(false);
  const [showPeerValidation, setShowPeerValidation] = useState(false);
  
  // Extraire la config visuelle du nœud
  // Peut être une string JSON (depuis le backend) ou un objet déjà parsé
  let parsedVisualConfig: any = {};
  if (typeof data.visualConfig === 'string' && data.visualConfig) {
    try {
      parsedVisualConfig = JSON.parse(data.visualConfig);
    } catch (e) {
      parsedVisualConfig = {};
    }
  } else if (data.visualConfig) {
    parsedVisualConfig = data.visualConfig;
  }
  const visualConfig = parsedVisualConfig;
  const updateVisualConfig = (newConfig: any) => {
    onChange({ ...data, visualConfig: newConfig });
  };

  const handlePeerValidationSave = (config: PeerValidationConfig) => {
    onChange({ ...data, peerValidationConfig: JSON.stringify(config) });
  };

  const handleValidationTypeChange = (newType: 'auto' | 'peer' | 'teacher') => {
    onChange({ ...data, validationType: newType });
  };

  return (
    <div className="space-y-4 pb-4">
      {/* CONSTELLATION */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-slate-500 uppercase font-bold">Constellation (Matière)</label>
          <button 
            onClick={() => setGalaxyMode(galaxyMode === 'select' ? 'new' : 'select')}
            className="text-[9px] px-2 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-900/50 rounded hover:bg-blue-900/50"
          >
            {galaxyMode === 'select' ? '+ Nouveau' : 'Sélectionner'}
          </button>
        </div>
        {galaxyMode === 'select' && structure ? (
          <select 
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
            value={data.galaxy || ''}
            onChange={(e) => onChange({...data, galaxy: e.target.value})}
          >
            <option value="">-- Choisir une constellation --</option>
            {Object.keys(structure).map(galaxyName => (
              <option key={galaxyName} value={galaxyName}>{galaxyName}</option>
            ))}
          </select>
        ) : (
          <input 
            type="text" 
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white" 
            placeholder="Nom de la nouvelle constellation..."
            value={data.galaxy || ''} 
            onChange={(e) => onChange({...data, galaxy: e.target.value})} 
          />
        )}
      </div>
      
      {/* ÉTOILE */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-slate-500 uppercase font-bold">Étoile (Chapitre)</label>
          <button 
            onClick={() => setSystemMode(systemMode === 'select' ? 'new' : 'select')}
            className="text-[9px] px-2 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-900/50 rounded hover:bg-blue-900/50"
          >
            {systemMode === 'select' ? '+ Nouveau' : 'Sélectionner'}
          </button>
        </div>
        {systemMode === 'select' && structure ? (
          <select 
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
            value={data.group || ''}
            onChange={(e) => onChange({...data, group: e.target.value})}
          >
            <option value="">-- Choisir une étoile --</option>
            {Object.values(structure).flatMap((galaxy: any) => 
              Object.keys(galaxy.groups).map(groupName => (
                <option key={`${galaxy.name}-${groupName}`} value={groupName}>{groupName} ({galaxy.name})</option>
              ))
            )}
          </select>
        ) : (
          <input 
            type="text" 
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white" 
            placeholder="Nom de la nouvelle étoile..."
            value={data.group || ''} 
            onChange={(e) => onChange({...data, group: e.target.value})} 
          />
        )}
      </div>

      {/* Planète */}
      <div>
        <label className="text-[10px] text-slate-500 uppercase font-bold">Planète (Cours, Exercice)</label>
        <input 
          type="text" 
          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white" 
          value={data.label || ''} 
          onChange={(e) => onChange({...data, label: e.target.value})} 
        />
      </div>

      {/* Type et XP */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-bold">Type</label>
          <select 
            className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs" 
            value={data.type || 'topic'} 
            onChange={(e) => onChange({...data, type: e.target.value})}
          >
            <option value="topic">📚 Cours</option>
            <option value="exercise">✏️ Exercice</option>
            <option value="Project">🎯 Projet</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">XP (Récompense)</label>
          <input 
            type="number" 
            className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white" 
            value={data.xp || 0} 
            onChange={(e) => onChange({...data, xp: parseInt(e.target.value) || 0})} 
          />
        </div>
      </div>

      {/* Validation Mode - Always visible */}
      <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
          <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block">Mode de Validation</label>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => handleValidationTypeChange('auto')}
              className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                data.validationType === 'auto' || !data.validationType
                  ? 'bg-green-600/20 border-green-600 text-green-400'
                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
              }`}
            >
              <span className="text-lg">🤖</span>
              <span>Automatique</span>
            </button>
            <button
              onClick={() => handleValidationTypeChange('peer')}
              className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                data.validationType === 'peer'
                  ? 'bg-orange-600/20 border-orange-600 text-orange-400'
                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
              }`}
            >
              <span className="text-lg">👥</span>
              <span>Par les pairs</span>
            </button>
            <button
              onClick={() => handleValidationTypeChange('teacher')}
              className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                data.validationType === 'teacher'
                  ? 'bg-blue-600/20 border-blue-600 text-blue-400'
                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
              }`}
            >
              <span className="text-lg">👨‍🏫</span>
              <span>Prof</span>
            </button>
          </div>

          {data.validationType === 'peer' && (
            <button
              onClick={() => setShowPeerValidation(true)}
              className="w-full flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg py-2 text-xs font-bold transition-colors mt-2"
            >
              <Settings size={14} />
              Configurer la validation par les pairs
            </button>
          )}
      </div>

      {/* APPARENCE VISUELLE */}
      <div className="border-t border-slate-700 pt-3 mt-3">
        <button
          onClick={() => setShowVisualOptions(!showVisualOptions)}
          className="w-full flex items-center justify-between text-[10px] text-purple-400 uppercase font-bold hover:text-purple-300"
        >
          <span className="flex items-center gap-1">
            <Sparkles size={12} /> Apparence Visuelle
          </span>
          {showVisualOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        
        {showVisualOptions && (
          <div className="mt-3">
            <VisualConfigPanel
              config={visualConfig}
              nodeType={data.type || 'topic'}
              onChange={updateVisualConfig}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showPeerValidation && (
        <PeerValidationBuilder
          initialConfig={data.peerValidationConfig}
          onSave={handlePeerValidationSave}
          onClose={() => setShowPeerValidation(false)}
        />
      )}
    </div>
  );
}
