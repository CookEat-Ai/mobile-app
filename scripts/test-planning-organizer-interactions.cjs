const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

class Today extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); }
}
const compile = file => ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const timeRules = { exports: {} };
vm.runInNewContext(compile('services/planning-time.ts'), { exports: timeRules.exports, Date: Today, Intl });
const display = { exports: {} };
vm.runInNewContext(compile('services/planningDisplay.ts'), { exports: display.exports, Date: Today, Intl, require: () => timeRules.exports });
const organization = { exports: {} };
vm.runInNewContext(compile('services/planningOrganization.ts'), { exports: organization.exports, Date: Today, require: () => display.exports });
const slots = []; let cursor = 0, confirmation, changes = 0;
const react = { __esModule: true, Fragment: 'Fragment',
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useRef: initial => { const i = cursor++; slots[i] ??= { current: initial }; return slots[i]; },
  useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  useEffect: () => {}, useMemo: fn => fn(),
}; react.default = react;
const rn = Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'Modal'].map(name => [name, name]));
Object.assign(rn, { StyleSheet: { create: s => s }, Platform: { OS: 'ios' }, Alert: { alert: (...args) => { confirmation = args; } } });
const deps = { react, 'react-native': rn,
  'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'fr' } }) },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
  '../../constants/AppTheme': { AppTheme: {}, appStyles: {} },
  '../../constants/RecipeImages': { getRecipeImageSource: image => image },
  '../../hooks/usePlanningClock': { usePlanningClock: () => ({ now: new Date('2026-10-14T10:00:00Z') }) },
  '../../services/planning-time': timeRules.exports,
  '../../services/planningDisplay': display.exports, '../../services/planningOrganization': organization.exports,
  '../../services/haptics': { feedback: { confirm: () => {}, selection: () => {} } },
};
const component = { exports: {} };
vm.runInNewContext(compile('components/planning/PlanningOrganizer.tsx'), { exports: component.exports, require: name => deps[name] || {}, Date: Today, Intl });
const plan = { weekStart: '2026-10-12', preferences: { cookingDays: [0, 2, 4] }, meals: [
  { slotId: 'past', title: 'Monday lunch', dayIndex: 0, mealType: 'lunch', status: 'ready' },
  { slotId: 'today', title: 'Wednesday lunch', dayIndex: 2, mealType: 'lunch', status: 'ready' },
  { slotId: 'future', title: 'Friday lunch', dayIndex: 4, mealType: 'lunch', status: 'ready' },
] };
let meals = plan.meals;
const render = () => { cursor = 0; return component.exports.PlanningOrganizer({ plan, meals, disabled: false,
  onChange: next => { changes++; meals = next; } }); };
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
let tree = nodes(render());
const pastRow = tree.find(node => node.type === 'View' && node.props.key === '0:lunch');
assert(pastRow.props.style.some(style => style?.opacity === 0.4), 'past meal rows are visibly greyed');
assert(tree.some(node => node.type === 'Text' && node.props.children.includes('planningSlots.past')), 'past days explain why actions are locked');
const pastTrash = tree.find(node => node.props.accessibilityLabel === 'common.delete: Monday lunch');
assert.equal(pastTrash.props.disabled, true);
assert.equal(pastTrash.props.accessibilityState.disabled, true);
pastTrash.props.onPress(); assert.equal(confirmation, undefined, 'past deletion remains blocked');
const todayRow = tree.find(node => node.type === 'View' && node.props.key === '2:lunch');
assert(!todayRow.props.style.some(style => style?.opacity === 0.4), 'today remains visually enabled');
const todayMove = tree.find(node => node.type === 'Pressable' && node.props.accessibilityLabel === 'Wednesday lunch. planningOrganize.moveTo');
assert(!todayMove.props.disabled); todayMove.props.onPress();
tree = nodes(render());
const sheet = tree.find(node => node.type === 'Modal');
assert.equal(sheet.props.visible, true, 'iPhone tap opens destination choice');
const destinations = nodes(sheet).filter(node => node.type === 'Pressable' && node.props.key === 'lunch');
assert.equal(destinations.length, 1, 'only the future selected day offers a lunch destination');
destinations[0].props.onPress(); assert.equal(changes, 1);
assert.equal(meals.find(meal => meal.slotId === 'today').dayIndex, 4);
assert.equal(meals.find(meal => meal.slotId === 'future').dayIndex, 2);
tree = nodes(render());
assert.equal(tree.find(node => node.type === 'Modal').props.visible, false);
const todayTrash = tree.find(node => node.props.accessibilityLabel === 'common.delete: Friday lunch');
assert(!todayTrash.props.disabled); todayTrash.props.onPress();
assert(confirmation, 'enabled deletion asks for confirmation');
confirmation[2].find(button => button.style === 'destructive').onPress();
assert.equal(changes, 2); assert.equal(meals.length, 2);
assert(meals.some(meal => meal.slotId === 'past'), 'past history is retained');
console.log('iPhone organizer interactions passed: grey past days, disabled actions, explanation, current-day moves, destination restrictions and confirmed deletion.');
