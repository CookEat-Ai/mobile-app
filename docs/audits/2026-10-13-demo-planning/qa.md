# Mini onboarding démo et modification du planning — 13 octobre 2026

Vérification native sur Pixel 7 / Android 16 API 36, avec le development build CookEat et Metro local sur 8082. API locale sur 8083, accessible par `adb reverse`. Aucun déploiement ni modification de planning en base.

## Résultats

- Chaque nouvelle ouverture du mode démo commence sans objectif, jours, durée, cuisines, alimentation, ingrédients exclus ni nombre de personnes sélectionnés. Les préférences enregistrées hors démo sont conservées.
- « Toutes les cuisines » est une réponse explicite : décocher la dernière cuisine ne sélectionne pas automatiquement cette option. Continuer est désactivé sans réponse.
- Le nombre de personnes affiche un tiret avant le choix. Un appui sur + choisit 1 et active le bouton de génération. Ingrédients et exclusions restent facultatifs.
- Les 12 cuisines utilisent désormais des illustrations intégrées à l'app : mafé, burger, raviolis chinois, quiche, curry et naan, bowl, pizza, sushi, salade grecque, tacos, mezze et pad thaï. Aucun téléchargement de photo depuis l'API n'est nécessaire.
- « Revoir la semaine » est absent, y compris dans le development build. La découverte automatique à la génération et son bouton pour passer sont conservés.
- Dans le composant réel de modification, les jours exclus restent visibles avec titre gris et emplacements atténués. Ils ne sont proposés ni comme destination dans le menu ni comme cible de déplacement. Les jours choisis restent disponibles même quand leur dernier repas est supprimé.

## Preuves natives

- [Objectif sans sélection](demo-goal.png), [jours sans sélection](demo-days-empty.png), [durée sans sélection](demo-duration-empty.png).
- [Cuisines sans sélection](demo-cuisines-empty.png), [autres cuisines](demo-cuisines-middle.png), [fin de la liste](demo-cuisines-bottom.png).
- [Alimentation sans sélection](demo-diet-empty.png), [exclusions vides](demo-exclusions-empty.png).
- [Personnes non choisies](demo-servings-empty.png), [personnes choisies](demo-servings-chosen.png).
- [Jours choisis et exclus](organize-selected-and-excluded.png), [destinations autorisées](organize-destinations.png), [semaine sans bouton de replay](week-no-replay.png).

L'organisateur et la semaine ont été vérifiés avec un planning local de test, daté du 28 décembre, dont les jours choisis sont lundi, mercredi et vendredi. Il n'a pas été enregistré en base. La configuration utilise le vrai écran et le catalogue de l'API locale. La route temporaire de QA a été supprimée après la vérification.

## Vérifications techniques

- TypeScript et ESLint ciblé : réussis.
- Export Android : réussi, les 12 illustrations sont présentes dans le bundle à l'identique et la fixture temporaire est absente.
- Configuration du planning : réponses démo vides, choix obligatoires, choix explicites « tout », préférences normales intactes.
- Organisation : jours autorisés, jours exclus, déplacement vers un jour choisi vide, échanges et portions conservés.
- Tests existants : animation, reveal unique et onboarding planning réussis.
- Illustrations WebP sans perte : dimensions et pixels identiques aux sorties générées, uniquement le bloc de décodage VP8L, sans EXIF, XMP, IPTC, C2PA ni commentaire.

Limite de nettoyage : macOS conserve `com.apple.provenance` sur les fichiers locaux malgré les commandes de suppression, y compris hors sandbox. L'archive de livraison `/private/tmp/cookeat-cuisine-illustrations-clean.zip` contient les 12 images nettoyées en octets, sans attributs étendus ni fichiers annexes. Les captures PNG ne conservent que les blocs nécessaires au décodage.

Google Play Billing est indisponible sur cet émulateur sans Play Store ; aucun achat ni génération payante n'a été testé dans cette vérification.
