# Scanner sur photo figée → bilan plein écran

Vérification du 20 octobre 2026, iOS 27 (iPhone 18 Pro, 402 × 874 points) et Android 16 / API 36 (1080 × 2400 pixels, densité 420).

## Résultat observé

- Pendant l’attente : photo figée couvrant la caméra, balayage jaune, état lisible, **aucun bilan affiché**.
- Au début de la révélation : photo recadrée en grand en haut ; une seule fiche apparaît dessous. Les fragments rejoignent sa cible et les valeurs se cumulent à leur arrivée.
- À la fin : la même fiche rejoint le haut physique de l’écran, sans bords, poignée, photo ou autre en-tête derrière elle. Fermeture, résumé, corrections et chatbot restent disponibles.
- Erreur : photo conservée, scanner arrêté, reprise et retour caméra accessibles, aucun bilan prématuré.
- Réduction des animations Android : attente honnête, puis résultat réel directement en plein écran.

## Preuves natives

| Étape | iOS | Android |
| --- | --- | --- |
| Scanner sans bilan | [Capture](ios-scanner.png) | [Capture](android-scanner.png) |
| Bilan cumulatif | [Capture](ios-progress.png) | [Capture](android-progress.png) |
| Résultat plein écran | [Capture](ios-fullscreen.png) | [Capture](android-fullscreen.png) |
| Erreur d’analyse | — | [Capture](android-error.png) |
| Réduction des animations système | — | [Capture](android-reduced-motion.png) |

[Vidéo iOS de la transition](ios-transition.mp4).

Ces captures et la vidéo sont un **replay natif de la réponse réelle préenregistrée** `api/catalog-web/photo-tracking-live-analysis.json`, avec les composants de production `TrackingCaptureSurface`, `PhotoMealReveal` et `PhotoMealReview`, dans une présentation native transparente. La quatrième référence reste inconnue : `653 + ?` est volontairement un total partiel, pas une valeur artificiellement complétée. Les extraits d’image et contours proviennent des coordonnées enregistrées.

La caméra physique, un nouvel appel de vision IA et l’enregistrement réseau ne sont pas exécutés par ce replay. La compilation de l’application complète est vérifiée séparément. Les fichiers d’entrée QA et la configuration Metro temporaire ont été retirés après observation ; aucun accès QA ni changement de build natif n’est ajouté au produit.

## Tests fonctionnels

`yarn test:photo-reveal` : aucune fiche pendant l’attente ; valeurs ajoutées uniquement à l’arrivée ; une seule fiche après agrandissement ; fin notifiée une fois ; fermeture et callbacks tardifs ; erreur ; passage de l’animation ; résultat sans aliment ; réduction des animations, y compris pendant l’agrandissement. Le test du contrôleur vérifie la photo originale avant résolution de la compression, le passage à la photo traitée, l’agrandissement de la même surface et la récupération d’une exception réseau.

`yarn test:meal-tracking` : journal, dates, streak, références inconnues, isolation utilisateur, sauvegardes concurrentes, corrections, suppression et géométrie des photos. Le cadrage cover et les zones partiellement/entièrement hors du cadre sont couverts.

TypeScript et exports Hermes iOS/Android : réussis. ESLint ciblé : aucune erreur, deux avertissements sur des compteurs de génération utilisés lors du nettoyage des effets.

## Essayer dans l’app

Mon suivi → bouton photo central → capturer/importer une assiette → attendre le résultat réel → observer les arrivées → bilan plein écran. Une réponse lente doit laisser uniquement la photo et le scanner ; une erreur doit proposer une reprise depuis cette même photo.
