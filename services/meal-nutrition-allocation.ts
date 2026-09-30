export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

// Shares of a whole day, including when only some meals are planned.
// A snack replaces part of lunch/dinner; it is not extra daily energy.
export function mealNutritionAllocation(includeSnack: boolean): Record<MealType, number> {
  return includeSnack
    ? { breakfast: 0.25, lunch: 0.30, snack: 0.15, dinner: 0.30 }
    : { breakfast: 0.25, lunch: 0.35, snack: 0, dinner: 0.40 };
}
