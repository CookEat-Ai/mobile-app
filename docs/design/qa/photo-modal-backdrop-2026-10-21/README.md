# Prise de photo : fond fixe pendant l’ouverture

La route transparente ne déplace plus le fond avec le panneau. Elle utilise `PHOTO_CAPTURE_ROUTE_OPTIONS` sans animation native ; `TrackingCaptureSurface` présente le panneau dans `AppModal`. Son fond animé en opacité reste un frère du panneau mobile. L’agrandissement vers le bilan conserve les angles arrondis et la fermeture attend `onDismiss` avant de quitter ou remplacer la route.

## Vérification native Android

Android 16 / API 36, 1080 × 2400 : ouverture, fermeture par la croix, bouton Retour matériel et réouverture observés. La vidéo montre le panneau à plusieurs positions pendant la montée alors que le pixel de contrôle dans le fond reste identique `(165, 164, 149)` dès la présentation du fond. Aucun rectangle de fond ne remonte au-dessus du panneau.

- [Ouverture en cours](android-opening.png)
- [Caméra ouverte](android-camera.png)
- [Enregistrement de la transition](android-opening.mp4)

Cette prévisualisation native réutilise les composants de production `TrackingCaptureSurface`, `AppModal` et `MealPhotoCapture` avec les options de la vraie route. Le flux caméra est remplacé par une surface neutre. Aucun appel d’analyse, nouvelle photo, achat ou sauvegarde réseau n’est exécuté. iOS n’est pas déclaré vérifié visuellement ici.

Tests : modalité commune et fond personnalisé fixe, branchement de la vraie route, fermeture différée sans double navigation, passage à la saisie manuelle, analyse/corrections/autosauvegarde et animations de résultat ; TypeScript et système visuel réussis.

La prévisualisation temporaire est retirée ; le serveur Metro utilisateur sur 8081 est conservé. Aucun build Store n’est créé.
