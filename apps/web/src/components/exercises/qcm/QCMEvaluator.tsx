'use client';

import { useMemo } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { QCMExerciseConfig } from '../types';

interface QCMEvaluatorProps {
  config: QCMExerciseConfig;
  answers: Record<string, number[]>;
  score: number;
}

export default function QCMEvaluator({ config, answers, score }: QCMEvaluatorProps) {
  // Analyse détaillée des réponses
  const analysis = useMemo(() => {
    return config.questions.map(q => {
      const userAnswers = answers[q.id] || [];
      
      // Vérifier si toutes les réponses sont correctes
      const isFullyCorrect = 
        userAnswers.length === q.correctAnswers.length &&
        userAnswers.every(idx => q.correctAnswers.includes(idx));
      
      // Compter les bonnes et mauvaises réponses
      const correctSelected = userAnswers.filter(idx => q.correctAnswers.includes(idx));
      const incorrectSelected = userAnswers.filter(idx => !q.correctAnswers.includes(idx));
      const missedCorrect = q.correctAnswers.filter(idx => !userAnswers.includes(idx));
      
      // Calculer les points obtenus
      let earnedPoints = 0;
      if (isFullyCorrect) {
        earnedPoints = q.points;
      } else if (config.allowPartialCredit && q.multipleCorrect) {
        const ratio = Math.max(0, (correctSelected.length - incorrectSelected.length) / q.correctAnswers.length);
        earnedPoints = Math.round(ratio * q.points * 100) / 100;
      }

      return {
        question: q,
        userAnswers,
        isFullyCorrect,
        correctSelected,
        incorrectSelected,
        missedCorrect,
        earnedPoints
      };
    });
  }, [config, answers]);

  const totalEarned = analysis.reduce((sum, a) => sum + a.earnedPoints, 0);
  const totalPossible = config.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white overflow-y-auto">
      {/* Header avec score */}
      <div className="sticky top-0 z-10 p-6 bg-gradient-to-r from-[#151820] to-[#1a1d24] border-b border-white/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{config.title}</h2>
            <p className="text-sm text-slate-400 mt-1">Résultats de votre QCM</p>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-black ${
              score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {score}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {totalEarned.toFixed(1)} / {totalPossible} pts
            </div>
          </div>
        </div>
      </div>

      {/* Détail des questions */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {analysis.map((a, idx) => (
            <div 
              key={a.question.id}
              className={`rounded-xl border-2 overflow-hidden ${
                a.isFullyCorrect 
                  ? 'border-green-500/50 bg-green-900/10' 
                  : a.earnedPoints > 0
                  ? 'border-yellow-500/50 bg-yellow-900/10'
                  : 'border-red-500/50 bg-red-900/10'
              }`}
            >
              {/* En-tête de la question */}
              <div className="px-6 py-4 bg-slate-800/50 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  a.isFullyCorrect 
                    ? 'bg-green-600' 
                    : a.earnedPoints > 0 
                    ? 'bg-yellow-600' 
                    : 'bg-red-600'
                }`}>
                  {a.isFullyCorrect ? (
                    <Check size={20} className="text-white" />
                  ) : (
                    <X size={20} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Question {idx + 1}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      a.isFullyCorrect 
                        ? 'bg-green-600/30 text-green-400' 
                        : a.earnedPoints > 0
                        ? 'bg-yellow-600/30 text-yellow-400'
                        : 'bg-red-600/30 text-red-400'
                    }`}>
                      {a.earnedPoints.toFixed(1)} / {a.question.points} pts
                    </span>
                  </div>
                  <p className="text-white font-medium mt-1">{a.question.question}</p>
                  {a.question.multipleCorrect && (
                    <span className="text-xs text-purple-400 mt-1 inline-block">
                      (Plusieurs réponses attendues)
                    </span>
                  )}
                </div>
              </div>

              {/* Options avec feedback */}
              <div className="p-4 space-y-2">
                {a.question.options.map((option, oIdx) => {
                  const wasSelected = a.userAnswers.includes(oIdx);
                  const isCorrect = a.question.correctAnswers.includes(oIdx);
                  
                  let bgClass = 'bg-slate-800/30 border-slate-700';
                  let textClass = 'text-slate-400';
                  let icon = null;

                  if (wasSelected && isCorrect) {
                    // Sélectionné et correct ✓
                    bgClass = 'bg-green-900/30 border-green-600';
                    textClass = 'text-green-300';
                    icon = <Check size={16} className="text-green-400" />;
                  } else if (wasSelected && !isCorrect) {
                    // Sélectionné mais faux ✗
                    bgClass = 'bg-red-900/30 border-red-600';
                    textClass = 'text-red-300 line-through';
                    icon = <X size={16} className="text-red-400" />;
                  } else if (!wasSelected && isCorrect) {
                    // Non sélectionné mais c'était correct
                    bgClass = 'bg-yellow-900/20 border-yellow-600/50';
                    textClass = 'text-yellow-300';
                    icon = <AlertCircle size={16} className="text-yellow-400" />;
                  }

                  return (
                    <div
                      key={oIdx}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${bgClass}`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        {icon}
                      </div>
                      <span className={textClass}>{option}</span>
                      {!wasSelected && isCorrect && config.showCorrectAnswers && (
                        <span className="ml-auto text-xs text-yellow-400">
                          (Réponse attendue)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explication (si activée et disponible) */}
              {config.showExplanations && a.question.explanation && (
                <div className="mx-4 mb-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-2">
                    <AlertCircle size={14} />
                    Explication
                  </div>
                  <p className="text-blue-200 text-sm">{a.question.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Résumé final */}
      <div className="sticky bottom-0 p-4 bg-[#151820] border-t border-white/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">
                {analysis.filter(a => a.isFullyCorrect).length}
              </div>
              <div className="text-xs text-slate-500">Correctes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">
                {analysis.filter(a => !a.isFullyCorrect && a.earnedPoints > 0).length}
              </div>
              <div className="text-xs text-slate-500">Partielles</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">
                {analysis.filter(a => a.earnedPoints === 0).length}
              </div>
              <div className="text-xs text-slate-500">Incorrectes</div>
            </div>
          </div>
          
          <div className={`text-2xl font-black px-6 py-2 rounded-xl ${
            score >= 80 
              ? 'bg-green-600/20 text-green-400' 
              : score >= 50 
              ? 'bg-yellow-600/20 text-yellow-400'
              : 'bg-red-600/20 text-red-400'
          }`}>
            {score >= 80 ? '🎉 Excellent !' : score >= 50 ? '👍 Bien joué' : '📚 À revoir'}
          </div>
        </div>
      </div>
    </div>
  );
}
