import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'favorite_recipes';

export interface FavoriteRecipe {
  _id: string;
  id: string;
  title: string;
  image?: string;
  icon?: string;
  cooking_time: string;
  difficulty: string;
  servings?: number;
  calories?: number;
  lipids?: number;
  proteins?: number;
  ingredients?: any[];
  steps?: any[];
  createdAt: string;
  addedToFavoritesAt: string;
}

class FavoritesStorageService {
  // Récupérer toutes les recettes favorites
  async getFavorites(): Promise<FavoriteRecipe[]> {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
      if (favoritesJson) {
        return JSON.parse(favoritesJson);
      }
      return [];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des favoris:', error);
      return [];
    }
  }

  // Ajouter une recette aux favoris
  async addToFavorites(recipe: any): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();

      // Vérifier si la recette est déjà dans les favoris
      const isAlreadyFavorite = favorites.some(fav => fav.id === recipe.id);
      if (isAlreadyFavorite) {
        console.log('⚠️ Recette déjà dans les favoris');
        return false;
      }

      // Créer l'objet recette favorite
      const favoriteRecipe: FavoriteRecipe = {
        ...recipe,
        addedToFavoritesAt: new Date().toISOString()
      };

      // Ajouter aux favoris
      favorites.push(favoriteRecipe);

      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

      console.log('✅ Recette ajoutée aux favoris');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout aux favoris:', error);
      return false;
    }
  }

  // Retirer une recette des favoris
  async removeFromFavorites(recipeId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter(fav =>
        fav._id !== recipeId && fav.id !== recipeId
      );

      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));

      console.log('✅ Recette retirée des favoris');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des favoris:', error);
      return false;
    }
  }

  // Vérifier si une recette est dans les favoris
  async isFavorite(recipeId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(fav => fav.id === recipeId);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des favoris:', error);
      return false;
    }
  }

  // Vider tous les favoris
  async clearFavorites(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
      console.log('✅ Tous les favoris ont été supprimés');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des favoris:', error);
      return false;
    }
  }
}

export default new FavoritesStorageService(); 