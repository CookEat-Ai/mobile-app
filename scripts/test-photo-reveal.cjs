const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const Review=()=>{};
function harness({motion=true}={}) {
 const slots=[],effects=[],animations=[],timers=new Map();let timerId=0;let cursor=0;const cleanups=new Map();
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>{const i=cursor++;return slots[i]||(slots[i]={current:value});},useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useEffect:(effect,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i][j])){if(cleanups.has(i)){cleanups.get(i)?.();cleanups.delete(i);}effects.push(()=>cleanups.set(i,effect()));}slots[i]=deps;}};React.default=React;
 class Value {constructor(value){this.value=value;}setValue(value){this.value=value;}interpolate(value){return {value:this.value,...value};}stopAnimation(){for(const a of animations.filter(a=>a.value===this&&!a.done))a.stop();}}
 const Animated={Value,View:'AnimatedView',createAnimatedComponent:c=>c,timing:(value,options)=>({value,to:options.toValue,duration:options.duration,done:false,start(callback){this.callback=callback;animations.push(this);},stop(){if(!this.done){this.done=true;this.callback?.({finished:false});}}}),sequence:()=>({}),loop:()=>({start(){},stop(){}})};
 const geometry={containedPhotoFrame:(photo,viewport)=>{const scale=Math.min(viewport.width/photo.width,viewport.height/photo.height);return{left:(viewport.width-photo.width*scale)/2,top:(viewport.height-photo.height*scale)/2,width:photo.width*scale,height:photo.height*scale};},coverPhotoFrame:(photo,viewport)=>{const scale=Math.max(viewport.width/photo.width,viewport.height/photo.height);return{left:(viewport.width-photo.width*scale)/2,top:(viewport.height-photo.height*scale)/2,width:photo.width*scale,height:photo.height*scale};},visiblePhotoBox:()=>null};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/tracking/PhotoMealReveal.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,{exports,setTimeout:(callback,ms)=>{const id=++timerId;timers.set(id,{callback,ms});return id;},clearTimeout:id=>timers.delete(id),require:name=>{
  if(name==='react')return React;
  if(name==='react-native')return {Animated,Easing:{inOut:x=>x,out:x=>x,cubic:{},quad:{}},StyleSheet:{create:x=>x,absoluteFill:{}},useWindowDimensions:()=>({width:400,height:800}),View:'View',Text:'Text',TouchableOpacity:'Button'};
  if(name==='expo-image')return {Image:'Image'};
  if(name==='react-native-svg')return {default:'Svg',Ellipse:'Ellipse',__esModule:true};
  if(name.includes('vector-icons'))return {Ionicons:'Icon'};
  if(name==='react-i18next')return {useTranslation:()=>({t:key=>key})};
  if(name.includes('AppTheme'))return require('./helpers/ui-theme.cjs');
  if(name.includes('MotionPreferences'))return {useMotionAllowed:()=>motion};
  if(name.includes('mealTracking'))return geometry;
  if(name.includes('haptics'))return {feedback:{selection:()=>{},success:()=>{}}};
  if(name.includes('NavigationIconButton'))return {NavigationIconButton:'NavigationIconButton'};
  if(name.includes('PhotoMealReview'))return {PhotoMealReview:Review};
  throw Error(name);
 }});
 return {render(props){cursor=0;const tree=exports.PhotoMealReveal(props);while(effects.length)effects.shift()();return tree;},advance(){const a=animations.find(a=>!a.done);assert(a,'animation is scheduled');a.done=true;a.value.value=a.to;a.callback?.({finished:true});return a;},unmount(){for(const cleanup of cleanups.values())cleanup?.();},setMotion(value){motion=value;},expire(ms){for(const [id,timer] of [...timers])if(timer.ms<=ms){timers.delete(id);timer.callback();}},interrupt(){const a=animations.find(a=>!a.done);assert(a);a.stop();},animations};
}
const tick=()=>new Promise(r=>setImmediate(r));
function all(tree,type){if(!tree||typeof tree!=='object')return[];return [...(tree.type===type?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(child=>all(child,type))];}
const sample={scanId:'one',kind:'meal',mealType:'dinner',items:[{id:'a',name:'Riz',grams:200,visible:true,box:{x:.1,y:.1,width:.2,height:.2}},{id:'b',name:'Sauce',grams:30,visible:false,box:null}]};
(async()=>{
 let ready=0,expanded=0;const base={photo:{uri:'private-photo',width:1000,height:1000},analysis:null,title:'Repas',items:[],onTitle(){},onItems(){},onSave(){},onComplete(){ready++;},onExpand(){expanded++;},onBack(){},onRetry(){},onRetake(){},saving:false,error:'',processing:true};
 const h=harness();let tree=h.render(base);tree=h.render(base);assert.equal(all(tree,Review).length,0,'no nutrition sheet until real data arrives');
 const props={...base,analysis:sample,items:sample.items};h.render(props);tree=h.render(props);assert.equal(all(tree,Review).length,1);assert.equal(all(tree,Review)[0].props.progressItems.length,0);assert.equal(ready,0);assert.equal(expanded,1,'full scroll area opens at the start of the real result');
 assert.equal(all(tree,Review)[0].props.onSkip,undefined,'no skip control');
 const originalPhoto=all(all(tree,Review)[0].props.hero,'Image')[0];assert.equal(originalPhoto.props.source.uri,'private-photo');assert.equal(originalPhoto.props.contentFit,'cover','hero crops onto the meal like recipe detail');const hero=all(tree,Review)[0].props.hero;assert.equal(hero.props.style[0].borderRadius,undefined,'no inset rounded photo frame');assert.equal(hero.props.style[0].borderWidth,undefined);assert.equal(hero.props.style[1].height,320);
 h.advance();await tick();assert.equal(all(h.render(props),Review)[0].props.progressItems.length,0,'ring alone does not count food');
 h.advance();await tick();assert.equal(all(h.render(props),Review)[0].props.progressItems.length,1);
 h.advance();await tick();h.advance();await tick();tree=h.render(props);assert.equal(ready,1);assert.equal(all(tree,Review)[0].props.pending,false);assert.equal(all(tree,Review)[0].props.items.length,2);
 assert.equal(all(all(tree,Review)[0].props.hero,'Image')[0].props.source.uri,'private-photo','the original photo remains in the finished scrollable review');
 h.render(props);assert.equal(ready,1,'completion is idempotent');
 h.render({...base,error:'offline',processing:false});tree=h.render({...base,error:'offline',processing:false});assert.equal(all(tree,Review).length,0,'network error remains on frozen photo with retry');h.unmount();
 let interruptedReady=0;const interrupted=harness(),interruptedProps={...props,onComplete(){interruptedReady++;}};interrupted.render(interruptedProps);interrupted.interrupt();await tick();tree=interrupted.render(interruptedProps);assert.equal(interruptedReady,1);assert.equal(all(tree,Review)[0].props.pending,false,'interrupted native animation cannot leave summary loading');assert.equal(all(tree,Review)[0].props.progressItems.length,2);interrupted.unmount();
 let stalledReady=0;const stalled=harness(),stalledProps={...props,onComplete(){stalledReady++;}};stalled.render(stalledProps);stalled.expire(620);await tick();assert.equal(stalledReady,1,'missing animation callback has a bounded fallback');assert.equal(all(stalled.render(stalledProps),Review)[0].props.pending,false);stalled.unmount();
 let closedReady=0;const closed=harness(),closedProps={...props,onComplete(){closedReady++;}};closed.render(closedProps);closed.unmount();closed.expire(20000);await tick();assert.equal(closedReady,0,'closing invalidates callbacks and timers');
 let reducedReady=0;const reduced=harness({motion:false}),reducedProps={...props,onComplete(){reducedReady++;}};reduced.render(reducedProps);tree=reduced.render(reducedProps);assert.equal(reducedReady,1);assert.equal(all(tree,Review)[0].props.pending,false);reduced.unmount();
 let changedReady=0;const changed=harness(),changedProps={...props,onComplete(){changedReady++;}};changed.render(changedProps);changed.setMotion(false);changed.render(changedProps);await tick();assert.equal(changedReady,1,'background/reduced motion releases the real result');changed.setMotion(true);changed.render(changedProps);assert.equal(changedReady,1,'returning cannot replay or double-complete result');changed.unmount();
 let emptyReady=0;const empty=harness(),emptyProps={...props,analysis:{...sample,scanId:'empty',kind:'not_food',items:[]},items:[],onComplete(){emptyReady++;}};empty.render(emptyProps);tree=empty.render(emptyProps);assert.equal(emptyReady,1);assert.equal(all(tree,Review)[0].props.pending,false);empty.unmount();
 console.log('Photo reveal: real cumulative data, one full scrollable review, retained photo, no skip, interrupted/missing callbacks, bounded completion, close cancellation, errors and reduced motion passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
