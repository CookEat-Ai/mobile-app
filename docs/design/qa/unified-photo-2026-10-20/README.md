# Vérification du suivi photo unifié — 20 octobre 2026

## Résultat observé

Vérification native sur simulateur **iPhone 17 Pro, iOS 27.0**, avec les composants de production dans une vraie `react-native-screens` form sheet : detent 0,92, coins 32 points, poignée et vue Mon suivi derrière. Le serveur et les données de production n’ont pas été modifiés.

- [Caméra](camera.png) : bords visibles, nom/mascotte CookEat, contrôles blancs sur jaune, consignes noires sur carte crème. **Le flux caméra est remplacé par une surface blanche déclarée dans ce test**, pour éprouver le contraste ; ce n’est pas une photo prise par un appareil physique.
- [Attente](waiting.png) : photo et bilan déjà présents, valeurs `—` avant la réponse.
- [Premier aliment](one.png) : 1/3 aliments, **411 kcal + ?**, protéines 15 g + ?, glucides 80 g + ?, lipides 2 g + ? ; les trois macros sont visibles simultanément.
- [Deuxième aliment](two.png) : 2/3 aliments, **625 kcal + ?**, protéines 55 g + ?, glucides 80 g + ?, lipides 7 g + ?.
- [Bilan final](final.png) : **653 kcal**, protéines 58 g, glucides 86 g, lipides 8 g ; la même fiche s’est agrandie, les champs sont déverrouillés. Les ingrédients et quantités sont accessibles en faisant défiler.
- [Référence manquante](partial.png) : la sauce non résolue conserve le signe `+ ?`, la mention d’estimation partielle et le bouton de confirmation désactivé. Aucun aliment inconnu n’est compté à zéro.
- [Erreur](error.png) : bilan conservé, boutons Réessayer / Retour à la caméra dans cette même fiche.
- [Enregistrement natif](progress.mp4) : progression complète puis agrandissement, sans remplacement de la fiche.

## Origine des données

Les données viennent d’une **véritable requête IA** effectuée avec une photo de pâtes/poulet/champignons déjà possédée par CookEat. Réponse conservée dans `api/catalog-web/photo-tracking-live-analysis.json`. L’animation native est un **replay déclaré de cette réponse**, sans nouvel appel facturé à chaque scène. La scène finale complète filtre les trois aliments référencés ; la scène partielle conserve la sauce non résolue de la réponse originale.

Le test HTTP réel confirme l’analyse, les corrections, l’authentification, la propriété du reçu et l’idempotence. La catégorie renvoyée par l’image est `dinner` avec une explication fondée sur le plat ; une confirmation client envoyant `snack` conserve `dinner`. Le test HTTP de file privée couvre également ce comportement et `tracking-confirmation-v1`.

## Vérifications logicielles

- API : TypeScript, `test:photo-tracking`, test HTTP photo réel et test HTTP file privée réussis.
- Mobile : TypeScript et `test:meal-tracking` réussis ; lint sans erreur (trois avertissements sur les compteurs d’invalidation asynchrones des effets).
- Exports de production iOS et Android réussis, après suppression du harness temporaire et restauration du résolveur Metro. Bundles Hermes produits : iOS 8,4 Mo et Android 8,6 Mo. Avertissement de résolution existant `@noble/hashes/crypto.js`, avec repli sur le fichier ; aucune erreur de bundling.
- Réduction des animations / lecteur d’écran : branche de code revue, résultat rendu directement ; **pas de test système natif de ces réglages pendant cette session**.
- **À vérifier sur appareil physique** : flux caméra, prise effective, permission galerie et clavier de correction. Android natif et téléphone plus petit non vérifiés visuellement ; ne pas assimiler un export réussi à un test sur appareil.

## Fichiers de preuve

Les PNG ont été réécrits en conservant seulement IHDR/IDAT/IEND, sans modification du flux de pixels ; les métadonnées embarquées facultatives ont été supprimées. `xattr -c` a été exécuté : macOS conserve son attribut système `com.apple.provenance`, qui n’est pas une métadonnée embarquée dans les PNG. Le MP4 est une capture du simulateur. Aucun asset de test ni résolveur temporaire ne reste dans l’entrée de production.
