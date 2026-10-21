import type { MealPlan } from './api';
import { normalizeCookingLevel, normalizeEquipments, normalizeMealBudget } from './cookingPreferences';
import { FITNESS_GOALS, type FitnessGoal } from './nutritionModel';
import { normalizePantryIngredients } from './planningPantry';
import { dailyMealsForDays, normalizeCookingDays, normalizePlanningDiet, type PlanningGenerationSettings } from './weeklyPlanning';

const names = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))] : [];

/** The selected plan is authoritative, even if another plan was configured since. */
export function planningSettingsFromPlan(plan: MealPlan): PlanningGenerationSettings {
  const preferences = plan.preferences || {};
  const cookingDays = normalizeCookingDays(preferences.cookingDays);
  return {
    servings: Math.min(20, Math.max(1, Math.trunc(Number(plan.servings || preferences.servings) || 1))),
    weeklyBudget: Number(preferences.weeklyBudget) > 0 ? Number(preferences.weeklyBudget) : undefined,
    country: typeof preferences.country === 'string' ? preferences.country : undefined,
    currency: typeof preferences.currency === 'string' ? preferences.currency : undefined,
    cookingLevel: normalizeCookingLevel(preferences.cookingLevel),
    mealBudget: normalizeMealBudget(preferences.mealBudget),
    equipments: Array.isArray(preferences.equipments) ? normalizeEquipments(preferences.equipments) : ['standard-kitchen'],
    cookingDays,
    // New generations use the current clock to compute the remaining first-day meals.
    mealsByDay: dailyMealsForDays(cookingDays),
    includeSnack: true,
    duration: preferences.duration === 'fast' || preferences.duration === 'medium' ? preferences.duration : 'all',
    cuisineIds: names(preferences.cuisineStyle ?? preferences.cuisineIds),
    diet: normalizePlanningDiet(preferences.diet),
    excludedIngredients: names(preferences.excludedIngredients),
    pantryIngredients: normalizePantryIngredients(names(preferences.pantryIngredients)),
    pantryMode: preferences.pantryMode === 'strict' ? 'strict' : 'priority',
  };
}

export function planningGoalFromPlan(plan: MealPlan, fallback: FitnessGoal): FitnessGoal {
  const nutritionProfile = plan.preferences?.nutritionProfile as { goal?: unknown } | undefined;
  const candidates = [plan.preferences?.goal, nutritionProfile?.goal, plan.profileSnapshot?.goal];
  return candidates.find((value): value is FitnessGoal => FITNESS_GOALS.includes(value as FitnessGoal)) ?? fallback;
}
