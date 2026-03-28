'use client';

import { useState, useEffect } from 'react';
import { X, Save, Check } from 'lucide-react';

interface GradingGridBuilderProps {
  qcmData?: string; // JSON des questions du QCM
  initialGradingData?: string; // JSON de la grille existante
  onSave: (data: string) => void;
  onClose: () => void;
}

interface GradingQuestion {
  questionIndex: number;
  questionText: string;
  points: number;
}

export default function GradingGridBuilder({ 
  qcmData, 
  initialGradingData, 
  onSave, 
  onClose 
}: GradingGridBuilderProps) {
  const [gradingQuestions, setGradingQuestions] = useState<GradingQuestion[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    // Si on a déjà une grille, la charger
    if (initialGradingData) {
      try {
        const parsed = JSON.parse(initialGradingData);
        if (Array.isArray(parsed)) {
          setGradingQuestions(parsed);
          calculateTotal(parsed);
        }
      } catch (e) {
        console.error('Invalid grading grid JSON', e);
      }
      return;
    }

    // Sinon, générer depuis le QCM
    if (qcmData) {
      try {
        const parsed = typeof qcmData === 'string' ? JSON.parse(qcmData) : qcmData;

        // L'exerciseData peut être soit un tableau de questions, soit un objet
        // complet de type QCMExerciseConfig { questions: [...] }
        let questionsArray: any[] = [];
        if (Array.isArray(parsed)) {
          questionsArray = parsed;
        } else if (parsed && Array.isArray(parsed.questions)) {
          questionsArray = parsed.questions;
        } else {
          console.error('QCM data has unexpected format (expected array or { questions: [] })', parsed);
          return;
        }

        const grid: GradingQuestion[] = questionsArray.map((q: any, index: number) => ({
          questionIndex: index,
          questionText: q.question || q.title || `Question ${index + 1}`,
          points: typeof q.points === 'number' ? q.points : 1 // 1 point par défaut
        }));

        setGradingQuestions(grid);
        calculateTotal(grid);
      } catch (e) {
        console.error('Invalid QCM JSON', e);
      }
    }
  }, [qcmData, initialGradingData]);

  const calculateTotal = (grid: GradingQuestion[]) => {
    const total = grid.reduce((sum, q) => sum + q.points, 0);
    setTotalPoints(total);
  };

  const updatePoints = (index: number, points: number) => {
    const updated = [...gradingQuestions];
    updated[index].points = Math.max(0, points); // Min 0 points
    setGradingQuestions(updated);
    calculateTotal(updated);
  };

  const handleSave = () => {
    if (gradingQuestions.length === 0) {
      alert('Aucune question à évaluer');
      return;
    }

    if (totalPoints === 0) {
      alert('Le total des points doit être supérieur à 0');
      return;
    }

    const jsonData = JSON.stringify(gradingQuestions, null, 2);
    onSave(jsonData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border-2 border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              📋 Grille d'évaluation
            </h2>
            <p className="text-slate-300 text-sm">
              Configurez les points pour chaque question
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {gradingQuestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">
                Aucune question trouvée. Créez d'abord un QCM.
              </p>
            </div>
          ) : (
            <>
              {gradingQuestions.map((gq, index) => (
                <div
                  key={index}
                  className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400 font-bold text-sm">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-white text-sm mb-3 leading-relaxed">
                        {gq.questionText}
                      </p>
                      
                      <div className="flex items-center gap-3">
                        <label className="text-slate-400 text-xs font-medium">
                          Points:
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={gq.points}
                          onChange={(e) => updatePoints(index, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-slate-950 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-slate-500 text-xs">pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border-2 border-purple-500/50 sticky bottom-0">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-white">
                    Total des points
                  </span>
                  <span className="text-3xl font-bold text-purple-400">
                    {totalPoints} pts
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-900/50">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-white transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={gradingQuestions.length === 0}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Save size={18} />
              Sauvegarder la grille
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
