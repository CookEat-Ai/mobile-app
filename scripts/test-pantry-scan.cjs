const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
const jsx = (type, props, ...children) => ({ type, props: { ...props, children } });
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const text = node => node == null ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
function harness(filename, dependencies = {}, options = {}) {
  const slots = []; let cursor = 0; const effects = [];
  const react = { __esModule: true, createElement: jsx,
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useCallback: fn => fn, useMemo: fn => fn(), useEffect: (fn, deps) => {
      const index = cursor++; const previous = slots[index];
      if (!options.effects || (previous && deps && deps.length === previous.length && deps.every((value, i) => value === previous[i]))) return;
      slots[index] = deps; effects.push(fn);
    },
  }; react.default = react;
  class Value { setValue() {} stopAnimation() {} interpolate() { return 0; } }
  const animation = () => ({ start() {}, stop() {} });
  const rn = { __esModule: true, Platform: { OS: 'ios' }, StyleSheet: { create: styles => styles, absoluteFill: {} },
    Animated: { Value, View: 'AnimatedView', Text: 'AnimatedText', createAnimatedComponent: type => type, timing: animation, spring: animation, loop: animation, sequence: animation, parallel: animation },
    Easing: { inOut: fn => fn, quad() {}, linear() {}, out: fn => fn, ease() {} }, PanResponder: { create: () => ({ panHandlers: {} }) },
    Keyboard: { dismiss() {} }, BackHandler: { addEventListener: () => ({ remove() {} }) }, FlatList: 'FlatList', TextInput: 'TextInput', KeyboardAvoidingView: 'KeyboardAvoidingView', Modal: 'Modal', ActivityIndicator: 'ActivityIndicator', View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', TouchableOpacity: 'TouchableOpacity',
  };
  const deps = { react, 'react-native': rn, 'expo-image': { Image: 'Image' }, '@expo/vector-icons': { Ionicons: 'Icon' },
    '../ui/AppModal': { AppModal: 'Modal' },
    'expo-router': { Stack: { Screen: 'StackScreen' } }, 'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    '../../hooks/useResponsive': { useResponsive: () => ({ gutter: 20 }) }, 'react-i18next': { useTranslation: () => ({ t: key => key }) }, ...dependencies };
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports: mod.exports, require: name => deps[name] || (name.endsWith('/services/analytics') ? { __esModule: true, default: { track: async () => {} } } : undefined) || new Proxy({ __esModule: true }, { get: (o, key) => key in o ? o[key] : String(key) }) });
  return { native: rn, render(fn) { cursor = 0; const tree = fn(mod.exports); for (const effect of effects.splice(0)) effect(); return tree; } };
}
const h = harness('components/planning/PantryScanView.tsx', {
  '../../services/planningPantry': { normalizePantryIngredients: names => [...new Set(names)], pantryIngredientKey: name => name.toLowerCase() },
  '../../contexts/MotionPreferences': { useMotionAllowed: () => false },
});
const props = { photoUris: ['file:///fridge.jpg', 'file:///pantry.jpg'], ingredients: null, saving: false, onConfirm() {}, onRetake() {}, onBack() {} };
function scanView(value) { return h.render(mod => {
  const root = mod.PantryScanView(value);
  const provider = root.type === 'Modal' ? root.props.children[0] : root;
  const child = provider.props.children[0];
  const content = child.type(child.props);
  return root.type === 'Modal' ? { ...root, props: { ...root.props, children: [content] } } : content;
}); }
const loading = scanView(props);
assert.equal(loading.type, 'Modal', 'only analysis is a native full-screen surface');
assert.equal(loading.props.presentationStyle, 'fullScreen');
assert.equal(loading.props.onRequestClose, props.onBack, 'analysis can be cancelled with Android back');
assert(!nodes(loading).some(node => node.type === 'PlanningFlowHeader'), 'analysis reserves no onboarding header');
assert(!nodes(loading).some(node => node.type === 'NavigationIconButton'), 'analysis shows no close button');
assert(!nodes(loading).some(node => node.type === 'ScrollView'), 'analysis fills its screen instead of scrolling a fixed-ratio card');

assert.equal(nodes(scanView(props)).filter(node => node.type === 'Image').length, 2, 'photos remain visible while analysis runs');
for (const ingredients of [['Tomate', 'Riz'], []]) {
  const tree = scanView({ ...props, ingredients });
  assert.equal(nodes(tree).filter(node => node.type === 'Image').length, 0, 'completed analysis never redisplays photos, even for an empty result');
  const review = nodes(tree).find(node => node.type === 'PantryIngredientReview');
  assert(review, 'scan and manual entry use the same review');
  assert.equal(review.props.onBack, props.onBack, 'back is separate from retaking');
  assert.equal(review.props.onRetake, props.onRetake);
  assert(!nodes(tree).some(node => node.type === 'PantryModeChoice'), 'review never asks for a shopping rule');

}
const headerHarness = harness('components/planning/PlanningFlowHeader.tsx');
const modalHeaderTree = headerHarness.render(mod => mod.PlanningFlowHeader({ onClose: props.onBack, closeDisabled: true }));
const closeButton = nodes(modalHeaderTree).find(node => node.type === 'NavigationIconButton');
assert.equal(closeButton.props.kind, 'close');
assert.equal(closeButton.props.disabled, true, 'close is disabled while saving');
const headerRow = nodes(modalHeaderTree).find(node => node.type === 'View' && node.props.children.some(child => child?.type === 'NavigationIconButton'));
assert.equal(headerRow.props.children.at(-1), closeButton, 'close follows the brand on the right');
const modeChoice = harness('components/planning/PantryModeChoice.tsx');
const choiceTree = modeChoice.render(mod => mod.PantryModeChoice({ value: null, onChange() {} }));
assert.equal(nodes(choiceTree).filter(node => node.type === 'Pressable' && node.props.accessibilityState.checked).length, 0, 'neither option is selected initially');

const pantryRules = { normalizePantryIngredients: names => [...new Set(names.map(name => name.trim()))], pantryIngredientKey: name => name.toLowerCase().replace(/œ/g, 'oe') };
const feedback = new Proxy({}, { get: () => () => Promise.resolve() });
const reviewHarness = harness('components/planning/PantryIngredientReview.tsx', {
  '../../services/planningPantry': pantryRules,
});
let reviewConfirmed;
const reviewProps = { ingredients: ['Riz', 'Tomate'], saving: false, recognized: true, onConfirm: names => { reviewConfirmed = names; }, onBack() {}, onRetake() {} };
const reviewRender = () => reviewHarness.render(mod => mod.PantryIngredientReview(reviewProps));
let reviewTree = reviewRender();
assert(!nodes(reviewTree).some(node => node.type === 'PantryModeChoice'));
const reviewHeader = nodes(reviewTree).find(node => node.type === 'PlanningFlowHeader');
assert.equal(reviewHeader.props.onClose, reviewProps.onBack, 'closing the review keeps its cancellation behavior');
assert.equal(reviewHeader.props.onBack, undefined, 'review has no back button');
nodes(reviewTree).find(node => node.type === 'PantryReviewSection').props.onChange(['Tomate', 'Avocat']);
reviewTree = reviewRender();
nodes(reviewTree).find(node => node.type === 'Pressable' && text(node).includes('pantryScan.confirm')).props.onPress();
assert.equal(reviewConfirmed.join(','), 'Tomate,Avocat', 'the single CTA confirms the corrected inventory');
const suggestions = [{ id: 'avocat', name: 'Avocat', icon: '🥑' }, { id: 'avoine', name: 'Avoine', icon: '🌾' }];
const searchHarness = harness('components/planning/PantryIngredientSearchModal.tsx', {
  '../../services/planningPantry': pantryRules,
  '../../services/ingredientCategories': { ingredientCategories: () => [{ id: 'legumes', title: 'Légumes', icon: '🥬', ingredients: [suggestions[0]] }, { id: 'cereales', title: 'Céréales', icon: '🌾', ingredients: [suggestions[1]] }] },
  '../../services/pantryIngredientSearch': { pantrySearchGroups: (groups, query) => groups.map(group => ({ ...group, ingredients: group.ingredients.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) })).filter(group => group.ingredients.length) },
  '../../services/haptics': { feedback }, '../../contexts/MotionPreferences': { useMotionAllowed: () => false },
});
let searchIngredients = ['Riz'], searchCloses = 0;
const searchRender = () => searchHarness.render(mod => {
  const modal = mod.PantryIngredientSearchModal({ visible: true, ingredients: searchIngredients, onChange: next => { searchIngredients = next; }, onClose: () => { searchCloses++; } });
  const child = modal.props.children[0].props.children[0];
  return child.type(child.props);
});
let searchTree = searchRender();
let categoryList = nodes(searchTree).find(node => node.type === 'FlatList');
assert.equal(categoryList.props.data.length, 2, 'initial view contains only closed categories');
const vegetableCategory = categoryList.props.data[0];
categoryList.props.renderItem({ item: vegetableCategory }).props.onPress();
searchTree = searchRender(); categoryList = nodes(searchTree).find(node => node.type === 'FlatList');
assert.equal(categoryList.props.data.filter(row => row.kind === 'ingredient').length, 1, 'expanding a category shows only its foods');
categoryList.props.renderItem({ item: categoryList.props.data[0] }).props.onPress();
searchTree = searchRender(); categoryList = nodes(searchTree).find(node => node.type === 'FlatList');
assert.equal(categoryList.props.data.filter(row => row.kind === 'ingredient').length, 0, 'category closes again');
nodes(searchTree).find(node => node.type === 'TextInput').props.onChangeText('avo');
searchTree = searchRender();
let list = nodes(searchTree).find(node => node.type === 'FlatList');
assert.equal(list.props.data.filter(row => row.kind === 'ingredient').length, 2, 'search opens matching categories automatically');
list.props.renderItem({ item: list.props.data.find(row => row.kind === 'ingredient' && row.item.id === 'avocat') }).props.onPress();
searchTree = searchRender(); list = nodes(searchTree).find(node => node.type === 'FlatList');
list.props.renderItem({ item: list.props.data.find(row => row.kind === 'ingredient' && row.item.id === 'avoine') }).props.onPress();
assert.equal(searchIngredients.join(','), 'Riz,Avocat,Avoine', 'multiple ingredients can be added in one search session');
assert.equal(searchCloses, 0, 'adding never closes the sheet');
searchTree = searchRender();
nodes(searchTree).find(node => node.type === 'TextInput').props.onChangeText('Tempeh fumé');
searchTree = searchRender(); list = nodes(searchTree).find(node => node.type === 'FlatList');
assert.equal(list.props.data.length, 0);
nodes(list.props.ListEmptyComponent).find(node => node.type === 'Pressable').props.onPress();
assert.equal(searchIngredients.join(','), 'Riz,Avocat,Avoine,Tempeh fumé', 'an unmatched name can be added without a category screen');
searchTree = searchRender();
nodes(searchTree).find(node => node.type === 'Pressable' && text(node).includes('pantryReview.done')).props.onPress();
assert.equal(searchCloses, 1, 'Done returns to the existing review');

function camera() {
  let back = 0, calls = 0, resolve; const writes = [];
  const alerts = [];
  const pending = new Promise(done => { resolve = done; });
  const feedback = new Proxy({}, { get: () => () => Promise.resolve() });
  const c = harness('app/camera.tsx', {
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}, () => Promise.resolve()] },
    'expo-router': { Stack: { Screen: 'StackScreen' }, router: { back: () => { back++; }, push: () => { throw new Error('must not stack another camera'); } }, useGlobalSearchParams: () => ({ planningPantry: 'true' }), useNavigation: () => ({ addListener: () => () => {} }) },
    'expo-video': { useVideoPlayer: () => null }, 'react-native-svg': { Circle: 'Circle' },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', useSafeAreaInsets: () => ({ top: 62, bottom: 34, left: 7, right: 9 }) },
    '../constants/Colors': { Colors: { light: {} } }, '../constants/Layout': { rw: value => value },
    '../hooks/useResponsive': { contentColumn: () => ({}) },
    'expo-image-manipulator': { manipulateAsync: async uri => ({ uri }), SaveFormat: { JPEG: 'jpeg' } },
    '../services/haptics': { feedback }, '../services/api': { __esModule: true, default: { processImageIngredients: () => { calls++; return pending; } } },
    '../components/planning/PantryScanView': { PantryScanView: 'PantryScanView' },
    '../components/CameraShutterButton': { CameraShutterButton: 'TouchableOpacity' },
    '../services/pantryScanHandoff': { PANTRY_SCAN_HANDOFF_KEY: 'handoff', createPantryScanHandoff: (names, mode) => JSON.stringify({ ingredients: names, pantryMode: mode }) },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { setItem: async (key, value) => { writes.push({ key, value }); } } },
  });
  c.native.Alert = { alert: (...args) => alerts.push(args) };
  let tree;
  const render = () => { tree = c.render(mod => { const provider = mod.default(); const child = provider.props.children[0]; return child.type(child.props); }); const view = nodes(tree).find(node => node.type === 'CameraView'); if (view) view.props.ref.current = { takePictureAsync: async () => ({ uri: 'file:///fridge.jpg' }) }; return tree; };
  const capture = () => nodes(tree).find(node => node.type === 'TouchableOpacity' && typeof node.props.disabled === 'boolean').props.onPress();
  const finish = () => nodes(tree).find(node => node.type === 'TouchableOpacity' && text(node).includes('pantryReview.analyzePhotos')).props.onPress();
  const initial = render();
  const topBar = nodes(initial).find(node => Array.isArray(node.props?.style) && node.props.style.some(style => style?.paddingTop === 74));
  assert(topBar, 'camera header clears the actual top safe area');
  assert.equal(topBar.props.style[1].paddingLeft, 27);
  assert.equal(topBar.props.style[1].paddingRight, 29);
  return { render, capture, finish, resolve, writes, alerts, get back() { return back; }, get calls() { return calls; } };
}
(async () => {
  const confirmed = camera(); await confirmed.capture(); confirmed.render();
  const extraction = confirmed.finish(); await tick();
  confirmed.resolve({ data: { ingredients: [{ name: 'Riz' }] } }); await extraction;
  const resultAfterExtraction = confirmed.render();
  await Promise.all([resultAfterExtraction.props.onConfirm(['Riz', 'Tomate']), resultAfterExtraction.props.onConfirm(['Riz'])]);
  assert.equal(confirmed.writes.length, 1, 'double tap saves only one handoff');
  const saved = JSON.parse(confirmed.writes[0].value);
  assert.equal(saved.pantryMode, undefined, 'review does not choose the shopping rule');
  assert.equal(saved.ingredients.join(','), 'Riz,Tomate', 'edited list is saved for the next screen');
  assert.equal(confirmed.back, 1);
  for (const mode of ['strict', 'priority']) {
    let confirmed;
    const value = { pantryIngredients: ['Riz'], pantryMode: 'priority' };
    const main = harness('components/planning/PlanningPantry.tsx', {
      'expo-router': { useFocusEffect: fn => fn() },
      '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => JSON.stringify({ ingredients: ['Tomate'], pantryMode: mode }), removeItem: async () => {} } },
      '../../services/pantryScanHandoff': { PANTRY_SCAN_HANDOFF_KEY: 'handoff', readPantryScanHandoff: raw => ({ ...JSON.parse(raw), replace: true }) },
    });
    main.render(mod => mod.PlanningPantry({ value, active: true, onChange() { throw new Error('must confirm atomically'); }, onConfirm: next => { confirmed = next; } }));
    await tick(); assert.equal(confirmed.pantryMode, mode); assert.equal(confirmed.pantryIngredients.join(','), 'Tomate');
    assert.equal(value.pantryIngredients.join(','), 'Riz', 'handoff cannot mutate the existing draft');
  }
  const completed = camera(); await completed.capture(); completed.render();
  const completion = completed.finish(); await tick();
  completed.resolve({ data: { ingredients: [{ name: 'Riz' }] } }); await completion;
  const result = completed.render(); assert.equal(result.type, 'PantryScanView'); assert.equal(result.props.ingredients.join(','), 'Riz');
  result.props.onRetake(); assert.equal(completed.back, 0, 'retake stays in the existing route');
  const fresh = completed.render(); assert(nodes(fresh).some(node => node.type === 'CameraView'));
  assert(!nodes(fresh).some(node => text(node).includes('pantryReview.analyzePhotos')), 'retake clears old captures');
  nodes(fresh).find(node => node.type === 'NavigationIconButton').props.onPress();
  assert.equal(completed.back, 1, 'closing after retake exits in one action, with no stale-photo reset');
  const cancelled = camera(); await cancelled.capture(); cancelled.render();
  const completionAfterBack = cancelled.finish(); await tick();
  cancelled.render().props.onBack(); assert.equal(cancelled.back, 1);
  cancelled.resolve({ data: { ingredients: [{ name: 'Late result' }] } }); await completionAfterBack;
  assert.equal(cancelled.render().props.ingredients, null, 'a response after leaving cannot restore the scan result');
  const retry = camera(); await retry.capture(); retry.render();
  const oldCompletion = retry.finish(); await tick(); retry.render().props.onRetake();
  retry.resolve({ data: { ingredients: [{ name: 'Old result' }] } }); await oldCompletion;
  assert(nodes(retry.render()).some(node => node.type === 'CameraView'), 'an old request cannot reopen results over a new capture');
  const failed = camera(); await failed.capture(); failed.render();
  const failure = failed.finish(); await tick();
  failed.resolve({ error: 'Unable to analyse' }); await failure;
  assert.equal(failed.alerts.length, 1, 'analysis failure is shown');
  assert.equal(failed.render().type, 'PantryScanView', 'the error alert is presented before dismissing full-screen analysis');
  failed.alerts[0][2][0].onPress();
  const recovered = failed.render();
  assert(nodes(recovered).some(node => node.type === 'CameraView'), 'dismissing the error returns to capture');
  assert(nodes(recovered).some(node => text(node).includes('pantryReview.analyzePhotos')), 'failed analysis keeps photos for retry');

  const configureTranslation = key => key;
  const configureHarness = harness('app/planning/configure.tsx', {
    '../../services/pantryDefaults': { loadSavedPantryIngredientNames: async () => null, savePantryIngredientNames: async () => {} },
    'expo-router': { router: { back() {}, push() { throw new Error('review cannot generate immediately'); } }, useLocalSearchParams: () => ({}), useFocusEffect() {} },
    'react-i18next': { useTranslation: () => ({ t: configureTranslation, i18n: { language: 'fr' } }) },
    '../../hooks/useResponsive': { contentColumn: () => ({}), useResponsive: () => ({ gutter: 20 }) },
    '../../hooks/usePlanningClock': { usePlanningClock: () => ({ weekStart: '2026-10-14', now: new Date('2026-10-14T12:00:00Z') }) },
    '../../services/haptics': { feedback },
    '../../services/api': { apiService: { getCatalogCuisines: async () => ({ data: { cuisines: [] } }) } },
    '../../services/fitnessProfile': { loadFitnessProfile: async () => ({ goal: 'gain_muscle' }) },
    '../../services/nutritionModel': { FITNESS_GOALS: ['gain_muscle'] },
    '../../services/presentationMode': { isPresentationModeEnabled: async () => false },
    '../../services/ingredientCategories': { ingredientCategories: () => [] },
    '../../services/planningConfiguration': {
      planningSteps: () => ['goal', 'days', 'ingredients', 'duration', 'cuisines', 'diet', 'exclusions', 'servings'],
      planningChoiceDraft: settings => settings, planningStepCanContinue: () => true, planningStepAfterScan: () => 'duration',
    },
    '../../services/weeklyPlanning': { loadPlanningGenerationSettings: async () => ({ cookingDays: [1, 3], duration: 'fast', servings: 1, diet: 'none', cuisineIds: [], excludedIngredients: [], pantryIngredients: [], pantryMode: 'priority' }), PLANNING_DIETS: [], startOfWeekMondayKey: () => '2026-10-12' },
  }, { effects: true });
  const configureRender = () => configureHarness.render(mod => mod.default());
  configureRender(); await tick();
  let configTree = configureRender();
  nodes(configTree).find(node => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === 'fitnessOnboarding.options.goal.gain_muscle').props.onPress();
  configTree = configureRender();
  nodes(configTree).find(node => node.type === 'TouchableOpacity' && text(node).includes('common.continue')).props.onPress();
  configTree = configureRender();
  nodes(configTree).find(node => node.type === 'PlanningPantry').props.onConfirm({ pantryIngredients: ['Riz', 'Avocat'], pantryMode: 'priority' });
  configTree = configureRender();
  let mode = nodes(configTree).find(node => node.type === 'PantryModeChoice');
  assert(mode, 'review confirmation opens the distinct shopping state');
  assert.equal(mode.props.value, null);
  assert(!nodes(configTree).some(node => node.type === 'TouchableOpacity' && text(node).includes('pantryScan.confirm')), 'shopping state has no redundant confirmation');
  mode.props.onChange('strict');
  configTree = configureRender();
  assert(nodes(configTree).some(node => node.type === 'Choice' || node.type?.name === 'Choice'), 'choosing a shopping rule advances to duration');
  nodes(configTree).find(node => node.type === 'PlanningFlowHeader').props.onBack();
  configTree = configureRender();
  assert(nodes(configTree).some(node => node.type === 'PantryModeChoice'), 'back from duration returns to the shopping state');
  nodes(configTree).find(node => node.type === 'PlanningFlowHeader').props.onBack();
  configTree = configureRender();
  assert(!nodes(configTree).some(node => node.type === 'PantryModeChoice'), 'back from shopping returns to inventory correction');
  const draft = nodes(configTree).find(node => node.type === 'PlanningPantry').props.value;
  assert.equal(draft.pantryIngredients.join(','), 'Riz,Avocat'); assert.equal(draft.pantryMode, 'strict');
  nodes(configTree).find(node => node.type === 'PlanningPantry').props.onConfirm({ ...draft, pantryIngredients: [] });
  configTree = configureRender();
  assert(!nodes(configTree).some(node => node.type === 'PantryModeChoice'), 'empty inventory skips the shopping question');
  assert(nodes(configTree).some(node => node.type === 'Choice' || node.type?.name === 'Choice'));

  console.log('Pantry scan passed: photos only during analysis, separate back/retake, fresh capture, no stacked route and stale-response cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
