CookEat 1.8.1 rassemble tous les changements mobiles locaux : scanner photo progressif, suivi de l’eau, saisie et correction des repas, rappels, onboarding, cohérence visuelle et identité analytics/abonnements.

Source binaire : c364a74c01f56df0fe73b204427aa626804a724f, poussé et vérifié sur main et release/mobile-1.8.1-20261103. Le checkout de développement initial est préservé. L’API et son déploiement restent inchangés, conformément à la demande explicite de l’utilisateur.

iOS : 1.8.1 (27), EAS 8550aac0-60b3-41ed-860b-0d1d5ddb551f, archive signée inspectée (identifiant, version, build, runtime), chargée et traitée VALID par Apple. Build 7bc91c7a-9672-4f0a-a9c6-1aa909dce2c3 joint à la version 1be33f57-8006-4900-8a14-657030d988e3. Validation Store : aucune erreur bloquante ; sept recommandations facultatives d’images promotionnelles d’abonnements. Publication MANUAL.

Android : 1.8.1 (14), EAS c10ae577-a420-4af9-aa7f-2fb04b1d0bcc, encore IN_QUEUE au dernier contrôle. Le brouillon Google Play existant est conservé ; notes de version enregistrées pour les neuf locales. Publication gérée conservée.

Contrôles : TypeScript valide, Expo Doctor 21/21, 61 scripts de régression valides, lint sans erreur (57 avertissements), exports Metro production iOS et Android réussis. Le suivi d’eau passe aussi les vérifications de concurrence, plancher zéro, persistance et séparation des utilisateurs. Les journaux Xcode confirment l’envoi des source maps et des symboles Sentry. Support, confidentialité et conditions en français/anglais répondent HTTP 200.

Limites : parcours natif complet et accès de review non retestés sur le nouveau binaire, faute d’interactions fonctionnelles dans Device Hub ; achats/restaurations réels non retestés ; aucun nouvel événement Sentry de production émis. Le code privé de review demeure uniquement dans les champs protégés Apple et expire le 20 novembre 2026. L’accord utilisateur pour soumettre avec ces limites est demandé dans le chat ; aucune soumission App Review ni publication publique effectuée.

Les captures Store déjà préparées et les réglages des expériences restent conservés. Seuls les ensembles iPhone 6,5 pouces vides hérités ont été supprimés après vérification des ensembles iPhone/iPad complets. Les titres, mots-clés, prix, territoires et langues n’ont pas été changés par cette release.
