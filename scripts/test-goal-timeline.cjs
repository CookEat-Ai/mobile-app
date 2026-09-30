const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => load(path.resolve(path.dirname(file), id + '.ts')) });
  return exports;
}
const { calculateGoalTimeline: timeline } = load(path.resolve(__dirname, '../services/goalTimeline.ts'));
const base = { goal: 'gain_muscle', sex: 'male', age: 27, heightCm: 175,
  currentWeightKg: 60, targetChangeKg: 10, trainingDays: 3, trainingDurationMinutes: 45, activityLevel: 'sedentary' };
for (const [goal, minWeeks, maxWeeks, minWeeklyKg, maxWeeklyKg, halfwayWeeks] of [
  ['gain_muscle', 34, 67, 0.15, 0.3, 17],
]) {
  const result = timeline({ ...base, goal });
  assert.equal(result.kind, 'estimate');
  assert.equal(result.minWeeks, minWeeks);
  assert.equal(result.maxWeeks, maxWeeks);
  assert.equal(result.minWeeklyKg, minWeeklyKg);
  assert.equal(result.maxWeeklyKg, maxWeeklyKg);
  assert(timeline({ ...base, goal, targetChangeKg: 20 }).minWeeks > result.minWeeks);
  assert.equal(timeline({ ...base, goal, targetWeightKg: 65 }).minWeeks, halfwayWeeks);
}
const loss = timeline({ ...base, goal: 'lose_weight', currentWeightKg: 80 });
assert.equal(loss.kind, 'estimate');
assert.equal(loss.minWeeks, 20);
assert.equal(loss.maxWeeks, 40);
assert.equal(loss.minWeeklyKg, 0.25);
assert.equal(loss.maxWeeklyKg, 0.5);
// Lighter profiles keep a lower rate cap; calorie or training inputs cannot
// accelerate the muscle reference to match ordinary weight gain.
assert.equal(timeline({ ...base, goal: 'lose_weight', targetChangeKg: 2 }).maxWeeklyKg, 0.45);
assert.equal(timeline({ ...base, goal: 'gain_muscle', currentWeightKg: 40 }).maxWeeklyKg, 0.2);
assert.equal(timeline({ ...base, trainingDays: 7, dailyCalorieAdjustment: 300 }).minWeeks, 34);
for (const goal of ['maintain', 'balanced']) {
  const result = timeline({ ...base, goal });
  assert.equal(result.kind, 'review');
  assert.equal(result.weeks, 4);
  assert.equal(result.minWeeklyKg, undefined);
}
// No deadline for an unsupported loss target, a reached/reversed target, or
// a calorie budget pointing away from the requested weight change.
assert.equal(timeline({ ...base, goal: 'lose_weight' }).kind, 'review');
assert.equal(timeline({ ...base, targetWeightKg: 60 }).kind, 'review');
assert.equal(timeline({ ...base, targetWeightKg: 55 }).kind, 'review');
assert.equal(timeline({ ...base, currentWeightKg: 35, dailyCalorieAdjustment: -300 }).kind, 'review');
assert.equal(timeline(null).kind, 'review');
for (const goal of ['gain_muscle', 'lose_weight', 'maintain', 'balanced']) {
  for (const currentWeightKg of [35, 60, 80, 100, 300]) {
    for (const targetChangeKg of [0, 0.1, 5, 10, 100]) {
      const result = timeline({ ...base, goal, currentWeightKg, targetChangeKg });
      if (result.kind !== 'estimate') continue;
      assert(Number.isInteger(result.minWeeks) && result.minWeeks >= 1);
      assert(result.maxWeeks >= result.minWeeks && Number.isFinite(result.maxWeeks));
      assert(result.minWeeklyKg > 0 && result.maxWeeklyKg <= 0.5);
      assert(result.minWeeks * result.maxWeeklyKg >= targetChangeKg - 0.001);
      assert(result.maxWeeks * result.minWeeklyKg >= targetChangeKg - 0.001);
    }
  }
}
const curveKeys = ['estimatedPeriod', 'weeksRange', 'week', 'reviewPeriod', 'firstReview', 'reviewCaption',
  'pace', 'referenceProgress', 'estimateNote', 'muscleEstimateNote', 'reviewNote', 'reviewTargetNote', 'timedDescription', 'reviewDescription',
  'maintainReviewCaption', 'balancedReviewCaption', 'maintainReviewNote', 'balancedReviewNote'];
const english = require('../locales/en.json').nutritionEstimate.curve;
for (const locale of ['fr', 'en', 'de', 'es-ES', 'es-MX', 'pt-BR']) {
  const curve = require(`../locales/${locale}.json`).nutritionEstimate.curve;
  for (const key of curveKeys) {
    assert(curve[key], `${locale}: missing ${key}`);
    assert.deepEqual((curve[key].match(/\{\{\w+\}\}/g) || []).sort(), (english[key].match(/\{\{\w+\}\}/g) || []).sort());
  }
}
console.log('Goal timeline checks passed: all four goals, edge cases, reference pace and six locales.');
