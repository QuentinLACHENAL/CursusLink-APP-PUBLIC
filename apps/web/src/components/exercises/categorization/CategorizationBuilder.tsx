'use client';

import { useState } from 'react';
import { FolderTree, X, Plus, Trash2, Eye, Save, GripVertical, Palette } from 'lucide-react';
import { CategorizationExerciseConfig, Category, CategorizationItem } from '../types';

interface CategorizationBuilderProps {
  exerciseId?: string;
  nodeId: string;
  initialConfig?: CategorizationExerciseConfig;
  onSave: (config: CategorizationExerciseConfig) => void;
  onCancel: () => void;
}

const COLORS = [
  { name: 'Bleu', value: 'blue', bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  { name: 'Vert', value: 'green', bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  { name: 'Rouge', value: 'red', bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' },
  { name: 'Jaune', value: 'yellow', bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
  { name: 'Violet', value: 'purple', bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  { name: 'Cyan', value: 'cyan', bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
  { name: 'Rose', value: 'pink', bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-400' },
];

export default function CategorizationBuilder({
  exerciseId,
  nodeId,
  initialConfig,
  onSave,
  onCancel
}: CategorizationBuilderProps) {
  const [title, setTitle] = useState(initialConfig?.title ?? '');
  const [description, setDescription] = useState(initialConfig?.description ?? '');
  
  // Catégories
  const [categories, setCategories] = useState<Category[]>(
    initialConfig?.categories ?? []
  );

  // Items à catégoriser
  const [items, setItems] = useState<CategorizationItem[]>(
    initialConfig?.items ?? []
  );

  // Points
  const [pointsPerCorrect, setPointsPerCorrect] = useState(initialConfig?.pointsPerCorrect ?? 5);

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // === CATÉGORIES ===
  const addCategory = () => {
    const usedColors = categories.map(c => c.color);
    const availableColor = COLORS.find(c => !usedColors.includes(c.value))?.value ?? 'blue';
    
    const newCategory: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      description: '',
      color: availableColor
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (id: string, field: keyof Category, value: string) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
    // Retirer aussi la catégorie des items
    setItems(items.map(item =>
      item.correctCategoryId === id ? { ...item, correctCategoryId: '' } : item
    ));
  };

  // === ITEMS ===
  const addItem = () => {
    const newItem: CategorizationItem = {
      id: Math.random().toString(36).substr(2, 9),
      content: '',
      correctCategoryId: categories[0]?.id ?? '',
      hint: ''
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof CategorizationItem, value: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Obtenir la couleur d'une catégorie
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return COLORS.find(c => c.value === category?.color) ?? COLORS[0];
  };

  // Valider
  const validate = (): boolean => {
    const newErrors: string[] = [];
    
    if (!title.trim()) newErrors.push('Le titre est requis');
    if (categories.length < 2) newErrors.push('Au moins 2 catégories sont requises');
    if (items.length < 3) newErrors.push('Au moins 3 éléments sont requis');
    
    categories.forEach((cat, index) => {
      if (!cat.name.trim()) {
        newErrors.push(`La catégorie ${index + 1} doit avoir un nom`);
      }
    });

    items.forEach((item, index) => {
      if (!item.content.trim()) {
        newErrors.push(`L'élément ${index + 1} doit avoir un contenu`);
      }
      if (!item.correctCategoryId) {
        newErrors.push(`L'élément ${index + 1} doit avoir une catégorie`);
      }
    });

    // Vérifier que chaque catégorie a au moins un item
    categories.forEach(cat => {
      const itemsInCategory = items.filter(i => i.correctCategoryId === cat.id);
      if (itemsInCategory.length === 0) {
        newErrors.push(`La catégorie "${cat.name}" n'a aucun élément`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Sauvegarder
  const handleSave = () => {
    if (!validate()) return;

    const config: CategorizationExerciseConfig = {
      id: exerciseId || Math.random().toString(36).substr(2, 9),
      nodeId,
      type: 'categorization',
      title,
      description,
      categories,
      items,
      pointsPerCorrect,
      totalPoints: items.length * pointsPerCorrect
    };

    onSave(config);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderTree className="text-teal-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {exerciseId ? 'Modifier' : 'Créer'} un exercice Catégorisation
                </h2>
                <p className="text-sm text-slate-400">
                  Triez des éléments dans des catégories
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
                placeholder="Ex: Trier les verbes par groupe"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions pour l'étudiant"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Catégories */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-semibold flex items-center gap-2">
                <FolderTree size={16} />
                Catégories ({categories.length})
              </h3>
              <button
                onClick={addCategory}
                className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-6 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                Aucune catégorie. Créez au moins 2 catégories.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {categories.map((cat, index) => {
                  const color = COLORS.find(c => c.value === cat.color) ?? COLORS[0];
                  const itemCount = items.filter(i => i.correctCategoryId === cat.id).length;

                  return (
                    <div
                      key={cat.id}
                      className={`p-4 rounded-lg border-2 ${color.bg} ${color.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold ${color.text}`}>
                          {index + 1}
                        </span>
                        
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => updateCategory(cat.id, 'name', e.target.value)}
                            placeholder="Nom de la catégorie"
                            className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                          />
                          <input
                            type="text"
                            value={cat.description || ''}
                            onChange={(e) => updateCategory(cat.id, 'description', e.target.value)}
                            placeholder="Description (optionnel)"
                            className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                          />
                          
                          {/* Sélecteur de couleur */}
                          <div className="flex items-center gap-2">
                            <Palette size={14} className="text-slate-500" />
                            <div className="flex gap-1">
                              {COLORS.map(c => (
                                <button
                                  key={c.value}
                                  onClick={() => updateCategory(cat.id, 'color', c.value)}
                                  className={`w-5 h-5 rounded-full ${c.bg} border-2 ${
                                    cat.color === c.value ? c.border : 'border-transparent'
                                  }`}
                                  title={c.name}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => removeCategory(cat.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                          <span className="text-xs text-slate-500">{itemCount} items</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-semibold">
                Éléments à catégoriser ({items.length})
              </h3>
              <button
                onClick={addItem}
                disabled={categories.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                {categories.length === 0 
                  ? 'Créez d\'abord des catégories'
                  : 'Aucun élément. Cliquez sur "Ajouter" pour commencer.'}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const color = getCategoryColor(item.correctCategoryId);
                  
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
                    >
                      <GripVertical size={16} className="text-slate-500" />
                      
                      <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                        {index + 1}
                      </span>

                      <div className="flex-1 flex items-center gap-3">
                        <input
                          type="text"
                          value={item.content}
                          onChange={(e) => updateItem(item.id, 'content', e.target.value)}
                          placeholder="Contenu de l'élément"
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />

                        <select
                          value={item.correctCategoryId}
                          onChange={(e) => updateItem(item.id, 'correctCategoryId', e.target.value)}
                          className={`px-3 py-2 rounded-lg border text-sm ${color.bg} ${color.border} ${color.text}`}
                        >
                          <option value="" className="bg-slate-800 text-slate-300">Catégorie...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id} className="bg-slate-800 text-slate-300">
                              {cat.name || `Catégorie ${categories.indexOf(cat) + 1}`}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={item.hint || ''}
                          onChange={(e) => updateItem(item.id, 'hint', e.target.value)}
                          placeholder="Indice"
                          className="w-40 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Points */}
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Points par bonne réponse</label>
              <input
                type="number"
                min={1}
                value={pointsPerCorrect}
                onChange={(e) => setPointsPerCorrect(parseInt(e.target.value) || 1)}
                className="w-24 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div className="self-end pb-2 text-sm text-slate-500">
              Total: {items.length * pointsPerCorrect} points
            </div>
          </div>

          {/* Prévisualisation */}
          {showPreview && categories.length >= 2 && items.length >= 1 && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-slate-300 font-semibold mb-4">Prévisualisation</h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(cat => {
                  const color = COLORS.find(c => c.value === cat.color) ?? COLORS[0];
                  const catItems = items.filter(i => i.correctCategoryId === cat.id);

                  return (
                    <div
                      key={cat.id}
                      className={`p-4 rounded-xl border-2 ${color.bg} ${color.border}`}
                    >
                      <h4 className={`font-bold mb-2 ${color.text}`}>{cat.name || 'Sans nom'}</h4>
                      {cat.description && (
                        <p className="text-xs text-slate-400 mb-3">{cat.description}</p>
                      )}
                      <div className="space-y-1">
                        {catItems.map(item => (
                          <div key={item.id} className="text-sm text-white bg-slate-800/60 px-2 py-1 rounded">
                            {item.content}
                          </div>
                        ))}
                        {catItems.length === 0 && (
                          <p className="text-xs text-slate-500 italic">Aucun élément</p>
                        )}
                      </div>
                    </div>
                  );
                })}
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
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors flex items-center gap-2"
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
