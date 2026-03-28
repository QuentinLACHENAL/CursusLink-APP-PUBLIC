'use client';

import { useState } from 'react';
import { FolderTree, X, Save, User, Clock, Check, Award } from 'lucide-react';
import { CategorizationExerciseConfig, Category } from '../types';
import { CategorizationSubmission } from './CategorizationPlayer';

interface CategorizationEvaluatorProps {
  config: CategorizationExerciseConfig;
  submission: CategorizationSubmission;
  onSave: (evaluatedSubmission: CategorizationSubmission) => void;
  onClose: () => void;
}

const COLORS: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-400' },
};

interface EvaluatedItem {
  itemId: string;
  content: string;
  placedCategoryId: string;
  correctCategoryId: string;
  isCorrect: boolean;
}

export default function CategorizationEvaluator({
  config,
  submission,
  onSave,
  onClose
}: CategorizationEvaluatorProps) {
  // Évaluer chaque item
  const evaluatedItems: EvaluatedItem[] = submission.answers.map(answer => {
    const item = config.items.find(i => i.id === answer.itemId)!;
    return {
      itemId: answer.itemId,
      content: item.content,
      placedCategoryId: answer.placedCategoryId,
      correctCategoryId: item.correctCategoryId,
      isCorrect: answer.placedCategoryId === item.correctCategoryId
    };
  });

  const correctCount = evaluatedItems.filter(e => e.isCorrect).length;
  const autoScore = correctCount * config.pointsPerCorrect;

  const [manualScore, setManualScore] = useState<number | null>(submission.score ?? autoScore);
  const [comment, setComment] = useState('');

  const handleSave = () => {
    const evaluatedSubmission: CategorizationSubmission = {
      ...submission,
      status: 'evaluated',
      score: manualScore ?? autoScore
    };
    onSave(evaluatedSubmission);
  };

  const getCategoryColor = (category: Category) => COLORS[category.color] || COLORS.blue;
  const getCategoryById = (id: string) => config.categories.find(c => c.id === id);

  // Items par catégorie (placement de l'étudiant)
  const getItemsPlacedIn = (categoryId: string) =>
    evaluatedItems.filter(e => e.placedCategoryId === categoryId);

  // Items qui auraient dû être dans cette catégorie
  const getItemsCorrectFor = (categoryId: string) =>
    evaluatedItems.filter(e => e.correctCategoryId === categoryId);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderTree className="text-teal-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">Évaluation : {config.title}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <User size={14} />
                    {submission.studentName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(submission.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Score */}
          <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3">
              <Award className="text-yellow-400" size={28} />
              <div>
                <p className="text-slate-400 text-sm">Score automatique</p>
                <p className="text-2xl font-bold text-white">
                  {correctCount} / {config.items.length} correct
                </p>
                <p className="text-slate-500 text-sm">{autoScore} / {config.totalPoints} points</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              correctCount === config.items.length 
                ? 'bg-green-500/20 text-green-400'
                : correctCount >= config.items.length * 0.7
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
            }`}>
              {Math.round((correctCount / config.items.length) * 100)}%
            </div>
          </div>

          {/* Comparaison par catégorie */}
          <div className="space-y-4">
            <h3 className="text-slate-300 font-semibold">Résultats par catégorie</h3>
            
            <div className={`grid gap-4 ${
              config.categories.length === 2 ? 'md:grid-cols-2' :
              config.categories.length === 3 ? 'md:grid-cols-3' :
              'md:grid-cols-2 lg:grid-cols-4'
            }`}>
              {config.categories.map(category => {
                const color = getCategoryColor(category);
                const placedItems = getItemsPlacedIn(category.id);
                const correctItems = getItemsCorrectFor(category.id);
                const correctInCategory = placedItems.filter(i => i.isCorrect).length;

                return (
                  <div
                    key={category.id}
                    className={`rounded-xl border-2 ${color.bg} ${color.border}`}
                  >
                    <div className="p-3 border-b border-slate-700/50">
                      <h4 className={`font-bold ${color.text}`}>{category.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {correctInCategory}/{placedItems.length} correct • 
                        Attendu: {correctItems.length} items
                      </p>
                    </div>

                    <div className="p-3 space-y-2">
                      {placedItems.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">Aucun élément placé</p>
                      ) : (
                        placedItems.map(item => (
                          <div
                            key={item.itemId}
                            className={`px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                              item.isCorrect
                                ? 'bg-green-500/30 border border-green-500/50'
                                : 'bg-red-500/30 border border-red-500/50'
                            }`}
                          >
                            <span className={item.isCorrect ? 'text-green-300' : 'text-red-300'}>
                              {item.content}
                            </span>
                            {item.isCorrect ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <span className="text-xs text-yellow-400">
                                → {getCategoryById(item.correctCategoryId)?.name}
                              </span>
                            )}
                          </div>
                        ))
                      )}

                      {/* Items manquants */}
                      {correctItems.filter(i => !i.isCorrect).length > 0 && (
                        <div className="pt-2 mt-2 border-t border-slate-700/50">
                          <p className="text-xs text-slate-500 mb-1">Manquants:</p>
                          {correctItems.filter(i => !i.isCorrect).map(item => (
                            <div
                              key={`missing-${item.itemId}`}
                              className="text-xs text-yellow-400/70 py-1"
                            >
                              • {item.content}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liste des erreurs */}
          {correctCount < config.items.length && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <h3 className="text-orange-300 font-semibold mb-3">
                Détail des erreurs ({config.items.length - correctCount})
              </h3>
              <div className="space-y-2">
                {evaluatedItems.filter(e => !e.isCorrect).map(item => {
                  const placedCat = getCategoryById(item.placedCategoryId);
                  const correctCat = getCategoryById(item.correctCategoryId);

                  return (
                    <div key={item.itemId} className="flex items-center gap-2 text-sm">
                      <span className="text-white font-medium">"{item.content}"</span>
                      <span className="text-slate-500">placé dans</span>
                      <span className={`px-2 py-0.5 rounded ${getCategoryColor(placedCat!).bg} ${getCategoryColor(placedCat!).text}`}>
                        {placedCat?.name}
                      </span>
                      <span className="text-slate-500">au lieu de</span>
                      <span className={`px-2 py-0.5 rounded ${getCategoryColor(correctCat!).bg} ${getCategoryColor(correctCat!).text}`}>
                        {correctCat?.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note manuelle */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-slate-300 font-semibold mb-4">Ajustement de la note</h3>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Score final</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={config.totalPoints}
                    value={manualScore ?? autoScore}
                    onChange={(e) => setManualScore(parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center"
                  />
                  <span className="text-slate-400">/ {config.totalPoints}</span>
                  {manualScore !== autoScore && (
                    <button
                      onClick={() => setManualScore(autoScore)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-slate-400 mb-1">Commentaire</label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Commentaire optionnel..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-3 bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
