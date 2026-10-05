import type { MealPlan } from './api';

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function planDays(weekStart: string) {
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(`${weekStart}T12:00:00`);
    date.setDate(date.getDate() + dayIndex);
    return { dayIndex, date, key: localDateKey(date) };
  });
}

export function isPastPlan(plan: Pick<MealPlan, 'weekStart' | 'weekEnd'>, today = localDateKey()): boolean {
  const lastDay = plan.weekEnd || planDays(plan.weekStart)[6].key;
  return lastDay < today;
}

export function selectedPlanDays(plan: MealPlan) {
  const configured = plan.preferences?.cookingDays;
  const selected = Array.isArray(configured)
    ? configured.filter((day): day is number => Number.isInteger(day) && day >= 0 && day < 7)
    : [];
  const dayIndexes = new Set([...selected, ...plan.meals.map(meal => meal.dayIndex ?? 0)]);
  return planDays(plan.weekStart).filter(day => dayIndexes.has(day.dayIndex));
}

export function initialPlanDay(plan: MealPlan, today = localDateKey(), requestedDay?: number): number {
  const days = selectedPlanDays(plan);
  if (days.some(day => day.dayIndex === requestedDay)) return requestedDay!;
  return days.find(day => day.key === today)?.dayIndex ?? days[0]?.dayIndex ?? 0;
}

export function mealsForDay(plan: MealPlan, dayIndex: number) {
  return plan.meals.filter(meal => (meal.dayIndex ?? 0) === dayIndex).sort((a, b) => a.position - b.position);
}

export function formatPlanRange(plan: Pick<MealPlan, 'weekStart' | 'weekEnd'>, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const lastDay = plan.weekEnd || planDays(plan.weekStart)[6].key;
  return `${formatter.format(new Date(`${plan.weekStart}T12:00:00`))} – ${formatter.format(new Date(`${lastDay}T12:00:00`))}`;
}

/** Home only displays the current calendar week; older plans stay in history. */
export function displayedPlan(plans: MealPlan[], weekStart: string): MealPlan | undefined {
  return plans.find(plan => plan.weekStart === weekStart);
}

export function isPastPlanDay(weekStart: string, dayIndex: number, today = localDateKey()): boolean {
  return !Number.isInteger(dayIndex) || !planDays(weekStart)[dayIndex] || planDays(weekStart)[dayIndex].key < today;
}

/** Occupied and empty slots share the same chronological order. */
export function planningDaySlots(plan: MealPlan, dayIndex: number) {
  const types = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
  return types.map(mealType => {
    const meal = plan.meals.find(item => (item.dayIndex ?? 0) === dayIndex && item.mealType === mealType);
    return { slotId: meal?.slotId ?? `empty:${dayIndex}:${mealType}`, mealType, meal };
  });
}

/** Catalogue additions may fill an empty slot or replace an occupied one. */
export function compatiblePlanningSlots(plan: MealPlan, mealTypes: string[], today = localDateKey()) {
  const configured = Array.isArray(plan.preferences?.cookingDays) ? plan.preferences.cookingDays as number[] : [];
  const days = new Set([...configured, ...plan.meals.map(meal => meal.dayIndex ?? 0)]);
  return planDays(plan.weekStart).filter(day => days.has(day.dayIndex) && !isPastPlanDay(plan.weekStart, day.dayIndex, today))
    .flatMap(day => planningDaySlots(plan, day.dayIndex).filter(slot => mealTypes.includes(slot.mealType)).map(slot => ({ ...slot, dayIndex: day.dayIndex })));
}
