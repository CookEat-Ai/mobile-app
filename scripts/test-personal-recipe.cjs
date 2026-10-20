const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const storage=new Map(),cache=new Map();
function load(name){if(cache.has(name))return cache.get(name);const e={};cache.set(name,e);const file=path.resolve(__dirname,'../services',name+'.ts');vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:e,Intl,require:n=>n==='@react-native-async-storage/async-storage'?{getItem:async k=>storage.get(k)||null,setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k)}:load(n.replace('./',''))});return e;}
const p=load('personalRecipe');
async function main(){
 const ingredients=[{name:'Champignons',quantity:'150 g',grams:150},{name:'Poulet',quantity:'130 g',grams:130}];const steps=[{title:'Cuire',description:'Cuire à cœur.'}];const cost={status:'estimated',country:'FR',currency:'EUR',amount:2,low:1.5,high:2.5,knownAmount:2,coverage:1,missingIngredients:[],servings:1,perServing:2};
 const plan={_id:'p',userId:'alice',meals:[{slotId:'s',recipeId:'r',status:'ready',source:'catalog',ingredients,steps,servings:1,ingredientServings:1,title:'Poulet',estimatedCost:cost,calories:400,proteins:30}],shoppingList:[],estimatedCost:cost};
 const snapshot=JSON.stringify(plan),key=p.personalRecipeKey('alice','r','plan:p:s'),base=p.personalRecipeFingerprint({ingredients,steps,servings:1});
 const patch={title:'Poulet aux courgettes',ingredients:[{name:'Courgettes',quantity:'150 g',grams:150},{name:'Poulet',quantity:'130 g',grams:130}],steps,servings:1,calories:'350 kcal',proteins:'32 g',carbs:'20 g',lipids:'12 g',estimatedCost:{...cost,amount:1.8,knownAmount:1.8}};
 await p.writePersonalRecipe(key,{version:1,base,patch,messages:[{role:'user',text:'Change les champignons'}]});
 const alice=await p.personalMealPlan(plan,'alice');assert.equal(alice.meals[0].title,patch.title);assert.equal(alice.estimatedCost.amount,1.8);assert.equal(alice.shoppingList.length,2);assert.equal(alice.shoppingList[0].name,'Courgettes');assert.equal(alice.shoppingList[0].quantities[0].amount,150);
 await p.writePersonalShoppingState('alice','p',alice.shoppingList[0].id,{checked:true}); assert.equal((await p.personalMealPlan(plan,'alice')).shoppingList[0].checked,true);
 const bob=await p.personalMealPlan(plan,'bob');assert.equal(JSON.stringify(bob),snapshot,'different user gets no override');assert.equal(JSON.stringify(plan),snapshot,'cached/server response not mutated');
 const otherSlot={...plan,meals:[{...plan.meals[0],slotId:'other'}]};assert.equal((await p.personalMealPlan(otherSlot,'alice')).meals[0].title,'Poulet');
 const changedBase={...plan,meals:[{...plan.meals[0],ingredients:[{name:'Thon',quantity:'100 g',grams:100}]}]};assert.equal((await p.personalMealPlan(changedBase,'alice')).meals[0].title,'Poulet','stale override cannot overwrite a changed recipe');
 await p.clearPersonalRecipe(key);assert.equal(JSON.stringify(await p.personalMealPlan(plan,'alice')),snapshot,'reset restores untouched plan');
 await p.writePersonalRecipe(key,{version:1,base,patch:null,messages:[{role:'assistant',text:'Non, ils sont facultatifs.'}]});assert.equal(JSON.stringify(await p.personalMealPlan(plan,'alice')),snapshot,'question only never changes recipe');
 storage.set(key,'broken json');assert.equal(await p.readPersonalRecipe(key,base),null);
 console.log('Personal recipes: local persistence, user/slot isolation, stale override rejection, immutable cache, budget/groceries projection, question-only conversation and reset passed.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
