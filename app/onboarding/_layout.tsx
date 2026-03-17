import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from "expo-router";
import 'react-native-reanimated';

export default function OnboardingLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="formQuestion" options={{ headerShown: false }} />
        <Stack.Screen name="loading" options={{ headerShown: false }} />
        <Stack.Screen name="ahaMoment" options={{ headerShown: false }} />
        <Stack.Screen name="ingredientSelection" options={{ headerShown: false }} />
        <Stack.Screen name="personalizedRecipes" options={{ headerShown: false }} />
        <Stack.Screen name="videoDemo" options={{ headerShown: false }} />
        <Stack.Screen name="videoImportTutorial" options={{ headerShown: false }} />
        <Stack.Screen name="promoCode" options={{ headerShown: false }} />
        <Stack.Screen name="reminder" options={{ headerShown: false }} />
        <Stack.Screen name="onboardingProfileReady" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider >
  );
}