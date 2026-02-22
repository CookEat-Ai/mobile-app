import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';
import analytics from '../../services/analytics';

const { width } = Dimensions.get('window');

const NutriCard = ({ icon, label, value, unit, color, delay, fadeAnim, slideAnim }: any) => (
  <Animated.View style={[
    styles.nutriCard,
    {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }
  ]}>
    <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <View>
      <Text style={styles.nutriLabel}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.nutriValue}>{value}</Text>
        {unit && <Text style={styles.nutriUnit}>{unit}</Text>}
      </View>
    </View>
    <View style={styles.progressCircleContainer}>
      {/* Simulation d'un cercle de progression simple */}
      <View style={[styles.progressCircleBase, { borderColor: color + '30' }]}>
        <View style={[styles.progressCircleFill, { borderColor: color, borderRightColor: 'transparent', borderBottomColor: 'transparent' }]} />
      </View>
    </View>
  </Animated.View>
);

export default function OnboardingProfileReadyScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const [variant, setVariant] = useState<'A' | 'B' | 'C' | 'D' | null>(null);

  useEffect(() => {
    analytics.track('onboarding_summary_dashboard_viewed');

    const loadVariant = async () => {
      const v = await analytics.getOnboardingVariant();
      setVariant(v);
    };
    loadVariant();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Animated.createAnimatedComponent(View).defaultProps?.easing,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const variant = await analytics.getOnboardingVariant();

    analytics.track('onboarding_summary_dashboard_continue', { variant });

    if (variant === 'C' || variant === 'D') {
      router.replace('/onboarding/videoDemo');
    } else {
      router.replace('/onboarding/ahaMoment');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Progress Bar (Final Step) */}
      <View style={styles.progressHeader}>
        <View style={styles.progressTrackContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: '100%' }]} />
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={30} color={"white"} />
          </View>
          <Text style={styles.title}>{I18n.t('onboardingProfileReady.title')}</Text>
          <Text style={styles.subtitle}>{I18n.t('onboardingProfileReady.subtitle')}</Text>
        </View>

        <View style={styles.dashboardContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{I18n.t('onboardingProfileReady.dailyRec')}</Text>
            <Text style={styles.sectionSubtitle}>{I18n.t('onboardingProfileReady.editAnytime')}</Text>
          </View>

          <View style={styles.grid}>
            <NutriCard
              icon="chef-hat"
              label={I18n.t('onboardingProfileReady.recipes')}
              value={I18n.t('onboardingProfileReady.recipesValue')}
              unit={I18n.t('onboardingProfileReady.recipesUnit')}
              color="#E67E22"
              fadeAnim={fadeAnim}
              slideAnim={slideAnim}
            />
            <NutriCard
              icon="auto-fix"
              label={I18n.t('onboardingProfileReady.personalization')}
              value={I18n.t('onboardingProfileReady.personalizationValue')}
              unit=""
              color="#F1C40F"
              fadeAnim={fadeAnim}
              slideAnim={slideAnim}
            />
            <NutriCard
              icon="clock-fast"
              label={I18n.t('onboardingProfileReady.time')}
              value={I18n.t('onboardingProfileReady.timeValue')}
              unit={I18n.t('onboardingProfileReady.timeUnit')}
              color="#E74C3C"
              fadeAnim={fadeAnim}
              slideAnim={slideAnim}
            />
            <NutriCard
              icon="piggy-bank"
              label={I18n.t('onboardingProfileReady.budget')}
              value={I18n.t('onboardingProfileReady.budgetValue')}
              unit=""
              color="#3498DB"
              fadeAnim={fadeAnim}
              slideAnim={slideAnim}
            />
          </View>

          {/* Match Score Card */}
          <Animated.View style={[styles.healthScoreCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.healthHeader}>
              <View style={styles.healthRow}>
                <Ionicons name="sparkles" size={20} color="#FEB50A" />
                <Text style={styles.healthLabel}>{I18n.t('onboardingProfileReady.matchScore')}</Text>
              </View>
              <Text style={styles.healthValue}>{I18n.t('onboardingProfileReady.matchScoreValue')}</Text>
            </View>
            <View style={styles.healthBarTrack}>
              <View style={[styles.healthBarFill, { width: '98%', backgroundColor: '#FEB50A' }]} />
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.8} style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.buttonText}>
            {variant === 'C' ? I18n.t('onboardingProfileReady.button') : I18n.t('onboarding.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    height: 60,
  },
  progressTrackContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#F1EACB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.light.button,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 20,
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Cronos Pro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dashboardContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: '#8C8C8C',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  nutriCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  nutriLabel: {
    fontSize: 12,
    fontFamily: 'Cronos Pro',
    color: '#8C8C8C',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nutriValue: {
    fontSize: 18,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  nutriUnit: {
    fontSize: 12,
    fontFamily: 'Cronos Pro',
    color: '#8C8C8C',
    marginLeft: 2,
  },
  progressCircleContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  progressCircleBase: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  progressCircleFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  healthScoreCard: {
    marginTop: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthLabel: {
    fontSize: 16,
    fontFamily: 'Degular',
    fontWeight: '600',
    color: Colors.light.text,
  },
  healthValue: {
    fontSize: 16,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  healthBarTrack: {
    height: 8,
    backgroundColor: '#E9E9E9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 18,
    borderRadius: 200,
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Degular',
    fontWeight: 'bold',
  },
});
