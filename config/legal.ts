import { Platform } from 'react-native';
import { PUBLIC_ENV } from './env';
import { resolveSupportedLanguage } from '../i18n';

/**
 * Liens légaux exigés sur tout écran d'abonnement (App Store 3.1.2, Play
 * Billing). Ils étaient rendus par le template RevenueCat : depuis que le
 * paywall est custom, c'est à l'app de les afficher, sous peine de rejet.
 */

export function getPrivacyPolicyUrl(language?: string): string {
  const locale = getLegalLocale(language);
  if (locale === 'fr') return PUBLIC_ENV.privacyUrlFr;
  return replaceTrailingLocale(PUBLIC_ENV.privacyUrlEn, locale);
}

/** Les CGU CookEat complètent les règles de la boutique concernée. */
export function getTermsUrl(language?: string): string {
  const configured = Platform.OS === 'ios' ? PUBLIC_ENV.termsUrlIos : PUBLIC_ENV.termsUrlAndroid;
  return replaceTrailingLocale(configured, getLegalLocale(language));
}

function getLegalLocale(language?: string): 'fr' | 'en' | 'de' | 'es' | 'pt-BR' {
  const normalized = resolveSupportedLanguage(language);
  if (normalized === 'es-ES' || normalized === 'es-MX') return 'es';
  return normalized;
}

function replaceTrailingLocale(url: string, locale: string): string {
  return url.replace(/\/(fr|en|de|es|pt-BR)\/?$/, `/${locale}/`);
}
