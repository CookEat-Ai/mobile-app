const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
let pathname = '/', cursor = 0;
const refs = [];
const loaded = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../hooks/useEntranceReplay.ts'), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {
  exports: loaded,
  require: name => name === 'expo-router' ? {usePathname: () => pathname} : {
    useRef: initial => {const index = cursor++; return refs[index] ??= {current: initial};}, useCallback: fn => fn,
  },
});
function render(path) {pathname = path; cursor = 0; return loaded.useEntranceReplay();}
assert.equal(render('/')(), true);
render('/recipe-detail'); render('/recipe-detail');
assert.equal(render('/')(), false, 'recipe back does not replay');
render('/goal'); assert.equal(render('/')(), true, 'new tab opening still animates');
render('/recipe-detail'); render('/goal');
assert.equal(render('/')(), false);
assert.equal(render('/')(), true, 'suppression is consumed once');
console.log('Entrance replay: recipe returns are suppressed; ordinary openings preserved.');

for (const child of ['/planning/abc/shopping', '/planning/configure', '/planning/loading']) {
  render(child);
  assert.equal(render('/')(), false, `${child} return preserves planning`);
  assert.equal(render('/')(), true, 'a later ordinary opening is retained');
}
