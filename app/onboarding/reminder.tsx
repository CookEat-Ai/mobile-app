import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { ONBOARDING_CTA_BOTTOM_GAP, rw } from '../../constants/Layout';
import { contentColumn } from '../../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscription } from '../../hooks/useSubscription';
import revenueCatService from '../../config/revenuecat';
import { useOnboardingTrialEligibility } from '../../hooks/useOnboardingTrialEligibility';
import {
  requestTrialReminderIntent,
} from '../../services/trialReminder';
import {
  TrialConversionFooter,
  TRIAL_CONVERSION_FOOTER_RESERVED_HEIGHT,
} from '../../components/onboarding/TrialConversionFooter';

export default function ReminderScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [hasShownPaywall, setHasShownPaywall] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const { loadSubscriptionStatus } = useSubscription();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ source?: string }>();
  const trial = useOnboardingTrialEligibility();
  const hasFreeTrial = trial.status === 'eligible' && Boolean(trial.days);
  const reminderDay = Math.max(1, Math.ceil((trial.days ?? 7) / 2));
  const product = trial.package?.product;
  const annualPriceLine = product
    ? product.pricePerMonthString
      ? t('onboarding.offerTrial.annualPriceLine', {
        price: product.priceString,
        monthly: product.pricePerMonthString,
      })
      : t('onboarding.offerTrial.annualPriceLineWithoutMonthly', {
        price: product.priceString,
      })
    : null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (trial.loading) return;
    analytics.track('onboarding_reminder_viewed', {
      trial_eligibility: trial.status,
      trial_days: trial.days,
    });
  }, [trial.days, trial.loading, trial.status]);

  const handlePaywallReturn = useCallback(async () => {
    // Recharger le statut pour vérifier si l'utilisateur s'est abonné
    await loadSubscriptionStatus();

    // Vérifier directement via le service pour être sûr d'avoir la donnée fraîche
    const status = await revenueCatService.getSubscriptionStatus();

    if (status.isSubscribed) {
      await analytics.completeOnboarding({
        source: params.source || 'onboarding_reminder',
        completion_method: 'subscription',
      });
      router.replace('/(tabs)');
    }
  }, [loadSubscriptionStatus, params.source]);

  useFocusEffect(
    useCallback(() => {
      if (hasShownPaywall) {
        setHasShownPaywall(false);
        void handlePaywallReturn();
      }
    }, [handlePaywallReturn, hasShownPaywall])
  );

  const openPaywall = async () => {
    setHasShownPaywall(true);

    // `reminder` est devenu le passage obligé vers le paywall d'onboarding, pour
    // toutes les branches. L'appelant transmet donc sa propre source (la branche
    // import a la sienne) ; à défaut on retombe sur la variante, ce qui couvre
    // les parcours qui arrivent encore ici sans paramètre.
    const variant = await analytics.getOnboardingVariant();
    const source =
      (Array.isArray(params.source) ? params.source[0] : params.source) ||
      `onboarding_variant_${variant.toLowerCase()}`;

    const pendingDiscount = await AsyncStorage.getItem('pending_promo_discount');
    if (pendingDiscount) {
      router.push({
        pathname: '/paywall',
        params: {
          source,
          initialState: 'PROMO_DISCOUNTED',
          promoDiscount: pendingDiscount,
        },
      });
    } else {
      router.push({ pathname: '/paywall', params: { source } });
    }
  };

  const handleEnableReminder = async () => {
    if (isRequestingPermission) return;
    setIsRequestingPermission(true);
    try {
      await requestTrialReminderIntent();
      await openPaywall();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View
        style={[
          styles.content,
          {
            paddingBottom:
              TRIAL_CONVERSION_FOOTER_RESERVED_HEIGHT
              + insets.bottom
              + ONBOARDING_CTA_BOTTOM_GAP,
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.reminder.backButton')}
            hitSlop={10}
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={30} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.mainSection}>
          <Animated.View
            style={[
              styles.hero,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>{t('onboarding.reminder.title')}</Text>

            <View style={styles.notificationVisual}>
              <Ionicons
                name="notifications"
                size={Math.min(rw(0.36), 146)}
                color="#DCE7D7"
              />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>1</Text>
              </View>
            </View>

            <Text style={styles.subtitle}>
              {hasFreeTrial
                ? t('onboarding.reminder.eligibleSubtitle', { day: reminderDay })
                : t('onboarding.reminder.pendingSubtitle')}
            </Text>
            <Text style={styles.permissionNote}>
              {t('onboarding.reminder.permissionNote')}
            </Text>
          </Animated.View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.bottomDock,
          { bottom: insets.bottom, opacity: fadeAnim },
        ]}
      >
        <View style={styles.bottomSection}>
          <TrialConversionFooter
            reassurance={t('paywall.noPaymentDueNow')}
            primaryLabel={t('onboarding.reminder.button')}
            onPrimaryPress={handleEnableReminder}
            loading={isRequestingPermission}
            footnote={annualPriceLine}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
  },
  content: {
    flex: 1,
    ...contentColumn(),
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    height: 52,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: Math.min(rw(0.09), 38),
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: Math.min(rw(0.095), 42),
    paddingHorizontal: 4,
    ...Platform.select({
      ios: { fontFamily: 'Degular' },
      android: { fontFamily: 'Degular' },
    }),
  },
  notificationVisual: {
    width: rw(0.58),
    height: rw(0.58),
    maxWidth: 230,
    maxHeight: 230,
    marginTop: 34,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: rw(0.035),
    right: rw(0.015),
    width: rw(0.17),
    height: rw(0.17),
    maxWidth: 68,
    maxHeight: 68,
    borderRadius: 100,
    backgroundColor: Colors.light.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FDF9E2',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: Math.min(rw(0.09), 38),
    lineHeight: Math.min(rw(0.1), 42),
    fontFamily: 'Degular',
  },
  subtitle: {
    maxWidth: 380,
    fontSize: Math.min(rw(0.044), 18),
    lineHeight: Math.min(rw(0.058), 24),
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontFamily: 'CronosPro',
  },
  permissionNote: {
    marginTop: 10,
    color: '#858589',
    fontFamily: 'CronosPro',
    fontSize: Math.min(rw(0.034), 14),
    lineHeight: Math.min(rw(0.044), 18),
    textAlign: 'center',
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  bottomSection: {
    ...contentColumn(),
    paddingHorizontal: 24,
    alignItems: 'center',
  },
});
