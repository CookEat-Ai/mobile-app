import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Alert,
  Switch,
  Animated,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  Pressable,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import I18n from '../i18n';
import { Colors } from '../constants/Colors';
import { IconSymbol } from '../components/ui/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../services/api';
import recipeStorageService from '../services/recipeStorage';
import revenueCatService from '../config/revenuecat';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscription } from '../hooks/useSubscription';

import { useVoice } from '../hooks/useVoice';
import Voice from '@react-native-voice/voice';
import { Audio } from 'expo-av';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

interface Ingredient {
  id: string;
  name: string;
  category?: string;
}

interface RecipePreferences {
  dishType: string;
  duration: string;
  servings: number;
  cuisineStyle: string[];
  diet: string;
  allowOtherIngredients: boolean;
  allergies: string[];
  goal: string;
  equipments: string[];
}

const STORAGE_KEY = 'pantry_ingredients';
const MIN_INGREDIENTS = 5;

export default function RecipeSummaryScreen() {
  const ingredientCategories = useMemo(() => [
    {
      id: 'legumes',
      title: I18n.t('home.categories.vegetables.title'),
      icon: '🥬',
      ingredients: [
        { id: 'carotte', name: I18n.t('home.categories.vegetables.carrot'), icon: '🥕' },
        { id: 'tomate', name: I18n.t('home.categories.vegetables.tomato'), icon: '🍅' },
        { id: 'oignon', name: I18n.t('home.categories.vegetables.onion'), icon: '🧅' },
        { id: 'poivron', name: I18n.t('home.categories.vegetables.pepper'), icon: '🫑' },
        { id: 'courgette', name: I18n.t('home.categories.vegetables.courgette'), icon: '🥒' },
        { id: 'brocoli', name: I18n.t('home.categories.vegetables.broccoli'), icon: '🥦' },
        { id: 'epinard', name: I18n.t('home.categories.vegetables.spinach'), icon: '🥬' },
        { id: 'poireau', name: I18n.t('home.categories.vegetables.leek'), icon: '🧄' },
        { id: 'ail', name: I18n.t('home.categories.vegetables.garlic'), icon: '🧄' },
        { id: 'champignon', name: I18n.t('home.categories.vegetables.mushroom'), icon: '🍄' },
        { id: 'concombre', name: I18n.t('home.categories.vegetables.cucumber'), icon: '🥒' },
        { id: 'chou-fleur', name: I18n.t('home.categories.vegetables.cauliflower'), icon: '🥬' },
      ]
    },
    {
      id: 'viandes',
      title: I18n.t('home.categories.meats.title'),
      icon: '🍖',
      ingredients: [
        { id: 'poulet', name: I18n.t('home.categories.meats.chicken'), icon: '🍗' },
        { id: 'boeuf', name: I18n.t('home.categories.meats.beef'), icon: '🥩' },
        { id: 'porc', name: I18n.t('home.categories.meats.pork'), icon: '🥓' },
        { id: 'agneau', name: I18n.t('home.categories.meats.lamb'), icon: '🐑' },
        { id: 'dinde', name: I18n.t('home.categories.meats.turkey'), icon: '🦃' },
        { id: 'veau', name: I18n.t('home.categories.meats.veal'), icon: '🐄' },
      ]
    },
    {
      id: 'poissons',
      title: I18n.t('home.categories.fish.title'),
      icon: '🐟',
      ingredients: [
        { id: 'saumon', name: I18n.t('home.categories.fish.salmon'), icon: '🐟' },
        { id: 'thon', name: I18n.t('home.categories.fish.tuna'), icon: '🐠' },
        { id: 'cabillaud', name: I18n.t('home.categories.fish.cod'), icon: '🐡' },
        { id: 'sardine', name: I18n.t('home.categories.fish.sardine'), icon: '🐟' },
        { id: 'maquereau', name: I18n.t('home.categories.fish.maquereau'), icon: '🐠' },
        { id: 'bar', name: I18n.t('home.categories.fish.bar'), icon: '🐡' },
      ]
    },
    {
      id: 'necessites',
      title: I18n.t('home.categories.essentials.title'),
      icon: '🍚',
      ingredients: [
        { id: 'pates', name: I18n.t('home.categories.essentials.pasta'), icon: '🍝' },
        { id: 'riz', name: I18n.t('home.categories.essentials.rice'), icon: '🍚' },
        { id: 'semoule', name: I18n.t('home.categories.essentials.semolina'), icon: '🍚' },
        { id: 'creme', name: I18n.t('home.categories.essentials.cream'), icon: '🥛' },
        { id: 'lait', name: I18n.t('home.categories.essentials.milk'), icon: '🥛' },
        { id: 'huile', name: I18n.t('home.categories.essentials.oil'), icon: '🫒' },
        { id: 'beurre', name: I18n.t('home.categories.essentials.butter'), icon: '🧈' },
        { id: 'oeufs', name: I18n.t('home.categories.essentials.eggs'), icon: '🥚' },
        { id: 'farine', name: I18n.t('home.categories.essentials.flour'), icon: '🌾' },
      ]
    },
    {
      id: 'fromages',
      title: I18n.t('home.categories.cheeses.title'),
      icon: '🧀',
      ingredients: [
        { id: 'emmental', name: I18n.t('home.categories.cheeses.emmental'), icon: '🧀' },
        { id: 'cheddar', name: I18n.t('home.categories.cheeses.cheddar'), icon: '🧀' },
        { id: 'mozzarella', name: I18n.t('home.categories.cheeses.mozzarella'), icon: '🧀' },
        { id: 'parmesan', name: I18n.t('home.categories.cheeses.parmesan'), icon: '🧀' },
        { id: 'brie', name: I18n.t('home.categories.cheeses.brie'), icon: '🧀' },
        { id: 'camembert', name: I18n.t('home.categories.cheeses.camembert'), icon: '🧀' },
        { id: 'roquefort', name: I18n.t('home.categories.cheeses.roquefort'), icon: '🧀' },
        { id: 'feta', name: I18n.t('home.categories.cheeses.feta'), icon: '🧀' },
      ]
    },
    {
      id: 'epices',
      title: I18n.t('home.categories.spices.title'),
      icon: '🌶️',
      ingredients: [
        { id: 'sel', name: I18n.t('home.categories.spices.salt'), icon: '🧂' },
        { id: 'poivre', name: I18n.t('home.categories.spices.pepper'), icon: '🫙' },
        { id: 'paprika', name: I18n.t('home.categories.spices.paprika'), icon: '🌶️' },
        { id: 'cumin', name: I18n.t('home.categories.spices.cumin'), icon: '🌿' },
        { id: 'curry', name: I18n.t('home.categories.spices.curry'), icon: '🫙' },
        { id: 'herbes', name: I18n.t('home.categories.spices.herbes'), icon: '🌿' },
        { id: 'basilic', name: I18n.t('home.categories.spices.basil'), icon: '🌿' },
        { id: 'persil', name: I18n.t('home.categories.spices.parsley'), icon: '🌿' },
        { id: 'coriandre', name: I18n.t('home.categories.spices.coriander'), icon: '🌿' },
        { id: 'cannelle', name: I18n.t('home.categories.spices.cinnamon'), icon: '🫙' },
        { id: 'gingembre', name: I18n.t('home.categories.spices.ginger'), icon: '🫚' },
        { id: 'moutarde', name: I18n.t('home.categories.spices.mustard'), icon: '🫙' },
        { id: 'vinaigre', name: I18n.t('home.categories.spices.vinegar'), icon: '🫙' },
        { id: 'miel', name: I18n.t('home.categories.spices.honey'), icon: '🍯' },
        { id: 'citron', name: I18n.t('home.categories.spices.lemon'), icon: '🍋' },
        { id: 'origan', name: I18n.t('home.categories.spices.oregano'), icon: '🌿' },
        { id: 'thym', name: I18n.t('home.categories.spices.thyme'), icon: '🌿' },
        { id: 'piment', name: I18n.t('home.categories.spices.chili'), icon: '🌶️' },
      ]
    },
    {
      id: 'fruits',
      title: I18n.t('home.categories.fruits.title'),
      icon: '🍎',
      ingredients: [
        { id: 'pomme', name: I18n.t('home.categories.fruits.apple'), icon: '🍎' },
        { id: 'banane', name: I18n.t('home.categories.fruits.banana'), icon: '🍌' },
        { id: 'orange', name: I18n.t('home.categories.fruits.orange'), icon: '🍊' },
        { id: 'fraise', name: I18n.t('home.categories.fruits.strawberry'), icon: '🍓' },
        { id: 'raisin', name: I18n.t('home.categories.fruits.raisin'), icon: '🍇' },
        { id: 'kiwi', name: I18n.t('home.categories.fruits.kiwi'), icon: '🥝' },
        { id: 'ananas', name: I18n.t('home.categories.fruits.pineapple'), icon: '🍍' },
        { id: 'mangue', name: I18n.t('home.categories.fruits.mango'), icon: '🥭' },
      ]
    }
  ], []);

  const DISH_TYPES = useMemo(() => [
    { id: 'all', label: I18n.t('recipeSummary.any') },
    { id: 'dinner', label: I18n.t('search.categories.dinner') },
    { id: 'gratin', label: I18n.t('recipeSummary.gratin') },
    { id: 'soup', label: I18n.t('recipeSummary.soup') },
    { id: 'brunch', label: I18n.t('recipeSummary.brunch') },
    { id: 'salad', label: I18n.t('recipeSummary.salad') },
    { id: 'dessert', label: I18n.t('search.categories.dessert') },
  ], []);

  const DURATIONS = useMemo(() => [
    { id: 'all', label: I18n.t('recipeSummary.any') },
    { id: 'fast', label: I18n.t('recipeSummary.quick') },
    { id: 'medium', label: I18n.t('recipeSummary.medium') },
    { id: 'long', label: I18n.t('recipeSummary.long') },
  ], []);

  const DIETS = useMemo(() => [
    { id: 'vegan', label: I18n.t('recipeSummary.vegan') },
    { id: 'vegetarian', label: I18n.t('recipeSummary.vegetarian') },
    { id: 'halal', label: I18n.t('recipeSummary.halal') },
    { id: 'keto', label: I18n.t('recipeSummary.keto') },
    { id: 'paleo', label: I18n.t('recipeSummary.paleo') }
  ], []);

  const CUISINE_STYLES = useMemo(() => [
    { id: 'french', label: I18n.t('recipeSummary.french') },
    { id: 'italian', label: I18n.t('recipeSummary.italian') },
    { id: 'mediterranean', label: I18n.t('recipeSummary.mediterranean') },
    { id: 'asian', label: I18n.t('recipeSummary.asian') },
    { id: 'spicy', label: I18n.t('recipeSummary.spicy') },
    { id: 'mexican', label: I18n.t('recipeSummary.mexican') },
    { id: 'indian', label: I18n.t('recipeSummary.indian') },
  ], []);

  const GOALS = useMemo(() => [
    { id: 'neutral', label: I18n.t('recipeSummary.neutral') },
    { id: 'weight_loss', label: I18n.t('recipeSummary.weight_loss') },
    { id: 'mass_gain', label: I18n.t('recipeSummary.mass_gain') },
  ], []);

  const EQUIPMENTS = useMemo(() => [
    { id: 'oven', label: I18n.t('recipeSummary.equipment_oven') },
    { id: 'airfryer', label: I18n.t('recipeSummary.equipment_airfryer') },
    { id: 'microwave', label: I18n.t('recipeSummary.equipment_microwave') },
    { id: 'blender', label: I18n.t('recipeSummary.equipment_blender') },
    { id: 'robot', label: I18n.t('recipeSummary.equipment_robot') },
  ], []);

  const ALLERGIES = useMemo(() => [
    { id: 'gluten', label: I18n.t('recipeSummary.avoid_gluten') },
    { id: 'dairy', label: I18n.t('recipeSummary.avoid_dairy') },
    { id: 'egg', label: I18n.t('recipeSummary.avoid_egg') },
    { id: 'fish', label: I18n.t('recipeSummary.avoid_fish') },
    { id: 'peanut', label: I18n.t('recipeSummary.avoid_peanut') },
  ], []);

  const colors = Colors.light;

  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ingredients?: string, isOnboarding?: string, mode?: string }>();
  const { subscriptionStatus } = useSubscription();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [liveText, setLiveText] = useState('');
  const liveTextRef = useRef('');
  const isProcessingVoiceRef = useRef(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isFirstGeneration, setIsFirstGeneration] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [categoryAddModalCategoryId, setCategoryAddModalCategoryId] = useState<string | null>(null);
  const [isCategoryAddModalVisible, setIsCategoryAddModalVisible] = useState(false);
  const [selectedIngredientsForCategoryModal, setSelectedIngredientsForCategoryModal] = useState<string[]>([]);
  const screenHeight = Dimensions.get('window').height;
  const filterSlideAnim = useRef(new Animated.Value(screenHeight)).current;
  const categoryAddSlideAnim = useRef(new Animated.Value(screenHeight)).current;

  const [preferences, setPreferences] = useState<RecipePreferences>({
    dishType: 'dinner',   // Repas par défaut
    duration: 'all',      // Peu importe par défaut
    servings: 2,
    cuisineStyle: ['all'], // Tout par défaut
    diet: 'none',
    allowOtherIngredients: false,
    allergies: [],
    goal: 'neutral',
    equipments: [],
  });

  useEffect(() => {
    const initData = async () => {
      // 1. Check if first generation
      const history = await recipeStorageService.getStoredRecipes();
      const isFirst = history.length === 0;
      setIsFirstGeneration(isFirst);

      // 2. Load ingredients from params if present
      if (params.ingredients) {
        let ingredientsList: Ingredient[];
        try {
          const parsed = JSON.parse(params.ingredients);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
            ingredientsList = parsed.map((ing: { name: string; category?: string }, index: number) => ({
              id: (Date.now() + index).toString(),
              name: ing.name.trim().charAt(0).toUpperCase() + ing.name.trim().slice(1).toLowerCase(),
              category: ing.category || 'other',
            }));
          } else {
            throw new Error('fallback to CSV');
          }
        } catch {
          ingredientsList = params.ingredients.split(',').map((ingredient, index) => ({
            id: (Date.now() + index).toString(),
            name: ingredient.trim().charAt(0).toUpperCase() + ingredient.trim().slice(1).toLowerCase(),
          }));
        }

        if (params.mode === 'append') {
          setIngredients(prev => {
            const filtered = ingredientsList.filter(newIng =>
              !prev.some(existing => normalizeIngredientName(existing.name) === normalizeIngredientName(newIng.name))
            );
            const updated = [...prev, ...filtered];
            saveIngredientsToPantry(updated);
            return updated;
          });
        } else {
          setIngredients(ingredientsList);
          saveIngredientsToPantry(ingredientsList);
        }
      }

      // 3. Load preferences (diet always, others if first generation)
      await loadOnboardingPreferences(isFirst);
    };

    initData();
  }, [params.ingredients]);

  useFocusEffect(
    useCallback(() => {
      const applyPendingCameraIngredients = async () => {
        try {
          const raw = await AsyncStorage.getItem('cookeat_camera_ingredients_append');
          if (!raw) return;
          await AsyncStorage.removeItem('cookeat_camera_ingredients_append');
          let ingredientsList: Ingredient[];
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
              ingredientsList = parsed.map((ing: { name: string; category?: string }, index: number) => ({
                id: (Date.now() + index).toString(),
                name: ing.name.trim().charAt(0).toUpperCase() + ing.name.trim().slice(1).toLowerCase(),
                category: ing.category || 'other',
              }));
            } else {
              ingredientsList = raw.split(',').map((ingredient, index) => ({
                id: (Date.now() + index).toString(),
                name: ingredient.trim().charAt(0).toUpperCase() + ingredient.trim().slice(1).toLowerCase(),
              }));
            }
          } catch {
            ingredientsList = raw.split(',').map((ingredient, index) => ({
              id: (Date.now() + index).toString(),
              name: ingredient.trim().charAt(0).toUpperCase() + ingredient.trim().slice(1).toLowerCase(),
            }));
          }
          setIngredients(prev => {
            const filtered = ingredientsList.filter(newIng =>
              !prev.some(existing => normalizeIngredientName(existing.name) === normalizeIngredientName(newIng.name))
            );
            const updated = [...prev, ...filtered];
            saveIngredientsToPantry(updated);
            return updated;
          });
        } catch (e) {
          console.error('Erreur application ingrédients caméra:', e);
        }
      };
      applyPendingCameraIngredients();
    }, [])
  );

  const closeFilterModal = () => {
    Animated.timing(filterSlideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsFilterModalVisible(false);
    });
  };

  const openCategoryAddModal = (categoryId: string) => {
    Keyboard.dismiss();
    setCategoryAddModalCategoryId(categoryId);
    setSelectedIngredientsForCategoryModal([]);
    setIsCategoryAddModalVisible(true);
  };

  const closeCategoryAddModal = () => {
    Animated.timing(categoryAddSlideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsCategoryAddModalVisible(false);
      setCategoryAddModalCategoryId(null);
      setSelectedIngredientsForCategoryModal([]);
    });
  };

  const toggleCategoryModalIngredient = (ingredientName: string) => {
    setSelectedIngredientsForCategoryModal(prev => {
      const normalized = normalizeIngredientName(ingredientName);
      const isSelected = prev.some(n => normalizeIngredientName(n) === normalized);
      if (isSelected) return prev.filter(n => normalizeIngredientName(n) !== normalized);
      return [...prev, ingredientName];
    });
  };

  const confirmCategoryAddModal = () => {
    if (!categoryAddModalCategoryId) return;
    const toAdd: Ingredient[] = [];
    for (const name of selectedIngredientsForCategoryModal) {
      const normalized = normalizeIngredientName(name);
      const alreadyThere = ingredients.some(i => normalizeIngredientName(i.name) === normalized);
      if (!alreadyThere) {
        toAdd.push({
          id: Date.now().toString() + Math.random(),
          name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
          category: categoryAddModalCategoryId,
        });
      }
    }
    if (toAdd.length > 0) {
      setIngredients(prev => {
        const updated = [...prev, ...toAdd];
        saveIngredientsToPantry(updated);
        return updated;
      });
    }
    closeCategoryAddModal();
  };

  useEffect(() => {
    if (isFilterModalVisible) {
      Animated.spring(filterSlideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 50,
        friction: 8
      }).start();
    } else {
      filterSlideAnim.setValue(screenHeight);
    }
  }, [isFilterModalVisible, filterSlideAnim, screenHeight]);

  useEffect(() => {
    if (isCategoryAddModalVisible) {
      categoryAddSlideAnim.setValue(screenHeight);
      Animated.spring(categoryAddSlideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      categoryAddSlideAnim.setValue(screenHeight);
    }
  }, [isCategoryAddModalVisible]);

  const saveIngredientsToPantry = async (items: Ingredient[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des ingrédients:', error);
    }
  };

  const handleLiveTextChange = (text: string) => {
    setLiveText(text);
    liveTextRef.current = text;
  };

  const handleRecordingStateChange = async (recording: boolean) => {
    if (recording) {
      setLiveText('');
      liveTextRef.current = '';
      isProcessingVoiceRef.current = false;
    } else {
      // Éviter les traitements multiples si l'événement d'arrêt est déclenché plusieurs fois
      if (isProcessingVoiceRef.current) return;

      const finalActiveText = liveTextRef.current;
      if (finalActiveText.length > 3) {
        isProcessingVoiceRef.current = true;
        setIsAddingIngredient(true);
        try {
          const response = await apiService.processVoiceIngredients(finalActiveText);
          const voiceIngredients = response.data?.ingredients || [];

          if (voiceIngredients.length > 0) {
            setIngredients(prev => {
              const newIngredients = voiceIngredients.map((ing: any, index: number) => ({
                id: (Date.now() + index + Math.random()).toString(),
                name: ing.name.trim().charAt(0).toUpperCase() + ing.name.trim().slice(1).toLowerCase(),
                category: ing.category || 'other',
              })).filter((newIng: Ingredient) =>
                !prev.some(existing => normalizeIngredientName(existing.name) === normalizeIngredientName(newIng.name))
              );

              if (newIngredients.length === 0) return prev;

              const updated = [...prev, ...newIngredients];
              saveIngredientsToPantry(updated);
              return updated;
            });
          }
        } catch (error) {
          console.error('Erreur lors du traitement des ingrédients vocaux:', error);
          Alert.alert(I18n.t('common.error'), I18n.t('home.voice.errorTitle'));
        } finally {
          setIsAddingIngredient(false);
          setLiveText('');
          liveTextRef.current = '';
        }
      } else {
        // Clear even if text was too short
        setLiveText('');
        liveTextRef.current = '';
      }
    }
  };

  const { isRecording, startRecording, stopRecording } = useVoice({
    onRecordingStateChange: (state) => handleRecordingStateChange(state),
    onLiveTextChange: (text) => handleLiveTextChange(text)
  });

  const loadOnboardingPreferences = async (isFirst: boolean) => {
    try {
      const updates: Partial<RecipePreferences> = {};

      // Diet is always synced if exists
      const savedDiet = await AsyncStorage.getItem('diet') || await AsyncStorage.getItem('dietary_preference');
      if (savedDiet) {
        const dietMap: Record<string, string> = {
          'none': 'none',
          'halal': 'halal',
          'vegetarian': 'vegetarian',
          'vegan': 'vegan'
        };
        updates.diet = dietMap[savedDiet] || 'none';
      }

      // Other filters only for first generation
      if (isFirst) {
        // Servings
        const cookingForWho = await AsyncStorage.getItem('cookingForWho');
        if (cookingForWho) {
          const servingsMap: Record<string, number> = {
            'myself': 1,
            'myself_and_another_person': 2,
            'my_family': 4
          };
          if (servingsMap[cookingForWho]) updates.servings = servingsMap[cookingForWho];
        }

        // Type de plat, temps et cuisine : non issus de l'onboarding, toujours les défauts (Repas, Peu importe, Tout)

        // Equipments (Multi)
        const equipmentRaw = await AsyncStorage.getItem('equipments');
        if (equipmentRaw) {
          try {
            const equipments = JSON.parse(equipmentRaw) as string[];
            const equipMap: Record<string, string> = {
              'equipment_oven': 'oven',
              'equipment_airfryer': 'airfryer',
              'equipment_microwave': 'microwave',
              'equipment_blender': 'blender',
              'equipment_robot': 'robot'
            };
            updates.equipments = equipments.map(e => equipMap[e]).filter(Boolean);
          } catch { /* ignore parse error */ }
        }

        // Allergies (Multi)
        const avoidRaw = await AsyncStorage.getItem('avoidIngredients');
        if (avoidRaw) {
          try {
            const avoid = JSON.parse(avoidRaw) as string[];
            const allergyMap: Record<string, string> = {
              'avoid_gluten': 'gluten',
              'avoid_dairy': 'dairy',
              'avoid_egg': 'egg',
              'avoid_fish': 'fish',
              'avoid_peanut': 'peanut'
            };
            updates.allergies = avoid.map(a => allergyMap[a]).filter(Boolean);
          } catch { /* ignore parse error */ }
        }
      }

      if (Object.keys(updates).length > 0) {
        setPreferences(prev => ({ ...prev, ...updates }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences onboarding:', error);
    }
  };

  const removeIngredient = (id: string) => {
    const updatedIngredients = ingredients.filter(i => i.id !== id);
    setIngredients(updatedIngredients);
    saveIngredientsToPantry(updatedIngredients);
  };

  const updateIngredientName = (id: string, newName: string) => {
    const updatedIngredients = ingredients.map(ing =>
      ing.id === id ? { ...ing, name: newName } : ing
    );
    setIngredients(updatedIngredients);
    saveIngredientsToPantry(updatedIngredients);
  };

  const normalizeIngredientName = (name: string) => {
    let n = name.toLowerCase().trim();
    if (n.endsWith('s') || n.endsWith('x')) {
      // Éviter de tronquer des mots courts comme "noix" ou "ail" (cas particuliers)
      if (n.length > 3) return n.slice(0, -1);
    }
    return n;
  };

  const isDuplicateIngredient = (newName: string, existingIngredients: Ingredient[]) => {
    const normalizedNew = normalizeIngredientName(newName);
    return existingIngredients.some(ing =>
      normalizeIngredientName(ing.name) === normalizedNew
    );
  };

  const addManualIngredient = async () => {
    const input = manualInput?.trim();
    if (!input) return;
    if (isDuplicateIngredient(input, ingredients)) {
      setManualInput('');
      return;
    }

    setIsAddingIngredient(true);
    const name = input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
    setManualInput('');

    try {
      const response = await apiService.processVoiceIngredients(name);
      const aiIngredient = response.data?.ingredients?.[0];
      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name: aiIngredient?.name || name,
        category: aiIngredient?.category || 'other',
      };
      const updatedIngredients = [...ingredients, newIngredient];
      setIngredients(updatedIngredients);
      saveIngredientsToPantry(updatedIngredients);
    } catch {
      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name,
        category: 'other',
      };
      const updatedIngredients = [...ingredients, newIngredient];
      setIngredients(updatedIngredients);
      saveIngredientsToPantry(updatedIngredients);
    } finally {
      setIsAddingIngredient(false);
    }
  };

  const updatePreference = (key: keyof RecipePreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleDiet = (id: string) => {
    if (preferences.diet === id) {
      updatePreference('diet', 'none');
    } else {
      updatePreference('diet', id);
    }
  };

  const toggleAllergy = (id: string) => {
    const currentAllergies = [...preferences.allergies];
    if (currentAllergies.includes(id)) {
      updatePreference('allergies', currentAllergies.filter(a => a !== id));
    } else {
      updatePreference('allergies', [...currentAllergies, id]);
    }
  };

  const toggleEquipment = (id: string) => {
    const currentEquipments = [...preferences.equipments];
    if (currentEquipments.includes(id)) {
      updatePreference('equipments', currentEquipments.filter(e => e !== id));
    } else {
      updatePreference('equipments', [...currentEquipments, id]);
    }
  };

  const toggleCuisineStyle = (id: string) => {
    let currentStyles = [...preferences.cuisineStyle];

    if (currentStyles.includes(id)) {
      currentStyles = currentStyles.filter(s => s !== id);
    } else {
      // Retirer 'all' si présent lors de l'ajout d'un style spécifique
      currentStyles = currentStyles.filter(s => s !== 'all').concat(id);
    }

    // Si tout est décoché, on remet 'all' par défaut en interne
    if (currentStyles.length === 0) {
      currentStyles = ['all'];
    }

    updatePreference('cuisineStyle', currentStyles);
  };

  const renderChip = (label: string, isSelected: boolean, onPress: () => void, key?: string, isPremium?: boolean) => (
    <Pressable
      key={key}
      style={({ pressed }) => [
        styles.chip,
        isSelected && styles.chipSelected,
        isPremium && !subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true' && styles.chipPremium,
        pressed && { opacity: 0.7 }
      ]}
      onPress={() => {
        if (isPremium && !subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true') {
          router.push({ pathname: '/paywall', params: { source: `filter_${key || label}` } });
          return;
        }
        onPress();
      }}
      hitSlop={4}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {label}
        </Text>
        {isPremium && !subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true' && (
          <Ionicons name="lock-closed" size={12} color="#666" />
        )}
      </View>
    </Pressable>
  );

  const scrollToCategory = (index: number) => {
    setCurrentCategoryIndex(index);
    carouselRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  const handleIngredientToggle = (ingredientName: string, categoryId?: string) => {
    const normalizedTarget = normalizeIngredientName(ingredientName);
    const existingIndex = ingredients.findIndex(i => normalizeIngredientName(i.name) === normalizedTarget);

    if (existingIndex !== -1) {
      const updatedIngredients = ingredients.filter((_, index) => index !== existingIndex);
      setIngredients(updatedIngredients);
      saveIngredientsToPantry(updatedIngredients);
    } else {
      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1).toLowerCase(),
        category: categoryId,
      };
      const updatedIngredients = [...ingredients, newIngredient];
      setIngredients(updatedIngredients);
      saveIngredientsToPantry(updatedIngredients);
    }
  };

  const handleGenerateRecipe = async () => {
    if (ingredients.length < MIN_INGREDIENTS) {
      Alert.alert(I18n.t('recipeSummary.error'), I18n.t('recipeSummary.pleaseAddAtLeastFiveIngredients'));
      return;
    }

    // Vérifier le quota quotidien pour les utilisateurs non abonnés
    if (!subscriptionStatus.isSubscribed) {
      const canGenerate = await revenueCatService.useDailyQuota();
      if (!canGenerate) {
        Alert.alert(
          I18n.t('recipeSummary.dailyQuotaReached'),
          I18n.t('recipeSummary.dailyQuotaReachedDescription'),
          [
            { text: I18n.t('recipeSummary.later'), style: 'cancel' },
            {
              text: I18n.t('recipeSummary.seeOffers'),
              onPress: () => router.push({ pathname: '/paywall', params: { source: 'quota_reached_summary' } })
            }
          ]
        );
        return;
      }
    }

    const ingredientsWithCategories = JSON.stringify(
      ingredients.map(i => ({ name: i.name, category: i.category || 'other' }))
    );

    const nextParams = JSON.stringify({
      streaming: 'true',
      ingredients: ingredientsWithCategories,
      preferences: JSON.stringify(preferences),
      isOnboarding: params.isOnboarding,
    });

    router.push({
      pathname: '/recipe-loading',
      params: {
        durationMs: '6000',
        startGeneration: 'true',
        nextPath: '/recipe-detail',
        nextParams,
      },
    });
  };

  const renderCategoryPage = ({ item: category }: { item: any }) => (
    <View style={styles.categoryPage}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text style={styles.categoryTitle}>{category.title}</Text>
      </View>
      <View style={styles.ingredientsGrid}>
        {category.ingredients.map((ingredient: any) => {
          const isSelected = ingredients.some(i => normalizeIngredientName(i.name) === normalizeIngredientName(ingredient.name));
          return (
            <TouchableOpacity
              key={ingredient.id}
              style={[styles.manualIngredientItem, isSelected && styles.ingredientItemSelected]}
              onPress={() => handleIngredientToggle(ingredient.name, category.id)}
            >
              <Text style={styles.ingredientIcon}>{ingredient.icon}</Text>
              <Text style={[styles.manualIngredientName, isSelected && styles.ingredientNameSelected]}>
                {ingredient.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const CATEGORY_META: Record<string, { title: string; icon: string }> = useMemo(() => {
    const meta: Record<string, { title: string; icon: string }> = {
      epices: { title: I18n.t('home.categories.spices.title', { defaultValue: 'Épices & Condiments' }), icon: '🌶️' },
      other: { title: I18n.t('recipeSummary.other', { defaultValue: 'Autres' }), icon: '📦' },
    };
    for (const cat of ingredientCategories) {
      meta[cat.id] = { title: cat.title, icon: cat.icon };
    }
    return meta;
  }, [ingredientCategories]);

  // Même ordre que la sélection manuelle, fruits toujours avant-dernière, other en dernier
  const CATEGORY_ORDER = useMemo(() => {
    const order = ingredientCategories.map(c => c.id).filter(id => id !== 'fruits');
    if (!order.includes('epices')) order.push('epices');
    order.push('fruits');
    order.push('other');
    return order;
  }, [ingredientCategories]);

  const groupedIngredients = useMemo(() => {
    const catalogLookup = new Map<string, string>();
    for (const cat of ingredientCategories) {
      for (const ing of cat.ingredients) {
        catalogLookup.set(normalizeIngredientName(ing.name), cat.id);
      }
    }

    const groupMap = new Map<string, Ingredient[]>();
    for (const ing of ingredients) {
      const catId = ing.category || catalogLookup.get(normalizeIngredientName(ing.name)) || 'other';
      if (!groupMap.has(catId)) groupMap.set(catId, []);
      groupMap.get(catId)!.push(ing);
    }

    // Afficher toutes les catégories dans l'ordre de la sélection manuelle, avec "Aucun" si vide
    const groups: { id: string; title: string; icon: string; items: Ingredient[] }[] = [];
    for (const catId of CATEGORY_ORDER) {
      const items = groupMap.get(catId) || [];
      const meta = CATEGORY_META[catId] || CATEGORY_META['other'];
      groups.push({ id: catId, title: meta.title, icon: meta.icon, items });
    }
    return groups;
  }, [ingredients, ingredientCategories, CATEGORY_META, CATEGORY_ORDER]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Sécurité : si on ne peut pas revenir en arrière (ex: après un replace),
      // on redirige vers l'accueil ou l'onboarding selon le contexte
      if (params.isOnboarding === 'true') {
        router.replace('/onboarding/ahaMoment');
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F6EEE9', '#FFFFFF']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Back Button */}
      <TouchableOpacity
        style={[styles.floatingCircleButton, { left: 20, top: insets.top + 10 }]}
        onPress={handleBack}
      >
        <FontAwesome6 name="arrow-left" size={18} color={Colors.light.textSecondary} />
      </TouchableOpacity>

      {/* Floating Filter Button */}
      <TouchableOpacity
        style={[styles.floatingCircleButton, { right: 20, top: insets.top + 10 }]}
        onPress={() => setIsFilterModalVisible(true)}
      >
        <IconSymbol name="slider.horizontal.3" size={22} color={colors.text} weight="bold" />
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 150, paddingTop: insets.top + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section ingrédients */}
        <View style={styles.section}>
          <View style={styles.ingredientsHeader}>
            <Text style={styles.sectionTitle}>{I18n.t('recipeSummary.ingredients')}</Text>
            <TouchableOpacity
              style={styles.roundAddButton}
              onPress={() => {
                router.push({
                  pathname: '/camera',
                  params: { mode: 'append', initialMode: 'photo', isOnboarding: params.isOnboarding }
                });
              }}
            >
              <IconSymbol name="camera.fill" size={22} color="white" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Barre de saisie : input + micro à droite + bouton Ajouter */}
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.manualTextInput}
              placeholder={I18n.t('recipeSummary.ingredientName')}
              value={manualInput}
              onChangeText={setManualInput}
              onSubmitEditing={addManualIngredient}
              returnKeyType="done"
              editable={!isAddingIngredient}
            />
            <TouchableOpacity
              style={[styles.microInlineButton, isRecording && styles.microInlineButtonActive]}
              onPress={() => isRecording ? stopRecording() : startRecording()}
            >
              <FontAwesome name="microphone" size={20} color={isRecording ? "white" : Colors.light.button} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.manualAddButton,
                (!manualInput.trim() || isAddingIngredient) && styles.manualAddButtonDisabled
              ]}
              onPress={addManualIngredient}
              disabled={!manualInput.trim() || isAddingIngredient}
            >
              {isAddingIngredient ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.manualAddButtonText}>{I18n.t('recipeSummary.add')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {liveText.length > 0 && (
            <View style={styles.liveTextContainer}>
              <Text style={styles.liveText}>{liveText}</Text>
              {isAddingIngredient && (
                <ActivityIndicator size="small" color={Colors.light.button} style={{ marginLeft: 10 }} />
              )}
            </View>
          )}

          {groupedIngredients.map(group => {
            const categoryForAdd = ingredientCategories.find(c => c.id === group.id);
            return (
              <View key={group.id} style={styles.ingredientGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupIcon}>{group.icon}</Text>
                  <View style={styles.groupTitleRow}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupCount}>{group.items.length}</Text>
                  </View>
                  {categoryForAdd ? (
                    <TouchableOpacity
                      style={styles.categoryAddButton}
                      onPress={() => openCategoryAddModal(group.id)}
                    >
                      <IconSymbol name="plus" size={16} color="white" weight="bold" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {group.items.length === 0 ? (
                  <Text style={styles.categoryEmptyText}>{I18n.t('recipeSummary.none')}</Text>
                ) : (
                  group.items.map(ingredient => (
                    <View style={styles.ingredientItem} key={ingredient.id}>
                      <TextInput
                        style={styles.ingredientName}
                        value={ingredient.name}
                        onChangeText={(text) => updateIngredientName(ingredient.id, text)}
                        returnKeyType="done"
                        blurOnSubmit={true}
                      />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeIngredient(ingredient.id)}
                      >
                        <IconSymbol name="trash" size={20} color={Colors.light.textSecondary} weight="medium" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal ajout par catégorie (ouverture type modale abonnement) */}
      <Modal
        visible={isCategoryAddModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={closeCategoryAddModal}
      >
        <View
          style={styles.modalOverlay}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) closeCategoryAddModal();
          }}
        >
          <Animated.View
            style={[
              styles.modalContent,
              styles.categoryAddModalContent,
              {
                maxHeight: screenHeight * 0.85,
                transform: [{ translateY: categoryAddSlideAnim }],
                paddingBottom: 0,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {categoryAddModalCategoryId ? (CATEGORY_META[categoryAddModalCategoryId]?.title ?? categoryAddModalCategoryId) : ''}
              </Text>
              <TouchableOpacity onPress={closeCategoryAddModal} style={styles.modalCloseButton}>
                <IconSymbol name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.categoryAddModalBody}
              contentContainerStyle={styles.categoryAddModalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
            >
              {categoryAddModalCategoryId && (() => {
                const category = ingredientCategories.find(c => c.id === categoryAddModalCategoryId);
                if (!category) return null;
                const availableIngredients = category.ingredients.filter(
                  (ing: { name: string }) => !ingredients.some(i => normalizeIngredientName(i.name) === normalizeIngredientName(ing.name))
                );
                return (
                  <View style={styles.categoryAddModalGrid}>
                    {availableIngredients.map((ingredient: { id: string; name: string; icon: string }) => {
                      const isSelected = selectedIngredientsForCategoryModal.some(
                        n => normalizeIngredientName(n) === normalizeIngredientName(ingredient.name)
                      );
                      return (
                        <Pressable
                          key={ingredient.id}
                          style={({ pressed }) => [
                            styles.manualIngredientItem,
                            isSelected && styles.ingredientItemSelected,
                            pressed && { opacity: 0.7 }
                          ]}
                          onPress={() => toggleCategoryModalIngredient(ingredient.name)}
                          hitSlop={8}
                        >
                          <Text style={styles.ingredientIcon}>{ingredient.icon}</Text>
                          <Text style={[styles.manualIngredientName, isSelected && styles.ingredientNameSelected]}>
                            {ingredient.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}
            </ScrollView>
            <View style={[styles.categoryAddModalFooter, { paddingBottom: Platform.OS === 'ios' ? 40 : Math.max(insets.bottom, 60) }]}>
              <TouchableOpacity
                style={[styles.categoryAddModalButton, selectedIngredientsForCategoryModal.length === 0 && styles.categoryAddModalButtonDisabled]}
                onPress={confirmCategoryAddModal}
                disabled={selectedIngredientsForCategoryModal.length === 0}
              >
                <Text style={styles.categoryAddModalButtonText}>{I18n.t('recipeSummary.add')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal des filtres */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={closeFilterModal}
      >
        <View
          style={styles.modalOverlay}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) closeFilterModal();
          }}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: filterSlideAnim }],
                maxHeight: screenHeight * 0.85,
                paddingBottom: Platform.OS === 'ios' ? 40 : Math.max(insets.bottom, 60)
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{I18n.t('recipeSummary.recipePreferences')}</Text>
              <TouchableOpacity onPress={closeFilterModal} style={styles.modalCloseButton}>
                <IconSymbol name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterModalBody}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="always"
            >
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{I18n.t('recipeSummary.dishType')}</Text>
                <View style={styles.chipsContainer}>
                  {DISH_TYPES.map(dt => renderChip(dt.label, preferences.dishType === dt.id, () => updatePreference('dishType', dt.id), dt.id))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{I18n.t('recipeSummary.time')}</Text>
                <View style={styles.chipsContainer}>
                  {DURATIONS.map(d => renderChip(d.label, preferences.duration === d.id, () => updatePreference('duration', d.id), d.id))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{I18n.t('recipeSummary.goal')}</Text>
                <View style={styles.chipsContainer}>
                  {GOALS.map(g => renderChip(g.label, preferences.goal === g.id, () => updatePreference('goal', g.id), g.id, g.id !== 'neutral'))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{I18n.t('recipeSummary.equipments')}</Text>
                <View style={styles.chipsContainer}>
                  {EQUIPMENTS.map(e => renderChip(e.label, preferences.equipments.includes(e.id), () => toggleEquipment(e.id), e.id, false))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{I18n.t('recipeSummary.cuisine')}</Text>
                <View style={styles.chipsContainer}>
                  {CUISINE_STYLES.map(c => renderChip(c.label, preferences.cuisineStyle.includes(c.id), () => toggleCuisineStyle(c.id), c.id, false))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{I18n.t('recipeSummary.servings')}</Text>
                <View style={styles.chipsContainer}>
                  {[1, 2, 3, 4, 5, 6].map(s => renderChip(s.toString(), preferences.servings === s, () => updatePreference('servings', s), s.toString(), false))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{I18n.t('recipeSummary.avoidIngredients')}</Text>
                <View style={styles.chipsContainer}>
                  {ALLERGIES.map(a => renderChip(a.label, preferences.allergies.includes(a.id), () => toggleAllergy(a.id), a.id, false))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{I18n.t('recipeSummary.diet')}</Text>
                <View style={styles.chipsContainer}>
                  {DIETS.map(d => renderChip(d.label, preferences.diet === d.id, () => toggleDiet(d.id), d.id, false))}
                </View>
              </View>

              <View style={[styles.filterSection, { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 20 }]}>
                <TouchableOpacity
                  style={styles.switchContainer}
                  activeOpacity={subscriptionStatus.isSubscribed || isFirstGeneration || params.isOnboarding === 'true' ? 1 : 0.7}
                  onPress={() => {
                    if (!subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true') {
                      router.push({ pathname: '/paywall', params: { source: 'filter_allow_other_ingredients' } });
                    }
                  }}
                >
                  <View style={styles.switchTextContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.switchLabel}>{I18n.t('recipeSummary.allowOtherIngredients')}</Text>
                      {!subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true' && (
                        <Ionicons name="lock-closed" size={16} color={Colors.light.button} />
                      )}
                    </View>
                    <Text style={styles.switchDescription}>
                      {I18n.t('recipeSummary.allowOtherIngredientsDescription')}
                    </Text>
                  </View>
                  <Switch
                    value={preferences.allowOtherIngredients}
                    onValueChange={(value) => {
                      if (!subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true') {
                        router.push({ pathname: '/paywall', params: { source: 'filter_allow_other_ingredients' } });
                        return;
                      }
                      updatePreference('allowOtherIngredients', value);
                    }}
                    disabled={!subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true'}
                    trackColor={{ false: '#E0E0E0', true: Colors.light.button }}
                    thumbColor={preferences.allowOtherIngredients ? '#FFFFFF' : '#FFFFFF'}
                    ios_backgroundColor="#E0E0E0"
                  />
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Bouton générer */}
      <View style={[styles.generateButtonContainer, { bottom: Math.max(insets.bottom, 45) + 15 }]}>
        {ingredients.length < MIN_INGREDIENTS && (
          <Text style={styles.minIngredientsText}>
            {I18n.t('recipeSummary.pleaseAddAtLeastFiveIngredients')} ({ingredients.length}/{MIN_INGREDIENTS})
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.generateButton,
            (isLoading || ingredients.length < MIN_INGREDIENTS) && styles.generateButtonDisabled
          ]}
          onPress={handleGenerateRecipe}
          disabled={isLoading || ingredients.length < MIN_INGREDIENTS}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <IconSymbol
                name="sparkles"
                size={20}
                color="white"
                weight="bold"
              />
              <Text style={styles.generateButtonText}>
                {I18n.t('recipeSummary.generate')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  floatingCircleButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContainer: {
    backgroundColor: 'white',
  },
  cardTitle: {
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  filterTrigger: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  filterTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterTriggerText: {
    fontSize: 16,
    color: Colors.light.text,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: '600' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    color: '#000',
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  modalCloseButton: {
    padding: 5,
  },
  filterModalBody: {
    width: '100%',
  },
  filterSection: {
    marginBottom: 25,
  },
  filterSectionTitle: {
    fontSize: 18,
    color: Colors.light.button,
    marginBottom: 12,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F5F0',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  chipSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  chipPremium: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontFamily: 'CronosPro',
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontFamily: 'CronosPro',
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  filtersContainer: {
    marginBottom: 30,
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  filterCard: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterCardContent: {
    alignItems: 'center',
    padding: 20,
  },
  filterCardText: {
    flex: 1,
    marginLeft: 15,
    alignItems: 'center',
  },
  filterCardLabel: {
    marginTop: 5,
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  filterCardValue: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  section: {
    marginBottom: 30,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 32,
    color: Colors.light.text,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  roundAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.button,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ingredientGroup: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  groupTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 18,
    color: Colors.light.text,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  groupCount: {
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#B0B0B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmptyText: {
    fontSize: 15,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingLeft: 4,
  },
  ingredientItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  ingredientName: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
    paddingVertical: 4,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
  },
  generateButtonContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  minIngredientsText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: 'CronosPro',
    marginBottom: 8,
    textAlign: 'center',
  },
  generateButton: {
    width: '100%',
    backgroundColor: Colors.light.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 100,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 19,
    marginLeft: 10,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  manualSelectionContainer: {
    marginBottom: 30,
  },
  categoryIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  categoryIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryIndicatorActive: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  categoryIndicatorIcon: {
    fontSize: 20,
  },
  categoryPage: {
    width: width - 40 - 48,
    paddingHorizontal: 5,
  },
  inputSection: {
    marginBottom: 0,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 15,
    minHeight: 50,
    marginBottom: 20,
  },
  manualTextInput: {
    flex: 1,
    fontFamily: 'CronosPro',
    fontSize: 16,
    color: '#000',
    paddingRight: 10,
    minWidth: 0,
  },
  microInlineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
  },
  microInlineButtonActive: {
    backgroundColor: '#DB5244',
  },
  manualAddButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  manualAddButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  manualAddButtonText: {
    color: 'white',
    fontSize: 14,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  liveTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9EB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  liveText: {
    flex: 1,
    fontFamily: 'CronosPro',
    fontSize: 15,
    color: '#856404',
    fontStyle: 'italic',
  },
  voiceSectionInModal: {
    alignItems: 'flex-start',
    paddingTop: 0,
    paddingBottom: 0,
    width: '100%',
  },
  microWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraSectionInModal: {
    marginBottom: 20,
    alignItems: 'flex-start',
    width: '100%',
  },
  cameraWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  cameraCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCircleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.button,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 10,
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 20,
    color: Colors.light.button,
    marginBottom: 15,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  manualSelectionInModal: {
    paddingBottom: 20,
  },
  addModalBody: {
    width: '100%',
  },
  tagsWrapper: {
    marginBottom: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
  },
  tagsInnerContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  seeMoreButton: {
    alignSelf: 'flex-end',
    marginTop: 5,
    paddingHorizontal: 5,
  },
  seeMoreText: {
    fontFamily: 'CronosPro',
    fontSize: 14,
    color: Colors.light.button,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tagText: {
    fontFamily: 'CronosPro',
    fontSize: 13,
    color: Colors.light.text,
    marginRight: 4,
  },
  tagRemoveButton: {
    padding: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 20,
    color: Colors.light.text,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
  },
  categoryAddModalContent: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  categoryAddModalBody: {
    maxHeight: '70%',
  },
  categoryAddModalBodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  categoryAddModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categoryAddModalFooter: {
    padding: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginHorizontal: -24, // Pour toucher les bords de la modale
  },
  categoryAddModalButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAddModalButtonDisabled: {
    opacity: 0.5,
  },
  categoryAddModalButtonText: {
    fontSize: 18,
    color: 'white',
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
  },
  manualIngredientItem: {
    width: (width - 125) / 3, // Réduit légèrement pour garantir 3 colonnes sur tous les écrans
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 80,
    justifyContent: 'center',
  },
  ingredientItemSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  ingredientIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  manualIngredientName: {
    fontSize: 12,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
    textAlign: 'center'
  },
  ingredientNameSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingOverlay: {
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
    fontFamily: 'Degular',
    textAlign: 'center',
  },
});
