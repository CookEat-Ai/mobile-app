import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { feedback } from '../../services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { ONBOARDING_CTA_BOTTOM_GAP, rw } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import analytics from '../../services/analytics';
import { FITNESS_GOALS, type FitnessGoal } from '../../services/nutritionModel';
import { useOnboardingTrialEligibility } from '../../hooks/useOnboardingTrialEligibility';
import {
  TrialConversionFooter,
  TRIAL_CONVERSION_FOOTER_RESERVED_HEIGHT,
} from '../../components/onboarding/TrialConversionFooter';

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
 * Le message reflète l'objectif déclaré dans les deux branches. Sans réponse
 * enregistrée, il conserve la présentation générique de l'offre.
 */
export default function OfferTrialScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { layoutWidth, height, isShortScreen } = useResponsive();
  const params = useLocalSearchParams<{ source?: string }>();
  const [goal, setGoal] = useState<FitnessGoal | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void AsyncStorage.getItem('fitnessGoal').then(value => {
      if (active) setGoal(FITNESS_GOALS.includes(value as FitnessGoal) ? value as FitnessGoal : null);
    }).catch(() => { if (active) setGoal(null); });
    return () => { active = false; };
  }, []));
  const trial = useOnboardingTrialEligibility();
  const hasTrial = !trial.loading && trial.status === 'eligible' && (trial.days ?? 0) > 0;
  const trialDays = trial.days;
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

    feedback.light();
    // La source traverse tout le tunnel de fin pour isoler la conversion du
    // parcours de planification hebdomadaire.
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
          <Text style={styles.title}>{t('auditFixes.offerTitle')}</Text>
          <Text style={styles.subtitle}>
            {goal ? t(`onboarding.offerTrial.personalized.${goal}.subtitle`)
              : hasTrial ? t('onboarding.offerTrial.subtitle', { count: trialDays ?? 0 }) : t('onboarding.offerTrial.standardSubtitle')}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.offerCard, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderCopy}>
              <View style={styles.offerPill}>
                <Ionicons
                  name={hasTrial ? "gift" : "sparkles"}
                  size={15}
                  color={Colors.light.button}
                />
                <Text style={styles.offerPillText}>
                  {hasTrial ? t('onboarding.offerTrial.trialPill', { count: trialDays ?? 0 }) : t('auditFixes.offerPill')}
                </Text>
              </View>
              <Text style={styles.includedTitle}>{t(goal ? `onboarding.offerTrial.personalized.${goal}.includedTitle` : 'onboarding.offerTrial.includedTitle')}</Text>
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
              ['calendar', t('paywall.features.fullDay')],
              ['fitness', t(goal ? `onboarding.offerTrial.personalized.${goal}.nutrition` : 'paywall.features.macros')],
              ['cart', t('paywall.features.shopping')],
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
            reassurance={hasTrial ? t('paywall.noPaymentDueNow') : trial.loading ? null : t('onboarding.offerTrial.standardReassurance')}
            primaryLabel={t(hasTrial ? 'onboarding.offerTrial.button' : 'onboarding.offerTrial.standardButton')}
            onPrimaryPress={handleContinue}
            loading={trial.loading}
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
