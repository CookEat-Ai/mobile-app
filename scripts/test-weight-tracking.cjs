const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const memory = new Map();
const storage = {
  getItem: async key => memory.get(key) ?? null,
  setItem: async (key, value) => { memory.set(key, value); },
  multiGet: async keys => keys.map(key => [key, memory.get(key) ?? null]),
  multiSet: async pairs => { for (const [key, value] of pairs) memory.set(key, value); },
};
const modules = new Map();
function load(file) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, Date, console, require: id => id === '@react-native-async-storage/async-storage' ? storage : load(path.resolve(path.dirname(file), id + '.ts')) });
  return exports;
}
const root = path.resolve(__dirname, '..');
const tracking = load(path.join(root, 'services/weightTracking.ts'));
const fitness = load(path.join(root, 'services/fitnessProfile.ts'));
const profile = { goal: 'gain_muscle', sex: 'male', age: 27, heightCm: 175, currentWeightKg: 60, nutritionWeightKg: 60, targetChangeKg: 10, targetWeightKg: 70, durationWeeks: 0, activityLevel: 'sedentary', trainingDays: 3, trainingDurationMinutes: 45, dailyCalorieAdjustment: 0, includeSnack: false, diet: 'none', avoidIngredients: [], cookingTime: 'less_than_30_minutes', favoriteCuisineStyle: [] };
const today = '2025-06-28';
const review = { context: tracking.weightReviewContext(profile), since: '2025-06-01' };
const flat = [1, 5, 10, 15, 20, 28].map(day => ({ date: `2025-06-${String(day).padStart(2, '0')}`, weight: 60 }));
const evaluate = (logs, p = profile, r = { ...review, context: tracking.weightReviewContext(p) }) => tracking.evaluateWeightTrend(p, logs, r, today);
assert.equal(evaluate([]).status, 'collecting');
assert.equal(evaluate([flat[0]]).status, 'collecting');
assert.equal(evaluate(flat.slice(1)).status, 'collecting');
assert.equal(evaluate([...flat, { date: '2025-06-28', weight: 60 }]).suggestedCalories, 2700);
assert.equal(evaluate(flat).suggestedCalories, 2700);
assert.equal(evaluate(flat).adjustment, 100);
assert.equal(evaluate(flat, { ...profile, dailyCalorieAdjustment: 300 }).status, 'limit');
assert.equal(evaluate(flat, { ...profile, goal: 'maintain' }).status, 'steady');
assert.equal(evaluate(flat, { ...profile, goal: 'balanced' }).status, 'steady');
assert.equal(evaluate(flat.map(e => ({ ...e, weight: 80 })), { ...profile, goal: 'lose_weight', currentWeightKg: 80, nutritionWeightKg: 80, targetWeightKg: 70 }).adjustment, -100);
assert.equal(evaluate(flat, { ...profile, targetWeightKg: 59 }).status, 'reached');
assert.equal(evaluate(flat.map((entry, i) => ({ ...entry, weight: i === 5 ? 65 : 60 }))).status, 'variable');
const slowGain = flat.map((entry, i) => ({ ...entry, weight: i < 3 ? 60 : 60.4 }));
assert.equal(evaluate(slowGain).status, 'steady');
assert.equal(evaluate(flat.map((entry, i) => ({ ...entry, weight: i < 3 ? 60 : 61 }))).adjustment, -100);
assert.equal(evaluate(flat, profile, { ...review, since: '2025-06-14' }).status, 'collecting');
assert.equal(evaluate(flat, profile, { ...review, context: 'old-model' }).status, 'collecting');
assert.equal(tracking.normalizeWeightLogs([{ date: '2025-02-30', weight: 60 }, { date: '2025-07-01', weight: 60 }, { date: today, weight: NaN }, ...flat], today).length, 6);
(async () => {
  for (const [key, value] of Object.entries({ ...profile, fitnessGoal: profile.goal })) memory.set(key, String(value));
  memory.set(tracking.WEIGHT_LOGS_KEY, JSON.stringify(flat));
  memory.set(tracking.WEIGHT_REVIEW_KEY, JSON.stringify(review));
  const before = fitness.calculateFitnessProjection(await fitness.loadFitnessProfile());
  await tracking.recordWeight(61, today);
  const after = fitness.calculateFitnessProjection(await fitness.loadFitnessProfile());
  assert.equal(after.currentWeightKg, 61);
  assert.equal(after.targetWeightKg, 70);
  assert.equal(after.dailyCalories, before.dailyCalories, 'weighing must not silently change calories');
  assert.equal(after.dailyProteinGrams, before.dailyProteinGrams);
  assert.equal(JSON.parse(memory.get(tracking.WEIGHT_LOGS_KEY)).length, 6, 'one entry per local day');
  await assert.rejects(tracking.recordWeight(0, today));
  await assert.rejects(tracking.recordWeight(Infinity, today));
  memory.set(tracking.WEIGHT_LOGS_KEY, JSON.stringify(flat));
  await assert.rejects(tracking.decideWeightAdjustment(9999, true, today), /stale_adjustment/);
  const decisions = await Promise.allSettled([tracking.decideWeightAdjustment(2700, true, today), tracking.decideWeightAdjustment(2700, true, today)]);
  assert.equal(decisions.filter(r => r.status === 'fulfilled').length, 1, 'double tap applies at most once');
  assert.equal((await fitness.loadFitnessProfile()).dailyCalorieAdjustment, 100);
  assert.equal(fitness.fitnessProfileToPlanningPreferences(await fitness.loadFitnessProfile()).nutritionProfile.dailyCalorieAdjustment, 100);
  assert.equal(evaluate(flat, await fitness.loadFitnessProfile(), JSON.parse(memory.get(tracking.WEIGHT_REVIEW_KEY))).status, 'collecting');
  memory.set('dailyCalorieAdjustment', '0');
  memory.set(tracking.WEIGHT_REVIEW_KEY, JSON.stringify(review));
  await tracking.decideWeightAdjustment(2700, false, today);
  assert.equal((await fitness.loadFitnessProfile()).dailyCalorieAdjustment, 0);
  memory.set(tracking.WEIGHT_LOGS_KEY, 'broken JSON');
  assert.equal((await tracking.loadWeightTracking(await fitness.loadFitnessProfile(), today)).logs.length, 0);
  console.log('Weight tracking checks passed: sparse/noisy/stale data, trend windows, stable budgets, accept/decline, double tap, persistence and planning payload.');
})().catch(error => { console.error(error); process.exitCode = 1; });
