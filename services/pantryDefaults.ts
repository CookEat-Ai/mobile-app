import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TFunction } from 'i18next';

export const PANTRY_STORAGE_KEY = 'pantry_ingredients';

export type PantryIngredient = {
  id: string;
  name: string;
  category: string;
  addedAt?: string;
};

type StarterDefinition = {
  id: string;
  translationKey: string;
  category: string;
};

/**
 * Produits de fond de placard largement répandus et suffisamment variés pour
 * proposer de vraies recettes dès la première utilisation. On évite une liste
 * centrée sur une viande ou un régime particulier : l'utilisateur peut ensuite
 * retirer en un geste ce qu'il n'a pas chez lui.
 */
const STARTER_DEFINITIONS: StarterDefinition[] = [
  { id: 'onion', translationKey: 'home.categories.vegetables.onion', category: 'legumes' },
  { id: 'garlic', translationKey: 'home.categories.vegetables.garlic', category: 'legumes' },
  { id: 'carrot', translationKey: 'home.categories.vegetables.carrot', category: 'legumes' },
  { id: 'tomato', translationKey: 'home.categories.vegetables.tomato', category: 'legumes' },
  { id: 'potato', translationKey: 'home.categories.vegetables.potato', category: 'legumes' },
  { id: 'pasta', translationKey: 'home.categories.essentials.pasta', category: 'necessites' },
  { id: 'rice', translationKey: 'home.categories.essentials.rice', category: 'necessites' },
  { id: 'eggs', translationKey: 'home.categories.essentials.eggs', category: 'necessites' },
  { id: 'flour', translationKey: 'home.categories.essentials.flour', category: 'necessites' },
  { id: 'milk', translationKey: 'home.categories.essentials.milk', category: 'necessites' },
  { id: 'butter', translationKey: 'home.categories.essentials.butter', category: 'necessites' },
  { id: 'olive-oil', translationKey: 'home.categories.essentials.oil', category: 'necessites' },
  { id: 'bread', translationKey: 'home.categories.essentials.bread', category: 'necessites' },
  { id: 'tomato-sauce', translationKey: 'home.categories.essentials.tomatoSauce', category: 'necessites' },
  { id: 'stock', translationKey: 'home.categories.essentials.stock', category: 'necessites' },
  { id: 'lentils', translationKey: 'home.categories.essentials.lentils', category: 'necessites' },
  { id: 'chickpeas', translationKey: 'home.categories.essentials.chickpeas', category: 'necessites' },
  { id: 'sugar', translationKey: 'home.categories.essentials.sugar', category: 'necessites' },
  { id: 'emmental', translationKey: 'home.categories.cheeses.emmental', category: 'fromages' },
  { id: 'salt', translationKey: 'home.categories.spices.salt', category: 'epices' },
  { id: 'pepper', translationKey: 'home.categories.spices.pepper', category: 'epices' },
  { id: 'herbs', translationKey: 'home.categories.spices.herbes', category: 'epices' },
  { id: 'paprika', translationKey: 'home.categories.spices.paprika', category: 'epices' },
  { id: 'mustard', translationKey: 'home.categories.spices.mustard', category: 'epices' },
  { id: 'vinegar', translationKey: 'home.categories.spices.vinegar', category: 'epices' },
];

export function buildStarterPantryIngredients(t: TFunction): PantryIngredient[] {
  const addedAt = new Date().toISOString();
  return STARTER_DEFINITIONS.map((ingredient) => ({
    id: `starter-${ingredient.id}`,
    name: t(ingredient.translationKey),
    category: ingredient.category,
    addedAt,
  }));
}

function parseStoredPantry(raw: string): PantryIngredient[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item, index) => {
    if (typeof item === 'string' && item.trim()) {
      return [{
        id: `legacy-${index}-${item}`,
        name: item.trim(),
        category: 'other',
      }];
    }
    if (!item || typeof item !== 'object' || !('name' in item)) return [];

    const candidate = item as Partial<PantryIngredient>;
    if (typeof candidate.name !== 'string' || !candidate.name.trim()) return [];
    return [{
      id: typeof candidate.id === 'string' ? candidate.id : `legacy-${index}-${candidate.name}`,
      name: candidate.name.trim(),
      category: typeof candidate.category === 'string' ? candidate.category : 'other',
      ...(typeof candidate.addedAt === 'string' ? { addedAt: candidate.addedAt } : {}),
    }];
  });
}

/**
 * Initialise uniquement une installation qui n'a encore jamais possédé de
 * garde-manger. Une valeur existante — y compris `[]` — exprime un choix de
 * l'utilisateur et n'est jamais remplacée.
 */
export async function loadOrCreateStarterPantry(t: TFunction): Promise<{
  ingredients: PantryIngredient[];
  initialized: boolean;
}> {
  const stored = await AsyncStorage.getItem(PANTRY_STORAGE_KEY);
  if (stored !== null) {
    try {
      return { ingredients: parseStoredPantry(stored), initialized: false };
    } catch {
      // Une valeur corrompue peut encore contenir des données récupérables par
      // une future migration : on ne l'écrase pas silencieusement.
      return { ingredients: [], initialized: false };
    }
  }

  const ingredients = buildStarterPantryIngredients(t);
  await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(ingredients));
  return { ingredients, initialized: true };
}

