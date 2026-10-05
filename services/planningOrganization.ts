import type { MealPlanMeal } from './api';
import { isPastPlanDay } from './planningDisplay';

export const ORGANIZE_MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealLocation = { dayIndex: number; mealType: NonNullable<MealPlanMeal['mealType']> };
export const locationKey = (location: MealLocation) => `${location.dayIndex}:${location.mealType}`;
export const compatiblePlanningTypes = (source: MealPlanMeal['mealType'], target: MealPlanMeal['mealType']) =>
  (['breakfast', 'snack'].includes(source || '')) === (['breakfast', 'snack'].includes(target || ''));

/** Recipes keep their identity, portions and ingredients; only their schedule moves. */
export function movePlanningMeal(meals: MealPlanMeal[], slotId: string, target: MealLocation, weekStart: string): MealPlanMeal[] {
  const source = meals.find(meal => meal.slotId === slotId);
  if (!source || source.status === 'generating' || source.dayIndex === undefined || !source.mealType
    || !Number.isInteger(target.dayIndex) || target.dayIndex < 0 || target.dayIndex > 6
    || !ORGANIZE_MEAL_TYPES.includes(target.mealType)) return meals;
  if (source.dayIndex === target.dayIndex && source.mealType === target.mealType) return meals;
  if (isPastPlanDay(weekStart, source.dayIndex) || isPastPlanDay(weekStart, target.dayIndex)) return meals;
  if (!compatiblePlanningTypes(source.mealType, target.mealType)) return meals;
  const occupant = meals.find(meal => meal.dayIndex === target.dayIndex && meal.mealType === target.mealType);
  if (occupant?.status === 'generating') return meals;
  const original: MealLocation = { dayIndex: source.dayIndex, mealType: source.mealType };
  return meals.map(meal => {
    const location = meal.slotId === source.slotId ? target : meal.slotId === occupant?.slotId ? original : null;
    if (!location) return meal;
    const date = new Date(`${weekStart}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + location.dayIndex);
    return { ...meal, ...location, scheduledDate: date.toISOString().slice(0, 10) };
  }).sort((a, b) => (a.dayIndex! - b.dayIndex!) || ORGANIZE_MEAL_TYPES.indexOf(a.mealType!) - ORGANIZE_MEAL_TYPES.indexOf(b.mealType!))
    .map((meal, position) => ({ ...meal, position }));
}

export function planningPlacements(meals: MealPlanMeal[]) {
  return meals.map(meal => ({ slotId: meal.slotId, dayIndex: meal.dayIndex!, mealType: meal.mealType! }));
}
