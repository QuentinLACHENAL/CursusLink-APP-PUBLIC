'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Send, Clock, HelpCircle, RotateCcw, CheckCircle,
  GripVertical, AlertTriangle, Target, Shuffle
} from 'lucide-react';
import { SchemaExerciseConfig, SchemaBlock, SchemaExerciseSubmission } from '../types';

interface SchemaExercisePlayerProps {
  config: SchemaExerciseConfig;
  studentId: string;
  studentName: string;
  onSubmit: (submission: SchemaExerciseSubmission) => void;
  onCancel: () => void;
}

export default function SchemaExercisePlayer({
  config,
  studentId,
  studentName,
  onSubmit,
  onCancel
}: SchemaExercisePlayerProps) {
  // Réponses de l'étudiant
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Pour le mode drag & drop
  const [availableAnswers, setAvailableAnswers] = useState<string[]>([]);
  const [draggedAnswer, setDraggedAnswer] = useState<string | null>(null);
  const [dragOverBlock, setDragOverBlock] = useState<string | null>(null);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(config.timeLimit || null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  // UI
  const [showHint, setShowHint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Initialiser les réponses disponibles pour drag & drop
  useEffect(() => {
    if (config.mode === 'drag-drop') {
      const answers = config.blocks.map(b => b.answer);
      setAvailableAnswers(config.shuffleBlocks ? shuffleArray([...answers]) : answers);
    }
  }, [config]);

  // Timer persistent avec localStorage
  useEffect(() => {
    if (!config.timeLimit) return;
    
    const STORAGE_KEY = `schema_exercise_start_${config.id}_${studentId}`;
    
    // Initialiser ou récupérer le temps de début
    let startTime = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(STORAGE_KEY, startTime.toString());
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, config.timeLimit! - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        setIsTimeUp(true);
        // Important: nettoyer le storage une fois terminé pour éviter des boucles
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    // Mise à jour immédiate
    updateTimer();

    // Intervalle de mise à jour
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [config.timeLimit, config.id, studentId]);

  // Auto-submit quand le temps est écoulé
  useEffect(() => {
    if (isTimeUp && !isSubmitting) {
      handleSubmit(true);
    }
  }, [isTimeUp]);

  const cleanUpStorage = () => {
    if (config.timeLimit) {
      localStorage.removeItem(`schema_exercise_start_${config.id}_${studentId}`);
    }
  };

  // Mélanger un tableau
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Formater le temps
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mettre à jour une réponse (mode saisie libre)
  const updateAnswer = (blockId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [blockId]: value }));
  };

  // Drag & Drop handlers
  const handleDragStart = (answer: string) => {
    setDraggedAnswer(answer);
  };

  const handleDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    setDragOverBlock(blockId);
  };

  const handleDragLeave = () => {
    setDragOverBlock(null);
  };

  const handleDrop = (blockId: string) => {
    if (!draggedAnswer) return;
    
    // Si le bloc a déjà une réponse, la remettre dans la liste
    const currentAnswer = answers[blockId];
    if (currentAnswer) {
      setAvailableAnswers(prev => [...prev, currentAnswer]);
    }
    
    // Assigner la nouvelle réponse
    setAnswers(prev => ({ ...prev, [blockId]: draggedAnswer }));
    
    // Retirer de la liste disponible
    setAvailableAnswers(prev => prev.filter(a => a !== draggedAnswer));
    
    setDraggedAnswer(null);
    setDragOverBlock(null);
  };

  // Retirer une réponse d'un bloc
  const removeAnswer = (blockId: string) => {
    const answer = answers[blockId];
    if (answer) {
      setAvailableAnswers(prev => [...prev, answer]);
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[blockId];
        return newAnswers;
      });
    }
  };

  // Réinitialiser
  const handleReset = () => {
    if (config.mode === 'drag-drop') {
      const allAnswers = config.blocks.map(b => b.answer);
      setAvailableAnswers(config.shuffleBlocks ? shuffleArray([...allAnswers]) : allAnswers);
    }
    setAnswers({});
  };

  // Soumettre
  const handleSubmit = async (forced = false) => {
    if (!forced) {
      const unanswered = config.blocks.filter(b => !answers[b.id]);
      if (unanswered.length > 0) {
        setConfirmSubmit(true);
        return;
      }
    }

    setIsSubmitting(true);
    cleanUpStorage();

    const submission: SchemaExerciseSubmission = {
      id: `submission-${Date.now()}`,
      exerciseId: config.id,
      studentId,
      studentName,
      answers,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      maxScore: config.totalPoints
    };

    onSubmit(submission);
  };

  // Compter les réponses données
  const answeredCount = Object.keys(answers).length;
  const totalBlocks = config.blocks.length;
  const progress = (answeredCount / totalBlocks) * 100;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1d24] w-[95vw] h-[95vh] rounded-xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151820]">
          <div>
            <h2 className="text-lg font-bold text-white">{config.title}</h2>
            {config.description && (
              <p className="text-sm text-gray-400 mt-1">{config.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{answeredCount}/{totalBlocks}</span>
            </div>

            {/* Timer */}
            {config.timeLimit && timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                timeRemaining < 60 ? 'bg-red-900/50 text-red-400' : 'bg-gray-800 text-gray-300'
              }`}>
                <Clock size={16} />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </div>
            )}

            <button
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:opacity-50 rounded-lg text-white font-medium"
            >
              <Send size={16} />
              Soumettre
            </button>
            
            <button onClick={onCancel} className="p-2 hover:bg-red-600/20 rounded-lg text-red-400">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Zone du schéma */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-[#0d0f12]">
            <div className="relative">
              <img
                src={config.imageUrl}
                alt="Schéma"
                className="max-w-full max-h-[75vh] rounded-lg shadow-xl"
                draggable={false}
              />
              
              {/* Blocs à remplir */}
              {config.blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`absolute rounded transition-all shadow-sm ${
                    config.mode === 'drag-drop'
                      ? dragOverBlock === block.id
                        ? 'bg-blue-50 border-2 border-blue-400'
                        : answers[block.id]
                          ? 'bg-white border-2 border-green-500'
                          : 'bg-white border-2 border-dashed border-gray-400'
                      : 'bg-white border-2 border-gray-300'
                  }`}
                  style={{
                    left: `${block.x}%`,
                    top: `${block.y}%`,
                    width: `${block.width}%`,
                    height: `${block.height}%`,
                    minWidth: '60px',
                    minHeight: '24px'
                  }}
                  onDragOver={(e) => config.mode === 'drag-drop' && handleDragOver(e, block.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => config.mode === 'drag-drop' && handleDrop(block.id)}
                >
                  {/* Numéro du bloc (Masqué) et Indice */}
                  <div className="absolute -top-5 left-0 flex items-center gap-1">
                    {config.showHints && block.hint && (
                      <button
                        onClick={() => setShowHint(showHint === block.id ? null : block.id)}
                        className="text-yellow-400 hover:text-yellow-300 bg-gray-900/90 rounded-full p-0.5"
                      >
                        <HelpCircle size={14} />
                      </button>
                    )}
                  </div>

                  {/* Indice */}
                  {showHint === block.id && block.hint && (
                    <div className="absolute -top-12 left-0 right-0 text-[10px] text-yellow-300 bg-yellow-900/90 px-2 py-1 rounded z-10">
                      💡 {block.hint}
                    </div>
                  )}

                  {/* Contenu du bloc */}
                  {config.mode === 'free-input' ? (
                    <input
                      type="text"
                      value={answers[block.id] || ''}
                      onChange={(e) => updateAnswer(block.id, e.target.value)}
                      className="w-full h-full bg-transparent text-black text-center text-sm px-1 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="..."
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {answers[block.id] ? (
                        <div 
                          className="bg-blue-600 text-white text-xs px-2 py-1 rounded cursor-pointer hover:bg-blue-700 flex items-center gap-1"
                          onClick={() => removeAnswer(block.id)}
                          title="Cliquer pour retirer"
                        >
                          {answers[block.id]}
                          <X size={10} />
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Glisser ici</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panneau latéral - Réponses disponibles (drag & drop) */}
          {config.mode === 'drag-drop' && (
            <div className="w-64 bg-[#151820] border-l border-white/10 flex flex-col">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Shuffle size={14} />
                    Réponses à placer
                  </h3>
                  <button
                    onClick={handleReset}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                    title="Réinitialiser"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Glissez les étiquettes sur le schéma
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  {availableAnswers.map((answer, index) => (
                    <div
                      key={`${answer}-${index}`}
                      draggable
                      onDragStart={() => handleDragStart(answer)}
                      onDragEnd={() => setDraggedAnswer(null)}
                      className={`flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm cursor-grab active:cursor-grabbing transition-all ${
                        draggedAnswer === answer ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <GripVertical size={14} className="opacity-50" />
                      {answer}
                    </div>
                  ))}
                  
                  {availableAnswers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">Toutes les réponses sont placées !</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Résumé */}
              <div className="p-4 border-t border-white/10 bg-[#0d0f12]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Placées</span>
                  <span className="text-white font-medium">{answeredCount} / {totalBlocks}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-400">Restantes</span>
                  <span className="text-yellow-400 font-medium">{availableAnswers.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Temps écoulé modal */}
        {isTimeUp && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#1a1d24] rounded-xl p-8 max-w-md text-center border border-red-500/30">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Temps écoulé !</h3>
              <p className="text-gray-400 mb-6">Vos réponses ont été automatiquement soumises.</p>
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Confirmation de soumission */}
        {confirmSubmit && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#1a1d24] rounded-xl p-6 max-w-md border border-white/10">
              <h3 className="text-lg font-bold text-white mb-2">Confirmer la soumission ?</h3>
              <p className="text-gray-400 mb-4">
                Vous n'avez pas répondu à toutes les questions ({totalBlocks - answeredCount} restante{totalBlocks - answeredCount > 1 ? 's' : ''}).
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSubmit(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                >
                  Continuer
                </button>
                <button
                  onClick={() => {
                    setConfirmSubmit(false);
                    handleSubmit(true);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white"
                >
                  Soumettre quand même
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
