import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateFitnessProjection, FitnessProfile, loadFitnessProfile } from './fitnessProfile';

export const WEIGHT_LOGS_KEY = '@cookeat_weight_logs_v1';
export const WEIGHT_REVIEW_KEY = '@cookeat_weight_review_v1';
export type WeightLog = { date: string; weight: number };
export type WeightReview = { context: string; since: string };
export type WeightTrend = {
  status: 'collecting' | 'variable' | 'steady' | 'adjust' | 'limit' | 'reached';
  previousAverage?: number;
  recentAverage?: number;
  weeklyChange?: number;
  suggestedCalories?: number;
  adjustment?: number;
};
const DAY = 86400000;
export function weightDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
const dayNumber = (key: string) => Date.parse(`${key}T12:00:00Z`) / DAY;
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(dayNumber(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

export function normalizeWeightLogs(value: unknown, today = weightDateKey()): WeightLog[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, WeightLog>();
  for (const entry of value) {
    if (entry && validDate(entry.date) && entry.date <= today && Number.isFinite(entry.weight) && entry.weight >= 35 && entry.weight <= 300) {
      unique.set(entry.date, { date: entry.date, weight: Math.round(entry.weight * 10) / 10 });
    }
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function weightReviewContext(profile: FitnessProfile): string {
  // Latest weigh-in is deliberately excluded. A changed goal/activity/model
  // starts a fresh observation period so previous advice cannot be reused.
  const target = calculateFitnessProjection(profile).targetWeightKg;
  return JSON.stringify(['nutrition-v2', profile.goal, profile.sex, profile.age, profile.heightCm,
    ['maintain', 'balanced'].includes(profile.goal) ? null : target, profile.activityLevel, profile.trainingDays,
    profile.trainingDurationMinutes ?? 45, profile.nutritionWeightKg ?? profile.currentWeightKg, profile.dailyCalorieAdjustment ?? 0]);
}

export function evaluateWeightTrend(profile: FitnessProfile, rawLogs: WeightLog[], review: WeightReview, today = weightDateKey()): WeightTrend {
  if (review.context !== weightReviewContext(profile) || !validDate(review.since)) return { status: 'collecting' };
  const end = dayNumber(today);
  const logs = normalizeWeightLogs(rawLogs, today).filter(entry => entry.date >= review.since && dayNumber(entry.date) > end - 28);
  const previous = logs.filter(entry => dayNumber(entry.date) <= end - 14);
  const recent = logs.filter(entry => dayNumber(entry.date) > end - 14);
  const enough = (entries: WeightLog[]) => entries.length >= 3 && dayNumber(entries.at(-1)!.date) - dayNumber(entries[0].date) >= 7;
  if (end - dayNumber(review.since) < 27 || !enough(previous) || !enough(recent) || end - dayNumber(recent.at(-1)!.date) > 4) return { status: 'collecting' };
  const average = (entries: WeightLog[]) => entries.reduce((sum, entry) => sum + entry.weight, 0) / entries.length;
  const previousAverage = average(previous);
  const recentAverage = average(recent);
  const meanDay = (entries: WeightLog[]) => entries.reduce((sum, entry) => sum + dayNumber(entry.date), 0) / entries.length;
  const weeklyChange = (recentAverage - previousAverage) * 7 / (meanDay(recent) - meanDay(previous));
  const summary = { previousAverage, recentAverage, weeklyChange };
  // Do not propose adjustments from unstable measurements or abrupt changes.
  if ([previous, recent].some(entries => Math.max(...entries.map(e => e.weight)) - Math.min(...entries.map(e => e.weight)) > recentAverage * 0.03)
    || Math.abs(weeklyChange) > recentAverage * 0.015) return { ...summary, status: 'variable' };
  const projection = calculateFitnessProjection(profile);
  const gaining = (profile.goal === 'gain_muscle');
  const losing = profile.goal === 'lose_weight';
  if ((gaining && recentAverage >= projection.targetWeightKg) || (losing && recentAverage <= projection.targetWeightKg)) return { ...summary, status: 'reached' };
  // Small reversible steps, proposed only after sustained observation.
  // Rate bands are heuristics for review, not predicted or promised outcomes.
  const rate = weeklyChange / recentAverage;
  let step = 0;
  if (gaining) step = rate < 0.0025 ? 100 : rate > 0.005 ? -100 : 0;
  if (losing) step = rate > -0.0025 ? -100 : rate < -0.0075 ? 100 : 0;
  if (profile.goal === 'maintain') step = rate > 0.0025 ? -100 : rate < -0.0025 ? 100 : 0;
  if (!step) return { ...summary, status: 'steady' };
  const adjustment = (profile.dailyCalorieAdjustment ?? 0) + step;
  if (Math.abs(adjustment) > 300 || (losing && !projection.isTargetWeightSupported)) return { ...summary, status: 'limit' };
  const suggestedCalories = calculateFitnessProjection({ ...profile, dailyCalorieAdjustment: adjustment }).dailyCalories;
  if (suggestedCalories === projection.dailyCalories) return { ...summary, status: 'limit' };
  return { ...summary, status: 'adjust', suggestedCalories, adjustment };
}

export async function loadWeightTracking(profile: FitnessProfile, today = weightDateKey()) {
  const [rawLogs, rawReview] = await Promise.all([AsyncStorage.getItem(WEIGHT_LOGS_KEY), AsyncStorage.getItem(WEIGHT_REVIEW_KEY)]);
  let logs: WeightLog[] = [];
  let saved: Partial<WeightReview> = {};
  try { logs = normalizeWeightLogs(JSON.parse(rawLogs || '[]'), today); } catch { /* Corrupt legacy history is not used for advice. */ }
  try { saved = JSON.parse(rawReview || '{}') || {}; } catch { /* Restart observation. */ }
  const context = weightReviewContext(profile);
  const review: WeightReview = saved.context === context && validDate(saved.since) && saved.since <= today
    ? { context, since: saved.since } : { context, since: today };
  if (review.context !== saved.context || review.since !== saved.since) await AsyncStorage.setItem(WEIGHT_REVIEW_KEY, JSON.stringify(review));
  return { logs, review };
}

async function recordWeightNow(weight: number, today = weightDateKey()) {
  if (!Number.isFinite(weight) || weight < 35 || weight > 300 || !validDate(today) || today > weightDateKey()) throw new Error('invalid_weight');
  const profile = await loadFitnessProfile();
  const { logs } = await loadWeightTracking(profile, today);
  const rounded = Math.round(weight * 10) / 10;
  const target = calculateFitnessProjection(profile).targetWeightKg;
  const nextLogs = normalizeWeightLogs([...logs, { date: today, weight: rounded }], today);
  await AsyncStorage.multiSet([
    [WEIGHT_LOGS_KEY, JSON.stringify(nextLogs)],
    ['nutritionWeightKg', String(profile.nutritionWeightKg ?? profile.currentWeightKg)],
    ['currentWeightKg', String(rounded)],
    ['targetWeightKg', String(target)],
    ['targetChangeKg', String(Math.abs(target - rounded))],
  ]);
}

async function decideWeightAdjustmentNow(expectedCalories: number, accept: boolean, today = weightDateKey()): Promise<void> {
  const profile = await loadFitnessProfile();
  const { logs, review } = await loadWeightTracking(profile, today);
  const trend = evaluateWeightTrend(profile, logs, review, today);
  if (trend.status !== 'adjust' || trend.suggestedCalories !== expectedCalories || trend.adjustment === undefined) throw new Error('stale_adjustment');
  const nextProfile = accept ? { ...profile, dailyCalorieAdjustment: trend.adjustment } : profile;
  await AsyncStorage.multiSet([
    ['dailyCalorieAdjustment', String(nextProfile.dailyCalorieAdjustment ?? 0)],
    [WEIGHT_REVIEW_KEY, JSON.stringify({ context: weightReviewContext(nextProfile), since: today })],
  ]);
}

// Serialize writes so rapid confirmation taps cannot apply a proposal twice.
let pendingMutation: Promise<void> = Promise.resolve();
function serialize(work: () => Promise<void>): Promise<void> {
  const next = pendingMutation.then(work);
  pendingMutation = next.catch(() => {});
  return next;
}
export function recordWeight(weight: number, today = weightDateKey()) {
  return serialize(() => recordWeightNow(weight, today));
}
export function decideWeightAdjustment(expectedCalories: number, accept: boolean, today = weightDateKey()) {
  return serialize(() => decideWeightAdjustmentNow(expectedCalories, accept, today));
}
