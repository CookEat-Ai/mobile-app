# Contrôle natif — correction du suivi, 20 octobre 2026

Composants réels rendus sur iPhone 17 Pro, iOS 27.0, français, taille de texte standard, thème existant. Binaire de développement existant, copie isolée `com.gokugen.cookeat.trackingrevisionqa`, entrée Metro temporaire ; les services d’analytics, de session et le routage sont remplacés pour ce contrôle. Aucun compte ou planning de production n’est utilisé.

- [Planning de référence](planning.png) : en-tête réel de `app/(tabs)/index.tsx`, sans profil de test.
- [Mon suivi](tracking.png) : même `AppScreenHeading`, retrait horizontal et safe area, marque/mascotte identiques. Données locales vides.
- [Bilan final](review.png) : résultat nutritionnel déclaré de contrôle ; le bouton Play, les catégories, la proposition au catalogue et le changement de photo ont disparu. Édition des aliments conservée, icône blanche dans son cercle jaune.
- [Capture prête](camera.png) : vrai `MealPhotoCapture`, surface caméra jusqu’aux bords, overlays de marque et commandes, icône blanche sur le déclencheur jaune. L’état d’autorisation est fourni par l’entrée de contrôle ; aucun flux de caméra physique n’est disponible sur ce simulateur, la surface est noire. Prise de photo et galerie réelles non retestées ici.
- [Avant autorisation](permission.png) : marque, explication, activation et alternative galerie restent lisibles et accessibles.

Le type de repas est déterminé à l’heure locale de capture (05–11 h petit déjeuner, 11–15 h déjeuner, 15–18 h collation, sinon dîner). Un repas déjà enregistré conserve sa catégorie et sa date. Les limites horaires sont couvertes par `yarn test:meal-tracking`.

La barre d’état de la route réelle est gérée par les options du Stack natif, comme `app/camera.tsx`. Le composant ne monte pas un gestionnaire global incompatible avec `UIViewControllerBasedStatusBarAppearance`.

Limites : ni Android natif ni caméra physique observés ; pas de claim de validation de l’analyse IA à partir de ces captures. L’entrée de contrôle, ses fichiers, ses serveurs et le simulateur temporaire sont retirés après vérification. Les bundles iOS/Android de l’app complète sont contrôlés séparément.

Les PNG gardent les pixels et les dimensions 1206 × 2622 ; les chunks optionnels ont été retirés. L’attribut système macOS `com.apple.provenance` persiste malgré `xattr -rc`, donc une suppression complète des attributs étendus n’est pas confirmée pour ces captures. Aucune photo de recette n’a été générée pendant cette correction.
