# @cursuslink/shared-types

Types TypeScript partagés entre le frontend (Next.js) et le backend (NestJS) de CursusLink.

## Installation

Depuis le dossier racine du monorepo :

```bash
# Dans le dossier libs/shared-types
npm install
npm run build

# Lier dans les apps
cd apps/api && npm link ../../libs/shared-types
cd apps/web && npm link ../../libs/shared-types
```

Ou ajouter dans le `package.json` de chaque app :

```json
{
  "dependencies": {
    "@cursuslink/shared-types": "file:../../libs/shared-types"
  }
}
```

## Utilisation

```typescript
import { 
  NodeType, 
  GraphNode, 
  CreateNodePayload,
  VALID_RELATIONSHIP_TYPES 
} from '@cursuslink/shared-types';
```

## Types disponibles

### Hiérarchie des noeuds

- `NodeHierarchyType` : Types du nouveau système constellation
- `NodeType` : Type combiné (nouveau + legacy)
- `ExerciseType` : Types d'exercices
- `UnlockCondition` : Condition de déblocage ('AND' | 'OR')

### Entités

- `GraphNode` : Noeud du graphe
- `GraphLink` : Relation entre noeuds
- `Exercise` : Exercice
- `User` : Utilisateur

### Payloads API

- `CreateNodePayload` : Création de noeud
- `UpdateNodePayload` : Mise à jour de noeud
- `CreateRelationshipPayload` : Création de relation
- `SubmitExercisePayload` : Soumission d'exercice

### Constantes

- `VALID_RELATIONSHIP_TYPES` : Liste des types de relations valides
- `NODE_TYPE_MIGRATION` : Mapping ancien → nouveau type

## Maintenance

Lors de l'ajout de nouveaux types :

1. Ajouter le type dans `src/index.ts`
2. Rebuild : `npm run build`
3. Les apps récupèrent automatiquement les changements
