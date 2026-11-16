const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const data = new Map(); let fail = false;
const service = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/mealTracking.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {
  exports: service, Date, Promise, Set, Number, encodeURIComponent,
  require: () => ({getItem: async key => data.get(key) || null, setItem: async (key, value) => {if (fail) throw Error('disk full'); data.set(key, value);}}),
});
const item = {id:'rice',foodKey:'rice-cooked',name:'Riz cuit',grams:200,per100g:{calories:130,proteins:3,carbs:28,fats:1},box:{x:.2,y:.2,width:.3,height:.3},visible:true};
(async () => {
  await service.saveTrackedMeal('a', {id:'old',date:'2026-10-19',createdAt:'2026-10-19T12:00:00Z',title:'Riz',mealType:'lunch',items:[item]});
  const corrected = service.withFoodNutrition(item, {calories:300,proteins:10,carbs:60,fats:5});
  await service.saveFoodDefault('a', corrected);
  let defaults = await service.loadFoodDefaults('a');
  assert.equal(defaults[0].per100g.calories,150,'values are saved per 100g, not for the previous portion');
  const detected = service.applyFoodDefaults([{...item,grams:100}],defaults)[0];
  assert.equal(service.foodNutrition([detected]).calories,150);
  assert.equal(detected.box,item.box,'photo detection geometry is preserved');
  assert.equal(detected.sourceId,'USER_PROVIDED'); assert.equal(detected.nutritionEdited,true);
  assert.equal(item.per100g.calories,130,'original observation is not mutated');
  assert.equal((await service.loadTrackedMeals('a'))[0].nutrition.calories,260,'saved history is not recalculated');
  assert.equal((await service.loadFoodDefaults('b')).length,0,'defaults are private to the user');
  await Promise.all([service.saveFoodDefault('a',{...corrected,foodKey:'custom-1',name:'Crème maison'}),service.saveFoodDefault('a',{...corrected,foodKey:'custom-2',name:'Autre aliment'})]);
  const same = await service.saveFoodDefault('a',{...corrected,foodKey:'custom-new',name:' CREME MAISON '});
  assert.equal(service.applyFoodDefaults([{...item,foodKey:null,name:'Crème maison'}],await service.loadFoodDefaults('a'))[0].foodKey,'custom-1','unreferenced future detections reuse an exact custom name');
  assert.equal(same.foodKey,'custom-1','recreating a custom food updates its stable identity');
  defaults = await service.loadFoodDefaults('a'); assert.equal(defaults.length,3,'concurrent writes preserve other defaults');
  assert.equal(service.matchingFoodDefaults(defaults,'creme')[0].foodKey,'custom-1','accent-insensitive local search works offline');
  fail = true; await assert.rejects(service.saveFoodDefault('a',{...corrected,name:'Changed'})); fail = false;
  assert.equal((await service.loadFoodDefaults('a'))[0].name,'Riz cuit','failed writes retain prior defaults');
  await service.saveFoodDefault('a',{...corrected,name:'Riz corrigé'});
  assert.equal((await service.loadFoodDefaults('a')).find(food=>food.foodKey===item.foodKey).name,'Riz corrigé','retry works after storage failure');
  data.set(service.foodDefaultsStorageKey('corrupt'),'{broken');
  await assert.rejects(service.saveFoodDefault('corrupt',corrected),'corrupt storage must not silently overwrite existing values');
  console.log('Food defaults: per-100g persistence, future photo reuse, immutable history, custom-food search, user isolation, concurrent edits and failure recovery passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
