# Analyse du frigo et navigation — 13 octobre 2026

Les photos restent visibles pendant l’analyse et sont retirées de l’arbre UI après sa completion, y compris pour un résultat vide. La liste reste éditable. Le retour de l’en-tête ferme le scan sans enregistrer et retrouve la configuration. Reprendre une photo efface les captures et le résultat, invalide la requête précédente et réaffiche la caméra sur la même route. La caméra du planning utilise une présentation native plein écran ; les autres caméras conservent leur modale habituelle. Aucun nouvel écran caméra n’est empilé. Les marges de la liste et de ses actions respectent les insets latéraux du Duo.

Validation : TypeScript et tests de configuration/suppression passent. Lint ciblé sans erreur (six avertissements préexistants). `yarn test:pantry-scan` teste les composants réels avec les services natifs/API simulés : plusieurs photos pendant l’analyse, zéro photo après analyse, résultat vide, retour distinct de la reprise, captures effacées, fermeture en un appui, réponses tardives ignorées après annulation ou reprise.

XCTest natif, Duo fermé 466 × 678 points : configuration → caméra plein écran → passer la capture → liste vide → ajout manuel de Riz → retour direct à l’étape ingrédients, sans enregistrer Riz. Reprise de la photo puis fermeture en un appui également contrôlées après les derniers ajustements. `TEST EXECUTE SUCCEEDED`. La capture `ingredients-only.png` montre la liste remplie manuellement ; les instantanés 27/28/32/33 attestent les contrôles et transitions. La capture finale a été inspectée visuellement, bouton Ajouter accessible hors de la zone système.

Limites : aucune reconnaissance réelle d’une photo de frigo ni génération effectuée cette fois. L’affichage après une vraie réponse API est couvert par le test du composant caméra avec réponse simulée ; la navigation native utilise la branche Passer et l’ajout manuel. Écran intérieur, Android et autres langues non rejoués. Les overlays Debug ont été fermés avant la capture finale. Modifications locales, sans déploiement.

PNG nettoyé des chunks de métadonnées, IHDR et IDAT identiques vérifiés. L’attribut protégé macOS `com.apple.provenance` reste présent malgré le nettoyage des attributs étendus.

## Rappel caméra en présentation

Le rappel automatique est maintenant bloqué après lecture du mode présentation persistant, avant toute alerte. Contrôle natif après relance : caméra ouverte depuis le parcours 8 étapes, aucun « Que photographier ? » ni « Compris ! » au premier état stable ni au second contrôle, fermeture directe vers 3/8. Instantanés `demo-no-help-6.txt` et `demo-no-help-7.txt`. TypeScript, lint caméra (trois avertissements préexistants) et `test:pantry-scan` passent. La branche non-démo conserve son rappel dans le code ; elle n’a pas été rejouée nativement cette fois.
