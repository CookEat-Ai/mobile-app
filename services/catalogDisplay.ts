import type { CatalogRecipe, CatalogMealCategory, MealPlanMeal } from './api';

export type MealCardRecipe = Pick<CatalogRecipe, 'id' | 'title' | 'image' | 'ingredients' | 'cooking_time' | 'calories' | 'proteins'> & Partial<Pick<CatalogRecipe, 'mealTypes'>>;

/** Catalogue quantities include units; planning cards receive numeric values. */
export function catalogMealCardData(recipe: MealCardRecipe, preferredType?: CatalogMealCategory | MealPlanMeal['mealType']) {
  const quantity = (value: string) => {
    const parsed = Number.parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const mealTypes = recipe.mealTypes || [];
  const slot = preferredType === 'main' ? 'lunch' : preferredType;
  const mealType = slot && (mealTypes.includes(slot) || ['lunch','dinner'].includes(slot) && mealTypes.some(t => ['lunch','dinner'].includes(t))) ? slot : mealTypes[0] || 'lunch';
  const catalogCategory: CatalogMealCategory = mealType === 'lunch' || mealType === 'dinner' ? 'main' : mealType;
  return {
    title: recipe.title, image: recipe.image, ingredients: recipe.ingredients,
    cookingTime: recipe.cooking_time,
    mealType, catalogCategory,
    calories: quantity(recipe.calories), proteins: quantity(recipe.proteins),
  };
}
