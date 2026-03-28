'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, BookOpen, Dumbbell, FileText, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { api, API_BASE_URL } from '../../../services/api';

import SchemaExercisePlayer from '../../../components/exercises/schema/SchemaExercisePlayer';
import MatchingPlayer from '../../../components/exercises/matching/MatchingPlayer';
import OrderPlayer from '../../../components/exercises/order/OrderPlayer';
import TextFillPlayer from '../../../components/exercises/text-fill/TextFillPlayer';
import EstimationPlayer from '../../../components/exercises/estimation/EstimationPlayer';
import AxisPlayer from '../../../components/exercises/axis/AxisPlayer';
import { SchemaExerciseConfig, SchemaExerciseSubmission, MatchingExerciseConfig, OrderExerciseConfig, TextFillExerciseConfig, EstimationExerciseConfig, AxisExerciseConfig } from '../../../components/exercises/types';

export default function ExercisePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const nodeId = params.nodeId as string;

  const [node, setNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'course' | 'exercise'>('course');
  
  // Generic exercise state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Schema state
  const [schemaSubmission, setSchemaSubmission] = useState<SchemaExerciseSubmission | null>(null);
  const [pendingCorrection, setPendingCorrection] = useState(false);

  useEffect(() => {
    if (!nodeId) return;
    
    // Fetch node data
    api.getNodeById(nodeId)
      .then(data => {
        setNode(data);
        setLoading(false);
        
        // Check lock status
        if (data.isUnlocked === false) {
            alert('Ce contenu est verrouillé !');
            router.push('/');
            return;
        }

        // Gérer l'onglet initial basé sur l'URL ou le contenu
        const tabParam = searchParams.get('tab');
        if (tabParam === 'exercise' && data.exerciseType !== 'none') {
          setActiveTab('exercise');
        } else if (!data.courseContent && data.exerciseType !== 'none') {
          setActiveTab('exercise');
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Check for pending corrections
    if (user?.id) {
      api.getMyRequests(user.id)
        .then(requests => {
          if (Array.isArray(requests)) {
             const isPending = requests.some((r: any) => r.projectId === nodeId && r.status === 'PENDING');
             setPendingCorrection(isPending);
          } else {
             setPendingCorrection(false);
          }
        })
        .catch(console.error);
    }
  }, [nodeId, searchParams, user?.id]);

  const handleSubmitQCM = async () => {
    if (!node?.exerciseData) return;
    
    try {
      const result = await api.verifyExercise(nodeId, answers, token);
      
      setScore(result.score);
      setSubmitted(true);

      if (result.passed) {
        console.log('Exercice réussi et validé !');
      }
    } catch (e: any) {
      alert('Erreur lors de la vérification : ' + e.message);
    }
  };

  const handleSchemaSubmit = async (submission: SchemaExerciseSubmission) => {
    setSchemaSubmission(submission);
    
    if (!user?.id) {
      alert('Vous devez être connecté pour soumettre un exercice');
      return;
    }

    // Prevent re-validation if already mastered or score is 100%
    if (node?.isMastered || node?.score === 100) {
        alert('Ce module est déjà validé à 100%. Vous ne pouvez pas le soumettre à nouveau.');
        return;
    }

    try {
      // Check validation mode
      if (node?.validationType === 'auto') {
          // Automatic validation - send only the answers, not the full submission object
          const result = await api.verifyExercise(nodeId, submission.answers, token);
          setScore(result.score);
          setSubmitted(true);

          if (result.passed) {
             alert(`Exercice validé automatiquement ! Score: ${result.score}%`);
             router.push('/');
          } else {
             alert(`Score insuffisant (${result.score}%). Réessayez.`);
          }
      } else {
          // Manual (Peer) validation
          try {
            await api.requestCorrection(nodeId, JSON.stringify(submission), token);
            alert('Exercice soumis avec succès ! Il sera corrigé par vos pairs.');
            router.push('/');
          } catch (err: any) {
            // Handle insufficient points gracefully
            if (err.message && (err.message.includes('points') || err.message.includes('crédits') || err.status === 403)) {
                alert("⚠️ Vous n'avez pas assez de points d'évaluation pour demander une correction. Corrigez d'autres étudiants pour en gagner !");
            } else {
                throw err; // Rethrow other errors
            }
          }
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      alert(error.message || 'Erreur lors de la soumission de l\'exercice');
    }
  };

  const renderQCM = () => {
    if (!node?.exerciseData) return null;
    
    let questions: any[];
    try {
      const parsed = JSON.parse(node.exerciseData);
      
      // Support both formats:
      // - Old format: array of questions directly [{question, options, correct, multipleAnswers}]
      // - New format: QCMExerciseConfig {type: 'qcm', questions: [{question, options, correctAnswers, multipleCorrect}]}
      if (Array.isArray(parsed)) {
        // Old format - direct array
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        // New QCMExerciseConfig format - map to expected structure
        questions = parsed.questions.map((q: any) => ({
          question: q.question,
          options: q.options,
          // Map correctAnswers[] to correct (single or array based on multipleCorrect)
          correct: q.multipleCorrect ? q.correctAnswers : (q.correctAnswers?.[0] ?? 0),
          multipleAnswers: q.multipleCorrect,
          explanation: q.explanation,
          points: q.points
        }));
      } else {
        console.error('exerciseData is not a valid QCM format:', parsed);
        return <div className="text-red-400 p-4">Format d'exercice invalide</div>;
      }
    } catch (e) {
      console.error('Failed to parse exerciseData:', e);
      return <div className="text-red-400 p-4">Erreur: données d'exercice corrompues</div>;
    }
      
    return (
      <div className="space-y-6">
        {questions.map((q: any, qIndex: number) => {
            const isMultiple = q.multipleAnswers;
            const userAnswer = answers[qIndex];
            
            return (
              <div key={qIndex} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">
                    Question {qIndex + 1}
                  </h3>
                  {isMultiple && (
                    <span className="text-xs bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full border border-purple-500/50">
                      Choix multiples
                    </span>
                  )}
                </div>
                <p className="text-slate-300 mb-4">{q.question}</p>
                
                <div className="space-y-2">
                  {q.options.map((option: string, optIndex: number) => {
                    // Gestion choix multiples vs unique
                    let isSelected = false;
                    if (isMultiple) {
                      isSelected = Array.isArray(userAnswer) && userAnswer.includes(optIndex);
                    } else {
                      isSelected = userAnswer === optIndex;
                    }
                    
                    // Vérifier si c'est une bonne réponse
                    let isCorrect = false;
                    if (isMultiple) {
                      isCorrect = Array.isArray(q.correct) && q.correct.includes(optIndex);
                    } else {
                      isCorrect = q.correct === optIndex;
                    }
                    
                    const showResult = submitted;
                    
                    let bgClass = 'bg-slate-700/30 hover:bg-slate-700/50 border-slate-600';
                    if (showResult && isCorrect) bgClass = 'bg-green-900/30 border-green-500';
                    else if (showResult && isSelected && !isCorrect) bgClass = 'bg-red-900/30 border-red-500';
                    else if (isSelected) bgClass = 'bg-purple-900/30 border-purple-500';
                    
                    const handleClick = () => {
                      if (node?.isMastered || submitted) return; // Prevent change if mastered/submitted

                      if (isMultiple) {
                        // Mode choix multiples
                        const current = Array.isArray(userAnswer) ? [...userAnswer] : [];
                        const idx = current.indexOf(optIndex);
                        if (idx > -1) {
                          current.splice(idx, 1);
                        } else {
                          current.push(optIndex);
                        }
                        setAnswers({ ...answers, [qIndex]: current });
                      } else {
                        // Mode choix unique
                        setAnswers({ ...answers, [qIndex]: optIndex });
                      }
                    };
                    
                    return (
                      <button
                        key={optIndex}
                        disabled={submitted || node?.isMastered}
                        onClick={handleClick}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${bgClass} ${submitted || node?.isMastered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 ${isMultiple ? 'rounded-lg' : 'rounded-full'} border-2 flex items-center justify-center ${
                            isSelected ? 'border-white bg-white' : 'border-slate-500'
                          }`}>
                            {isSelected && !showResult && <div className={`w-3 h-3 ${isMultiple ? 'rounded' : 'rounded-full'} bg-purple-600`}></div>}
                            {showResult && isCorrect && <CheckCircle size={18} className="text-green-500" />}
                            {showResult && isSelected && !isCorrect && <XCircle size={18} className="text-red-500" />}
                          </div>
                          <span className="text-white">{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}


          {!submitted && !node?.isMastered ? (
            <button
              onClick={handleSubmitQCM}
              disabled={Object.keys(answers).length !== questions.length}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-colors"
            >
              Valider mes réponses
            </button>
          ) : (
            <div className={`p-6 rounded-xl text-center ${
              (score >= 80 || node?.isMastered) ? 'bg-green-900/30 border-2 border-green-500' : 'bg-red-900/30 border-2 border-red-500'
            }`}>
              <h2 className="text-2xl font-bold text-white mb-2">
                {(node?.isMastered) ? '🎉 Module déjà validé !' : `Score: ${score}%`}
              </h2>
              <p className="text-slate-300 mb-4">
                {(score >= 80 || node?.isMastered) ? 'Félicitations ! Vous maîtrisez ce sujet.' : '😔 Continuez vos efforts, vous pouvez recommencer.'}
              </p>
              <div className="flex gap-4 justify-center">
                {!node?.isMastered && (
                    <button
                    onClick={() => {
                        setAnswers({});
                        setSubmitted(false);
                        setScore(0);
                    }}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                    Recommencer
                    </button>
                )}
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                >
                  Retour au graphe
                </button>
              </div>
            </div>
          )}
        </div>
      );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Node introuvable</p>
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-purple-600 rounded-lg">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const hasCourse = node.courseContent && node.courseContent.trim();
  const hasExercise = node.exerciseType && node.exerciseType !== 'none' && node.exerciseData;
  
  // Identifier l'image du schéma pour la masquer des fichiers (avec gestion d'erreur)
  const schemaConfig = (() => {
    if (node.exerciseType !== 'schema' || !node.exerciseData) return null;
    try {
      return JSON.parse(node.exerciseData);
    } catch (e) {
      console.error('Failed to parse schema config:', e);
      return null;
    }
  })();
  const schemaImageFilename = schemaConfig?.imageUrl ? schemaConfig.imageUrl.split('/').pop() : null;

  // Parse attached files - HIDE ALL for schema exercises (they contain the solution!)
  const attachedFiles = (() => {
    try {
      // For schema exercises, don't show any attachments (they're the solution)
      if (node.exerciseType === 'schema') return [];
      if (!node.attachedFiles) return [];
      const files = typeof node.attachedFiles === 'string' ? JSON.parse(node.attachedFiles) : node.attachedFiles;
      // Filtrer l'image du schéma
      return files.filter((f: any) => f.filename !== schemaImageFilename);
    } catch { return []; }
  })();
  const hasAttachedFiles = attachedFiles.length > 0;

  const handleTopicValidation = async () => {
    if (!user?.id) return;

    // Prevent re-validation if already mastered or score is 100%
    if (node?.isMastered || node?.score === 100) {
        alert('Ce cours est déjà validé à 100%. Vous ne pouvez pas le soumettre à nouveau.');
        return;
    }

    // Check validation mode
    if (node?.validationType === 'auto') {
        try {
            // Auto-validate (give XP)
            // We use validateSkill endpoint directly via API wrapper if available, or call verify with empty/dummy data
            await api.validateSkill(nodeId, node.xp || 100, token);
            alert(`Félicitations ! Cours validé (+${node.xp || 100} XP)`);
            router.push('/');
        } catch (e: any) {
            alert('Erreur validation auto: ' + e.message);
        }
        return;
    }

    if (!confirm("Avez-vous bien assimilé ce cours ?\n\nUne demande de validation sera envoyée aux autres étudiants.")) return;

    try {
      await api.requestCorrection(nodeId, JSON.stringify({ type: 'topic_validation' }), token);
      alert('Demande de validation envoyée !');
      router.push('/');
    } catch (error: any) {
      // Handle insufficient points
      if (error.message && (error.message.includes('points') || error.message.includes('crédits') || error.status === 403)) {
        alert("⚠️ Vous n'avez pas assez de points d'évaluation. Corrigez d'autres étudiants pour en gagner !");
      } else {
        alert(error.message || 'Erreur');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => router.push('/')} 
              className="p-2 hover:bg-slate-700 rounded-full transition-colors"
            >
              <ArrowLeft />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                {node.label}
              </h1>
              <p className="text-slate-400 text-sm mt-1">{node.group} - {node.galaxy}</p>
            </div>
            
            {/* Banner if Mastered */}
            {node.isMastered && (
                <div className="ml-auto bg-green-900/30 border border-green-500/50 text-green-400 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                    <CheckCircle size={18} />
                    Validé
                </div>
            )}
          </div>

          {/* Tabs */}
          {hasCourse && hasExercise && (
            <div className="flex gap-2 bg-slate-950 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('course')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'course' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen size={16} />
                Cours
              </button>
              <button
                onClick={() => setActiveTab('exercise')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'exercise' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Dumbbell size={16} />
                Exercice
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Fichiers attachés - Toujours visibles en haut */}
        {hasAttachedFiles && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
              <FileText size={20} /> Supports de cours
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attachedFiles.map((file: any) => (
                <div key={file.filename} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {file.mimetype?.includes('pdf') ? '📄' : file.mimetype?.includes('image') ? '🖼️' : '📝'}
                    </span>
                    <div>
                      <p className="text-white font-medium">{file.originalName}</p>
                      <p className="text-xs text-slate-500">{Math.round(file.size / 1024)} Ko</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`${API_BASE_URL}/uploads/file/${file.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                      title="Ouvrir"
                    >
                      <ExternalLink size={18} />
                    </a>
                    <a
                      href={`${API_BASE_URL}/uploads/file/${file.filename}`}
                      download={file.originalName}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      title="Télécharger"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'course' && hasCourse && (
          <div className="prose prose-invert max-w-none">
            <div className="bg-slate-800/30 rounded-xl p-8 border border-slate-700">
              <div className="whitespace-pre-wrap text-slate-200 leading-relaxed">
                {node.courseContent}
              </div>
            </div>
            
            {hasExercise && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setActiveTab('exercise')}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors"
                >
                  Passer à l'exercice →
                </button>
              </div>
            )}

            {/* Validation simple pour Cours sans exercice */}
            {!hasExercise && !pendingCorrection && (
              <div className="mt-8 text-center border-t border-slate-700 pt-8">
                <p className="text-slate-400 mb-4">Ce cours ne nécessite pas d'exercice pratique.</p>
                <button
                  onClick={handleTopicValidation}
                  className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <CheckCircle size={20} />
                  J'ai appris le cours
                </button>
                <p className="text-xs text-slate-500 mt-2">Vous serez évalué par un pair sur la base de vos connaissances.</p>
              </div>
            )}
            
            {!hasExercise && pendingCorrection && (
               <div className="mt-8 text-center border-t border-slate-700 pt-8">
                  <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-4 inline-block">
                    <p className="text-blue-300 font-bold">✓ Demande de validation envoyée</p>
                    <p className="text-xs text-slate-400">En attente d'un correcteur...</p>
                  </div>
               </div>
            )}
          </div>
        )}

        {activeTab === 'exercise' && hasExercise && (
          <div>
            {pendingCorrection ? (
              <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-8 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Correction en attente</h3>
                <p className="text-slate-300">
                  Vous avez déjà soumis cet exercice. Veuillez attendre qu'il soit corrigé par un pair ou un professeur avant de pouvoir le retenter.
                </p>
                <button
                  onClick={() => router.push('/corrections')}
                  className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Voir mes demandes
                </button>
              </div>
            ) : (
              <>
                {node.exerciseType === 'qcm' && renderQCM()}
                
                {node.exerciseType === 'schema' && (() => {
                  try {
                    const config: SchemaExerciseConfig = JSON.parse(node.exerciseData);
                    return (
                      <div className="h-[80vh] bg-black/20 rounded-xl overflow-hidden border border-slate-700">
                        <SchemaExercisePlayer
                          config={config}
                          studentId={user?.id || 'guest'}
                          studentName={user?.username || 'Guest'}
                          onSubmit={handleSchemaSubmit}
                          onCancel={() => router.push('/')}
                        />
                      </div>
                    );
                  } catch (e) {
                    return <p className="text-red-400">Erreur de configuration de l'exercice schéma</p>;
                  }
                })()}

                {node.exerciseType === 'matching' && (() => {
                  try {
                    const config: MatchingExerciseConfig = JSON.parse(node.exerciseData);
                    return (
                      <div className="bg-black/20 rounded-xl overflow-hidden border border-slate-700 p-4">
                        <MatchingPlayer
                          config={config}
                          studentId={user?.id || 'guest'}
                          studentName={user?.username || 'Guest'}
                          onSubmit={async (submission) => {
                            try {
                              const result = await api.verifyExercise(nodeId, submission.answers, token);
                              setScore(result.score);
                              setSubmitted(true);
                              if (result.passed) {
                                alert(`Exercice réussi ! Score: ${result.score}%`);
                              }
                            } catch (e: any) {
                              alert('Erreur: ' + e.message);
                            }
                          }}
                          onCancel={() => router.push('/')}
                        />
                      </div>
                    );
                  } catch (e) {
                    return <p className="text-red-400">Erreur de configuration de l'exercice associations</p>;
                  }
                })()}

                {node.exerciseType === 'order' && (() => {
                  try {
                    const config: OrderExerciseConfig = JSON.parse(node.exerciseData);
                    return (
                      <div className="bg-black/20 rounded-xl overflow-hidden border border-slate-700 p-4">
                        <OrderPlayer
                          config={config}
                          studentId={user?.id || 'guest'}
                          studentName={user?.username || 'Guest'}
                          onSubmit={async (submission) => {
                            try {
                              // Convert array of IDs to {itemId: position}
                              const answerMap: Record<string, number> = {};
                              submission.answers.forEach((itemId, idx) => {
                                answerMap[itemId] = idx + 1;
                              });
                              const result = await api.verifyExercise(nodeId, answerMap, token);
                              setScore(result.score);
                              setSubmitted(true);
                              if (result.passed) {
                                alert(`Exercice réussi ! Score: ${result.score}%`);
                              }
                            } catch (e: any) {
                              alert('Erreur: ' + e.message);
                            }
                          }}
                          onCancel={() => router.push('/')}
                        />
                      </div>
                    );
                  } catch (e) {
                    return <p className="text-red-400">Erreur de configuration de l'exercice classement</p>;
                  }
                })()}

                {node.exerciseType === 'text-fill' && (() => {
                  try {
                    const config: TextFillExerciseConfig = JSON.parse(node.exerciseData);
                    return (
                      <div className="bg-black/20 rounded-xl overflow-hidden border border-slate-700 p-6">
                        <h3 className="text-xl font-bold text-white mb-4">{config.title}</h3>
                        {config.description && <p className="text-slate-400 mb-6">{config.description}</p>}
                        <TextFillPlayer
                          config={config}
                          onComplete={async (userAnswers, calculatedScore) => {
                            try {
                              const result = await api.verifyExercise(nodeId, userAnswers, token);
                              setScore(result.score);
                              setSubmitted(true);
                              if (result.passed) {
                                alert(`Exercice réussi ! Score: ${result.score}%`);
                              }
                            } catch (e: any) {
                              alert('Erreur: ' + e.message);
                            }
                          }}
                        />
                      </div>
                    );
                  } catch (e) {
                    return <p className="text-red-400">Erreur de configuration de l'exercice texte à trous</p>;
                  }
                })()}

                {node.exerciseType === 'estimation' && (() => {
                  try {
                    const config: EstimationExerciseConfig = JSON.parse(node.exerciseData);
                    return (
                      <div className="bg-black/20 rounded-xl overflow-hidden border border-slate-700 p-4">
                        <EstimationPlayer
                          config={config}
                          studentId={user?.id || 'guest'}
                          studentName={user?.username || 'Guest'}
                          onSubmit={async (submission) => {
                            try {
                              // Convert array [{questionId, value}] to Record<string, number>
                              const answerMap: Record<string, number> = {};
                              submission.answers.forEach(a => {
                                answerMap[a.questionId] = a.value;
                              });
                              const result = await api.verifyExercise(nodeId, answerMap, token);
                              setScore(result.score);
                              setSubmitted(true);
                              if (result.passed) {
                                alert(`Exercice réussi ! Score: ${result.score}%`);
                              }
                            } catch (e: any) {
                              alert('Erreur: ' + e.message);
                            }
                          }}
                          onCancel={() => router.push('/')}
                        />
                      </div>
                    );
                  } catch (e) {
                    return <p className="text-red-400">Erreur de configuration de l'exercice estimation</p>;
                  }
                })()}

                {node.exerciseType === 'axis' && (() => {
                  try {
                    const config: AxisExerciseConfig = JSON.parse(node.exerciseData);
                    return (
                      <div className="bg-black/20 rounded-xl overflow-hidden border border-slate-700 p-4">
                        <AxisPlayer
                          config={config}
                          studentId={user?.id || 'guest'}
                          studentName={user?.username || 'Guest'}
                          onSubmit={async (submission) => {
                            try {
                              // Convert array [{itemId, placedValue}] to Record<string, number>
                              const answerMap: Record<string, number> = {};
                              submission.answers.forEach(a => {
                                answerMap[a.itemId] = a.placedValue;
                              });
                              const result = await api.verifyExercise(nodeId, answerMap, token);
                              setScore(result.score);
                              setSubmitted(true);
                              if (result.passed) {
                                alert(`Exercice réussi ! Score: ${result.score}%`);
                              }
                            } catch (e: any) {
                              alert('Erreur: ' + e.message);
                            }
                          }}
                          onCancel={() => router.push('/')}
                        />
                      </div>
                    );
                  } catch (e) {
                    return <p className="text-red-400">Erreur de configuration de l'exercice axe</p>;
                  }
                })()}

                {/* Type non supporté */}
                {!['qcm', 'schema', 'matching', 'order', 'text-fill', 'estimation', 'axis', 'none'].includes(node.exerciseType) && (
                  <div className="bg-yellow-900/30 border border-yellow-500 rounded-xl p-6 text-center">
                    <p className="text-yellow-300">Type d'exercice "{node.exerciseType}" non encore supporté dans le player.</p>
                    <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                      Retour
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!hasCourse && !hasExercise && !hasAttachedFiles && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg mb-4">
              Aucun contenu pédagogique configuré pour ce nœud
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Retour au graphe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
