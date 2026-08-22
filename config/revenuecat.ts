import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import { apiService } from '../services/api';

import analytics from '../services/analytics';
import appsFlyerService from '../services/appsflyer';
import { PUBLIC_ENV } from './env';

// Configuration RevenueCat
export const REVENUECAT_API_KEY = {
  ios: PUBLIC_ENV.revenueCatIosApiKey,
  android: PUBLIC_ENV.revenueCatAndroidApiKey,
};

export const ENTITLEMENT_ID = PUBLIC_ENV.revenueCatEntitlementId;
export const PROMO_CODE_STORAGE_KEY = 'promo_code_activated';
const LAST_SUBSCRIPTION_STATUS_KEY = 'rc_last_subscription_status';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  currentPlan: string | null;
  expirationDate: Date | null;
  /** Générations offertes restantes sur la vie du compte (plus de quota quotidien). */
  freeGenerationsRemaining: number;
}

/**
 * Générations offertes sur toute la vie du compte, hors abonnement.
 *
 * Il n'y a plus de remise à zéro quotidienne : avec un paywall dur, offrir une
 * recette par jour revenait à donner la fonctionnalité à qui accepte d'attendre.
 * Cette allocation unique n'a plus qu'un rôle, servir d'aha moment.
 *
 * La valeur reste pilotable à distance : l'API l'expose toujours sous son nom
 * historique `dailySearchLimit`, qu'on interprète désormais comme un total à vie.
 */
const DEFAULT_FREE_GENERATIONS = 1;
const FREE_GENERATIONS_KEY = 'free_generations_used';

class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private freeGenerationLimit: number = DEFAULT_FREE_GENERATIONS;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(appUserID?: string) {
    if (!this.isInitialized && !this.initializationPromise) {
      this.initializationPromise = (async () => {
        await Purchases.configure({
          apiKey: Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android,
          appUserID: appUserID || undefined,
        });

        await this.syncAttributionIdentifiers(appUserID);

        // Récupérer la configuration de l'API sans retarder l'accès au Store.
        void this.fetchAppConfig();

        this.isInitialized = true;
        console.log(`✅ RevenueCat initialisé avec succès ${appUserID ? `(User: ${appUserID})` : ''}`);
      })().catch((error) => {
        // Autoriser une vraie nouvelle tentative après un échec transitoire.
        this.initializationPromise = null;
        console.error('❌ Erreur lors de l\'initialisation de RevenueCat:', error);
        throw error;
      });
    }

    await this.initializationPromise;

    // Le paywall peut avoir déclenché l'initialisation anonyme avant que le
    // layout ait fini de lire l'identité stable. Dans ce cas on fusionne dès
    // qu'elle arrive, sans reconfigurer deux fois le SDK natif.
    if (appUserID) await this.syncAppUserId(appUserID);
  }

  async syncAppUserId(appUserID?: string | null): Promise<void> {
    try {
      const targetUserId = String(appUserID || '').trim();
      if (!targetUserId) return;

      const currentAppUserId = await this.getSafeAppUserId();
      if (currentAppUserId === targetUserId) return;

      // logIn fusionne l'utilisateur anonyme local avec l'identité stable serveur.
      await Purchases.logIn(targetUserId);
      await this.syncAttributionIdentifiers(targetUserId);
      console.log(`🔐 RevenueCat logIn appliqué (${currentAppUserId || 'anonymous'} -> ${targetUserId})`);
    } catch (error) {
      console.error('❌ Erreur sync RevenueCat appUserID:', error);
    }
  }

  private async syncAttributionIdentifiers(appUserID?: string): Promise<void> {
    try {
      const appsFlyerUID = await appsFlyerService.getAppsFlyerUID();
      const attributes: Record<string, string> = {
        ...(await appsFlyerService.getRevenueCatAttributionAttributes()),
      };

      if (appUserID) attributes.$posthogUserId = appUserID;
      if (appsFlyerUID) attributes.$appsflyerId = appsFlyerUID;

      if (Object.keys(attributes).length > 0) {
        await Purchases.setAttributes(attributes);
      }

      // Collecte les identifiants publicitaires disponibles sans contourner
      // les choix ATT/LAT de l'utilisateur.
      await Purchases.collectDeviceIdentifiers();
    } catch (error) {
      console.warn('⚠️ Identifiants attribution RevenueCat non synchronisés:', error);
    }
  }

  private async fetchAppConfig() {
    try {
      const response = await apiService.getAppConfig();
      if (response.data?.dailySearchLimit) {
        this.freeGenerationLimit = response.data.dailySearchLimit;
        console.log('⚙️ Générations offertes (à vie) mises à jour:', this.freeGenerationLimit);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la config:', error);
    }
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    // En mode dev sur Android, on donne accès premium par défaut pour faciliter les tests
    // if (__DEV__ && Platform.OS === 'android') {
    //   console.log('[DevMode] Access premium accordé par défaut sur Android');
    //   return {
    //     isSubscribed: true,
    //     currentPlan: 'dev_mode',
    //     expirationDate: null,
    //     freeGenerationsRemaining: 999
    //   };
    // }

    try {
      // Vérifier d'abord si un code promo a été activé
      const isPromoCodeActivated = await this.isPromoCodeActivated();

      if (isPromoCodeActivated) {
        console.log('✅ Code promo actif - accès premium accordé');
        const status = {
          isSubscribed: true,
          currentPlan: 'promo_code',
          expirationDate: null, // Pas d'expiration pour les codes promo
          freeGenerationsRemaining: 999 // Illimité
        };
        await this.persistLastSubscriptionStatus(status);
        return status;
      }

      let customerInfo = await Purchases.getCustomerInfo();
      let activeEntitlements = customerInfo.entitlements.active || {};
      let activeEntitlementKeys = Object.keys(activeEntitlements);
      let isSubscribed = this.hasActiveSubscription(customerInfo);

      let activeEntitlement = activeEntitlements[ENTITLEMENT_ID] || activeEntitlements[activeEntitlementKeys[0]];
      let currentPlan = activeEntitlement?.productIdentifier || null;
      let expirationDate = activeEntitlement?.expirationDate ? new Date(activeEntitlement.expirationDate) : null;

      // Auto-rattrapage: si non abonné, on retente après synchronisation de l'identité RevenueCat.
      if (!isSubscribed) {
        const storedUserId = await AsyncStorage.getItem('userId');
        const currentAppUserId = await this.getSafeAppUserId();

        if (storedUserId && storedUserId !== currentAppUserId) {
          console.log('🔄 Tentative de resync RevenueCat avant verdict non abonné');
          await this.syncAppUserId(storedUserId);

          customerInfo = await Purchases.getCustomerInfo();
          activeEntitlements = customerInfo.entitlements.active || {};
          activeEntitlementKeys = Object.keys(activeEntitlements);
          isSubscribed = this.hasActiveSubscription(customerInfo);
          activeEntitlement = activeEntitlements[ENTITLEMENT_ID] || activeEntitlements[activeEntitlementKeys[0]];
          currentPlan = activeEntitlement?.productIdentifier || null;
          expirationDate = activeEntitlement?.expirationDate ? new Date(activeEntitlement.expirationDate) : null;
        }
      }

      const freeGenerationsRemaining = await this.getFreeGenerationsRemaining();

      const status = {
        isSubscribed,
        currentPlan,
        expirationDate,
        freeGenerationsRemaining
      };
      await this.persistLastSubscriptionStatus(status);

      console.log('📡 RevenueCat status', {
        appUserID: await this.getSafeAppUserId(),
        originalAppUserId: (customerInfo as any)?.originalAppUserId,
        activeEntitlements: activeEntitlementKeys,
        activeSubscriptions: (customerInfo as any)?.activeSubscriptions || []
      });

      return status;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du statut:', error);
      const cachedStatus = await this.getLastSubscriptionStatus();
      if (cachedStatus) {
        console.log('⚠️ RevenueCat indisponible, utilisation du dernier statut connu');
        return cachedStatus;
      }

      return {
        isSubscribed: false,
        currentPlan: null,
        expirationDate: null,
        freeGenerationsRemaining: 0
      };
    }
  }

  async isSubscribed(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    return status.isSubscribed;
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;

      // Rapporter la variante de paywall (Offering) à PostHog
      if (currentOffering) {
        analytics.setUserProperties({
          paywall_variant: currentOffering.identifier
        });
        console.log(`📊 Paywall Variant reportée à PostHog: ${currentOffering.identifier}`);
      }

      return currentOffering;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des offres:', error);
      return null;
    }
  }

  async purchasePackage(packageToPurchase: any): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const isSubscribed = this.hasActiveSubscription(customerInfo);

      if (isSubscribed) {
        console.log('✅ Achat réussi');
        return true;
      } else {
        console.log('❌ Achat échoué');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'achat:', error);
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isSubscribed = this.hasActiveSubscription(customerInfo);
      return isSubscribed;
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error);
      return false;
    }
  }

  private hasActiveSubscription(customerInfo: any): boolean {
    const active = customerInfo?.entitlements?.active || {};
    if (active[ENTITLEMENT_ID]) {
      return true;
    }
    // Fallback défensif: éviter les faux négatifs si entitlement ID diffère temporairement.
    return Object.keys(active).length > 0;
  }

  private async persistLastSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SUBSCRIPTION_STATUS_KEY, JSON.stringify({
        ...status,
        expirationDate: status.expirationDate ? status.expirationDate.toISOString() : null,
      }));
    } catch {
      // no-op
    }
  }

  private async getLastSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    try {
      const raw = await AsyncStorage.getItem(LAST_SUBSCRIPTION_STATUS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        isSubscribed: Boolean(parsed.isSubscribed),
        currentPlan: parsed.currentPlan ?? null,
        expirationDate: parsed.expirationDate ? new Date(parsed.expirationDate) : null,
        freeGenerationsRemaining: Number(parsed.freeGenerationsRemaining ?? 0),
      };
    } catch {
      return null;
    }
  }

  private async getSafeAppUserId(): Promise<string | null> {
    try {
      return await Purchases.getAppUserID();
    } catch {
      return null;
    }
  }

  private async getFreeGenerationsRemaining(): Promise<number> {
    try {
      const used = parseInt((await AsyncStorage.getItem(FREE_GENERATIONS_KEY)) || '0', 10);
      return Math.max(0, this.freeGenerationLimit - (Number.isFinite(used) ? used : 0));
    } catch (error) {
      console.error('❌ Erreur lors de la lecture des générations offertes:', error);
      return 0;
    }
  }

  /** Consomme une génération offerte. `false` = allocation épuisée. */
  async useFreeGeneration(): Promise<boolean> {
    try {
      // Un code promo actif ouvre l'accès complet : aucune limite.
      if (await this.isPromoCodeActivated()) return true;

      const raw = parseInt((await AsyncStorage.getItem(FREE_GENERATIONS_KEY)) || '0', 10);
      const used = Number.isFinite(raw) ? raw : 0;
      if (used >= this.freeGenerationLimit) return false;

      await AsyncStorage.setItem(FREE_GENERATIONS_KEY, String(used + 1));
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la consommation d\'une génération offerte:', error);
      return false;
    }
  }

  async cancelSubscription(): Promise<boolean> {
    try {
      // RevenueCat ne permet pas de cancellation directe côté client
      // L'utilisateur doit gérer son abonnement via les stores
      const customerInfo = await Purchases.getCustomerInfo();

      // Vérifier si l'utilisateur a un abonnement actif
      const isSubscribed = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (!isSubscribed) {
        console.log('❌ Aucun abonnement actif à annuler');
        return false;
      }

      // Ouvrir les paramètres de l'app pour permettre la gestion de l'abonnement
      await this.openSubscriptionManagement();

      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la cancellation:', error);
      return false;
    }
  }

  private async openSubscriptionManagement(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // Sur iOS, utiliser la méthode RevenueCat
        await Purchases.showManageSubscriptions();
      } else {
        // Sur Android, ouvrir directement Google Play Store
        await this.openGooglePlaySubscriptions();
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'ouverture de la gestion d\'abonnement:', error);
      // Fallback : ouvrir les paramètres généraux de l'app
      throw error;
    }
  }

  private async openGooglePlaySubscriptions(): Promise<void> {
    try {
      const packageName = this.getPackageName();

      // Essayer d'abord d'ouvrir directement la page des abonnements de l'app
      const appSubscriptionsUrl = `https://play.google.com/store/account/subscriptions?package=${packageName}`;

      const canOpenAppSubscriptions = await Linking.canOpenURL(appSubscriptionsUrl);
      if (canOpenAppSubscriptions) {
        await Linking.openURL(appSubscriptionsUrl);
        return;
      }

      // Fallback 1 : Page générale des abonnements
      const generalSubscriptionsUrl = 'https://play.google.com/store/account/subscriptions';
      const canOpenGeneral = await Linking.canOpenURL(generalSubscriptionsUrl);
      if (canOpenGeneral) {
        await Linking.openURL(generalSubscriptionsUrl);
        return;
      }

      // Fallback 2 : Page de l'app sur Google Play Store
      const appStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
      const canOpenAppStore = await Linking.canOpenURL(appStoreUrl);
      if (canOpenAppStore) {
        await Linking.openURL(appStoreUrl);
        return;
      }

      // Fallback 3 : Ouvrir Google Play Store avec le package name
      const marketUrl = `market://details?id=${packageName}`;
      await Linking.openURL(marketUrl);

    } catch (error) {
      console.error('❌ Erreur lors de l\'ouverture de Google Play Store:', error);
      throw error;
    }
  }

  private getPackageName(): string {
    // Package name de l'application Android
    return 'com.gokugen.cookeat';
  }

  // Méthodes pour gérer les codes promo
  async activatePromoCode(code: string): Promise<boolean> {
    try {
      // Valider le code promo via l'API
      const response = await apiService.validatePromoCode(code.trim());

      if (response.data?.isValid) {
        await AsyncStorage.setItem(PROMO_CODE_STORAGE_KEY, 'true');
        
        // Mettre à jour le cache immédiatement
        await this.persistLastSubscriptionStatus({
          isSubscribed: true,
          currentPlan: 'promo_code',
          expirationDate: null,
          freeGenerationsRemaining: 999
        });

        console.log('✅ Code promo activé avec succès');
        return true;
      } else {
        console.log('❌ Code promo invalide:', response.error || response.data?.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'activation du code promo:', error);
      return false;
    }
  }

  async isPromoCodeActivated(): Promise<boolean> {
    try {
      const isActivated = await AsyncStorage.getItem(PROMO_CODE_STORAGE_KEY);
      return isActivated === 'true';
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du code promo:', error);
      return false;
    }
  }

  async deactivatePromoCode(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROMO_CODE_STORAGE_KEY);
      console.log('✅ Code promo désactivé');
    } catch (error) {
      console.error('❌ Erreur lors de la désactivation du code promo:', error);
    }
  }

  async invalidateCache(): Promise<void> {
    try {
      Purchases.invalidateCustomerInfoCache();
    } catch {
      // no-op
    }
  }

}

export default RevenueCatService.getInstance();
