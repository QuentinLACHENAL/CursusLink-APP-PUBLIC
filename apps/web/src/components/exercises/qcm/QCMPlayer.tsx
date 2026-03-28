'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, X, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { QCMExerciseConfig, QCMQuestion } from '../types';

interface QCMPlayerProps {
  config: QCMExerciseConfig;
  onComplete: (answers: Record<string, number[]>, score: number) => void;
}

export default function QCMPlayer({ config, onComplete }: QCMPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(config.timeLimit || null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Mélanger les questions si nécessaire
  const questions = useMemo(() => {
    if (config.shuffleQuestions) {
      return [...config.questions].sort(() => Math.random() - 0.5);
    }
    return config.questions;
  }, [config.questions, config.shuffleQuestions]);

  // Mélanger les options si nécessaire (avec tracking des indices originaux)
  const shuffledOptions = useMemo(() => {
    return questions.map(q => {
      if (config.shuffleOptions) {
        const indices = q.options.map((_, i) => i);
        indices.sort(() => Math.random() - 0.5);
        return {
          options: indices.map(i => q.options[i]),
          originalIndices: indices
        };
      }
      return {
        options: q.options,
        originalIndices: q.options.map((_, i) => i)
      };
    });
  }, [questions, config.shuffleOptions]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const toggleAnswer = (questionId: string, optionIndex: number, isMultiple: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      
      if (isMultiple) {
        // Toggle l'option
        if (current.includes(optionIndex)) {
          return { ...prev, [questionId]: current.filter(i => i !== optionIndex) };
        } else {
          return { ...prev, [questionId]: [...current, optionIndex] };
        }
      } else {
        // Remplacer par la nouvelle option
        return { ...prev, [questionId]: [optionIndex] };
      }
    });
  };

  const calculateScore = () => {
    let totalScore = 0;
    let maxScore = 0;

    questions.forEach((q, qIdx) => {
      maxScore += q.points;
      const userAnswers = answers[q.id] || [];
      const shuffled = shuffledOptions[qIdx];
      
      // Convertir les réponses utilisateur vers les indices originaux
      const originalUserAnswers = userAnswers.map(i => shuffled.originalIndices[i]);
      
      if (config.allowPartialCredit && q.multipleCorrect) {
        // Points partiels: proportionnel aux bonnes réponses
        const correctCount = q.correctAnswers.length;
        let correct = 0;
        let incorrect = 0;
        
        originalUserAnswers.forEach(idx => {
          if (q.correctAnswers.includes(idx)) {
            correct++;
          } else {
            incorrect++;
          }
        });
        
        // Pénalité pour mauvaises réponses
        const score = Math.max(0, (correct - incorrect) / correctCount) * q.points;
        totalScore += score;
      } else {
        // Tout ou rien
        const isCorrect = 
          originalUserAnswers.length === q.correctAnswers.length &&
          originalUserAnswers.every(idx => q.correctAnswers.includes(idx));
        
        if (isCorrect) {
          totalScore += q.points;
        }
      }
    });

    return Math.round((totalScore / maxScore) * 100);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const score = calculateScore();
    onComplete(answers, score);
  };

  const q = questions[currentQuestion];
  const shuffled = shuffledOptions[currentQuestion];
  const qAnswers = answers[q?.id] || [];

  const answeredCount = questions.filter(q => (answers[q.id] || []).length > 0).length;
  const progress = (answeredCount / questions.length) * 100;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header avec progression et timer */}
      <div className="p-4 border-b border-white/10 bg-[#151820]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{config.title}</h2>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              timeLeft < 60 ? 'bg-red-600/30 text-red-400' : 'bg-slate-800 text-slate-300'
            }`}>
              <Clock size={16} />
              <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        
        {/* Barre de progression */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">
            {answeredCount}/{questions.length}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-6">
        {q && (
          <div className="max-w-2xl mx-auto">
            {/* Numéro et énoncé */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold">
                  {currentQuestion + 1}
                </span>
                <div className="flex-1">
                  <span className="text-xs text-slate-500">
                    Question {currentQuestion + 1} sur {questions.length}
                    {q.multipleCorrect && ' • Plusieurs réponses possibles'}
                  </span>
                </div>
                <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                  {q.points} pt{q.points > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl text-white leading-relaxed">{q.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {shuffled.options.map((option, idx) => {
                const isSelected = qAnswers.includes(idx);
                
                return (
                  <button
                    key={idx}
                    onClick={() => toggleAnswer(q.id, idx, q.multipleCorrect)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-purple-600 border-purple-500'
                        : 'border-slate-600'
                    }`}>
                      {isSelected && <Check size={16} className="text-white" />}
                    </div>
                    <span className={`flex-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-white/10 bg-[#151820] flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
        >
          <ChevronLeft size={18} /> Précédent
        </button>

        {/* Dots de navigation */}
        <div className="flex gap-1">
          {questions.map((q, i) => {
            const isAnswered = (answers[q.id] || []).length > 0;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentQuestion
                    ? 'bg-purple-500 scale-125'
                    : isAnswered
                    ? 'bg-green-500'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            );
          })}
        </div>

        {currentQuestion === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg font-bold flex items-center gap-2"
          >
            Terminer <Check size={18} />
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2"
          >
            Suivant <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
