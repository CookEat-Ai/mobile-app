# Planning en sept étapes — validation du 13 octobre 2026

Ordre implémenté : jours, ingrédients facultatifs, durée, cuisines illustrées, alimentation, exclusions, personnes. La dernière étape lance directement la génération. Le récapitulatif et le raccourci qui y menait ont été retirés.

Les douze cuisines utilisent des illustrations SVG de plats locales. Chaque carte est une case à cocher, avec sélection multiple et un choix « Toutes les cuisines ». L’alimentation reprend les cinq possibilités de l’onboarding, dont halal et pescétarien ; les réglages conservaient auparavant seulement les trois premières possibilités.

## Contrôles exécutés

- Véritable application native CookEat sur **CookEat QA iPhone Duo**, iOS 27.1, SDK Xcode 27.1 RC ; écrans extérieur 466 × 678 points et intérieur 951 × 669 points. Aucun nouveau module natif requis ; SVG était déjà installé. Pilotage interactif XCTest terminé avec **TEST EXECUTE SUCCEEDED**.
- Progression 1/7 à 7/7, marque/mascotte fixes, sélection multiple de cuisines, choix halal, clavier pour les exclusions et choix de trois personnes. Retour aux écrans précédents : toutes ces réponses restent conservées. Création directe observée : passage de 7/7 à « Ton planning se prépare », puis affichage des repas.
- Génération réelle de huit repas dans l’API locale isolée. Vérification en lecture seule du document enregistré : cuisines `african` et `american`, régime `halal`, exclusion `porc`, trois personnes. [Preuve de données](generated-plan-check.json). Le planning QA a ensuite été supprimé pour repartir du parcours vierge.
- Une collision du titre de cuisine avec la zone système extérieure a été corrigée en appliquant les insets latéraux au contenu défilant et à l’objectif. Après correction, le texte extérieur est limité à 342 points et entièrement lisible ; sur l’intérieur, la colonne reste à 496 points. CTA extérieure x=20, y=588, largeur=426, hauteur=56, conservée entre étapes. Les champs et la CTA restent accessibles avec le clavier.
- TypeScript, ESLint ciblé, `yarn test:planning-configuration`, `yarn test:planning-loading` et vérification des espaces dans le diff ciblé : réussis. Régressions de sauvegarde/rechargement des cinq régimes ajoutées au test existant. Les textes des six langues sont présents.

[Observations natives vérifiées](native-evidence.json). Captures finales : [cuisines ouvertes](01-cuisines-open.png), [cuisines fermées](02-cuisines-closed.png), [alimentation après défilement](03-diet-closed.png), [exclusions avec clavier](04-exclusions-keyboard.png), [personnes et création directe](05-servings-final.png).

## Limites

Les captures des nouvelles étapes ont été inspectées en français sur le simulateur Duo. Android, les autres tailles, les grandes polices, l’accessibilité lecteur d’écran et les autres langues n’ont pas été observés visuellement dans cette itération. Le scan réel de photo et les achats n’ont pas été retestés. L’avertissement Debug de police RevenueCat déjà consigné le 12 octobre reste présent ; il a été fermé dans le débogueur avant les captures. Aucun service ni état de production n’a été modifié.

Les métadonnées intégrées aux PNG ont été supprimées en conservant les dimensions et les données de pixels. Les commandes de suppression des attributs filesystem ont été exécutées ; macOS conserve l’attribut système protégé `com.apple.provenance`. Détail dans [la vérification des captures](capture-verification.json). Les illustrations SVG sont du code natif, sans image raster générée.
