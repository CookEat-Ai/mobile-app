/** Keep units and qualifiers; handle decimal, fractional and ranged amounts. */
export function scaleIngredientQuantity(quantity: string, factor: number, name = '', exact = true): string {
  if (factor === 1) return quantity;
  if (quantity.includes('+')) return quantity.split('+').map(part => scaleIngredientQuantity(part.trim(), factor, name, exact)).join(' + ');
  const normalized = quantity.replace(/(\d)([½¼¾])/g, '$1 $2')
    .replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4')
    .replace(/^(\d+)\s*-\s*(\d+\s*\/\s*\d+)/, '$1 $2');
  const number = '(?:\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*\\/\\s*\\d+|\\d+(?:[.,]\\d+)?)';
  const pattern = new RegExp(`^\\s*(${number})(?:\\s*(-|–|à|to)\\s*(${number}))?`);
  const parse = (value: string): number => {
    const mixed = value.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
    if (value.includes('/')) { const [a, b] = value.split('/').map(Number); return a / b; }
    return Number(value.replace(',', '.'));
  };
  const scaled = normalized.replace(pattern, (match, first: string, separator?: string, last?: string) => {
    const a = parse(first) * factor, b = last ? parse(last) * factor : undefined;
    if (!Number.isFinite(a) || (b !== undefined && !Number.isFinite(b))) return match;
    const format = (value: number) => String(Math.round(value * 1_000_000) / 1_000_000).replace('.', quantity.includes(',') ? ',' : '.');
    return b === undefined ? format(a) : `${format(a)} ${separator} ${format(b)}`;
  });
  // Alternate metric quantities must follow the serving conversion too.
  return scaled.replace(/([;(]|(?<!\d),|\bou\b|≈)(\s*)(\d+(?:[.,]\d+)?)(\s*(?:kg|g|ml|l)\b)/gi, (_, prefix, space, value, unit) => `${prefix}${space}${Math.round(Number(value.replace(',', '.')) * factor * 1_000_000) / 1_000_000}${unit}`);
}

export function scalePortionContent<T extends { ingredients?: Array<{ quantity: string }>; steps?: Array<{ title?: string; description?: string }> }>(content: T, factor: number, exact = true): T {
  if (factor === 1) return content;
  const replacements = new Map<string, string>();
  const ingredients = content.ingredients?.map(item => {
    const quantity = scaleIngredientQuantity(item.quantity, factor, (item as { name?: string }).name, exact);
    // Never replace naked numbers in steps: they can be cooking times/temperatures.
    if (/\d\s*(?:g|kg|ml|l|tbsp|tsp|tablespoons?|teaspoons?|cuill[eè]res?|cucharadas?|cucharaditas?|colheres?|œufs?|oeufs?|eggs?|gousses?|cloves?|c\.|EL|TL)\b/i.test(item.quantity)) replacements.set(item.quantity, quantity);
    return { ...item, quantity };
  });
  const keys = [...replacements.keys()].sort((a, b) => b.length - a.length);
  const pattern = keys.length ? new RegExp(`(?<![\\d.,])(?:${keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w])`, 'g') : null;
  const steps = content.steps?.map(step => ({ ...step, description: pattern && step.description ? step.description.replace(pattern, match => replacements.get(match)!) : step.description }));
  return { ...content, ingredients, steps };
}


export function recipeForServings<T extends { servings?: number; ingredients?: Array<{ quantity: string }>; steps?: Array<{ title?: string; description?: string }> }>(recipe: T, servings: number): T {
  return { ...scalePortionContent(recipe, servings / (recipe.servings || 1)), servings };
}
