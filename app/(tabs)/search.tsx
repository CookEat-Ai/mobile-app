import { router } from "expo-router";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryButton from '../../components/CategoryButton';
import RecipeCard from '../../components/RecipeCard';
import SearchBar from '../../components/SearchBar';
import { Colors } from '../../constants/Colors';

// Données de recettes par catégorie
const recipesByCategory = {
  breakfast: [
    {
      id: 'breakfast-1',
      title: 'Omelette aux Légumes',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: false,
      cookingTime: 15,
      difficulty: 'easy' as const,
      rating: 4.2,
    },
    {
      id: 'breakfast-2',
      title: 'Pancakes aux Myrtilles',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: true,
      cookingTime: 25,
      difficulty: 'medium' as const,
      rating: 4.8,
    },
    {
      id: 'breakfast-3',
      title: 'Bowl de Granola',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: false,
      cookingTime: 10,
      difficulty: 'easy' as const,
      rating: 3.9,
    },
  ],
  lunch: [
    {
      id: 'lunch-1',
      title: 'Salade César',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: true,
      cookingTime: 20,
      difficulty: 'easy' as const,
      rating: 4.5,
    },
    {
      id: 'lunch-2',
      title: 'Wrap Végétarien',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: false,
      cookingTime: 15,
      difficulty: 'easy' as const,
      rating: 4.1,
    },
    {
      id: 'lunch-3',
      title: 'Soupe de Légumes',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: false,
      cookingTime: 45,
      difficulty: 'medium' as const,
      rating: 4.3,
    },
  ],
  dinner: [
    {
      id: 'dinner-1',
      title: 'Pasta Carbonara',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: true,
      cookingTime: 30,
      difficulty: 'medium' as const,
      rating: 4.7,
    },
    {
      id: 'dinner-2',
      title: 'Saumon Grillé',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: false,
      cookingTime: 25,
      difficulty: 'medium' as const,
      rating: 4.4,
    },
    {
      id: 'dinner-3',
      title: 'Risotto aux Champignons',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: true,
      cookingTime: 60,
      difficulty: 'hard' as const,
      rating: 4.9,
    },
  ],
  snack: [
    {
      id: 'snack-1',
      title: 'Hummus et Légumes',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: false,
      cookingTime: 10,
      difficulty: 'easy' as const,
      rating: 3.8,
    },
    {
      id: 'snack-2',
      title: 'Energy Balls',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: true,
      cookingTime: 20,
      difficulty: 'easy' as const,
      rating: 4.6,
    },
    {
      id: 'snack-3',
      title: 'Chips de Kale',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: false,
      cookingTime: 15,
      difficulty: 'medium' as const,
      rating: 4.0,
    },
  ],
  fastfood: [
    {
      id: 'fastFood-1',
      title: 'Burger',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: false,
      cookingTime: 20,
      difficulty: 'medium' as const,
      rating: 4.2,
    },
    {
      id: 'fastFood-2',
      title: 'Pizza',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: true,
      cookingTime: 35,
      difficulty: 'medium' as const,
      rating: 4.8,
    },
    {
      id: 'fastFood-3',
      title: 'Salad',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: false,
      cookingTime: 10,
      difficulty: 'easy' as const,
      rating: 3.9,
    },
  ],
  smoothies: [
    {
      id: 'smoothie-1',
      title: 'Smoothie Vert',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: true,
      cookingTime: 5,
      difficulty: 'easy' as const,
      rating: 4.3,
    },
    {
      id: 'smoothie-2',
      title: 'Smoothie Berry',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: false,
      cookingTime: 8,
      difficulty: 'easy' as const,
      rating: 4.5,
    },
    {
      id: 'smoothie-3',
      title: 'Smoothie Tropical',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: true,
      cookingTime: 7,
      difficulty: 'easy' as const,
      rating: 4.7,
    },
  ],
  dessert: [
    {
      id: 'dessert-1',
      title: 'Tiramisu',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: true,
      cookingTime: 90,
      difficulty: 'hard' as const,
      rating: 4.9,
    },
    {
      id: 'dessert-2',
      title: 'Chocolate Cake',
      image: "https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg",
      isLiked: false,
      cookingTime: 75,
      difficulty: 'hard' as const,
      rating: 4.6,
    },
    {
      id: 'dessert-3',
      title: 'Crème Brûlée',
      image: "https://img.cuisineaz.com/1024x576/2015/09/10/i89762-poulet-a-la-creme-et-aux-champignons.webp",
      isLiked: true,
      cookingTime: 45,
      difficulty: 'medium' as const,
      rating: 4.8,
    },
  ],
};

// Données pour les catégories
const categories = [
  { id: '1', title: 'Breakfast', icon: 'restaurant' as const, colorIcon: '#738725' },
  { id: '2', title: 'Lunch', icon: 'fast-food' as const, colorIcon: '#E4982B' },
  { id: '3', title: 'Dinner', icon: 'wine' as const, colorIcon: '#738725' },
  { id: '4', title: 'Snack', icon: 'pizza' as const, colorIcon: '#E4982B' },
  { id: '5', title: 'FastFood', icon: 'fast-food' as const, colorIcon: '#E4982B' },
  { id: '6', title: 'Smoothies', icon: 'cafe' as const, colorIcon: '#738725' },
  { id: '7', title: 'Dessert', icon: 'ice-cream' as const, colorIcon: '#E4982B' },
  { id: '8', title: 'All', icon: 'ellipsis-horizontal' as const, isMore: true, colorIcon: '#738725' },
];

export default function SearchScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [likedRecipes, setLikedRecipes] = useState<Set<string>>(new Set(['2']));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fonction pour filtrer les recettes par texte de recherche
  const getFilteredRecipes = () => {
    if (!searchText.trim()) {
      // Si pas de recherche, retourner les recettes normales filtrées par catégorie
      return Object.entries(recipesByCategory).filter(([categoryKey, recipes]) => {
        if (selectedCategory === null) {
          return true;
        }
        return categoryKey === selectedCategory;
      });
    }

    // Si il y a une recherche, filtrer toutes les recettes par texte
    const filteredRecipes: { [key: string]: any[] } = {};

    Object.entries(recipesByCategory).forEach(([categoryKey, recipes]) => {
      const matchingRecipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchText.toLowerCase())
      );

      if (matchingRecipes.length > 0) {
        filteredRecipes[categoryKey] = matchingRecipes;
      }
    });

    return Object.entries(filteredRecipes);
  };

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
    if (category.title === 'All') {
      setSelectedCategory(null);
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
    // La recherche se fait automatiquement via le state searchText
  };

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
  };

  return (
    <View style={[styles.container, {
      backgroundColor: colors.background,
      paddingTop: insets.top
    }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Titre principal */}
        <View style={styles.titleContainer}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {t('search.title')}
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
                title={t(`search.categories.${category.title}`)}
                icon={category.icon}
                colorIcon={category.colorIcon}
                isMore={category.isMore}
                isSelected={
                  category.title === 'All'
                    ? selectedCategory === null
                    : selectedCategory === category.title.toLowerCase()
                }
                onPress={() => handleCategoryPress(category)}
              />
            ))}
          </View>
        </View>

        {/* Sections des recettes par catégorie */}
        {getFilteredRecipes().map(([categoryKey, recipes]) => (
          <View key={categoryKey} style={styles.categorySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t(`search.categories.${categoryKey}`)}
            </Text>
            <FlatList
              data={recipes}
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
                  cookingTime={item.cookingTime}
                  difficulty={item.difficulty}
                  rating={item.rating}
                />
              )}
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
  categoriesContainer: {
    marginTop: 10,
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Degular',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  recipesList: {
    paddingHorizontal: 20,
  },
  bottomSpacer: {
    height: 120,
  },
});
