const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual mobile and server calculators without loading React Native.
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (id) => {
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
      assert.equal(id, '@react-native-async-storage/async-storage');
      return {};
    },
  }, { filename: file });
  return exports;
}

const mobile = load(path.resolve(__dirname, '../services/fitnessProfile.ts'));
const server = load(path.resolve(__dirname, '../../api/src/services/nutrition-profile.ts'));
assert.deepEqual(Array.from(server.FITNESS_GOALS), ['lose_weight', 'gain_muscle', 'maintain', 'balanced']);
assert.equal(server.normalizeFitnessGoal('unknown'), 'balanced');
const base = {
  goal: 'gain_muscle', sex: 'male', age: 27, heightCm: 175,
  currentWeightKg: 60, targetChangeKg: 10, durationWeeks: 0,
  activityLevel: 'sedentary', trainingDays: 0, includeSnack: false,
  diet: 'none', avoidIngredients: [], cookingTime: 'less_than_30_minutes', favoriteCuisineStyle: [],
};
const initial = mobile.calculateFitnessProjection(base);
assert.equal(initial.dailyCalories, 2500);
assert.equal(initial.dailyProteinGrams, 96);
assert.equal(initial.durationWeeks, 0);
assert.equal(mobile.calculateFitnessProjection({ ...base, trainingDays: 4 }).dailyCalories, 2650);

let checked = 0;
for (const goal of ['gain_muscle', 'lose_weight', 'maintain', 'balanced']) {
  for (const sex of ['male', 'female', 'unspecified']) {
    for (const activityLevel of ['sedentary', 'light', 'moderate', 'active', 'very_active']) {
      let previousCalories = 0;
      for (let trainingDays = 0; trainingDays <= 7; trainingDays++) {
        const profile = { ...base, goal, sex, activityLevel, trainingDays, trainingDurationMinutes: [20, 45, 75][trainingDays % 3] };
        // Compare monotonicity at a fixed duration below.
        const projection = mobile.calculateFitnessProjection(profile);
        const targets = server.calculateNutritionTargets(mobile.fitnessProfileToPlanningPreferences(profile).nutritionProfile);
        for (const key of Object.keys(targets)) {
          assert.equal(projection[key], targets[key], `${goal}/${sex}/${activityLevel}/${trainingDays}: ${key}`);
        }
        const fixedDuration = mobile.calculateFitnessProjection({ ...profile, trainingDurationMinutes: 45 }).dailyCalories;
        assert(fixedDuration >= previousCalories, 'training must never lower estimated energy needs');
        previousCalories = fixedDuration;
        checked++;
      }
    }
  }
}
console.log(`Fitness nutrition checks passed: reported profile and ${checked} mobile/server comparisons.`);

assert.equal(fs.readFileSync(path.resolve(__dirname, '../services/nutritionModel.ts'), 'utf8'), fs.readFileSync(path.resolve(__dirname, '../../api/src/services/nutrition-profile.ts'), 'utf8'), 'mobile/server model copies must remain identical');
for (const trainingDurationMinutes of [20, 45, 75]) {
  for (const dailyCalorieAdjustment of [-300, -100, 0, 100, 300]) {
    const profile = { ...base, trainingDays: 3, trainingDurationMinutes, dailyCalorieAdjustment, currentWeightKg: 61, nutritionWeightKg: 60, targetWeightKg: 70 };
    assert.equal(mobile.calculateFitnessProjection(profile).dailyCalories, server.calculateNutritionTargets(mobile.fitnessProfileToPlanningPreferences(profile).nutritionProfile).dailyCalories);
    assert.equal(mobile.calculateFitnessProjection(profile).dailyCalories, mobile.calculateFitnessProjection({ ...profile, currentWeightKg: 60 }).dailyCalories, 'one weigh-in must not change targets');
  }
}
