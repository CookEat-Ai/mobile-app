const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const memory = new Map();
const storage = {
  getItem: async key => memory.get(key) ?? null,
  setItem: async (key, value) => { memory.set(key, value); },
  removeItem: async key => { memory.delete(key); },
  multiGet: async keys => keys.map(key => [key, memory.get(key) ?? null]),
};
let eligibilityStatus = 0;
const purchases = { checkTrialOrIntroductoryPriceEligibility: async () => ({ annual: { status: eligibilityStatus } }),
  INTRO_ELIGIBILITY_STATUS: { INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 1, INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 2, INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3 } };
const modules = new Map();
function load(file, dev = false, platform = 'ios') {
  const full = path.resolve(root, file);
  const cacheKey = `${full}:${dev}:${platform}`;
  if (modules.has(cacheKey)) return modules.get(cacheKey);
  const exports = {};
  modules.set(cacheKey, exports);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Date, console, __DEV__: dev,
    require: id => id === 'react-native' ? { Platform: { OS: platform } }
      : id === 'react-native-purchases' ? purchases
      : id === '../config/revenuecat' ? {}
      : id === '@react-native-async-storage/async-storage' ? storage
      : id.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(full), id + '.ts')), dev, platform) : {},
  }, { filename: full });
  return exports;
}
(async () => {
  const fitness = load('services/fitnessProfile.ts');
  const planning = load('services/weeklyPlanning.ts');
  const chart = load('services/weightChart.ts');
  const profile = await fitness.loadFitnessProfile();
  const losing = { ...profile, goal: 'lose_weight', currentWeightKg: 80, targetChangeKg: 5 };
  assert.equal(fitness.calculateFitnessProjection(losing).targetWeightKg, 75);
  const reached = { ...losing, currentWeightKg: 74, targetChangeKg: 1, targetWeightKg: 75 };
  const projection = fitness.calculateFitnessProjection(reached);
  assert.equal(projection.targetWeightKg, 75);
  assert.equal(projection.weeklyChangeKg, 0);
  assert.equal(projection.durationWeeks, 0);
  assert(projection.series.every(value => value === 74));
  assert.equal(fitness.fitnessProfileToPlanningPreferences(reached).nutritionProfile.targetChangeKg, 0);
  const gaining = { ...profile, goal: 'gain_muscle', currentWeightKg: 81, targetChangeKg: 1, targetWeightKg: 80 };
  assert.equal(fitness.calculateFitnessProjection(gaining).targetWeightKg, 80);
  assert.equal(fitness.calculateFitnessProjection(gaining).weeklyChangeKg, 0);
  const points = chart.weightChartPoints([80,80,80]);
  assert(points.every(point => point.y === 70));
  const sloped = chart.weightChartPoints([80,78,75]);
  assert.equal(sloped[0].y,32);
  assert.equal(sloped.at(-1).y,108);
  const plan = { nutritionTargets: { dailyCalories: 2000 }, meals: [{ status:'ready', source:'library', recipeId:'imported', dayIndex:0, mealType:'dinner', title:'Rice', image:'https://example.test/rice.jpg', calories:500 }] };
  assert(planning.isUsableWeeklyPlan(plan));
  assert(!planning.isUsableWeeklyPlan({ ...plan, meals:[{ ...plan.meals[0], status:'failed' }] }));
  memory.set('diet','vegan');
  memory.set('favoriteCuisineStyle', JSON.stringify(['cuisine_italian']));
  const initial = await planning.loadPlanningGenerationSettings();
  assert.equal(initial.diet,'vegan');
  assert.equal(initial.cuisineIds[0],'italian');
  await planning.savePlanningGenerationSettings({ ...initial, diet:'none', cuisineIds:[] });
  const cleared = await planning.loadPlanningGenerationSettings();
  assert.equal(cleared.diet,'none');
  assert.equal(cleared.cuisineIds.length,0);
  memory.set('currentWeightKg','74'); memory.set('targetChangeKg','1'); memory.set('fitnessGoal','lose_weight'); memory.set('targetWeightKg','75');
  assert.equal(fitness.calculateFitnessProjection(await fitness.loadFitnessProfile()).targetWeightKg,75);
  const trials = load('services/trialEligibility.ts');
  const annual = { identifier: 'annual', product: {
    identifier: 'annual',
    introPrice: { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7, cycles: 1 },
    defaultOption: { freePhase: { price: { amountMicros: 0 }, billingPeriod: { unit: 'DAY', value: 7 } } },
  } };
  assert.equal((await trials.resolveTrialEligibilityForPackage(annual)).status, 'unknown');
  eligibilityStatus = 2;
  assert.equal((await trials.resolveTrialEligibilityForPackage(annual)).status, 'ineligible');
  eligibilityStatus = 1;
  assert.equal((await trials.resolveTrialEligibilityForPackage(annual)).days, 7);
  const noIntro = { identifier: 'no-intro', product: { identifier: 'no-intro' } };
  assert.equal((await trials.resolveTrialEligibilityForPackage(noIntro)).status, 'ineligible');
  assert.equal((await trials.resolveOnboardingAnnualTrial(null)).status, 'unknown');
  for (const platform of ['ios', 'android']) {
    const devTrials = load('services/trialEligibility.ts', true, platform);
    for (const status of [0, 1, 2, 3]) {
      eligibilityStatus = status;
      assert.equal((await devTrials.resolveTrialEligibilityForPackage(annual)).status, 'eligible');
    }
    assert.equal((await devTrials.resolveTrialEligibilityForPackage(noIntro)).days, null);
    assert.equal((await devTrials.resolveOnboardingAnnualTrial(null)).status, 'unknown');
    assert.equal((await devTrials.resolveQuickActionTrial('missing', 'missing')).status, 'unknown');
    const monthly = { identifier: 'monthly', product: { identifier: 'monthly' } };
    const weekly = { identifier: 'weekly', product: { identifier: 'weekly' } };
    const mixed = await devTrials.resolveTrialEligibilityForPackages([annual, monthly, weekly]);
    assert.equal(mixed.annual.status, 'eligible');
    assert.equal(mixed.annual.days, 7);
    for (const id of ['monthly', 'weekly']) {
      assert.equal(mixed[id].status, 'ineligible');
      assert.equal(mixed[id].days, null);
    }
    const threeDays = {
      identifier: 'three-days',
      product: {
        identifier: 'three-days',
        introPrice: { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 3 },
        defaultOption: { freePhase: { price: { amountMicros: 0 }, billingPeriod: { unit: 'DAY', value: 3 } } },
      },
    };
    assert.equal((await devTrials.resolveTrialEligibilityForPackage(threeDays)).days, 3);
    const productionTrials = load('services/trialEligibility.ts', false, platform);
    assert.equal((await productionTrials.resolveTrialEligibilityForPackage(noIntro)).status, 'ineligible');
  }
  console.log('Mobile regression checks passed: target persistence/crossing, chart coordinates, imported plans, preferences, production/development trial eligibility.');
})().catch(error => { console.error(error); process.exitCode=1; });
