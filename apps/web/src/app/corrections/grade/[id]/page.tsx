'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, FileText, CheckSquare, Check, X, Eye } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import SchemaExerciseEvaluator from '../../../../components/exercises/schema/SchemaExerciseEvaluator';
import { SchemaExerciseConfig, SchemaExerciseSubmission } from '../../../../components/exercises/types';
import { API_BASE_URL } from '../../../../services/api';

export default function GradingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [nodeData, setNodeData] = useState<any>(null);
  
  // État pour les réponses du correcteur (question index -> true/false)
  const [correctorsAnswers, setCorrectorsAnswers] = useState<{ [key: number]: boolean }>({});
  
  // État pour l'évaluateur de schéma
  const [showSchemaEvaluator, setShowSchemaEvaluator] = useState(false);
  
  // État pour le score manuel (quand pas de grille d'évaluation)
  const [manualScore, setManualScore] = useState<number | null>(null);

  useEffect(() => {
    if (params.id && token) {
        fetch(`${API_BASE_URL}/corrections/${params.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(resData => {
            setData(resData);
            if (resData.comments) setComment(resData.comments);
            
            // Les détails du nœud sont déjà inclus dans la réponse
            if (resData.projectDetails && Object.keys(resData.projectDetails).length > 0) {
              setNodeData(resData.projectDetails);
            }
        })
        .catch(console.error);
    }
  }, [params.id, token]);

  const calculateScore = () => {
    if (nodeData?.exerciseType === 'schema') {
      // Pour le schéma, le score est géré par l'évaluateur directement
      // On retourne le score actuel si disponible, sinon 0
      return data?.mark || 0;
    }

    // Si pas de grille mais score manuel défini, utiliser le score manuel
    if (!nodeData?.gradingGrid && !nodeData?.exerciseData) {
      return manualScore ?? 0;
    }
    
    if (!nodeData?.gradingGrid) return 0;
    
    try {
      const grid = JSON.parse(nodeData.gradingGrid);
      let totalPoints = grid.reduce((sum: number, item: any) => sum + item.points, 0);
      let earnedPoints = 0;
      
      grid.forEach((item: any) => {
        if (correctorsAnswers[item.questionIndex] === true) {
          earnedPoints += item.points;
        }
      });
      
      return totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    } catch (e) {
      return 0;
    }
  };

  const checkAutomaticCorrection = () => {
    if (nodeData?.exerciseType === 'schema') return { isCorrect: true, bonusXP: 0 };

    // En mode manuel (pas de grille ni QCM), pas de vérification automatique possible
    const hasGradingSystem = nodeData?.gradingGrid || (nodeData?.exerciseType === 'qcm' && nodeData?.exerciseData);
    if (!hasGradingSystem) {
      return { isCorrect: true, bonusXP: 0 }; // Mode manuel = pas de bonus mais pas d'erreur
    }

    // Vérifier si la correction du correcteur correspond aux vraies réponses
    if (!nodeData?.exerciseData || !data?.submissionData) return { isCorrect: true, bonusXP: 0 };
    
    try {
      const questions = JSON.parse(nodeData.exerciseData);
      const studentAnswers = JSON.parse(data.submissionData);
      
      let allCorrect = true;
      
      questions.forEach((q: any, qIndex: number) => {
        const studentAnswer = studentAnswers[qIndex];
        const correctAnswer = q.correct;
        
        // Vérifier si la réponse de l'étudiant est bonne
        let isStudentCorrect = false;
        if (q.multipleAnswers && Array.isArray(correctAnswer)) {
          const userArr = Array.isArray(studentAnswer) ? studentAnswer.sort() : [];
          const correctArr = correctAnswer.sort();
          isStudentCorrect = JSON.stringify(userArr) === JSON.stringify(correctArr);
        } else {
          isStudentCorrect = studentAnswer === correctAnswer;
        }
        
        // Comparer avec ce que le correcteur a marqué
        const correctorMarked = correctorsAnswers[qIndex];
        if (correctorMarked !== isStudentCorrect) {
          allCorrect = false;
        }
      });
      
      return {
        isCorrect: allCorrect,
        bonusXP: allCorrect ? 50 : 0 // Bonus XP si correction parfaite
      };
    } catch (e) {
      console.error('Error checking correction:', e);
      return { isCorrect: false, bonusXP: 0 };
    }
  };

  const handleSchemaEvaluation = async (evaluatedSubmission: SchemaExerciseSubmission) => {
    const scorePercentage = Math.round((evaluatedSubmission.score! / evaluatedSubmission.maxScore) * 100);
    
    setLoading(true);
    try {
      // Soumettre la correction
      // Note: Le backend gère automatiquement la validation du skill si le score est suffisant
      await fetch(`${API_BASE_URL}/corrections/submit`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          correctionId: params.id,
          mark: scorePercentage,
          comments: (evaluatedSubmission.feedback || 'Correction schéma effectuée') + 
                    '\n\nDétails techniques: ' + JSON.stringify(evaluatedSubmission)
        })
      });
      
      alert(`Correction enregistrée ! Score: ${scorePercentage}%`);
      setShowSchemaEvaluator(false);
      router.push('/corrections');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!nodeData) {
      alert('Les données du projet ne sont pas encore chargées. Veuillez patienter.');
      return;
    }
    
    const score = calculateScore();
    const minimumScore = nodeData?.minimumScore || 80;
    const autoCheck = checkAutomaticCorrection();
    
    setLoading(true);
    try {
      // Soumettre la correction
      // Note: Le backend gère automatiquement la validation du skill et l'XP
      await fetch(`${API_BASE_URL}/corrections/submit`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          correctionId: params.id,
          mark: score,
          comments: comment + (autoCheck.isCorrect && autoCheck.bonusXP > 0 ? '\n\n✅ Correction parfaite ! (Bonus XP noté)' : '')
        })
      });
      
      alert(
        `Correction envoyée !\n\n` +
        `Score de l'étudiant: ${score}%\n` +
        `${score >= minimumScore ? '✅ Exercice validé pour l\'étudiant' : '❌ Score insuffisant (minimum: ' + minimumScore + '%)'}`
      );
      router.push('/corrections');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi.');
    } finally {
      setLoading(false);
    }
  };

  if (!data || !nodeData) {
    return <div className="text-center p-10 text-slate-500">Chargement de la correction...</div>;
  }

  // Rendu spécifique pour les schémas
  if (nodeData.exerciseType === 'schema') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8 flex justify-center">
        <div className="max-w-5xl w-full">
          <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8"
          >
              <ArrowLeft size={20} /> Retour
          </button>

          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-6 mb-6 border border-purple-500/30">
            <h1 className="text-2xl font-bold mb-2">
              Correction de <span className="text-purple-400">{data.student?.firstName} {data.student?.lastName}</span>
            </h1>
            <p className="text-slate-300">Exercice Schéma: {data.projectDetails.label}</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center">
            <h2 className="text-xl font-bold mb-4">Exercice de type Schéma</h2>
            <p className="text-slate-400 mb-6">Cet exercice nécessite une interface visuelle pour la correction.</p>
            
            <button
              onClick={() => setShowSchemaEvaluator(true)}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 mx-auto"
            >
              <Eye size={20} />
              Ouvrir l'outil de correction
            </button>
          </div>

          {showSchemaEvaluator && (
            <SchemaExerciseEvaluator
              config={JSON.parse(nodeData.exerciseData)}
              submission={typeof data.submissionData === 'string' ? JSON.parse(data.submissionData) : data.submissionData}
              evaluatorId={user?.id}
              evaluatorName={user?.username || 'Correcteur'}
              onEvaluate={handleSchemaEvaluation}
              onCancel={() => setShowSchemaEvaluator(false)}
            />
          )}
        </div>
      </div>
    );
  }

  const renderCorrectionInterface = () => {
    // Cas 1 : QCM (Prioritaire si exerciseData existe)
    if (nodeData.exerciseType === 'qcm' && nodeData.exerciseData) {
      try {
        const questions = JSON.parse(nodeData.exerciseData);
        const studentAnswers = data.submissionData ? JSON.parse(data.submissionData) : {};
        const gradingGrid = nodeData.gradingGrid ? JSON.parse(nodeData.gradingGrid) : [];

        return (
          <div className="space-y-4">
            {questions.map((q: any, qIndex: number) => {
              const studentAnswer = studentAnswers[qIndex];
              const gridItem = gradingGrid.find((g: any) => g.questionIndex === qIndex);
              const points = gridItem?.points || 1;
              const isMarkedCorrect = correctorsAnswers[qIndex];

              return (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  {/* ... (Existing QCM rendering logic) ... */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-bold mb-2">
                        Question {qIndex + 1}
                        <span className="ml-3 text-sm text-purple-400">({points} pts)</span>
                      </h4>
                      <p className="text-slate-300 text-sm mb-3">{q.question}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 ml-4">
                    {q.options.map((opt: string, optIndex: number) => {
                      const isCorrect = q.multipleAnswers 
                        ? Array.isArray(q.correct) && q.correct.includes(optIndex)
                        : q.correct === optIndex;
                      const studentSelected = q.multipleAnswers
                        ? Array.isArray(studentAnswer) && studentAnswer.includes(optIndex)
                        : studentAnswer === optIndex;

                      return (
                        <div key={optIndex} className={`p-3 rounded-lg border-2 ${
                          studentSelected ? 'bg-blue-900/30 border-blue-500' : 'bg-slate-900/50 border-slate-700'
                        }`}>
                          <div className="flex items-center gap-3">
                            {studentSelected && <span className="text-blue-400 font-bold">→</span>}
                            <span className="flex-1 text-slate-300">{opt}</span>
                            {isCorrect && <span className="text-green-400 text-xs font-bold bg-green-900/30 px-2 py-1 rounded">CORRECT</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-slate-700">
                    <button
                      onClick={() => setCorrectorsAnswers({ ...correctorsAnswers, [qIndex]: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                        isMarkedCorrect === true ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-green-600/20 hover:text-green-400'
                      }`}
                    >
                      <Check size={18} /> Juste
                    </button>
                    <button
                      onClick={() => setCorrectorsAnswers({ ...correctorsAnswers, [qIndex]: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                        isMarkedCorrect === false ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-red-600/20 hover:text-red-400'
                      }`}
                    >
                      <X size={18} /> Faux
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      } catch (e) {
        return <p className="text-red-400">Erreur QCM</p>;
      }
    }

    // Cas 2 : Validation manuelle via Grille (Cours simple)
    if (nodeData.gradingGrid) {
      try {
        const grid = JSON.parse(nodeData.gradingGrid);
        return (
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-4">
              <h4 className="font-bold text-blue-400 mb-2">Instructions pour le correcteur</h4>
              <p className="text-sm text-slate-300">
                Posez les questions suivantes à l'étudiant pour vérifier ses connaissances.
              </p>
            </div>

            {grid.map((item: any, index: number) => {
              const isMarkedCorrect = correctorsAnswers[item.questionIndex];
              
              return (
                <div key={index} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-white text-lg">Critère #{index + 1}</h4>
                      <p className="text-slate-300 mt-2">{item.criteria}</p>
                    </div>
                    <span className="bg-purple-900/50 text-purple-400 px-3 py-1 rounded-full text-sm font-bold">
                      {item.points} pts
                    </span>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-slate-700">
                    <button
                      onClick={() => setCorrectorsAnswers({ ...correctorsAnswers, [item.questionIndex]: true })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                        isMarkedCorrect === true ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-green-600/20 hover:text-green-400'
                      }`}
                    >
                      <Check size={18} /> Validé
                    </button>
                    <button
                      onClick={() => setCorrectorsAnswers({ ...correctorsAnswers, [item.questionIndex]: false })}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                        isMarkedCorrect === false ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-red-600/20 hover:text-red-400'
                      }`}
                    >
                      <X size={18} /> Non acquis
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      } catch (e) {
        return <p className="text-red-400">Erreur Grille</p>;
      }
    }

    // Cas 3: Pas de grille ni QCM - Saisie manuelle du score
    return (
      <div className="space-y-4">
        <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-lg">
          <h4 className="font-bold text-amber-400 mb-2">Mode de correction libre</h4>
          <p className="text-sm text-slate-300">
            Cet exercice n'a pas de grille d'évaluation prédéfinie. Entrez directement le score de l'étudiant.
          </p>
        </div>

        {/* Travail soumis par l'étudiant */}
        {data.submissionData && (
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h4 className="font-bold text-white mb-3">Travail soumis par l'étudiant</h4>
            <div className="bg-slate-900/50 p-4 rounded-lg text-slate-300 whitespace-pre-wrap">
              {data.submissionData}
            </div>
          </div>
        )}

        {/* Saisie du score */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h4 className="font-bold text-white mb-4">Score de l'étudiant</h4>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={manualScore ?? 0}
              onChange={(e) => setManualScore(parseInt(e.target.value))}
              className="flex-1 h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={manualScore ?? ''}
                onChange={(e) => setManualScore(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="0"
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-center text-xl font-bold text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-2xl font-bold text-slate-400">%</span>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {[0, 25, 50, 75, 100].map((preset) => (
              <button
                key={preset}
                onClick={() => setManualScore(preset)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  manualScore === preset
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const { projectDetails, student } = data;
  const currentScore = calculateScore();
  const minimumScore = nodeData?.minimumScore || 80;
  // Déterminer si toutes les questions ont été notées
  const hasGradingGrid = nodeData?.gradingGrid || (nodeData?.exerciseType === 'qcm' && nodeData?.exerciseData);
  const allQuestionsGraded = hasGradingGrid
    ? (nodeData?.gradingGrid 
        ? JSON.parse(nodeData.gradingGrid).every((g: any) => correctorsAnswers[g.questionIndex] !== undefined)
        : nodeData?.exerciseData 
          ? JSON.parse(nodeData.exerciseData).every((_: any, i: number) => correctorsAnswers[i] !== undefined)
          : false)
    : manualScore !== null; // Pour le mode manuel, vérifier que le score est défini

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 flex justify-center">
      <div className="max-w-5xl w-full">
        {/* ... Header ... */}
        {/* ... (Reuse existing header code) ... */}
        <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8"
        >
            <ArrowLeft size={20} /> Retour
        </button>

        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-6 mb-6 border border-purple-500/30">
          <h1 className="text-2xl font-bold mb-2">
            Correction de <span className="text-purple-400">{student?.firstName} {student?.lastName}</span>
          </h1>
          <p className="text-slate-300">Exercice: {projectDetails.label}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm text-slate-400 mb-1">Score actuel</div>
              <div className={`text-4xl font-black ${
                currentScore >= minimumScore ? 'text-green-400' : currentScore >= 50 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {currentScore}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">Score minimum</div>
              <div className="text-2xl font-bold text-slate-300">{minimumScore}%</div>
            </div>
          </div>
        </div>

        {/* Correction Interface */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
            <CheckSquare size={20}/> Évaluation
          </h2>
          {renderCorrectionInterface()}
        </div>

        {/* ... Comments and Submit ... */}
        {/* ... (Reuse existing footer code) ... */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
          <h3 className="text-lg font-bold mb-3 text-slate-300">Commentaires (optionnel)</h3>
          <textarea 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Points forts, erreurs, conseils..."
          />
        </div>

        <button 
          onClick={handleSubmit}
          disabled={loading || data.status !== 'PENDING' || !allQuestionsGraded}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
        >
          {loading ? 'Envoi...' : !allQuestionsGraded ? 'Veuillez évaluer tous les critères' : data.status === 'PENDING' ? (
            <>
              <Send size={20} /> Valider la correction
            </>
          ) : 'Correction déjà effectuée'}
        </button>
        {data.status !== 'PENDING' && (
          <p className="text-center text-red-400 mt-2 text-sm">Ce projet a déjà été corrigé.</p>
        )}
      </div>
    </div>
  );
}
