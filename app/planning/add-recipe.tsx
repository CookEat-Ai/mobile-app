import { AppTheme as designTheme, AppRadii, appStyles } from '../../constants/AppTheme';
import { compatiblePlanningSlots, planDays } from '../../services/planningDisplay';
import { invalidatePlanning } from '../../services/planningUpdates';
import { EntranceView } from '../../components/motion/Entrance';
import { NavigationIconButton } from '../../components/NavigationIconButton';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedback } from '../../services/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PlanMealCard } from '../../components/planning/PlanMealCard';
import { planningStyles } from '../../components/planning/PlanningStyles';
import { Colors } from '../../constants/Colors';

import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import apiService, { MealPlan, CatalogRecipe } from '../../services/api';
import { replacedMealPlanningRoute } from '../../services/plannedMealNavigation';

export default function AddRecipeToPlanScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gutter, font } = useResponsive();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [recipe, setRecipe] = useState<CatalogRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setRecipe(null);
    void (async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) throw new Error(t('planning.errors.user'));
        if (!recipeId) throw new Error(t('common.requestError'));
        const [planResponse, recipeResponse] = await Promise.all([
          apiService.getMealPlan(userId),
          apiService.getCatalogRecipe(recipeId),
        ]);
        if (!active) return;
        if (!planResponse.data) throw new Error(planResponse.error || t('planning.errors.load'));
        if (!recipeResponse.data?.recipe) throw new Error(recipeResponse.error || t('common.requestError'));
        setPlan(planResponse.data.plan || null);
        setRecipe(recipeResponse.data.recipe);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : t('common.requestError'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [recipeId, t]);

  const slots = useMemo(() => plan && recipe ? compatiblePlanningSlots(plan, recipe.replacementMealTypes || []) : [], [plan, recipe]);
  const dayGroups = useMemo(() => plan ? planDays(plan.weekStart)
    .map(day => ({ ...day, slots: slots.filter(slot => slot.dayIndex === day.dayIndex) }))
    .filter(day => day.slots.length > 0) : [], [plan, slots]);
  const dayFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage || 'fr', { weekday: 'long', day: 'numeric', month: 'short' });

  const replace = async (slotId: string) => {
    const slot = slots.find(item => item.slotId === slotId);
    if (!plan || !recipeId || replacing || !slot) return;
    setReplacing(slotId);
    setError(null);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      const response = slot.meal
        ? await apiService.setPlannedMealRecipe(plan._id, slotId, userId, recipeId)
        : await apiService.addPlannedMeal(plan._id, userId, slot.dayIndex, slot.mealType, recipeId);
      if (!response.data?.plan) throw new Error(response.error || t('planning.errors.replace'));
      invalidatePlanning();
      void feedback.success().catch(() => {});
      router.dismissTo(replacedMealPlanningRoute(response.data.plan, slot.meal ? slotId : response.data.plan.meals.find(meal => meal.dayIndex === slot.dayIndex && meal.mealType === slot.mealType)!.slotId));
    } catch (replaceError) {
      feedback.error();
      setError(replaceError instanceof Error ? replaceError.message : t('planning.errors.replace'));
    } finally {
      setReplacing(null);
    }
  };

  return (
    <LinearGradient colors={[designTheme.background, '#FFFFFF']} locations={[0, 0.72]} style={styles.fill}>
      <View style={[appStyles.backHeader, styles.topBar, { paddingTop: insets.top + 8, paddingHorizontal: gutter }]}>
        <NavigationIconButton style={styles.iconButton} onPress={() => router.back()} accessibilityLabel={t('common.back')} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
          style={[appStyles.headerTitle, appStyles.backHeaderTitle, { fontSize: font(29) }]}>{t('addRecipe.title')}</Text>
        <View style={styles.placeholder} />
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.button} /></View> : null}
      {!loading && error && !recipe ? <View style={styles.center}><Text style={styles.error}>{error}</Text></View> : null}
      {!loading && !error && !plan ? <View style={styles.center}><Ionicons name="calendar-outline" size={40} color={Colors.light.button} /><Text style={styles.empty}>{t('addRecipe.noPlan')}</Text><TouchableOpacity style={styles.button} onPress={() => router.replace('/planning/configure')}><Text style={styles.buttonText}>{t('planning.generation.cta')}</Text></TouchableOpacity></View> : null}
      {!loading && plan && recipe ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ ...contentColumn(), paddingHorizontal: gutter, paddingBottom: insets.bottom + 30 }}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!slots.length && <Text style={styles.empty}>{t('addRecipe.noCompatibleMeals')}</Text>}
        {dayGroups.map(day => <View key={day.key}>
          <View style={planningStyles.dayHeading}><Text accessibilityRole="header" style={appStyles.section}>{dayFormatter.format(day.date)}</Text></View>
          <View style={styles.list}>{day.slots.map(slot => <EntranceView key={slot.slotId} entranceIndex={slots.indexOf(slot)}>{slot.meal ? <PlanMealCard meal={slot.meal} loading={replacing === slot.slotId} disabled={!!replacing} onPress={() => void replace(slot.slotId)} /> : <TouchableOpacity accessibilityRole="button" disabled={!!replacing} style={styles.emptySlot} onPress={() => void replace(slot.slotId)}><Ionicons name="add-circle-outline" size={26} color={Colors.light.button} /><View style={{ flex: 1 }}><Text style={styles.slotTitle}>{t(`planningConfig.meals.${slot.mealType}`)}</Text><Text style={styles.slotHelp}>{t('planningSlots.add')}</Text></View>{replacing === slot.slotId && <ActivityIndicator color={Colors.light.button} />}</TouchableOpacity>}</EntranceView>)}</View>
        </View>)}
      </ScrollView> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { paddingBottom: 14 },
  iconButton: { width: 44, height: 44, borderRadius: AppRadii.control, backgroundColor: designTheme.surface, alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: 44, height: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 26 },
  empty: { fontFamily: 'Degular', fontSize: 23, color: Colors.light.text, textAlign: 'center' },
  button: { minHeight: 54, alignSelf: 'stretch', borderRadius: AppRadii.card, backgroundColor: Colors.light.button, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'Degular', fontSize: 20, color: designTheme.onPrimary },
  error: { fontFamily: 'CronosPro', color: designTheme.danger, marginBottom: 10 },
  emptySlot: { minHeight: 80, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.light.button, borderRadius: AppRadii.control, flexDirection: 'row', alignItems: 'center', gap: 12 }, slotTitle: { fontFamily: 'CronosProBold', fontSize: 18, color: Colors.light.text }, slotHelp: { fontFamily: 'CronosPro', fontSize: 15, color: Colors.light.text },
  list: { gap: 12 },
});
