# Essai photo facultatif après la semaine

Le parcours principal et la branche d’import rejoignent `weeklyPlanPreview`. Son bouton Continuer mène maintenant à `photoTrackingDemo`, avant le passage existant vers le code promo, l’offre et le rappel.

L’invitation reprend les références de l’onboarding : fond crème, Degular/CronosPro, carte blanche bordée, pictogramme partagé, entrée animée accessible, colonne de 560 points maximum et `OnboardingFooter` (inset 24, hauteur 56, même écart de 24 points au-dessus de la safe area). Le contenu défile indépendamment ; Plus tard occupe un emplacement réservé au-dessus du bouton principal. Aucun chiffre nutritionnel n’est inventé dans l’invitation.

L’utilisateur peut essayer ou passer. La permission caméra est demandée après son choix d’essayer ; la galerie reste disponible. L’essai utilise la route `tracking/capture` et ses vrais composants, requêtes, données, corrections et états d’erreur. Fermer la sheet revient à l’invitation. Confirmer enregistre réellement le repas dans le journal de cette installation, puis ferme la sheet vers le bilan d’onboarding avec `completedId`. Ce bilan relit le repas sauvegardé et propose Continuer vers la suite existante. Il ne marque jamais l’onboarding terminé et n’accorde pas d’abonnement.

Les étapes sont instrumentées avec `onboarding_photo_tracking_viewed`, `_started`, `_completed` et `_skipped`. Aucune photo, URI, liste d’ingrédients ou donnée nutritionnelle n’est envoyée dans ces événements. Les six langues disposent des textes de cette étape.

Le relais commercial conserve le contexte `onboarding_weekly_planning` déjà utilisé par le parcours. L’offre, les produits, l’éligibilité et le rappel continuent à suivre les contrôles existants ; aucun écran d’achat ne fait partie de cette modification.

Validation : [compte rendu Android](qa/android-features-2026-10-20/README.md). L’expérience photo conserve le [contrat du suivi](photo-tracking-contract.md).
