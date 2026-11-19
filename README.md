# From Zero to Hero — suivi des Dofus (DOFUS Unity)

Site d'équipe pour Furionette (Sram), Volrod (Féca) et Zepharyen (Éliotrope) : journal des Dofus, quêtes à cocher, progression par personnage synchronisée.

- `src/data/` : la base de données (source de vérité, voir `BASE-DONNEES.md`).
- `src/model/` : catalogue affiché, personnages, sauvegarde (navigateur + Supabase).
- `supabase/schema.sql` : à exécuter une fois dans Supabase (choisir le code d'équipe dedans).
- `legacy/` : l'ancien site (fichier HTML unique), gardé pour référence.

## Développer
```
npm install
npm run dev      # site local
npm run check    # vérification des données + TypeScript
npm run build    # version à publier (dans dist/)
```

## Mise en ligne
Le code source vit sur la branche `site-react`. À chaque envoi sur cette branche, l'action « Publier le site » vérifie les données, construit le site et remplace la branche `main`, que GitHub Pages affiche (Deploy from a branch : main / root). L'ancien site reste consultable dans `legacy/`.
