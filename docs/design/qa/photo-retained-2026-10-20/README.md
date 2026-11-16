# Bilan avec photo en tête et coins arrondis — vérification du 20 octobre 2026

Le rendu natif iOS a été contrôlé sur le simulateur CookEat Unified Photo QA (iOS 27, 402 × 874 points), avec les composants de production et une réponse réelle préenregistrée. La sauce non résolue de cette ancienne réponse utilise le profil crémeux déjà présent dans le produit ; aucun nouvel appel IA n’est effectué. Il s’agit d’un replay de fixture, sans nouvelle requête de vision, sans capture physique et sans enregistrement de repas.

- Analyse sur photo figée : photo/scanner avant la réponse, sans faux bilan.
- Bilan en cours : progression réelle de `PhotoMealReveal` observée à 2/4 aliments, sans « Passer ». La photo commence en tête, pleine largeur, sans bordure propre et recadrée `cover` comme la fiche recette. La surface externe conserve des coins supérieurs de 32 points ; le contenu crème forme une fiche arrondie sous la photo. Le titre, la reconnaissance, la photo, les valeurs, les aliments et l’action en cours sont dans la même zone de défilement.
- Bilan terminé : la révélation de `PhotoMealReveal` s’est terminée, le bilan affiche les quatre aliments et leurs totaux sans chargement restant, avec la photo toujours en tête. Le message d’ajout automatique est rendu par la fixture. « Voir ma journée » est vérifié par les tests du contrôleur ; l’enregistrement automatique est testé avec stockage simulé et non revendiqué comme une écriture native de cette fixture.

Les tests exécutent aussi les interruptions natives, l’absence de callback, la limite de temps, la fermeture, la réduction des animations et le passage en arrière-plan. Ils vérifient structurellement que tous les éléments du bilan en cours appartiennent au `ScrollView`.

Les gestes de défilement natifs, le grand texte et Android ne sont pas observés : Device Hub ne répond pas à la lecture d’accessibilité de l’automatisation. Ces captures prouvent les états et la conservation de la photo, pas un test gestuel de bout en bout. Le serveur de QA, ses fichiers temporaires et son simulateur sont arrêtés/retirés après le contrôle ; le serveur Metro existant est conservé.

Aucun push réel, build Store ou déploiement de production n’a été exécuté. Les horaires sont vérifiés par les tests du planificateur et le cycle de notification est vérifié avec des doubles de test.

Les captures ont été consultées dans l’outil de contrôle et conservées uniquement dans les fichiers temporaires de QA ; aucune nouvelle image n’est livrée avec ce changement.

Les exports Hermes des deux plateformes sont conservés dans le dossier temporaire `/tmp/cookeat-hero-sheet-export`. Le projet ne contient aucun fichier d’entrée, image ou réponse de fixture temporaires après la vérification.
