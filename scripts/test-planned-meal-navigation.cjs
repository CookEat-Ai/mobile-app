const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const timeRules = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services/planning-time.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: timeRules.exports, Date, Intl });
const file = path.resolve(__dirname, '../services/plannedMealNavigation.ts');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject, require: name => { const e = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../services', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: e }); return e; } }, { filename: file });
const { plannedMealRecipeParams, isPlannedMealContext, readyPlannedRecipeId } = exportsObject;
for (const source of ['meal_plan', 'onboarding_week_preview']) {
  const params = plannedMealRecipeParams('plan-a', 'slot-b', 'recipe-c', source);
  assert(isPlannedMealContext(params));
  assert.equal(params.mealPlanId, 'plan-a');
  assert.equal(params.mealSlotId, 'slot-b');
  assert.equal(params.source, source);
  assert.equal(params.recipeId, 'recipe-c');
  const next = plannedMealRecipeParams(params.mealPlanId, params.mealSlotId, 'recipe-d', params.source);
  assert(isPlannedMealContext(next));
  assert.equal(next.source, source, 'replacement retains onboarding context');
  assert(!isPlannedMealContext({ ...params, mealSlotId: undefined }));
  assert(!isPlannedMealContext({ ...params, mealPlanId: '' }));
}
assert(!isPlannedMealContext({ source: 'meal_library', mealPlanId: 'p', mealSlotId: 's' }));
const plan = { meals: [{ slotId: 'a', status: 'ready', recipeId: 'unchanged' }, { slotId: 'b', status: 'ready', catalogRecipeId: 'replacement' }] };
assert.equal(readyPlannedRecipeId(plan, 'b'), 'replacement');
assert.equal(readyPlannedRecipeId(plan, 'missing'), null);
assert.equal(readyPlannedRecipeId({ meals: [{ slotId: 'b', status: 'generating', recipeId: 'pending' }] }, 'b'), null);
console.log('Planned meal navigation passed: preview/main route identity, replacement context and ready recipe selection.');

const { applyPlannedMealPortion } = exportsObject;
const baseRecipe = { id: 'scaled', calories: '600 kcal', proteins: '30 g', ingredients: [{ name: 'Riz', quantity: '100 g' }] };
const scaledPlan = { meals: [{ slotId: 'scaled-slot', status: 'ready', source: 'catalog', recipeId: 'scaled',
  calories: 900, proteins: 45, fats: 15, carbs: 90, portionScale: 1.5, ingredients: [{ name: 'Riz', quantity: '150 g' }] }] };
const displayed = applyPlannedMealPortion(baseRecipe, scaledPlan, 'scaled-slot');
assert.equal(displayed.calories, '900 kcal');
assert.equal(displayed.proteins, '45 g');
assert.equal(displayed.ingredients[0].quantity, '150 g');
assert.equal(displayed.servings, 1, 'a larger individual portion is not a larger household');
assert.equal(baseRecipe.ingredients[0].quantity, '100 g', 'catalogue recipe unchanged');
assert.equal(applyPlannedMealPortion(displayed, scaledPlan, 'scaled-slot').ingredients[0].quantity, '150 g', 'no double scaling');
assert.throws(() => applyPlannedMealPortion(baseRecipe, scaledPlan, 'missing'));
console.log('Adjusted recipe display matches saved plan quantities and nutrients.');

const displayFile = path.resolve(__dirname, '../services/planningDisplay.ts');
const displayExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(displayFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: displayExports, require: () => timeRules.exports }, { filename: displayFile });
const { initialPlanDay } = displayExports;
const week = { _id: 'week-a', weekStart: '2026-09-28', preferences: { cookingDays: [0, 1, 2, 3, 4, 5, 6] },
  meals: Array.from({ length: 7 }, (_, dayIndex) => ({ slotId: `slot-${dayIndex}`, dayIndex })) };
for (let day = 0; day < 7; day++) {
  const route = exportsObject.replacedMealPlanningRoute(week, `slot-${day}`);
  assert.equal(route.pathname, '/(tabs)', 'replacement returns to the Planning tab');
  assert.equal(route.params.selectedPlanId, week._id);
  assert.equal(route.params.selectedDay, String(day));
  assert(route.params.selectionKey, 'a new navigation selection resets the already mounted day picker');
  assert.equal(initialPlanDay(week, '2026-09-30', Number(route.params.selectedDay)), day,
    'the replaced day wins over today, including Monday (zero) and Sunday');
}
assert.equal(initialPlanDay(week, '2026-09-30'), 2, 'ordinary visits still select today');
for (const invalid of [NaN, -1, 7, 1.5]) assert.equal(initialPlanDay(week, '2026-09-30', invalid), 2);
const partial = { ...week, preferences: { cookingDays: [1, 4] }, meals: week.meals.filter(meal => [1, 4].includes(meal.dayIndex)) };
assert.equal(initialPlanDay(partial, '2026-09-30', 0), 1, 'unavailable days fall back to a planned day');
assert.throws(() => exportsObject.replacedMealPlanningRoute(week, 'missing'));
console.log('Replacement return passed: Planning tab, all seven selected days and invalid-day fallbacks.');

const familyPlan = { meals: [{ ...scaledPlan.meals[0], servings: 3 }] };
const family = applyPlannedMealPortion(baseRecipe, familyPlan, 'scaled-slot');
assert.equal(family.servings, 3);
assert.equal(family.ingredients[0].quantity, '450 g');
assert.equal(family.calories, '900 kcal', 'nutrition remains per person');
assert.equal(applyPlannedMealPortion(family, familyPlan, 'scaled-slot').ingredients[0].quantity, '450 g');
console.log('Household quantities scale without compounding or changing per-person nutrition.');

const emptyPlan = { weekStart: '2026-10-05', preferences: { cookingDays: [0, 1, 2] }, meals: [{ slotId: 'lunch', dayIndex: 1, mealType: 'lunch', position: 0 }] };
const slots = displayExports.compatiblePlanningSlots(emptyPlan, ['lunch', 'dinner'], '2026-10-06');
assert.equal(slots.length, 4);
assert(slots.some(slot => slot.dayIndex === 1 && slot.mealType === 'dinner' && !slot.meal));
assert(slots.some(slot => slot.dayIndex === 2 && !slot.meal));
assert(!slots.some(slot => slot.dayIndex === 0 || slot.mealType === 'snack'));
console.log('Empty compatible slots include configured days and exclude past days.');

const servingsExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../services/recipeServings.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {exports: servingsExports});
const library = { servings: 1, ingredients: [{quantity:'1/2 kg'}, {quantity:'1,5 c. à soupe'}], steps: [{description:'Cuire 1/2 kg pendant 10 minutes à 180 degrés.'}] };
const temporary = servingsExports.recipeForServings(library, 3);
assert.equal(temporary.ingredients[0].quantity, '1.5 kg');
assert.equal(temporary.ingredients[1].quantity, '4,5 c. à soupe');
assert(temporary.steps[0].description.includes('10 minutes à 180 degrés'));
assert.equal(library.ingredients[0].quantity, '1/2 kg', 'library source is never changed');
assert.equal(servingsExports.recipeForServings(library, 1).servings, 1, 'reopening defaults to one');
console.log('Temporary library servings preserve source recipes, fractions and cooking times.');

// Exercise the real chooser handler and Expo's installed stack reducer.
// This catches returns to Planning, duplicate detail screens and stale recipe params.
const { StackRouter } = require('../node_modules/expo-router/build/react-navigation/routers/StackRouter');
function findNode(file, predicate) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) { if (predicate(node, source)) found = node; ts.forEachChild(node, visit); }
  visit(source); assert(found, `handler missing in ${file}`);
  return found.initializer.getText(source);
}
const openChooser = findNode('app/recipe-detail.tsx', (node, source) => ts.isPropertyAssignment(node)
  && node.name.getText(source) === 'onPress' && node.initializer.getText(source).includes("pathname: '/planning/choose-recipe'"));
const previewRecipe = findNode('app/planning/choose-recipe.tsx', node => ts.isVariableDeclaration(node) && node.name.getText() === 'choose');
const selectRecipe = findNode('app/recipe-detail.tsx', node => ts.isVariableDeclaration(node) && node.name.getText() === 'handleChoosePlannedMeal');
const evaluate = (code, context) => vm.runInNewContext(ts.transpileModule(`globalThis.handler = ${code};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText, context);
const replacementPlan = { _id: 'plan-a', meals: [{ slotId: 'slot-b', dayIndex: 3, mealType: 'dinner', status: 'ready', recipeId: 'recipe-new' }] };
async function checkManualReturn(fromDetail, preview = false, fail = false, emptySlot = false) {
  let params = { planId: 'plan-a', slotId: 'slot-b' };
  if (fromDetail) {
    const opener = { mealPlanId: 'plan-a', mealSlotId: 'slot-b', isWeeklyPlanPreview: preview,
      router: { push: route => { assert.equal(route.pathname, '/planning/choose-recipe'); params = route.params; } } };
    evaluate(openChooser, opener); opener.handler();
    assert.equal(params.returnTo, 'recipe-detail', 'detail explicitly identifies its return destination');
  }
  if (emptySlot) params = { ...params, slotId: undefined, dayIndex: '3', mealType: 'dinner' };
  const options = { routeNames: ['(tabs)', 'recipe-detail', 'planning/choose-recipe', 'planning/recipe-preview'], routeParamList: {}, routeGetIdList: {} };
  const stack = StackRouter({ initialRouteName: '(tabs)' });
  const oldParams = plannedMealRecipeParams('plan-a', 'slot-b', 'recipe-old', preview ? 'onboarding_week_preview' : 'meal_plan');
  let state = { ...stack.getInitialState(options), index: fromDetail ? 2 : 1, routes: [
    { name: '(tabs)', key: 'planning' },
    ...(fromDetail ? [{ name: 'recipe-detail', key: 'original-detail', params: oldParams }] : []),
    { name: 'planning/choose-recipe', key: 'chooser', params },
  ] };
  let navigations = 0, invalidations = 0, error = '', busy = false, requests = 0, previewRoute;
  const previewContext = { ...params, selecting: { current: false }, setChoosing() {}, feedback: { light() {} },
    plannedMealChoicePreviewRoute: exportsObject.plannedMealChoicePreviewRoute,
    router: { push: route => {
      previewRoute = route;
      state = stack.getStateForAction(state, { type: 'PUSH', payload: { name: route.pathname.slice(1), params: route.params } }, options);
    } },
  };
  previewContext.slotId ??= undefined; previewContext.dayIndex ??= undefined; previewContext.mealType ??= undefined;
  previewContext.returnTo ??= undefined; previewContext.source ??= undefined;
  evaluate(previewRecipe, previewContext); previewContext.handler('recipe-new');
  assert.equal(previewRoute.pathname, '/planning/recipe-preview');
  assert.equal(previewRoute.params.source, 'meal_library', 'preview loads the candidate from the catalogue');
  assert.equal(previewRoute.params.selectForPlan, 'true');
  assert.equal(previewRoute.params.recipeId, 'recipe-new');
  assert(!isPlannedMealContext(previewRoute.params), 'an unconfirmed candidate does not receive the old meal’s portions');
  assert.equal(requests, 0, 'opening the detail does not modify the plan');
  const canceled = stack.getStateForAction(state, { type: 'GO_BACK' }, options);
  assert.equal(canceled.routes.at(-1).key, 'chooser', 'Back from preview returns to the unchanged chooser');
  const previewKey = state.routes.at(-1).key;
  const request = async (planId, slotId, userId, recipeId) => {
    requests++;
    assert.equal(planId, 'plan-a'); assert.equal(slotId, 'slot-b'); assert.equal(userId, 'owner'); assert.equal(recipeId, 'recipe-new');
    return fail ? { error: 'offline' } : { data: { plan: replacementPlan } };
  };
  const context = { params: previewRoute.params, selectionPlanId: previewRoute.params.selectionPlanId, selectionSlotId: previewRoute.params.selectionSlotId || null,
    isMealSelectionPreview: true, choosingMealRef: { current: false }, loadingRecipe: false, recipeLoadError: null,
    recipe: { id: 'recipe-new' }, setIsChoosingMeal: value => { busy = value; }, feedback: { confirm() {} },
    Alert: { alert: (_, message) => { error = message; } }, t: key => key,
    AsyncStorage: { getItem: async () => 'owner' }, apiService: { setPlannedMealRecipe: request,
      addPlannedMeal: async (planId, userId, dayIndex, mealType, recipeId) => {
        assert.equal(dayIndex, 3); assert.equal(mealType, 'dinner'); return request(planId, 'slot-b', userId, recipeId);
      } },
    invalidatePlanning: () => invalidations++, replacedMealPlanningRoute: exportsObject.replacedMealPlanningRoute,
    router: { dismissTo: route => {
      navigations++;
      state = stack.getStateForAction(state, { type: 'POP_TO', payload: { name: route.pathname.slice(1), params: route.params } }, options);
    } },
  };
  evaluate(selectRecipe, context);
  context.loadingRecipe = true; await context.handler(); assert.equal(requests, 0, 'confirmation is blocked until the recipe has loaded');
  context.loadingRecipe = false;
  const saving = context.handler(); await context.handler(); await saving;
  assert.equal(requests, 1, 'duplicate confirmations send one write');
  assert.equal(busy, false); assert.equal(context.choosingMealRef.current, false);
  if (fail) {
    assert.equal(navigations, 0); assert.equal(invalidations, 0); assert.equal(error, 'offline');
    assert.equal(state.routes.at(-1).key, previewKey, 'a failed save keeps the preview open for retry'); return;
  }
  assert.equal(navigations, 1); assert.equal(invalidations, 1);
  assert.equal(state.routes.length, 1, 'confirmation dismisses the preview, chooser and previous detail');
  assert.equal(state.routes[0].key, 'planning', 'confirmation returns directly to Planning from every entry point');
  assert.equal(state.routes[0].params.selectedPlanId, replacementPlan._id);
  assert.equal(state.routes[0].params.selectedDay, '3', 'Planning shows the day of the chosen meal');
  assert(state.routes[0].params.selectionKey, 'Planning receives a fresh selection to reset its mounted day picker');
}
(async () => {
  await checkManualReturn(true);
  await checkManualReturn(true, true);
  await checkManualReturn(false);
  await checkManualReturn(false, false, false, true);
  await checkManualReturn(true, false, true);
  for (const locale of ['fr', 'en', 'de', 'es-ES', 'es-MX', 'pt-BR']) {
    const strings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', `${locale}.json`), 'utf8'));
    assert(strings.recipeDetail.chooseThisMeal && strings.recipeDetail.choosingMeal);
  }
  console.log('Manual meal preview passed: no write before confirmation, catalogue detail, Back to chooser, duplicate/loading guards, direct Planning return on the selected day, empty slots, errors and translated CTA.');
})().catch(error => { console.error(error); process.exitCode = 1; });
