const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const tracking = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/mealTracking.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: tracking, Date, Number, Set, Promise, encodeURIComponent, require: () => ({}) });
const at = (hour, minute = 0, day = 21) => new Date(2026, 9, day, hour, minute);
const meal = (mealType, hour, minute = 0, day = 21) => ({ id: `${mealType}-${hour}`, mealType,
  date: tracking.trackingDateKey(at(hour, minute, day)), createdAt: at(hour, minute, day).toISOString() });
const infer = (hour, minute, meals, date, scanId) => tracking.inferPhotoMealType(at(hour, minute), meals, date, scanId);
for (const hour of [0, 4, 5, 10, 11, 14, 15, 17, 18, 23])
  assert.equal(infer(hour, 0, []), tracking.mealTypeAtLocalTime(at(hour)), 'no history uses local capture time');
assert.equal(infer(10, 0, [meal('breakfast', 8)]), 'snack', 'a second morning meal follows breakfast');
assert.equal(infer(12, 30, [meal('breakfast', 8)]), 'lunch');
assert.equal(infer(11, 15, [meal('breakfast', 10, 30)]), 'snack', 'crossing an hour boundary shortly after breakfast does not force a new main meal');
assert.equal(infer(14, 0, [meal('lunch', 12)]), 'snack', 'already logged lunch changes the afternoon estimate');
assert.equal(infer(15, 30, [meal('breakfast', 8)]), 'lunch', 'a late lunch follows breakfast even more than six hours later');
assert.equal(infer(15, 30, [meal('breakfast', 8), meal('snack', 15)]), 'snack', 'a just logged snack does not suggest another main meal');
assert.equal(infer(16, 30, [meal('snack', 14), meal('breakfast', 8)]), 'lunch', 'chronology is independent of storage order');
assert.equal(infer(16, 30, [meal('breakfast', 8), meal('lunch', 12)]), 'snack');
assert.equal(infer(19, 0, [meal('lunch', 12), meal('snack', 16)]), 'dinner');
assert.equal(infer(20, 0, [meal('dinner', 19)]), 'snack');
assert.equal(infer(19, 0, [meal('dinner', 2)]), 'dinner', 'last night dinner does not hide tonight dinner');
assert.equal(infer(0, 30, [meal('dinner', 23, 0, 20)]), 'snack', 'a meal shortly after midnight follows yesterday dinner');
assert.equal(infer(12, 30, [meal('lunch', 12, 0, 20)]), 'lunch', 'unrelated diary dates are ignored');
assert.equal(infer(12, 30, [meal('lunch', 14)]), 'lunch', 'future entries cannot influence an earlier capture');
assert.equal(infer(12, 30, [{...meal('lunch', 12), createdAt:'invalid'}]), 'lunch');
const scan = meal('lunch', 12);
assert.equal(infer(12, 30, [scan], undefined, scan.id), 'lunch', 'retrying the same scan cannot count itself');
console.log('Photo meal categories: local time, meal sequence, late lunch, storage order, midnight, unrelated dates, future/corrupt entries and scan retries passed.');
