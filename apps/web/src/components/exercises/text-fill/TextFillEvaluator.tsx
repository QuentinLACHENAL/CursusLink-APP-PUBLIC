'use client';

import { TextFillExerciseConfig } from '../types';

interface TextFillEvaluatorProps {
  config: TextFillExerciseConfig;
  answers: Record<string, string>;
  score: number;
}

export default function TextFillEvaluator({ config, answers, score }: TextFillEvaluatorProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{config.title}</h2>
            <div className={`px-4 py-2 rounded-lg font-black text-xl ${score >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                {score}%
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            <div className="prose prose-invert max-w-none text-lg leading-loose">
                {config.content.split(/(\{\{gap-\d+\}\})/).map((part, i) => {
                    if (part.startsWith('{{gap-')) {
                        const id = part.replace('{{', '').replace('}}', '');
                        const gap = config.gaps.find(g => g.id === id);
                        if (!gap) return null;
                        
                        const answer = answers[id];
                        const isCorrect = config.caseSensitive 
                            ? answer === gap.word 
                            : answer?.toLowerCase() === gap.word.toLowerCase();
                        
                        return (
                            <span key={i} className="mx-1 relative group inline-block">
                                <span className={`px-2 py-0.5 rounded font-bold border-b-2 ${
                                    isCorrect 
                                    ? 'bg-green-900/30 text-green-400 border-green-500' 
                                    : 'bg-red-900/30 text-red-400 border-red-500 line-through decoration-red-500'
                                }`}>
                                    {answer || '(vide)'}
                                </span>
                                {!isCorrect && (
                                    <span className="absolute -top-6 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-xl whitespace-nowrap z-10">
                                        {gap.word}
                                    </span>
                                )}
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        </div>
    </div>
  );
}
