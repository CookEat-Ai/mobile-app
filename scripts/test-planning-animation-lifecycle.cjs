const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness() {
  const hooks = [], timers = new Map(), animations = [];
  let cursor = 0, pending = [], focused = true, timerId = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
  const slot = () => hooks[cursor++] ??= {};
  const effect = (fn, deps, focus = false) => {
    const h = slot();
    if (!same(h.deps, deps)) {
      h.deps = deps;
      pending.push(() => {h.cleanup?.(); h.fn = fn; h.focus = focus; h.cleanup = !focus || focused ? fn() : undefined;});
    }
  };
  const react = {
    __esModule: true, default: {createElement: (type, props, ...children) => ({type, props, children})},
    useRef: value => {const h = slot(); return h.ref ??= {current: value};},
    useCallback: (fn, deps) => {const h = slot(); if (!same(h.deps, deps)) {h.deps = deps; h.value = fn;} return h.value;},
    useEffect: effect,
  };
  const shared = initial => {
    const h = slot();
    if (!h.shared) {
      let value = initial;
      h.shared = {get value() {return value;}, set value(next) {
        if (next?.animation) {h.animation = next; animations.push({shared: h.shared, target: next.target, config: next.config});}
        else {value = next; h.animation = null;}
      }};
    }
    return h.shared;
  };
  const modules = {
    react,
    'react-native': {StyleSheet: {create: x => x}},
    'react-native-reanimated': {__esModule: true, default: {View: 'AnimatedView'}, useSharedValue: shared, cancelAnimation: value => {value.value = value.value;}, useAnimatedStyle: fn => fn,
      withTiming: (target, config) => ({animation: true, target, config}), withDelay: (delay, animation) => ({...animation, delay}), Easing: {out: x => x, cubic: 'cubic'}, ReduceMotion: {System: 'system'}},
    'expo-router': {useFocusEffect: fn => effect(fn, [fn], true)},
    '../../contexts/MotionPreferences': {}, '@expo/vector-icons': {}, 'react-i18next': {}, '../../constants/AppTheme': {AppTheme: {}}, '../../hooks/useDevShakeReveal': {}, './PlanningStyles': {planningStyles: {meals: {}}},
  };
  const loaded = {};
  const source = fs.readFileSync(require.resolve('../components/planning/PlanningReveal.tsx'), 'utf8') + '\nexport { PlanningMealEntrance };';
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React}}).outputText, {exports: loaded, require: name => modules[name], setTimeout: fn => {timers.set(++timerId, fn); return timerId;}, clearTimeout: id => timers.delete(id)});
  return {
    animations,
    render: (key, origin = 100) => {cursor = 0; pending = []; const tree = loaded.PlanningMealEntrance({animationKey: key, origin, index: 0, count: 2}); pending.forEach(fn => fn()); return tree;},
    blur: () => {focused = false; hooks.filter(h => h.focus).forEach(h => {h.cleanup?.(); h.cleanup = undefined;});},
    focus: () => {focused = true; hooks.filter(h => h.focus).forEach(h => {h.cleanup = h.fn();});},
    expire: () => [...timers.values()].forEach(fn => fn()),
    get progress() {return hooks[0].shared.value;},
    complete: () => {const a = animations.at(-1); a.shared.value = a.target;},
  };
}
const h = harness();
h.render(null); assert.equal(h.progress, 1);
h.render(1); assert.equal(h.progress, 0);
assert.equal(h.animations[0].config.reduceMotion, 'system');
h.render(1); assert.equal(h.animations.length, 1, 'ordinary rerender does not replay');
h.blur(); assert.equal(h.progress, 1, 'blur restores even before parent null key commits');
h.focus(); h.render(2); assert.equal(h.progress, 0);
h.complete();
const tree = h.render(2);
assert.equal(h.progress, 1);
assert.deepEqual(JSON.parse(JSON.stringify(tree.props.style[1]().transform)), [{translateY: 0}, {rotate: '0deg'}, {scale: 1}]);
assert.equal(tree.props.style[0].zIndex, 2);
assert.equal(tree.props.pointerEvents, undefined, 'no completion callback can strand an interaction lock');
for (let key = 3; key < 10; key++) {
  h.blur(); h.render(null); h.focus(); h.render(key); assert.equal(h.progress, 0);
  h.complete(); assert.equal(h.progress, 1);
}
h.blur(); h.render(null); h.focus(); h.render(10);
h.expire(); assert.equal(h.progress, 1, 'lost animation completion restores the card');
h.render(10, 120); assert.equal(h.progress, 1, 'layout updates cannot strand/replay an entrance');
console.log('Planning Reanimated lifecycle: repeated focus, interruption, identity transforms, reduced motion and fallback passed.');
