import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { MODAL_ROUTE_ANIMATION } from '../../constants/ModalPresentation';
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
        <Stack.Screen name="generationDemo" options={{ headerShown: false }} />
        <Stack.Screen name="videoImportTutorial" options={{ headerShown: false, presentation: 'modal', animation: MODAL_ROUTE_ANIMATION, gestureEnabled: true }} />
        <Stack.Screen name="weeklyPlanPreview" options={{ headerShown: false }} />
        <Stack.Screen name="photoTrackingDemo" options={{ headerShown: false }} />
        <Stack.Screen name="promoCode" options={{ headerShown: false }} />
        <Stack.Screen name="offerTrial" options={{ headerShown: false }} />
        <Stack.Screen name="reminder" options={{ headerShown: false }} />
        <Stack.Screen name="onboardingProfileReady" options={{ headerShown: false }} />
        <Stack.Screen name="trajectory" options={{ headerShown: false }} />
        <Stack.Screen name="commitment" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider >
  );
}
