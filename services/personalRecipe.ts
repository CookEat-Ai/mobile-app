import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealPlan, ShoppingListItem } from './api';
import { recipeForServings } from './recipeServings';
import { pantryIngredientKey } from './planningPantry';
export type RecipeChatMessage = { role: 'user' | 'assistant'; text: string };
export type PersonalRecipeRecord = { version: 1; base: string; patch: Record<string, any> | null; messages: RecipeChatMessage[] };
export const personalRecipeKey = (userId: string, recipeId: string, context: string) => `personal_recipe_v1:${encodeURIComponent(userId)}:${encodeURIComponent(recipeId)}:${encodeURIComponent(context)}`;
export const personalRecipeFingerprint = (recipe: { ingredients?: any; steps?: any; servings?: number }) => JSON.stringify([recipe.ingredients?.map((i:any)=>[i.name,i.quantity]), recipe.steps?.map((s:any)=>[s.title,s.description]), recipe.servings || 1]);
export async function readPersonalRecipe(key: string, base: string): Promise<PersonalRecipeRecord | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as PersonalRecipeRecord;
    return record.version === 1 && record.base === base && Array.isArray(record.messages) ? record : null;
  } catch { return null; }
}
export async function writePersonalRecipe(key: string, record: PersonalRecipeRecord): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify({ ...record, messages: record.messages.slice(-40) }));
}
export async function clearPersonalRecipe(key: string): Promise<void> { await AsyncStorage.removeItem(key); }
const shoppingKey = (userId:string,planId:string)=>`personal_shopping_v1:${encodeURIComponent(userId)}:${encodeURIComponent(planId)}`;
let shoppingWrites = Promise.resolve();
export async function writePersonalShoppingState(userId:string,planId:string,itemId:string,patch:{checked?:boolean;excluded?:boolean}): Promise<void> {
  const write = shoppingWrites.catch(()=>{}).then(async()=>{
    const key = shoppingKey(userId,planId);
    const state = JSON.parse(await AsyncStorage.getItem(key) || '{}');
    state[itemId] = {...state[itemId],...patch};
    await AsyncStorage.setItem(key,JSON.stringify(state));
  });
  shoppingWrites = write;
  return write;
}

/** Apply after the network/cache read: never mutate its shared object or send
 * a personal recipe back through a plan mutation. Every override is user/slot scoped. */
export async function personalMealPlan(plan: MealPlan | null, userId: string): Promise<MealPlan | null> {
  if (!plan) return plan;
  let changed = false;
  const meals = await Promise.all(plan.meals.map(async meal => {
    const id = meal.recipeId || meal.catalogRecipeId;
    if (!id || meal.status !== 'ready') return meal;
    const base = recipeForServings({ingredients:meal.ingredients,steps:meal.steps,servings:meal.ingredientServings || 1}, meal.servings || 1);
    const record = await readPersonalRecipe(personalRecipeKey(userId,id,`plan:${plan._id}:${meal.slotId}`),personalRecipeFingerprint(base)).catch(()=>null);
    const patch = record?.patch;
    if (!patch) return meal;
    changed = true;
    // Plan quantities remain per person; the recipe detail patch is household sized.
    const perPerson = recipeForServings({ingredients:patch.ingredients,steps:patch.steps,servings:patch.servings || 1},1);
    return {...meal, title:patch.title, ingredients:perPerson.ingredients, steps:perPerson.steps, servings:patch.servings || 1,
      ingredientServings:1, cookingTime:patch.cooking_time, chefTip:patch.chef_tip, image:'',artworkOnly:true,estimatedCost:patch.estimatedCost,
      calories:parseFloat(patch.calories),proteins:parseFloat(patch.proteins),carbs:parseFloat(patch.carbs),fats:parseFloat(patch.lipids)};
  }));
  if (!changed) return plan;
  const costs = meals.map(meal=>meal.estimatedCost);
  const complete = costs.every(cost=>cost?.status==='estimated');
  const estimate = plan.estimatedCost ? {...plan.estimatedCost,status:complete ? 'estimated' as const : 'partial' as const,
    amount:complete ? Number(costs.reduce((sum,c)=>sum+c!.amount!,0).toFixed(2)) : null,
    low:complete ? Number(costs.reduce((sum,c)=>sum+c!.low!,0).toFixed(2)) : null,
    high:complete ? Number(costs.reduce((sum,c)=>sum+c!.high!,0).toFixed(2)) : null,
    knownAmount:Number(costs.reduce((sum,c)=>sum+(c?.knownAmount||0),0).toFixed(2)),coverage:costs.reduce((sum,c)=>sum+(c?.coverage||0),0)/Math.max(1,costs.length),missingIngredients:[...new Set(costs.flatMap(c=>c?.missingIngredients||[]))]} : undefined;
  const oldByName = new Map(plan.shoppingList.filter(i=>!i.manual).map(i=>[pantryIngredientKey(i.name),i]));
  const groceries = new Map<string,ShoppingListItem>();
  for(const meal of meals) for(const ingredient of meal.ingredients || []) {
    const key = pantryIngredientKey(ingredient.name);
    const prior = oldByName.get(key);
    const item = groceries.get(key) || {...prior,id:prior?.id || `personal:${key}`,name:ingredient.name,canonicalName:key,category:prior?.category || 'other',quantities:[],recipeIds:[],checked:prior?.checked || false,excluded:prior?.excluded || false} as ShoppingListItem;
    const grams = (ingredient as any).grams;
    const factor = (meal.servings || 1)/(meal.ingredientServings || 1);
    if(Number.isFinite(grams)) {
      const existing = item.quantities.find(q=>q.unit==='g');
      const amount = Math.round(grams*factor);
      if(existing) {existing.amount! += amount; existing.display=`${existing.amount} g`;} else item.quantities.push({amount,unit:'g',display:`${amount} g`});
    } else item.quantities.push({display:recipeForServings({ingredients:[ingredient],servings:meal.ingredientServings||1},meal.servings||1).ingredients![0].quantity});
    item.recipeIds = [...new Set([...item.recipeIds,meal.recipeId || meal.catalogRecipeId || meal.slotId])];
    groceries.set(key,item);
  }
  let shoppingState: Record<string,{checked?:boolean;excluded?:boolean}> = {};
  try { shoppingState = JSON.parse(await AsyncStorage.getItem(shoppingKey(userId,plan._id)) || '{}'); } catch { /* Original flags remain usable. */ }
  const shoppingList = [...groceries.values(),...plan.shoppingList.filter(i=>i.manual)].map(item=>({...item,...shoppingState[item.id]}));
  return {...plan,meals,estimatedCost:estimate,shoppingList};
}
