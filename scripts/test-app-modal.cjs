const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(platform, motion = true) {
  const slots = [], effects = [], tasks = [];
  let cursor = 0;
  const react = {
    createElement: (type, props) => ({ type, props }),
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(effect, deps) {
      const i = cursor++, previous = slots[i];
      if (previous && deps.every((value, j) => value === previous.deps[j])) return;
      effects.push(() => { previous?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; });
    },
  };
  react.default = react;
  const output = {};
  const source = ts.transpileModule(fs.readFileSync('components/ui/AppModal.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports: output, require(name) {
    if (name === 'react') return react;
    if (name === 'react-native') return {
      Modal: 'NativeModal', Platform: { OS: platform },
      InteractionManager: { runAfterInteractions(callback) {
        const task = { callback, cancelled: false }; tasks.push(task);
        return { cancel() { task.cancelled = true; } };
      } },
    };
    if (name.includes('MotionPreferences')) return { useMotionAllowed: () => motion };
    if (name.includes('ModalPresentation')) return { MODAL_ANIMATION: 'slide' };
    throw Error(name);
  } });
  return {
    render(props) { cursor = 0; const tree = output.AppModal(props); for (const effect of effects.splice(0)) effect(); return tree; },
    finishNativeWork() { for (const task of tasks.splice(0)) if (!task.cancelled) task.callback(); },
  };
}

let dismissed = 0;
const android = harness('android');
const props = { visible: true, transparent: true, onDismiss: () => dismissed++, onRequestClose() {} };
let tree = android.render(props);
assert.equal(tree.props.animationType, 'slide');
assert.equal(tree.props.onRequestClose, props.onRequestClose);
assert.equal(tree.props.transparent, true);
android.render({ ...props, visible: false });
assert.equal(dismissed, 0, 'a following modal must not open before the close commit finishes');
android.finishNativeWork();
assert.equal(dismissed, 1, 'Android runs the handoff without relying on the iOS-only native event');
android.render({ ...props, visible: false }); android.finishNativeWork();
assert.equal(dismissed, 1, 'rerenders do not repeat the handoff');
android.render(props); android.render({ ...props, visible: false }); android.render(props); android.finishNativeWork();
assert.equal(dismissed, 1, 'reopening cancels the stale handoff');

const ios = harness('ios');
ios.render(props); tree = ios.render({ ...props, visible: false }); ios.finishNativeWork();
assert.equal(dismissed, 1, 'iOS waits for the actual native dismissal');
tree.props.onDismiss(); assert.equal(dismissed, 2);
assert.equal(harness('ios', false).render(props).props.animationType, 'none', 'reduced motion disables the transition');
assert.equal(harness('android').render({ ...props, animationType: 'fade' }).props.animationType, 'slide', 'a caller cannot silently restore a competing animation');
console.log('AppModal: bottom entrance, reduced motion, Android/iOS dismissal handoffs, repeated close and rapid reopen passed.');
