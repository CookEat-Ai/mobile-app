# Choix immédiats et week-end allégé — 13 octobre 2026

Objectif (présentation uniquement), temps de cuisine et alimentation : toucher une option enregistre la réponse et avance d’une étape. Aucun bouton Continuer sur ces trois écrans. Les sélections multiples, la saisie et la création de semaine conservent leur validation explicite. Les réponses restent sélectionnées lors d’un retour ; toucher la réponse déjà sélectionnée avance aussi.

Le week-end utilise maintenant `#FAF9F6` et la bordure commune, au lieu de `theme.soft` et d’une bordure plus foncée. La rangée inférieure reste centrée et l’état sélectionné conserve le jaune habituel.

Validation : TypeScript, lint de ConfigurePlanningScreen, tests existants de configuration/suppression et diff ciblé sans erreur. XCTest natif sur l’écran extérieur du Duo (466 × 678 points) : objectif → jours, durée → cuisines, alimentation → exclusions ; absence du bouton sur les trois étapes ; conservation de la durée et du régime au retour ; nouvel objectif sans aucune présélection. Le runner se termine avec `TEST EXECUTE SUCCEEDED`. Les captures finales ont été inspectées visuellement. Les instantanés AX et leurs assertions sont dans `evidence.json` et `snapshot-*.txt`.

Limites : pas de nouvelle génération ni de scan pour ce changement ; écran intérieur, Android et autres locales non rejoués cette fois. Une erreur de police RevenueCat préexistante et une notification de maintenance hors écran étaient présentes dans le client Debug ; les panneaux de débogage ont été fermés avant les captures finales. Aucun déploiement.

Captures PNG : seuls IHDR/IDAT/IEND sont conservés, données pixels et dimensions vérifiées identiques. Après nettoyage des attributs étendus, macOS conserve l’attribut protégé `com.apple.provenance` ; il n’a pas été supprimé.
