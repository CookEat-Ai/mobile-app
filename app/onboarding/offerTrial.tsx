import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { ONBOARDING_CTA_BOTTOM_GAP, rw } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import analytics from '../../services/analytics';
import { useOnboardingTrialEligibility } from '../../hooks/useOnboardingTrialEligibility';
import {
  TrialConversionFooter,
  TRIAL_CONVERSION_FOOTER_RESERVED_HEIGHT,
} from '../../components/onboarding/TrialConversionFooter';

function formatZeroPrice(currencyCode: string | undefined, language: string, fallback: string): string {
  if (!currencyCode) return fallback;
  try {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(0);
  } catch {
    return fallback;
  }
}

/**
 * Écran d'entrée dans la fin de tunnel : « on aimerait que tu essaies ».
 *
 * Deux rôles :
 *
 * 1. Vendre l'essai avant de le demander. Le paywall ne porte plus de liste de
 *    bénéfices, c'est ici et sur la projection que la valeur se joue.
 *
 * 2. Servir de point de retour au paywall. Le tunnel est fermé : refuser le
 *    paywall, puis refuser la roue, ne fait pas sortir vers l'app — on revient
 *    ici. `onboarding_completed` n'est donc jamais posé sans abonnement, et une
 *    relance de l'app repasse par la même boucle.
 *
 * Volontairement générique : contrairement au paywall, il s'adresse aux deux
 * branches avec le même message, puisqu'il parle de l'essai et non d'une
 * fonctionnalité.
 */
export default function OfferTrialScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { layoutWidth, height, isShortScreen } = useResponsive();
  const params = useLocalSearchParams<{ source?: string }>();
  const trial = useOnboardingTrialEligibility();
  const trialDays = trial.days ?? 7;
  const product = trial.package?.product;

  const zeroPrice = formatZeroPrice(
    product?.currencyCode,
    i18n.language,
    t('onboarding.offerTrial.zeroPriceFallback'),
  );

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

  const mascotSize = Math.min(layoutWidth * 0.34, height * (isShortScreen ? 0.13 : 0.17));

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    analytics.track('onboarding_offer_trial_viewed', {
      source: params.source || 'unknown',
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    float.start();
    return () => float.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (trial.loading) return;
    analytics.track('onboarding_trial_eligibility_resolved', {
      source: params.source || 'unknown',
      trial_eligibility: trial.status,
      trial_days: trial.days,
      offering_id: trial.offering?.identifier ?? null,
      product_id: trial.package?.product.identifier ?? null,
    });
  }, [params.source, trial.days, trial.loading, trial.offering?.identifier, trial.package?.product.identifier, trial.status]);

  const handleContinue = () => {
    if (trial.loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // La source traverse tout le tunnel de fin pour rester lisible dans les
    // funnels : c'est elle qui distingue la branche import de la branche generate.
    router.push({
      pathname: '/onboarding/reminder',
      params: params.source ? { source: params.source } : {},
    });
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12 },
      ]}
    >
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
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.title}>{t('onboarding.offerTrial.title')}</Text>
          <Text style={styles.subtitle}>
            {t('onboarding.offerTrial.subtitle', { count: trialDays })}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.offerCard, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderCopy}>
              <View style={styles.offerPill}>
                <Ionicons
                  name="gift"
                  size={15}
                  color={Colors.light.button}
                />
                <Text style={styles.offerPillText}>
                  {t('onboarding.offerTrial.trialPill', { count: trialDays })}
                </Text>
              </View>
              <Text style={styles.includedTitle}>{t('onboarding.offerTrial.includedTitle')}</Text>
            </View>
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
              <Image
                source={require('../../assets/images/mascot.png')}
                contentFit="contain"
                transition={0}
                cachePolicy="memory-disk"
                style={{
                  width: mascotSize,
                  height: mascotSize,
                  transform: [{ rotate: '20deg' }],
                }}
              />
            </Animated.View>
          </View>

          <View style={styles.features}>
            {[
              ['sparkles', t('paywall.features.unlimited')],
              ['phone-portrait', t('paywall.features.import')],
              ['heart', t('paywall.features.favorites')],
            ].map(([icon, label]) => (
              <View key={label} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={icon as any} size={18} color={Colors.light.button} />
                </View>
                <Text style={styles.featureText}>{label}</Text>
                <Ionicons name="checkmark-circle" size={21} color="#6CA45C" />
              </View>
            ))}
          </View>
        </Animated.View>
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
            primaryLabel={t('onboarding.offerTrial.button', { price: zeroPrice })}
            onPrimaryPress={handleContinue}
            loading={trial.loading}
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: rw(0.085),
    lineHeight: rw(0.1),
    color: Colors.light.text,
    textAlign: 'center',
    fontFamily: 'Degular',
  },
  subtitle: {
    fontSize: rw(0.042),
    lineHeight: rw(0.056),
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontFamily: 'CronosPro',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  offerCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEE5C5',
    shadowColor: '#5A3B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 112,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECE6D0',
    paddingBottom: 12,
    marginBottom: 13,
  },
  cardHeaderCopy: { flex: 1 },
  offerPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3D4',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  offerPillText: {
    fontFamily: 'CronosProBold',
    fontSize: 12,
    color: Colors.light.button,
  },
  includedTitle: {
    fontFamily: 'Degular',
    fontSize: rw(0.055),
    lineHeight: rw(0.064),
    color: Colors.light.text,
  },
  features: { gap: 9 },
  featureRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#FFFCF3',
    borderRadius: 15,
    paddingHorizontal: 11,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#FFF1CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: 'CronosProBold',
    fontSize: 15,
    color: Colors.light.text,
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
