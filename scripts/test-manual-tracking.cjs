const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
const data = new Map();
const storage = { getItem: async key => data.get(key) || null, setItem: async (key, value) => { data.set(key, value); } };
const service = {};
vm.runInNewContext(compile('services/mealTracking.ts'), { exports: service, require: () => storage, Date, Set, Number, Promise, encodeURIComponent });
const t = key => key;
const rice = { id: 'rice', name: 'Riz cuit', foodKey: 'cookedRice', grams: 200, per100g: { calories: 130, proteins: 2.7, carbs: 28, fats: .3 }, visible: false, box: null };
function harness(file, exportName, dependencies = {}) {
  const slots = [], effects = [], cleanups = new Map(); let cursor = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] || (slots[i] = { current: initial }); },
    useCallback: callback => callback,
    useEffect(effect, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i][j])) { cleanups.get(i)?.(); effects.push(() => cleanups.set(i, effect())); } slots[i] = deps; },
  }; React.default = React;
  const exports = {};
  vm.runInNewContext(compile(file), { exports, Date, Set, Map, Number, Promise, setTimeout, clearTimeout, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react') return React;
    if (name === 'react-native') return { View: 'View', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'Button', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x }, Platform: { OS: 'ios' }, Keyboard: { addListener: () => ({ remove() {} }) } };
    if (name === 'react-i18next') return { useTranslation: () => ({ t, i18n: { language: 'fr' } }) };
    if (name.includes('AppTheme')) return require('./helpers/ui-theme.cjs');
    if (name.includes('mealTracking')) return service;
    if (name.includes('anonymousSession')) return {getAnonymousUserId: async () => 'manual-user'};
    if (name.includes('vector-icons')) return { Ionicons: 'Icon' };
    if (name === 'expo-image') return { Image: 'Image' };
    if (name.includes('safe-area')) return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (name.endsWith('/AppModal')) return { AppModal: 'Modal' };
    if (name.includes('NavigationIconButton')) return { NavigationIconButton: 'Navigation' };
    if (name.includes('NutritionEditor')) return { NutritionEditor: 'Editor' };
    if (name.includes('FoodPhotoThumbnail')) return { FoodPhotoThumbnail: 'Thumbnail' };
    if (name.includes('TrackingMealChat')) return { TrackingMealChat: 'Chat' };
    if (name.includes('MealNutritionSummary')) return { MealNutritionSummary: 'Nutrition' };
    throw Error(name);
  } });
  return { render(props) { cursor = 0; const tree = exports[exportName](props); while (effects.length) effects.shift()(); return tree; }, unmount() { for (const cleanup of cleanups.values()) cleanup?.(); } };
}
function all(tree, type) { if (!tree || typeof tree !== 'object') return []; return [...(tree.type === type ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, type))]; }
function text(tree) { if (typeof tree === 'string') return tree; if (!tree || typeof tree !== 'object') return ''; return [tree.props?.children].flat(Infinity).map(text).join(''); }
const button = (tree, label) => all(tree, 'Button').find(node => text(node) === label);
(async () => {
  const yesterday = service.shiftTrackingDate(service.trackingDateKey(), -1);
  let params = { date: yesterday }, back = 0, fail = false, calls = 0;
  const route = harness('app/tracking/manual.tsx', 'default', {
    'expo-router': { useLocalSearchParams: () => params, router: { back: () => { back++; } }, Stack: { Screen: 'Screen' } },
    'react-native-uuid': { v4: () => 'stable-id' },
    '../../components/tracking/PhotoMealReview': { PhotoMealReview: 'Review' },
    '../../services/anonymousSession': { getAnonymousUserId: async () => 'manual-user' },
    '../../services/mealTracking': { ...service, saveTrackedMeal: async (...args) => { calls++; if (fail) throw Error('disk full'); return service.saveTrackedMeal(...args); } },
    '../../services/analytics': { __esModule: true, default: { track: async () => {} } },
    '../../services/haptics': { feedback: { success() {} } },
  });
  let review = all(route.render(), 'Review')[0];
  review.props.onSave(); await tick(); assert.equal(calls, 0, 'empty meal cannot save');
  review.props.onTitle('Riz'); review.props.onItems([rice]); review.props.onMealType('dinner');
  fail = true; all(route.render(), 'Review')[0].props.onSave(); await tick();
  review = all(route.render(), 'Review')[0]; assert.equal(review.props.error, 'tracking.saveError'); assert.equal(review.props.items[0].grams, 200, 'save error retains the draft');
  fail = false; review.props.onSave(); review.props.onSave(); await tick();
  assert.equal(calls, 2, 'double tap does not duplicate save'); assert.equal(back, 1);
  let records = await service.loadTrackedMeals('manual-user'); assert.equal(records.length, 1);
  assert.equal(records[0].date, yesterday); assert.equal(records[0].source, 'manual'); assert.equal(records[0].photoUri, undefined); assert.equal(records[0].nutrition.calories, 260);
  assert.equal(service.trackingTotals(records, yesterday).calories, 260); assert.equal(service.trackingTotals(records, service.trackingDateKey()).calories, 0);
  params = { entryId: 'stable-id' };
  const edit = harness('app/tracking/manual.tsx', 'default', {
    'expo-router': { useLocalSearchParams: () => params, router: { back() {} }, Stack: { Screen: 'Screen' } },
    'react-native-uuid': { v4: () => 'unused-id' },
    '../../components/tracking/PhotoMealReview': { PhotoMealReview: 'Review' },
    '../../services/anonymousSession': { getAnonymousUserId: async () => 'manual-user' },
    '../../services/analytics': { __esModule: true, default: { track: async () => {} } },
    '../../services/haptics': { feedback: { success() {} } },
  });
  edit.render(); await tick(); review = all(edit.render(), 'Review')[0]; assert(review.props.editing);
  review.props.onItems([{ ...rice, grams: 100 }]); all(edit.render(), 'Review')[0].props.onSave(); await tick();
  records = await service.loadTrackedMeals('manual-user'); assert.equal(records.length, 1); assert.equal(records[0].nutrition.calories, 130); assert.equal(records[0].date, yesterday); assert.equal(records[0].id, 'stable-id');
  assert.equal((await service.loadTrackedMeals('other-user')).length, 0);

  let props = { manual: true, title: '', items: [], analysis: null, mealType: null, dateLabel: yesterday, saving: false, error: '', onTitle: value => { props.title = value; }, onItems: value => { props.items = value; }, onMealType: value => { props.mealType = value; }, onSave() {}, onBack() {} };
  let lookupOffline = false;
  const ui = harness('components/tracking/PhotoMealReview.tsx', 'PhotoMealReview', {
    '../../services/api': { apiService: { searchTrackingFoods: async () => {if(lookupOffline) throw Error('offline');return ({ data: { foods: [{ foodKey: rice.foodKey, name: rice.name, description: 'cuit', sourceId: 'USDA', per100g: rice.per100g }] } });} } },
  });
  let tree = ui.render(props); assert(button(tree, 'tracking.addToDay').props.disabled); assert.equal(all(tree, 'Nutrition').length, 0, 'empty manual entry shows food action without a partial photo summary');
  button(tree, 'tracking.dinner').props.onPress(); button(tree, 'tracking.addFood').props.onPress(); ui.render(props);
  await new Promise(resolve => setTimeout(resolve, 280)); tree = ui.render(props);
  const choice = all(tree, 'Button').find(node => text(node).startsWith('Riz cuit')); assert(choice, 'food search is available without photo or scan'); choice.props.onPress();
  tree = ui.render(props); assert.equal(props.title, 'Riz cuit'); assert.equal(props.items.length, 1); assert(!button(tree, 'tracking.addToDay').props.disabled);
  assert.equal(all(tree, 'Image').length, 0, 'manual review never needs a photo');
  let grams = all(tree, 'TextInput').find(node => node.props.accessibilityLabel === 'tracking.foodGrams'); grams.props.onChangeText('250');
  assert.equal(service.foodNutrition(props.items).calories, 325);
  tree = ui.render(props); grams = all(tree, 'TextInput').find(node => node.props.accessibilityLabel === 'tracking.foodGrams'); grams.props.onChangeText('0');
  assert(button(ui.render(props), 'tracking.addToDay').props.disabled, 'zero grams blocks save');
  grams.props.onChangeText('2001'); assert(button(ui.render(props), 'tracking.addToDay').props.disabled, 'out of range blocks save');
  grams.props.onChangeText('100'); tree = ui.render(props); all(tree, 'Button').find(node => node.props.accessibilityLabel === 'tracking.removeFood').props.onPress();
  assert(button(ui.render(props), 'tracking.addToDay').props.disabled, 'removing last food blocks save');
  // New custom foods work without a catalog result or photo.
  button(ui.render(props), 'tracking.createFood').props.onPress(); tree = ui.render(props);
  await all(tree, 'Editor')[0].props.onApply({calories: 125, proteins: 8.5, carbs: 10, fats: 5}, {name: 'Yaourt maison', grams: 150});
  tree = ui.render(props); assert.equal(props.items[0].name, 'Yaourt maison'); assert.equal(props.items[0].nutritionEdited, true);
  assert.equal(service.foodNutrition(props.items).calories, 125); assert.equal(service.foodNutrition(props.items).proteins, 8.5);
  assert.equal(service.foodNutrition([{...props.items[0], grams: 300}]).calories, 250, 'user composition scales with weight');
  all(tree, 'Button').find(node => node.props.accessibilityLabel === 'tracking.editFoodNutrition').props.onPress();
  tree = ui.render(props); await all(tree, 'Editor')[0].props.onApply({calories: 140, proteins: 12, carbs: 8, fats: 6}, {name: 'Yaourt maison corrigé', grams: 150});
  assert.equal(props.items.length, 1); assert.equal(service.foodNutrition(props.items).calories, 140);
  const savedDefaults = await service.loadFoodDefaults('manual-user');
  assert(savedDefaults.some(food => food.name === 'Yaourt maison corrigé'), 'applying ingredient edits immediately persists their default');
  const customItems = props.items;
  const unresolved = {...rice, id: 'unresolved', foodKey: null, per100g: null, name: 'Sauce perso'};
  props.onItems([unresolved]); tree = ui.render(props);
  all(tree,'Button').find(node=>node.props.accessibilityLabel==='tracking.editFoodNutrition').props.onPress();
  await all(ui.render(props),'Editor')[0].props.onApply({calories:30,proteins:1,carbs:2,fats:2},{name:'Sauce perso',grams:20});
  assert(props.items[0].foodKey.startsWith('custom-'),'an unreferenced detected food receives a reusable custom identity');
  lookupOffline = true;
  button(ui.render(props),'tracking.addFood').props.onPress(); ui.render(props);
  await new Promise(resolve=>setTimeout(resolve,280)); tree=ui.render(props);
  const savedChoice=all(tree,'Button').find(node=>text(node).startsWith('Yaourt maison corrigé'));
  assert(savedChoice,'custom food is available again without network');savedChoice.props.onPress(); lookupOffline=false; props.onItems(customItems);
  await service.saveTrackedMeal('custom-user', {id: 'custom-saved', title: 'Yaourt', date: yesterday, createdAt: new Date().toISOString(), items: props.items, mealType: 'snack', estimated: true});
  const customSaved = (await service.loadTrackedMeals('custom-user'))[0]; assert.equal(customSaved.items[0].nutritionEdited, true); assert.equal(customSaved.nutrition.calories, 140); assert.equal(customSaved.items[0].sourceId, 'USER_PROVIDED');
  props.onNutritionOverride = value => { props.nutritionOverride = value; };
  tree = ui.render(props); button(tree, 'tracking.editMealNutrition').props.onPress();
  tree = ui.render(props); await all(tree, 'Editor')[0].props.onApply({calories: 500, proteins: 40, carbs: 30, fats: 20});
  assert.equal(all(ui.render(props), 'Nutrition')[0].props.nutrition.calories, 500);
  button(ui.render(props), 'tracking.resetMealNutrition').props.onPress(); assert.equal(props.nutritionOverride, null);
  review = all(edit.render(), 'Review')[0]; review.props.onNutritionOverride({calories: 600, proteins: 40, carbs: 50, fats: 22});
  all(edit.render(), 'Review')[0].props.onSave(); await tick(); records = await service.loadTrackedMeals('manual-user');
  assert.equal(records[0].nutrition.calories, 600, 'meal override survives persistence'); assert.equal(records[0].nutritionOverride.proteins, 40);
  all(edit.render(), 'Review')[0].props.onItems([rice]); assert.equal(all(edit.render(), 'Review')[0].props.nutritionOverride, null, 'ingredient change clears total override');
  await service.saveTrackedMeal('manual-user', {...records[0], id: 'quick-total', items: [], nutritionOverride: {calories: 400, proteins: 20, carbs: 40, fats: 15}});
  assert.equal((await service.loadTrackedMeals('manual-user')).find(record => record.id === 'quick-total').nutrition.calories, 400, 'quick total needs no ingredient');
  await service.deleteTrackedMeal('manual-user', 'quick-total');
  await assert.rejects(service.saveTrackedMeal('manual-user', {...records[0], nutritionOverride: {calories: -1, proteins: 0, carbs: 0, fats: 0}}));
  const editorProps = {initial: null, food: {name: 'Test libre', grams: 100}, onApply: (...args) => { editorProps.applied = args; }};
  const nutrientEditor = harness('components/tracking/NutritionEditor.tsx', 'NutritionEditor');
  tree = nutrientEditor.render(editorProps); assert(button(tree, 'tracking.applyNutrition').props.disabled, 'empty nutrient fields cannot silently become zero');
  for (const [key, raw] of Object.entries({calories: '120,5', proteins: '8,5', carbs: '0', fats: '4'})) {
    all(nutrientEditor.render(editorProps), 'TextInput').find(node => node.props.accessibilityLabel === 'tracking.' + key).props.onChangeText(raw);
  }
  tree = nutrientEditor.render(editorProps); assert(!button(tree, 'tracking.applyNutrition').props.disabled); await button(tree, 'tracking.applyNutrition').props.onPress();
  assert.equal(editorProps.applied[0].calories, 120.5); assert.equal(editorProps.applied[0].carbs, 0);
  all(tree, 'TextInput').find(node => node.props.accessibilityLabel === 'tracking.proteins').props.onChangeText('-2');
  assert(button(nutrientEditor.render(editorProps), 'tracking.applyNutrition').props.disabled, 'negative nutrients cannot apply');
  const progressProps={...props,manual:false,pending:true,analysis:{kind:'meal',mealType:'dinner',items:props.items},photo:{uri:'meal-photo',width:1000,height:800},progressItems:props.items};
  const progressTree=ui.render(progressProps),mainScroll=all(progressTree,'ScrollView')[0];
  assert(all(mainScroll,'Image').some(node=>node.props.source.uri==='meal-photo'),'photo belongs to the scrolling content during recognition');
  assert(all(mainScroll,'Text').some(node=>text(node)==='tracking.nutritionTitle'),'pending heading scrolls with the entire sheet');
  assert(button(mainScroll,'tracking.buildingSummary'),'pending footer scrolls with the entire sheet');
  assert(!button(progressTree,'tracking.skip'),'skip is removed');
  nutrientEditor.unmount(); ui.unmount(); route.unmount(); edit.unmount();
  await service.deleteTrackedMeal('manual-user', 'stable-id'); assert.equal((await service.loadTrackedMeals('manual-user')).length, 0);
  console.log('Manual tracking: search without photo, category/quantity validation, selected day, totals, error recovery, duplicate taps, persisted edit/delete and user isolation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
