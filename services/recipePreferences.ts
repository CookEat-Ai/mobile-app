import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_RECIPE_PREFERENCES,
  getOnboardingRecipeAnswersSignature,
  getOnboardingRecipePreferenceOverrides,
  mergeRecipePreferences,
  normalizeRecipePreferences,
  ONBOARDING_RECIPE_PREFERENCE_KEYS,
  type OnboardingRecipeAnswers,
  type RecipePreferences,
} from './recipePreferencesMapping';

export const RECIPE_PREFERENCES_STORAGE_KEY = 'recipe_preferences';
const ONBOARDING_SIGNATURE_KEY = 'onboarding_recipe_preferences_signature';

async function loadOnboardingAnswers(): Promise<OnboardingRecipeAnswers> {
  const pairs = await AsyncStorage.multiGet([...ONBOARDING_RECIPE_PREFERENCE_KEYS]);
  return Object.fromEntries(pairs) as OnboardingRecipeAnswers;
}

async function loadStoredPreferences(): Promise<RecipePreferences | null> {
  const raw = await AsyncStorage.getItem(RECIPE_PREFERENCES_STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeRecipePreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveRecipePreferences(preferences: RecipePreferences): Promise<void> {
  await AsyncStorage.setItem(
    RECIPE_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizeRecipePreferences(preferences)),
  );
}

/**
 * Le profil serveur permet de restaurer les préférences après une réinstallation
 * lorsque l'identifiant d'installation sécurisé a survécu mais pas AsyncStorage.
 * Il ne remplace jamais des réglages déjà modifiés localement.
 */
export async function hydrateRecipePreferencesFromServer(
  serverProfile: Record<string, unknown>,
): Promise<boolean> {
  const [storedPreferences, localPairs] = await Promise.all([
    loadStoredPreferences(),
    AsyncStorage.multiGet([...ONBOARDING_RECIPE_PREFERENCE_KEYS]),
  ]);
  if (storedPreferences || localPairs.some(([, value]) => value !== null)) return false;

  const answers = Object.fromEntries(
    ONBOARDING_RECIPE_PREFERENCE_KEYS.map((key) => {
      const raw = serverProfile[key];
      if (typeof raw === 'string') return [key, raw];
      if (Array.isArray(raw)) return [key, JSON.stringify(raw)];
      return [key, null];
    }),
  ) as OnboardingRecipeAnswers;
  const overrides = getOnboardingRecipePreferenceOverrides(answers);
  if (Object.keys(overrides).length === 0) return false;

  const resolved = mergeRecipePreferences(DEFAULT_RECIPE_PREFERENCES, overrides);
  const signature = getOnboardingRecipeAnswersSignature(answers);
  const restoredAnswerPairs = ONBOARDING_RECIPE_PREFERENCE_KEYS
    .filter((key) => answers[key] !== null)
    .map((key) => [key, answers[key] as string] as [string, string]);

  await AsyncStorage.multiSet([
    ...restoredAnswerPairs,
    [RECIPE_PREFERENCES_STORAGE_KEY, JSON.stringify(resolved)],
    [ONBOARDING_SIGNATURE_KEY, signature],
  ]);
  return true;
}

/**
 * Les réponses initialisent les filtres une seule fois par jeu de réponses.
 * Ensuite, les changements faits directement dans l'écran produit gagnent.
 * Pendant un nouveau test d'onboarding, une signature différente réapplique
 * uniquement les champs réellement posés dans cette branche.
 */
export async function loadRecipePreferences(options: {
  preferCurrentOnboarding?: boolean;
} = {}): Promise<RecipePreferences> {
  const [storedPreferences, answers, appliedSignature] = await Promise.all([
    loadStoredPreferences(),
    loadOnboardingAnswers(),
    AsyncStorage.getItem(ONBOARDING_SIGNATURE_KEY),
  ]);

  const signature = getOnboardingRecipeAnswersSignature(answers);
  const overrides = getOnboardingRecipePreferenceOverrides(answers);
  const hasOverrides = Object.keys(overrides).length > 0;
  const shouldApplyOnboarding = hasOverrides && (
    !storedPreferences
    || (options.preferCurrentOnboarding === true && appliedSignature !== signature)
  );

  if (!shouldApplyOnboarding) {
    return storedPreferences || { ...DEFAULT_RECIPE_PREFERENCES };
  }

  const resolved = mergeRecipePreferences(storedPreferences || DEFAULT_RECIPE_PREFERENCES, overrides);
  await AsyncStorage.multiSet([
    [RECIPE_PREFERENCES_STORAGE_KEY, JSON.stringify(resolved)],
    [ONBOARDING_SIGNATURE_KEY, signature],
  ]);
  return resolved;
}
