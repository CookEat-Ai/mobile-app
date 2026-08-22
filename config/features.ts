/**
 * Interrupteurs de fonctionnalités.
 *
 * Ce ne sont pas des flags distants : ils servent à retirer une mécanique du
 * parcours sans supprimer son code, pour pouvoir la rallumer d'un seul
 * caractère si la mesure ne suit pas.
 */

/**
 * Roue de la chance (paywall `WHEEL`).
 *
 * Désactivée : la remise n'est plus tirée au sort, elle est proposée
 * directement à la fermeture de la feuille de paiement du store (voir
 * `EXIT_OFFER_DISCOUNT` dans `app/paywall.tsx`). Tout l'écran roue — segments,
 * animation, haptique, variantes A/B — reste en place derrière ce drapeau.
 *
 * Le remettre à `true` restaure : l'entrée `initialState: 'WHEEL'`, le
 * déclenchement au lancement depuis l'accueil, et l'enchaînement
 * roue → paywall remisé.
 */
export const LUCKY_WHEEL_ENABLED = false;
