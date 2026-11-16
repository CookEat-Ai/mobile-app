# Estimation complète des repas photographiés

Les aliments détectés contribuent tous au total, même quand la marque, la recette d’une sauce ou la composition exacte manque. La quantité reste une estimation pratique en grammes entiers. L’utilisateur peut enregistrer directement, puis corriger l’aliment ou le poids manuellement ou avec le chatbot.

Le serveur privilégie une référence exacte de l’aliment dans son état consommé (poids cuit pour un aliment cuit). En son absence, l’IA choisit un profil prêt à consommer : sauce crémeuse, tomate, vinaigrette, mayonnaise, yaourt, sauce sucrée, jus de cuisson, autre sauce, féculent, viande, poisson, légumes, dessert, boisson ou plat mélangé. Un mécanisme de secours par catégorie couvre aussi une référence absente ou invalide dans la réponse IA. Le nom observé, la confiance et les coordonnées de l’aliment sont préservés ; une estimation nutritionnelle ne crée aucune position dans la photo.

Les profils sont des compositions approximatives calculées à partir des références alimentaires déjà présentes dans l’API. Par exemple, le profil de sauce crémeuse combine 45 % de crème, 50 % de lait et 5 % de beurre **pour estimer les nutriments**, sans prétendre reconnaître ces ingrédients dans l’assiette. Les profils portent `COOKEAT_ESTIMATE` et `nutritionEstimated=true`. La fiche indique « Composition estimée · modifier si besoin ». Ils restent distincts des compositions vérifiées et ne sont pas éligibles à une publication comme recette à nutrition vérifiée.

L’enregistrement recalcule depuis la référence/profil côté serveur. Des valeurs `per100g` envoyées par le client ne remplacent pas ces données. Modifier le poids recalcule les macros ; choisir une référence précise remplace le profil approximatif. Le chatbot applique la même règle et préserve un total complet après correction.

Recalcul de la réponse photo préenregistrée : 260 g de pâtes cuites, 130 g de poulet, 100 g de champignons et 80 g de sauce crémeuse donnent **828,4 kcal, 60 g de protéines, 88,4 g de glucides et 25 g de lipides**, au lieu du bilan précédemment incomplet `653 + ?`. Il s’agit d’un recalcul de données existantes, pas d’un nouvel appel de vision.

Vérification : tests API photo et chatbot ; journal mobile avec sauvegarde d’une sauce estimée et correction de poids ; tests de révélation/capture ; TypeScript API et mobile ; ESLint ciblé ; exports Hermes iOS/Android. Le parcours visuel conserve le scanner sur la photo figée et l’agrandissement final ; les anciennes captures du bilan partiel décrivent la version précédente.
