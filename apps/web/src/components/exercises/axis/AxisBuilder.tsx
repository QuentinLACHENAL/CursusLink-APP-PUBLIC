'use client';

import { useState } from 'react';
import { Ruler, X, Plus, Trash2, Eye, Save, GripVertical, Settings } from 'lucide-react';
import { AxisExerciseConfig, AxisItem } from '../types';

interface AxisBuilderProps {
  exerciseId?: string;
  nodeId: string;
  initialConfig?: AxisExerciseConfig;
  onSave: (config: AxisExerciseConfig) => void;
  onCancel: () => void;
}

export default function AxisBuilder({
  exerciseId,
  nodeId,
  initialConfig,
  onSave,
  onCancel
}: AxisBuilderProps) {
  const [title, setTitle] = useState(initialConfig?.title ?? '');
  const [description, setDescription] = useState(initialConfig?.description ?? '');
  
  // Configuration de l'axe
  const [axisLabel, setAxisLabel] = useState(initialConfig?.axisLabel ?? 'Échelle');
  const [minValue, setMinValue] = useState(initialConfig?.minValue ?? 0);
  const [maxValue, setMaxValue] = useState(initialConfig?.maxValue ?? 100);
  const [minLabel, setMinLabel] = useState(initialConfig?.minLabel ?? 'Minimum');
  const [maxLabel, setMaxLabel] = useState(initialConfig?.maxLabel ?? 'Maximum');
  const [tolerance, setTolerance] = useState(initialConfig?.tolerance ?? 10);
  
  // Items à placer
  const [items, setItems] = useState<AxisItem[]>(
    initialConfig?.items ?? []
  );

  // Points
  const [pointsPerCorrect, setPointsPerCorrect] = useState(initialConfig?.pointsPerCorrect ?? 10);
  const [partialCredit, setPartialCredit] = useState(initialConfig?.partialCredit ?? true);

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Ajouter un item
  const addItem = () => {
    const newItem: AxisItem = {
      id: Math.random().toString(36).substr(2, 9),
      content: '',
      correctValue: Math.floor((minValue + maxValue) / 2),
      hint: ''
    };
    setItems([...items, newItem]);
  };

  // Modifier un item
  const updateItem = (id: string, field: keyof AxisItem, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Supprimer un item
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Valider
  const validate = (): boolean => {
    const newErrors: string[] = [];
    
    if (!title.trim()) newErrors.push('Le titre est requis');
    if (items.length < 2) newErrors.push('Au moins 2 éléments sont requis');
    if (minValue >= maxValue) newErrors.push('Le minimum doit être inférieur au maximum');
    if (tolerance < 0) newErrors.push('La tolérance ne peut pas être négative');
    
    items.forEach((item, index) => {
      if (!item.content.trim()) {
        newErrors.push(`L'élément ${index + 1} doit avoir un contenu`);
      }
      if (item.correctValue < minValue || item.correctValue > maxValue) {
        newErrors.push(`La valeur de l'élément ${index + 1} doit être entre ${minValue} et ${maxValue}`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Sauvegarder
  const handleSave = () => {
    if (!validate()) return;

    const config: AxisExerciseConfig = {
      id: exerciseId || Math.random().toString(36).substr(2, 9),
      nodeId,
      type: 'axis',
      title,
      description,
      items,
      axisLabel,
      minValue,
      maxValue,
      minLabel,
      maxLabel,
      tolerance,
      pointsPerCorrect,
      partialCredit,
      totalPoints: items.length * pointsPerCorrect
    };

    onSave(config);
  };

  // Calculer la position en pourcentage
  const getPositionPercent = (value: number) => {
    return ((value - minValue) / (maxValue - minValue)) * 100;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ruler className="text-purple-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {exerciseId ? 'Modifier' : 'Créer'} un exercice Classification sur Axe
                </h2>
                <p className="text-sm text-slate-400">
                  Placez des éléments sur un axe/échelle
                </p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Erreurs */}
          {errors.length > 0 && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <ul className="text-red-300 text-sm space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Infos générales */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Chronologie des événements"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions pour l'étudiant"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Configuration de l'axe */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
              <Settings size={16} />
              Configuration de l'axe
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nom de l'axe</label>
                <input
                  type="text"
                  value={axisLabel}
                  onChange={(e) => setAxisLabel(e.target.value)}
                  placeholder="Ex: Années, Intensité, etc."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Valeur minimum</label>
                <input
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Valeur maximum</label>
                <input
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Label minimum</label>
                <input
                  type="text"
                  value={minLabel}
                  onChange={(e) => setMinLabel(e.target.value)}
                  placeholder="Ex: Début, Faible, etc."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Label maximum</label>
                <input
                  type="text"
                  value={maxLabel}
                  onChange={(e) => setMaxLabel(e.target.value)}
                  placeholder="Ex: Fin, Fort, etc."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tolérance (±)</label>
                <input
                  type="number"
                  min={0}
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-semibold">
                Éléments à placer ({items.length})
              </h3>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                Aucun élément. Cliquez sur "Ajouter" pour commencer.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700"
                  >
                    <GripVertical size={18} className="text-slate-500 mt-2" />
                    
                    <span className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-sm font-bold text-purple-300 mt-1">
                      {index + 1}
                    </span>

                    <div className="flex-1 grid md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">Contenu</label>
                        <input
                          type="text"
                          value={item.content}
                          onChange={(e) => updateItem(item.id, 'content', e.target.value)}
                          placeholder="Texte de l'élément"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Position correcte ({minValue} - {maxValue})
                        </label>
                        <input
                          type="number"
                          min={minValue}
                          max={maxValue}
                          value={item.correctValue}
                          onChange={(e) => updateItem(item.id, 'correctValue', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs text-slate-500 mb-1">Indice (optionnel)</label>
                        <input
                          type="text"
                          value={item.hint || ''}
                          onChange={(e) => updateItem(item.id, 'hint', e.target.value)}
                          placeholder="Aide pour l'étudiant"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Points */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Points par bonne réponse</label>
              <input
                type="number"
                min={1}
                value={pointsPerCorrect}
                onChange={(e) => setPointsPerCorrect(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div className="flex items-center gap-3 self-end pb-2">
              <input
                type="checkbox"
                id="partialCredit"
                checked={partialCredit}
                onChange={(e) => setPartialCredit(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500"
              />
              <label htmlFor="partialCredit" className="text-sm text-slate-300">
                Crédit partiel (points proportionnels à la précision)
              </label>
            </div>
          </div>

          {/* Prévisualisation */}
          {showPreview && items.length >= 2 && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-slate-300 font-semibold mb-6">Prévisualisation de l'axe</h3>
              
              <div className="relative px-4 py-8">
                {/* Axe */}
                <div className="relative h-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full">
                  {/* Labels min/max */}
                  <div className="absolute -bottom-8 left-0 text-sm text-slate-400">
                    {minLabel} ({minValue})
                  </div>
                  <div className="absolute -bottom-8 right-0 text-sm text-slate-400">
                    {maxLabel} ({maxValue})
                  </div>

                  {/* Items (positions correctes) */}
                  {items.filter(i => i.content).map((item) => (
                    <div
                      key={item.id}
                      className="absolute -top-10 transform -translate-x-1/2"
                      style={{ left: `${getPositionPercent(item.correctValue)}%` }}
                    >
                      <div className="bg-purple-600 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                        {item.content}
                      </div>
                      <div className="w-0.5 h-4 bg-purple-400 mx-auto" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Légende */}
              <div className="mt-12 text-sm text-slate-500 text-center">
                {axisLabel} • Tolérance: ±{tolerance}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Eye size={18} />
            {showPreview ? 'Masquer' : 'Prévisualiser'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Total: {items.length * pointsPerCorrect} points
            </span>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
