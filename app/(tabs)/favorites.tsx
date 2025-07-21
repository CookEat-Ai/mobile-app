import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FavoriteRecipeCard from '../../components/FavoriteRecipeCard';
import SearchBar from '../../components/SearchBar';
import { Colors } from '../../constants/Colors';

// Données des recettes favorites
const favoriteRecipes = [
  {
    id: '1',
    title: 'Telor ceplok',
    image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
    cookingTime: 9,
    rating: 4.3,
    category: 'breakfast',
  },
  {
    id: '2',
    title: 'Salad vegetarian',
    image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
    cookingTime: 10,
    rating: 4.3,
    category: 'lunch',
  },
  {
    id: '3',
    title: 'Toast with egg',
    image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
    cookingTime: 30,
    rating: 4.3,
    category: 'breakfast',
  },
  {
    id: '4',
    title: 'Salmon sauce',
    image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
    cookingTime: 45,
    rating: 4.3,
    category: 'dinner',
  },
  {
    id: '5',
    title: 'Mashroom soup',
    image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
    cookingTime: 15,
    rating: 4.3,
    category: 'dinner',
  },
  {
    id: '6',
    title: 'Gourmet dessert',
    image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
    cookingTime: 25,
    rating: 4.3,
    category: 'snack',
  },
];

// Données pour les catégories
const categories = [
  { id: '0', title: 'All' },
  { id: '1', title: 'Breakfast' },
  { id: '2', title: 'Lunch' },
  { id: '3', title: 'Dinner' },
  { id: '4', title: 'Snack' },
];

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const router = useRouter();

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

  const handleRecipePress = (recipe: any) => {
    console.log('Recipe pressed:', recipe.title);
    router.push({
      pathname: '/recipe-detail',
      params: { id: recipe.id }
    });
  };

  const handleSearch = () => {
    console.log('Searching for:', searchText);
  };

  // Filtrer les recettes par catégorie et recherche
  const getFilteredRecipes = () => {
    let filtered = favoriteRecipes;

    // Filtre par recherche
    if (searchText.trim()) {
      filtered = filtered.filter(recipe =>
        recipe.title.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtre par catégorie
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(recipe =>
        recipe.category === selectedCategory
      );
    }

    return filtered;
  };

  return (
    <View style={[styles.container, {
      backgroundColor: colors.background,
      paddingTop: insets.top
    }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={[styles.mainTitle, { color: colors.button }]}>
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
                <Text style={{ color: selectedCategory === category.title.toLowerCase() ? 'white' : 'black', fontSize: 16 }}>
                  {t(`favorites.categories.${category.title}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Liste des recettes */}
        {getFilteredRecipes().length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
              {t('favorites.noResults')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={getFilteredRecipes()}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.recipesList}
            renderItem={({ item }) => (
              <FavoriteRecipeCard
                title={item.title}
                image={item.image}
                cookingTime={item.cookingTime}
                rating={item.rating}
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
  bottomSpacer: {
    height: 120,
  },
}); 