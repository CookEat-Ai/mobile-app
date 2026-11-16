# Marges iPad, panneaux et barre budget — 20 octobre 2026

Cette révision remplace les marges de la première passe : 40 points dès 744 points de fenêtre, 48 dès 1024. Les listes et écrans qui consomment la gouttière commune suivent cette règle. Les écrans de formulaire concernés et le CTA d’onboarding reprennent également cette marge.

`PlanningOverview` est partagé par le planning courant, l’historique et l’aperçu hebdomadaire de l’onboarding. Il mesure sa largeur utile : deux cartes sur une ligne dès 720 points, budget à gauche ; en dessous elles s’empilent, budget en premier. Le seuil augmente avec la taille système du texte. Si une donnée manque, aucune colonne vide n’est réservée.

La barre n’était auparavant rendue que pour une estimation complète avec budget cible. Désormais le résumé hebdomadaire garde une piste de 10 points :

- Avec cible : coût/cible et marge estimée, rouge si dépassement.
- Sans cible mais avec fourchette : position du coût dans cette fourchette, accompagnée de ses bornes explicites.
- Sans référence chiffrée : piste neutre, libellé explicite, aucun budget ni pourcentage inventé.
- Estimation partielle avec cible : montant connu/cible, mention de l’estimation partielle.

## Contrôle visuel natif

Simulateur iPad Pro 11 pouces M5 en portrait (834 × 1210 points), et iPhone 17 Pro (402 × 874). Composants réels, fontes réelles et données QA locales ; API, Store et analytics remplacés par des fixtures. Les photos de démonstration ne valident pas les chiffres nutritionnels des repas fictifs.

- [Cible de 30 €, iPad](target-ipad.png) : barre jaune visible, budget et calories côte à côte, marges de 40 points.
- [Sans cible, iPad](no-target-ipad.png) : barre présente avec fourchette explicite, panneaux côte à côte.
- [Sans cible, iPhone](no-target-phone.png) : barre présente, cartes empilées.
- [Onboarding, iPad](onboarding-ipad.png) : mêmes panneaux, marges et CTA alignés.

Il s’agit de contrôles de présentation isolés, pas d’une validation de toute la navigation ou des services en production. iPad mini, 13 pouces, Split View et texte agrandi couverts par les calculs automatisés ; pas de capture native sur ces formats pour cette révision.

Tests : `test-responsive-layout`, cache des repas, onboarding planning, affichage des semaines, cycle des animations et système visuel ; TypeScript sans erreur. ESLint sans erreur, un avertissement préexistant d’import par défaut dans `formQuestion.tsx`.

Les serveurs QA et les simulateurs démarrés ont été arrêtés, les fichiers QA temporaires supprimés. Le serveur habituel 8081 est conservé.

Les chunks de métadonnées PNG ont été retirés en préservant dimensions et blocs de pixels compressés. macOS conserve l’attribut système `com.apple.provenance` malgré `xattr -c`.
