const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const meal = { slotId: 'dinner-2', dayIndex: 2, mealType: 'dinner', title: 'Poulet au riz', status: 'ready', recipeId: 'rice' };
const plan = { _id: 'week', weekStart: '2026-10-12', meals: [meal] };
function harness() {
  const state = [], alerts = [], routes = [], calls = [], changes = [];
  let cursor = 0, past = false, invalidations = 0, stopped = 0;
  const replacement = deferred(), deletion = deferred();
  const react = { __esModule: true, createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useRef: initial => { const i = cursor++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    useState: initial => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {},
  }; react.default = react;
  const rn = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'Pressable', 'ActivityIndicator'].map(name => [name, name]));
  Object.assign(rn, { StyleSheet: { create: s => s }, Alert: { alert: (...args) => alerts.push(args) } });
  const deps = { react, 'react-native': rn,
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'fr' } }) },
    'expo-router': { router: { push: route => routes.push(route) } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => 'owner' } },
    '../../hooks/useResponsive': {useResponsive: () => ({isTablet:false})},
    '../../hooks/usePlanningClock': { usePlanningClock: () => ({ now: new Date() }) },
    '../../services/planningDisplay': { initialPlanDay: () => 2, isPastPlanDay: () => past, isPastPlan: () => past,
      selectedPlanDays: () => [{ dayIndex: 2, date: new Date('2026-10-14T12:00:00Z') }], mealsForDay: () => plan.meals, planningDaySlots: () => [{ slotId: meal.slotId, meal }] },
    '../../services/planningUpdates': { invalidatePlanning: () => invalidations++ },
    '../../services/plannedMealNavigation': { readyPlannedRecipeId: () => meal.recipeId, plannedMealRecipeParams: (planId, slotId, recipeId) => ({ planId, slotId, recipeId }) },
    '../../services/api': { apiService: {
      replaceMeal: (...args) => { calls.push(['replace', ...args]); return replacement.promise; },
      deletePlannedMeal: (...args) => { calls.push(['delete', ...args]); return deletion.promise; },
    } },
    '../../services/analytics': { __esModule: true, default: { track: () => {} } },
    '../../services/haptics': { feedback: { light: () => {} } },
    '../../constants/AppTheme': require('./helpers/ui-theme.cjs'),
    '../../constants/Colors': { Colors: { light: {} } },
    '../../services/weeklyPlanning': { roundNutritionValue: value => value },
    './PlanningReveal': { AnimatedPlanningMeals: 'AnimatedPlanningMeals', usePlanningReveal: () => ({ stopReveal: () => stopped++ }) },
  };
  const load = file => { const mod = { exports: {} }; vm.runInNewContext(compile(file), { exports: mod.exports,
    require: name => deps[name] || new Proxy({}, { get: (_, key) => String(key) }), Date, Intl }); return mod.exports; };
  const week = load('components/planning/PlanWeekContent.tsx');
  const card = load('components/planning/PlanMealCard.tsx');
  const render = () => { cursor = 0; return week.PlanWeekContent({ plan, onPlanChange: updated => changes.push(updated) }); };
  const mealCard = () => { const animation = nodes(render()).find(node => node.type === 'AnimatedPlanningMeals'); return animation.props.renderMeal({ meal }).props; };
  return { alerts, routes, calls, changes, render, mealCard,
    button: key => alerts.at(-1)[2].find(button => button.text === key),
    card: props => nodes(card.PlanMealCard({ meal, ...props })).find(node => node.type === 'Pressable').props,
    setPast: () => { past = true; }, replacement, deletion,
    get invalidations() { return invalidations; }, get stopped() { return stopped; },
  };
}
(async () => {
  const choose = harness(); choose.mealCard().onLongPress();
  assert.equal(choose.alerts[0][1], meal.title, 'menu identifies the pressed meal');
  assert.equal(choose.alerts[0][2].map(item => item.text).join(','), 'planning.actions.replace,common.delete,common.cancel');
  assert.equal(choose.calls.length, 0); assert.equal(choose.routes.length, 0, 'long press does not open the recipe');
  assert.equal(choose.stopped, 1, 'opening options stops automatic day changes');
  choose.button('planning.actions.replace').onPress(); choose.button('recipeDetail.chooseReplacement').onPress();
  assert.equal(choose.routes[0].pathname, '/planning/choose-recipe');
  assert.equal(choose.routes[0].params.planId, plan._id); assert.equal(choose.routes[0].params.slotId, meal.slotId);

  const automatic = harness(); automatic.mealCard().onLongPress(); automatic.button('planning.actions.replace').onPress();
  const replace = automatic.button('recipeDetail.automaticReplacement').onPress; replace(); replace(); await tick();
  assert.deepEqual(automatic.calls, [['replace', 'week', 'dinner-2', 'owner']], 'duplicates send one request');
  assert(automatic.mealCard().loading && automatic.mealCard().disabled);
  const updated = { ...plan, meals: [{ ...meal, title: 'Nouveau repas' }] };
  automatic.replacement.resolve({ data: { plan: updated } }); await tick();
  assert.equal(automatic.changes[0], updated); assert.equal(automatic.invalidations, 1); assert(!automatic.mealCard().disabled);

  const failure = harness(); failure.mealCard().onLongPress(); failure.button('planning.actions.replace').onPress();
  failure.button('recipeDetail.automaticReplacement').onPress(); await tick(); failure.replacement.resolve({ error: 'offline' }); await tick();
  assert.equal(failure.changes.length, 0); assert.equal(failure.invalidations, 0, 'failed replacement preserves planning');
  assert(!failure.mealCard().disabled); assert(nodes(failure.render()).some(node => node.props.accessibilityRole === 'alert' && node.props.children.includes('offline')));

  const remove = harness(); remove.mealCard().onLongPress(); remove.button('common.delete').onPress();
  assert.equal(remove.alerts.at(-1)[0], 'planning.delete.title'); assert.equal(remove.calls.length, 0, 'deletion needs confirmation');
  const confirm = remove.button('common.delete').onPress; confirm(); confirm(); await tick();
  assert.deepEqual(remove.calls, [['delete', 'week', 'dinner-2', 'owner']]);
  const empty = { ...plan, meals: [] }; remove.deletion.resolve({ data: { plan: empty } }); await tick();
  assert.equal(remove.changes[0], empty); assert.equal(remove.invalidations, 1);

  const past = harness(); const pendingMenu = past.mealCard().onLongPress; past.setPast(); pendingMenu();
  assert.equal(past.alerts.length, 0); assert.equal(past.mealCard().onLongPress, undefined, 'past meals stay read-only');

  let opened = 0, options = 0;
  const accessible = choose.card({ onPress: () => opened++, onLongPress: () => options++ });
  accessible.onPress(); assert.equal(opened, 1);
  accessible.onAccessibilityAction({ nativeEvent: { actionName: 'longpress' } }); assert.equal(options, 1);
  accessible.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }); assert.equal(opened, 2);
  choose.card({ disabled: true, onPress: () => opened++, onLongPress: () => options++ }).onAccessibilityAction({ nativeEvent: { actionName: 'longpress' } });
  assert.equal(options, 1, 'disabled screen-reader actions cannot change a meal');
  console.log('Planning meal actions passed: menu, chosen/automatic replacements, duplicates, loading, offline recovery, confirmed deletion, past meals and accessibility.');
})().catch(error => { console.error(error); process.exitCode = 1; });
