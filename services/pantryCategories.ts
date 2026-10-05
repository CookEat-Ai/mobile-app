import { pantryIngredientKey } from './planningPantry';

type Category = { id: string; title: string; icon: string; ingredients: { name: string }[] };
export function groupPantryIngredients(names: string[], categories: Category[], otherTitle: string, assignments: Record<string, string> = {}) {
  const lookup = categories.flatMap(category => category.ingredients.map(item => ({ key: pantryIngredientKey(item.name), categoryId: category.id })));
  const grouped = new Map<string, string[]>();
  for (const name of names) {
    const key = pantryIngredientKey(name);
    const match = lookup.find(item => item.key === key) || lookup
      .filter(item => item.key.length >= 4 && (` ${key} `).includes(` ${item.key} `))
      .sort((a, b) => b.key.length - a.key.length)[0];
    const assigned = assignments[key];
    const id = assigned && (assigned === 'other' || categories.some(category => category.id === assigned)) ? assigned : match?.categoryId || 'other';
    grouped.set(id, [...(grouped.get(id) || []), name]);
  }
  return [...categories, { id: 'other', title: otherTitle, icon: '📦' }]
    .filter(category => grouped.has(category.id))
    .map(category => ({ id: category.id, title: category.title, icon: category.icon, names: grouped.get(category.id)! }));
}
