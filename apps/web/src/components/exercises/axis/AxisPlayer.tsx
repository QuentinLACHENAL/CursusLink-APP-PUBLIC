'use client';

import { useState, useRef, useEffect } from 'react';
import { Ruler, X, Send, RotateCcw, Lightbulb, GripVertical } from 'lucide-react';
import { AxisExerciseConfig, AxisItem } from '../types';

interface AxisPlayerProps {
  config: AxisExerciseConfig;
  studentId: string;
  studentName: string;
  onSubmit: (submission: AxisSubmission) => void;
  onCancel: () => void;
}

export interface AxisSubmission {
  id: string;
  exerciseId: string;
  studentId: string;
  studentName: string;
  answers: { itemId: string; placedValue: number }[];
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

interface PlacedItem extends AxisItem {
  placedValue: number | null;
}

export default function AxisPlayer({
  config,
  studentId,
  studentName,
  onSubmit,
  onCancel
}: AxisPlayerProps) {
  // Items mélangés avec leur valeur placée
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(() =>
    shuffleArray(config.items).map(item => ({ ...item, placedValue: null }))
  );
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{ itemId: string; isCorrect: boolean; accuracy: number }[]>([]);
  const [showHints, setShowHints] = useState(false);
  
  const axisRef = useRef<HTMLDivElement>(null);

  // Calculer la valeur à partir de la position sur l'axe
  const getValueFromPosition = (clientX: number): number => {
    if (!axisRef.current) return config.minValue;
    
    const rect = axisRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = relativeX / rect.width;
    const value = config.minValue + percent * (config.maxValue - config.minValue);
    
    return Math.round(value);
  };

  // Cliquer sur l'axe pour placer un item
  const handleAxisClick = (e: React.MouseEvent) => {
    if (submitted || !selectedItemId) return;
    
    const value = getValueFromPosition(e.clientX);
    
    setPlacedItems(items =>
      items.map(item =>
        item.id === selectedItemId ? { ...item, placedValue: value } : item
      )
    );
    
    // Sélectionner automatiquement le prochain item non placé
    const currentIndex = placedItems.findIndex(i => i.id === selectedItemId);
    const nextUnplaced = placedItems.find((item, idx) => idx > currentIndex && item.placedValue === null);
    const firstUnplaced = placedItems.find(item => item.placedValue === null && item.id !== selectedItemId);
    
    setSelectedItemId(nextUnplaced?.id ?? firstUnplaced?.id ?? null);
  };

  // Calculer la position en % sur l'axe
  const getPositionPercent = (value: number): number => {
    return ((value - config.minValue) / (config.maxValue - config.minValue)) * 100;
  };

  // Réinitialiser
  const resetPlacements = () => {
    setPlacedItems(items => items.map(item => ({ ...item, placedValue: null })));
    setSelectedItemId(placedItems[0]?.id ?? null);
  };

  // Auto-sélectionner le premier item au montage
  useEffect(() => {
    if (placedItems.length > 0 && !selectedItemId) {
      setSelectedItemId(placedItems[0].id);
    }
  }, []);

  // Soumettre
  const handleSubmit = () => {
    // Évaluer les résultats
    const newResults = placedItems.map(item => {
      const distance = item.placedValue !== null 
        ? Math.abs(item.placedValue - item.correctValue)
        : Infinity;
      const isCorrect = distance <= config.tolerance;
      const accuracy = item.placedValue !== null
        ? Math.max(0, 1 - distance / (config.maxValue - config.minValue))
        : 0;
      
      return { itemId: item.id, isCorrect, accuracy };
    });
    
    setResults(newResults);
    setSubmitted(true);

    // Calculer le score
    let score = 0;
    newResults.forEach(result => {
      if (result.isCorrect) {
        score += config.pointsPerCorrect;
      } else if (config.partialCredit && result.accuracy > 0.5) {
        // Points partiels si précision > 50%
        score += Math.floor(config.pointsPerCorrect * result.accuracy);
      }
    });

    const submission: AxisSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: config.id,
      studentId,
      studentName,
      answers: placedItems.map(item => ({
        itemId: item.id,
        placedValue: item.placedValue ?? 0
      })),
      submittedAt: new Date().toISOString(),
      status: 'evaluated',
      score,
      maxScore: config.totalPoints
    };

    setTimeout(() => onSubmit(submission), 2000);
  };

  const allPlaced = placedItems.every(item => item.placedValue !== null);
  const correctCount = results.filter(r => r.isCorrect).length;

  // Résultat pour un item donné
  const getItemResult = (itemId: string) => results.find(r => r.itemId === itemId);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ruler className="text-purple-400" size={24} />
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
          <div className="px-6 py-3 bg-purple-500/10 border-b border-purple-500/30 flex items-center justify-between">
            <p className="text-sm text-purple-300">
              💡 Sélectionnez un élément puis cliquez sur l'axe pour le placer (tolérance: ±{config.tolerance})
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
          {/* Items à placer */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {placedItems.map((item) => {
              const result = getItemResult(item.id);
              const isSelected = selectedItemId === item.id;
              const isPlaced = item.placedValue !== null;

              return (
                <button
                  key={item.id}
                  onClick={() => !submitted && setSelectedItemId(item.id)}
                  disabled={submitted}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${isSelected 
                      ? 'border-purple-500 bg-purple-500/20 ring-2 ring-purple-500/50' 
                      : isPlaced
                        ? submitted
                          ? result?.isCorrect
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-red-500 bg-red-500/20'
                          : 'border-cyan-500 bg-cyan-500/20'
                        : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                    }
                    ${submitted ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-slate-500" />
                    <span className={`text-sm ${
                      submitted && result
                        ? result.isCorrect ? 'text-green-300' : 'text-red-300'
                        : isPlaced ? 'text-cyan-300' : 'text-white'
                    }`}>
                      {item.content}
                    </span>
                  </div>
                  {showHints && item.hint && (
                    <p className="text-xs text-yellow-400/80 mt-1 ml-5">
                      💡 {item.hint}
                    </p>
                  )}
                  {isPlaced && !submitted && (
                    <p className="text-xs text-cyan-400 mt-1 ml-5">
                      Placé à: {item.placedValue}
                    </p>
                  )}
                  {submitted && result && !result.isCorrect && (
                    <p className="text-xs text-red-400 mt-1 ml-5">
                      Correct: {item.correctValue}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Axe */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-center text-slate-300 font-medium mb-6">{config.axisLabel}</h3>
            
            <div className="relative px-4 py-12">
              {/* Axe cliquable */}
              <div 
                ref={axisRef}
                onClick={handleAxisClick}
                className={`
                  relative h-3 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full
                  ${!submitted && selectedItemId ? 'cursor-crosshair hover:h-4 transition-all' : ''}
                `}
              >
                {/* Graduations */}
                {[0, 25, 50, 75, 100].map(percent => (
                  <div
                    key={percent}
                    className="absolute top-full mt-1 transform -translate-x-1/2"
                    style={{ left: `${percent}%` }}
                  >
                    <div className="w-0.5 h-2 bg-slate-500" />
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(config.minValue + (percent / 100) * (config.maxValue - config.minValue))}
                    </div>
                  </div>
                ))}

                {/* Labels min/max */}
                <div className="absolute -bottom-12 left-0 text-sm text-purple-400 font-medium">
                  {config.minLabel}
                </div>
                <div className="absolute -bottom-12 right-0 text-sm text-cyan-400 font-medium">
                  {config.maxLabel}
                </div>

                {/* Items placés */}
                {placedItems.filter(i => i.placedValue !== null).map((item) => {
                  const result = getItemResult(item.id);
                  const isSelected = selectedItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="absolute -top-12 transform -translate-x-1/2 transition-all"
                      style={{ left: `${getPositionPercent(item.placedValue!)}%` }}
                    >
                      <div className={`
                        px-2 py-1 rounded text-xs whitespace-nowrap
                        ${submitted 
                          ? result?.isCorrect 
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          : isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-cyan-600 text-white'
                        }
                      `}>
                        {item.content}
                      </div>
                      <div className={`
                        w-0.5 h-4 mx-auto
                        ${submitted 
                          ? result?.isCorrect 
                            ? 'bg-green-400'
                            : 'bg-red-400'
                          : 'bg-cyan-400'
                        }
                      `} />
                    </div>
                  );
                })}

                {/* Positions correctes (après soumission) */}
                {submitted && placedItems.map((item) => {
                  const result = getItemResult(item.id);
                  if (result?.isCorrect) return null; // Déjà bien placé

                  return (
                    <div
                      key={`correct-${item.id}`}
                      className="absolute top-4 transform -translate-x-1/2 transition-all"
                      style={{ left: `${getPositionPercent(item.correctValue)}%` }}
                    >
                      <div className="w-0.5 h-4 bg-green-400 mx-auto" />
                      <div className="px-2 py-0.5 rounded text-xs bg-green-500/30 text-green-300 whitespace-nowrap border border-green-500/50">
                        ✓ {item.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Résultats */}
          {submitted && (
            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {correctCount} / {config.items.length} correct
                </h3>
                <p className="text-slate-400">
                  (tolérance: ±{config.tolerance})
                </p>
                {correctCount === config.items.length ? (
                  <p className="text-green-400 mt-2 font-medium">🎉 Parfait ! Excellent placement !</p>
                ) : correctCount >= config.items.length / 2 ? (
                  <p className="text-yellow-400 mt-2">👍 Bien ! Quelques ajustements nécessaires.</p>
                ) : (
                  <p className="text-red-400 mt-2">📚 Continuez à vous exercer !</p>
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
          {submitted && (
            <span className="text-sm text-slate-500">
              Score: {results.filter(r => r.isCorrect).length * config.pointsPerCorrect} / {config.totalPoints} points
            </span>
          )}
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
                Soumettre ({placedItems.filter(i => i.placedValue !== null).length}/{config.items.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
