import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';
import i18n, { getLanguageLocale } from '../i18n';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PINTEREST_BASE_URL = 'https://www.pinterest.com';
const MAX_PINTEREST_CANDIDATES = 10;
const MAX_AI_CANDIDATES = 5;
const IMAGE_PROBE_TIMEOUT_MS = 1500;
const SEARCH_REQUEST_TIMEOUT_MS = 4000;
const SEARCH_BUDGET_MS = 14000;
const MIN_IMAGE_RANKING_WINDOW_MS = 5000;
const MAX_IMAGE_RANKING_TIMEOUT_MS = 9000;
const IMAGE_SEARCH_CACHE_KEY = '@cookeat_image_search_cache_v1';
// v3 invalide les anciennes sélections qui pouvaient conserver une image avec texte.
const PINTEREST_CACHE_NAMESPACE = 'pinterest-ai-rank-v3';
const SEARCH_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const PINTEREST_STATIC_ASSET_URLS = new Set([
  'https://i.pinimg.com/originals/d5/3b/01/d53b014d86a6b6761bf649a0ed813c2b.png',
]);

type TimestampedValue<T> = { value: T; timestamp: number };
type TimestampedCache<T> = Record<string, TimestampedValue<T>>;

let searchCache: TimestampedCache<string> | null = null;
const inFlightSearches = new Map<string, Promise<string | null>>();

export type RecipeImageSearchInput = string | {
  title: string;
  dishType?: string;
  dish_type?: string;
  cuisineStyle?: string;
  cuisine_style?: string;
  mainIngredients?: string[];
  main_ingredients?: string[];
};

type RecipeImageContext = {
  title: string;
  dishType?: string;
  cuisineStyle?: string;
  mainIngredients?: string[];
};

function normalizedQuery(value: string) {
  return value.trim().toLocaleLowerCase();
}

function normalizeRecipeContext(input: RecipeImageSearchInput): RecipeImageContext {
  if (typeof input === 'string') return { title: input.trim() };
  return {
    title: input.title.trim(),
    dishType: input.dishType || input.dish_type,
    cuisineStyle: input.cuisineStyle || input.cuisine_style,
    mainIngredients: (input.mainIngredients || input.main_ingredients || []).filter(Boolean).slice(0, 8),
  };
}

function pinterestCacheKey(context: RecipeImageContext) {
  return `${PINTEREST_CACHE_NAMESPACE}:${[
    normalizedQuery(context.title),
    normalizedQuery(context.dishType || ''),
    normalizedQuery(context.cuisineStyle || ''),
    ...(context.mainIngredients || []).map(normalizedQuery),
  ].join('|')}`;
}

async function loadCache<T>(key: string): Promise<TimestampedCache<T>> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function trimCache<T>(cache: TimestampedCache<T>) {
  return Object.fromEntries(
    Object.entries(cache)
      .sort(([, a], [, b]) => b.timestamp - a.timestamp)
      .slice(0, MAX_CACHE_ENTRIES),
  );
}

function persistCache<T>(key: string, cache: TimestampedCache<T>) {
  void AsyncStorage.setItem(key, JSON.stringify(trimCache(cache))).catch(() => undefined);
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown) {
  const name = error && typeof error === 'object' && 'name' in error
    ? String(error.name)
    : '';
  return name === 'AbortError' || /aborted|cancel(?:ed|led)/i.test(errorMessage(error));
}

function isTransientNetworkError(error: unknown) {
  return /fetch failed|network request failed|connexion réseau.*perdue|network connection.*lost|timed?\s*out|offline|internet connection/i
    .test(errorMessage(error));
}

async function fetchPinterestPage(url: string, options: RequestInit) {
  try {
    return await fetchWithTimeout(url, options, SEARCH_REQUEST_TIMEOUT_MS);
  } catch (error) {
    // Une perte de connexion iOS est souvent très brève (changement Wi-Fi/4G,
    // réveil radio). Un seul nouvel essai suffit sans multiplier les requêtes.
    if (!isTransientNetworkError(error) || isAbortError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return fetchWithTimeout(url, options, SEARCH_REQUEST_TIMEOUT_MS);
  }
}

function normalizeImageUrl(url: string) {
  return url
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
}

/** Une même photo Pinterest existe en 236x, 474x, 736x et original. */
function pinterestImageFingerprint(url: string) {
  try {
    return new URL(url).pathname.split('/').pop()?.toLowerCase() || url;
  } catch {
    return url;
  }
}

function isValidPinterestImageUrl(url: string, existingImages: string[]) {
  if (!url.startsWith('https://i.pinimg.com/')) return false;
  if (PINTEREST_STATIC_ASSET_URLS.has(url)) return false;

  const fingerprint = pinterestImageFingerprint(url);
  return !existingImages.some((existing) =>
    existing === url || pinterestImageFingerprint(existing) === fingerprint);
}

function pinterestImageScore(url: string) {
  if (url.includes('/originals/')) return 5;
  if (url.includes('/736x/')) return 4;
  if (url.includes('/564x/')) return 3;
  if (url.includes('/474x/')) return 2;
  return 0;
}

async function canUseImage(url: string) {
  try {
    const imageRes = await fetchWithTimeout(url, { method: 'HEAD' }, IMAGE_PROBE_TIMEOUT_MS);
    const contentType = imageRes.headers.get('content-type') ?? '';
    return imageRes.ok && ALLOWED_IMAGE_TYPES.some((type) => contentType.startsWith(type));
  } catch {
    return false;
  }
}

function extractPinterestCandidates(html: string, existingImages: string[]) {
  const normalizedHtml = normalizeImageUrl(html);
  const matches = normalizedHtml.match(/https:\/\/i\.pinimg\.com\/[^"'\s<>()}]+/g) ?? [];
  const bestByFingerprint = new Map<string, string>();

  for (const rawUrl of matches) {
    const imageUrl = rawUrl.replace(/[;,]+$/, '');
    if (!isValidPinterestImageUrl(imageUrl, existingImages)) continue;
    if (pinterestImageScore(imageUrl) === 0) continue;

    const fingerprint = pinterestImageFingerprint(imageUrl);
    const current = bestByFingerprint.get(fingerprint);
    if (!current || pinterestImageScore(imageUrl) > pinterestImageScore(current)) {
      bestByFingerprint.set(fingerprint, imageUrl);
    }
  }

  return [...bestByFingerprint.values()]
    .sort((a, b) => pinterestImageScore(b) - pinterestImageScore(a));
}

async function searchImageFromPinterest(context: RecipeImageContext, existingImages: string[]) {
  const deadline = Date.now() + SEARCH_BUDGET_MS;
  const cacheKey = pinterestCacheKey(context);
  let cachedFallback: string | null = null;

  try {
    searchCache ??= await loadCache<string>(IMAGE_SEARCH_CACHE_KEY);
    const cached = searchCache[cacheKey];
    if (cached && isValidPinterestImageUrl(cached.value, existingImages)) {
      cachedFallback = cached.value;
    }
    if (
      cached
      && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS
      && isValidPinterestImageUrl(cached.value, existingImages)
      && await canUseImage(cached.value)
    ) {
      console.log('[searchImage] source=pinterest-cache');
      return cached.value;
    }

    const searchParams = new URLSearchParams({ q: context.title, rs: 'typed' });
    const searchUrl = `${PINTEREST_BASE_URL}/search/pins/?${searchParams.toString()}`;
    const response = await fetchPinterestPage(searchUrl, {
      headers: {
        'accept-language': `${getLanguageLocale(i18n.language)},en;q=0.8`,
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      },
    });

    if (!response.ok) return null;
    const candidates = extractPinterestCandidates(await response.text(), existingImages);

    // La recherche reste entièrement côté mobile. On sonde les dix premières
    // candidates en parallèle, puis l'API reçoit au maximum cinq vraies images
    // dans un unique jugement multimodal comparatif.
    const probePool = candidates.slice(0, MAX_PINTEREST_CANDIDATES);
    const probeResults = await Promise.all(
      probePool.map(async (imageUrl) => ({ imageUrl, usable: await canUseImage(imageUrl) })),
    );
    const imagesToValidate = probeResults
      .filter(({ usable }) => usable)
      .slice(0, MAX_AI_CANDIDATES)
      .map(({ imageUrl }) => imageUrl);

    if (imagesToValidate.length === 0) return null;

    // Ne lance pas le classement si le modèle n'a plus un vrai créneau pour
    // télécharger et comparer les cinq images.
    const remainingMs = deadline - Date.now();
    if (remainingMs < MIN_IMAGE_RANKING_WINDOW_MS) return null;
    const rankingTimeoutMs = Math.min(MAX_IMAGE_RANKING_TIMEOUT_MS, remainingMs);
    const selection = await apiService.selectBestRecipeImage(context, imagesToValidate, rankingTimeoutMs);
    if (selection.error) {
      console.warn('[searchImage] classement IA indisponible, source=pinterest:', selection.error);
      return null;
    }

    const selected = selection.data?.imageUrl;
    if (selected && !imagesToValidate.includes(selected)) return null;
    const selectedRanking = selection.data?.rankings.find(
      (ranking) => ranking.index === selection.data?.selectedIndex,
    );
    if (selected && (
      !selectedRanking
      || !selectedRanking.is_suitable
      || !selectedRanking.is_real_food_photo
      || selectedRanking.has_prominent_text
      || selectedRanking.is_graphic_or_collage
      || selectedRanking.relevance_score < 60
    )) {
      console.warn('[searchImage] image rejetée par le garde-fou mobile');
      return null;
    }
    if (selected) {
      searchCache[cacheKey] = { value: selected, timestamp: Date.now() };
      persistCache(IMAGE_SEARCH_CACHE_KEY, searchCache);
      console.log('[searchImage] source=pinterest-ai-rank', {
        candidates: selection.data?.candidatesEvaluated,
        selectedIndex: selection.data?.selectedIndex,
        confidence: selection.data?.confidence,
      });
      return selected;
    }

    return null;
  } catch (error) {
    if (isTransientNetworkError(error) || isAbortError(error)) {
      // Incident attendu et récupérable : ne pas déclencher l'overlay rouge
      // Expo via console.error. Le préchargement décidera si le cache est encore
      // exploitable ; sinon l'écran continue simplement sans image.
      console.log('[searchImage] Pinterest temporairement indisponible:', errorMessage(error));
      return cachedFallback;
    }
    console.error('[searchImage] erreur Pinterest inattendue:', errorMessage(error));
    return null;
  }
}

/** Pinterest est volontairement l'unique moteur pendant la phase de test. */
export async function searchImage(input: RecipeImageSearchInput, existingImages: string[]) {
  const context = normalizeRecipeContext(input);
  if (!context.title) return null;
  const key = pinterestCacheKey(context);
  const existing = inFlightSearches.get(key);
  if (existing) {
    const image = await existing;
    return image && isValidPinterestImageUrl(image, existingImages) ? image : null;
  }

  const request = searchImageFromPinterest(context, existingImages);
  inFlightSearches.set(key, request);
  try {
    return await request;
  } finally {
    inFlightSearches.delete(key);
  }
}
