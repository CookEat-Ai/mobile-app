# Import vidéo : déblocage de la version de développement iOS

## Cause constatée

La version de développement utilise l’API locale sur 8083. Son service désactive les traitements de fond (`COOKEAT_DISABLE_BACKGROUND_JOBS=1`) : quatre imports attendaient dans Redis sans aucun worker actif, dont l’essai du lien `https://vm.tiktok.com/ZN8AU4d2n/`. La progression de l’écran avançait artificiellement jusqu’à 99 % même sans événement du serveur. Le délai côté mobile ne couvrait pas toute la préparation.

La fermeture de la requête HTTP entrante était également prise pour une déconnexion ; avec un POST, cet événement arrive dès la lecture du corps. Les tests sur un vrai serveur HTTP reproduisent ce comportement.

## Correctifs

- Le processeur vidéo est partagé entre la file de production et les imports locaux exécutés à la demande. Les tâches planifiées restent désactivées en développement, les anciens jobs ne sont pas relancés.
- Le flux écoute la fermeture de la réponse. Les événements de progression sont filtrés par job ; minuteries et écouteurs sont retirés dans tous les cas.
- L’écran utilise désormais la barre indéterminée continue de `ClassicLoadingView` (`mode="request"`), sans pourcentage qui se fige entre deux étapes. Le libellé suit les événements réels et le résultat apparaît dès sa réception. La préparation est bornée, un nouvel essai annule l’ancien, le départ de l’écran ferme la connexion. Un résultat déjà enregistré n’attend plus une seconde lecture du SDK d’abonnement ou les analytics.
- La connexion POST ne se reconnecte pas automatiquement. Erreurs HTTP, erreurs réseau iOS et erreurs SSE non JSON se terminent proprement.
- Une transcription sans préparation culinaire renvoie `VIDEO_NO_RECIPE` avant les écritures recette/historique/quota. Message traduit dans les langues API ; expiration traduite dans les six langues mobiles.

## Vérifications

Avec une identité de test locale, via la vraie API et les vrais services de téléchargement/transcription/IA :

- `ZN8AU4d2n/` : vidéo de 6 secondes ; transcription sans recette. Message explicite reçu en 11 secondes, sans consommer l’import gratuit.
- `ZN8AUHk3U/` : import effectué ensuite avec la même identité gratuite en 24 secondes, « Poulet crème à la tomate », photo présente, 11 ingrédients et 8 étapes. Les événements `progress`, `done` et la fin du flux ont été reçus.

Tests exécutés :

- API : `yarn node scripts/test-video-import-stream.cjs`, `yarn tsc --noEmit`.
- Mobile : `yarn node scripts/test-video-import.cjs`, `yarn node scripts/test-video-import-screen.cjs`, `yarn test:response-cache`, `yarn tsc --noEmit`.
- ESLint mobile ciblé : aucune erreur, avertissements préexistants dans `services/api.ts`.

Les tests couvrent la requête POST réelle, l’exécution locale sans worker, le chemin production en file, l’isolation des jobs, les erreurs terminales, la classification, les minuteries, l’annulation et les réessais. Le parcours visuel sur l’iPhone physique n’a pas été rejoué dans cette vérification. Aucun déploiement VPS ni build Store n’est effectué.
