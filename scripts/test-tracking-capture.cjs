require('./test-photo-meal-category.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const tracking={},autosave={},rows=new Map();
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compile('services/mealTracking.ts'),{exports:tracking,Date,Promise,Number,Set,encodeURIComponent,require:()=>({getItem:async key=>rows.get(key)||null,setItem:async(key,value)=>rows.set(key,value)})});
vm.runInNewContext(compile('services/photoMealAutosave.ts'),{exports:autosave,Map,Promise,require:()=>tracking});
const tick=()=>new Promise(r=>setImmediate(r));
function controller(){
 const slots=[],effects=[],cleanups=new Map();let cursor=0;const compression=deferred(),request=deferred(),calls=[];
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>{const i=cursor++;return slots[i]||(slots[i]={current:value});},useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useEffect(effect,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i][j])){cleanups.get(i)?.();effects.push(()=>cleanups.set(i,effect()));}slots[i]=deps;},useCallback:fn=>fn};React.default=React;
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/tracking/capture.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,AbortController,setTimeout,clearTimeout,require:name=>{
  if(name==='react')return React;
  if(name==='react-native')return{AppState:{currentState:'active',addEventListener:()=>({remove(){}})},StyleSheet:{create:x=>x},View:'View',Text:'Text',TouchableOpacity:'Button'};
  if(name==='expo-router')return{useLocalSearchParams:()=>({}),useFocusEffect(){},Stack:{Screen:'Screen'},router:{back(){calls.push('closed');},dismissTo(){calls.push('navigated');},replace(){calls.push('replaced');}}};
  if(name==='expo-camera')return{useCameraPermissions:()=>[{granted:true},()=>{}]};
  if(name==='expo-image-picker')return{};
  if(name==='expo-image-manipulator')return{manipulateAsync:(...args)=>{calls.push(args);return compression.promise;},SaveFormat:{JPEG:'jpeg'}};
  if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>({top:0,bottom:0})};
  if(name==='react-i18next')return{useTranslation:()=>({t:key=>key})};
  if(name.includes('vector-icons'))return{Ionicons:'Icon'};
  if(name.includes('AppTheme'))return require('./helpers/ui-theme.cjs');
  if(name.includes('TrackingCaptureSurface'))return{TrackingCaptureSurface:'Surface'};
  if(name.includes('MealPhotoCapture'))return{MealPhotoCapture:'Capture'};
  if(name.includes('PhotoMealReveal'))return{PhotoMealReveal:'Reveal'};
  if(name.includes('anonymousSession'))return{getAnonymousUserId:async()=>'capture-user'};
  if(name.includes('mealTracking'))return tracking;
  if(name.includes('photoMealAutosave'))return autosave;
  if(name.includes('trackingPhotos'))return{persistTrackingPhoto:async()=> 'private.jpg'};
  if(name.endsWith('/api'))return{apiService:{confirmTrackedMeal:async(scanId,value)=>{calls.push('confirmed');return{data:{meal:{id:scanId,...value,nutrition:tracking.mealNutrition(value.items,value.nutritionOverride),estimated:true},catalogue:{status:'saved'}}};},analyzeTrackedMeal:uri=>{calls.push(uri);return request.promise;}}};
  if(name.includes('haptics'))return{feedback:{confirm(){},success(){}}};
  if(name.includes('analytics'))return{__esModule:true,default:{track:async()=>{}}};
  return{};
 }});
 return{render(){cursor=0;const tree=exports.default();while(effects.length)effects.shift()();return tree;},compression,request,calls};
}
function find(tree,type){if(!tree||typeof tree!=='object')return null;if(tree.type===type)return tree;for(const child of [tree.props?.children].flat(Infinity)){const value=find(child,type);if(value)return value;}return null;}
for(const [hour,expected] of [[0,'dinner'],[4,'dinner'],[5,'breakfast'],[10,'breakfast'],[11,'lunch'],[14,'lunch'],[15,'snack'],[17,'snack'],[18,'dinner'],[23,'dinner']])assert.equal(tracking.mealTypeAtLocalTime(new Date(2026,9,20,hour)),expected,'device-local capture hour sets the default category');
(async()=>{
 const c=controller(),asset={uri:'camera-original',width:1200,height:1600},processed={...asset,uri:'processed-photo'};
 let tree=c.render(),camera=find(tree,'Capture');camera.props.cameraRef.current={takePictureAsync:async()=>asset};camera.props.onReady();find(c.render(),'Capture').props.onTake();await tick();
 tree=c.render();assert.equal(tree.type,'Surface');assert.equal(find(tree,'Capture'),null,'camera is replaced by its frozen photo');assert.equal(find(tree,'Reveal').props.photo,asset,'original photo is shown before compression resolves');assert.equal(find(tree,'Reveal').props.analysis,null);assert.equal(c.calls.length,1,'no request before photo preparation');
 c.compression.resolve(processed);await tick();tree=c.render();assert.equal(find(tree,'Reveal').props.photo,processed);assert.equal(c.calls[1],processed.uri);assert.equal(tree.props.expanded,false);
 c.request.resolve({data:{analysis:{scanId:'real',title:'Mon repas',kind:'meal',mealType:'dinner',items:[{id:'rice',foodKey:'rice',name:'Riz',grams:100,per100g:{calories:130,proteins:3,carbs:28,fats:1}}]}}});await tick();tree=c.render();assert.equal(find(tree,'Reveal').props.analysis.scanId,'real');find(tree,'Reveal').props.onExpand();assert.equal(c.render().props.expanded,true,'same outer surface grows full-screen');
 await new Promise(r=>setTimeout(r,20));tree=c.render();assert.equal(find(tree,'Reveal').props.autoSaved,true,'analysis saves before animation completion');assert.equal(find(tree,'Reveal').props.saveActionLabel,'tracking.viewDay');assert.equal(c.calls.filter(value=>value==='confirmed').length,1);assert.equal(c.calls.includes('navigated'),false,'autosave does not dismiss the nutrition result');
 find(tree,'Reveal').props.onMealType('breakfast');tree=c.render();assert.equal(find(tree,'Reveal').props.mealType,'breakfast');
 find(tree,'Reveal').props.onTitle('Corrigé');tree=c.render();find(tree,'Reveal').props.onBack();await tick();assert.equal((await tracking.loadTrackedMeals('capture-user'))[0].title,'Corrigé','close flushes a pending debounced edit');
 assert.equal((await tracking.loadTrackedMeals('capture-user'))[0].mealType,'breakfast','changing the meal category is persisted in the same journal entry');
 assert.equal((await tracking.loadTrackedMeals('capture-user')).length,1);
 tree=c.render();assert.equal(tree.props.visible,false,'close starts the sheet exit');assert.equal(c.calls.includes('closed'),false,'the route remains in place until the native modal is dismissed');
 tree.props.onRequestClose();tree.props.onDismiss();tree.props.onDismiss();assert.equal(c.calls.filter(value=>value==='closed').length,1,'rapid close and duplicate dismissal cannot pop the underlying tab');
 const manual=controller();find(manual.render(),'Capture').props.onManual();tree=manual.render();assert.equal(tree.props.visible,false);assert.equal(manual.calls.includes('replaced'),false,'manual entry waits for the camera sheet to close');tree.props.onDismiss();assert.equal(manual.calls.filter(value=>value==='replaced').length,1);
 const failed=controller();camera=find(failed.render(),'Capture');camera.props.cameraRef.current={takePictureAsync:async()=>asset};camera.props.onReady();find(failed.render(),'Capture').props.onTake();await tick();failed.compression.resolve(processed);await tick();failed.request.reject(new Error('offline'));await tick();tree=failed.render();assert.ok(find(tree,'Reveal').props.error,'thrown request cannot leave the frozen scanner running forever');
 console.log('Capture: immediate frozen photo before compression, real analysis, one expanding surface and thrown-request recovery passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
