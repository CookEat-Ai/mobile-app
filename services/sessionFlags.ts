let hasShownWheelThisSession = false;

export const hasShownWheelInSession = (): boolean => hasShownWheelThisSession;

export const markWheelShownInSession = (): void => {
  hasShownWheelThisSession = true;
};

/**
 * Offre de sortie (paywall remisé).
 *
 * Une seule par session, quel que soit le nombre de fois où l'utilisateur
 * ouvre puis referme la feuille de paiement du store : une remise qu'on peut
 * faire réapparaître à volonté n'est plus une offre, c'est le tarif.
 */
let hasShownExitOfferThisSession = false;

export const hasShownExitOfferInSession = (): boolean => hasShownExitOfferThisSession;

export const markExitOfferShownInSession = (): void => {
  hasShownExitOfferThisSession = true;
};
