import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import apiService from '../../services/api';
import revenueCatService from '../../config/revenuecat';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function PromoCodeScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
  const [hasShownPaywall, setHasShownPaywall] = useState(false);
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      if (hasShownPaywall) {
        setHasShownPaywall(false);
        (async () => {
          const status = await revenueCatService.getSubscriptionStatus();
          if (status.isSubscribed) {
            await AsyncStorage.setItem('onboarding_completed', 'true');
            router.replace('/(tabs)');
          }
        })();
      }
    }, [hasShownPaywall])
  );

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

        // Si c'est un code premium (100% de réduction), on l'active directement
        if (response.data.discountPercentage === 100) {
          await revenueCatService.activatePromoCode(code.trim());
          analytics.track('onboarding_promo_premium_activated');
        } else {
          await AsyncStorage.setItem('pending_promo_code', code.trim().toUpperCase());
          await AsyncStorage.setItem('pending_promo_discount', String(response.data.discountPercentage));
        }

        analytics.track('onboarding_promo_code_valid', {
          discount: response.data.discountPercentage,
        });

        setTimeout(() => navigateNext(), 1500);
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

    // Vérifier si un code promo premium a déjà été activé
    const isPremium = await revenueCatService.isPromoCodeActivated();
    if (isPremium) {
      await AsyncStorage.setItem('onboarding_completed', 'true');
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
      router.replace('/onboarding/videoDemo');
    } else {
      router.replace('/onboarding/ahaMoment');
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('onboarding_promo_code_skipped');
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
          {!success && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.validateButton, (!code.trim() || loading) && styles.disabledButton]}
              onPress={handleValidate}
              disabled={!code.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.validateButtonText}>
                  {t('onboardingPromoCode.validate')}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!success && (
            <TouchableOpacity
              activeOpacity={0.6}
              style={[styles.skipButton, loading && { opacity: 0.5 }]}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>
                {t('onboardingPromoCode.skip')}
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
    fontSize: width * 0.08,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Degular',
    lineHeight: width * 0.1,
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
