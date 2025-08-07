import Purchases, { PurchasesOffering } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configuration RevenueCat
export const REVENUECAT_API_KEY = {
  ios: 'appl_lhnWEUTIJSRJjlJziMnDGcLpsPh',
  android: 'goog_YOUR_PUBLIC_ANDROID_API_KEY_HERE'
};

export const ENTITLEMENT_ID = 'Pro';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  currentPlan: string | null;
  expirationDate: Date | null;
  dailyQuotaRemaining: number;
}

class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await Purchases.configure({
        apiKey: Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android,
        // appUserID: "", // RevenueCat générera un ID automatiquement
      });

      this.isInitialized = true;
      console.log('✅ RevenueCat initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de RevenueCat:', error);
    }
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const obj = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const isSubscribed = typeof obj !== 'undefined';

      const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const currentPlan = activeEntitlement?.productIdentifier || null;
      const expirationDate = activeEntitlement?.expirationDate ? new Date(activeEntitlement.expirationDate) : null;

      // Gérer le quota quotidien pour les utilisateurs gratuits
      const dailyQuotaRemaining = await this.getDailyQuotaRemaining();

      return {
        isSubscribed,
        currentPlan,
        expirationDate,
        dailyQuotaRemaining
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du statut:', error);
      return {
        isSubscribed: false,
        currentPlan: null,
        expirationDate: null,
        dailyQuotaRemaining: 0
      };
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des offres:', error);
      return null;
    }
  }

  async purchasePackage(packageToPurchase: any): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const obj = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (typeof obj !== 'undefined') {
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
      const isSubscribed = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      return isSubscribed;
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error);
      return false;
    }
  }

  private async getDailyQuotaRemaining(): Promise<number> {
    try {
      // Utiliser la date locale pour s'assurer que le quota se remet à zéro à minuit
      const now = new Date();
      const today = now.toLocaleDateString('fr-FR'); // Format: DD/MM/YYYY
      const quotaKey = `daily_quota_${today}`;
      const usedQuota = await AsyncStorage.getItem(quotaKey);

      if (!usedQuota) {
        await AsyncStorage.setItem(quotaKey, '0');
        return 1; // 1 recette gratuite par jour
      }

      const used = parseInt(usedQuota);
      return Math.max(0, 1 - used);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du quota:', error);
      return 0;
    }
  }

  async useDailyQuota(): Promise<boolean> {
    try {
      const today = new Date().toDateString();
      const quotaKey = `daily_quota_${today}`;
      const usedQuota = await AsyncStorage.getItem(quotaKey);

      const used = parseInt(usedQuota || '0');
      if (used >= 1) {
        return false; // Quota épuisé
      }

      await AsyncStorage.setItem(quotaKey, (used + 1).toString());
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'utilisation du quota:', error);
      return false;
    }
  }
}

export default RevenueCatService.getInstance(); 