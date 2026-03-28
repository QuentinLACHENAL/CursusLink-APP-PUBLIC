'use client';

import { useState, useCallback } from 'react';
import { 
  X, Save, Plus, Trash2, GripVertical, 
  Link2, Shuffle, HelpCircle, Eye, EyeOff
} from 'lucide-react';
import { MatchingExerciseConfig, MatchingPair } from '../types';
import { API_BASE_URL } from '../../../services/api';

interface MatchingBuilderProps {
  nodeId: string;
  nodeLabel: string;
  initialConfig?: MatchingExerciseConfig;
  token: string;
  onSave: (config: MatchingExerciseConfig) => void;
  onCancel: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function MatchingBuilder({
  nodeId,
  nodeLabel,
  initialConfig,
  token,
  onSave,
  onCancel
}: MatchingBuilderProps) {
  const [title, setTitle] = useState(initialConfig?.title || `Associations - ${nodeLabel}`);
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [pairs, setPairs] = useState<MatchingPair[]>(
    initialConfig?.pairs || [
      { id: generateId(), left: '', right: '', points: 10 }
    ]
  );
  const [shuffleLeft, setShuffleLeft] = useState(initialConfig?.shuffleLeft ?? true);
  const [shuffleRight, setShuffleRight] = useState(initialConfig?.shuffleRight ?? true);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const addPair = () => {
    setPairs([...pairs, { id: generateId(), left: '', right: '', points: 10 }]);
  };

  const removePair = (id: string) => {
    if (pairs.length <= 1) return;
    setPairs(pairs.filter(p => p.id !== id));
  };

  const updatePair = (id: string, field: keyof MatchingPair, value: string | number) => {
    setPairs(pairs.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const movePair = (index: number, direction: 'up' | 'down') => {
    const newPairs = [...pairs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pairs.length) return;
    [newPairs[index], newPairs[targetIndex]] = [newPairs[targetIndex], newPairs[index]];
    setPairs(newPairs);
  };

  const totalPoints = pairs.reduce((sum, p) => sum + p.points, 0);

  const isValid = () => {
    return title.trim() && 
           pairs.length >= 2 && 
           pairs.every(p => p.left.trim() && p.right.trim());
  };

  const handleSave = async () => {
    if (!isValid()) {
      alert('Veuillez remplir tous les champs et ajouter au moins 2 paires');
      return;
    }

    setSaving(true);

    const config: MatchingExerciseConfig = {
      id: initialConfig?.id || generateId(),
      type: 'matching',
      title,
      description,
      pairs,
      shuffleLeft,
      shuffleRight,
      totalPoints,
      createdAt: initialConfig?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Sauvegarder via l'API
      const response = await fetch(`${API_BASE_URL}/graph/node/${nodeId}/exercise`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exerciseType: 'matching',
          exerciseData: JSON.stringify(config)
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');
      
      onSave(config);
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Preview avec mélange simulé
  const getShuffledPreview = () => {
    const leftItems = shuffleLeft 
      ? [...pairs].sort(() => Math.random() - 0.5)
      : pairs;
    const rightItems = shuffleRight
      ? [...pairs].sort(() => Math.random() - 0.5)
      : pairs;
    return { leftItems, rightItems };
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <Link2 className="text-cyan-400" size={24} />
            <div>
              <h2 className="text-lg font-bold text-white">Exercice d'Associations</h2>
              <p className="text-sm text-slate-400">Relier les éléments correspondants</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="text-slate-400" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Titre et description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Titre de l'exercice *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Ex: Associer muscles et fonctions"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description (optionnel)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Consigne pour l'étudiant..."
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleLeft}
                onChange={(e) => setShuffleLeft(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
              />
              <Shuffle size={16} className="text-slate-400" />
              <span className="text-sm text-slate-300">Mélanger colonne gauche</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleRight}
                onChange={(e) => setShuffleRight(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
              />
              <Shuffle size={16} className="text-slate-400" />
              <span className="text-sm text-slate-300">Mélanger colonne droite</span>
            </label>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-slate-400">Total:</span>
              <span className="font-bold text-cyan-400">{totalPoints} pts</span>
            </div>
          </div>

          {/* Paires */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
                Paires à associer ({pairs.length})
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              >
                {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPreview ? 'Masquer aperçu' : 'Aperçu'}
              </button>
            </div>

            {/* Liste des paires */}
            <div className="space-y-2">
              <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] gap-2 text-xs font-medium text-slate-400 px-2">
                <span></span>
                <span>Élément gauche</span>
                <span></span>
                <span>Élément droit (réponse)</span>
                <span>Points</span>
                <span></span>
              </div>
              
              {pairs.map((pair, index) => (
                <div 
                  key={pair.id}
                  className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] gap-2 items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                >
                  {/* Grip pour réorganiser */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => movePair(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical size={14} className="text-slate-500" />
                    </button>
                  </div>

                  {/* Élément gauche */}
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) => updatePair(pair.id, 'left', e.target.value)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="Terme / Question"
                  />

                  {/* Icône de liaison */}
                  <Link2 size={16} className="text-cyan-400/50" />

                  {/* Élément droit */}
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => updatePair(pair.id, 'right', e.target.value)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="Définition / Réponse"
                  />

                  {/* Points */}
                  <input
                    type="number"
                    value={pair.points}
                    onChange={(e) => updatePair(pair.id, 'points', parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm text-center focus:border-cyan-500 focus:outline-none"
                    min="1"
                  />

                  {/* Supprimer */}
                  <button
                    onClick={() => removePair(pair.id)}
                    disabled={pairs.length <= 1}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addPair}
              className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Ajouter une paire
            </button>
          </div>

          {/* Aperçu */}
          {showPreview && (
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <Eye size={16} className="text-cyan-400" />
                Aperçu étudiant (colonnes mélangées)
              </h4>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-2">Colonne A</p>
                  {getShuffledPreview().leftItems.map((item, i) => (
                    <div key={i} className="px-3 py-2 bg-slate-700 rounded-lg text-sm text-white border border-slate-600">
                      {item.left || '(vide)'}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-2">Colonne B</p>
                  {getShuffledPreview().rightItems.map((item, i) => (
                    <div key={i} className="px-3 py-2 bg-slate-700 rounded-lg text-sm text-white border border-slate-600">
                      {item.right || '(vide)'}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                L'étudiant devra relier chaque élément de gauche avec son correspondant à droite
              </p>
            </div>
          )}

          {/* Aide */}
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <HelpCircle size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-cyan-300">
                <p className="font-medium mb-1">Conseils pour créer un bon exercice d'associations :</p>
                <ul className="list-disc list-inside text-cyan-400/80 space-y-1">
                  <li>Ajoutez au moins 4-6 paires pour rendre l'exercice intéressant</li>
                  <li>Évitez les associations trop évidentes ou trop obscures</li>
                  <li>Activez le mélange des colonnes pour éviter la mémorisation de l'ordre</li>
                  <li>Les étudiants relient les éléments en cliquant ou par drag & drop</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="text-sm text-slate-400">
            {pairs.length} paire{pairs.length > 1 ? 's' : ''} • {totalPoints} points
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid() || saving}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
