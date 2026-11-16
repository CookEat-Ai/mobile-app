# Test Android — CookEat 1.7.0 — 5 octobre 2026

Résultat : principaux parcours utilisables sur émulateur, mais validation complète de la release non acquise. La précision protéique reste insuffisante dans les scénarios testés ; achats Google Play et caméra physique non vérifiés.

## Environnement et isolation

Pixel 3 émulé, Android 12/API 31, arm64, application native debug 1.7.0 (versionCode 1), Expo 57/RN 0.86.3. Pilotage ADB et environnement d’abonnement fictif local explicitement autorisés par l’utilisateur. Profil Android QA séparé (utilisateur 10) ; données du profil original conservées.

Première partie : onboarding, scan du frigo et génération avec l’API 1.7 (`https://cookeat.info/testflight/api`, 1.9.2). Deuxième partie : API locale port 8085 et base `cookeat_android_qa_20261005`, catalogue copié sans comptes utilisateurs, tâches de fond désactivées. Accès premium fictif accordé uniquement au compte local via la configuration locale existante. Aucune modification de droits RevenueCat ni déploiement de production.

Les photos capturées par la caméra virtuelle sont noires malgré un aperçu correct. Pour tester la vraie chaîne de scan, deux fichiers capturés ont été remplacés dans le cache QA par la photo de frigo fournie par l’utilisateur. L’application a effectué le redimensionnement, l’envoi et l’analyse API habituels. Ce test ne valide pas la capture sur caméra physique. Les deux photos de test ont le même contenu.

## Parcours exécutés

| Parcours | Résultat et preuve |
| --- | --- |
| Compilation native Android | Réussie après correction de l’autolinking AppsFlyer ; initialisation SDK réussie. |
| Onboarding complet | Profil maintien, homme, 30 ans, 175 cm, 75 kg, activité légère, entraînement deux fois/semaine, végétarien, cuisine méditerranéenne ; recap cohérent, cible 2 700 kcal / 98 g protéines. Pas de demande de note observée dans l’onboarding. |
| Planning et jours choisis | Semaine courante 5–11 octobre ; lundi/mardi choisis ; choix conservé après ouverture/fermeture de la caméra après correction. |
| Garde-manger | Ajout écrit de tofu : fermeture immédiate de la modale ; classement par catégorie ; ajout de riz depuis le bouton + de catégorie ; retour au planning. |
| Permissions caméra | Refus traité ; possibilité de passer sans image ; après autorisation dans les réglages Android, retour immédiat à la caméra après correction. |
| Scan normal | Deux photos, deck visible, photo fournie reconnue ; catégories et ingrédients affichés ; Terminer revient au planning sans génération immédiate. |
| Génération normale | Barre de chargement puis huit repas pour deux jours, collation incluse. Aucun écran intermédiaire « Ta semaine prend forme ». |
| Mode présentation | Sept appuis sur Réglages ouvrent le code en dev ; activation et désactivation réussies. Scan → grandes photos tournantes avec compteur → planning, sans récapitulatif ni choix intermédiaire. |
| Filtre personnes | Contrôle en bas avant ingrédients à exclure ; choix de deux personnes puis scan/génération ; recettes du planning affichées pour deux portions. |
| Animation/rejeu | Rejeu place les jours en haut de la zone visible, sans montrer tout le header. |
| Modifier | Icône crayon, action au-dessus de Régénérer ; suppression d’un repas avec confirmation, emplacement vide à sa place, enregistrement. |
| Ajout depuis Repas | L’emplacement vide lundi/petit-déjeuner proposé ; ajout réussi. Collation proposée parmi les emplacements compatibles avec le petit-déjeuner. |
| Portions par planning | Passage à deux, fermeture et réouverture depuis le planning : deux conservées ; quantités doublées, nutrition par personne conservée. |
| Portions de bibliothèque | Recette réglée à deux puis rouverte depuis Repas : retour à une personne. |
| Courses | Un ingrédient coché devient barré ; compteur 3/30 → 4/30. Pas de section repliable « Déjà chez toi » ; aliments disponibles intégrés aux lignes cochées. |
| Objectif/poids | Saisie de 74,8 kg, sauvegarde et graphique actualisés ; cibles d’apports conservées. |
| Langue | Passage anglais → français ; planning, réglages et configuration traduits. |
| Redémarrage | Planning, semaine courante, préférences et accès QA local conservés après force-stop et relancement. |
| Erreur réseau | API locale arrêtée volontairement : bannière d’indisponibilité et erreur réseau du scan ; photo conservée, processus mobile vivant, aucun AndroidRuntime fatal. API redémarrée : nouvel essai d’analyse réussi. |
| Paywall indisponible | Google Play Billing indisponible : écran explicite, Réessayer et sortie sans abonnement ; aucun crash natif. Prix, achat et restauration effective non validés. |
| Historique et jours passés | Tests automatisés réussis ; modification d’un jour passé non exécutée dans l’interface native (test réalisé le lundi). |

## Corrections réalisées pendant le test

- `react-native.config.js` : qualification du second package AppsFlyer ; compilation Android réparée.
- `app/camera.tsx` : rafraîchissement des permissions au retour au premier plan ; demande système tant qu’Android autorise à redemander, réglages uniquement sinon.
- `app/onboarding/weeklyPlanPreview.tsx` : retour caméra/garde-manger ne réinitialise plus les jours choisis pendant la session.
- `app/planning/configure.tsx` : compteur inclut la collation (8 repas pour deux jours, au lieu de 6), vérifié dans l’interface en français.

Ces modifications sont locales et ne font pas partie du build iOS 17 déjà soumis.

## Défauts ouverts

1. **Objectif protéique insuffisamment respecté.** Pour la cible 98 g, journées initiales 129 g (+32 %) et 122 g (+24 %), malgré 2 695/2 700 kcal. Autre génération locale : 117 g et 132 g. Ne pas confondre réussite de génération avec précision nutritionnelle. Le raffinement actuel cherche calories et protéines, mais peut rester dans un minimum local ; les planchers de protéines et restrictions du catalogue réduisent aussi les candidats. Hypothèse technique à confirmer par reproduction ciblée avec le catalogue réel.
2. **Répartition calorique parfois concentrée.** Exemples : petit-déjeuner à 1 092 kcal, dîner à 1 261 kcal par personne. Quantités/portionScale et répartition par repas à réévaluer avec le défaut ci-dessus ; pas de conclusion médicale tirée du test.
3. **Qualité de certains titres anglais.** Exemples observés « Boullgur with pears and squash seeds », « Peanut-banana tarts and crisp seeds » pour des tartines. Localisation du catalogue à reprendre.
4. **Messages API parfois français en interface anglaise.** Erreur d’accès premium française observée dans le preview avant activation locale.

## Vérifications techniques

Compilation Android réussie (703 tâches, dernier build 38 s). `yarn tsc --noEmit` réussi après les changements. Tests réussis : planning organization/display, planned meal navigation, planning loading, presentation mode trigger, presentation scan, media upload et planning pantry. Journaux AndroidRuntime sans erreur fatale lors du contrôle final. Les erreurs RevenueCat attendues pour Billing indisponible apparaissent dans LogBox en développement ; elles ne constituent pas un crash natif.

## Captures

- `nutrition-estimate.png`, `scan-fridge-deck.png`, `scan-ingredients.png`, `days-preserved.png`, `weekly-preview.png` : onboarding et scan initial.
- `presentation-analysis.png` : grandes photos/deck du mode présentation.
- `planning-two-people.png` : recette issue du planning pour deux personnes.
- `network-error.png` : erreur contrôlée lorsque l’API locale est arrêtée.
- `configure-eight-meals.png` : compteur corrigé et configuration en français.

Le paiement Play Store, la restauration d’un achat réel, la caméra matérielle, la galerie, les notifications système, le partage externe et le rendu sur d’autres tailles d’écran restent à vérifier. Aucun achat réel n’a été effectué.

Nettoyage : serveurs API/Metro dédiés au test arrêtés ; profil Android original réactivé puis émulateur fermé. La base et le profil QA séparés sont conservés pour reproduire les défauts ; l’accès fictif reste limité à cette API locale. Le Metro iOS existant et l’API locale habituelle n’ont pas été arrêtés.
