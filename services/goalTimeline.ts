import { calculateNutritionTargets, isTargetWeightSupported, sanitizeNutritionProfile } from './nutritionModel';

export type GoalTimeline = {
  kind: 'estimate';
  minWeeks: number;
  maxWeeks: number;
  minWeeklyKg: number;
  maxWeeklyKg: number;
} | { kind: 'review'; weeks: 4 };

/**
 * A planning horizon at a reference pace, NOT a prediction from today's kcal.
 * Muscle-focused gain: 0.25–0.5% of starting weight/week, Iraki et al. (2019),
 * https://doi.org/10.3390/sports7070154 (novice/intermediate bodybuilders).
 * Loss: reference range 0.25–0.5 kg/week for our moderate starting deficit,
 * rather than the 0.5–1 kg/week associated with larger deficits.
 * https://www.ncbi.nlm.nih.gov/books/NBK2004/
 * The lower-weight loss cap (0.75%/week) is a product safeguard, not a
 * validated individual formula. This does NOT predict muscle gained.
 * All require reassessment and calorie adjustments as actual weight changes.
 * No 7,700 kcal/kg conversion, predicted weigh-ins, or muscle-mass promise.
 */
export function calculateGoalTimeline(raw: unknown): GoalTimeline {
  const profile = sanitizeNutritionProfile(raw);
  const target = calculateNutritionTargets(profile);
  const direction = profile.goal === 'lose_weight' ? -1
    : (profile.goal === 'gain_muscle') ? 1 : 0;
  const remainingKg = (target.targetWeightKg - profile.currentWeightKg) * direction;
  const energyDifference = (target.dailyCalories - target.estimatedMaintenanceCalories) * direction;
  if (!direction || remainingKg <= 0 || energyDifference <= 0 || !isTargetWeightSupported(profile)) {
    return { kind: 'review', weeks: 4 };
  }
  const maxWeightFraction = profile.goal === 'gain_muscle' ? 0.005 : 0.0075;
  const maxWeeklyKg = Math.round(Math.min(profile.currentWeightKg * maxWeightFraction, 0.5) * 100) / 100;
  const minWeeklyKg = Math.round(maxWeeklyKg / 2 * 100) / 100;
  return {
    kind: 'estimate',
    minWeeks: Math.max(1, Math.ceil(remainingKg / maxWeeklyKg)),
    maxWeeks: Math.max(1, Math.ceil(remainingKg / minWeeklyKg)),
    minWeeklyKg,
    maxWeeklyKg,
  };
}
