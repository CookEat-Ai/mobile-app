# Système visuel CookEat

Référence : planning et onboarding approuvés. Conserver le fond crème, les cartes blanches, le jaune CookEat, le vert foncé des textes et les polices Degular / Cronos Pro. Les parcours, données, offres et mécanismes de navigation restent inchangés.

## Invariants

- Une seule palette : `AppTheme`. `Colors.light` est un adaptateur de compatibilité vers cette palette, sans couleurs concurrentes. Le rouge reste réservé aux erreurs/suppressions ; les couleurs des macros viennent de `NutritionColors`.
- Une famille d’icônes fonctionnelles : Ionicons sur iOS et Android. `IconSymbol` conserve les anciens noms comme alias. Formes outline au repos ; remplissage pour les états actifs, favoris et actions principales. Les emojis alimentaires restent des illustrations de nourriture.
- Les contrôles retour/fermeture utilisent `NavigationIconButton` : cible de 44 × 44 points, icône de 24 points, rayon de 16 points, aucune ombre. Croix pour fermer, chevron pour revenir. Sur une photo : même géométrie, fond sombre contrasté et icône blanche. Sur une surface : fond blanc, bordure fine et icône vert foncé. Les positions tiennent compte des safe areas et du contexte ; ne pas confondre fermer une modale et supprimer une sélection.
- Une bordure de 1 point dans la couleur commune pour cartes/champs/séparateurs ; sélection en jaune et erreur en rouge. Les contours du scanner et les graphiques conservent leur épaisseur fonctionnelle.
- Échelle de rayons commune : petits éléments 8/12, champs et contrôles 16, cartes 23, panneaux/modales 32, pastilles et boutons principaux entièrement arrondis. Les photos suivent le rôle de leur conteneur.
- Cartes blanches bordées sans ombre lourde ; les zones de saisie secondaires utilisent le neutre commun. Le jaune pâle sert à la sélection et aux informations accentuées.
- Les badges d’action jaunes contiennent une icône blanche. Les badges d’erreur gardent leur rôle rouge et les textes secondaires le gris commun.
- Les modales locales utilisent `AppModal` et les routes modales `MODAL_ROUTE_ANIMATION` : ouverture native depuis le bas, sans fondus ni seconde animation de translation du contenu. Les hauteurs restent adaptées au contenu ; la réduction des animations supprime le mouvement. Les enchaînements utilisent `onDismiss`, avec adaptation Android dans le composant partagé. La route photo transparente sert uniquement d’hôte sans animation native : `AppModal` garde son fond fixe et déplace le panneau seul, puis ferme la route après `onDismiss`.
- Les CTA conservent leur hiérarchie et leur position. Les changements visuels ne déplacent pas les contrôles au-dessus du clavier et ne masquent aucune mention commerciale.

## Vérification

Comparer ensemble les composants et modales sur iOS et Android : navigation/fermeture sur fond clair et photo, paramètres, recherche, cartes repas/planning, import, chatbot et bilan nutritionnel. Tester également état désactivé, chargement, texte long et clavier. Les captures de galerie de composants doivent être identifiées comme telles ; elles ne valident pas une navigation complète ni un achat natif.

## Tablette et fenêtres redimensionnées

- Les écrans de contenu utilisent `contentColumn()` : jusqu’à 1120 points et une gouttière de 40 points sur tablette (48 dès 1024 points), sans colonne de téléphone centrée. Les formulaires et textes courts peuvent utiliser `FORM_CONTENT_MAX_WIDTH` (840 points). Les petites confirmations restent adaptées à leur contenu.
- La largeur du contenu reste indépendante de `SCALE_MAX_WIDTH` (560 points), qui borne les calculs proportionnels des illustrations et de la typographie. Ne pas élargir cette base pour agrandir une page. Utiliser `useResponsive()` pour suivre les changements de fenêtre.
- La bibliothèque de repas utilise deux colonnes dès 744 points (iPad mini compris), trois dès 1024, puis revient à une liste en Split View étroit. Les cartes du planning gardent leur lecture chronologique avec une photo et des textes plus grands sur tablette.
- Les aperçus de semaine partagent `PlanningOverview` : budget à gauche des calories dès 720 points utiles, sinon au-dessus. Le seuil augmente avec la taille système du texte. La carte garde une barre de 10 points : coût/cible si la cible existe, position dans la fourchette estimée sinon ; sans référence chiffrée elle garde une piste neutre explicitement libellée, sans pourcentage inventé. Vérifier aussi le téléphone après une modification de ces composants partagés.
