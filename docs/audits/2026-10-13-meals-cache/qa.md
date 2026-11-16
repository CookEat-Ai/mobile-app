# Cache de l'onglet Repas — 13 octobre 2026

Vérification sur l'émulateur Android API 36, development build CookEat, Metro local 8082 et API locale 8083. Les requêtes réseau ont été comptées au niveau du vrai `fetch` vers `/catalog/recipes` et `/catalog/cuisines`, avec une instrumentation temporaire ne journalisant ni en-tête ni jeton. Les images sont téléchargées par le composant natif Expo Image et ne sont pas incluses dans ce comptage.

## Diagnostic confirmé

Le cache existant fonctionne : un premier chargement du catalogue, puis deux allers-retours Planning → Repas ont produit **un seul appel réseau catalogue au total**. Le catalogue restait frais pendant ces retours. Les cuisines avaient déjà une entrée fraîche en cache.

L'écran appelait pourtant `setRecipes([])` et activait son indicateur de chargement à chaque retour d'onglet, avant de recevoir la réponse en cache. Cela remontait aussi la liste en haut. Le flag destiné au replay visuel déclenchait cette réinitialisation.

## Correctif et preuve native

La vérification au retour s'effectue maintenant sans vider la liste. Elle relit toutes les pages déjà chargées via le cache, afin de conserver aussi la pagination. Le TTL du catalogue reste de cinq minutes ; une expiration produit bien une requête de revalidation. Les images des cartes utilisent explicitement `cachePolicy="memory-disk"`.

- [Avant, liste défilée](before-scrolled.png) puis [retour en haut](before-return.png), malgré l'absence d'une nouvelle requête catalogue.
- [Après, liste défilée](after-scrolled.png) puis [retour conservé](after-return.png). Les cartes et leurs coordonnées visibles sont identiques.
- [Deux pages chargées](after-two-pages-scrolled.png) puis [retour avec deux pages conservées](after-two-pages-return.png). Le nombre d'appels réseau catalogue n'a pas augmenté pendant cet aller-retour.

La session a aussi observé un appel de revalidation de la première page après expiration, puis un appel uniquement pour la deuxième page lors du défilement. Ce comportement est attendu ; changer les paramètres, dépasser le TTL ou charger une nouvelle page ne constitue pas un échec du cache.

## Validation

- `yarn test:response-cache` : réussi, couvre transport réel du service API, fraîcheur, persistance, invalidations et erreurs.
- `yarn test:meals-cache` : réussi, exécute l'écran et le vrai service de cache avec transport contrôlé. Vérifie liste affichée pendant la lecture, pagination conservée, absence de requête sur les pages fraîches, revalidation des deux pages expirées sans écran vide, échec partiel suivi d'une nouvelle tentative sur les bonnes pages, puis changement de filtre.
- TypeScript et ESLint ciblé : réussis.
- Export Android final : réussi, sans route ni instrumentation de QA.

La route et l'instrumentation temporaires de QA ont été supprimées. Aucun changement de serveur, de TTL, de données personnelles ou de BDD n'est nécessaire pour ce correctif. Les captures PNG ne contiennent que les blocs de décodage ; l'attribut local macOS `com.apple.provenance` reste soumis à la limitation documentée dans l'audit démo précédent.
