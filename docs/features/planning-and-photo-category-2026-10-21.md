# Catégorie du repas photographié et actions du planning

Modifications locales du 21 octobre 2026, limitées aux trois corrections demandées.

- La catégorie utilise l'heure locale de capture et les repas déjà enregistrés dans le journal sélectionné. Une nouvelle photo après un repas principal récent est proposée en collation. Un déjeuner tardif peut être proposé avant 17 h quand un petit-déjeuner existe sans déjeuner. Les entrées futures, les dates sans rapport, les horodatages invalides et le même scan sont ignorés. Le dîner précédent est pris en compte au passage de minuit pendant six heures maximum. Les entrées existantes ne sont pas reclassées.
- Le récapitulatif affiche un bouton portant la catégorie actuelle. Un appui ouvre les quatre choix directement dans la page ; choisir ferme les options et utilise l'enregistrement automatique existant.
- La carte des courses utilise un contrôle tactile stable, sans l'animation d'entrée qui repartait lors du focus de l'onglet.
- Les actions de la semaine sont regroupées dans une carte. Elles réutilisent les lignes de paramètres et leurs badges, séparateurs, polices et états désactivés. La suppression reste destructive, confirmée et limitée au mode présentation selon la règle existante. Les callbacks de modification et de régénération sont conservés dans le planning courant et son détail.

## Validation

TypeScript et suites `test:photo-reveal`, `test:meal-tracking`, `test:planning-configuration`, `test:planning-organization`, `test-planning-meal-actions.cjs` et `test:visual-system` passent. La nouvelle logique de catégorie est aussi exercée avec les fuseaux Pacific/Honolulu et Asia/Tokyo. Les tests de récapitulatif vérifient l'ouverture des choix, la sélection, la fermeture et le libellé corrigé ; les tests de capture existants vérifient sa persistance dans la même entrée.

Aperçus des composants réels en web : 390 × 844 et 320 × 568, français, polices de l'application. Captures dans `docs/design/qa/planning-polish-2026-10-21/`. Les points d'entrée et le serveur temporaires de contrôle ont été retirés. Le Metro préexistant reste intact.

Validation native non effectuée : aucun appareil Android connecté ; CoreSimulator indisponible dans cette session. Le démarrage web complet de l'application est bloqué par l'intégration préexistante ExpoTrackingTransparency ; les composants ont été observés dans une entrée temporaire isolée. Le retour réel d'onglet reste à observer sur un appareil, bien que sa cause d'animation soit supprimée.
