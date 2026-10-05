const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const display = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services/planningDisplay.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: display.exports, Date, Intl });
const mod = { exports: {} };
const source = fs.readFileSync(path.join(__dirname, '../services/planningOrganization.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: mod.exports, Date, require: () => display.exports });
const { movePlanningMeal, planningPlacements } = mod.exports;
const meals = [
  { slotId: 'monday', dayIndex: 0, mealType: 'lunch', position: 0, status: 'ready', servings: 2, calories: 600, ingredients: [{ name: 'rice', quantity: '100g' }] },
  { slotId: 'wednesday', dayIndex: 2, mealType: 'lunch', position: 1, status: 'ready', servings: 3, calories: 800 },
];
const snapshot = JSON.stringify(meals);
const swapped = movePlanningMeal(meals, 'monday', { dayIndex: 2, mealType: 'lunch' }, '2026-12-28');
assert.equal(swapped.find(m => m.slotId === 'monday').scheduledDate, '2026-12-30');
assert.equal(swapped.find(m => m.slotId === 'wednesday').scheduledDate, '2026-12-28');
assert.equal(swapped.find(m => m.slotId === 'monday').servings, 2);
assert.equal(swapped.find(m => m.slotId === 'monday').ingredients, meals[0].ingredients);
assert.equal(swapped.reduce((sum, m) => sum + m.calories, 0), 1400);
const moved = movePlanningMeal(meals, 'monday', { dayIndex: 6, mealType: 'dinner' }, '2026-12-28');
assert.equal(moved.find(m => m.slotId === 'monday').scheduledDate, '2027-01-03');
assert.equal(moved.find(m => m.slotId === 'monday').mealType, 'dinner');
assert.equal(moved.find(m => m.slotId === 'wednesday').dayIndex, 2);
assert.equal(JSON.stringify(meals), snapshot, 'undo snapshot is never mutated');
for (const target of [{ dayIndex: 0, mealType: 'lunch' }, { dayIndex: -1, mealType: 'lunch' }, { dayIndex: 7, mealType: 'lunch' }, { dayIndex: 1, mealType: 'unknown' }]) assert.equal(movePlanningMeal(meals, 'monday', target, '2026-12-28'), meals);
assert.equal(movePlanningMeal(meals, 'missing', { dayIndex: 1, mealType: 'lunch' }, '2026-12-28'), meals);
const busy = meals.map(m => m.slotId === 'wednesday' ? { ...m, status: 'generating' } : m);
assert.equal(movePlanningMeal(busy, 'monday', { dayIndex: 2, mealType: 'lunch' }, '2026-12-28'), busy);
assert.equal(movePlanningMeal(busy, 'wednesday', { dayIndex: 1, mealType: 'lunch' }, '2026-12-28'), busy);
assert.equal(planningPlacements(swapped).length, meals.length);
console.log('Planning organization passed: swap, empty spot, portions, nutrition, undo snapshots, invalid destinations, generating meals and year boundary.');

const breakfasts = meals.map(meal => ({ ...meal, mealType: 'breakfast' }));
assert.notEqual(movePlanningMeal(breakfasts, 'monday', { dayIndex: 2, mealType: 'breakfast' }, '2026-12-28'), breakfasts);
for (const mealType of ['lunch', 'dinner']) assert.equal(movePlanningMeal(breakfasts, 'monday', { dayIndex: 2, mealType }, '2026-12-28'), breakfasts);
assert.equal(movePlanningMeal(meals, 'monday', { dayIndex: 2, mealType: 'breakfast' }, '2026-12-28'), meals);

assert.equal(movePlanningMeal(meals, "monday", { dayIndex: 2, mealType: "lunch" }, "2020-01-06"), meals);

assert.notEqual(movePlanningMeal(breakfasts, "monday", { dayIndex: 2, mealType: "snack" }, "2026-12-28"), breakfasts);
