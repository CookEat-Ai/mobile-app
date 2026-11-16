# Le suivi par photo dans les avantages CookEat

Le récapitulatif `offerTrial`, juste avant le rappel, présente maintenant « Calories et protéines estimées par photo », avec les mêmes badges et couleurs partagés que les autres avantages. L’accueil, la conclusion des questions et les textes embarqués d’offre, génériques ou personnalisés selon les quatre objectifs, mentionnent également le suivi. Les six langues sont mises à jour.

La liste du récapitulatif utilise `OnboardingScrollView`, avec une réserve pour le bouton fixe. Son panneau inférieur a un fond opaque. Le texte de réassurance du footer partagé peut occuper plusieurs lignes sans changer la position du bouton.

## Vérifications

- TypeScript, ESLint des deux composants modifiés, tests existants de copie des offres et de génération depuis l’onboarding.
- Écrans réels dans une prévisualisation native isolée : iPhone 17 Pro / iOS 27 et Android 16 / API 36. Profil, état d’éligibilité, navigation et analytics sont simulés ; aucun achat ni parcours commercial complet n’est validé ici.
- [Récapitulatif iOS en français](ios-recap-fr.png), [objectif prise de muscle](ios-recap-muscle-fr.png), [allemand](ios-recap-de.png), [accueil français](ios-welcome-fr.png).
- [Récapitulatif Android en français](android-recap-fr.png). [Android compact, allemand, texte 130 %](android-recap-compact-de.png) : 360 × 720 dp, liste défilée jusqu’aux derniers avantages, réassurance entière et bouton visibles, sans superposition.
- Les captures conservent leurs pixels ; métadonnées PNG et attributs de capture retirés. macOS maintient l’attribut système `com.apple.provenance` malgré les tentatives de suppression explicite et de recréation du fichier ; sa suppression n’est pas confirmée.

Les cinq fichiers temporaires de prévisualisation ont été retirés. La configuration Metro de production n’a pas été modifiée pour cette QA ; les deux serveurs temporaires sont arrêtés. Simulateurs et réglages Android restaurés. Les prix, durées d’essai, droits et navigation du tunnel restent inchangés.
