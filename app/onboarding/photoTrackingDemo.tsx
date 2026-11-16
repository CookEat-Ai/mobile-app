import { AppSpinner as ActivityIndicator } from '../../components/ui/AppSpinner';
import { useResponsive } from '../../hooks/useResponsive';
import { FORM_CONTENT_MAX_WIDTH, rw } from '../../constants/Layout';
import { AppRadii, AppTheme as designTheme, appStyles } from '../../constants/AppTheme';
import { Colors } from '../../constants/Colors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { NavigationIconButton } from '../../components/NavigationIconButton';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingProgressBar } from '../../components/onboarding/OnboardingProgressBar';
import { PhotoTrackingPreview } from '../../components/onboarding/PhotoTrackingPreview';
import { OnboardingScrollView } from '../../components/onboarding/OnboardingScrollView';
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
  return <View style={styles.root}>
    <View style={[styles.progressHeader, { paddingTop: insets.top + 5 }]}>
      <NavigationIconButton onPress={() => router.replace('/onboarding/weeklyPlanPreview')} style={styles.backButton} />
      {/* Two beats: the invitation, then the meal that was just tracked. */}
      <View style={styles.progressTrackContainer}><OnboardingProgressBar progress={meal ? 1 : 0.5} /></View>
    </View>
    <OnboardingScrollView stepKey={completedId || 'invitation'} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Math.max(24, gutter), paddingBottom: (meal ? 140 : 196) + insets.bottom }]}>
      <Image source={require('../../assets/images/mascot.png')} contentFit="contain" transition={0} style={styles.mascot} />
      <EntranceView entranceIndex={1}>
        <Text accessibilityRole="header" style={styles.title}>{t(meal ? 'onboarding.photoTracking.savedTitle' : 'onboarding.photoTracking.title')}</Text>
        <Text style={styles.subtitle}>{t(meal ? 'onboarding.photoTracking.savedBody' : 'onboarding.photoTracking.subtitle')}</Text>
      </EntranceView>
      <EntranceView entranceIndex={2} style={styles.cardsContainer}>
        {loading ? <View style={styles.card}><ActivityIndicator color={designTheme.yellow} style={styles.loader} /></View> : meal ? <>
          <View style={[styles.card, styles.cardSelected]}>
            <View style={styles.cardIcon}><Ionicons name="checkmark" size={20} color={designTheme.onPrimary} /></View>
            <Text style={[styles.cardTitle, styles.cardTitleSelected]} numberOfLines={2}>{meal.title}</Text>
          </View>
          <MealNutritionSummary nutrition={meal.nutrition} partial={false} />
        </> : <PhotoTrackingPreview />}
      </EntranceView>
    </OnboardingScrollView>
    {!meal && <TouchableOpacity accessibilityRole="button" onPress={next} style={[styles.skip, { bottom: insets.bottom + 98 }]}><Text style={appStyles.textAction}>{t('onboarding.photoTracking.later')}</Text></TouchableOpacity>}
    <OnboardingFooter label={t(meal ? 'onboarding.continue' : 'onboarding.photoTracking.try')} onPress={meal ? next : start} icon={meal ? undefined : 'camera'} loading={loading} backgroundColor={designTheme.cream} />
  </View>;
}
// Mirrors the question steps in formQuestion.tsx so this screen reads as one more step.
const cardShadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 };
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: designTheme.cream },
  progressHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 5, gap: 14 },
  backButton: { width: 36, height: 36, borderRadius: AppRadii.control, backgroundColor: '#F1F2F5', justifyContent: 'center', alignItems: 'center' },
  progressTrackContainer: { flex: 1, height: 36, justifyContent: 'center' },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: FORM_CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 },
  mascot: { width: rw(0.25), height: rw(0.25), alignSelf: 'center', transform: [{ rotate: '20deg' }] },
  title: { textAlign: 'center', fontSize: rw(0.08), lineHeight: rw(0.1), fontFamily: 'Degular', color: Colors.light.text },
  subtitle: { marginTop: 12, marginBottom: 32, paddingHorizontal: 12, textAlign: 'center', fontSize: 16, lineHeight: 22, fontFamily: 'CronosPro', color: Colors.light.textSecondary },
  cardsContainer: { width: '100%', gap: 16, paddingBottom: 12 },
  card: { minHeight: 68, backgroundColor: designTheme.surface, borderRadius: AppRadii.pill, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', ...cardShadow },
  cardSelected: { borderColor: Colors.light.button },
  cardIcon: { width: 34, height: 34, marginRight: 12, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.button },
  cardTitle: { flex: 1, fontSize: rw(0.05), lineHeight: rw(0.06), fontFamily: 'Degular', color: Colors.light.text },
  cardTitleSelected: { color: Colors.light.button },
  loader: { flex: 1 },
  skip: { position: 'absolute', left: 24, right: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
