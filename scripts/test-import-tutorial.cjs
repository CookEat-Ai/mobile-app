const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
const jsx = (type, props, ...children) => ({ type, props: { ...props, children } });
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];

function screen(external, branch, platform = 'ios', variantFails = false) {
  const slots = [], effects = [], events = [], routes = []; let cursor = 0, tree;
  const react = { __esModule: true, createElement: jsx,
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], next => { slots[index] = next; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useEffect(effect, dependencies) { const index = cursor++; if (slots[index]) return; slots[index] = dependencies; effects.push(effect); },
  }; react.default = react;
  class Value { constructor(value) { this.value = value; } }
  const animation = () => ({ start() {}, stop() {} });
  const dependencies = {
    react,
    'react-native': { Animated: { Value, View: 'AnimatedView', timing: animation, spring: animation, parallel: animation }, Easing: { out: value => value, back() {} },
      Platform: { OS: platform }, StyleSheet: { create: value => value }, View: 'View', Text: 'Text', FlatList: 'FlatList' },
    'expo-image': { Image: 'Image' }, 'expo-asset': { Asset: { loadAsync: async () => {} } },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-router': { useLocalSearchParams: () => ({ isFromImport: external ? 'true' : undefined }), router: { back: () => routes.push('back'), replace: route => routes.push(route) } },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '../../constants/AppTheme': require('./helpers/ui-theme.cjs'),
    '../../constants/Colors': { Colors: { light: {} } },
    '../../hooks/useResponsive': { useResponsive: () => ({ layoutWidth: 390, gutter: 20 }), contentColumn: () => ({ width: '100%', maxWidth: 1040 }) },
    '../../services/haptics': { feedback: { selection() {} } },
    '../../components/NavigationIconButton': { NavigationIconButton: 'CloseButton' },
    '../../services/analytics': { __esModule: true, default: {
      getEntryFeature: async () => branch,
      getOnboardingVariant: async () => { if (variantFails) throw new Error('offline'); return 'C'; },
      track: async (...event) => events.push(event),
    } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/onboarding/videoImportTutorial.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    if (dependencies[name]) return dependencies[name];
    if (name.endsWith('.png')) return name;
    throw new Error('Unexpected tutorial dependency: ' + name);
  } });
  const render = () => {
    cursor = 0;
    const wrapper = exports.default();
    assert.equal(wrapper.type, 'SafeAreaProvider', 'safe areas are measured within the native modal');
    const content = wrapper.props.children[0];
    tree = content.type(content.props);
    for (const effect of effects.splice(0)) effect();
    return tree;
  };
  return { render, routes, events, close: () => nodes(tree).find(node => node.type === 'CloseButton').props.onPress(), get tree() { return tree; } };
}

function findSource(file, predicate) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) { if (predicate(node, ast)) found = node; ts.forEachChild(node, visit); }
  visit(ast); assert(found, `missing source in ${file}`); return { found, ast };
}
function modalOptions(file, name) {
  const { found, ast } = findSource(file, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'Stack.Screen'
    && node.attributes.properties.some(attr => attr.name?.getText() === 'name' && attr.initializer?.text === name));
  const expression = found.attributes.properties.find(attr => attr.name?.getText() === 'options').initializer.expression.getText(ast);
  return vm.runInNewContext(`(${expression})`, { MODAL_ROUTE_ANIMATION: 'slide_from_bottom' });
}
function handler(file, name, context) {
  const { found, ast } = findSource(file, node => ts.isVariableDeclaration(node) && node.name.getText() === name);
  return vm.runInNewContext(ts.transpileModule(`(${found.initializer.getText(ast)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
}

(async () => {
  for (const [file, name] of [['app/_layout.tsx', 'import-tutorial'], ['app/onboarding/_layout.tsx', 'videoImportTutorial']]) {
    const options = modalOptions(file, name);
    assert.equal(options.presentation, 'modal'); assert.equal(options.animation, 'slide_from_bottom');
  }
  const routes = [];
  const pending = { current: 'share' };
  handler('components/MealImportButton.tsx', 'finishDismiss', { pending, router: { push: route => routes.push(route) }, setLink() {} })();
  assert.equal(routes[0].pathname, '/import-tutorial', 'sharing help opens in the root modal stack above the current tab');
  assert.equal(routes[0].params.isFromImport, 'true'); assert.equal(pending.current, null);
  assert(!fs.readFileSync('app/(tabs)/imported.tsx', 'utf8').includes('FlatList'), 'the retired imported screen cannot render its old layout');
  for (const variant of ['E', 'F']) {
    const actions = [];
    await handler('app/onboarding/ahaMoment.tsx', 'handleSkip', {
      analytics: { track() {}, getOnboardingVariant: async () => variant },
      router: { push: route => actions.push(route), replace() { throw new Error('a modal needs its underlying screen'); } },
    })();
    assert.equal(actions[0], '/onboarding/videoImportTutorial');
  }
  const { StackRouter } = require('../node_modules/expo-router/build/react-navigation/routers/StackRouter');
  const rootRouter = StackRouter({ initialRouteName: '(tabs)' });
  const rootOptions = { routeNames: ['(tabs)', 'onboarding', 'import-tutorial'], routeParamList: {}, routeGetIdList: {} };
  const initial = rootRouter.getInitialState(rootOptions);
  const opened = rootRouter.getStateForAction(initial, { type: 'PUSH', payload: { name: 'import-tutorial', params: routes[0].params } }, rootOptions);
  assert.equal(opened.routes[0].key, initial.routes[0].key, 'opening retains the existing tab screen beneath the modal');
  const closed = rootRouter.getStateForAction(opened, { type: 'POP', payload: { count: 1 } }, rootOptions);
  assert.equal(closed.routes.length, 1); assert.equal(closed.routes[0].key, initial.routes[0].key, 'native back returns to the same tab instance');
  for (const platform of ['ios', 'android']) for (const branch of ['generate', 'import']) {
    const external = screen(true, branch, platform); external.render();
    external.close(); assert.equal(external.routes[0], 'back', 'help can close before branch resolution');
    await tick(); external.render();
    assert.equal(nodes(external.tree).filter(node => node.type === 'CloseButton').length, 1);
    assert.equal(nodes(external.tree).find(node => node.type === 'CloseButton').props.kind, 'close');
    const carousel = nodes(external.tree).find(node => node.type === 'FlatList');
    assert.equal(carousel.props.data.length, 6, 'the six tutorial steps remain available');
    assert(carousel.props.data[0].includes('/' + platform + '/'), 'each platform keeps its screenshots');
    const onboarding = screen(false, branch, platform); onboarding.render(); await tick(); onboarding.render(); onboarding.close();
    assert.equal(onboarding.routes[0], '/onboarding/weeklyPlanPreview', 'the cross replaces the removed onboarding footer without a dead end');
    await tick(); assert(onboarding.events.some(([name]) => name === 'onboarding_video_import_tutorial_continue'));
  }
  const offline = screen(false, 'generate', 'ios', true); offline.render(); await tick(); offline.render(); offline.close(); await tick();
  assert.equal(offline.routes[0], '/onboarding/weeklyPlanPreview', 'analytics failure cannot prevent closing the tutorial');
  console.log('Import tutorial passed: native modal registration, sharing help entry point, retired screen removal, retained underlying screens, native back, scoped safe areas, close control and onboarding continuation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
