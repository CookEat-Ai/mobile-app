const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const jsx = (type, props, ...children) => ({ type, props: { ...props, children } });
const current = { _id: 'current', weekStart: '2026-10-12', weekEnd: '2026-10-18', preferences: {cookingDays:[0,1]}, meals: [] };
const older = { _id: 'older', weekStart: '2026-10-05', meals: [] };
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const tick = () => new Promise(resolve => setImmediate(resolve));
const timeRules={exports:{}},displayRules={exports:{}};
const compileRules=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compileRules('services/planning-time.ts'),{exports:timeRules.exports,Date,Intl});
vm.runInNewContext(compileRules('services/planningDisplay.ts'),{exports:displayRules.exports,Date,Intl,require:()=>timeRules.exports});
function harness(demo = true) {
  let today = '2026-10-13';
  const slots = []; let cursor = 0, focus, alert, tree, revision = 0, load = async () => ({ data: { plans: [current, older] } });
  const deletion = deferred(); let deleteCalls = 0, navigation = 0, cleanup = 0;
  const react = { __esModule: true, createElement: jsx, Fragment: 'Fragment',
    useRef: value => { const index = cursor++; if (!(index in slots)) slots[index] = { current: value }; return slots[index]; },
    useState: value => { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useCallback: fn => fn, useMemo: fn => fn(), useEffect: () => {},
  }; react.default = react;
  const rn = { __esModule: true, ActivityIndicator: 'ActivityIndicator', Alert: { alert: (...args) => { alert = args; } }, Modal: 'Modal', RefreshControl: 'RefreshControl', ScrollView: 'ScrollView', StyleSheet: { create: s => s }, Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View' };
  const deps = {
    react, 'react-native': rn, '@react-native-async-storage/async-storage': { default: { getItem: async () => 'owner' }, __esModule: true },
    'expo-router': { router: { push: () => { navigation++; } }, useFocusEffect: cb => { focus = cb; }, useLocalSearchParams: () => ({}) },
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'fr', resolvedLanguage: 'fr' } }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../hooks/usePlanningClock': {usePlanningClock:()=>({today})},
    '../../hooks/useResponsive': { useResponsive: () => ({ gutter: 20 }), contentColumn: () => ({}) },
    '../../hooks/useEntranceReplay': { useEntranceReplay: () => () => true },
    '../../services/presentationMode': { usePresentationMode: () => demo },
    '../../services/planningUpdates': { planningRevision: () => revision, invalidatePlanning: () => { revision++; } },
    '../../services/planningDeletion': { clearDeletedPlanReferences: async () => { cleanup++; } },
    '../../services/weeklyPlanning': { planningStartKey: () => current.weekStart },
    '../../services/planningDisplay': {...displayRules.exports,displayedPlan:(plans,day=today)=>displayRules.exports.displayedPlan(plans,day)},
    '../../services/api': { apiService: { listMealPlans: () => load(), getMealPlanById: async () => ({ data: { plan: current } }), deleteMealPlan: () => { deleteCalls++; return deletion.promise; } } },
    '../../constants/AppTheme': require('./helpers/ui-theme.cjs'),
    '../../components/planning/PlanningStyles': { planningStyles: {} },
  };
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/(tabs)/index.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports: mod.exports, require: name => deps[name] || new Proxy({ __esModule: true }, { get: (o, key) => key in o ? o[key] : String(key) }) });
  const render = () => { cursor = 0; tree = mod.exports.default(); return tree; };
  function nodes(node) { if (node == null || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  function text(node) { if (node == null) return ''; if (typeof node !== 'object') return String(node); if (Array.isArray(node)) return node.map(text).join(''); return text(node.props?.children); }
  const button = key => nodes(tree).find(n => n.type === 'TouchableOpacity' && text(n).includes(key));
  render();
  return { render, button, setDay: value => {today=value;}, focus: () => focus(), deleteResult: deletion.resolve, confirm: () => alert[2].find(item => item.style === 'destructive').onPress(), setLoad: fn => { load = fn; },
    get calls() { return deleteCalls; }, get cleanup() { return cleanup; }, get navigation() { return navigation; }, get planIds() { return slots.find(value => Array.isArray(value) && value.some(v => v?._id))?.map(v => v._id) || []; } };
}
(async () => {
  const normal = harness(false); normal.focus(); await tick(); normal.render();
  assert.equal(normal.button('planningFlow.deleteAction'), undefined, 'delete action stays exclusive to presentation mode');
  const failed = harness(); failed.focus(); await tick(); failed.render();
  failed.button('planningFlow.deleteAction').props.onPress(); assert.equal(failed.calls, 0, 'confirmation is required before request');
  failed.confirm(); failed.confirm(); await tick(); assert.equal(failed.calls, 1, 'double confirmation sends one request');
  failed.deleteResult({ error: 'offline' }); await tick(); failed.render();
  assert.equal(failed.planIds.join(','), 'current,older', 'error retains planning and history'); assert.equal(failed.cleanup, 0);
  const success = harness(); success.focus(); await tick(); success.render();
  const stale = deferred(); success.setLoad(() => stale.promise); success.focus();
  success.button('planningFlow.deleteAction').props.onPress(); success.confirm(); await tick();
  success.deleteResult({ data: { success: true } }); await tick(); success.render();
  assert.equal(success.planIds.join(','), 'older', 'only selected current plan disappears');
  assert(success.button('dailyApp.createWeek'), 'returns to empty Create my week screen');
  assert.equal(success.cleanup, 1); assert.equal(success.navigation, 0, 'deletion must not trigger generation');
  stale.resolve({ data: { plans: [current, older] } }); await tick(); success.render();
  assert.equal(success.planIds.join(','), 'older', 'stale background load cannot resurrect deleted planning');
  const rollover=harness(false);rollover.focus();await tick();rollover.render();
  assert.equal(rollover.button('dailyApp.createWeek'),undefined,'last configured day is still active');
  rollover.setDay('2026-10-14');rollover.render();assert(rollover.button('dailyApp.createWeek'),'next local day immediately enables creation despite the legacy seven-day horizon');
  assert.equal(rollover.planIds.join(','),'current,older','expired plans stay in history');
  console.log('Home deletion passed: demo-only action, confirmation, duplicates, failure, empty state, preserved history and stale loading.');
})().catch(error => { console.error(error); process.exitCode = 1; });
