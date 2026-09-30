const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(os = 'ios', outcome = () => Promise.resolve()) {
  let now = 1000;
  const calls = [];
  const native = { Platform: { OS: os }, AppState: { currentState: 'active' } };
  const record = name => arg => { calls.push([name, arg]); return outcome(); };
  const haptics = {
    AndroidHaptics: {Segment_Tick: 'tick', Confirm: 'confirm', Reject: 'reject', Long_Press: 'long', Context_Click: 'context', Keyboard_Tap: 'key'},
    ImpactFeedbackStyle: {Light: 'light', Medium: 'medium', Heavy: 'heavy'},
    NotificationFeedbackType: {Success: 'success', Error: 'error', Warning: 'warning'},
    selectionAsync: record('selection'), impactAsync: record('impact'), notificationAsync: record('notification'), performAndroidHapticsAsync: record('android'),
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../services/haptics.ts'), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText,
    {exports, require: name => name === 'expo-haptics' ? haptics : native, Date: {now: () => now}});
  return {feedback: exports.feedback, calls, native, advance: () => {now += 101;}};
}
(async () => {
  const ios = harness();
  await ios.feedback.selection(); await ios.feedback.selection();
  assert.equal(ios.calls.length, 1, 'rapid duplicate feedback is suppressed');
  ios.advance(); await ios.feedback.selection();
  await ios.feedback.confirm(); await ios.feedback.success(); await ios.feedback.error();
  assert.deepEqual(ios.calls.slice(2), [['impact', 'medium'], ['notification', 'success'], ['notification', 'error']]);
  ios.native.AppState.currentState = 'background'; ios.advance(); await ios.feedback.light();
  assert.equal(ios.calls.length, 5);
  const web = harness('web'); await web.feedback.success(); assert.equal(web.calls.length, 0);
  const android = harness('android'); await android.feedback.selection(); await android.feedback.success();
  assert.deepEqual(android.calls, [['android', 'tick'], ['android', 'confirm']]);
  const pending = harness('ios', () => new Promise(() => {}));
  let completed = false; pending.feedback.success().then(() => {completed = true;}); await Promise.resolve();
  assert.equal(completed, true, 'hardware does not hold up the app action');
  await harness('ios', () => Promise.reject(new Error('unavailable'))).feedback.success();
  await harness('ios', () => {throw new Error('missing hardware');}).feedback.success();
  console.log('Haptics: platform, throttling, background and failure checks passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
