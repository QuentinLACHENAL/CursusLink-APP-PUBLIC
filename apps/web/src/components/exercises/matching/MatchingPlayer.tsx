'use client';

import { useState, useCallback, useMemo } from 'react';
import { Link2, Check, X, RotateCcw, Send, Clock } from 'lucide-react';
import { MatchingExerciseConfig, MatchingPair } from '../types';

interface MatchingPlayerProps {
  config: MatchingExerciseConfig;
  studentId: string;
  studentName: string;
  onSubmit: (submission: MatchingSubmission) => void;
  onCancel: () => void;
}

export interface MatchingSubmission {
  id: string;
  exerciseId: string;
  studentId: string;
  studentName: string;
  answers: Record<string, string>; // leftId -> rightId
  submittedAt: string;
  status: 'pending' | 'evaluated';
  score?: number;
  maxScore: number;
}

// Mélanger un tableau
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function MatchingPlayer({
  config,
  studentId,
  studentName,
  onSubmit,
  onCancel
}: MatchingPlayerProps) {
  // Mélanger les colonnes une seule fois au montage
  const [leftItems] = useState(() => 
    config.shuffleLeft ? shuffleArray(config.pairs) : config.pairs
  );
  const [rightItems] = useState(() => 
    config.shuffleRight ? shuffleArray(config.pairs) : config.pairs
  );

  // État des associations : leftId -> rightId
  const [connections, setConnections] = useState<Record<string, string>>({});
  // Élément actuellement sélectionné (pour clic)
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  // Calculer quels éléments de droite sont déjà utilisés
  const usedRightIds = useMemo(() => 
    new Set(Object.values(connections)), 
    [connections]
  );

  // Gérer le clic sur un élément de gauche
  const handleLeftClick = (id: string) => {
    if (submitted) return;
    
    if (selectedLeft === id) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(id);
      // Si un élément de droite est déjà sélectionné, créer la connexion
      if (selectedRight) {
        createConnection(id, selectedRight);
        setSelectedLeft(null);
        setSelectedRight(null);
      }
    }
  };

  // Gérer le clic sur un élément de droite
  const handleRightClick = (id: string) => {
    if (submitted) return;
    
    if (selectedRight === id) {
      setSelectedRight(null);
    } else {
      setSelectedRight(id);
      // Si un élément de gauche est déjà sélectionné, créer la connexion
      if (selectedLeft) {
        createConnection(selectedLeft, id);
        setSelectedLeft(null);
        setSelectedRight(null);
      }
    }
  };

  // Créer une connexion
  const createConnection = (leftId: string, rightId: string) => {
    // Supprimer les anciennes connexions impliquant ces éléments
    const newConnections = { ...connections };
    
    // Si cet élément de gauche était déjà connecté, on le déconnecte
    if (newConnections[leftId]) {
      delete newConnections[leftId];
    }
    
    // Si cet élément de droite était déjà connecté à un autre, supprimer cette connexion
    Object.keys(newConnections).forEach(key => {
      if (newConnections[key] === rightId) {
        delete newConnections[key];
      }
    });

    // Créer la nouvelle connexion
    newConnections[leftId] = rightId;
    setConnections(newConnections);
  };

  // Supprimer une connexion
  const removeConnection = (leftId: string) => {
    if (submitted) return;
    const newConnections = { ...connections };
    delete newConnections[leftId];
    setConnections(newConnections);
  };

  // Réinitialiser toutes les connexions
  const resetConnections = () => {
    setConnections({});
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  // Vérifier si toutes les paires sont connectées
  const allConnected = Object.keys(connections).length === config.pairs.length;

  // Soumettre l'exercice
  const handleSubmit = () => {
    if (!allConnected) {
      alert('Veuillez relier tous les éléments avant de soumettre');
      return;
    }

    // Calculer les résultats
    const newResults: Record<string, boolean> = {};
    let correctCount = 0;

    config.pairs.forEach(pair => {
      // Trouver la connexion de l'étudiant pour cet élément de gauche
      const studentAnswer = connections[pair.id];
      // Vérifier si c'est correct (le rightId devrait correspondre au même pair.id)
      const isCorrect = studentAnswer === pair.id;
      newResults[pair.id] = isCorrect;
      if (isCorrect) correctCount++;
    });

    setResults(newResults);
    setSubmitted(true);

    // Créer la soumission
    const submission: MatchingSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: config.id,
      studentId,
      studentName,
      answers: connections,
      submittedAt: new Date().toISOString(),
      status: 'evaluated', // Auto-évalué
      score: Math.round((correctCount / config.pairs.length) * config.totalPoints),
      maxScore: config.totalPoints
    };

    setTimeout(() => onSubmit(submission), 2000);
  };

  // Trouver quel élément de droite est connecté à un élément de gauche
  const getConnectedRight = (leftId: string) => connections[leftId];

  // Trouver quel élément de gauche est connecté à un élément de droite
  const getConnectedLeft = (rightId: string) => 
    Object.keys(connections).find(key => connections[key] === rightId);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="text-cyan-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">{config.title}</h2>
                {config.description && (
                  <p className="text-sm text-slate-400">{config.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                {Object.keys(connections).length} / {config.pairs.length} reliés
              </div>
              <button 
                onClick={onCancel} 
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="text-slate-400" size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {!submitted && (
          <div className="px-6 py-3 bg-cyan-500/10 border-b border-cyan-500/30">
            <p className="text-sm text-cyan-300">
              💡 Cliquez sur un élément à gauche puis sur l'élément correspondant à droite pour les relier.
              Cliquez sur une connexion existante pour la supprimer.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
            {/* Colonne gauche */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">Éléments</h3>
              {leftItems.map((pair) => {
                const connectedTo = getConnectedRight(pair.id);
                const isSelected = selectedLeft === pair.id;
                const isCorrect = submitted && results[pair.id];
                const isIncorrect = submitted && results[pair.id] === false;
                
                return (
                  <div
                    key={pair.id}
                    onClick={() => !connectedTo && handleLeftClick(pair.id)}
                    className={`
                      relative px-4 py-3 rounded-lg border-2 transition-all cursor-pointer
                      ${connectedTo 
                        ? isCorrect
                          ? 'bg-green-500/20 border-green-500 text-green-300'
                          : isIncorrect
                            ? 'bg-red-500/20 border-red-500 text-red-300'
                            : 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : isSelected
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-slate-800 border-slate-600 text-white hover:border-slate-500'
                      }
                    `}
                  >
                    <span className="text-sm">{pair.left}</span>
                    {connectedTo && !submitted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeConnection(pair.id); }}
                        className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400 transition-colors"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    )}
                    {submitted && (
                      <span className="absolute -right-2 -top-2 w-6 h-6 rounded-full flex items-center justify-center">
                        {isCorrect 
                          ? <Check size={16} className="text-green-400" />
                          : <X size={16} className="text-red-400" />
                        }
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zone de connexions (lignes SVG) */}
            <div className="w-16 relative min-h-[300px]">
              <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                {Object.entries(connections).map(([leftId, rightId]) => {
                  const leftIndex = leftItems.findIndex(p => p.id === leftId);
                  const rightIndex = rightItems.findIndex(p => p.id === rightId);
                  if (leftIndex === -1 || rightIndex === -1) return null;
                  
                  const y1 = leftIndex * 52 + 26;
                  const y2 = rightIndex * 52 + 26;
                  const isCorrect = submitted && results[leftId];
                  const isIncorrect = submitted && results[leftId] === false;
                  
                  return (
                    <line
                      key={`${leftId}-${rightId}`}
                      x1="0"
                      y1={y1}
                      x2="64"
                      y2={y2}
                      stroke={isCorrect ? '#22c55e' : isIncorrect ? '#ef4444' : '#06b6d4'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Colonne droite */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">Correspondances</h3>
              {rightItems.map((pair) => {
                const connectedFrom = getConnectedLeft(pair.id);
                const isSelected = selectedRight === pair.id;
                const isUsed = usedRightIds.has(pair.id);
                
                return (
                  <div
                    key={pair.id}
                    onClick={() => !isUsed && handleRightClick(pair.id)}
                    className={`
                      px-4 py-3 rounded-lg border-2 transition-all cursor-pointer
                      ${isUsed 
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 cursor-default'
                        : isSelected
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-slate-800 border-slate-600 text-white hover:border-slate-500'
                      }
                    `}
                  >
                    <span className="text-sm">{pair.right}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Résultats */}
          {submitted && (
            <div className="mt-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {Object.values(results).filter(Boolean).length} / {config.pairs.length} correct
                </h3>
                <p className="text-slate-400">
                  Score: {Math.round((Object.values(results).filter(Boolean).length / config.pairs.length) * config.totalPoints)} / {config.totalPoints} points
                </p>
                {Object.values(results).every(Boolean) ? (
                  <p className="text-green-400 mt-2 font-medium">🎉 Parfait ! Toutes les associations sont correctes !</p>
                ) : Object.values(results).filter(Boolean).length >= config.pairs.length / 2 ? (
                  <p className="text-yellow-400 mt-2">👍 Bon travail ! Continuez vos efforts.</p>
                ) : (
                  <p className="text-red-400 mt-2">📚 Révisez et réessayez !</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <button
            onClick={resetConnections}
            disabled={submitted || Object.keys(connections).length === 0}
            className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={18} />
            Réinitialiser
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {submitted ? 'Fermer' : 'Annuler'}
            </button>
            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={!allConnected}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Send size={18} />
                Soumettre
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
