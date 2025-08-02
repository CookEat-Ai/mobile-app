import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import 'react-native-reanimated';
import { RecipeProvider } from '../contexts/RecipeContext';
import { useEffect, useState } from 'react';
import { cleanupVoiceGlobally } from '../hooks/useVoice';
import revenueCatService from '../config/revenuecat';
import { AppState } from 'react-native';
import recipeStorageService from "../services/recipeStorage";

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Cronos Pro': require('../assets/fonts/Cronos Pro.ttf'),
    'Cronos Pro Bold': require('../assets/fonts/Cronos Pro_bold.ttf'),
    'Degular': require('../assets/fonts/Degular.otf'),
    'Degular Semibold': require('../assets/fonts/Degular Semibold.otf'),
  });

  const router = useRouter();
  const [appState, setAppState] = useState(AppState.currentState);
  const [hasShownPaywall, setHasShownPaywall] = useState(false);

  useEffect(() => {
    // Initialiser RevenueCat
    revenueCatService.initialize();

    // Afficher le paywall au démarrage si nécessaire
    setTimeout(() => {
      showPaywallIfNeeded();
    }, 1000); // Délai pour laisser l'app se charger
  }, []);

  // Gérer les changements d'état de l'app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // L'app revient en foreground
        showPaywallIfNeeded();
      }
      setAppState(nextAppState as any);
      cleanupVoiceGlobally();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      handleAppStateChange('background');
    };
  }, [appState]);

  const showPaywallIfNeeded = async () => {
    try {
      // Vérifier si l'utilisateur a un abonnement
      const subscriptionStatus = await revenueCatService.getSubscriptionStatus();

      // Afficher le paywall seulement si l'utilisateur n'a pas d'abonnement
      // et qu'on ne l'a pas déjà affiché dans cette session
      if (!subscriptionStatus.isSubscribed && !hasShownPaywall) {
        setHasShownPaywall(true);
        router.push('/paywall');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'abonnement:', error);
    }
  };

  // Nettoyer Voice quand l'application se ferme
  useEffect(() => {
    recipeStorageService.cleanupOldRecipes(1);
    const handleAppStateChange = () => {
      cleanupVoiceGlobally();
    };

    // Nettoyer Voice au démontage du composant
    return () => {
      handleAppStateChange();
    };
  }, []);

  return (
    <RecipeProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="recipe-detail" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </RecipeProvider>
  );
}