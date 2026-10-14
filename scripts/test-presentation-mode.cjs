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
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Tomate'], 'strict', true)).pantryMode, 'strict');
assert.equal(readPantryScanHandoff(createPantryScanHandoff(['Tomate'], 'priority', true)).generate, false);
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
  assert.equal(stored, 'disabled');
  await mode.enablePresentationModeByDefault();
  assert.equal(mode.usePresentationMode(), false, 'automatic defaults respect manual deactivation');
  const reviewer = load('services/reviewerAccess.ts', { './presentationMode': mode, './api': { default: { getAdminAccess: async () => ({ data: { active: false } }), activateAdminAccess: async () => ({ data: { active: false } }) } } });
  assert.equal(await reviewer.hasReviewerAccess(), false);
  assert.equal(await reviewer.activateReviewerAccess(code), false);
  const presentationHash = bytesToHex(sha256(utf8ToBytes(code)));
  function bypassScenario(initialPreference = null, failStorage = false) {
    let preference = initialPreference;
    let active = false;
    let offline = false;
    const presentation = load('services/presentationMode.ts', {
      react: { useEffect: fn => fn(), useSyncExternalStore: (_, snapshot) => snapshot() },
      'expo-secure-store': {
        getItemAsync: async () => { if (failStorage) throw Error('storage unavailable'); return preference; },
        setItemAsync: async (_, value) => { preference = value; },
      },
      '../config/presentationMode': { PRESENTATION_CODE_HASH: presentationHash },
    });
    const access = load('services/reviewerAccess.ts', {
      './presentationMode': presentation,
      './api': { default: {
        activateAdminAccess: async submitted => ({ data: { active: submitted === 'valid-bypass' } }),
        getAdminAccess: async () => { if (offline) throw Error('offline'); return { data: { active } }; },
      } },
    });
    return { presentation, access, preference: () => preference,
      grant: () => { active = true; }, goOffline: () => { offline = true; } };
  }
  const first = bypassScenario();
  assert.equal(await first.access.hasReviewerAccess(), false);
  assert.equal(await first.access.activateReviewerAccess('invalid'), false);
  assert.equal(first.preference(), null, 'no presentation default without server-confirmed bypass');
  assert.equal(await first.access.activateReviewerAccess(' valid-bypass '), true);
  assert.equal(first.presentation.usePresentationMode(), true, 'valid bypass enables presentation before leaving paywall');
  assert.equal(first.preference(), presentationHash);
  await first.presentation.disablePresentationMode();
  first.grant();
  assert.equal(await first.access.hasReviewerAccess(), true);
  assert.equal(first.presentation.usePresentationMode(), false, 'subscription refresh does not override opt-out');
  const existing = bypassScenario();
  existing.grant();
  assert.equal(await existing.access.hasReviewerAccess(), true);
  assert.equal(existing.presentation.usePresentationMode(), true, 'existing bypass receives the default on startup');
  const restarted = bypassScenario('disabled');
  restarted.grant();
  assert.equal(await restarted.access.hasReviewerAccess(), true);
  assert.equal(restarted.presentation.usePresentationMode(), false, 'opt-out survives app restart');
  assert.equal(await restarted.presentation.activatePresentationMode(code), true, 'manual activation still works');
  const unavailable = bypassScenario();
  unavailable.goOffline();
  assert.equal(await unavailable.access.hasReviewerAccess(), false);
  assert.equal(unavailable.preference(), null);
  const storageFailure = bypassScenario(null, true);
  storageFailure.grant();
  assert.equal(await storageFailure.access.hasReviewerAccess(), true, 'presentation storage failure cannot remove confirmed bypass access');
  assert.equal(await storageFailure.access.activateReviewerAccess('valid-bypass'), true);
  console.log('Presentation mode checks passed: shake, manual code, server-confirmed bypass defaults, existing users, persistent opt-out, storage/offline failures and scan modes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
