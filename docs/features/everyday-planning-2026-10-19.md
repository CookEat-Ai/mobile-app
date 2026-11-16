# Des recettes du quotidien adaptées à la cuisine de chacun

L'onboarding principal et le parcours de configuration du planning demandent le niveau de cuisine et les appareils disponibles. Le mini parcours de démonstration redemande ces choix à chaque nouvelle configuration. Le budget est enregistré dans les deux parcours pour que le premier planning et les suivants utilisent le même contrat.

L'objectif reste une semaine concrète de repas adaptés à l'utilisateur. Le parcours de configuration suit : objectif en mode présentation → jours → ingrédients et choix des achats → temps → niveau → matériel → budget → cuisines → régime → exclusions → personnes → génération réelle. L'onboarding principal place le niveau et le budget dans les habitudes de cuisine, près du temps et du matériel. Les CTA, le retour arrière et le retour en haut à chaque question réutilisent les composants existants. Le parcours de paiement reste celui existant.

## Contrat des réponses

| Réponse | Valeurs | Effet |
|---|---|---|
| Niveau | beginner / medium / advanced | Facile uniquement / facile ou moyen / tous les niveaux. |
| Matériel | standard-kitchen + appareils sélectionnés | Une plaque, une poêle, une casserole et les ustensiles courants sont supposés disponibles. Un four, un mixeur, un micro-ondes, un Airfryer ou un robot ne l'est que s'il est sélectionné. |
| Budget | budget_small / budget_medium / budget_large | Réutilisation plus forte des ingrédients et préférence pour les ingrédients courants avec le petit budget. Aucun prix de courses garanti. |

Les valeurs passent d'AsyncStorage au profil et aux réglages du planning, puis à la requête et aux préférences sauvegardées côté serveur. Une réponse « juste les ustensiles de base » reste distincte d'un ancien profil qui n'avait pas répondu. Les nouvelles questions sont traduites dans les six langues de l'app. Les générations individuelles reçoivent aussi le niveau et le budget du profil.

Le moteur favorise les recettes faciles, courtes et comportant peu d'ingrédients courants. Le budget influe sur le nombre de nouveaux ingrédients et leur réutilisation. Il ne s'agit pas d'un calcul en euros : le catalogue n'a pas de prix de supermarché. La répétition est admise sur des jours différents, avec une préférence pour au plus trois utilisations d'une même famille à petit budget et deux sinon. Cette limite reste souple quand le stock compatible est trop petit. L'équilibrage calorique et protéique conserve une préférence pour les recettes pratiques.

Les allergies, exclusions, le régime, le temps, les cuisines, le matériel et le niveau restent des contraintes d'éligibilité. Le mode sans courses ne rajoute pas d'aliments en silence. Les appareils utilisés dans les instructions sont vérifiés en plus des métadonnées déclarées. Un changement de préférences ne restaure pas un ancien planning payé avec d'autres réglages. La démonstration déjà accordée conserve sa règle de restauration existante.

## Cas des photos utilisateur

Ingrédients relevés : poulet, œufs, riz, tomate, pâtes, oignon, carotte, ail, champignon, pomme de terre, blanc de poulet. L'audit local a trouvé 1 625 recettes publiées et aucune recette strictement compatible avec cette liste. La nouvelle liste contient 32 recettes, dont 11 compatibles avec ces ingrédients. Elle couvre les plats, petits-déjeuners et collations ; le catalogue existant partage déjà les catégories petit-déjeuner et collation.

L'alias entre « Poulet » et « Blanc de poulet », ainsi que la ligature majuscule de « Œufs », sont pris en charge sans fusionner des substituts ou des allergènes différents.

Les recettes originales figurent dans `api/catalog-everyday/recipes.json`. Les quantités sont pesées pour une personne ; les macros sont calculées avec les références de composition USDA déjà présentes localement. Les photos sont produites pour le catalogue de l'app, sans compte, avatar ou couverture TikTok. Les images finales conservent leurs pixels et uniquement les structures PNG nécessaires au décodage. La vérification signale séparément les éventuels attributs de provenance protégés ajoutés par macOS ; l'archive de livraison n'en inclut aucun.

## Inspiration culinaire

Consultation le 19 octobre 2026 :

- [Good Food : pâtes au poulet en 15 minutes](https://www.bbcgoodfoodme.com/recipes/15-minute-chicken-pasta/) pour le principe d'un plat courant, court et accessible.
- [Manger Bouger : la Fabrique à menus](https://www.mangerbouger.fr/manger-mieux/la-fabrique-a-menus/recettes?lang=fr) pour la recherche de repas du quotidien.

Les méthodes et quantités de cette nouvelle liste sont rédigées pour CookEat. Ces liens servent d'inspiration ; les textes et images externes n'ont pas été copiés. Les valeurs nutritionnelles ne sont pas reprises de ces pages.

## Validation et publication

Les scripts de préparation, traduction, nettoyage et publication sont dans `api/scripts/*everyday*`. La publication se limite à la base de développement locale, vérifie les six langues, les contrôles numériques, la photographie et sa somme de contrôle, les doublons éditoriaux et le schéma de publication. Aucun de ces scripts ne publie sur le VPS de production.

Les tests couvrent le chemin profil → préférences → sauvegarde/rechargement, la remise à zéro de la démo, le niveau, le matériel absent y compris dans les instructions, le remplacement explicite, la semaine des captures et la réutilisation des ingrédients selon le budget. Le test comparatif de courses produit 7 ingrédients distincts avec le petit budget et 15 avec le budget libre sur son jeu d'essai fixe.

Mesure : les événements existants `fitness_onboarding_answered` et `fitness_onboarding_step_completed` couvrent les nouvelles questions principales ; `planning_preference_selected` couvre les choix niveau et budget de la configuration. L'effet à suivre après livraison est la réussite de génération, l'abandon par étape, le nombre d'ingrédients de la liste de courses, les répétitions et les remplacements volontaires de repas. Aucune amélioration de conversion n'est présumée.

La vérification visuelle native reste distincte des tests de logique : le simulateur doit charger le bundle de développement avant de pouvoir valider l'affichage et le parcours tactile. Les changements n'impliquent ni mise à jour EAS ni déploiement de l'API de production.

## Résultat local observé

32 nouvelles recettes publiées dans la base locale (1 657 au total), sans toucher au VPS. Le scénario des captures a réussi via les vraies routes de session et de génération : HTTP 201, 27 repas restants sur la fenêtre courante, en 2 268 ms. Les images ont toutes répondu HTTP 200 ; le mode sans courses, le niveau débutant, les ustensiles de base, la limite de 20 minutes et le budget calorique ont été vérifiés. Le compte et le planning temporaires du test ont été supprimés.

Les 32 PNG ont leurs pixels et dimensions vérifiés à l’identique après nettoyage. Le seul attribut local restant est `com.apple.provenance`, géré par macOS et recréé malgré la suppression ; aucune donnée de cet attribut ne figure dans l’archive. L’archive vérifiée contient 32 images et les données des recettes, sans AppleDouble ni champs ZIP supplémentaires.

Validation finale : TypeScript API et app mobile sans erreur ; tests des préférences, de configuration, de chargement, du premier planning, de restauration et de remplacement, du catalogue et de la nutrition validés. La matrice nutritionnelle a passé 72 semaines / 504 journées et les 24 requêtes de contrôleur. ESLint ciblé : aucune erreur, avertissements de typage dans les outils d’auteur et un avertissement d’import déjà présent dans l’onboarding. Le contrôle visuel natif n’a pas abouti : le simulateur installé ne charge pas le bundle JavaScript ; la tentative web est bloquée par le module natif ExpoTrackingTransparency. Aucune modification des intégrations n’a été faite pour contourner ces limites.


## Extension : 500 recettes du web et coût monétaire

Le nouveau lot est décrit dans `api/catalog-web/README.md`. Il contient 500 sources Wikilivres/Wikibooks, trois adaptations quantitatives et une portion source pour le placard strict, sans compter les variantes comme de nouvelles recettes. La sélection ordinaire est essayée en premier ; une journée qui nécessite une recherche plus large ne remplace pas les autres journées déjà compatibles. Les contraintes d’allergies, de régime, de niveau, d’équipement et de placard restent obligatoires.

Le pays et la devise régionaux sont enregistrés avec le planning. `MealCostEstimate` affiche le total de la semaine, le coût par personne et le total du plat pour le foyer ; les fourchettes et limites de précision sont explicites. Les recettes sans photo utilisent l’illustration d’ingrédients existante, avec un indicateur explicite ; une photo non approuvée reste interdite.

Les tests de coûts couvrent FR/EUR, US/USD, CA/CAD, BR/BRL, JP/JPY, les changements de langue et de nombre de personnes. Les paniers aléatoires diffèrent du screenshot et conservent les cas sans correspondance. La compilation iOS Debug a réussi ; le rendu natif du budget reste à vérifier après un écran noir du simulateur.
