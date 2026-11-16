# Tracker, chat et budgets — corrections du 20 octobre 2026

## Changements

- Caméra tracker : disparition du titre et de la marque dans la modale ; fermeture et bouton « ? » ouvrant une explication native, comme dans la caméra d’ingrédients.
- Bilan : grande photo centrée en couverture, occupant toute la largeur de la sheet, sans cadre intérieur. Les coordonnées des aliments suivent le même recadrage. La photo reste présente au résultat. Le header et la reconnaissance restent hors du défilement ; les insets automatiques iOS ne les recouvrent plus.
- Nouveau chat du bilan : questions ou corrections de reconnaissance/quantités, puis recalcul à partir des références alimentaires du serveur. Une question seule ne modifie pas le repas. Les aliments inconnus restent inconnus et empêchent une confirmation avec de faux totaux. Les modifications sont appliquées au bilan en cours ; l’enregistrement reste explicite.
- Chat partagé : fond blanc, bulles utilisateur jaunes et bulles IA grises, champ fixé au-dessus du clavier, message utilisateur immédiat, trois points animés et mouvement réduit, erreur conservant la conversation et relance sans doubler le message. Suppression des mentions de version personnelle ; le stockage et l’isolation existants sont conservés.
- Confirmation courte : « oui » ou un choix de préparation peut confirmer une correction déjà demandée après une clarification. Une affirmation isolée ou une question nutritionnelle n’autorise pas une modification.
- Budgets : carte dédiée semaine/plat, montant principal, plafond, jauge, marge estimée, fourchette et pays/devise ; détails de calcul dépliables. Les petits prix de cartes repas utilisent une pastille. Aucun calcul de prix n’est modifié.
- Palette des macros partagée avec le planning : protéines corail, glucides verts, lipides bleus ; calories jaunes dans les jauges, texte sombre sur carte blanche. Jour sélectionné entièrement blanc sur fond jaune. Objectif ouvre une route de pile réutilisant la vue existante et son retour au suivi.

## Vérifications observées

Les composants de production ont été montés dans un harnais natif temporaire avec données de test et routeur isolé. Les appels du chat utilisaient les vrais services IA et les vraies références sur un serveur loopback sans base de données. Les réponses métier n’étaient pas simulées. Les états d’analyse photo utilisaient une réponse de test déjà obtenue ; aucune nouvelle reconnaissance de photo n’est revendiquée dans cette session.

Sur le simulateur iPhone 18 Pro / iOS 27.0, 402 × 874 points :

- [Clavier de recette](ios-chat-keyboard-fixed.png) : champ et envoi à y=486…534, clavier à partir d’environ y=546. Le défaut d’origine a été reproduit puis corrigé.
- [Message immédiat et trois points](ios-chat-typing.png), puis [réponse réelle](ios-chat-answer.png).
- [Photo et bilan](ios-nutrition-final.png), [entrée du nouveau chat](ios-photo-chat-entry.png), [clavier du chat nutritionnel](ios-tracking-chat-keyboard.png) et [clarification réelle sur poids cuit/sec](ios-tracking-chat-answer.png).
- [Carte budget](ios-budget.png), [aide caméra](ios-camera-help-dialog.png), [jour sélectionné et palette](ios-tracking-home.png), [vue Objectif ouverte](ios-goal-pushed.png).

Sur Android 16 / API 36, ARM64, 1080 × 2400 : [grande photo en attente](android-photo-waiting.png) et [bilan partiel](android-photo-result.png). Le build debug distinct `com.gokugen.cookeat.featureqa` a compilé. Le premier harnais restait couvert par son splash après redémarrage ; un harnais minimal a ensuite permis de vérifier le vrai composant partagé [ChatSheet avec clavier ouvert](android-chat-keyboard.png) : champ et envoi à y=1359…1485 pixels, au-dessus du clavier (à partir d’environ 1515 pixels). Le message et le champ sont lisibles. Ce dernier contrôle isole la présentation : sa réponse différée est une donnée de test, tandis que les appels IA réels ont été exercés séparément et sur iOS.

Les captures de caméra iOS montrent le mode sans caméra du simulateur ; le capteur physique n’a pas été retesté. La navigation de test utilise le composant Objectif réel ; le branchement de production est `/tracking/goal`, dans la pile Expo Router, avec le même écran et retour.

## Résultats IA et tests

Une demande réelle « pâtes à 200 g et sauce à 40 g de crème légère » donne `modify`, conserve le poulet à 130 g et les champignons à 100 g, conserve les références cuites et produit **636,5 kcal / 55,3 g protéines / 68,5 g glucides / 14,6 g lipides**. Voir [résultat](tracking-live.json). Une confirmation « cuites » après demande de 200 g et clarification applique bien 200 g de pâtes cuites, en conservant la sauce non résolue : [confirmation](confirmation-live.json).

Tests logiciels : journal et six langues, recettes personnelles, interactions des deux chats (envoi optimiste, double clic, panne, relance, question sans changement, correction appliquée), service de chat nutritionnel (références, inconnus, bornes, ids, poids entiers, refus), chat recette et confirmations courtes, workflow photo. TypeScript mobile/API, lint et exports Hermes iOS/Android sont vérifiés séparément.

Aucune production, publication ou base de données n’a été modifiée. Les adaptations natives et le fichier Metro ont été restaurés ; le harnais, ses serveurs et le build Android séparé sont retirés après tests. Les PNG conservent pixels et dimensions, avec suppression des chunks optionnels. L’attribut macOS système `com.apple.provenance` peut persister hors du fichier.
