import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/Colors';
import { IconSymbol } from '../components/ui/IconSymbol';
import '../i18n';

type RecipeSummaryParams = {
  ingredients: string;
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
  difficulty: string;
}

const DISH_TYPES = [
  { id: 'soupe', label: 'Soupe' },
  { id: 'gratin', label: 'Gratin' },
  { id: 'repas', label: 'Repas' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'entree', label: 'Entrée' },
  { id: 'autre', label: 'Autre' },
];

const DURATIONS = [
  { id: 'rapide', label: 'Rapide' },
  { id: 'moyen', label: 'Moyen' },
  { id: 'long', label: 'Long' },
];

const CUISINE_STYLES = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'italien', label: 'Italien' },
  { id: 'mexicain', label: 'Mexicain' },
  { id: 'epicee', label: 'Épicée' },
  { id: 'francais', label: 'Français' },
  { id: 'asiatique', label: 'Asiatique' },
  { id: 'mediterraneen', label: 'Méditerranéen' },
];

const DIETS = [
  { id: 'aucun', label: 'Aucun' },
  { id: 'halal', label: 'Halal' },
  { id: 'vegetarien', label: 'Végétarien' },
  { id: 'vegetalien', label: 'Végétalien' },
  { id: 'sans_gluten', label: 'Sans gluten' },
  { id: 'autre', label: 'Autre' },
];

const DIFFICULTIES = [
  { id: 'facile', label: 'Facile' },
  { id: 'moyen', label: 'Moyen' },
  { id: 'difficile', label: 'Difficile' },
];

export default function RecipeSummaryScreen() {
  const colors = Colors.light;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<RecipeSummaryParams>();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [preferences, setPreferences] = useState<RecipePreferences>({
    dishType: '',
    duration: 'rapide',
    servings: 2,
    cuisineStyle: 'toutes',
    diet: 'aucun',
    difficulty: 'facile',
  });

  useEffect(() => {
    if (params.ingredients) {
      const ingredientsList = params.ingredients.split(',').map((ingredient, index) => ({
        id: index.toString(),
        name: ingredient.trim(),
      }));
      setIngredients(ingredientsList);
    }
  }, [params.ingredients]);

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

    const newIngredient: Ingredient = {
      id: Date.now().toString(),
      name: capitalizedName,
    };

    setIngredients([...ingredients, newIngredient]);
  };

  const showAddIngredientAlert = () => {
    Alert.prompt(
      'Ajouter un ingrédient',
      'Nom de l\'ingrédient',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ajouter',
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

  const updatePreference = (key: keyof RecipePreferences, value: string | number) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const renderIngredient = ({ item }: { item: Ingredient }) => (
    <View style={styles.ingredientItem}>
      <Text style={styles.ingredientName}>{item.name}</Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeIngredient(item.id)}
      >
        <IconSymbol name="trash" size={24} color={'gray'} weight="bold" />
      </TouchableOpacity>
    </View>
  );

  const renderFilterCard = (
    icon: string,
    label: string,
    value: string,
    onPress: () => void
  ) => (
    <TouchableOpacity style={styles.filterCard} onPress={onPress}>
      <View style={styles.filterCardContent}>
        <IconSymbol name={icon} size={20} color={Colors.light.textSecondary} weight="regular" />
        <Text style={styles.filterCardLabel}>{label}</Text>

        <View style={styles.filterCardText}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 5 }}>
            <Text style={styles.filterCardValue}>{value}</Text>
            <IconSymbol name="chevron.down" size={16} color={Colors.light.textSecondary} weight="regular" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleGenerateRecipe = () => {
    if (ingredients.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un ingrédient.');
      return;
    }

    if (!preferences.dishType) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de plat.');
      return;
    }

    // TODO: Naviguer vers la page de génération de recette avec les paramètres
    console.log('Générer recette avec:', { ingredients, preferences });
    Alert.alert('Génération', 'Fonctionnalité à implémenter');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Récapitulatif</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cartes de filtres */}
        <View style={styles.filtersContainer}>
          <View style={styles.filtersRow}>
            {renderFilterCard(
              'fork.knife',
              'Type de plat',
              preferences.dishType ? DISH_TYPES.find(d => d.id === preferences.dishType)?.label || '' : 'Tout',
              () => {
                // TODO: Ouvrir modal pour sélectionner le type de plat
                Alert.alert('Type de plat', 'Fonctionnalité à implémenter');
              }
            )}

            {renderFilterCard(
              'clock',
              'Durée',
              DURATIONS.find(d => d.id === preferences.duration)?.label || 'Rapide',
              () => {
                // TODO: Ouvrir modal pour sélectionner la durée
                Alert.alert('Durée', 'Fonctionnalité à implémenter');
              }
            )}

            {renderFilterCard(
              'star',
              'Difficulté',
              DIFFICULTIES.find(d => d.id === preferences.difficulty)?.label || 'Facile',
              () => {
                // TODO: Ouvrir modal pour sélectionner la difficulté
                Alert.alert('Difficulté', 'Fonctionnalité à implémenter');
              }
            )}
          </View>

          <View style={styles.filtersRow}>
            {renderFilterCard(
              'person.2',
              'Convives',
              preferences.servings.toString(),
              () => {
                // TODO: Ouvrir modal pour sélectionner le nombre de convives
                Alert.alert('Convives', 'Fonctionnalité à implémenter');
              }
            )}

            {renderFilterCard(
              'globe',
              'Cuisine',
              CUISINE_STYLES.find(c => c.id === preferences.cuisineStyle)?.label || 'Toutes',
              () => {
                // TODO: Ouvrir modal pour sélectionner la cuisine
                Alert.alert('Cuisine', 'Fonctionnalité à implémenter');
              }
            )}

            {renderFilterCard(
              'leaf',
              'Régime',
              DIETS.find(d => d.id === preferences.diet)?.label || 'Aucun',
              () => {
                // TODO: Ouvrir modal pour sélectionner le régime
                Alert.alert('Régime', 'Fonctionnalité à implémenter');
              }
            )}
          </View>
        </View>

        {/* Section ingrédients */}
        <View style={styles.section}>
          <View style={styles.ingredientsHeader}>
            <Text style={styles.sectionTitle}>Ingrédients</Text>
            <TouchableOpacity style={styles.addButton} onPress={showAddIngredientAlert}>
              <IconSymbol name="plus" size={16} color={Colors.light.button} weight="bold" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun ingrédient ajouté</Text>
            </View>
          ) : (
            <FlatList
              data={ingredients}
              renderItem={renderIngredient}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Bouton générer */}
      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGenerateRecipe}
      >
        <IconSymbol
          name="sparkles"
          size={20}
          color="white"
          weight="bold"
        />
        <Text style={styles.generateButtonText}>
          Générer ma recette
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
    marginTop: 20,
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
    fontSize: 16,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 