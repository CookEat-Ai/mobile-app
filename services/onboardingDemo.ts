import type { TFunction } from 'i18next';
import { buildStarterPantryIngredients } from './pantryDefaults';

export type GenerationDemoRole = 'primary' | 'secondary';

export type DemoIngredient = {
  name: string;
  category: string;
};

/**
 * Une liste riche et cohérente, construite avec le même catalogue localisé que
 * l'écran produit `ingredient-list`. Elle donne assez de matière pour une
 * recette élaborée tout en restant modifiable avant la vraie génération.
 */
export function buildGenerationDemoIngredients(t: TFunction): DemoIngredient[] {
  return buildStarterPantryIngredients(t).map(({ name, category }) => ({ name, category }));
}

export function buildGenerationDemoParams(
  t: TFunction,
  role: GenerationDemoRole,
  onboardingNext: string,
) {
  return {
    ingredients: JSON.stringify(buildGenerationDemoIngredients(t)),
    isOnboarding: 'true',
    onboardingDemoRole: role,
    onboardingNext,
  } as const;
}
