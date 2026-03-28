'use client';

import { useState } from 'react';
import { Ruler, X, Save, User, Clock, Check, Award, Target } from 'lucide-react';
import { AxisExerciseConfig, AxisItem } from '../types';
import { AxisSubmission } from './AxisPlayer';

interface AxisEvaluatorProps {
  config: AxisExerciseConfig;
  submission: AxisSubmission;
  onSave: (evaluatedSubmission: AxisSubmission) => void;
  onClose: () => void;
}

interface EvaluatedItem {
  item: AxisItem;
  placedValue: number;
  distance: number;
  isCorrect: boolean;
  accuracy: number; // 0-100%
}

export default function AxisEvaluator({
  config,
  submission,
  onSave,
  onClose
}: AxisEvaluatorProps) {
  // Évaluer chaque item
  const evaluatedItems: EvaluatedItem[] = submission.answers.map(answer => {
    const item = config.items.find(i => i.id === answer.itemId)!;
    const distance = Math.abs(answer.placedValue - item.correctValue);
    const isCorrect = distance <= config.tolerance;
    const accuracy = Math.max(0, 100 - (distance / (config.maxValue - config.minValue)) * 100);

    return {
      item,
      placedValue: answer.placedValue,
      distance,
      isCorrect,
      accuracy
    };
  });

  const correctCount = evaluatedItems.filter(e => e.isCorrect).length;
  const avgAccuracy = evaluatedItems.reduce((sum, e) => sum + e.accuracy, 0) / evaluatedItems.length;
  
  // Calcul du score automatique
  const autoScore = evaluatedItems.reduce((score, e) => {
    if (e.isCorrect) return score + config.pointsPerCorrect;
    if (config.partialCredit && e.accuracy > 50) {
      return score + Math.floor(config.pointsPerCorrect * (e.accuracy / 100));
    }
    return score;
  }, 0);

  const [manualScore, setManualScore] = useState<number | null>(submission.score ?? autoScore);
  const [comment, setComment] = useState('');

  const handleSave = () => {
    const evaluatedSubmission: AxisSubmission = {
      ...submission,
      status: 'evaluated',
      score: manualScore ?? autoScore
    };
    onSave(evaluatedSubmission);
  };

  // Calculer la position en % sur l'axe
  const getPositionPercent = (value: number): number => {
    return ((value - config.minValue) / (config.maxValue - config.minValue)) * 100;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ruler className="text-purple-400" size={24} />
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
          {/* Résumé */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <Award className="text-yellow-400" size={24} />
                <div>
                  <p className="text-sm text-slate-400">Score</p>
                  <p className="text-xl font-bold text-white">
                    {correctCount}/{config.items.length} correct
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <Target className="text-cyan-400" size={24} />
                <div>
                  <p className="text-sm text-slate-400">Précision moyenne</p>
                  <p className="text-xl font-bold text-white">{avgAccuracy.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <Check className="text-green-400" size={24} />
                <div>
                  <p className="text-sm text-slate-400">Points automatiques</p>
                  <p className="text-xl font-bold text-white">{autoScore}/{config.totalPoints}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visualisation de l'axe */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-slate-300 font-semibold mb-6 text-center">{config.axisLabel}</h3>
            
            <div className="relative px-4 py-16">
              {/* Axe */}
              <div className="relative h-3 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full">
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

                {/* Labels */}
                <div className="absolute -bottom-10 left-0 text-sm text-purple-400 font-medium">
                  {config.minLabel}
                </div>
                <div className="absolute -bottom-10 right-0 text-sm text-cyan-400 font-medium">
                  {config.maxLabel}
                </div>

                {/* Positions étudiant */}
                {evaluatedItems.map((evaluated, idx) => (
                  <div key={evaluated.item.id}>
                    {/* Position de l'étudiant */}
                    <div
                      className="absolute -top-14 transform -translate-x-1/2"
                      style={{ left: `${getPositionPercent(evaluated.placedValue)}%` }}
                    >
                      <div className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                        evaluated.isCorrect 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {evaluated.item.content}
                      </div>
                      <div className={`w-0.5 h-4 mx-auto ${
                        evaluated.isCorrect ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                    </div>

                    {/* Position correcte (si différente) */}
                    {!evaluated.isCorrect && (
                      <div
                        className="absolute top-6 transform -translate-x-1/2"
                        style={{ left: `${getPositionPercent(evaluated.item.correctValue)}%` }}
                      >
                        <div className="w-0.5 h-4 bg-green-400 mx-auto" />
                        <div className="px-2 py-0.5 rounded text-xs bg-green-500/30 text-green-300 border border-green-500/50 whitespace-nowrap">
                          ✓ correct
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-sm text-slate-500 mt-8">
              Tolérance acceptée: ±{config.tolerance}
            </p>
          </div>

          {/* Détail par item */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-slate-300 font-semibold mb-4">Détail des placements</h3>
            <div className="space-y-2">
              {evaluatedItems.map((evaluated) => (
                <div
                  key={evaluated.item.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    evaluated.isCorrect
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    evaluated.isCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {evaluated.isCorrect ? <Check size={16} className="text-white" /> : <X size={16} className="text-white" />}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-white font-medium">{evaluated.item.content}</p>
                    <div className="flex items-center gap-4 text-sm mt-1">
                      <span className={evaluated.isCorrect ? 'text-green-400' : 'text-red-400'}>
                        Placé: {evaluated.placedValue}
                      </span>
                      {!evaluated.isCorrect && (
                        <span className="text-green-400">
                          Correct: {evaluated.item.correctValue}
                        </span>
                      )}
                      <span className="text-slate-500">
                        Écart: {evaluated.distance} • Précision: {evaluated.accuracy.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded text-sm ${
                    evaluated.isCorrect 
                      ? 'bg-green-500/20 text-green-400'
                      : config.partialCredit && evaluated.accuracy > 50
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}>
                    {evaluated.isCorrect 
                      ? `+${config.pointsPerCorrect}` 
                      : config.partialCredit && evaluated.accuracy > 50
                        ? `+${Math.floor(config.pointsPerCorrect * (evaluated.accuracy / 100))} (partiel)`
                        : '0'
                    } pts
                  </div>
                </div>
              ))}
            </div>
          </div>

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
