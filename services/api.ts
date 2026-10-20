import { CREATOR_PROMO_CODES_ENABLED } from '../config/storeCompliance';
import { markPlanningReveal } from './planningReveal';
import { getAnonymousSessionToken, invalidateAnonymousSession } from './anonymousSession';
import * as Localization from 'expo-localization';
import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventSource from 'react-native-sse';
import { API_BASE_URL, WS_URL } from '../config/api';
import i18n, { resolveSupportedLanguage } from '../i18n';
import { responseCache, responseCachePolicy, type ReadOptions } from './responseCache';
import { personalMealPlan, writePersonalShoppingState } from './personalRecipe';

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
  status?: number;
  message?: string;
  error?: string;
}

function isCanceledFetchError(error: unknown) {
  const name = error && typeof error === 'object' && 'name' in error
    ? String(error.name)
    : '';
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  return name === 'AbortError'
    || /FetchRequestCanceledException|fetch request has been cancel(?:ed|led)|operation (?:was )?aborted/i.test(message);
}

export type RecipeFeasibilityResponse = {
  canGenerate: boolean;
  status: 'possible' | 'confirmed_impossible' | 'unchecked';
  confidence: number;
  reason: string;
  suggestions: string[];
  checkedBy: 'llm_consensus' | 'llm_single' | 'fail_open';
};

export type RecipeIdentity = {
  title: string;
  dish_type?: string;
  cuisine_style?: string;
  main_ingredients?: string[];
};

export type CostEstimate = {
  status: 'estimated' | 'partial' | 'unavailable';
  country: string; currency: string; servings: number;
  amount: number | null; perServing: number | null; low: number | null; high: number | null;
  knownAmount: number; coverage: number; missingIngredients: string[];
  modelVersion: string; priceDate: string; exchangeRateDate: string; basis: 'consumed-ingredients';
  countryBasis: 'food-index' | 'household-index-proxy' | 'us-retail-reference' | 'unavailable';
  exchangeRateSource: 'ECB' | 'ExchangeRate-API';
};

export type MealPlanMeal = {
  ingredientServings?: number;
  ingredientScales?: number[];
  artworkOnly?: boolean;
  catalogVariant?: string;
  estimatedCost?: CostEstimate;
  pantryOwned?: number;
  pantryRequired?: number;
  portionScale?: number;
  calorieFit?: 'standard' | 'closest_available';
  slotId: string;
  position: number;
  scheduledDate?: string;
  dayIndex?: number;
  mealType?: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  source: 'library' | 'catalog' | 'suggestion' | 'generated';
  status: 'ready' | 'idea' | 'generating' | 'failed';
  recipeId?: string;
  catalogRecipeId?: string;
  title: string;
  dishType?: string;
  cuisineStyle?: string;
  mainIngredients: string[];
  cookingTime?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  chefTip?: string;
  image?: string;
  imageAttribution?: CatalogImageAttribution | null;
  calories?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  ingredients?: { name: string; quantity: string; icon?: string; tags?: string[] }[];
  steps?: { title: string; description: string }[];
  servings: number;
  locked: boolean;
};

export type CatalogCuisine = {
  id: string;
  names: Array<{ language: string; value: string }>;
  aliases: string[];
  coverage?: { total: number; express: number; vegetarian: number; vegan: number; ready: boolean } | null;
};

export type CatalogImageAttribution = {
  provider: 'themealdb' | 'wikimedia-commons' | 'owned';
  sourceUrl: string;
  creator?: string;
  license?: string;
  licenseUrl?: string;
  title?: string;
};

export type CatalogMealCategory = 'breakfast' | 'main' | 'snack';

export type CatalogRecipe = {
  artworkOnly?: boolean;
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  cooking_time: string;
  icon: string;
  image: string;
  imageAttribution?: CatalogImageAttribution | null;
  calories: string;
  lipids: string;
  proteins: string;
  carbs: string;
  chef_tip?: string;
  servings: number;
  ingredients: Array<{ name: string; quantity: string; icon?: string; tags?: string[] }>;
  steps: Array<{ title: string; description: string }>;
  mainIngredients: string[];
  language: string;
  cuisine_style: string;
  dish_type: string;
  mealTypes: Array<'breakfast' | 'lunch' | 'snack' | 'dinner'>;
  mealCategories?: CatalogMealCategory[];
  replacementMealTypes: Array<'breakfast' | 'lunch' | 'snack' | 'dinner'>;
  express: boolean;
};

export type ShoppingListItem = {
  manual?: boolean;
  id: string;
  name: string;
  canonicalName: string;
  icon?: string;
  category: string;
  quantities: { amount?: number; unit?: string; display: string }[];
  recipeIds: string[];
  pantryAvailable?: boolean;
  checked: boolean;
  excluded: boolean;
};

export type MealPlan = {
  estimatedCost?: CostEstimate;
  _id: string;
  userId: string;
  weekStart: string;
  weekEnd?: string;
  mealCount: number;
  servings: number;
  language: string;
  status: 'draft' | 'ready';
  preferences: Record<string, unknown>;
  profileSnapshot?: Record<string, unknown>;
  nutritionTargets?: {
    bmi: number;
    estimatedMaintenanceCalories: number;
    dailyCalories: number;
    dailyProteinGrams: number;
    dailyCarbsGrams: number;
    dailyFatGrams: number;
    targetWeightKg: number;
    weeklyChangeKg: number;
    durationWeeks: number;
    minimumDurationWeeks: number;
  };
  meals: MealPlanMeal[];
  shoppingList: ShoppingListItem[];
  updatedAt: string;
};

class ApiService {
  private cacheUserId: string | null = null;
  private healthWs: WebSocket | null = null;
  private onHealthChange: ((isAvailable: boolean) => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
  }

  // Initialiser le monitoring de l'API via WebSocket
  monitorApiHealth(callback: (isAvailable: boolean) => void) {
    this.onHealthChange = callback;
    // Si on a déjà un WS ouvert, on prévient tout de suite
    if (this.healthWs && this.healthWs.readyState === WebSocket.OPEN) {
      callback(true);
    } else {
      this.connectHealthWs();
    }
  }

  /** Au retour au premier plan : reconnecte tout de suite au lieu d'attendre le délai de retry. */
  onAppForeground() {
    this.invalidateReadCache();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connectHealthWs();
  }

  private connectHealthWs() {
    if (this.healthWs?.readyState === WebSocket.OPEN) {
      this.onHealthChange?.(true);
      return;
    }
    if (this.healthWs) {
      try {
        this.healthWs.close();
      } catch {
        /* ignore */
      }
      this.healthWs = null;
    }

    try {
      const socket = new WebSocket(WS_URL);
      this.healthWs = socket;

      // Sécurité : Si après 5s on n'est toujours pas OPEN, on considère que c'est DOWN
      const connectionTimeout = setTimeout(() => {
        if (this.healthWs === socket && socket.readyState !== WebSocket.OPEN) {
          console.log('WS Connection timeout - API considered unavailable');
          this.handleWsDisconnection();
        }
      }, 5000);

      socket.onopen = () => {
        if (this.healthWs !== socket) return;
        clearTimeout(connectionTimeout);
        this.onHealthChange?.(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      socket.onclose = () => {
        clearTimeout(connectionTimeout);
        if (this.healthWs !== socket) return;
        this.handleWsDisconnection();
      };

      socket.onerror = () => {
        clearTimeout(connectionTimeout);
        if (this.healthWs !== socket) return;
        this.handleWsDisconnection();
      };
    } catch (e) {
      this.handleWsDisconnection();
    }
  }

  private handleWsDisconnection() {
    this.healthWs = null;
    this.onHealthChange?.(false);

    // Tenter de se reconnecter toutes les 5 secondes
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connectHealthWs();
      }, 5000);
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    return headers;
  }

  private getCurrentLanguage(): string {
    return resolveSupportedLanguage(i18n.language);
  }

  invalidateReadCache() {
    responseCache.invalidatePersonal();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 60000,
    readOptions: ReadOptions = {},
  ): Promise<ApiResponse<T>> {
    const method = (options.method || 'GET').toUpperCase();
    const mutation = method !== 'GET' && /^(?:\/meal-plans(?:\/|$)|\/recipe(?:\/|$)|\/user\/(?:delete|init|onboarding|admin-access)$)/.test(endpoint);
    if (mutation) {
      this.invalidateReadCache();
      try {
        const response = await this.networkRequest<T>(endpoint, options, timeoutMs);
        const data = response.data as any;
        if (endpoint.startsWith('/meal-plans') && data?.plan) {
          const userId = await AsyncStorage.getItem('userId').catch(()=>null);
          if (userId) return {...response,data:{...data,plan:await personalMealPlan(data.plan,userId)}};
        }
        return response;
      }
      finally { this.invalidateReadCache(); }
    }
    const policy = method === 'GET' ? responseCachePolicy(endpoint) : null;
    if (!policy) return this.networkRequest<T>(endpoint, options, timeoutMs);
    let userId: string | null = null;
    if (policy.group === 'personal') {
      try { userId = await AsyncStorage.getItem('userId'); }
      catch { return this.networkRequest<T>(endpoint, options, timeoutMs); }
      if (userId !== this.cacheUserId) {
        this.invalidateReadCache();
        this.cacheUserId = userId;
      }
      if (!userId) return this.networkRequest<T>(endpoint, options, timeoutMs);
    }
    const key = JSON.stringify([API_BASE_URL, this.getCurrentLanguage(), userId, endpoint]);
    return responseCache.read<T>(key, policy, () => this.networkRequest<T>(endpoint, options, timeoutMs), readOptions);
  }

  private async networkRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 60000 // Repasser à un timeout plus long (30s) par défaut
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    if(options.signal?.aborted)controller.abort();
    options.signal?.addEventListener('abort',abort,{once:true});

    try {
      const url = `${API_BASE_URL}${endpoint}`;

      const headers: Record<string, string> = { ...this.getHeaders() } as Record<string, string>;
      // Extraction routes are public and rate-limited on the API. A failed
      // account/session registration must not prevent uploading an image.
      const publicExtraction = /^\/recipe\/process-(?:image|video|voice)-ingredients$/.test(endpoint);
      if (!publicExtraction && /^\/(?:meal-plans|user(?:s)?\/|recipe(?:\/|$)|promo-code\/(?:validate|mark-used))/.test(endpoint)) {
        headers.Authorization = 'Bearer ' + await getAnonymousSessionToken();
      }

      if (options.body instanceof FormData) {
        if ('Content-Type' in headers) {
          delete (headers as any)['Content-Type'];
        }
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      let data: any;
      try { data = await response.json(); }
      catch { return { error: i18n.t('common.requestError'), status: response.ok ? 502 : response.status }; }

      if (!response.ok) {
        if (response.status === 401) {
          invalidateAnonymousSession();
          this.invalidateReadCache();
        }
        return { error: response.status >= 500 ? i18n.t('common.requestError') : data.message || i18n.t('common.requestError'), status: response.status };
      }

      return { data };
    } catch (error: unknown) {
      // Expo iOS enveloppe parfois AbortController dans une
      // FetchRequestCanceledException au lieu d'exposer AbortError.
      if (isCanceledFetchError(error)) {
        return { error: i18n.t('common.networkError') };
      }

      return { error: i18n.t('common.networkError') };
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort',abort);
    }
  }

  async getAdminAccess() {
    return this.request<{ active: boolean; expiresAt: string | null }>('/user/admin-access', {}, 8000);
  }
  async activateAdminAccess(code: string) {
    return this.request<{ active: boolean; expiresAt: string | null }>('/user/admin-access', {
      method: 'POST', body: JSON.stringify({ code }),
    }, 8000);
  }

  // Utilisateur
  async getCurrentUser(_mobileId: string) {
    return this.request<any>('/users/who-am-i');
  }

  // Recettes
  async checkRecipeFeasibility(
    ingredients: string,
    preferences: {
      dishType: string;
      cuisineStyle: string[];
      diet: string;
      allergies: string[];
      equipments: string[];
      allowOtherIngredients: boolean;
    },
  ) {
    const userId = await AsyncStorage.getItem('userId');
    return this.request<RecipeFeasibilityResponse>('/recipe/check-feasibility', {
      method: 'POST',
      body: JSON.stringify({
        ingredients,
        dishType: preferences.dishType,
        cuisineStyle: preferences.cuisineStyle.join(', '),
        diet: preferences.diet,
        allergies: preferences.allergies,
        equipments: preferences.equipments,
        allowOtherIngredients: preferences.allowOtherIngredients,
        language: this.getCurrentLanguage(),
        userId,
      }),
    }, 20000);
  }

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
      onRecipeIdentity: (data: { identity: RecipeIdentity; locked: boolean }) => void;
      onRecipeChunk: (partial: any) => void;
      onRecipe: (data: { recipe: any; isFirstGeneration: boolean }) => void;
      onStepsChunk: (partial: any) => void;
      onSteps: (data: { steps: any[] }) => void;
      onDone: (data: { id: string }) => void;
      onError: (message: string) => void;
    }
  ): { close: () => void } {
    this.invalidateReadCache();
    const month = new Date().getMonth();
    const language = this.getCurrentLanguage();
    let ws: WebSocket | null = null;
    // Les fournisseurs envoient parfois plusieurs dizaines de fragments par
    // seconde. Reparser tout le JSON accumulé et rerendre l'écran pour chacun
    // sature le thread JS, notamment quand la fiche reste montée sous le loader.
    // Le flux réseau reste intégral ; seules les prévisualisations UI sont
    // regroupées à une cadence fluide et suffisante pour l'utilisateur.
    const CHUNK_UI_INTERVAL_MS = 100;
    let lastRecipePreviewAt = 0;
    let lastStepsPreviewAt = 0;
    let pendingRecipeAccumulated: string | null = null;
    let pendingStepsAccumulated: string | null = null;
    let recipePreviewTimer: ReturnType<typeof setTimeout> | null = null;
    let stepsPreviewTimer: ReturnType<typeof setTimeout> | null = null;

    const parseRecipePreview = (accumulated: string) => {
      const partial = parsePartialJSON(accumulated);
      if (partial) callbacks.onRecipeChunk(partial);
      lastRecipePreviewAt = Date.now();
    };
    const parseStepsPreview = (accumulated: string) => {
      const partial = parsePartialJSON(accumulated);
      if (partial) callbacks.onStepsChunk(partial);
      lastStepsPreviewAt = Date.now();
    };
    const scheduleRecipePreview = (accumulated: string) => {
      pendingRecipeAccumulated = accumulated;
      if (recipePreviewTimer) return;
      const wait = Math.max(0, CHUNK_UI_INTERVAL_MS - (Date.now() - lastRecipePreviewAt));
      recipePreviewTimer = setTimeout(() => {
        recipePreviewTimer = null;
        const pending = pendingRecipeAccumulated;
        pendingRecipeAccumulated = null;
        if (pending) parseRecipePreview(pending);
      }, wait);
    };
    const scheduleStepsPreview = (accumulated: string) => {
      pendingStepsAccumulated = accumulated;
      if (stepsPreviewTimer) return;
      const wait = Math.max(0, CHUNK_UI_INTERVAL_MS - (Date.now() - lastStepsPreviewAt));
      stepsPreviewTimer = setTimeout(() => {
        stepsPreviewTimer = null;
        const pending = pendingStepsAccumulated;
        pendingStepsAccumulated = null;
        if (pending) parseStepsPreview(pending);
      }, wait);
    };
    const clearPreviewTimers = () => {
      if (recipePreviewTimer) clearTimeout(recipePreviewTimer);
      if (stepsPreviewTimer) clearTimeout(stepsPreviewTimer);
      recipePreviewTimer = null;
      stepsPreviewTimer = null;
      pendingRecipeAccumulated = null;
      pendingStepsAccumulated = null;
    };

    Promise.all([AsyncStorage.getItem('userId'), AsyncStorage.getItem('cookingLevel'), AsyncStorage.getItem('mealBudget')]).then(([userId, cookingLevel, mealBudget]) => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        ws?.send(JSON.stringify({
          action: 'generate-recipe',
          payload: {
            ingredients, dishType, duration, servings, cuisineStyle, diet,
            goal, equipments, allergies, allowOtherIngredients, isSubscribed,
            month, language, userId, cookingLevel, mealBudget
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          switch (msg.event) {
            case 'recipe-identity':
              callbacks.onRecipeIdentity(msg.data);
              break;
            case 'recipe-chunk': {
              scheduleRecipePreview(msg.data.accumulated);
              break;
            }
            case 'recipe-complete':
              // La réponse complète est autoritaire : une prévisualisation en
              // attente ne doit pas arriver après elle et écraser l'état final.
              if (recipePreviewTimer) clearTimeout(recipePreviewTimer);
              recipePreviewTimer = null;
              pendingRecipeAccumulated = null;
              callbacks.onRecipe(msg.data);
              break;
            case 'steps-chunk': {
              scheduleStepsPreview(msg.data.accumulated);
              break;
            }
            case 'steps-complete':
              if (stepsPreviewTimer) clearTimeout(stepsPreviewTimer);
              stepsPreviewTimer = null;
              pendingStepsAccumulated = null;
              callbacks.onSteps(msg.data);
              break;
            case 'done':
              clearPreviewTimers();
              this.invalidateReadCache();
              callbacks.onDone(msg.data);
              ws?.close();
              break;
            case 'error':
              clearPreviewTimers();
              this.invalidateReadCache();
              callbacks.onError(msg.data.message || i18n.t('recipe_loading.generationError'));
              ws?.close();
              break;
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (e) => {
        this.invalidateReadCache();
        console.error('WS error:', e);
        callbacks.onError(i18n.t('recipe_loading.connectionError'));
      };

      ws.onclose = () => {
        this.invalidateReadCache();
        clearPreviewTimers();
        ws = null;
      };
    }).catch(() => {
      callbacks.onError(i18n.t('recipe_loading.internalError'));
    });

    return {
      close: () => { this.invalidateReadCache(); clearPreviewTimers(); ws?.close(); ws = null; }
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


  async processVoiceIngredients(voiceText: string) {
    return this.request<{ ingredients: { name: string; category: string }[] }>('/recipe/process-voice-ingredients', {
      method: 'POST',
      body: JSON.stringify({
        voiceText,
        language: this.getCurrentLanguage()
      }),
    });
  }

  async analyzeTrackedMeal(uri:string,signal?:AbortSignal) {
    const form=new FormData();form.append('image',new File(uri));form.append('language',this.getCurrentLanguage());
    return this.request<{analysis:import('./mealTracking').MealPhotoAnalysis}>('/recipe/tracking/analyze',{method:'POST',body:form,signal},90000);
  }
  async confirmTrackedMeal(scanId:string,meal:{title:string;items:import('./mealTracking').PhotoFood[];mealType:string;nutritionOverride?:import('./mealTracking').FoodNutrition|null;shareWithCatalog?:boolean},photoUri?:string) {
    const payload={...meal,language:this.getCurrentLanguage(),...(meal.shareWithCatalog?{referenceConsentVersion:'tracking-confirmation-v1'}:{})};
    let body:FormData|string=JSON.stringify(payload);
    if(meal.shareWithCatalog && photoUri){const form=new FormData();form.append('payload',JSON.stringify(payload));form.append('image',new File(photoUri));body=form;}
    return this.request<{meal:{id:string;title:string;items:import('./mealTracking').PhotoFood[];nutrition:import('./mealTracking').FoodNutrition;mealType:'breakfast'|'lunch'|'snack'|'dinner';estimated:true};catalogue:{status:string;id:string|null}}>(`/recipe/tracking/${encodeURIComponent(scanId)}/confirm`,{method:'POST',body},30000);
  }
  async searchTrackingFoods(search:string) {
    return this.request<{foods:{foodKey:string;name:string;description:string;sourceId:string;per100g:import('./mealTracking').FoodNutrition}[]}>(`/recipe/tracking/foods?search=${encodeURIComponent(search)}`,{},12000);
  }

  async processImageIngredients(imageUris: string[]) {
    const formData = new FormData();
    formData.append('language', this.getCurrentLanguage());

    // Expo's fetch serializes Blob/File contents, not React Native URI objects.
    imageUris.forEach((uri) => {
      formData.append('images', new File(uri));
    });

    return this.request<{ ingredients: { name: string; category: string }[] }>('/recipe/process-image-ingredients', {
      method: 'POST',
      body: formData,
    });
  }

  async processVideoIngredients(videoUri: string) {
    const formData = new FormData();
    formData.append('language', this.getCurrentLanguage());

    formData.append('video', new File(videoUri));

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

  async getCatalogCuisines(readOptions: ReadOptions = {}) {
    const response = await this.request<{ success: boolean; cuisines: CatalogCuisine[] }>('/catalog/cuisines', { method: 'GET' }, 12000, readOptions);
    if (!response.data) return response;
    // Older catalogues still include “/ fitness” in this category's display name.
    return { ...response, data: { ...response.data, cuisines: response.data.cuisines.map(cuisine => cuisine.id === 'international'
      ? { ...cuisine, names: cuisine.names.map(name => ({ ...name, value: name.value.replace(/\s*\/\s*fitness\s*$/i, '').trim() })) }
      : cuisine) } };
  }

  async getCatalogRecipe(recipeId: string, readOptions: ReadOptions = {}) {
    const params = new URLSearchParams({ language: this.getCurrentLanguage() });
    return this.request<{ success: boolean; recipe: CatalogRecipe }>(`/catalog/recipes/${encodeURIComponent(recipeId)}?${params.toString()}`, { method: 'GET' }, 12000, readOptions);
  }

  async getRecipeCatalog(options: {
    search?: string;
    page?: number;
    limit?: number;
    cuisineId?: string;
    mealType?: CatalogMealCategory | 'lunch' | 'dinner';
    express?: boolean;
    highProtein?: boolean;
    light?: boolean;
    goal?: 'lose_weight' | 'gain_muscle' | 'maintain' | 'balanced';
    dailyCalories?: number;
    dailyProteinGrams?: number;
    includeSnack?: boolean;
    diet?: string;
    maxMinutes?: number;
    allergies?: string[];
    excludedIngredients?: string[];
  } = {}, readOptions: ReadOptions = {}) {
    const params = new URLSearchParams({
      language: this.getCurrentLanguage(),
      page: String(options.page || 1),
      limit: String(options.limit || 50),
    });
    if (options.search?.trim()) params.set('search', options.search.trim());
    if (options.cuisineId && options.cuisineId !== 'all') params.set('cuisineId', options.cuisineId);
    if (options.mealType) params.set('mealType', options.mealType);
    if (options.express) params.set('express', 'true');
    if (options.highProtein) params.set('highProtein', 'true');
    if (options.light) params.set('light', 'true');
    if (options.goal && options.goal !== 'balanced' && Number.isFinite(options.dailyCalories)) {
      params.set('goal', options.goal);
      params.set('dailyCalories', String(options.dailyCalories));
      if (Number.isFinite(options.dailyProteinGrams)) params.set('dailyProteinGrams', String(options.dailyProteinGrams));
      params.set('includeSnack', String(options.includeSnack === true));
    }
    if (options.diet && options.diet !== 'none') params.set('diet', options.diet);
    if (options.maxMinutes) params.set('maxMinutes', String(options.maxMinutes));
    if (options.allergies?.length) params.set('allergies', options.allergies.join(','));
    if (options.excludedIngredients?.length) params.set('excludedIngredients', options.excludedIngredients.join(','));
    return this.request<{ success: boolean; recipes: CatalogRecipe[]; page: number; limit: number; total: number; pages: number }>(`/catalog/recipes?${params.toString()}`, { method: 'GET' }, 12000, readOptions);
  }

  async getRecipeHistory(userId: string, page: number = 1, limit: number = 30, options?: { isImported?: boolean; forceRefresh?: boolean }) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      language: this.getCurrentLanguage(),
    });
    if (options?.isImported !== undefined) {
      params.set('isImported', String(options.isImported));
    }
    return this.request<{ success: boolean; history: any[]; pagination?: { page: number; limit: number; total: number; hasMore: boolean } }>(`/recipe/history/${userId}?${params.toString()}`, {
      method: 'GET',
    }, 60000, options);
  }

  async chatAboutTrackedMeal(input: { title: string; items: import('./mealTracking').PhotoFood[]; message: string; history: import('./personalRecipe').RecipeChatMessage[] }) {
    return this.request<{ action: 'answer' | 'modify' | 'refuse'; reply: string; meal: {title: string; items: import('./mealTracking').PhotoFood[]; nutrition: import('./mealTracking').FoodNutrition | null} | null }>('/recipe/tracking/chat', {
      method: 'POST', body: JSON.stringify({...input, language:this.getCurrentLanguage()}),
    }, 90000);
  }

  async chatAboutRecipe(input: { recipe: any; message: string; history: import('./personalRecipe').RecipeChatMessage[] }) {
    const locale = Localization.getLocales()[0];
    return this.request<{ action: 'answer' | 'modify' | 'refuse'; reply: string; recipe: Record<string, any> | null }>('/recipe/chat', {
      method: 'POST', body: JSON.stringify({ ...input, language: this.getCurrentLanguage(), country: input.recipe.estimatedCost?.country || locale?.regionCode || 'FR', currency: input.recipe.estimatedCost?.currency || locale?.currencyCode || 'EUR' }),
    }, 90000);
  }

  async getRecipeById(id: string, readOptions: ReadOptions = {}) {
    return this.request<{ success: boolean; recipe: any }>(`/recipe/detail/${encodeURIComponent(id)}?language=${encodeURIComponent(this.getCurrentLanguage())}`, {
      method: 'GET',
    }, 12000, readOptions);
  }

  async getPlanningBudgetOptions(servings:number) {
    const locale=Localization.getLocales()[0];
    return this.request<{country:string;currency:string;servings:number;minimum:number;maximum:number;step:number;defaultAmount:number;horizonDays:number}>(`/meal-plans/budget-options?servings=${servings}&country=${encodeURIComponent(locale?.regionCode||'FR')}&currency=${encodeURIComponent(locale?.currencyCode||'EUR')}`);
  }

  async getMealPlan(userId: string, weekStart?: string, preview = false, readOptions: ReadOptions = {}) {
    const params = new URLSearchParams({ language: this.getCurrentLanguage(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (weekStart) params.set('weekStart', weekStart);
    if (preview) params.set('preview', 'true');
    const query = `?${params.toString()}`;
    const response = await this.request<{ success: boolean; plan: MealPlan | null }>(`/meal-plans/user/${userId}${query}`, { method: 'GET' }, 12000, readOptions);
    if (response.data) return {...response,data:{...response.data,plan:await personalMealPlan(response.data.plan,userId)}};
    return response;
  }

  async listMealPlans(userId: string, readOptions: ReadOptions = {}) {
    const response = await this.request<{ success: boolean; plans: MealPlan[] }>(`/meal-plans/user/${userId}/all?language=${encodeURIComponent(this.getCurrentLanguage())}`, { method: 'GET' }, 12000, readOptions);
    if (response.data) return {...response,data:{...response.data,plans:await Promise.all(response.data.plans.map(async plan=>(await personalMealPlan(plan,userId))!))}};
    return response;
  }

  async getMealPlanById(planId: string, userId: string, readOptions: ReadOptions = {}, personal = true) {
    if (!planId || planId === 'undefined' || planId === 'null') {
      return { error: i18n.t('planning.errors.load'), status: 400 } as ApiResponse<{ success: boolean; plan: MealPlan }>;
    }
    const response = await this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}?userId=${encodeURIComponent(userId)}&language=${encodeURIComponent(this.getCurrentLanguage())}`, { method: 'GET' }, 12000, readOptions);
    if (personal && response.data) return {...response,data:{...response.data,plan:(await personalMealPlan(response.data.plan,userId))!}};
    return response;
  }

  async deleteMealPlan(planId: string, userId: string) {
    return this.request<{ success: boolean; deletedPlanId: string }>(`/meal-plans/${encodeURIComponent(planId)}`, {
      method: 'DELETE', body: JSON.stringify({ userId }),
    }, 15000);
  }

  async createMealPlan(input: {
    userId: string;
    weekStart: string;
    mealCount?: number;
    preferences: Record<string, unknown>;
    isSubscribed?: boolean;
    preview?: boolean;
    replaceExisting?: boolean;
  }) {
    const locale = Localization.getLocales()?.[0];
    const preferences = { ...input.preferences, country: input.preferences.country || locale?.regionCode || 'FR',
      currency: input.preferences.currency || locale?.currencyCode || undefined };
    const response = await this.request<{ success: boolean; plan: MealPlan; restored?: boolean }>('/meal-plans/draft', {
      method: 'POST',
      body: JSON.stringify({ ...input, preferences, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: this.getCurrentLanguage() }),
    }, 90000);
    if (response.data?.plan?._id && !response.data.restored) markPlanningReveal(response.data.plan._id);
    return response;
  }

  async addPlannedMeal(planId: string, userId: string, dayIndex: number, mealType: string, recipeId?: string) {
    return this.request<{ success: boolean; plan: MealPlan; slotId: string }>(`/meal-plans/${planId}/meals`, {
      method: 'POST', body: JSON.stringify({ userId, dayIndex, mealType, recipeId, language: this.getCurrentLanguage(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    }, 90000);
  }

  async replaceMeal(planId: string, slotId: string, userId: string) {
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/meals/${slotId}/replace`, {
      method: 'POST', body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: this.getCurrentLanguage(), userId }),
    }, 90000);
  }

  async setPlannedMealRecipe(planId: string, slotId: string, userId: string, recipeId: string) {
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/meals/${slotId}/recipe`, {
      method: 'PUT', body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: this.getCurrentLanguage(), userId, recipeId }),
    }, 15000);
  }

  async materializeMeal(planId: string, slotId: string, userId: string) {
    return this.request<{ success: boolean; plan: MealPlan; recipeId: string }>(`/meal-plans/${planId}/meals/${slotId}/materialize`, {
      method: 'POST', body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: this.getCurrentLanguage(), userId }),
    }, 90000);
  }

  async updatePlannedMeal(planId: string, slotId: string, userId: string, patch: { locked?: boolean; servings?: number; image?: string; preview?: boolean }) {
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/meals/${slotId}`, {
      method: 'PATCH', body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: this.getCurrentLanguage(), userId, ...patch }),
    });
  }

  async deletePlannedMeal(planId: string, slotId: string, userId: string) {
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/meals/${slotId}`, {
      method: 'DELETE', body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: this.getCurrentLanguage(), userId }),
    });
  }

  async reorderPlannedMeals(planId: string, userId: string, orderedSlotIds: string[]) {
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/meals/reorder`, {
      method: 'PATCH', body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: this.getCurrentLanguage(), userId, orderedSlotIds }),
    });
  }

  async movePlannedMeals(planId: string, userId: string, placements: { slotId: string; dayIndex: number; mealType: string }[], updatedAt: string, removedSlotIds: string[] = []) {
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/meals/reorder`, {
      method: 'PATCH', body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: this.getCurrentLanguage(), userId, placements, updatedAt, removedSlotIds }),
    });
  }

  async generateShoppingList(planId: string, userId: string, preview = false) {
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/shopping-list`, {
      method: 'POST', body: JSON.stringify({ language: this.getCurrentLanguage(), userId, preview }),
    }, 15000);
  }

  async addShoppingItem(planId: string, userId: string, name: string, quantity: string, preview = false) {
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/shopping-list/items`, { method: 'POST', body: JSON.stringify({ userId, name, quantity, preview, language: this.getCurrentLanguage() }) });
  }

  async updateShoppingItem(planId: string, itemId: string, userId: string, patch: { checked?: boolean; excluded?: boolean }, preview = false) {
    if (itemId.startsWith('personal:')) {
      const response = await this.getMealPlanById(planId,userId,{},false);
      if (!response.data?.plan) return response;
      await writePersonalShoppingState(userId,planId,itemId,patch);
      return {...response,data:{...response.data,plan:(await personalMealPlan(response.data.plan,userId))!}};
    }
    return this.request<{ success: boolean; plan: MealPlan }>(`/meal-plans/${planId}/shopping-list/${itemId}`, {
      method: 'PATCH', body: JSON.stringify({ language: this.getCurrentLanguage(), userId, ...patch, preview }),
    });
  }

  async deleteRecipe(recipeId: string, userId: string) {
    return this.request<{ success: boolean }>(`/recipe/${recipeId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  }

  async initUser(mobileId: string, timezone?: string) {
    const country = Localization.getLocales()?.[0]?.regionCode || undefined;
    return this.request<{ success: boolean; userId?: string }>('/user/init', {
      method: 'POST',
      body: JSON.stringify({ mobileId, timezone, country, language: this.getCurrentLanguage() }),
    });
  }

  async saveOnboardingAnswers(answers: Record<string, string>, mobileId: string, timezone?: string) {
    const country = Localization.getLocales()?.[0]?.regionCode || undefined;
    return this.request<{ success: boolean; message: string; userId?: string }>('/user/onboarding', {
      method: 'POST',
      body: JSON.stringify({ answers, mobileId, timezone, country, language: this.getCurrentLanguage() }),
    });
  }

  async getAppConfig(timeoutMs?: number) {
    return this.request<{ dailySearchLimit: number; minAppVersion: string }>('/config', {}, timeoutMs);
  }

  async checkHealth(timeoutMs?: number) {
    return this.request<{ status: string }>('/health', { method: 'GET' }, timeoutMs);
  }

  async validatePromoCode(code: string, mobileId?: string) {
    if (!CREATOR_PROMO_CODES_ENABLED) return { data: { isValid: false } };
    return this.request<{ isValid: boolean; discountPercentage?: number; message?: string }>('/promo-code/validate', {
      method: 'POST',
      body: JSON.stringify({ code, mobileId, language: this.getCurrentLanguage() }),
    });
  }

  async markPromoCodeUsed(code: string, mobileId: string) {
    return this.request<{ success: boolean }>('/promo-code/mark-used', {
      method: 'POST',
      body: JSON.stringify({ code, mobileId, language: this.getCurrentLanguage() }),
    });
  }

  async validateImage(imageUrl: string, timeoutMs: number = 4000) {
    return this.request<{ isValid: boolean; details: any }>('/recipe/validate-image', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    }, timeoutMs);
  }

  async selectBestRecipeImage(
    recipe: {
      title: string;
      dishType?: string;
      cuisineStyle?: string;
      mainIngredients?: string[];
    },
    imageUrls: string[],
    timeoutMs: number = 9000,
  ) {
    const userId = await AsyncStorage.getItem('userId');
    return this.request<{
      imageUrl: string | null;
      selectedIndex: number;
      confidence: number;
      reason: string;
      rankings: {
        index: number;
        relevance_score: number;
        is_suitable: boolean;
        is_real_food_photo: boolean;
        has_prominent_text: boolean;
        is_graphic_or_collage: boolean;
      }[];
      candidatesEvaluated: number;
      selectionAdjusted: boolean;
    }>('/recipe/select-image', {
      method: 'POST',
      body: JSON.stringify({ recipe, imageUrls, ...(userId ? { userId } : {}) }),
    }, timeoutMs);
  }

  async importRecipeFromVideo(
    videoUrl: string,
    isSubscribed: boolean = false,
    callbacks?: {
      onProgress?: (progress: number, step?: string) => void;
    }
  ): Promise<ApiResponse<{ success: boolean; recipe: any }>> {
    this.invalidateReadCache();
    let token: string;
    try { token = await getAnonymousSessionToken(); } catch { return { error: i18n.t('common.networkError') }; }
    const userId = await AsyncStorage.getItem('userId');
    const url = `${API_BASE_URL}/recipe/import-from-video`;

    return new Promise((resolve) => {
      const es = new EventSource(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders() as any,
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          url: videoUrl,
          userId,
          isSubscribed,
          language: this.getCurrentLanguage(),
        }),
      });

      let hasResolved = false;

      (es as any).addEventListener('progress', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          callbacks?.onProgress?.(data.progress ?? 0, data.step);
        } catch (e) {
          console.error('[SSE] Parse progress error:', e);
        }
      });

      (es as any).addEventListener('done', (event: any) => {
        this.invalidateReadCache();
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
        this.invalidateReadCache();
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
          this.invalidateReadCache();
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
      formData.append('image', new File(imageUri));
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
    const country = Localization.getLocales()?.[0]?.regionCode || undefined;
    return this.request<{ success: boolean; message: string }>('/user/notification-token', {
      method: 'POST',
      body: JSON.stringify({ mobileId, notificationToken, timezone, country, language: this.getCurrentLanguage() }),
    });
  }

  async updateUserActivity(mobileId: string, timezone?: string) {
    const country = Localization.getLocales()?.[0]?.regionCode || undefined;
    return this.request<{ success: boolean; message: string }>('/user/activity', {
      method: 'POST',
      body: JSON.stringify({ mobileId, timezone, country, language: this.getCurrentLanguage() }),
    });
  }

  async deleteUser(mobileId: string) {
    return this.request<{ success: boolean; message: string }>('/user/delete', {
      method: 'POST',
      body: JSON.stringify({ mobileId }),
    });
  }

  async getFavorites(userId: string, readOptions: ReadOptions = {}) {
    return this.request<{ success: boolean; recipes: any[] }>(`/recipe/favorites/${userId}?language=${encodeURIComponent(this.getCurrentLanguage())}`, {
      method: 'GET',
    }, 60000, readOptions);
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
