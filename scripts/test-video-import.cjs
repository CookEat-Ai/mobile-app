const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
const file = ts.createSourceFile('api.ts', fs.readFileSync('services/api.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const method = file.statements.find(ts.isClassDeclaration).members.find(n => n.name?.getText(file) === 'importRecipeFromVideo').getText(file);
function harness({ pendingSession = false } = {}) {
  const sources = [], timers = new Map(); let token;
  const session = pendingSession ? new Promise(resolve => { token = resolve; }) : Promise.resolve('test-token');
  let id = 0;
  class Source { constructor(url, options) { this.url = url; this.options = options; this.handlers = {}; this.closes = 0; sources.push(this); } addEventListener(name, fn) { this.handlers[name] = fn; } close() { this.closes++; } }
  const output = {};
  vm.runInNewContext(ts.transpileModule(`export class Service { invalidateReadCache() {} getHeaders() {return {}} getCurrentLanguage() {return 'fr'} ${method} }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: output, EventSource: Source, getAnonymousSessionToken: () => session, AsyncStorage: { getItem: async () => 'owner' }, API_BASE_URL: 'https://example.test/api', i18n: { t: key => key }, AbortController,
    setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, delay }); return key; }, clearTimeout(key) { timers.delete(key); },
  });
  return { service: new output.Service(), sources, timers, resolveSession: () => token?.('late-token'), expire() { for (const timer of [...timers.values()]) timer.fn(); } };
}
(async () => {
  const ok = harness(), progress = [], pending = ok.service.importRecipeFromVideo('https://vm.tiktok.com/test/', false, { onProgress: (...args) => progress.push(args) }); await tick();
  const source = ok.sources[0]; assert.equal(source.options.pollingInterval, 0, 'an import POST must not reconnect and duplicate a saved recipe');
  source.handlers.progress({ data: '{broken' }); source.handlers.progress({ data: '{"progress":15,"step":"extracting_transcript"}' }); assert.equal(progress[0][0], 15);
  source.handlers.done({ data: '{"success":true,"recipe":{"id":"imported"}}' }); assert.equal((await pending).data.recipe.id, 'imported'); assert.equal(source.closes, 1); assert.equal(ok.timers.size, 0);
  source.handlers.error({ message: 'late failure' }); assert.equal(source.closes, 1);
  for (const event of [{ message: '{"message":"Premium quota"}', xhrStatus: 403 }, { data: '<html>upstream unavailable</html>' }, { message: 'The Internet connection appears to be offline.' }]) {
    const h = harness(), result = h.service.importRecipeFromVideo('test'); await tick(); assert.doesNotThrow(() => h.sources[0].handlers.error(event)); assert((await result).error); assert.equal(h.timers.size, 0);
    if (event.xhrStatus) assert.equal((await result).status, 403);
  }
  const malformed = harness(), invalid = malformed.service.importRecipeFromVideo('test'); await tick(); malformed.sources[0].handlers.done({ data: '{"success":true}' }); assert((await invalid).error, 'missing recipe is terminal, never endless loading');
  const stalled = harness({ pendingSession: true }), timeout = stalled.service.importRecipeFromVideo('test'); stalled.expire(); assert.equal((await timeout).error, 'shareIntent.timeout'); stalled.resolveSession(); await tick(); assert.equal(stalled.sources.length, 0, 'a late credential cannot create a request after timeout');
  const abort = new AbortController(), cancelled = harness(), cancelledResult = cancelled.service.importRecipeFromVideo('test', false, { signal: abort.signal }); await tick(); abort.abort(); assert((await cancelledResult).error); assert.equal(cancelled.sources[0].closes, 1); assert.equal(cancelled.timers.size, 0);
  console.log('Video import client: real progress frames, no POST reconnect, success, malformed/HTTP/iOS network errors, timeout before authentication, terminal payload validation and cancellation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
