import { apiService } from './api';
import i18n from '../i18n';
import { recipeStorageService } from './recipeStorage';
import type { MealCardRecipe } from './catalogDisplay';

const PAGE_SIZE = 50;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Only server-owned imported history enters this list; local data enriches matching IDs. */
export async function loadImportedMeals(userId: string, { page = 1, preservePages = 0, query = '', forceRefresh = false, isCurrent = (): boolean => true } = {}) {
  const pages = query ? [1] : preservePages > 0 ? Array.from({ length: preservePages }, (_, i) => i + 1) : [page];
  const fetchPage = async (number: number) => {
    if (!isCurrent()) throw new Error('cancelled');
    const response = await apiService.getRecipeHistory(userId, number, PAGE_SIZE, { isImported: true, forceRefresh });
    if (!isCurrent()) throw new Error('cancelled');
    if (!response.data?.history) throw new Error(response.error || i18n.t('common.requestError'));
    return response.data;
  };
  const responses = await Promise.all(pages.map(fetchPage));
  let lastPage = pages[pages.length - 1];
  const hasMore = () => responses[responses.length - 1].pagination?.hasMore
    ?? responses[responses.length - 1].history.length >= PAGE_SIZE;
  // History has no server-side search. Search every page, rather than silently
  // excluding older imports that have not yet been scrolled into view.
  if (query) while (hasMore()) responses.push(await fetchPage(++lastPage));
  const [stored, images] = await Promise.all([
    recipeStorageService.getStoredRecipes().catch(() => []),
    recipeStorageService.getCachedImages().catch(() => ({} as Record<string, string>)),
  ]);
  const local = new Map(stored.map(entry => [entry.id, entry.recipe]));
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const recipes = new Map<string, MealCardRecipe>();
  for (const row of responses.flatMap(response => response.history)) {
    if (!row.isImported && !row.videoUrl) continue;
    const id = row.id || row.recipeId;
    if (!id) continue;
    const saved = local.get(id);
    const ingredients = saved?.ingredients || (row.usedIngredients || row.mainIngredients || []).map((name: string) => ({ name, quantity: '' }));
    const recipe: MealCardRecipe = {
      id, title: row.title || saved?.title || '', image: images[id] || row.image || saved?.image || '',
      cooking_time: row.cooking_time || saved?.cooking_time || '', ingredients,
      calories: String(row.calories ?? saved?.calories ?? ''), proteins: String(row.proteins ?? saved?.proteins ?? ''),
      mealTypes: row.mealTypes || saved?.mealTypes,
    };
    const text = normalize([recipe.title, ...ingredients.map((ingredient: { name: string }) => ingredient.name), ...(row.usedIngredients || [])].join(' '));
    if (tokens.every(token => text.includes(token))) recipes.set(id, recipe);
  }
  return {
    recipes: [...recipes.values()], page: lastPage, hasMore: !query && hasMore(),
    total: query ? recipes.size : responses[0].pagination?.total ?? recipes.size,
  };
}
