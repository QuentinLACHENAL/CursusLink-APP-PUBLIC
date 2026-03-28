Notes pour dépendances et Docker

- Quand tu ajoutes une dépendance dans `apps/web` :
  1. Exécute `cd apps/web && npm install <package>`
  2. Pour que Docker prenne en compte la dépendance, rebuild l'image :
     - `docker-compose build web && docker-compose up -d web` 
     - ou `docker-compose up -d --build` pour tout rebuild

- `docker-compose up -d` seul suffit uniquement si l'image a déjà été rebuild après les modifications de dépendances.

- Pour le développement local, `npm run dev` reste la méthode rapide.
