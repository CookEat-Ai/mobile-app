import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from './analytics';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const QUESTIONS_ANSWERED_KEY = 'questions_answered';

export type AppEntryRoute =
  | '/(tabs)'
  | '/onboarding/videoDemo'
  | '/onboarding/ingredientSelection'
  | '/onboarding/welcome';

/**
 * Résout l'écran qui doit vivre sous une modale ouverte au lancement.
 *
 * Centraliser cette décision empêche la quick action de construire une pile
 * différente de celle du lancement normal : fermer le paywall doit toujours
 * révéler le bon écran, jamais une route racine bloquée sur son loader.
 */
export async function resolveAppEntryRoute(): Promise<AppEntryRoute> {
  let completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
  let questionsAnswered = await AsyncStorage.getItem(QUESTIONS_ANSWERED_KEY);

  if (completed === null) {
    completed = 'false';
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, completed);
  }

  if (questionsAnswered === null) {
    questionsAnswered = 'false';
    await AsyncStorage.setItem(QUESTIONS_ANSWERED_KEY, questionsAnswered);
  }

  if (completed === 'true') return '/(tabs)';

  if (questionsAnswered === 'true') {
    const variant = await analytics.getOnboardingVariant();
    return variant === 'C' || variant === 'D'
      ? '/onboarding/videoDemo'
      : '/onboarding/ingredientSelection';
  }

  return '/onboarding/welcome';
}
