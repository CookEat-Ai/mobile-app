const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../services/planningDisplay.ts'), 'utf8');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: mod.exports, Date, Intl });
const { planDays, initialPlanDay, mealsForDay, formatPlanRange, isPastPlan, selectedPlanDays } = mod.exports;
for (const zone of ['Europe/Paris', 'America/Los_Angeles']) {
  process.env.TZ = zone;
  // Local calendar days remain consecutive across DST and year boundaries.
  for (const [start, end] of [['2026-03-23', '2026-03-29'], ['2026-10-19', '2026-10-25'], ['2026-12-28', '2027-01-03']]) {
    const days = planDays(start);
    assert.equal(days.length, 7);
    assert.equal(days[6].key, end);
    assert.equal(new Set(days.map(day => day.key)).size, 7);
  }
}
const plan = { weekStart: '2026-09-28', meals: [
  { slotId: 'dinner', dayIndex: 2, position: 2 },
  { slotId: 'monday', dayIndex: 0, position: 0 },
  { slotId: 'lunch', dayIndex: 2, position: 1 },
] };
assert.equal(initialPlanDay(plan, '2026-09-30'), 2);
assert.equal(initialPlanDay(plan, '2026-10-02'), 0, 'an unselected current day falls back to the first planned day');
assert.deepEqual(Array.from(selectedPlanDays(plan), day => day.dayIndex), [0, 2], 'older plans use their meals when preferences are absent');
const selectedPlan = { ...plan, preferences: { cookingDays: [5, 1, 5] } };
assert.deepEqual(Array.from(selectedPlanDays(selectedPlan), day => day.dayIndex), [0, 1, 2, 5], 'chosen days and occupied destinations are displayed in calendar order');
assert.deepEqual(Array.from(selectedPlanDays(selectedPlan), day => day.key), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-03'], 'filtered days preserve their dates and indexes');
assert.equal(initialPlanDay(selectedPlan, '2026-09-30'), 2);
assert.equal(initialPlanDay(selectedPlan, '2026-10-03'), 5);
assert.equal(initialPlanDay({ ...selectedPlan, meals: [] }, '2026-10-03'), 5, 'chosen days remain after manual meal removal');
assert.equal(selectedPlanDays({ ...plan, meals: [] }).length, 0);
assert.deepEqual(Array.from(selectedPlanDays({ ...plan, preferences: { cookingDays: [9, -1, null] } }), day => day.dayIndex), [0, 2]);
assert.equal(initialPlanDay(plan, '2026-10-12'), 0, 'past weeks start on their first planned day');
assert.equal(initialPlanDay({ ...plan, meals: [] }, '2026-10-12'), 0);
assert.deepEqual(Array.from(mealsForDay(plan, 2), meal => meal.slotId), ['lunch', 'dinner']);
assert.equal(plan.meals[0].slotId, 'dinner', 'display must not mutate plan data');
assert.equal(mealsForDay(plan, 5).length, 0);
assert.match(formatPlanRange(plan, 'en-GB'), /4 Oct/);
assert.equal(isPastPlan(plan, '2026-10-04'), false, 'last day remains regenerable');
assert.equal(isPastPlan(plan, '2026-10-05'), true, 'completed week cannot be regenerated');
assert.equal(isPastPlan(plan, '2026-09-27'), false, 'future week has not ended');
assert.equal(isPastPlan({ ...plan, weekEnd: '2026-10-02' }, '2026-10-03'), true, 'use the saved end date');
assert.equal(isPastPlan({ weekStart: '2026-12-28' }, '2027-01-03'), false);
assert.equal(isPastPlan({ weekStart: '2026-12-28' }, '2027-01-04'), true);
for (const zone of ['Europe/Paris', 'America/Los_Angeles']) {
  process.env.TZ = zone;
  assert.equal(isPastPlan({ weekStart: '2026-10-19' }, '2026-10-25'), false);
  assert.equal(isPastPlan({ weekStart: '2026-10-19' }, '2026-10-26'), true);
}
console.log('Planning display passed: today, empty days, historical weeks, meal order, DST and year boundaries.');
const onboarding = { ...plan, _id: 'onboarding' };
const thisWeek = { ...plan, _id: 'current', weekStart: '2026-10-05' };
const nextWeek = { ...plan, _id: 'future', weekStart: '2026-10-12' };
const history = [onboarding, nextWeek];
assert.equal(mod.exports.displayedPlan(history, '2026-10-05'), undefined, 'missing current week shows the create-planning state, not a past onboarding or future plan');
assert.equal(mod.exports.displayedPlan([onboarding, thisWeek, nextWeek], '2026-10-05'), thisWeek, 'only the current calendar week is displayed');
assert.equal(mod.exports.displayedPlan([onboarding], '2026-09-28'), onboarding, 'onboarding plan remains visible during its own week');
assert.equal(mod.exports.displayedPlan([], '2026-10-05'), undefined);
assert.equal(history.length, 2, 'selection preserves older and future plans for history');
assert.equal(onboarding.weekStart, '2026-09-28', 'original dates remain unchanged');
assert.equal(mod.exports.displayedPlan([thisWeek], '2026-10-12'), undefined, 'the previous current plan disappears after the next rollover');
console.log('Home current-week selection passed: rollover, missing week, current week, future plans and history preservation.');

const slotPlan = { weekStart: '2026-10-05', preferences: { includeSnack: false }, meals: [
  { slotId: 'dinner', dayIndex: 0, mealType: 'dinner', position: 0 },
  { slotId: 'breakfast', dayIndex: 0, mealType: 'breakfast', position: 1 },
] };
const slots = mod.exports.planningDaySlots(slotPlan, 0);
assert.equal(slots.map(slot => slot.mealType).join(','), 'breakfast,lunch,snack,dinner');
assert.equal(slots[0].meal.slotId, 'breakfast');
assert.equal(slots[1].meal, undefined, 'empty lunch stays between breakfast and dinner');
assert.equal(slots[3].meal.slotId, 'dinner');
assert.equal(mod.exports.planningDaySlots({ ...slotPlan, preferences: { includeSnack: true } }, 0).map(slot => slot.mealType).join(','), 'breakfast,lunch,snack,dinner');
console.log('Planning slots passed: afternoon snack and empty slots in meal order.');
