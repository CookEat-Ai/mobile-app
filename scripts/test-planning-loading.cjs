const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../services/weeklyPlanning.ts');
function loadBudgetModule(name) {
  const sourcePath = path.resolve(__dirname, '../services', name + '.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.equal(source, fs.readFileSync(path.resolve(__dirname, '../../api/src/services', name + '.ts'), 'utf8'), 'client and server calorie rules must match');
  const result = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports: result, require: dependency => loadBudgetModule(dependency.replace('./', '')) });
  return result;
}
let now = 0;
let timers = [];
let storedSettings = null;
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: exportsObject,
  require: name => name === './planning-calorie-budget' ? loadBudgetModule('planning-calorie-budget')
    : name === '@react-native-async-storage/async-storage' ? {
      getItem: async () => storedSettings,
      setItem: async (_key, value) => { storedSettings = value; },
    } : name === './fitnessProfile' ? {
      loadFitnessProfile: async () => ({}),
      fitnessProfileToPlanningPreferences: () => ({ cuisineStyle: ['italian'], diet: 'vegetarian' }),
    } : {},
  performance: { now: () => now },
  setTimeout: (resolve, delay) => { timers.push({ resolve, at: now + delay }); },
}, { filename });
const { waitForPlanningMinimumDuration, isCompleteWeeklyPlan } = exportsObject;
const tick = async target => {
  now = target;
  const due = timers.filter(timer => timer.at <= now);
  timers = timers.filter(timer => timer.at > now);
  due.forEach(timer => timer.resolve());
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
(async () => {
  const expectFourMeals = settings => {
    assert.equal(settings.includeSnack, true);
    assert.equal(Object.keys(settings.mealsByDay).length, settings.cookingDays.length);
    for (const day of settings.cookingDays) {
      assert.deepEqual(Array.from(settings.mealsByDay[String(day)]), ['breakfast', 'lunch', 'snack', 'dinner']);
    }
  };
  expectFourMeals(await exportsObject.loadPlanningGenerationSettings());
  storedSettings = JSON.stringify({ cookingDays: [1, 5], mealsByDay: { 1: ['dinner'], 5: ['snack'] }, includeSnack: true,
    duration: 'fast', cuisineIds: ['italian'], diet: 'vegetarian', excludedIngredients: ['peanut'] });
  const migrated = await exportsObject.loadPlanningGenerationSettings();
  expectFourMeals(migrated);
  assert.deepEqual(Array.from(migrated.cookingDays), [1, 5]);
  assert.equal(migrated.duration, 'fast');
  assert.equal(migrated.diet, 'vegetarian');
  assert.deepEqual(Array.from(migrated.cuisineIds), ['italian']);
  assert.deepEqual(Array.from(migrated.excludedIngredients), ['peanut']);
  await exportsObject.savePlanningGenerationSettings({ ...migrated, cookingDays: [0, 6], mealsByDay: { 0: ['dinner'] }, includeSnack: true });
  expectFourMeals(JSON.parse(storedSettings));
  storedSettings = '{invalid';
  expectFourMeals(await exportsObject.loadPlanningGenerationSettings());
  assert.equal(exportsObject.PLANNING_MINIMUM_LOADING_MS, 5000);
  for (const responseTime of [0, 1200, 4999, 5000, 8000, 60000]) {
    now = responseTime; timers = [];
    let finished = false;
    const waiting = waitForPlanningMinimumDuration(0).then(() => { finished = true; });
    await Promise.resolve();
    if (responseTime < 5000) {
      assert.equal(finished, false, 'fast response must not reveal the plan immediately');
      await tick(4999);
      assert.equal(finished, false, 'the full five seconds are mandatory');
      await tick(5000);
    } else {
      assert.equal(timers.length, 0, 'a slow response must not add another five seconds');
    }
    await waiting;
    assert(finished);
  }
  // A retry gets its own minimum instead of reusing the previous attempt's time.
  now = 20000; timers = [];
  let retried = false;
  const retry = waitForPlanningMinimumDuration(20000).then(() => { retried = true; });
  await tick(24999); assert(!retried);
  await tick(25000); await retry; assert(retried);

  const meal = { dayIndex: 0, mealType: 'dinner', source: 'catalog', status: 'ready',
    catalogRecipeId: 'dinner-a', title: 'Dîner', image: 'https://example.test/meal.jpg', calories: 600, proteins: 35 };
  const plan = { nutritionTargets: { dailyCalories: 1500 }, preferences: { cookingDays: [0], mealsByDay: { 0: ['dinner'] } }, meals: [meal] };
  assert(isCompleteWeeklyPlan(plan));
  for (const calories of [570, 630]) assert(isCompleteWeeklyPlan({ ...plan, meals: [{ ...meal, calories }] }));
  for (const calories of [569, 631]) assert(!isCompleteWeeklyPlan({ ...plan, meals: [{ ...meal, calories }] }));
  assert(!isCompleteWeeklyPlan({ ...plan, nutritionTargets: undefined }));
  const { withinCalorieBudget } = loadBudgetModule('planning-calorie-budget');
  for (const calories of [2470, 2600, 2730]) assert(withinCalorieBudget(calories, 2600));
  for (const calories of [2424, 2469, 2731, NaN, Infinity]) assert(!withinCalorieBudget(calories, 2600));
  assert(isCompleteWeeklyPlan({ ...plan, meals: [{ ...meal, calories: 400, portionScale: 2, calorieFit: 'closest_available' }] }), 'explicit nearest fit must finish loading');
  assert(!isCompleteWeeklyPlan({ ...plan, meals: [{ ...meal, calories: 400 }] }), 'unmarked legacy miss remains invalid');
  assert(!isCompleteWeeklyPlan({ ...plan, meals: [{ ...meal, calories: 400, portionScale: 3, calorieFit: 'closest_available' }] }), 'fallback cannot justify extreme portion factors');
  assert(!isCompleteWeeklyPlan(null));
  assert(!isCompleteWeeklyPlan({ ...plan, meals: [] }));
  assert(!isCompleteWeeklyPlan({ ...plan, meals: [meal, meal] }));
  for (const status of ['idea', 'generating', 'failed']) {
    assert(!isCompleteWeeklyPlan({ ...plan, meals: [{ ...meal, status }] }), 'pending or failed meals must not end loading');
  }
  assert(!isCompleteWeeklyPlan({ ...plan, preferences: { cookingDays: [0, 1], mealsByDay: { 0: ['dinner'], 1: ['dinner'] } } }));
  // Exercise the actual loading hook: receiving data and reaching 5s cannot
  // navigate until the bar's completion callback fires. Unmount cancels it.
  const hookPath = path.resolve(__dirname, '../components/loading/PlanningLoadingView.tsx');
  const hookModule = {};
  let readyValues = [], cleanup;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(hookPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    exports: hookModule,
    require: dependency => dependency === 'react' ? {
      useState: () => [false, value => readyValues.push(value)],
      useRef: value => ({ current: value }), useCallback: callback => callback,
      useEffect: effect => { cleanup = effect(); },
    } : dependency.includes('weeklyPlanning') ? exportsObject : {},
  }, { filename: hookPath });
  for (const responseTime of [0, 1200, 8000]) {
    now = responseTime; timers = []; readyValues = [];
    const hook = hookModule.usePlanningLoading();
    let revealed = false;
    const result = hook.finish(0).then(done => { revealed = done; });
    await Promise.resolve();
    assert(!revealed);
    if (responseTime < 5000) {
      await tick(4999); assert(!readyValues.includes(true));
      await tick(5000);
    }
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.equal(readyValues.at(-1), true, 'bar may finish only after the real response and minimum time');
    await tick(60000); assert(!revealed, 'time alone never reveals the plan');
    hook.onComplete(); await result; assert(revealed);
    hook.reset(); assert.equal(readyValues.at(-1), false, 'retry resets bar');
    cleanup();
  }
  now = 10000; timers = []; readyValues = [];
  const cancelledHook = hookModule.usePlanningLoading();
  const cancelled = cancelledHook.finish(0);
  await Promise.resolve(); cleanup();
  assert.equal(await cancelled, false, 'unmount cancels navigation');

  // Exercise the screen's real completion branch, including its navigation target.
  const screenPath = path.resolve(__dirname, '../app/planning/loading.tsx');
  const screenCode = ts.transpileModule(fs.readFileSync(screenPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  for (const scenario of [
    { replace: 'true', valid: true, completed: true },
    { replace: 'false', valid: true, completed: true },
    { replace: 'true', valid: false, completed: true },
    { replace: 'true', valid: true, completed: false },
  ]) {
    const screenModule = {};
    const navigation = [];
    const effects = [];
    const errors = [];
    const reviewRequests = [];
    let completeBar;
    const barFinished = new Promise(resolve => { completeBar = resolve; });
    const react = {
      createElement: () => null,
      useEffect: effect => effects.push(effect),
      useRef: value => ({ current: value }),
      useState: value => [value, error => errors.push(error)],
    };
    const dependencies = {
      react,
      'react-native': { StyleSheet: { create: value => value } },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
      'react-i18next': { useTranslation: () => ({ t: key => key }) },
      'expo-router': {
        useLocalSearchParams: () => ({ replace: scenario.replace, config: JSON.stringify({ cookingDays: [0], mealsByDay: { 0: ['dinner'] }, includeSnack: true }) }),
        router: {
          dismissTo: route => navigation.push(['dismissTo', route]),
          replace: route => navigation.push(['replace', route]),
        },
      },
      '@react-native-async-storage/async-storage': { getItem: async () => 'user' },
      '../../services/haptics': { feedback: { success: async () => {}, error: async () => {} } },
      '../../services/planningUpdates': { invalidatePlanning() {} },
      'expo-haptics': { notificationAsync: async () => {}, NotificationFeedbackType: { Success: 'success', Error: 'error' } },
      '../../components/loading/PlanningLoadingView': { usePlanningLoading: () => ({ reset() {}, finish: () => barFinished }) },
      '../../constants/Colors': { Colors: { light: {} } },
      '../../hooks/useSubscription': { useSubscription: () => ({ subscriptionStatus: { isSubscribed: true }, isLoading: false }) },
      '../../services/analytics': { track() {} },
      '../../services/presentationScan': { finishPresentationScan() {} },
      '../../services/planningReview': { schedulePlanningReview: planId => reviewRequests.push(planId) },
      '../../services/api': { apiService: { createMealPlan: async input => {
        expectFourMeals(input.preferences);
        return { data: { plan: scenario.valid ? { ...plan, _id: 'new-plan' } : null } };
      } } },
      '../../services/fitnessProfile': { loadFitnessProfile: async () => ({}), fitnessProfileToPlanningPreferences: () => ({}) },
      '../../services/weeklyPlanning': { ...exportsObject, startOfWeekMondayKey: () => '2026-09-28' },
    };
    vm.runInNewContext(screenCode, {
      exports: screenModule, require: name => dependencies[name] || {}, performance: { now: () => 0 },
    }, { filename: screenPath });
    screenModule.default();
    effects.forEach(effect => effect());
    for (let i = 0; i < 20; i++) await Promise.resolve();
    assert.equal(navigation.length, 0, 'the screen must wait for the completed loading bar');
    assert.equal(reviewRequests.length, 0, 'review must wait for the completed loading bar');
    completeBar(scenario.completed);
    for (let i = 0; i < 20; i++) await Promise.resolve();
    if (!scenario.valid || !scenario.completed) {
      assert.equal(navigation.length, 0, 'failed or cancelled generation must not navigate');
      assert.equal(reviewRequests.length, 0, 'failed or cancelled generation must not request review');
      if (!scenario.valid) assert(errors.length > 0);
    } else if (scenario.replace === 'true') {
      assert.deepEqual(navigation, [['dismissTo', '/(tabs)']], 'regeneration returns to the existing Planning home');
    } else {
      assert.equal(navigation[0][0], 'replace');
      assert.equal(navigation[0][1].pathname, '/planning/[planId]');
      assert.equal(navigation[0][1].params.planId, 'new-plan');
    }
    if (scenario.valid && scenario.completed) assert.deepEqual(reviewRequests, ['new-plan']);
  }
  console.log('Planning loading checks passed: 5s minimum, fast/slow responses, retry, 5% calorie bounds, complete ready meals, bar completion and unmount cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
