# Coins de cadrage des caméras — 21 octobre 2026

Le composant partagé `components/CameraFramingGuide.tsx` dessine quatre angles orange avec des arcs et des extrémités arrondis. Il utilise la couleur du thème, une épaisseur de 3, des segments de 32 et le rayon `AppRadii.control` (16). Il est décoratif, exclu des lecteurs d’écran et ne reçoit aucun geste.

Intégrations : capture de repas (`MealPhotoCapture`), caméra photo des ingrédients / frigo (`app/camera.tsx`), analyse du frigo (`PantryScanView`). Les prises de photo gardent le cadrage 8 % de côté et 30 % en haut/bas ; l’analyse conserve son retrait de 12. Les caméras photo utilisent le même guide, et le mode vidéo ne reçoit pas ce repère.

Validation : TypeScript sans erreur ; ESLint sur les quatre fichiers sans erreur (trois avertissements préexistants dans camera.tsx) ; tests existants de scan du frigo et capture de repas passés. Contrôle visuel du composant réel via React Native Web et des adaptateurs SVG DOM : quatre courbes et quatre orientations conformes, aux dimensions de téléphone et en plein cadre.

La caméra native et les parcours intégrés sur iOS / Android ne sont pas revérifiés par cet aperçu. Le simulateur iOS consulté n’avait pas de binaire CookEat installé ; il a été refermé. Aucun nouveau build ou envoi aux stores n’est réalisé pour cette modification.
