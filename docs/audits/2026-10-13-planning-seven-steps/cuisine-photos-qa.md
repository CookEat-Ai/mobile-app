# Photos du catalogue dans le choix de cuisine

Les dessins SVG ont été remplacés par douze photos de recettes publiées dans la BDD CookEat, avec image approuvée et attribution CookEat. Une sélection éditoriale stable associe chaque cuisine à une recette de cette cuisine. Références et vérifications HTTP locales/production dans [cuisine-photo-sources.json](cuisine-photo-sources.json). Aucun changement d’API ni mutation en production.

Les photos utilisent Expo Image et son cache mémoire/disque, avec le visuel recette de secours pendant le chargement. Le nom occupe toute la largeur sous la photo ; la coche est sur fond blanc au coin de la photo. Ce placement corrige les mots cassés constatés sur les noms longs. Chaque carte garde sa sélection multiple, son label accessible et son état checkbox.

Validation : TypeScript et ESLint ciblé réussis, diff ciblé sans erreur d’espacement. App native Debug sur le simulateur CookEat QA iPhone Duo, français, texte par défaut, iOS 27.1 : photos visibles sur écran extérieur et intérieur ; nom Internationale / fitness vérifié sur deux lignes sans mot cassé à l’extérieur. Sélection/désélection observée, progression vers l’alimentation puis retour, réponses conservées. Pilotage XCTest terminé avec TEST EXECUTE SUCCEEDED. Les avertissements Debug RevenueCat préexistants ont été fermés avant les captures finales.

Captures inspectées : [extérieur](06-cuisine-photos-closed.png), [intérieur](07-cuisine-photos-open.png), [nom long à l’extérieur](08-cuisine-photos-long-label.png). L’en-tête CookEat/mascotte, la progression et la CTA fixe restent présents.

Android, grandes polices, autres langues et réseau indisponible n’ont pas été contrôlés visuellement dans cette correction. Les photos sont chargées depuis l’API configurée ; un premier chargement nécessite le réseau. Les PNG ont été nettoyés sans modifier les pixels ni les dimensions. macOS conserve son attribut protégé com.apple.provenance malgré la tentative de suppression ; détails dans [cuisine-photo-capture-verification.json](cuisine-photo-capture-verification.json).
