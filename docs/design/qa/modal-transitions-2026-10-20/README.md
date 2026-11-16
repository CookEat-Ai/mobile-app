# Profil, modales et budget

Le séparateur après Feedback dépend désormais de la même condition que la ligne Code promo : aucune ligne suivante, aucun séparateur. Les prix conservent leur devise monétaire et leur caractère estimatif, mais les codes pays/devise et la date du modèle de prix ne sont plus affichés. La note courte est traduite dans les six langues.

## Présentation commune

Les 20 fichiers qui présentaient des modales locales passent par `AppModal`. Le composant impose l’ouverture native depuis le bas, sauf réduction des animations. Les routes modales utilisent la même direction via `MODAL_ROUTE_ANIMATION`, y compris le paywall de référence et la capture photo. Les hauteurs restent adaptées au contenu.

Les ressorts et translations supplémentaires du profil, des filtres d’ingrédients et de l’ajout par catégorie sont retirés. Les enchaînements attendent la fermeture avant d’ouvrir la suite ; `AppModal` adapte `onDismiss` pour Android, où React Native ne fournit pas l’événement iOS. L’import par lien est ancré en bas et peut défiler lorsque le clavier réduit la place disponible.

Référence technique : [React Native Modal](https://reactnative.dev/docs/modal), et implémentation installée de `react-native/Libraries/Modal/Modal.js`.

## Vérifications

- TypeScript : réussi. ESLint des fichiers concernés : aucune erreur ; avertissements existants conservés.
- Tests : cycle de fermeture iOS/Android, fermeture répétée, réouverture rapide, réduction des animations, chatbot, reconnaissance photo, capture, organisation du planning, scan du garde-manger, système visuel et copie des offres.
- Import par lien : lien invalide rejeté ; fermeture avant navigation ; double validation et double événement de fermeture sans double navigation ; paramètres d’onboarding et de planning préservés.
- Prévisualisation native isolée des vrais composants : iPhone 17 Pro / iOS 27 et Android 16 / API 36. Le statut d’abonnement, les achats et les analytics sont simulés ; aucun achat ou import réseau n’a été effectué.
- [Profil iOS](ios-profile.png) : la carte finit sous Feedback. [Chat iOS](ios-chat.png), [ingrédients iOS](ios-pantry.png), [import iOS](ios-import-link.png).
- [Chat Android](android-chat.png), [clavier du chat](android-chat-keyboard.png), [ingrédients](android-pantry.png), [choix d’import](android-import-chooser.png), [saisie du lien](android-import-link.png), [clavier d’import](android-import-keyboard.png).
- [Budget iOS](ios-budget.png) et [détails du budget Android](android-budget-details.png) : montants lisibles, aucun code FR/EUR ou date affichés.

Les interactions Android d’ouverture, fermeture, saisie et passage du choix d’import à la saisie du lien sont vérifiées. Sur iOS, les vues sont observées dans la prévisualisation ; les taps automatiques ont été bloqués par le déplacement de SimulatorKit dans cette version de Xcode. La navigation complète de tous les points d’entrée et les achats ne sont pas déclarés validés par cette galerie.

Les fichiers temporaires et les serveurs QA sont retirés ou arrêtés. La configuration Metro de l’app n’a pas été modifiée pour cette vérification. Le serveur utilisateur sur 8081 est conservé. Les métadonnées PNG sont retirées sans recompression ; macOS conserve son attribut système `com.apple.provenance`, dont la suppression n’est pas confirmée.
