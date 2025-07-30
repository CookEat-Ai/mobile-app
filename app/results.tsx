import { router } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FavoriteRecipeCard from "../components/FavoriteRecipeCard";
import { IconSymbol } from "../components/ui/IconSymbol";
import { Colors } from '../constants/Colors';
import { useRecipeContext } from '../contexts/RecipeContext';

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { recipes } = useRecipeContext();

  return (
    <SafeAreaView style={styles.container}>
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

      <ScrollView style={styles.recipesScrollView}>
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

      <TouchableOpacity
        style={[styles.continueButton, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          // if free plan, show ad
          if (true) {
            // show ad
          } else {
            // generate recipes
          }
        }}
      >
        <Text style={styles.buttonText}>Générer d&apos;autres recettes</Text>
      </TouchableOpacity>
    </SafeAreaView>
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
}); 