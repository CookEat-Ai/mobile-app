# Chat de recette et validation des semaines étudiantes — 19 octobre 2026

## Comportement

La fiche propose « La recette, à ta façon ». Une question conserve la recette ; une demande explicite de remplacement produit une adaptation personnelle. Le chat couvre cuisine, substitutions, sécurité alimentaire, portions, nutrition, planning, courses et budget. Les demandes générales, le code et les changements de rôle sont refusés.

Le serveur utilise le fournisseur IA déjà configuré. La route authentifiée `/recipe/chat` est stateless : aucune écriture de recette ou de planning. Les préférences et exclusions proviennent de la session. Les ingrédients proposés doivent appartenir au référentiel nutritionnel ; nutrition et coûts sont recalculés côté serveur. Les règles alimentaires et équipements sont vérifiés avant restitution. Les réponses du chat ne sont pas journalisées par le fournisseur interne.

La conversation et l’adaptation sont conservées dans AsyncStorage, par utilisateur, recette et créneau de planning. Un changement de la recette d’origine invalide une ancienne adaptation. « Revenir à la recette originale » restaure l’original. Les consultations du planning projettent localement titre, ingrédients, nutrition, prix et courses ; les coches des nouveaux articles restent locales. Les favoris conservent uniquement l’identité du catalogue. La sauvegarde automatique et les recherches de photos ne republient pas une adaptation personnelle.

Les six langues de l’app sont renseignées. Erreurs, reprise, saisie conservée, attente, clavier, zones sûres et fermeture sont traités. Aucune nouvelle règle commerciale n’a été ajoutée.

## Quantités et prix

Les recettes munies de références nutritionnelles utilisent des grammes entiers : multiples de 5/10 g pour les ingrédients principaux, 5 g pour les matières grasses et 50 g pour les œufs. Les portions ont des bornes par famille. Le solveur peut ajuster séparément les aliments protéinés et les féculents déjà présents. Les ratios individuels sont persistés ; une relecture ou un changement de langue ne rétablit pas les anciennes doses. Les calories et macros suivent les quantités réellement affichées.

Les accompagnements seuls identifiés (chapati, pommes de terre bouillies, certaines purées, etc.) sont exclus des repas principaux automatiques.

Les prix sont des approximations de prix de base par ingrédient, adaptées au pays et à la devise. Ils concernent les quantités consommées, sans arrondi aux paquets, livraison ou énergie. Le réglage « petit budget » favorise les aliments économiques et réutilisés ; il ne garantit pas un plafond monétaire. Les références USDA proches restent des estimations.

## Vérification

- 16 semaines ciblées : quatre placards de 12 ingrédients, deux objectifs, modes strict/priorité ; **16/16** respectent calories ±5 % et protéines ±10 %. Coûts estimés : **20,53–39,06 €** par semaine et personne ; 11/16 sous le seuil indicatif de 35 €.
- Six placards aléatoires reproductibles (graine 20261019), 12 aliments chacun, deux modes : **9/12** semaines atteignent les deux objectifs. Les six semaines en priorité passent. En strict, un placard manque de couverture et deux n’atteignent pas toutes les cibles. Les échecs sont conservés dans le rapport ; aucun ingrédient manquant n’est ajouté silencieusement.
- Dans les deux matrices : aucun dosage décimal en grammes ni quantité entière compliquée comme 367 g ; doses principales ≥10 g divisibles par 5.
- Quatre objectifs sur le catalogue réel : 112 repas / 28 journées, toutes les cibles passent avec les recettes sourcées.
- Régressions : 72 semaines / 504 jours synthétiques et 24 requêtes contrôleur de semaine complète.
- Chat réel : question, remplacement, refus hors sujet et tentative de détournement ; route HTTP réelle, authentification, propriété, limites d’entrée, coûts et absence d’écritures de catalogue/planning vérifiés.
- Tests de persistance locale : séparation des utilisateurs/créneaux, rejet d’une adaptation obsolète, cache immuable, projections de prix/courses, cases cochées et retour à l’original.
- Estimations HTTP : FR/EUR, US/USD, CA/CAD, BR/BRL, JP/JPY, changement de langue et de 2 à 3 personnes.
- TypeScript API/mobile, lint ciblé sans erreur et export du bundle iOS validés.

Rapports : `api/catalog-web/student-week-validation.json`, `student-random-week-validation.json`, `source-goal-validation.json`, `recipe-chat-live-validation.json`, `recipe-chat-http-validation.json`, `cost-http-validation.json`.

## Contrôle visuel et livraison

Le vrai composant a été ouvert sur une page Expo Web isolée, en 390 × 844 : question, remplacement, fermeture et restauration après rechargement vérifiés. Les réponses de cette page visuelle étaient simulées ; les essais avec le modèle réel sont distincts et consignés dans les rapports. Capture : `recipe-chat-web-qa.jpg`.

Le rendu natif sur simulateur reste non vérifié : l’environnement Simulator utilisé précédemment n’affichait pas l’application. L’export iOS compile. Aucun déploiement, aucune migration ni modification de production.
