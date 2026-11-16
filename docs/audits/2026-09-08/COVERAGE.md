# Badge et couverture des plannings — 8 septembre 2026

Corrections locales, sans déploiement ni changement des offres Store. Aucun compte utilisateur requis.

## Changements

- Pourcentage du deuxième paywall centré visuellement avec compensation des métriques Degular, largeur explicite et suppression du redimensionnement automatique qui réduisait le texte à quelques pixels sur iOS 18. Le texte de comparaison sous le badge conserve le redimensionnement d’accessibilité.
- Sélection : privilégier les recettes distinctes, puis répartir les répétitions entre les jours lorsque le catalogue compatible est petit. Les contraintes de cuisine, durée, régime, allergènes, ingrédients et équipement restent appliquées. Le remplacement continue à exclure la recette courante.
- Suppression de la limite globale de 1 500 candidats qui pouvait masquer des catégories à mesure que le catalogue grandit. Éligibilité calculée une fois par type de repas.
- Ajout d’alias français pour les exclusions et vérification des noms des ingrédients en plus de leurs identifiants.
- 12 recettes ajoutées à la base locale : 10 plats et 2 petits-déjeuners ; catalogue total de 1 412 recettes. Composition calculée depuis les références alimentaires locales, portions et ingrédients déjà cuits indiqués, images originales contrôlées visuellement et aucun doublon détecté.
- Scripts d’audit et publication adaptés pour autoriser les ajouts tout en conservant les minima de qualité et de couverture.

## Preuves

- `api/scripts/audit-planning-filters.ts` : **3 132 plannings de 28 repas, zéro échec**. Croisement des 12 cuisines, 3 régimes, 3 durées ; allergènes seuls puis ensemble ; 13 exclusions d’ingrédients supplémentaires, chacune avec l’ensemble des allergènes. Résultat : [filter-matrix.json](coverage/filter-matrix.json).
- Tests HTTP locaux : 15 aperçus anonymes, dont 3 semaines express avec exclusions multiples ; 60 ouvertures de fiches ; 1 412 images répondent HTTP 200. Génération mesurée entre 30 et 166 ms. [Résultats](coverage/http-smoke.log).
- 14 suites API réussies, tests additionnels sur les répétitions et les exclusions ; 21 assertions d’intégration sur l’accès anonyme, les limites gratuites et les listes de courses.
- TypeScript API/mobile et lint sans erreur. Des avertissements préexistants de lint restent présents.
- Simulateur iPhone 17 : génération réelle de 21 repas, régime végétal, express, allergènes multiples exclus ; ouverture de la nouvelle recette Cannellini. [Planning](coverage/plan-restrictive.png), [recette](coverage/recipe-opened.png).
- Badge contrôlé sur [iPhone 17 avec offres Store](coverage/paywall-iphone17.png) et [iPhone 12 mini avec données visuelles de test](coverage/paywall-iphone12mini-visual-fixture.png). Le Store ne renvoyait aucun produit sur le petit simulateur ; cette seconde capture ne valide pas l’achat. L’écran temporaire de test a été supprimé.

Les données fictives du simulateur principal ont été sauvegardées puis restaurées après les essais. Les 12 nouvelles recettes sont conservées. Scripts reproductibles : `api/scripts/seed-coverage-recipes.ts` (local uniquement, ajout sans écrasement), `api/scripts/coverage-image-prompts.json` (prompts et chemins des images créées avec l’outil intégré imagegen). Images : `api/public/uploads/catalog-owned/coverage-*.png`.

## Limites

La matrice établit la couverture des combinaisons décrites, pas celle de toutes les listes libres imaginables. Une liste qui exclut tous les aliments compatibles reste impossible à satisfaire : le serveur refuse ce cas plutôt que réintroduire un ingrédient exclu. Les répétitions remplissent les créneaux mais ne garantissent pas une correspondance exacte aux objectifs nutritionnels ; les portions restent celles des recettes. Achats réels, Android natif et production non validés dans cette correction.
