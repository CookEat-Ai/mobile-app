const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual screen effect with controlled responses and clocks.
const file = path.resolve(__dirname, '../app/recipe-detail.tsx');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let loadEffect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect'
      && node.arguments[0].getText(source).includes('apiService.getRecipeById(recipeIdParam)')) loadEffect = node;
  ts.forEachChild(node, visit);
}
visit(source);
assert(loadEffect, 'recipe detail load effect must exist');
assert(loadEffect.arguments[1].getText(source).includes('recipeLoadAttempt'), 'retry reruns the load');
const compiled = ts.transpileModule(`globalThis.load = ${loadEffect.arguments[0].getText(source)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
const recipe = { id: 'meal-a', title: 'Repas', servings: 1, image: 'meal.jpg', steps: [{ title: 'Cuire' }], ingredients: [] };
function scenario({ library = true, streaming = false, planned = false } = {}) {
  const states = {};
  const calls = [];
  const timers = new Map();
  let request, nextTimer = 0;
  const api = method => id => {
    calls.push([method, id]);
    return new Promise((resolve, reject) => { request = { resolve, reject }; });
  };
  const context = {
    Error, console: { error() {} },
    recipeIdParam: 'meal-a', isStreaming: streaming, isMealLibrary: library,
    isPlannedMeal: planned, mealPlanId: 'plan-a', mealSlotId: 'slot-a',
    t: key => key,
    apiService: { getCatalogRecipe: api('catalog'), getRecipeById: api('detail'),
      getMealPlanById: async () => ({ error: 'plan unavailable' }) },
    AsyncStorage: { getItem: async () => 'user' },
    recipeForServings: (value, servings) => ({ ...value, servings }),
    applyPlannedMealPortion: value => value, isPastPlanDay: () => false,
    servingsBaseRef: { current: null }, savedRecipeIdRef: { current: null },
    setTimeout: (callback, ms) => { assert.equal(ms, 30000); const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
  };
  for (const name of ['RecipeLoadError', 'LoadingRecipe', 'LoadingSteps', 'LoadingImage', 'Recipe', 'PlannedDayEditable']) {
    context[`set${name}`] = value => { states[name] = value; };
  }
  vm.createContext(context);
  vm.runInContext(compiled, context);
  return { context, states, calls, timers, start: () => context.load(), request: () => request };
}

(async () => {
  for (const response of [{ error: 'offline' }, { error: 'not found', status: 404 }, {}, { data: { recipe: {} } }]) {
    const test = scenario();
    test.start();
    test.request().resolve(response);
    await flush();
    assert.equal(test.states.RecipeLoadError, response.error || 'common.requestError');
    for (const flag of ['LoadingRecipe', 'LoadingSteps', 'LoadingImage']) assert.equal(test.states[flag], false);
    assert.equal(test.timers.size, 0);
    test.start();
    assert.equal(test.states.RecipeLoadError, null, 'retry clears the error');
    assert.equal(test.states.LoadingRecipe, true);
    test.request().resolve({ data: { recipe } });
    await flush();
    assert.equal(test.states.Recipe.title, recipe.title, 'retry displays the recipe');
    assert.equal(test.states.LoadingRecipe, false);
    assert.equal(test.states.LoadingSteps, false);
    assert.deepEqual(test.calls, [['catalog', 'meal-a'], ['catalog', 'meal-a']]);
  }
  const thrown = scenario();
  thrown.start(); thrown.request().reject(new Error('network failed')); await flush();
  assert.equal(thrown.states.RecipeLoadError, 'network failed');
  const pending = scenario();
  pending.start();
  [...pending.timers.values()][0]();
  assert.equal(pending.states.RecipeLoadError, 'common.networkError', 'a hung request cannot leave endless skeletons');
  assert.equal(pending.states.LoadingSteps, false);
  pending.request().resolve({ data: { recipe } }); await flush();
  assert.equal(pending.states.Recipe, undefined, 'late success after timeout cannot overwrite error');
  const disposed = scenario();
  const cleanup = disposed.start(); cleanup();
  disposed.request().resolve({ data: { recipe } }); await flush();
  assert.equal(disposed.states.Recipe, undefined, 'obsolete response cannot update another screen');
  assert.equal(disposed.timers.size, 0);
  const favorite = scenario({ library: false });
  favorite.start(); favorite.request().resolve({ data: { recipe } }); await flush();
  assert.deepEqual(favorite.calls, [['detail', 'meal-a']], 'favorites keep the detail endpoint');
  const incomplete = scenario();
  incomplete.start(); incomplete.request().resolve({ data: { recipe: { ...recipe, steps: [] } } }); await flush();
  assert.equal(incomplete.states.LoadingSteps, false, 'missing steps do not look perpetually pending');
  const portions = scenario({ library: false, planned: true });
  portions.start(); portions.request().resolve({ data: { recipe } }); await flush();
  assert.equal(portions.states.RecipeLoadError, 'plan unavailable');
  assert.equal(portions.states.LoadingRecipe, false);
  const stream = scenario({ streaming: true });
  stream.start(); assert.equal(stream.calls.length, 0, 'streaming keeps its existing generation path');
  console.log('Recipe detail loading passed: API errors, empty data, rejected requests, retries, catalog/favorites routes, timeout, stale responses, planned portions and streaming guard.');
})().catch(error => { console.error(error); process.exitCode = 1; });
