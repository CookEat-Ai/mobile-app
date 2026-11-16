import { normalizePantryIngredients } from './planningPantry';

// The catalogue search accepts up to 30 names.
export function mergePantryRecipeIngredients(previous: string[], detected: string[]): string[] {
  return normalizePantryIngredients([...previous, ...detected].filter((name) => name.trim().length <= 100)).slice(0, 30);
}

export function readPantryRecipeIngredients(value?: string | string[]): string[] {
  if (typeof value !== 'string') return [];
  try {
    const decoded: unknown = JSON.parse(value);
    return Array.isArray(decoded) ? mergePantryRecipeIngredients([], decoded.filter((name): name is string => typeof name === 'string')) : [];
  } catch {
    return [];
  }
}
