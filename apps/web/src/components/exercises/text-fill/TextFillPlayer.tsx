'use client';

import { useState, useEffect } from 'react';
import { TextFillExerciseConfig } from '../types';

interface TextFillPlayerProps {
  config: TextFillExerciseConfig;
  onComplete: (answers: Record<string, string>, score: number) => void;
}

export default function TextFillPlayer({ config, onComplete }: TextFillPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);

  useEffect(() => {
    if (config.mode === 'drag-drop') {
      // Shuffle words
      const words = config.gaps.map(g => g.word);
      for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
      }
      setAvailableWords(words);
    }
  }, [config]);

  const handleDrop = (gapId: string) => {
    if (!draggedWord) return;
    
    // Si déjà rempli, remettre l'ancien mot dans la liste ?
    // Simplification: Drag & Drop remplace, mot revient dans la liste si on le sort ?
    // Pour l'instant : simple assignment.
    
    setAnswers(prev => ({
        ...prev,
        [gapId]: draggedWord
    }));
    
    // Retirer de la liste disponible
    setAvailableWords(prev => prev.filter(w => w !== draggedWord));
    setDraggedWord(null);
  };

  const returnToPool = (gapId: string) => {
      const word = answers[gapId];
      if (!word) return;
      
      setAnswers(prev => {
          const next = { ...prev };
          delete next[gapId];
          return next;
      });
      setAvailableWords(prev => [...prev, word]);
  };

  const checkResults = () => {
      let score = 0;
      let total = 0;
      
      config.gaps.forEach(gap => {
          total += gap.points;
          const answer = answers[gap.id]?.trim();
          const correct = config.caseSensitive 
            ? answer === gap.word 
            : answer?.toLowerCase() === gap.word.toLowerCase();
            
          if (correct) score += gap.points;
      });
      
      onComplete(answers, Math.round((score / total) * 100));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">{config.title}</h2>
        
        <div className="flex-1 overflow-y-auto mb-6">
            <div className="prose prose-invert max-w-none text-lg leading-loose">
                {config.content.split(/(\{\{gap-\d+\}\})/).map((part, i) => {
                    if (part.startsWith('{{gap-')) {
                        const id = part.replace('{{', '').replace('}}', '');
                        const gap = config.gaps.find(g => g.id === id);
                        if (!gap) return null;
                        
                        const filledWord = answers[id];
                        
                        if (config.mode === 'input') {
                            return (
                                <input 
                                    key={i}
                                    value={filledWord || ''}
                                    onChange={(e) => setAnswers(prev => ({...prev, [id]: e.target.value}))}
                                    className="mx-1 bg-slate-800 border-b-2 border-slate-600 focus:border-blue-500 outline-none px-2 py-0.5 text-center min-w-[100px] text-blue-300 transition-colors"
                                    placeholder={gap.hint || "..."}
                                />
                            );
                        } else {
                            return (
                                <span 
                                    key={i}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDrop(id)}
                                    onClick={() => returnToPool(id)}
                                    className={`mx-1 inline-block min-w-[80px] h-[32px] align-bottom rounded border-2 border-dashed transition-all cursor-pointer ${
                                        filledWord 
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 px-2' 
                                        : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                                    }`}
                                >
                                    {filledWord}
                                </span>
                            );
                        }
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        </div>

        {config.mode === 'drag-drop' && (
            <div className="p-4 bg-slate-800 rounded-xl min-h-[80px] flex flex-wrap gap-3 mb-6 border border-slate-700">
                {availableWords.length === 0 && Object.keys(answers).length === 0 ? (
                    <span className="text-slate-500 italic">Chargement des mots...</span>
                ) : availableWords.length === 0 ? (
                    <span className="text-green-400 italic">Tous les mots sont placés !</span>
                ) : (
                    availableWords.map((word, i) => (
                        <div 
                            key={i}
                            draggable
                            onDragStart={() => setDraggedWord(word)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg cursor-grab active:cursor-grabbing shadow-lg font-bold"
                        >
                            {word}
                        </div>
                    ))
                )}
            </div>
        )}

        <button 
            onClick={checkResults}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95"
        >
            Valider mes réponses
        </button>
    </div>
  );
}
