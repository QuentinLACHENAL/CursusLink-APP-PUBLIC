'use client';

import { useState } from 'react';
import { FolderTree, X, Send, RotateCcw, Lightbulb, GripVertical } from 'lucide-react';
import { CategorizationExerciseConfig, Category, CategorizationItem } from '../types';

interface CategorizationPlayerProps {
  config: CategorizationExerciseConfig;
  studentId: string;
  studentName: string;
  onSubmit: (submission: CategorizationSubmission) => void;
  onCancel: () => void;
}

export interface CategorizationSubmission {
  id: string;
  exerciseId: string;
  studentId: string;
  studentName: string;
  answers: { itemId: string; placedCategoryId: string }[];
  submittedAt: string;
  status: 'pending' | 'evaluated';
  score?: number;
  maxScore: number;
}

const COLORS: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', hover: 'hover:bg-blue-500/30' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', hover: 'hover:bg-green-500/30' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', hover: 'hover:bg-red-500/30' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', hover: 'hover:bg-yellow-500/30' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', hover: 'hover:bg-purple-500/30' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400', hover: 'hover:bg-cyan-500/30' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', hover: 'hover:bg-orange-500/30' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-400', hover: 'hover:bg-pink-500/30' },
};

// Mélanger un tableau
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface PlacedItem extends CategorizationItem {
  placedCategoryId: string | null;
}

export default function CategorizationPlayer({
  config,
  studentId,
  studentName,
  onSubmit,
  onCancel
}: CategorizationPlayerProps) {
  // Items mélangés
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(() =>
    shuffleArray(config.items).map(item => ({ ...item, placedCategoryId: null }))
  );
  
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{ itemId: string; isCorrect: boolean }[]>([]);
  const [showHints, setShowHints] = useState(false);

  // Items non placés
  const unplacedItems = placedItems.filter(item => item.placedCategoryId === null);

  // Items par catégorie
  const getItemsInCategory = (categoryId: string) => 
    placedItems.filter(item => item.placedCategoryId === categoryId);

  // Couleur d'une catégorie
  const getCategoryColor = (category: Category) => COLORS[category.color] || COLORS.blue;

  // Drag handlers
  const handleDragStart = (itemId: string) => {
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    setDragOverCategoryId(categoryId);
  };

  const handleDragLeave = () => {
    setDragOverCategoryId(null);
  };

  const handleDrop = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    if (!draggedItemId) return;

    setPlacedItems(items =>
      items.map(item =>
        item.id === draggedItemId ? { ...item, placedCategoryId: categoryId } : item
      )
    );

    setDraggedItemId(null);
    setDragOverCategoryId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverCategoryId(null);
  };

  // Retirer un item d'une catégorie
  const removeFromCategory = (itemId: string) => {
    if (submitted) return;
    setPlacedItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, placedCategoryId: null } : item
      )
    );
  };

  // Réinitialiser
  const resetPlacements = () => {
    setPlacedItems(items => items.map(item => ({ ...item, placedCategoryId: null })));
  };

  // Soumettre
  const handleSubmit = () => {
    const newResults = placedItems.map(item => ({
      itemId: item.id,
      isCorrect: item.placedCategoryId === item.correctCategoryId
    }));

    setResults(newResults);
    setSubmitted(true);

    const score = newResults.filter(r => r.isCorrect).length * config.pointsPerCorrect;

    const submission: CategorizationSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: config.id,
      studentId,
      studentName,
      answers: placedItems.map(item => ({
        itemId: item.id,
        placedCategoryId: item.placedCategoryId || ''
      })),
      submittedAt: new Date().toISOString(),
      status: 'evaluated',
      score,
      maxScore: config.totalPoints
    };

    setTimeout(() => onSubmit(submission), 2000);
  };

  const allPlaced = placedItems.every(item => item.placedCategoryId !== null);
  const correctCount = results.filter(r => r.isCorrect).length;

  // Résultat pour un item
  const getItemResult = (itemId: string) => results.find(r => r.itemId === itemId);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderTree className="text-teal-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">{config.title}</h2>
                {config.description && (
                  <p className="text-sm text-slate-400">{config.description}</p>
                )}
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Instructions */}
        {!submitted && (
          <div className="px-6 py-3 bg-teal-500/10 border-b border-teal-500/30 flex items-center justify-between">
            <p className="text-sm text-teal-300">
              💡 Glissez-déposez les éléments dans les catégories correspondantes
            </p>
            {config.items.some(item => item.hint) && (
              <button
                onClick={() => setShowHints(!showHints)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  showHints 
                    ? 'bg-yellow-500/20 text-yellow-300' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Lightbulb size={14} />
                {showHints ? 'Masquer' : 'Indices'}
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Items non placés */}
          {!submitted && unplacedItems.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-slate-300 font-semibold mb-3">
                Éléments à trier ({unplacedItems.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {unplacedItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    className={`
                      px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 cursor-grab active:cursor-grabbing
                      hover:bg-slate-600 transition-colors flex items-center gap-2
                      ${draggedItemId === item.id ? 'opacity-50' : ''}
                    `}
                  >
                    <GripVertical size={14} className="text-slate-500" />
                    <span className="text-white text-sm">{item.content}</span>
                    {showHints && item.hint && (
                      <span className="text-xs text-yellow-400 ml-1">💡</span>
                    )}
                  </div>
                ))}
              </div>
              {showHints && (
                <div className="mt-3 space-y-1">
                  {unplacedItems.filter(i => i.hint).map(item => (
                    <p key={item.id} className="text-xs text-yellow-400/70">
                      • {item.content}: {item.hint}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Catégories */}
          <div className={`grid gap-4 ${
            config.categories.length === 2 ? 'md:grid-cols-2' :
            config.categories.length === 3 ? 'md:grid-cols-3' :
            'md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {config.categories.map(category => {
              const color = getCategoryColor(category);
              const itemsInCat = getItemsInCategory(category.id);
              const isDragOver = dragOverCategoryId === category.id;

              return (
                <div
                  key={category.id}
                  onDragOver={(e) => !submitted && handleDragOver(e, category.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => !submitted && handleDrop(e, category.id)}
                  className={`
                    rounded-xl border-2 transition-all min-h-[150px]
                    ${color.bg} ${color.border}
                    ${isDragOver ? 'ring-2 ring-offset-2 ring-offset-slate-900' : ''}
                  `}
                >
                  <div className="p-3 border-b border-slate-700/50">
                    <h4 className={`font-bold ${color.text}`}>{category.name}</h4>
                    {category.description && (
                      <p className="text-xs text-slate-400 mt-1">{category.description}</p>
                    )}
                  </div>

                  <div className="p-3 space-y-2 min-h-[100px]">
                    {itemsInCat.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4 italic">
                        {submitted ? 'Aucun élément' : 'Déposez les éléments ici'}
                      </p>
                    ) : (
                      itemsInCat.map(item => {
                        const result = getItemResult(item.id);
                        const isCorrect = result?.isCorrect;
                        const isIncorrect = submitted && !result?.isCorrect;

                        return (
                          <div
                            key={item.id}
                            className={`
                              px-3 py-2 rounded-lg text-sm flex items-center justify-between
                              ${submitted
                                ? isCorrect
                                  ? 'bg-green-500/30 border border-green-500 text-green-300'
                                  : 'bg-red-500/30 border border-red-500 text-red-300'
                                : 'bg-slate-800/80 border border-slate-600 text-white'
                              }
                            `}
                          >
                            <span>{item.content}</span>
                            {!submitted && (
                              <button
                                onClick={() => removeFromCategory(item.id)}
                                className="p-1 hover:bg-slate-600 rounded text-slate-400"
                              >
                                <X size={12} />
                              </button>
                            )}
                            {submitted && isIncorrect && (
                              <span className="text-xs text-yellow-400">
                                → {config.categories.find(c => c.id === item.correctCategoryId)?.name}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Résultats */}
          {submitted && (
            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {correctCount} / {config.items.length} correct
                </h3>
                <p className="text-slate-400">
                  Score: {correctCount * config.pointsPerCorrect} / {config.totalPoints} points
                </p>
                {correctCount === config.items.length ? (
                  <p className="text-green-400 mt-2 font-medium">🎉 Parfait ! Tout est bien trié !</p>
                ) : correctCount >= config.items.length * 0.7 ? (
                  <p className="text-yellow-400 mt-2">👍 Bien ! Quelques erreurs.</p>
                ) : (
                  <p className="text-red-400 mt-2">📚 Révisez les catégories !</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          {!submitted && (
            <button
              onClick={resetPlacements}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Réinitialiser
            </button>
          )}
          {submitted && <div />}
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {submitted ? 'Fermer' : 'Annuler'}
            </button>
            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={!allPlaced}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Send size={18} />
                Soumettre ({placedItems.filter(i => i.placedCategoryId).length}/{config.items.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
