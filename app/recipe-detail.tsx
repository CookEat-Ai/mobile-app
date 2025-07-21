import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const colors = Colors.light;
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLiked, setIsLiked] = useState(false);

  // Données de la recette (à remplacer par les vraies données)
  const recipe = {
    id: params.id as string,
    title: 'Gourmet dessert',
    description: 'Elegant layered mousse cake with fresh fruit toppings, including blueberries, kiwi.',
    image: 'https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg',
    cookingTime: '30 mins',
    difficulty: 'Medium',
    servings: '4 people',
    ingredients: [
      {
        id: '1',
        name: 'Salmon',
        quantity: '300 gr',
        image: 'https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg',
        tags: ['Protein', 'Fat', 'Omega-3']
      }
    ]
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleLikePress = () => {
    setIsLiked(!isLiked);
  };

  const handleRateRecipe = () => {
    console.log('Rate recipe pressed');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Section Image avec boutons overlay */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: recipe.image }}
              style={styles.recipeImage}
              resizeMode="cover"
            />

            {/* Overlay sombre pour les boutons */}
            <View style={styles.imageOverlay} />

            {/* Bouton retour */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            {/* Bouton like */}
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLikePress}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color={isLiked ? "#FF0000" : "#000"}
              />
            </TouchableOpacity>
          </View>

          {/* Section Informations */}
          <View style={styles.infoContainer}>
            {/* Titre */}
            <Text style={styles.recipeTitle}>{recipe.title}</Text>

            {/* Description */}
            <Text style={styles.recipeDescription}>{recipe.description}</Text>

            {/* Métriques */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <Ionicons name="time-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>{t('recipe.cookingTime')}</Text>
                <Text style={styles.metricValue}>{recipe.cookingTime}</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="star-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>{t('recipe.difficulty')}</Text>
                <Text style={styles.metricValue}>{recipe.difficulty}</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="people-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>{t('recipe.servings')}</Text>
                <Text style={styles.metricValue}>{recipe.servings}</Text>
              </View>
            </View>

            {/* Section Ingrédients */}
            <View style={styles.ingredientsSection}>
              <Text style={styles.ingredientsTitle}>{t('recipe.ingredients')} ({recipe.ingredients.length})</Text>

              {recipe.ingredients.map((ingredient) => (
                <View key={ingredient.id} style={styles.ingredientItem}>
                  <Image
                    source={{ uri: ingredient.image }}
                    style={styles.ingredientImage}
                    resizeMode="cover"
                  />
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientQuantity}>{ingredient.quantity}</Text>
                  </View>
                  <View style={styles.ingredientTags}>
                    {ingredient.tags.map((tag, index) => (
                      <View key={index} style={[styles.tag, { backgroundColor: getTagColor(tag) }]}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bouton Rate Recipe */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.rateButton}
            onPress={handleRateRecipe}
          >
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.rateButtonText}>{t('recipe.rateRecipe')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const getTagColor = (tag: string) => {
  switch (tag) {
    case 'Protein':
      return '#90EE90';
    case 'Fat':
      return '#FFB6C1';
    case 'Omega-3':
      return '#87CEEB';
    default:
      return '#E0E0E0';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: height * 0.4,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  likeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  recipeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  ingredientsSection: {
    marginBottom: 100,
  },
  ingredientsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  ingredientImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ingredientQuantity: {
    fontSize: 14,
    color: '#666',
  },
  ingredientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#000',
    fontWeight: '500',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  rateButton: {
    backgroundColor: '#333',
    borderRadius: 2000,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  rateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 