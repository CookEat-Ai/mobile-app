import React, { createContext, useContext, useState, ReactNode } from 'react';

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

interface RecipeContextType {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  getRecipe: (id: string) => Recipe | undefined;
  clearRecipes: () => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const useRecipeContext = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipeContext must be used within a RecipeProvider');
  }
  return context;
};

interface RecipeProviderProps {
  children: ReactNode;
}

export const RecipeProvider: React.FC<RecipeProviderProps> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const addRecipe = (recipe: Recipe) => {
    setRecipes(prev => {
      // Vérifier si la recette existe déjà
      const existingIndex = prev.findIndex(r => r.id === recipe.id);
      if (existingIndex >= 0) {
        // Mettre à jour la recette existante
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...recipe };
        return updated;
      }
      // Ajouter une nouvelle recette
      return [...prev, recipe];
    });
  };

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes(prev =>
      prev.map(recipe =>
        recipe.id === id ? { ...recipe, ...updates } : recipe
      )
    );
  };

  const getRecipe = (id: string) => {
    return recipes.find(recipe => recipe.id === id);
  };

  const clearRecipes = () => {
    setRecipes([]);
  };

  const value: RecipeContextType = {
    recipes,
    addRecipe,
    updateRecipe,
    getRecipe,
    clearRecipes,
  };

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
}; 