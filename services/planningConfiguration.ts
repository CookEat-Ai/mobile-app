import type { PlanningGenerationSettings } from './weeklyPlanning';
import { normalizePantryIngredients } from './planningPantry';

export const PLANNING_STEPS = ['goal', 'servings', 'days', 'mealBudget', 'ingredients', 'duration', 'cookingLevel', 'equipments', 'cuisines', 'diet', 'exclusions'] as const;
export const PRESENTATION_PLANNING_STEPS = [...PLANNING_STEPS] as const;
export type PlanningStep = typeof PLANNING_STEPS[number] | 'goal';
export function planningSteps(presentation: boolean): readonly PlanningStep[] {
  return presentation ? PRESENTATION_PLANNING_STEPS : PLANNING_STEPS;
}

/** No camera or presentation branch can skip the remaining choices. */
export function planningStepAfterScan(): PlanningStep { return 'duration'; }

export type PlanningChoiceDraft = Omit<PlanningGenerationSettings, 'duration' | 'diet' | 'cuisineIds' | 'servings' | 'cookingLevel' | 'equipments' | 'mealBudget'> & {
  cookingLevel: PlanningGenerationSettings['cookingLevel'] | null;
  equipments: string[] | null;
  mealBudget: PlanningGenerationSettings['mealBudget'] | null;
  duration: PlanningGenerationSettings['duration'] | null;
  diet: PlanningGenerationSettings['diet'] | null;
  cuisineIds: string[] | null;
  servings: number | null;
};

/** Every new presentation starts with unanswered choices, without erasing saved preferences. */
export function planningChoiceDraft(settings: PlanningGenerationSettings, presentation: boolean): PlanningChoiceDraft {
  return presentation ? {
    ...settings, cookingDays: [], mealsByDay: {}, duration: null, diet: null, cuisineIds: null, servings: null,
    cookingLevel: null, equipments: null, mealBudget: null, weeklyBudget: undefined,
    excludedIngredients: [], pantryIngredients: [], pantryMode: 'priority',
  } : { ...settings, servings: settings.servings || 1, cookingLevel: settings.cookingLevel || 'beginner',
    mealBudget: settings.mealBudget || 'budget_medium', equipments: settings.equipments || ['standard-kitchen'] };
}

export function planningStepCanContinue(step: PlanningStep, draft: Pick<PlanningChoiceDraft, 'cookingDays' | 'duration' | 'diet' | 'cuisineIds' | 'servings' | 'cookingLevel' | 'equipments' | 'mealBudget' | 'weeklyBudget'> & { goal: string | null }): boolean {
  switch (step) {
    case 'goal': return draft.goal !== null;
    case 'days': return draft.cookingDays.length > 0;
    case 'duration': return draft.duration !== null;
    case 'cookingLevel': return draft.cookingLevel != null;
    case 'equipments': return draft.equipments != null;
    case 'mealBudget': return Number(draft.weeklyBudget) > 0;
    case 'cuisines': return draft.cuisineIds !== null;
    case 'diet': return draft.diet !== null;
    case 'servings': return draft.servings !== null && draft.servings > 0;
    default: return true;
  }
}

export function planningConfiguration(settings: PlanningGenerationSettings, useIngredients: boolean): PlanningGenerationSettings {
  return {
    ...settings,
    pantryIngredients: useIngredients ? normalizePantryIngredients(settings.pantryIngredients || []) : [],
    pantryMode: settings.pantryMode || 'priority',
  };
}
