# CursusLink (Public Edition)

CursusLink est une plateforme de Learning Management System (LMS) gamifiée et d'apprentissage entre pairs (Peer-Learning). Elle intègre un graphe de compétences immersif en 3D, des fonctionnalités sociales avancées et un moteur visuel dynamique conçu pour offrir une expérience éducative engageante.

Vidéo de présentation : https://youtu.be/wPtc6BR6XiM

Galerie: 

<img width="2512" height="1404" alt="2" src="https://github.com/user-attachments/assets/60385870-529e-42c3-9da8-5c6093097263" />
<img width="2505" height="1403" alt="3" src="https://github.com/user-attachments/assets/0432e29b-18cb-4297-a073-e7392059703b" />
<img width="2505" height="1396" alt="5" src="https://github.com/user-attachments/assets/615af091-8d8c-4681-9714-0326f1891bc4" />

> **Note :** Ce dépôt contient la **Public Edition** de CursusLink. Ce dépôt a principalement pour but de montrer le code source (portfolio).

🌍 **App complète :** L'application complète et fonctionnelle est accessible et utilisée en production sur **[cursuslink.app](https://cursuslink.app)**. 

## Architecture

- **Frontend :** Next.js (App Router), TailwindCSS, React-Force-Graph
- **Backend :** NestJS, TypeORM, Socket.io
- **Bases de Données :** PostgreSQL (Données relationnelles), Neo4j (Données orientées graphe)

## Installation

### Pré-requis

Assurez-vous d'avoir installé les outils suivants sur votre machine :
- [Node.js](https://nodejs.org/) (v18 ou supérieur)
- [Docker](https://www.docker.com/) et Docker Compose

### 1. Lancer l'Infrastructure

Démarrez les bases de données requises (PostgreSQL, Neo4j) via Docker :

```bash
docker-compose up -d
```

### 2. Démarrer le Backend (API)

```bash
cd apps/api
npm install
npm run start:dev
```

*(Optionnel) Initialiser les données du graphe :*
```bash
curl -X POST http://localhost:3000/graph/seed
```

### 3. Démarrer le Frontend (Web)

Dans un nouveau terminal :

```bash
cd apps/web
npm install
npm run dev
```

L'application web sera alors accessible (généralement sur `http://localhost:3001` ou `http://localhost:3000` selon le port attribué par Next.js).

## Configuration

L'application nécessite des variables d'environnement pour fonctionner. Vous devez créer des fichiers `.env` en vous basant sur les exemples fournis (comme `.env.example`).

### Backend (`apps/api/.env`)
Les variables principales à configurer :
- `JWT_SECRET` : Clé secrète pour signer les tokens JWT.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` : Identifiants de connexion PostgreSQL.
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` : Identifiants de connexion Neo4j.
- `REDIS_HOST`, `REDIS_PORT` : (Optionnel) Configuration de Redis.

**Sécurité :** Ne commitez jamais vos vrais mots de passe ou clés secrètes dans le gestionnaire de versions.
