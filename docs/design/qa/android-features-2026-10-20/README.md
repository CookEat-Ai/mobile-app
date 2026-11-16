# QA Android — nouvelles fonctions et essai photo d’onboarding

Vérification du **20 octobre 2026** sur émulateur Android 16 / API 36, ARM64, 1080 × 2400, densité 420, interface française et région France. Petit format contrôlé à 900 × 1600, avec taille de texte 1,3. Les réglages de dimensions et de texte sont ensuite restaurés.

Build natif debug distinct `com.gokugen.cookeat.featureqa` (version native 1.7.0), dépendances courantes Expo 57 / React Native 0.86.3, JavaScript du working tree 1.7.2 basé sur `e54785d`. L’app CookEat déjà installée et ses données ont été conservées. Le build QA utilise un identifiant séparé et un support Metro explicite ; les deux fichiers Android temporairement adaptés ont été restaurés à leurs octets initiaux après compilation.

## Données et environnement

Les vues, services et routes de l’app sont utilisés, sans réponses métier simulées. Un profil étudiant **de test** est prérempli pour atteindre les états utiles ; les choix d’équipements/budgets sont aussi exercés dans les vrais formulaires. L’accès de test appartient exclusivement à une base MongoDB jetable, sur loopback (`cookeat_android_qa_20261020`). L’import vidéo utilise un Redis distinct, lié à localhost:6381, sans persistance. Les copies du catalogue viennent uniquement de la base locale, en lecture. Aucune connexion à la production, modification de Store ou publication n’a été effectuée.

La photo d’assiette vient d’une image CookEat déjà possédée, sélectionnée dans la **galerie système Android**. Son analyse IA, ses poids, son classement et ses références sont réels. Le flux caméra vérifié est celui de l’émulateur, avec son motif de test ; ce n’est pas un repas photographié sur appareil physique.

## Résultats fonctionnels observés

| Fonction | Vérification |
|---|---|
| Onboarding principal | Niveau débutant, petit budget, temps court et équipements sélectionnables. Les seuls ustensiles de base excluent les appareils supplémentaires. |
| Semaine principale | Sept jours sélectionnés, 28 repas réellement générés. Continuer ouvre le nouvel essai photo. |
| Essai facultatif | Invitation puis vrai suivi photo ; fermeture revient à l’invitation. Après confirmation, le repas est conservé dans le journal et son bilan apparaît avant Continuer. Plus tard et Continuer rejoignent tous deux le code promo existant. |
| Géométrie de l’invitation | Sur le même émulateur, le bouton principal du preview de semaine et celui de l’invitation occupent les mêmes bornes : x=63…1017, y=2128…2275 pixels. Ils partagent le footer de l’onboarding. |
| Caméra et galerie | Refus puis accord de permission, vraie preview caméra, ouverture du sélecteur de photos et sélection d’une image. Bords de la sheet visibles, consignes contrastées et marque CookEat. |
| Analyse nutritionnelle | Réponse IA reçue, références cuites, sauce laissée inconnue au départ ; estimation partielle et confirmation bloquée tant que la référence manque. |
| Animation et mouvement réduit | Avec les trois échelles d’animation Android à 1, contours et fragments de la photo accompagnent l’ajout des aliments ; le même bilan passe de valeurs vides à 722 puis 750 kcal partielles. Avec les échelles à 0, le bilan final apparaît directement. Aucun faux progrès réseau n’est présenté comme une reconnaissance. |
| Corrections | Pâtes 280 → 260 g, crème légère choisie puis 100 → 40 g. Total confirmé **764,3 kcal, 65 g protéines, 87 g glucides, 15,9 g lipides**. Les quantités sont entières et corrigibles. |
| Attribution et journal | Plat classé dîner par l’image malgré une capture vers 1 h 44. Après redémarrage : un repas, 764 kcal et streak de 1 jour ; onglet Suivi en premier et caméra au milieu de la navigation. |
| Clavier | Défaut observé puis corrigé : le dernier champ de quantité était masqué par le clavier. La fiche mesure désormais l’espace réellement disponible et garde le champ et l’enregistrement accessibles. |
| Mini-onboarding | Ordre objectif → personnes → budget total → jours, puis ingrédients, temps, niveau et équipements. Deux personnes : 60–300 € ; une personne : 30–150 €. Saisie de zéro vérifiée comme invalide. |
| Petit budget, sans ingrédients | **28 repas sur 7 jours**, coût central **26,37 €**, plafond **30 €**, pays FR/devise EUR. Ustensiles de base uniquement, aucun plat au micro-ondes dans le résultat final. |
| Budget maximum, avec ingrédients | Riz, poulet, courgette, avoine, banane et lait sélectionnés dans le vrai garde-manger. Achats complémentaires autorisés. **28 repas**, coût central **30,89 €**, plafond **150 €**, six ingrédients conservés dans les préférences et couverture affichée par plat. |
| Détail d’une recette | Coût par personne, fourchette et hypothèses de prix affichés. Exemple observé : spaghetti à environ 0,67 € par personne dans le planning à 30 €. |
| Chat recette | Réponse réelle sur le caractère facultatif de l’ail ; remplacement réel par de l’oignon. Version personnelle et conversation relues dans le stockage Android. Le service conserve le catalogue et les plannings partagés ; l’isolation et le refus hors périmètre sont également couverts par les tests logiciels. |
| Import de recette | Bouton +, chooser, formulaire et rejet d’un domaine non pris en charge. Tutoriel Android ouvert et carrousel parcouru. Import vidéo réel depuis un lien TikTok : worker terminé, recette « Poulet crémeux aux poivrons » affichée dans l’app. Aucune génération d’image par API. |

## Corrections issues de cette QA

- La fiche nutritionnelle ajuste son espace et son défilement au clavier Android, y compris dans une form sheet qui se déplace sans redimensionner tout son contenu React.
- Une recette de porridge nommait le micro-ondes dans son titre, mais ses étapes disaient seulement « puissance élevée ». Le filtre reprend maintenant cette indication explicite du titre, avec un test de régression et le cas « sans micro-ondes ». La nouvelle semaine avec ustensiles de base ne contient plus cette recette.
- Les exemples du chatbot utilisent un ingrédient de la recette ouverte ; la flèche sur son bouton jaune est blanche.

## Matrice de budgets

Après le correctif d’équipement : **72 scénarios**, **61 semaines complètes**, **11 refus contrôlés**. Les résultats complets et les budgets sont dans [budget-cases.json](budget-cases.json).

Les scénarios couvrent les objectifs de maintien/perte/prise de muscle, budgets de 30 à 150 € pour une personne, garde-manger vide, court en priorité, rempli en strict, foyers de 2/4 personnes, France/États-Unis/Royaume-Uni/Allemagne/Canada, végétarien/végan, matériel de base et micro-ondes. Les semaines produites respectent le plafond central, les objectifs nutritionnels et les contraintes d’équipement/ingrédients vérifiés par le script.

Les refus concernent les listes de six ingrédients en strict, sept ingrédients en strict à 30 €, ou du riz seul. Augmenter le budget ne crée pas les catégories de recettes absentes d’une liste strictement fermée. L’app conserve ces contraintes et affiche l’impossibilité ; elle ne présente pas un menu incomplet comme une semaine réussie. Le budget est une estimation des quantités consommées, hors achat des paquets entiers ; sa fourchette peut dépasser le plafond central.

## Vérifications logicielles

TypeScript API et mobile, lint sans erreur (deux avertissements existants de compteurs d’annulation d’effets), exports Hermes iOS et Android réussis. Tests : onboarding-planning (incluant le nouveau relais vers l’essai photo), journal photo et six langues, préférences de cuisine, configuration du planning, recettes personnelles, photo/catalogue privé, chat, coût des plats, budget, praticité et contrôles éditoriaux.

## Preuves natives

- Onboarding : [invitation](onboarding-invitation-final.png), [repas enregistré](onboarding-saved-final.png), [petit écran avec texte agrandi](small-onboarding-bottom.png).
- Tracking : [vidéo de la reconnaissance progressive](photo-analysis-android.mp4), [début](animated-frame18.png), [deux aliments](animated-frame20.png), [trois aliments](animated-frame22.png), [clavier corrigé](tracking-keyboard-fixed.png), [journal persistant](journal-persisted.png).
- Planning : [semaine à 30 €](mini-plan-result.png), [six ingrédients du garde-manger](pantry-six.png), [semaine à budget maximum](pantry-plan-result.png), [coût du plat](recipe-details.png).
- Recettes : [chat et exemples contextuels](recipe-chat-theme-final.png), [modification personnelle](recipe-chat-modified.png), [tutoriel Android](import-android-tutorial.png), [import vidéo terminé](import-success.png).

Les avis de facturation visibles sur certaines captures concernent le build debug à identifiant séparé. La vidéo couvre une nouvelle analyse non enregistrée ; ses poids estimés peuvent différer de ceux du repas corrigé puis sauvegardé. Les transitions visuelles jouent après réception de l’analyse réelle, et les valeurs progressives additionnent ses aliments référencés.

## Limites

La caméra physique, les achats Play Store et les appareils Android réels ne sont pas validés par cette session. L’émulateur sans service de facturation a produit des notices de débogage RevenueCat ; l’accès aux fonctions à tester a été vérifié avec le rôle local QA. Le partage entrant Android ACTION_SEND n’a pas été déclenché depuis une autre app ; le tutoriel et l’import par lien ont été exercés.

Les PNG de preuve conservent leur flux de pixels et leurs dimensions ; les chunks optionnels de métadonnées ont été retirés. macOS peut conserver son attribut système `com.apple.provenance` malgré `xattr -c` ; il n’est pas embarqué dans les PNG.

Après vérification, le build QA, ses fichiers sur l’émulateur et la base MongoDB jetable ont été supprimés. Metro, API et Redis dédiés ont été arrêtés ; les serveurs locaux déjà présents ont été conservés. Les trois échelles d’animation Android ont retrouvé leur valeur initiale de 0.
