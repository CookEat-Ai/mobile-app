# Quatre semaines de recettes — validation locale

8 septembre 2026. Ce rapport complète l’audit antérieur [badge et couverture](COVERAGE.md). Aucun compte obligatoire ajouté. Aucun déploiement en production.

## Résultat

628 recettes et leurs photos contrôlées ajoutées au catalogue local, désormais 2 040 recettes. Avec cuisine + régime + durée, le moteur peut fournir quatre semaines de 28 repas, soit 112 identités distinctes. Il exclut les trois derniers autres plannings enregistrés ; des recettes de la première semaine peuvent revenir dès la cinquième.

Le cas le plus restrictif testé, vegan + Express, dispose de 35 petits-déjeuners, 35 collations et au moins 70 plats dans chacune des 12 cuisines. Petits-déjeuners et collations sont partagés. Les 70 plats servent aux déjeuners et dîners ensemble.

## Vérification native

Simulateur iPhone 17 sous iOS 26.5, application native et API locale. Préférences italiennes, vegan, Express, sept jours et collation quotidienne. Trois semaines antérieures de test contenaient 84 recettes distinctes ; la quatrième a été générée par le bouton de l’application, avec 28 nouvelles recettes. Le passage de lundi à mardi affichait les repas du bon jour. Aucun compte créé. Les données de test et le stockage local du simulateur ont été restaurés après contrôle.

- [Résultat machine : 112 identités distinctes](rotation/simulator-result.json).
- [Capture de la quatrième semaine](rotation/iphone17-fourth-week.png).

Le badge du deuxième paywall a déjà été corrigé et contrôlé sur iPhone 17 avec offres Store et iPhone 12 mini avec données visuelles de test : voir COVERAGE.md. Aucun achat réel n’a été effectué.

## Vérification API et catalogue

- 180/180 combinaisons de cuisine, régime et durée sur huit semaines, avec contrôle des identités dans chaque fenêtre glissante de quatre semaines.
- 12/12 cuisines via les routes HTTP : création de huit semaines, réouverture sans changement, remplacement d’un repas, régénération sans dupliquer la semaine. Sessions anonymes et droit premium fictif uniquement dans une base de test isolée, nettoyée à la fin.
- 3 132/3 132 profils avec allergies ou exclusions : semaines complètes, aucun ingrédient interdit réintroduit.
- Intégrité des 628 nouvelles recettes, calculs nutritionnels et ingrédients comparés aux versions validées ; 628 photos distinctes accessibles en HTTP 200.
- 14 suites API et TypeScript API/mobile réussis.

Rapports détaillés et scripts dans le dépôt API, dossier catalog-rotation : four-week-audit.json, http-rotation-audit.json, filter-audit.json, integrity-audit.json et README.md.

## Limites précises

La garantie de quatre semaines distinctes concerne les trois filtres définis ci-dessus. Des allergies, équipements ou exclusions libres supplémentaires peuvent réduire la variété. Le moteur répartit alors les répétitions compatibles ; si plus aucun aliment ne convient, il refuse le cas plutôt que violer les filtres.

Les recettes ont été relues et leurs valeurs calculées depuis le référentiel local, sans essai en cuisine. Les portions restent celles des recettes : une semaine complète ne garantit pas l’atteinte exacte des objectifs nutritionnels. La capture native montre ainsi un total inférieur à la cible calorique.

Des avertissements de développement RevenueCat/polices ont été fermés pendant le test ; ils ne constituent pas une validation du parcours d’achat. Android natif, achats réels et production restent hors des vérifications réalisées. Les textes ont été rédigés dans Codex sans API de génération payante externe.
