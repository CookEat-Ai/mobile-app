// Match regular plurals without merging different foods (tomato vs cherry tomato).
const naturallyEndingInS = new Set(['couscous', 'mais', 'pois', 'reis']);

export function pantryIngredientKey(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[-_]/g, ' ').trim().replace(/\s+/g, ' ')
    .split(' ').map(word => word.length > 4 && word.endsWith('s') && !word.endsWith('ss') && !naturallyEndingInS.has(word) ? word.slice(0, -1) : word).join(' ');
}

export function normalizePantryIngredients(items: string[]): string[] {
  const unique = new Map<string, string>();
  for (const item of items) {
    const name = item.trim();
    const key = pantryIngredientKey(name);
    if (key && !unique.has(key)) unique.set(key, name);
  }
  return [...unique.values()].slice(0, 100);
}
