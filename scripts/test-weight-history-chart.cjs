const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../services/weightChart.ts'), 'utf8');
const chart = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: chart, Date });

const logs = [
  { date: '2026-03-01', weight: 80 },
  { date: '2026-03-24', weight: 79.2 },
  { date: '2026-03-25', weight: 79 },
  { date: '2026-03-30', weight: 78.6 },
  { date: '2026-03-31', weight: 78.5 },
];
const before = JSON.stringify(logs);
const week = chart.weightHistoryChart(logs, 'week', '2026-03-31');
assert.equal(week.startDate, '2026-03-25', 'seven calendar dates inclusive, across the DST switch');
assert.deepEqual(Array.from(week.points, p => p.date), ['2026-03-25', '2026-03-30', '2026-03-31']);
assert.equal(week.points[0].x, 44);
assert.equal(week.points.at(-1).x, 326);
assert(Math.abs((week.points[1].x - 44) / (326 - 44) - 5 / 6) < 1e-9, 'gaps follow dates, not measurement count');
assert.equal(chart.weightHistoryChart(logs, 'month', '2026-03-31').startDate, '2026-03-02');
assert.equal(chart.weightHistoryChart(logs, 'month', '2026-03-31').points.length, 4);
assert.equal(chart.weightHistoryChart(logs, 'quarter', '2026-03-31').points.length, 5);
assert.equal(chart.weightHistoryChart(logs, 'all', '2026-03-31').points.length, 5);
assert.equal(chart.weightHistoryChart(logs, 'week', '2026-04-30').points.length, 0, 'empty period does not show older values');
assert.equal(chart.weightHistoryChart([], 'all', '2026-03-31').points.length, 0);
assert.equal(chart.weightHistoryChart([], 'all', '2026-03-31').ticks.length, 0);
const one = chart.weightHistoryChart([logs.at(-1)], 'all', '2026-03-31');
assert.equal(one.points[0].x, 184);
assert(Number.isFinite(one.points[0].y));
const flat = chart.weightHistoryChart(logs.map(p => ({ ...p, weight: 80 })), 'all', '2026-03-31');
assert(flat.points.every(p => Number.isFinite(p.y) && p.y === flat.points[0].y));
assert.equal(chart.weightHistoryChart([{ date: '2024-01-01', weight: 80 }], 'month', '2024-03-01').startDate, '2024-02-01', 'leap day is included');
const all = chart.weightHistoryChart([...logs].reverse(), 'all', '2026-03-31');
assert.equal(all.points[0].date, logs[0].date, 'input is ordered without changing stored history');
assert.equal(JSON.stringify(logs), before);
assert(!chart.weightChartPath(all.points).includes('NaN'));
const emptyGoal = chart.weightHistoryChart([], 'month', '2026-03-31', { initialWeight: 80, initialDate: '2026-03-31', targetWeight: 75 });
assert.equal(emptyGoal.points.length, 0, 'reference markers must not fabricate weigh-ins');
assert.equal(emptyGoal.ticks.length, 3, 'axes remain graduated even before the first weigh-in');
assert.equal(emptyGoal.startDate, '2026-03-31');
assert.equal(emptyGoal.initialPoint.x, 184);
assert.equal(emptyGoal.targetPoint.x, 326);
assert(emptyGoal.initialPoint.y < emptyGoal.targetPoint.y, 'higher weights appear higher on the y axis');
assert(emptyGoal.ticks[0].weight > 80 && emptyGoal.ticks.at(-1).weight < 75, 'both endpoint labels fit inside the scale');
const emptyMaintenance = chart.weightHistoryChart([], 'all', '2026-03-31', { initialWeight: 80, initialDate: '2026-03-31' });
assert.equal(emptyMaintenance.targetPoint, undefined);
assert(Number.isFinite(emptyMaintenance.initialPoint.y));
const measuredGoal = chart.weightHistoryChart(logs, 'month', '2026-03-31', { initialWeight: 80, targetWeight: 75 });
assert.equal(measuredGoal.points.length, 4, 'target and initial markers stay separate from the measured curve');
console.log('PASS weight history periods, calendar boundaries, spacing, empty/single/flat series and immutability');

for (const period of ['week', 'month', 'quarter', 'all']) {
  const registeredToday = chart.weightHistoryChart([{ date: '2026-09-30', weight: 60 }], period, '2026-09-30', { initialWeight: 60, initialDate: '2026-09-30', targetWeight: 70 });
  assert.equal(registeredToday.startDate, '2026-09-30');
  assert.equal(registeredToday.initialPoint.x, registeredToday.points[0].x);
}
assert.equal(measuredGoal.initialPoint, undefined, 'old initial weight must not be moved to the start of a recent window');
assert.equal(chart.weightHistoryChart([], 'week', '2026-09-30', { initialWeight: 60 }).initialPoint, undefined, 'undated legacy weight must not invent a measurement date');
const recent = chart.weightHistoryChart([{ date: '2026-09-28', weight: 60 }, { date: '2026-09-30', weight: 61 }], 'week', '2026-09-30', { initialWeight: 60 });
assert.equal(recent.startDate, '2026-09-28');
assert.equal(recent.initialPoint.x, recent.points[0].x);
