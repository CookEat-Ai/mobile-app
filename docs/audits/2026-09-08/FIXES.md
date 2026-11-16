# Corrections après audit — 8 septembre 2026

Corrections présentes dans le code local. **Aucun compte à créer** : profil anonyme conservé, jeton protégé ajouté automatiquement. Aucun déploiement effectué.

## Changements

- Identité et droits de planning vérifiés côté serveur ; démonstration gratuite distincte des opérations payantes.
- Échec de génération : réessayer, modifier les jours ou reprendre les préférences ; conservation des choix, sans fausse promesse de sauvegarde partielle.
- Portions sources conservées pour les recettes importées ; récupération dans la recette d’origine pour les anciens repas.
- Remplacement : exclusion stricte de la recette actuelle et de son identité catalogue.
- Dates impossibles : HTTP 400 avant écriture.
- Régime « aucun » et cuisines effacées respectés ; profil utilisé pour initialiser les réglages absents.
- Recettes importées prêtes acceptées par l’ancien écran planning.
- Cible absolue de poids conservée après redémarrage ; arrêt du déficit/surplus projeté une fois la cible atteinte.
- Points et ligne du graphique calculés ensemble ; maintien horizontal centré.
- Erreurs réseau traduites avec réessai ; une absence de droit premium propose les offres.
- Suppression de l’essai arbitraire de sept jours et du repli de développement : variantes éligible, inéligible et inconnue.
- Erreurs de restauration propagées ; états « aucun achat » et « erreur » distincts. Pas de restauration automatique sur une toute nouvelle identité.
- Clés FR manquantes et espace final corrigés ; contrat produit aligné sur le catalogue.

## Vérifications

- API : TypeScript, **14 suites de tests** et diff sans erreurs ; lint sans erreur, avertissements de typage encore présents.
- Intégration HTTP : **21 assertions réussies** sur base locale isolée : migration du profil, jeton, accès interutilisateur, faux abonnement, démonstration, portions et persistance des coches.
- App : TypeScript, lint sans erreur, régressions objectifs/graphiques/préférences/recettes importées et trois états d’éligibilité réussis.
- Exports des bundles iOS et Android réussis. Ce ne sont pas des compilations natives ni un test Android en exécution.
- RevenueCat réel : HTTP 403 pour un faux abonnement déclaré ; identité temporaire nettoyée dans la base locale.

## Simulateur iPhone 17 / iOS 26.5

Parcours vérifié avec le bundle corrigé et l’API locale sécurisée : objectifs → trajectoire → engagement → sept jours → **21 repas** → recette avec photo, ingrédients et étapes. Profil fictif vegan, exclusion arachide, cuisine italienne. Aucune inscription ; profil et identifiant existants conservés.

- [Semaine anonyme de 21 repas](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/fixes/anonymous-preview-21-meals.png)
- [Recette du catalogue ouverte](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/fixes/catalog-recipe-opened.png)
- [Message hors ligne avec réessai](/Users/hadjadji/work/perso/cookeat/mobileapp/docs/audits/2026-09-08/fixes/offline-retry.png)

Le réessai après redémarrage de l’API relance effectivement la requête. Le profil sans abonnement est ensuite refusé pour la création des courses, comme attendu. Le graphique corrigé a été observé.

Le catalogue de « Recettes DB » n’a pas été modifié. Le planning fictif précédent a été sauvegardé puis remplacé uniquement pour retester la génération.

## Limites avant livraison

Achats, restauration effective, rappels à échéance et Android en exécution restent à vérifier avec les environnements Store adéquats. Les erreurs de polices RevenueCat persistent dans le simulateur de développement ; elles ne sont pas masquées. La récupération visuelle après insuffisance du catalogue n’a pas encore été rejouée sur cette version finale ; ses actions sont implémentées et la génération avec le nouveau catalogue fonctionne.

Les titres de recettes restent issus du catalogue, actuellement français dans le parcours anglais observé. Les textes d’interface ajoutés ont leurs six traductions. L’export web n’est pas une cible certifiée par ce correctif mobile.

Avant déploiement : configurer RevenueCat sur le serveur et coordonner la mise à jour des anciennes versions. Voir [le protocole et les limites de migration](/Users/hadjadji/work/perso/cookeat/api/ANONYMOUS_ACCESS.md). Ne pas réintroduire d’accès par simple identifiant.
