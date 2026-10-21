import { AppTheme as designTheme, AppRadii, appStyles } from '../../constants/AppTheme';
import type { CookingLevel, MealBudget } from '../../services/cookingPreferences';
import { PlanningFlowHeader } from '../../components/planning/PlanningFlowHeader';
import { invalidatePlanning } from '../../services/planningUpdates';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedback } from '../../services/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PlanningLoadingView, usePlanningLoading } from '../../components/loading/PlanningLoadingView';
import { Colors } from '../../constants/Colors';
import { useSubscription } from '../../hooks/useSubscription';
import analytics from '../../services/analytics';
import { schedulePlanningReview } from '../../services/planningReview';
import { apiService } from '../../services/api';
import { loadFitnessProfile, fitnessProfileToPlanningPreferences, type FitnessGoal } from '../../services/fitnessProfile';
import { profileForPlanningGoal } from '../../services/planningGoal';
import { dailyMealsForDays, loadPlanningGenerationSettings, savePlanningGenerationSettings, isCompleteWeeklyPlan, normalizeCookingDays, planningStartKey, type PlanningDiet } from '../../services/weeklyPlanning';

type Config = {
  goal?: FitnessGoal;
  servings?: number;
  weeklyBudget?: number;
  country?: string; currency?: string;
  cookingLevel?: CookingLevel;
  mealBudget?: MealBudget;
  equipments?: string[];
  cookingDays: number[];
  duration: string;
  cuisineIds?: string[];
  diet?: PlanningDiet;
  excludedIngredients?: string[];
  pantryIngredients?: string[];
  pantryMode?: 'priority' | 'strict';
};

export default function PlanningLoadingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ready: loadingReady, reset: resetLoadingBar, finish: finishLoadingBar, onComplete: completeLoadingBar } = usePlanningLoading();
  const { config: rawConfig, replace } = useLocalSearchParams<{ config?: string; replace?: string }>();
  const { subscriptionStatus, isLoading: subscriptionLoading } = useSubscription();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const [pantryRecovery, setPantryRecovery] = useState(false);
  const [allowShopping, setAllowShopping] = useState(false);

  useEffect(() => {
    if (subscriptionLoading || started.current) return;
    if (!subscriptionStatus.isSubscribed) {
      router.replace({ pathname: '/paywall', params: { source: 'meal_planner_generation' } });
      return;
    }
    started.current = true;
    resetLoadingBar();
    const generationStartedAt = performance.now();
    void (async () => {
      try {
        const config = JSON.parse(rawConfig || '{}') as Config;
        const [userId, profile] = await Promise.all([AsyncStorage.getItem('userId'), loadFitnessProfile()]);
        if (!userId) throw new Error(t('planning.errors.user'));
        const profilePreferences = fitnessProfileToPlanningPreferences(profileForPlanningGoal(profile, config.goal));
        const cookingDays = normalizeCookingDays(config.cookingDays);
        const response = await apiService.createMealPlan({
          userId,
          weekStart: planningStartKey(),
          isSubscribed: true,
          replaceExisting: replace === 'true',
          preferences: {
            ...profilePreferences,
            cookingLevel: config.cookingLevel ?? profilePreferences.cookingLevel,
            mealBudget: config.mealBudget ?? profilePreferences.mealBudget,
            equipments: config.equipments ?? profilePreferences.equipments,
            servings: config.servings || 1,
            weeklyBudget: config.weeklyBudget, country: config.country, currency: config.currency,
            cookingDays,
            mealsByDay: dailyMealsForDays(cookingDays),
            includeSnack: true,
            duration: config.duration || 'all',
            cuisineStyle: config.cuisineIds ?? profilePreferences.cuisineStyle,
            diet: config.diet ?? profilePreferences.diet,
            excludedIngredients: config.excludedIngredients || [],
            pantryIngredients: config.pantryIngredients || [],
            pantryMode: allowShopping ? 'priority' : config.pantryMode || 'priority',
          },
        });
        if (!isCompleteWeeklyPlan(response.data?.plan)) {
          setPantryRecovery(!allowShopping && config.pantryMode === 'strict' && response.status === 422);
          throw new Error(response.error || t('planning.errors.create'));
        }
        invalidatePlanning();
        analytics.track('meal_plan_created', { plan_id: response.data.plan._id, meal_count: response.data.plan.meals.length, cooking_days: cookingDays.join(',') });
        if (!await finishLoadingBar(generationStartedAt)) return;
        await feedback.success();
        router.dismissTo('/(tabs)');
          schedulePlanningReview(response.data.plan._id);
      } catch (generationError) {
          setError(generationError instanceof Error ? generationError.message : t('planning.errors.create'));
        await feedback.error();
      }
    })();
  }, [allowShopping, rawConfig, replace, subscriptionLoading, subscriptionStatus.isSubscribed, t, finishLoadingBar, resetLoadingBar]);

  if (!error) return <View style={{ flex: 1 }}><PlanningFlowHeader /><View style={{ flex: 1 }}><PlanningLoadingView ready={loadingReady} onComplete={completeLoadingBar} /></View></View>;

  return (
    <LinearGradient colors={[designTheme.background, '#FFFFFF']} style={[styles.fill, { paddingBottom: insets.bottom }]}>
      <PlanningFlowHeader /><View style={styles.content}>
        <Image source={require('../../assets/images/mascot.png')} style={styles.mascot} resizeMode="contain" />
        <View style={styles.errorIcon}><Ionicons name="alert-circle-outline" size={32} color={designTheme.danger} /></View>
        <Text style={styles.title}>{t('planningLoading.error')}</Text>
        <Text style={styles.errorText}>{error}</Text>
        {pantryRecovery && <><Text style={[styles.errorText,{color:designTheme.muted}]}>{t('planningPantry.strictRecovery')}</Text><TouchableOpacity style={styles.button} onPress={() => {started.current=false;setError(null);setPantryRecovery(false);setAllowShopping(true);void loadPlanningGenerationSettings().then(settings => savePlanningGenerationSettings({...settings,pantryMode:'priority'})).catch(()=>undefined);}}><Text style={styles.buttonText}>{t('planningPantry.allowShopping')}</Text></TouchableOpacity></>}
        <TouchableOpacity style={styles.button} onPress={() => router.back()}><Text style={styles.buttonText}>{t('common.back')}</Text></TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  mascot: { width: 130, height: 130, marginBottom: 24 },
  title: { marginTop: 20, fontFamily: 'Degular', fontSize: 30, lineHeight: 34, color: Colors.light.text, textAlign: 'center' },
  errorIcon: { width: 64, height: 64, borderRadius: AppRadii.card, backgroundColor: designTheme.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  errorText: { marginTop: 8, fontFamily: 'CronosPro', fontSize: 15, lineHeight: 21, color: designTheme.danger, textAlign: 'center' },
  button: { ...appStyles.button, marginTop: 24, minHeight: 54, minWidth: 180, maxWidth: '100%', borderRadius: AppRadii.card },
  buttonText: { ...appStyles.buttonText, textAlign: 'center', flexShrink: 1 },
});
