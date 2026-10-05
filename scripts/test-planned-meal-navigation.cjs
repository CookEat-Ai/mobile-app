const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
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
}).outputText, { exports: displayExports }, { filename: displayFile });
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
