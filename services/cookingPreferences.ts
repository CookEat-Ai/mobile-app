export const COOKING_LEVELS = ['beginner', 'medium', 'advanced'] as const;
export type CookingLevel = typeof COOKING_LEVELS[number];
export const MEAL_BUDGETS = ['budget_small', 'budget_medium', 'budget_large'] as const;
export type MealBudget = typeof MEAL_BUDGETS[number];
export function normalizeCookingLevel(value: unknown): CookingLevel {
  return COOKING_LEVELS.includes(value as CookingLevel) ? value as CookingLevel : 'beginner';
}
export function normalizeMealBudget(value: unknown): MealBudget {
  return MEAL_BUDGETS.includes(value as MealBudget) ? value as MealBudget : 'budget_medium';
}
export const KITCHEN_EQUIPMENT = ['oven', 'airfryer', 'microwave', 'blender', 'robot'] as const;
/** An explicit basic kitchen has a stove, pan and pot, without extra appliances. */
export function normalizeEquipments(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return ['standard-kitchen', ...new Set(value.map(String).map(item => item.replace(/^equipment_/, ''))
    .filter(item => KITCHEN_EQUIPMENT.includes(item as typeof KITCHEN_EQUIPMENT[number])))];
}
