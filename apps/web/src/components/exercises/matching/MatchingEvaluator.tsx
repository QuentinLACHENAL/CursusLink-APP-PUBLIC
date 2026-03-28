'use client';

import { useState } from 'react';
import { Link2, Check, X, Send, MessageSquare } from 'lucide-react';
import { MatchingExerciseConfig } from '../types';
import { MatchingSubmission } from './MatchingPlayer';

interface MatchingEvaluatorProps {
  config: MatchingExerciseConfig;
  submission: MatchingSubmission;
  evaluatorId: string;
  evaluatorName: string;
  onEvaluate: (evaluation: MatchingEvaluation) => void;
  onCancel: () => void;
}

export interface MatchingEvaluation {
  submissionId: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatedAt: string;
  score: number;
  maxScore: number;
  feedback: string;
  pairResults: Record<string, { correct: boolean; comment?: string }>;
}

export default function MatchingEvaluator({
  config,
  submission,
  evaluatorId,
  evaluatorName,
  onEvaluate,
  onCancel
}: MatchingEvaluatorProps) {
  const [feedback, setFeedback] = useState('');
  const [pairComments, setPairComments] = useState<Record<string, string>>({});

  // Calculer les résultats automatiquement
  const calculateResults = () => {
    const results: Record<string, { correct: boolean; comment?: string }> = {};
    let correctCount = 0;

    config.pairs.forEach(pair => {
      const studentAnswer = submission.answers[pair.id];
      const isCorrect = studentAnswer === pair.id;
      results[pair.id] = {
        correct: isCorrect,
        comment: pairComments[pair.id]
      };
      if (isCorrect) correctCount++;
    });

    return { results, correctCount };
  };

  const { results, correctCount } = calculateResults();
  const score = Math.round((correctCount / config.pairs.length) * config.totalPoints);

  const handleSubmitEvaluation = () => {
    const evaluation: MatchingEvaluation = {
      submissionId: submission.id,
      evaluatorId,
      evaluatorName,
      evaluatedAt: new Date().toISOString(),
      score,
      maxScore: config.totalPoints,
      feedback,
      pairResults: results
    };

    onEvaluate(evaluation);
  };

  // Trouver l'élément de droite choisi par l'étudiant pour un élément de gauche
  const getStudentChoice = (leftId: string) => {
    const rightId = submission.answers[leftId];
    return config.pairs.find(p => p.id === rightId);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="text-cyan-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">Correction : {config.title}</h2>
                <p className="text-sm text-slate-400">
                  Soumis par {submission.studentName} le {new Date(submission.submittedAt).toLocaleDateString('fr-FR')}
                </p>
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

        {/* Score Summary */}
        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-3xl font-bold ${
                correctCount === config.pairs.length 
                  ? 'text-green-400' 
                  : correctCount >= config.pairs.length / 2 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
              }`}>
                {correctCount} / {config.pairs.length}
              </div>
              <div className="text-sm text-slate-400">
                associations correctes
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">{score} pts</div>
              <div className="text-sm text-slate-400">sur {config.totalPoints}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Détail des réponses */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
              Détail des associations
            </h3>
            
            {config.pairs.map((pair) => {
              const studentChoice = getStudentChoice(pair.id);
              const isCorrect = results[pair.id].correct;
              
              return (
                <div 
                  key={pair.id}
                  className={`p-4 rounded-lg border ${
                    isCorrect 
                      ? 'bg-green-500/10 border-green-500/50' 
                      : 'bg-red-500/10 border-red-500/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isCorrect ? <Check size={16} className="text-white" /> : <X size={16} className="text-white" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-2">
                        <div className="text-white font-medium">{pair.left}</div>
                        <Link2 size={16} className={isCorrect ? 'text-green-400' : 'text-red-400'} />
                        <div className={isCorrect ? 'text-green-300' : 'text-red-300'}>
                          {studentChoice?.right || '(non répondu)'}
                        </div>
                      </div>
                      
                      {!isCorrect && (
                        <div className="text-sm text-slate-400 mt-2">
                          Réponse attendue : <span className="text-green-400">{pair.right}</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-slate-500 mt-1">
                        {pair.points} point{pair.points > 1 ? 's' : ''}
                      </div>

                      {/* Commentaire optionnel */}
                      <div className="mt-3">
                        <input
                          type="text"
                          value={pairComments[pair.id] || ''}
                          onChange={(e) => setPairComments({ ...pairComments, [pair.id]: e.target.value })}
                          placeholder="Ajouter un commentaire (optionnel)..."
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded text-sm text-slate-300 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feedback global */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MessageSquare size={16} />
              Feedback global (optionnel)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Commentaires généraux pour l'étudiant..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="text-sm text-slate-400">
            Score calculé automatiquement : <span className="font-bold text-cyan-400">{score}/{config.totalPoints}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitEvaluation}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Send size={18} />
              Valider la correction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
