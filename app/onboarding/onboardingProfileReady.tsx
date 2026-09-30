import { NutritionExplanation } from '../../components/NutritionExplanation';
import { OnboardingScrollView } from '../../components/onboarding/OnboardingScrollView';
import { Ionicons } from '@expo/vector-icons';
import { feedback } from '../../services/haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { ClassicLoadingView } from '../../components/loading/ClassicLoadingView';
import analytics from '../../services/analytics';
import { calculateFitnessProjection, FitnessProfile, loadFitnessProfile } from '../../services/fitnessProfile';

type MetricCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  fade: Animated.Value;
  slide: Animated.Value;
};

function MetricCard({ icon, label, value, color, fade, slide }: MetricCardProps) {
  return (
    <Animated.View style={[styles.metricCard, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={17} color={color} /></View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{value}</Text>
    </Animated.View>
  );
}

export default function OnboardingProfileReadyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    void loadFitnessProfile().then(setProfile);
    analytics.track('onboarding_nutrition_targets_viewed');
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: Platform.OS === 'android' ? 400 : 800, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: Platform.OS === 'android' ? 400 : 800, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  if (!profile) return <ClassicLoadingView messageKey="onboarding_loading.messages" durationMs={1800} />;
  const projection = calculateFitnessProjection(profile);

  const handleContinue = async () => {
    await feedback.confirm();
    analytics.track('onboarding_nutrition_targets_confirmed');
    router.replace('/onboarding/trajectory');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
      </View>

      <OnboardingScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.checkCircle}><Ionicons name="checkmark" size={30} color="white" /></View>
          <Text style={styles.title}>{t('fitnessOnboarding.targets.title')}</Text>
          <Text style={styles.subtitle}>{t('fitnessOnboarding.targets.subtitle')}</Text>
        </View>

        <View style={styles.dashboardContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('fitnessOnboarding.targets.daily')}</Text>
            <Text style={styles.sectionSubtitle}>{t('nutritionEstimate.adjustable')}</Text>
          </View>

          <View style={styles.grid}>
            <MetricCard icon="flame-outline" label="Calories" value={`≈ ${projection.dailyCalories} kcal`} color="#E67E22" fade={fade} slide={slide} />
            <MetricCard icon="barbell-outline" label={t('fitnessOnboarding.projection.protein')} value={`${projection.dailyProteinGrams} g`} color="#E74C3C" fade={fade} slide={slide} />
            <MetricCard icon="leaf-outline" label={t('fitnessOnboarding.projection.carbs')} value={`${projection.dailyCarbsGrams} g`} color="#4CAF50" fade={fade} slide={slide} />
            <MetricCard icon="water-outline" label={t('fitnessOnboarding.projection.fats')} value={`${projection.dailyFatGrams} g`} color="#3498DB" fade={fade} slide={slide} />
          </View>

          <Animated.View style={[styles.goalCard, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleRow}>
                <Ionicons name="sparkles" size={20} color={Colors.light.button} />
                <Text style={styles.goalTitle}>{['gain_muscle', 'lose_weight'].includes(profile.goal) ? t('nutritionEstimate.toward', { weight: projection.targetWeightKg }) : t('fitnessOnboarding.targets.maintenance', { calories: projection.estimatedMaintenanceCalories })}</Text>
              </View>
            </View>
            <Text style={styles.goalSubtitle}>{t('nutritionEstimate.adjustable')}</Text>
          </Animated.View>
          <NutritionExplanation profile={profile} />
        </View>

        <View style={styles.info}><Ionicons name="information-circle-outline" size={20} color={Colors.light.textSecondary} /><Text style={styles.infoText}>{t('fitnessOnboarding.targets.disclaimer')}</Text></View>
      </OnboardingScrollView>

      <OnboardingFooter label={t('fitnessOnboarding.targets.cta')} onPress={() => void handleContinue()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF9E2' },
  progressHeader: { paddingHorizontal: 20, marginTop: 20, height: 40, justifyContent: 'center' },
  progressTrack: { width: '100%', height: 12, borderRadius: 999, backgroundColor: '#F1EACB', overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', borderRadius: 999, backgroundColor: Colors.light.button },
  scrollContent: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { alignItems: 'center', paddingHorizontal: 30, marginTop: 20 },
  checkCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.light.button, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: 'Degular', color: Colors.light.text, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, lineHeight: 22, fontFamily: 'CronosPro', color: Colors.light.textSecondary, textAlign: 'center' },
  dashboardContainer: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 30, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  sectionHeader: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: Colors.light.text, fontFamily: 'Degular' },
  sectionSubtitle: { fontSize: 14, color: '#8C8C8C', fontFamily: 'CronosProBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  metricCard: { width: '48%', minWidth: 0, minHeight: 100, backgroundColor: '#F8F9FA', borderRadius: 16, padding: Platform.OS === 'android' ? 10 : 14, alignItems: 'flex-start' },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metricIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 0 },
  metricCopy: { flex: 1, paddingRight: 18 },
  metricLabel: { flexShrink: 1, fontSize: 12, fontFamily: 'CronosPro', color: '#8C8C8C', textTransform: 'capitalize' },
  metricValue: { marginTop: 10, fontSize: 22, fontFamily: 'Degular', color: Colors.light.text },
  progressCircle: { position: 'absolute', right: 9, top: 10, width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  progressCircleFill: { ...StyleSheet.absoluteFill, borderRadius: 11, borderWidth: 2, borderRightColor: 'transparent', borderBottomColor: 'transparent', transform: [{ rotate: '45deg' }] },
  goalCard: { marginTop: 20, backgroundColor: '#F8F9FA', borderRadius: 16, padding: 16 },
  goalHeader: { marginBottom: 10 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalTitle: { flex: 1, fontSize: 16, color: Colors.light.text, fontFamily: 'Degular' },
  goalTrack: { height: 8, backgroundColor: '#E9E9E9', borderRadius: 4, overflow: 'hidden' },
  goalFill: { width: '92%', height: '100%', backgroundColor: Colors.light.button, borderRadius: 4 },
  goalSubtitle: { marginTop: 9, fontSize: 13, color: Colors.light.textSecondary, fontFamily: 'CronosPro' },
  info: { flexDirection: 'row', gap: 8, marginTop: 16, paddingHorizontal: 28 },
  infoText: { flex: 1, fontFamily: 'CronosPro', color: Colors.light.textSecondary, fontSize: 12, lineHeight: 16 },
});
