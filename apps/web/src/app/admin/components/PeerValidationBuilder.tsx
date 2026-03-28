'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileText, HelpCircle, GripVertical } from 'lucide-react';
import { PeerValidationConfig } from '../../../types';

interface PeerValidationBuilderProps {
  initialConfig?: string; // JSON string
  onSave: (config: PeerValidationConfig) => void;
  onClose: () => void;
}

export default function PeerValidationBuilder({
  initialConfig,
  onSave,
  onClose
}: PeerValidationBuilderProps) {
  const [config, setConfig] = useState<PeerValidationConfig>({
    type: 'grid',
    grid: [],
    questions: { pool: [], countToAsk: 1 }
  });

  // Load initial config
  useEffect(() => {
    if (initialConfig) {
      try {
        const parsed = JSON.parse(initialConfig);
        setConfig({
          type: parsed.type || 'grid',
          grid: parsed.grid || [],
          questions: parsed.questions || { pool: [], countToAsk: 1 }
        });
      } catch (e) {
        console.error("Error parsing peer validation config", e);
      }
    }
  }, [initialConfig]);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  // --- GRID HELPERS ---
  const addGridItem = () => {
    setConfig(prev => ({
      ...prev,
      grid: [...(prev.grid || []), { id: Date.now().toString(), label: '', points: 1 }]
    }));
  };

  const updateGridItem = (index: number, field: string, value: any) => {
    setConfig(prev => {
      const newGrid = [...(prev.grid || [])];
      newGrid[index] = { ...newGrid[index], [field]: value };
      return { ...prev, grid: newGrid };
    });
  };

  const removeGridItem = (index: number) => {
    setConfig(prev => ({
      ...prev,
      grid: (prev.grid || []).filter((_, i) => i !== index)
    }));
  };

  // --- QUESTIONS HELPERS ---
  const addQuestion = () => {
    setConfig(prev => ({
      ...prev,
      questions: {
        pool: [...(prev.questions?.pool || []), ''],
        countToAsk: prev.questions?.countToAsk || 1
      }
    }));
  };

  const updateQuestion = (index: number, value: string) => {
    setConfig(prev => {
      const newPool = [...(prev.questions?.pool || [])];
      newPool[index] = value;
      return {
        ...prev,
        questions: { ...prev.questions!, pool: newPool }
      };
    });
  };

  const removeQuestion = (index: number) => {
    setConfig(prev => {
        const newPool = (prev.questions?.pool || []).filter((_, i) => i !== index);
        // Ensure countToAsk is valid
        const maxCount = newPool.length || 1;
        return {
            ...prev,
            questions: { 
                pool: newPool, 
                countToAsk: Math.min(prev.questions?.countToAsk || 1, maxCount)
            }
        };
    });
  };

  const updateCountToAsk = (value: number) => {
    const max = config.questions?.pool.length || 1;
    const count = Math.max(1, Math.min(value, max));
    setConfig(prev => ({
      ...prev,
      questions: { ...prev.questions!, countToAsk: count }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="text-purple-400" />
            Instructions de validation par les pairs
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TYPE SELECTOR */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setConfig(prev => ({ ...prev, type: 'grid' }))}
              className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                config.type === 'grid' 
                  ? 'border-purple-500 bg-purple-500/10 text-purple-300' 
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'
              }`}
            >
              <GripVertical size={24} />
              <span className="font-bold">Grille d'évaluation</span>
              <span className="text-xs text-center opacity-70">Liste de critères à valider (Oui/Non)</span>
            </button>

            <button
              onClick={() => setConfig(prev => ({ ...prev, type: 'questions' }))}
              className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                config.type === 'questions' 
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300' 
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'
              }`}
            >
              <HelpCircle size={24} />
              <span className="font-bold">Questions Aléatoires</span>
              <span className="text-xs text-center opacity-70">Sélection de questions parmi une banque</span>
            </button>
          </div>

          <div className="h-px bg-slate-800" />

          {/* EDITOR */}
          {config.type === 'grid' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300">Critères d'évaluation</h3>
                <button 
                  onClick={addGridItem}
                  className="text-xs flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded"
                >
                  <Plus size={14} /> Ajouter un critère
                </button>
              </div>

              {(!config.grid || config.grid.length === 0) && (
                <div className="text-center p-8 bg-slate-800/50 rounded-lg border border-dashed border-slate-700 text-slate-500 text-sm">
                  Aucun critère défini. Ajoutez-en un pour commencer.
                </div>
              )}

              <div className="space-y-2">
                {config.grid?.map((item, idx) => (
                  <div key={item.id || idx} className="flex gap-2 items-start bg-slate-800 p-2 rounded border border-slate-700">
                    <div className="pt-2 text-slate-500 cursor-move"><GripVertical size={16} /></div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        placeholder="Description du critère (ex: Le code compile sans erreur)"
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white mb-1 focus:border-purple-500 outline-none"
                        value={item.label}
                        onChange={(e) => updateGridItem(idx, 'label', e.target.value)}
                      />
                    </div>
                    {/* Points facultatifs pour l'instant comme demandé "valide ou faux" */}
                    <button onClick={() => removeGridItem(idx)} className="p-2 text-slate-500 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {config.type === 'questions' && (
            <div className="space-y-6">
              {/* SETTINGS */}
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Configuration du tirage</label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-300">Poser</span>
                  <input 
                    type="number"
                    min="1"
                    max={config.questions?.pool.length || 1}
                    className="w-20 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white text-center font-bold"
                    value={config.questions?.countToAsk || 1}
                    onChange={(e) => updateCountToAsk(parseInt(e.target.value))}
                  />
                  <span className="text-sm text-slate-300">question(s) au correcteur (parmi {config.questions?.pool.length || 0} disponibles)</span>
                </div>
              </div>

              {/* POOL */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-300">Banque de questions</h3>
                  <button 
                    onClick={addQuestion}
                    className="text-xs flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded"
                  >
                    <Plus size={14} /> Ajouter une question
                  </button>
                </div>

                {(!config.questions?.pool || config.questions.pool.length === 0) && (
                  <div className="text-center p-8 bg-slate-800/50 rounded-lg border border-dashed border-slate-700 text-slate-500 text-sm">
                    La banque de questions est vide.
                  </div>
                )}

                <div className="space-y-2">
                  {config.questions?.pool.map((q, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-slate-800 p-2 rounded border border-slate-700">
                      <span className="pt-2 text-xs font-mono text-slate-500 w-6 text-center">{idx + 1}.</span>
                      <textarea 
                        rows={2}
                        placeholder="Écrivez votre question ici..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none resize-none"
                        value={q}
                        onChange={(e) => updateQuestion(idx, e.target.value)}
                      />
                      <button onClick={() => removeQuestion(idx)} className="p-2 text-slate-500 hover:text-red-400 self-center">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm text-slate-400 hover:bg-slate-800">
            Annuler
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-900/20"
          >
            <Save size={16} /> Sauvegarder la configuration
          </button>
        </div>

      </div>
    </div>
  );
}