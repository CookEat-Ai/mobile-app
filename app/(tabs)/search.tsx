import React, { useState } from 'react';
import { FlatList, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import CategoryButton from '../../components/CategoryButton';
import RecipeCard from '../../components/RecipeCard';
import SearchBar from '../../components/SearchBar';
import { Colors } from '../../constants/Colors';

// Données temporaires pour les recettes
const trendingRecipes = [
  {
    id: '1',
    title: 'Dumplings Chinois Traditionnels',
    image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg", // Utilisation d'une image temporaire
    isLiked: false,
  },
  {
    id: '2',
    title: 'Grillade de Poulet aux Herbes',
    image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp", // Utilisation d'une image temporaire
    isLiked: true,
  },
];

// Données pour les catégories
const categories = [
  { id: '1', title: 'Breakfast', icon: 'restaurant' as const, colorIcon: '#738725' },
  { id: '2', title: 'Lunch', icon: 'fast-food' as const, colorIcon: '#E4982B' },
  { id: '3', title: 'Dinner', icon: 'wine' as const, colorIcon: '#738725' },
  { id: '4', title: 'Snack', icon: 'pizza' as const, colorIcon: '#E4982B' },
  { id: '5', title: 'Cuisine', icon: 'restaurant' as const, colorIcon: '#E4982B' },
  { id: '6', title: 'Smoothies', icon: 'cafe' as const, colorIcon: '#738725' },
  { id: '7', title: 'Dessert', icon: 'ice-cream' as const, colorIcon: '#E4982B' },
  { id: '8', title: 'More', icon: 'ellipsis-horizontal' as const, isMore: true, colorIcon: '#738725' },
];

export default function SearchScreen() {
  const colors = Colors.light;
  const [searchText, setSearchText] = useState('');
  const [likedRecipes, setLikedRecipes] = useState<Set<string>>(new Set(['2']));

  const handleLikePress = (recipeId: string) => {
    const newLikedRecipes = new Set(likedRecipes);
    if (newLikedRecipes.has(recipeId)) {
      newLikedRecipes.delete(recipeId);
    } else {
      newLikedRecipes.add(recipeId);
    }
    setLikedRecipes(newLikedRecipes);
  };

  const handleCategoryPress = (category: any) => {
    console.log('Category pressed:', category.title);
  };

  const handleRecipePress = (recipe: any) => {
    console.log('Recipe pressed:', recipe.title);
  };

  const handleSearch = () => {
    console.log('Searching for:', searchText);
  };

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Titre principal */}
        <View style={styles.titleContainer}>
          <Text style={[styles.mainTitle, { color: colors.button }]}>
            What&apos;s cooking today?
          </Text>
        </View>

        {/* Barre de recherche */}
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          onSearch={handleSearch}
        />

        {/* Grille des catégories */}
        <View style={styles.categoriesContainer}>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <CategoryButton
                key={category.id}
                title={category.title}
                icon={category.icon}
                colorIcon={category.colorIcon}
                isMore={category.isMore}
                onPress={() => handleCategoryPress(category)}
              />
            ))}
          </View>
        </View>

        {/* Section des recettes tendances */}
        <View style={styles.trendingSection}>
          <Text style={[styles.sectionTitle, { color: colors.button }]}>
            Trending Recipe
          </Text>
          <FlatList
            data={trendingRecipes}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recipesList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RecipeCard
                title={item.title}
                image={item.image}
                isLiked={likedRecipes.has(item.id)}
                onPress={() => handleRecipePress(item)}
                onLikePress={() => handleLikePress(item.id)}
              />
            )}
          />
        </View>

        {/* Espace en bas pour la barre de navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
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
  categoriesContainer: {
    marginTop: 10,
    paddingHorizontal: 16,
    marginBottom: 15,
    // width: '100%',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // justifyContent: 'space-between',
    gap: 5,
  },
  trendingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  recipesList: {
    paddingHorizontal: 20,
  },
  bottomSpacer: {
    height: 100, // Espace pour la barre de navigation
  },
});
