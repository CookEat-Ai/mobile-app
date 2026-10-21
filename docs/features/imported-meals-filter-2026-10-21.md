# Recettes importées dans Repas

Le filtre « Importées » s’affiche après « Tous » dans la bibliothèque Repas, avec les mêmes cartes que le reste de l’application. Il lit uniquement l’historique importé de l’identité connectée, conserve la pagination et recherche dans toutes les pages de cet historique. Les données locales peuvent compléter les photos et la nutrition pour les IDs effectivement renvoyés par le serveur. Les valeurs nutritionnelles absentes ne sont pas affichées comme des zéros.

Après import, le parcours revient au navigateur d’onglets existant, sélectionne Repas avec le filtre Importées, puis ouvre la fiche. Le retour natif ou par la flèche retrouve ainsi cette liste. Chaque demande de sélection peut réactiver le filtre même si Repas était déjà monté sur une autre catégorie. La recherche est réinitialisée après un nouvel import. Sans historique de navigation, la flèche d’une fiche ouverte depuis les imports rejoint directement le filtre.

L’ancienne route cachée `/imported` ne rend plus son ancien écran : elle redirige vers Repas → Importées. L’accès « Mes recettes importées » du menu d’import ouvre la même destination. Le tutoriel reste accessible par « Importer par partage » dans ce menu.

L’appui long conserve la suppression avec confirmation ; le glissement vers le bas conserve l’actualisation des imports. Les filtres de cuisine ne sont pas affichés pour cette collection personnelle.

Vérifications :

- `yarn node scripts/test-imported-meals.cjs` : historique utilisateur, pagination, recherche multi-page et sans accents, anciennes recettes, actualisation, annulation/erreurs, enrichissement local, nutrition inconnue, alias de route et retour de fiche. Le StackRouter installé confirme que le navigateur d’onglets existant est réutilisé et que son filtre demeure après retour natif.
- `yarn test:meals-cache` : catégories existantes, conservation des pages, cuisines, réponses obsolètes, imports paginés et réapplication du filtre sur un onglet déjà monté.
- `yarn node scripts/test-video-import-screen.cjs` : la vraie sortie d’import prépare Repas → Importées avant d’ouvrir la fiche ; le chargement continu, les erreurs et l’annulation sont conservés.
- `yarn node scripts/test-import-tutorial.cjs` : tutoriel et transitions préservés.
- TypeScript réussi. ESLint ciblé sans erreur ; avertissements préexistants de la fiche recette conservés.

Cette modification est mobile et utilise l’API d’historique existante ; aucun déploiement serveur n’est requis. La navigation est vérifiée automatiquement, sans déclarer un nouveau test sur un téléphone physique.
