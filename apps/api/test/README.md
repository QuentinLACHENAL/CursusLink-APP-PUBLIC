# Test Suite Documentation

## Overview

Cette suite de tests couvre les fonctionnalités critiques de l'API CursusLink avec une couverture complète des services, contrôleurs et endpoints.

## Structure des Tests

```
test/
├── utils/
│   └── test-mocks.ts          # Mocks centralisés pour tous les tests
├── unit/
│   ├── auth.service.spec.ts   # Tests du service d'authentification
│   ├── exercises.service.spec.ts  # Tests de soumission QCM
│   ├── graph-crud.service.spec.ts # Tests CRUD du graphe
│   ├── users.service.spec.ts  # Tests de gestion des utilisateurs
│   ├── shop.service.spec.ts   # Tests de la boutique
│   ├── backup.service.spec.ts # Tests de sauvegarde/restauration
│   ├── corrections.service.spec.ts # Tests des corrections
│   ├── admin.service.spec.ts  # Tests du service admin
│   ├── neo4j.service.spec.ts  # Tests de la connexion Neo4j
│   └── security.spec.ts       # Tests de sécurité
├── e2e/
│   ├── auth.e2e-spec.ts       # Tests e2e authentification
│   ├── graph.e2e-spec.ts      # Tests e2e graphe & exercices
│   └── admin.e2e-spec.ts      # Tests e2e administration
├── setup.ts                   # Configuration Jest
├── jest-unit.json             # Config tests unitaires
└── jest-e2e.json              # Config tests e2e
```

## Exécution des Tests

### Tests Unitaires

```bash
# Tous les tests unitaires
npm run test:unit

# Mode watch (développement)
npm run test:unit:watch

# Avec couverture de code
npm run test:unit:cov
```

### Tests End-to-End

```bash
# Tous les tests e2e
npm run test:e2e
```

### Tous les Tests

```bash
npm run test:all
```

## Couverture des Tests

### auth.service.spec.ts

| Fonction | Couverture |
|----------|------------|
| `validateUser` | ✅ Valid credentials, invalid credentials, banned user, timing attack prevention |
| `login` | ✅ Token generation |
| `register` | ✅ New user creation, duplicate prevention |

### exercises.service.spec.ts

| Fonction | Couverture |
|----------|------------|
| `submitQCM` | ✅ Pass/fail evaluation, dynamic minimumScore, XP attribution, multiple answers, error handling |
| `getExercise` | ✅ Exercise retrieval |

### graph-crud.service.spec.ts

| Fonction | Couverture |
|----------|------------|
| `createNode` | ✅ With all properties, ID generation, legacy type migration, exercise creation |
| `updateNode` | ✅ Property update, not found error, exercise sync |
| `deleteNode` | ✅ Cascade delete, XP recalculation, rollback on error |
| `createRelationship` | ✅ Valid types, invalid type rejection |
| `deleteRelationship` | ✅ Deletion, validation |
| `cleanupOrphanedExercises` | ✅ Orphan deletion |
| `validateSkill` | ✅ MASTERED relationship, XP update |

### users.service.spec.ts

| Fonction | Couverture |
|----------|------------|
| `findAll` | ✅ All users retrieval |
| `findOne` | ✅ By ID, not found |
| `create` | ✅ Postgres+Neo4j creation, duplicate prevention, rollback on failure |
| `update` | ✅ Property update, Neo4j sync |
| `remove` | ✅ Postgres+Neo4j deletion |
| `resetPassword` | ✅ Secure password generation |
| `banUser/unbanUser` | ✅ Status update |

### shop.service.spec.ts

| Fonction | Couverture |
|----------|------------|
| `findAllItems` | ✅ Available items, admin view |
| `buyItem` | ✅ Purchase, insufficient credits, pessimistic locking |
| `createItem` | ✅ Validation |
| `refundPurchase` | ✅ Credit restoration |

### backup.service.spec.ts

| Fonction | Couverture |
|----------|------------|
| `exportGraph` | ✅ Nodes+relationships export |
| `importGraph` | ✅ Validation, Cypher injection prevention, atomic transactions |
| `clearGraph` | ✅ Full deletion |
| `getGraphStats` | ✅ Statistics |

### security.spec.ts

| Test | Description |
|------|-------------|
| Label validation | Whitelist enforcement, injection prevention |
| Relationship type validation | Whitelist enforcement |
| Timing attack prevention | Constant-time comparison |
| Session leak prevention | try/finally pattern |
| Race condition prevention | Pessimistic locking |
| XSS prevention | HTML sanitization |
| SQL/Cypher injection | Parameterized queries |
| Password security | crypto.randomBytes usage |
| Transaction atomicity | Rollback on partial failure |

## Tests de Sécurité

Les tests suivants vérifient les vulnérabilités critiques corrigées :

1. **Cypher Injection** - `backup.service.spec.ts`
   - Validation des labels et types de relations
   - Rejet des caractères spéciaux

2. **Timing Attack** - `auth.service.spec.ts`
   - Comparaison constante même pour utilisateurs inexistants

3. **Race Condition** - `shop.service.spec.ts`
   - Verrouillage pessimiste pour les achats

4. **Session Leaks** - Tous les services
   - Pattern try/finally pour fermeture de sessions

5. **Distributed Transaction** - `users.service.spec.ts`
   - Rollback Postgres si Neo4j échoue

## Mocks Disponibles

Tous les mocks sont centralisés dans `test/utils/test-mocks.ts` :

```typescript
// Neo4j
createMockNeo4jSession()
createMockNeo4jService()
createNeo4jRecord(data)
createNeo4jResult(records)

// User
createMockUser(overrides)
createMockUserRepository()

// Graph
createMockGraphNode(overrides)
createMockRelationship(overrides)

// Services
createMockGraphService()
createMockUsersService()
createMockJwtService()
createMockCoalitionsService()

// Request/Response
createMockRequest(overrides)
createMockResponse()

// Test Data
generateQCMData(questionCount)
generateCorrectAnswers(questionCount)
generateWrongAnswers(questionCount)
```

## Ajout de Nouveaux Tests

1. Importer les mocks nécessaires depuis `test/utils/test-mocks.ts`
2. Utiliser `Test.createTestingModule()` pour créer le module de test
3. Override les providers avec les mocks
4. Suivre le pattern AAA (Arrange, Act, Assert)

```typescript
import { createMockNeo4jService, createMockUser } from '../utils/test-mocks';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: Neo4jService, useValue: createMockNeo4jService() },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should do something', async () => {
    // Arrange
    const input = { ... };

    // Act
    const result = await service.doSomething(input);

    // Assert
    expect(result).toBeDefined();
  });
});
```

## Seuils de Couverture

Les seuils configurés dans `jest-unit.json` :

| Métrique | Seuil |
|----------|-------|
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |
| Statements | 70% |

## CI/CD Integration

Ces tests peuvent être intégrés dans une pipeline CI/CD :

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit:cov
      - run: npm run test:e2e
```
