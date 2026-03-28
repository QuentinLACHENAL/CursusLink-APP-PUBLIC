'use client';

import { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Check, Settings, Eye, EyeOff, Shuffle, Clock, AlertCircle, GripVertical } from 'lucide-react';
import { QCMExerciseConfig, QCMQuestion } from '../types';

interface QCMBuilderProps {
  nodeId: string;
  nodeLabel: string;
  initialConfig?: QCMExerciseConfig;
  onSave: (config: QCMExerciseConfig) => void;
  onCancel: () => void;
}

export default function QCMBuilder({
  nodeId,
  nodeLabel,
  initialConfig,
  onSave,
  onCancel
}: QCMBuilderProps) {
  const [config, setConfig] = useState<QCMExerciseConfig>(() => initialConfig || {
    id: `qcm-${Date.now()}`,
    type: 'qcm',
    title: `QCM - ${nodeLabel}`,
    description: '',
    questions: [],
    shuffleQuestions: false,
    shuffleOptions: true,
    showExplanations: true,
    showCorrectAnswers: true,
    allowPartialCredit: true,
    totalPoints: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [activeQuestion, setActiveQuestion] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Recalculer les points totaux
  useEffect(() => {
    const total = config.questions.reduce((sum, q) => sum + q.points, 0);
    setConfig(prev => ({ ...prev, totalPoints: total }));
  }, [config.questions]);

  const addQuestion = () => {
    const newQuestion: QCMQuestion = {
      id: `q-${Date.now()}`,
      question: '',
      options: ['', ''],
      correctAnswers: [],
      multipleCorrect: false,
      points: 1,
      explanation: ''
    };
    setConfig(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    setActiveQuestion(config.questions.length);
  };

  const removeQuestion = (index: number) => {
    if (config.questions.length <= 1) {
      alert('Un QCM doit avoir au moins une question.');
      return;
    }
    const updated = [...config.questions];
    updated.splice(index, 1);
    setConfig(prev => ({ ...prev, questions: updated }));
    if (activeQuestion >= updated.length) {
      setActiveQuestion(Math.max(0, updated.length - 1));
    }
  };

  const updateQuestion = (index: number, updates: Partial<QCMQuestion>) => {
    const updated = [...config.questions];
    updated[index] = { ...updated[index], ...updates };
    setConfig(prev => ({ ...prev, questions: updated }));
  };

  const addOption = (questionIndex: number) => {
    const q = config.questions[questionIndex];
    if (q.options.length >= 8) {
      alert('Maximum 8 options par question.');
      return;
    }
    const updated = [...config.questions];
    updated[questionIndex].options.push('');
    setConfig(prev => ({ ...prev, questions: updated }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const q = config.questions[questionIndex];
    if (q.options.length <= 2) {
      alert('Une question doit avoir au moins 2 options.');
      return;
    }
    const updated = [...config.questions];
    updated[questionIndex].options.splice(optionIndex, 1);
    // Mettre à jour les correctAnswers
    updated[questionIndex].correctAnswers = updated[questionIndex].correctAnswers
      .filter(i => i !== optionIndex)
      .map(i => i > optionIndex ? i - 1 : i);
    setConfig(prev => ({ ...prev, questions: updated }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...config.questions];
    updated[questionIndex].options[optionIndex] = value;
    setConfig(prev => ({ ...prev, questions: updated }));
  };

  const toggleCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const q = config.questions[questionIndex];
    const updated = [...config.questions];
    
    if (q.multipleCorrect) {
      // Mode multiple: toggle
      const idx = q.correctAnswers.indexOf(optionIndex);
      if (idx >= 0) {
        updated[questionIndex].correctAnswers.splice(idx, 1);
      } else {
        updated[questionIndex].correctAnswers.push(optionIndex);
      }
    } else {
      // Mode unique: remplacer
      updated[questionIndex].correctAnswers = [optionIndex];
    }
    
    setConfig(prev => ({ ...prev, questions: updated }));
  };

  const toggleMultipleCorrect = (questionIndex: number) => {
    const updated = [...config.questions];
    updated[questionIndex].multipleCorrect = !updated[questionIndex].multipleCorrect;
    // Si on passe en mode unique, garder seulement la première réponse
    if (!updated[questionIndex].multipleCorrect && updated[questionIndex].correctAnswers.length > 1) {
      updated[questionIndex].correctAnswers = [updated[questionIndex].correctAnswers[0]];
    }
    setConfig(prev => ({ ...prev, questions: updated }));
  };

  const handleSave = () => {
    // Validation
    if (config.questions.length === 0) {
      alert('Ajoutez au moins une question.');
      return;
    }

    const errors: string[] = [];
    config.questions.forEach((q, i) => {
      if (!q.question.trim()) errors.push(`Question ${i + 1}: Énoncé manquant`);
      if (q.options.some(o => !o.trim())) errors.push(`Question ${i + 1}: Option vide`);
      if (q.correctAnswers.length === 0) errors.push(`Question ${i + 1}: Aucune réponse correcte`);
    });

    if (errors.length > 0) {
      alert('Erreurs détectées:\n\n' + errors.join('\n'));
      return;
    }

    onSave({
      ...config,
      updatedAt: new Date().toISOString()
    });
  };

  const currentQuestion = config.questions[activeQuestion];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-[#1a1d24] w-full max-w-6xl h-[90vh] rounded-xl border border-white/10 flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151820]">
          <div className="flex items-center gap-3">
            <div className="bg-green-600/20 p-2 rounded-lg text-green-400">
              <Check size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Éditeur de QCM</h2>
              <p className="text-xs text-gray-400">{config.questions.length} question(s) • {config.totalPoints} pts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`p-2 rounded ${showSettings ? 'bg-purple-600/30 text-purple-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              <Settings size={18} />
            </button>
            <button 
              onClick={() => setShowPreview(!showPreview)} 
              className={`px-3 py-2 rounded text-sm flex items-center gap-2 ${showPreview ? 'bg-blue-600/30 text-blue-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              {showPreview ? <EyeOff size={16}/> : <Eye size={16}/>} 
              {showPreview ? 'Éditer' : 'Aperçu'}
            </button>
            <button 
              onClick={handleSave} 
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm text-white font-bold flex items-center gap-2"
            >
              <Save size={16}/> Enregistrer
            </button>
            <button onClick={onCancel} className="p-2 hover:bg-red-500/20 text-red-400 rounded">
              <X size={20}/>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Liste des questions (sidebar gauche) */}
          <div className="w-64 bg-[#151820] border-r border-white/10 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <button
                onClick={addQuestion}
                className="w-full py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 rounded-lg text-green-400 text-sm font-bold flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Ajouter une question
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {config.questions.map((q, i) => {
                const isValid = q.question.trim() && 
                               q.options.every(o => o.trim()) && 
                               q.correctAnswers.length > 0;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestion(i)}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-2 transition-all ${
                      activeQuestion === i 
                        ? 'bg-purple-600/30 border border-purple-500' 
                        : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isValid ? 'bg-green-600/30 text-green-400' : 'bg-yellow-600/30 text-yellow-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {q.question || 'Question sans titre'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {q.options.length} options • {q.points} pt{q.points > 1 ? 's' : ''}
                        {q.multipleCorrect && ' • Multiple'}
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {config.questions.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Aucune question.<br/>
                  <span className="text-xs">Cliquez sur "Ajouter"</span>
                </div>
              )}
            </div>
          </div>

          {/* Zone principale */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {showPreview ? (
              /* Aperçu */
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  <h3 className="text-xl font-bold text-white">{config.title}</h3>
                  {config.description && (
                    <p className="text-slate-400">{config.description}</p>
                  )}
                  
                  {config.questions.map((q, qIdx) => (
                    <div key={q.id} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold">
                          {qIdx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{q.question}</p>
                          {q.multipleCorrect && (
                            <span className="text-xs text-purple-400 mt-1 inline-block">
                              (Plusieurs réponses possibles)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 ml-11">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correctAnswers.includes(oIdx);
                          return (
                            <div key={oIdx} className={`p-3 rounded-lg border ${
                              isCorrect 
                                ? 'bg-green-900/20 border-green-600/50' 
                                : 'bg-slate-900/50 border-slate-700'
                            }`}>
                              <span className={isCorrect ? 'text-green-400' : 'text-slate-300'}>
                                {opt}
                              </span>
                              {isCorrect && <Check size={16} className="inline ml-2 text-green-400" />}
                            </div>
                          );
                        })}
                      </div>
                      
                      {q.explanation && (
                        <div className="mt-4 ml-11 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                          <p className="text-xs text-blue-400 font-bold mb-1">Explication</p>
                          <p className="text-sm text-blue-300">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : currentQuestion ? (
              /* Éditeur de question */
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* En-tête question */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Question {activeQuestion + 1}</h3>
                    <button
                      onClick={() => removeQuestion(activeQuestion)}
                      className="px-3 py-1 text-red-400 hover:bg-red-900/30 rounded text-sm flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>

                  {/* Énoncé */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
                      Énoncé de la question
                    </label>
                    <textarea
                      value={currentQuestion.question}
                      onChange={(e) => updateQuestion(activeQuestion, { question: e.target.value })}
                      placeholder="Quelle est la capitale de la France ?"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white resize-none h-24 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Mode et Points */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Points</label>
                      <input
                        type="number"
                        min="1"
                        value={currentQuestion.points}
                        onChange={(e) => updateQuestion(activeQuestion, { points: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Mode</label>
                      <button
                        onClick={() => toggleMultipleCorrect(activeQuestion)}
                        className={`w-full p-3 rounded-lg border text-sm font-bold transition-all ${
                          currentQuestion.multipleCorrect
                            ? 'bg-purple-600/30 border-purple-500 text-purple-400'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {currentQuestion.multipleCorrect ? '✓ Choix multiples' : 'Choix unique'}
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-slate-400 uppercase font-bold">
                        Réponses possibles
                      </label>
                      <button
                        onClick={() => addOption(activeQuestion)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded flex items-center gap-1"
                      >
                        <Plus size={14} /> Ajouter
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {currentQuestion.options.map((opt, oIdx) => {
                        const isCorrect = currentQuestion.correctAnswers.includes(oIdx);
                        return (
                          <div key={oIdx} className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCorrectAnswer(activeQuestion, oIdx)}
                              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isCorrect 
                                  ? 'bg-green-600 border-green-500' 
                                  : 'border-slate-600 hover:border-green-500'
                              }`}
                            >
                              {isCorrect && <Check size={18} className="text-white" />}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(activeQuestion, oIdx, e.target.value)}
                              placeholder={`Réponse ${oIdx + 1}`}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                            />
                            {currentQuestion.options.length > 2 && (
                              <button
                                onClick={() => removeOption(activeQuestion, oIdx)}
                                className="p-2 text-red-400 hover:bg-red-900/30 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-3">
                      💡 Cliquez sur le carré vert pour marquer la/les bonne(s) réponse(s)
                    </p>
                  </div>

                  {/* Explication */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
                      Explication (optionnel)
                    </label>
                    <textarea
                      value={currentQuestion.explanation || ''}
                      onChange={(e) => updateQuestion(activeQuestion, { explanation: e.target.value })}
                      placeholder="Explication affichée après la correction..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white resize-none h-20 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Pas de question sélectionnée */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">Aucune question sélectionnée</p>
                  <button
                    onClick={addQuestion}
                    className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold"
                  >
                    Créer une question
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Panneau Settings (si ouvert) */}
          {showSettings && (
            <div className="w-72 bg-[#151820] border-l border-white/10 p-4 overflow-y-auto">
              <h3 className="font-bold text-white mb-4">Paramètres du QCM</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Titre</label>
                  <input
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Description</label>
                  <textarea
                    value={config.description || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white h-20 resize-none"
                    placeholder="Description optionnelle..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 uppercase font-bold block">Options</label>
                  
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.shuffleQuestions}
                      onChange={(e) => setConfig(prev => ({ ...prev, shuffleQuestions: e.target.checked }))}
                      className="rounded bg-slate-800 border-slate-600"
                    />
                    <Shuffle size={14} /> Mélanger les questions
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.shuffleOptions}
                      onChange={(e) => setConfig(prev => ({ ...prev, shuffleOptions: e.target.checked }))}
                      className="rounded bg-slate-800 border-slate-600"
                    />
                    <Shuffle size={14} /> Mélanger les réponses
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showCorrectAnswers}
                      onChange={(e) => setConfig(prev => ({ ...prev, showCorrectAnswers: e.target.checked }))}
                      className="rounded bg-slate-800 border-slate-600"
                    />
                    <Eye size={14} /> Montrer les réponses correctes
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showExplanations}
                      onChange={(e) => setConfig(prev => ({ ...prev, showExplanations: e.target.checked }))}
                      className="rounded bg-slate-800 border-slate-600"
                    />
                    <AlertCircle size={14} /> Montrer les explications
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allowPartialCredit}
                      onChange={(e) => setConfig(prev => ({ ...prev, allowPartialCredit: e.target.checked }))}
                      className="rounded bg-slate-800 border-slate-600"
                    />
                    <Check size={14} /> Points partiels (choix multiples)
                  </label>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block flex items-center gap-2">
                    <Clock size={12} /> Limite de temps (optionnel)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={config.timeLimit || ''}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        timeLimit: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                      placeholder="0"
                    />
                    <span className="text-slate-500 text-sm">sec</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="text-xs text-slate-500">
                    Total: <span className="text-white font-bold">{config.totalPoints}</span> points
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
