const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: false } }).outputText, { exports, require: name => dependencies[name] });
  return exports;
}
const pantry = load('services/planningPantry.ts');
const { groupPantryIngredients } = load('services/pantryCategories.ts', { './planningPantry': pantry });
const categories = [
  { id: 'vegetables', title: 'Légumes', icon: '', ingredients: [{ name: 'Tomate' }] },
  { id: 'dairy', title: 'Produits laitiers', icon: '', ingredients: [{ name: 'Yaourt' }] },
  { id: 'plant', title: 'Alternatives', icon: '', ingredients: [{ name: 'Yaourt soja' }] },
];
const names = ['Tomates', 'Yaourt soja nature', 'Yaourt grec', 'Produit inconnu'];
const groups = groupPantryIngredients(names, categories, 'Autres');
assert.deepEqual(Array.from(groups, group => group.id), ['vegetables', 'dairy', 'plant', 'other']);
assert.equal(groups.find(group => group.id === 'plant').names[0], 'Yaourt soja nature');
assert.equal(groups.find(group => group.id === 'dairy').names[0], 'Yaourt grec');
assert.deepEqual(Array.from(groups.flatMap(group => group.names)).sort(), [...names].sort());
assert.equal(groupPantryIngredients([], categories, 'Autres').length, 0);
const assigned = groupPantryIngredients(['Produit maison'], categories, 'Autres', { 'produit maison': 'dairy' });
assert.equal(assigned[0].id, 'dairy');
assert.equal(assigned[0].names[0], 'Produit maison');
const stale = groupPantryIngredients(['Produit maison'], categories, 'Autres', { 'produit maison': 'deleted-category' });
assert.equal(stale[0].id, 'other');
console.log('Pantry category grouping checks passed');
