'use client';

import { useState, useEffect } from 'react';
import { 
  X, Send, Check, XIcon, MessageSquare, Star, 
  AlertCircle, CheckCircle, User, Clock, Target,
  ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { SchemaExerciseConfig, SchemaExerciseSubmission } from '../types';
import SchemaCanvas from './SchemaCanvas';

interface SchemaExerciseEvaluatorProps {
  config: SchemaExerciseConfig;
  submission: SchemaExerciseSubmission;
  evaluatorId: string;
  evaluatorName: string;
  onEvaluate: (evaluatedSubmission: SchemaExerciseSubmission) => void;
  onCancel: () => void;
}

interface BlockEvaluation {
  correct: boolean;
  points: number;
  comment?: string;
}

export default function SchemaExerciseEvaluator({
  config,
  submission,
  evaluatorId,
  evaluatorName,
  onEvaluate,
  onCancel
}: SchemaExerciseEvaluatorProps) {
  // Évaluations par bloc
  const [blockEvaluations, setBlockEvaluations] = useState<Record<string, BlockEvaluation>>({});
  
  // Commentaire général
  const [generalFeedback, setGeneralFeedback] = useState('');
  
  // UI
  const [selectedBlock, setSelectedBlock] = useState<string | null>(config.blocks[0]?.id || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Initialiser les évaluations avec auto-correction pour drag & drop
  useEffect(() => {
    const initialEvals: Record<string, BlockEvaluation> = {};
    
    config.blocks.forEach(block => {
      const studentAnswer = submission.answers[block.id] || '';
      const isCorrect = config.mode === 'drag-drop' 
        ? studentAnswer.toLowerCase().trim() === block.answer.toLowerCase().trim()
        : false; // Pour saisie libre, on laisse le correcteur décider
      
      initialEvals[block.id] = {
        correct: isCorrect,
        points: isCorrect ? block.points : 0,
        comment: ''
      };
    });
    
    setBlockEvaluations(initialEvals);
  }, [config, submission]);

  // Calculer le score total
  const totalScore = Object.values(blockEvaluations).reduce((sum, e) => sum + e.points, 0);

  // Mettre à jour l'évaluation d'un bloc
  const updateBlockEvaluation = (blockId: string, updates: Partial<BlockEvaluation>) => {
    setBlockEvaluations(prev => ({
      ...prev,
      [blockId]: { ...prev[blockId], ...updates }
    }));
  };

  // Toggle correct/incorrect
  const toggleCorrect = (blockId: string) => {
    const block = config.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const current = blockEvaluations[blockId];
    const newCorrect = !current.correct;
    
    updateBlockEvaluation(blockId, {
      correct: newCorrect,
      points: newCorrect ? block.points : 0
    });
  };

  // Navigation entre blocs
  const navigateBlock = (direction: 'prev' | 'next') => {
    const currentIndex = config.blocks.findIndex(b => b.id === selectedBlock);
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(config.blocks.length - 1, currentIndex + 1);
    setSelectedBlock(config.blocks[newIndex].id);
  };

  // Soumettre l'évaluation
  const handleSubmit = () => {
    setIsSubmitting(true);

    const evaluatedSubmission: SchemaExerciseSubmission = {
      ...submission,
      status: 'evaluated',
      score: totalScore,
      evaluatorId,
      evaluatorName,
      evaluatedAt: new Date().toISOString(),
      feedback: generalFeedback,
      blockFeedback: Object.fromEntries(
        Object.entries(blockEvaluations).map(([id, eval_]) => [
          id,
          { correct: eval_.correct, comment: eval_.comment }
        ])
      )
    };

    onEvaluate(evaluatedSubmission);
  };

  const selectedBlockData = selectedBlock ? config.blocks.find(b => b.id === selectedBlock) : null;
  const selectedBlockIndex = selectedBlock ? config.blocks.findIndex(b => b.id === selectedBlock) : 0;
  const studentAnswer = selectedBlock ? submission.answers[selectedBlock] || '' : '';
  const blockEval = selectedBlock ? blockEvaluations[selectedBlock] : null;

  // Stats rapides
  const correctCount = Object.values(blockEvaluations).filter(e => e.correct).length;
  const incorrectCount = config.blocks.length - correctCount;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1d24] w-[95vw] h-[95vh] rounded-xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151820]">
          <div>
            <h2 className="text-lg font-bold text-white">Évaluation - {config.title}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
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
          
          <div className="flex items-center gap-4">
            {/* Score */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
              <Star className="text-yellow-400" size={18} />
              <span className="text-2xl font-bold text-white">{totalScore}</span>
              <span className="text-gray-400">/ {config.totalPoints}</span>
            </div>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                showPreview ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <Eye size={16} />
              {showPreview ? 'Masquer' : 'Aperçu'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-white font-medium"
            >
              <Send size={16} />
              Valider l'évaluation
            </button>
            
            <button onClick={onCancel} className="p-2 hover:bg-red-600/20 rounded-lg text-red-400">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Zone du schéma */}
          <SchemaCanvas 
            mode="evaluator"
            imageUrl={config.imageUrl}
            blocks={config.blocks}
            answers={submission.answers}
            evaluations={blockEvaluations}
            selectedBlockId={selectedBlock}
            onBlockSelect={setSelectedBlock}
          />

          {/* Panneau d'évaluation */}
          <div className="w-80 bg-[#151820] border-l border-white/10 flex flex-col overflow-hidden">
            {/* Navigation blocs */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <button
                onClick={() => navigateBlock('prev')}
                disabled={selectedBlockIndex === 0}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-30 text-gray-400"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-white font-medium">
                Bloc {selectedBlockIndex + 1} / {config.blocks.length}
              </span>
              <button
                onClick={() => navigateBlock('next')}
                disabled={selectedBlockIndex === config.blocks.length - 1}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-30 text-gray-400"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Détails du bloc sélectionné */}
            {selectedBlockData && blockEval && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Réponse attendue */}
                <div className="p-3 bg-gray-800 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">Réponse attendue</span>
                  <span className="text-white font-medium">{selectedBlockData.answer}</span>
                </div>

                {/* Réponse de l'étudiant */}
                <div className={`p-3 rounded-lg ${
                  blockEval.correct ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'
                }`}>
                  <span className="text-xs text-gray-500 block mb-1">Réponse de l'étudiant</span>
                  <span className={`font-medium ${blockEval.correct ? 'text-green-400' : 'text-red-400'}`}>
                    {studentAnswer || '(non répondu)'}
                  </span>
                </div>

                {/* Toggle correct/incorrect */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleCorrect(selectedBlock!)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                      blockEval.correct
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <CheckCircle size={16} />
                    Correct
                  </button>
                  <button
                    onClick={() => {
                      if (blockEval.correct) toggleCorrect(selectedBlock!);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                      !blockEval.correct
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <AlertCircle size={16} />
                    Incorrect
                  </button>
                </div>

                {/* Points */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Points attribués (max: {selectedBlockData.points})
                  </label>
                  <input
                    type="number"
                    value={blockEval.points}
                    onChange={(e) => updateBlockEvaluation(selectedBlock!, { 
                      points: Math.min(selectedBlockData.points, Math.max(0, parseInt(e.target.value) || 0))
                    })}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
                    min="0"
                    max={selectedBlockData.points}
                  />
                </div>

                {/* Commentaire sur le bloc */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1">
                    <MessageSquare size={12} />
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={blockEval.comment || ''}
                    onChange={(e) => updateBlockEvaluation(selectedBlock!, { comment: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 h-20 resize-none text-sm"
                    placeholder="Feedback pour l'étudiant..."
                  />
                </div>
              </div>
            )}

            {/* Stats et feedback général */}
            <div className="border-t border-white/10 p-4 space-y-3 bg-[#0d0f12]">
              {/* Stats rapides */}
              <div className="flex items-center justify-around text-sm">
                <div className="text-center">
                  <div className="text-green-400 font-bold text-lg">{correctCount}</div>
                  <div className="text-xs text-gray-500">Corrects</div>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-center">
                  <div className="text-red-400 font-bold text-lg">{incorrectCount}</div>
                  <div className="text-xs text-gray-500">Incorrects</div>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-center">
                  <div className="text-yellow-400 font-bold text-lg">{Math.round((totalScore / config.totalPoints) * 100)}%</div>
                  <div className="text-xs text-gray-500">Score</div>
                </div>
              </div>

              {/* Feedback général */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Commentaire général</label>
                <textarea
                  value={generalFeedback}
                  onChange={(e) => setGeneralFeedback(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 h-16 resize-none text-sm"
                  placeholder="Feedback global pour l'étudiant..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}