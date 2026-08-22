import { Platform } from 'react-native';
import { PUBLIC_ENV } from './env';

/**
 * Liens légaux exigés sur tout écran d'abonnement (App Store 3.1.2, Play
 * Billing). Ils étaient rendus par le template RevenueCat : depuis que le
 * paywall est custom, c'est à l'app de les afficher, sous peine de rejet.
 */

export function getPrivacyPolicyUrl(language?: string): string {
  return language?.startsWith('fr') ? PUBLIC_ENV.privacyUrlFr : PUBLIC_ENV.privacyUrlEn;
}

/** Les CGU CookEat complètent les règles de la boutique concernée. */
export function getTermsUrl(language?: string): string {
  const configured = Platform.OS === 'ios' ? PUBLIC_ENV.termsUrlIos : PUBLIC_ENV.termsUrlAndroid;
  const locale = language?.startsWith('fr') ? 'fr' : 'en';
  return configured.replace(/\/(fr|en)$/, `/${locale}`);
}
