# Troisième prix annuel : 44,99 EUR/USD

Configuration vérifiée le 21 octobre 2026. Le brouillon RevenueCat `exp46ca5ef93c` contient maintenant A = 49,99, B = 39,99 et C = 44,99, avec les emplacements `in_app_paywall`, `onboarding_paywall` et leur fallback. Audience mondiale : nouveaux clients de tous les pays, app >= 1.8.0, 100 % des clients éligibles répartis à parts égales entre les trois variantes. Restriction France/États-Unis retirée le 21 octobre 2026 à la demande de l’utilisateur. Aucun démarrage du test.

Apple : abonnement `6825105207`, `com.gokugen.cookeat.Annual.PriceTest44`, annuel, groupe existant, niveau 1, 175 territoires/prix vérifiés, prix exact 44,99 dans les 134 territoires EUR/USD, équivalents locaux ailleurs, 175 essais gratuits de 7 jours, 9 localisations. État `READY_TO_SUBMIT` vérifié après téléversement de la capture native à 44,99 USD et 7 jours gratuits. Capture Apple `2b384124-bfc3-4d6c-b767-120aab5bff88`, traitement `COMPLETE`, 1206 × 2622, checksum source vérifié. Le composant réel PaywallView a été capturé dans le binaire QA compatible existant sur un simulateur iPhone temporaire ; aucune reconstruction native ni retouche de prix dans l'image. Cette capture de référence ne valide pas un achat ou une restauration Store.

Google Play : `annual_price_test_44:annual`, annuel actif, 175 territoires, offre `trial7d` active pour les utilisateurs n'ayant jamais eu d'abonnement dans l'app. Les 176 lignes tarifaires (y compris groupes futurs) ont été relues ; les 110 lignes EUR/USD sont exactement à 44,99.

RevenueCat : produits `prod4c89fcc807` (Apple) et `prod739467cd19` (Google). Offres `annual_price_44_in_app` (`ofrngd5e72c4dde`) et `annual_price_44_onboarding` (`ofrng684152a532`), dupliquées depuis les variantes à 49,99. Seuls leurs produits annuels ont été remplacés. Offres mensuelle et hebdomadaire conservées ; aucun paywall hébergé attribué, aucun écran mobile modifié. Le test reste en brouillon en attendant la préparation/approbation Apple et la validation achat/restauration en sandbox.

Preuves : `apple-annual44-global-readback.json`, `google-annual44-global-prices.json`, `google-annual44-active.png`, `annual-price-three-variants-draft.png`, `revenuecat-price-experiment.json`.

Aucun build mobile, OTA, envoi en validation Store ou déploiement API effectué. Le serveur Metro temporaire et son proxy ont été arrêtés ; le simulateur démarré pour la capture a été arrêté et le fichier d'entrée QA temporaire a été supprimé.

Capture complétée le 21 octobre 2026 : `apple-annual44-review-screenshot.json` et `annual-44-native-us.png`. Le premier binaire local échouait faute de prise en charge UIScene sur iOS 27 ; le binaire QA existant compatible a permis la capture. Entrée QA et serveurs temporaires retirés après capture. Aucun envoi en validation ni démarrage du test.
