'use client';

import { useState } from 'react';
import { Calculator, X, Save, User, Clock, Check, Award, Target } from 'lucide-react';
import { EstimationExerciseConfig } from '../types';
import { EstimationSubmission } from './EstimationPlayer';

interface EstimationEvaluatorProps {
  config: EstimationExerciseConfig;
  submission: EstimationSubmission;
  onSave: (evaluatedSubmission: EstimationSubmission) => void;
  onClose: () => void;
}

interface EvaluatedQuestion {
  questionId: string;
  questionText: string;
  unit: string;
  studentValue: number;
  correctValue: number;
  tolerance: number;
  deviation: number;
  isCorrect: boolean;
  maxPoints: number;
  earnedPoints: number;
}

export default function EstimationEvaluator({
  config,
  submission,
  onSave,
  onClose
}: EstimationEvaluatorProps) {
  // Évaluer chaque question
  const evaluatedQuestions: EvaluatedQuestion[] = config.questions.map(q => {
    const answer = submission.answers.find(a => a.questionId === q.id);
    const studentValue = answer?.value ?? 0;
    const deviation = Math.abs((studentValue - q.correctValue) / q.correctValue) * 100;
    const isCorrect = deviation <= q.tolerance;

    let earnedPoints = 0;
    if (isCorrect) {
      earnedPoints = q.points;
    } else if (config.partialCredit) {
      const maxDeviation = q.tolerance * 2;
      if (deviation <= maxDeviation) {
        earnedPoints = Math.floor(q.points * (1 - (deviation - q.tolerance) / q.tolerance));
      }
    }

    return {
      questionId: q.id,
      questionText: q.question,
      unit: q.unit,
      studentValue,
      correctValue: q.correctValue,
      tolerance: q.tolerance,
      deviation,
      isCorrect,
      maxPoints: q.points,
      earnedPoints
    };
  });

  const correctCount = evaluatedQuestions.filter(q => q.isCorrect).length;
  const autoScore = evaluatedQuestions.reduce((sum, q) => sum + q.earnedPoints, 0);
  const avgDeviation = evaluatedQuestions.reduce((sum, q) => sum + q.deviation, 0) / evaluatedQuestions.length;

  const [manualScore, setManualScore] = useState<number | null>(submission.score ?? autoScore);
  const [comment, setComment] = useState('');

  const handleSave = () => {
    const evaluatedSubmission: EstimationSubmission = {
      ...submission,
      status: 'evaluated',
      score: manualScore ?? autoScore
    };
    onSave(evaluatedSubmission);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="text-amber-400" size={24} />
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
                    {correctCount}/{config.questions.length} correct
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <Target className="text-cyan-400" size={24} />
                <div>
                  <p className="text-sm text-slate-400">Écart moyen</p>
                  <p className="text-xl font-bold text-white">{avgDeviation.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <Check className="text-green-400" size={24} />
                <div>
                  <p className="text-sm text-slate-400">Points auto</p>
                  <p className="text-xl font-bold text-white">{autoScore}/{config.totalPoints}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Détail par question */}
          <div className="space-y-4">
            <h3 className="text-slate-300 font-semibold">Détail des estimations</h3>
            
            {evaluatedQuestions.map((eq, index) => (
              <div
                key={eq.questionId}
                className={`p-4 rounded-xl border-2 ${
                  eq.isCorrect
                    ? 'bg-green-500/10 border-green-500'
                    : eq.earnedPoints > 0
                      ? 'bg-yellow-500/10 border-yellow-500'
                      : 'bg-red-500/10 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      eq.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium">{eq.questionText}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Tolérance: ±{eq.tolerance}%
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    eq.earnedPoints === eq.maxPoints
                      ? 'bg-green-500/20 text-green-400'
                      : eq.earnedPoints > 0
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}>
                    +{eq.earnedPoints}/{eq.maxPoints} pts
                  </span>
                </div>

                <div className="ml-11 grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Réponse étudiant</p>
                    <p className={eq.isCorrect ? 'text-green-300 font-medium' : 'text-red-300 font-medium'}>
                      {eq.studentValue} {eq.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Valeur correcte</p>
                    <p className="text-green-300 font-medium">
                      {eq.correctValue} {eq.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Écart</p>
                    <p className={`font-medium ${
                      eq.deviation <= eq.tolerance 
                        ? 'text-green-400' 
                        : eq.deviation <= eq.tolerance * 2
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}>
                      {eq.deviation.toFixed(1)}%
                      {eq.isCorrect && ' ✓'}
                    </p>
                  </div>
                </div>

                {/* Barre visuelle */}
                <div className="ml-11 mt-3">
                  <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                    {/* Zone de tolérance */}
                    <div 
                      className="absolute h-full bg-green-500/30"
                      style={{
                        left: `${Math.max(0, 50 - eq.tolerance/2)}%`,
                        width: `${Math.min(100, eq.tolerance)}%`
                      }}
                    />
                    {/* Position correcte */}
                    <div 
                      className="absolute w-1 h-full bg-green-500"
                      style={{ left: '50%', transform: 'translateX(-50%)' }}
                    />
                    {/* Position étudiant */}
                    <div 
                      className={`absolute w-2 h-2 rounded-full -top-0.5 ${
                        eq.isCorrect ? 'bg-green-400' : 'bg-red-400'
                      }`}
                      style={{ 
                        left: `${Math.max(0, Math.min(100, 50 + (eq.studentValue - eq.correctValue) / eq.correctValue * 50))}%`,
                        transform: 'translateX(-50%)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{(eq.correctValue * 0.5).toFixed(0)} {eq.unit}</span>
                    <span>{eq.correctValue} {eq.unit}</span>
                    <span>{(eq.correctValue * 1.5).toFixed(0)} {eq.unit}</span>
                  </div>
                </div>
              </div>
            ))}
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
