# Parcours ingrédients approuvé — 13 octobre 2026

## Contrat livré localement

Les deux planches de maquettes validées par l’utilisateur sont dans ../../design/pantry-workflow-2026-10-13/. La caméra conserve sa modal et les safe areas corrigées ; seule l’analyse occupe le plein écran. La modal du récapitulatif réutilise PantryIngredientReview pour le scan et l’entrée manuelle, avec une liste compacte, des boutons de suppression nommés pour l’accessibilité, un compteur et une CTA Utiliser ces ingrédients. L’ajout est une seule sheet de recherche : catalogue déjà localisé, accents/ligatures acceptés, suggestions, saisie libre en absence de résultat, plusieurs ajouts avant Terminé, doublons normalisés, limite existante de 100 aliments. L’emoji du catalogue localisé prime dans le récapitulatif pour rester cohérent avec la recherche.

La question de courses apparaît après confirmation, dans une sous-étape shopping du mini parcours. La progression générale ne gagne pas une étape. Les deux modes ne sont pas présélectionnés, leur choix avance vers la durée. Le retour depuis la durée retrouve la question ; le retour suivant retrouve la liste corrigée. Une liste vide avance sans question de courses et sans ingrédients précédents. Le scan transmet uniquement les ingrédients ; les anciens handoffs avec mode restent lisibles. La fermeture du récapitulatif avant confirmation conserve le comportement d’annulation de cette modal. Les ajouts dans la sheet sont immédiats dans le récapitulatif ; sa fermeture ne les efface pas.

Les six langues sont mises à jour. Le preview de développement suit aussi récapitulatif → courses → chargement et reste inaccessible en production. Aucun nouveau module natif ni changement de l’API.

## Vérifications

- TypeScript sans erreur et ESLint ciblé sans erreur. Les avertissements caméra/layout préexistants restent hors périmètre.
- Tests pantry-scan : composants réels, liste corrigée, aucune question de courses dans le récapitulatif, ajouts successifs sans fermeture, nom libre, bouton Terminé, double confirmation, reprise des prises, réponse tardive ignorée, captures conservées après erreur, sous-étape de courses distincte, deux retours et liste conservée, absence de question sur liste vide.
- Tests planning-configuration : recherche sans accents et sans ligatures, normalisation Œufs/Oeufs, payload sans mode automatique, compatibilité des anciens handoffs, six locales et préférences conservées.
- Régressions presentation-mode et onboarding-planning réussies. L’onboarding principal reste limité aux jours de cuisine avant son planning.
- Contrôle interactif des composants réels en React Native Web sur un banc isolé : 390 × 844 et 320 × 568, français, polices CookEat. Entrée manuelle, liste vide, six ajouts, recherche avo puis Avocat, saisie libre Tempeh fumé, retour au récapitulatif, validation, modes strict et priority, durée, deux retours, ingrédients conservés, suppression directe observés. Les pixels des états recherche, récapitulatif et courses ont été inspectés. Pas de débordement visible sur le petit écran.
- À 320 × 568, la CTA de référence Continuer de l’étape jours et les CTA Terminé de recherche, Utiliser ces ingrédients du récapitulatif et Utiliser ces ingrédients après retour mesurent toutes x=16, y=488, largeur=288, hauteur=56, avec 24 pixels disponibles sous le bouton. Mesure effectuée dans le DOM sur la même fenêtre après les ajustements finaux.

Le banc web simule stockage, navigation, API et analytics. Les images et polices viennent des assets du projet ; la représentation des icônes système et des modals n’atteste pas leurs pixels natifs. Aucun événement de test n’est envoyé aux fournisseurs. Les services ne sont pas sollicités et aucune génération réelle n’est effectuée.

## Mesure produit

Événements via le service analytics existant : planning_pantry_started (source scan/manual), planning_pantry_ingredient_changed (action, source, nombre), planning_pantry_review_confirmed (nombre), planning_pantry_shopping_selected (mode, nombre). Aucun nom d’aliment ni requête de recherche dans ces événements. Comparer le passage vers la durée, les abandons de recherche et le délai entre validation et choix des courses ; ne pas conclure à une amélioration de conversion avant observation. La réception des événements réels n’a pas été validée dans les dashboards.

## Limites

Le pilotage Device Hub échoue encore avec timeoutReached ; la validation native iOS/Android, les safe areas réelles, le clavier natif, les grandes tailles de texte, les autres langues et le scan photo/API réel restent non vérifiés. Aucun déploiement ni publication. Le compte rendu web ne constitue pas une preuve du fonctionnement des transitions UIKit entre les modals.
