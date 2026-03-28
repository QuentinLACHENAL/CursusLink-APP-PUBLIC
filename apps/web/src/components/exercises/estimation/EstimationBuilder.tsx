'use client';

import { useState } from 'react';
import { Calculator, X, Plus, Trash2, Eye, Save, GripVertical } from 'lucide-react';
import { EstimationExerciseConfig, EstimationQuestion } from '../types';

interface EstimationBuilderProps {
  exerciseId?: string;
  nodeId: string;
  initialConfig?: EstimationExerciseConfig;
  onSave: (config: EstimationExerciseConfig) => void;
  onCancel: () => void;
}

export default function EstimationBuilder({
  exerciseId,
  nodeId,
  initialConfig,
  onSave,
  onCancel
}: EstimationBuilderProps) {
  const [title, setTitle] = useState(initialConfig?.title ?? '');
  const [description, setDescription] = useState(initialConfig?.description ?? '');
  
  const [questions, setQuestions] = useState<EstimationQuestion[]>(
    initialConfig?.questions ?? []
  );

  const [partialCredit, setPartialCredit] = useState(initialConfig?.partialCredit ?? true);

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Ajouter une question
  const addQuestion = () => {
    const newQuestion: EstimationQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      question: '',
      unit: '',
      correctValue: 0,
      tolerance: 10,
      points: 10,
      hint: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  // Modifier une question
  const updateQuestion = (id: string, field: keyof EstimationQuestion, value: string | number) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // Supprimer une question
  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  // Valider
  const validate = (): boolean => {
    const newErrors: string[] = [];
    
    if (!title.trim()) newErrors.push('Le titre est requis');
    if (questions.length < 1) newErrors.push('Au moins 1 question est requise');
    
    questions.forEach((q, index) => {
      if (!q.question.trim()) {
        newErrors.push(`La question ${index + 1} doit avoir un énoncé`);
      }
      if (!q.unit.trim()) {
        newErrors.push(`La question ${index + 1} doit avoir une unité`);
      }
      if (q.tolerance < 0 || q.tolerance > 100) {
        newErrors.push(`La tolérance de la question ${index + 1} doit être entre 0 et 100%`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Sauvegarder
  const handleSave = () => {
    if (!validate()) return;

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    const config: EstimationExerciseConfig = {
      id: exerciseId || Math.random().toString(36).substr(2, 9),
      nodeId,
      type: 'estimation',
      title,
      description,
      questions,
      partialCredit,
      totalPoints
    };

    onSave(config);
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="text-amber-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {exerciseId ? 'Modifier' : 'Créer'} un exercice d'Estimation
                </h2>
                <p className="text-sm text-slate-400">
                  Devinez des valeurs numériques avec tolérance
                </p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Erreurs */}
          {errors.length > 0 && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <ul className="text-red-300 text-sm space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Infos générales */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Estimations en anatomie"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions pour l'étudiant"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-semibold">
                Questions d'estimation ({questions.length})
              </h3>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                Aucune question. Cliquez sur "Ajouter" pour commencer.
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="p-4 bg-slate-800 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <GripVertical size={18} className="text-slate-500 mt-2" />
                      
                      <span className="w-6 h-6 rounded-full bg-amber-600/30 flex items-center justify-center text-sm font-bold text-amber-300">
                        {index + 1}
                      </span>

                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">Question</label>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                          placeholder="Ex: Quel est le poids moyen du cerveau humain?"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                      </div>

                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-12">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Valeur correcte *</label>
                        <input
                          type="number"
                          value={q.correctValue}
                          onChange={(e) => updateQuestion(q.id, 'correctValue', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Unité *</label>
                        <input
                          type="text"
                          value={q.unit}
                          onChange={(e) => updateQuestion(q.id, 'unit', e.target.value)}
                          placeholder="kg, cm, %..."
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Tolérance (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={q.tolerance}
                          onChange={(e) => updateQuestion(q.id, 'tolerance', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Points</label>
                        <input
                          type="number"
                          min={1}
                          value={q.points}
                          onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 mt-3 ml-12">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Min (optionnel)</label>
                        <input
                          type="number"
                          value={q.minValue ?? ''}
                          onChange={(e) => updateQuestion(q.id, 'minValue', e.target.value ? parseFloat(e.target.value) : undefined as any)}
                          placeholder="Borne min"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Max (optionnel)</label>
                        <input
                          type="number"
                          value={q.maxValue ?? ''}
                          onChange={(e) => updateQuestion(q.id, 'maxValue', e.target.value ? parseFloat(e.target.value) : undefined as any)}
                          placeholder="Borne max"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Indice (optionnel)</label>
                        <input
                          type="text"
                          value={q.hint || ''}
                          onChange={(e) => updateQuestion(q.id, 'hint', e.target.value)}
                          placeholder="Aide pour l'étudiant"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                      </div>
                    </div>

                    {/* Preview de la plage acceptable */}
                    {q.correctValue > 0 && (
                      <div className="mt-3 ml-12 text-xs text-slate-500">
                        Plage acceptée: {(q.correctValue * (1 - q.tolerance/100)).toFixed(2)} - {(q.correctValue * (1 + q.tolerance/100)).toFixed(2)} {q.unit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="partialCredit"
              checked={partialCredit}
              onChange={(e) => setPartialCredit(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500"
            />
            <label htmlFor="partialCredit" className="text-sm text-slate-300">
              Crédit partiel (points proportionnels à la précision si en dehors de la tolérance)
            </label>
          </div>

          {/* Prévisualisation */}
          {showPreview && questions.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-slate-300 font-semibold mb-4">Prévisualisation</h3>
              
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div key={q.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <p className="text-white font-medium mb-3">
                      {index + 1}. {q.question || 'Question sans énoncé'}
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        disabled
                        placeholder="Votre estimation"
                        className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                      <span className="text-slate-400">{q.unit}</span>
                      <span className="text-xs text-amber-400 ml-auto">
                        ±{q.tolerance}% • {q.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Eye size={18} />
            {showPreview ? 'Masquer' : 'Prévisualiser'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Total: {totalPoints} points
            </span>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
