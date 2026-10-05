// A generation grants one reveal. Opening an existing plan never grants another.
const pending = new Set<string>();
export function markPlanningReveal(planId: string) {
  if (planId) pending.add(planId);
}
export function consumePlanningReveal(planId: string): boolean {
  return pending.delete(planId);
}
