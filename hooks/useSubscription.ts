import { useState, useEffect } from 'react';
import apiService from '../services/api';

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
}

interface SubscriptionState {
  subscription: Subscription | null;
  hasSubscription: boolean;
  isLoading: boolean;
}

export const useSubscription = () => {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    subscription: null,
    hasSubscription: false,
    isLoading: true,
  });

  // useEffect(() => {
  //   loadSubscription();
  // }, []);

  const loadSubscription = async () => {
    try {
      setSubscriptionState(prev => ({ ...prev, isLoading: true }));
      const response = await apiService.getCurrentSubscription();

      if (response.data) {
        setSubscriptionState({
          subscription: response.data.subscription,
          hasSubscription: response.data.hasSubscription,
          isLoading: false,
        });
      } else {
        setSubscriptionState({
          subscription: null,
          hasSubscription: false,
          isLoading: false,
        });
      }
    } catch (error) {
      setSubscriptionState({
        subscription: null,
        hasSubscription: false,
        isLoading: false,
      });
    }
  };

  const cancelSubscription = async () => {
    try {
      const response = await apiService.cancelSubscription();
      if (response.data) {
        await loadSubscription();
        return { success: true, message: response.data.message };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur lors de l\'annulation' };
    }
  };

  const reactivateSubscription = async () => {
    try {
      const response = await apiService.reactivateSubscription();
      if (response.data) {
        await loadSubscription();
        return { success: true, message: response.data.message };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur lors de la réactivation' };
    }
  };

  const createCheckoutSession = async (priceId: string, successUrl: string, cancelUrl: string, email: string, firstName: string) => {
    try {
      const response = await apiService.createCheckoutSession(priceId, successUrl, cancelUrl, email, firstName);
      if (response.data) {
        return { success: true, url: response.data.url };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur lors de la création de la session de paiement' };
    }
  };

  const refreshSubscription = async () => {
    await loadSubscription();
  };

  return {
    ...subscriptionState,
    cancelSubscription,
    reactivateSubscription,
    createCheckoutSession,
    refreshSubscription,
  };
}; 