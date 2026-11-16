# Cache des réponses mobiles

Les lectures répétées réutilisent les réponses fraîches et partagent les requêtes simultanées. Le cache utilise AsyncStorage déjà installé, sans nouvelle dépendance native.

| Données | Fraîcheur | Stockage |
| --- | --- | --- |
| Catalogue filtré et paginé | 5 minutes | Mémoire et disque |
| Fiches du catalogue | 30 minutes | Mémoire et disque |
| Cuisines | 24 heures | Mémoire et disque |
| Recettes personnelles, historique, favoris et état favori | 30 secondes | Mémoire uniquement |
| Plannings et détails | 15 secondes | Mémoire uniquement |

Les clés incluent l'URL du serveur, la langue, l'utilisateur pour les lectures personnelles et tous les paramètres de la requête. Le cache des réponses personnelles est vidé au changement d'utilisateur, au retour au premier plan, aux changements RevenueCat et lors d'une erreur 401. Les contrôles d'accès, de santé et de configuration restent des requêtes réseau.

Les mutations de recettes, de plannings et de compte invalident les réponses personnelles avant et après la requête, même en cas d'échec réseau. Les générations WebSocket et imports SSE les invalident au démarrage, à la fin ou à l'interruption du flux. Les réponses commencées avant une invalidation ou une actualisation forcée ne peuvent pas écraser le nouveau cache.

L'actualisation manuelle des écrans Accueil, Planning, Imports et Favoris passe `forceRefresh: true`. Les méthodes publiques de lecture du catalogue et des fiches acceptent aussi cette option. Une actualisation forcée signale les erreurs au lieu de masquer l'échec avec une ancienne réponse.

Le catalogue public déjà chargé peut servir de secours pendant une panne réseau ou une erreur serveur, pendant sept jours maximum depuis son chargement. Les erreurs 4xx et les réponses personnelles ne bénéficient pas de ce secours. Les réponses d'échec ne sont pas mises en cache.

Le cache est limité à 80 entrées et 3 millions de caractères en mémoire. Les snapshots persistés du catalogue sont limités à 1 million de caractères, sous la clé `@cookeat_catalog_response_cache_v1`. Les écritures sont regroupées si le stockage est lent. Les réponses retournées depuis le cache sont copiées pour préserver le snapshot quand un écran modifie son état.

Ce cache ne remplace pas les stockages existants des recettes, ingrédients ou prévisualisations de planning. Les images des cartes utilisent séparément le cache mémoire et disque d'Expo Image.

L'onglet Repas conserve sa liste, son défilement et toutes les pages déjà chargées au retour d'un autre onglet. La vérification des données se fait en place : les pages fraîches viennent du cache, les pages expirées repassent par le réseau. Un nouveau filtre commence à la première page. Une animation d'entrée ne doit pas vider la liste pour donner l'impression d'un chargement réseau.

## Vérification

`yarn test:response-cache` exécute le service API et le cache réels avec transport, stockage et horloge contrôlés. Il vérifie les hits, les requêtes simultanées, le redémarrage, les clés, les TTL, le mode hors ligne, les invalidations, les courses, les erreurs de stockage et l'éviction. `yarn test:meals-cache` vérifie l'écran Repas avec le cache réel : liste conservée, pagination, absence de réseau tant que les pages sont fraîches, revalidation après expiration et changement de filtre.

La vérification native Android de l'onglet Repas est documentée dans [l'audit du 13 octobre 2026](../audits/2026-10-13-meals-cache/qa.md). Les autres écrans et plateformes, ainsi que les mesures de latence détaillées, restent à vérifier avant publication.
