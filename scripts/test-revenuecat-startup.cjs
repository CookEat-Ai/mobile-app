const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function loadService({ failConfigure = false, failInvalidate = false } = {}) {
  let configured = false;
  let configureCount = 0;
  let invalidations = 0;
  let currentId;
  const calls = [];
  const customerInfo = { entitlements: { active: { premium: { productIdentifier: 'annual' } } } };
  const purchases = {
    configure: async ({ appUserID }) => {
      configureCount++;
      await new Promise(resolve => setImmediate(resolve));
      if (failConfigure) { failConfigure = false; throw new Error('configure failed'); }
      currentId = appUserID;
      configured = true;
    },
    invalidateCustomerInfoCache: async () => {
      invalidations++;
      if (!configured) throw new Error('not configured');
      if (failInvalidate) throw new Error('invalidate failed');
    },
    getCustomerInfo: async () => {
      assert(configured);
      return customerInfo;
    },
    getAppUserID: async () => { assert(configured); return currentId; },
    logIn: async id => { assert(configured); currentId = id; calls.push(id); },
    setAttributes: async () => { assert(configured); },
    collectDeviceIdentifiers: async () => { assert(configured); },
    getOfferings: async () => { assert(configured); return { current: { identifier: 'default' } }; },
    purchasePackage: async () => { assert(configured); return { customerInfo }; },
    restorePurchases: async () => { assert(configured); return customerInfo; },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../config/revenuecat.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports, console: { log() {}, warn() {}, error() {} }, Date,
    require: id => {
      if (id === '../services/reviewerAccess') return { hasReviewerAccess: async () => false };
      if (id === './storeCompliance') return { CREATOR_PROMO_CODES_ENABLED: false };
      if (id === 'react-native-purchases') return purchases;
      if (id === 'react-native') return { Platform: { OS: 'ios' } };
      if (id === '@react-native-async-storage/async-storage') return {
        getItem: async key => key === 'userId' ? 'stable-user' : null,
        setItem: async () => {},
      };
      if (id === '../services/api') return { apiService: { getAppConfig: async () => ({ data: {} }) } };
      if (id === '../services/analytics') return { setUserProperties() {} };
      if (id === '../services/appsflyer') return {
        getAppsFlyerUID: async () => null, getRevenueCatAttributionAttributes: async () => ({}),
      };
      if (id === './env') return { PUBLIC_ENV: { revenueCatIosApiKey: 'test', revenueCatEntitlementId: 'premium' } };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return { service: exports.default, stats: () => ({ configureCount, invalidations, currentId, calls }) };
}

(async () => {
  const unhandled = [];
  const onUnhandled = error => unhandled.push(error);
  process.on('unhandledRejection', onUnhandled);
  try {
    const { service, stats } = loadService();
    const [, status, offering] = await Promise.all([
      service.invalidateCache(), service.getSubscriptionStatus(), service.getOfferings(),
    ]);
    assert.equal(stats().configureCount, 1);
    assert.equal(stats().currentId, 'stable-user');
    assert.equal(status.isSubscribed, true);
    assert.equal(offering.identifier, 'default');
    await service.initialize('server-user');
    assert.equal(stats().configureCount, 1);
    assert.equal(stats().currentId, 'server-user');

    const failedCache = loadService({ failInvalidate: true });
    await failedCache.service.invalidateCache();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(unhandled.length, 0, 'cache rejection must be handled');

    const retry = loadService({ failConfigure: true });
    const first = await retry.service.getSubscriptionStatus();
    assert.equal(first.isSubscribed, false, 'initialization failure must not unlock access');
    assert.equal((await retry.service.getSubscriptionStatus()).isSubscribed, true);
    assert.equal(retry.stats().configureCount, 2);

    for (const action of ['getOfferings', 'purchasePackage', 'restorePurchases', 'syncAppUserId']) {
      const fresh = loadService();
      await fresh.service[action](action === 'syncAppUserId' ? 'server-user' : {});
      assert.equal(fresh.stats().configureCount, 1, `${action} must configure first`);
    }
    console.log('RevenueCat startup regressions passed: concurrency, stable identity, retries, cache rejection, purchase/restore guards.');
  } finally {
    process.removeListener('unhandledRejection', onUnhandled);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
