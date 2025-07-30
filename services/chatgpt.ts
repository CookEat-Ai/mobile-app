import { apiService } from './api';

interface Recipe {
  title: string;
  difficulty: string;
  cooking_time: string;
  calories: number;
  lipides: number;
  proteines: number;
  icon: string;
}

export async function generateRecipesFromText(ingredients: string): Promise<Recipe[]> {
  try {
    const response = await apiService.request<{ recipes: Recipe[] }>('/recipe/generate', {
      method: 'POST',
      body: JSON.stringify({ ingredients }),
    });

    return response.data.recipes;
  } catch (error) {
    console.error('Erreur lors de la génération des recettes:', error);
    throw error;
  }
}

export async function getRecipeIngredients(recipe: Recipe): Promise<any> {
  try {
    const response = await apiService.request<any>('/recipe/ingredients', {
      method: 'POST',
      body: JSON.stringify({ recipe }),
    });

    return response.data;
  } catch (error) {
    console.error('Erreur lors de la génération des ingrédients:', error);
    throw error;
  }
}

export async function getRecipeSteps(recipe: Recipe): Promise<any> {
  try {
    const response = await apiService.request<any>('/recipe/steps', {
      method: 'POST',
      body: JSON.stringify({ recipe }),
    });

    return response.data;
  } catch (error) {
    console.error('Erreur lors de la génération des étapes:', error);
    throw error;
  }
}