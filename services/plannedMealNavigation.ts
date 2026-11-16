import { recipeForServings } from './recipeServings';
import type { MealPlan } from './api';

type PlanSource = 'meal_plan' | 'onboarding_week_preview';

export function plannedMealChoicePreviewRoute(recipeId: string, context: {
  planId: string; slotId?: string; dayIndex?: string; mealType?: string; returnTo?: string; source?: string;
}) {
  return {
    pathname: '/planning/recipe-preview' as const,
    params: {
      recipeId, isHistory: 'true', source: 'meal_library', selectForPlan: 'true', selectionPlanId: context.planId,
      ...(context.slotId ? { selectionSlotId: context.slotId } : {}),
      ...(context.dayIndex !== undefined ? { selectionDayIndex: context.dayIndex } : {}),
      ...(context.mealType ? { selectionMealType: context.mealType } : {}),
      ...(context.returnTo ? { selectionReturnTo: context.returnTo } : {}),
      selectionSource: context.source || 'meal_plan',
    },
  };
}

export function replacedMealPlanningRoute(plan: MealPlan, slotId: string) {
  const meal = plan.meals.find(item => item.slotId === slotId);
  if (!meal) throw new Error('planned_meal_missing');
  return {
    pathname: '/(tabs)' as const,
    params: { selectedPlanId: plan._id, selectedDay: String(meal.dayIndex ?? 0), selectionKey: String(Date.now()) },
  };
}

export function plannedMealRecipeParams(planId: string, slotId: string, recipeId: string, source: PlanSource) {
  return { recipeId, isHistory: 'true', source, mealPlanId: planId, mealSlotId: slotId };
}

/** Return to the screen that opened the manual meal chooser. */
export function replacedMealReturnRoute(plan: MealPlan, slotId: string, returnTo?: unknown, source?: unknown) {
  if (returnTo !== 'recipe-detail') return replacedMealPlanningRoute(plan, slotId);
  const recipeId = readyPlannedRecipeId(plan, slotId);
  if (!recipeId) throw new Error('planned_meal_missing');
  return {
    pathname: '/recipe-detail' as const,
    params: plannedMealRecipeParams(plan._id, slotId, recipeId,
      source === 'onboarding_week_preview' ? 'onboarding_week_preview' : 'meal_plan'),
  };
}

export function isPlannedMealContext(params: { source?: unknown; mealPlanId?: unknown; mealSlotId?: unknown }) {
  return (params.source === 'meal_plan' || params.source === 'onboarding_week_preview')
    && typeof params.mealPlanId === 'string' && params.mealPlanId.length > 0
    && typeof params.mealSlotId === 'string' && params.mealSlotId.length > 0;
}

export function readyPlannedRecipeId(plan: MealPlan, slotId: string): string | null {
  const meal = plan.meals.find(item => item.slotId === slotId);
  return meal?.status === 'ready' ? meal.recipeId || meal.catalogRecipeId || null : null;
}

/** Plan ingredients are adjusted per person; household servings only multiply food quantities. */
export function applyPlannedMealPortion<T extends { id: string }>(recipe: T, plan: MealPlan, slotId: string): T {
  const meal = plan.meals.find(item => item.slotId === slotId);
  if (!meal || meal.status !== 'ready' || (meal.recipeId || meal.catalogRecipeId) !== recipe.id) throw new Error('planned_meal_changed');
  if (meal.source !== 'catalog') return { ...recipeForServings(recipe as T & { servings?: number }, meal.servings || 1), estimatedCost: meal.estimatedCost };
  return { ...recipeForServings({ ...recipe, title: meal.title, chef_tip: meal.chefTip || (recipe as any).chef_tip, ingredients: meal.ingredients, steps: meal.steps,
    calories: `${meal.calories} kcal`, proteins: `${meal.proteins} g`, carbs: `${meal.carbs} g`,
    lipids: `${meal.fats} g`, servings: 1, portionScale: meal.portionScale || 1 }, meal.servings || 1), estimatedCost: meal.estimatedCost };
}
