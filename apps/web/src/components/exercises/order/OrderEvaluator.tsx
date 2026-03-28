'use client';

import { useState } from 'react';
import { ListOrdered, X, Check, Save, User, Clock, ArrowRight, Award, Info } from 'lucide-react';
import { OrderExerciseConfig, OrderItem } from '../types';
import { OrderSubmission } from './OrderPlayer';

interface OrderEvaluatorProps {
  config: OrderExerciseConfig;
  submission: OrderSubmission;
  onSave: (evaluatedSubmission: OrderSubmission) => void;
  onClose: () => void;
}

interface EvaluatedItem {
  studentItem: OrderItem;
  correctPosition: number;
  studentPosition: number;
  isCorrect: boolean;
  distance: number; // Distance de la position correcte
}

export default function OrderEvaluator({
  config,
  submission,
  onSave,
  onClose
}: OrderEvaluatorProps) {
  // Reconstruire l'ordre étudiant à partir des IDs
  const studentItems = submission.answers.map(id => 
    config.items.find(item => item.id === id)!
  );

  // Évaluer chaque item
  const evaluatedItems: EvaluatedItem[] = studentItems.map((item, index) => ({
    studentItem: item,
    correctPosition: item.correctPosition,
    studentPosition: index + 1,
    isCorrect: item.correctPosition === index + 1,
    distance: Math.abs(item.correctPosition - (index + 1))
  }));

  const correctCount = evaluatedItems.filter(e => e.isCorrect).length;
  const autoScore = evaluatedItems.reduce((score, e) => {
    if (e.isCorrect) return score + config.pointsPerCorrect;
    if (config.partialCredit && e.distance === 1) {
      return score + Math.floor(config.pointsPerCorrect / 2);
    }
    return score;
  }, 0);

  const [manualScore, setManualScore] = useState<number | null>(submission.score ?? autoScore);
  const [comment, setComment] = useState('');

  const handleSave = () => {
    const evaluatedSubmission: OrderSubmission = {
      ...submission,
      status: 'evaluated',
      score: manualScore ?? autoScore
    };
    onSave(evaluatedSubmission);
  };

  const correctOrder = [...config.items].sort((a, b) => a.correctPosition - b.correctPosition);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListOrdered className="text-orange-400" size={24} />
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
          {/* Score auto */}
          <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3">
              <Award className="text-yellow-400" size={28} />
              <div>
                <p className="text-slate-400 text-sm">Score automatique</p>
                <p className="text-2xl font-bold text-white">
                  {correctCount} / {config.items.length} correct
                </p>
                <p className="text-slate-500 text-sm">
                  {autoScore} / {config.totalPoints} points
                  {config.partialCredit && ' (crédit partiel activé)'}
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              correctCount === config.items.length 
                ? 'bg-green-500/20 text-green-400'
                : correctCount >= config.items.length / 2
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
            }`}>
              {correctCount === config.items.length ? '🎉 Parfait' 
                : correctCount >= config.items.length / 2 ? '👍 Bien' 
                : '📚 À améliorer'}
            </div>
          </div>

          {/* Comparaison */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Réponse étudiant */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
                <User size={16} />
                Réponse de l'étudiant
              </h3>
              <div className="space-y-2">
                {evaluatedItems.map((evaluated, index) => (
                  <div
                    key={evaluated.studentItem.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      evaluated.isCorrect
                        ? 'bg-green-500/20 border-green-500'
                        : evaluated.distance === 1 && config.partialCredit
                          ? 'bg-yellow-500/20 border-yellow-500'
                          : 'bg-red-500/20 border-red-500'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      evaluated.isCorrect 
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="flex-1 text-sm text-white">
                      {evaluated.studentItem.content}
                    </span>
                    {evaluated.isCorrect ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <span className="text-xs text-red-400">
                        → position {evaluated.correctPosition}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Ordre correct */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                <Check size={16} />
                Ordre correct
              </h3>
              <div className="space-y-2">
                {correctOrder.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30"
                  >
                    <div className="w-7 h-7 rounded-full bg-green-500/30 flex items-center justify-center text-sm font-bold text-green-300">
                      {index + 1}
                    </div>
                    <span className="flex-1 text-sm text-green-200">
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Détail des erreurs */}
          {correctCount < config.items.length && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <h3 className="text-orange-300 font-semibold mb-3 flex items-center gap-2">
                <Info size={16} />
                Analyse des erreurs
              </h3>
              <div className="space-y-2">
                {evaluatedItems.filter(e => !e.isCorrect).map((evaluated) => (
                  <div key={evaluated.studentItem.id} className="flex items-center gap-2 text-sm">
                    <span className="text-white">"{evaluated.studentItem.content}"</span>
                    <ArrowRight size={14} className="text-slate-500" />
                    <span className="text-red-400">position {evaluated.studentPosition}</span>
                    <span className="text-slate-500">au lieu de</span>
                    <span className="text-green-400">position {evaluated.correctPosition}</span>
                    <span className="text-slate-600">
                      (écart: {evaluated.distance})
                    </span>
                  </div>
                ))}
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
                <label className="block text-sm text-slate-400 mb-1">Commentaire (optionnel)</label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
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
