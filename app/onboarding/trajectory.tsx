import { EntranceView } from '../../components/motion/Entrance';
import { feedback } from '../../services/haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { OnboardingScrollView } from '../../components/onboarding/OnboardingScrollView';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingIconCard } from '../../components/onboarding/OnboardingIconCard';
import { ClassicLoadingView } from '../../components/loading/ClassicLoadingView';
import { Colors } from '../../constants/Colors';
import analytics from '../../services/analytics';
import { calculateFitnessProjection, FitnessProfile, loadFitnessProfile } from '../../services/fitnessProfile';
import { calculateGoalTimeline } from '../../services/goalTimeline';

// Keep the route and analytics identity for existing onboarding navigation.
// Time labels describe a reference pace, separate from measured weight history.
export default function TrajectoryScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  useEffect(() => {
    void loadFitnessProfile().then(setProfile);
    analytics.track('onboarding_weight_trajectory_viewed');
  }, []);
  if (!profile) return <ClassicLoadingView messageKey="onboarding_loading.messages" durationMs={1800} />;
  const projection = calculateFitnessProjection(profile);
  const timeline = calculateGoalTimeline(profile);
  const estimated = timeline.kind === 'estimate';
  const hasTarget = ['gain_muscle', 'lose_weight'].includes(profile.goal);
  const balanced = profile.goal === 'balanced';
  const direction = estimated ? Math.sign(projection.targetWeightKg - profile.currentWeightKg) : 0;
  const startY = direction > 0 ? 124 : direction < 0 ? 36 : 80;
  const endY = direction > 0 ? 36 : direction < 0 ? 124 : 80;
  const path = `M 20 ${startY} L 300 ${endY}`;
  const formatWeight = (weight: number) => `${weight.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} kg`;
  const formatRate = (rate: number) => rate.toLocaleString(i18n.language, { maximumFractionDigits: 2 });
  const period = estimated
    ? t('nutritionEstimate.curve.weeksRange', { min: timeline.minWeeks, max: timeline.maxWeeks })
    : t('nutritionEstimate.curve.reviewPeriod');
  const axisEnd = estimated ? period : t('nutritionEstimate.curve.week', { count: 4 });
  const axisMiddle = estimated
    ? t('nutritionEstimate.curve.weeksRange', { min: Math.ceil(timeline.minWeeks / 2), max: Math.ceil(timeline.maxWeeks / 2) })
    : t('nutritionEstimate.curve.week', { count: 2 });
  const pace = estimated ? t('nutritionEstimate.curve.pace', {
    min: formatRate(timeline.minWeeklyKg), max: formatRate(timeline.maxWeeklyKg),
  }) : t(`nutritionEstimate.curve.${balanced ? 'balancedReviewCaption' : profile.goal === 'maintain' ? 'maintainReviewCaption' : 'reviewCaption'}`);
  const note = estimated
    ? t(`nutritionEstimate.curve.${profile.goal === 'gain_muscle' ? 'muscleEstimateNote' : 'estimateNote'}`)
    : t(`nutritionEstimate.curve.${hasTarget ? 'reviewTargetNote' : balanced ? 'balancedReviewNote' : 'maintainReviewNote'}`);
  return <View style={[styles.root, { paddingTop: insets.top }]}>
    <OnboardingScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <OnboardingIconCard name="flag-outline" />
      <Text style={styles.title}>{t(`nutritionEstimate.curve.${hasTarget ? 'title' : 'stableTitle'}`)}</Text>
      <Text style={styles.subtitle}>{t(hasTarget ? 'nutritionEstimate.toward' : balanced ? 'nutritionEstimate.followBalanced' : 'nutritionEstimate.curve.maintain', { weight: projection.targetWeightKg })}</Text>
      <EntranceView entranceIndex={0} style={styles.card}>
        <Text style={styles.caption}>{t(`nutritionEstimate.curve.${estimated ? 'estimatedPeriod' : 'firstReview'}`)}</Text>
        <Text style={styles.period}>{period}</Text>
        <Text style={styles.pace}>{pace}</Text>
        <View style={styles.endpoints}>
          <View style={styles.endpoint}>
            <Text style={styles.endpointLabel}>{t('nutritionEstimate.curve.today')}</Text>
            <Text style={styles.value}>{balanced ? t('nutritionEstimate.curve.you') : formatWeight(profile.currentWeightKg)}</Text>
          </View>
          <View style={[styles.endpoint, styles.targetEndpoint]}>
            <Text style={styles.endpointLabel}>{t(`nutritionEstimate.curve.${estimated ? 'goal' : 'firstReview'}`)}</Text>
            <Text style={[styles.value, styles.targetValue]}>{balanced ? t('nutritionEstimate.curve.balance') : formatWeight(estimated ? projection.targetWeightKg : profile.currentWeightKg)}</Text>
          </View>
        </View>
        <View accessible accessibilityRole="image" accessibilityLabel={estimated
          ? t('nutritionEstimate.curve.timedDescription', { from: formatWeight(profile.currentWeightKg), to: formatWeight(projection.targetWeightKg), period, pace })
          : t('nutritionEstimate.curve.reviewDescription')}>
          <Svg width="100%" height={150} viewBox="0 0 320 160" accessible={false}>
            <Defs><LinearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.light.button} stopOpacity={0.28} />
              <Stop offset="1" stopColor={Colors.light.button} stopOpacity={0.02} />
            </LinearGradient></Defs>
            {[36, 80, 124].map(y => <Line key={y} x1={20} x2={300} y1={y} y2={y} stroke="#EFE8CF" strokeDasharray="4 6" />)}
            <Path d={`${path} L 300 150 L 20 150 Z`} fill="url(#goalFill)" />
            <Path d={path} stroke={Colors.light.button} strokeWidth={4} strokeLinecap="round" fill="none" />
            <Circle cx={160} cy={(startY + endY) / 2} r={4} fill={Colors.light.button} />
            <Circle cx={20} cy={startY} r={6} fill="white" stroke={Colors.light.button} strokeWidth={3} />
            <Circle cx={300} cy={endY} r={15} fill="#FFF4CF" />
            <Circle cx={300} cy={endY} r={7} fill={Colors.light.button} />
          </Svg>
          <View style={styles.timeAxis} accessible={false}>
            <Text style={[styles.timeLabel, styles.timeStart]}>{t('nutritionEstimate.curve.today')}</Text>
            <Text style={styles.timeLabel}>{axisMiddle}</Text>
            <Text style={[styles.timeLabel, styles.timeEnd]}>{axisEnd}</Text>
          </View>
        </View>
        <View style={styles.legend}><View style={styles.legendDot} /><Text style={styles.legendText}>{t(`nutritionEstimate.curve.${estimated ? 'referenceProgress' : 'stability'}`)}</Text></View>
      </EntranceView>
      <Text style={styles.note}>{note}</Text>
    </OnboardingScrollView>
    <OnboardingFooter label={t('onboarding.continue')} onPress={() => {
      void feedback.light();
      analytics.track('onboarding_trajectory_confirmed');
      router.push('/onboarding/commitment');
    }} />
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF9E2' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 16 },
  title: { marginTop: 16, textAlign: 'center', fontFamily: 'Degular', fontSize: 30, lineHeight: 36, color: Colors.light.text },
  subtitle: { marginTop: 12, textAlign: 'center', fontFamily: 'CronosPro', fontSize: 18, lineHeight: 24, color: Colors.light.textSecondary },
  card: { marginTop: 20, padding: 20, borderRadius: 24, backgroundColor: 'white' },
  caption: { fontFamily: 'CronosPro', fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
  period: { marginTop: 4, fontFamily: 'Degular', fontSize: 30, lineHeight: 36, color: Colors.light.text, textAlign: 'center' },
  pace: { marginTop: 4, marginBottom: 20, fontFamily: 'CronosPro', fontSize: 15, lineHeight: 20, color: Colors.light.textSecondary, textAlign: 'center' },
  timeAxis: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  timeLabel: { flex: 1, fontFamily: 'CronosPro', fontSize: 13, lineHeight: 18, color: Colors.light.textSecondary, textAlign: 'center' },
  timeStart: { textAlign: 'left' },
  timeEnd: { textAlign: 'right' },
  endpoints: { flexDirection: 'row', gap: 16 },
  endpoint: { flex: 1 },
  targetEndpoint: { alignItems: 'flex-end' },
  endpointLabel: { fontFamily: 'CronosPro', fontSize: 15, color: Colors.light.textSecondary },
  value: { marginTop: 4, fontFamily: 'Degular', fontSize: 28, color: Colors.light.text },
  targetValue: { textAlign: 'right' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.light.button },
  legendText: { flexShrink: 1, fontFamily: 'CronosPro', fontSize: 15, color: Colors.light.text },
  note: { marginTop: 16, textAlign: 'center', fontFamily: 'CronosPro', fontSize: 14, lineHeight: 20, color: Colors.light.textSecondary },
});
