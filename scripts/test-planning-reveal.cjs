const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(relative, globals = {}) {
  const filename = path.join(__dirname, '..', relative);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, ...globals }, { filename });
  return exports;
}
async function sensorHarness({ dev = true, enabled = true, available = true } = {}) {
  let now = 0;
  let listener;
  let appStateListener;
  let cleanup;
  let availabilityChecks = 0;
  let removals = 0;
  const states = [];
  const sensor = {
    isAvailableAsync: async () => { availabilityChecks++; return available; },
    setUpdateInterval: () => {},
    addListener: callback => { listener = callback; return {remove: () => {removals++; listener = undefined;}}; },
  };
  const modules = {
    'expo-router': {useFocusEffect: callback => {cleanup = callback();}},
    'expo-sensors': {Accelerometer: sensor},
    react: {useCallback: callback => callback, useState: () => [false, value => states.push(value)]},
    'react-native': {Platform: {OS: 'ios'}, AppState: {currentState: 'active', addEventListener: (_name, callback) => {appStateListener = callback;return {remove: () => {}};}}},
  };
  const hook = load('hooks/useDevShakeReveal.ts', {__DEV__: dev, Date: {now: () => now}, require: name => modules[name]});
  hook.useDevShakeReveal(enabled);
  for (let i = 0; i < 5; i++) await Promise.resolve();
  return {
    hit: (force, at) => {now = at;listener?.({x: force, y: 0, z: 0});},
    states,
    cleanup: () => cleanup?.(),
    background: () => appStateListener?.('background'),
    get checks() {return availabilityChecks;},
    get removals() {return removals;},
  };
}
(async () => {
  for (const config of [{dev: false}, {enabled: false}]) {
    const harness = await sensorHarness(config);
    assert.equal(harness.checks, 0, 'no sensor access in production or without meals');
  }
  const unavailable = await sensorHarness({available: false});
  unavailable.hit(3, 0);
  assert.deepEqual(unavailable.states, []);
  const shake = await sensorHarness();
  shake.hit(1, 0); shake.hit(2, 100);
  assert.deepEqual(shake.states, [], 'resting and one impact leave the button hidden');
  shake.hit(2, 1500); shake.hit(2, 2000);
  assert.deepEqual(shake.states, [], 'old peaks expire');
  shake.hit(2, 2400);
  assert.deepEqual(shake.states, [true], 'three recent peaks unlock replay');
  assert.equal(shake.removals, 1, 'stop listening after unlock');
  shake.cleanup();
  assert.deepEqual(shake.states, [true, false], 'leaving the screen hides the control');
  const blurred = await sensorHarness();
  blurred.cleanup(); blurred.hit(3, 0);
  assert.deepEqual(blurred.states, [false]);
  const background = await sensorHarness();
  background.background(); background.hit(3, 0);
  assert.equal(background.removals, 1);
  assert.deepEqual(background.states, []);
  console.log('Planning reveal: dev-only shake, isolated impacts, cleanup and background checks passed.');
})().catch(error => {console.error(error);process.exitCode = 1;});
