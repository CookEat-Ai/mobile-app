const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
const compile = file => ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const logic = {};
vm.runInNewContext(compile('services/catalogCuisineFilters.ts'), { exports: logic });
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children), ...nodes(node.props?.ListHeaderComponent), ...nodes(node.props?.action)];
}
function harness(file) {
  const slots = []; let cursor = 0, tree, loadEffect, cuisinesEffect;
  const queries = [];
  const react = { __esModule: true, createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), memo: value => value,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef: initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => {
      if (fn.toString().includes('void load()')) loadEffect = fn;
      else if (fn.toString().includes('getCatalogCuisines')) cuisinesEffect = fn;
    },
  }; react.default = react;
  const rn = { StyleSheet: { create: styles => styles } };
  for (const name of ['ActivityIndicator', 'FlatList', 'Modal', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View']) rn[name] = name;
  const deps = { react, 'react-native': rn,
    'expo-router': { useFocusEffect: fn => { loadEffect = fn; }, useLocalSearchParams: () => ({ planId: 'plan', slotId: 'slot' }) },
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'fr' } }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => 'owner' } },
    '../../constants/AppTheme': require('./helpers/ui-theme.cjs'),
    '../../components/ui/AppModal': { AppModal: 'Modal' },
    '../../constants/Colors': { Colors: { light: {} } },
    '../../hooks/useResponsive': { useResponsive: () => ({ gutter: 20, font: size => size }), contentColumn: () => ({}) },
    '../../hooks/useEntranceReplay': { useEntranceReplay: () => () => true },
    '../../services/haptics': { feedback: { light() {}, selection() {} } },
    '../../services/catalogCuisineFilters': logic,
    '../../services/planningDisplay': { isPastPlanDay: () => false },
    '../../services/fitnessProfile': { loadFitnessProfile: async () => ({ goal: 'balanced' }), fitnessProfileToPlanningPreferences: () => ({}), calculateFitnessProjection: () => ({}) },
    '../../services/api': { apiService: {
      getMealPlanById: async () => ({ data: { plan: { weekStart: '2099-01-05', meals: [{ slotId: 'slot', mealType: 'lunch', dayIndex: 0 }] } } }),
      getCatalogCuisines: async () => ({ data: { cuisines: ['italian', 'french'].map(id => ({ id, names: [{ language: 'fr', value: id }] })) } }),
      getRecipeCatalog: async options => { queries.push(options); return { data: { total: 300, recipes: [{ id: 'meal', replacementMealTypes: ['lunch'] }] } }; },
    } },
  };
  const mod = { exports: {} };
  vm.runInNewContext(compile(file), { exports: mod.exports, require: name => deps[name] || new Proxy({}, { get: (_, key) => String(key) }) });
  const render = () => { cursor = 0; tree = mod.exports.default(); };
  const all = () => nodes(tree);
  const button = () => all().find(node => node.props?.accessibilityLabel === 'dailyApp.filters');
  const row = id => all().find(node => node.props?.key === id && node.props?.accessibilityRole === 'checkbox');
  const list = () => all().find(node => node.type === 'FlatList');
  const modal = () => all().find(node => node.type === 'Modal');
  const load = async () => { render(); loadEffect(); await tick(); render(); };
  render();
  return { queries, render, button, row, list, modal, load,
    init: async () => { cuisinesEffect?.(); await load(); },
    chip: id => all().find(node => node.props?.key === id && node.props?.accessibilityRole === 'button'),
  };
}
(async () => {
  for (const file of ['app/(tabs)/meals.tsx', 'app/planning/choose-recipe.tsx']) {
    const h = harness(file); await h.init();
    assert.equal(h.queries.at(-1).cuisineId, 'all');
    assert.equal(h.row('all').props.accessibilityState.checked, true);
    h.button().props.onPress(); h.render(); assert.equal(h.modal().props.visible, true);
    h.row('italian').props.onPress(); h.render(); h.row('french').props.onPress(); await h.load();
    assert.equal(h.modal().props.visible, true, 'selecting cuisines keeps the sheet open');
    assert(h.row('italian').props.accessibilityState.checked && h.row('french').props.accessibilityState.checked);
    assert.equal(h.row('all').props.accessibilityState.checked, false);
    assert.equal(h.queries.at(-1).cuisineId, 'french,italian', 'the request includes both cuisines');
    assert.equal(h.button().props.accessibilityState.selected, true);
    const activeIcon = nodes(h.button()).find(node => node.props?.name === 'options-outline');
    assert.equal(activeIcon.props.color, '#FFFFFF', 'active filter icon is white');
    h.list().props.onEndReached(); await tick(); h.render();
    assert.equal(h.queries.at(-1).page, 2); assert.equal(h.queries.at(-1).cuisineId, 'french,italian');
    h.chip('italian').props.onPress(); await h.load();
    assert.equal(h.queries.at(-1).cuisineId, 'french'); assert.equal(h.queries.at(-1).page, 1);
    assert.equal(h.row('italian').props.accessibilityState.checked, false);
    h.row('all').props.onPress(); await h.load();
    assert.equal(h.queries.at(-1).cuisineId, 'all'); assert.equal(h.row('all').props.accessibilityState.checked, true);
    assert.equal(h.button().props.accessibilityState.selected, false);
    assert.equal(nodes(h.button()).find(node => node.props?.name === 'options-outline').props.color, '#081A10');
    h.row('french').props.onPress(); await h.load(); h.row('french').props.onPress(); await h.load();
    assert.equal(h.queries.at(-1).cuisineId, 'all', 'deselecting the last cuisine restores all cuisines');
  }
  console.log('Cuisine filters passed on Meals and Choose meals: multi-selection, open sheet, white icon, combined queries, pagination, individual removal and reset.');
})().catch(error => { console.error(error); process.exitCode = 1; });
