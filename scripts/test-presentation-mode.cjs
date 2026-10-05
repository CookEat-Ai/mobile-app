const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: false } }).outputText, { exports, require: name => dependencies[name] || require(name) });
  return exports;
}
const { createShakeDetector } = load('services/shakeGesture.ts');
const detect = createShakeDetector();
const still = { x: 0, y: 0, z: 1 }, peak = { x: 3, y: 0, z: 1 };
assert.equal(detect(still, 0), false);
assert.equal(detect(peak, 100), false);
assert.equal(detect(peak, 200), false); // a sustained acceleration isn't a second shake
assert.equal(detect(still, 250), false);
assert.equal(detect(peak, 400), true);
assert.equal(detect(still, 500), false);
assert.equal(detect(peak, 700), false); // cooldown
const pantry = load('services/planningPantry.ts');
const { createPantryScanHandoff, readPantryScanHandoff } = load('services/pantryScanHandoff.ts', { './planningPantry': pantry });
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Tomate', 'Tomates'], 'strict')).ingredients.length, 1);
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Tomate'], 'strict')).pantryMode, 'strict');
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Tomate'], 'strict')).generate, false);
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Tomate'], 'strict')).replace, true);
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Tomate'], 'strict', true)).pantryMode, 'priority');
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Tomate'], 'priority', true)).generate, true);
assert.equal(readPantryScanHandoff('[{"name":"Tomate"}]').generate, false);
const code = 'PRESENTATION-TEST';
const { sha256 } = require('@noble/hashes/sha256');
const { bytesToHex, utf8ToBytes } = require('@noble/hashes/utils');
let stored = null;
const mode = load('services/presentationMode.ts', {
  react: { useEffect: fn => fn(), useSyncExternalStore: (_, snapshot) => snapshot() },
  'expo-secure-store': { getItemAsync: async () => stored, setItemAsync: async (_, value) => { stored = value; }, deleteItemAsync: async () => { stored = null; } },
  '../config/presentationMode': { PRESENTATION_CODE_HASH: bytesToHex(sha256(utf8ToBytes(code))) },
});
(async () => {
  assert.equal(mode.validPresentationCode('invalid'), false);
  assert.equal(await mode.activatePresentationMode('invalid'), false);
  assert.equal(mode.usePresentationMode(), false);
  assert.equal(await mode.activatePresentationMode(` ${code.toLowerCase()} `), true);
  assert.equal(mode.usePresentationMode(), true);
  assert(stored && !stored.includes(code));
  await mode.disablePresentationMode();
  assert.equal(mode.usePresentationMode(), false);
  assert.equal(stored, null);
  const reviewer = load('services/reviewerAccess.ts');
  assert.equal(await reviewer.hasReviewerAccess(), false);
  assert.equal(await reviewer.activateReviewerAccess(code), false);
  console.log('Presentation mode checks passed: shake, code, activation, deactivation, scan modes, unchanged reviewer access');
})().catch(error => { console.error(error); process.exitCode = 1; });
