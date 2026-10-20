import { CONTENT_MAX_WIDTH } from '../../constants/Layout';
import { AppTheme as designTheme, AppRadii } from '../../constants/AppTheme';
import { usePlanningClock } from '../../hooks/usePlanningClock';
import { CookingDaysPicker } from '../../components/planning/CookingDaysPicker';
import { PlanMealCard } from '../../components/planning/PlanMealCard';
import { PlanningDayPicker } from '../../components/planning/PlanningDayPicker';
import { PlanningOverview } from '../../components/planning/PlanningOverview';
import { useResponsive } from '../../hooks/useResponsive';
import { PlanningShoppingLink } from '../../components/planning/PlanningShoppingLink';
import { planningStyles } from '../../components/planning/PlanningStyles';
import { PlanningCalorieNotice } from '../../components/planning/PlanningCalorieNotice';
import { AnimatedPlanningMeals, usePlanningReveal } from '../../components/planning/PlanningReveal';
import { OnboardingScrollView } from '../../components/onboarding/OnboardingScrollView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { feedback } from '../../services/haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { PlanningLoadingView, usePlanningLoading } from '../../components/loading/PlanningLoadingView';
import { Colors } from '../../constants/Colors';
import analytics from '../../services/analytics';
import { schedulePlanningReview } from '../../services/planningReview';
import { apiService, MealPlan, MealPlanMeal } from '../../services/api';
import { getAnonymousUserId } from '../../services/anonymousSession';
import { fitnessProfileToPlanningPreferences, loadFitnessProfile } from '../../services/fitnessProfile';
import { plannedMealRecipeParams } from '../../services/plannedMealNavigation';
import {
  addDays,
  DEFAULT_COOKING_DAYS,
  isCompleteWeeklyPlan,
  loadPlanningGenerationSettings,
  normalizeCookingDays,
  saveOnboardingWeeklyPlanId,
  savePlanningGenerationSettings,
} from '../../services/weeklyPlanning';


export default function WeeklyPlanPreviewScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const { ready: loadingReady, reset: resetLoadingBar, finish: finishLoadingBar, onComplete: completeLoadingBar } = usePlanningLoading();
  const { weekStart } = usePlanningClock();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [cookingDays, setCookingDays] = useState<number[]>([...DEFAULT_COOKING_DAYS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const interactionVersion = useRef(0);
  const generating = useRef(false);

  const generate = useCallback(async () => {
    if (generating.current) return;
    generating.current = true;
    interactionVersion.current += 1;
    feedback.confirm();
    resetLoadingBar();
    const generationStartedAt = performance.now();
    setLoading(true);
    setError(null);
    setNetworkError(false);
    try {
      const [userId, profile] = await Promise.all([
        getAnonymousUserId().catch(() => {
          setNetworkError(true);
          throw new Error(t('weeklyOnboarding.preview.networkErrorSubtitle'));
        }),
        loadFitnessProfile(),
      ]);
      const existing = await apiService.getMealPlan(userId, weekStart, true);
      const existingPlan = existing.data?.plan || null;
      const selectedCookingDays = normalizeCookingDays(cookingDays);
      analytics.track('onboarding_weekly_plan_generation_started', { planning_horizon_days: 7, cooking_days: selectedCookingDays.join(',') });
      const settings = await loadPlanningGenerationSettings();
      const profilePreferences = fitnessProfileToPlanningPreferences(profile);
      const preferences = { ...profilePreferences, pantryIngredients: [], pantryMode: 'priority' as const, servings: settings.servings || 1, cookingDays: selectedCookingDays, includeSnack: true };
      const response = await apiService.createMealPlan({
        userId,
        weekStart,
        preferences,
        preview: true,
        replaceExisting: Boolean(existingPlan),
      });
      if (!isCompleteWeeklyPlan(response.data?.plan)) {
        setNetworkError(Boolean(response.error) && response.status === undefined);
        throw new Error(response.error || t('planning.errors.create'));
      }
      const nextPlan = response.data.plan;
      await Promise.all([
        saveOnboardingWeeklyPlanId(nextPlan._id),
        savePlanningGenerationSettings({
          ...settings,
          cookingLevel: profilePreferences.cookingLevel, mealBudget: profilePreferences.mealBudget, equipments: profilePreferences.equipments,
          pantryIngredients: [],
          pantryMode: 'priority',
          cookingDays: selectedCookingDays,
          includeSnack: true,
          duration: profilePreferences.duration === 'fast' || profilePreferences.duration === 'medium' ? profilePreferences.duration : 'all',
        }),
      ]);
      if (!await finishLoadingBar(generationStartedAt)) return;
      feedback.success();
      setPlan(nextPlan);
      const restoredDays = normalizeCookingDays(nextPlan.preferences?.cookingDays);
      setCookingDays(restoredDays);
      setSelectedDay(restoredDays[0]);
      schedulePlanningReview(nextPlan._id, true);
      analytics.track('onboarding_weekly_plan_generation_completed', { plan_id: nextPlan._id, meal_count: nextPlan.meals.length, cooking_days: selectedCookingDays.join(',') });
    } catch (generationError) {
      feedback.error();
      setError(generationError instanceof Error ? generationError.message : t('planning.errors.create'));
      analytics.track('onboarding_weekly_plan_generation_failed', { reason: generationError instanceof Error ? generationError.message : 'unknown' });
    } finally {
      generating.current = false;
      setLoading(false);
    }
  }, [cookingDays, weekStart, finishLoadingBar, resetLoadingBar, t]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const version = interactionVersion.current;
    const canRestore = () => active && version === interactionVersion.current;
    // Restore in the background: choosing cooking days must never wait for the API.
    void (async () => {
      try {
        const [userId, settings] = await Promise.all([AsyncStorage.getItem('userId'), loadPlanningGenerationSettings()]);
        if (!canRestore()) return;
        if (version === 0) setCookingDays(settings.cookingDays);
        if (!userId) return;
        const response = await apiService.getMealPlan(userId, weekStart, true);
        if (canRestore() && isCompleteWeeklyPlan(response.data?.plan)) {
          const existingPlan = response.data.plan;
          setPlan(existingPlan);
          const existingDays = normalizeCookingDays(existingPlan.preferences?.cookingDays);
          if (version === 0) setCookingDays(existingDays);
          setSelectedDay(current => existingDays.includes(current) ? current : existingDays[0]);
        }
      } catch {
        // Keep the selection visible; an explicit generation can surface any error.
      }
    })();
    return () => { active = false; };
    // The API reads the current locale internally; re-fetch translated recipes when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, i18n.language]));

  const days = useMemo(() => Array.from({ length: 7 }, (_, dayIndex) => {
    const key = addDays(plan?.weekStart || weekStart, dayIndex);
    const date = new Date(`${key}T12:00:00`);
    return {
      key,
      dayIndex,
      short: new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(date),
      label: new Intl.DateTimeFormat(i18n.language, { weekday: 'long' }).format(date),
      number: date.getDate(),
    };
  }), [i18n.language, weekStart, plan?.weekStart]);
  const visibleDays = useMemo(() => days.filter((day) => (plan?.meals || []).some((meal) => meal.dayIndex === day.dayIndex)), [days, plan?.meals]);
  const meals = useMemo(() => (plan?.meals || []).filter((meal) => (meal.dayIndex ?? 0) === selectedDay).sort((a, b) => a.position - b.position), [plan?.meals, selectedDay]);
  const { animationKey, revealControls, stopReveal, visibleDayCount, dayAnimationKey } = usePlanningReveal(!loading && Boolean(plan?.meals.length), visibleDays.map(day => day.dayIndex), setSelectedDay, plan?._id || '');
  const selectedDayLabel = days.find((day) => day.dayIndex === selectedDay)?.label || '';

  const openMeal = async (meal: MealPlanMeal) => {
    stopReveal();
    if (!plan || opening) return;
    setOpening(meal.slotId);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      let recipeId = meal.recipeId;
      if (!recipeId || meal.status !== 'ready') {
        const response = await apiService.materializeMeal(plan._id, meal.slotId, userId);
        if (!response.data?.recipeId || !response.data.plan) throw new Error(response.error || 'materialize_failed');
        recipeId = response.data.recipeId;
        const previewImage = meal.image;
        setPlan({ ...response.data.plan, meals: response.data.plan.meals.map((entry) => entry.slotId === meal.slotId && previewImage && !entry.image ? { ...entry, image: previewImage } : entry) });
      }
      analytics.track('onboarding_weekly_meal_opened', { plan_id: plan._id, slot_id: meal.slotId, recipe_id: recipeId });
      router.push({ pathname: '/recipe-detail', params: plannedMealRecipeParams(plan._id, meal.slotId, recipeId, 'onboarding_week_preview') });
    } catch {
      await feedback.error();
    } finally {
      setOpening(null);
    }
  };

  if (loading) return <View style={{ flex: 1 }}><PlanningLoadingView ready={loadingReady} onComplete={completeLoadingBar} /></View>;
  if (error) return (
    <View style={styles.state}>
      <View style={styles.sparkle}><Ionicons name="alert-circle-outline" size={48} color={Colors.light.button} /></View>
      <Text style={styles.stateTitle}>{t(networkError ? 'weeklyOnboarding.preview.networkErrorTitle' : 'weeklyOnboarding.preview.errorTitle')}</Text>
      <Text style={styles.stateSubtitle}>{error}</Text>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={() => void generate()} style={styles.retry}>
        <Text style={styles.retryText}>{t('weeklyOnboarding.preview.retry')}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={() => { setError(null); setPlan(null); }} style={styles.retry}>
        <Text style={styles.retryText}>{t('auditFixes.editSelection')}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={() => router.push('/onboarding/formQuestion')} style={styles.retry}>
        <Text style={styles.retryText}>{t('auditFixes.editPreferences')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!plan) return <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
    <OnboardingScrollView stepKey="configuration" style={{ marginLeft: insets.left, marginRight: insets.right }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.configurationContent, { paddingHorizontal: gutter, paddingBottom: 132 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={styles.configurationIcon}><Ionicons name="calendar" size={34} color={Colors.light.button} /></View>
      <Text style={styles.configurationTitle}>{t('planning.generation.title')}</Text>
      <Text style={styles.configurationSubtitle}>{t('planning.generation.subtitle')}</Text>
      <Text style={styles.configurationLabel}>{t('planning.generation.daysTitle')}</Text>
      <CookingDaysPicker weekStart={weekStart} value={cookingDays} onChange={next => { interactionVersion.current += 1; setCookingDays(next); }} />
    </OnboardingScrollView>
    <OnboardingFooter label={t('planning.generation.cta')} onPress={() => void generate()} />
  </View>;

  return <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
    <OnboardingScrollView stepKey="preview" contentContainerStyle={[styles.content, { paddingHorizontal: gutter, paddingBottom: 132 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={styles.heroRow}><View style={styles.heroCopy}><View style={styles.badge}><Ionicons name="sparkles" size={14} color={Colors.light.button} /><Text style={styles.badgeText}>{t('weeklyOnboarding.preview.badge')}</Text></View><Text style={styles.title}>{t('fitnessOnboarding.preview.title')}</Text><View style={styles.weekCount}><Text style={styles.weekCountValue}>{plan?.meals.length || 0}</Text><Text style={styles.weekCountLabel}>{t('fitnessOnboarding.interstitials.facts.meals')}</Text></View></View></View>
      {revealControls}
      <PlanningDayPicker visibleCount={visibleDayCount} revealKey={dayAnimationKey} days={visibleDays} selectedDay={selectedDay} onSelect={day => { stopReveal(); setSelectedDay(day); }} />
      <PlanningOverview plan={plan} meals={meals} day={selectedDay} />
      <PlanningCalorieNotice plan={plan} dayIndex={selectedDay} />
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{t('planning.dayMeals', { day: selectedDayLabel })}</Text></View>
      <AnimatedPlanningMeals key={`meals:${plan._id}:${selectedDay}`} meals={meals} animationKey={animationKey} renderMeal={meal => <PlanMealCard meal={meal} loading={opening === meal.slotId} disabled={Boolean(opening)} onPress={() => void openMeal(meal)} />} />
      <PlanningShoppingLink onPress={() => router.push({ pathname: '/planning/[planId]/shopping', params: { planId: plan._id, source: 'onboarding_week_preview' } })} />
      <Text style={styles.disclaimer}>{t('fitnessOnboarding.preview.disclaimer')}</Text>
    </OnboardingScrollView>
    <OnboardingFooter label={t('weeklyOnboarding.preview.cta')} onPress={() => router.replace('/onboarding/photoTrackingDemo')} />
  </View>;
}


const styles = StyleSheet.create({
  ...planningStyles,
  root: { flex: 1, backgroundColor: designTheme.background }, content: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20 }, state: { flex: 1, backgroundColor: designTheme.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }, sparkle: { width: 92, height: 92, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: designTheme.yellowSoft }, stateTitle: { marginTop: 20, fontFamily: 'Degular', fontSize: 29, color: Colors.light.text, textAlign: 'center' }, stateSubtitle: { marginTop: 10, fontFamily: 'CronosPro', fontSize: 17, lineHeight: 23, color: Colors.light.textSecondary, textAlign: 'center' }, retry: { width: '100%', maxWidth: 320, minHeight: 56, alignItems: 'center', justifyContent: 'center', marginTop: 22, borderRadius: AppRadii.pill, backgroundColor: Colors.light.button, paddingHorizontal: 24, paddingVertical: 14 }, retryText: { color: designTheme.onPrimary, fontFamily: 'Degular', fontSize: 17, textAlign: 'center' },
  configurationContent: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 42 },
  configurationIcon: { width: 66, height: 66, borderRadius: AppRadii.card, backgroundColor: '#FFF1C5', alignItems: 'center', justifyContent: 'center' },
  configurationTitle: { marginTop: 22, fontFamily: 'Degular', fontSize: 34, lineHeight: 37, color: Colors.light.text },
  configurationSubtitle: { marginTop: 7, fontFamily: 'CronosPro', fontSize: 17, lineHeight: 23, color: Colors.light.textSecondary },
  configurationLabel: { marginTop: 30, marginBottom: 11, fontFamily: 'CronosProBold', fontSize: 16, color: Colors.light.text },
  heroRow: { marginTop: 8 }, heroCopy: { width: '100%' }, badge: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: designTheme.yellowSoft, borderRadius: AppRadii.pill, paddingHorizontal: 11, minHeight: 30 }, badgeText: { color: Colors.light.button, fontFamily: 'CronosProBold', fontSize: 12 }, title: { marginTop: 11, fontFamily: 'Degular', fontSize: 31, lineHeight: 34, color: Colors.light.text },
  weekCount: { alignSelf: 'flex-start', marginTop: 10, minHeight: 32, borderRadius: AppRadii.pill, backgroundColor: Colors.light.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 12 }, weekCountValue: { fontFamily: 'Degular', fontSize: 18, lineHeight: 20, color: designTheme.onPrimary }, weekCountLabel: { fontFamily: 'CronosProBold', fontSize: 10, color: designTheme.onPrimary },
});
