const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const slots = []; let cursor = 0, tree, saved, focus;
const requests = [], reads = [], routes = [];
const settings = { cookingDays: [0, 2], pantryIngredients: ['Old fridge item'], pantryMode: 'strict', servings: 2 };
const jsx = (type, props, ...children) => ({ type, props: { ...props, children } });
const react = { __esModule: true, createElement: jsx,
  useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
  useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
  useCallback: fn => fn, useMemo: fn => fn(),
}; react.default = react;
const noop = () => {};
const deps = {
  react, 'react-native': { StyleSheet: { create: styles => styles }, Text: 'Text', View: 'View', TouchableOpacity: 'TouchableOpacity' },
  'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'fr' } }) },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
  'expo-router': { useFocusEffect: fn => { focus = fn; }, router: { replace: path => routes.push(path) } },
  '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async key => { reads.push(key); return null; } } },
  '../../constants/Colors': { Colors: { light: {} } },
  '../../components/loading/PlanningLoadingView': { usePlanningLoading: () => ({ reset: noop, finish: async () => true, onComplete: noop }) },
  '../../components/planning/PlanningReveal': { usePlanningReveal: () => ({ stopReveal: noop }) },
  '../../services/haptics': { feedback: { confirm: noop, success: noop, error: noop } },
  '../../services/presentationScan': { finishPresentationScan: noop },
  '../../services/analytics': { __esModule: true, default: { track: noop } },
  '../../services/planningReview': { schedulePlanningReview: noop },
  '../../services/anonymousSession': { getAnonymousUserId: async () => 'qa-user' },
  '../../services/fitnessProfile': { loadFitnessProfile: async () => ({}), fitnessProfileToPlanningPreferences: () => ({ goal: 'gain_muscle', diet: 'vegan', duration: 'fast', nutritionProfile: { goal: 'gain_muscle' } }) },
  '../../hooks/useResponsive': { useResponsive: () => ({gutter:20}) },
  '../../hooks/usePlanningClock': { usePlanningClock: () => ({ weekStart: '2026-10-12' }) },
  '../../services/weeklyPlanning': { DEFAULT_COOKING_DAYS: [0, 2], planningStartKey: () => '2026-10-12', addDays: (_key, index) => '2026-10-' + (12 + index),
    normalizeCookingDays: days => days, loadPlanningGenerationSettings: async () => settings,
    savePlanningGenerationSettings: async value => { saved = value; }, saveOnboardingWeeklyPlanId: async () => {}, isCompleteWeeklyPlan: plan => !!plan,
  },
  '../../services/api': { apiService: { getMealPlan: async () => ({ data: {} }), createMealPlan: async body => {
    requests.push(body); return { data: { plan: { _id: 'qa-plan', preferences: { cookingDays: body.preferences.cookingDays }, meals: [] } } };
  } } },
};
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/onboarding/weeklyPlanPreview.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText, { exports: mod.exports, require: name => deps[name] || new Proxy({ __esModule: true }, { get: (o, key) => key in o ? o[key] : String(key) }), performance: { now: () => 0 } });
const render = () => { cursor = 0; tree = mod.exports.default(); return tree; };
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  render(); focus(); await tick(); render();
  assert(!reads.includes('cookeat_planning_pantry_v1'), 'onboarding must not load the pantry');
  assert(!nodes(tree).some(node => ['PlanningPantry', 'PantryModeChoice'].includes(node.type)), 'only cooking days are requested');
  const picker = nodes(tree).find(node => node.type === 'CookingDaysPicker'); assert(picker, 'uses the shared planner picker');
  picker.props.onChange([1, 3]); render();
  const footer = nodes(tree).find(node => node.type === 'OnboardingFooter');
  footer.props.onPress(); footer.props.onPress(); await tick(); await tick();
  assert.equal(requests.length, 1, 'double tap creates only one plan');
  assert.equal(requests[0].weekStart, '2026-10-12', 'preview starts on the displayed first day');
  const preferences = requests[0].preferences;
  assert.equal(preferences.cookingDays.join(','), '1,3');
  assert.equal(preferences.pantryIngredients.length, 0, 'old stored ingredients cannot constrain onboarding');
  assert.equal(preferences.pantryMode, 'priority');
  assert.equal(preferences.goal, 'gain_muscle'); assert.equal(preferences.diet, 'vegan');
  assert.equal(saved.pantryIngredients.length, 0); assert.equal(saved.pantryMode, 'priority');
  assert.equal(saved.cookingDays.join(','), '1,3');
  assert.equal(settings.pantryIngredients.join(','), 'Old fridge item', 'does not mutate the stored input');
  render(); nodes(tree).find(node => node.type === 'OnboardingFooter').props.onPress();
  assert.equal(routes.at(-1), '/onboarding/photoTrackingDemo', 'the completed week leads to optional photo tracking before the existing conversion journey');
  console.log('Onboarding planning passed: days only, shared picker, old pantry ignored, profile preserved and duplicate generation blocked.');
})().catch(error => { console.error(error); process.exitCode = 1; });
