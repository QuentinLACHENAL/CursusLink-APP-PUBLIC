# VS Code — Synchronisation et rechargement

Bref guide pour vérifier que ta configuration VS Code est la même sur plusieurs machines, et comment gérer les fichiers modifiés ailleurs.

- **Compte et état de la sync**
  - Clique sur l'icône de compte (coin inférieur gauche) pour vérifier le compte connecté.
  - Ouvre la palette (Ctrl+Shift+P) et exécute `Settings Sync: Show Synced Data` pour voir ce qui est synchronisé et la date/heure.

- **Ce qui est (ou n'est pas) synchronisé**
  - Les **paramètres utilisateur**, extensions, snippets, keybindings, thèmes, etc. sont synchronisés si Settings Sync est activé.
  - Les **paramètres workspace** dans `.vscode/settings.json` NE SONT PAS synchronisés par Settings Sync. Pour partager une configuration de projet, commite `.vscode/settings.json` dans le repo.

- **Comparer les extensions entre machines**
  - Sur chaque machine, exécute:
```bash
code --list-extensions | sort > extensions-$(hostname).txt
```
  - Compare les fichiers produits (`diff`/`git`) pour voir les différences.

- **Forcer/rafraîchir la sync et résoudre les problèmes**
  - Palette: `Settings Sync: Turn Off` puis `Settings Sync: Turn On` pour relancer la synchronisation.
  - Si nécessaire: `Settings Sync: Reset Synced Data` (attention: efface les données cloud).
  - Pour recharger l'éditeur et prendre en compte changements sur disque: `Developer: Reload Window`.

- **Conseils pratiques**
  - Committe `.vscode/settings.json` si tu veux la même configuration de workspace pour tous.
  - Active `files.autoSave` ou `files.autoSave: onFocusChange` si tu veux réduire les conflits manuels.
  - En cas de conflit de sauvegarde, choisis `askUser` pour être prévenu plutôt que d'écraser automatiquement.

Si tu veux, je peux aussi committer ce fichier et le `.vscode/settings.json` dans le repo pour le partager entre tes machines.
