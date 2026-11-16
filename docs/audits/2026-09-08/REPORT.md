# Audit CookEat — 8 septembre 2026

**Verdict : version non validée en l’état.** Les vérifications de compilation et les tests existants passent, mais des tests d’intégration supplémentaires et le simulateur révèlent des défauts fonctionnels et de contrôle d’accès.

Audit des modifications locales de `mobileapp` (base `3bcbd1f`) et `api` (base `118f6ee`), y compris les nouveaux fichiers non suivis. Aucun correctif applicatif, commit, déploiement ou changement de production n’a été effectué. Le catalogue et les scripts de la tâche « Recettes DB » n’ont pas été modifiés. Les résultats de couverture du catalogue sont provisoires pendant son remplissage.

## Défauts prioritaires

### P1 — L’API fait confiance à l’identité et à l’abonnement déclarés par le client

Dans [meal-plan-controller.ts](/Users/hadjadji/work/perso/cookeat/api/src/controllers/meal-plan-controller.ts:45), `requirePremium` accepte simplement `isSubscribed: true`. Les routes ne vérifient pas une identité authentifiée ; `findOwnedPlan` compare des identifiants fournis dans la requête. Le client envoie lui-même `true` pour les modifications et la liste de courses dans [api.ts](/Users/hadjadji/work/perso/cookeat/mobileapp/services/api.ts:709).

Reproduction locale : un identifiant de test nouvellement inventé, sans compte ni abonnement, obtient une création HTTP 201 en déclarant `true`. Une lecture du plan sans authentification renvoie HTTP 200 avec les seuls identifiants du plan et de son propriétaire. Le refus HTTP 403 lorsque le client déclare `false` ne constitue donc pas une protection. Dans le simulateur sans abonnement, la liste de courses est également accessible par lien interne et modifiable.

Correction attendue : lier les opérations à une identité vérifiée côté serveur et vérifier les droits côté serveur. Prévoir explicitement l’exception de prévisualisation de l’onboarding, sans ouvrir toutes les opérations premium.

### P1 — L’onboarding reste bloqué après une couverture insuffisante du catalogue

[weeklyPlanPreview.tsx](/Users/hadjadji/work/perso/cookeat/mobileapp/app/onboarding/weeklyPlanPreview.tsx:161) remplace tout l’écran de configuration par un bouton « Try again » qui relance les mêmes paramètres.

Reproduction sur iPhone 17 : profil vegan, exclusion arachide, cuisine italienne, sept jours sélectionnés. Quatre petits déjeuners compatibles sont disponibles lors du test ; la génération échoue et réessayer ne résout rien. Aucun retour vers les jours ou les filtres n’est proposé. Une reprise de la configuration par un lien de développement puis une sélection de trois jours permet de générer neuf repas. [Capture de l’impasse](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/coverage-error-no-back.png).

L’enrichissement de la BDD peut réduire la fréquence de ce cas, mais ne corrige pas l’impasse. Proposer un retour à la configuration et un motif actionnable ; ne pas assouplir automatiquement les allergies.

### P2 — Quantités incorrectes dans les courses après ajout d’une recette importée

[setMealRecipe](/Users/hadjadji/work/perso/cookeat/api/src/controllers/meal-plan-controller.ts:413) perd la base de portions de la recette source, puis [generateShoppingList](/Users/hadjadji/work/perso/cookeat/api/src/controllers/meal-plan-controller.ts:608) considère chaque recette comme prévue pour une portion.

Reproduction API : recette importée pour deux portions contenant 200 g de riz, insérée dans un repas d’une portion. La liste demande 200 g au lieu de 100 g. Conserver les portions sources ou normaliser les ingrédients lors de l’insertion, en évitant un second ajustement ultérieur.

### P2 — « Remplacer » peut redonner exactement la même recette

Dans [replaceMeal](/Users/hadjadji/work/perso/cookeat/api/src/controllers/meal-plan-controller.ts:352), le repas courant est retiré de la liste des recettes récentes et n’est pas explicitement interdit au sélecteur. Le test a obtenu le même identifiant avant et après remplacement. Le phénomène dépend de la sélection ; un autre essai avait donné une recette différente.

Exclure strictement l’identité de la recette remplacée et retourner un état explicite si aucune alternative compatible n’existe.

### P2 — Une date impossible est enregistrée comme `NaN-NaN-NaN`

[normalizeWeekStart](/Users/hadjadji/work/perso/cookeat/api/src/controllers/meal-plan-controller.ts:76) vérifie uniquement le format textuel. Une création avec `weekStart: "2026-13-40"` renvoie HTTP 201 et persiste une semaine `NaN-NaN-NaN`. Les affichages et tris de l’historique ne peuvent pas exploiter correctement cette date.

Valider la date calendaire avant toute écriture et répondre HTTP 400 pour une valeur invalide.

## Autres défauts établis par lecture du code ou contrôle visuel

- **P2, préférences :** [loading.tsx](/Users/hadjadji/work/perso/cookeat/mobileapp/app/planning/loading.tsx:60) remplace un choix explicite `diet: 'none'` par le régime enregistré dans le profil. Une liste de cuisines explicitement vide réactive également celles du profil. Distinguer une valeur absente d’une remise à zéro volontaire. Constat de code, pas un parcours abonné complet sur simulateur.
- **P2, compatibilité avec l’ancien écran :** [isUsableWeeklyPlan](/Users/hadjadji/work/perso/cookeat/mobileapp/services/weeklyPlanning.ts:74) refuse tout repas `source: 'library'`. Le test du prédicat accepte un plan catalogue, puis refuse le même plan après insertion d’une recette importée valide. Cela affecte le chargement dans [l’ancien écran planning](/Users/hadjadji/work/perso/cookeat/mobileapp/app/(tabs)/planning.tsx:114), aujourd’hui masqué des onglets. Une disparition dans le nouvel écran principal n’a pas été observée.
- **P2, objectif de poids :** [saveWeight](/Users/hadjadji/work/perso/cookeat/mobileapp/app/(tabs)/goal.tsx:62) conserve une différence absolue avec la cible, tout en conservant la direction du régime. Exemple déduit du code : objectif de perte 80 → 75 kg, saisie à 74 kg ; la différence devient 1 kg et la projection suivante vise 73 kg. Conserver la cible absolue et traiter l’objectif atteint. Ce cas n’a pas été exécuté dans l’UI.
- **P3, graphique :** en maintien 80 → 80 kg, les points de début et de fin sont en haut alors que la ligne est en bas. Le calcul des points dans [trajectory.tsx](/Users/hadjadji/work/perso/cookeat/mobileapp/app/onboarding/trajectory.tsx:69) diffère de celui du tracé. [Capture](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/trajectory-maintenance.png).
- **P3, hors ligne :** après interruption de l’API locale, l’écran des courses expose une erreur native brute et ne propose pas de réessai visible. La liste revient après réouverture de l’écran une fois l’API disponible. [Capture hors ligne](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/shopping-offline.png).

## Vérifications exécutées

| Vérification | Résultat |
| --- | --- |
| Mobile : `yarn tsc --noEmit` | Réussi |
| Mobile : `yarn lint --quiet` | Réussi |
| Mobile : `git diff --check` | Un espace final dans `components/FavoriteRecipeCard.tsx:165` |
| API : `yarn test` | 13 suites réussies, dont planification, catalogue, nutrition et courses |
| API : `yarn tsc --noEmit` | Réussi |
| API : `yarn lint` | Aucune erreur, 274 avertissements |
| API : `git diff --check` | Réussi |
| Export Expo limité à iOS et Android | Réussi pour les deux bundles JavaScript |
| Export Expo toutes plateformes | Échec web/SSR : variable API absente et accès à `window` ; les bundles natifs passent séparément |
| Tests API supplémentaires sur Mongo local | 12 assertions réussies, 4 échouées, détaillées ci-dessus |
| Parité des clés de traduction avec EN | Aucune clé manquante DE/ES-ES/ES-MX/PT-BR ; neuf clés FR préexistantes absentes |

Les assertions API réussies couvrent la création de cinq dîners sélectionnés, le régime et l’exclusion testés, l’absence de doublons dans cette semaine, la restauration de la même semaine, l’historique, le détail et l’image d’une recette, les courses, la coche et sa conservation après régénération, ainsi que l’insertion d’une recette importée. La création de cinq dîners a pris environ 40 ms sur l’environnement local : ce chiffre n’est pas une mesure de production.

## Parcours sur simulateur

Test principal sur **iPhone 17 / iOS 26.5**, avec Metro et API locale ; contrôle complémentaire de deux écrans sur **iPhone 12 mini / iOS 18.5** avec le même binaire de développement.

- Démarrage, refus ATT, choix de l’objectif, questionnaires. Âge 17 rejeté ; progression avec âge 30, taille 180 cm, poids 80 kg, activité modérée, trois entraînements, cuisine 30–60 minutes, vegan, exclusion arachide et cuisine italienne.
- Calcul des objectifs, trajectoire et engagement. Une interruption du simulateur a nécessité une reprise par lien de développement ; ce n’est donc pas un onboarding neuf exécuté d’une seule traite.
- Sélection des jours, échec de couverture sur sept jours, génération réussie de neuf repas sur trois jours, changement de jour et actualisation des totaux.
- Ouverture d’une recette, image et métadonnées, présence des ingrédients et étapes dans l’arbre d’accessibilité, ajout aux favoris confirmé. Les étapes n’ont pas toutes fait l’objet d’une lecture visuelle ligne par ligne.
- Catalogue : chargement et filtrage des petits déjeuners italiens ; quatre résultats obtenus.
- Passage sans code promotionnel, écran d’essai, rappel, refus des notifications, paywall. Offre annuelle 29,99 $ avec sept jours d’essai et mensuelle 8,99 $ sans essai ; le bouton change correctement lors de la sélection mensuelle. [Capture mensuelle](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/paywall-monthly.png).
- Lien de confidentialité ouvert puis retour au même paywall. Fermeture du paywall : retour à l’offre, onboarding toujours incomplet.
- Restauration : message « aucun achat à restaurer », puis erreur App Store dans les logs. **Restauration non entièrement validée.** Aucun achat effectué.
- Courses : chargement de 24 lignes, coche visible d’un ingrédient et compteur à 1/24. Clic sur « Copy » effectué, contenu réel du presse-papiers non inspecté. [Capture chargée](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/shopping-loaded.png).

Des erreurs de chargement de polices RevenueCat et des erreurs App Store apparaissent dans l’environnement de développement. Elles limitent la validation du paywall, sans constituer à elles seules une preuve du comportement en production.

## Limites et preuves reproductibles

Cette session ne certifie pas tous les parcours « de A à Z ». Les achats et restaurations réels, le renouvellement, les rappels à échéance, les codes promotionnels valides, l’import vidéo complet et les parcours abonnés complets restent à vérifier. Android a été vérifié par export, **pas par exécution sur émulateur** ; aucun binaire Android de test n’était installé. Le petit écran n’a reçu qu’un contrôle partiel. Pas de validation de production, de charge, d’accessibilité complète, ni de toutes les langues.

La qualité et l’exhaustivité des nouvelles recettes restent à contrôler une fois la tâche BDD terminée. Des titres français apparaissent actuellement dans l’interface anglaise ; ce constat ne préjuge pas des données finales.

- [Résultats des assertions API](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/api-results.json)
- [Script API local](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/api-audit.cjs) : nécessite l’API sur `localhost:8083` et les dépendances locales. Crée un identifiant de test et une recette importée temporaire ; nettoie ses plans et sa recette dans `finally`. Ne pas l’utiliser contre une base distante.
- [Script des prédicats et traductions](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/static-audit.cjs).

Les tests API temporaires ont été nettoyés. Le profil fictif et le planning créés par l’interface restent dans le simulateur et la base locale pour faciliter la reproduction. La tâche catalogue a continué indépendamment pendant l’audit.
