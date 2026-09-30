import type { WeightLog } from './weightTracking';

export type WeightChartPeriod = 'week' | 'month' | 'quarter' | 'all';
const DAY_MS = 86_400_000;
const dateTime = (date: string) => Date.parse(`${date}T12:00:00Z`);

/** Calendar windows, rather than a fixed number of weigh-ins; UTC avoids DST drift. */
export function weightHistoryChart(logs: WeightLog[], period: WeightChartPeriod, today: string,
  references: { initialWeight?: number; initialDate?: string; targetWeight?: number } = {}) {
  const end = dateTime(today);
  const days = { week: 7, month: 30, quarter: 90 };
  const ordered = logs.filter(entry => entry.date <= today && Number.isFinite(entry.weight))
    .slice().sort((a, b) => a.date.localeCompare(b.date));
  const initialDate = references.initialDate ?? ordered[0]?.date;
  const firstDate = [initialDate, ordered[0]?.date].filter((date): date is string => !!date && date <= today).sort()[0] ?? today;
  const start = period === 'all' ? dateTime(firstDate) : Math.max(dateTime(firstDate), end - (days[period] - 1) * DAY_MS);
  const dateX = (date: string) => end === start ? 184 : 44 + (dateTime(date) - start) / (end - start) * 282;
  const visible = ordered.filter(entry => dateTime(entry.date) >= start);
  const values = [...visible.map(entry => entry.weight), references.initialWeight, references.targetWeight]
    .filter((value): value is number => value !== undefined && Number.isFinite(value));
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 0;
  const span = Math.max(2, high - low + 1);
  const min = (low + high - span) / 2;
  const max = min + span;
  const weightY = (weight: number) => 134 - (weight - min) / span * 110;
  const points = visible.map(entry => ({
    ...entry,
    x: dateX(entry.date),
    y: weightY(entry.weight),
  }));
  return {
    points,
    ticks: values.length ? [{ weight: max, y: 24 }, { weight: (min + max) / 2, y: 79 }, { weight: min, y: 134 }] : [],
    startDate: new Date(start).toISOString().slice(0, 10),
    endDate: today,
    initialPoint: references.initialWeight === undefined || !initialDate || dateTime(initialDate) < start || initialDate > today ? undefined : { x: dateX(initialDate), y: weightY(references.initialWeight) },
    targetPoint: references.targetWeight === undefined ? undefined : { x: 326, y: weightY(references.targetWeight) },
  };
}

export function weightChartPoints(values: number[], left = 12, right = 328) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const range = Math.max(...values) - min;
  return values.map((value, index) => ({
    x: left + index * (right - left) / Math.max(1, values.length - 1),
    y: range === 0 ? 70 : 108 - (value - min) / range * 76,
  }));
}

export function weightChartPath(points: ReturnType<typeof weightChartPoints>) {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}
