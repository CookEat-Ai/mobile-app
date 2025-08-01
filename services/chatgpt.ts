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

export async function generateRecipesFromText(ingredients: string, existingRecipes?: Recipe[]): Promise<Recipe[]> {
  try {
    const response = await apiService.generateRecipes(ingredients, existingRecipes);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data?.recipes || [];
  } catch (error) {
    console.error('Erreur lors de la génération des recettes:', error);
    throw error;
  }
}

export async function getRecipeIngredients(recipe: Recipe): Promise<any> {
  try {
    const response = await apiService.getRecipeIngredients(recipe);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    console.error('Erreur lors de la génération des ingrédients:', error);
    throw error;
  }
}

export async function getRecipeSteps(recipe: Recipe): Promise<any> {
  try {
    const response = await apiService.getRecipeSteps(recipe);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    console.error('Erreur lors de la génération des étapes:', error);
    throw error;
  }
}

export async function processVoiceIngredients(voiceText: string): Promise<string[]> {
  try {
    const response = await apiService.processVoiceIngredients(voiceText);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data?.ingredients || [];
  } catch (error) {
    console.error('Erreur lors du traitement des ingrédients vocaux:', error);
    throw error;
  }
}