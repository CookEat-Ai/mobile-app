const root='/Users/hadjadji/work/perso/cookeat/api';
process.chdir(root); process.env.TS_NODE_TRANSPILE_ONLY='true';require(root+'/node_modules/ts-node/register');require(root+'/node_modules/dotenv').config();
const mongoose=require(root+'/node_modules/mongoose');const {MealPlan,Recipe,CatalogRecipe}=require(root+'/schema');const fs=require('fs');
const results=[]; const check=(name,pass,details={})=>{results.push({name,pass,...details});console.log(JSON.stringify(results.at(-1)));};
const req=async(path,method='GET',body)=>{const start=Date.now();const r=await fetch('http://localhost:8083/api'+path,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),ms:Date.now()-start}};
(async()=>{
await mongoose.connect(process.env.MONGO_URL,{user:process.env.MONGO_USER,pass:process.env.MONGO_PASS,dbName:process.env.MONGO_DB_NAME}); if(!['localhost','127.0.0.1','::1'].includes(mongoose.connection.host))throw Error('local database required');
const userId=String(new mongoose.Types.ObjectId());const importedId='audit-app-'+Date.now();let plan;
try{
const preferences={cookingDays:[0,1,2,3,4],mealsByDay:{0:['dinner'],1:['dinner'],2:['dinner'],3:['dinner'],4:['dinner']},cuisineStyle:['italian'],diet:'vegan',duration:'all',excludedIngredients:['poulet'],nutritionProfile:{goal:'balanced',age:30,sex:'male',heightCm:180,currentWeightKg:80,activityLevel:'moderate',trainingDays:3}};
let r=await req('/meal-plans/draft','POST',{userId,isSubscribed:false,weekStart:'2026-09-07',preferences});check('non-subscriber request rejected',r.status===403,{status:r.status});
r=await req('/meal-plans/draft','POST',{userId,isSubscribed:true,weekStart:'2026-09-07',preferences});check('create five selected dinners',r.status===201&&r.data.plan?.meals.length===5,{status:r.status,ms:r.ms});if(!r.data.plan)throw Error(JSON.stringify(r.data));plan=r.data.plan;
const ids=plan.meals.map(x=>x.catalogRecipeId);const docs=await CatalogRecipe.find({id:{$in:ids}}).lean();check('diet and exclusions respected',docs.every(x=>x.dietary.vegan&&!x.ingredientIds.includes('chicken')));check('no duplicate recipes',new Set(ids).size===ids.length);
r=await req('/meal-plans/draft','POST',{userId,isSubscribed:true,weekStart:'2026-09-07',preferences});check('same week restored',r.status===200&&r.data.restored&&r.data.plan.meals.map(x=>x.catalogRecipeId).join()===ids.join());
r=await req('/meal-plans/user/'+userId+'/all');check('history returns new week',r.data.plans?.some(x=>x._id===plan._id));
r=await req('/recipe/detail/'+ids[0]+'?language=en');check('catalog recipe detail',r.status===200&&r.data.recipe?.ingredients.length>=3);
let image=plan.meals[0].image;let ir=await fetch(image.startsWith('/')?'http://localhost:8083'+image:image,{method:'HEAD'});check('recipe image loads',ir.status===200,{status:ir.status});
r=await req('/meal-plans/'+plan._id+'/shopping-list','POST',{userId,isSubscribed:true});check('shopping list generated',r.status===200&&r.data.plan.shoppingList.length>0);const item=r.data.plan.shoppingList[0];
r=await req('/meal-plans/'+plan._id+'/shopping-list/'+item.id,'PATCH',{userId,isSubscribed:true,checked:true});check('shopping item checked',r.data.plan.shoppingList.find(x=>x.id===item.id)?.checked===true);
r=await req('/meal-plans/'+plan._id+'/shopping-list','POST',{userId,isSubscribed:true});check('shopping check preserved after regeneration',r.data.plan.shoppingList.find(x=>x.canonicalName===item.canonicalName)?.checked===true);
const slot=plan.meals[0].slotId;
r=await req('/meal-plans/'+plan._id+'/meals/'+slot+'/replace','POST',{userId,isSubscribed:true});check('replace returns a different recipe',r.status===200&&r.data.plan.meals[0].catalogRecipeId!==ids[0],{before:ids[0],after:r.data.plan?.meals[0].catalogRecipeId});
await Recipe.create({id:importedId,title:'QA imported two portions',difficulty:'EASY',cooking_time:'20 min',servings:2,calories:'500 kcal',proteins:'30 g',lipids:'10 g',carbs:'60 g',ingredients:[{name:'QA rice',quantity:'200 g',icon:'🍚'}],steps:[{title:'Cook',description:'Cook the rice.'}],image:'https://example.com/audit.jpg'});
r=await req('/meal-plans/'+plan._id+'/meals/'+slot+'/recipe','PUT',{userId,isSubscribed:true,recipeId:importedId});check('insert imported recipe',r.status===200&&r.data.plan.meals[0].recipeId===importedId);
r=await req('/meal-plans/'+plan._id+'/shopping-list','POST',{userId,isSubscribed:true});const rice=r.data.plan.shoppingList.find(x=>x.name==='QA rice');check('imported two-serving ingredients scaled to one',rice?.quantities.some(x=>x.display.includes('100')),{quantity:rice?.quantities});
r=await req('/meal-plans/draft','POST',{userId,isSubscribed:true,weekStart:'2026-13-40',preferences});check('invalid calendar date returns 400',r.status===400,{status:r.status,weekStart:r.data.plan?.weekStart});
const unauth=await req('/meal-plans/'+plan._id+'?userId='+userId);check('plan read requires authenticated identity',unauth.status===401||unauth.status===403,{status:unauth.status});
}finally{await MealPlan.deleteMany({userId});await Recipe.deleteOne({id:importedId});fs.writeFileSync('/tmp/cookeat-audit/api-results.json',JSON.stringify(results,null,2));await mongoose.disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
