import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Purchases, { PurchasesOffering } from 'react-native-purchases';

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
      const { Linking } = require('react-native');
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