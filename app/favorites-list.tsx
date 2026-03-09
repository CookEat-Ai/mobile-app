import { router, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef } from 'react';
import I18n from '../i18n';
import { FlatList, StyleSheet, Text, View, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { RecipeCard } from "../components/RecipeCard";
import { Wave } from "react-native-animated-spinkit";
import favoritesStorageService from '../services/favoritesStorage';

interface Recipe {
  id: string;
  title: string;
  image?: string;
  icon?: string;
  cooking_time: string;
  difficulty: string;
  servings?: number;
  likedBy?: number;
  ingredients?: any[];
  steps?: any[];
  calories?: string;
  proteins?: string;
}

export default function FavoritesListScreen() {
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasLoadedOnceRef = useRef(hasLoadedOnce);
  hasLoadedOnceRef.current = hasLoadedOnce;

  const loadRecipes = useCallback(async (showLoader: boolean = false) => {
    try {
      if (showLoader) setLoading(true);
      const favorites = await favoritesStorageService.getFavorites();
      setRecipes(favorites || []);
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
    } finally {
      setLoading(false);
      if (!hasLoadedOnceRef.current) setHasLoadedOnce(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecipes(!hasLoadedOnceRef.current);
    }, [loadRecipes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecipes(false);
    setRefreshing(false);
  }, [loadRecipes]);

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: '/recipe-detail',
      params: {
        recipeId: recipe.id,
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
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.mainTitle}>{I18n.t('favorites.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Wave size={50} color={colors.button} />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard
              item={item as any}
              onPress={() => handleRecipePress(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.button}
            />
          }
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>{I18n.t('favorites.noFavorites')}</Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainTitle: {
    fontSize: 24,
    color: Colors.light.text,
    ...Platform.select({
      ios: { fontFamily: 'Degular', fontWeight: 'bold' as const },
      android: { fontFamily: 'Degular' },
    }),
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
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
