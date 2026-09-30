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
  const dayIndexes = new Set(selected.length ? selected : plan.meals.map(meal => meal.dayIndex ?? 0));
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
