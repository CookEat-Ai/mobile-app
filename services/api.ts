import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import I18n from '../i18n';

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Erreur lors du chargement du token:', error);
    }
  }

  private async saveToken(token: string) {
    try {
      await AsyncStorage.setItem('authToken', token);
      this.token = token;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du token:', error);
    }
  }

  private async removeToken() {
    try {
      await AsyncStorage.removeItem('authToken');
      this.token = null;
    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(url)
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expiré ou invalide
          await this.removeToken();
          throw new Error('Session expirée');
        }
        throw new Error(data.message || 'Erreur de requête');
      }

      return { data };
    } catch (error) {
      console.error('Erreur API:', error);
      return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  // Authentification
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/sign', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.token) {
      await this.saveToken(response.data.token);
    }

    return response;
  }

  async register(firstName: string, email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ firstName, email, password }),
    });

    if (response.data?.token) {
      await this.saveToken(response.data.token);
    }

    return response;
  }

  // Méthode pour définir un token manuellement (utile pour les paiements guest)
  async setToken(token: string) {
    await this.saveToken(token);
  }

  async logout() {
    await this.removeToken();
  }

  // Paiements
  async createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string, email: string, firstName: string) {
    return this.request<{ url: string }>('/payment/checkout', {
      method: 'POST',
      body: JSON.stringify({
        priceId,
        successUrl,
        cancelUrl,
        email,
        firstName,
      }),
    });
  }

  // Abonnements
  async getCurrentSubscription() {
    return this.request<{
      hasSubscription: boolean;
      subscription: any;
    }>('/subscription/current');
  }



  async cancelSubscription() {
    return this.request<{ message: string; subscription: any }>('/subscription/cancel', {
      method: 'POST',
    });
  }

  async reactivateSubscription() {
    return this.request<{ message: string; subscription: any }>('/subscription/reactivate', {
      method: 'POST',
    });
  }

  // Utilisateur
  async getCurrentUser() {
    return this.request<any>('/users/who-am-i');
  }

  async updateUser(data: Partial<any>) {
    return this.request<any>('/users', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Créer un utilisateur guest avant le paiement
  async createGuestUser(email: string, firstName: string) {
    return this.request<{ token: string; tempPassword: string; user: any }>('/payment/create-guest', {
      method: 'POST',
      body: JSON.stringify({ email, firstName }),
    });
  }

  // Confirmer un paiement après paiement natif réussi
  async confirmPayment(planId: string, amount: number) {
    return this.request<{ message: string; user: any }>('/payment/confirm', {
      method: 'POST',
      body: JSON.stringify({ planId, amount }),
    });
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Recettes
  async generateRecipes(ingredients: string, existingRecipes?: any[]) {
    return this.request<{ recipes: any[] }>('/recipe/generate', {
      method: 'POST',
      body: JSON.stringify({
        ingredients,
        existingRecipes,
        language: I18n.locale || 'fr'
      }),
    });
  }

  async generateSingleRecipeWithFilters(
    ingredients: string,
    dishType: string,
    duration: string,
    servings: number,
    cuisineStyle: string,
    diet: string,
    calories: string,
    allowOtherIngredients: boolean,
    existingRecipes?: any[]
  ) {
    return this.request<{ recipe: any }>('/recipe/generate-single', {
      method: 'POST',
      body: JSON.stringify({
        ingredients,
        dishType,
        duration,
        servings,
        cuisineStyle,
        diet,
        calories,
        allowOtherIngredients,
        existingRecipes,
        language: I18n.locale || 'fr'
      }),
    });
  }

  async getRecipeIngredients(recipe: any) {
    return this.request<any>('/recipe/ingredients', {
      method: 'POST',
      body: JSON.stringify({
        recipe,
        language: I18n.locale || 'fr'
      }),
    });
  }

  async getRecipeSteps(recipe: any) {
    return this.request<any>('/recipe/steps', {
      method: 'POST',
      body: JSON.stringify({
        recipe,
        language: I18n.locale || 'fr'
      }),
    });
  }

  async processVoiceIngredients(voiceText: string) {
    return this.request<{ ingredients: string[] }>('/recipe/process-voice-ingredients', {
      method: 'POST',
      body: JSON.stringify({
        voiceText,
        language: I18n.locale || 'fr'
      }),
    });
  }

  async saveRecipe(recipe: any, userId?: string) {
    return this.request<{ success: boolean; message: string; recipe: any }>('/recipe/save', {
      method: 'POST',
      body: JSON.stringify({ recipe, userId, language: I18n.locale || 'fr' }),
    });
  }

  async getRecipes(userId?: string, isFavorite?: boolean) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (isFavorite !== undefined) params.append('isFavorite', isFavorite.toString());

    return this.request<{ success: boolean; recipes: any[] }>(`/recipe?${params.toString()}`, {
      method: 'GET',
    });
  }

  async updateRecipe(recipeId: string, updates: any) {
    return this.request<{ success: boolean; message: string; recipe: any }>(`/recipe/${recipeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteRecipe(recipeId: string) {
    return this.request<{ success: boolean; message: string }>(`/recipe/${recipeId}`, {
      method: 'DELETE',
    });
  }

  async likeRecipe(recipeId: string) {
    return this.request<{ success: boolean; message: string; recipe: any }>(`/recipe/like/${recipeId}`, {
      method: 'POST',
    });
  }

  async saveOnboardingAnswers(answers: Record<string, string>, mobileId: string) {
    return this.request<{ success: boolean; message: string; userId?: string }>('/user/onboarding', {
      method: 'POST',
      body: JSON.stringify({ answers, mobileId }),
    });
  }
}

export const apiService = new ApiService();
export default apiService; 