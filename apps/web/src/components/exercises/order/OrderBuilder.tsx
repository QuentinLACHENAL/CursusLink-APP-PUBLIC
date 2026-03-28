'use client';

import { useState } from 'react';
import { 
  X, Save, Plus, Trash2, GripVertical, 
  ListOrdered, HelpCircle, Eye, EyeOff, ArrowUp, ArrowDown
} from 'lucide-react';
import { OrderExerciseConfig, OrderItem } from '../types';
import { API_BASE_URL } from '../../../services/api';

interface OrderBuilderProps {
  nodeId: string;
  nodeLabel: string;
  initialConfig?: OrderExerciseConfig;
  token: string;
  onSave: (config: OrderExerciseConfig) => void;
  onCancel: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function OrderBuilder({
  nodeId,
  nodeLabel,
  initialConfig,
  token,
  onSave,
  onCancel
}: OrderBuilderProps) {
  const [title, setTitle] = useState(initialConfig?.title || `Ordre - ${nodeLabel}`);
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [items, setItems] = useState<OrderItem[]>(
    initialConfig?.items || [
      { id: generateId(), content: '', correctPosition: 1, hint: '' }
    ]
  );
  const [pointsPerCorrect, setPointsPerCorrect] = useState(initialConfig?.pointsPerCorrect ?? 10);
  const [partialCredit, setPartialCredit] = useState(initialConfig?.partialCredit ?? false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    const newPosition = items.length + 1;
    setItems([...items, { 
      id: generateId(), 
      content: '', 
      correctPosition: newPosition,
      hint: '' 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 2) return; // Minimum 2 éléments
    const newItems = items.filter(item => item.id !== id);
    // Réajuster les positions
    setItems(newItems.map((item, index) => ({
      ...item,
      correctPosition: index + 1
    })));
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    
    // Échanger les positions
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    // Mettre à jour les positions correctes
    setItems(newItems.map((item, idx) => ({
      ...item,
      correctPosition: idx + 1
    })));
  };

  const totalPoints = items.length * pointsPerCorrect;

  const isValid = () => {
    return title.trim() && 
           items.length >= 2 && 
           items.every(item => item.content.trim());
  };

  const handleSave = async () => {
    if (!isValid()) {
      alert('Veuillez remplir tous les champs et ajouter au moins 2 éléments');
      return;
    }

    setSaving(true);

    const config: OrderExerciseConfig = {
      id: initialConfig?.id || generateId(),
      nodeId,
      type: 'order',
      title,
      description,
      items,
      pointsPerCorrect,
      partialCredit,
      totalPoints,
      createdAt: initialConfig?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/graph/node/${nodeId}/exercise`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exerciseType: 'order',
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

  // Aperçu mélangé
  const getShuffledPreview = () => {
    return [...items].sort(() => Math.random() - 0.5);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <ListOrdered className="text-orange-400" size={24} />
            <div>
              <h2 className="text-lg font-bold text-white">Exercice d'Ordre</h2>
              <p className="text-sm text-slate-400">Remettre les éléments dans le bon ordre</p>
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ex: Étapes du développement moteur"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Consigne pour l'étudiant..."
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-300">Points par élément correct :</label>
              <input
                type="number"
                value={pointsPerCorrect}
                onChange={(e) => setPointsPerCorrect(parseInt(e.target.value) || 10)}
                className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center focus:border-orange-500 focus:outline-none"
                min="1"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={partialCredit}
                onChange={(e) => setPartialCredit(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-300">Points partiels (élément adjacent)</span>
            </label>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-slate-400">Total:</span>
              <span className="font-bold text-orange-400">{totalPoints} pts</span>
            </div>
          </div>

          {/* Éléments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
                Éléments à ordonner ({items.length})
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              >
                {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPreview ? 'Masquer aperçu' : 'Aperçu mélangé'}
              </button>
            </div>

            <p className="text-xs text-slate-500">
              ⚠️ L'ordre actuel est le bon ordre. Utilisez les flèches pour réorganiser.
            </p>

            {/* Liste des éléments */}
            <div className="space-y-2">
              {items.map((item, index) => (
                <div 
                  key={item.id}
                  className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                >
                  {/* Numéro de position */}
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold text-sm">
                    {index + 1}
                  </div>

                  {/* Contenu */}
                  <input
                    type="text"
                    value={item.content}
                    onChange={(e) => updateItem(item.id, 'content', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                    placeholder={`Élément ${index + 1}...`}
                  />

                  {/* Indice (optionnel) */}
                  <input
                    type="text"
                    value={item.hint || ''}
                    onChange={(e) => updateItem(item.id, 'hint', e.target.value)}
                    className="w-40 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="Indice (opt.)"
                  />

                  {/* Boutons de réorganisation */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp size={14} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown size={14} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Supprimer */}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 2}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Ajouter un élément
            </button>
          </div>

          {/* Aperçu */}
          {showPreview && (
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <Eye size={16} className="text-orange-400" />
                Aperçu étudiant (éléments mélangés)
              </h4>
              <div className="space-y-2">
                {getShuffledPreview().map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-700 rounded-lg text-white border border-slate-600">
                    <GripVertical size={16} className="text-slate-500" />
                    <span className="text-sm">{item.content || '(vide)'}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                L'étudiant devra glisser-déposer les éléments pour les remettre dans l'ordre
              </p>
            </div>
          )}

          {/* Aide */}
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <HelpCircle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-300">
                <p className="font-medium mb-1">Conseils :</p>
                <ul className="list-disc list-inside text-orange-400/80 space-y-1">
                  <li>L'ordre actuel est la réponse correcte</li>
                  <li>Ajoutez des indices pour guider les étudiants</li>
                  <li>Idéal pour les protocoles, chronologies, séquences de développement</li>
                  <li>Les étudiants utilisent le glisser-déposer pour réorganiser</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="text-sm text-slate-400">
            {items.length} élément{items.length > 1 ? 's' : ''} • {totalPoints} points
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
              className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
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
