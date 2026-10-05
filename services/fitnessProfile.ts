import { calculateNutritionTargets, isTargetWeightSupported, normalizeFitnessGoal } from './nutritionModel';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'balanced';
export type BiologicalSex = 'male' | 'female' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type FitnessProfile = {
  goal: FitnessGoal;
  sex: BiologicalSex;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetChangeKg: number;
  targetWeightKg?: number;
  durationWeeks: number;
  activityLevel: ActivityLevel;
  trainingDays: number;
  trainingDurationMinutes?: number;
  nutritionWeightKg?: number;
  dailyCalorieAdjustment?: number;
  includeSnack: boolean;
  diet: string;
  avoidIngredients: string[];
  cookingTime: string;
  favoriteCuisineStyle: string[];
  equipments?: string[];
};

export type FitnessProjection = {
  currentWeightKg: number;
  targetWeightKg: number;
  minimumDurationWeeks: number;
  durationWeeks: number;
  weeklyChangeKg: number;
  bmi: number;
  targetBmi: number;
  estimatedMaintenanceCalories: number;
  dailyCalories: number;
  dailyProteinGrams: number;
  dailyCarbsGrams: number;
  dailyFatGrams: number;
  isTimelineRealistic: boolean;
  isTargetWeightSupported: boolean;
  series: number[];
};

export const FITNESS_PROFILE_KEYS = [
  'fitnessGoal', 'sex', 'age', 'heightCm', 'currentWeightKg', 'targetChangeKg', 'targetWeightKg',
  'goalDurationWeeks', 'activityLevel', 'trainingDays', 'trainingDurationMinutes', 'nutritionWeightKg', 'dailyCalorieAdjustment', 'includeSnack', 'diet',
  'avoidIngredients', 'cookingTime', 'favoriteCuisineStyle', 'equipments',
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const parseMulti = (raw: string | null): string[] => {
  if (!raw || raw === 'none') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [raw];
  } catch {
    return [raw];
  }
};

export async function loadFitnessProfile(): Promise<FitnessProfile> {
  const values = Object.fromEntries(await AsyncStorage.multiGet([...FITNESS_PROFILE_KEYS])) as Record<string, string | null>;
  const goal = normalizeFitnessGoal(values.fitnessGoal);
  const sex = ['male', 'female', 'unspecified'].includes(values.sex || '')
    ? values.sex as BiologicalSex
    : 'unspecified';
  const activityLevel = ['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(values.activityLevel || '')
    ? values.activityLevel as ActivityLevel
    : 'light';
  const profile: FitnessProfile = {
    goal,
    sex,
    age: clamp(Number(values.age) || 30, 18, 80),
    heightCm: clamp(Number(values.heightCm) || 170, 130, 230),
    currentWeightKg: clamp(Number(values.currentWeightKg) || 70, 35, 300),
    targetChangeKg: clamp(Number(values.targetChangeKg) || 0, 0, 100),
    targetWeightKg: values.targetWeightKg && Number.isFinite(Number(values.targetWeightKg)) ? Number(values.targetWeightKg) : undefined,
    durationWeeks: 0,
    activityLevel,
    trainingDays: clamp(Number(values.trainingDays) || 0, 0, 7),
    trainingDurationMinutes: [20, 45, 75].includes(Number(values.trainingDurationMinutes)) ? Number(values.trainingDurationMinutes) : 45,
    nutritionWeightKg: clamp(Number(values.nutritionWeightKg) || Number(values.currentWeightKg) || 70, 35, 300),
    dailyCalorieAdjustment: clamp(Number(values.dailyCalorieAdjustment) || 0, -300, 300),
    includeSnack: values.includeSnack === 'true',
    diet: values.diet && values.diet !== 'none' ? values.diet : 'none',
    avoidIngredients: parseMulti(values.avoidIngredients),
    cookingTime: values.cookingTime || 'less_than_30_minutes',
    favoriteCuisineStyle: parseMulti(values.favoriteCuisineStyle),
    equipments: values.equipments === null ? undefined : parseMulti(values.equipments).filter((item) => item !== 'equipment_none'),
  };
  return profile;
}

export function calculateFitnessProjection(profile: FitnessProfile): FitnessProjection {
  const targets = calculateNutritionTargets(profile);
  return {
    ...targets,
    currentWeightKg: profile.currentWeightKg,
    targetBmi: Math.round(targets.targetWeightKg / ((profile.heightCm / 100) ** 2) * 10) / 10,
    isTargetWeightSupported: isTargetWeightSupported(profile),
    // Compatibility only: no fabricated future weight points.
    series: [profile.currentWeightKg],
  };
}

export function fitnessProfileToPlanningPreferences(profile: FitnessProfile) {
  const allergyMap: Record<string, string> = {
    avoid_pork: 'pork', avoid_alcohol: 'alcohol', avoid_beef: 'beef', avoid_fish: 'fish',
    avoid_dairy: 'dairy', avoid_gluten: 'gluten', avoid_egg: 'egg', avoid_peanut: 'peanut',
  };
  const cuisineMap: Record<string, string[]> = {
    cuisine_mediterranean: ['mediterranean'], cuisine_french: ['french'], cuisine_italian: ['italian'],
    cuisine_middle_eastern: ['middle-eastern'], cuisine_indian: ['indian'],
    cuisine_asian: ['japanese', 'chinese', 'thai'], cuisine_american: ['american'],
    cuisine_spicy: ['mexican', 'indian', 'thai'],
  };
  const durationMap: Record<string, string> = {
    less_than_30_minutes: 'fast', between_30_minutes_and_1_hour: 'medium', more_than_1_hour: 'long',
  };
  return {
    servings: 1,
    duration: durationMap[profile.cookingTime] || 'fast',
    cuisineStyle: [...new Set(profile.favoriteCuisineStyle.flatMap((item) => cuisineMap[item] || []))],
    diet: profile.diet,
    equipments: profile.equipments === undefined ? [] : ['standard-kitchen', ...profile.equipments
      .filter((item) => item !== 'equipment_none')
      .map((item) => item.replace(/^equipment_/, ''))],
    allergies: profile.avoidIngredients.map((item) => allergyMap[item] || item).filter(Boolean),
    goal: normalizeFitnessGoal(profile.goal),
    includeSnack: profile.includeSnack,
    allowOtherIngredients: true,
    nutritionProfile: {
      goal: normalizeFitnessGoal(profile.goal),
      sex: profile.sex,
      age: profile.age,
      heightCm: profile.heightCm,
      currentWeightKg: profile.currentWeightKg,
      targetChangeKg: profile.targetWeightKg === undefined ? profile.targetChangeKg : Math.max(0,
        (profile.targetWeightKg - profile.currentWeightKg) * (profile.goal === 'lose_weight' ? -1 : (profile.goal === 'gain_muscle') ? 1 : 0)),
      durationWeeks: profile.durationWeeks,
      activityLevel: profile.activityLevel,
      trainingDays: profile.trainingDays,
      trainingDurationMinutes: profile.trainingDurationMinutes,
      nutritionWeightKg: profile.nutritionWeightKg,
      targetWeightKg: profile.targetWeightKg,
      dailyCalorieAdjustment: profile.dailyCalorieAdjustment,
    },
  };
}
