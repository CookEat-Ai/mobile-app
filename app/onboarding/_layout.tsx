import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from "expo-router";
import 'react-native-reanimated';

export default function OnboardingLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="secondStep" options={{ headerShown: false }} />
        <Stack.Screen name="thirdStep" options={{ headerShown: false }} />
        <Stack.Screen name="fourthStep" options={{ headerShown: false }} />
        <Stack.Screen name="formQuestion" options={{ headerShown: false }} />
        <Stack.Screen name="socialProof" options={{ headerShown: false }} />
        <Stack.Screen name="try" options={{ headerShown: false }} />
        <Stack.Screen name="offer7days" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false }} />
        <Stack.Screen name="reminder" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider >
  );
}