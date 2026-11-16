const FRACTION_GLYPHS: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
const SPOON_UNIT = /^\s*(?:c\.|cuill|tbsp|tsp|tablespoon|teaspoon|cucharad|colher|EL\b|TL\b)/i;
const PINCH_UNIT = /^\s*(?:pinc|pinch|prise|pitada|pizca)/i;
const SMALL_METRIC_UNIT = /^\s*(?:g|gr|grammes?|grams?|ml|cl|dl)\b/i;
const LARGE_METRIC_UNIT = /^\s*(?:kg|l|litres?|liters?)\b/i;
// `\b` ignores « Œ » in JavaScript: letter lookarounds work for every language.
const EGG = /(?<!\p{L})(?:œufs?|oeufs?|eggs?|huevos?|ovos?|eier?)(?!\p{L})/iu;
const MIN_UNIT_FRACTION = 0.5;

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Grams and millilitres a cook can weigh: 1 g under 10 g, then 5 g, then 10 g. */
const roundSmallMetric = (value: number) => Math.max(1, value < 10 ? Math.round(value) : value < 100 ? roundTo(value, 5) : roundTo(value, 10));

/**
 * Turn an exact scaled amount into one that can be measured in a kitchen:
 * 8.333333 g of butter or 0.083333 teaspoon cannot be weighed or poured.
 */
function kitchenAmount(value: number, unit: string, indivisible: boolean): { value: number; fraction: boolean } {
  if (SMALL_METRIC_UNIT.test(unit)) return { value: roundSmallMetric(value), fraction: false };
  if (LARGE_METRIC_UNIT.test(unit)) return { value: Math.max(0.05, roundTo(value, 0.05)), fraction: false };
  if (PINCH_UNIT.test(unit)) return { value: Math.max(1, Math.round(value)), fraction: false };
  if (SPOON_UNIT.test(unit)) return { value: Math.max(0.25, roundTo(value, 0.25)), fraction: true };
  // Eggs, yolks, whites, pastry sheets, cans… are counted, never weighed: by halves, at least one half.
  if (indivisible) return { value: value >= 3 ? Math.round(value) : Math.max(0.5, roundTo(value, 0.5)), fraction: true };
  // Pieces (eggs, onions, cloves…): halves from one upward, quarters below.
  return { value: value >= 1 ? roundTo(value, 0.5) : Math.max(0.25, roundTo(value, 0.25)), fraction: true };
}

function formatAmount(value: number, fraction: boolean, decimalComma: boolean): string {
  const whole = Math.floor(value + 1e-9), rest = Math.round((value - whole) * 100) / 100;
  if (fraction && FRACTION_GLYPHS[rest]) return whole ? `${whole} ${FRACTION_GLYPHS[rest]}` : FRACTION_GLYPHS[rest];
  return String(Math.round(value * 100) / 100).replace('.', decimalComma ? ',' : '.');
}

const AMOUNT = '(?:\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*\\/\\s*\\d+|\\d+(?:[.,]\\d+)?)';
const pattern = new RegExp(`^\\s*(${AMOUNT})(?:\\s*(-|–|à|to)\\s*(${AMOUNT}))?`);

const normalizeAmount = (quantity: string) => quantity.replace(/(\d)([½¼¾])/g, '$1 $2')
  .replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4')
  .replace(/^(\d+)\s*-\s*(\d+\s*\/\s*\d+)/, '$1 $2');

const parse = (value: string): number => {
  const mixed = value.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  if (value.includes('/')) { const [a, b] = value.split('/').map(Number); return a / b; }
  return Number(value.replace(',', '.'));
};

/** Units counted in a quantity (`1`, `2 œufs`, `1 boîte`), or null when it is weighed or measured. */
function countedUnits(quantity: string): { count: number; unit: string } | null {
  const normalized = normalizeAmount(quantity), match = normalized.match(pattern);
  if (!match) return null;
  const unit = normalized.slice(match[0].length).trim();
  if (SMALL_METRIC_UNIT.test(unit) || LARGE_METRIC_UNIT.test(unit) || SPOON_UNIT.test(unit) || PINCH_UNIT.test(unit)) return null;
  const count = parse(match[1]);
  return Number.isFinite(count) && count > 0 ? { count, unit } : null;
}

/**
 * Fewest servings that can really be cooked: never less than half an egg, pastry sheet,
 * can… A cookie batch for 12 is not made for one. Imported recipes say which ingredients
 * are indivisible; older and catalogue recipes fall back to counting eggs.
 */
export function servingsFloor(recipe: { servings?: number; ingredients?: { quantity: string; name?: string; indivisible?: boolean }[] }): { minimum: number; ingredient?: string } {
  const base = recipe.servings || 1;
  const floor = (recipe.ingredients || []).reduce<{ minimum: number; ingredient?: string }>((current, item) => {
    const counted = countedUnits(item.quantity || '');
    if (!counted) return current;
    const indivisible = item.indivisible ?? (counted.unit ? EGG.test(counted.unit.split(/\s+/)[0]) : EGG.test(item.name || ''));
    const minimum = indivisible ? Math.ceil(base * MIN_UNIT_FRACTION / counted.count - 1e-9) : 1;
    return minimum > current.minimum ? { minimum, ingredient: item.name || counted.unit } : current;
  }, { minimum: 1 });
  // Never above the recipe as written: it was cooked that way.
  return floor.minimum > base ? { minimum: base, ingredient: floor.ingredient } : floor;
}

export function minimumServings(recipe: Parameters<typeof servingsFloor>[0]): number {
  return servingsFloor(recipe).minimum;
}

/** Keep units and qualifiers; handle decimal, fractional and ranged amounts. */
export function scaleIngredientQuantity(quantity: string, factor: number, name = '', exact = true, indivisible?: boolean): string {
  if (factor === 1) return quantity;
  if (quantity.includes('+')) return quantity.split('+').map(part => scaleIngredientQuantity(part.trim(), factor, name, exact, indivisible)).join(' + ');
  const normalized = normalizeAmount(quantity);
  const match = normalized.match(pattern);
  const unit = match ? normalized.slice(match[0].length) : '';
  const egg = !unit.trim() ? EGG.test(name) : EGG.test(unit.trim().split(/\s+/)[0]);
  const decimalComma = quantity.includes(',');
  // The weight in brackets follows the amount shown: ½ can (200 g), not ½ can (100 g).
  let shownFactor = factor;
  const scaled = normalized.replace(pattern, (original, first: string, separator?: string, last?: string) => {
    const a = parse(first) * factor, b = last ? parse(last) * factor : undefined;
    if (!Number.isFinite(a) || (b !== undefined && !Number.isFinite(b))) return original;
    const round = (value: number) => kitchenAmount(value, unit, indivisible ?? egg);
    const format = (amount: ReturnType<typeof round>) => formatAmount(amount.value, amount.fraction, decimalComma);
    const shown = round(a);
    if (b === undefined && a > 0) shownFactor = factor * shown.value / a;
    return b === undefined ? format(shown) : `${format(shown)} ${separator} ${format(round(b))}`;
  });
  // Alternate metric quantities must follow the serving conversion too.
  return scaled.replace(/([;(]|(?<!\d),|\bou\b|≈)(\s*)(\d+(?:[.,]\d+)?)(\s*(?:kg|g|ml|l|oz|lb)\b)/gi, (_, prefix, space, value, alternateUnit) => {
    const amount = kitchenAmount(Number(value.replace(',', '.')) * shownFactor, alternateUnit, false);
    return `${prefix}${space}${formatAmount(amount.value, false, decimalComma)}${alternateUnit}`;
  });
}

export function scalePortionContent<T extends { ingredients?: Array<{ quantity: string }>; steps?: Array<{ title?: string; description?: string }> }>(content: T, factor: number, exact = true): T {
  if (factor === 1) return content;
  const replacements = new Map<string, string>();
  const ingredients = content.ingredients?.map(item => {
    const quantity = scaleIngredientQuantity(item.quantity, factor, (item as { name?: string }).name, exact, (item as { indivisible?: boolean }).indivisible);
    // Never replace naked numbers in steps: they can be cooking times/temperatures.
    if (/\d\s*(?:g|kg|ml|l|tbsp|tsp|tablespoons?|teaspoons?|cuill[eè]res?|cucharadas?|cucharaditas?|colheres?|œufs?|oeufs?|eggs?|gousses?|cloves?|c\.|EL|TL)\b/i.test(item.quantity)) replacements.set(item.quantity, quantity);
    const grams = (item as any).grams;
    return { ...item, quantity, ...(Number.isFinite(grams) ? { grams: grams * factor } : {}) };
  });
  const keys = [...replacements.keys()].sort((a, b) => b.length - a.length);
  const pattern = keys.length ? new RegExp(`(?<![\\d.,])(?:${keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w])`, 'g') : null;
  const steps = content.steps?.map(step => ({ ...step, description: pattern && step.description ? step.description.replace(pattern, match => replacements.get(match)!) : step.description }));
  return { ...content, ingredients, steps };
}


export function recipeForServings<T extends { servings?: number; ingredients?: Array<{ quantity: string }>; steps?: Array<{ title?: string; description?: string }> }>(recipe: T, servings: number): T {
  const factor = servings / (recipe.servings || 1);
  const cost = (recipe as any).estimatedCost;
  const decimals = cost ? new Intl.NumberFormat('en',{style:'currency',currency:cost.currency || 'EUR'}).resolvedOptions().maximumFractionDigits : 2;
  const adjustedCost = cost ? {...cost, servings, ...Object.fromEntries(['amount','low','high','knownAmount'].map(key=>[key, cost[key] === null ? null : Number((cost[key] * factor).toFixed(decimals))]))} : undefined;
  return { ...scalePortionContent(recipe, factor), servings, ...(cost ? {estimatedCost: adjustedCost} : {}) };
}
