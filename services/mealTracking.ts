import AsyncStorage from '@react-native-async-storage/async-storage';
export type FoodNutrition = {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
};
export type PhotoFood = {
    id: string;
    name: string;
    foodKey: string | null;
    grams: number;
    confidence: number;
    visible: boolean;
    box: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    icon: string;
    per100g: FoodNutrition | null;
    sourceId: string | null;
    nutritionEstimated?: boolean;
    nutritionEdited?: boolean;
};
export type MealPhotoAnalysis = {
    scanId: string;
    kind: 'meal' | 'not_food' | 'uncertain';
    mealType?: 'breakfast' | 'lunch' | 'snack' | 'dinner' | null;
    mealTypeReason?: string;
    title: string;
    summary: string;
    items: PhotoFood[];
    nutrition: FoodNutrition | null;
    estimated: true;
    proposal?: unknown;
};
export type TrackedMeal = {
    id: string;
    date: string;
    createdAt: string;
    title: string;
    mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
    source?: 'photo' | 'manual';
    photoUri?: string;
    photoWidth?: number;
    photoHeight?: number;
    items: PhotoFood[];
    nutrition: FoodNutrition;
    estimated: true;
    catalogueStatus?: string;
    nutritionOverride?: FoodNutrition | null;
};
export const trackingStorageKey = (userId: string) => `@cookeat_food_log_v1:${encodeURIComponent(userId)}`;
export function trackingDateKey(now = new Date()): string { return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
export function shiftTrackingDate(key: string, amount: number): string { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); }
export function validTrackingDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value; }
export const nutritionKeys = ['calories', 'proteins', 'carbs', 'fats'] as const;
export function validNutrition(value: unknown): value is FoodNutrition {
    return !!value && typeof value === 'object' && nutritionKeys.every(key => typeof (value as FoodNutrition)[key] === 'number' && Number.isFinite((value as FoodNutrition)[key]) && (value as FoodNutrition)[key] >= 0 && (value as FoodNutrition)[key] <= 1000000);
}
export function mealNutrition(items: PhotoFood[], override?: FoodNutrition | null): FoodNutrition | null {
    return override == null ? foodNutrition(items) : validNutrition(override) ? { ...override } : null;
}
/** User-entered nutrients describe the consumed portion; store a scalable composition. */
export function withFoodNutrition(item: PhotoFood, portion: FoodNutrition): PhotoFood {
    if (!validNutrition(portion) || !Number.isFinite(item.grams) || item.grams <= 0) throw new Error('tracking_nutrition_invalid');
    const per100g = Object.fromEntries(nutritionKeys.map(key => [key, portion[key] * 100 / item.grams])) as FoodNutrition;
    if (!validNutrition(per100g)) throw new Error('tracking_nutrition_invalid');
    return { ...item, per100g, sourceId: 'USER_PROVIDED', nutritionEdited: true, nutritionEstimated: true };
}
export function foodNutrition(items: {
    grams: number;
    per100g: FoodNutrition | null;
}[]): FoodNutrition | null {
    if (!items.length || items.some(i => !validNutrition(i.per100g) || !Number.isFinite(i.grams) || i.grams <= 0))
        return null;
    const total: FoodNutrition = { calories: 0, proteins: 0, carbs: 0, fats: 0 };
    for (const i of items)
        for (const key of Object.keys(total) as (keyof FoodNutrition)[])
            total[key] += i.grams * i.per100g![key] / 100;
    return Object.fromEntries(Object.entries(total).map(([k, n]) => [k, Math.round(n * 10) / 10])) as FoodNutrition;
}
export function trackingTotals(meals: TrackedMeal[], date: string): FoodNutrition {
    const total: FoodNutrition = { calories: 0, proteins: 0, carbs: 0, fats: 0 };
    for (const meal of meals.filter(m => m.date === date))
        for (const key of Object.keys(total) as (keyof FoodNutrition)[])
            total[key] += meal.nutrition[key];
    return Object.fromEntries(Object.entries(total).map(([k, n]) => [k, Math.round(n * 10) / 10])) as FoodNutrition;
}
export function trackingStreak(meals: Pick<TrackedMeal, 'date'>[], today = trackingDateKey()): number {
    const days = new Set(meals.map(m => m.date).filter(d => validTrackingDate(d) && d <= today));
    let date = days.has(today) ? today : shiftTrackingDate(today, -1), count = 0;
    while (days.has(date)) {
        count++;
        date = shiftTrackingDate(date, -1);
    }
    return count;
}
export async function loadTrackedMeals(userId: string): Promise<TrackedMeal[]> {
    const raw = await AsyncStorage.getItem(trackingStorageKey(userId));
    if (!raw)
        return [];
    const values = JSON.parse(raw);
    if (!Array.isArray(values))
        throw new Error('tracking_data_invalid');
    return values.filter((m: TrackedMeal) => m && typeof m.id === 'string' && validTrackingDate(m.date) && Array.isArray(m.items) && m.nutrition && (['calories', 'proteins', 'carbs', 'fats'] as const).every(key => typeof m.nutrition[key] === 'number' && Number.isFinite(m.nutrition[key]) && m.nutrition[key] >= 0));
}
let writes = Promise.resolve();
export async function saveTrackedMeal(userId: string, meal: TrackedMeal): Promise<void> {
    if (!validTrackingDate(meal.date) || !meal.title.trim() || meal.items.length > 20 || meal.items.some(item => !item.name.trim() || !Number.isInteger(item.grams) || item.grams < 1 || item.grams > 2000 || !validNutrition(item.per100g)) || !mealNutrition(meal.items, meal.nutritionOverride))
        throw new Error('tracking_meal_invalid');
    const write = writes.catch(() => { }).then(async () => { const current = await loadTrackedMeals(userId); const next = [...current.filter(m => m.id !== meal.id), { ...meal, nutrition: mealNutrition(meal.items, meal.nutritionOverride)! }].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); await AsyncStorage.setItem(trackingStorageKey(userId), JSON.stringify(next)); });
    writes = write;
    return write;
}
export async function deleteTrackedMeal(userId: string, id: string): Promise<void> {
    const write = writes.catch(() => { }).then(async () => { const current = await loadTrackedMeals(userId); await AsyncStorage.setItem(trackingStorageKey(userId), JSON.stringify(current.filter(m => m.id !== id))); });
    writes = write;
    return write;
}
export function containedPhotoFrame(photo: {
    width: number;
    height: number;
}, viewport: {
    width: number;
    height: number;
}) {
    const scale = Math.min(viewport.width / Math.max(1, photo.width), viewport.height / Math.max(1, photo.height));
    const width = photo.width * scale, height = photo.height * scale;
    return { left: (viewport.width - width) / 2, top: (viewport.height - height) / 2, width, height };
}

/** Camera-style cover crop; detection coordinates stay relative to the original photo. */
export function coverPhotoFrame(photo: {width:number;height:number}, viewport: {width:number;height:number}) {
  const scale=Math.max(viewport.width/photo.width,viewport.height/photo.height);
  return {left:(viewport.width-photo.width*scale)/2,top:(viewport.height-photo.height*scale)/2,width:photo.width*scale,height:photo.height*scale};
}
export function visiblePhotoBox(box: NonNullable<PhotoFood['box']>, frame: {left:number;top:number;width:number;height:number}, viewport: {width:number;height:number}) {
  const left=Math.max(0,frame.left+box.x*frame.width),top=Math.max(0,frame.top+box.y*frame.height);
  const right=Math.min(viewport.width,frame.left+(box.x+box.width)*frame.width),bottom=Math.min(viewport.height,frame.top+(box.y+box.height)*frame.height);
  return right>left&&bottom>top?{left,top,width:right-left,height:bottom-top}:null;
}

export type SavedFoodDefault = {
    foodKey: string;
    name: string;
    per100g: FoodNutrition;
    sourceId: 'USER_PROVIDED';
    nutritionEdited: true;
    estimated: true;
};
export const foodDefaultsStorageKey = (userId: string) => `@cookeat_food_defaults_v1:${encodeURIComponent(userId)}`;
const normalizedFoodName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export async function loadFoodDefaults(userId: string): Promise<SavedFoodDefault[]> {
    const raw = await AsyncStorage.getItem(foodDefaultsStorageKey(userId));
    if (!raw) return [];
    const records: unknown = JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error('tracking_defaults_invalid');
    return records.filter((food: SavedFoodDefault) => food && typeof food.foodKey === 'string' && typeof food.name === 'string' && food.name.trim() && validNutrition(food.per100g) && food.sourceId === 'USER_PROVIDED' && food.nutritionEdited === true);
}
let defaultWrites = Promise.resolve();
export async function saveFoodDefault(userId: string, item: PhotoFood): Promise<SavedFoodDefault> {
    if (!item.foodKey || !item.name.trim() || !validNutrition(item.per100g) || !item.nutritionEdited) throw new Error('tracking_default_invalid');
    let saved: SavedFoodDefault;
    const write = defaultWrites.catch(() => {}).then(async () => {
        const current = await loadFoodDefaults(userId);
        const existing = current.find(food => food.foodKey === item.foodKey || (item.foodKey!.startsWith('custom-') && food.foodKey.startsWith('custom-') && normalizedFoodName(food.name) === normalizedFoodName(item.name)));
        saved = {foodKey: existing?.foodKey || item.foodKey!, name: item.name.trim(), per100g: {...item.per100g!}, sourceId: 'USER_PROVIDED', nutritionEdited: true, estimated: true};
        await AsyncStorage.setItem(foodDefaultsStorageKey(userId), JSON.stringify([...current.filter(food => food.foodKey !== saved.foodKey), saved]));
    });
    defaultWrites = write;
    await write;
    return saved!;
}
/** Apply only to a new observation; never rewrite historical diary entries. */
export function applyFoodDefaults(items: PhotoFood[], defaults: SavedFoodDefault[]): PhotoFood[] {
    return items.map(item => {
        const saved = defaults.find(food => food.foodKey === item.foodKey || (!item.foodKey && food.foodKey.startsWith('custom-') && normalizedFoodName(food.name) === normalizedFoodName(item.name)));
        return saved ? {...item, foodKey: saved.foodKey, per100g: {...saved.per100g}, sourceId: saved.sourceId, nutritionEdited: true, nutritionEstimated: true} : item;
    });
}
export function matchingFoodDefaults(defaults: SavedFoodDefault[], query: string): SavedFoodDefault[] {
    const search = normalizedFoodName(query);
    return defaults.filter(food => normalizedFoodName(food.name).includes(search));
}

/** Device-local capture time is the default; the user can always change the category. */
export function mealTypeAtLocalTime(date: Date): TrackedMeal['mealType'] {
    const hour = date.getHours();
    return hour < 5 ? 'dinner' : hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : 'dinner';
}
