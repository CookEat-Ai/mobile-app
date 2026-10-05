import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { apiService, type MealPlan, type MealPlanMeal } from '../../services/api';
import analytics from '../../services/analytics';
import { isPastPlan, isPastPlanDay, planningDaySlots, initialPlanDay, mealsForDay, selectedPlanDays } from '../../services/planningDisplay';
import { invalidatePlanning } from '../../services/planningUpdates';
import { plannedMealRecipeParams, readyPlannedRecipeId } from '../../services/plannedMealNavigation';
import { PlanMealCard } from './PlanMealCard';
import { PlanningDayPicker } from './PlanningDayPicker';
import { PlanningNutritionSummary } from './PlanningNutritionSummary';
import { PlanningShoppingLink } from './PlanningShoppingLink';
import { planningStyles } from './PlanningStyles';
import { PlanningCalorieNotice } from './PlanningCalorieNotice';
import { AnimatedPlanningMeals, usePlanningReveal } from './PlanningReveal';

/** Shared by the current week and history so opening a recipe preserves its portions. */
export function PlanWeekContent({ plan, onPlanChange, initialDay, onRevealStart }: { plan: MealPlan; onPlanChange: (plan: MealPlan) => void; initialDay?: number; onRevealStart?: (anchor: View) => void }) {
  const daysAnchor = useRef<View>(null);
  const alignmentFrame = useRef<number | null>(null);
  useEffect(() => () => { if (alignmentFrame.current !== null) cancelAnimationFrame(alignmentFrame.current); }, []);
  const alignDays = useCallback(() => {
    if (alignmentFrame.current !== null) cancelAnimationFrame(alignmentFrame.current);
    // Measure after the replay controls and day selector have laid out.
    alignmentFrame.current = requestAnimationFrame(() => {
      alignmentFrame.current = null;
      if (daysAnchor.current) onRevealStart?.(daysAnchor.current);
    });
  }, [onRevealStart]);
  const { t, i18n } = useTranslation();
  const [selectedDay, setDay] = useState(() => initialPlanDay(plan, undefined, initialDay));
  const [opening, setOpening] = useState<string | null>(null);
  const openingRef = useRef(false);
  const [error, setError] = useState('');
  const days = selectedPlanDays(plan);
  const selected = days.find(item => item.dayIndex === selectedDay)
    ?? days.find(item => item.dayIndex === initialPlanDay(plan)) ?? days[0];
  const day = selected?.dayIndex ?? 0;
  const meals = useMemo(() => mealsForDay(plan, initialPlanDay(plan, undefined, selectedDay)), [plan, selectedDay]);
  const locale = i18n.resolvedLanguage || 'fr';
  const { animationKey, replayButton, stopReveal, visibleDayCount, dayAnimationKey } = usePlanningReveal(plan.meals.length > 0, days.map(item => item.dayIndex), setDay, plan._id, alignDays);
  const openMeal = async (meal: MealPlanMeal) => {
    if (openingRef.current) return;
    stopReveal();
    openingRef.current = true;
    setOpening(meal.slotId); setError('');
    try {
      let recipeId = readyPlannedRecipeId(plan, meal.slotId);
      if (!recipeId) {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) throw new Error(t('planning.errors.user'));
        const response = await apiService.materializeMeal(plan._id, meal.slotId, userId);
        if (!response.data?.recipeId) throw new Error(response.error || t('planning.errors.generateRecipe'));
        recipeId = response.data.recipeId;
        onPlanChange(response.data.plan);
      }
      analytics.track('meal_plan_recipe_opened', { plan_id: plan._id, recipe_id: recipeId });
      router.push({ pathname: '/recipe-detail', params: plannedMealRecipeParams(plan._id, meal.slotId, recipeId, 'meal_plan') });
    } catch (caught) { setError(caught instanceof Error ? caught.message : t('planning.errors.generateRecipe')); }
    finally { openingRef.current = false; setOpening(null); }
  };
  const addMeal = async (mealType: string) => {
    if (openingRef.current || isPastPlanDay(plan.weekStart, day)) return;
    openingRef.current = true; setOpening(`add:${mealType}`); setError('');
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      const response = await apiService.addPlannedMeal(plan._id, userId, day, mealType);
      if (!response.data?.plan) throw new Error(response.error || t('planning.errors.update'));
      invalidatePlanning(); onPlanChange(response.data.plan);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t('planning.errors.update')); }
    finally { openingRef.current = false; setOpening(null); }
  };
  const removeMeal = (meal: MealPlanMeal) => {
    stopReveal();
    if (openingRef.current || isPastPlanDay(plan.weekStart, meal.dayIndex ?? 0)) return;
    Alert.alert(t('planning.delete.title'), t('planning.delete.description', { title: meal.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        if (openingRef.current) return;
        openingRef.current = true;
        setOpening(meal.slotId); setError('');
        void (async () => {
          try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) throw new Error(t('planning.errors.user'));
            const response = await apiService.deletePlannedMeal(plan._id, meal.slotId, userId);
            if (!response.data?.plan) throw new Error(response.error || t('planning.errors.update'));
            invalidatePlanning();
            onPlanChange(response.data.plan);
          } catch (caught) { setError(caught instanceof Error ? caught.message : t('planning.errors.update')); }
          finally { openingRef.current = false; setOpening(null); }
        })();
      } },
    ]);
  };
  return <View>
    {replayButton}

    <View ref={daysAnchor} collapsable={false}><PlanningDayPicker visibleCount={visibleDayCount} revealKey={dayAnimationKey} days={days.map(item => ({
      ...item,
      short: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(item.date),
      label: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(item.date),
      number: item.date.getDate(),
    }))} selectedDay={day} onSelect={nextDay => { stopReveal(); setDay(nextDay); }} /></View>
    {!!meals.length && <PlanningNutritionSummary key={`nutrition:${plan._id}:${day}`} meals={meals} />}
    <PlanningCalorieNotice plan={plan} dayIndex={day} />
    {selected && <View style={planningStyles.sectionRow}>
      <Text style={planningStyles.sectionTitle}>{t('planning.dayMeals', { day: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(selected.date) })}</Text>
    </View>}
    {error ? <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text> : null}
    <AnimatedPlanningMeals key={`meals:${plan._id}:${day}`} meals={planningDaySlots(plan, day)} animationKey={animationKey}
      renderMeal={slot => slot.meal ? <PlanMealCard meal={slot.meal} loading={opening === slot.meal.slotId} disabled={!!opening} onLongPress={!isPastPlanDay(plan.weekStart, slot.meal.dayIndex ?? 0) ? () => removeMeal(slot.meal!) : undefined} onPress={() => void openMeal(slot.meal!)} /> : <TouchableOpacity key={slot.slotId} accessibilityRole="button" disabled={!!opening || isPastPlanDay(plan.weekStart, day)} style={[styles.emptySlot, isPastPlanDay(plan.weekStart, day) && { opacity: 0.5 }]}
      onPress={() => Alert.alert(t('planningSlots.add'), t(`search.categories.${{ breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }[slot.mealType]}`), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('recipeDetail.chooseReplacement'), onPress: () => { stopReveal(); router.push({ pathname: '/planning/choose-recipe', params: { planId: plan._id, dayIndex: day, mealType: slot.mealType } }); } },
        { text: t('recipeDetail.automaticReplacement'), onPress: () => { stopReveal(); void addMeal(slot.mealType); } },
      ])}>
      <Ionicons name="add-circle-outline" size={24} color={theme.ink} /><View style={{ flex: 1 }}><Text style={appStyles.textAction}>{t(`search.categories.${{ breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }[slot.mealType]}`)}</Text><Text style={appStyles.subtitle}>{t(isPastPlanDay(plan.weekStart, day) ? 'planningSlots.past' : 'planningSlots.add')}</Text></View>
    </TouchableOpacity>} />
    <PlanningShoppingLink onPress={() => router.push({ pathname: '/planning/[planId]/shopping', params: { planId: plan._id } })} />
    {!isPastPlan(plan) && plan.meals.length > 0 && <TouchableOpacity accessibilityRole="button" style={styles.organize} disabled={!!opening}
      onPress={() => router.push({ pathname: '/planning/organize', params: { planId: plan._id } })}>
      <Ionicons name="pencil-outline" size={20} color={theme.ink} /><Text style={appStyles.textAction}>{t('planningOrganize.action')}</Text>
    </TouchableOpacity>}
  </View>;
}

const styles = StyleSheet.create({
  emptySlot: { minHeight: 80, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  organize: { marginTop: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shoppingText: { flex: 1, fontFamily: 'CronosProBold', fontSize: 17, color: theme.ink },
  empty: { paddingVertical: 28, gap: 12 },
  browse: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
