# Harmonisation visuelle CookEat — 20 octobre 2026

L’identité du planning sert de référence : crème, blanc, jaune CookEat, texte vert foncé, Degular et Cronos Pro. Les règles communes sont appliquées aux écrans, composants et constantes déjà présents, avec un badge d’icône partagé en plus. Les modifications antérieures du dépôt sont conservées.

## Règles appliquées

- `AppTheme` possède la palette ; `Colors.light` reprend ses rôles sans palette concurrente.
- Ionicons est utilisé sur les deux plateformes. Les anciens noms `IconSymbol` deviennent des alias ; les micros et actions de rechargement utilisent aussi cette famille.
- Les fermetures de modales et les retours passent par `NavigationIconButton` : 44 × 44 points, icône 24, rayon 16, bordure fine. Sur photo, le fond sombre et l’icône blanche garantissent le contraste. L’état indisponible et le chargement conservent cette géométrie.
- Rayons communs pour cartes, champs, panneaux et boutons. Les cartes repas/favoris/planning ont une surface blanche et une bordure commune, sans ombre lourde.
- Les badges d’action ont le fond jaune et l’icône blanche ; les suppressions conservent leur rôle rouge. La palette des macros reste partagée avec le planning.
- Les fonds d’assombrissement des modales personnalisées utilisent aussi un rôle commun. Les cartes, séparateurs et champs reprennent les mêmes couleurs de bordure. Les sélections, erreurs et contours du scanner gardent leur distinction fonctionnelle.

## Captures natives comparées

App de prévisualisation dédiée, iPhone 18 Pro / iOS 27 (402 × 874 points) et Android 16 / API 36 (1080 × 2400 pixels, densité 420), français, texte normal. Les composants exécutés sont ceux de production ; le catalogue et le journal emploient des données isolées de démonstration. Il ne s’agit pas d’un test de génération IA, de caméra physique ou d’achat.

| Surface observée | iOS | Android |
| --- | --- | --- |
| Référence : contrôles, photo, carte, badges | [Capture](ios-overview.png) | [Capture](android-overview.png) |
| Repas : écran réel avec catalogue de démonstration | [Capture](ios-meals.png) | [Capture](android-meals.png) |
| Mon suivi : écran réel, journal isolé | [Capture](ios-tracking.png) | [Capture](android-tracking.png) |
| Planning : composants résumé, budget et repas | [Capture](ios-planning.png) | [Capture](android-planning.png) |
| Paramètres : composants partagés | [Capture](ios-settings.png) | [Capture](android-settings.png) |
| Garde-manger : modale réelle | [Capture](ios-pantry.png) | [Capture](android-pantry.png) |
| Bilan nutritionnel : fiche réelle | [Capture](ios-review.png) | [Capture](android-review.png) |
| Caméra : état autorisation | [Capture](ios-camera.png) | [Capture](android-camera.png) |
| Chatbot : modale réelle | [Capture](ios-chat.png) | [Capture](android-chat.png) |
| Choix d’import : modale réelle | [Capture](ios-import-chooser.png) | [Capture](android-import-chooser.png) |
| Import par lien : modale réelle | [Capture](ios-import-link.png) | [Capture](android-import-link.png) |

Les panneaux d’import exposent leurs actions et leur fermeture dans l’arbre d’accessibilité ; leurs conteneurs ne regroupent plus les boutons sous le seul libellé « Annuler ».

Contrôles mesurés dans l’arbre d’accessibilité natif : fermeture du chatbot iOS **44 × 44 points** ; Android **116 × 115 pixels**, soit environ **44 × 44 dp** après arrondi. Voir [les mesures brutes](measured-controls.json).

Le [clavier logiciel Android](android-chat-keyboard.png) laisse le champ et le bouton d’envoi visibles. L’ouverture, la fermeture et le déplacement du champ lors du focus sont contrôlés sur iOS ; le clavier logiciel iOS n’est pas visible dans la capture de ce simulateur, donc sa géométrie visuelle n’est pas revalidée ici.

Format compact Android **360 × 720 dp**, texte système **130 %** : [chatbot](android-compact-chat.png), [paramètres](android-compact-settings.png). Le titre, les suggestions et les lignes de paramètres se replient ; la fermeture garde sa cible et le compositeur reste accessible.

## Vérifications fonctionnelles

- `test:visual-system` : glyphes réellement présents, une famille d’icônes, contraste, cibles tactiles, résistance aux styles locaux contradictoires, chargement et états d’accessibilité.
- Suivi photo/capture/journal, chatbot, recettes personnelles, scan d’ingrédients, configuration/organisation/horaires/navigation du planning, cache des repas et génération depuis l’onboarding : réussis.
- Copie des paywalls sur 4 objectifs et 6 langues, accès créateur/admin et règles existantes de demande d’avis : réussis. Les essais, prix, achats, restaurations et placements commerciaux ne sont pas modifiés ; leurs états Store natifs ne sont pas revalidés par cette galerie.
- TypeScript et ESLint : aucune erreur. Exports Hermes iOS/Android de l’application complète : réussis.
- Aucun nouvel espace blanc en fin de ligne dans les modifications de cette révision. `git diff --check` signale une ligne vide déjà présente dans `app/paywall.tsx`, conservée avec les changements antérieurs.

Les fichiers de prévisualisation et la configuration Metro temporaire sont retirés après contrôle. La navigation complète de toutes les branches de l’onboarding et de paiement n’est pas simulée par la galerie ; la vérification native porte sur les surfaces indiquées dans le tableau.
