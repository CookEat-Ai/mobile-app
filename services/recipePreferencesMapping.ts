export type RecipePreferences = {
  dishType: string;
  duration: string;
  servings: number;
  cuisineStyle: string[];
  diet: string;
  allowOtherIngredients: boolean;
  allergies: string[];
  goal: string;
  equipments: string[];
};

export const DEFAULT_RECIPE_PREFERENCES: RecipePreferences = {
  dishType: 'all',
  duration: 'all',
  servings: 2,
  cuisineStyle: ['all'],
  diet: 'none',
  allowOtherIngredients: false,
  allergies: [],
  goal: 'neutral',
  equipments: [],
};

export const ONBOARDING_RECIPE_PREFERENCE_KEYS = [
  'cookingForWho',
  'cookingTime',
  'equipments',
  'favoriteDishType',
  'favoriteCuisineStyle',
  'diet',
  'avoidIngredients',
] as const;

export type OnboardingRecipePreferenceKey = typeof ONBOARDING_RECIPE_PREFERENCE_KEYS[number];
export type OnboardingRecipeAnswers = Record<OnboardingRecipePreferenceKey, string | null>;

const SERVINGS_MAP: Record<string, number> = {
  myself: 1,
  myself_and_another_person: 2,
  my_family: 4,
};

const DURATION_MAP: Record<string, string> = {
  less_than_30_minutes: 'fast',
  between_30_minutes_and_1_hour: 'medium',
  more_than_1_hour: 'long',
};

const EQUIPMENT_MAP: Record<string, string> = {
  equipment_oven: 'oven',
  equipment_airfryer: 'airfryer',
  equipment_microwave: 'microwave',
  equipment_blender: 'blender',
  equipment_robot: 'robot',
};

const CUISINE_STYLE_MAP: Record<string, string> = {
  cuisine_mediterranean: 'mediterranean',
  cuisine_french: 'french',
  cuisine_italian: 'italian',
  cuisine_middle_eastern: 'middle_eastern',
  cuisine_indian: 'indian',
  cuisine_asian: 'asian',
  cuisine_american: 'american',
  cuisine_spicy: 'spicy',
};

const ALLERGY_MAP: Record<string, string> = {
  avoid_pork: 'pork',
  avoid_alcohol: 'alcohol',
  avoid_beef: 'beef',
  avoid_fish: 'fish',
  avoid_dairy: 'dairy',
  avoid_gluten: 'gluten',
  avoid_egg: 'egg',
  avoid_peanut: 'peanut',
};

const DIETS = new Set(['none', 'halal', 'vegetarian', 'vegan', 'keto', 'paleo']);

function parseMulti(raw: string | null): string[] {
  if (!raw || raw === 'none') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [raw];
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Normalise aussi les anciens objets partiels enregistrés par les versions
 * précédentes afin qu'une valeur locale incomplète ne casse pas les filtres.
 */
export function normalizeRecipePreferences(value: unknown): RecipePreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_RECIPE_PREFERENCES };
  const input = value as Partial<Omit<RecipePreferences, 'cuisineStyle'>> & {
    cuisineStyle?: string[] | string;
  };
  const rawCuisine = Array.isArray(input.cuisineStyle)
    ? input.cuisineStyle
    : typeof input.cuisineStyle === 'string'
      ? input.cuisineStyle.split(',')
      : DEFAULT_RECIPE_PREFERENCES.cuisineStyle;
  const cuisineStyle = unique(rawCuisine.map((item) => item.trim().toLowerCase()));
  const normalizedCuisineStyle = cuisineStyle.includes('all') ? ['all'] : cuisineStyle;

  return {
    dishType: typeof input.dishType === 'string' && input.dishType ? input.dishType.toLowerCase() : DEFAULT_RECIPE_PREFERENCES.dishType,
    duration: typeof input.duration === 'string' && input.duration ? input.duration.toLowerCase() : DEFAULT_RECIPE_PREFERENCES.duration,
    servings: typeof input.servings === 'number' && input.servings > 0 ? input.servings : DEFAULT_RECIPE_PREFERENCES.servings,
    cuisineStyle: normalizedCuisineStyle.length > 0 ? normalizedCuisineStyle : ['all'],
    diet: typeof input.diet === 'string' && DIETS.has(input.diet.toLowerCase()) ? input.diet.toLowerCase() : 'none',
    allowOtherIngredients: input.allowOtherIngredients === true,
    allergies: Array.isArray(input.allergies) ? unique(input.allergies.map(String)) : [],
    goal: typeof input.goal === 'string' && input.goal ? input.goal : 'neutral',
    equipments: Array.isArray(input.equipments) ? unique(input.equipments.map(String)) : [],
  };
}

/**
 * Convertit uniquement les réponses ayant un équivalent réel dans les filtres
 * et dans le prompt. Une question marketing ou comportementale ne devient pas
 * artificiellement une contrainte culinaire.
 */
export function getOnboardingRecipePreferenceOverrides(
  answers: OnboardingRecipeAnswers,
): Partial<RecipePreferences> {
  const overrides: Partial<RecipePreferences> = {};

  if (answers.cookingForWho && SERVINGS_MAP[answers.cookingForWho]) {
    overrides.servings = SERVINGS_MAP[answers.cookingForWho];
  }

  if (answers.cookingTime && DURATION_MAP[answers.cookingTime]) {
    overrides.duration = DURATION_MAP[answers.cookingTime];
  }

  if (answers.equipments !== null) {
    overrides.equipments = unique(parseMulti(answers.equipments).map((item) => EQUIPMENT_MAP[item]).filter(Boolean));
  }

  // Le type de plat est un choix ponctuel de génération, pas une préférence
  // durable. Même si l'onboarding demande ce qui plaît à l'utilisateur, le
  // filtre produit doit démarrer sur « Tout » pour ne pas enfermer toutes les
  // recettes suivantes dans le même format.
  if (answers.favoriteDishType !== null) overrides.dishType = 'all';

  if (answers.favoriteCuisineStyle !== null) {
    const styles = unique(
      parseMulti(answers.favoriteCuisineStyle)
        .map((item) => CUISINE_STYLE_MAP[item])
        .filter(Boolean),
    );
    overrides.cuisineStyle = styles.length > 0 ? styles : ['all'];
  }

  if (answers.diet !== null) {
    const diet = answers.diet.toLowerCase();
    overrides.diet = DIETS.has(diet) ? diet : 'none';
  }

  if (answers.avoidIngredients !== null) {
    overrides.allergies = unique(
      parseMulti(answers.avoidIngredients)
        .map((item) => ALLERGY_MAP[item])
        .filter(Boolean),
    );
  }

  return overrides;
}

export function mergeRecipePreferences(
  base: unknown,
  overrides: Partial<RecipePreferences>,
): RecipePreferences {
  return normalizeRecipePreferences({
    ...normalizeRecipePreferences(base),
    ...overrides,
  });
}

export function getOnboardingRecipeAnswersSignature(answers: OnboardingRecipeAnswers): string {
  // La version fait réappliquer proprement le mapping après une évolution de
  // sa sémantique (v2 : le type de plat d'onboarding ne devient plus un filtre).
  return JSON.stringify(['v3', ...ONBOARDING_RECIPE_PREFERENCE_KEYS.map((key) => answers[key])]);
}
