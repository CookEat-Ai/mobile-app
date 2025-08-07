import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import revenueCatService, { SubscriptionStatus } from '../config/revenuecat';

export const useSubscription = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    currentPlan: null,
    expirationDate: null,
    dailyQuotaRemaining: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await revenueCatService.getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du statut:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPremiumAccess = (feature: string): boolean => {
    if (subscriptionStatus.isSubscribed) {
      return true;
    }

    // Rediriger directement vers le paywall selon la fonctionnalité
    showPaywallForFeature(feature);
    return false;
  };

  const showPaywallForFeature = (feature: string) => {
    // Rediriger directement vers le paywall sans alerte
    router.push('/paywall');
  };

  const useDailyQuota = async (): Promise<boolean> => {
    if (subscriptionStatus.isSubscribed) {
      return true; // Pas de limite pour les abonnés
    }

    const canUse = await revenueCatService.useDailyQuota();
    if (!canUse) {
      showPaywallForFeature('daily_quota');
      return false;
    }

    // Recharger le statut pour mettre à jour le quota
    await loadSubscriptionStatus();
    return true;
  };

  const cancelSubscription = async (): Promise<boolean> => {
    try {
      const success = await revenueCatService.cancelSubscription();
      if (success) {
        // Recharger le statut après la cancellation
        await loadSubscriptionStatus();
      }
      return success;
    } catch (error) {
      console.error('❌ Erreur lors de la cancellation:', error);
      return false;
    }
  };

  return {
    subscriptionStatus,
    isLoading,
    checkPremiumAccess,
    useDailyQuota,
    loadSubscriptionStatus,
    cancelSubscription
  };
}; 