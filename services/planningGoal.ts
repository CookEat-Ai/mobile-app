import type { FitnessProfile } from './fitnessProfile';
import { FITNESS_GOALS, type FitnessGoal } from './nutritionModel';

/** A demo goal applies to this plan; it never rewrites the user's body profile. */
export function profileForPlanningGoal(profile: FitnessProfile, value?: unknown): FitnessProfile {
  if (!FITNESS_GOALS.includes(value as FitnessGoal) || value === profile.goal) return profile;
  const goal = value as FitnessGoal;
  const direction = goal === 'gain_muscle' ? 1 : goal === 'lose_weight' ? -1 : 0;
  const anchor = profile.nutritionWeightKg ?? profile.currentWeightKg;
  const compatibleTarget = direction !== 0 && profile.targetWeightKg !== undefined
    && (profile.targetWeightKg - anchor) * direction > 0;
  return {
    ...profile, goal,
    // Do not reuse an opposing weight target or invent a new target/deadline.
    targetWeightKg: compatibleTarget ? profile.targetWeightKg : undefined,
    targetChangeKg: 0, durationWeeks: 0, dailyCalorieAdjustment: 0,
  };
}
