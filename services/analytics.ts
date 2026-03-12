import { PostHog } from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '../config/posthog';
import { getUniqueDeviceId } from './deviceStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appsFlyerService from './appsflyer';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';

class AnalyticsService {
  private posthog: PostHog | null = null;
  private isInitialized = false;
  private userId: string | null = null;
  private readonly FIRST_RUN_KEY = '@cookeat_first_run';

  async init(): Promise<string | null> {
    if (this.isInitialized) return this.userId;

    try {
      let uniqueId = await getUniqueDeviceId();

      if (!__DEV__ && POSTHOG_API_KEY && !POSTHOG_API_KEY.includes('YOUR_POSTHOG')) {
        this.posthog = new PostHog(POSTHOG_API_KEY, {
          host: POSTHOG_HOST,
        });

        this.posthog.identify(uniqueId);
        console.log('✅ PostHog initialisé');
      } else if (__DEV__) {
        console.log('⚠️ PostHog désactivé en mode développement');
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

  async getOnboardingVariant(): Promise<'A' | 'B' | 'C' | 'D'> {
    // if (__DEV__) return 'A';
    const variant = await this.getFeatureFlag('onboarding-variant');
    if (variant === 'control' || variant === 'A') return 'A';
    if (variant === 'B') return 'B';
    if (variant === 'D') return 'D';
    return 'C'; // Par défaut sur C si variant est 'C' ou indéfini
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
