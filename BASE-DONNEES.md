# Base de données From Zero to Hero (Dofus Unity)

État au 19/11/2026. Cette branche ne modifie pas le site actuel (`index.html`) : elle ajoute uniquement la base de données dans `src/data/`.

## Principes
- Chaque Dofus, succès et quête a un identifiant unique ; statut `verified` ou `toConfirm`.
- Sources : dofuspourlesnoobs.com (quêtes, liens, kamas, « À prévoir ») ; pour le Dom de Pin, captures de la page Tougli + classeur Tougli (.xlsx) fournis par Meriem.
- Aucun lien ni kamas inventés : ce qui n'est pas lu sur la source reste « à confirmer ».
- `src/data/kamas.ts` calcule le total du parcours (succès + quêtes, chaque élément compté une fois) et indique s'il est complet ou partiel.

## Vérifier
```
npx tsx scripts/validate.ts
npx tsc -p .
```

## État actuel
- 7 Dofus : Sylvestre, Émeraude, Pourpre, Turquoise, Ivoire, Ébène, Ocre (seul l'Ocre a un total complet).
- Dom de Pin : liste complète (109 quêtes + 6 prérequis), chaque quête avec son lien DPLN, ses icônes (combats, donjons, métiers…) et son donjon (`dom-de-pin-tougli.ts`, généré par `scripts/tougli/`). Points encore ouverts dans `domDePinOpenPoints`.
- À faire : kamas manquants, quêtes prérequises citées mais absentes, pages DPLN illisibles, autres Dofus, puis l'interface React + TypeScript.
