DOFUS CRAFT MANAGER — SITE À PARTAGER

1. Crée un projet gratuit sur https://supabase.com
2. Ouvre SQL Editor, colle et exécute supabase.sql.
3. Dans Project Settings / API Keys, copie l’URL du projet et la clé publique anon/publishable.
4. Ouvre config.js et remplace les deux valeurs. N’utilise JAMAIS la clé service_role/secret.
5. Crée un dépôt GitHub PUBLIC avec index.html et config.js (pas besoin du fichier SQL en ligne).
6. Dans GitHub > Settings > Pages, choisis Deploy from a branch, main, /(root).
7. Attends que l’adresse https://UTILISATEUR.github.io/DEPOT/ soit disponible.
8. Partage cette adresse à tes deux amis. Chacun sélectionne son personnage.

ATTENTION : sans authentification, n’importe qui ayant accès à l’adresse et à la clé publique peut lire et modifier les données. La clé publique est visible dans le navigateur. Ne mettez aucune information sensible.

Le site affiche un bandeau vert lorsque la synchronisation fonctionne. Actualisation toutes les 12 secondes. Le fichier HTML seul fonctionne en local, sans synchronisation.

LIMITES : les quêtes préchargées ne couvrent pas encore tous les Dofus ; les quantités de ressources des métiers restent à vérifier avant achat ; la synchronisation repose sur un état par personnage et deux modifications simultanées sur le même personnage peuvent s’écraser.
