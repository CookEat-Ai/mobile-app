import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
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
import apiService from '../services/api';
import revenueCatService from '../config/revenuecat';
import recipeStorageService from "../services/recipeStorage";

const { width, height } = Dimensions.get('window');

interface Recipe {
  id: string;
  title: string;
  difficulty: string;
  cooking_time: string;
  icon: string;
  image: string;
  calories: number;
  lipids: number;
  proteins: number;
  servings?: number;
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

  const existingRecipesWithSameIngredients = useRef(JSON.parse(params.existingRecipesWithSameIngredients as string));
  const [recipe, setRecipe] = useState<Recipe>(JSON.parse(params.recipe as string));

  const [loadingSteps, setLoadingSteps] = useState(!recipe.steps?.length);
  const [loadingImage, setLoadingImage] = useState(!recipe.image);
  const [isGeneratingNewRecipe, setIsGeneratingNewRecipe] = useState(false);
  const firstTime = useRef(true);
  const firstTimeImage = useRef(true);
  const firstTimeSteps = useRef(true);

  useEffect(() => {
    // Charger les étapes si nécessaire
    if (!recipe.steps?.length && firstTimeSteps.current) {
      firstTimeSteps.current = false;
      getRecipeSteps(recipe as any).then((details) => {
        setRecipe((prevRecipe) => ({ ...prevRecipe, ...details }));
        setLoadingSteps(false);
      });
    }
    // Charger l'image si nécessaire
    if (!recipe.image && firstTimeImage.current) {
      firstTimeImage.current = false;
      searchImage(recipe.title, existingRecipesWithSameIngredients.current.map((recipe: any) => recipe.image)).then((image) => {
        if (image)
          setRecipe((prevRecipe) => ({ ...prevRecipe, image }));
        setLoadingImage(false);
      });
    }
    else if (recipe.image && recipe.steps && firstTime.current) {
      firstTime.current = false;
      recipeStorageService.saveGeneratedRecipe(recipe, params.ingredients as string[]);
      existingRecipesWithSameIngredients.current.push(recipe);

      // Sauvegarder la recette dans la base de données
      apiService.saveRecipe(recipe)
        .then((response) => {
          if (response.data?.success) {
            console.log('Recette sauvegardée avec succès:', response.data.message);
          }
        })
        .catch((error) => {
          console.error('Erreur lors de la sauvegarde de la recette:', error);
        });
    }
  }, [recipe]);

  const handleBackPress = () => {
    router.back();
  };

  const handleLikePress = () => {
    setIsLiked(!isLiked);
  };

  const handleLikeRecipe = () => {
    apiService.likeRecipe(recipe.id)
      .then((response) => {
        console.log('Recette likée avec succès:', response.data);
      })
      .catch((error) => {
        console.error('Erreur lors du like de la recette:', error);
      });
  };

  const handleAddToFavorites = () => {
    // Ajouter la recette aux favoris
    setIsLiked(true);
    Alert.alert('Succès', 'Recette ajoutée à vos favoris !');
  };

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '-';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleGenerateRecipe = async () => {
    // Vérifier le quota quotidien
    if (!(await revenueCatService.getSubscriptionStatus()).isSubscribed) {
      router.push('/paywall');
      return;
    }

    try {
      setIsGeneratingNewRecipe(true);

      // Récupérer les ingrédients depuis les paramètres de navigation
      const ingredientsParam = params.ingredients as string;
      if (!ingredientsParam) {
        Alert.alert('Erreur', 'Impossible de récupérer la liste des ingrédients');
        return;
      }

      // Récupérer les préférences depuis les paramètres ou utiliser des valeurs par défaut
      const preferencesParam = params.preferences as string;
      let preferences = {
        dishType: 'tout',
        duration: 'rapide',
        servings: 2,
        cuisineStyle: 'toutes',
        diet: 'aucun',
        difficulty: 'facile',
        allowOtherIngredients: false
      };

      if (preferencesParam) {
        try {
          preferences = JSON.parse(preferencesParam);
        } catch (error) {
          console.error('Erreur lors du parsing des préférences:', error);
        }
      }

      // Appeler l'API pour générer une nouvelle recette (différente des recettes déjà générées avec les mêmes ingrédients)
      const response = await apiService.generateSingleRecipeWithFilters(
        ingredientsParam,
        preferences.dishType,
        preferences.duration,
        preferences.servings,
        preferences.cuisineStyle,
        preferences.diet,
        preferences.difficulty,
        preferences.allowOtherIngredients,
        existingRecipesWithSameIngredients.current
      );

      if (response.data?.recipe) {
        const newRecipe = response.data.recipe;

        // Remplacer la recette actuelle par la nouvelle
        firstTime.current = true;
        firstTimeSteps.current = true;
        firstTimeImage.current = true;

        setRecipe(newRecipe);
        setLoadingSteps(!newRecipe.steps);
        setLoadingImage(!newRecipe.image);
      } else {
        Alert.alert('Erreur', response.error || 'Impossible de générer une nouvelle recette. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la nouvelle recette:', error);
      Alert.alert('Erreur', 'Impossible de générer une nouvelle recette. Veuillez réessayer.');
    } finally {
      setIsGeneratingNewRecipe(false);
    }
  };

  const handleNutritionPress = async () => {
    if (!(await revenueCatService.getSubscriptionStatus()).isSubscribed) {
      router.push('/paywall');
      return;
    }

    // Afficher les informations nutritionnelles détaillées
    Alert.alert('Informations Nutritionnelles', 'Cette fonctionnalité est réservée aux abonnés premium.');
  };

  // Fonction pour traduire la difficulté
  const translateDifficulty = (difficulty: string) => {
    if (!difficulty) return '-';

    // Normaliser la difficulté (enlever les espaces, mettre en minuscules)
    const normalizedDifficulty = difficulty.toUpperCase().trim();

    // Essayer de traduire avec la clé exacte
    const translation = t(`recipe.difficultyLevels.${normalizedDifficulty}`);

    // Si la traduction retourne la même clé, c'est qu'elle n'existe pas
    if (translation === `recipe.difficultyLevels.${normalizedDifficulty}`) {
      // Fallback : capitaliser la première lettre
      return capitalizeFirstLetter(difficulty);
    }

    return translation;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modale de chargement */}
      {isGeneratingNewRecipe && <View style={styles.modalOverlay}>
        <Wave color={Colors.light.button} size={100} />
        <Text style={styles.loadingText}>Génération d&apos;une nouvelle recette...</Text>
      </View>}

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

          <View style={{ position: 'absolute', right: 10, bottom: 10, zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 10, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>
              Image d&apos;illustration
            </Text>
          </View>

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

          {/* Métriques - Première ligne */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="time-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>{t('recipe.cookingTime')}</Text>
              </View>

              <Text style={styles.metricValue}>{recipe.cooking_time || '-'}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="star-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>{t('recipe.difficulty')}</Text>
              </View>
              <Text style={styles.metricValue}>{translateDifficulty(recipe.difficulty)}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="people-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>{t('recipe.servings')}</Text>
              </View>

              <Text style={styles.metricValue}>{recipe.servings || '-'}</Text>
            </View>
          </View>

          {/* Métriques - Deuxième ligne */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="flame-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>Calories</Text>
              </View>

              <Text style={styles.metricValue}>{recipe.calories || '-'}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="fitness-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>Protéines</Text>
              </View>
              <Text style={styles.metricValue}>{recipe.proteins || '-'}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="water-outline" size={24} color="#666" />
                <Text style={styles.metricLabel}>Lipides</Text>
              </View>

              <Text style={styles.metricValue}>{recipe.lipids || '-'}</Text>
            </View>
          </View>

          {/* Section Ingrédients */}
          <View style={styles.ingredientsSection}>
            <Text style={styles.ingredientsTitle}>{t('recipe.ingredients')} {`(${recipe.ingredients?.length})`}</Text>

            {recipe.ingredients?.map((ingredient: any) => (
              <View key={uuid.v4()} style={styles.ingredientItem}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>{ingredient.icon}</Text>

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
          <View>
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

          {/* Section Bon appétit */}
          <View style={styles.bonAppetitSection}>
            <View style={styles.bonAppetitRow}>
              <View style={styles.divider} />
              <Text style={styles.bonAppetitText}>Bon appétit !</Text>
              <View style={styles.divider} />
            </View>

            <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                style={styles.likeRecipeButton}
                onPress={handleAddToFavorites}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={24}
                  color={isLiked ? Colors.light.button : "#666"}
                />
                <Text style={[styles.likeRecipeText, { color: isLiked ? Colors.light.button : "#666" }]}>
                  Ajouter à mes recettes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.likeRecipeButton}
                onPress={handleLikeRecipe}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isLiked ? "star" : "star-outline"}
                  size={24}
                  color={isLiked ? Colors.light.button : "#666"}
                />
                <Text style={[styles.likeRecipeText, { color: isLiked ? Colors.light.button : "#666" }]}>
                  J&apos;ai aimé cette recette
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Bouton Generate Recipe */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.favoriteButton, isGeneratingNewRecipe && styles.favoriteButtonDisabled]}
          onPress={handleGenerateRecipe}
          disabled={isGeneratingNewRecipe}
        >
          <Ionicons name={isGeneratingNewRecipe ? "time" : "sparkles"} size={20} color="white" />
          <Text style={styles.rateButtonText}>
            {isGeneratingNewRecipe ? 'Génération...' : 'Générer une autre recette'}
          </Text>
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
    paddingTop: 10,
  },
  recipeTitle: {
    fontFamily: 'Degular',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  recipeDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  metricLabel: {
    textAlign: 'center',
    fontFamily: 'Cronos Pro',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  metricValue: {
    textAlign: 'center',
    fontFamily: 'Degular',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  ingredientsSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  ingredientsTitle: {
    fontFamily: 'Degular',
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
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ingredientQuantity: {
    fontFamily: 'Cronos Pro',
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
    fontFamily: 'Cronos Pro',
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
    backgroundColor: Colors.light.button,
    borderRadius: 2000,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  rateButtonText: {
    color: 'white',
    fontFamily: 'Cronos Pro',
    fontSize: 18,
    fontWeight: '600',
  },
  favoriteButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(238, 238, 238, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 40,
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: 'Degular',
    textAlign: 'center',
  },
  stepsTitle: {
    fontFamily: 'Degular',
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
    fontFamily: 'Cronos Pro',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
  },
  bonAppetitSection: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 100,
  },
  bonAppetitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15,
  },
  bonAppetitText: {
    fontSize: 32,
    fontFamily: 'Degular',
    fontWeight: 'bold',
  },
  likeRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  likeRecipeText: {
    fontSize: 16,
    fontFamily: 'Cronos Pro',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  disabledText: {
    opacity: 0.5,
  },
}); 