import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { searchImage, type RecipeImageSearchInput } from "../services/image";
import { apiService, type RecipeIdentity } from '../services/api';
import {
  Skeleton,
  RecipeImageSkeleton,
  RecipeTitleSkeleton,
  RecipeStepsSkeleton,
  IngredientItemSkeleton,
  StepItemSkeleton,
} from '../components/Skeleton';
import revenueCatService from '../config/revenuecat';
import recipeStorageService from "../services/recipeStorage";
import favoritesStorageService from "../services/favoritesStorage";
import * as StoreReview from 'expo-store-review';
import { useTranslation } from 'react-i18next';
import analytics from "../services/analytics";
import recipeStreamManager from '../services/recipeStreamManager';
import { completeGenerationLoading } from '../services/generationLoadingCoordinator';
import { font } from '../constants/Layout';
import { GENERIC_RECIPE_IMAGE, isGenericRecipeImage } from '../constants/RecipeImages';
import { contentColumn, useResponsive } from '../hooks/useResponsive';

const IMAGE_HISTORY_LOOKBACK = 30;

function TypewriterText({ text, style, animate = true, speed = 40 }: { text: string; style: any; animate?: boolean; speed?: number }) {
  const [revealedCount, setRevealedCount] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) { setRevealedCount(text.length); return; }
    if (revealedCount >= text.length) return;
    const timer = setTimeout(() => {
      setRevealedCount((prev) => Math.min(prev + 4, text.length));
    }, speed);
    return () => clearTimeout(timer);
  }, [text, revealedCount, speed, animate]);

  return <Text style={style}>{text.substring(0, revealedCount)}</Text>;
}

function FadeInView({ children, style, duration = 400, delay = 0 }: { children: React.ReactNode; style?: any; duration?: number; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

interface Recipe {
  _id?: string;
  id: string;
  title: string;
  difficulty: string;
  cooking_time: string;
  icon: string;
  image: string;
  calories: string;
  lipids: string;
  proteins: string;
  chef_tip?: string;
  servings?: number;
  ingredients?: {
    name: string;
    quantity: string;
    icon: string;
    tags: string[];
  }[];
  steps?: {
    title: string;
    description: string;
  }[];
  language?: string;
  videoUrl?: string;
}

export default function RecipeDetailScreen() {
  // Suit la rotation / le Split View : les anciennes constantes issues de
  // `Dimensions.get('window')` étaient figées au premier import du module.
  const { height, isTablet } = useResponsive();
  // Le héros occupait 40% de la hauteur quel que soit l'appareil ; sur iPhone SE
  // ça ne laissait presque rien au contenu, sur iPad c'était une bannière géante.
  const heroHeight = Math.round(height * (isTablet ? 0.32 : 0.4));
  const { t } = useTranslation();
  const colors = Colors.light;
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isFavorite, setIsFavorite] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [statusBarStyle, setStatusBarStyle] = useState<'light' | 'dark'>('light');
  const [variant, setVariant] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('A');

  const getVideoPlatformInfo = (url: string) => {
    if (!url) return { icon: 'logo-tiktok' as any, label: t('recipeDetail.viewOriginalVideo') };

    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.includes('tiktok.com')) {
      return { icon: 'logo-tiktok' as any, label: t('recipeDetail.viewOnTikTok') };
    }
    if (lowercaseUrl.includes('instagram.com')) {
      return { icon: 'logo-instagram' as any, label: t('recipeDetail.viewOnInstagram') };
    }
    if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
      return { icon: 'logo-youtube' as any, label: t('recipeDetail.viewOnYouTube') };
    }

    return { icon: 'link-outline' as any, label: t('recipeDetail.viewOriginalVideo') };
  };

  useEffect(() => {
    const fetchVariant = async () => {
      const v = await analytics.getOnboardingVariant();
      setVariant(v);
    };
    fetchVariant();
  }, []);

  const isStreaming = params.streaming === 'true';
  const isOnboarding = params.isOnboarding === 'true';
  const prefetchStreamId = typeof params.prefetchStreamId === 'string' ? params.prefetchStreamId : null;
  const shouldSearchImage = params.showGenerateButton !== 'false' || params.isHistory === 'true';
  const recipeIdParam = (params.recipeId as string) || (params.id as string);

  const [recipe, setRecipe] = useState<Recipe>(() => {
    if (isStreaming) {
      return {
        id: '', title: '', difficulty: '', cooking_time: '',
        icon: '', image: '', calories: '', lipids: '', proteins: '',
        ingredients: [], steps: []
      };
    }
    try {
      if (params.recipe && !recipeIdParam) {
        if (typeof params.recipe === 'string') {
          return JSON.parse(params.recipe);
        }
        return params.recipe as unknown as Recipe;
      }
      if (recipeIdParam) {
        return {
          id: recipeIdParam, title: '', difficulty: '', cooking_time: '',
          icon: '', image: '', calories: '', lipids: '', proteins: '',
          ingredients: [], steps: []
        };
      }
    } catch (e) {
      console.error('Erreur lors du parsing de la recette dans recipe-detail:', e);
    }
    return {
      id: '', title: '', difficulty: '', cooking_time: '',
      icon: '', image: '', calories: '', lipids: '', proteins: '',
      ingredients: [], steps: []
    };
  });

  useEffect(() => {
    if (!recipe.id || !recipe.title) return;

    // Cet écran sert aussi à relire l'historique et les recettes importées :
    // sans ce garde, `recipe_generated` comptait des consultations et gonflait
    // artificiellement le volume de générations.
    if (params.isHistory === 'true') {
      analytics.track('recipe_viewed', {
        recipe_id: recipe.id,
        is_imported: Boolean((recipe as any).videoUrl),
      });
      return;
    }

    analytics.track('recipe_generated', {
      recipe_id: recipe.id,
      is_first_time: params.isFirstGeneration === 'true'
    });
    analytics.markFeatureUsed('generate');
    analytics.trackFirstAction('generate');

    if (params.isOnboarding === 'true') {
      analytics.track('onboarding_generation_demo_completed', {
        demo_role: params.onboardingDemoRole || 'primary',
        recipe_id: recipe.id,
      });
    }
  }, [
    recipe.id,
    recipe.title,
    params.isFirstGeneration,
    params.isHistory,
    params.isOnboarding,
    params.onboardingDemoRole,
  ]);

  // Reset fallback flag when recipe changes (e.g. navigation to another recipe)
  useEffect(() => {
    imageErrorFallbackTriedRef.current = false;
  }, [recipe.id]);

  const [loadingRecipe, setLoadingRecipe] = useState(isStreaming || !!recipeIdParam);
  const [loadingSteps, setLoadingSteps] = useState(isStreaming || !recipe.steps?.length);
  const [streamingTitleAndIngredients, setStreamingTitleAndIngredients] = useState(isStreaming);
  const [streamingSteps, setStreamingSteps] = useState(isStreaming);
  const [isFirstGeneration, setIsFirstGeneration] = useState(params.isFirstGeneration === 'true');
  const [loadingImage, setLoadingImage] = useState(isStreaming || !recipe.image);
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string | null>(null);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [isReloadingImage, setIsReloadingImage] = useState(false);
  const [isGeneratingNewRecipe, setIsGeneratingNewRecipe] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false);
  const firstTime = useRef(true);
  const firstTimeImage = useRef(true);
  const sseCloseRef = useRef<(() => void) | null>(null);
  const streamSessionIdRef = useRef(0);
  const savedRecipeIdRef = useRef<string | null>(null);
  const sessionRecipeIdMapRef = useRef<Map<number, string>>(new Map());
  const pendingImagesBySessionRef = useRef<Map<number, string>>(new Map());
  const lockedIdentityBySessionRef = useRef<Map<number, RecipeIdentity>>(new Map());
  const imageSearchTitleBySessionRef = useRef<Map<number, string>>(new Map());
  const regenerationLoadingRef = useRef<Map<number, {
    key: string;
    recipeDone: boolean;
    imageResolved: boolean;
  }>>(new Map());
  const imageErrorFallbackTriedRef = useRef(false);
  const reviewRequestedForRecipeRef = useRef<string | null>(null);

  const markRegenerationLoading = useCallback((
    sessionId: number,
    part: 'recipe' | 'image' | 'all',
  ) => {
    const status = regenerationLoadingRef.current.get(sessionId);
    if (!status) return;
    if (part === 'recipe' || part === 'all') status.recipeDone = true;
    if (part === 'image' || part === 'all') status.imageResolved = true;
    if (!status.recipeDone || !status.imageResolved) return;
    regenerationLoadingRef.current.delete(sessionId);
    completeGenerationLoading(status.key);
    setIsModalActive(false);
  }, []);

  useEffect(() => {
    setDisplayedImageUrl(null);
  }, [recipe.image]);

  const saveImageForSession = useCallback((sessionId: number, image: string) => {
    const recipeId = sessionRecipeIdMapRef.current.get(sessionId);
    if (recipeId) {
      apiService.updateRecipeImage(recipeId, image).catch(() => { });
      recipeStorageService.cacheRecipeImage(recipeId, image);
    } else {
      pendingImagesBySessionRef.current.set(sessionId, image);
    }
  }, []);

  const registerSessionRecipeId = useCallback((sessionId: number, recipeId: string) => {
    if (sessionRecipeIdMapRef.current.get(sessionId) === recipeId) return;
    sessionRecipeIdMapRef.current.set(sessionId, recipeId);
    const pendingImage = pendingImagesBySessionRef.current.get(sessionId);
    if (pendingImage) {
      pendingImagesBySessionRef.current.delete(sessionId);
      apiService.updateRecipeImage(recipeId, pendingImage).catch(() => { });
      recipeStorageService.cacheRecipeImage(recipeId, pendingImage);
    }
  }, []);

  const goToIngredientListSafely = useCallback(() => {
    router.replace({
      pathname: '/ingredient-list',
      params: params.isOnboarding === 'true' ? { isOnboarding: 'true' } : {},
    });
  }, [params.isOnboarding, router]);

  const getHistoryImageUrls = useCallback(async (): Promise<string[]> => {
    try {
      const storedRecipes = await recipeStorageService.getStoredRecipes();
      const recentStoredRecipes = [...storedRecipes]
        .sort((a: any, b: any) => {
          const timeA = Date.parse(a?.createdAt ?? '');
          const timeB = Date.parse(b?.createdAt ?? '');
          const safeA = Number.isFinite(timeA) ? timeA : 0;
          const safeB = Number.isFinite(timeB) ? timeB : 0;
          return safeB - safeA;
        })
        .slice(0, IMAGE_HISTORY_LOOKBACK);

      const historyImages = recentStoredRecipes
        .map((item: any) => item?.recipe?.image)
        .filter((img: unknown): img is string =>
          typeof img === 'string' && !isGenericRecipeImage(img)
        );

      // Inclure l'image courante évite de la réutiliser pendant une régénération
      const currentImage = isGenericRecipeImage(recipe.image) ? [] : [recipe.image];
      return Array.from(new Set([...historyImages, ...currentImage]));
    } catch {
      return recipe.image ? [recipe.image] : [];
    }
  }, [recipe.image]);

  const recipeImageContext = useCallback((source: Partial<Recipe>): RecipeImageSearchInput => ({
    title: source.title || '',
    mainIngredients: source.ingredients?.map((ingredient) => ingredient.name).filter(Boolean) || [],
  }), []);

  const fetchUniqueImage = useCallback(async (input: RecipeImageSearchInput) => {
    const existingImages = await getHistoryImageUrls();
    return searchImage(input, existingImages);
  }, [getHistoryImageUrls]);

  const handleImageError = useCallback(() => {
    setLoadingImage(false);
    if (imageErrorFallbackTriedRef.current) {
      setRecipe((prev) => ({ ...prev, image: '' }));
      return;
    }
    imageErrorFallbackTriedRef.current = true;
    if (!recipe.title) {
      setRecipe((prev) => ({ ...prev, image: '' }));
      return;
    }
    fetchUniqueImage(recipeImageContext(recipe)).then((newImage) => {
      if (newImage) {
        setRecipe((prev) => ({ ...prev, image: newImage }));
        if (recipe.id) {
          apiService.updateRecipeImage(recipe.id, newImage).catch(() => { });
          recipeStorageService.cacheRecipeImage(recipe.id, newImage);
        }
      } else {
        setRecipe((prev) => ({ ...prev, image: '' }));
      }
    }).catch(() => {
      setRecipe((prev) => ({ ...prev, image: '' }));
    });
  }, [recipe, fetchUniqueImage, recipeImageContext]);

  const applyStreamSnapshot = useCallback((snapshot: { recipe: any; steps: any[]; isFirstGeneration?: boolean; isDone: boolean; error?: string; imageResolved?: boolean }, sessionId?: number) => {
    const r = snapshot.recipe || {};

    if (r.id && typeof sessionId === 'number') {
      registerSessionRecipeId(sessionId, r.id);
    }

    if (typeof sessionId === 'number' && streamSessionIdRef.current !== sessionId) return;
    if (r && typeof r === 'object' && Object.keys(r).length > 0) {
      setRecipe((prev) => ({ ...prev, ...r }));
      if (r.title) setLoadingRecipe(false);
    }

    // En préchargement, RecipeStreamManager est l'unique propriétaire de la
    // recherche d'image. Relancer une recherche ici provoquait le changement
    // visible entre deux photos différentes pour une même recette.
    if (snapshot.imageResolved && !r.image) setLoadingImage(false);

    if (Array.isArray(snapshot.steps) && snapshot.steps.length > 0) {
      setRecipe((prev) => ({ ...prev, steps: snapshot.steps }));
      setStreamingTitleAndIngredients(false);
      setLoadingSteps(false);
    }

    if (typeof snapshot.isFirstGeneration === 'boolean') {
      setIsFirstGeneration(snapshot.isFirstGeneration);
    }

    if (snapshot.isDone) {
      setStreamingTitleAndIngredients(false);
      setStreamingSteps(false);
    }
  }, [registerSessionRecipeId]);

  const applyStreamSnapshotRef = useRef(applyStreamSnapshot);
  applyStreamSnapshotRef.current = applyStreamSnapshot;

  const fetchUniqueImageRef = useRef(fetchUniqueImage);
  fetchUniqueImageRef.current = fetchUniqueImage;

  const lockedRecipeFields = useCallback((sessionId: number) => {
    const identity = lockedIdentityBySessionRef.current.get(sessionId);
    if (!identity) return {};
    return {
      title: identity.title,
      ...(identity.dish_type ? { dish_type: identity.dish_type } : {}),
      ...(identity.cuisine_style ? { cuisine_style: identity.cuisine_style } : {}),
    };
  }, []);

  const startImageSearchForSession = useCallback((sessionId: number, input: RecipeImageSearchInput) => {
    const title = typeof input === 'string' ? input : input.title;
    if (!title || imageSearchTitleBySessionRef.current.has(sessionId)) return;
    imageSearchTitleBySessionRef.current.set(sessionId, title);
    firstTimeImage.current = false;
    setLoadingImage(true);

    fetchUniqueImageRef.current(input).then(async (image) => {
      if (!image) {
        if (streamSessionIdRef.current === sessionId) {
          setLoadingImage(false);
          markRegenerationLoading(sessionId, 'image');
        }
        return;
      }
      const prefetched = await Image.prefetch(image, 'memory-disk');
      if (!prefetched) {
        if (streamSessionIdRef.current === sessionId) {
          setLoadingImage(false);
          markRegenerationLoading(sessionId, 'image');
        }
        return;
      }
      saveImageForSession(sessionId, image);
      if (streamSessionIdRef.current !== sessionId) return;
      setRecipe((prev) => ({ ...prev, image }));
      markRegenerationLoading(sessionId, 'image');
    }).catch(() => {
      if (streamSessionIdRef.current === sessionId) {
        setLoadingImage(false);
        markRegenerationLoading(sessionId, 'image');
      }
    });
  }, [markRegenerationLoading, saveImageForSession]);

  // SSE streaming: lance la génération progressive si mode streaming
  useEffect(() => {
    if (!isStreaming) return;

    if (prefetchStreamId) {
      const prefetchSessionId = ++streamSessionIdRef.current;
      const initialSnapshot = recipeStreamManager.getSnapshot(prefetchStreamId);
      if (initialSnapshot) {
        applyStreamSnapshotRef.current(initialSnapshot, prefetchSessionId);
      }

      const unsubscribe = recipeStreamManager.subscribe(prefetchStreamId, (snapshot) => {
        if (snapshot.error) {
          setStreamingTitleAndIngredients(false);
          setStreamingSteps(false);
          setLoadingRecipe(false);
          setLoadingSteps(false);
          Alert.alert(t('recipeDetail.error'), snapshot.error);
          return;
        }
        applyStreamSnapshotRef.current(snapshot, prefetchSessionId);
      });

      return () => {
        unsubscribe();
      };
    }

    const preferencesParam = params.preferences as string;
    let preferences = {
      dishType: 'all', duration: 'all', servings: 2,
      cuisineStyle: 'all' as string | string[], diet: 'none',
      goal: 'neutral', equipments: [] as string[], allergies: [] as string[],
      allowOtherIngredients: false
    };
    if (preferencesParam) {
      try { preferences = JSON.parse(preferencesParam); } catch { /* keep defaults */ }
    }

    const ingredientsParam = params.ingredients as string;
    if (!ingredientsParam) {
      Alert.alert(t('recipeDetail.error'), t('recipeDetail.unableToGetIngredients'));
      goToIngredientListSafely();
      return;
    }

    const streamSessionId = ++streamSessionIdRef.current;
    const { close } = apiService.generateRecipeStream(
      ingredientsParam,
      preferences.dishType,
      preferences.duration,
      preferences.servings,
      Array.isArray(preferences.cuisineStyle) ? preferences.cuisineStyle.join(', ') : preferences.cuisineStyle,
      preferences.diet,
      preferences.goal || 'neutral',
      preferences.equipments || [],
      preferences.allergies || [],
      preferences.allowOtherIngredients,
      isSubscribed,
      {
        onRecipeIdentity: ({ identity }) => {
          if (streamSessionIdRef.current !== streamSessionId || !identity?.title) return;
          lockedIdentityBySessionRef.current.set(streamSessionId, identity);
          setRecipe((prev) => ({ ...prev, ...lockedRecipeFields(streamSessionId) }));
          setLoadingRecipe(false);
          startImageSearchForSession(streamSessionId, identity);
        },
        onRecipeChunk: (partial) => {
          if (streamSessionIdRef.current !== streamSessionId) return;
          const r = partial?.recipe || partial;
          if (r && typeof r === 'object') {
            if (r.id) registerSessionRecipeId(streamSessionId, r.id);
            const incoming = { ...r };
            if (!lockedIdentityBySessionRef.current.has(streamSessionId)) delete incoming.title;
            setRecipe((prev) => ({ ...prev, ...incoming, ...lockedRecipeFields(streamSessionId) }));
            if (r.title && lockedIdentityBySessionRef.current.has(streamSessionId)) {
              setLoadingRecipe(false);
            }
            if (Array.isArray(r.steps) && r.steps.length > 0) {
              setStreamingTitleAndIngredients(false);
              setLoadingSteps(false);
            }
          }
        },
        onRecipe: (data) => {
          registerSessionRecipeId(streamSessionId, data.recipe.id);
          if (streamSessionIdRef.current !== streamSessionId) return;
          setRecipe((prev) => ({ ...prev, ...data.recipe, ...lockedRecipeFields(streamSessionId) }));
          setLoadingRecipe(false);
          setStreamingTitleAndIngredients(false);
          setIsFirstGeneration(data.isFirstGeneration);
          if (Array.isArray(data.recipe.steps) && data.recipe.steps.length > 0) {
            setLoadingSteps(false);
          }
          startImageSearchForSession(streamSessionId, recipeImageContext(data.recipe));
        },
        onStepsChunk: (partial) => {
          if (streamSessionIdRef.current !== streamSessionId) return;
          const steps = partial?.details?.steps || partial?.steps;
          if (Array.isArray(steps) && steps.length > 0) {
            setRecipe((prev) => ({ ...prev, steps }));
            setLoadingSteps(false);
          }
        },
        onSteps: (data) => {
          if (streamSessionIdRef.current !== streamSessionId) return;
          setRecipe((prev) => ({ ...prev, steps: data.steps }));
          setLoadingSteps(false);
          setStreamingSteps(false);
        },
        onDone: (data) => {
          if (data?.id) registerSessionRecipeId(streamSessionId, data.id);
        },
        onError: (message) => {
          if (streamSessionIdRef.current !== streamSessionId) return;
          Alert.alert(t('recipeDetail.error'), message);
          setStreamingTitleAndIngredients(false);
          setStreamingSteps(false);
          setLoadingRecipe(false);
          setLoadingSteps(false);
          goToIngredientListSafely();
        }
      }
    );

    sseCloseRef.current = close;
    return () => { close(); };
  }, [goToIngredientListSafely, isStreaming, lockedRecipeFields, params.ingredients, params.preferences, prefetchStreamId, recipeImageContext, registerSessionRecipeId, startImageSearchForSession]);

  useFocusEffect(useCallback(() => {
    const checkSubscriptionStatus = async () => {
      await revenueCatService.invalidateCache();
      const status = await revenueCatService.getSubscriptionStatus();
      setIsSubscribed(status.isSubscribed);
    };
    checkSubscriptionStatus();
  }, []));

  // Charger la recette via API quand on a seulement l'ID (évite la limite de taille des params)
  useEffect(() => {
    if (!recipeIdParam || isStreaming) return;
    apiService.getRecipeById(recipeIdParam)
      .then((response) => {
        if (response.data?.recipe) {
          const fullRecipe = {
            ...response.data.recipe,
            id: response.data.recipe.id || recipeIdParam,
          };
          setRecipe(fullRecipe);
          setLoadingRecipe(false);
          setLoadingSteps(!(fullRecipe.steps?.length));
          if (fullRecipe.steps?.length) setLoadingSteps(false);
          if (fullRecipe.image) setLoadingImage(false);
          savedRecipeIdRef.current = fullRecipe.id;
        }
      })
      .catch((error) => {
        console.error('Erreur lors du chargement de la recette:', error);
        setLoadingRecipe(false);
        Alert.alert(t('recipeDetail.error'), t('recipeDetail.unableToGenerateRecipe'));
      });
  }, [recipeIdParam, isStreaming]);

  useEffect(() => {
    if (params.showGenerateButton === 'false')
      analytics.track('recipe_detail_viewed');
  }, []);

  useEffect(() => {
    const isCompleteRecipe =
      Boolean(recipe.id && recipe.title) &&
      (isGenericRecipeImage(recipe.image) || displayedImageUrl === recipe.image) &&
      Boolean(recipe.steps?.length) &&
      !loadingRecipe &&
      !loadingSteps &&
      !loadingImage &&
      !streamingTitleAndIngredients &&
      !streamingSteps &&
      !isGeneratingNewRecipe;

    if (!isCompleteRecipe) return;
    if (reviewRequestedForRecipeRef.current === recipe.id) return;

    reviewRequestedForRecipeRef.current = recipe.id;
    const timer = setTimeout(async () => {
      try {
        if (AppState.currentState !== 'active') return;
        if (await StoreReview.hasAction()) {
          analytics.track('recipe_review_requested', {
            recipe_id: recipe.id,
            during_onboarding: isOnboarding,
          });
          await StoreReview.requestReview();
        }
      } catch (e) {
        console.warn('Store review request skipped:', e);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [
    isOnboarding,
    recipe.id,
    recipe.title,
    recipe.image,
    displayedImageUrl,
    recipe.steps,
    loadingRecipe,
    loadingSteps,
    loadingImage,
    streamingTitleAndIngredients,
    streamingSteps,
    isGeneratingNewRecipe,
  ]);

  useEffect(() => {
    // En mode streaming, on attend les données complètes via WS
    if (isStreaming) return;
    if (loadingRecipe) return;
    if (isGeneratingNewRecipe) return;
    const effectSessionId = streamSessionIdRef.current;

    if (!recipe.id || !recipe.title) {
      if (!firstTime.current) return;
      firstTime.current = false;
      Alert.alert(
        t('recipeDetail.error'),
        t('recipeDetail.unableToGenerateRecipe'),
        [{ text: 'OK', onPress: goToIngredientListSafely }]
      );
      return;
    }

    // Charger l'image si nécessaire
    if (!recipe.image && firstTimeImage.current && recipe.title && shouldSearchImage) {
      firstTimeImage.current = false;
      fetchUniqueImage(recipeImageContext(recipe)).then((image) => {
        if (streamSessionIdRef.current !== effectSessionId) return;
        if (image) {
          setRecipe((prevRecipe) => ({ ...prevRecipe, image }));
          if (recipe.id) {
            apiService.updateRecipeImage(recipe.id, image).catch(() => { });
            recipeStorageService.cacheRecipeImage(recipe.id, image);
          }
        } else {
          setLoadingImage(false);
        }
      }).catch((error) => {
        if (streamSessionIdRef.current !== effectSessionId) return;
        console.error('Erreur lors du chargement de l\'image:', error);
        setLoadingImage(false);
      });
    } else if (!recipe.image && !shouldSearchImage) {
      if (streamSessionIdRef.current !== effectSessionId) return;
      setLoadingImage(false);
    }
  }, [recipe, isGeneratingNewRecipe, shouldSearchImage]);

  useEffect(() => {
    if (!recipe.id || !recipe.title) return;
    if (!recipe.steps || recipe.steps.length === 0) return;
    // Une recherche terminée sans résultat reste une recette valide : elle sera
    // sauvegardée sans URL et affichera l'illustration locale générique.
    if (loadingImage) return;
    if (streamingTitleAndIngredients || streamingSteps) return;
    if (isGeneratingNewRecipe) return;
    if (savedRecipeIdRef.current === recipe.id) return;

    savedRecipeIdRef.current = recipe.id;

    recipeStorageService.saveGeneratedRecipe(recipe, params.ingredients as string[]);

    apiService.saveRecipe(recipe)
      .then((response) => {
        if (response.data?.success) {
          setRecipe((prev) => ({ ...prev, _id: response.data!.recipe._id }));
        }
      })
      .catch((error) => {
        console.error('Erreur lors de la sauvegarde de la recette:', error);
      });
  }, [recipe, loadingImage, streamingTitleAndIngredients, streamingSteps, isGeneratingNewRecipe, params.ingredients]);

  useEffect(() => {
    if (!recipe.id) return;
    const checkFavoriteStatus = async () => {
      const isFavorite = await favoritesStorageService.isFavorite(recipe.id);
      setIsFavorite(isFavorite);
    };
    checkFavoriteStatus();
  }, [recipe.id]);

  const handleOnboardingContinue = async () => {
    // Une étape d'onboarding peut imposer explicitement la suite du tunnel
    // (c'est le cas de l'aha moment d'import, qui n'est pas rattaché à une
    // variante). Elle prime sur le routage par variante ci-dessous.
    if (typeof params.onboardingNext === 'string' && params.onboardingNext) {
      router.replace(params.onboardingNext as any);
      return;
    }

    const variant = await analytics.getOnboardingVariant();
    if (variant === 'B') {
      router.push({ pathname: '/paywall', params: { source: 'onboarding_variant_b' } });
    } else if (variant === 'E' || variant === 'F') {
      // On reprend le flux mono-écran à l'étape tutoriel (step 1), juste après
      // l'aha moment (step 0) d'où la caméra a été lancée.
      router.replace({ pathname: '/onboarding/fastOnboarding', params: { initialStep: '1' } });
    } else {
      router.replace('/onboarding/personalizedRecipes');
    }
  };

  const handleBackPress = () => {
    if (params.isOnboarding === 'true') {
      handleOnboardingContinue();
    } else {
      router.back();
    }
  };

  const handleOpenVideo = () => {
    if (recipe.videoUrl) {
      Linking.openURL(recipe.videoUrl).catch((err) => {
        console.error("Impossible d'ouvrir l'URL:", err);
        Alert.alert(t('common.error'), t('recipeDetail.unableToOpenVideo'));
      });
    }
  };

  const handleChangeImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false, // Plus besoin du base64
      });

      if (!result.canceled && result.assets[0].uri) {
        setIsUpdatingImage(true);
        const imageUri = result.assets[0].uri;

        // Appel API pour mettre à jour l'image (si on a un _id ou id)
        if (recipe.id) {
          const response = await apiService.updateRecipeImage(recipe.id, imageUri);
          if (response.data?.success && response.data.recipe.image) {
            const serverImageUrl = response.data.recipe.image;
            setRecipe(prev => ({ ...prev, image: serverImageUrl }));
            // Mettre à jour aussi dans le storage local
            recipeStorageService.saveGeneratedRecipe({ ...recipe, image: serverImageUrl }, params.ingredients as string[]);
          } else {
            Alert.alert(t('common.error'), t('recipeDetail.imageUpdateError'));
          }
        } else {
          // Si la recette n'est pas encore sauvegardée, on met juste à jour l'état local avec l'URI temporaire
          setRecipe(prev => ({ ...prev, image: imageUri }));
        }
      }
    } catch (error) {
      console.error('Erreur lors du choix de l\'image:', error);
      Alert.alert(t('common.error'), t('recipeDetail.imagePickError'));
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const handleReloadRecipeImage = async () => {
    if (!__DEV__ || !recipe.title || isReloadingImage) return;

    setIsReloadingImage(true);
    try {
      // getHistoryImageUrls inclut l'image courante : la recherche ne peut donc
      // pas simplement rendre la même URL depuis le cache du titre.
      const image = await fetchUniqueImage(recipeImageContext(recipe));
      if (!image) {
        if (!recipe.image) setLoadingImage(false);
        return;
      }

      const prefetched = await Image.prefetch(image, 'memory-disk');
      if (!prefetched) {
        if (!recipe.image) setLoadingImage(false);
        return;
      }

      setRecipe((prev) => ({ ...prev, image }));
      imageErrorFallbackTriedRef.current = false;
      if (recipe.id) {
        apiService.updateRecipeImage(recipe.id, image).catch(() => undefined);
        recipeStorageService.cacheRecipeImage(recipe.id, image);
      }
    } catch {
      if (!recipe.image) setLoadingImage(false);
    } finally {
      setIsReloadingImage(false);
    }
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // Si on a scrollé plus que la moitié de l'image, on passe en mode sombre (icônes noires)
    if (offsetY > heroHeight * 0.9) {
      setStatusBarStyle('dark');
    } else {
      setStatusBarStyle('light');
    }
  };

  const handleLikeRecipe = () => {
    if (!recipe._id) {
      Alert.alert(t('common.error'), t('recipeDetail.likeError'));
      return;
    }
    else {
      apiService.likeRecipe(recipe._id)
        .then((response) => {
          setIsLiked(true);
        })
        .catch((error) => {
          console.error('Erreur lors du like de la recette:', error);
        });
    };
  }

  const handleAddToFavorites = async () => {
    try {
      if (await favoritesStorageService.isFavorite(recipe.id)) {
        await favoritesStorageService.removeFromFavorites(recipe.id);
        setIsFavorite(false);
        return;
      }
      else {
        await favoritesStorageService.addToFavorites(recipe);
        setIsFavorite(true);
        analytics.track('recipe_saved', {
          recipe_id: recipe.id
        });
        Alert.alert(t('recipeDetail.success'), t('recipeDetail.recipeAddedToFavorites'));
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout aux favoris:', error);
      Alert.alert(t('recipeDetail.error'), t('recipeDetail.unableToAddToFavorites'));
    }
  };

  const handleShare = async () => {
    try {
      // const recipeUrl = 'https://cookeat.ai';
      const ingredientLines = (recipe.ingredients || [])
        .filter((ingredient) => ingredient?.name)
        .map((ingredient) => `- ${ingredient.name}${ingredient.quantity ? ` (${ingredient.quantity})` : ''}`);
      const stepLines = (recipe.steps || [])
        .filter((step) => step?.title || step?.description)
        .map((step, index) => {
          const stepTitle = step.title ? step.title.trim() : '';
          const stepDescription = step.description ? step.description.trim() : '';
          if (stepTitle && stepDescription) return `${index + 1}. ${stepTitle}: ${stepDescription}`;
          return `${index + 1}. ${stepTitle || stepDescription}`;
        });
      const details = [
        recipe.cooking_time ? `⏱️ ${recipe.cooking_time}` : null,
        recipe.difficulty ? `💪 ${translateDifficulty(recipe.difficulty)}` : null,
        recipe.servings ? `🍽️ ${recipe.servings} ${t('recipeDetail.servings').toLowerCase()}` : null,
      ].filter(Boolean);

      const messageSections = [
        `🍽️ ${recipe.title}`,
        details.length ? details.join(' • ') : null,
        ingredientLines.length ? `${t('recipeDetail.ingredients')}:\n${ingredientLines.join('\n')}` : null,
        stepLines.length ? `${t('recipeDetail.steps')}:\n${stepLines.join('\n')}` : null,
        recipe.chef_tip ? `${t('recipeDetail.chef_tip')}:\n${recipe.chef_tip}` : null,
        // `\n${recipeUrl}`
      ].filter(Boolean);

      const message = messageSections.join('\n\n');

      const result = await Share.share({
        message,
        title: recipe.title,
      });

      if (result.action === Share.sharedAction) {
        analytics.track('recipe_shared', {
          recipe_id: recipe.id
        });
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '-';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleGenerateRecipe = async () => {
    await revenueCatService.invalidateCache();
    if (!(await revenueCatService.getSubscriptionStatus()).isSubscribed) {
      const canGenerate = await revenueCatService.useFreeGeneration();
      if (!canGenerate) {
        router.push({ pathname: '/paywall', params: { source: 'free_generation_used_detail' } });
        return;
      }
    }

    try {
      setIsGeneratingNewRecipe(true);
      setLoadingRecipe(true);
      setLoadingSteps(true);
      setStreamingTitleAndIngredients(true);
      setStreamingSteps(true);
      setLoadingImage(true);
      setIsLiked(false);
      setIsFavorite(false);
      setIsModalActive(true);
      const streamSessionId = ++streamSessionIdRef.current;
      const loadingCompletionKey = `recipe-regeneration-${streamSessionId}-${Date.now()}`;
      regenerationLoadingRef.current.set(streamSessionId, {
        key: loadingCompletionKey,
        recipeDone: false,
        imageResolved: false,
      });
      router.push({
        pathname: '/recipe-loading-modal',
        params: {
          durationMs: '10000',
          dismissOnly: 'true',
          completionKey: loadingCompletionKey,
          maxWaitMs: '45000',
        },
      });
      // Même limite que le loader : évite de laisser le contenu sous-jacent
      // bloqué si le système ferme le modal par son filet de sécurité.
      setTimeout(() => {
        if (!regenerationLoadingRef.current.has(streamSessionId)) return;
        regenerationLoadingRef.current.delete(streamSessionId);
        setIsModalActive(false);
      }, 45500);
      setRecipe({
        id: '',
        title: '',
        difficulty: '',
        cooking_time: '',
        icon: '',
        image: '',
        calories: '',
        lipids: '',
        proteins: '',
        ingredients: [],
        steps: [],
      });

      const ingredientsParam = params.ingredients as string;
      if (!ingredientsParam) {
        Alert.alert(t('recipeDetail.error'), t('recipeDetail.unableToGetIngredients'));
        setIsGeneratingNewRecipe(false);
        return;
      }

      const preferencesParam = params.preferences as string;
      let preferences = {
        dishType: 'all', duration: 'all', servings: 2,
        cuisineStyle: ['all'] as string | string[], diet: 'none',
        goal: 'neutral', equipments: [] as string[], allergies: [] as string[],
        allowOtherIngredients: false
      };
      if (preferencesParam) {
        try { preferences = JSON.parse(preferencesParam); } catch { /* keep defaults */ }
      }

      sseCloseRef.current?.();
      firstTimeImage.current = true;
      savedRecipeIdRef.current = null;
      imageSearchTitleBySessionRef.current.delete(streamSessionId);
      lockedIdentityBySessionRef.current.delete(streamSessionId);

      const { close } = apiService.generateRecipeStream(
        ingredientsParam,
        preferences.dishType,
        preferences.duration,
        preferences.servings,
        Array.isArray(preferences.cuisineStyle) ? preferences.cuisineStyle.join(', ') : preferences.cuisineStyle,
        preferences.diet,
        preferences.goal || 'neutral',
        preferences.equipments || [],
        preferences.allergies || [],
        preferences.allowOtherIngredients,
        isSubscribed,
        {
          onRecipeIdentity: ({ identity }) => {
            if (streamSessionIdRef.current !== streamSessionId || !identity?.title) return;
            lockedIdentityBySessionRef.current.set(streamSessionId, identity);
            setRecipe((prev) => ({ ...prev, ...lockedRecipeFields(streamSessionId) }));
            setLoadingRecipe(false);
            setIsGeneratingNewRecipe(false);
            startImageSearchForSession(streamSessionId, identity);
          },
          onRecipeChunk: (partial) => {
            if (streamSessionIdRef.current !== streamSessionId) return;
            const r = partial?.recipe || partial;
            if (r && typeof r === 'object') {
              if (r.id) registerSessionRecipeId(streamSessionId, r.id);
              const incoming = { ...r };
              if (!lockedIdentityBySessionRef.current.has(streamSessionId)) delete incoming.title;
              setRecipe((prev) => ({ ...prev, ...incoming, ...lockedRecipeFields(streamSessionId) }));
              if (r.title && lockedIdentityBySessionRef.current.has(streamSessionId)) {
                setLoadingRecipe(false);
                setIsGeneratingNewRecipe(false);
              }
              if (Array.isArray(r.steps) && r.steps.length > 0) {
                setStreamingTitleAndIngredients(false);
                setLoadingSteps(false);
              }
            }
          },
          onRecipe: (data) => {
            registerSessionRecipeId(streamSessionId, data.recipe.id);
            if (streamSessionIdRef.current !== streamSessionId) return;
            setRecipe((prev) => ({ ...prev, ...data.recipe, ...lockedRecipeFields(streamSessionId) }));
            setLoadingRecipe(false);
            setStreamingTitleAndIngredients(false);
            setIsGeneratingNewRecipe(false);
            setIsFirstGeneration(data.isFirstGeneration);
            setIsLiked(false);
            setIsFavorite(false);
            firstTime.current = true;
            if (Array.isArray(data.recipe.steps) && data.recipe.steps.length > 0) {
              setLoadingSteps(false);
            }

            startImageSearchForSession(streamSessionId, recipeImageContext(data.recipe));
          },
          onStepsChunk: (partial) => {
            if (streamSessionIdRef.current !== streamSessionId) return;
            const steps = partial?.details?.steps || partial?.steps;
            if (Array.isArray(steps) && steps.length > 0) {
              setRecipe((prev) => ({ ...prev, steps }));
              setLoadingSteps(false);
            }
          },
          onSteps: (data) => {
            if (streamSessionIdRef.current !== streamSessionId) return;
            setRecipe((prev) => ({ ...prev, steps: data.steps }));
            setLoadingSteps(false);
            setStreamingSteps(false);
          },
          onDone: (data) => {
            if (data?.id) registerSessionRecipeId(streamSessionId, data.id);
            if (streamSessionIdRef.current !== streamSessionId) return;
            setStreamingTitleAndIngredients(false);
            setStreamingSteps(false);
            setIsGeneratingNewRecipe(false);
            markRegenerationLoading(streamSessionId, 'recipe');
          },
          onError: (message) => {
            if (streamSessionIdRef.current !== streamSessionId) return;
            Alert.alert(t('recipeDetail.error'), message);
            setIsGeneratingNewRecipe(false);
            setLoadingRecipe(false);
            setLoadingSteps(false);
            setStreamingTitleAndIngredients(false);
            setStreamingSteps(false);
            setLoadingImage(false);
            markRegenerationLoading(streamSessionId, 'all');
          }
        }
      );
      sseCloseRef.current = close;
    } catch (error) {
      console.error('Erreur lors de la génération de la nouvelle recette:', error);
      Alert.alert(t('recipeDetail.error'), t('recipeDetail.unableToGenerateRecipe'));
      setIsGeneratingNewRecipe(false);
      setLoadingRecipe(false);
    }
  };

  const handleCaloriesPress = async () => {
    if (params.isOnboarding !== 'true' && !isFirstGeneration && !isSubscribed) {
      router.push({ pathname: '/paywall', params: { source: 'recipe_calories' } });
    }
  };

  const handleProteinsPress = async () => {
    if (params.isOnboarding !== 'true' && !isFirstGeneration && !isSubscribed) {
      router.push({ pathname: '/paywall', params: { source: 'recipe_proteins' } });
    }
  };

  const handleLipidsPress = async () => {
    if (params.isOnboarding !== 'true' && !isFirstGeneration && !isSubscribed) {
      router.push({ pathname: '/paywall', params: { source: 'recipe_lipids' } });
    }
  };

  // Fonction pour traduire la difficulté
  const translateDifficulty = (difficulty: string) => {
    if (!difficulty) return '-';

    // Normaliser la difficulté (enlever les espaces, mettre en minuscules)
    const normalizedDifficulty = difficulty.toUpperCase().trim();

    // Essayer de traduire avec la clé exacte
    const translation = t(`recipe.difficultyLevels.${normalizedDifficulty}`);

    // Si la traduction retourne la même clé, c'est qu'elle n'existe pas
    if (translation === `recipe.difficultyLevels.${normalizedDifficulty}`) {
      // Fallback : capitaliser la première lettre
      return capitalizeFirstLetter(difficulty);
    }

    return translation;
  };

  // Fonction pour traduire les tags
  const translateTag = (tag: string) => {
    if (!tag) return '-';
    const translation = t(`recipe.tags.${tag}`);
    if (translation === `recipe.tags.${tag}`) {
      return tag;
    }
    return translation;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={statusBarStyle} />
      {/* <View
        style={[
          styles.fixedHeader,
          { paddingTop: insets.top, height: HEADER_HEIGHT + insets.top }
        ]}
      >
        <Text style={styles.brandTitle}>CookEat Ai</Text>
      </View> */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 0 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Section Image avec boutons overlay */}
        <View style={[styles.imageContainer, { height: heroHeight }]}>
          {!isGenericRecipeImage(recipe.image) && (
            <Image
              source={{
                uri: recipe.image,
              }}
              style={styles.recipeImage}
              contentFit="cover"
              onLoad={() => {
                setDisplayedImageUrl(recipe.image);
                setLoadingImage(false);
              }}
              onError={handleImageError}
            />
          )}
          {loadingImage && (
            <View style={StyleSheet.absoluteFill}>
              <RecipeImageSkeleton />
            </View>
          )}
          {isGenericRecipeImage(recipe.image) && !loadingImage && (
            <Image
              source={GENERIC_RECIPE_IMAGE}
              style={styles.recipeImage}
              contentFit="cover"
            />
          )}

          <View style={[styles.illustrationBadge, __DEV__ && styles.illustrationBadgeWithReload]}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>
              {t('recipeDetail.illustration')}
            </Text>
          </View>

          {/* Overlay sombre pour les boutons */}
          <View style={styles.imageOverlay} />

          {/* Marque */}
          <View style={[styles.brandContainer, { top: Platform.OS === 'android' ? insets.top + 10 : insets.top }]}>
            <Text style={styles.brandText}>CookEat Ai</Text>
          </View>

          {/* Bouton retour */}
          {!isOnboarding && (params.showGenerateButton !== 'false' || params.isHistory === 'true') &&
            <TouchableOpacity
              style={[styles.backButton, { top: Platform.OS === 'android' ? insets.top + 5 : insets.top }]}
              onPress={handleBackPress}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>}

          {/* Bouton Partage */}
          <TouchableOpacity
            style={[styles.shareButton, { top: Platform.OS === 'android' ? insets.top + 5 : insets.top }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#000" />
          </TouchableOpacity>

          {/* Bouton favorite */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.likeButton, { top: Platform.OS === 'android' ? insets.top + 5 : insets.top }]}
            onPress={handleAddToFavorites}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? Colors.light.button : "#000"}
            />
          </TouchableOpacity>

          {/* Bouton Modifier Image */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.editImageButton]}
            onPress={handleChangeImage}
            disabled={isUpdatingImage}
          >
            {isUpdatingImage ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="camera-outline" size={20} color="#000" />
            )}
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('recipeDetail.reloadImage')}
              style={styles.reloadImageButton}
              onPress={handleReloadRecipeImage}
              disabled={isReloadingImage || !recipe.title}
            >
              {isReloadingImage ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="reload" size={20} color="#000" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Section Informations */}
        <View style={styles.infoContainer}>
          {/* Titre */}
          {!recipe.title
            ? <RecipeTitleSkeleton />
            : <FadeInView>
              <TypewriterText text={recipe.title} style={styles.recipeTitle} animate={isStreaming || isGeneratingNewRecipe} />
            </FadeInView>
          }

          {/* Description */}
          {/* <Text style={styles.recipeDescription}>{recipe.description}</Text> */}

          {/* Métriques - Première ligne */}
          <View style={styles.metricsContainer}>
            {recipe.cooking_time ? (
              <FadeInView style={styles.metricCard}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={24} color="#666" />
                  <Text style={styles.metricLabel}>{t('recipeDetail.cookingTime')}</Text>
                </View>
                <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit={true}>{recipe.cooking_time}</Text>
              </FadeInView>
            ) : (
              <Skeleton width="30%" height={90} borderRadius={12} />
            )}

            {recipe.difficulty ? (
              <FadeInView style={styles.metricCard} delay={100}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="star-outline" size={24} color="#666" />
                  <Text style={styles.metricLabel}>{t('recipeDetail.difficulty')}</Text>
                </View>
                <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit={true}>{translateDifficulty(recipe.difficulty)}</Text>
              </FadeInView>
            ) : (
              <Skeleton width="30%" height={90} borderRadius={12} />
            )}

            {recipe.servings ? (
              <FadeInView style={styles.metricCard} delay={200}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={24} color="#666" />
                  <Text style={styles.metricLabel}>{t('recipeDetail.servings')}</Text>
                </View>
                <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit={true}>{recipe.servings}</Text>
              </FadeInView>
            ) : (
              <Skeleton width="30%" height={90} borderRadius={12} />
            )}
          </View>

          {/* Métriques - Deuxième ligne */}
          <View style={styles.metricsContainer}>
            {recipe.calories ? (
              <FadeInView style={styles.metricCard}>
                <TouchableOpacity
                  activeOpacity={(isSubscribed || isFirstGeneration || params.isOnboarding === 'true') ? 1 : 0.3}
                  onPress={handleCaloriesPress}
                  style={{ alignItems: 'center', flex: 1, justifyContent: 'space-between' }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="flame-outline" size={24} color="#666" />
                    <Text style={styles.metricLabel}>{t('recipeDetail.calories')}</Text>
                  </View>
                  {isSubscribed || isFirstGeneration || params.isOnboarding === 'true'
                    ? <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit={true}>
                      {recipe.calories.toString().replace(/\s*(per serving|par portion|par personne|per person|\/p|\/portion|\/serving)\s*/gi, '').trim() + t('recipeDetail.perServing')}
                    </Text>
                    : <Ionicons name="lock-closed-outline" size={24} color="black" />
                  }
                </TouchableOpacity>
              </FadeInView>
            ) : (
              <Skeleton width="30%" height={90} borderRadius={12} />
            )}

            {recipe.proteins ? (
              <FadeInView style={styles.metricCard} delay={100}>
                <TouchableOpacity
                  activeOpacity={(isSubscribed || isFirstGeneration || params.isOnboarding === 'true') ? 1 : 0.3}
                  onPress={handleProteinsPress}
                  style={{ alignItems: 'center', flex: 1, justifyContent: 'space-between' }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="fitness-outline" size={24} color="#666" />
                    <Text style={styles.metricLabel}>{t('recipeDetail.proteins')}</Text>
                  </View>
                  {isSubscribed || isFirstGeneration || params.isOnboarding === 'true'
                    ? <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit={true}>{recipe.proteins}</Text>
                    : <Ionicons name="lock-closed-outline" size={24} color="black" />
                  }
                </TouchableOpacity>
              </FadeInView>
            ) : (
              <Skeleton width="30%" height={90} borderRadius={12} />
            )}

            {recipe.lipids ? (
              <FadeInView style={styles.metricCard} delay={200}>
                <TouchableOpacity
                  activeOpacity={(isSubscribed || isFirstGeneration || params.isOnboarding === 'true') ? 1 : 0.3}
                  onPress={handleLipidsPress}
                  style={{ alignItems: 'center', flex: 1, justifyContent: 'space-between' }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="water-outline" size={24} color="#666" />
                    <Text style={styles.metricLabel}>{t('recipeDetail.lipids')}</Text>
                  </View>
                  {isSubscribed || isFirstGeneration || params.isOnboarding === 'true'
                    ? <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit={true}>{recipe.lipids}</Text>
                    : <Ionicons name="lock-closed-outline" size={24} color="black" />
                  }
                </TouchableOpacity>
              </FadeInView>
            ) : (
              <Skeleton width="30%" height={90} borderRadius={12} />
            )}
          </View>

          {/* Bouton Voir la vidéo d'origine */}
          {recipe.videoUrl && (
            <FadeInView style={styles.videoLinkContainer}>
              <TouchableOpacity
                style={styles.videoLinkButton}
                onPress={handleOpenVideo}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={getVideoPlatformInfo(recipe.videoUrl).icon}
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.videoLinkText}>{getVideoPlatformInfo(recipe.videoUrl).label}</Text>
              </TouchableOpacity>
            </FadeInView>
          )}

          {/* Section Ingrédients */}
          <View style={styles.ingredientsSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.ingredientsTitle}>{t('recipeDetail.ingredients')} {!streamingTitleAndIngredients && recipe.ingredients?.length ? `(${recipe.ingredients.length})` : ''}</Text>
              {streamingTitleAndIngredients && <ActivityIndicator size="small" color={Colors.light.button} />}
            </View>

            {(isModalActive || !recipe.ingredients || recipe.ingredients.length === 0) ? <IngredientItemSkeleton /> :
              <>
                {recipe.ingredients.map((ingredient: any, index: number) => (
                  ingredient.name ? (
                    <FadeInView key={`ing-${index}`} style={styles.ingredientItem}>
                      {ingredient.icon ? (
                        <Text style={{ fontSize: 24, marginRight: 8 }}>{ingredient.icon}</Text>
                      ) : (
                        <Skeleton width={40} height={40} borderRadius={20} />
                      )}

                      <View style={styles.ingredientInfo}>
                        <TypewriterText text={ingredient.name} style={styles.ingredientName} animate={false} />
                        <View style={styles.ingredientTags}>
                          {ingredient.tags?.map((tag: string, tagIndex: number) => (
                            <View key={`tag-${index}-${tagIndex}`} style={[styles.tag, { backgroundColor: getTagColor(tag) }]}>
                              <Text style={styles.tagText}>{translateTag(tag)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      {ingredient.quantity ? (
                        <TypewriterText text={ingredient.quantity} style={styles.ingredientQuantity} animate={false} />
                      ) : streamingTitleAndIngredients ? (
                        <Skeleton width={50} height={16} borderRadius={4} />
                      ) : null}
                    </FadeInView>
                  ) : null
                ))}
                {streamingTitleAndIngredients && <IngredientItemSkeleton />}
              </>}
          </View>

          {/* Section Étapes de préparation */}
          <View>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.stepsTitle}>{t('recipeDetail.steps')} {!streamingSteps && !loadingSteps && `(${recipe.steps?.length})`}</Text>
              {(streamingSteps || loadingSteps) && <ActivityIndicator size="small" color={Colors.light.button} />}
            </View>

            {(isModalActive || !recipe.steps || recipe.steps.length === 0)
              ? <RecipeStepsSkeleton />
              : <>
                {recipe.steps?.map((step: any, index: number) => (
                  step.title ? (
                    <FadeInView key={`step-${index}`} style={styles.stepItem}>
                      <TypewriterText text={step.title} style={styles.stepTitle} animate={false} />
                      {step.description ? (
                        <TypewriterText text={step.description} style={styles.stepDescription} animate={false} />
                      ) : streamingSteps ? (
                        <View style={{ marginTop: 8 }}>
                          <Skeleton width="100%" height={14} borderRadius={4} />
                          <Skeleton width="85%" height={14} borderRadius={4} style={{ marginTop: 4 }} />
                        </View>
                      ) : null}
                    </FadeInView>
                  ) : null
                ))}
                {streamingSteps && <StepItemSkeleton />}
              </>}

            {/* Chef's Tip */}
            {recipe.chef_tip && (
              <View style={styles.chefTipContainer}>
                <View style={styles.chefTipHeader}>
                  <Ionicons name="bulb-outline" size={20} color={Colors.light.button} />
                  <Text style={styles.chefTipTitle}>{t('recipeDetail.chef_tip')}</Text>
                </View>
                <Text style={styles.chefTipText}>{recipe.chef_tip}</Text>
              </View>
            )}
          </View>

          {/* Section Bon appétit */}
          <View style={styles.bonAppetitSection}>
            <View style={styles.bonAppetitRow}>
              <View style={styles.divider} />
              <Text style={styles.bonAppetitText}>{t('recipeDetail.enjoy')}</Text>
              <View style={styles.divider} />
            </View>

            <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                style={styles.likeRecipeButton}
                onPress={handleAddToFavorites}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorite ? Colors.light.button : "#666"}
                />
                <Text style={[styles.likeRecipeText, { color: isFavorite ? Colors.light.button : "#666" }]}>
                  {t('recipeDetail.addToFavorites')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.likeRecipeButton}
                onPress={handleLikeRecipe}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isLiked ? "star" : "star-outline"}
                  size={24}
                  color={isLiked ? Colors.light.button : "#666"}
                />
                <Text style={[styles.likeRecipeText, { color: isLiked ? Colors.light.button : "#666" }]}>
                  {t('recipeDetail.iLikedThisRecipe')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Bouton Generate Recipe ou Bouton Continue (Onboarding) */}
      {params.isOnboarding === 'true' ? (
        <View style={[styles.onboardingButtonContainer, { bottom: Math.max(insets.bottom, 45) + 15 }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.onboardingButton}
            onPress={handleOnboardingContinue}
          >
            <Text style={styles.onboardingButtonText}>
              {variant === 'B'
                ? t('recipeDetail.onboardingContinuePremium')
                : t('recipeDetail.onboardingContinue')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : params.showGenerateButton !== 'false' && (
        <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom, 45) + 15 }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.favoriteButton, isGeneratingNewRecipe && styles.favoriteButtonDisabled]}
            onPress={handleGenerateRecipe}
            disabled={isGeneratingNewRecipe}
          >
            <Ionicons name={isGeneratingNewRecipe ? "time" : "sparkles"} size={20} color="white" />
            <Text style={styles.rateButtonText}>
              {isGeneratingNewRecipe ? t('recipeDetail.generatingRecipe') : t('recipeDetail.generateAnotherRecipe')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getTagColor = (tag: string) => {
  const normalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
  switch (normalizedTag) {
    case 'Protein':
    case 'Protéines':
      return '#90EE90';
    case 'Fat':
    case 'Lipides':
    case 'Lipide':
      return '#FFB6C1';
    case 'Omega-3':
    case 'Oméga-3':
      return '#87CEEB';
    case 'Carbohydrate':
    case 'Glucides':
    case 'Glucide':
      return '#FFD700';
    case 'Sugar':
    case 'Sucre':
      return '#FF69B4';
    case 'Vitamin':
    case 'Vitamines':
    case 'Vitamine':
      return '#FF2970';
    case 'Mineral':
    case 'Minéraux':
    case 'Minéral':
      return '#E0E0E0';
    default:
      return '#E0E0E0';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    // height fourni à l'usage (dépend de la hauteur de fenêtre courante).
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  brandContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  brandText: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 16,
    color: '#000',
    fontFamily: 'Degular'
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  shareButton: {
    position: 'absolute',
    right: 75,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  likeButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    paddingTop: 8,
    paddingHorizontal: 4,
    alignItems: 'flex-end',
    zIndex: 10,
    elevation: 2,
  },
  brandTitle: {
    fontSize: 24,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  infoContainer: {
    // Sur tablette le corps de la recette est recentré : des lignes de texte de
    // 900pt de large sont illisibles.
    ...contentColumn(),
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  recipeTitle: {
    fontSize: font(28),
    color: '#000',
    marginBottom: 20,
    fontFamily: 'Degular'
  },
  recipeDescription: {
    fontFamily: 'CronosProBold',
    fontSize: font(16),
    color: '#666',
    lineHeight: font(22),
    marginBottom: 24,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  metricLabel: {
    textAlign: 'center',
    fontFamily: 'CronosProBold',
    fontSize: font(15),
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  metricValue: {
    textAlign: 'center',
    fontSize: font(16),
    color: '#000',
    fontFamily: 'Degular'
  },
  ingredientsSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  ingredientsTitle: {
    fontSize: font(20),
    color: '#000',
    fontFamily: 'Degular'
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  ingredientImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  ingredientInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  ingredientName: {
    fontFamily: 'CronosProBold',
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  ingredientQuantity: {
    fontFamily: 'CronosProBold',
    fontSize: 18,
    color: '#000',
    maxWidth: '66%',
    flexShrink: 1,
    textAlign: 'right',
  },
  ingredientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontFamily: 'CronosProBold',
    fontSize: 10,
    color: '#000'
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  favoriteButton: {
    backgroundColor: Colors.light.button,
    borderRadius: 2000,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  rateButtonText: {
    color: 'white',
    fontFamily: 'CronosProBold',
    fontSize: 18
  },
  favoriteButtonDisabled: {
    backgroundColor: '#ccc',
  },
  onboardingButtonContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  onboardingButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 18,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  onboardingButtonText: {
    color: 'white',
    fontSize: 19,
    fontFamily: 'Degular',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(238, 238, 238, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 40,
    fontSize: 20,
    color: Colors.light.text,
    textAlign: 'center',
    fontFamily: 'Degular'
  },
  stepsTitle: {
    fontSize: 20,
    color: '#000',
    fontFamily: 'Degular'
  },
  stepItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  stepTitle: {
    fontFamily: 'CronosProBold',
    fontSize: 18,
    color: '#000',
    marginBottom: 8,
  },
  stepDescription: {
    fontFamily: 'CronosPro',
    fontSize: 18,
    color: '#666',
  },
  bonAppetitSection: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 100,
  },
  bonAppetitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  chefTipContainer: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE4B3',
  },
  chefTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  chefTipTitle: {
    fontSize: 18,
    color: '#855D00',
    fontFamily: 'Degular'
  },
  chefTipText: {
    fontSize: 16,
    color: '#5C4A00',
    lineHeight: 20,
    fontFamily: 'CronosPro',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15,
  },
  bonAppetitText: {
    fontSize: 32,
    fontFamily: 'Degular'
  },
  likeRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  likeRecipeText: {
    fontSize: 16,
    fontFamily: 'CronosProBold',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  disabledText: {
    opacity: 0.5,
  },
  blurredValue: {
    opacity: 0.3,
  },
  editImageButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  reloadImageButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  illustrationBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 10,
  },
  illustrationBadgeWithReload: {
    left: 68,
    bottom: 20,
  },
  videoLinkContainer: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  videoLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  videoLinkText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Degular'
  },
});
