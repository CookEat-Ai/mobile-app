# Paywall — prix et personnalisation

- Suppression de l'auto-réduction du prix, de la hauteur de ligne forcée et du suffixe imbriqué. Montant et période sont deux textes distincts dans une ligne qui peut revenir à la ligne ; la colonne a une largeur explicite.
- Titre et sous-titre spécifiques aux cinq objectifs dans les six langues. Conservation de la contrainte de préparation rapide seulement si renseignée. Les valeurs par défaut du profil de calcul ne sont pas présentées comme des réponses de l'utilisateur.
- Le texte générique de RevenueCat ne remplace plus un objectif connu. Les overrides ciblés utilisent `metadata.weeklyPlanning.goals.<goal>`.
- Tests : `node scripts/test-paywall-copy.cjs`, TypeScript, lint ciblé (trois avertissements préexistants dans app/paywall.tsx), diff check.
- Observation native : iPhone 12 mini, iOS 18.5, français, taille de texte standard, objectif prise de muscle, annuel sélectionné sans essai. Prix annuel lisible et titre/sous-titre personnalisés dans le vrai composant PaywallView.
- Capture : `paywall-gain-muscle-price-fixture.png`. Les produits du Store n'étaient pas disponibles sur ce simulateur : prix de fixture 44,99 €/an et 12,99 €/mois, callbacks achat/restauration inactifs. La fixture et sa route temporaire ont été supprimées.
- Pas de validation de l'éligibilité personnelle du propriétaire, d'achat, d'Android ou des autres tailles de texte dans cette passe. Aucun déploiement ni modification Store/RevenueCat.
