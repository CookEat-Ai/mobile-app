/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const ok = data => ({ ok: true, status: 200, json: async () => data });
const bad = status => ({ ok: false, status, json: async () => ({ message: 'rejected' }) });
function harness(storage = new Map([['userId', 'alice']]), base = 'https://example.test/api') {
  let now = 1000000, failStorage = false, transport = async () => ok({ success: true, recipes: [], recipe: { id: 'a' }, plans: [], plan: null, history: [] });
  const calls = [], sockets = [], sources = [];
  const i18n = { language: 'fr', t: key => key };
  const asyncStorage = {
    getItem: async key => { if (failStorage) throw Error('storage unavailable'); return storage.get(key) || null; },
    setItem: async (key, value) => { if (failStorage) throw Error('storage full'); storage.set(key, value); },
  };
  const deps = {
    '@react-native-async-storage/async-storage': { __esModule: true, default: asyncStorage },
    '../config/api': { API_BASE_URL: base, WS_URL: 'wss://example.test/ws' },
    '../i18n': { __esModule: true, default: i18n, resolveSupportedLanguage: value => value },
    '../config/storeCompliance': { CREATOR_PROMO_CODES_ENABLED: false },
    './anonymousSession': { getAnonymousSessionToken: async () => 'test-token', invalidateAnonymousSession() {} },
    './planningReveal': { markPlanningReveal() {} },
    'expo-localization': { getLocales: () => [] },
    'expo-file-system': { File: class {} },
    'react-native-sse': { __esModule: true, default: class {
      constructor() { this.listeners = {}; sources.push(this); }
      addEventListener(event, cb) { this.listeners[event] = cb; }
      close() {}
    } },
  };
  const context = {
    console, URLSearchParams, FormData, AbortController,
    Date: class extends Date { static now() { return now; } },
    setTimeout: () => 1, clearTimeout() {},
    fetch: async (url, options) => { calls.push([url, options.method || 'GET']); return transport(url, options); },
    WebSocket: class { constructor() { sockets.push(this); } close() {} },
  };
  function load(file) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { ...context, exports: module.exports, require: name => {
      assert(name in deps, `unmocked dependency ${name}`); return deps[name];
    } });
    return module.exports;
  }
  const cacheModule = load('responseCache.ts');
  deps['./responseCache'] = cacheModule;
  const api = load('api.ts').apiService;
  return { api, cacheModule, storage, calls, i18n, sockets, sources,
    advance: ms => { now += ms; }, transport: fn => { transport = fn; }, failStorage: () => { failStorage = true; } };
}

(async () => {
  const h = harness();
  await Promise.all([h.api.getRecipeCatalog(), h.api.getRecipeCatalog()]);
  assert.equal(h.calls.length, 1, 'simultaneous identical reads share one fetch');
  await h.api.getRecipeCatalog();
  assert.equal(h.calls.length, 1, 'fresh response needs no fetch');
  await h.api.getRecipeCatalog({ page: 2 });
  await h.api.getRecipeCatalog({ allergies: ['nuts'] });
  await h.api.getRecipeCatalog({ search: 'pasta' });
  h.i18n.language = 'en'; await h.api.getRecipeCatalog();
  assert.equal(h.calls.length, 5, 'page, preferences, search and language stay isolated');
  const response = await h.api.getCatalogRecipe('a');
  response.data.recipe.id = 'edited';
  assert.equal((await h.api.getCatalogRecipe('a')).data.recipe.id, 'a', 'UI edits cannot mutate a cached recipe');
  await tick();
  const saved = h.storage.get('@cookeat_catalog_response_cache_v1');
  assert(saved && !saved.includes('alice'), 'persistent cache contains public data only');
  const relaunched = harness(h.storage); relaunched.i18n.language = 'en';
  await relaunched.api.getRecipeCatalog();
  assert.equal(relaunched.calls.length, 0, 'catalogue survives a cold start');
  const otherServer = harness(h.storage, 'https://other.test/api'); otherServer.i18n.language = 'en';
  await otherServer.api.getRecipeCatalog();
  assert.equal(otherServer.calls.length, 1, 'server environments stay isolated');

  const personal = harness();
  await personal.api.getFavorites('alice'); await personal.api.getFavorites('alice');
  assert.equal(personal.calls.length, 1);
  await personal.api.getFavorites('alice', { forceRefresh: true });
  assert.equal(personal.calls.length, 2, 'pull to refresh reaches server');
  await personal.api.removeFavorite('alice', 'a'); await personal.api.getFavorites('alice');
  assert.equal(personal.calls.length, 4, 'favorite mutation invalidates list');
  await personal.api.getRecipeHistory('alice'); await personal.api.getRecipeById('a');
  await personal.api.deleteRecipe('a', 'alice');
  await personal.api.getRecipeHistory('alice'); await personal.api.getRecipeById('a');
  assert.equal(personal.calls.length, 9, 'deletion invalidates history and detail');
  await personal.api.listMealPlans('alice'); await personal.api.getMealPlanById('plan', 'alice');
  await personal.api.updateShoppingItem('plan', 'item', 'alice', { checked: true });
  await personal.api.listMealPlans('alice'); await personal.api.getMealPlanById('plan', 'alice');
  assert.equal(personal.calls.length, 14, 'shopping changes invalidate plan summary and detail');
  assert.equal(personal.storage.size, 1, 'personal responses are never written to disk');
  const personalRestart = harness(personal.storage); await personalRestart.api.getFavorites('alice');
  assert.equal(personalRestart.calls.length, 1, 'personal data is fetched after restart');
  await personal.api.getFavorites('alice');
  personal.storage.set('userId', 'bob'); await personal.api.getFavorites('bob');
  personal.storage.set('userId', 'alice'); await personal.api.getFavorites('alice');
  assert.equal(personal.calls.length, 17, 'switching identity clears previous personal responses');
  personal.advance(30001); await personal.api.getFavorites('alice');
  assert.equal(personal.calls.length, 18, 'personal TTL expires');
  personal.api.invalidateReadCache(); await personal.api.getFavorites('alice');
  assert.equal(personal.calls.length, 19, 'foreground and subscription invalidation fetch fresh data');
  for (const method of ['checkHealth', 'getAppConfig', 'getAdminAccess', 'getCurrentUser']) {
    const before = personal.calls.length;
    await personal.api[method](); await personal.api[method]();
    assert.equal(personal.calls.length - before, 2, `${method} is never cached`);
  }

  const offline = harness(); await offline.api.getRecipeCatalog(); offline.advance(300001);
  offline.transport(async () => { throw Error('offline'); });
  assert((await offline.api.getRecipeCatalog()).data, 'expired public catalogue can cover a network outage');
  assert((await offline.api.getRecipeCatalog({}, { forceRefresh: true })).error, 'forced refresh reports network failure');
  assert((await offline.api.getRecipeCatalog()).data, 'failed forced refresh preserves public offline fallback');
  offline.transport(async () => ok({ success: true, recipes: [] })); await offline.api.getRecipeCatalog();
  offline.advance(300001); offline.transport(async () => bad(403));
  assert.equal((await offline.api.getRecipeCatalog()).status, 403, '4xx never fall back to cache');
  offline.transport(async () => ok({ success: true, recipes: [] })); await offline.api.getRecipeCatalog();
  offline.advance(8 * 24 * 60 * 60 * 1000); offline.transport(async () => bad(503));
  assert.equal((await offline.api.getRecipeCatalog()).status, 503, 'public fallback expires after seven days');
  const privateOffline = harness(); await privateOffline.api.getFavorites('alice'); privateOffline.advance(30001);
  privateOffline.transport(async () => bad(503));
  assert.equal((await privateOffline.api.getFavorites('alice')).status, 503, 'personal data has no stale fallback');
  const failed = harness(); failed.transport(async () => ok({ success: false }));
  await failed.api.getFavorites('alice'); await failed.api.getFavorites('alice');
  assert.equal(failed.calls.length, 2, 'application failures are not cached');
  failed.transport(async () => ok({}));
  await failed.api.getFavorites('alice'); await failed.api.getFavorites('alice');
  assert.equal(failed.calls.length, 4, 'empty successful HTTP responses are not cached');

  const race = harness(), old = deferred();
  race.transport(async (_url, options) => options.method === 'DELETE' ? ok({ success: true }) : old.promise);
  const read = race.api.listMealPlans('alice'); await tick();
  await race.api.deleteMealPlan('plan', 'alice');
  old.resolve(ok({ success: true, plans: [{ _id: 'deleted' }] })); await read;
  race.transport(async () => ok({ success: true, plans: [] }));
  assert.equal((await race.api.listMealPlans('alice')).data.plans.length, 0, 'late read cannot refill cache after deletion');
  const forceRace = harness(), oldForce = deferred();
  forceRace.transport(async () => oldForce.promise);
  const first = forceRace.api.getRecipeCatalog(); await tick();
  forceRace.transport(async () => ok({ success: true, recipes: [{ id: 'new' }] }));
  await forceRace.api.getRecipeCatalog({}, { forceRefresh: true });
  oldForce.resolve(ok({ success: true, recipes: [{ id: 'old' }] })); await first;
  assert.equal((await forceRace.api.getRecipeCatalog()).data.recipes[0].id, 'new', 'older request cannot overwrite forced refresh');

  const generated = harness(); await generated.api.getRecipeHistory('alice');
  generated.api.generateRecipeStream('', '', '', 1, '', '', '', [], [], false, false, { onDone() {} });
  await tick(); generated.sockets[0].onmessage({ data: JSON.stringify({ event: 'done', data: { id: 'a' } }) });
  await generated.api.getRecipeHistory('alice'); assert.equal(generated.calls.length, 2, 'WebSocket generation invalidates history');
  const imported = generated.api.importRecipeFromVideo('https://example.test/video'); await tick();
  generated.sources[0].listeners.done({ data: JSON.stringify({ success: true, recipe: { id: 'b' } }) });
  await imported; await generated.api.getRecipeHistory('alice');
  assert.equal(generated.calls.length, 3, 'SSE import invalidates history');
  await generated.api.deleteUser('device'); await generated.api.getRecipeHistory('alice');
  assert.equal(generated.calls.length, 5, 'account deletion invalidates personal reads');

  const corrupt = harness(new Map([['@cookeat_catalog_response_cache_v1', '{bad']]));
  await corrupt.api.getRecipeCatalog(); assert.equal(corrupt.calls.length, 1, 'corrupt storage falls back to network');
  const unavailable = harness(); unavailable.failStorage();
  await unavailable.api.getRecipeCatalog(); await unavailable.api.getRecipeCatalog();
  assert.equal(unavailable.calls.length, 1, 'memory cache works when disk storage fails');
  const bounded = harness();
  bounded.transport(async () => ok({ success: true, recipes: [{ text: 'x'.repeat(40000) }] }));
  for (let page = 1; page <= 100; page++) await bounded.api.getRecipeCatalog({ page });
  await tick();
  assert(bounded.storage.get('@cookeat_catalog_response_cache_v1').length <= 1000000, 'persistent cache stays bounded');
  await bounded.api.getRecipeCatalog({ page: 1 });
  assert.equal(bounded.calls.length, 101, 'old memory entries are evicted');
  console.log('Response cache passed: hits, deduplication, persistence, scoping, refresh, TTL, offline policy, mutation/stream/account invalidation, races, corrupt/full storage and bounded eviction.');
})().catch(error => { console.error(error); process.exitCode = 1; });
