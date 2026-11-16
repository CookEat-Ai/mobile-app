export type PlanningTimeMealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export const PLANNING_MEAL_CUTOFFS = { breakfast: 10, lunch: 14, snack: 17, dinner: 22 } as const;
const types = Object.keys(PLANNING_MEAL_CUTOFFS) as PlanningTimeMealType[];

export function planningCalendarDay(start: string, offset: number): string {
  const date = new Date(`${start}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** Use the person's calendar and clock, never the server's timezone. */
export function planningGenerationWindow(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  const today = `${value('year')}-${value('month')}-${value('day')}`;
  const hour = Number(value('hour'));
  const remainingMealTypes = types.filter(type => hour < PLANNING_MEAL_CUTOFFS[type]);
  return { today, weekStart: remainingMealTypes.length ? today : planningCalendarDay(today, 1), remainingMealTypes };
}

export function planningMealsByDay(weekStart: string, cookingDays: number[], timeZone?: string, now = new Date()) {
  const window = planningGenerationWindow(timeZone, now);
  return Object.fromEntries(cookingDays.map(day => [String(day), planningCalendarDay(weekStart, day) === window.today ? window.remainingMealTypes : [...types]]));
}

export function isElapsedPlanningMeal(weekStart: string, day: number, type: PlanningTimeMealType, timeZone?: string, now = new Date()): boolean {
  const window = planningGenerationWindow(timeZone, now);
  const date = planningCalendarDay(weekStart, day);
  return date < window.today || (date === window.today && !window.remainingMealTypes.includes(type));
}

/** The last configured or occupied calendar day, rather than an unused seven-day horizon. */
export function planningLastDay(plan: {weekStart: string; weekEnd?: string; preferences?: {cookingDays?: unknown}; meals?: {dayIndex?: number}[]}): string {
  const configured = Array.isArray(plan.preferences?.cookingDays) ? plan.preferences.cookingDays : [];
  const days = [...configured, ...(plan.meals || []).map(meal => meal.dayIndex ?? 0)]
    .filter((day): day is number => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6);
  return days.length ? planningCalendarDay(plan.weekStart, Math.max(...days)) : plan.weekEnd || planningCalendarDay(plan.weekStart, 6);
}
