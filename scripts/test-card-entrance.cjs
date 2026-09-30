const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const shouldReplay = () => true;
let allowed = true, previousDeps, cleanup, progress, starts = 0, stops = 0, lastConfig;
class Value {
  constructor(value) {this.value = value;}
  setValue(value) {this.value = value;}
  interpolate() {return {};}
}
const modules = {
  react: {__esModule: true, default: {createElement: () => ({})}, useRef: value => ({current: progress ??= value}), useCallback: (fn, deps) => ({fn, deps})},
  'react-native': {Animated: {Value, View: () => {}, createAnimatedComponent: () => () => {}, timing: (_value, config) => {lastConfig = config; return {start: () => {starts++;}, stop: () => {stops++;}};}}, Easing: {out: x => x, cubic: 'cubic'}},
  'expo-router': {useFocusEffect: ({fn, deps}) => {if (!previousDeps || deps.some((v, i) => v !== previousDeps[i])) {cleanup?.(); cleanup = fn(); previousDeps = deps;}}},
  '../../hooks/useEntranceReplay': {useEntranceReplay: () => shouldReplay},
  '../../contexts/MotionPreferences': {useMotionAllowed: () => allowed},
};
const loaded = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../components/motion/Entrance.tsx'), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React}}).outputText, {exports: loaded, require: name => modules[name]});
loaded.EntranceView({entranceIndex: 200});
assert.equal(starts, 1); assert.equal(lastConfig.delay, 225, 'long lists cap their stagger');
loaded.EntranceView({entranceIndex: 200, children: 'changed data'});
assert.equal(starts, 1, 'ordinary data updates do not replay entrance');
allowed = false; loaded.EntranceView({entranceIndex: 200});
assert.equal(progress.value, 1, 'reduced motion/background keeps content visible'); assert.equal(stops, 1);
assert.equal(starts, 1);
allowed = true; loaded.EntranceView({entranceIndex: 200});
assert.equal(starts, 2); cleanup(); assert.equal(progress.value, 1, 'blur cleanup restores visible content');
console.log('Card entrance: bounded stagger, stable rerenders, reduced motion and cleanup passed.');
