# CookEat — test natif iPhone Duo, 12 octobre 2026

Le parcours principal fonctionne dans le simulateur Apple iPhone Duo après correction du lancement natif et de marges latérales. La création réelle de huit repas, leur affichage dans l’historique et la suppression confirmée en présentation ont été observées. Ce contrôle ne constitue pas une validation exhaustive de l’application ni un test sur appareil physique.

## Environnement

- Xcode 27.1 RC, build 27A9275, archive officielle dont la signature Apple Software a été vérifiée ; runtime iOS 27.1, build 24A94232.
- Simulateur dédié **CookEat QA iPhone Duo**, UUID `9203463A-ECE1-4C91-93D6-9B4FF0D5512E`. Le premier boot a signalé une migration échouée ; les lancements, le pilotage et les parcours suivants ont fonctionné.
- Écran extérieur : **466 × 678 points**, capture **1398 × 2034 pixels**. Écran intérieur ouvert : **951 × 669 points**, capture **2853 × 2007 pixels**. Mesures de l’application native, pas dimensions matérielles promises.
- Compilation Debug arm64 et signature locale ad hoc du simulateur : **BUILD SUCCEEDED**. La signature permet à SecureStore de fonctionner. Aucune signature de distribution ni publication.
- API réelle locale sur `127.0.0.1:8086`, base isolée `cookeat_duo_qa_20261012`, Redis DB 12 ; catalogue copié depuis une base locale, profils QA fictifs. Génération du catalogue exécutée par les contrôleurs habituels, sans résultat simulé.
- Metro local sur `localhost:8796`. PostHog dirigé vers un serveur local de test. RevenueCat et AppsFlyer ont initialisé leurs SDK normalement : le test n’était pas entièrement hors ligne. Aucun achat ni modification du serveur de production.
- Xcode de test et pilote XCTest temporaires dans `/private/tmp/cookeat-duo-*`. Le chemin global `xcode-select` reste inchangé. Metro et l’API locale restent disponibles pour visualiser l’app.

## Défauts corrigés et revérifiés

1. **Crash au lancement avec le SDK iOS 27.** Activation de `ios.enableSceneSupport` dans le plugin Expo Build Properties, régénération iOS, installation des pods et reconstruction signée. Le lancement natif fonctionne ensuite, y compris après redémarrage de l’app. L’intégration de scène suit la [migration officielle Expo](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md). Ce changement nécessite un nouveau binaire iOS pour une future livraison.
2. **Historique masqué par la zone système à droite du Duo ouvert.** L’en-tête d’accueil respecte les insets gauche/droit. Historique passe de x=875 à **x=791, largeur 44 points**, avant la zone réservée x=867. L’en-tête commun du parcours respecte également ces marges ; badge de progression x=823,3, largeur 23,7.
3. **Actions de fiche recette dans la zone système.** Retour, marque, partage, favori et fermeture de la photo tiennent compte des insets latéraux. Partage est à **x=748**, favori à **x=803**, largeur 44 ; vérification native et visuelle après rechargement. La fermeture de la photo a reçu la même correction, mais son ouverture/fermeture n’a pas été rejouée.

Fichiers concernés par ces corrections : `app.json`, `app/(tabs)/index.tsx`, `components/planning/PlanningFlowHeader.tsx`, `app/recipe-detail.tsx`. Les autres modifications déjà présentes ont été conservées.

## Parcours réellement observés

| Contrôle | Résultat natif |
| --- | --- |
| Accueil vierge | Nom CookEat, mascotte et bouton « Créer ma semaine » visibles sur l’écran intérieur |
| Configuration en cinq étapes | Jours → ingrédients facultatifs → durée → préférences → récapitulatif ; marque et progression visibles |
| Jours et changement d’écran | Lundi 12 et mercredi 14 sélectionnés ; **2 jours · 8 repas** conservés entre intérieur et extérieur |
| Ingrédients manuels | Garde-manger, ajout, clavier, fermeture et reprise de l’étape durée ; retour au choix sans ingrédients depuis le récapitulatif |
| Posture intermédiaire | Charnière commandée en position half-open ; interface intérieure visible dans Device Hub, durée <30 min conservée |
| Préférences | Deux personnes conservées lors des retours aux étapes et du repliage |
| Clavier extérieur | Saisie « porc », champ visible à y=172–224, Continuer y=284–340, clavier y=418–663 ; bouton utilisable |
| Réouverture après saisie | Récapitulatif conserve « Personnes : 2 · Tout · Sans : porc » et les autres choix |
| Récapitulatif extérieur | Défilement jusqu’aux préférences et au nombre de repas ; en-tête et CTA restent fixes |
| Génération réelle sans photo | Huit repas pour les deux jours, durées observées 10, 17 ou 20 min ; historique avec « 8 repas » |
| Fiche recette | Recette du planning ouverte ; recette du catalogue ouverte après le correctif des marges |
| Suppression en présentation | Annuler conserve le planning ; Supprimer confirmé ramène à l’accueil vierge ; choix de génération retrouvés à la création suivante |

Les poses ont été commandées par un helper HID temporaire du simulateur, issu de [Callstack agent-device](https://github.com/callstack/agent-device/blob/main/apple/fold-helper/Fold.m). Aucune simulation Web de taille d’écran n’a servi de preuve. L’angle physique précis n’a pas été mesuré par `devicectl`.

## Validation et preuves

- Pilote interactif XCTest terminé : **TEST EXECUTE SUCCEEDED**. Les manipulations ne sont pas une suite autonome couvrant toutes les erreurs possibles.
- **11 contrôles** des états observés ont été vérifiés : [native-evidence.json](native-evidence.json). Certaines commandes de recherche n’ont pas trouvé leur libellé après changement d’icône ou de page ; les contrôles reposent sur les états ensuite réellement constatés.
- `yarn tsc --noEmit` : réussi.
- `yarn test:planning-configuration` : réussi, y compris suppression, conservation des préférences et six locales.
- `node scripts/test-recipe-detail-loading.cjs` : réussi.
- ESLint ciblé : zéro erreur, six avertissements existants sur la fiche recette. `git diff --check` ciblé sur les fichiers corrigés : réussi. Le contrôle global signale un espace final préexistant dans `app/paywall.tsx`.

Captures : [accueil ouvert](01-home-open.png), [jours ouvert](02-days-open.png), [jours fermé](03-days-closed.png), [durée en posture intermédiaire](04-duration-half-open.png), [Device Hub partiellement plié](05-device-half-open.png), [récapitulatif fermé](06-review-closed.png), [récapitulatif ouvert](07-review-open.png), [historique généré](08-history-open.png), [fiche recette corrigée](09-recipe-open.png), [clavier fermé](10-keyboard-closed.png).

Les PNG de l’écran actif proviennent de `simctl io screenshot --display=1` ou `--display=3`. La capture de Device Hub montre la posture de l’appareil. `XCUIApplication.screenshot()` renvoyait ici un panneau noir et n’a pas été retenu. Les captures ont été inspectées visuellement.

Les métadonnées incorporées aux dix PNG ont été retirées, avec conservation vérifiée des dimensions et des données de pixels compressées. Seuls les chunks nécessaires au décodage restent. macOS conserve l’attribut système protégé `com.apple.provenance` malgré les commandes de suppression ; le nettoyage complet des attributs du filesystem ne peut donc pas être affirmé. Détail : [capture-verification.json](capture-verification.json).

## Limites et point restant

- Un avertissement Debug RevenueCat indique un échec d’enregistrement d’une police distante. Il apparaît dans la capture de l’historique et a ensuite été fermé dans l’interface de développement. Le paiement et le rendu complet du paywall n’ont pas été validés ; cet avertissement reste à diagnostiquer dans leur propre contrôle.
- Les avertissements du débogueur ont parfois recouvert les boutons ; ils ont été fermés pour les captures finales de configuration. Un avertissement PostHog provenait du routage de télémétrie de test.
- Pas de test de photo réelle du frigo, d’analyse IA de photo, d’achat/restauration, de toutes les langues à l’écran, de très grandes polices, de toutes les orientations ou du fonctionnement en production. La parité du parcours après scan est couverte par le test de configuration, sans être une validation de la caméra native.
- La conservation des autres semaines lors de suppression est couverte par les tests ciblés ; le compte QA natif ne possédait qu’une semaine.
- Ce test vise les parcours listés dans cette RC du simulateur. Une validation sur le matériel commercial reste nécessaire.

Références Apple : [préparation iPhone Duo](https://developer.apple.com/iphone-duo/prepare/), [Xcode](https://developer.apple.com/download/applications/).
