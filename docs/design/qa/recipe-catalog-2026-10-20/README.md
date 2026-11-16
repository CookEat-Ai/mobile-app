# Contrôle de la fiche recette et des crédits

Contrôle natif du code de travail configuré en version 1.7.2, Expo 57 / React Native 0.86.3. Builds locaux : `com.gokugen.cookeat.trackingrevisionqa` sur iOS et `com.gokugen.cookeat` sur Android. Les vrais écrans ont été montés avec une recette du catalogue local et des fixtures pour la navigation, les lectures API et l’abonnement. La vérification porte sur le rendu des écrans ; les services réels ont été contrôlés séparément côté catalogue.

Appareils observés en français : iPhone 17 Pro, iPad Pro 11 pouces en portrait, Android API 36 en 1080 × 2400. Android a également été observé avec une taille de texte de 1,3, puis restauré à 1,0. Les simulateurs et serveurs temporaires ont été arrêtés ; le Metro habituel sur 8081 et l’API locale sont conservés.

Les deux rangées utilisent `RecipeMetricCard` : même hauteur de 144 points à taille de texte normale, mêmes colonnes, même surface, mêmes espacements et zone de valeur commune. La carte du chatbot précède directement la section des ingrédients. Le budget conserve sa place avant les calories lorsqu’il est fourni.

`metric-bounds.json` mesure les surfaces blanches dans les captures natives à taille de texte normale. Les six cartes ont une hauteur identique et les colonnes sont exactement alignées sur les trois appareils. L’écart de largeur est nul sur téléphone et Android ; il atteint un pixel sur iPad, lié à la répartition des sous-pixels.

Captures : `iphone-recipe.png`, `ipad-recipe.png`, `android-recipe.png`, `android-recipe-ingredients.png`, `android-recipe-large-text.png`, `ipad-credits.png`. Le texte agrandi a reçu un contrôle visuel ; les mesures des six cartes concernent la taille de texte normale. Les métadonnées intégrées des captures ont été nettoyées.

Validations : TypeScript API/mobile ; lint des composants modifiés sans erreur (avertissements existants de la fiche) ; tests de chargement, recettes personnelles, interactions du chatbot, cache des repas, cache des réponses et système visuel ; contrôles du catalogue et de sa republication ; `git diff --check`. Les éléments temporaires de QA ont été retirés du projet.
