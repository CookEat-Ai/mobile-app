import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { rw } from '../../constants/Layout';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import apiService from '../../services/api';
import revenueCatService from '../../config/revenuecat';
import { Ionicons } from '@expo/vector-icons';


export default function PromoCodeScreen() {
  const { generationDemoCompleted } = useLocalSearchParams<{ generationDemoCompleted?: string }>();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
  const [hasShownPaywall, setHasShownPaywall] = useState(false);
  /**
   * Vrai quand on revient ici depuis le paywall remisé : le code est déjà saisi
   * et validé, il ne s'agit plus de le vérifier mais de choisir entre repartir
   * avec ou l'abandonner.
   */
  const [restoredCode, setRestoredCode] = useState(false);
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      if (hasShownPaywall) {
        setHasShownPaywall(false);
        (async () => {
          const status = await revenueCatService.getSubscriptionStatus();
          if (status.isSubscribed) {
            await analytics.completeOnboarding({
              source: 'onboarding_promo_code',
              completion_method: 'subscription',
            });
            router.replace('/(tabs)');
          }
        })();
      }
    }, [hasShownPaywall])
  );

  // Retour depuis le paywall remisé : on restaure le code saisi et sa remise
  // plutôt que de présenter un champ vide à quelqu'un qui vient de le remplir.
  useEffect(() => {
    (async () => {
      const [[, savedCode], [, savedDiscount]] = await AsyncStorage.multiGet([
        'pending_promo_code',
        'pending_promo_discount',
      ]);
      if (!savedCode) return;
      setCode(savedCode);
      setSuccess(true);
      setRestoredCode(true);
      const parsed = Number(savedDiscount);
      if (Number.isFinite(parsed)) setDiscountPercentage(parsed);
    })();
  }, []);

  useEffect(() => {
    analytics.track('onboarding_promo_code_viewed');
    analytics.requestTrackingPermission();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  /**
   * Le code promo a son propre circuit fermé : paywall remisé, et retour ici si
   * l'utilisateur refuse. Il ne traverse jamais `offerTrial` ni `reminder`, qui
   * promettent un essai gratuit que l'offre remisée ne contient pas.
   */
  const goToDiscountedPaywall = (discount: number) => {
    setHasShownPaywall(true);
    router.push({
      pathname: '/paywall',
      params: {
        source: 'onboarding_promo_code',
        initialState: 'PROMO_DISCOUNTED',
        promoDiscount: String(discount),
      },
    });
  };

  const handleValidate = async () => {
    if (!code.trim()) return;

    Keyboard.dismiss();
    setError('');
    setLoading(true);

    try {
      const response = await apiService.validatePromoCode(code.trim());

      if (response.data?.isValid && response.data.discountPercentage) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccess(true);
        setDiscountPercentage(response.data.discountPercentage);

        const discount = response.data.discountPercentage;

        analytics.track('onboarding_promo_code_valid', { discount });

        // Un code à 100 % ouvre l'accès complet : c'est le contournement du
        // paywall, notamment pour les relecteurs Apple et Google. Il ne doit
        // surtout pas passer par le paywall — `getSubscriptionStatus` renvoie
        // déjà `isSubscribed: true` une fois le code activé, donc l'utilisateur
        // entre dans l'app avec tous les droits.
        if (discount === 100) {
          await revenueCatService.activatePromoCode(code.trim());
          analytics.track('onboarding_promo_premium_activated');
          await analytics.completeOnboarding({
            source: 'onboarding_promo_code',
            completion_method: 'promo_code',
          });
          setTimeout(() => router.replace('/(tabs)'), 1500);
          return;
        }

        await AsyncStorage.setItem('pending_promo_code', code.trim().toUpperCase());
        await AsyncStorage.setItem('pending_promo_discount', String(discount));

        // On laisse la confirmation s'afficher, puis on part sur le paywall
        // remisé plutôt que sur la suite du tunnel.
        setTimeout(() => goToDiscountedPaywall(discount), 1500);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(response.error || t('onboardingPromoCode.invalid'));
        analytics.track('onboarding_promo_code_invalid');
      }
    } catch {
      setError(t('onboardingPromoCode.error'));
    } finally {
      setLoading(false);
    }
  };

  const navigateNext = async () => {
    const variant = await analytics.getOnboardingVariant();
    const entryFeature = await analytics.getEntryFeature();

    // Aucun chemin (promo, code 100 %, variante expérimentale) ne peut éviter
    // la recette test de la branche import.
    if (entryFeature === 'import' && generationDemoCompleted !== 'true') {
      router.replace('/onboarding/generationDemo');
      return;
    }

    // Vérifier si un code promo premium a déjà été activé
    const isPremium = await revenueCatService.isPromoCodeActivated();
    if (isPremium) {
      await analytics.completeOnboarding({
        source: 'onboarding_promo_code',
        completion_method: 'promo_code',
      });
      router.replace('/(tabs)');
      return;
    }

    if (variant === 'E') {
      setHasShownPaywall(true);
      const pendingDiscount = await AsyncStorage.getItem('pending_promo_discount');
      if (pendingDiscount) {
        router.push({
          pathname: '/paywall',
          params: { source: 'onboarding_variant_e', initialState: 'PROMO_DISCOUNTED', promoDiscount: pendingDiscount },
        });
      } else {
        router.push({ pathname: '/paywall', params: { source: 'onboarding_variant_e' } });
      }
    } else if (variant === 'F') {
      router.replace('/onboarding/personalizedRecipes');
    } else if (variant === 'C' || variant === 'D') {
      // Chaque branche a déjà vécu son aha moment principal. Juste avant
      // l'offre, on présente l'autre capacité comme un bonus facultatif :
      // génération réelle pour la branche import, import guidé pour la branche
      // génération.
      if (entryFeature === 'import') {
        router.replace({
          pathname: '/onboarding/offerTrial',
          params: { source: 'onboarding_import_branch' },
        });
      } else {
        router.replace({
          pathname: '/onboarding/offerTrial',
          params: { source: 'onboarding_generate_branch' },
        });
      }
    } else {
      router.replace('/onboarding/ahaMoment');
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('onboarding_promo_code_skipped', { had_code: restoredCode });

    // Renoncer au code le retire du stockage : sans ça, `reminder` le relirait
    // et repousserait le paywall remisé juste après avoir promis un essai
    // gratuit. Passer ici, c'est basculer sur l'offre d'essai standard.
    await AsyncStorage.multiRemove(['pending_promo_code', 'pending_promo_discount']);
    setRestoredCode(false);
    setSuccess(false);
    setDiscountPercentage(null);

    await navigateNext();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="pricetag" size={48} color={Colors.light.button} />
            </View>

            <Text style={styles.title}>{t('onboardingPromoCode.title')}</Text>
            <Text style={styles.subtitle}>
              {t('onboardingPromoCode.subtitle')}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.inputSection, { opacity: fadeAnim }]}>
            <View style={[styles.inputContainer, error ? styles.inputError : null, success ? styles.inputSuccess : null]}>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(text) => {
                  setCode(text.toUpperCase());
                  setError('');
                }}
                placeholder={t('onboardingPromoCode.placeholder')}
                placeholderTextColor="#AEAEB2"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!success}
                returnKeyType="done"
                onSubmitEditing={handleValidate}
              />
              {success && (
                <Ionicons name="checkmark-circle" size={24} color="#34C759" style={styles.inputIcon} />
              )}
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {success && discountPercentage ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>
                  {t('onboardingPromoCode.success', { discount: discountPercentage })}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </View>

        <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
          {/* `success` sans `restoredCode` = validation en cours, la navigation
              part toute seule après 1,5 s : on masque les boutons. Au retour du
              paywall en revanche, il faut de quoi repartir ou renoncer. */}
          {(!success || restoredCode) && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.validateButton, (!code.trim() || loading) && styles.disabledButton]}
              onPress={
                restoredCode
                  ? () => goToDiscountedPaywall(discountPercentage ?? 15)
                  : handleValidate
              }
              disabled={!code.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.validateButtonText}>
                  {t(
                    restoredCode
                      ? 'onboardingPromoCode.continueWithCode'
                      : 'onboardingPromoCode.validate'
                  )}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {(!success || restoredCode) && (
            <TouchableOpacity
              activeOpacity={0.6}
              style={[styles.skipButton, loading && { opacity: 0.5 }]}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>
                {t(restoredCode ? 'onboardingPromoCode.dropCode' : 'onboardingPromoCode.skip')}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(254, 181, 10, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: rw(0.08),
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Degular',
    lineHeight: rw(0.1),
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'CronosProBold',
    color: '#8C8C8C',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  inputSection: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F2F2F7',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputSuccess: {
    borderColor: '#34C759',
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Degular',
    color: Colors.light.text,
    paddingVertical: 16,
    letterSpacing: 2,
    textAlign: 'center',
  },
  inputIcon: {
    marginLeft: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'CronosPro',
    marginTop: 8,
    textAlign: 'center',
  },
  successContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 12,
  },
  successText: {
    color: '#34C759',
    fontSize: 16,
    fontFamily: 'CronosProBold',
    textAlign: 'center',
  },
  bottomSection: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 70,
    left: 24,
    right: 24,
    gap: 12,
  },
  validateButton: {
    backgroundColor: Colors.light.button,
    width: '100%',
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 19,
    fontFamily: 'Degular',
  },
  skipButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#8C8C8C',
    fontSize: 16,
    fontFamily: 'CronosPro',
    textDecorationLine: 'underline',
  },
});
