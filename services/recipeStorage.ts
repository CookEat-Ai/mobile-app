import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'generated_recipes';

interface StoredRecipe {
  id: string;
  title: string;
  ingredients: string[]; // Liste des ingrédients utilisés pour cette recette
  recipe: any; // La recette complète (sans les steps)
  createdAt: string;
}

class RecipeStorageService {
  // Sauvegarder une recette générée
  async saveGeneratedRecipe(recipe: any, ingredients: string[]): Promise<void> {
    try {
      const storedRecipes = await this.getStoredRecipes();

      const newRecipe: StoredRecipe = {
        id: recipe.id,
        title: recipe.title,
        ingredients: ingredients,
        recipe: {
          ...recipe,
          steps: undefined // On ne stocke pas les steps
        },
        createdAt: new Date().toISOString()
      };

      storedRecipes.push(newRecipe);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedRecipes));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la recette:', error);
    }
  }

  // Récupérer toutes les recettes stockées
  async getStoredRecipes(): Promise<StoredRecipe[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des recettes:', error);
      return [];
    }
  }

  // Trouver les recettes existantes pour une liste d'ingrédients donnée
  async findExistingRecipes(ingredients: string[]): Promise<any[]> {
    try {
      const storedRecipes = await this.getStoredRecipes();
      const normalizedIngredients = ingredients.map(ing => ing.toLowerCase().trim()).sort();

      return storedRecipes
        .filter(storedRecipe => {
          if (!Array.isArray(storedRecipe.ingredients))
            // @ts-ignore
            storedRecipe.ingredients = JSON.parse(storedRecipe.ingredients)

          const storedIngredients = storedRecipe.ingredients.map(ing => ing.toLowerCase().trim()).sort();
          return JSON.stringify(storedIngredients) === JSON.stringify(normalizedIngredients);
        })
        .map(storedRecipe => storedRecipe.recipe);
    } catch (error) {
      console.error('Erreur lors de la recherche des recettes existantes:', error);
      return [];
    }
  }

  // Nettoyer les anciennes recettes (optionnel)
  async cleanupOldRecipes(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const storedRecipes = await this.getStoredRecipes();
      const now = new Date().getTime();
      const normalizedRecipes = storedRecipes.map((recipe: any) => {
        const createdAtMs = Date.parse(recipe?.createdAt ?? '');
        if (!Number.isFinite(createdAtMs)) {
          return { ...recipe, createdAt: new Date().toISOString() };
        }
        return recipe;
      });

      const filteredRecipes = normalizedRecipes.filter((recipe: any) => {
        const createdAtMs = Date.parse(recipe?.createdAt ?? '');
        if (!Number.isFinite(createdAtMs)) {
          return true;
        }
        const recipeAge = now - createdAtMs;
        return recipeAge < maxAge;
      });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecipes));
    } catch (error) {
      console.error('Erreur lors du nettoyage des recettes:', error);
    }
  }
}

export const recipeStorageService = new RecipeStorageService();
export default recipeStorageService; 