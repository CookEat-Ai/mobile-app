# Caméra et analyse du planning — 13 octobre 2026

## Corrections locales

Le passage de la caméra du planning à `fullScreenModal` dans l’ajustement précédent du Duo a révélé une marge iOS fixe de 20 points dans l’en-tête. La route retrouve `presentation: modal`. Un SafeAreaProvider est monté à la racine de la caméra ; ses contrôles suivent les insets haut, gauche et droite réellement mesurés, sans dépendre de la taille ou du modèle de téléphone. Le bas suit aussi les insets latéraux.

L’analyse seule utilise une Modal native fullScreen, avec son propre provider et une photo flexible sur toute la hauteur utile. L’en-tête du mini parcours et son indicateur d’étapes ne sont plus présents pendant le chargement. L’indication Analyse en cours et un spinner restent visibles ; la fermeture annule le résultat comme auparavant. Les photos disparaissent du récapitulatif après la réponse, même vide. Réduction des animations : pas de transition ni balayage. Une erreur est présentée au-dessus de l’analyse avant son retrait, puis OK retrouve les captures pour réessayer.

## Vérification

TypeScript, tests pantry-scan, planning-configuration et onboarding-planning passent. Les tests couvrent les marges haut/latérales, l’analyse sans header ni ScrollView, plusieurs photos, les résultats vides, la reprise, les réponses tardives ignorées, la validation atomique et la récupération après erreur avec captures conservées. ESLint ciblé : zéro erreur et six avertissements préexistants. Diff ciblé sans erreur ; un espace final préexistant dans app/paywall.tsx reste hors périmètre.

Le contrôle visuel natif est non vérifié dans cette itération : le pilotage Device Hub échoue avec timeoutReached (deux essais sur /Applications/Xcode.app/Contents/Applications/DeviceHub.app). L’autre instance signalée par l’inventaire référence une application temporaire inexistante. CoreSimulator répond hors sandbox, mais la capture de l’écran par défaut du Duo est noire et ne valide aucun état. Aucun scan API réel, aucun déploiement.

## Proposition de simplification — validée ensuite

La proposition ci-dessous a ensuite été validée et implémentée. Voir le [rapport du parcours approuvé](../2026-10-13-pantry-approved-workflow/qa.md).

Promesse : identifier rapidement les aliments à utiliser pour la prochaine semaine. Le résultat utile de cette branche est la liste corrigée, conservée dans le brouillon du planning. Le scan et la sélection manuelle doivent rejoindre le même récapitulatif.

1. Conserver les entrées Scanner mon frigo et Mon garde-manger, avec Passer.
2. Après l’analyse, afficher Voici ce qu’on a trouvé, un compteur, et une liste compacte d’ingrédients avec suppression directe. Les catégories deviennent un outil secondaire plutôt qu’une étape obligatoire. Reprendre une photo reste secondaire.
3. Ajouter ouvre une seule sheet avec un champ de recherche visible immédiatement, suggestions filtrées dans le catalogue et ajout libre si aucun résultat ne convient. Plusieurs ajouts possibles sans refermer la sheet après chaque ingrédient. Un bouton Terminé retrouve le même récapitulatif et sa position.
4. Une seule CTA Utiliser ces ingrédients valide la liste. Pas de question de courses dans son footer. En cas de résultat vide : Ajouter un ingrédient, Reprendre une photo ou Continuer sans ingrédients.
5. Ensuite, poser On peut compléter avec quelques courses ? avec les deux choix existants : Oui, je peux faire des courses / Non, seulement ce que j’ai. Conserver leur sens priority/strict, sans présélection, puis avancer. Le retour préserve liste et corrections. Définir la progression de ce sous-écran avant implémentation.

Hypothèse : séparer correction et règle d’utilisation diminue l’hésitation au récapitulatif ; la recherche réduit les ouvertures successives de catégories. Comparer le taux de passage ingrédients → temps de cuisine, le temps passé au récapitulatif et le taux d’abandon dans l’ajout. Contrôler aussi les scans répétés, les échecs, la liste conservée au retour et le mode transmis à la génération. Pas de changement de paywall ni de l’onboarding principal.
