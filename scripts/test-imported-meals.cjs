const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={},extra={}){const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports:output,Date,require:name=>{assert(name in deps,'missing '+name);return deps[name]},...extra});return output}
const jsx=(type,props,...children)=>({type,props:{...props,children}}),React={createElement:jsx,useMemo:fn=>fn()};React.default=React;
const texts=tree=>{if(tree==null||typeof tree==='boolean')return'';if(typeof tree!=='object')return String(tree);if(Array.isArray(tree))return tree.map(texts).join(' ');return texts(tree.props?.children)};
const navigation=load('services/importedMealNavigation.ts');
const route=navigation.importedMealsRoute();assert.equal(route.pathname,'/(tabs)/meals');assert.equal(route.params.filter,'imported');assert(route.params.selectionKey);
const alias=load('app/(tabs)/imported.tsx',{react:React,'expo-router':{Redirect:'Redirect'},'../../services/importedMealNavigation':navigation}).default();assert.equal(alias.type,'Redirect');assert.equal(alias.props.href.pathname,'/(tabs)/meals');assert.equal(alias.props.href.params.filter,'imported','old bookmarks cannot display the retired layout');
// Use the installed stack router to verify that import completion reuses the
// existing tabs, then native back from the recipe restores that same instance.
const {StackRouter}=require('../node_modules/expo-router/build/react-navigation/routers/StackRouter');
const root=StackRouter({initialRouteName:'(tabs)'}),options={routeNames:['(tabs)','share-intent','recipe-detail'],routeParamList:{},routeGetIdList:{}};
const initial=root.getInitialState(options);let state=root.getStateForAction(initial,{type:'PUSH',payload:{name:'share-intent'}},options);
state=root.getStateForAction(state,{type:'POP_TO',payload:{name:'(tabs)',params:{screen:'meals',params:route.params}}},options);
assert.equal(state.routes.length,1);assert.equal(state.routes[0].key,initial.routes[0].key,'completion must not create another tab navigator');
state=root.getStateForAction(state,{type:'PUSH',payload:{name:'recipe-detail',params:{recipeId:'recipe'}}},options);
state=root.getStateForAction(state,{type:'POP',payload:{count:1}},options);assert.equal(state.routes[0].key,initial.routes[0].key);assert.equal(state.routes[0].params.screen,'meals');assert.equal(state.routes[0].params.params.filter,'imported');
const menuSource=ts.createSourceFile('menu.tsx',fs.readFileSync('components/MealImportButton.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let finish;
(function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(menuSource)==='finishDismiss')finish=n.initializer.getText(menuSource);ts.forEachChild(n,visit)})(menuSource);
const pending={current:'history'},menuRoutes=[];
vm.runInNewContext('('+finish+')',{pending,router:{navigate:r=>menuRoutes.push(r)},importedMealsRoute:navigation.importedMealsRoute})();
assert.equal(menuRoutes[0].pathname,'/(tabs)/meals');assert.equal(menuRoutes[0].params.filter,'imported');assert.equal(pending.current,null,'history navigation waits for the import chooser dismissal and runs once');
const recipeRoute=navigation.importedRecipeRoute('recipe');assert.equal(recipeRoute.params.source,'imported');assert.equal(recipeRoute.params.showGenerateButton,'false');
(async()=>{
 const records=Array.from({length:55},(_,i)=>({id:`owned-${i}`,title:`Recette ${i}`,isImported:true,image:'server.jpg',usedIngredients:['Riz'],cooking_time:'20 min'}));
 records[0].title='Poulet rôti';records[2].isImported=false;records[54]={id:'legacy',title:'Crêpe au citron',videoUrl:'https://tiktok.com/example',usedIngredients:['Lait'],cooking_time:'10 min'};
 const requests=[];let active=true,fail=false;
 const apiService={getRecipeHistory:async(userId,page,limit,options)=>{requests.push({userId,page,limit,options});if(fail)return{error:'offline'};return{data:{history:records.slice((page-1)*limit,page*limit),pagination:{total:records.length,hasMore:page*limit<records.length}}}}};
 const service=load('services/importedMeals.ts',{'./api':{apiService},'../i18n':{__esModule:true,default:{t:key=>key}},'./recipeStorage':{recipeStorageService:{getStoredRecipes:async()=>[{id:'foreign',recipe:{title:'Private unrelated recipe'}},{id:'owned-0',recipe:{calories:'500 kcal',proteins:'25 g'}},{id:'owned-0',recipe:{calories:'650 kcal',proteins:'35 g',ingredients:[{name:'Poulet',quantity:'200 g'}]}}],getCachedImages:async()=>({'owned-0':'edited.jpg'})}}});
 let result=await service.loadImportedMeals('owner');assert.equal(requests[0].options.isImported,true);assert.equal(requests[0].userId,'owner');assert.equal(result.recipes.length,49);assert(result.hasMore);assert(!result.recipes.some(r=>r.id==='foreign'||r.id==='owned-2'));assert.equal(result.recipes[0].image,'edited.jpg');assert.equal(result.recipes[0].calories,'650 kcal');assert.equal(result.recipes[1].calories,'','missing nutrition stays unknown');
 result=await service.loadImportedMeals('owner',{page:2});assert.equal(result.recipes.length,5);assert.equal(result.hasMore,false);assert(result.recipes.some(r=>r.id==='legacy'));
 result=await service.loadImportedMeals('owner',{query:'crepe lait'});assert.equal(result.recipes.length,1,'accent-insensitive multi-word search reaches older pages');assert.equal(result.recipes[0].id,'legacy');assert.equal(result.hasMore,false);
 const start=requests.length;await service.loadImportedMeals('owner',{preservePages:2,forceRefresh:true});assert.deepEqual(requests.slice(start).map(r=>r.page),[1,2]);assert(requests.slice(start).every(r=>r.options.forceRefresh),'refresh preserves every loaded page');
 const before=requests.length;active=false;await assert.rejects(service.loadImportedMeals('owner',{query:'anything',isCurrent:()=>active}),/cancelled/);assert.equal(requests.length,before,'obsolete searches do not continue through history');fail=true;await assert.rejects(service.loadImportedMeals('owner'),/offline/);
 const display=load('services/catalogDisplay.ts');assert.equal(display.catalogMealCardData({id:'a',title:'A',calories:'',proteins:'',ingredients:[]}).calories,undefined);assert.equal(display.catalogMealCardData({id:'a',title:'A',calories:'0 kcal',proteins:'0 g',ingredients:[]}).calories,0,'known zero values are preserved');
 const card=load('components/planning/PlanMealCard.tsx',{
  react:React,'react-native':{View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:x=>x}},'react-i18next':{useTranslation:()=>({t:key=>key})},'expo-image':{Image:'Image'},'@expo/vector-icons':{Ionicons:'Icon'},'../../hooks/useResponsive':{useResponsive:()=>({isTablet:false})},'../../services/haptics':{feedback:{light(){}}},'../../constants/Colors':{Colors:{light:{}}},'../../constants/RecipeImages':{getRecipeImageSource:x=>x},'../../services/weeklyPlanning':{roundNutritionValue:x=>x},'./MealArtwork':{MealArtwork:'Artwork'},'./MealCostEstimate':{MealCostEstimate:'Cost'},'./PlanningStyles':{planningStyles:{}},'../ui/AppSpinner':{AppSpinner:'Spinner'},
 }).PlanMealCard({meal:{title:'Importée'},badgeLabel:'Importées',onPress(){}});
 assert(texts(card).includes('Importées'));assert(!texts(card).includes('kcal'),'history metadata cannot invent zero calories');
 // Exercise the real detail back handler without mounting unrelated analysis code.
 const source=ts.createSourceFile('detail.tsx',fs.readFileSync('app/recipe-detail.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let handler;
 (function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='handleBackPress')handler=n.initializer.getText(source);ts.forEachChild(n,visit)})(source);
 const calls=[];let canGoBack=false;
 const back=vm.runInNewContext('('+handler+')',{choosingMealRef:{current:false},params:{source:'imported'},router:{canGoBack:()=>canGoBack,replace:r=>calls.push(r),back:()=>calls.push('back')},importedMealsRoute:navigation.importedMealsRoute});back();assert.equal(calls[0].params.filter,'imported');canGoBack=true;back();assert.equal(calls[1],'back','existing imported list/search/scroll is preserved on ordinary back');
 console.log('Imported meals: current route/legacy redirect, owner-only history, pagination, full-history search, refresh, cancellation/errors, cached metadata, unknown nutrition and recipe back navigation passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
