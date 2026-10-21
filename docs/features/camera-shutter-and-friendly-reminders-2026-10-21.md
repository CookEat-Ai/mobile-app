# Bouton photo et textes de capture — 21 octobre 2026

- `CameraShutterButton` centralise le bouton du suivi : diamètre 78, contour blanc de 5, fond orange et icône caméra blanche de 32. Les captures de repas et d’ingrédients/frigo utilisent le même composant, avec désactivation pendant la capture et à la limite de 30 photos pour le frigo. Le mode vidéo conserve son contrôle d’enregistrement.
- La phrase sur le recalcul automatique des calories/macros est retirée du dialogue d’aide à la capture, dans les six traductions. Les conseils de cadrage et de vérification des aliments restent présents.
- Les rappels repas actifs reçoivent trois titres plus chaleureux dans les cinq langues API. Horaires locaux conservés (10 h / 14 h / 20 h), corps et liens inchangés. API 1.10.5, commit e80035a ; déployée en production après accord explicite de l’utilisateur. Conteneur `cookeat-api-prod:1.10.5` actif, zéro redémarrage spontané ; version et titres français relus dans le conteneur, santé locale et publique confirmée (`HTTP 200`, `status: ok`). Image précédente 1.10.4 conservée. Aucun changement de base de données ni envoi manuel de notification.

Validation : TypeScript mobile et API passés ; lint ciblé sans erreur (trois avertissements préexistants dans camera.tsx) ; tests existants de capture et de scan passés ; JSON de notifications vérifié avec exactement trois titres changés par langue et conservation de tous les autres champs. Le mock de la caméra dans le test existant suit le nouveau bouton partagé. Les caméras intégrées natives n’ont pas été revérifiées sur appareil pour ce changement.

Aucun nouveau build mobile ni envoi aux stores pour cette modification.
