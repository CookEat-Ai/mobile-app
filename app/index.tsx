import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import 'react-native-reanimated';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // test
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'false');

      let completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      if (completed === null) {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'false');
        completed = 'false';
      }

      setOnboardingCompleted(completed === 'true');
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut onboarding:', error);
    }
  };

  if (isLoading)
    return <Text>Loading...</Text>

  if (onboardingCompleted)
    return <Redirect href="/(tabs)" />

  return (
    <Redirect href="/onboarding/offer7days" />
  );
}