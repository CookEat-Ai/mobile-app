CookEat 1.8.1 rassemble les changements mobiles locaux : analyse photo progressive, suivi de l’eau, saisie et correction des repas, rappels, onboarding et cohérence visuelle, identité analytics et abonnements.

L’API reste inchangée conformément à la demande explicite de l’utilisateur. Les exports utilisent https://cookeat.info/api et l’environnement EAS production.

Contrôles : TypeScript valide, Expo Doctor 21/21, 61 scripts de régression valides, lint sans erreur (57 avertissements), exports Metro de production iOS et Android réussis. Les anciennes simulations de composants et de transport ont été adaptées aux composants extraits et au scanner progressif. Le correctif de cache Xcode existant est renommé pour expo-modules-jsi 57.1.2.

Les builds natifs, la vérification des artefacts et les contrôles Store restent à effectuer. Les achats/restaurations réels et l’installation TestFlight/Play n’ont pas encore été retestés pour ces builds. Publication manuelle après approbation.
