'use client';

import { useState } from 'react';
import { Video, X, Save, User, Clock, Check, Award, Play } from 'lucide-react';
import { VideoInteractiveExerciseConfig } from '../types';
import { VideoSubmission } from './VideoPlayer';

interface VideoEvaluatorProps {
  config: VideoInteractiveExerciseConfig;
  submission: VideoSubmission;
  onSave: (evaluatedSubmission: VideoSubmission) => void;
  onClose: () => void;
}

export default function VideoEvaluator({
  config,
  submission,
  onSave,
  onClose
}: VideoEvaluatorProps) {
  const questionMarkers = config.markers.filter(m => m.type === 'question');
  
  // Évaluer chaque réponse
  const evaluatedAnswers = submission.answers.map(answer => {
    const marker = questionMarkers.find(m => m.id === answer.markerId);
    return {
      markerId: answer.markerId,
      question: marker?.question || '',
      timestamp: marker?.timestamp || 0,
      options: marker?.options || [],
      correctIndex: marker?.correctAnswerIndex ?? -1,
      answerIndex: answer.answerIndex,
      isCorrect: answer.isCorrect,
      points: marker?.points || 0
    };
  });

  const correctCount = evaluatedAnswers.filter(a => a.isCorrect).length;
  const autoScore = evaluatedAnswers.reduce((sum, a) => 
    sum + (a.isCorrect ? a.points : 0), 0
  );

  const [manualScore, setManualScore] = useState<number | null>(submission.score ?? autoScore);
  const [comment, setComment] = useState('');

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    const evaluatedSubmission: VideoSubmission = {
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
              <Video className="text-rose-400" size={24} />
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
                  {correctCount} / {questionMarkers.length} correct
                </p>
                <p className="text-slate-500 text-sm">{autoScore} / {config.totalPoints} points</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              correctCount === questionMarkers.length 
                ? 'bg-green-500/20 text-green-400'
                : correctCount >= questionMarkers.length / 2
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
            }`}>
              {Math.round((correctCount / questionMarkers.length) * 100)}%
            </div>
          </div>

          {/* Détail des questions */}
          <div className="space-y-4">
            <h3 className="text-slate-300 font-semibold">Détail des réponses</h3>
            
            {evaluatedAnswers.map((answer, index) => (
              <div
                key={answer.markerId}
                className={`p-4 rounded-xl border-2 ${
                  answer.isCorrect
                    ? 'bg-green-500/10 border-green-500'
                    : 'bg-red-500/10 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      answer.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Play size={14} className="text-rose-400" />
                        <span className="text-sm text-slate-400">
                          {formatTime(answer.timestamp)}
                        </span>
                      </div>
                      <p className="text-white font-medium">{answer.question}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    answer.isCorrect
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {answer.isCorrect ? `+${answer.points}` : '0'} pts
                  </span>
                </div>

                {/* Options */}
                <div className="ml-11 space-y-1">
                  {answer.options.map((option, optIdx) => {
                    const isStudentAnswer = optIdx === answer.answerIndex;
                    const isCorrectOption = optIdx === answer.correctIndex;

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                          isCorrectOption
                            ? 'bg-green-500/20 text-green-300'
                            : isStudentAnswer
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-slate-800/50 text-slate-400'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          isCorrectOption
                            ? 'bg-green-500 text-white'
                            : isStudentAnswer
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-600 text-slate-300'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{option}</span>
                        {isCorrectOption && <Check size={14} className="ml-auto" />}
                        {isStudentAnswer && !isCorrectOption && (
                          <span className="ml-auto text-xs">(réponse étudiant)</span>
                        )}
                      </div>
                    );
                  })}
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
