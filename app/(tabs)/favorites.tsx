import { router } from "expo-router";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FavoriteRecipeCard from '../../components/FavoriteRecipeCard';
import SearchBar from '../../components/SearchBar';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { Wave } from "react-native-animated-spinkit";

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
  likedBy: number;
  createdAt: string;
}

// Données pour les catégories (difficultés)
const categories = [
  { id: '0', title: 'All' },
  { id: '1', title: 'facile' },
  { id: '2', title: 'moyen' },
  { id: '3', title: 'difficile' },
];

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les recettes depuis l'API
  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getRecipes();

      if (response.data?.recipes) {
        setRecipes(response.data.recipes);
      } else {
        setRecipes([]);
      }
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

  const handleBackPress = () => {
    router.back();
  };

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
        recipe: JSON.stringify(recipe)
      }
    });
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
        <View style={styles.titleContainer}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {t('favorites.title')}
          </Text>
        </View>

        {/* Barre de recherche */}
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          onSearch={handleSearch}
        />

        {/* Catégories */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                activeOpacity={0.8}
                key={category.id}
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
        </View>

        {/* Liste des recettes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Wave size={50} color={colors.button} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement des recettes...
            </Text>
          </View>
        ) : getFilteredRecipes().length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
              {recipes.length === 0 ? 'Aucune recette favorite trouvée' : t('favorites.noResults')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={getFilteredRecipes()}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.recipesList}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            renderItem={({ item }) => (
              <FavoriteRecipeCard
                title={item.title}
                image={item.image || item.icon}
                cookingTime={parseCookingTime(item.cooking_time)}
                rating={item.likedBy || 0}
                onPress={() => handleRecipePress(item)}
              />
            )}
          />
        )}

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