import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Hexagon, Layers, MapPin, Upload, FileText, Gamepad2, CheckCircle, FolderOpen, Plus } from 'lucide-react';
import ResourceLibrary from './ResourceLibrary';
import { Resource } from './CreateResourceModal';
import ExerciseBuilder from '../../../components/ExerciseBuilder';
import { SchemaExerciseBuilder } from '../../../components/exercises/schema';
import { QCMBuilder } from '../../../components/exercises/qcm';
import { TextFillBuilder } from '../../../components/exercises/text-fill';
import { MatchingBuilder } from '../../../components/exercises/matching';
import { OrderBuilder } from '../../../components/exercises/order';
import { CategorizationBuilder } from '../../../components/exercises/categorization';
import { AxisBuilder } from '../../../components/exercises/axis';
import { EstimationBuilder } from '../../../components/exercises/estimation';
import SimpleCourseEditor from './SimpleCourseEditor';
import { api, API_BASE_URL } from '../../../services/api';
import { useNodeForm } from '../../../hooks/useNodeForm';

type CreationStep = 'type' | 'parents' | 'content' | 'evaluation';
type ExerciseBuilderType = 'qcm' | 'schema' | 'text-fill' | 'matching' | 'order' | 'categorization' | 'axis' | 'estimation';

interface CreationModalProps {
  isOpen: boolean;
  position: { x: number; y: number };
  initialType: 'galaxy' | 'system' | 'node';
  structure: any;
  token: string;
  userId: string;
  lastCreatedIn: { galaxy: string; system: string };
  onClose: () => void;
  onCreated: (galaxy: string, system: string, nodeId?: string, nodeType?: string, nodeData?: any, contentType?: string) => void;
}

export default function CreationModal({
  isOpen,
  position,
  initialType,
  structure,
  token,
  userId,
  lastCreatedIn,
  onClose,
  onCreated
}: CreationModalProps) {
  const [step, setStep] = useState<CreationStep>('type');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Utilisation du hook unifié
  const form = useNodeForm();
  
  // États UI non gérés par le formulaire (wizard, upload, builders)
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [contentType, setContentType] = useState<'file' | 'interactive' | 'editor'>('file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showExerciseSourceChoice, setShowExerciseSourceChoice] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [importedExercise, setImportedExercise] = useState<Resource | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderType, setBuilderType] = useState<ExerciseBuilderType>('qcm');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  
  // Course Editor State
  const [showCourseEditor, setShowCourseEditor] = useState(false);
  const [draftCourseContent, setDraftCourseContent] = useState('');
  const [draftFiles, setDraftFiles] = useState<Map<string, File>>(new Map());
  
  // Évaluation (UI specific, form handles description/grid)
  const [evaluationType, setEvaluationType] = useState<'auto' | 'manual'>('auto');
  const [evaluationInstructions, setEvaluationInstructions] = useState('');

  // Reset et pré-remplir avec les derniers utilisés
  useEffect(() => {
    if (isOpen) {
      setStep('type');
      form.reset();
      
      // Defaults
      form.handleChange('type', 'topic');
      form.handleChange('xp', 100);
      
      // Si on crée une galaxie ou un système, le premier nœud EST l'étoile (Ring 0)
      if (initialType !== 'node') {
        form.handleChange('orbitRing', 0);
        form.handleChange('type', 'star'); // Default Star
        form.handleChange('exerciseType', 'none'); // Star = Course (Content only)
      } else {
        form.handleChange('orbitRing', 1); // Par défaut pour une planète
        form.handleChange('type', 'planet'); // Default Planet
        form.handleChange('exerciseType', 'qcm'); // Planet = Exercise (QCM default)
      }
      
      // Pré-remplir avec les derniers galaxy/system utilisés
      if (lastCreatedIn.galaxy && structure && structure[lastCreatedIn.galaxy]) {
        form.handleChange('galaxy', lastCreatedIn.galaxy);
        if (lastCreatedIn.system && structure[lastCreatedIn.galaxy].groups[lastCreatedIn.system]) {
          form.handleChange('group', lastCreatedIn.system);
        }
      } else if (structure) {
        const galaxies = Object.keys(structure);
        if (galaxies.length > 0) {
          form.handleChange('galaxy', galaxies[0]);
          const systems = Object.keys(structure[galaxies[0]].groups);
          if (systems.length > 0) {
            form.handleChange('group', systems[0]);
          }
        }
      }
      
      setSelectedParents([]);
      setContentType('file');
      setUploadedFile(null);
      setEvaluationType('auto');
      setEvaluationInstructions('');
      setShowExerciseSourceChoice(false);
      setImportedExercise(null);
      setDraftCourseContent('');
      setDraftFiles(new Map());
    }
  }, [isOpen, lastCreatedIn, structure]); // Removed form from deps to avoid loop

  // Pré-sélectionner les parents en fonction du cercle orbital (Logique Solaire)
  useEffect(() => {
    if (isOpen && form.formData.galaxy && form.formData.group && structure) {
      const currentRing = form.formData.orbitRing;
      const galaxy = structure[form.formData.galaxy];
      
      // Cas 1: Étoile centrale (Ring 0) -> Chercher une autre étoile existante dans la constellation
      if (currentRing === 0) {
        // Collecter toutes les étoiles de cette constellation (tous les groupes)
        const allStarsInConstellation: any[] = [];
        if (galaxy) {
          Object.values(galaxy.groups).forEach((group: any) => {
            const stars = (group.nodes || []).filter((n: any) => 
              n.orbitRing === 0 || n.type === 'star' || n.type === 'region'
            );
            allStarsInConstellation.push(...stars);
          });
        }
        
        // S'il y a déjà des étoiles, pré-sélectionner la dernière créée comme parent
        if (allStarsInConstellation.length > 0) {
          // Par défaut, sélectionner la première étoile de la constellation (ou la dernière ajoutée)
          const lastStar = allStarsInConstellation[allStarsInConstellation.length - 1];
          setSelectedParents([lastStar.id]);
          form.handleChange('unlockCondition', 'AND');
        } else {
          // Première étoile de la constellation -> Pas de parents
          setSelectedParents([]);
          form.handleChange('unlockCondition', 'ALWAYS');
        }
        return;
      }

      // Cas 2: Planètes (Ring > 0) -> Dépendent du ring précédent
      if (galaxy && galaxy.groups[form.formData.group]) {
        const nodes = galaxy.groups[form.formData.group].nodes || [];
        
        // Trouver les nœuds du cercle précédent
        const previousRing = currentRing - 1;
        const parentNodes = nodes.filter((n: any) => {
           // Fallback sécurisé : si orbitRing est undefined, on assume 0 pour star, 1 pour autres
           const nRing = n.orbitRing ?? (n.type === 'star' ? 0 : 1); 
           return nRing === previousRing;
        });

        if (parentNodes.length > 0) {
           setSelectedParents(parentNodes.map((n: any) => n.id));
           form.handleChange('unlockCondition', 'AND'); // Il faut valider TOUS les nœuds du cercle précédent
        } else {
           // Fallback si le cercle précédent est vide
           // On essaie de trouver l'étoile centrale par défaut pour ne pas laisser orphelin
           const star = nodes.find((n: any) => (n.orbitRing === 0 || n.type === 'star') && n.orbitRing !== undefined);
           
           if (star) {
             setSelectedParents([star.id]);
             form.handleChange('unlockCondition', 'AND');
           } else {
             // Vraiment aucun parent trouvé (premier nœud ou système vide)
             setSelectedParents([]);
             form.handleChange('unlockCondition', 'ALWAYS');
           }
        }
      }
    }
  }, [isOpen, form.formData.orbitRing, form.formData.galaxy, form.formData.group, structure]);

  const validateStep = (currentStep: CreationStep) => {
    if (currentStep === 'type') {
      const { galaxy, group, label } = form.formData;
      if (!galaxy || !group || !label) {
        alert('Veuillez remplir tous les champs (Constellation, Étoile, Nom)');
        return false;
      }
    }
    return true;
  };

  if (!isOpen) return null;

  const handleCreate = async () => {
    try {
      const { galaxy, group, label } = form.formData;
      
      if (!galaxy || !group || !label) {
        alert('Veuillez remplir tous les champs');
        return;
      }

      // Préparer les données pour la création
      // Note: unlockCondition 'ALWAYS' est mappé vers 'AND' dans getSubmissionData via logique spécifique ici ou dans le hook
      // Ici le hook gère les champs standards. Pour ALWAYS, on doit adapter.
      
      const submissionData: any = form.getSubmissionData();
      submissionData.fx = position.x;
      submissionData.fy = position.y;
      
      if (form.formData.unlockCondition as any === 'ALWAYS') {
          submissionData.unlockCondition = 'AND';
      }

      // Si contenu texte sans fichiers (ou initial)
      if (contentType === 'editor') {
        submissionData.courseContent = draftCourseContent;
      }

      // Si exercice importé, utiliser ses données
      if (importedExercise) {
        submissionData.exerciseType = importedExercise.exerciseType || 'none';
        submissionData.exerciseData = importedExercise.exerciseData;
      } else if (contentType === 'interactive') {
        submissionData.exerciseType = 'none'; 
      }
      
      // Evaluation manuelle -> instructions dans exerciseDescription
      if (evaluationType === 'manual') {
          submissionData.exerciseDescription = evaluationInstructions;
      }

      const newNode = await api.createNode(submissionData, token);

      // Créer les liens vers les parents sélectionnés (seulement si pas ALWAYS)
      if (form.formData.unlockCondition as any !== 'ALWAYS') {
        for (const parentId of selectedParents) {
          await api.createRelationship(parentId, newNode.id, 'UNLOCKS', token);
        }
      }

      // Uploader le fichier si présent (Type File)
      if (uploadedFile && contentType === 'file' && newNode.id) {
        const formData = new FormData();
        formData.append('files', uploadedFile);
        
        try {
            await api.uploadNodeFiles(newNode.id, formData, token);
        } catch (err) {
            console.error('Erreur upload:', err);
            alert('⚠️ Nœud créé mais erreur lors de l\'upload du fichier');
        }
      }

      // Uploader les fichiers du DRAFT EDITOR (Images drag & drop)
      if (draftFiles.size > 0 && contentType === 'editor' && newNode.id) {
        let updatedContent = draftCourseContent;
        const formData = new FormData();
        
        draftFiles.forEach((file) => {
            formData.append('files', file);
        });

        try {
            const result = await api.uploadNodeFiles(newNode.id, formData, token);
            
            // Remplacer les blob URLs par les vraies URLs
            if (result.uploadedFiles) {
                result.uploadedFiles.forEach((upFile: any) => {
                    draftFiles.forEach((file, blobUrl) => {
                        if (file.name === upFile.originalName) {
                             const realUrl = `${API_BASE_URL}/uploads/file/${upFile.filename}`;
                             updatedContent = updatedContent.split(blobUrl).join(realUrl);
                        }
                    });
                });
                
                // Mettre à jour le nœud avec le contenu corrigé
                await api.updateNode(newNode.id, { courseContent: updatedContent }, token);
                
                // Update local object for UI update
                newNode.courseContent = updatedContent;
            }
        } catch (err) {
            console.error('Draft files upload error:', err);
        }
      }

      alert('✅ Élément créé avec succès !');
      
      const finalNodeType = (contentType === 'interactive' && !importedExercise) ? 'exercise' : submissionData.type;
      
      onCreated(galaxy, group, newNode.id, finalNodeType, newNode, contentType);
      onClose();
    } catch (error) {
      console.error(error);
      alert('❌ Erreur lors de la création');
    }
  };

  const getAllNodes = () => {
    if (!structure) return [];
    const nodes: any[] = [];
    Object.values(structure).forEach((galaxy: any) => {
      Object.values(galaxy.groups).forEach((group: any) => {
        group.nodes.forEach((node: any) => {
          nodes.push({ ...node, galaxyName: galaxy.name, groupName: group.name });
        });
      });
    });
    return nodes;
  };

  const toggleParent = (nodeId: string) => {
    setSelectedParents(prev => 
      prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              {initialType === 'galaxy' && <Hexagon className="text-blue-400" size={20} />}
              {initialType === 'system' && <Layers className="text-purple-400" size={20} />}
              {initialType === 'node' && <MapPin className="text-green-400" size={20} />}
              <div>
                <h2 className="text-lg font-bold text-white">
                  {initialType === 'galaxy' && '✨ Nouvelle Constellation (Matière)'}
                  {initialType === 'system' && '⭐ Nouvelle Étoile (Chapitre)'}
                  {initialType === 'node' && '🪐 Nouvelle Planète (Cours)'}
                </h2>
                <p className="text-[10px] text-slate-500">Position: ({Math.round(position.x)}, {Math.round(position.y)})</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6 py-3 bg-slate-800/50 flex gap-2 shrink-0">
            {['type', 'parents', 'content', 'evaluation'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ 
                  step === s ? 'bg-blue-500 text-white' : 
                  ['type', 'parents', 'content', 'evaluation'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-500'
                }`}>
                  {['type', 'parents', 'content', 'evaluation'].indexOf(step) > i ? <CheckCircle size={14} /> : i + 1}
                </div>
                {i < 3 && <ChevronRight size={14} className="mx-1 text-slate-600" />}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            
            {/* Étape 1: Type et noms */}
            {step === 'type' && (
              <div className="space-y-4">
                {initialType === 'galaxy' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Nom de la constellation (matière)</label>
                      <input
                        type="text"
                        value={form.formData.galaxy}
                        onChange={(e) => form.handleChange('galaxy', e.target.value)}
                        placeholder="Ex: Anatomie, Mathématiques..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Première étoile (chapitre)</label>
                      <input
                        type="text"
                        value={form.formData.group}
                        onChange={(e) => {
                          form.handleChange('group', e.target.value);
                          form.handleChange('label', e.target.value); // Sync label avec le nom de l'étoile
                        }}
                        placeholder="Ex: Introduction, Chapitre 1..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      />
                    </div>
                  </>
                )}

                {initialType === 'system' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Constellation</label>
                      <select
                        value={form.formData.galaxy}
                        onChange={(e) => form.handleChange('galaxy', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      >
                        <option value="">-- Choisir une constellation --</option>
                        {structure && Object.keys(structure).map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Nom de l'étoile (chapitre)</label>
                      <input
                        type="text"
                        value={form.formData.group}
                        onChange={(e) => {
                          form.handleChange('group', e.target.value);
                          form.handleChange('label', e.target.value); // Sync label avec le nom de l'étoile
                        }}
                        placeholder="Ex: Chapitre 2, Module avancé..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      />
                    </div>
                  </>
                )}

                {initialType === 'node' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Constellation</label>
                      <select
                        value={form.formData.galaxy}
                        onChange={(e) => { 
                            form.handleChange('galaxy', e.target.value); 
                            form.handleChange('group', ''); 
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      >
                        <option value="">-- Choisir une constellation --</option>
                        {structure && Object.keys(structure).map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Étoile</label>
                      <select
                        value={form.formData.group}
                        onChange={(e) => form.handleChange('group', e.target.value)}
                        disabled={!form.formData.galaxy}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white disabled:opacity-50"
                      >
                        <option value="">-- Choisir une étoile --</option>
                        {form.formData.galaxy && structure[form.formData.galaxy] && 
                          Object.keys(structure[form.formData.galaxy].groups).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))
                        }
                      </select>
                    </div>
                  </>
                )}

                {initialType === 'node' && (
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                      Nom de la planète (nouveau cours/exercice)
                    </label>
                    <input
                      type="text"
                      value={form.formData.label}
                      onChange={(e) => form.handleChange('label', e.target.value)}
                      placeholder="Ex: Cours d\'introduction, TD 1..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Type de contenu</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[ 
                      { value: 'topic', label: '📚 Cours', color: 'blue' },
                      { value: 'exercise', label: '✏️ Exercice', color: 'green' },
                      { value: 'Project', label: '🎯 Projet', color: 'purple' }
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => form.handleChange('type', t.value as any)}
                        className={`p-3 rounded-lg border text-sm font-bold transition-all ${ 
                          form.formData.type === t.value 
                            ? `bg-${t.color}-500/20 border-${t.color}-500 text-${t.color}-400` 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">XP (Récompense)</label>
                  <input
                    type="number"
                    value={form.formData.xp}
                    onChange={(e) => form.handleChange('xp', parseInt(e.target.value) || 100)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                  />
                </div>
              </div>
            )}

            {/* Étape 2: Position & Déblocage */}
            {step === 'parents' && (
              <div className="space-y-4">
                {/* 1. Sélection du cercle orbital (en premier) */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
                    1. Position orbitale
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Choisissez la position dans le système solaire du chapitre.
                  </p>
                  <div className="flex gap-2 flex-wrap items-center">
                    {/* Étoile centrale (cercle 0) */}
                    <button
                      onClick={() => form.handleChange('orbitRing', 0)}
                      className={`px-4 py-3 rounded-lg border-2 flex items-center gap-2 font-bold transition-all ${
                        form.formData.orbitRing === 0
                          ? 'bg-yellow-500/30 border-yellow-400 text-yellow-400'
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-lg">⭐</span>
                      <span className="text-sm">Étoile centrale</span>
                    </button>

                    <div className="text-slate-600 text-xs px-2">ou</div>

                    {/* Cercles orbitaux (planètes) */}
                    {[1, 2, 3, 4, 5].map(ring => (
                      <button
                        key={ring}
                        onClick={() => form.handleChange('orbitRing', ring)}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold transition-all ${
                          form.formData.orbitRing === ring
                            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-400'
                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {ring}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">
                    {form.formData.orbitRing === 0
                      ? "⭐ L'étoile centrale est le premier nœud du chapitre, toujours débloqué"
                      : `🪐 Cercle ${form.formData.orbitRing} : débloqué quand ${form.formData.orbitRing === 1 ? "l'étoile centrale est validée" : `tous les nœuds du cercle ${form.formData.orbitRing - 1} sont validés`}`
                    }
                  </p>
                </div>

                {/* 2. Condition de déblocage (basé sur les cercles par défaut) */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
                    2. Condition de déblocage
                  </label>

                  {/* Message explicatif sur la condition par défaut */}
                  <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg mb-3">
                    <p className="text-cyan-400 text-xs font-medium">
                      📋 Condition de base : {form.formData.orbitRing === 0 
                        ? "Liée à l'étoile précédente de la constellation"
                        : "Avoir validé tous les exercices du cercle précédent"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {form.formData.orbitRing === 0
                        ? selectedParents.length > 0 
                          ? "Cette étoile sera débloquée quand l'étoile prérequise sera validée."
                          : "Première étoile de la constellation - toujours accessible."
                        : form.formData.orbitRing === 1
                        ? "Ce nœud sera débloqué quand l'étoile centrale sera validée."
                        : `Ce nœud sera débloqué quand tous les nœuds du cercle ${form.formData.orbitRing - 1} seront validés.`
                      }
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 mb-2">
                    Vous pouvez personnaliser cette condition si nécessaire :
                  </p>

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => form.handleChange('unlockCondition', 'AND')}
                      className={`flex-1 p-2 rounded-lg border text-xs font-bold ${
                        form.formData.unlockCondition === 'AND' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      TOUS (AND)
                    </button>
                    <button
                      onClick={() => form.handleChange('unlockCondition', 'OR')}
                      className={`flex-1 p-2 rounded-lg border text-xs font-bold ${
                        form.formData.unlockCondition === 'OR' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      AU MOINS UN (OR)
                    </button>
                    <button
                      onClick={() => { form.handleChange('unlockCondition', 'ALWAYS'); setSelectedParents([]); }}
                      className={`flex-1 p-2 rounded-lg border text-xs font-bold ${
                        form.formData.unlockCondition === 'ALWAYS' as any ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      TOUJOURS
                    </button>
                  </div>

                  {form.formData.unlockCondition as any === 'ALWAYS' && (
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                      <p className="text-green-400 text-xs font-bold">✨ Ce contenu sera accessible dès le début.</p>
                    </div>
                  )}

                  {form.formData.unlockCondition as any !== 'ALWAYS' && (
                    <>
                      <p className="text-[10px] text-slate-500 mb-2">
                        Prérequis supplémentaires (optionnel) :
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-700 rounded-lg p-2">
                        {getAllNodes().map(node => (
                          <button
                            key={node.id}
                            onClick={() => toggleParent(node.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                              selectedParents.includes(node.id)
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            <span>{node.label}</span>
                            <span className="text-[9px] text-slate-500">{node.galaxyName}/{node.groupName}</span>
                          </button>
                        ))}
                        {getAllNodes().length === 0 && (
                          <p className="text-slate-500 text-xs text-center py-2">Aucun nœud existant</p>
                        )}
                      </div>
                      {selectedParents.length > 0 && (
                        <p className="text-[10px] text-green-400 mt-2">
                          + {selectedParents.length} prérequis supplémentaire(s) sélectionné(s)
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Étape 3: Contenu */}
            {step === 'content' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Choisissez comment ajouter du contenu à cette planète.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setContentType('file')}
                    className={`p-4 rounded-lg border text-left flex items-center gap-4 ${ 
                      contentType === 'file' ? 'bg-blue-500/20 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Upload size={24} className={contentType === 'file' ? 'text-blue-400' : 'text-slate-500'} />
                    <div>
                      <div className="font-bold text-white">Importer un fichier</div>
                      <div className="text-xs text-slate-500">PDF, DOC, DOCX</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowExerciseSourceChoice(true)}
                    className={`p-4 rounded-lg border text-left flex items-center gap-4 ${ 
                      contentType === 'interactive' ? 'bg-purple-500/20 border-purple-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Gamepad2 size={24} className={contentType === 'interactive' ? 'text-purple-400' : 'text-slate-500'} />
                    <div>
                      <div className="font-bold text-white">Exercice interactif</div>
                      <div className="text-xs text-slate-500">
                        {importedExercise ? `Importé: ${importedExercise.name}` : 'QCM, Schéma, Associations'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                        setContentType('editor');
                        setShowCourseEditor(true);
                    }}
                    className={`p-4 rounded-lg border text-left flex items-center gap-4 ${ 
                      contentType === 'editor' ? 'bg-green-500/20 border-green-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <FileText size={24} className={contentType === 'editor' ? 'text-green-400' : 'text-slate-500'} />
                    <div>
                      <div className="font-bold text-white">Éditeur de cours</div>
                      <div className="text-xs text-slate-500">
                        {draftCourseContent ? 'Contenu rédigé ✓' : 'Rédiger en Markdown'}
                      </div>
                    </div>
                  </button>
                </div>

                {contentType === 'file' && (
                  <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Fichier à importer</label>
                    
                    {/* Input caché */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedFile(file);
                        }
                      }}
                    />
                    
                    {/* Zone de drop / click */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 bg-slate-950 hover:bg-slate-900 rounded-lg border-2 border-dashed border-slate-600 hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer transition-all"
                    >
                      <Upload size={32} className={uploadedFile ? 'text-green-400 mb-2' : 'text-slate-500 mb-2'} />
                      <span className={`text-sm ${uploadedFile ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                        {uploadedFile ? `✓ ${uploadedFile.name}` : 'Cliquez pour choisir un fichier'}
                      </span>
                      <span className="text-xs text-slate-600 mt-1">PDF, DOC, DOCX acceptés</span>
                    </div>
                    
                    {!uploadedFile && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-bold"
                      >
                        📂 Parcourir mes fichiers
                      </button>
                    )}
                    
                    {uploadedFile && (
                      <div className="mt-3 flex gap-2">
                        <p className="text-xs text-green-400 flex-1 flex items-center">✓ Fichier prêt à être importé</p>
                        <button
                          type="button"
                          onClick={() => setUploadedFile(null)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-600 text-center">
                  Vous pourrez configurer le contenu en détail après la création.
                </p>
              </div>
            )}

            {/* Étape 4: Évaluation */}
            {step === 'evaluation' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Comment ce contenu sera-t-il évalué ?
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setEvaluationType('auto')}
                    className={`p-4 rounded-lg border text-left ${ 
                      evaluationType === 'auto' ? 'bg-green-500/20 border-green-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold text-white">✓ Validation automatique</div>
                    <div className="text-xs text-slate-500 mt-1">
                      L'étudiant valide en donnant les points (lecture, cours simple)
                    </div>
                  </button>

                  <button
                    onClick={() => setEvaluationType('manual')}
                    className={`p-4 rounded-lg border text-left ${ 
                      evaluationType === 'manual' ? 'bg-orange-500/20 border-orange-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold text-white">👥 Évaluation manuelle</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Un évaluateur doit vérifier et valider le travail
                    </div>
                  </button>
                </div>

                {evaluationType === 'manual' && (
                  <div className="mt-4">
                    <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                      Instructions pour l\'évaluateur
                    </label>
                    <textarea
                      value={evaluationInstructions}
                      onChange={(e) => setEvaluationInstructions(e.target.value)}
                      placeholder="Décrivez ce que l\'évaluateur doit vérifier..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white h-24"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700 flex justify-between bg-slate-800 shrink-0">
            <button
              onClick={() => {
                const steps: CreationStep[] = ['type', 'parents', 'content', 'evaluation'];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) setStep(steps[currentIndex - 1]);
              }}
              disabled={step === 'type'}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white flex items-center gap-2"
            >
              <ChevronLeft size={16} /> Précédent
            </button>

            {step === 'evaluation' ? (
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold flex items-center gap-2"
              >
                <CheckCircle size={16} /> Créer
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!validateStep(step)) return;
                  const steps: CreationStep[] = ['type', 'parents', 'content', 'evaluation'];
                  const currentIndex = steps.indexOf(step);
                  if (currentIndex < steps.length - 1) setStep(steps[currentIndex + 1]);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white flex items-center gap-2"
              >
                Suivant <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlays */}
      
      {showCourseEditor && (
        <SimpleCourseEditor 
            initialContent={draftCourseContent}
            onSave={(content, files) => {
                setDraftCourseContent(content);
                setDraftFiles(files);
                setContentType('editor');
                setShowCourseEditor(false);
            }}
            onClose={() => setShowCourseEditor(false)}
        />
      )}

      {/* Choix Source Exercice Overlay */}
      {showExerciseSourceChoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Source de l\'exercice</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowExerciseSourceChoice(false);
                  setShowTypeSelector(true);
                }}
                className="w-full p-4 bg-green-600/20 hover:bg-green-600/30 border border-green-600 rounded-lg flex items-center gap-3 text-left"
              >
                <Plus className="text-green-400" size={24} />
                <div>
                  <div className="font-bold text-green-400">Créer un nouvel exercice</div>
                  <div className="text-xs text-slate-400">Configurer maintenant</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowExerciseSourceChoice(false);
                  setShowLibrary(true);
                }}
                className="w-full p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600 rounded-lg flex items-center gap-3 text-left"
              >
                <FolderOpen className="text-purple-400" size={24} />
                <div>
                  <div className="font-bold text-purple-400">Importer depuis la bibliothèque</div>
                  <div className="text-xs text-slate-400">Choisir un exercice existant</div>
                </div>
              </button>
            </div>
            <button 
              onClick={() => setShowExerciseSourceChoice(false)}
              className="mt-6 w-full py-2 text-slate-400 hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Type Selector Overlay */}
      {showTypeSelector && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[480px] shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Type d'exercice</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setBuilderType('qcm');
                  setShowTypeSelector(false);
                  setShowBuilder(true);
                }}
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">📋</span>
                <span className="font-bold text-white text-sm">QCM</span>
              </button>
              <button
                onClick={() => {
                  setBuilderType('schema');
                  setShowTypeSelector(false);
                  setShowBuilder(true);
                }}
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">🖼️</span>
                <span className="font-bold text-white text-sm">Schéma</span>
              </button>
              <button
                onClick={() => {
                  setBuilderType('text-fill');
                  setShowTypeSelector(false);
                  setShowBuilder(true);
                }}
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">📝</span>
                <span className="font-bold text-white text-sm">Texte à trous</span>
              </button>
              <button
                onClick={() => {
                  setBuilderType('matching');
                  setShowTypeSelector(false);
                  setShowBuilder(true);
                }}
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">🔗</span>
                <span className="font-bold text-white text-sm">Associations</span>
              </button>
              <button
                onClick={() => {
                  setBuilderType('order');
                  setShowTypeSelector(false);
                  setShowBuilder(true);
                }}
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">🔢</span>
                <span className="font-bold text-white text-sm">Ordre</span>
              </button>
              <button
                onClick={() => {
                  setBuilderType('categorization');
                  setShowTypeSelector(false);
                  setShowBuilder(true);
                }}
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">📂</span>
                <span className="font-bold text-white text-sm">Catégories</span>
              </button>
            </div>
            <button 
              onClick={() => setShowTypeSelector(false)}
              className="mt-6 w-full py-2 text-slate-400 hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Builders */}
      {showBuilder && builderType === 'qcm' && (
        <div className="fixed inset-0 z-[70]">
          <QCMBuilder
            nodeId="new-node"
            nodeLabel={form.formData.label || 'Nouveau QCM'}
            onSave={(config) => {
              const resource: Resource = {
                id: `res-${Date.now()}`,
                type: 'exercise',
                name: config.title || `QCM - ${form.formData.label || 'Nouveau'}`,
                description: config.description || 'Créé lors de la création du nœud',
                category: 'bases-theoriques',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                exerciseType: 'qcm',
                exerciseData: JSON.stringify(config)
              };
              setImportedExercise(resource);
              setContentType('interactive');
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'schema' && (
        <div className="fixed inset-0 z-[70]">
          <SchemaExerciseBuilder
            nodeId="new-node"
            nodeLabel={form.formData.label || 'Nouveau Schéma'}
            token={token}
            onSave={(config) => {
              const resource: Resource = {
                id: `res-${Date.now()}`,
                type: 'exercise',
                name: config.title || `Schéma - ${form.formData.label || 'Nouveau'}`,
                description: config.description || 'Créé lors de la création du nœud',
                category: 'observation',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                exerciseType: 'schema',
                exerciseData: JSON.stringify(config)
              };
              setImportedExercise(resource);
              setContentType('interactive');
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
            onImageSelected={async (file) => {
               return URL.createObjectURL(file);
            }}
          />
        </div>
      )}

      {showBuilder && builderType === 'text-fill' && (
        <div className="fixed inset-0 z-[70]">
          <TextFillBuilder
            nodeId="new-node"
            nodeLabel={form.formData.label || 'Nouveau Texte à trous'}
            onSave={(config) => {
              const resource: Resource = {
                id: `res-${Date.now()}`,
                type: 'exercise',
                name: config.title || `Texte à trous - ${form.formData.label || 'Nouveau'}`,
                description: config.description || 'Créé lors de la création du nœud',
                category: 'bases-theoriques',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                exerciseType: 'text-fill',
                exerciseData: JSON.stringify(config)
              };
              setImportedExercise(resource);
              setContentType('interactive');
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'matching' && (
        <div className="fixed inset-0 z-[70]">
          <MatchingBuilder
            nodeId="new-node"
            nodeLabel={form.formData.label || 'Nouvelles Associations'}
            token={token}
            onSave={(config) => {
              const resource: Resource = {
                id: `res-${Date.now()}`,
                type: 'exercise',
                name: config.title || `Associations - ${form.formData.label || 'Nouveau'}`,
                description: config.description || 'Créé lors de la création du nœud',
                category: 'bases-theoriques',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                exerciseType: 'matching',
                exerciseData: JSON.stringify(config)
              };
              setImportedExercise(resource);
              setContentType('interactive');
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'order' && (
        <div className="fixed inset-0 z-[70]">
          <OrderBuilder
            nodeId="new-node"
            nodeLabel={form.formData.label || 'Nouvel Ordre'}
            token={token}
            onSave={(config) => {
              const resource: Resource = {
                id: `res-${Date.now()}`,
                type: 'exercise',
                name: config.title || `Ordre - ${form.formData.label || 'Nouveau'}`,
                description: config.description || 'Créé lors de la création du nœud',
                category: 'bases-theoriques',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                exerciseType: 'order',
                exerciseData: JSON.stringify(config)
              };
              setImportedExercise(resource);
              setContentType('interactive');
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'categorization' && (
        <div className="fixed inset-0 z-[70]">
          <CategorizationBuilder
            nodeId="new-node"
            onSave={(config) => {
              const resource: Resource = {
                id: `res-${Date.now()}`,
                type: 'exercise',
                name: config.title || `Catégorisation - ${form.formData.label || 'Nouveau'}`,
                description: config.description || 'Créé lors de la création du nœud',
                category: 'bases-theoriques',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                exerciseType: 'categorization',
                exerciseData: JSON.stringify(config)
              };
              setImportedExercise(resource);
              setContentType('interactive');
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'axis' && (
        <div className="fixed inset-0 z-[70]">
          <AxisBuilder
            nodeId="creation-modal"
            initialConfig={undefined}
            onSave={(config) => {
              const resource: Resource = {
                id: `res-${Date.now()}`,
                type: 'exercise',
                name: config.title || `Classement - ${form.formData.label || 'Nouveau'}`,
                description: config.description || 'Créé lors de la création du nœud',
                category: 'bases-theoriques',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                exerciseType: 'axis',
                exerciseData: JSON.stringify(config)
              };
              setImportedExercise(resource);
              setContentType('interactive');
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && builderType === 'estimation' && (
        <div className="fixed inset-0 z-[70]">
          <EstimationBuilder
            nodeId="creation-modal"
            initialConfig={undefined}
            onSave={(config) => {
              const resource: Resource = {
                id: `res-${Date.now()}`,
                type: 'exercise',
                name: config.title || `Estimation - ${form.formData.label || 'Nouveau'}`,
                description: config.description || 'Créé lors de la création du nœud',
                category: 'bases-theoriques',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                exerciseType: 'estimation',
                exerciseData: JSON.stringify(config)
              };
              setImportedExercise(resource);
              setContentType('interactive');
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {/* Library */}
      <ResourceLibrary
        isOpen={showLibrary}
        token={token}
        userId={userId}
        structure={structure}
        onClose={() => setShowLibrary(false)}
        mode="select-for-node"
        onLinkToNode={(resource) => {
          if (resource.type === 'exercise') {
            setImportedExercise(resource);
            setContentType('interactive');
            setShowLibrary(false);
          } else {
            alert('Veuillez sélectionner un exercice, pas un document.');
          }
        }}
      />
    </>
  );
}
