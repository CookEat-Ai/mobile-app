# Prix annuels — QA sandbox du 21 octobre 2026

Les trois achats et les trois restaurations Apple sandbox ont réussi : 49,99 €, 39,99 € et 44,99 €, avec entitlement Pro actif et isSandbox=true. Les six offerings chargent les vrais produits Apple ; chaque annuel expose un essai gratuit de 1 semaine. Le compte actuel est non éligible (statut SDK 1) : les feuilles Apple et le paywall affichent un abonnement payant sans promettre de gratuité. L’utilisateur a choisi de conserver ce compte.

| Prix annuel | Achat Apple sandbox | Restauration | Premium |
|---|---|---|---|
| 49,99 € | Réussi | Réussie | Actif |
| 39,99 € | Réussi | Réussie | Actif |
| 44,99 € | Réussi | Réussie | Actif |

## Portée exacte

Binaire de développement existant 1.7.0 (1), iPhone 15 Pro / iOS 18.7.3, sources JS locales de la branche 1.8.0 servies par une entrée QA temporaire avec dev=false pour exercer la véritable éligibilité SDK. Aucune fixture de prix ni transaction simulée. Aucun nouveau build, OTA ou envoi aux stores. Les tests locaux startup/copy passent également mais ne constituent pas une preuve de transaction.

L’expérience exp46ca5ef93c reste DRAFT, mondiale, configurée à un tiers par prix pour les nouveaux clients >=1.8.0. Les variantes ont été testées par sélection de packages réels et overrides limités au client QA, méthode recommandée par RevenueCat. La répartition aléatoire publique n’a donc pas été exercée. Le SDK a effectivement reçu annual_price_39_in_app puis annual_price_44_in_app en current. Les placements retournent null sous override, et le code produit prévoit le repli offerings.current. L’offre initiale in_app a été rétablie sur ce seul client par override explicite ; le client et ses achats sandbox sont conservés pour audit. Aucun ciblage ni défaut global modifié.

## Limites à ne pas présenter comme validées

- Essai gratuit réellement démarré : compte non éligible, utilisateur souhaite le conserver. Métadonnées de l’essai vérifiées, parcours d’activation à reprendre avec un compte éligible.
- Android : zéro compte Google ; com.android.vending correspond à LicenseChecker.apk, pas au Play Store complet. Achats/restaurations nécessitent un appareil avec Play Store et testeur de licence.
- Prix USD et BRL en exécution, annulation, remboursement et inscription aléatoire : non testés pendant cette session.
- Ce contrôle ne valide pas le prochain binaire de production 1.8.0.

## Avertissement observé

Le SDK natif existant précharge une police d’un ancien paywall hébergé RevenueCat et signale un échec d’enregistrement. Dans ce binaire de développement, le console.error ouvre l’écran rouge. Les transactions et restaurations réussissent malgré cet avertissement. Pour les captures suivantes, seul le banc QA utilise un log handler enregistrant la présence de l’avertissement sans données privées ; aucune suppression des erreurs ajoutée au code produit.

## Preuves

Voir price-sandbox-qa-2026-10-21.json (produits Store réels, événements horodatés, hashes des sources) et price-sandbox-qa/ pour les captures des trois paywalls et des attributions QA. Les feuilles d’achat contenant l’adresse du compte Apple ne sont pas livrées.

Référence : https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile#current-offering
