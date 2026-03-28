'use client';

import { useState } from 'react';
import { Calculator, X, Send, Lightbulb, Target } from 'lucide-react';
import { EstimationExerciseConfig, EstimationQuestion } from '../types';

interface EstimationPlayerProps {
  config: EstimationExerciseConfig;
  studentId: string;
  studentName: string;
  onSubmit: (submission: EstimationSubmission) => void;
  onCancel: () => void;
}

export interface EstimationSubmission {
  id: string;
  exerciseId: string;
  studentId: string;
  studentName: string;
  answers: { questionId: string; value: number }[];
  submittedAt: string;
  status: 'pending' | 'evaluated';
  score?: number;
  maxScore: number;
}

interface QuestionResult {
  questionId: string;
  studentValue: number;
  correctValue: number;
  tolerance: number;
  deviation: number; // % d'écart
  isCorrect: boolean;
  pointsEarned: number;
}

export default function EstimationPlayer({
  config,
  studentId,
  studentName,
  onSubmit,
  onCancel
}: EstimationPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showHints, setShowHints] = useState(false);

  // Mettre à jour une réponse
  const updateAnswer = (questionId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setAnswers(prev => ({
      ...prev,
      [questionId]: numValue
    }));
  };

  // Vérifier si toutes les questions ont une réponse
  const allAnswered = config.questions.every(q => 
    answers[q.id] !== undefined && answers[q.id] !== null
  );

  // Soumettre
  const handleSubmit = () => {
    // Calculer les résultats
    const newResults: QuestionResult[] = config.questions.map(q => {
      const studentValue = answers[q.id] ?? 0;
      const deviation = Math.abs((studentValue - q.correctValue) / q.correctValue) * 100;
      const isCorrect = deviation <= q.tolerance;
      
      let pointsEarned = 0;
      if (isCorrect) {
        pointsEarned = q.points;
      } else if (config.partialCredit) {
        // Points partiels: 0 si > 2x tolérance, sinon proportionnel
        const maxDeviation = q.tolerance * 2;
        if (deviation <= maxDeviation) {
          pointsEarned = Math.floor(q.points * (1 - (deviation - q.tolerance) / q.tolerance));
        }
      }

      return {
        questionId: q.id,
        studentValue,
        correctValue: q.correctValue,
        tolerance: q.tolerance,
        deviation,
        isCorrect,
        pointsEarned
      };
    });

    setResults(newResults);
    setSubmitted(true);

    const totalScore = newResults.reduce((sum, r) => sum + r.pointsEarned, 0);

    const submission: EstimationSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: config.id,
      studentId,
      studentName,
      answers: config.questions.map(q => ({
        questionId: q.id,
        value: answers[q.id] ?? 0
      })),
      submittedAt: new Date().toISOString(),
      status: 'evaluated',
      score: totalScore,
      maxScore: config.totalPoints
    };

    setTimeout(() => onSubmit(submission), 2000);
  };

  const getQuestionResult = (questionId: string) => 
    results.find(r => r.questionId === questionId);

  const correctCount = results.filter(r => r.isCorrect).length;
  const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="text-amber-400" size={24} />
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
          <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between">
            <p className="text-sm text-amber-300">
              💡 Entrez vos estimations. Une tolérance est acceptée pour chaque question.
            </p>
            {config.questions.some(q => q.hint) && (
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {config.questions.map((question, index) => {
            const result = getQuestionResult(question.id);
            const currentValue = answers[question.id];

            return (
              <div
                key={question.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  submitted
                    ? result?.isCorrect
                      ? 'bg-green-500/10 border-green-500'
                      : result && result.pointsEarned > 0
                        ? 'bg-yellow-500/10 border-yellow-500'
                        : 'bg-red-500/10 border-red-500'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                {/* Question */}
                <div className="flex items-start gap-3 mb-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    submitted
                      ? result?.isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-amber-600/30 text-amber-300'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{question.question}</p>
                    {showHints && question.hint && (
                      <p className="text-xs text-yellow-400/80 mt-1 flex items-center gap-1">
                        <Lightbulb size={12} />
                        {question.hint}
                      </p>
                    )}
                    {!submitted && (
                      <p className="text-xs text-slate-500 mt-1">
                        Tolérance: ±{question.tolerance}%
                        {question.minValue !== undefined && question.maxValue !== undefined && (
                          <> • Plage: {question.minValue} - {question.maxValue} {question.unit}</>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{question.points} pts</span>
                </div>

                {/* Input */}
                <div className="flex items-center gap-3 ml-11">
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="number"
                      value={currentValue ?? ''}
                      onChange={(e) => updateAnswer(question.id, e.target.value)}
                      disabled={submitted}
                      min={question.minValue}
                      max={question.maxValue}
                      placeholder="Votre estimation"
                      className={`w-full px-4 py-2 rounded-lg border text-white placeholder-slate-500 ${
                        submitted
                          ? 'bg-slate-800/50 border-slate-600 cursor-not-allowed'
                          : 'bg-slate-700 border-slate-600 focus:border-amber-500 focus:outline-none'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {question.unit}
                    </span>
                  </div>

                  {submitted && result && (
                    <div className="flex items-center gap-3">
                      <Target size={18} className="text-green-400" />
                      <div className="text-sm">
                        <span className="text-green-300 font-medium">
                          {result.correctValue} {question.unit}
                        </span>
                        <span className="text-slate-500 ml-2">
                          (écart: {result.deviation.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Résultat */}
                {submitted && result && (
                  <div className="mt-3 ml-11 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.isCorrect
                        ? 'bg-green-500/20 text-green-400'
                        : result.pointsEarned > 0
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {result.isCorrect 
                        ? '✓ Dans la tolérance' 
                        : result.pointsEarned > 0
                          ? `~${result.pointsEarned} pts (partiel)`
                          : '✗ Hors tolérance'}
                    </span>
                    {!result.isCorrect && (
                      <span className="text-xs text-slate-500">
                        Plage acceptée: {(result.correctValue * (1 - result.tolerance/100)).toFixed(1)} - {(result.correctValue * (1 + result.tolerance/100)).toFixed(1)} {question.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Résultats globaux */}
          {submitted && (
            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {correctCount} / {config.questions.length} correct
                </h3>
                <p className="text-slate-400">
                  Score: {totalScore} / {config.totalPoints} points
                </p>
                {correctCount === config.questions.length ? (
                  <p className="text-green-400 mt-2 font-medium">🎉 Parfait ! Excellentes estimations !</p>
                ) : correctCount >= config.questions.length / 2 ? (
                  <p className="text-yellow-400 mt-2">👍 Bon travail ! Continuez à affiner vos estimations.</p>
                ) : (
                  <p className="text-red-400 mt-2">📚 Révisez les valeurs de référence !</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <span className="text-sm text-slate-500">
            {!submitted 
              ? `${Object.values(answers).filter(v => v !== null && v !== undefined).length}/${config.questions.length} réponses`
              : `Score: ${totalScore}/${config.totalPoints}`
            }
          </span>
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
                disabled={!allAnswered}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
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
