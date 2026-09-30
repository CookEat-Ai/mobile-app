const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const source = fs.readFileSync(path.join(__dirname, '../constants/IngredientIcons.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject, require: (name) => require(path.join(__dirname, "../constants", name)) });
const { getIngredientIcon } = exportsObject;

// Real catalog labels and localized grocery labels, including compound-name collisions.
const cases = [
  ['Blanc de poulet', '🍗'], ['Œufs', '🥚'], ['Riz blanc cru', '🍚'],
  ['Tomates', '🍅'], ['Huile d’olive', '🫒'], ['Bœuf haché maigre', '🥩'],
  ['Pois chiches cuits', '🫘'], ['Haricots verts', '🫛'], ['Haricots blancs cuits', '🫘'],
  ['Pommes de terre', '🥔'], ['Pomme', '🍎'], ['Patates douces', '🍠'],
  ['Lait de coco', '🥥'], ['Beurre de cacahuètes', '🥜'], ['Bouillon de poulet', '🍲'],
  ['Courgettes', '🥒'], ['Épinards', '🥬'], ['Flocons d’avoine', '🥣'],
  ['Feta', '🧀'], ['Saumon fumé', '🐟'], ['Cumin moulu', '🧂'], ['Persil frais', '🌿'],
  ['Carottes, coupées comme des pommes de terre', '🥕'], ['Citron (jus et zeste)', '🍋'],
  ['Chicken breast', '🍗'], ['Eggs', '🥚'], ['Sweet potatoes', '🍠'],
  ['Coconut milk', '🥥'], ['Peanut butter', '🥜'], ['Cream cheese', '🧀'],
  ['Bell peppers', '🫑'], ['Black pepper', '🧂'], ['Green beans', '🫛'],
  ['Huevos', '🥚'], ['Zanahorias', '🥕'], ['Aceite de oliva', '🫒'], ['Salsa de tomate', '🍅'],
  ['Peito de frango', '🍗'], ['Ovos', '🥚'], ['Batata doce', '🍠'], ['Leite de coco', '🥥'],
  ['Hähnchenbrust', '🍗'], ['Eier', '🥚'], ['Süßkartoffeln', '🍠'], ['Kartoffeln', '🥔'],
  ['Knoblauch', '🧄'], ['Olivenöl', '🫒'], ['Kokosmilch', '🥥'], ['Frischkäse', '🧀'],
];
for (const [name, expected] of cases) {
  for (const placeholder of [undefined, null, '', ' ', '🍽️', '🍽', '🛒', '🍴']) {
    assert.equal(getIngredientIcon(name, placeholder), expected, `${name} / ${placeholder}`);
  }
}
// Keep existing specific artwork, and use a stable fallback instead of an endless skeleton.
assert.equal(getIngredientIcon('Poulet', ' 🍖 '), '🍖');
assert.equal(getIngredientIcon('Ingrédient inconnu', '🧄'), '🧄');
assert.equal(getIngredientIcon('Ingrédient inconnu', '🍽️'), '🥣');
assert.equal(getIngredientIcon('', undefined), '🥣');
assert.equal(getIngredientIcon('unmatched'), '🥣'); // Do not match 'ham' inside other words.
console.log(`Ingredient icons: ${cases.length} labels, placeholders, preserved icons and fallbacks passed.`);
