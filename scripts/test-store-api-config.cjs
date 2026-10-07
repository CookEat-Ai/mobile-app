const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const config = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
assert(!config.build.testflight);
assert(!config.submit.testflight);
assert.equal(config.build.production.channel, 'production');
assert.equal(config.build.production.env.EXPO_PUBLIC_API_URL, 'https://cookeat.info/api');
assert.equal(config.build.production.env.EXPO_PUBLIC_APP_ENV, 'production');
const source = ts.transpileModule(fs.readFileSync('config/api.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function run(apiUrl, appEnvironment = 'production', dev = false) {
  const exports = {};
  vm.runInNewContext(source, { exports, __DEV__: dev, console: { log() {}, warn() {} }, require: name =>
    name === './env' ? { PUBLIC_ENV: { apiUrl, appEnvironment } } : name === 'react-native'
      ? { NativeModules: { SourceCode: { scriptURL: 'http://192.168.1.10:8081/index.bundle' } }, Platform: { OS: 'ios' } }
      : { default: { expoConfig: {} } } });
  return exports;
}
assert.equal(run('https://cookeat.info/api').API_BASE_URL, 'https://cookeat.info/api');
assert.equal(run('https://cookeat.info/api/').WS_URL, 'wss://cookeat.info/ws');
for (const url of ['https://cookeat.info/testflight/api', 'http://localhost:8083/api', 'https://example.test/api']) {
  assert.throws(() => run(url), /release CookEat/);
}
assert.throws(() => run(null), /obligatoire/);
assert.equal(run(null, 'development', true).API_BASE_URL, 'http://192.168.1.10:8083/api');
console.log('Store API regression passed: one production profile, canonical API/WebSocket, reject incorrect production endpoints, local development discovery.');
