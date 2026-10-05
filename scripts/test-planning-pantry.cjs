const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../services/planningPantry.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(code, { exports: exportsObject });
const { normalizePantryIngredients: normalize, pantryIngredientKey: key } = exportsObject;
assert.deepEqual(Array.from(normalize(['Tomates', 'Tomate', ' TOMATE ', 'tomates'])), ['Tomates']);
assert.equal(key('Épinards'), key('epinard'));
assert.equal(key('Pommes de terre'), key('Pomme de terre'));
assert.equal(key('haricots-verts'), key('haricot vert'));
assert.deepEqual(Array.from(normalize(['Tomates', 'Tomates cerises', 'Tomate cerise'])), ['Tomates', 'Tomates cerises']);
assert.deepEqual(Array.from(normalize(['Maïs', 'Pois', 'Couscous', 'Riz', 'Poisson'])), ['Maïs', 'Pois', 'Couscous', 'Riz', 'Poisson']);
assert.equal(key('Tomates'), key('Tomate')); // Category checkbox and removal use the same identity.
assert.deepEqual(Array.from(normalize(['', '  ', 'Poulet', 'Poulets'])), ['Poulet']);
console.log('Planning pantry duplicate regression checks passed');
