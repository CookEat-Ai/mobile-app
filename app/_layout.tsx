import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import { RecipeProvider } from '../contexts/RecipeContext';
import { useEffect, useState } from 'react';
import { cleanupVoiceGlobally } from '../hooks/useVoice';
import revenueCatService from '../config/revenuecat';
import recipeStorageService from "../services/recipeStorage";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Cronos Pro': require('../assets/fonts/Cronos Pro.ttf'),
    'Cronos Pro Bold': require('../assets/fonts/Cronos Pro_bold.ttf'),
    'Degular': require('../assets/fonts/Degular.otf'),
    'Degular Semibold': require('../assets/fonts/Degular Semibold.otf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    revenueCatService.initialize();
  }, []);

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

  if (!loaded && !error) {
    return null;
  }

  return (
    <RecipeProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="recipe-detail" options={{ headerShown: false }} />
          <Stack.Screen name="paywall" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </RecipeProvider>
  );
}