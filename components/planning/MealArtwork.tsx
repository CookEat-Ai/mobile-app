import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { MealPlanMeal } from '../../services/api';
import { getIngredientIcon } from '../../constants/IngredientIcons';

const TYPE_EMOJI: Record<string, string> = {
  breakfast: '🥣',
  lunch: '🥗',
  snack: '🍎',
  dinner: '🍲',
};

const TYPE_COLOR: Record<string, string> = {
  breakfast: '#FFF2C9',
  lunch: '#E9F4DF',
  snack: '#FCE6DD',
  dinner: '#E8E6F6',
};

/** Illustration utile lorsque la recherche photo n'a pas encore abouti. */
export function MealArtwork({ meal, style }: { meal: Pick<MealPlanMeal, 'ingredients' | 'mealType'>; style?: StyleProp<ViewStyle> }) {
  const ingredientIcons = (meal.ingredients || [])
    .map((ingredient) => getIngredientIcon(ingredient.name, ingredient.icon))
    .filter((icon): icon is string => Boolean(icon))
    .slice(0, 3);
  const icons = ingredientIcons.length > 0 ? ingredientIcons : [TYPE_EMOJI[meal.mealType || 'lunch']];

  return (
    <View style={[styles.root, { backgroundColor: TYPE_COLOR[meal.mealType || 'lunch'] }, style]}>
      <View style={styles.glow} />
      <Text style={styles.emoji} numberOfLines={1}>{icons.join(' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.44)' },
  emoji: { fontSize: 23, letterSpacing: -2 },
});

export default MealArtwork;
