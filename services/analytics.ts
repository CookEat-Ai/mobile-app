import { PostHog } from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '../config/posthog';
import { getUniqueDeviceId } from './deviceStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appsFlyerService from './appsflyer';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';

class AnalyticsService {
  private posthog: PostHog | null = null;
  private isInitialized = false;
  private userId: string | null = null;
  private readonly FIRST_RUN_KEY = '@cookeat_first_run';

  async init(): Promise<string | null> {
    if (this.isInitialized) return this.userId;

    try {
      let uniqueId = await getUniqueDeviceId();
      console.log('🆔 [Analytics] Mobile ID:', uniqueId);

      if (POSTHOG_API_KEY && !POSTHOG_API_KEY.includes('YOUR_POSTHOG')) {
        this.posthog = new PostHog(POSTHOG_API_KEY, {
          host: POSTHOG_HOST,
        });

        this.posthog.identify(uniqueId);

        const languageCode = Localization.getLocales()?.[0]?.languageCode || 'en';
        this.posthog.setPersonProperties({ user_language: languageCode });

        console.log('✅ PostHog initialisé');
      }

      appsFlyerService.init();

      this.isInitialized = true;
      this.userId = uniqueId;

      const hasRunBefore = await AsyncStorage.getItem(this.FIRST_RUN_KEY);
      if (!hasRunBefore) {
        await AsyncStorage.setItem(this.FIRST_RUN_KEY, 'true');
      }

      return uniqueId;
    } catch (error) {
      console.error('❌ Erreur initialisation Analytics:', error);
      return null;
    }
  }

  async requestTrackingPermission(): Promise<void> {
    try {
      const { status } = await requestTrackingPermissionsAsync();
      console.log(`[Analytics] ${Platform.OS} Tracking Status requested: ${status}`);

      // Si l'utilisateur a répondu (accepté ou refusé), on ré-identifie pour mettre à jour l'IDFA/GAID dans PostHog/AppsFlyer
      if (this.userId) {
        this.identify(this.userId);
      }
    } catch (error) {
      console.error('❌ Erreur demande permission tracking:', error);
    }
  }

  async track(eventName: string, properties?: Record<string, any>) {
    if (!this.isInitialized) {
      console.log(`[Analytics - Not Initialized] Event: ${eventName}`, properties);
      return;
    }

    // Récupérer la variante actuelle pour l'ajouter à chaque événement
    const variant = await this.getOnboardingVariant();
    const enrichedProperties = {
      ...properties,
      onboarding_variant: variant,
    };

    // PostHog Tracking
    if (this.posthog) {
      this.posthog.capture(eventName, enrichedProperties);
    } else {
      console.log(`[PostHog - Mock] Event: ${eventName}`, enrichedProperties);
    }

    // AppsFlyer Tracking
    const afEventName = this.mapToAppsFlyerEvent(eventName);
    appsFlyerService.trackEvent(afEventName, enrichedProperties);
  }

  private mapToAppsFlyerEvent(eventName: string): string {
    const mapping: Record<string, string> = {
      'app_opened': 'af_opened_app',
      'subscription_started': 'af_subscribe',
      'recipe_generated': 'af_content_view',
      'paywall_viewed': 'af_initiated_checkout'
    };
    return mapping[eventName] || eventName;
  }

  async identify(userId: string) {
    this.userId = userId;
    if (this.posthog && this.isInitialized) {
      this.posthog.identify(userId);
    }
    appsFlyerService.setCustomerUserId(userId);
  }

  setUserProperties(properties: Record<string, any>) {
    if (this.posthog && this.isInitialized) {
      // Dans PostHog, on utilise identify pour lier des propriétés ou capture avec $set
      this.posthog.setPersonProperties(properties);
    }
  }

  setCountry(countryCode: string) {
    this.setUserProperties({ user_country: countryCode });
  }

  async getFeatureFlag(flagName: string): Promise<string | boolean | undefined> {
    if (this.posthog && this.isInitialized) {
      return this.posthog.getFeatureFlag(flagName);
    }
    return undefined;
  }

  async getOnboardingVariant(): Promise<'A' | 'B' | 'C' | 'D' | 'E' | 'F'> {
    if (__DEV__) return 'F';

    if (this.posthog && this.isInitialized) {
      // On s'assure que les propriétés (comme user_language) sont envoyées 
      // avant de demander le flag pour garantir le ciblage correct
      await this.posthog.flush().catch(() => { });
    }

    const variant = await this.getFeatureFlag('onboarding-variant');
    console.log('🔍 [Analytics] Onboarding Variant:', variant);
    if (variant === 'control' || variant === 'A') return 'A';
    if (variant === 'B') return 'B';
    if (variant === 'D') return 'D';
    if (variant === 'E') return 'E';
    if (variant === 'F') return 'F';
    return 'C';
  }

  async getLuckyWheelVariant(): Promise<'A' | 'B'> {
    const variant = await this.getFeatureFlag('lucky-wheel-variant');
    // PostHog Experiments utilisent 'test' pour la variante et 'control' pour le témoin
    if (variant === 'test' || variant === 'B') return 'B';
    return 'A'; // 'control', 'A' ou undefined retournent 'A'
  }
}

const analytics = new AnalyticsService();
export default analytics;
