import { normalizePantryIngredients } from './planningPantry';
export const PANTRY_SCAN_HANDOFF_KEY = 'cookeat_planning_pantry_scan';
export type PantryMode = 'priority' | 'strict';
export function createPantryScanHandoff(names: string[], pantryMode?: PantryMode, _presentation = false) {
  return JSON.stringify({ ingredients: normalizePantryIngredients(names), pantryMode, generate: false, replace: true });
}
export function readPantryScanHandoff(raw: string) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return { ingredients: normalizePantryIngredients(parsed.filter(item => typeof item?.name === 'string').map(item => item.name)), pantryMode: undefined, generate: false, replace: false };
  return { ingredients: normalizePantryIngredients(Array.isArray(parsed?.ingredients) ? parsed.ingredients.filter((name: unknown) => typeof name === 'string') : []), pantryMode: parsed?.pantryMode === 'strict' ? 'strict' as const : parsed?.pantryMode === 'priority' ? 'priority' as const : undefined, generate: false, replace: parsed?.replace === true };
}
