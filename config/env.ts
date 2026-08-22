export type AppEnvironment = 'development' | 'preview' | 'production';

function requirePublicValue(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (normalized) return normalized;

  throw new Error(
    `[config] Variable ${name} manquante. Configure-la dans mobileapp/.env ` +
      'pour le local ou dans l’environnement EAS correspondant.',
  );
}

function resolveAppEnvironment(value: string | undefined): AppEnvironment {
  if (value === 'development' || value === 'preview' || value === 'production') {
    return value;
  }

  throw new Error(
    '[config] EXPO_PUBLIC_APP_ENV doit valoir development, preview ou production.',
  );
}

/**
 * Configuration publique embarquée dans le binaire.
 *
 * Ces valeurs sont des identifiants SDK destinés au client, pas des jetons
 * administratifs. Expo n'inline que les accès directs `process.env.NAME` : ils
 * doivent donc rester explicitement listés ici.
 */
export const PUBLIC_ENV = Object.freeze({
  appEnvironment: resolveAppEnvironment(process.env.EXPO_PUBLIC_APP_ENV),
  apiUrl: process.env.EXPO_PUBLIC_API_URL?.trim() || null,

  appsFlyerDevKey: requirePublicValue(
    'EXPO_PUBLIC_APPSFLYER_DEV_KEY',
    process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY,
  ),
  appsFlyerIosAppId: requirePublicValue(
    'EXPO_PUBLIC_APPSFLYER_IOS_APP_ID',
    process.env.EXPO_PUBLIC_APPSFLYER_IOS_APP_ID,
  ),

  posthogKey: requirePublicValue(
    'EXPO_PUBLIC_POSTHOG_KEY',
    process.env.EXPO_PUBLIC_POSTHOG_KEY,
  ),
  posthogHost: requirePublicValue(
    'EXPO_PUBLIC_POSTHOG_HOST',
    process.env.EXPO_PUBLIC_POSTHOG_HOST,
  ),

  sentryDsn: requirePublicValue(
    'EXPO_PUBLIC_SENTRY_DSN',
    process.env.EXPO_PUBLIC_SENTRY_DSN,
  ),

  revenueCatIosApiKey: requirePublicValue(
    'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS',
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
  ),
  revenueCatAndroidApiKey: requirePublicValue(
    'EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID',
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
  ),
  revenueCatEntitlementId: requirePublicValue(
    'EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID',
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID,
  ),
  revenueCatDiscountOfferingId: requirePublicValue(
    'EXPO_PUBLIC_REVENUECAT_DISCOUNT_OFFERING_ID',
    process.env.EXPO_PUBLIC_REVENUECAT_DISCOUNT_OFFERING_ID,
  ),
  revenueCatDiscountIosProductId: requirePublicValue(
    'EXPO_PUBLIC_REVENUECAT_DISCOUNT_PRODUCT_IOS',
    process.env.EXPO_PUBLIC_REVENUECAT_DISCOUNT_PRODUCT_IOS,
  ),
  revenueCatDiscountAndroidProductId: requirePublicValue(
    'EXPO_PUBLIC_REVENUECAT_DISCOUNT_PRODUCT_ANDROID',
    process.env.EXPO_PUBLIC_REVENUECAT_DISCOUNT_PRODUCT_ANDROID,
  ),

  privacyUrlFr: requirePublicValue(
    'EXPO_PUBLIC_PRIVACY_URL_FR',
    process.env.EXPO_PUBLIC_PRIVACY_URL_FR,
  ),
  privacyUrlEn: requirePublicValue(
    'EXPO_PUBLIC_PRIVACY_URL_EN',
    process.env.EXPO_PUBLIC_PRIVACY_URL_EN,
  ),
  termsUrlIos: requirePublicValue(
    'EXPO_PUBLIC_TERMS_URL_IOS',
    process.env.EXPO_PUBLIC_TERMS_URL_IOS,
  ),
  termsUrlAndroid: requirePublicValue(
    'EXPO_PUBLIC_TERMS_URL_ANDROID',
    process.env.EXPO_PUBLIC_TERMS_URL_ANDROID,
  ),
});

export const APP_ENVIRONMENT = PUBLIC_ENV.appEnvironment;
