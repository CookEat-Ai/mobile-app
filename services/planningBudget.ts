export type PlanningBudgetOptions = { country: string; currency: string; minimum: number; maximum: number; step: number; defaultAmount: number; horizonDays: number };
/** Older APIs return a seven-day budget; keep shorter selections correct during rollout. */
export function budgetOptionsForDays(options: PlanningBudgetOptions, selectedDays: number): PlanningBudgetOptions {
  const days = Math.max(1, Math.min(7, Math.trunc(selectedDays) || 1));
  const horizon = Math.max(1, options.horizonDays || 7);
  if (horizon === days) return options;
  const minimum = Math.ceil(options.minimum * days / horizon / options.step) * options.step;
  return { ...options, minimum, maximum: minimum * 5, defaultAmount: minimum, horizonDays: days };
}
