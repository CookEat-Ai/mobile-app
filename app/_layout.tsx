import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RecipeProvider } from '../contexts/RecipeContext';
import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import { cleanupVoiceGlobally } from '../hooks/useVoice';
import revenueCatService from '../config/revenuecat';
import recipeStorageService from "../services/recipeStorage";
import analytics from '../services/analytics';
import apiService from '../services/api';
import { getUniqueDeviceId } from '../services/deviceStorage';
import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '../config/sentry';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetworkStatusBanner from '../components/NetworkStatusBanner';

import '../i18n';

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !__DEV__,
});

SplashScreen.preventAutoHideAsync();

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[.,;:!?)]+$/, '') : null;
}

function ShareIntentHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;

    console.log('[ShareIntent] raw intent:', JSON.stringify(shareIntent));

    const raw = shareIntent.webUrl || shareIntent.text || '';
    const url = extractUrl(raw);

    console.log('[ShareIntent] extracted url:', url);

    resetShareIntent();

    if (url) {
      router.replace({
        pathname: '/share-intent',
        params: { url },
      });
    } else {
      router.replace('/(tabs)');
    }
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}

function RootLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const config = await apiService.getAppConfig();
        if (config.data?.minAppVersion) {
          const currentVersion = Constants.expoConfig?.version || '1.0.0';
          if (compareVersions(currentVersion, config.data.minAppVersion) < 0) {
            Alert.alert(
              t('update.title'),
              t('update.message'),
              [
                {
                  text: t('update.button'),
                  onPress: () => {
                    const storeUrl = Platform.OS === 'ios'
                      ? Constants.expoConfig?.ios?.appStoreUrl || 'https://apps.apple.com/fr/app/cookeat-ai/id6748924011'
                      : Constants.expoConfig?.android?.playStoreUrl || `market://details?id=com.gokugen.cookeat`;
                    Linking.openURL(storeUrl).then(() => {
                      // On affiche à nouveau l'alerte pour bloquer l'usage si l'utilisateur revient sans avoir mis à jour
                      checkVersion();
                    });
                  }
                }
              ],
              { cancelable: false }
            );
          }
        }
      } catch (e) {
        console.error('[VersionCheck] Error:', e);
      }
    };

    checkVersion();
  }, [t]);

  useEffect(() => {
    const initAnalytics = async () => {
      const uniqueId = await analytics.init();
      analytics.track('app_opened');

      // Initialiser RevenueCat avec le même ID que PostHog
      if (uniqueId) {
        revenueCatService.initialize(uniqueId);
      } else {
        revenueCatService.initialize();
      }

      // Récupérer le pays de l'utilisateur
      const countryCode = Localization.getLocales()?.[0]?.regionCode || 'Unknown';
      analytics.setCountry(countryCode);

      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        analytics.identify(userId);
      }

    };

    const syncUserIdentity = async () => {
      try {
        const mobileId = await getUniqueDeviceId();
        const storedUserId = await AsyncStorage.getItem('userId');
        const response = await apiService.getCurrentUser(mobileId);

        if (response.data?._id) {
          const serverUserId = String(response.data._id);

          // Toujours aligner RevenueCat sur l'identité serveur stable.
          await revenueCatService.syncAppUserId(serverUserId);

          if (storedUserId !== serverUserId) {
            console.log('[Sync] userId corrigé:', storedUserId, '→', serverUserId);
            await AsyncStorage.setItem('userId', serverUserId);
            analytics.identify(serverUserId);

            try {
              await revenueCatService.restorePurchases();
              console.log('[Sync] RevenueCat purchases restaurées après resync identité');
            } catch (e) {
              console.error('[Sync] Erreur restore purchases:', e);
            }
          }
        } else if (response.error && storedUserId) {
          console.log('[Sync] userId obsolète, suppression locale sans redirection');
          await AsyncStorage.removeItem('userId');

          try {
            await revenueCatService.restorePurchases();
          } catch {}
        }
      } catch {
        // Silencieux : réseau indisponible
      }
    };

    initAnalytics().then(() => syncUserIdentity());
  }, []);

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'CronosPro': require('../assets/fonts/CronosPro.otf'),
    'CronosProBold': require('../assets/fonts/CronosProBold.otf'),
    'Degular': require('../assets/fonts/Degular.otf'),
    'Degular Semibold': require('../assets/fonts/Degular Semibold.otf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Nettoyer Voice quand l'application se ferme
  useEffect(() => {
    recipeStorageService.cleanupOldRecipes();
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
    <SafeAreaProvider>
      <ShareIntentProvider>
        <RecipeProvider>
          <ThemeProvider value={DefaultTheme}>
            <NetworkStatusBanner />
            <ShareIntentHandler />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'none' }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
              <Stack.Screen name="recipe-detail" options={{ headerShown: false }} />
              <Stack.Screen name="favorites-list" options={{ headerShown: false }} />
              <Stack.Screen name="share-intent" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="recipe-loading" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="recipe-loading-modal" options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
              <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
              <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
            </Stack>
          </ThemeProvider>
        </RecipeProvider>
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);