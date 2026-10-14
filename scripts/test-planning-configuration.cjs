const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, require: name => dependencies[name] || require(name) });
  return exports;
}
const pantry = load('services/planningPantry.ts');

const search = load('services/pantryIngredientSearch.ts', { './planningPantry': pantry });
const suggestions = [
  { id: 'oeufs', name: 'Œufs', icon: '🥚' }, { id: 'epinard', name: 'Épinards', icon: '🥬' },
  { id: 'avocat', name: 'Avocat', icon: '🥑' }, { id: 'avoine', name: 'Avoine', icon: '🌾' },
];
assert.equal(search.pantrySearchSuggestions(suggestions, 'oeuf')[0].id, 'oeufs', 'ligatures can be searched from a standard keyboard');
assert.equal(search.pantrySearchSuggestions(suggestions, 'epin')[0].id, 'epinard', 'accents do not prevent matching');
assert.equal(search.pantrySearchSuggestions(suggestions, 'avo').map(item => item.id).join(','), 'avocat,avoine');
assert.equal(search.pantrySearchSuggestions(suggestions, 'tempeh fumé').length, 0, 'an unmatched name reaches free entry');
assert.equal(search.readPantryReviewIngredients('["Riz",null,2,"Œufs"]').join(','), 'Riz,Œufs');
assert.equal(search.readPantryReviewIngredients('invalid').length, 0);
assert.equal(pantry.normalizePantryIngredients(['Œufs', 'Oeufs']).length, 1, 'typed and scanned spellings must not duplicate eggs');

const { planningConfiguration, planningStepAfterScan, planningSteps, PLANNING_STEPS, planningChoiceDraft, planningStepCanContinue } = load('services/planningConfiguration.ts', { './planningPantry': pantry });
assert.equal(planningSteps(false).join(','), PLANNING_STEPS.join(','));
assert.equal(planningSteps(true).join(','), 'goal,' + PLANNING_STEPS.join(','));
const nutrition = load('services/nutritionModel.ts');
const { profileForPlanningGoal } = load('services/planningGoal.ts', { './nutritionModel': nutrition });
const profile = { goal: 'lose_weight', currentWeightKg: 75, nutritionWeightKg: 75, targetWeightKg: 65, targetChangeKg: 10, durationWeeks: 0, dailyCalorieAdjustment: -200, sex: 'male', age: 30, heightCm: 180, activityLevel: 'light', trainingDays: 3 };
assert.equal(profileForPlanningGoal(profile), profile);
assert.equal(profileForPlanningGoal(profile, 'invalid'), profile);
assert.equal(profileForPlanningGoal(profile, 'lose_weight'), profile);
const muscle = profileForPlanningGoal(profile, 'gain_muscle');
assert.equal(muscle.goal, 'gain_muscle');
assert.equal(muscle.targetWeightKg, undefined, 'an opposing weight target cannot carry into a different goal');
assert.equal(muscle.targetChangeKg, 0, 'no weight target is invented');
assert.equal(muscle.dailyCalorieAdjustment, 0, 'old adjustments belong to the previous goal');
assert.equal(muscle.currentWeightKg, 75);
assert.equal(profile.goal, 'lose_weight', 'demo does not overwrite the stored body profile');
assert(nutrition.calculateNutritionTargets(muscle).dailyProteinGrams > nutrition.calculateNutritionTargets(profileForPlanningGoal(profile, 'balanced')).dailyProteinGrams, 'goal reaches the nutrition model');
const { createPantryScanHandoff, readPantryScanHandoff } = load('services/pantryScanHandoff.ts', { './planningPantry': pantry });
const settings = { servings: 2, cookingDays: [1, 3], includeSnack: true, mealsByDay: { 1: ['lunch'], 3: ['dinner'] }, duration: 'fast', diet: 'vegetarian', cuisineIds: ['italian'], excludedIngredients: ['peanuts'], pantryIngredients: ['Tomates', 'Tomate', ' Riz '], pantryMode: 'strict' };
assert.equal(planningConfiguration(settings, false).pantryIngredients.length, 0, 'without-photo choice must exclude ingredients from previous runs');
const withIngredients = planningConfiguration(settings, true);
assert.equal(withIngredients.pantryIngredients.join(','), 'Tomates,Riz');
for (const field of ['servings', 'cookingDays', 'duration', 'diet', 'cuisineIds', 'excludedIngredients', 'mealsByDay']) assert.equal(withIngredients[field], settings[field], `keeps ${field}`);
assert.equal(settings.pantryIngredients.length, 3, 'configuration must not mutate saved settings');
for (const presentation of [false, true]) {
  const handoff = readPantryScanHandoff(createPantryScanHandoff(['Tomate', 'Tomates', 'Riz'], 'strict', presentation));
  assert.equal(handoff.generate, false, 'scan never generates immediately');
  assert.equal(handoff.pantryMode, 'strict', 'mode respects the user selection');
  assert.equal(handoff.replace, true);
  assert.equal(planningStepAfterScan(), 'duration');
  assert.equal(PLANNING_STEPS.slice(PLANNING_STEPS.indexOf(planningStepAfterScan())).join(','), 'duration,cuisines,diet,exclusions,servings');
}
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Riz'])).pantryMode, undefined, 'new review waits for an explicit shopping choice');
assert.equal(readPantryScanHandoff('{"ingredients":["Riz"],"generate":true}').generate, false, 'old presentation handoffs cannot bypass remaining steps');
const untouched = JSON.stringify(settings);
const demo = planningChoiceDraft(settings, true);
assert.equal(JSON.stringify(settings), untouched, 'demo must not erase saved preferences');
for (const field of ['duration', 'diet', 'cuisineIds', 'servings']) assert.equal(demo[field], null);
for (const field of ['cookingDays', 'excludedIngredients', 'pantryIngredients']) assert.equal(demo[field].length, 0);
assert.equal(Object.keys(demo.mealsByDay).length, 0);
const draft = { ...demo, goal: null };
for (const step of ['goal', 'days', 'duration', 'cuisines', 'diet', 'servings']) assert.equal(planningStepCanContinue(step, draft), false, `${step} requires a choice`);
assert.equal(planningStepCanContinue('ingredients', draft), true, 'pantry remains optional');
assert.equal(planningStepCanContinue('exclusions', draft), true, 'exclusions remain optional');
const answered = { ...draft, goal: 'balanced', cookingDays: [2], duration: 'all', diet: 'none', cuisineIds: [], servings: 1 };
for (const step of ['goal', 'days', 'duration', 'cuisines', 'diet', 'servings']) assert.equal(planningStepCanContinue(step, answered), true, `${step} accepts an explicit answer`);
assert.equal(JSON.stringify(planningChoiceDraft(settings, false)), untouched, 'normal mode keeps saved choices');
const values = new Map([
  ['meal_plan_cache_v1:owner:2026-10-12:fr', 'cache'], ['meal_plan_cache_v1:owner:2026-10-05:fr', 'history'],
  ['meal_plan_cache_v1:foreign:2026-10-12:fr', 'foreign'], ['onboarding_id', 'target'], ['free_swap_id', 'other'],
  ['fitness_goal', 'gain_muscle'], ['settings', 'preferences'],
]);
const storage = { getAllKeys: async () => [...values.keys()], multiGet: async keys => keys.map(key => [key, values.get(key)]), multiRemove: async keys => keys.forEach(key => values.delete(key)) };
const { clearDeletedPlanReferences } = load('services/planningDeletion.ts', {
  '@react-native-async-storage/async-storage': storage,
  './weeklyPlanning': { ONBOARDING_WEEKLY_PLAN_ID_KEY: 'onboarding_id', ONBOARDING_WEEKLY_FREE_SWAP_PLAN_KEY: 'free_swap_id' },
});
(async () => {
  await clearDeletedPlanReferences({ _id: 'target', weekStart: '2026-10-12' }, 'owner');
  assert.equal(values.has('meal_plan_cache_v1:owner:2026-10-12:fr'), false);
  assert.equal(values.has('onboarding_id'), false);
  for (const key of ['meal_plan_cache_v1:owner:2026-10-05:fr', 'meal_plan_cache_v1:foreign:2026-10-12:fr', 'free_swap_id', 'fitness_goal', 'settings']) assert.equal(values.has(key), true, `preserves ${key}`);
  for (const locale of ['fr', 'en', 'de', 'es-ES', 'es-MX', 'pt-BR']) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../locales', locale + '.json'), 'utf8'));
    for (const step of planningSteps(true)) assert(data.planningFlow[step + 'Title']);
    for (const key of ['scanFridge', 'skip']) assert(data.planningFlow[key]);
    for (const key of ['completeQuestion', 'priority', 'strict']) assert(data.planningPantry[key]);
    for (const key of ['foundTitle', 'search', 'suggestions', 'addName', 'done', 'continueEmpty', 'count_one', 'count_other', 'keptCount_one', 'keptCount_other']) assert(data.pantryReview[key], `${locale}: ${key}`);
    for (const goal of ['lose_weight', 'gain_muscle', 'maintain', 'balanced']) assert(data.fitnessOnboarding.options.goal[goal]);
  }
  console.log('Planning configuration passed: no-photo, scan parity, remaining steps, preference preservation, deletion references and six locales.');
})().catch(error => { console.error(error); process.exitCode = 1; });
