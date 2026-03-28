// Types partagés pour tous les exercices interactifs

export type ExerciseType = 
  | 'qcm' 
  | 'schema' 
  | 'matching' 
  | 'order' 
  | 'text-fill' 
  | 'video' 
  | 'crossword' 
  | 'axis' 
  | 'estimation' 
  | 'millionaire'
  | 'fill-blank' 
  | 'free-text';

export type ExerciseCategory = 
  | 'bases-theoriques'   // 📚 QCM, Anatomie, Physiologie
  | 'observation'        // 👁️ Vidéos, Photos, Placement
  | 'raisonnement'       // 🧠 Cas cliniques, Diagnostics
  | 'pratique'           // 🛠️ Médiations, Parcours
  | 'defis';             // 🏆 Jeux ludiques

export type ExerciseFiliere = 'standard' | 'psychomot';

export type ExerciseMode = 'free-input' | 'drag-drop';

export type ExerciseStatus = 'draft' | 'published' | 'archived';

// ========== SCHEMA EXERCISE ==========

export interface SchemaBlock {
  id: string;
  x: number;        // Position X en % de l'image
  y: number;        // Position Y en % de l'image
  width: number;    // Largeur en % de l'image
  height: number;   // Hauteur en % de l'image
  answer: string;   // Réponse attendue
  hint?: string;    // Indice optionnel
  points: number;   // Points attribués
  order?: number;   // Ordre d'affichage (pour drag&drop)
}

export interface SchemaExerciseConfig {
  id: string;
  type: 'schema';
  title: string;
  description?: string;
  imageUrl: string;           // URL de l'image du schéma
  imageWidth?: number;        // Dimensions originales
  imageHeight?: number;
  blocks: SchemaBlock[];      // Blocs à remplir
  mode: ExerciseMode;         // Mode de réponse
  showHints: boolean;         // Afficher les indices
  shuffleBlocks: boolean;     // Mélanger les réponses (drag&drop)
  timeLimit?: number;         // Limite de temps en secondes (optionnel)
  totalPoints: number;        // Points totaux
  createdAt: string;
  updatedAt: string;
}

export interface SchemaExerciseSubmission {
  id: string;
  exerciseId: string;
  studentId: string;
  studentName: string;
  answers: Record<string, string>; // blockId -> réponse donnée
  submittedAt: string;
  status: 'pending' | 'evaluated';
  score?: number;
  maxScore: number;
  evaluatorId?: string;
  evaluatorName?: string;
  evaluatedAt?: string;
  feedback?: string;
  blockFeedback?: Record<string, { correct: boolean; comment?: string }>;
}

// ========== QUIZ EXERCISE ==========

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];   // Indices des bonnes réponses
  points: number;
  explanation?: string;
}

export interface QuizExerciseConfig {
  id: string;
  type: 'quiz';
  title: string;
  description?: string;
  questions: QuizQuestion[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean; // Après soumission
  timeLimit?: number;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

// ========== QCM EXERCISE ==========

export interface QCMQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];   // Indices des bonnes réponses
  multipleCorrect: boolean;   // Si plusieurs réponses sont possibles
  points: number;
  explanation?: string;       // Explication après correction
}

export interface QCMExerciseConfig {
  id: string;
  type: 'qcm';
  title: string;
  description?: string;
  questions: QCMQuestion[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean;   // Montrer les réponses après soumission
  showExplanations: boolean;     // Montrer les explications
  allowPartialCredit: boolean;   // Points partiels pour choix multiples
  timeLimit?: number;            // Temps limite en secondes
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

// ========== FILL BLANK EXERCISE (futur) ==========

export interface FillBlankGap {
  id: string;
  position: number;           // Position dans le texte
  answer: string;
  acceptedVariants?: string[]; // Variantes acceptées
  points: number;
}

export interface FillBlankExerciseConfig {
  id: string;
  type: 'fill-blank';
  title: string;
  text: string;               // Texte avec {{gap_id}} pour les trous
  gaps: FillBlankGap[];
  caseSensitive: boolean;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

// ========== TEXT FILL EXERCISE ==========

export interface TextFillGap {
  id: string;
  word: string;
  hint?: string;
  points: number;
}

export interface TextFillExerciseConfig {
  id: string;
  type: 'text-fill';
  title: string;
  description?: string;
  content: string; // Text with {{id}} placeholders
  gaps: TextFillGap[];
  mode: 'drag-drop' | 'input';
  caseSensitive?: boolean;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

// ========== MATCHING EXERCISE (futur) ==========

export interface MatchingPair {
  id: string;
  left: string;               // Terme
  right: string;              // Définition/correspondance
  points: number;
}

export interface MatchingExerciseConfig {
  id: string;
  type: 'matching';
  title: string;
  description?: string;
  pairs: MatchingPair[];
  shuffleLeft: boolean;
  shuffleRight: boolean;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

// ========== ORDER EXERCISE ==========

export interface OrderItem {
  id: string;
  content: string;          // Texte de l'élément
  correctPosition: number;  // Position correcte (1-indexed)
  hint?: string;            // Indice optionnel
}

export interface OrderExerciseConfig {
  id: string;
  nodeId: string;
  type: 'order';
  title: string;
  description?: string;
  items: OrderItem[];
  pointsPerCorrect: number;  // Points par élément bien placé
  partialCredit: boolean;    // Donner des points partiels si presque bien placé
  totalPoints: number;
  createdAt?: string;
  updatedAt?: string;
}

// ========== AXIS CLASSIFICATION EXERCISE ==========

export interface AxisItem {
  id: string;
  content: string;            // Texte de l'élément
  correctValue: number;       // Position sur l'axe
  hint?: string;              // Indice optionnel
}

export interface AxisExerciseConfig {
  id: string;
  nodeId: string;
  type: 'axis';
  title: string;
  description?: string;
  axisLabel: string;          // Nom de l'axe
  minValue: number;           // Valeur minimum
  maxValue: number;           // Valeur maximum
  minLabel: string;           // Label minimum
  maxLabel: string;           // Label maximum
  tolerance: number;          // Tolérance (±)
  items: AxisItem[];
  pointsPerCorrect: number;
  partialCredit: boolean;
  totalPoints: number;
  createdAt?: string;
  updatedAt?: string;
}

// ========== CATEGORIZATION EXERCISE ==========

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

export interface CategorizationItem {
  id: string;
  content: string;
  correctCategoryId: string;
  hint?: string;
}

export interface CategorizationExerciseConfig {
  id: string;
  nodeId: string;
  type: 'categorization';
  title: string;
  description?: string;
  categories: Category[];
  items: CategorizationItem[];
  pointsPerCorrect: number;
  totalPoints: number;
  createdAt?: string;
  updatedAt?: string;
}

// ========== ESTIMATION EXERCISE ==========

export interface EstimationQuestion {
  id: string;
  question: string;           // Question posée
  unit: string;               // Unité (ex: "kg", "cm", "années")
  correctValue: number;       // Valeur correcte
  tolerance: number;          // Tolérance en %
  minValue?: number;          // Bornes optionnelles
  maxValue?: number;
  hint?: string;
  points: number;
}

export interface EstimationExerciseConfig {
  id: string;
  nodeId: string;
  type: 'estimation';
  title: string;
  description?: string;
  questions: EstimationQuestion[];
  partialCredit: boolean;     // Points partiels si proche
  totalPoints: number;
  createdAt?: string;
  updatedAt?: string;
}

// ========== VIDEO INTERACTIVE EXERCISE ==========

export interface VideoMarker {
  id: string;
  timestamp: number;          // Secondes dans la vidéo
  type: 'question' | 'info' | 'action';
  question?: string;          // Question à répondre
  options?: string[];         // Options QCM
  correctAnswerIndex?: number;
  points: number;
  pauseVideo: boolean;        // Mettre en pause pour répondre
}

export interface VideoInteractiveExerciseConfig {
  id: string;
  nodeId: string;
  type: 'video';
  title: string;
  description?: string;
  videoUrl: string;           // URL de la vidéo
  duration?: number;          // Durée en secondes
  markers: VideoMarker[];
  totalPoints: number;
  createdAt?: string;
  updatedAt?: string;
}

// ========== FREE TEXT EXERCISE (futur) ==========

export interface FreeTextExerciseConfig {
  id: string;
  type: 'free-text';
  title: string;
  prompt: string;             // Sujet/consigne
  minWords?: number;
  maxWords?: number;
  rubric?: string;            // Critères d'évaluation
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

// ========== UNION TYPES ==========

export type ExerciseConfig = 
  | SchemaExerciseConfig 
  | QuizExerciseConfig 
  | QCMExerciseConfig
  | FillBlankExerciseConfig 
  | TextFillExerciseConfig
  | MatchingExerciseConfig 
  | OrderExerciseConfig
  | AxisExerciseConfig
  | CategorizationExerciseConfig
  | EstimationExerciseConfig
  | VideoInteractiveExerciseConfig
  | FreeTextExerciseConfig;

// ========== COMMON PROPS ==========

export interface ExerciseBuilderProps {
  nodeId: string;
  nodeLabel: string;
  initialConfig?: ExerciseConfig;
  token: string;
  onSave: (config: ExerciseConfig) => void;
  onCancel: () => void;
}

export interface ExercisePlayerProps {
  config: ExerciseConfig;
  studentId: string;
  studentName: string;
  onSubmit: (submission: any) => void;
  onCancel: () => void;
}

export interface ExerciseEvaluatorProps {
  config: ExerciseConfig;
  submission: any;
  evaluatorId: string;
  evaluatorName: string;
  onEvaluate: (evaluation: any) => void;
  onCancel: () => void;
}
