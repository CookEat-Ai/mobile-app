const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return{promise,resolve}};
function harness({blockedSubscription=false,blockOptional=true,loader=false}={}){
 const slots=[],effects=[],cleanups=new Map(),timers=new Map(),intervals=new Map(),calls=[],requests=[];let cursor=0,id=0,subCalls=0,reducedMotion=false;const animations=[];
 const t=key=>key,router={replace:path=>calls.push(['replace',path]),dismissTo:path=>calls.push(['dismissTo',path]),push:path=>calls.push(['push',path])};
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>{const i=cursor++;return slots[i]??=( {current:value})},useState:value=>{const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next}]},useMemo(fn,deps){const i=cursor++,prev=slots[i];if(!prev||deps.some((x,j)=>x!==prev.deps[j]))slots[i]={value:fn(),deps};return slots[i].value},useCallback(fn,deps){const i=cursor++,prev=slots[i];if(!prev||deps.some((x,j)=>x!==prev.deps[j]))slots[i]={fn,deps};return slots[i].fn},useEffect(fn,deps){const i=cursor++,prev=slots[i];if(!prev||deps.some((x,j)=>x!==prev[j])){slots[i]=deps;effects.push(()=>{cleanups.get(i)?.();cleanups.set(i,fn())})}}};React.default=React;
 class Value{constructor(value){this.value=value}setValue(value){this.value=value}interpolate(ranges){return{...ranges}}addListener(){return 1}removeListener(){}stopAnimation(){}}
 const animation=(kind,options)=>{const a={kind,options,active:false,start(){this.active=true},stop(){this.active=false}};animations.push(a);return a},api={importRecipeFromVideo:(url,sub,options)=>{const d=deferred();requests.push({url,sub,options,...d});return d.promise},saveOnboardingAnswers:async()=>({data:{userId:'owner'}})};
 const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(loader?'components/loading/ClassicLoadingView.tsx':'app/share-intent.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:output,AbortController,console:{log(){},error(){}},setTimeout(fn,ms){const i=++id;timers.set(i,{fn,ms});return i},clearTimeout:i=>timers.delete(i),setInterval(fn,ms){const i=++id;intervals.set(i,{fn,ms});return i},clearInterval:i=>intervals.delete(i),require:name=>{
  if(name==='react')return React;
  if(name==='react-native')return{View:'View',Text:'Text',TouchableOpacity:'Button',StyleSheet:{create:x=>x},Animated:{Value,View:'AnimatedView',Text:'Text',timing:(value,options)=>animation('timing',options),loop:child=>animation('loop',child),sequence:children=>animation('sequence',children)},Easing:{linear:{},inOut:x=>x,ease:{}}};
  if(name==='react-native-reanimated')return{useReducedMotion:()=>reducedMotion};
  if(name.endsWith('importedMealNavigation'))return{importedMealsRoute:()=>({pathname:'/(tabs)/meals',params:{filter:'imported',selectionKey:'test'}}),importedRecipeRoute:recipeId=>({pathname:'/recipe-detail',params:{recipeId,showGenerateButton:'false',isHistory:'true',source:'imported'}})};
  if(name.endsWith('ClassicLoadingView'))return{ClassicLoadingView:'ContinuousLoading'};
  if(name==='react-i18next')return{useTranslation:()=>({t})};
  if(name==='expo-router')return{useRouter:()=>router,useLocalSearchParams:()=>({url:'https://vm.tiktok.com/test/'})};
  if(name==='expo-image')return{Image:'Image'};
  if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>({top:0,bottom:0})};
  if(name.includes('vector-icons'))return{Ionicons:'Icon'};
  if(name.endsWith('AppTheme'))return require('./helpers/ui-theme.cjs');
  if(name.endsWith('Colors'))return{Colors:{light:{button:'#ffb400',text:'#000',background:'#fff'}}};
  if(name.endsWith('Layout'))return{rw:x=>x};
  if(name.endsWith('useResponsive'))return{contentColumn:()=>({})};
  if(name.endsWith('/api'))return{apiService:api};
  if(name.endsWith('recipeStorage'))return{recipeStorageService:{saveGeneratedRecipe:async()=>{calls.push(['cached'])}}};
  if(name.endsWith('analytics'))return{__esModule:true,default:{track:async()=>{},identify:async()=>{},markFeatureUsed:async()=>{},trackFirstAction:async()=>{},completeOnboarding:async()=>{}}};
  if(name.endsWith('revenuecat'))return{__esModule:true,default:{getSubscriptionStatus:()=>{subCalls++;return blockedSubscription||(blockOptional&&subCalls>1)?new Promise(()=>{}):Promise.resolve({isSubscribed:false})},isPromoCodeActivated:async()=>false}};
  if(name==='@react-native-async-storage/async-storage')return{getItem:async()=>'owner',setItem:async()=>{}};
  if(name.endsWith('deviceStorage'))return{getUniqueDeviceId:async()=>'device'};
  if(name.endsWith('weeklyPlanning'))return{savePendingOnboardingPlanImport:async()=>{}};
  if(name.includes('mascot'))return 'mascot';
  throw Error(name);
 }});
 return{render(props={}){cursor=0;const tree=loader?output.ClassicLoadingView(props):output.default();for(const effect of effects.splice(0))effect();return tree},requests,calls,animations,setReducedMotion(value){reducedMotion=value},fire(ms){for(const [i,timer]of [...timers])if(timer.ms===ms){timers.delete(i);timer.fn()}},pulse(n){for(let i=0;i<n;i++)for(const timer of [...intervals.values()])timer.fn()},unmount(){for(const cleanup of cleanups.values())cleanup?.()},timers};
}
function all(tree,type){if(!tree||typeof tree!=='object')return[];return[...(tree.type===type?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(child=>all(child,type))]}
const text=tree=>all(tree,'Text').map(x=>x.props.children.flat(Infinity).join(''));
(async()=>{
 const h=harness();h.render();h.fire(0);await tick();assert.equal(h.requests.length,1);assert.equal(h.render().type,'ContinuousLoading');assert.equal(h.render().props.mode,'request','the import uses continuous indeterminate motion rather than a percentage');
 h.requests[0].options.onProgress(15,'extracting_transcript');assert.equal(h.render().props.messageKey,'shareIntent.progressStep.extracting_transcript','real events update the label without controlling animation');
 h.requests[0].resolve({data:{recipe:{id:'saved',title:'Recette'}}});await tick();let tree=h.render();assert(text(tree).includes('shareIntent.success'),'a second blocked subscription read cannot hold an already imported recipe');
 h.fire(1500);assert(h.calls.some(([name,path])=>name==='dismissTo'&&path.pathname==='/(tabs)/meals'&&path.params.filter==='imported'),'the screen beneath the imported recipe is the current Meals tab with Imported selected');h.fire(100);assert(h.calls.some(([name,path])=>name==='push'&&path.params.recipeId==='saved'));h.unmount();
 const blocked=harness({blockedSubscription:true});blocked.render();blocked.fire(0);await tick();blocked.fire(330000);assert(text(blocked.render()).includes('shareIntent.timeout'),'subscription/identity preparation also has a terminal timeout');assert.equal(blocked.requests.length,0);blocked.unmount();
 const retry=harness({blockOptional:false});retry.render();retry.fire(0);await tick();retry.requests[0].resolve({error:'temporary failure'});await tick();tree=retry.render();const retryButton=all(tree,'Button').find(b=>text(b).includes('shareIntent.retry'));assert(retryButton);retryButton.props.onPress();retry.render();retry.fire(0);await tick();assert.equal(retry.requests.length,2);assert.equal(retry.requests[0].options.signal.aborted,true,'retry cancels the previous attempt');retry.unmount();assert.equal(retry.requests[1].options.signal.aborted,true,'leaving aborts the active stream');
 const motion=harness({loader:true});const props={mode:'request',messageKey:'shareIntent.progressStep.init'};motion.render(props);
 const travel=motion.animations.find(a=>a.kind==='loop'&&a.options.options?.duration===1500);assert(travel?.active,'the real shared loader keeps moving while waiting for the server');
 const loops=motion.animations.filter(a=>a.kind==='loop').length;motion.render({...props,messageKey:'shareIntent.progressStep.extracting_transcript'});motion.render({...props,messageKey:'shareIntent.progressStep.creating_recipe'});
 assert(travel.active);assert.equal(motion.animations.filter(a=>a.kind==='loop').length,loops,'stage labels do not restart or pause the continuous motion');
 motion.setReducedMotion(true);motion.render(props);assert.equal(travel.active,false,'reduced-motion preference stops continuous movement');motion.unmount();assert(motion.animations.filter(a=>a.kind==='loop').every(a=>!a.active),'leaving stops every animation');
 console.log('Import screen: uninterrupted shared-loader motion across stages, immediate real success, reduced motion, bounded preflight, retry and unmount cancellation passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
