import { mealNutrition, type FoodNutrition, type MealPhotoAnalysis, type PhotoFood, type TrackedMeal } from './mealTracking';
export type PhotoMealSaveInput = {
  userId: string; analysis: MealPhotoAnalysis; photo: {uri: string; width: number; height: number};
  title: string; items: PhotoFood[]; mealType: TrackedMeal['mealType']; nutritionOverride: FoodNutrition | null;
  date: string; createdAt: string;
};
const fingerprint = (meal: Pick<PhotoMealSaveInput, 'title' | 'items' | 'mealType' | 'nutritionOverride'>) => JSON.stringify([meal.title.trim(), meal.items, meal.mealType, meal.nutritionOverride || null]);

/** Serialize automatic saves and CTA flushes. One scan always upserts one journal entry. */
export function createPhotoMealSaver(deps: {
  confirm: (input: PhotoMealSaveInput) => Promise<{meal: {id: string; title: string; items: PhotoFood[]; mealType: TrackedMeal['mealType']; nutrition: FoodNutrition; estimated: true}; catalogue: {status: string}} >;
  persistPhoto: (userId: string, id: string, uri: string) => Promise<string>;
  saveMeal: (userId: string, meal: TrackedMeal) => Promise<void>;
}) {
  const records = new Map<string, TrackedMeal>(), saved = new Map<string, string>();
  let queue = Promise.resolve();
  return {
    restore(record: TrackedMeal) { records.set(record.id, record); saved.set(record.id, fingerprint({...record, nutritionOverride: record.nutritionOverride || null})); },
    isSaved(input: PhotoMealSaveInput) { return saved.get(input.analysis.scanId) === fingerprint(input); },
    save(input: PhotoMealSaveInput): Promise<TrackedMeal> {
      const result = queue.catch(() => {}).then(async () => {
        const nutrition = mealNutrition(input.items, input.nutritionOverride);
        if (!nutrition || !input.title.trim() || input.analysis.kind === 'not_food') throw new Error('tracking_meal_invalid');
        const prior = records.get(input.analysis.scanId), nextFingerprint = fingerprint(input);
        if (prior && saved.get(input.analysis.scanId) === nextFingerprint) return prior;
        const response = prior ? {meal: {...prior, title: input.title.trim(), items: input.items, mealType: input.mealType, nutrition}, catalogue: {status: prior.catalogueStatus || ''}} : await deps.confirm(input);
        const photoUri = prior?.photoUri || await deps.persistPhoto(input.userId, response.meal.id, input.photo.uri);
        const record: TrackedMeal = {...response.meal, nutritionOverride: input.nutritionOverride, source: 'photo', date: prior?.date || input.date, createdAt: prior?.createdAt || input.createdAt,
          photoUri, photoWidth: input.photo.width, photoHeight: input.photo.height, catalogueStatus: response.catalogue.status};
        await deps.saveMeal(input.userId, record);
        records.set(input.analysis.scanId, record); saved.set(input.analysis.scanId, nextFingerprint);
        return record;
      });
      queue = result.then(() => {}, () => {});
      return result;
    },
  };
}
