export type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'balanced';
export const FITNESS_GOALS = ['lose_weight', 'gain_muscle', 'maintain', 'balanced'] as const;
export function normalizeFitnessGoal(value: unknown): typeof FITNESS_GOALS[number] {
  return FITNESS_GOALS.includes(value as typeof FITNESS_GOALS[number])
    ? value as typeof FITNESS_GOALS[number] : 'balanced';
}
export type BiologicalSex = 'male' | 'female' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export const NUTRITION_MODEL_VERSION = 'nutrition-v4';

export type NutritionProfileInput = {
  goal: FitnessGoal;
  sex: BiologicalSex;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetChangeKg?: number;
  durationWeeks?: number;
  activityLevel: ActivityLevel;
  trainingDays?: number;
  trainingDurationMinutes?: number;
  nutritionWeightKg?: number;
  targetWeightKg?: number;
  dailyCalorieAdjustment?: number;
};

export type NutritionTargets = {
  bmi: number;
  estimatedMaintenanceCalories: number;
  dailyCalories: number;
  dailyProteinGrams: number;
  dailyCarbsGrams: number;
  dailyFatGrams: number;
  targetWeightKg: number;
  weeklyChangeKg: number;
  durationWeeks: number;
  minimumDurationWeeks: number;
  isTimelineRealistic: boolean;
};

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.4,
  light: 1.45,
  moderate: 1.55,
  active: 1.75,
  very_active: 2.0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: unknown, fallback: number) => Number.isFinite(Number(value)) && value !== null && value !== '' && value !== undefined ? Number(value) : fallback;
const round = (value: number, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export function sanitizeNutritionProfile(value: unknown): NutritionProfileInput {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const allowedSexes: BiologicalSex[] = ['male', 'female', 'unspecified'];
  const allowedActivities: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
  const goal = normalizeFitnessGoal(input.goal);
  const sex = allowedSexes.includes(input.sex as BiologicalSex) ? input.sex as BiologicalSex : 'unspecified';
  const activityLevel = allowedActivities.includes(input.activityLevel as ActivityLevel)
    ? input.activityLevel as ActivityLevel
    : 'light';

  return {
    goal,
    sex,
    age: clamp(Math.round(finite(input.age, 30)), 18, 80),
    heightCm: clamp(finite(input.heightCm, 170), 130, 230),
    currentWeightKg: clamp(finite(input.currentWeightKg, 70), 35, 300),
    targetChangeKg: clamp(finite(input.targetChangeKg, 0), 0, 100),
    durationWeeks: 0,
    activityLevel,
    trainingDays: clamp(Math.round(finite(input.trainingDays, 0)), 0, 7),
    trainingDurationMinutes: [20, 45, 75].includes(Number(input.trainingDurationMinutes)) ? Number(input.trainingDurationMinutes) : 45,
    nutritionWeightKg: clamp(finite(input.nutritionWeightKg, finite(input.currentWeightKg, 70)), 35, 300),
    targetWeightKg: Number.isFinite(Number(input.targetWeightKg)) && input.targetWeightKg != null && input.targetWeightKg !== ''
      ? clamp(Number(input.targetWeightKg), 35, 400) : undefined,
    dailyCalorieAdjustment: clamp(finite(input.dailyCalorieAdjustment, 0), -300, 300),
  };
}

/**
 * Estimation Mifflin-St Jeor. Lorsque le sexe physiologique n'est pas fourni,
 * on prend le milieu des deux constantes et l'interface présente le résultat
 * comme une estimation moins précise.
 */
export function estimateMaintenanceCalories(profile: NutritionProfileInput): number {
  const weight = profile.nutritionWeightKg ?? profile.currentWeightKg;
  const common = 10 * weight + 6.25 * profile.heightCm - 5 * profile.age;
  const sexConstant = profile.sex === 'male' ? 5 : profile.sex === 'female' ? -161 : -78;
  // Conservative NON-EXERCISE baselines matching the app's daily-life answers.
  // These category mappings are product assumptions, NOT measured individual
  // PALs or a table validated by FAO. FAO lifestyle PALs may already include
  // exercise: never use a whole-lifestyle/exercise-frequency factor here and
  // add those same workouts again. Higher baselines are reserved for a physical
  // job or sustained daily exertion, independent of reported workout frequency.
  // https://www.fao.org/4/y5686e/y5686e07.htm
  // Workouts: representative durations 20/45/75 min, moderate effort at 5 MET
  // (2024 Adult Compendium, code 02061), minus rest already in the baseline.
  // https://pacompendium.com/conditioning-exercise/
  const training = (5 - 1) * weight * (profile.trainingDurationMinutes ?? 45) / 60 * (profile.trainingDays ?? 0) / 7;
  return Math.round((common + sexConstant) * ACTIVITY_FACTORS[profile.activityLevel] + training);
}

/** Legacy response field retained for old clients; no predicted deadline. */
export function minimumGoalDurationWeeks(_profile: NutritionProfileInput): number { return 0; }

export function calculateNutritionTargets(raw: unknown): NutritionTargets {
  const profile = sanitizeNutritionProfile(raw);
  const direction = profile.goal === 'lose_weight' ? -1 : (profile.goal === 'gain_muscle') ? 1 : 0;
  const targetWeightKg = direction === 0 ? profile.currentWeightKg : (profile.targetWeightKg ?? round(profile.currentWeightKg + direction * (profile.targetChangeKg || 0), 1));
  // Anchor nutrition to the last accepted weight, never to one new weigh-in.
  const weight = profile.nutritionWeightKg ?? profile.currentWeightKg;
  const hasRemainingTarget = direction !== 0 && (targetWeightKg - weight) * direction > 0;
  const maintenance = estimateMaintenanceCalories(profile);
  // Starting budgets, not a kcal/kg-to-deadline conversion. Use a conservative
  // 5% muscle-gain surplus without a fixed kcal floor. Training experience is
  // unknown; a blanket 15% surplus can unnecessarily increase fat gain.
  // Helms et al., 2023, doi:10.1186/s40798-023-00651-y (small trained sample;
  // this is a starting assumption, not a validated individual prescription).
  const goalAdjustment = !hasRemainingTarget ? 0 : direction > 0
    ? maintenance * 0.05 : -clamp(maintenance * 0.15, 250, 500);
  const minimumCalories = profile.sex === 'male' ? 1500 : 1200;
  const dailyCalories = clamp(Math.round((maintenance + goalAdjustment + (profile.dailyCalorieAdjustment || 0)) / 50) * 50, minimumCalories, 4500);
  const proteinMultiplier = profile.goal === 'gain_muscle' || profile.goal === 'lose_weight' ? 1.6 : 1.3;
  const dailyProteinGrams = Math.round(clamp(weight * proteinMultiplier, 60, 240));
  const dailyFatGrams = Math.round(clamp((dailyCalories * 0.28) / 9, 45, 140));
  const dailyCarbsGrams = Math.max(80, Math.round((dailyCalories - dailyProteinGrams * 4 - dailyFatGrams * 9) / 4));
  const bmi = round(profile.currentWeightKg / ((profile.heightCm / 100) ** 2), 1);

  return {
    bmi,
    estimatedMaintenanceCalories: maintenance,
    dailyCalories,
    dailyProteinGrams,
    dailyCarbsGrams,
    dailyFatGrams,
    targetWeightKg,
    weeklyChangeKg: 0,
    durationWeeks: 0,
    minimumDurationWeeks: 0,
    isTimelineRealistic: false,
  };
}

export function isTargetWeightSupported(raw: unknown): boolean {
  const profile = sanitizeNutritionProfile(raw);
  if (profile.goal !== 'lose_weight') return true;
  const targetWeight = profile.targetWeightKg ?? profile.currentWeightKg - (profile.targetChangeKg || 0);
  const targetBmi = targetWeight / ((profile.heightCm / 100) ** 2);
  return targetWeight > 0 && targetBmi >= 18.5;
}
