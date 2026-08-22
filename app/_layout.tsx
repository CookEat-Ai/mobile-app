import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RecipeProvider } from '../contexts/RecipeContext';
import { useEffect, useRef, useState } from 'react';
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
import * as QuickActions from 'expo-quick-actions';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import {
  TRY_FREE_OFFERING_ID,
  TRY_FREE_ANDROID_PRODUCT_ID,
  TRY_FREE_ANDROID_SOURCE,
  TRY_FREE_IOS_PRODUCT_ID,
  TRY_FREE_IOS_SOURCE,
  TRY_FREE_QUICK_ACTION_ID,
  QUICK_ACTION_ANALYTICS_SOURCE,
  QUICK_ACTION_ENTRY_POINT,
} from '../services/quickActions';
import { resolveQuickActionTrial } from '../services/trialEligibility';
import { APP_ENVIRONMENT } from '../config/env';
import { DevOnboardingResetButton } from '../components/onboarding/DevOnboardingResetButton';
import { syncTrialReminderWithCustomerInfo } from '../services/trialReminder';
import { resolveAppEntryRoute } from '../services/appEntryRoute';
import { hydrateRecipePreferencesFromServer } from '../services/recipePreferences';

import '../i18n';

// Conserve toujours une route sous les écrans présentés en modal, y compris
// lors d'un deep link ou d'une restauration système directement vers eux.
export const unstable_settings = {
  anchor: 'index',
};

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !__DEV__,
  environment: APP_ENVIRONMENT,
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

    if (!url) {
      router.replace('/(tabs)');
      return;
    }

    (async () => {
      // Un partage depuis TikTok pendant l'onboarding (le tutoriel invite
      // justement à le faire) sortait définitivement du tunnel : l'import
      // marquait l'onboarding terminé et l'utilisateur ne voyait jamais le
      // paywall. On préserve donc le tunnel et on le reprend après l'import.
      let inOnboarding = false;
      try {
        inOnboarding = (await AsyncStorage.getItem('onboarding_completed')) !== 'true';
      } catch {
        // En cas de doute on garde l'ancien comportement (import direct).
      }

      if (inOnboarding) {
        // Importer avant d'avoir répondu à la question de segmentation est le
        // signal d'intention le plus fort qui existe : on le prend pour argent
        // comptant plutôt que de perdre la dimension.
        const declared = await analytics.getEntryFeature();
        if (!declared) {
          await analytics.setEntryFeature('import', { implicit: true, reason: 'share_intent_during_onboarding' });
        }
      }

      router.replace({
        pathname: '/share-intent',
        params: {
          url,
          source: 'share_sheet',
          ...(inOnboarding
            ? { isOnboarding: 'true', onboardingNext: '/onboarding/formQuestion?initialStep=socialProof' }
            : {}),
        },
      });
    })();
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}

/**
 * Action affichée lors d'un appui long sur l'icône de l'app.
 *
 * Elle est dynamique afin de suivre la langue choisie dans CookEat. Le premier
 * lancement depuis l'action est exposé par `QuickActions.initial`, tandis que
 * le listener couvre les ouvertures lorsque le processus est encore vivant.
 */
function QuickActionHandler({ revenueCatReady }: { revenueCatReady: boolean }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const initialActionHandled = useRef(false);
  const trialEligibility = useRef<'eligible' | 'ineligible' | 'unknown'>('unknown');
  const quickActionSource = Platform.OS === 'android'
    ? TRY_FREE_ANDROID_SOURCE
    : TRY_FREE_IOS_SOURCE;
  const quickActionProductId = Platform.OS === 'android'
    ? TRY_FREE_ANDROID_PRODUCT_ID
    : TRY_FREE_IOS_PRODUCT_ID;

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    let cancelled = false;
    const configure = async () => {
      const resolved = revenueCatReady
        ? await resolveQuickActionTrial(TRY_FREE_OFFERING_ID, quickActionProductId)
        : { status: 'unknown' as const };
      if (cancelled) return;

      trialEligibility.current = resolved.status;
      const canTryFree = resolved.status === 'eligible';
      await QuickActions.setItems([
        {
          id: TRY_FREE_QUICK_ACTION_ID,
          title: t(canTryFree ? 'quickActions.tryFree.title' : 'quickActions.discount.title'),
          subtitle: Platform.OS === 'ios'
            ? t(canTryFree ? 'quickActions.tryFree.subtitle' : 'quickActions.discount.subtitle')
            : undefined,
          icon: Platform.OS === 'ios' ? 'symbol:gift.fill' : undefined,
          params: {
            offering: TRY_FREE_OFFERING_ID,
          },
        },
      ]);
    };

    const customerInfoListener = (_customerInfo: CustomerInfo) => {
      void configure().catch((quickActionError) => {
        console.error('[QuickActions] Impossible d’actualiser l’offre:', quickActionError);
      });
    };

    void configure().catch((quickActionError) => {
      console.error('[QuickActions] Impossible de configurer l’offre:', quickActionError);
    });
    if (revenueCatReady) Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    return () => {
      cancelled = true;
      if (revenueCatReady) Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [i18n.resolvedLanguage, quickActionProductId, revenueCatReady, t]);

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    const openTryFreeOffer = (action: QuickActions.Action, coldStart = false) => {
      if (action.id !== TRY_FREE_QUICK_ACTION_ID) return;

      analytics.track('quick_action_triggered', {
        source: QUICK_ACTION_ANALYTICS_SOURCE,
        source_detail: quickActionSource,
        entry_point: QUICK_ACTION_ENTRY_POINT,
        action_id: action.id,
        offering_id: TRY_FREE_OFFERING_ID,
        product_id: quickActionProductId,
        platform: Platform.OS,
        trial_eligibility: trialEligibility.current,
        placement: 'quick_action_offer',
      });

      const paywallHref = {
        pathname: '/paywall' as const,
        params: {
          source: quickActionSource,
          initialState: 'DISCOUNTED',
          completeOnPurchase: 'true',
        },
      };

      // Une route déclarée `presentation: modal` a tout de même besoin d'un
      // écran sous-jacent. Au lancement à froid, on installe d'abord la vraie
      // destination de l'app, puis on pousse le paywall au-dessus. Un `replace`
      // direct faisait du paywall la racine et cassait sa géométrie de sheet.
      setTimeout(() => {
        if (!coldStart) {
          router.push(paywallHref);
          return;
        }

        void resolveAppEntryRoute()
          .then((baseRoute) => {
            router.replace(baseRoute);
            setTimeout(() => router.push(paywallHref), 0);
          })
          .catch((routeError) => {
            console.error('[QuickActions] Destination racine introuvable:', routeError);
            router.replace('/onboarding/welcome');
            setTimeout(() => router.push(paywallHref), 0);
          });
      }, 0);
    };

    if (QuickActions.initial && !initialActionHandled.current) {
      initialActionHandled.current = true;
      openTryFreeOffer(QuickActions.initial, true);
    }

    const subscription = QuickActions.addListener((action) => openTryFreeOffer(action));
    return () => subscription.remove();
  }, [quickActionProductId, quickActionSource, router]);

  return null;
}

function TrialReminderLifecycle({ revenueCatReady }: { revenueCatReady: boolean }) {
  useEffect(() => {
    if (!revenueCatReady) return;

    const sync = (customerInfo: CustomerInfo) => {
      void syncTrialReminderWithCustomerInfo(customerInfo).catch((error) => {
        console.warn('[TrialReminder] Synchronisation impossible:', error);
      });
    };

    void Purchases.getCustomerInfo().then(sync).catch(() => {});
    Purchases.addCustomerInfoUpdateListener(sync);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(sync);
    };
  }, [revenueCatReady]);

  return null;
}

function RootLayout() {
  const { t } = useTranslation();
  const [revenueCatReady, setRevenueCatReady] = useState(false);

  useEffect(() => {
    // La mise à jour forcée est une protection de production : elle bloque l'app
    // derrière une alerte non annulable. En dev, `minAppVersion` de l'API locale est
    // presque toujours en avance sur la version du build en cours (1.5.1 vs 1.5.0
    // aujourd'hui), ce qui rend l'app inutilisable dès le lancement.
    if (__DEV__) return;

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
      const canonicalUserId = await analytics.init();
      analytics.track('app_opened');

      // Utiliser dès le premier lancement l'identité d'installation commune,
      // puis la fusionner avec l'identité serveur stable lorsqu'elle existe.
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        await revenueCatService.initialize(storedUserId);
        analytics.identify(storedUserId);
      } else {
        await revenueCatService.initialize(canonicalUserId || undefined);
      }
      setRevenueCatReady(true);

      // Récupérer le pays de l'utilisateur
      const countryCode = Localization.getLocales()?.[0]?.regionCode || 'Unknown';
      analytics.setCountry(countryCode);
    };

    const syncUserIdentity = async () => {
      try {
        const mobileId = await getUniqueDeviceId();
        const storedUserId = await AsyncStorage.getItem('userId');
        const response = await apiService.getCurrentUser(mobileId);

        if (response.data?._id) {
          const serverUserId = String(response.data._id);

          // Restaure le profil culinaire après réinstallation sans écraser les
          // choix que l'utilisateur a déjà modifiés sur cet appareil.
          await hydrateRecipePreferencesFromServer(response.data);

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
          await analytics.resetIdentity({ rotateDeviceId: false, clearAttribution: false });

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
            <QuickActionHandler revenueCatReady={revenueCatReady} />
            <TrialReminderLifecycle revenueCatReady={revenueCatReady} />
            <DevOnboardingResetButton />
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
              {/* Tous les points d'entrée poussent cette route au-dessus d'un
                  écran valide, mais le contrat visuel reste plein écran : le
                  paywall final contient l'offre, la preuve sociale et toutes
                  les mentions commerciales, sans l'affordance de fermeture
                  propre à une sheet iOS. */}
              <Stack.Screen
                name="paywall"
                options={{
                  headerShown: false,
                  presentation: 'fullScreenModal',
                  gestureEnabled: false,
                }}
              />
            </Stack>
          </ThemeProvider>
        </RecipeProvider>
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
