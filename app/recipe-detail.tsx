import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import uuid from 'react-native-uuid';
import { getRecipeIngredients, getRecipeSteps } from "../services/chatgpt";
import { Wave } from "react-native-animated-spinkit";
import { searchImage } from "../services/image";
import { useRecipeContext } from '../contexts/RecipeContext';

const { width, height } = Dimensions.get('window');

interface Recipe {
  id: string;
  title: string;
  difficulty: string;
  cookingTime: string;
  icon: string;
  image: string;
  calories: number;
  lipids: number;
  proteins: number;
  ingredients?: {
    name: string;
    quantity: string;
    icon: string;
    tags: string[];
  }[];
  steps?: {
    title: string;
    description: string;
  }[];
}

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const colors = Colors.light;
  const params = useLocalSearchParams();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const { getRecipe, addRecipe, updateRecipe } = useRecipeContext();

  // Récupérer la recette depuis le contexte ou créer une nouvelle
  const existingRecipe = getRecipe(params.id as string);
  const [recipe, setRecipe] = useState<Recipe>(existingRecipe || {
    id: params.id as string,
    title: params.title as string || 'Recette',
    difficulty: params.difficulty as string || 'Medium',
    cookingTime: params.cookingTime as string || '30 mins',
    icon: params.icon as string || '🍲',
    image: params.image as string,
    calories: parseInt(params.calories as string) || 0,
    lipids: parseInt(params.lipids as string) || 0,
    proteins: parseInt(params.proteins as string) || 0,
  });

  const [loadingIngredients, setLoadingIngredients] = useState(!existingRecipe?.ingredients);
  const [loadingSteps, setLoadingSteps] = useState(!existingRecipe?.steps);
  const [loadingImage, setLoadingImage] = useState(!existingRecipe?.image);

  useEffect(() => {
    // Ajouter la recette au contexte si elle n'existe pas
    if (!existingRecipe) {
      addRecipe(recipe);
    }

    // Charger les ingrédients si nécessaire
    if (!recipe.ingredients && loadingIngredients) {
      getRecipeIngredients(recipe as any).then((details) => {
        setRecipe((prevRecipe) => ({ ...prevRecipe, ...details }));
        updateRecipe(recipe.id, details as Partial<Recipe>);
        setLoadingIngredients(false);
      });
    }

    // Charger les étapes si nécessaire
    if (!recipe.steps && loadingSteps) {
      getRecipeSteps(recipe as any).then((details) => {
        setRecipe((prevRecipe) => ({ ...prevRecipe, ...details }));
        updateRecipe(recipe.id, details as Partial<Recipe>);
        setLoadingSteps(false);
      });
    }

    // Charger l'image si nécessaire
    if (!recipe.image && loadingImage) {
      searchImage(recipe.title).then((image) => {
        if (image) {
          setRecipe((prevRecipe) => ({ ...prevRecipe, image }));
          updateRecipe(recipe.id, { image });
        }
        setLoadingImage(false);
      });
    }
  }, []);

  useEffect(() => {
    if (recipe.image && recipe.ingredients && recipe.steps) {
      console.log('save recipe to api');
    }
  }, [recipe]);

  const handleBackPress = () => {
    router.back();
  };

  const handleLikePress = () => {
    setIsLiked(!isLiked);
  };

  const handleAddToFavorites = () => {
    setIsLiked(!isLiked);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Section Image avec boutons overlay */}
        <View style={styles.imageContainer}>
          {loadingImage
            ? <Wave size={50} color={colors.text} />
            : recipe.image
              ? <Image
                source={{ uri: recipe.image }}
                style={styles.recipeImage}
                resizeMode="cover"
              />
              : <Text style={{ fontSize: width * 0.5 }}>{recipe.icon}</Text>
          }

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
            activeOpacity={0.8}
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
          {/* <Text style={styles.recipeDescription}>{recipe.description}</Text> */}

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
              {/* <Text style={styles.metricValue}>{recipe.servings}</Text> */}
            </View>
          </View>

          {/* Section Ingrédients */}
          <View style={styles.ingredientsSection}>
            <Text style={styles.ingredientsTitle}>{t('recipe.ingredients')} {!loadingIngredients && `(${recipe.ingredients?.length})`}</Text>

            {loadingIngredients
              ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Wave size={50} color={colors.text} />
              </View>
              : recipe.ingredients?.map((ingredient: any) => (
                <View key={uuid.v4()} style={styles.ingredientItem}>
                  <Text style={{ fontSize: 24 }}>{ingredient.icon}</Text>

                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientQuantity}>{ingredient.quantity}</Text>
                  </View>
                  <View style={styles.ingredientTags}>
                    {ingredient.tags?.map((tag: string, index: number) => (
                      <View key={index} style={[styles.tag, { backgroundColor: getTagColor(tag) }]}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
          </View>

          {/* Section Étapes de préparation */}
          <View style={styles.stepsSection}>
            <Text style={styles.stepsTitle}>Etapes {!loadingSteps && `(${recipe.steps?.length})`}</Text>

            {loadingSteps
              ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Wave size={50} color={colors.text} />
              </View>
              : recipe.steps?.map((step: any) => (
                <View key={uuid.v4()} style={styles.stepItem}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              ))}
          </View>

        </View>
      </ScrollView>

      {/* Bouton Rate Recipe */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.favoriteButton}
          onPress={handleAddToFavorites}
        >
          <Ionicons name="heart" size={20} color={isLiked ? "red" : "white"} />
          <Text style={styles.rateButtonText}>{t('recipe.addToFavorites')}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    case 'Carbohydrate':
      return '#FFD700';
    case 'Sugar':
      return '#FF69B4';
    case 'Vitamin':
      return '#FF2970';
    case 'Mineral':
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
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 30,
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
  favoriteButton: {
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
  stepsSection: {
    marginBottom: 100,
  },
  stepsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  stepItem: {
    // flexDirection: 'row',
    // alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
  },
}); 