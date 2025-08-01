import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wave } from 'react-native-animated-spinkit';
import FavoriteRecipeCard from "../components/FavoriteRecipeCard";
import { IconSymbol } from "../components/ui/IconSymbol";
import { Colors } from '../constants/Colors';
import { useRecipeContext } from '../contexts/RecipeContext';
import { generateRecipesFromText } from '../services/chatgpt';

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { recipes, addRecipe } = useRecipeContext();
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const params = useLocalSearchParams();
  const originalIngredients = params.ingredients as string || '';
  console.log(recipes);
  const generateMoreRecipes = async () => {
    if (!originalIngredients.length) {
      Alert.alert('Erreur', 'Aucun ingrédient disponible pour générer d\'autres recettes');
      return;
    }

    setIsGeneratingMore(true);
    try {
      // Adapter les recettes au format attendu par l'API
      const existingRecipesForAPI = recipes.map(recipe => ({
        title: recipe.title,
        difficulty: recipe.difficulty,
        cooking_time: recipe.cookingTime,
        icon: recipe.icon,
        calories: recipe.calories,
        lipides: recipe.lipids,
        proteines: recipe.proteins,
      }));

      // Passer les recettes existantes pour éviter les doublons
      const newRecipes = await generateRecipesFromText(originalIngredients, existingRecipesForAPI);

      // Ajouter chaque nouvelle recette au contexte
      newRecipes.forEach((recipe: any) => {
        const recipeId = Math.random().toString(36).substr(2, 9);
        addRecipe({
          id: recipeId,
          title: recipe.title,
          difficulty: recipe.difficulty,
          cookingTime: recipe.cooking_time,
          icon: recipe.icon,
          image: '',
          calories: Number(recipe.calories) || 0,
          lipids: Number(recipe.lipides) || 0,
          proteins: Number(recipe.proteines) || 0,
        });
      });
    } catch (error) {
      console.error('Erreur lors de la génération de nouvelles recettes:', error);
      Alert.alert('Erreur', 'Impossible de générer de nouvelles recettes. Veuillez réessayer.');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Loading overlay avec flou */}
      {isGeneratingMore && (
        <View style={styles.modalOverlay}>
          <Wave color={Colors.light.button} size={100} />
          <Text style={styles.loadingText}>Génération de nouvelles recettes...</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="arrow.left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recettes générées</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.recipesScrollView}
        contentContainerStyle={{ paddingBottom: recipes.length < 30 ? 130 : 50 }}
      >
        <View style={styles.recipesContainer}>
          <Text style={styles.recipesTitle}>
            {recipes.length} recette{recipes.length > 1 ? 's' : ''} générée{recipes.length > 1 ? 's' : ''} :
          </Text>
          {recipes.map((recipe, index) => (
            <FavoriteRecipeCard
              key={recipe.id}
              title={recipe.title}
              icon={recipe.icon}
              cookingTime={parseInt(recipe.cookingTime)}
              rating={4.5}
              onPress={() => {
                router.push({
                  pathname: '/recipe-detail',
                  params: {
                    id: recipe.id,
                    title: recipe.title,
                    difficulty: recipe.difficulty,
                    cookingTime: recipe.cookingTime,
                    calories: recipe.calories || 0,
                    lipids: recipe.lipids || 0,
                    proteins: recipe.proteins || 0,
                    icon: recipe.icon
                  }
                });
              }}
            />
          ))}
        </View>
      </ScrollView>

      {recipes.length < 30 && <TouchableOpacity
        style={[styles.continueButton, { bottom: insets.bottom + 20 }]}
        onPress={generateMoreRecipes}
        disabled={isGeneratingMore}
      >
        <Text style={styles.buttonText}>
          {isGeneratingMore ? 'Génération...' : 'Générer d\'autres recettes'}
        </Text>
      </TouchableOpacity>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9E9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Degular',
    color: Colors.light.text,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  recipesContainer: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  recipesTitle: {
    fontSize: 24,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'left',
  },
  recipesScrollView: {
    flex: 1,
  },
  continueButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 200,
    shadowColor: Colors.light.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Degular',
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
}); 