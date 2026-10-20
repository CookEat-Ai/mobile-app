import { useResponsive } from '../../hooks/useResponsive';
import { FORM_CONTENT_MAX_WIDTH } from '../../constants/Layout';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingScrollView } from '../../components/onboarding/OnboardingScrollView';
import { OnboardingIconCard } from '../../components/onboarding/OnboardingIconCard';
import { EntranceView } from '../../components/motion/Entrance';
import { MealNutritionSummary } from '../../components/tracking/MealNutritionSummary';
import { getAnonymousUserId } from '../../services/anonymousSession';
import { loadTrackedMeals, type TrackedMeal } from '../../services/mealTracking';
import analytics from '../../services/analytics';
import { feedback } from '../../services/haptics';

/** Optional real product action between the weekly preview and the existing offer journey. */
export default function PhotoTrackingDemoScreen() {
  const { t } = useTranslation(), insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const { completedId } = useLocalSearchParams<{ completedId?: string }>();
  const [meal, setMeal] = useState<TrackedMeal | null>(null);
  const [loading, setLoading] = useState(!!completedId);
  const opening = useRef(false);
  useFocusEffect(useCallback(() => { opening.current = false; }, []));
  useEffect(() => {
    void analytics.track('onboarding_photo_tracking_viewed', { completed: !!completedId });
  }, [completedId]);
  useEffect(() => {
    opening.current = false;
    if (!completedId) { setMeal(null); setLoading(false); return; }
    let active = true;
    setLoading(true);
    void getAnonymousUserId().then(loadTrackedMeals).then(entries => {
      if (active) setMeal(entries.find(entry => entry.id === completedId) || null);
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [completedId]);
  const start = () => {
    if (opening.current) return;
    opening.current = true;
    void feedback.confirm();
    void analytics.track('onboarding_photo_tracking_started');
    router.push({ pathname: '/tracking/capture', params: { isOnboarding: 'true' } });
  };
  const next = () => {
    void analytics.track(meal ? 'onboarding_photo_tracking_completed' : 'onboarding_photo_tracking_skipped');
    router.replace('/onboarding/promoCode');
  };
  return <View style={[appStyles.screen, { paddingTop: insets.top + 18 }]}>
    <OnboardingScrollView stepKey={completedId || 'invitation'} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingHorizontal: Math.max(24, gutter), paddingBottom: 176 + insets.bottom }]}>
      <OnboardingIconCard name={meal ? 'checkmark-circle' : 'camera'} />
      <EntranceView entranceIndex={1} style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{t(meal ? 'onboarding.photoTracking.savedTitle' : 'onboarding.photoTracking.title')}</Text>
        <Text style={styles.subtitle}>{t(meal ? 'onboarding.photoTracking.savedBody' : 'onboarding.photoTracking.subtitle')}</Text>
      </EntranceView>
      <EntranceView entranceIndex={2} style={styles.card}>
        {loading ? <ActivityIndicator color={theme.yellow} /> : meal ? <>
          <Text style={appStyles.section}>{meal.title}</Text>
          <MealNutritionSummary nutrition={meal.nutrition} partial={false} compact />
        </> : <>
          <View style={styles.frame}><View style={styles.camera}><Ionicons name="camera" size={48} color={theme.onPrimary} /></View></View>
          <Text style={styles.cardTitle}>{t('onboarding.photoTracking.cardTitle')}</Text>
          <View style={styles.labels}>{(['calories', 'proteins', 'carbs', 'fats'] as const).map(key => <View key={key} style={styles.label}><Text style={styles.labelText}>{t(`tracking.${key}`)}</Text></View>)}</View>
          <Text style={styles.note}>{t('onboarding.photoTracking.correct')}</Text>
        </>}
      </EntranceView>
    </OnboardingScrollView>
    {!meal && <TouchableOpacity accessibilityRole="button" onPress={next} style={[styles.skip, { bottom: insets.bottom + 98 }]}><Text style={appStyles.textAction}>{t('onboarding.photoTracking.later')}</Text></TouchableOpacity>}
    <OnboardingFooter label={t(meal ? 'onboarding.continue' : 'onboarding.photoTracking.try')} onPress={meal ? next : start} loading={loading} />
  </View>;
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: FORM_CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 16, gap: 24 },
  header: { alignItems: 'center', gap: 12 },
  title: { ...appStyles.title, fontSize: 34, lineHeight: 38, textAlign: 'center' },
  subtitle: { ...appStyles.subtitle, textAlign: 'center' },
  card: { ...appStyles.card, borderRadius: AppRadii.card, padding: 20, gap: 18 },
  frame: { minHeight: 132, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellowSoft, borderRadius: AppRadii.card, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.yellow },
  camera: { width: 86, height: 86, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow },
  cardTitle: { ...appStyles.section, textAlign: 'center' },
  labels: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  label: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: AppRadii.pill, backgroundColor: theme.yellowSoft },
  labelText: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.ink },
  note: { ...appStyles.subtitle, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  skip: { position: 'absolute', left: 24, right: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
});
