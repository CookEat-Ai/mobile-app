import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventSource from 'react-native-sse';
import { API_BASE_URL, WS_URL } from '../config/api';
import I18n from '../i18n';

function parsePartialJSON(text: string): any {
  if (!text || !text.trim()) return null;
  try { return JSON.parse(text); } catch { /* partial */ }

  let attempt = text;
  let inString = false;
  let escaped = false;

  for (const char of attempt) {
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
  }

  if (inString) attempt += '"';

  let changed = true;
  while (changed) {
    const before = attempt;
    attempt = attempt.replace(/,\s*$/, '');
    attempt = attempt.replace(/,\s*"[^"]*"\s*$/, '');
    attempt = attempt.replace(/(\{)\s*"[^"]*"\s*$/, '$1');
    attempt = attempt.replace(/,\s*"[^"]*"\s*:\s*(?:[^"\[{\s,}\]][^,}\]]*)?$/, '');
    attempt = attempt.replace(/(\{)\s*"[^"]*"\s*:\s*(?:[^"\[{\s,}\]][^,}\]]*)?$/, '$1');
    changed = attempt !== before;
  }

  let openBraces = 0;
  let openBrackets = 0;
  inString = false;
  escaped = false;
  for (const char of attempt) {
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }

  for (let i = 0; i < openBrackets; i++) attempt += ']';
  for (let i = 0; i < openBraces; i++) attempt += '}';

  try { return JSON.parse(attempt); } catch { return null; }
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  constructor() {
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    return headers;
  }

  private getCurrentLanguage(): string {
    // On s'assure de n'envoyer que le code de langue (ex: 'fr' au lieu de 'fr-FR')
    const locale = I18n.locale || 'fr';
    return locale.split('-')[0].split('_')[0].toLowerCase();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      
      const headers: HeadersInit = { ...this.getHeaders() };
      
      // Si on envoie du FormData, on laisse le navigateur/fetch gérer le Content-Type
      if (options.body instanceof FormData) {
        if ('Content-Type' in headers) {
          delete (headers as any)['Content-Type'];
        }
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur de requête');
      }

      return { data };
    } catch (error) {
      console.error('Erreur API:', error);
      return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  // Utilisateur
  async getCurrentUser(mobileId: string) {
    return this.request<any>(`/users/who-am-i?mobileId=${mobileId}`);
  }

  // Recettes
  generateRecipeStream(
    ingredients: string,
    dishType: string,
    duration: string,
    servings: number,
    cuisineStyle: string,
    diet: string,
    goal: string,
    equipments: string[],
    allergies: string[],
    allowOtherIngredients: boolean,
    isSubscribed: boolean,
    callbacks: {
      onRecipeChunk: (partial: any) => void;
      onRecipe: (data: { recipe: any; isFirstGeneration: boolean }) => void;
      onStepsChunk: (partial: any) => void;
      onSteps: (data: { steps: any[] }) => void;
      onDone: (data: { id: string }) => void;
      onError: (message: string) => void;
    }
  ): { close: () => void } {
    const month = new Date().getMonth();
    const language = this.getCurrentLanguage();
    let ws: WebSocket | null = null;

    AsyncStorage.getItem('userId').then((userId) => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        ws?.send(JSON.stringify({
          action: 'generate-recipe',
          payload: {
            ingredients, dishType, duration, servings, cuisineStyle, diet,
            goal, equipments, allergies, allowOtherIngredients, isSubscribed,
            month, language, userId
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          switch (msg.event) {
            case 'recipe-chunk': {
              const partial = parsePartialJSON(msg.data.accumulated);
              if (partial) callbacks.onRecipeChunk(partial);
              break;
            }
            case 'recipe-complete':
              callbacks.onRecipe(msg.data);
              break;
            case 'steps-chunk': {
              const partial = parsePartialJSON(msg.data.accumulated);
              if (partial) callbacks.onStepsChunk(partial);
              break;
            }
            case 'steps-complete':
              callbacks.onSteps(msg.data);
              break;
            case 'done':
              callbacks.onDone(msg.data);
              ws?.close();
              break;
            case 'error':
              callbacks.onError(msg.data.message || 'Erreur de génération');
              ws?.close();
              break;
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WS error:', e);
        callbacks.onError('Erreur de connexion WebSocket');
      };

      ws.onclose = () => {
        ws = null;
      };
    }).catch(() => {
      callbacks.onError('Erreur interne');
    });

    return {
      close: () => { ws?.close(); ws = null; }
    };
  }

  async getRecipeIngredients(recipe: any) {
    return this.request<any>('/recipe/ingredients', {
      method: 'POST',
      body: JSON.stringify({
        recipe,
        language: this.getCurrentLanguage()
      }),
    });
  }

  async getRecipeSteps(recipe: any) {
    return this.request<any>('/recipe/steps', {
      method: 'POST',
      body: JSON.stringify({
        recipe,
        userId: await AsyncStorage.getItem('userId'),
        language: this.getCurrentLanguage()
      }),
    });
  }

  async processVoiceIngredients(voiceText: string) {
    return this.request<{ ingredients: { name: string; category: string }[] }>('/recipe/process-voice-ingredients', {
      method: 'POST',
      body: JSON.stringify({
        voiceText,
        language: this.getCurrentLanguage()
      }),
    });
  }

  async processImageIngredients(imageUris: string[]) {
    const formData = new FormData();
    formData.append('language', this.getCurrentLanguage());
    
    imageUris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('images', {
        uri,
        name: filename,
        type,
      } as any);
    });

    return this.request<{ ingredients: { name: string; category: string }[] }>('/recipe/process-image-ingredients', {
      method: 'POST',
      body: formData,
    });
  }

  async processVideoIngredients(videoUri: string) {
    const formData = new FormData();
    formData.append('language', this.getCurrentLanguage());

    const filename = videoUri.split('/').pop() || 'video.mp4';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `video/${match[1]}` : `video/mp4`;

    formData.append('video', {
      uri: videoUri,
      name: filename,
      type,
    } as any);

    return this.request<{ ingredients: { name: string; category: string }[] }>('/recipe/process-video-ingredients', {
      method: 'POST',
      body: formData,
    });
  }

  async saveRecipe(recipe: any, userId?: string) {
    const resolvedUserId = userId ?? await AsyncStorage.getItem('userId');
    return this.request<{ success: boolean; message: string; recipe: any }>('/recipe/save', {
      method: 'POST',
      body: JSON.stringify({ recipe, userId: resolvedUserId, language: this.getCurrentLanguage() }),
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

  async likeRecipe(recipeId: string) {
    return this.request<{ success: boolean; message: string; recipe: any }>(`/recipe/like/${recipeId}`, {
      method: 'POST',
    });
  }

  async getRecipeHistory(userId: string, page: number = 1, limit: number = 30, options?: { isImported?: boolean }) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (options?.isImported !== undefined) {
      params.set('isImported', String(options.isImported));
    }
    return this.request<{ success: boolean; history: any[]; pagination?: { page: number; limit: number; total: number; hasMore: boolean } }>(`/recipe/history/${userId}?${params.toString()}`, {
      method: 'GET',
    });
  }

  async getRecipeById(id: string) {
    return this.request<{ success: boolean; recipe: any }>(`/recipe/detail/${id}`, {
      method: 'GET',
    });
  }

  async deleteRecipe(recipeId: string, userId: string) {
    return this.request<{ success: boolean }>(`/recipe/${recipeId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  }

  async saveOnboardingAnswers(answers: Record<string, string>, mobileId: string, timezone?: string) {
    const country = Localization.region || undefined;
    return this.request<{ success: boolean; message: string; userId?: string }>('/user/onboarding', {
      method: 'POST',
      body: JSON.stringify({ answers, mobileId, timezone, country, language: this.getCurrentLanguage() }),
    });
  }

  async getAppConfig() {
    return this.request<{ dailySearchLimit: number }>('/config');
  }

  async validatePromoCode(code: string) {
    return this.request<{ isValid: boolean; message?: string }>('/promo-code/validate', {
      method: 'POST',
      body: JSON.stringify({ code, language: this.getCurrentLanguage() }),
    });
  }

  async validateImage(imageUrl: string) {
    return this.request<{ isValid: boolean; details: any }>('/recipe/validate-image', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  }

  async importRecipeFromVideo(
    videoUrl: string,
    isSubscribed: boolean = false,
    callbacks?: {
      onProgress?: (progress: number, step?: string) => void;
    }
  ): Promise<ApiResponse<{ success: boolean; recipe: any }>> {
    const userId = await AsyncStorage.getItem('userId');
    const url = `${API_BASE_URL}/recipe/import-from-video`;
    
    return new Promise((resolve) => {
      const es = new EventSource(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders() as any,
        },
        body: JSON.stringify({
          url: videoUrl,
          userId,
          isSubscribed,
          language: this.getCurrentLanguage(),
        }),
      });

      let hasResolved = false;

      es.addEventListener('progress', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          callbacks?.onProgress?.(data.progress ?? 0, data.step);
        } catch (e) {
          console.error('[SSE] Parse progress error:', e);
        }
      });

      es.addEventListener('done', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          es.close();
          if (!hasResolved) {
            hasResolved = true;
            resolve({ data: { success: data.success, recipe: data.recipe } });
          }
        } catch (e) {
          console.error('[SSE] Parse done error:', e);
          es.close();
          if (!hasResolved) {
            hasResolved = true;
            resolve({ error: 'Erreur de réponse finale' });
          }
        }
      });

      es.addEventListener('error', (event: any) => {
        console.error('[SSE] Error event:', event);
        es.close();
        if (!hasResolved) {
          hasResolved = true;
          const message = event.data ? JSON.parse(event.data).message : 'Erreur d\'import';
          resolve({ error: message });
        }
      });

      // Timeout de sécurité si rien ne se passe pendant 5 minutes
      setTimeout(() => {
        if (!hasResolved) {
          es.close();
          hasResolved = true;
          resolve({ error: 'Délai d\'importation dépassé' });
        }
      }, 300000);
    });
  }

  async updateRecipeImage(recipeId: string, imageUri: string) {
    const userId = await AsyncStorage.getItem('userId');
    const formData = new FormData();
    formData.append('recipeId', recipeId);
    if (userId) formData.append('userId', userId);
    formData.append('language', this.getCurrentLanguage());

    // Si c'est une URI locale (commence par file:// ou /)
    if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
      const filename = imageUri.split('/').pop() || 'recipe.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
    } else {
      // Sinon on envoie l'URL (pour compatibilité)
      formData.append('imageUrl', imageUri);
    }

    return this.request<{ success: boolean; recipe: any }>('/recipe/update-image', {
      method: 'POST',
      body: formData,
    });
  }

  // Notifications
  async updateNotificationToken(mobileId: string, notificationToken: string, timezone?: string) {
    const country = Localization.region || undefined;
    return this.request<{ success: boolean; message: string }>('/user/notification-token', {
      method: 'POST',
      body: JSON.stringify({ mobileId, notificationToken, timezone, country }),
    });
  }

  async updateUserActivity(mobileId: string, timezone?: string) {
    const country = Localization.region || undefined;
    return this.request<{ success: boolean; message: string }>('/user/activity', {
      method: 'POST',
      body: JSON.stringify({ mobileId, timezone, country }),
    });
  }

  async deleteUser(mobileId: string) {
    return this.request<{ success: boolean; message: string }>('/user/delete', {
      method: 'POST',
      body: JSON.stringify({ mobileId }),
    });
  }

  async getFavorites(userId: string) {
    return this.request<{ success: boolean; recipes: any[] }>(`/recipe/favorites/${userId}`, {
      method: 'GET',
    });
  }

  async addFavorite(userId: string, recipeId: string) {
    return this.request<{ success: boolean }>(`/recipe/favorites/${userId}/add`, {
      method: 'POST',
      body: JSON.stringify({ recipeId }),
    });
  }

  async removeFavorite(userId: string, recipeId: string) {
    return this.request<{ success: boolean }>(`/recipe/favorites/${userId}/${recipeId}`, {
      method: 'DELETE',
    });
  }

  async checkFavorite(userId: string, recipeId: string) {
    return this.request<{ success: boolean; isFavorite: boolean }>(`/recipe/favorites/${userId}/check/${recipeId}`, {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();
export default apiService; 