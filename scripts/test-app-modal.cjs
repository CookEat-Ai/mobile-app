const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(platform, motion = true, file = 'components/ui/AppModal.tsx') {
  const slots = [], effects = [], tasks = [], animations = [];
  let cursor = 0, height = 844;
  class Value {
    constructor(value) { this.value = value; }
    setValue(value) { this.value = value; }
    interpolate(ranges) { return { value: this, ...ranges }; }
  }
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = next; }]; },
    useCallback: callback => callback,
    useEffect(effect, deps) {
      const i = cursor++, previous = slots[i];
      if (previous && deps.every((value, j) => value === previous.deps[j])) return;
      effects.push(() => { previous?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; });
    },
  };
  react.default = react;
  const output = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports: output, require(name) {
    if (name === 'react') return react;
    if (name === 'react-native') return {
      Modal: 'NativeModal', Platform: { OS: platform },
      View: 'View', StyleSheet: { create: styles => styles }, useWindowDimensions: () => ({ height }),
      Easing: { out: value => value, inOut: value => value, cubic: 'cubic' },
      Animated: { Value, View: 'AnimatedView', timing(value, options) {
        const animation = { value, options, finished: false,
          start(callback) { this.callback = callback; animations.push(this); },
          stop() { if (!this.finished) { this.finished = true; this.callback?.({ finished: false }); } },
        };
        return animation;
      } },
      InteractionManager: { runAfterInteractions(callback) {
        const task = { callback, cancelled: false }; tasks.push(task);
        return { cancel() { task.cancelled = true; } };
      } },
    };
    if (name.includes('MotionPreferences')) return { useMotionAllowed: () => motion };
    if (name.includes('ModalPresentation')) return { MODAL_ANIMATION: 'slide' };
    if (name.includes('AppTheme')) return { AppTheme: { overlay: 'rgba(8,26,16,0.38)' }, AppRadii: { sheet: 24 } };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) };
    if (name.endsWith('/AppModal')) return { AppModal: 'AppModal' };
    throw Error(name);
  } });
  return {
    render(props) { cursor = 0; const tree = (output.AppModal || output.TrackingCaptureSurface)(props); for (const effect of effects.splice(0)) effect(); return tree; },
    finishNativeWork() { for (const task of tasks.splice(0)) if (!task.cancelled) task.callback(); },
    finishAnimation() { for (const animation of animations.splice(0)) if (!animation.finished) { animation.finished = true; animation.value.setValue(animation.options.toValue); animation.callback({ finished: true }); } },
    resize(nextHeight) { height = nextHeight; },
    setMotion(value) { motion = value; },
  };
}

let dismissed = 0;
const android = harness('android');
const props = { visible: true, transparent: true, onDismiss: () => dismissed++, onRequestClose() {} };
let tree = android.render(props);
assert.equal(tree.props.animationType, 'none', 'native slide must not move the backdrop');
assert.equal(tree.props.onRequestClose, props.onRequestClose);
assert.equal(tree.props.transparent, true);
const backdrop = tree.props.children[0];
assert.equal(backdrop.type, 'View');
assert.equal(backdrop.props.style.backgroundColor, 'rgba(8,26,16,0.38)');
assert.equal(backdrop.props.style.transform, undefined, 'the dimming layer remains stationary');
const panel = backdrop.props.children[0];
assert.equal(panel.type, 'AnimatedView');
assert.equal(panel.props.style[0].backgroundColor, undefined, 'no second backdrop moves with the sheet');
const transform = panel.props.style[1].transform[0].translateY;
assert.equal(transform.outputRange.join(','), '844,0');
assert.equal(transform.value.value, 0, 'a first visible mount starts below the viewport');
tree.props.onShow({}); android.finishAnimation();
assert.equal(transform.value.value, 1);
tree = android.render({ ...props, visible: false });
assert.equal(tree.props.visible, true, 'the native host remains mounted through the exit animation');
assert.equal(dismissed, 0, 'a following modal must not open before the close commit finishes');
android.finishNativeWork(); assert.equal(dismissed, 0, 'closing the prop alone cannot trigger a handoff');
android.finishAnimation(); tree = android.render({ ...props, visible: false });
assert.equal(tree.props.visible, false);
android.finishNativeWork();
assert.equal(dismissed, 1, 'Android runs the handoff without relying on the iOS-only native event');
android.render({ ...props, visible: false }); android.finishNativeWork();
assert.equal(dismissed, 1, 'rerenders do not repeat the handoff');
tree = android.render(props); tree.props.onShow({}); android.finishAnimation();
android.render({ ...props, visible: false }); android.render(props); android.finishAnimation(); android.render(props); android.finishNativeWork();
assert.equal(dismissed, 1, 'reopening cancels the stale handoff');
android.resize(1024); tree = android.render(props);
assert.equal(tree.props.children[0].props.children[0].props.style[1].transform[0].translateY.outputRange[0], 1024, 'rotation uses the current viewport height');

const ios = harness('ios');
tree = ios.render(props); tree.props.onShow({}); ios.finishAnimation();
ios.render({ ...props, visible: false }); ios.finishAnimation(); tree = ios.render({ ...props, visible: false }); ios.finishNativeWork();
assert.equal(dismissed, 1, 'iOS waits for the actual native dismissal');
tree.props.onDismiss(); assert.equal(dismissed, 2);
assert.equal(harness('ios', false).render(props).props.animationType, 'none', 'reduced motion disables the transition');
const reduced = harness('android', false);
tree = reduced.render(props); tree.props.onShow({}); tree = reduced.render({ ...props, visible: false }); tree = reduced.render({ ...props, visible: false });
assert.equal(tree.props.visible, false); reduced.finishNativeWork(); assert.equal(dismissed, 3, 'reduced motion dismisses without waiting for animation');
const interrupted = harness('android');
tree = interrupted.render(props); tree.props.onShow({}); interrupted.finishAnimation(); interrupted.render({ ...props, visible: false }); interrupted.setMotion(false);
interrupted.render({ ...props, visible: false }); tree = interrupted.render({ ...props, visible: false });
assert.equal(tree.props.visible, false, 'enabling reduced motion during closing completes dismissal');
interrupted.finishNativeWork(); assert.equal(dismissed, 4);
const beforeShown = harness('android'); beforeShown.render(props); beforeShown.render({ ...props, visible: false });
assert.equal(beforeShown.render({ ...props, visible: false }).props.visible, false, 'closing before native onShow does not hang');
beforeShown.finishNativeWork(); assert.equal(dismissed, 5);
const committed = harness('android');
tree = committed.render(props); tree.props.onShow({}); committed.finishAnimation();
committed.render({ ...props, visible: false }); committed.finishAnimation(); committed.render({ ...props, visible: false });
committed.render(props); committed.finishNativeWork();
assert.equal(dismissed, 5, 'reopening after the close commit cancels the pending Android handoff');
const fullPage = harness('ios');
const full = fullPage.render({ ...props, transparent: false, presentationStyle: 'pageSheet', children: 'page', animationType: 'fade' });
assert.equal(full.props.animationType, 'slide', 'full pages keep a single native bottom entrance');
assert.equal(full.props.presentationStyle, 'pageSheet'); assert.equal(full.props.children[0], 'page', 'native pages have no custom animated wrapper');
assert.equal(harness('android').render({ ...props, animationType: 'fade' }).props.animationType, 'none', 'transparent callers cannot restore a second competing transition');
console.log('AppModal: fixed backdrop, panel-only motion, native pages, rotation, reduced motion, close-before-show, Android/iOS handoffs and rapid reopen passed.');

// The photo route is only a transparent host; its shared AppModal animates
// the panel, while the capture-to-review scrim stays outside that panel.
const options = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('constants/ModalPresentation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: options });
assert.equal(options.PHOTO_CAPTURE_ROUTE_OPTIONS.animation, 'none', 'native route motion would slide the dimming rectangle again');
assert.equal(options.PHOTO_CAPTURE_ROUTE_OPTIONS.presentation, 'transparentModal');
const layout = ts.createSourceFile('layout.tsx', fs.readFileSync('app/_layout.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let captureOptions;
(function visit(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(layout) === 'Stack.Screen') {
    const attrs = node.attributes.properties;
    if (attrs.some(a => ts.isJsxAttribute(a) && a.name.getText(layout) === 'name' && a.initializer?.text === 'tracking/capture'))
      captureOptions = attrs.find(a => ts.isJsxAttribute(a) && a.name.getText(layout) === 'options')?.initializer?.expression?.getText(layout);
  }
  ts.forEachChild(node, visit);
})(layout);
assert.equal(captureOptions, 'PHOTO_CAPTURE_ROUTE_OPTIONS', 'the real route must use the stationary host');
const photoSurface = harness('android', true, 'components/tracking/TrackingCaptureSurface.tsx');
const capture = photoSurface.render({ expanded: false, visible: true, children: 'camera', onRequestClose() {}, onDismiss() {} });
assert.equal(capture.type, 'AppModal');
const photoModal = harness('android').render(capture.props);
assert.equal(photoModal.props.animationType, 'none');
const fixed = photoModal.props.children[0];
assert.equal(fixed.props.style.transform, undefined);
const layers = fixed.props.children[0].props.children;
assert.equal(layers[0], capture.props.backdrop, 'the actual photo scrim is a sibling of the sliding panel');
assert.equal(layers[0].props.style[1].transform, undefined, 'the dimming layer can darken without being translated');
assert.equal(layers[1].type, 'AnimatedView');
assert.equal(layers[1].props.children[0], capture.props.children, 'only the capture surface moves');
console.log('Photo modal: stationary route and real capture scrim outside the moving panel passed.');
