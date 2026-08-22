import AsyncStorage from '@react-native-async-storage/async-storage';
import appsFlyer, { type ConversionData, type UnifiedDeepLinkData } from 'react-native-appsflyer';
import { Platform } from 'react-native';
import { AF_DEV_KEY, AF_APP_ID } from '../config/appsflyer';

const FIRST_TOUCH_ATTRIBUTION_KEY = '@cookeat_appsflyer_first_touch';

export interface FirstTouchAttribution {
  attribution_provider: 'appsflyer';
  initial_attribution_status: 'paid' | 'organic';
  initial_media_source?: string;
  initial_campaign?: string;
  initial_campaign_id?: string;
  initial_adset?: string;
  initial_adset_id?: string;
  initial_ad?: string;
  initial_ad_id?: string;
  initial_creative?: string;
  initial_keyword?: string;
  initial_channel?: string;
  initial_is_retargeting?: boolean;
  attribution_resolved_at: string;
}

type AttributionListener = (attribution: FirstTouchAttribution) => void | Promise<void>;

export interface UnifiedDeepLinkAttribution {
  deep_link_status: UnifiedDeepLinkData['deepLinkStatus'];
  is_deferred: boolean;
  media_source?: string;
  campaign?: string;
  deep_link_value?: string;
}

type DeepLinkAttributionListener = (
  attribution: UnifiedDeepLinkAttribution,
) => void | Promise<void>;

type PendingAppsFlyerEvent = {
  eventName: string;
  eventValues: Record<string, any>;
};

const readString = (data: Record<string, any>, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
};

const readBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
};

export const toRevenueCatAttributionAttributes = (
  attribution: FirstTouchAttribution | null,
): Record<string, string> => {
  if (!attribution) return {};

  return {
    ...(attribution.initial_media_source ? { $mediaSource: attribution.initial_media_source } : {}),
    ...(attribution.initial_campaign ? { $campaign: attribution.initial_campaign } : {}),
    ...(attribution.initial_adset ? { $adGroup: attribution.initial_adset } : {}),
    ...(attribution.initial_ad ? { $ad: attribution.initial_ad } : {}),
    ...(attribution.initial_keyword ? { $keyword: attribution.initial_keyword } : {}),
    ...(attribution.initial_creative ? { $creative: attribution.initial_creative } : {}),
    ...(attribution.initial_campaign_id ? { af_campaign_id: attribution.initial_campaign_id } : {}),
    ...(attribution.initial_adset_id ? { af_adset_id: attribution.initial_adset_id } : {}),
    ...(attribution.initial_ad_id ? { af_ad_id: attribution.initial_ad_id } : {}),
  };
};

class AppsFlyerService {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private conversionListenerUnsubscribe: (() => void) | null = null;
  private deepLinkListenerUnsubscribe: (() => void) | null = null;
  private attributionListeners = new Set<AttributionListener>();
  private deepLinkAttributionListeners = new Set<DeepLinkAttributionListener>();
  private pendingEvents: PendingAppsFlyerEvent[] = [];
  private firstTouchAttribution: FirstTouchAttribution | null = null;
  private firstTouchLoadPromise: Promise<FirstTouchAttribution | null> | null = null;

  init(customerUserId?: string): Promise<void> {
    // AppsFlyer recommande de poser le CUID interne avant le démarrage du SDK
    // afin qu'il soit également présent sur les données brutes d'installation.
    if (customerUserId) {
      this.setCustomerUserId(customerUserId);
    }

    if (this.isInitialized) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    // AppsFlyer exige que le listener de conversion soit posé avant initSdk.
    this.registerConversionListener();
    this.registerDeepLinkListener();

    const options: any = {
      devKey: AF_DEV_KEY,
      isDebug: __DEV__,
      onInstallConversionDataListener: true,
      onDeepLinkListener: true,
      timeToWaitForATTUserAuthorization: 10,
    };

    if (Platform.OS === 'ios') {
      options.appId = AF_APP_ID;
    }

    this.initPromise = new Promise((resolve) => {
      appsFlyer.initSdk(
        options,
        (result: unknown) => {
          console.log('✅ AppsFlyer initialisé:', result);
          this.isInitialized = true;
          this.flushPendingEvents();
          resolve();
        },
        (error: any) => {
          console.error('❌ Erreur initialisation AppsFlyer:', error);
          // L'analytics produit doit continuer à fonctionner même si le réseau
          // d'attribution est temporairement indisponible.
          resolve();
        }
      );
    });

    return this.initPromise;
  }

  onFirstTouchAttribution(listener: AttributionListener): () => void {
    this.attributionListeners.add(listener);
    return () => this.attributionListeners.delete(listener);
  }

  onDeepLinkAttribution(listener: DeepLinkAttributionListener): () => void {
    this.deepLinkAttributionListeners.add(listener);
    return () => this.deepLinkAttributionListeners.delete(listener);
  }

  async getFirstTouchAttribution(): Promise<FirstTouchAttribution | null> {
    if (this.firstTouchAttribution) return this.firstTouchAttribution;
    if (this.firstTouchLoadPromise) return this.firstTouchLoadPromise;

    this.firstTouchLoadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(FIRST_TOUCH_ATTRIBUTION_KEY);
        if (!raw) return null;
        this.firstTouchAttribution = JSON.parse(raw) as FirstTouchAttribution;
        return this.firstTouchAttribution;
      } catch (error) {
        console.warn('AppsFlyer attribution locale illisible:', error);
        return null;
      } finally {
        this.firstTouchLoadPromise = null;
      }
    })();

    return this.firstTouchLoadPromise;
  }

  async getRevenueCatAttributionAttributes(): Promise<Record<string, string>> {
    return toRevenueCatAttributionAttributes(await this.getFirstTouchAttribution());
  }

  private registerConversionListener() {
    if (this.conversionListenerUnsubscribe) return;

    this.conversionListenerUnsubscribe = appsFlyer.onInstallConversionData((response: ConversionData) => {
      void this.persistFirstTouchAttribution(response);
    });
  }

  private registerDeepLinkListener() {
    if (this.deepLinkListenerUnsubscribe) return;

    this.deepLinkListenerUnsubscribe = appsFlyer.onDeepLink((response: UnifiedDeepLinkData) => {
      const data = response.data || ({} as UnifiedDeepLinkData['data']);
      const attribution: UnifiedDeepLinkAttribution = {
        deep_link_status: response.deepLinkStatus,
        is_deferred: Boolean(response.isDeferred),
        ...(readString(data, 'media_source', 'pid') ? { media_source: readString(data, 'media_source', 'pid') } : {}),
        ...(readString(data, 'campaign', 'c') ? { campaign: readString(data, 'campaign', 'c') } : {}),
        ...(readString(data, 'deep_link_value') ? { deep_link_value: readString(data, 'deep_link_value') } : {}),
      };

      for (const listener of this.deepLinkAttributionListeners) {
        Promise.resolve(listener(attribution)).catch((error) => {
          console.warn('AppsFlyer deep link listener en erreur:', error);
        });
      }
    });
  }

  private async persistFirstTouchAttribution(response: ConversionData) {
    if (response.status !== 'success' || !response.data) return;
    if (await this.getFirstTouchAttribution()) return;

    const data = response.data as Record<string, any>;
    const isPaid = data.af_status === 'Non-organic';
    const attribution: FirstTouchAttribution = {
      attribution_provider: 'appsflyer',
      initial_attribution_status: isPaid ? 'paid' : 'organic',
      ...(readString(data, 'media_source', 'pid') ? { initial_media_source: readString(data, 'media_source', 'pid') } : {}),
      ...(readString(data, 'campaign', 'c') ? { initial_campaign: readString(data, 'campaign', 'c') } : {}),
      ...(readString(data, 'campaign_id', 'af_c_id') ? { initial_campaign_id: readString(data, 'campaign_id', 'af_c_id') } : {}),
      ...(readString(data, 'af_adset') ? { initial_adset: readString(data, 'af_adset') } : {}),
      ...(readString(data, 'af_adset_id') ? { initial_adset_id: readString(data, 'af_adset_id') } : {}),
      ...(readString(data, 'af_ad') ? { initial_ad: readString(data, 'af_ad') } : {}),
      ...(readString(data, 'af_ad_id') ? { initial_ad_id: readString(data, 'af_ad_id') } : {}),
      ...(readString(data, 'af_creative') ? { initial_creative: readString(data, 'af_creative') } : {}),
      ...(readString(data, 'af_keywords', 'af_keyword') ? { initial_keyword: readString(data, 'af_keywords', 'af_keyword') } : {}),
      ...(readString(data, 'af_channel') ? { initial_channel: readString(data, 'af_channel') } : {}),
      ...(readBoolean(data.is_retargeting) !== undefined ? { initial_is_retargeting: readBoolean(data.is_retargeting) } : {}),
      attribution_resolved_at: new Date().toISOString(),
    };

    try {
      // First touch immuable : une réouverture ou un retargeting ultérieur ne
      // doit jamais réattribuer le revenu historique d'acquisition.
      await AsyncStorage.setItem(FIRST_TOUCH_ATTRIBUTION_KEY, JSON.stringify(attribution));
      this.firstTouchAttribution = attribution;
      for (const listener of this.attributionListeners) {
        Promise.resolve(listener(attribution)).catch((error) => {
          console.warn('AppsFlyer attribution listener en erreur:', error);
        });
      }
    } catch (error) {
      console.warn('AppsFlyer attribution non sauvegardée:', error);
    }
  }

  trackEvent(eventName: string, eventValues: Record<string, any> = {}) {
    if (!this.isInitialized) {
      this.pendingEvents.push({ eventName, eventValues });
      console.log('AppsFlyer non initialisé. Événement mis en attente:', eventName);
      return;
    }

    this.sendEvent(eventName, eventValues);
  }

  private flushPendingEvents() {
    const pending = this.pendingEvents.splice(0);
    for (const event of pending) {
      this.sendEvent(event.eventName, event.eventValues);
    }
  }

  private sendEvent(eventName: string, eventValues: Record<string, any>) {
    appsFlyer.logEvent(
      eventName,
      eventValues,
      (result: unknown) => {
        console.log(`✅ AppsFlyer Event: ${eventName} envoyé`, result);
      },
      (error: any) => {
        console.error(`❌ Erreur AppsFlyer Event: ${eventName}`, error);
      }
    );
  }

  setCustomerUserId(userId: string) {
    appsFlyer.setCustomerUserId(userId, (res: unknown) => {
      console.log('✅ AppsFlyer Customer User ID défini');
    });
  }

  async resetCustomerIdentity(userId: string, clearAttribution = false): Promise<void> {
    if (clearAttribution) {
      this.firstTouchAttribution = null;
      this.firstTouchLoadPromise = null;
      await AsyncStorage.removeItem(FIRST_TOUCH_ATTRIBUTION_KEY);
    }
    this.setCustomerUserId(userId);
  }

  async getAppsFlyerUID(): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initPromise;
    }

    if (!this.isInitialized) return null;

    return new Promise((resolve) => {
      appsFlyer.getAppsFlyerUID((error: Error, uid: string) => {
        if (error || !uid) {
          console.warn('AppsFlyer UID indisponible:', error?.message || 'empty');
          resolve(null);
          return;
        }
        resolve(uid);
      });
    });
  }
}

const appsFlyerService = new AppsFlyerService();
export default appsFlyerService;
