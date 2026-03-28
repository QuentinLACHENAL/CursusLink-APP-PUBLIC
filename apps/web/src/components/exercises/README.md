# 📚 Exercices Interactifs - CursusLink

## Architecture

Ce dossier contient tous les composants d'exercices interactifs de la plateforme.

### Structure
```
exercises/
├── README.md
├── types.ts                      # Types TypeScript partagés
├── ExerciseSelector.tsx          # Sélecteur de type d'exercice (pour le prof)
├── schema/                       # Schéma à trous (anatomie, etc.)
│   ├── SchemaExerciseBuilder.tsx # Interface prof pour créer l'exercice
│   ├── SchemaExercisePlayer.tsx  # Interface étudiant pour répondre
│   └── SchemaExerciseEvaluator.tsx # Interface évaluateur pour corriger
├── quiz/                         # QCM (existant, à migrer)
│   ├── QuizBuilder.tsx
│   ├── QuizPlayer.tsx
│   └── QuizEvaluator.tsx
├── fill-blank/                   # Texte à trous (futur)
│   └── ...
├── matching/                     # Jeu d'association (futur)
│   └── ...
└── free-text/                    # Sujet libre (futur)
    └── ...
```

## Types d'exercices supportés

### 1. Schéma à trous (Schema Fill-in)
- **Création**: Le prof importe un schéma (image) et place des blocs sur les zones à identifier
- **Modes**:
  - **Saisie libre**: L'étudiant tape la réponse, corrigée par un évaluateur humain
  - **Drag & Drop**: L'étudiant fait glisser les étiquettes dans les bons blocs
- **Évaluation**: Par un autre étudiant (peer correction)

### 2. QCM (Quiz)
- Questions à choix multiples avec correction automatique ou manuelle

### 3. Texte à trous (Fill in the blanks) - À venir
- Phrases avec des mots manquants à compléter

### 4. Jeu d'association (Matching) - À venir
- Relier des éléments entre eux (termes ↔ définitions)

### 5. Sujet libre (Free text) - À venir
- Réponse longue évaluée par un correcteur humain

## Configuration sauvegardée

Les configurations d'exercices sont sauvegardées:
- **Localement**: Export JSON pour backup
- **En ligne**: Stocké dans la base de données via l'API `/graph/node/:id/exercise`

## Roadmap

- [x] Architecture et types de base
- [ ] Schema Exercise Builder (prof)
- [ ] Schema Exercise Player (étudiant)
- [ ] Schema Exercise Evaluator (correcteur)
- [ ] Migration QCM existant
- [ ] Sauvegarde config en ligne
- [ ] Texte à trous
- [ ] Jeu d'association
- [ ] Sujet libre
