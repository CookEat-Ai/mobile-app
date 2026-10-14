/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
const jsx = (type, props, ...children) => ({ type, props: { ...props, children } });
function compile(file, dependencies, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports: module.exports, require: name => dependencies[name] || new Proxy({ __esModule: true }, { get: (o, key) => key in o ? o[key] : String(key) }), ...globals });
  return module.exports;
}
function harness() {
  const slots = []; let cursor = 0, focus, cleanup, tree, now = 1000000, version = 'old', gate = null, failPage = 0;
  const network = [];
  const cuisineGates = new Map();
  const storage = { getItem: async () => null, setItem: async () => undefined };
  const { ResponseCache, responseCachePolicy } = compile('services/responseCache.ts', {
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
  }, { Date: class extends Date { static now() { return now; } } });
  const cache = new ResponseCache();
  const react = { __esModule: true, createElement: jsx,
    memo: component => component,
    useRef: initial => { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useState: initial => { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useCallback: fn => fn, useMemo: fn => fn(), useEffect() {},
  }; react.default = react;
  const rn = { __esModule: true, StyleSheet: { create: s => s } };
  for (const name of ['ActivityIndicator', 'FlatList', 'Modal', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View']) rn[name] = name;
  const apiService = {
    getRecipeCatalog: options => cache.read(JSON.stringify(options), responseCachePolicy('/catalog/recipes'), async () => {
      network.push(options);
      if (gate) await gate;
      if (cuisineGates.has(options.cuisineId)) await cuisineGates.get(options.cuisineId);
      if (options.page === failPage) return { error: 'catalog unavailable', status: 422 };
      return { data: { success: true, total: 6, recipes: [0, 1].map(index => ({ id: `${options.cuisineId}:${options.mealType || 'all'}:${options.page}:${index}`, title: version })) } };
    }),
    getCatalogCuisines: async () => ({ data: { success: true, cuisines: ['italian', 'french', 'japanese'].map(id => ({ id, names: [{ language: 'fr', value: id }] })) } }),
  };
  const deps = {
    react, 'react-native': rn,
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    'expo-router': { useFocusEffect: cb => { focus = cb; }, router: { push() {} } },
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'fr' } }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../hooks/useResponsive': { useResponsive: () => ({ gutter: 20 }), contentColumn: () => ({}) },
    '../../hooks/useEntranceReplay': { useEntranceReplay: () => () => true },
    '../../services/haptics': { feedback: { selection() {} } },
    '../../constants/AppTheme': { AppTheme: {}, appStyles: {} },
    '../../constants/Colors': { Colors: { light: {} } },
    '../../services/api': { apiService },
    '../../services/fitnessProfile': { loadFitnessProfile: async () => ({ goal: 'balanced' }), fitnessProfileToPlanningPreferences: () => ({ diet: 'none', allergies: [] }), calculateFitnessProjection: () => ({ dailyCalories: 2000, dailyProteinGrams: 100 }) },
  };
  const screen = compile('app/(tabs)/meals.tsx', deps);
  const render = () => { cursor = 0; tree = screen.default(); return tree; };
  function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  function text(node) { if (node == null || typeof node === 'boolean') return ''; if (typeof node !== 'object') return String(node); if (Array.isArray(node)) return node.map(text).join(''); return text(node.props?.children); }
  const list = () => nodes(tree).find(node => node.type === 'FlatList');
  render();
  return {
    render, list, network, focus: () => { cleanup = focus(); }, blur: () => cleanup?.(),
    advance: ms => { now += ms; }, setVersion: value => { version = value; },
    failPage: value => { failPage = value; },
    retry: () => nodes(list().props.ListFooterComponent).find(node => node.type === 'TouchableOpacity').props.onPress(),
    hold: () => { let release; gate = new Promise(resolve => { release = resolve; }); return () => { gate = null; release(); }; },
    holdCuisine: id => { let release; cuisineGates.set(id, new Promise(resolve => { release = resolve; })); return () => { cuisineGates.delete(id); release(); }; },
    filter: value => nodes(list().props.ListHeaderComponent).find(node => node.type === 'TouchableOpacity' && text(node) === `mealLibrary.types.${value}`).props.onPress(),
    cuisine: value => nodes(tree).find(node => node.type === 'TouchableOpacity' && node.props.accessibilityRole === 'radio' && text(node) === value).props.onPress(),
  };
}
(async () => {
  const h = harness();
  h.focus(); await tick(); h.render();
  assert.equal(h.list().props.data.length, 2);
  assert.equal(h.network.length, 1);
  h.blur(); h.focus(); h.render();
  assert.equal(h.list().props.data.length, 2, 'tab return keeps visible cards while cache is read');
  await tick(); h.render();
  assert.equal(h.network.length, 1, 'fresh tab return does not fetch');
  h.list().props.onEndReached(); await tick(); h.render();
  assert.equal(h.list().props.data.length, 4);
  assert.equal(h.network.length, 2, 'only the newly reached page is fetched');
  h.blur(); h.focus(); h.render();
  assert.equal(h.list().props.data.length, 4, 'pagination stays visible on return');
  await tick(); h.render();
  assert.equal(h.list().props.data.length, 4, 'background cache read must retain all loaded pages');
  assert.equal(h.network.length, 2, 'all loaded fresh pages are reused');
  h.advance(300001); h.setVersion('new'); const release = h.hold();
  h.blur(); h.focus(); await tick(); h.render();
  assert.equal(h.network.length, 4, 'expired pages are revalidated through the actual cache');
  assert.equal(h.list().props.data.length, 4, 'slow revalidation cannot show an empty list');
  assert(h.list().props.data.every(recipe => recipe.title === 'old'));
  release(); await tick(); h.render();
  assert.equal(h.list().props.data.length, 4);
  assert(h.list().props.data.every(recipe => recipe.title === 'new'), 'refreshed pages replace old data together');
  h.advance(300001); h.setVersion('newer'); h.failPage(2);
  h.blur(); h.focus(); await tick(); h.render();
  assert(h.list().props.data.every(recipe => recipe.title === 'new'), 'a partial refresh must not mix new and old pages');
  h.failPage(0); h.retry(); await tick(); h.render();
  assert.equal(h.list().props.data.length, 4, 'refresh retry must not append an unrelated next page');
  assert(h.list().props.data.every(recipe => recipe.title === 'newer'));
  h.blur(); h.filter('main'); h.render(); h.focus(); await tick(); h.render();
  assert.equal(h.list().props.data.length, 2, 'changing filters starts at page one');
  assert(h.list().props.data.every(recipe => recipe.id.startsWith('all:main:1:')));
  assert.equal(h.network.length, 8, 'new filters have a separate cache key');

  // A slow cuisine must not empty the visible list or overwrite a later choice.
  const releaseItalian = h.holdCuisine('italian');
  h.blur(); h.cuisine('italian'); h.render(); h.focus(); await tick(); h.render();
  assert(h.list().props.data.every(recipe => recipe.id.startsWith('all:main:')), 'previous results stay mounted while the new cuisine loads');
  const row = h.list().props.renderItem({ item: h.list().props.data[0], index: 0 });
  assert.equal(row.props.disabled, true, 'previous results cannot be opened while the cuisine changes');
  h.blur(); h.cuisine('japanese'); h.render(); h.focus(); await tick(); h.render();
  assert(h.list().props.data.every(recipe => recipe.id.startsWith('japanese:main:1:')));
  releaseItalian(); await tick(); h.render();
  assert(h.list().props.data.every(recipe => recipe.id.startsWith('japanese:main:1:')), 'the slow, obsolete cuisine cannot replace the latest results');
  assert.equal(h.list().props.renderItem({ item: h.list().props.data[0], index: 0 }).props.disabled, false);

  h.list().props.onEndReached(); await tick(); h.render();
  const requestCount = h.network.length;
  h.cuisine('japanese'); h.filter('main'); h.render();
  h.list().props.onEndReached(); await tick(); h.render();
  assert.equal(h.network.length, requestCount + 1);
  assert.equal(h.network.at(-1).page, 3, 'tapping the active cuisine or filter keeps pagination intact');
  console.log('Meals cache passed: cache hits, preserved pagination, TTL revalidation, cuisine transitions with mounted/disabled cards, stale response protection and active-filter reselection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
