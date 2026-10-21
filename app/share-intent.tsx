import { AppTheme as designTheme, AppRadii } from '../constants/AppTheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { contentColumn } from '../hooks/useResponsive';
import { ClassicLoadingView } from '../components/loading/ClassicLoadingView';
import { importedMealsRoute, importedRecipeRoute } from '../services/importedMealNavigation';
import { apiService } from '../services/api';
import { recipeStorageService } from '../services/recipeStorage';
import analytics from '../services/analytics';
import revenueCatService from '../config/revenuecat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniqueDeviceId } from '../services/deviceStorage';
import { savePendingOnboardingPlanImport } from '../services/weeklyPlanning';


export default function ShareIntentScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    url?: string;
    /** Point d'entrée de l'import : share_sheet par défaut (partage OS). */
    source?: string;
    isOnboarding?: string;
    onboardingNext?: string;
    isPlanImport?: string;
  }>();
  const importSource = params.source || 'share_sheet';
  const isOnboarding = params.isOnboarding === 'true';

  /**
   * Clôt l'onboarding après un import réussi, mais uniquement pour quelqu'un qui
   * a réellement l'accès — abonnement actif ou code promo intégral.
   *
   * Le paywall d'onboarding est une boucle fermée : rien n'en sort sans
   * souscription. Marquer l'onboarding terminé ici sans vérifier l'accès rouvrait
   * une porte dérobée — partager une vidéo depuis TikTok déposait l'utilisateur
   * dans l'app, tunnel jamais terminé, avec la génération gratuite en prime.
   *
   * Pendant l'onboarding on ne clôt jamais : la fiche recette reprend le flux.
   */
  const markOnboardingDoneIfEntitled = useCallback(async () => {
    if (isOnboarding) return;
    let completionMethod: 'subscription' | 'promo_code' = 'subscription';
    try {
      const [{ isSubscribed }, hasPromo] = await Promise.all([
        revenueCatService.getSubscriptionStatus(),
        revenueCatService.isPromoCodeActivated(),
      ]);
      if (!isSubscribed && !hasPromo) return;
      completionMethod = isSubscribed ? 'subscription' : 'promo_code';
    } catch (error) {
      // En cas d'échec de lecture, on ne clôt pas : mieux vaut refaire passer
      // l'utilisateur par le tunnel que lui ouvrir l'app par erreur.
      console.error('[ShareIntent] Vérification d’accès impossible:', error);
      return;
    }
    await AsyncStorage.setItem('questions_answered', 'true');
    await analytics.completeOnboarding({
      source: importSource,
      completion_method: completionMethod,
    });
  }, [isOnboarding, importSource]);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [progressStep, setProgressStep] = useState<string>('init');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (status !== 'success' || !recipe) return;

    // Pendant l'onboarding, la recette importée *est* l'aha moment : on va
    // directement sur la fiche, qui affiche son propre bouton de continuation et
    // reprend le tunnel. Passer par les onglets casserait le tunnel.
    if (isOnboarding) {
      const timer = setTimeout(() => {
        router.replace({
          pathname: '/recipe-detail',
          params: {
            recipeId: recipe.id,
            showGenerateButton: 'false',
            isHistory: 'true',
            isOnboarding: 'true',
            ...(params.onboardingNext ? { onboardingNext: params.onboardingNext } : {}),
            ...(params.isPlanImport === 'true' ? { isPlanImport: 'true' } : {}),
          },
        });
      }, 1500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      router.dismissTo(importedMealsRoute());
      setTimeout(() => {
        router.push(importedRecipeRoute(recipe.id));
      }, 100);
    }, 1500);
    return () => clearTimeout(timer);
  }, [status, recipe, router, isOnboarding, params.onboardingNext, params.isPlanImport]);

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    setStatus('loading'); setRecipe(null); setIsQuotaError(false);
    setErrorMessage(''); setProgressStep('init');
    const fail = (message: string, quota = false) => {
      if (!active) return;
      setIsQuotaError(quota); setErrorMessage(message); setStatus('error');
    };
    // Also bound identity/subscription preparation, before an SSE exists.
    const deadline = setTimeout(() => {
      fail(t('shareIntent.timeout'));
      active = false;
      abort.abort();
    }, 330000);
    const start = setTimeout(() => {
      void (async () => {
        try {
          if (!params.url) { fail(t('shareIntent.genericError')); return; }
          void analytics.track('import_started', { source: importSource }).catch(() => undefined);
          let userId = await AsyncStorage.getItem('userId');
          if (!active) return;
          if (!userId) {
            const mobileId = await getUniqueDeviceId();
            if (!active) return;
            const userResponse = await apiService.saveOnboardingAnswers({ skipped_onboarding: 'true' }, mobileId);
            if (!active) return;
            if (userResponse.data?.userId) {
              userId = userResponse.data.userId;
              await AsyncStorage.setItem('userId', userId);
              void analytics.identify(userId).catch(() => undefined);
            }
          }
          const { isSubscribed } = await revenueCatService.getSubscriptionStatus();
          if (!active) return;
          const response = await apiService.importRecipeFromVideo(params.url, isSubscribed, {
            signal: abort.signal,
            onProgress: (_value, step) => {
              if (!active) return;
              if (step) setProgressStep(step);
            },
          });
          if (!active) return;
          if (response.error || !response.data?.recipe) {
            fail(response.error || t('shareIntent.genericError'), /quota|premium/i.test(response.error || ''));
            return;
          }
          const imported = response.data.recipe;
          // The saved recipe is ready. Optional subscription/analytics work
          // must never hold the success screen or delay access to that recipe.
          if (isOnboarding && params.isPlanImport === 'true') await savePendingOnboardingPlanImport(imported.id);
          if (!active) return;
          setRecipe(imported); setStatus('success');
          void recipeStorageService.saveGeneratedRecipe(imported, []).catch(() => undefined);
          void markOnboardingDoneIfEntitled().catch(() => undefined);
          void analytics.track('import_completed', { source: importSource, during_onboarding: isOnboarding, is_retry: attempt > 0 }).catch(() => undefined);
          void analytics.markFeatureUsed('import').catch(() => undefined);
          void analytics.trackFirstAction('import', { source: importSource }).catch(() => undefined);
        } catch {
          fail(t('shareIntent.genericError'));
          void analytics.track('import_failed', { error_type: 'import_error', source: importSource }).catch(() => undefined);
        } finally { clearTimeout(deadline); }
      })();
    }, 0);
    return () => { active = false; clearTimeout(start); clearTimeout(deadline); abort.abort(); };
  }, [params.url, params.isPlanImport, importSource, isOnboarding, attempt, t, markOnboardingDoneIfEntitled]);

  const handleGoHome = () => {
    // Un import raté pendant l'onboarding ne doit pas éjecter vers les onglets :
    // on reprend le tunnel là où il devait continuer.
    if (isOnboarding && params.onboardingNext) {
      router.replace(params.onboardingNext as any);
      return;
    }
    router.replace('/(tabs)');
  };

  const handleRetry = () => {
    if (params.url) setAttempt(value => value + 1);
  };

  if (status === 'loading') return <ClassicLoadingView mode="request" messageKey={`shareIntent.progressStep.${progressStep}`} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {status === 'success' && recipe && (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.light.button} />
            </View>
            <Text style={styles.title}>{t('shareIntent.success')}</Text>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={80} color="#FF4444" />
            </View>
            <Text style={styles.title}>{t('shareIntent.errorTitle')}</Text>
            <Text style={styles.subtitle}>{errorMessage}</Text>

            <View style={styles.buttonContainer}>
              {isQuotaError ? (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => router.push({ pathname: '/paywall', params: { source: 'video_import_quota' } })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={20} color={designTheme.onPrimary} />
                  <Text style={styles.retryButtonText}>{t('shareIntent.upgrade')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                  <Ionicons name="refresh" size={20} color={designTheme.onPrimary} />
                  <Text style={styles.retryButtonText}>{t('shareIntent.retry')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.homeButton} onPress={handleGoHome} activeOpacity={0.8}>
                <Ionicons name="home-outline" size={20} color={Colors.light.text} />
                <Text style={styles.homeButtonText}>{t('shareIntent.goHome')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    ...contentColumn(),
    alignItems: 'center',
    gap: 32,
  },
  title: {
    fontSize: 28,
    color: Colors.light.text,
    textAlign: 'center',
    fontFamily: 'Degular'
  },
  subtitle: {
    fontFamily: 'CronosPro',
    fontSize: 16,
    color: designTheme.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  recipeTitle: {
    fontFamily: 'CronosProBold',
    fontSize: 18,
    color: Colors.light.button,
    textAlign: 'center'
  },
  successIcon: {
    marginBottom: 8,
  },
  errorIcon: {
    marginBottom: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: Colors.light.button,
    borderRadius: AppRadii.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: designTheme.onPrimary,
    fontFamily: 'CronosProBold',
    fontSize: 18,
  },
  homeButton: {
    backgroundColor: designTheme.surface,
    borderRadius: AppRadii.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: designTheme.line,
  },
  homeButtonText: {
    color: Colors.light.text,
    fontFamily: 'CronosProBold',
    fontSize: 18
  },
});
