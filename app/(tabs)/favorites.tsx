import { router, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from 'react';
import I18n from '../../i18n';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { RecipeCard } from "../../components/RecipeCard";
import { Wave } from "react-native-animated-spinkit";
import favoritesStorageService from '../../services/favoritesStorage';
import recipeStorageService from '../../services/recipeStorage';

// Interface pour les recettes
interface Recipe {
  _id: string;
  id: string;
  title: string;
  image?: string;
  icon?: string;
  cooking_time: string;
  difficulty: string;
  servings?: number;
  likedBy?: number;
  createdAt?: string;
  ingredientsCount?: number;
  stepsCount?: number;
}

export default function FavoritesScreen() {
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Charger les recettes depuis AsyncStorage
  const loadRecipes = async (showLoader: boolean = false) => {
    try {
      if (showLoader) setLoading(true);
      const favorites = await favoritesStorageService.getFavorites();
      
      if (favorites && favorites.length > 0) {
        const imageById = new Map<string, string>();
        try {
          const storedRecipes = await recipeStorageService.getStoredRecipes();
          storedRecipes.forEach((stored: any) => {
            if (stored?.id && stored?.recipe?.image && !imageById.has(stored.id)) {
              imageById.set(stored.id, stored.recipe.image);
            }
          });
        } catch {
          // Ignore local fallback errors
        }

        setRecipes(
          favorites.map((recipe) => ({
            ...recipe,
            image: recipe.image || imageById.get(recipe.id),
          }))
        );
      } else if (__DEV__) {
        // Données de test en mode DEV si vide
        setRecipes([
          {
            _id: 'fav-1',
            id: 'mock-1',
            title: 'Saumon Grillé au Citron',
            cooking_time: '25 min',
            difficulty: 'EASY',
            ingredientsCount: 6,
            stepsCount: 8,
            image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=200&auto=format&fit=crop'
          },
          {
            _id: 'fav-2',
            id: 'mock-2',
            title: 'Pâtes Fraîches au Pesto',
            cooking_time: '15 min',
            difficulty: 'MEDIUM',
            ingredientsCount: 4,
            stepsCount: 5,
            image: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?q=80&w=200&auto=format&fit=crop'
          }
        ]);
      } else {
        setRecipes([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
    } finally {
      if (showLoader) setLoading(false);
      if (!hasLoadedOnce) setHasLoadedOnce(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecipes(!hasLoadedOnce);
    }, [hasLoadedOnce])
  );

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: '/recipe-detail',
      params: {
        recipe: JSON.stringify(recipe),
        showGenerateButton: 'false',
        isHistory: 'true'
      }
    });
  };

  return (
    <LinearGradient
      colors={['#F6EEE9', '#FFFFFF']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      locations={[0, 0.3]}
      style={[styles.container, { paddingTop: insets.top + 20 }]}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.mainTitle}>{I18n.t('favorites.title')}</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Wave size={50} color={colors.button} />
          </View>
        ) : recipes.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>{I18n.t('favorites.noFavorites')}</Text>
          </View>
        ) : (
          recipes.map((item) => (
            <RecipeCard 
              key={item._id || item.id} 
              item={item as any} 
              onPress={() => handleRecipePress(item)} 
            />
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  noResultsText: {
    fontSize: 18,
    fontFamily: 'Cronos Pro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
}); 