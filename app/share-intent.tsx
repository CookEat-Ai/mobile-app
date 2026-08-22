import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { rw } from '../constants/Layout';
import { contentColumn } from '../hooks/useResponsive';
import { apiService } from '../services/api';
import { recipeStorageService } from '../services/recipeStorage';
import analytics from '../services/analytics';
import revenueCatService from '../config/revenuecat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniqueDeviceId } from '../services/deviceStorage';


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
  const markOnboardingDoneIfEntitled = async () => {
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
  };

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isDataReady, setIsDataReady] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('init');

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  // Fluid progression logic
  useEffect(() => {
    if (status !== 'loading') return;

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= 100) {
          if (isDataReady) {
            // Wait a tiny bit at 100% for the visual impact
            setTimeout(() => setStatus('success'), 200);
          }
          return 100;
        }

        let increment = 0;
        if (progress > prev) {
          // Catch up phase: move faster to reach the real progress
          // The speed depends on the distance
          const distance = progress - prev;
          increment = Math.max(0.3, distance / 12);
        } else {
          // Slow crawl phase: continue moving to feel "alive"
          // Speed decreases as we get closer to 100% to never actually reach it
          // unless progress is set to 100
          increment = Math.max(0.01, (100 - prev) / 600);
        }

        const next = prev + increment;
        return next >= 100 ? (isDataReady ? 100 : 99.9) : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [status, progress, isDataReady]);

  // Sync Animated.Value with displayProgress
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: displayProgress,
      duration: 50,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [displayProgress, progressAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, fadeAnim]);

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
          },
        });
      }, 1500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      router.replace('/(tabs)/imported');
      setTimeout(() => {
        router.push({
          pathname: '/recipe-detail',
          params: {
            recipeId: recipe.id,
            showGenerateButton: 'false',
            isHistory: 'true',
          },
        });
      }, 100);
    }, 1500);
    return () => clearTimeout(timer);
  }, [status, recipe, router, isOnboarding, params.onboardingNext]);

  useEffect(() => {
    if (hasStarted.current) return;
    if (!params.url) {
      console.log('[ShareIntent] no url param, aborting');
      setErrorMessage(t('shareIntent.genericError'));
      setStatus('error');
      return;
    }
    hasStarted.current = true;

    // Ne jamais envoyer l'URL complète à l'analytics : elle peut contenir un
    // identifiant de compte, de vidéo ou un paramètre de partage personnel.
    console.log('[ShareIntent] import started from:', importSource);
    analytics.track('import_started', { source: importSource });

    (async () => {
      try {
        // S'assurer qu'un utilisateur existe côté serveur avant l'importation
        // car l'importation a besoin d'un userId pour le quota et l'historique
        let userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          const mobileId = await getUniqueDeviceId();
          console.log('[ShareIntent] Creating minimal user');
          const userResponse = await apiService.saveOnboardingAnswers({ skipped_onboarding: 'true' }, mobileId);
          if (userResponse.data?.userId) {
            userId = userResponse.data.userId;
            await AsyncStorage.setItem('userId', userId);
            analytics.identify(userId);
            console.log('[ShareIntent] Minimal user created');
          }
        }

        const { isSubscribed } = await revenueCatService.getSubscriptionStatus();
        const response = await apiService.importRecipeFromVideo(params.url!, isSubscribed, {
          onProgress: (p, step) => {
            setProgress(p);
            if (step) setProgressStep(step);
          },
        });

        if (response.error || !response.data?.recipe) {
          const quotaReached = response.error?.includes('quota') || response.error?.includes('Premium');
          if (quotaReached) {
            setIsQuotaError(true);
          }
          setErrorMessage(response.error || t('shareIntent.genericError'));
          setStatus('error');
          return;
        }

        // Un import via le partage OS fait office d'onboarding — mais seulement
        // pour qui a déjà l'accès. Sans la condition d'abonnement, partager une
        // vidéo depuis TikTok suffisait à marquer l'onboarding terminé et à
        // entrer dans l'app sans jamais passer par le paywall, ce qui contourne
        // entièrement le tunnel fermé.
        //
        // Un import *pendant* l'onboarding ne le clôt pas non plus : la fiche
        // recette reprend le flux elle-même (promo, paywall).
        await markOnboardingDoneIfEntitled();

        setRecipe(response.data.recipe);
        setProgress(100);
        setIsDataReady(true);

        recipeStorageService.saveGeneratedRecipe(response.data.recipe, []);
        analytics.track('import_completed', {
          source: importSource,
          during_onboarding: isOnboarding,
        });
        analytics.markFeatureUsed('import');
        analytics.trackFirstAction('import', { source: importSource });
      } catch (error) {
        console.error('[ShareIntent] catch error:', error);
        setErrorMessage(t('shareIntent.genericError'));
        setStatus('error');
        analytics.track('import_failed', {
          error_type: error instanceof Error ? error.name : 'unknown',
          source: importSource,
        });
      }
    })();
  }, [params.url, router]);

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
    if (!params.url) return;
    hasStarted.current = false;
    setStatus('loading');
    setIsDataReady(false);
    setErrorMessage('');
    setProgress(0);
    setDisplayProgress(0);
    setProgressStep('init');
    progressAnim.setValue(0);
    setTimeout(() => {
      hasStarted.current = true;
      (async () => {
        try {
          // S'assurer qu'un utilisateur existe côté serveur avant l'importation
          let userId = await AsyncStorage.getItem('userId');
          if (!userId) {
            const mobileId = await getUniqueDeviceId();
            const userResponse = await apiService.saveOnboardingAnswers({ skipped_onboarding: 'true' }, mobileId);
            if (userResponse.data?.userId) {
              userId = userResponse.data.userId;
              await AsyncStorage.setItem('userId', userId);
              analytics.identify(userId);
            }
          }

          const { isSubscribed: sub } = await revenueCatService.getSubscriptionStatus();
          const response = await apiService.importRecipeFromVideo(params.url!, sub, {
            onProgress: (p, step) => {
              setProgress(p);
              if (step) setProgressStep(step);
            },
          });
          if (response.error || !response.data?.recipe) {
            setErrorMessage(response.error || t('shareIntent.genericError'));
            setStatus('error');
            return;
          }

          // Même règle que sur le premier essai.
          await markOnboardingDoneIfEntitled();

          setRecipe(response.data.recipe);
          setProgress(100);
          setIsDataReady(true);
          recipeStorageService.saveGeneratedRecipe(response.data.recipe, []);
          analytics.track('import_completed', {
            source: importSource,
            during_onboarding: isOnboarding,
            is_retry: true,
          });
          analytics.markFeatureUsed('import');
        analytics.trackFirstAction('import', { source: importSource });
        } catch {
          setErrorMessage(t('shareIntent.genericError'));
          setStatus('error');
        }
      })();
    }, 100);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {status === 'loading' && (
          <>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Image
                source={require('../assets/images/mascot.png')}
                contentFit="contain"
                style={styles.loadingMascot}
              />
            </Animated.View>

            <View style={styles.percentContainer}>
              <Text style={styles.percentText}>{Math.floor(displayProgress)}%</Text>
            </View>

            <View style={styles.loadingTextWrapper}>
              <Text style={styles.loadingText}>
                {t(`shareIntent.progressStep.${progressStep}`, { defaultValue: t('shareIntent.importingDescription') })}
              </Text>
            </View>

            <View style={styles.loadingBarTrack}>
              <Animated.View
                style={[
                  styles.loadingBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </>
        )}

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
                  <Ionicons name="sparkles" size={20} color="white" />
                  <Text style={styles.retryButtonText}>{t('shareIntent.upgrade')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                  <Ionicons name="refresh" size={20} color="white" />
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
    backgroundColor: '#FDF9E2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    ...contentColumn(),
    alignItems: 'center',
    gap: 32,
  },
  loadingMascot: {
    width: rw(0.5),
    height: rw(0.5),
    transform: [{ rotate: '20deg' }],
  },
  percentContainer: {
    backgroundColor: 'rgba(254, 181, 10, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  percentText: {
    fontSize: 24,
    color: Colors.light.button,
    fontFamily: 'Degular'
  },
  loadingTextWrapper: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Degular',
    fontSize: rw(0.06),
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: rw(0.07),
  },
  loadingBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#F1EACB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: Colors.light.button,
    borderRadius: 5,
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
    color: '#666',
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
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontFamily: 'CronosProBold',
    fontSize: 18,
  },
  homeButton: {
    backgroundColor: 'white',
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  homeButtonText: {
    color: Colors.light.text,
    fontFamily: 'CronosProBold',
    fontSize: 18
  },
});
