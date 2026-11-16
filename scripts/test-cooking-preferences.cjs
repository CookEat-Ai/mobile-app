const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const memory = new Map();
const storage = { getItem: async key => memory.get(key) ?? null, multiGet: async keys => keys.map(key => [key, memory.get(key) ?? null]),
  setItem: async (key, value) => { memory.set(key, value); }, multiSet: async pairs => pairs.forEach(([key, value]) => memory.set(key, value)) };
const loaded = new Map();
function load(file) {
  file = path.resolve(file);
  if (loaded.has(file)) return loaded.get(file);
  const exports = {}; loaded.set(file, exports);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
    { exports, Date, performance, setTimeout, require: id => id === '@react-native-async-storage/async-storage' ? storage : load(path.resolve(path.dirname(file), id + '.ts')) });
  return exports;
}
const root = path.join(__dirname, '../services');
const fitness = load(path.join(root, 'fitnessProfile.ts'));
const preferences = load(path.join(root, 'recipePreferencesMapping.ts'));
const planner = load(path.join(root, 'weeklyPlanning.ts'));
const configuration = load(path.join(root, 'planningConfiguration.ts'));
(async () => {
  memory.set('cookingLevel', 'advanced'); memory.set('mealBudget', 'budget_small'); memory.set('equipments', '["equipment_none"]');
  const profile = await fitness.loadFitnessProfile();
  const planned = fitness.fitnessProfileToPlanningPreferences(profile);
  assert.equal(planned.cookingLevel, 'advanced'); assert.equal(planned.mealBudget, 'budget_small');
  assert.equal(planned.equipments.join(','), 'standard-kitchen', 'explicitly no appliances stays distinguishable from an unanswered legacy profile');
  const inherited = await planner.loadPlanningGenerationSettings();
  assert.equal(inherited.cookingLevel, 'advanced'); assert.equal(inherited.mealBudget, 'budget_small');
  const changed = { ...inherited, cookingLevel: 'beginner', equipments: ['standard-kitchen', 'oven'], mealBudget: 'budget_large' };
  await planner.savePlanningGenerationSettings(changed);
  const restored = await planner.loadPlanningGenerationSettings();
  assert.equal(restored.cookingLevel, 'beginner'); assert.equal(restored.mealBudget, 'budget_large'); assert.equal(restored.equipments.join(','), 'standard-kitchen,oven');
  const demo = configuration.planningChoiceDraft(restored, true);
  for (const field of ['cookingLevel', 'equipments', 'mealBudget']) assert.equal(demo[field], null, `demo asks ${field} again`);
  assert.equal((await planner.loadPlanningGenerationSettings()).cookingLevel, 'beginner', 'starting a demo does not erase saved preferences');
  const answers = Object.fromEntries(preferences.ONBOARDING_RECIPE_PREFERENCE_KEYS.map(key => [key, memory.get(key) ?? null]));
  const single = preferences.getOnboardingRecipePreferenceOverrides(answers);
  assert.equal(single.cookingLevel, 'advanced'); assert.equal(single.mealBudget, 'budget_small'); assert.equal(single.equipments.join(','), 'standard-kitchen');
  const signature = preferences.getOnboardingRecipeAnswersSignature(answers);
  assert.notEqual(signature, preferences.getOnboardingRecipeAnswersSignature({ ...answers, cookingLevel: 'beginner' }));
  assert.notEqual(signature, preferences.getOnboardingRecipeAnswersSignature({ ...answers, mealBudget: 'budget_large' }));
  memory.delete(planner.PLANNING_GENERATION_SETTINGS_KEY); memory.delete('equipments');
  assert.equal(fitness.fitnessProfileToPlanningPreferences(await fitness.loadFitnessProfile()).equipments.length, 0, 'unanswered legacy gear is not silently interpreted as basic-only');
  console.log('Cooking preferences passed: onboarding → profile → planning, settings round trip, demo reset, single recipes and legacy equipment semantics.');
})().catch(error => { console.error(error); process.exitCode = 1; });

const { budgetOptionsForDays } = load(path.join(root, 'planningBudget.ts'));
const weeklyBudget = { country:'FR',currency:'EUR',minimum:120,maximum:600,step:20,defaultAmount:120,horizonDays:7 };
const oneDay = budgetOptionsForDays(weeklyBudget,1),threeDays=budgetOptionsForDays(weeklyBudget,3);
assert.equal(oneDay.minimum,20);assert.equal(threeDays.minimum,60);assert.equal(threeDays.horizonDays,3);
assert.equal(budgetOptionsForDays(weeklyBudget,7),weeklyBudget);
assert.equal(budgetOptionsForDays(threeDays,3),threeDays,'a new API day-aware budget is not scaled twice');
assert.equal(budgetOptionsForDays(weeklyBudget,0).minimum,20);
const cooking = load(path.join(root,'cookingPreferences.ts'));
assert.equal(cooking.normalizeEquipments(['equipment_fryer']).join(','),'standard-kitchen,fryer');
assert.equal(cooking.normalizeEquipments(['equipment_airfryer']).join(','),'standard-kitchen,airfryer');
