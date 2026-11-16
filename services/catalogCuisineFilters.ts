/** Sorted IDs give the same catalogue/cache query regardless of selection order. */
export function toggleCatalogCuisine(selected: string[], id: string): string[] {
  if (id === 'all') return [];
  return selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id].sort();
}

export function catalogCuisineQuery(selected: string[]): string {
  return selected.length ? [...selected].sort().join(',') : 'all';
}
