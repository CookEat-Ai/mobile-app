# Tracking photo et budget monétaire — 19 octobre 2026

Implémentation locale, sans déploiement ni publication.

## Parcours livré

Navigation : Suivi (premier onglet), Planning, caméra centrale, Recettes, Profil. Objectif accessible depuis Suivi. Le démarrage après onboarding terminé pointe sur Suivi ; les parcours explicitement liés au planning gardent leur destination.

Suivi : série de jours avec au moins un repas, sélection de la journée, calories/protéines/glucides/lipides et repères issus du profil existant, repas photographiés, correction et suppression. Le streak ne dépend jamais d’un déficit calorique. Journal et photos propres à l’utilisateur, conservés sur cet appareil ; suppression du compte efface les photos locales et les reçus d’analyse serveur.

Photo : caméra sur permission explicite ou galerie, conversion JPEG et réduction à 1600 pixels, analyse IA réelle. Les données nutritionnelles sont calculées côté serveur à partir de références USDA et des grammes estimés, avec distinction des aliments cuits et crus. Une seconde passe de repérage situe un morceau représentatif de chaque aliment visible. Aucune position n’est inventée si le repérage échoue. Une sauce non identifiable ne compte pas pour zéro : la référence doit être corrigée avant validation. Les cartes montrent les valeurs identifiées avec « + ? » et une mention d’estimation partielle en attendant.

Animation : photo gardée à l’écran, balayage pendant la requête, fiche qui monte, contour de chaque aliment puis véritable fragment de la photo animé jusqu’à la ligne mesurée. Réduction des animations et lecteur d’écran donnent accès directement à la correction. Le bouton « revoir » rejoue le résultat existant sans appel IA ni doublon.

Correction : nom, quantités entières, remplacement de référence, ajout/retrait d’aliments et type de repas. Macro calculées de nouveau à chaque correction ; confirmation serveur puis enregistrement local par identifiant d’analyse. Les erreurs conservent la photo et les corrections. Les événements analytics contiennent seulement des étapes et nombres d’éléments, jamais photo, URI, noms d’aliments ou macros.

Chat : fond crème, cartes et saisie blanches, jaune d’action, titres Degular et corps CronosPro. Son adaptation personnelle et ses garde-fous existants sont conservés.

## Budget

Mini onboarding : objectif → personnes → budget total → jours → ingrédients → durée → niveau → équipements → cuisines → régime → exclusions.

France/EUR : 30 à 150 € pour une personne sur sept jours, 60 à 300 € pour deux. Le sélecteur affiche le total du foyer, l’équivalent par personne et la plage. Pays, devise et niveaux monétaires sont adaptés aux hypothèses de prix existantes. Le budget est un plafond sur l’estimation centrale, pas sur la borne haute d’incertitude ni sur une facture de supermarché.

Les coûts correspondent aux quantités consommées. Des paquets entiers, des marques ou un magasin particulier peuvent coûter davantage. Le planning affiche son coût estimé et le budget choisi ; après modification manuelle, un dépassement estimé est signalé. Le moteur conserve les contraintes alimentaires, de cuisine et d’ingrédients ; il refuse une génération impossible plutôt que dépasser silencieusement le plafond.

Validation réelle du catalogue local, 28 repas par semaine : maintien 2200 kcal/91 g à 26,69 €, perte de poids 1700 kcal/120 g à 25,73 €, prise de muscle 2600 kcal/130 g à 20,61 €, et deux personnes en maintien à 53,45 € pour un plafond de 60 €. Assertions calories ±5 % et protéines ±10 % respectées. Ces quatre cas démontrent une faisabilité dans le modèle de prix, pas une garantie pour toutes les contraintes.

## Enrichissement du catalogue

Une analyse cohérente et confirmée peut créer une recette `reviewing`, avec références, quantités, nutrition, difficulté, durée, équipement et étapes proposées. Déduplication par empreinte. Pas de publication automatique ni de photo privée dans le catalogue. Une image ne prouve pas la préparation originale : les étapes sont explicitement une proposition d’assemblage/préparation à vérifier. Les corrections qui changent l’identité des aliments ne déclenchent pas une publication implicite.

## Vérifications et portée

- TypeScript API et mobile ; tests existants portions, coûts, chat, personnalisation, configuration et cache.
- Journal : dates et DST, streak, isolation, sauvegardes concurrentes, idempotence, édition/suppression, données corrompues, mapping photo et six langues.
- Analyse : références cuites, arrondis, inconnus, boîtes hors cadre, ingrédients invisibles, doublons et quantités invalides.
- HTTP authentifié avec IA réelle : analyse d’une image CookEat déjà générée, aliments reconnus, vrais repérages, confirmation, isolation, invalid image et idempotence. Il s’agit d’un visuel de recette existant, pas d’une capture de caméra réelle. Les fixtures temporaires sont nettoyées.
- HTTP candidature : analyse de test déclarée, création réelle d’une unique recette en vérification, métadonnées et nutrition contrôlées, aucune photo importée, puis nettoyage.
- Bundles complets iOS et Android compilés localement. Les exports de contrôle ne sont pas des builds distribués.
- Observation des composants natifs sur simulateurs iOS, avec relecture du résultat d’analyse réelle dans une prévisualisation identifiée. Contrôle web à largeur 390 px. Cette validation ne remplace pas un essai caméra physique ni un contrôle visuel Android.

Référence nutritionnelle officielle : [USDA FoodData Central](https://fdc.nal.usda.gov/). Les identifiants et URLs précises des aliments cuits sont conservés dans `api/src/data/tracking-food-reference.json`.

Captures : `photo-tracking-home-web-qa.jpg`, `photo-tracking-review-web-qa.jpg`. Vidéo : `photo-tracking-ios-qa.mp4` (prévisualisation native identifiée, résultat IA réel rejoué ; bandeau de warnings du build Debug visible).

Vérification de correction dans la prévisualisation : choix explicite d’une crème légère pour la sauce inconnue ; les quatre macros se recalculent et le bouton d’ajout devient actif. Le test n’affirme pas que cette crème est réellement présente sur la photo.

Les métadonnées JPEG facultatives des captures ont été retirées sans réencoder les pixels. macOS réattache son attribut de fichier `com.apple.provenance` après effacement ; cet attribut n’a pas pu être conservé supprimé.
