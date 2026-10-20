const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals, requireMock) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: false },
  }).outputText;
  vm.runInNewContext(code, { exports, require: requireMock, ...globals });
  return exports;
}
const converter = load('node_modules/expo/src/winter/fetch/convertFormData.ts', {
  Blob, TextEncoder, Uint8Array,
}, () => ({ blobToArrayBufferAsync: blob => blob.arrayBuffer() }));
class LocalFile {
  constructor(uri) {
    this.uri = uri;
    this.name = path.basename(uri);
    this.type = /\.mp4$/.test(uri) ? 'video/mp4' : /\.png$/.test(uri) ? 'image/png' : 'image/jpeg';
  }
  async bytes() {
    return process.argv[2] ? fs.readFileSync(process.argv[2]) : Buffer.from('local file contents');
  }
}
class FormData {
  constructor() { this.parts = []; }
  append(name, value) { this.parts.push([name, value]); }
  entries() { return this.parts; }
}
let sessionCalls = 0;
let requests = 0;
let mode = 'ok';
const api = load('services/api.ts', {
  FormData, AbortController, setTimeout, clearTimeout, console,
  fetch: async (url, options) => {
    requests++;
    if (mode === 'network') throw Error('offline');
    const multipart = await converter.convertFormDataAsync(options.body);
    assert.equal(options.headers['Content-Type'], undefined);
    const text = new TextDecoder().decode(multipart.body);
    assert.match(text, /filename="/);
    assert.match(text, /Content-Type:|content-type:/);
    if (process.argv[2]) {
      const response = await fetch(url, {
        ...options, body: multipart.body,
        headers: { 'Content-Type': `multipart/form-data; boundary=${multipart.boundary}` },
      });
      return response;
    }
    return { ok: true, status: 200, json: async () => {
      if (mode === 'json') throw Error('invalid json');
      return { ingredients: [] };
    } };
  },
}, id => {
  if (id === 'expo-file-system') return { File: LocalFile };
  if (id.includes('anonymousSession')) return {
    getAnonymousSessionToken: async () => { sessionCalls++; throw Error('session unavailable'); },
    invalidateAnonymousSession() {},
  };
  if (id.includes('config/api')) return { API_BASE_URL: 'http://localhost:8083/api', WS_URL: '' };
  if (id === '../i18n') return { default: { language: 'fr', t: key => key }, resolveSupportedLanguage: key => key };
  return { default: {}, CREATOR_PROMO_CODES_ENABLED: false };
}).apiService;
(async () => {
  await assert.rejects(() => converter.convertFormDataAsync({ entries: () => [['images', { uri: 'file:///photo.jpg', name: 'photo.jpg', type: 'image/jpeg' }]] }), /Unsupported FormDataPart/);
  const result = await api.processImageIngredients([process.argv[2] || 'file:///photo.jpg']);
  assert(result.data?.ingredients, JSON.stringify(result));
  assert.equal(sessionCalls, 0);
  if (process.argv[2]) {
    console.log(`Live image upload passed: ${result.data.ingredients.length} ingredients`);
    return;
  }
  assert((await api.processVideoIngredients('file:///video.mp4')).data);
  const beforeProtected = requests;
  await api.request('/meal-plans');
  assert.equal(sessionCalls, 1);
  assert.equal(requests, beforeProtected);
  mode = 'json';
  assert.equal((await api.processImageIngredients(['file:///photo.jpg'])).status, 502);
  mode = 'network';
  assert.equal((await api.processImageIngredients(['file:///photo.jpg'])).error, 'common.networkError');
  console.log('Media upload regression checks passed (installed Expo multipart serializer)');
})().catch(error => { console.error(error); process.exitCode = 1; });
