import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import 'react-native-reanimated';
import { resetVoiceCompletely } from '../hooks/useVoice';
import revenueCatService from '../config/revenuecat';
import i18n from "../i18n";

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [shouldShowPaywall, setShouldShowPaywall] = useState(false);

  useEffect(() => {
    // loadLanguageFromStorage();
    checkAppState();
    resetVoiceCompletely();

    setTimeout(() => {
      showPaywallIfNeeded();
    }, 1000);
  }, []);

  const checkAppState = async () => {
    try {
      // Vérifier l'onboarding
      let completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      if (completed === null) {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'false');
        completed = 'false';
      }

      setOnboardingCompleted(completed === 'true');
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut:', error);
      setIsLoading(false);
    }
  };

  const showPaywallIfNeeded = async () => {
    try {
      // Vérifier si l'utilisateur a un abonnement
      const subscriptionStatus = await revenueCatService.getSubscriptionStatus();

      // Afficher le paywall seulement si l'utilisateur n'a pas d'abonnement
      if (!subscriptionStatus.isSubscribed) {
        setShouldShowPaywall(true);
        router.push('/paywall');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'abonnement:', error);
    }
  };

  if (isLoading)
    return <Text>Loading...</Text>

  if (onboardingCompleted)
    return <Redirect href="/onboarding" />

  if (shouldShowPaywall)
    return <Redirect href="/paywall" />

  return (
    <Redirect href="/(tabs)" />
  );
}