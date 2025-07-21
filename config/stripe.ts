// Configuration des prix Stripe
// Remplacez ces IDs par vos vrais price IDs Stripe
export const STRIPE_PRICE_IDS = {
  // Plan gratuit (pas de priceId nécessaire)
  basic: null,

  // Plan Pro trimestriel
  pro: 'price_1RnEPDGgihxjG90WHUi3U69I',

  // Plan Pro annuel
  premium: 'price_1RnFzbGgihxjG90WKA1AMf7F',
} as const;

export type PlanId = keyof typeof STRIPE_PRICE_IDS;

// Fonction pour obtenir le priceId d'un plan
export const getPriceId = (planId: PlanId): string | null => {
  return STRIPE_PRICE_IDS[planId];
};

// Fonction pour vérifier si un plan nécessite un paiement
export const isPaidPlan = (planId: PlanId): boolean => {
  return STRIPE_PRICE_IDS[planId] !== null;
}; 