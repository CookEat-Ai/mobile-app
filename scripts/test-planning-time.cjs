const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../services/planning-time.ts'), 'utf8');
assert.equal(source, fs.readFileSync(path.join(__dirname, '../../api/src/services/planning-time.ts'), 'utf8'), 'UI and server use exactly the same hours');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: mod.exports, Date, Intl });
const { planningGenerationWindow, planningMealsByDay, isElapsedPlanningMeal } = mod.exports;
const clock = hour => new Date(`2026-10-14T${hour}:00Z`);
const expected = [
  ['09:59', 'breakfast,lunch,snack,dinner'], ['10:00', 'lunch,snack,dinner'],
  ['13:59', 'lunch,snack,dinner'], ['14:00', 'snack,dinner'],
  ['16:59', 'snack,dinner'], ['17:00', 'dinner'], ['21:59', 'dinner'], ['22:00', ''], ['23:00', ''],
];
for (const [hour, types] of expected) {
  const window = planningGenerationWindow('UTC', clock(hour));
  assert.equal(window.remainingMealTypes.join(','), types);
  assert.equal(window.weekStart, types ? '2026-10-14' : '2026-10-15');
  const byDay = planningMealsByDay(window.weekStart, [0, 2, 6], 'UTC', clock(hour));
  assert.equal(byDay['0'].join(','), types || 'breakfast,lunch,snack,dinner');
  assert.equal(byDay['2'].length, 4, 'following days always stay complete');
  assert.equal(byDay['6'].length, 4);
}
const sameInstant = new Date('2026-10-14T21:00:00Z');
assert.equal(planningGenerationWindow('Europe/Paris', sameInstant).weekStart, '2026-10-15', '23:00 in Paris starts tomorrow');
assert.equal(planningGenerationWindow('America/Los_Angeles', sameInstant).remainingMealTypes.join(','), 'snack,dinner', '14:00 in LA retains only later meals');
assert.equal(planningGenerationWindow('Pacific/Auckland', sameInstant).today, '2026-10-15', 'local date may already be tomorrow');
assert.equal(planningGenerationWindow('Europe/Paris', new Date('2026-12-31T22:00:00Z')).weekStart, '2027-01-01');
assert.equal(planningGenerationWindow('Europe/Paris', new Date('2026-10-25T01:30:00Z')).remainingMealTypes.length, 4, 'DST repeated hour retains morning meals');
assert.equal(isElapsedPlanningMeal('2026-10-14', 0, 'breakfast', 'UTC', clock('11:00')), true);
assert.equal(isElapsedPlanningMeal('2026-10-14', 0, 'lunch', 'UTC', clock('11:00')), false);
assert.equal(isElapsedPlanningMeal('2026-10-14', 1, 'breakfast', 'UTC', clock('23:00')), false);
console.log('Meal-time planning passed: every cutoff boundary, tomorrow start, partial first day, full following days, timezone, DST and year rollover.');

const last = mod.exports.planningLastDay;
assert.equal(last({weekStart:"2026-10-20",weekEnd:"2026-10-26",preferences:{cookingDays:[0,2]}}),"2026-10-22","short plan ignores unused legacy horizon");
assert.equal(last({weekStart:"2026-12-30",preferences:{cookingDays:[0,1]},meals:[{dayIndex:3}]}),"2027-01-02","occupied later days count across year boundaries");
assert.equal(last({weekStart:"2026-10-24",preferences:{cookingDays:[0,2]},meals:[]}),"2026-10-26","configured last day survives meal removal and DST");
assert.equal(last({weekStart:"2026-10-20",weekEnd:"2026-10-23"}),"2026-10-23","metadata-free legacy plans retain their saved range");
