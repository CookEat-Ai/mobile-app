import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';

class FavoritesStorageService {
  private async getUserId(): Promise<string | null> {
    return await AsyncStorage.getItem('userId');
  }

  async getFavorites(): Promise<any[]> {
    try {
      const userId = await this.getUserId();
      if (!userId) return [];

      const response = await apiService.getFavorites(userId);
      return response.data?.recipes || [];
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
  }

  async addToFavorites(recipe: any): Promise<boolean> {
    try {
      const userId = await this.getUserId();
      if (!userId || !recipe?.id) return false;

      const response = await apiService.addFavorite(userId, recipe.id);
      return response.data?.success || false;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }
  }

  async removeFromFavorites(recipeId: string): Promise<boolean> {
    try {
      const userId = await this.getUserId();
      if (!userId) return false;

      const response = await apiService.removeFavorite(userId, recipeId);
      return response.data?.success || false;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }
  }

  async isFavorite(recipeId: string): Promise<boolean> {
    try {
      const userId = await this.getUserId();
      if (!userId) return false;

      const response = await apiService.checkFavorite(userId, recipeId);
      return response.data?.isFavorite || false;
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }

  async clearFavorites(): Promise<boolean> {
    return true;
  }
}

export default new FavoritesStorageService();
