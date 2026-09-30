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
import { Colors } from '../../constants/Colors';
import { appStyles } from '../../constants/AppTheme';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import apiService, { MealPlan, CatalogRecipe } from '../../services/api';
import { startOfWeekMondayKey } from '../../services/weeklyPlanning';
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
          apiService.getMealPlan(userId, startOfWeekMondayKey()),
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

  const meals = useMemo(() => (plan?.meals || [])
    .filter(meal => !!meal.mealType && recipe?.replacementMealTypes?.includes(meal.mealType))
    .sort((a, b) => ((a.dayIndex || 0) - (b.dayIndex || 0)) || a.position - b.position), [plan?.meals, recipe]);
  const day = (dayIndex = 0) => {
    if (!plan) return '';
    const date = new Date(`${plan.weekStart}T12:00:00`);
    date.setDate(date.getDate() + dayIndex);
    const label = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'long' }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const replace = async (slotId: string) => {
    if (!plan || !recipeId || replacing || !meals.some(meal => meal.slotId === slotId)) return;
    setReplacing(slotId);
    setError(null);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error(t('planning.errors.user'));
      const response = await apiService.setPlannedMealRecipe(plan._id, slotId, userId, recipeId);
      if (!response.data?.plan) throw new Error(response.error || t('planning.errors.replace'));
      invalidatePlanning();
      void feedback.success().catch(() => {});
      router.dismissTo(replacedMealPlanningRoute(response.data.plan, slotId));
    } catch (replaceError) {
      feedback.error();
      setError(replaceError instanceof Error ? replaceError.message : t('planning.errors.replace'));
    } finally {
      setReplacing(null);
    }
  };

  return (
    <LinearGradient colors={['#FDF9E2', '#FFFFFF']} locations={[0, 0.72]} style={styles.fill}>
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
        {!meals.length && <Text style={styles.empty}>{t('addRecipe.noCompatibleMeals')}</Text>}
        <View style={styles.list}>{meals.map((meal, index) => <EntranceView key={meal.slotId} entranceIndex={index}><PlanMealCard meal={meal} day={day(meal.dayIndex)} loading={replacing === meal.slotId} disabled={!!replacing} onPress={() => void replace(meal.slotId)} /></EntranceView>)}</View>
      </ScrollView> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { paddingBottom: 14 },
  iconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: 44, height: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 26 },
  empty: { fontFamily: 'Degular', fontSize: 23, color: Colors.light.text, textAlign: 'center' },
  button: { minHeight: 54, alignSelf: 'stretch', borderRadius: 22, backgroundColor: Colors.light.button, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'Degular', fontSize: 20, color: 'white' },
  error: { fontFamily: 'CronosPro', color: '#82342D', marginBottom: 10 },
  list: { gap: 12 },
});
