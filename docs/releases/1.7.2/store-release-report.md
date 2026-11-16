# CookEat 1.7.2 — soumission du 14 octobre 2026

Apple : **en attente de validation**, build **23**. Soumission `d3ff41f9-92d2-4064-94c5-c150d4a82d59`, envoyée le 14 octobre à 02:29 UTC. Publication **manuelle** après approbation.

Google Play : version **1.7.2 (10)** de production transmise avec les déclarations de confidentialité et de santé corrigées. Les vérifications automatiques sont terminées et la Console confirme « Vos modifications sont en cours d’examen ». Publication gérée activée : la mise à jour sera publiée manuellement après approbation. Les pays existants sont conservés ; aucun nouveau marché n’a été ajouté.

L’API **1.9.8** est en production et répond HTTP 200 à `/api/health`. La correction du catalogue publiée en 1.9.7 reste appliquée : 1 625 recettes, 770 cuisines reclassées en International et 181 titres corrigés, avec chevauchement de 166 recettes. Les identifiants et données nutritionnelles restent conservés.

## Sources et artefacts

| Composant | Branche et commit | Artefact final |
|---|---|---|
| Mobile | `release/light-meals-1.7.1` · `6ab28c3f0d8e25a18efdd0d4e3f2342483b1596d` | iOS 23 / Android 10 |
| API | `release/light-meals-1.9.3` · `4f66f848f23f9f48eb2ec1c53127ff333b123f51` | `cookeat-api-prod:1.9.8` |

Remotes vérifiés : `git@github.com:CookEat-Ai/mobile-app.git` et `git@github.com:CookEat-Ai/api.git`. Aucun push forcé. Les autres modifications de travail ont été conservées.

- [Build EAS iOS 23](https://expo.dev/accounts/gokugen/projects/cookeat/builds/570dc2a6-e7e2-4e52-8927-bce0a616effc) — runtime `0b8c1bce3abe6ebfef797d50bdab8c412b5a1a61`.
- [Build EAS Android 10](https://expo.dev/accounts/gokugen/projects/cookeat/builds/a65f3c58-c8d7-432e-bca4-f5c9eb616e8c) — runtime `6e0f6c6ec60e2e0714518b86aa410c3121d7291b`.

Les builds iOS 22 et Android 9 ont été remplacés avant soumission. Android 10 bloque l’autorisation `ACTIVITY_RECOGNITION` héritée du SDK et inutilisée par CookEat ; il ne contient aucune autorisation de service de premier plan. Le texte annonçant une semaine lundi–dimanche a été corrigé dans les six langues pour décrire les sept prochains jours. La signature Android finale correspond à la clé d’upload EAS existante.

## Vérifications effectuées

Installation Yarn figée, TypeScript, 36 scripts de tests, exports Metro iOS/Android, `git diff --check` et Expo Doctor **21/21** réussis. Lint : zéro erreur, 55 avertissements préexistants. Les tests de l’API et les contrôles de production ont réussi.

Sur une installation Android neuve issue du véritable AAB 9 : parcours d’onboarding, génération réelle des deux jours choisis, affichage des repas et liste du planning, accès reviewer, permission de notifications refusée, gestion de l’absence des offres Store, jours exclus grisés dans l’éditeur. Après mise à jour vers l’APK dérivé de l’AAB final 10, le planning et l’accès sont conservés. Les APK de QA sont resignés uniquement pour l’émulateur ; les AAB transmis à Google gardent leur signature de production.

Les cartes de débogage JavaScript des deux artefacts finaux correspondent aux identifiants présents dans les binaires. Deux événements informatifs de contrôle, sans plantage réel ni données utilisateur, ont été déminifiés par Sentry sans erreur : iOS vers `FileReader.js:34`, Android vers `WebSocket.js:325`. Les justificatifs sont dans les fichiers `sentry-*-smoke.json`.

## Déclarations et accès de validation

Apple : 14 catégories de confidentialité publiées, dont localisation approximative issue d’AppsFlyer, performances et autre contenu utilisateur. Les neuf localisations et les captures approuvées existantes sont conservées ; les nouveautés ont été mises à jour dans les neuf langues Store. Validation CLI : aucune erreur bloquante ; quatre recommandations non bloquantes d’images promotionnelles d’abonnements.

Google : URL de confidentialité publique, suppression de compte, collecte des données réellement transmises et déclaration nutrition/activité physique corrigées. L’ancienne alerte de conformité reste affichée pendant l’examen des déclarations corrigées. Le nouveau bundle présente zéro erreur bloquante ; avertissements sur sa taille et l’absence de fichier ProGuard. La fiche et les pays existants n’ont pas été étendus.

Depuis la correction du 14 octobre 2026 à 02:43 UTC, les notes Apple décrivent uniquement le parcours normal d’achat et de restauration via le **sandbox App Review**. Le code et toute mention du bypass ont été retirés, puis la modification relue dans App Store Connect. Consigne permanente de l’utilisateur : ne jamais mentionner le bypass du paywall dans les métadonnées publiques ni dans les notes protégées Apple.

Les instructions privées **Google Play uniquement** conservent le code d’accès complet existant de l’API sans expiration, à saisir sur l’écran du code promotionnel. Google exige un accès gratuit aux fonctions protégées pour son équipe de validation. Nos testeurs de licence peuvent, eux, utiliser les paiements de test Google Play. L’API et le parcours natif confirment l’accès aux fonctions du profil courant sans droits d’administration. Aucun code, token ou secret ne figure dans ce rapport ni dans les justificatifs.

URLs publiques vérifiées : https://cookeat.info/privacy/en, https://cookeat.info/privacy/fr, https://cookeat.info/support/en et https://cookeat.info/delete-account/fr. Les variantes déjà publiées restent conservées.

## Limites et publication

Le contrôle de remboursement est **PASS WITH PREREQUISITES**. Les achats/restaurations réels via Google Play Billing et le sandbox iOS n’ont pas été retestés : l’émulateur ne contient pas le Play Store et aucun appareil iOS physique n’était disponible. Les flux d’éligibilité/offres inconnues ont été vérifiés dans les tests et le comportement d’erreur sur Android a été observé. Un test sandbox sur appareil Store reste à faire avant publication publique manuelle. Aucun budget d’acquisition n’a été augmenté. Aucun crash natif volontaire n’a été provoqué.

Les captures de preuve ont été nettoyées de leurs métadonnées incorporées en conservant les pixels. macOS conserve son attribut système de provenance malgré la suppression demandée ; l’archive `proofs.zip` contient uniquement les images nettoyées, sans attributs de fichiers ni champs supplémentaires. La capture de l’éditeur provient du build QA 9 ; celle du planning montre la mise à jour finale 10.

Retour arrière API : image 1.9.7 et configuration sauvegardées dans `/root/cookeat-store-release-20261014/`. La version Store 1.7.2 n’est pas encore publiée au public.

## Alignement des prix Google Play sur Apple

Terminé et relu dans Google Play le 14 octobre 2026 à 08:29 UTC. Les huit abonnements sont enregistrés : **1 016 prix exacts et 240 conversions**, soit 157 pays par produit. Les références sont les prix effectifs App Store Connect de 8 produits et 175 territoires Apple. Les 30 conversions par produit ont été expressément autorisées par l’utilisateur.

| Produit Google | Prix France identique à Apple | Vérification après réouverture |
|---|---:|---|
| `weekly` | 7,99 € / semaine | 127 prix exacts + 30 conversions |
| `monthly` | 12,99 € / mois | 127 prix exacts + 30 conversions |
| `annual` | 49,99 € / an | 127 prix exacts + 30 conversions |
| `annual_discount` | 29,99 € / an | 127 prix exacts + 30 conversions |
| `annual_discount_15` | 37,99 € / an | 127 prix exacts + 30 conversions |
| `annual_discount_20` | 35,99 € / an | 127 prix exacts + 30 conversions |
| `annual_discount_25` | 33,49 € / an | 127 prix exacts + 30 conversions |
| `annual_discount_80` | 30,99 € / an | 127 prix exacts + 30 conversions |

Les conversions utilisent l’outil officiel Google « Set prices ». Le montant Apple est corrigé de la TVA incluse par Google pour éviter de l’ajouter deux fois, puis Google convertit et applique son arrondi local. Le contrôle indépendant compare chaque référence Apple, base de conversion, devise et montant enregistré. Une réouverture des huit forfaits confirme la persistance de tous les prix.

Les 17 pays Google sans référence Apple et les prix par défaut des nouveaux pays sont conservés, vérification pays par pays effectuée. Les nouveaux tarifs s’appliquent aux nouveaux abonnements ; les abonnés existants ne sont pas migrés. Aucun ancien forfait désactivé, pays de disponibilité ni phase d’essai gratuit n’a été modifié. Les prix Apple sont conservés.

Les justificatifs sont dans `store-price-alignment-final-verification.json`, les huit fichiers `google-*-prices-live-verified.json` et les huit fichiers `google-*-conversions-validated.json`. La capture `google-annual_discount_80-fr-price.jpg` montre le dernier forfait enregistré à 30,99 €. `price-proofs.zip` rassemble les captures de prix nettoyées. Les références et le plan sont dans `apple-reference-prices.json` et `store-price-alignment-plan.csv`.
