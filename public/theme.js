// Thème appliqué avant l'affichage (fichier séparé : la politique de sécurité interdit les scripts en ligne).
try { document.body.dataset.theme = localStorage.getItem('fzth:v2:theme') || 'light'; } catch (e) { document.body.dataset.theme = 'light'; }
