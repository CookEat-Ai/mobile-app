import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, AppState } from 'react-native';
import 'react-native-reanimated';
import { resetVoiceCompletely } from '../hooks/useVoice';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const PAYWALL_SHOWN_KEY = 'paywall_shown';
const LAST_APP_OPEN_KEY = 'last_app_open';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [shouldShowPaywall, setShouldShowPaywall] = useState(false);

  useEffect(() => {
    checkAppState();
    resetVoiceCompletely();
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

      // Vérifier si on doit afficher le paywall
      await checkPaywallDisplay();

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut:', error);
      setIsLoading(false);
    }
  };

  const checkPaywallDisplay = async () => {
    try {
      const lastOpen = await AsyncStorage.getItem(LAST_APP_OPEN_KEY);
      const paywallShown = await AsyncStorage.getItem(PAYWALL_SHOWN_KEY);

      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

      // Si c'est la première fois ou si ça fait plus d'un jour
      if (!lastOpen || (now - parseInt(lastOpen)) > oneDay) {
        // Vérifier si le paywall a déjà été montré aujourd'hui
        const today = new Date().toDateString();
        const lastPaywallDate = await AsyncStorage.getItem('paywall_last_shown_date');

        if (lastPaywallDate !== today) {
          setShouldShowPaywall(true);
          await AsyncStorage.setItem('paywall_last_shown_date', today);
        }
      }

      // Sauvegarder la date d'ouverture actuelle
      await AsyncStorage.setItem(LAST_APP_OPEN_KEY, now.toString());
    } catch (error) {
      console.error('Erreur lors de la vérification du paywall:', error);
    }
  };

  // Écouter les changements d'état de l'app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // L'app devient active (retour en premier plan)
        checkPaywallDisplay();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  if (isLoading)
    return <Text>Loading...</Text>

  if (shouldShowPaywall)
    return <Redirect href="/paywall" />

  if (onboardingCompleted)
    return <Redirect href="/(tabs)" />

  return (
    <Redirect href="/onboarding/offer7days" />
  );
}