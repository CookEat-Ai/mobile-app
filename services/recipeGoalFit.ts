import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateFitnessProjection, loadFitnessProfile } from './fitnessProfile';

type Nutrients = { calories: number; proteins: number; carbs: number; fats: number };
export type GoalFitChange = { kind: 'swap' | 'less' | 'more'; from: { name: string; quantity: string }; to: { name: string; quantity: string }; caloriesPerServing: number };
export type GoalFit =
  | { status: 'unavailable' }
  | { status: 'fits'; before: Nutrients; target: { calories: number; proteins: number } }
  | { status: 'adapted'; before: Nutrients; after: Nutrients; target: { calories: number; proteins: number };
      ingredients: any[]; steps: { title: string; description: string }[]; changes: GoalFitChange[]; tips: string[] };

/** Daily targets for the goal fit, only once the user has entered a real
 * profile with a weight goal: default measurements would invent a target. */
export async function goalFitTargets(): Promise<{ dailyCalories: number; dailyProteinGrams: number } | null> {
  if (!(await AsyncStorage.getItem('currentWeightKg'))) return null;
  const profile = await loadFitnessProfile();
  if (!['lose_weight', 'gain_muscle', 'maintain'].includes(profile.goal)) return null;
  const { dailyCalories, dailyProteinGrams } = calculateFitnessProjection({ ...profile, includeSnack: false });
  return { dailyCalories, dailyProteinGrams };
}

/** The recipe as the user will cook it; the original stays available. */
export function recipeWithGoalFit<T extends Record<string, any>>(recipe: T, fit: Extract<GoalFit, { status: 'adapted' }>): T {
  const tips = fit.tips.join(' ');
  return { ...recipe, ingredients: fit.ingredients, steps: fit.steps,
    calories: `${fit.after.calories} kcal`, proteins: `${fit.after.proteins} g`, lipids: `${fit.after.fats} g`,
    ...(tips ? { chef_tip: recipe.chef_tip ? `${tips}\n\n${recipe.chef_tip}` : tips } : {}) };
}
