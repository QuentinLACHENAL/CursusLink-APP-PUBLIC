'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Save } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correct: number | number[]; // Support pour choix multiples
  multipleAnswers?: boolean; // Flag pour activer choix multiples
}

interface ExerciseBuilderProps {
  type: 'qcm' | 'schema' | 'matching' | 'none';
  initialData?: string; // JSON string
  onSave: (data: string) => void;
  onClose: () => void;
}

export default function ExerciseBuilder({ type, initialData, onSave, onClose }: ExerciseBuilderProps) {
  const [exerciseName, setExerciseName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (initialData && type === 'qcm') {
      try {
        const parsed = JSON.parse(initialData);
        if (Array.isArray(parsed)) {
          setQuestions(parsed);
        }
      } catch (e) {
        console.error('Invalid JSON data', e);
      }
    }
  }, [initialData, type]);

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', ''],
      correct: 0,
      multipleAnswers: false
    }]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options.push('');
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options.length > 2) {
      updated[questionIndex].options.splice(optionIndex, 1);
      
      // Ajuster les réponses correctes
      const q = updated[questionIndex];
      if (q.multipleAnswers && Array.isArray(q.correct)) {
        // Retirer l'index et ajuster les autres
        q.correct = q.correct
          .filter(idx => idx !== optionIndex)
          .map(idx => idx > optionIndex ? idx - 1 : idx);
        if (q.correct.length === 0) q.correct = [0];
      } else {
        if (q.correct === optionIndex) {
          q.correct = 0;
        } else if (typeof q.correct === 'number' && q.correct > optionIndex) {
          q.correct--;
        }
      }
      setQuestions(updated);
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const setCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    const q = updated[questionIndex];
    
    if (q.multipleAnswers) {
      // Mode choix multiples
      const currentCorrect = Array.isArray(q.correct) ? q.correct : [q.correct as number];
      const idx = currentCorrect.indexOf(optionIndex);
      
      if (idx > -1) {
        // Décocher (mais garder au moins une réponse)
        if (currentCorrect.length > 1) {
          currentCorrect.splice(idx, 1);
        }
      } else {
        // Cocher
        currentCorrect.push(optionIndex);
      }
      q.correct = currentCorrect.sort((a, b) => a - b);
    } else {
      // Mode choix unique
      q.correct = optionIndex;
    }
    
    setQuestions(updated);
  };

  const toggleMultipleAnswers = (questionIndex: number) => {
    const updated = [...questions];
    const q = updated[questionIndex];
    q.multipleAnswers = !q.multipleAnswers;
    
    if (q.multipleAnswers) {
      // Convertir en array
      q.correct = Array.isArray(q.correct) ? q.correct : [q.correct as number];
    } else {
      // Convertir en nombre (prendre le premier)
      q.correct = Array.isArray(q.correct) ? q.correct[0] : q.correct;
    }
    
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleSave = () => {
    // Validation améliorée
    if (questions.length === 0) {
      alert('Ajoutez au moins une question avant de sauvegarder.');
      return;
    }

    const invalidQuestions: string[] = [];
    const isValid = questions.every((q, index) => {
      const hasQuestion = q.question && q.question.trim().length > 0;
      const hasOptions = q.options.length >= 2;
      const allOptionsFilled = q.options.every(o => o && o.trim().length > 0);
      
      let hasCorrectAnswer = false;
      if (q.multipleAnswers) {
        hasCorrectAnswer = Array.isArray(q.correct) && q.correct.length > 0;
      } else {
        hasCorrectAnswer = typeof q.correct === 'number' && q.correct >= 0 && q.correct < q.options.length;
      }
      
      const valid = hasQuestion && hasOptions && allOptionsFilled && hasCorrectAnswer;
      
      if (!valid) {
        const errors = [];
        if (!hasQuestion) errors.push('question manquante');
        if (!hasOptions) errors.push('moins de 2 options');
        if (!allOptionsFilled) errors.push('options vides');
        if (!hasCorrectAnswer) errors.push('aucune réponse correcte');
        invalidQuestions.push(`Question ${index + 1}: ${errors.join(', ')}`);
      }
      
      return valid;
    });

    if (!isValid) {
      alert('Erreurs détectées:\n\n' + invalidQuestions.join('\n'));
      return;
    }

    const jsonData = JSON.stringify(questions, null, 2);
    onSave(jsonData);
    onClose();
  };

  if (type === 'none') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-purple-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {type === 'qcm' && '📝 Créateur de QCM'}
              {type === 'schema' && '🎨 Créateur de Schéma'}
              {type === 'matching' && '🔗 Créateur d\'Associations'}
            </h2>
            <p className="text-purple-100 text-sm mt-1">Interface intuitive pour créer vos exercices</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {type === 'qcm' && (
            <>
              {/* Liste des questions */}
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-purple-400">Question {qIndex + 1}</h3>
                    <button
                      onClick={() => removeQuestion(qIndex)}
                      className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Question */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
                      Énoncé de la question
                    </label>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      placeholder="Ex: Quelle est la capitale de la France ?"
                      className="w-full bg-slate-950 border border-slate-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-slate-400 uppercase font-bold">
                        Réponses possibles
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleMultipleAnswers(qIndex)}
                          className={`text-xs px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                            q.multipleAnswers 
                              ? 'bg-green-900/30 text-green-400 border border-green-500/50' 
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                        >
                          {q.multipleAnswers ? '✓ Choix multiples' : 'Choix unique'}
                        </button>
                        <button
                          onClick={() => addOption(qIndex)}
                          className="text-xs bg-purple-900/30 text-purple-400 px-3 py-1 rounded-lg hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                        >
                          <Plus size={14} />
                          Ajouter une réponse
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {q.options.map((option, oIndex) => {
                        const isCorrect = q.multipleAnswers 
                          ? (Array.isArray(q.correct) && q.correct.includes(oIndex))
                          : q.correct === oIndex;
                        
                        return (
                          <div key={oIndex} className="flex items-center gap-2">
                            {/* Checkbox pour bonne réponse */}
                            <button
                              onClick={() => setCorrectAnswer(qIndex, oIndex)}
                              className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isCorrect
                                  ? 'bg-green-600 border-green-500'
                                  : 'border-slate-600 hover:border-green-500'
                              }`}
                            >
                              {isCorrect && <Check size={18} className="text-white" />}
                            </button>

                            {/* Input réponse */}
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Réponse ${oIndex + 1}`}
                              className="flex-1 bg-slate-950 border border-slate-600 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none"
                            />

                            {/* Bouton supprimer (si plus de 2 réponses) */}
                            {q.options.length > 2 && (
                              <button
                                onClick={() => removeOption(qIndex, oIndex)}
                                className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      💡 {q.multipleAnswers 
                        ? 'Mode choix multiples activé : cochez toutes les bonnes réponses' 
                        : 'Cliquez sur la case verte pour marquer la bonne réponse'}
                    </p>
                  </div>
                </div>
              ))}

              {/* Bouton ajouter question */}
              <button
                onClick={addQuestion}
                className="w-full py-4 bg-slate-800/50 hover:bg-slate-800 border-2 border-dashed border-slate-600 hover:border-purple-500 rounded-xl text-purple-400 font-bold transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Ajouter une question
              </button>
            </>
          )}

          {type === 'schema' && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">🚧 Interface Schéma à compléter</p>
              <p className="text-sm">Cette fonctionnalité sera disponible prochainement</p>
            </div>
          )}

          {type === 'matching' && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">🚧 Interface Associations</p>
              <p className="text-sm">Cette fonctionnalité sera disponible prochainement</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 border-t border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {type === 'qcm' && `${questions.length} question(s)`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={questions.length === 0}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Sauvegarder l'exercice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
