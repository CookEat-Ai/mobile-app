import { fitnessProfileToPlanningPreferences, loadFitnessProfile } from './fitnessProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealPlan } from './api';
import { isAcceptedPlanCalorieBudget } from './planning-calorie-budget';
import type { BudgetMeal } from './planning-calorie-budget';

export const WEEKLY_ACTIVATION_PENDING_KEY = '@cookeat_weekly_activation_pending';
export const ONBOARDING_WEEKLY_PLAN_ID_KEY = '@cookeat_onboarding_weekly_plan_id';
export const ONBOARDING_WEEKLY_IMPORTED_RECIPE_KEY = '@cookeat_onboarding_weekly_imported_recipe';
export const ONBOARDING_WEEKLY_FREE_SWAP_PLAN_KEY = '@cookeat_onboarding_weekly_free_swap_plan';
export const WEEKLY_MEAL_COUNT_KEY = 'weeklyMealCount';
export const PLANNING_GENERATION_SETTINGS_KEY = '@cookeat_planning_generation_settings_v1';
export const DEFAULT_WEEKLY_MEAL_COUNT = 21;
export const WEEKLY_PLANNING_HORIZON_DAYS = 7;
export const DEFAULT_COOKING_DAYS = [0, 1, 2, 3, 4] as const;
export const PLANNING_MINIMUM_LOADING_MS = 5000;

/** Complète uniquement le temps restant avant de révéler un planning créé. */
export async function waitForPlanningMinimumDuration(startedAt: number): Promise<void> {
  const remainingMs = PLANNING_MINIMUM_LOADING_MS - (performance.now() - startedAt);
  if (remainingMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, remainingMs));
  }
}

export type PlanningMealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export function roundNutritionValue(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : 0;
}

export type PlanningGenerationSettings = {
  cookingDays: number[];
  includeSnack: boolean;
  duration: 'all' | 'fast' | 'medium';
  mealsByDay: Record<string, PlanningMealType[]>;
  cuisineIds: string[];
  diet: 'none' | 'vegetarian' | 'vegan';
  excludedIngredients: string[];
};

export const DEFAULT_PLANNING_GENERATION_SETTINGS: PlanningGenerationSettings = {
  cookingDays: [...DEFAULT_COOKING_DAYS],
  includeSnack: false,
  duration: 'all',
  mealsByDay: dailyMealsForDays([...DEFAULT_COOKING_DAYS]),
  cuisineIds: [],
  diet: 'none',
  excludedIngredients: [],
};

const REQUIRED_MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

export function dailyMealsForDays(cookingDays: number[]): Record<string, PlanningMealType[]> {
  return Object.fromEntries(normalizeCookingDays(cookingDays).map(day => [String(day), ['breakfast', 'lunch', 'dinner']]));
}

/**
 * Refuse les anciens brouillons partiels (notamment les plans à un seul repas)
 * afin qu'ils ne puissent plus être présentés comme une semaine générée.
 */
export function isCompleteWeeklyPlan(plan: MealPlan | null | undefined): plan is MealPlan {
  if (!plan || !Array.isArray(plan.meals)) return false;
  const includeSnack = plan.preferences?.includeSnack === true;
  const cookingDays = normalizeCookingDays(plan.preferences?.cookingDays);
  const configured = normalizeMealsByDay(plan.preferences?.mealsByDay, cookingDays,
    includeSnack ? [...REQUIRED_MEAL_TYPES, 'snack'] : [...REQUIRED_MEAL_TYPES]);
  const expectedCount = Object.values(configured).reduce((total, types) => total + types.length, 0);
  if (plan.meals.length !== expectedCount) return false;
  const budgetMeals = plan.meals.filter((meal): meal is typeof meal & BudgetMeal => Number.isInteger(meal.dayIndex) && Boolean(meal.mealType));
  if (budgetMeals.length !== plan.meals.length || !isAcceptedPlanCalorieBudget(budgetMeals, Number(plan.nutritionTargets?.dailyCalories), plan.preferences || {})) return false;

  return cookingDays.every((dayIndex) => {
    const expectedTypes = configured[String(dayIndex)];
    const dayMeals = plan.meals.filter((meal) => meal.dayIndex === dayIndex);
    return dayMeals.length === expectedTypes.length
      && expectedTypes.every((mealType) => dayMeals.some((meal) =>
        meal.mealType === mealType
        && meal.source === 'catalog'
        && meal.status === 'ready'
        && Boolean(meal.catalogRecipeId)
        && meal.title.trim().length > 0
        && Boolean(meal.image)
        && Number(meal.calories) > 0
        && Number(meal.proteins) > 0));
  });
}

/** Accepte ensuite les modifications volontaires de l'utilisateur (ex. retrait d'un repas). */
export function isUsableWeeklyPlan(plan: MealPlan | null | undefined): plan is MealPlan {
  if (!plan || !Array.isArray(plan.meals) || plan.meals.length === 0) return false;
  if (Number(plan.nutritionTargets?.dailyCalories) <= 0) return false;
  return plan.meals.every((meal) =>
    Number.isInteger(meal.dayIndex)
    && (meal.source === 'catalog' ? Boolean(meal.catalogRecipeId) : ['library', 'generated'].includes(meal.source) && Boolean(meal.recipeId))
    && meal.status === 'ready'
    && Boolean(meal.mealType)
    && meal.title.trim().length > 0
    && Boolean(meal.image)
    && Number(meal.calories) > 0);
}

export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function startOfWeekMondayKey(date: Date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  return localDateKey(monday);
}

export function normalizeCookingDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_COOKING_DAYS];
  const days = [...new Set(value
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day < WEEKLY_PLANNING_HORIZON_DAYS))]
    .sort((a, b) => a - b);
  return days.length ? days : [...DEFAULT_COOKING_DAYS];
}

export function normalizeMealsByDay(
  value: unknown,
  cookingDays: number[],
  fallback: PlanningMealType[] = ['dinner'],
): Record<string, PlanningMealType[]> {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const order: PlanningMealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
  return Object.fromEntries(normalizeCookingDays(cookingDays).map((day) => {
    const raw = Array.isArray(input[String(day)]) ? input[String(day)] as unknown[] : fallback;
    const selected = order.filter((type) => raw.includes(type));
    return [String(day), selected.length ? selected : ['dinner']];
  }));
}

export async function loadPlanningGenerationSettings(): Promise<PlanningGenerationSettings> {
  try {
    const raw = await AsyncStorage.getItem(PLANNING_GENERATION_SETTINGS_KEY);
    if (!raw) {
      const preferences = fitnessProfileToPlanningPreferences(await loadFitnessProfile());
      return {
      ...DEFAULT_PLANNING_GENERATION_SETTINGS,
      cookingDays: [...DEFAULT_COOKING_DAYS],
      mealsByDay: { ...DEFAULT_PLANNING_GENERATION_SETTINGS.mealsByDay },
      cuisineIds: preferences.cuisineStyle,
      diet: preferences.diet === 'vegan' || preferences.diet === 'vegetarian' ? preferences.diet : 'none',
      excludedIngredients: [],
    };
    }
    const parsed = JSON.parse(raw) as Partial<PlanningGenerationSettings>;
    const cookingDays = normalizeCookingDays(parsed.cookingDays);
    return {
      cookingDays,
      includeSnack: false,
      duration: parsed.duration === 'fast' || parsed.duration === 'medium' ? parsed.duration : 'all',
      mealsByDay: dailyMealsForDays(cookingDays),
      cuisineIds: Array.isArray(parsed.cuisineIds) ? [...new Set(parsed.cuisineIds.map(String).filter(Boolean))] : [],
      diet: parsed.diet === 'vegetarian' || parsed.diet === 'vegan' ? parsed.diet : 'none',
      excludedIngredients: Array.isArray(parsed.excludedIngredients)
        ? [...new Set(parsed.excludedIngredients.map(String).map((item) => item.trim()).filter(Boolean))]
        : [],
    };
  } catch {
    return {
      ...DEFAULT_PLANNING_GENERATION_SETTINGS,
      cookingDays: [...DEFAULT_COOKING_DAYS],
      mealsByDay: { ...DEFAULT_PLANNING_GENERATION_SETTINGS.mealsByDay },
      cuisineIds: [],
      excludedIngredients: [],
    };
  }
}

export async function savePlanningGenerationSettings(settings: PlanningGenerationSettings): Promise<void> {
  await AsyncStorage.setItem(PLANNING_GENERATION_SETTINGS_KEY, JSON.stringify({
    cookingDays: normalizeCookingDays(settings.cookingDays),
    includeSnack: false,
    duration: settings.duration,
    mealsByDay: dailyMealsForDays(settings.cookingDays),
    cuisineIds: [...new Set(settings.cuisineIds.map(String).filter(Boolean))],
    diet: settings.diet,
    excludedIngredients: [...new Set(settings.excludedIngredients.map(String).map((item) => item.trim()).filter(Boolean))],
  }));
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function isDateInsideRollingWeek(
  planStart: string | null | undefined,
  planEnd: string | null | undefined,
  today = localDateKey(),
): boolean {
  if (!planStart) return false;
  const end = planEnd || addDays(planStart, WEEKLY_PLANNING_HORIZON_DAYS - 1);
  return planStart <= today && today <= end;
}

export async function getWeeklyMealCount(): Promise<number> {
  const stored = Number(await AsyncStorage.getItem(WEEKLY_MEAL_COUNT_KEY));
  if (!Number.isFinite(stored)) return DEFAULT_WEEKLY_MEAL_COUNT;
  return Math.min(28, Math.max(21, Math.round(stored)));
}

export async function saveOnboardingWeeklyPlanId(planId: string): Promise<void> {
  if (planId) await AsyncStorage.setItem(ONBOARDING_WEEKLY_PLAN_ID_KEY, planId);
}

export async function loadOnboardingWeeklyPlanId(): Promise<string | null> {
  return AsyncStorage.getItem(ONBOARDING_WEEKLY_PLAN_ID_KEY);
}

export async function savePendingOnboardingPlanImport(recipeId: string): Promise<void> {
  if (recipeId) await AsyncStorage.setItem(ONBOARDING_WEEKLY_IMPORTED_RECIPE_KEY, recipeId);
}

export async function loadPendingOnboardingPlanImport(): Promise<string | null> {
  return AsyncStorage.getItem(ONBOARDING_WEEKLY_IMPORTED_RECIPE_KEY);
}

export async function clearPendingOnboardingPlanImport(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_WEEKLY_IMPORTED_RECIPE_KEY);
}

export async function saveOnboardingFreeSwapUsed(planId: string): Promise<void> {
  if (planId) await AsyncStorage.setItem(ONBOARDING_WEEKLY_FREE_SWAP_PLAN_KEY, planId);
}

export async function wasOnboardingFreeSwapUsed(planId: string): Promise<boolean> {
  return Boolean(planId) && (await AsyncStorage.getItem(ONBOARDING_WEEKLY_FREE_SWAP_PLAN_KEY)) === planId;
}

export async function setWeeklyActivationPending(pending: boolean): Promise<void> {
  await AsyncStorage.setItem(WEEKLY_ACTIVATION_PENDING_KEY, pending ? 'true' : 'false');
}

export async function hasWeeklyActivationPending(): Promise<boolean> {
  return (await AsyncStorage.getItem(WEEKLY_ACTIVATION_PENDING_KEY)) === 'true';
}
