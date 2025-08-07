import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import I18n from '../i18n';
import { Colors } from '../constants/Colors';
import { IconSymbol } from '../components/ui/IconSymbol';
import { Wave } from "react-native-animated-spinkit";
import apiService from '../services/api';
import { useRecipeContext } from '../contexts/RecipeContext';
import '../i18n';
import uuid from 'react-native-uuid';
import { useSubscription } from '../hooks/useSubscription';
import revenueCatService from '../config/revenuecat';
import recipeStorageService from '../services/recipeStorage';
import AsyncStorage from "@react-native-async-storage/async-storage";

type RecipeSummaryParams = {
  ingredients: string;
  existingRecipes?: string; // Recettes existantes passées depuis pantry.tsx
};

interface Ingredient {
  id: string;
  name: string;
}

interface RecipePreferences {
  dishType: string;
  duration: string;
  servings: number;
  cuisineStyle: string;
  diet: string;
  calories: string;
  allowOtherIngredients: boolean;
}

const STORAGE_KEY = 'pantry_ingredients';

export default function RecipeSummaryScreen() {
  const DISH_TYPES = useMemo(() => [
    { id: 'tout', label: I18n.t('recipeSummary.all') },
    { id: 'soupe', label: I18n.t('recipeSummary.soup') },
    { id: 'gratin', label: I18n.t('recipeSummary.gratin') },
    { id: 'repas', label: I18n.t('recipeSummary.meal') },
    { id: 'dessert', label: I18n.t('recipeSummary.dessert') }
  ], []);

  const DURATIONS = useMemo(() => [
    { id: 'rapide', label: I18n.t('recipeSummary.quick') },
    { id: 'moyen', label: I18n.t('recipeSummary.medium') },
    { id: 'long', label: I18n.t('recipeSummary.long') },
  ], []);

  const CUISINE_STYLES = useMemo(() => [
    { id: 'toutes', label: I18n.t('recipeSummary.all') },
    { id: 'epicee', label: I18n.t('recipeSummary.spicy') },
    { id: 'italien', label: I18n.t('recipeSummary.italian') },
    { id: 'mexicain', label: I18n.t('recipeSummary.mexican') },
    { id: 'francais', label: I18n.t('recipeSummary.french') },
    { id: 'asiatique', label: I18n.t('recipeSummary.asian') },
    { id: 'mediterraneen', label: I18n.t('recipeSummary.mediterranean') },
  ], []);

  const DIETS = useMemo(() => [
    { id: 'aucun', label: I18n.t('recipeSummary.none') },
    { id: 'halal', label: I18n.t('recipeSummary.halal') },
    { id: 'vegetarien', label: I18n.t('recipeSummary.vegetarian') },
    { id: 'vegetalien', label: I18n.t('recipeSummary.vegan') }
  ], []);

  const CALORIES = useMemo(() => [
    { id: '600', label: I18n.t('recipeSummary.lessThan600Cal') },
    { id: '800', label: I18n.t('recipeSummary.lessThan800Cal') },
    { id: '1000', label: I18n.t('recipeSummary.lessThan1000Cal') },
    { id: '1200', label: I18n.t('recipeSummary.lessThan1200Cal') },
  ], []);

  const colors = Colors.light;

  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<RecipeSummaryParams>();
  const { checkPremiumAccess } = useSubscription();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<RecipePreferences>({
    dishType: 'tout',
    duration: 'rapide',
    servings: 2,
    cuisineStyle: 'toutes',
    diet: 'aucun',
    calories: '500',
    allowOtherIngredients: false,
  });

  useEffect(() => {
    if (params.ingredients) {
      const ingredientsList = params.ingredients.split(',').map((ingredient, index) => ({
        id: index.toString(),
        name: ingredient.trim(),
      }));
      setIngredients(ingredientsList);
      saveIngredientsToPantry(ingredientsList);
    }
    loadDietaryPreference();
  }, [params.ingredients]);

  const saveIngredientsToPantry = async (items: Ingredient[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des ingrédients:', error);
    }
  };

  const loadDietaryPreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('dietary_preference');
      if (savedPreference) {
        // Convertir le format du profil vers le format des filtres
        const preferenceMap: { [key: string]: string } = {
          'none': 'aucun',
          'halal': 'halal',
          'vegetarian': 'vegetarien',
          'vegan': 'vegetalien'
        };
        const mappedDiet = preferenceMap[savedPreference] || 'aucun';
        setPreferences(prev => ({ ...prev, diet: mappedDiet }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du régime:', error);
    }
  };

  const removeIngredient = (id: string) => {
    const ingredient = ingredients.find(ing => ing.id === id);
    if (!ingredient) return;

    Alert.alert(
      'Supprimer l\'ingrédient',
      `Voulez-vous vraiment supprimer "${ingredient.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setIngredients(ingredients.filter(ingredient => ingredient.id !== id));
          },
        },
      ]
    );
  };

  const addIngredient = (ingredientName: string) => {
    if (!ingredientName.trim()) {
      return;
    }

    // Capitaliser la première lettre
    const capitalizedName = ingredientName.trim().charAt(0).toUpperCase() + ingredientName.trim().slice(1).toLowerCase();

    // Vérifier si l'ingrédient existe déjà (insensible à la casse)
    const existingIngredient = ingredients.find(
      ingredient => ingredient.name.toLowerCase() === capitalizedName.toLowerCase()
    );

    if (existingIngredient) {
      Alert.alert(
        'Ingrédient déjà présent',
        `L'ingrédient "${capitalizedName}" est déjà dans votre liste.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const newIngredient: Ingredient = {
      id: Date.now().toString(),
      name: capitalizedName,
    };

    setIngredients([...ingredients, newIngredient]);
  };

  const showAddIngredientAlert = () => {
    Alert.prompt(
      I18n.t('recipeSummary.addIngredient'),
      I18n.t('recipeSummary.ingredientName'),
      [
        { text: I18n.t('recipeSummary.cancel'), style: 'cancel' },
        {
          text: I18n.t('recipeSummary.add'),
          onPress: (ingredientName) => {
            if (ingredientName) {
              addIngredient(ingredientName);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const updatePreference = (key: keyof RecipePreferences, value: string | number | boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleDishTypeSelection = () => {
    const currentIndex = DISH_TYPES.findIndex(d => d.id === preferences.dishType);
    const nextIndex = (currentIndex + 1) % DISH_TYPES.length;
    updatePreference('dishType', DISH_TYPES[nextIndex].id);
  };

  const handleDurationSelection = () => {
    const currentIndex = DURATIONS.findIndex(d => d.id === preferences.duration);
    const nextIndex = (currentIndex + 1) % DURATIONS.length;
    updatePreference('duration', DURATIONS[nextIndex].id);
  };

  const handleServingsSelection = () => {
    const newServings = preferences.servings >= 6 ? 1 : preferences.servings + 1;
    updatePreference('servings', newServings);
  };

  const handleCuisineSelection = () => {
    const currentIndex = CUISINE_STYLES.findIndex(c => c.id === preferences.cuisineStyle);
    const nextIndex = (currentIndex + 1) % CUISINE_STYLES.length;
    updatePreference('cuisineStyle', CUISINE_STYLES[nextIndex].id);
  };

  const handleDietSelection = () => {
    const currentIndex = DIETS.findIndex(d => d.id === preferences.diet);
    const nextIndex = (currentIndex + 1) % DIETS.length;
    updatePreference('diet', DIETS[nextIndex].id);
  };

  const handleCaloriesSelection = () => {
    const currentIndex = CALORIES.findIndex(c => c.id === preferences.calories);
    const nextIndex = (currentIndex + 1) % CALORIES.length;
    updatePreference('calories', CALORIES[nextIndex].id);
  };

  const renderFilterCard = (
    icon: string,
    label: string,
    value: string,
    onPress: () => void
  ) => (
    <TouchableOpacity style={styles.filterCard} onPress={onPress}>
      <View style={styles.filterCardContent}>
        <IconSymbol name={icon} size={22} color={Colors.light.textSecondary} weight="regular" />
        <Text style={styles.filterCardLabel}>{label}</Text>

        <View style={styles.filterCardText}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 5 }}>
            <Text
              style={styles.filterCardValue}
              adjustsFontSizeToFit={true}
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {value}
            </Text>
            <IconSymbol name="chevron.down" size={16} color={Colors.light.textSecondary} weight="regular" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleGenerateRecipe = async () => {
    if (ingredients.length === 0) {
      Alert.alert(I18n.t('recipeSummary.error'), I18n.t('recipeSummary.pleaseAddAtLeastOneIngredient'));
      return;
    }

    if (!preferences.dishType) {
      Alert.alert(I18n.t('recipeSummary.error'), I18n.t('recipeSummary.pleaseSelectADishType'));
      return;
    }

    // Vérifier le quota quotidien pour les utilisateurs non abonnés
    if (!(await revenueCatService.getSubscriptionStatus()).isSubscribed) {
      const canGenerate = await revenueCatService.useDailyQuota();
      if (!canGenerate) {
        Alert.alert(
          I18n.t('recipeSummary.dailyQuotaReached'),
          I18n.t('recipeSummary.dailyQuotaReachedDescription'),
          [
            { text: I18n.t('recipeSummary.later'), style: 'cancel' },
            {
              text: I18n.t('recipeSummary.seeOffers'),
              onPress: () => router.push('/paywall')
            }
          ]
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      const ingredientsList = ingredients.map(ing => ing.name).join(', ');
      const ingredientsArray = ingredients.map(ing => ing.name);

      // Récupérer les recettes existantes
      const existingRecipes: any[] = await recipeStorageService.findExistingRecipes(ingredientsArray);

      const response = await apiService.generateSingleRecipeWithFilters(
        ingredientsList,
        preferences.dishType,
        preferences.duration,
        preferences.servings,
        preferences.cuisineStyle,
        preferences.diet,
        preferences.calories,
        preferences.allowOtherIngredients,
        existingRecipes
      );

      if (response.data?.recipe) {
        // await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ingredientsList));
        const recipe = response.data.recipe;

        // Sauvegarder la nouvelle recette générée
        await recipeStorageService.saveGeneratedRecipe(recipe, ingredientsArray);

        // Naviguer vers recipe-detail avec la recette générée
        router.push({
          pathname: '/recipe-detail',
          params: {
            recipe: JSON.stringify(recipe),
            ingredients: JSON.stringify(ingredientsArray),
            preferences: JSON.stringify(preferences),
            existingRecipesWithSameIngredients: JSON.stringify(existingRecipes)
          }
        });
      } else {
        Alert.alert(I18n.t('recipeSummary.error'), response.error || I18n.t('recipeSummary.unableToGenerateRecipe'));
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la recette:', error);
      Alert.alert(I18n.t('recipeSummary.error'), I18n.t('recipeSummary.unableToGenerateRecipe'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterPress = async (filterType: string) => {
    if (!(await revenueCatService.getSubscriptionStatus()).isSubscribed) {
      router.push('/paywall');
      return;
    }

    // Logique existante pour les filtres
    switch (filterType) {
      case 'dishType':
        handleDishTypeSelection();
        break;
      case 'duration':
        handleDurationSelection();
        break;
      case 'servings':
        handleServingsSelection();
        break;
      case 'cuisineStyle':
        handleCuisineSelection();
        break;
      case 'diet':
        handleDietSelection();
        break;
      case 'calories':
        handleCaloriesSelection();
        break;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Modale de chargement */}
      {isLoading && <View style={styles.modalOverlay}>
        <Wave color={Colors.light.button} size={100} />
        <Text style={styles.loadingText}>{I18n.t('recipeSummary.generatingRecipe')}</Text>
      </View>}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{I18n.t('recipeSummary.summary')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cartes de filtres */}
        <View style={styles.filtersContainer}>
          <View style={styles.filtersRow}>
            {renderFilterCard(
              'fork.knife',
              I18n.t('recipeSummary.dishType'),
              preferences.dishType ? DISH_TYPES.find(d => d.id === preferences.dishType)?.label || '' : I18n.t('recipeSummary.all'),
              handleFilterPress.bind(null, 'dishType')
            )}

            {renderFilterCard(
              'clock',
              I18n.t('recipeSummary.duration'),
              DURATIONS.find(d => d.id === preferences.duration)?.label || I18n.t('recipeSummary.quick'),
              handleFilterPress.bind(null, 'duration')
            )}

            {renderFilterCard(
              'flame',
              I18n.t('recipeSummary.calories'),
              CALORIES.find(c => c.id === preferences.calories)?.label || I18n.t('recipeSummary.lessThan500Cal'),
              handleFilterPress.bind(null, 'calories')
            )}
          </View>

          <View style={styles.filtersRow}>
            {renderFilterCard(
              'person.2',
              I18n.t('recipeSummary.servings'),
              preferences.servings.toString(),
              handleFilterPress.bind(null, 'servings')
            )}

            {renderFilterCard(
              'globe',
              I18n.t('recipeSummary.cuisine'),
              CUISINE_STYLES.find(c => c.id === preferences.cuisineStyle)?.label || I18n.t('recipeSummary.all'),
              handleFilterPress.bind(null, 'cuisineStyle')
            )}

            {renderFilterCard(
              'leaf',
              I18n.t('recipeSummary.diet'),
              DIETS.find(d => d.id === preferences.diet)?.label || I18n.t('recipeSummary.none'),
              handleFilterPress.bind(null, 'diet')
            )}
          </View>
        </View>

        {/* Section ingrédients */}
        <View style={styles.section}>
          <View style={styles.ingredientsHeader}>
            <Text style={styles.sectionTitle}>{I18n.t('recipeSummary.ingredients')}</Text>
            <TouchableOpacity style={styles.addButton} onPress={showAddIngredientAlert}>
              <IconSymbol name="plus" size={16} color={Colors.light.button} weight="bold" />
              <Text style={styles.addButtonText}>{I18n.t('recipeSummary.add')}</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{I18n.t('recipeSummary.noIngredients')}</Text>
            </View>
          ) : (
            ingredients.map(ingredient =>
              <View style={styles.ingredientItem} key={ingredient.id}>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeIngredient(ingredient.id)}
                >
                  <IconSymbol name="trash" size={24} color={'gray'} weight="bold" />
                </TouchableOpacity>
              </View>
            ))
          }
        </View>

        {/* Section switch pour autres ingrédients */}
        <View style={styles.section}>
          <View style={styles.switchContainer}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>{I18n.t('recipeSummary.allowOtherIngredients')}</Text>
              <Text style={styles.switchDescription}>
                {I18n.t('recipeSummary.allowOtherIngredientsDescription')}
              </Text>
            </View>
            <Switch
              value={preferences.allowOtherIngredients}
              onValueChange={(value) => updatePreference('allowOtherIngredients', value)}
              trackColor={{ false: '#E0E0E0', true: Colors.light.button }}
              thumbColor={preferences.allowOtherIngredients ? '#FFFFFF' : '#FFFFFF'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>
        </View>
      </ScrollView>

      {/* Bouton générer */}
      <TouchableOpacity
        style={[
          styles.generateButton,
          isLoading && styles.generateButtonDisabled
        ]}
        onPress={handleGenerateRecipe}
        disabled={isLoading}
      >
        <IconSymbol
          name={isLoading ? "clock" : "sparkles"}
          size={20}
          color="white"
          weight="bold"
        />
        <Text style={styles.generateButtonText}>
          {isLoading ? I18n.t('recipeSummary.generating') : I18n.t('recipeSummary.generate')}
        </Text>
      </TouchableOpacity>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9E9',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.light.text,
  },
  headerSpacer: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    fontFamily: 'Cronos Pro',
    color: Colors.light.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  filterCardValue: {
    fontSize: 16,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 28,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.button,
  },
  addButton: {
    backgroundColor: 'white',
    borderColor: Colors.light.button,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: Colors.light.button,
    fontSize: 14,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  ingredientItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ingredientName: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Cronos Pro',
    color: Colors.light.text,
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Cronos Pro',
    color: Colors.light.textSecondary,
  },
  generateButton: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    marginHorizontal: 20,
    backgroundColor: Colors.light.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  switchContainer: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  switchLabel: {
    fontSize: 18,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: Colors.light.textSecondary,
    lineHeight: 20,
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
    fontFamily: 'Degular',
    textAlign: 'center',
  },
}); 