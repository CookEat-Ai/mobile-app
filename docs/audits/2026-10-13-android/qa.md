# Test Android CookEat — 13 octobre 2026

CookEat 1.7.0 a été compilé et lancé dans un émulateur Pixel 7 ARM64, Android 16/API 36, avec Expo 57.0.26 et React Native 0.86.3. Le test porte sur le checkout local modifié (base Git `e54785d31f2a4afbcb0a6c2650a396bff16945b7`), sans publication ni modification des Store/RevenueCat. L’API utilisée est `https://cookeat.info/api`, avec une installation de test. Des liens internes ont permis de tester les écrans indépendamment du tunnel d’onboarding.

## Correction

L’écouteur `hardwareBackPress` du configurateur restait enregistré quand la caméra le recouvrait. Retour pouvait changer l’étape cachée au lieu de fermer la caméra. Dans `app/planning/configure.tsx`, il est désormais enregistré avec `useFocusEffect` et retiré quand le configurateur perd le focus. Contrôle après redémarrage : caméra ouverte depuis 2/7, aide fermée, Retour Android → fermeture de la caméra et retour à 2/7. `android-back-fixed.png/xml` atteste l’état obtenu. La correction JavaScript a été testée avec Metro sur le binaire local fraîchement compilé.

## Parcours observés

| Contrôle | Résultat |
|---|---|
| Démarrage et accueil | Affichage natif sans crash fatal observé |
| Permission caméra refusée puis accordée | État de refus, nouvelle demande et ouverture caméra fonctionnels |
| Caméra → Passer | Liste vide, ajout manuel de Rice, catégories, clavier et actions accessibles |
| Retour du scan | Retour à la configuration sans conserver le brouillon Rice |
| Reprendre une photo | Retour à la caméra sur la même route, puis fermeture ; branche sans photo réelle |
| Configuration du planning | Sept étapes atteintes en français, cuisines réelles, exclusions, compteur de personnes 1 → 2 |
| Retour entre étapes | Retour Android 5/7 → 4/7 contrôlé ; retour caméra corrigé |
| Catalogue et détail | Recettes et cuisines chargées depuis l’API ; anglais et français observés |
| Portions | 1 → 2 personnes, avoine 65 g → 130 g |
| Favoris | Ajout confirmé et action « retirer » affichée |
| Paywall indisponible | Message localisé, sortie vers le catalogue ; création d’une semaine dirigée vers le paywall et retour au configurateur |
| Petit écran | Configuration visible à 360 × 640 dp (720 × 1280 px), CTA au-dessus de la barre système |

## Vérifications techniques

- Gradle `:app:assembleDebug`, ARM64 : **BUILD SUCCESSFUL**, 703 tâches, 13 min 52 s. APK de test installé, version 1.7.0, package `com.gokugen.cookeat`.
- TypeScript : succès ; lint complet initial : zéro erreur, 56 avertissements. Lint ciblé du configurateur corrigé : zéro erreur/avertissement.
- Tests : scan du garde-manger, configuration/suppression, organisation/affichage du planning, chargement, navigation des repas et projection d’objectif : succès. Configuration et scan rejoués après correction.
- Export Android et contrôle de diff ciblé : succès. L’ensemble du checkout comporte aussi un espace final préexistant dans `app/paywall.tsx`.

## Limites

Google Play Billing est absent de l’image `google_apis` de cet émulateur. RevenueCat retourne `PurchaseNotAllowedError / BILLING_UNAVAILABLE`, avec « Billing service unavailable on device ». Achat, essai, restauration, prix et droits Premium ne sont donc pas validés. Il faut un appareil/émulateur doté du Play Store, un compte Google de test et une distribution adaptée pour ces contrôles.

La génération Premium n’a pas été exécutée : le contrôle d’accès a orienté cette installation non abonnée vers le paywall. La reconnaissance réelle d’aliments, la voix, les notifications et le parcours d’onboarding intégral ne sont pas validés ici. L’image caméra est celle de la caméra virtuelle. Le petit écran utilise une taille logique imposée dans le même émulateur, pas un deuxième appareil physique.

Les premiers contrôles conservent les overlays de développement RevenueCat dans certaines captures. Une route de QA temporaire a masqué LogBox pour la dernière passe visuelle ; elle a été supprimée avant livraison et ne modifie aucun droit d’accès. Metro est limité à `127.0.0.1:8082`, via ADB, et le serveur déjà utilisé sur 8081 a été conservé.

Les PNG livrés ont été reconstruits avec les seuls chunks nécessaires, et les données IHDR/IDAT ont été comparées à l’identique. Les dimensions et pixels sont conservés. L’attribut système macOS `com.apple.provenance` reste présent sur les copies locales malgré `xattr -c` et la suppression explicite, y compris hors sandbox. Il n’est pas inclus dans l’archive livrable : les PNG y sont écrits depuis leurs octets nettoyés, sans ressources AppleDouble, attributs étendus ni fichiers `__MACOSX`. Voir `image-verification.json`.

L’émulateur et le serveur Metro propres à ce test ont été arrêtés après vérification. L’AVD `CookEat_API36` et le SDK Android restent installés pour les prochaines sessions.
