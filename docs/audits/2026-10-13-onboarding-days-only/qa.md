# Onboarding principal : jours uniquement — 13 octobre 2026

La configuration du premier planning ne présente plus le scan, le garde-manger ni le choix de courses. Aucun ancien ingrédient n’est chargé pour cette génération. Les préférences envoyées et sauvegardées contiennent une liste d’ingrédients vide et le mode priority ; les objectifs, restrictions et autres préférences du profil restent conservés. Les anciens contrôles de reprise strict et l’overlay de photos sont retirés de cet écran. Une ref empêche une double création avant le changement d’écran.

CookingDaysPicker est partagé entre l’onboarding principal et ConfigurePlanningScreen. Il reprend le sélecteur approuvé : 4 + 3 cartes, rangée du bas centrée, noms et dates, coches, jaune de sélection, gris léger le week-end et compteur de repas. Les interactions conservent au moins un jour. Le footer habituel de l’onboarding est conservé.

Contrôles réussis : TypeScript, lint ciblé sans erreur ni avertissement, test:onboarding-planning, test:planning-configuration et diff ciblé. Le test de l’écran réel avec API simulée vérifie la présence du sélecteur partagé, l’absence des contrôles d’ingrédients, les jours transmis, les ingrédients stockés ignorés, la conservation du profil et une seule requête après double appui.

Contrôle natif sur Duo fermé : le sélecteur partagé est observé dans le mini parcours. Sept cartes, deux rangées, sélection/désélection du week-end, compteur mis à jour et dernier jour impossible à désélectionner. Instantanés 12–17 et capture shared-picker-duo.png. Des overlays Debug préexistants restent visibles au bas de cette capture ; la grille est entièrement visible. Le runner termine avec TEST EXECUTE SUCCEEDED.

Limite importante : l’écran complet de l’onboarding principal n’a pas pu être ouvert par le lien de test, interrompu par une confirmation iOS. Son rendu complet n’est donc pas validé visuellement. Aucune génération native réelle, ni test Android, grands caractères ou autres langues pour cette modification. Le test de génération utilise une réponse API simulée. Modifications locales, sans déploiement.

Capture PNG nettoyée des chunks de métadonnées ; données IHDR/IDAT conservées et vérifiées. macOS conserve l’attribut protégé com.apple.provenance malgré la suppression des attributs étendus.
