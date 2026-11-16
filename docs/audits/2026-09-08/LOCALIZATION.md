# Localisation des recettes — 8 septembre 2026

## Complément : icônes des ingrédients

La vérification complémentaire a trouvé une ambiguïté réelle : `pasta de amêndoas` était reconnue comme des pâtes. L’API choisit désormais les pictogrammes par identifiant stable d’ingrédient ; le client possède également 1 213 correspondances exactes pour les anciennes recettes en cache. Les 294 identifiants et les 90 126 occurrences d’ingrédients des 2 040 recettes dans les six langues sont contrôlés, sans icône dépendant de la traduction. Les pictogrammes représentent parfois une famille alimentaire lorsqu’aucun emoji spécifique n’existe.

Tests des services catalogue et planning, TypeScript API/mobile, parcours HTTP dans les six langues : réussis. Le rendu de la purée d’amandes et de la boisson au soja a été confirmé en portugais sur iPhone 17 ; préférences restaurées après l’essai. [Capture corrigée](localization/iphone17-pt-br-icons.png). Rapport automatisé : `api/catalog-localization/icons-audit.json`. La génération des correspondances et leur audit se rejouent depuis `api` avec `TS_NODE_TRANSPILE_ONLY=true yarn ts-node scripts/catalog-ingredient-icons.ts --write` (omettre `--write` pour vérifier sans régénérer le fichier mobile).

Les 2 040 recettes du catalogue local sont disponibles en français, anglais, allemand, espagnol d’Espagne, espagnol du Mexique et portugais du Brésil. L’API et l’app utilisent la variante régionale exacte, y compris pour les plannings déjà sauvegardés, leurs courses, les favoris et les copies du catalogue dans l’historique.

Les corrections couvrent la transmission de la langue régionale, les caches de fiche et de planning, le rechargement des écrans et la protection contre une réponse arrivée après un changement de langue. Aucun compte utilisateur n’est requis pour le parcours anonyme testé.

## Résultats

- TypeScript API et mobile : réussi.
- 15 suites de tests API : réussies.
- Six langues testées via HTTP : création anonyme de 28 repas, restauration, lecture, historique, fiches avec cache, favoris et conservation des articles cochés.
- 180 combinaisons de rotation sur huit semaines et 3 132 profils restrictifs : zéro échec après l’ajout des traductions.
- Intégrité des 12 240 contenus : français, images, grammages, composition et nutrition inchangés.

## Simulateur

Même recette ouverte successivement dans plusieurs langues sur iPhone 17, iOS 26.5 : `catalog-owned-rotation-french-tofu-cauli-mornay`. Les titres, ingrédients, nombres décimaux, étapes et conseils suivent la langue sélectionnée. Le passage allemand → espagnol a servi à vérifier la correction du cache de fiche.

- [Étapes allemandes](localization/iphone17-de-steps.png)
- [Étapes en espagnol du Mexique](localization/iphone17-es-mx-steps.png)
- [Étapes en portugais du Brésil](localization/iphone17-pt-br-steps.png)

Les préférences originales du simulateur ont été sauvegardées puis restaurées ; l’app a été fermée à la fin. La demande de notation iOS a été fermée sans envoyer d’avis. Le client de développement a affiché des avertissements RevenueCat d’installation de police ; cette validation ne conclut pas à leur résolution et ils ne concernent pas la sélection des textes du catalogue.

## Portée

Les traductions ont été produites hors ligne, sans API de génération payante, avec lexique culinaire, modèles de phrases rédigés et relecture ciblée. Il n’y a pas eu de relecture exhaustive par des locuteurs natifs. Les recettes personnelles ou importées qui ne proviennent pas du catalogue ne sont pas retraduites par ce dispositif.

Le résultat est intégré **uniquement à l’environnement local**. Aucun déploiement API, mise à jour EAS ou changement de base de production n’a été effectué. Le dossier `api/catalog-localization` contient les sources, corrections et preuves détaillées.
