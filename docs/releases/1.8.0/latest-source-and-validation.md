# CookEat 1.8.0 — état vérifié le 21 octobre 2026

API 1.10.3 déployée sur cookeat.info : source `5aa301e5b99db740f25bede69c758948978bd270`, image `cookeat-api-prod:1.10.3`, santé HTTP 200, zéro redémarrage après déploiement. Les changements VPS précédents sont préservés par un stash récupérable ; la configuration et l’image 1.10.2 sont conservées pour retour arrière.

90 recettes ajoutées sans écraser de document : 32 recettes déjà préparées localement et 58 nouvelles recettes, chacune avec une photo approuvée. Les 58 nouvelles photos ont été générées individuellement avec imagegen. Les 90 fichiers publiés répondent en HTTP 200 et correspondent exactement aux SHA-256 validés. Le catalogue publié compte 1 715 recettes.

## Génération et validation

Cas fourni : 1 personne, 5 jours, 45 EUR, prise de muscle, débutant, cuisine standard + four + micro-ondes, maximum 60 minutes, cuisines africaine/italienne/moyen-orientale/thaïlandaise, halal, porc et lait exclus, placard des captures.

L’audit des données relues en production trouve 63 recettes compatibles : 28 plats et 35 options de petit-déjeuner/collation. Le mode placard strict réussit sans achats supplémentaires. Les produits laitiers restent exclus, même présents dans le placard ; les petits-déjeuners/collations de ce cas sont salés. Les petites quantités d’herbes et d’épices ne bloquent plus la recherche ni la liste de courses. Les ingrédients principaux et les allergènes restent vérifiés.

- Suite API complète passée ; tests affectés relancés après les références d’aliments crus.
- Catalogue réel enrichi : 30 configurations, 152 générations, 3 040 repas, passés.
- Cas strict : 32 semaines / 640 repas, 27,43–44,35 EUR ; aucun repas commun avec la semaine précédente dans ces replays. Ce résultat n’est pas une garantie générale pour chaque petit catalogue.
- HTTP strict : 14 plannings / 280 repas, 8 restaurations, listes de courses dans 6 langues, zéro achat supplémentaire.
- Après ajout des photos : TypeScript, 32 semaines / 640 repas et publication additive/idempotente passés.
- Source mobile `c258f65f48e59feee2cfdd8ae0f51c1eaee89898` inchangée : 17 suites et TypeScript passés ; lint sans erreur, 61 avertissements préexistants.

## Stores et test annuel

Les 108 visuels du récit en quatre slides restent préparés pour trois appareils et neuf langues/régions : analyse du repas, planification, courses et budget, objectif. Apple : 72 images COMPLETE dans 18 jeux. Google : 4 images ordonnées dans chacun des 9 brouillons locaux.

Test RevenueCat `exp46ca5ef93c` : prix annuel 49,99 EUR/USD contre 39,99 EUR/USD, mêmes paywalls natifs, même droit Pro, mêmes produits mensuels/hebdomadaires et même essai de sept jours. Les quatre offres utilisent maintenant les nouveaux produits Android correspondants. Les deux variantes sont configurées dans 175 régions par store ; montants EUR/USD exacts, équivalents locaux pour les autres devises. Les essais Apple sont relus dans les 175 régions pour chaque produit. Les forfaits Google et leurs offres d’essai sont actifs.

L’expérience reste DRAFT pour les nouveaux clients France/USA sur app >= 1.8.0 : les deux produits Apple sont READY_TO_SUBMIT, sans approbation Store, et achat/restauration sandbox sur appareil réel restent à vérifier. Aucun paywall hébergé RevenueCat ni offre par défaut n’a été substitué.

Les binaires Android 12 / iOS 25 déjà téléversés précèdent les dernières corrections mobiles. Aucun nouveau build mobile, OTA, envoi en validation ou publication n’a été déclenché.
