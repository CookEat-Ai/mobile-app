# Mini parcours visuel — 13 octobre 2026

Demande appliquée : sous-titres retirés à toutes les étapes, titres et réponses avec emojis, quatre objectifs sans présélection sous « C’est quoi ton objectif ? » en présentation seulement. Les jours sont centrés sur deux rangées, les week-ends grisés mais sélectionnables. L’entrée ingrédients montre directement Scanner mon frigo / Mon Garde-Manger, les deux modes d’ingrédients et Passer. Les photos du catalogue, la marque/mascotte et la progression restent conservées. Les exclusions disposent de choix illustrés et d’un champ libre ; les personnes sont représentées par des emojis.

Le choix d’objectif est limité à cette génération. Il atteint `preferences.goal` et `preferences.nutritionProfile.goal`, sans écrire le profil corporel stocké. Le modèle nutritionnel existant est réutilisé ; une cible de poids contradictoire n’est pas conservée et aucun poids cible ni délai n’est inventé. Le parcours normal reste à sept étapes ; la présentation en compte huit. Le scan reprend au temps de cuisine après confirmation, avec la progression de l’étape ingrédients (2/7 ou 3/8).

## Vérifications

- TypeScript : réussi après la dernière correction. ESLint ciblé : aucune erreur ; quatre avertissements déjà présents dans la caméra et le scan. Diff ciblé sans erreur d’espacement.
- Tests configuration, chargement et mode présentation : réussis. Régressions couvertes : sept/huit étapes, objectif transmis à la génération, maintien du profil d’origine, retrait d’une cible opposée, parcours après scan, ingrédients ignorés quand on passe et six locales.
- App native Debug CookEat, simulateur QA iPhone Duo, iOS 27.1 / Xcode 27.1 RC, français et taille de texte par défaut. Objectif sans sélection et CTA désactivée observés sur les écrans extérieur et intérieur, y compris lors d’une nouvelle session. Choix de Perdre du poids, progression 1/8 à 8/8, absence de sous-titres, emojis, grille centrée et week-end distinct observés.
- Garde-manger : sélection d’ingrédients, retour au parcours et Passer testés. Ajout/retrait d’une exclusion via les choix rapides testé. Création directe depuis les personnes puis vrai planning de huit repas observée. [Preuve Mongo en lecture seule](generated-plan-check.json) : objectif `lose_weight` dans les deux champs, ingrédients du garde-manger vides après Passer, cuisines africaine/américaine, halal, exclusion porc, trois personnes. Le planning QA a ensuite été supprimé via le contrôle prévu pour recommencer.
- Un bouton de fermeture du garde-manger était masqué par la zone système extérieure : les insets latéraux du header et du contenu de la feuille ont été corrigés. Fermeture visible à x=326/y=84, puis retour à l’étape 3/8 vérifiés après rechargement.
- CTA principale extérieure x=20/y=588, largeur=426, hauteur=56 conservée entre les étapes. À l’intérieur : x=215,7/y=579, largeur=520, hauteur=56. XCTest interactif terminé avec **TEST EXECUTE SUCCEEDED** ; [assertions natives](native-evidence.json).

## Captures inspectées

[Objectif](01-goal.png), [jours](02-days.png), [ingrédients](03-ingredients.png), [durée](04-duration.png), [cuisines](05-cuisines.png), [alimentation](06-diet.png), [exclusions](07-exclusions.png), [personnes](08-servings.png), [objectif sur écran intérieur](09-goal-open.png), [fermeture du garde-manger corrigée](10-pantry-safe.png).

## Limites

Le parcours normal à sept étapes est couvert par les tests mais n’a pas été reparcouru nativement dans cette itération. Le scan réel avec une nouvelle photo, Android, les grandes polices, le lecteur d’écran et les autres langues n’ont pas été testés visuellement. Les overlays Debug RevenueCat préexistants ont été fermés avant les captures. Aucun déploiement ni mutation d’API de production.

Les dix captures ont été nettoyées en conservant les pixels, dimensions et seules structures PNG de décodage. macOS conserve l’attribut protégé `com.apple.provenance` malgré les tentatives de suppression. [Vérification](capture-verification.json).
