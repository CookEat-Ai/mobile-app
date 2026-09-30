import { feedback } from '../../services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { getRecipeImageSource } from '../../constants/RecipeImages';
import type { MealPlanMeal, CatalogMealCategory } from '../../services/api';
import { roundNutritionValue } from '../../services/weeklyPlanning';
import { MealArtwork } from './MealArtwork';
import { planningStyles as styles } from './PlanningStyles';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' } as const;

/** The exact meal card shown in the onboarding preview, shared with every week. */
export function PlanMealCard({ meal, day, loading, disabled, onPress }: {
  meal: Pick<MealPlanMeal, 'title' | 'image' | 'mealType' | 'calories' | 'proteins' | 'cookingTime' | 'ingredients'> & { catalogCategory?: CatalogMealCategory };
  day?: string; loading?: boolean; disabled?: boolean; onPress: () => void;
}) {
  const { t } = useTranslation();
  return <View style={styles.mealCard}>
    <Pressable onPress={() => { feedback.light(); onPress(); }} disabled={disabled || loading} style={styles.mealMain} accessibilityRole="button" accessibilityState={{ busy: !!loading, disabled: !!(disabled || loading) }}>
      <View style={styles.imageWrap}>
        {meal.image ? <Image source={getRecipeImageSource(meal.image)} contentFit="cover" style={styles.mealImage} transition={180} /> : <MealArtwork meal={meal} style={styles.mealImage} />}
        <View style={styles.mealTypePill}><Text style={styles.mealType}>{t(meal.catalogCategory ? `mealLibrary.types.${meal.catalogCategory}` : `search.categories.${MEAL_LABELS[meal.mealType || 'lunch']}`)}</Text></View>
      </View>
      <View style={styles.mealBody}>
        {day ? <Text style={styles.mealDay}>{day}</Text> : null}
        <Text numberOfLines={2} style={styles.mealTitle}>{meal.title}</Text>
        <View style={styles.mealMetaRow}><Text style={styles.mealMeta}>{roundNutritionValue(meal.calories)} kcal</Text><View style={styles.metaDot} /><Text style={styles.mealMetaStrong}>{roundNutritionValue(meal.proteins)}g {t('fitnessOnboarding.projection.protein')}</Text></View>
        {!!meal.cookingTime && <View style={styles.timeRow}><Ionicons name="time-outline" size={14} color={Colors.light.textSecondary} /><Text style={styles.timeText}>{meal.cookingTime}</Text></View>}
      </View>
      {loading ? <ActivityIndicator size="small" color={Colors.light.button} /> : <Ionicons name="chevron-forward" size={20} color="#B7AE96" />}
    </Pressable>
  </View>;
}
