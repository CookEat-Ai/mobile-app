# iPad portrait et budget compact — 20 octobre 2026

La carte budget précède les calories dans le planning partagé, son ancien écran et l’aperçu de l’onboarding. Son résumé conserve le montant estimé, le budget cible, la barre et la marge disponible. La fourchette et les explications se déplient via le bouton d’information.

Les colonnes principales passent de 560 à 1120 points maximum, avec 24 points de gouttière sur tablette. La base des tailles proportionnelles reste à 560 : les illustrations et polices ne grossissent pas avec la largeur de la page. Les formulaires et paywalls peuvent rester limités à 840 points. La bibliothèque utilise deux colonnes dès 744 points, trois dès 1024 ; une fenêtre étroite retrouve une liste. Les cartes chronologiques du planning, le sélecteur de jours et l’anneau du suivi grandissent sur tablette.

## Contrôle natif effectué

Simulateur iPad Pro 11 pouces M5, iOS 27, portrait 834 × 1210 points (captures 1668 × 2420). Contrôle du même planning sur iPhone 17 Pro, portrait 402 × 874 points.

Les aperçus chargent les vrais écrans/composants de production dans un binaire QA isolé, avec les polices et composants natifs. Les réponses API, abonnements et analytics sont remplacés par des fixtures locales. La photo de pizza est un asset de démonstration commun aux recettes fictives : ces captures valident la présentation, pas la reconnaissance ni les valeurs nutritionnelles de cette photo.

| Capture | Contrôle visuel |
| --- | --- |
| [Planning](planning.png) | Budget avant les calories, barre conservée, marges réduites, jours répartis et repas agrandis. |
| [iPhone](phone-planning.png) | Résumé du budget compact, titres et montant lisibles, barre contenue. |
| [Repas](meals.png) | Deux colonnes, photos larges, titres longs, recherche et filtres. |
| [Suivi](tracking.png) | Streak sur toute la largeur, anneau agrandi, macros et journal lisibles. |
| [Objectif](goal.png) | Graphique et repères nutritionnels utilisent la largeur disponible. |
| [Profil](profile.png) | Cartes larges, textes et chevrons visibles, aucun séparateur après Feedback. |
| [Jours de cuisine](cooking-days.png) | Sélection de jours et CTA adaptés au portrait. |
| [Semaine de l’onboarding](onboarding-week.png) | Vrai écran avec semaine complète QA, budget avant les calories et CTA accessible. |
| [Avantages](benefits.png) | Présentation large, bénéfice photo visible, CTA et mention d’abonnement lisibles. |
| [Démo photo](onboarding-photo.png) | Carte et CTA occupent l’espace utile, icônes contrastées. |
| [Bilan photo](photo-review.png) | Calories, macros, récapitulatif et actions IA/édition lisibles sur toute la largeur. |

Ces contrôles visuels isolés ne constituent pas une validation de toute la navigation, du clavier, d’une vraie prise de photo, d’un achat ou d’un appel IA sur iPad. Aucun test sur iPad physique. Les formats iPad mini/13 pouces et Split View sont couverts par les tests de calcul de disposition ; leur rendu natif n’a pas été capturé.

## Vérifications automatisées

- `yarn test:responsive-layout` : téléphones 320/390/430 points, iPad mini/11/13 portrait, Split View ; largeur utile, grille, typographie stable, bornes de la barre et ordre budget/calories.
- Cache/pagination des repas, affichage des semaines, cycle des animations, onboarding, stockage et calculs du suivi, invariants du système visuel.
- TypeScript sans erreur ; ESLint sans erreur (un avertissement préexistant d’import par défaut dans `formQuestion.tsx`).

Les serveurs QA 8085/8086 et les deux simulateurs démarrés pour le contrôle ont été arrêtés ; le serveur habituel 8081 a été conservé. Les entrées et stubs QA temporaires ont été supprimés.

Les PNG conservent exactement leurs blocs de pixels compressés et leurs dimensions ; les chunks de métadonnées ont été retirés. macOS conserve l’attribut système `com.apple.provenance` malgré `xattr -c` ; aucune suppression totale des attributs système n’est revendiquée.
