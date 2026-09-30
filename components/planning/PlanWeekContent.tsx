import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
import { apiService, type MealPlan, type MealPlanMeal } from '../../services/api';
import analytics from '../../services/analytics';
import { initialPlanDay, mealsForDay, selectedPlanDays } from '../../services/planningDisplay';
import { plannedMealRecipeParams, readyPlannedRecipeId } from '../../services/plannedMealNavigation';
import { PlanMealCard } from './PlanMealCard';
import { PlanningDayPicker } from './PlanningDayPicker';
import { PlanningNutritionSummary } from './PlanningNutritionSummary';
import { PlanningShoppingLink } from './PlanningShoppingLink';
import { planningStyles } from './PlanningStyles';
import { PlanningCalorieNotice } from './PlanningCalorieNotice';
import { AnimatedPlanningMeals, usePlanningReveal } from './PlanningReveal';

/** Shared by the current week and history so opening a recipe preserves its portions. */
export function PlanWeekContent({ plan, onPlanChange, initialDay }: { plan: MealPlan; onPlanChange: (plan: MealPlan) => void; initialDay?: number }) {
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
  const { animationKey, replayButton } = usePlanningReveal(meals.length > 0);
  const openMeal = async (meal: MealPlanMeal) => {
    if (openingRef.current) return;
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
  return <View>
    {replayButton}
    <PlanningDayPicker days={days.map(item => ({
      ...item,
      short: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(item.date),
      label: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(item.date),
      number: item.date.getDate(),
    }))} selectedDay={day} onSelect={setDay} />
    {!!meals.length && <PlanningNutritionSummary key={`nutrition:${plan._id}:${day}`} meals={meals} dailyCalories={plan.nutritionTargets?.dailyCalories} />}
    <PlanningCalorieNotice plan={plan} dayIndex={day} />
    {selected && <View style={planningStyles.sectionRow}>
      <Text style={planningStyles.sectionTitle}>{t('planning.dayMeals', { day: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(selected.date) })}</Text>
    </View>}
    {error ? <Text accessibilityRole="alert" style={appStyles.error}>{error}</Text> : null}
    <AnimatedPlanningMeals key={`meals:${plan._id}:${day}`} meals={meals} animationKey={animationKey} renderMeal={meal => <PlanMealCard meal={meal} loading={opening === meal.slotId} disabled={!!opening} onPress={() => void openMeal(meal)} />} />
    {!meals.length && <View style={styles.empty}><Text style={appStyles.subtitle}>{t('dailyApp.dayEmpty')}</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.browse} onPress={() => router.push('/(tabs)/meals')}><Text style={styles.shoppingText}>{t('dailyApp.browse')}</Text><Ionicons name="arrow-forward" size={18} color={theme.ink} /></TouchableOpacity>
    </View>}
    <PlanningShoppingLink onPress={() => router.push({ pathname: '/planning/[planId]/shopping', params: { planId: plan._id } })} />
  </View>;
}

const styles = StyleSheet.create({
  shoppingText: { flex: 1, fontFamily: 'CronosProBold', fontSize: 17, color: theme.ink },
  empty: { paddingVertical: 28, gap: 12 },
  browse: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
