const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../services/catalogDisplay.ts'), 'utf8');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: mod.exports });
const { catalogMealCardData } = mod.exports;
const recipe = {
  title: 'Risotto', image: 'risotto.jpg', ingredients: ['rice'],
  cooking_time: '25 min', mealTypes: ['lunch', 'dinner'],
  calories: '520 kcal', proteins: '38,5 g',
};
const card = catalogMealCardData(recipe, 'dinner');
assert.equal(card.calories, 520, 'card must receive a number without duplicated units');
assert.equal(card.proteins, 38.5, 'French decimal separator is supported');
assert.equal(card.mealType, 'dinner', 'use the selected meal filter for recipes with multiple meal types');
assert.equal(card.cookingTime, '25 min');
assert.equal(card.image, recipe.image);
assert.equal(card.ingredients, recipe.ingredients);
assert.equal(catalogMealCardData(recipe, 'breakfast').mealType, 'lunch');
assert.equal(catalogMealCardData({ ...recipe, mealTypes: [] }).mealType, 'lunch');
assert.equal(catalogMealCardData({ ...recipe, calories: '', proteins: 'n/a' }).calories, 0);
assert.equal(catalogMealCardData({ ...recipe, proteins: 'n/a' }).proteins, 0);
assert.equal(recipe.proteins, '38,5 g', 'display must not mutate the recipe');
console.log('Catalogue cards passed: nutrition units, decimal values, meal filters and missing values.');

assert.equal(card.catalogCategory,'main','catalogue cards show Main dishes, not a planning slot');
assert.equal(catalogMealCardData({...recipe,mealTypes:['dinner']},'main').catalogCategory,'main');
assert.equal(catalogMealCardData({...recipe,mealTypes:['breakfast']},'breakfast').catalogCategory,'breakfast');
assert.equal(catalogMealCardData({...recipe,mealTypes:['snack']}).catalogCategory,'snack');

const saved = catalogMealCardData({...recipe, mealTypes: undefined});
assert.equal(saved.calories, 520);
assert.equal(saved.proteins, 38.5);
assert.equal(saved.catalogCategory, 'main');
console.log('Favorites without catalogue meal types render valid meal cards.');
