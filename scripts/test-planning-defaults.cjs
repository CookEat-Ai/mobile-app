const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
const storage = new Map();
let failWrite = false;
const asyncStorage = {
  getItem: async key => storage.get(key) ?? null,
  setItem: async (key, value) => {
    if (failWrite) { failWrite = false; throw new Error('disk unavailable'); }
    await tick(); storage.set(key, value);
  },
};
const modules = new Map();
function load(filename) {
  const file = path.resolve(__dirname, '..', filename);
  if (modules.has(file)) return modules.get(file);
  const exports = {}; modules.set(file, exports);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, Date, Intl, performance, setTimeout, require: id => {
    if (id === '@react-native-async-storage/async-storage') return asyncStorage;
    if (id === './fitnessProfile') return { loadFitnessProfile: async () => ({ goal: 'balanced' }), fitnessProfileToPlanningPreferences: () => ({}) };
    return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(file), id + '.ts')));
  } });
  return exports;
}
const pantry = load('services/pantryDefaults.ts');
const weekly = load('services/weeklyPlanning.ts');
const configuration = load('services/planningConfiguration.ts');
const regeneration = load('services/planningRegeneration.ts');
const nutrition = load('services/nutritionModel.ts');
const oldPlan = { _id: 'selected', servings: 3, preferences: {
  goal: 'gain_muscle', weeklyBudget: 65, country: 'FR', currency: 'EUR', cookingDays: [0, 2, 4],
  cookingLevel: 'medium', mealBudget: 'budget_large', equipments: ['oven', 'microwave'], duration: 'medium',
  cuisineStyle: ['italian', 'thai'], diet: 'halal', excludedIngredients: ['porc', 'lait'],
  pantryIngredients: ['Tomates', 'Tomate', 'Riz'], pantryMode: 'strict',
} };
const t = key => key;
const jsx = (type, props, ...children) => ({ type, props: { ...props, children } });
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const text = node => node == null ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
function screen({ source = 'selected', demo = true, failure = false } = {}) {
  const slots = [], effects = [], routes = [], requests = []; let cursor = 0, tree;
  const react = { __esModule: true, createElement: jsx,
    useState(value) { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(value) { const index = cursor++; if (!(index in slots)) slots[index] = { current: value }; return slots[index]; },
    useEffect(callback, dependencies) { const index = cursor++, previous = slots[index]; if (previous && dependencies.every((item, i) => item === previous[i])) return; slots[index] = dependencies; effects.push(callback); },
    useCallback: callback => callback,
  }; react.default = react;
  const dependencies = {
    react,
    'react-native': { StyleSheet: { create: value => value }, Platform: { OS: 'ios' }, Keyboard: { dismiss() {} }, Text: 'Text', View: 'View', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', KeyboardAvoidingView: 'KeyboardAvoidingView' },
    'react-i18next': { useTranslation: () => ({ t, i18n: { language: 'fr' } }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }) },
    'expo-router': { useLocalSearchParams: () => ({ sourcePlanId: source, replace: 'true' }), useFocusEffect() {}, router: { push: value => routes.push(value), back() {} } },
    '@react-native-async-storage/async-storage': asyncStorage,
    '../../constants/AppTheme': require('./helpers/ui-theme.cjs'),
    '../../hooks/useResponsive': { contentColumn: () => ({}), useResponsive: () => ({ gutter: 20 }) },
    '../../hooks/usePlanningClock': { usePlanningClock: () => ({ weekStart: '2026-10-21' }) },
    '../../services/nutritionModel': nutrition,
    '../../services/cookingPreferences': load('services/cookingPreferences.ts'),
    '../../services/weeklyPlanning': weekly,
    '../../services/planningConfiguration': configuration,
    '../../services/planningRegeneration': regeneration,
    '../../services/pantryDefaults': pantry,
    '../../services/presentationMode': { isPresentationModeEnabled: async () => demo },
    '../../services/fitnessProfile': { loadFitnessProfile: async () => ({ goal: 'lose_weight' }) },
    '../../services/ingredientCategories': { ingredientCategories: () => [] },
    '../../services/haptics': { feedback: { selection() {}, confirm() {}, error() {} } },
    '../../services/analytics': { __esModule: true, default: { track: async () => {} } },
    '../../services/api': { apiService: { getCatalogCuisines: async () => ({ data: { cuisines: [] } }), getMealPlanById: async (id, user) => {
      requests.push({ id, user }); return failure ? { error: 'offline' } : { data: { plan: oldPlan } };
    } } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/planning/configure.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports, require: id => dependencies[id] || new Proxy({ __esModule: true }, { get: (object, key) => key in object ? object[key] : String(key) }) });
  const render = () => { cursor = 0; tree = exports.default(); while (effects.length) effects.shift()(); return tree; };
  const find = type => nodes(tree).find(node => node.type === type);
  const next = () => { const button = nodes(tree).find(node => node.type === 'TouchableOpacity' && text(node).includes('common.continue')); assert(button && !button.props.disabled); button.props.onPress(); render(); };
  const choice = label => { const node = nodes(tree).find(node => node.props.accessibilityLabel === label || node.props.title === label); assert(node, label); node.props.onPress(); render(); };
  return { render, find, next, choice, routes, requests, get tree() { return tree; } };
}
(async () => {
  assert.equal(await pantry.loadSavedPantryIngredientNames(), null);
  storage.set(pantry.PANTRY_STORAGE_KEY, JSON.stringify([{ id: 'existing-rice', name: 'Riz', category: 'cereales', addedAt: '2026-01-01' }]));
  await Promise.all([pantry.savePantryIngredientNames(['Riz', 'Œufs', 'Oeufs']), pantry.savePantryIngredientNames(['Riz', 'Tomate'])]);
  assert.equal((await pantry.loadSavedPantryIngredientNames()).join(','), 'Riz,Tomate', 'last rapid edit wins');
  assert.equal(JSON.parse(storage.get(pantry.PANTRY_STORAGE_KEY))[0].id, 'existing-rice', 'other pantry screens keep their metadata');
  await pantry.savePantryIngredientNames([]);
  assert.equal((await pantry.loadSavedPantryIngredientNames()).length, 0, 'an explicitly empty inventory stays empty');
  failWrite = true;
  await assert.rejects(pantry.savePantryIngredientNames(['Failed']), /disk unavailable/);
  await pantry.savePantryIngredientNames(['Recovered']);
  assert.equal((await pantry.loadSavedPantryIngredientNames()).join(','), 'Recovered', 'failed writes do not block later edits');
  storage.set(pantry.PANTRY_STORAGE_KEY, JSON.stringify(['Œufs', 'Oeufs', 'Riz']));
  assert.equal((await pantry.loadSavedPantryIngredientNames()).join(','), 'Œufs,Riz', 'legacy pantry names migrate on read');
  const mapped = regeneration.planningSettingsFromPlan(oldPlan);
  assert.equal(mapped.cuisineIds.join(','), 'italian,thai');
  assert.equal(mapped.equipments.join(','), 'standard-kitchen,oven,microwave');
  assert.equal(mapped.pantryIngredients.join(','), 'Tomates,Riz');
  assert.equal(mapped.servings, 3); assert.equal(mapped.weeklyBudget, 65);
  assert.equal(regeneration.planningGoalFromPlan({ preferences: { nutritionProfile: { goal: 'maintain' } } }, 'balanced'), 'maintain');
  assert.equal(regeneration.planningGoalFromPlan({ preferences: {}, profileSnapshot: { goal: 'gain_muscle' } }, 'balanced'), 'gain_muscle');
  storage.set('userId', 'owner');
  await weekly.savePlanningGenerationSettings({ ...weekly.DEFAULT_PLANNING_GENERATION_SETTINGS, diet: 'vegan', pantryIngredients: ['Unrelated'], weeklyBudget: 100 });
  const regenerated = screen(); regenerated.render(); await tick(); regenerated.render();
  assert.equal(regenerated.requests[0].id, 'selected'); assert.equal(regenerated.requests[0].user, 'owner');
  const goal = nodes(regenerated.tree).find(node => node.props.accessibilityLabel === 'fitnessOnboarding.options.goal.gain_muscle');
  assert.equal(goal.props.accessibilityState.checked, true, 'saved plan goal overrides the current profile in presentation mode');
  regenerated.choice('fitnessOnboarding.options.goal.gain_muscle');
  assert.equal(regenerated.find('ServingsControl').props.value, 3); regenerated.next();
  assert.equal(regenerated.find('CookingDaysPicker').props.value.join(','), '0,2,4'); regenerated.next();
  const budget = regenerated.find('PlanningBudgetPicker'); assert.equal(budget.props.value, 65);
  budget.props.onChange(65, { country: 'FR', currency: 'EUR', minimum: 10 }); regenerated.render(); regenerated.next();
  const inventory = regenerated.find('PlanningPantry'); assert.equal(inventory.props.value.pantryIngredients.join(','), 'Tomates,Riz');
  inventory.props.onConfirm(inventory.props.value); regenerated.render();
  assert.equal(regenerated.find('PantryModeChoice').props.value, 'strict', 'regeneration preselects the original shopping choice');
  regenerated.find('PantryModeChoice').props.onChange('strict'); regenerated.render();
  const duration = nodes(regenerated.tree).find(node => node.props.title === 'planning.settings.duration.medium');
  assert.equal(duration.props.selected, true); regenerated.choice('planning.settings.duration.medium');
  regenerated.choice('onboarding.formQuestions.medium'); regenerated.next(); regenerated.next();
  regenerated.choice('planningConfig.diets.halal');
  assert.equal(regenerated.find('TextInput').props.value, 'porc, lait');
  const generate = nodes(regenerated.tree).find(node => node.type === 'TouchableOpacity' && text(node).includes('planningDetail.regenerate'));
  generate.props.onPress();
  for (let attempt = 0; attempt < 20 && !regenerated.routes.length; attempt++) await tick();
  regenerated.render();
  assert(regenerated.routes.length, `configuration must reach generation: ${text(regenerated.tree)}`);
  const sent = JSON.parse(regenerated.routes.at(-1).params.config);
  for (const key of ['servings', 'weeklyBudget', 'country', 'currency', 'cookingLevel', 'mealBudget', 'duration', 'diet', 'pantryMode']) assert.equal(sent[key], mapped[key], `regeneration preserves ${key}`);
  for (const key of ['cookingDays', 'equipments', 'cuisineIds', 'excludedIngredients', 'pantryIngredients']) assert.equal(sent[key].join(','), mapped[key].join(','), `regeneration preserves ${key}`);
  assert.equal(sent.goal, 'gain_muscle');
  const skipped = screen(); skipped.render(); await tick(); skipped.render();
  skipped.choice('fitnessOnboarding.options.goal.gain_muscle'); skipped.next(); skipped.next(); skipped.next();
  const skip = nodes(skipped.tree).find(node => node.type === 'TouchableOpacity' && text(node) === 'planningFlow.skip');
  skip.props.onPress(); skipped.render();
  skipped.choice('planning.settings.duration.medium'); skipped.choice('onboarding.formQuestions.medium'); skipped.next(); skipped.next(); skipped.choice('planningConfig.diets.halal');
  nodes(skipped.tree).find(node => node.type === 'TouchableOpacity' && text(node).includes('planningDetail.regenerate')).props.onPress();
  for (let attempt = 0; attempt < 20 && !skipped.routes.length; attempt++) await tick();
  assert.equal(JSON.parse(skipped.routes.at(-1).params.config).pantryIngredients.length, 0, 'skipping excludes pantry constraints for this generation');
  assert.equal((await pantry.loadSavedPantryIngredientNames()).join(','), 'Tomates,Riz', 'skipping does not erase the inventory');
  const added = screen({ source: null }); added.render(); await tick(); added.render();
  added.find('PlanningPantry').props.onChange({ pantryIngredients: ['Riz', 'Œufs'], pantryMode: 'priority' });
  await tick(); await tick();
  const reopened = screen({ source: null }); reopened.render(); await tick(); reopened.render();
  assert.equal(reopened.find('PlanningPantry').props.value.pantryIngredients.join(','), 'Riz,Œufs', 'edits survive leaving before generation and reopening a new plan');
  reopened.find('PlanningPantry').props.onChange({ pantryIngredients: [], pantryMode: 'priority' }); await tick(); await tick();
  const empty = screen({ source: null }); empty.render(); await tick(); empty.render();
  assert.equal(empty.find('PlanningPantry').props.value.pantryIngredients.length, 0, 'deleted inventory is not restored from old planning preferences');
  const failed = screen({ failure: true }); failed.render(); await tick(); failed.render();
  assert(nodes(failed.tree).some(node => text(node) === 'planning.errors.load'), 'a missing selected plan is reported instead of silently using unrelated preferences');
  assert.equal(failed.routes.length, 0);
  console.log('Planning defaults passed: selected-plan prefill through generation, pantry persistence before generation, removals, legacy data, ordered writes and storage failures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
