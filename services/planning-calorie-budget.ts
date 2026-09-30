import { MealType, mealNutritionAllocation } from './meal-nutrition-allocation';

export const MAX_PLANNING_CALORIE_DEVIATION = 0.05;
export type BudgetMeal = { dayIndex: number; mealType: MealType; calories: number; portionScale?: number; calorieFit?: 'standard' | 'closest_available' };

export function dailyPlannedCalorieTarget(dayIndex: number, meals: Pick<BudgetMeal, 'dayIndex' | 'mealType'>[], dailyCalories: number, preferences: Record<string, unknown>): number {
  const dayMeals = meals.filter(meal => meal.dayIndex === dayIndex);
  // A complete day must cover the daily reference even if legacy preferences
  // still request a snack that is no longer present in the generated plan.
  if (['breakfast', 'lunch', 'dinner'].every(type => dayMeals.some(meal => meal.mealType === type))) return dailyCalories;
  const saved = (preferences.mealsByDay as Record<string, unknown> | undefined)?.[String(dayIndex)];
  const snack = Array.isArray(saved) && saved.length ? saved.includes('snack')
    : preferences.includeSnack === true || dayMeals.some(meal => meal.mealType === 'snack');
  const allocation = mealNutritionAllocation(snack);
  return dailyCalories * dayMeals.reduce((sum, meal) => sum + allocation[meal.mealType], 0);
}

export function withinCalorieBudget(actual: number, target: number): boolean {
  return Number.isFinite(actual) && Number.isFinite(target) && target > 0
    && Math.abs(actual - target) <= target * MAX_PLANNING_CALORIE_DEVIATION + 1e-8;
}

export function isPlanWithinCalorieBudget(meals: BudgetMeal[], dailyCalories: number, preferences: Record<string, unknown>): boolean {
  return meals.length > 0 && [...new Set(meals.map(meal => meal.dayIndex))].every(day =>
    withinCalorieBudget(meals.filter(meal => meal.dayIndex === day).reduce((sum, meal) => sum + meal.calories, 0),
      dailyPlannedCalorieTarget(day, meals, dailyCalories, preferences)));
}

/** Explicit server fallback is usable, while an unmarked legacy shortfall is not. */
export function isAcceptedPlanCalorieBudget(meals: BudgetMeal[], dailyCalories: number, preferences: Record<string, unknown>): boolean {
  return meals.length > 0 && [...new Set(meals.map(meal => meal.dayIndex))].every(day => {
    const selected = meals.filter(meal => meal.dayIndex === day);
    const target = dailyPlannedCalorieTarget(day, meals, dailyCalories, preferences);
    if (!Number.isFinite(target) || target <= 0 || selected.some(meal => !Number.isFinite(meal.calories) || meal.calories <= 0)) return false;
    return withinCalorieBudget(selected.reduce((sum, meal) => sum + meal.calories, 0), target)
      || selected.some(meal => meal.calorieFit === 'closest_available' && Number(meal.portionScale) >= 0.5 && Number(meal.portionScale) <= 2);
  });
}
