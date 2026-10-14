import { pantryIngredientKey } from './planningPantry';

export type PantrySuggestion = { id: string; name: string; icon: string };
const quickSuggestions = ['poulet', 'oeufs', 'tomate', 'courgette', 'riz', 'feta', 'avocat', 'brocoli', 'pates', 'saumon'];

/** Search the localized names, including accents and ligatures, without an API request. */
export function ingredientSearchKey(name: string): string {
  return name.replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function pantrySearchSuggestions(items: PantrySuggestion[], query: string): PantrySuggestion[] {
  const unique = [...new Map(items.map(item => [pantryIngredientKey(item.name), item])).values()];
  const key = ingredientSearchKey(query);
  if (!key) return unique.sort((a, b) => {
    const rank = (item: PantrySuggestion) => {
      const index = quickSuggestions.indexOf(item.id);
      return index < 0 ? quickSuggestions.length : index;
    };
    return rank(a) - rank(b);
  });
  const words = key.split(' ');
  return unique.filter(item => words.every(word => ingredientSearchKey(item.name).includes(word)))
    .sort((a, b) => Number(ingredientSearchKey(b.name).startsWith(key)) - Number(ingredientSearchKey(a.name).startsWith(key)));
}

export function readPantryReviewIngredients(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === 'string') : [];
  } catch { return []; }
}
