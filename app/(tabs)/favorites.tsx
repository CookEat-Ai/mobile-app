import { router } from "expo-router";
import React, { useState, useEffect } from 'react';
import I18n from '../../i18n';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FavoriteRecipeCard from '../../components/FavoriteRecipeCard';
import SearchBar from '../../components/SearchBar';
import { Colors } from '../../constants/Colors';
import { Wave } from "react-native-animated-spinkit";
import favoritesStorageService from '../../services/favoritesStorage';
import uuid from "react-native-uuid";

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
  addedToFavoritesAt?: string;
}

// Données pour les catégories (difficultés)
const categories = [
  { id: '0', title: 'All' },
  { id: '1', title: 'facile' },
  { id: '2', title: 'moyen' },
  { id: '3', title: 'difficile' },
];

export default function FavoritesScreen() {

  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les recettes depuis AsyncStorage
  const loadRecipes = async () => {
    try {
      setLoading(true);
      const favorites = await favoritesStorageService.getFavorites();
      setRecipes(favorites);
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
      Alert.alert('Erreur', 'Impossible de charger les recettes favorites');
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir les recettes
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  };

  // Charger les recettes au montage du composant
  useEffect(() => {
    loadRecipes();
  }, []);

  const handleCategoryPress = (category: any) => {
    console.log('Category pressed:', category.title);
    if (selectedCategory === category.title.toLowerCase()) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(category.title.toLowerCase());
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    console.log('Recipe pressed:', recipe.title);
    router.push({
      pathname: '/recipe-detail',
      params: {
        id: recipe._id,
        recipe: JSON.stringify(recipe),
        showGenerateButton: 'false'
      }
    });
  };

  const handleRemoveFromFavorites = async (recipe: Recipe) => {
    Alert.alert(
      'Retirer des favoris',
      `Voulez-vous retirer "${recipe.title}" de vos favoris ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (await favoritesStorageService.removeFromFavorites(recipe._id || recipe.id))
                await loadRecipes();
            } catch (error) {
              console.error('❌ Erreur lors de la suppression des favoris:', error);
              Alert.alert('Erreur', 'Impossible de retirer la recette des favoris');
            }
          }
        }
      ]
    );
  };

  const handleSearch = () => {
    console.log('Searching for:', searchText);
  };

  // Filtrer les recettes par catégorie et recherche
  const getFilteredRecipes = () => {
    let filtered = recipes;

    // Filtre par recherche
    if (searchText.trim()) {
      filtered = filtered.filter(recipe =>
        recipe.title.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtre par catégorie (difficulté)
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(recipe =>
        recipe.difficulty === selectedCategory
      );
    }

    return filtered;
  };

  // Convertir le temps de cuisson en minutes
  const parseCookingTime = (cookingTime: string): number => {
    const match = cookingTime.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  return (
    <View style={[styles.container, {
      backgroundColor: colors.background,
      paddingTop: insets.top
    }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: 'Degular', fontSize: 24, fontWeight: 'bold', textAlign: 'right', marginBottom: 20, marginRight: 20 }}>CookEat AI</Text>

        <View style={styles.titleContainer}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {I18n.t('favorites.title')}
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={{ marginBottom: 20 }}>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            onSearch={handleSearch}
          />
        </View>

        {/* Catégories */}
        {/* <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={uuid.v4()}
                activeOpacity={0.8}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: selectedCategory === category.title.toLowerCase() ? colors.button : 'transparent',
                    borderColor: selectedCategory === category.title.toLowerCase() ? colors.button : '#DCDFE0'
                  }
                ]}
                onPress={() => handleCategoryPress(category)}
              >
                <Text style={{ fontFamily: 'Cronos Pro', color: selectedCategory === category.title.toLowerCase() ? 'white' : 'black', fontSize: 16 }}>
                  {t(`favorites.categories.${category.title}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View> */}

        {/* Liste des recettes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Wave size={50} color={colors.button} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {I18n.t('favorites.loadingRecipes')}
            </Text>
          </View>
        ) : getFilteredRecipes().length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
              {recipes.length === 0 && I18n.t('favorites.noFavorites')}
            </Text>
          </View>
        ) : (getFilteredRecipes().map((item) =>
          <View key={uuid.v4()} style={{ marginHorizontal: 20 }}>
            <FavoriteRecipeCard
              title={item.title}
              image={item.image || item.icon}
              cookingTime={parseCookingTime(item.cooking_time)}
              rating={item.likedBy || 0}
              onPress={() => handleRecipePress(item)}
              onRemove={() => handleRemoveFromFavorites(item)}
            />
          </View>
        ))}

        {/* Espace en bas pour la barre de navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
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
    fontFamily: 'Degular',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 34,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginTop: 16,
    marginBottom: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  recipesList: {
    marginTop: 10,
    paddingHorizontal: 20
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 100,
    marginRight: 10,
    borderWidth: 1,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Cronos Pro',
    marginTop: 16,
  },
  bottomSpacer: {
    height: 120,
  },
}); 