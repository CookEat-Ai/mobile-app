const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

function load({ storedUserId = null, legacyId = null, slowInit = false, slowCuid = false, failFirstInit = false, storageGate = null, posthogGate = null, firstRunGate = null, configured = true, configureGate = null } = {}) {
  const store = new Map(storedUserId ? [['userId', storedUserId]] : []);
  const calls = [], captures = [], identifies = [], clients = [], attributes = [];
  const uidWaiters = [], cuidWaiters = [];
  let delayUid = false, initSuccess, currentCuid = null, rcId = '$RCAnonymousID:original', canonical = null;
  let conversionListener, deepLinkListener;
  const parents = new Map();
  function person(id) { if (!parents.has(id)) parents.set(id, id); let p = parents.get(id); if (p !== id) { p = person(p); parents.set(id, p); } return p; }
  class PostHog {
    constructor() { this.id = legacyId || 'posthog-anonymous'; this.identified = !!legacyId; clients.push(this); }
    async ready() { if (posthogGate) await posthogGate.promise; }
    getDistinctId() { return this.id; }
    identify(id) {
      identifies.push(id);
      // Model PostHog's refusal to merge two already identified profiles.
      if (this.id !== id && !this.identified) parents.set(person(this.id), person(id));
      this.id = id; this.identified = true;
    }
    capture(event, props) { captures.push({ event, props, id: this.id }); }
    setPersonProperties() {}
    register(props) { this.props = { ...this.props, ...props }; return Promise.resolve(); }
    reset() { this.id = 'posthog-anonymous-reset'; this.identified = false; this.props = {}; calls.push(['posthog.reset']); }
    getFeatureFlag() {}
    flush() { return Promise.resolve(); }
  }
  const native = {
    onInstallConversionData(fn) { conversionListener = fn; calls.push(['conversion-listener']); return () => {}; },
    onDeepLink(fn) { deepLinkListener = fn; calls.push(['deep-link-listener']); return () => {}; },
    setCustomerUserId(id, callback) {
      const complete = () => { currentCuid = id; calls.push(['cuid', id]); callback(); };
      if (slowCuid) cuidWaiters.push(complete); else complete();
    },
    initSdk(options, success, failure) {
      calls.push(['appsflyer.init', currentCuid]);
      if (failFirstInit) { failFirstInit = false; failure(new Error('offline')); return; }
      if (slowInit) initSuccess = success; else success('ok');
    },
    getAppsFlyerUID(callback) {
      if (delayUid) uidWaiters.push(callback); else callback(null, 'af-install-uid');
    },
    logEvent(name, props, success) { calls.push(['af.event', name, currentCuid, props]); success('ok'); },
  };
  const purchases = {
    configure: async ({ appUserID }) => {
      if (configureGate) await configureGate.promise;
      configured = true; rcId = appUserID || '$RCAnonymousID:configured'; calls.push(['rc.configure', rcId]);
    },
    isConfigured: async () => configured,
    getAppUserID: async () => rcId,
    isAnonymous: async () => rcId.startsWith('$RCAnonymousID:'),
    logIn: async id => { await tick(); rcId = id; calls.push(['rc.login', id]); },
    logOut: async () => { rcId = '$RCAnonymousID:reset'; calls.push(['rc.logout']); },
    setAttributes: async props => { attributes.push({ id: rcId, props }); },
    collectDeviceIdentifiers: async () => { calls.push(['collect-consented-identifiers']); },
  };
  const storage = {
    async getItem(key) { if (key === 'userId' && storageGate) await storageGate.promise; if (key === '@cookeat_first_run' && firstRunGate) await firstRunGate.promise; return store.get(key) ?? null; },
    async setItem(key, value) { store.set(key, value); },
    async removeItem(key) { store.delete(key); },
  };
  const cache = new Map();
  function service(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { exports, console: { log() {}, warn() {}, error() {} }, __DEV__: false, Date, Promise, Set,
      require(id) {
        if (id === 'posthog-react-native') return { PostHog };
        if (id === 'react-native-appsflyer') return native;
        if (id === '@react-native-async-storage/async-storage') return storage;
        if (id === 'react-native-purchases') return purchases;
        if (id === 'react-native') return { Platform: { OS: 'ios' }, Linking: {} };
        if (id === 'expo-localization') return { getLocales: () => [{ languageCode: 'fr' }] };
        if (id === 'expo-tracking-transparency') return { requestTrackingPermissionsAsync: async () => ({ status: 'denied' }) };
        if (id === '@sentry/react-native') return { setUser: u => { canonical = u?.id || null; } };
        if (id === './deviceStorage') return { getUniqueDeviceId: async () => 'installation-id', rotateUniqueDeviceId: async () => 'rotated-installation-id' };
        if (id === '../config/posthog') return { POSTHOG_API_KEY: 'public-project-key', POSTHOG_HOST: 'https://example.invalid' };
        if (id === '../config/env' || id === './env') return { APP_ENVIRONMENT: 'production', PUBLIC_ENV: { revenueCatIosApiKey: 'test', revenueCatEntitlementId: 'premium' } };
        if (id === '../config/appsflyer') return { AF_DEV_KEY: 'test-key', AF_APP_ID: 'test-app' };
        if (id === './appsflyer' || id === '../services/appsflyer') return service('services/appsflyer.ts');
        if (id === '../services/analytics') return service('services/analytics.ts');
        if (id === '../services/reviewerAccess') return { hasReviewerAccess: async () => false };
        if (id === './storeCompliance') return { CREATOR_PROMO_CODES_ENABLED: false };
        if (id === '../services/api') return { apiService: { getAppConfig: async () => ({ data: {} }) } };
        throw new Error(`Unexpected import ${id}`);
      },
    });
    return exports;
  }
  return {
    analytics: service('services/analytics.ts').default,
    appsflyer: service('services/appsflyer.ts').default,
    revenuecat: () => service('config/revenuecat.ts').default,
    calls, captures, identifies, clients, attributes, store, person,
    state: () => ({ currentCuid, rcId, canonical }),
    releaseInit: () => initSuccess('ok'),
    releaseCuid: () => cuidWaiters.shift()?.(),
    setUidDelay: value => { delayUid = value; },
    releaseUids: () => { uidWaiters.splice(0).forEach(cb => cb(null, 'af-install-uid')); },
    conversion: data => conversionListener({ status: 'success', data }),
    deepLink: data => deepLinkListener(data),
  };
}

(async () => {
  const cold = load();
  const starts = await Promise.all([cold.analytics.init(), cold.analytics.init()]);
  assert.deepEqual(starts, [null, null]);
  assert.equal(cold.clients.length, 1, 'concurrent startup must use a single client');
  assert.equal(cold.captures.filter(e => e.event === 'first_open').length, 1);
  assert.equal(cold.identifies.length, 0, 'installation must stay anonymous');
  assert.equal(cold.state().currentCuid, 'posthog-anonymous');
  assert.equal(cold.state().rcId, '$RCAnonymousID:original', 'do not logIn with a provisional custom RC ID');
  assert.equal(cold.attributes.at(-1).props.$posthogUserId, 'posthog-anonymous');
  await cold.analytics.identify('server-user');
  await cold.analytics.track('purchase_started'); await tick();
  assert.equal(cold.person(cold.captures.find(e => e.event === 'first_open').id), cold.person('server-user'), 'first open and checkout must resolve to the same person');
  assert.equal(cold.captures.at(-1).id, 'server-user');
  assert.equal(cold.state().currentCuid, 'server-user');
  assert.equal(cold.state().rcId, 'server-user');
  assert.equal(cold.attributes.at(-1).props.$posthogUserId, 'server-user');
  assert.equal(cold.attributes.at(-1).props.$appsflyerId, 'af-install-uid');
  const checkout = cold.calls.find(c => c[0] === 'af.event');
  assert.equal(checkout[1], 'af_initiated_checkout'); assert.equal(checkout[2], 'server-user');
  await cold.analytics.track('subscription_started'); await tick();
  assert.equal(cold.calls.filter(c => c[0] === 'af.event').length, 1, 'RevenueCat owns subscription revenue; no duplicate client event');

  const firstRunGate = deferred(), ordered = load({ firstRunGate });
  const orderedStart = ordered.analytics.init(); await tick();
  await ordered.analytics.track('onboarding_welcome_viewed');
  firstRunGate.resolve(); await orderedStart;
  assert.deepEqual(ordered.captures.map(e => e.event), ['first_open', 'onboarding_welcome_viewed'], 'queued onboarding must not precede first_open');

  const slow = load({ slowInit: true });
  const startup = slow.analytics.init();
  await tick();
  assert(slow.captures.some(e => e.event === 'first_open'), 'PostHog must not wait for ATT/AppsFlyer');
  const identified = slow.analytics.identify('server-during-startup');
  await tick(); slow.releaseInit();
  await Promise.all([startup, identified]);
  assert.deepEqual(slow.identifies, ['server-during-startup']);
  assert.equal(slow.state().currentCuid, 'server-during-startup');
  assert.equal(slow.state().rcId, 'server-during-startup');
  assert.equal(slow.analytics.getCanonicalUserId(), 'server-during-startup');

  const stored = load({ storedUserId: 'returning-user' });
  assert.equal(await stored.analytics.init(), 'returning-user');
  assert.deepEqual(stored.identifies, ['returning-user']);
  assert.equal(stored.state().currentCuid, 'returning-user');

  const migrated = load({ legacyId: 'installation-id' });
  await migrated.analytics.init();
  assert.equal(migrated.clients[0].getDistinctId(), 'posthog-anonymous-reset');
  assert.equal(migrated.identifies.length, 0);
  await migrated.analytics.identify('migrated-server');
  assert.equal(migrated.state().rcId, 'migrated-server');

  const gate = deferred(), early = load({ storageGate: gate, storedUserId: 'obsolete-stored-user' });
  const earlyStart = early.analytics.init();
  await early.analytics.identify('new-server-before-storage');
  gate.resolve(); await earlyStart;
  assert.equal(early.analytics.getCanonicalUserId(), 'new-server-before-storage');
  assert.equal(early.state().currentCuid, 'new-server-before-storage');

  cold.setUidDelay(true);
  const old = cold.analytics.identify('old-account'); await tick();
  const next = cold.analytics.identify('next-account'); await tick();
  cold.setUidDelay(false); cold.releaseUids(); await Promise.all([old, next]);
  assert.equal(cold.state().rcId, 'next-account');
  assert.equal(cold.attributes.at(-1).props.$posthogUserId, 'next-account');
  assert.equal(cold.state().canonical, 'next-account');

  cold.setUidDelay(true);
  const obsolete = cold.analytics.identify('deleted-account'); await tick();
  const reset = cold.analytics.resetIdentity({ rotateDeviceId: true, clearAttribution: true }); await tick();
  cold.setUidDelay(false); cold.releaseUids(); await Promise.all([obsolete, reset]);
  assert.equal(cold.analytics.getCanonicalUserId(), null);
  assert.equal(cold.state().currentCuid, 'posthog-anonymous-reset');
  assert.equal(cold.state().rcId, '$RCAnonymousID:reset');
  assert.equal(cold.attributes.at(-1).props.$posthogUserId, 'posthog-anonymous-reset');
  assert.equal(cold.state().canonical, null);
  assert(!cold.identifies.includes('rotated-installation-id'));
  assert.equal(cold.clients[0].props.app_environment, 'production');
  await cold.analytics.requestTrackingPermission();
  assert.equal(cold.analytics.getCanonicalUserId(), null, 'ATT denied must not identify anonymous user');

  const callbacks = load({ slowCuid: true });
  callbacks.appsflyer.trackEvent('queued-event');
  const afStart = callbacks.appsflyer.init('anonymous-cuid'); await tick();
  assert(!callbacks.calls.some(c => c[0] === 'appsflyer.init'), 'wait for native CUID before install');
  const change = callbacks.appsflyer.setCustomerUserId('canonical-cuid');
  callbacks.releaseCuid(); await tick();
  callbacks.releaseCuid(); await Promise.all([afStart, change]); await tick();
  assert.equal(callbacks.calls.find(c => c[0] === 'appsflyer.init')[1], 'canonical-cuid');
  assert.equal(callbacks.calls.find(c => c[0] === 'af.event')[2], 'canonical-cuid');
  assert.equal(callbacks.calls.filter(c => c[0] === 'conversion-listener').length, 1);
  assert(callbacks.calls.findIndex(c => c[0] === 'deep-link-listener') < callbacks.calls.findIndex(c => c[0] === 'appsflyer.init'));

  const configGate = deferred(), rcRace = load({ configured: false, configureGate: configGate });
  await rcRace.analytics.init();
  const configStart = rcRace.revenuecat().initialize(); await tick();
  await rcRace.analytics.identify('server-during-rc-configure');
  configGate.resolve(); await configStart;
  assert.equal(rcRace.state().rcId, 'server-during-rc-configure', 're-read canonical user after anonymous configure finishes');
  assert.equal(rcRace.attributes.at(-1).props.$posthogUserId, 'server-during-rc-configure');
  assert.equal(rcRace.attributes.at(-1).props.$appsflyerId, 'af-install-uid');

  const retry = load({ failFirstInit: true });
  await retry.appsflyer.init('retry-user');
  retry.appsflyer.trackEvent('retained-event');
  await retry.appsflyer.init('retry-user'); await tick();
  assert.equal(retry.calls.filter(c => c[0] === 'appsflyer.init').length, 2);
  assert.equal(retry.calls.filter(c => c[0] === 'af.event').length, 1);
  const attribution = load(); await attribution.analytics.init();
  attribution.conversion({ af_status: 'Non-organic', media_source: 'test-network', campaign: 'acquisition', is_first_launch: 'true' }); await tick();
  await attribution.analytics.identify('attributed-user');
  attribution.conversion({ af_status: 'Organic', is_first_launch: false }); await tick();
  const firstTouch = await attribution.appsflyer.getFirstTouchAttribution();
  assert.equal(firstTouch.initial_media_source, 'test-network', 'a later session must not overwrite acquisition');
  assert.equal(attribution.attributes.at(-1).props.$campaign, 'acquisition');
  assert.equal(attribution.attributes.at(-1).props.$mediaSource, 'test-network');
  await attribution.analytics.identify('second-attributed-user');
  assert.equal(attribution.clients[0].props.initial_media_source, 'test-network', 'first-touch dimensions must survive a new canonical identity');
  assert.equal(attribution.clients[0].props.canonical_user_id, 'second-attributed-user');
  attribution.deepLink({ deepLinkStatus: 'FOUND', isDeferred: true, data: { deep_link_value: 'recipe' } }); await tick();
  assert(attribution.captures.some(e => e.event === 'appsflyer_deep_link_resolved' && e.id === 'second-attributed-user'));
  console.log('Identity regressions passed: anonymous merge, concurrent startup, stale callbacks, native CUID ordering, account reset, ATT denied, RevenueCat joins and AppsFlyer retries.');
})().catch(error => { console.error(error); process.exitCode = 1; });
