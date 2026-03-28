'use client';

import { useState, useCallback } from 'react';
import { ListOrdered, Check, X, RotateCcw, Send, GripVertical, Lightbulb } from 'lucide-react';
import { OrderExerciseConfig, OrderItem } from '../types';

interface OrderPlayerProps {
  config: OrderExerciseConfig;
  studentId: string;
  studentName: string;
  onSubmit: (submission: OrderSubmission) => void;
  onCancel: () => void;
}

export interface OrderSubmission {
  id: string;
  exerciseId: string;
  studentId: string;
  studentName: string;
  answers: string[]; // IDs des items dans l'ordre donné par l'étudiant
  submittedAt: string;
  status: 'pending' | 'evaluated';
  score?: number;
  maxScore: number;
}

// Mélanger un tableau
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function OrderPlayer({
  config,
  studentId,
  studentName,
  onSubmit,
  onCancel
}: OrderPlayerProps) {
  // Mélanger les items une seule fois au montage
  const [orderedItems, setOrderedItems] = useState<OrderItem[]>(() => 
    shuffleArray(config.items)
  );
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [showHints, setShowHints] = useState(false);

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newItems = [...orderedItems];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    setOrderedItems(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch handlers (pour mobile)
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (submitted) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return;

    const newItems = [...orderedItems];
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setOrderedItems(newItems);
  };

  // Réinitialiser (re-mélanger)
  const resetOrder = () => {
    setOrderedItems(shuffleArray(config.items));
  };

  // Vérifier et soumettre
  const handleSubmit = () => {
    // Calculer les résultats
    const newResults = orderedItems.map((item, index) => 
      item.correctPosition === index + 1
    );
    
    setResults(newResults);
    setSubmitted(true);

    // Calculer le score
    let score = 0;
    newResults.forEach((isCorrect, index) => {
      if (isCorrect) {
        score += config.pointsPerCorrect;
      } else if (config.partialCredit) {
        // Points partiels si l'élément est à une position adjacente
        const item = orderedItems[index];
        const correctIndex = item.correctPosition - 1;
        if (Math.abs(index - correctIndex) === 1) {
          score += Math.floor(config.pointsPerCorrect / 2);
        }
      }
    });

    const submission: OrderSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: config.id,
      studentId,
      studentName,
      answers: orderedItems.map(item => item.id),
      submittedAt: new Date().toISOString(),
      status: 'evaluated',
      score,
      maxScore: config.totalPoints
    };

    setTimeout(() => onSubmit(submission), 2000);
  };

  const correctCount = results.filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListOrdered className="text-orange-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">{config.title}</h2>
                {config.description && (
                  <p className="text-sm text-slate-400">{config.description}</p>
                )}
              </div>
            </div>
            <button 
              onClick={onCancel} 
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Instructions */}
        {!submitted && (
          <div className="px-6 py-3 bg-orange-500/10 border-b border-orange-500/30 flex items-center justify-between">
            <p className="text-sm text-orange-300">
              💡 Glissez-déposez les éléments pour les remettre dans le bon ordre
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
                {showHints ? 'Masquer indices' : 'Voir indices'}
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {orderedItems.map((item, index) => {
              const isCorrect = submitted && results[index];
              const isIncorrect = submitted && !results[index];
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={item.id}
                  draggable={!submitted}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all
                    ${isDragging ? 'opacity-50 scale-95' : ''}
                    ${isDragOver ? 'border-orange-400 bg-orange-500/20' : ''}
                    ${isCorrect 
                      ? 'bg-green-500/20 border-green-500' 
                      : isIncorrect 
                        ? 'bg-red-500/20 border-red-500'
                        : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                    }
                    ${!submitted ? 'cursor-grab active:cursor-grabbing' : ''}
                  `}
                >
                  {/* Drag handle */}
                  {!submitted && (
                    <GripVertical size={18} className="text-slate-500 flex-shrink-0" />
                  )}

                  {/* Numéro de position */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    isCorrect 
                      ? 'bg-green-500 text-white' 
                      : isIncorrect 
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <span className={`text-sm ${
                      isCorrect ? 'text-green-300' : isIncorrect ? 'text-red-300' : 'text-white'
                    }`}>
                      {item.content}
                    </span>
                    {showHints && item.hint && (
                      <p className="text-xs text-yellow-400/80 mt-1 flex items-center gap-1">
                        <Lightbulb size={12} />
                        {item.hint}
                      </p>
                    )}
                  </div>

                  {/* Résultat */}
                  {submitted && (
                    <div className="flex-shrink-0">
                      {isCorrect 
                        ? <Check size={20} className="text-green-400" />
                        : <X size={20} className="text-red-400" />
                      }
                    </div>
                  )}

                  {/* Boutons de déplacement (pour mobile/accessibilité) */}
                  {!submitted && (
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-600 rounded disabled:opacity-30"
                      >
                        <span className="text-slate-400 text-xs">▲</span>
                      </button>
                      <button
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === orderedItems.length - 1}
                        className="p-1 hover:bg-slate-600 rounded disabled:opacity-30"
                      >
                        <span className="text-slate-400 text-xs">▼</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Résultats */}
          {submitted && (
            <div className="mt-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {correctCount} / {config.items.length} correct
                </h3>
                <p className="text-slate-400">
                  Score: {results.filter(Boolean).length * config.pointsPerCorrect} / {config.totalPoints} points
                </p>
                {correctCount === config.items.length ? (
                  <p className="text-green-400 mt-2 font-medium">🎉 Parfait ! L'ordre est correct !</p>
                ) : correctCount >= config.items.length / 2 ? (
                  <p className="text-yellow-400 mt-2">👍 Bon travail ! Quelques ajustements nécessaires.</p>
                ) : (
                  <p className="text-red-400 mt-2">📚 Révisez et réessayez !</p>
                )}

                {/* Afficher le bon ordre */}
                {correctCount < config.items.length && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">Ordre correct :</p>
                    <div className="space-y-1 text-left">
                      {[...config.items]
                        .sort((a, b) => a.correctPosition - b.correctPosition)
                        .map((item, i) => (
                          <div key={item.id} className="text-sm text-green-400/80">
                            {i + 1}. {item.content}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          {!submitted && (
            <button
              onClick={resetOrder}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Mélanger
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
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Send size={18} />
                Soumettre
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
