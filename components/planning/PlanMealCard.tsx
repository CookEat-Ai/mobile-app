import { AppSpinner as ActivityIndicator } from '../ui/AppSpinner';
import { useResponsive } from '../../hooks/useResponsive';
import { feedback } from '../../services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { getRecipeImageSource } from '../../constants/RecipeImages';
import type { MealPlanMeal, CatalogMealCategory } from '../../services/api';
import { roundNutritionValue } from '../../services/weeklyPlanning';
import { MealArtwork } from './MealArtwork';
import { MealCostEstimate } from './MealCostEstimate';
import { planningStyles as styles } from './PlanningStyles';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' } as const;

/** The exact meal card shown in the onboarding preview, shared with every week. */
export function PlanMealCard({ meal, day, badgeLabel, loading, disabled, imageTransition = 180, tile = false, onPress, onLongPress }: {
  meal: Pick<MealPlanMeal, 'title' | 'image' | 'mealType' | 'calories' | 'proteins' | 'cookingTime' | 'ingredients' | 'pantryOwned' | 'pantryRequired' | 'estimatedCost'> & { catalogCategory?: CatalogMealCategory };
  tile?: boolean; day?: string; badgeLabel?: string; loading?: boolean; disabled?: boolean; imageTransition?: number; onPress: () => void; onLongPress?: () => void;
}) {
  const { t } = useTranslation();
  const { isTablet } = useResponsive();
  const largeRow = isTablet && !tile;
  return <View style={styles.mealCard}>
    <Pressable onLongPress={onLongPress ? () => { feedback.light(); onLongPress(); } : undefined} delayLongPress={450} onPress={() => { feedback.light(); onPress(); }} disabled={disabled || loading} style={[styles.mealMain, largeRow && tabletStyles.row, tile && tabletStyles.tile]} accessibilityRole="button" accessibilityState={{ busy: !!loading, disabled: !!(disabled || loading) }}
      accessibilityActions={onLongPress ? [{ name: 'activate', label: meal.title }, { name: 'longpress', label: t('planning.actions.manage') }] : undefined}
      onAccessibilityAction={onLongPress ? event => {
        if (disabled || loading) return;
        if (event.nativeEvent.actionName === 'longpress') { feedback.light(); onLongPress(); }
        else if (event.nativeEvent.actionName === 'activate') { feedback.light(); onPress(); }
      } : undefined}>
      <View style={[styles.imageWrap, largeRow && tabletStyles.rowImage, tile && tabletStyles.tileImage]}>
        {meal.image ? <Image source={getRecipeImageSource(meal.image)} contentFit="cover" cachePolicy="memory-disk" enforceEarlyResizing style={styles.mealImage} transition={imageTransition} /> : <MealArtwork meal={meal} style={styles.mealImage} />}
        <View style={styles.mealTypePill}><Text style={styles.mealType}>{badgeLabel || t(meal.catalogCategory ? `mealLibrary.types.${meal.catalogCategory}` : `search.categories.${MEAL_LABELS[meal.mealType || 'lunch']}`)}</Text></View>
      </View>
      <View style={[styles.mealBody, tile && tabletStyles.tileBody]}>
        {day ? <Text style={styles.mealDay}>{day}</Text> : null}
        <Text numberOfLines={2} style={[styles.mealTitle, isTablet && tabletStyles.title]}>{meal.title}</Text>
        {(meal.calories !== undefined || meal.proteins !== undefined) && <View style={styles.mealMetaRow}>
          {meal.calories !== undefined && <Text style={[styles.mealMeta, isTablet && tabletStyles.meta]}>{roundNutritionValue(meal.calories)} kcal</Text>}
          {meal.calories !== undefined && meal.proteins !== undefined && <View style={styles.metaDot} />}
          {meal.proteins !== undefined && <Text style={[styles.mealMetaStrong, isTablet && tabletStyles.meta]}>{roundNutritionValue(meal.proteins)}g {t('fitnessOnboarding.projection.protein')}</Text>}
        </View>}
        <MealCostEstimate cost={meal.estimatedCost} compact />
        {Number(meal.pantryRequired) > 0 && <Text style={styles.timeText}>{t('planningPantry.coverage', { owned: meal.pantryOwned || 0, required: meal.pantryRequired })}</Text>}
        {!!meal.cookingTime && <View style={styles.timeRow}><Ionicons name="time-outline" size={14} color={Colors.light.textSecondary} /><Text style={styles.timeText}>{meal.cookingTime}</Text></View>}
      </View>
      {loading ? <ActivityIndicator size="small" color={Colors.light.button} /> : !tile && <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />}
    </Pressable>
  </View>;
}

const tabletStyles = StyleSheet.create({
  row: { minHeight: 168, padding: 14, gap: 20 },
  rowImage: { width: 156, height: 140 },
  title: { fontSize: 23, lineHeight: 26 },
  meta: { fontSize: 15, lineHeight: 20 },
  tile: { flexDirection: 'column', alignItems: 'stretch', padding: 0, gap: 0 },
  tileImage: { width: '100%', height: 190, borderRadius: 0 },
  tileBody: { flex: 0, padding: 16, minHeight: 142 },
});
