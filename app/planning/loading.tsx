import { PresentationScanOverlay } from '../../components/planning/PresentationScanOverlay';
import { finishPresentationScan } from '../../services/presentationScan';
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
import { loadFitnessProfile, fitnessProfileToPlanningPreferences } from '../../services/fitnessProfile';
import { dailyMealsForDays, isCompleteWeeklyPlan, normalizeCookingDays, startOfWeekMondayKey } from '../../services/weeklyPlanning';

type Config = {
  servings?: number;
  cookingDays: number[];
  duration: string;
  cuisineIds?: string[];
  diet?: 'none' | 'vegetarian' | 'vegan';
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

  useEffect(() => {
    if (subscriptionLoading || started.current) return;
    if (!subscriptionStatus.isSubscribed) {
      finishPresentationScan();
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
        const profilePreferences = fitnessProfileToPlanningPreferences(profile);
        const cookingDays = normalizeCookingDays(config.cookingDays);
        const response = await apiService.createMealPlan({
          userId,
          weekStart: startOfWeekMondayKey(),
          isSubscribed: true,
          replaceExisting: replace === 'true',
          preferences: {
            ...profilePreferences,
            servings: config.servings || 1,
            cookingDays,
            mealsByDay: dailyMealsForDays(cookingDays),
            includeSnack: true,
            duration: config.duration || 'all',
            cuisineStyle: config.cuisineIds ?? profilePreferences.cuisineStyle,
            diet: config.diet ?? profilePreferences.diet,
            excludedIngredients: config.excludedIngredients || [],
            pantryIngredients: config.pantryIngredients || [],
            pantryMode: config.pantryMode || 'priority',
          },
        });
        if (!isCompleteWeeklyPlan(response.data?.plan)) throw new Error(response.error || t('planning.errors.create'));
        invalidatePlanning();
        analytics.track('meal_plan_created', { plan_id: response.data.plan._id, meal_count: response.data.plan.meals.length, cooking_days: cookingDays.join(',') });
        if (!await finishLoadingBar(generationStartedAt)) return;
        await feedback.success();
        if (replace === 'true') {
          router.dismissTo('/(tabs)');
        } else {
          router.replace({ pathname: '/planning/[planId]', params: { planId: response.data.plan._id } });
        }
        finishPresentationScan();
        schedulePlanningReview(response.data.plan._id);
      } catch (generationError) {
        finishPresentationScan();
        setError(generationError instanceof Error ? generationError.message : t('planning.errors.create'));
        await feedback.error();
      }
    })();
  }, [rawConfig, replace, subscriptionLoading, subscriptionStatus.isSubscribed, t, finishLoadingBar, resetLoadingBar]);

  if (!error) return <View style={{ flex: 1 }}><PlanningLoadingView ready={loadingReady} onComplete={completeLoadingBar} /><PresentationScanOverlay /></View>;

  return (
    <LinearGradient colors={['#FDF9E2', '#FFFFFF']} style={[styles.fill, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Image source={require('../../assets/images/mascot.png')} style={styles.mascot} resizeMode="contain" />
        <View style={styles.errorIcon}><Ionicons name="alert-circle-outline" size={32} color="#9B3B32" /></View>
        <Text style={styles.title}>{t('planningLoading.error')}</Text>
        <Text style={styles.errorText}>{error}</Text>
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
  errorIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  errorText: { marginTop: 8, fontFamily: 'CronosPro', fontSize: 15, lineHeight: 21, color: '#82342D', textAlign: 'center' },
  button: { marginTop: 24, minHeight: 54, minWidth: 180, borderRadius: 22, backgroundColor: Colors.light.button, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'Degular', fontSize: 20, color: 'white' },
});
