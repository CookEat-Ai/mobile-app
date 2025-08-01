import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import { RecipeProvider } from '../contexts/RecipeContext';
import { useEffect } from 'react';
import { cleanupVoiceGlobally } from '../hooks/useVoice';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Cronos Pro': require('../assets/fonts/Cronos Pro.ttf'),
    'Cronos Pro Bold': require('../assets/fonts/Cronos Pro_bold.ttf'),
    'Degular': require('../assets/fonts/Degular.otf'),
    'Degular Semibold': require('../assets/fonts/Degular Semibold.otf'),
  });

  // Nettoyer Voice quand l'application se ferme
  useEffect(() => {
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