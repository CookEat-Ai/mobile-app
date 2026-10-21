# CookEat 1.8.0 — remise aux stores du 21 octobre 2026

Apple confirme **WAITING_FOR_REVIEW** pour 1.8.0 **(26)** et les trois abonnements annuels 39,99 / 44,99 / 49,99. Soumission `a262465e-a547-4212-bf85-9f5f3e90a7e8`, envoyée à 00:38:53 UTC. Publication **MANUAL** après approbation.

Google Play a enregistré l’envoi pour examen de **1.8.0 (13)** sur Production (177 pays). Les vérifications rapides sont encore en cours ; la console indique que les modifications seront automatiquement transmises à l’examen après ces contrôles. **Publication gérée activée**, aucun déploiement public lancé. Preuve : `google-build13-review.png`.

API **1.10.4** déployée, commit `dac5e50d7e7a61c31d585f2eaa4cdcc7456982fa`. Santé HTTP 200 ; import vidéo réel en production et accès Premium révocable des validateurs vérifiés. Aucun secret de validation dans ces documents.

Source des deux binaires : `c8f79d887a13b4da20dc5fa88ce8544e93afd336`, branche `release/photo-tracking-1.8.0`. Les commits de documentation ultérieurs ne modifient pas les binaires remis. Détails EAS, empreintes et identifiants dans `release-delivery-2026-10-21.json`.

Contrôles : Expo Doctor 21/21, TypeScript, exports iOS/Android, 58 tests mobiles ; lint sans erreur (58 avertissements existants). Batterie API complète passée, dont 32 semaines strictes / 640 repas et 72 semaines par objectifs / 504 jours. Android : mise à niveau 12→13, lancement et logs sans erreur fatale sur APK dérivé du bundle final. Sentry : envois des sources JS par debug ID et symboles natifs vérifiés.

Limites : le nouvel iOS26 n’a pas été réinstallé depuis TestFlight ; l’utilisateur a explicitement demandé l’envoi avec les contrôles existants. Achats/restaurations sandbox iOS des trois prix validés auparavant sur un binaire de développement physique. Essai gratuit non exercé (compte inéligible conservé à la demande de l’utilisateur). Achats sandbox Google Play non exercés. Aucun nouvel événement Sentry démanglé émis pour ce build.

Le test RevenueCat mondial reste **DRAFT**, allocation 1/3 par prix pour les nouveaux clients, même paywall natif. Aucun recrutement public activé pendant cette remise aux stores.
