const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const Review=()=>{};
function harness({motion=true,foreground=true,ready=true}={}) {
 const slots=[],effects=[],animations=[],timers=new Map(),frames=new Map();let frameId=0,paintEnabled=true;let timerId=0;let cursor=0;const cleanups=new Map();
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>{const i=cursor++;return slots[i]||(slots[i]={current:value});},useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useEffect:(effect,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i][j])){if(cleanups.has(i)){cleanups.get(i)?.();cleanups.delete(i);}effects.push(()=>cleanups.set(i,effect()));}slots[i]=deps;}};React.default=React;
 class Value {constructor(value){this.value=value;}setValue(value){this.value=value;}interpolate(value){return {animatedValue:this,...value};}stopAnimation(){for(const a of animations.filter(a=>a.value===this&&!a.done))a.stop();}}
 const Animated={Value,View:'AnimatedView',createAnimatedComponent:c=>c,timing:(value,options)=>({value,to:options.toValue,duration:options.duration,done:false,start(callback){this.callback=callback;animations.push(this);},stop(){if(!this.done){this.done=true;this.callback?.({finished:false});}}}),sequence:()=>({}),loop:()=>({start(){},stop(){}})};
 const geometry={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/mealTracking.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:geometry,require:()=>({getItem:async()=>null,setItem:async()=>{}})});
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/tracking/PhotoMealReveal.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,{exports,requestAnimationFrame:callback=>{const id=++frameId;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:(callback,ms)=>{const id=++timerId;timers.set(id,{callback,ms});return id;},clearTimeout:id=>timers.delete(id),require:name=>{
  if(name==='react')return React;
  if(name==='react-native')return {Animated,Easing:{inOut:x=>x,out:x=>x,cubic:{},quad:{}},StyleSheet:{create:x=>x,absoluteFill:{}},useWindowDimensions:()=>({width:400,height:800}),View:'View',Text:'Text',TouchableOpacity:'Button'};
  if(name==='expo-image')return {Image:'Image'};
  if(name==='expo-linear-gradient')return {LinearGradient:'LinearGradient'};
  if(name.includes('CameraBrand'))return {CameraBrand:'CameraBrand'};
  if(name==='react-native-svg')return {default:'Svg',Ellipse:'Ellipse',__esModule:true};
  if(name.includes('vector-icons'))return {Ionicons:'Icon'};
  if(name==='react-i18next')return {useTranslation:()=>({t:key=>key})};
  if(name.includes('AppTheme'))return require('./helpers/ui-theme.cjs');
  if(name.includes('MotionPreferences'))return {useMotionAllowed:()=>motion&&foreground,useMotionPreferences:()=>({enabled:motion,foreground,ready})};
  if(name.includes('mealTracking'))return geometry;
  if(name.includes('haptics'))return {feedback:{selection:()=>{},success:()=>{}}};
  if(name.includes('NavigationIconButton'))return {NavigationIconButton:'NavigationIconButton'};
  if(name.includes('PhotoMealReview'))return {PhotoMealReview:Review};
  throw Error(name);
 }});
 return {render(props){cursor=0;const tree=exports.PhotoMealReveal(props);while(effects.length)effects.shift()();return tree;},advance(value){const a=animations.find(a=>!a.done&&(!value||a.value===value));assert(a,'animation is scheduled');a.done=true;a.value.value=a.to;a.callback?.({finished:true});return a;},unmount(){for(const cleanup of cleanups.values())cleanup?.();},setMotion(value){motion=value;},setForeground(value){foreground=value;},setReady(value){ready=value;},setPaintEnabled(value){paintEnabled=value;},paint(){if(!paintEnabled)return;for(let pass=0;pass<2;pass++)for(const [id,callback] of [...frames]){frames.delete(id);callback();}},expire(ms){for(const [id,timer] of [...timers])if(timer.ms<=ms){timers.delete(id);timer.callback();}},interrupt(value){const a=animations.find(a=>!a.done&&(!value||a.value===value));assert(a);a.stop();},animations};
}
const tick=()=>new Promise(r=>setImmediate(r));
function all(tree,type){if(!tree||typeof tree!=='object')return[];return [...(tree.type===type?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(child=>all(child,type))];}
function renderReview(props){
 let nutritionIds=[];
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:value=>[typeof value==='function'?value():value,()=>{}],useRef:value=>({current:value}),useEffect:()=>{},useCallback:fn=>fn};React.default=React;
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/tracking/PhotoMealReview.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{
  if(name==='react')return React;
  if(name==='react-native')return new Proxy({StyleSheet:{create:value=>value},Platform:{OS:'ios'}},{get:(object,key)=>object[key]||key});
  if(name==='react-i18next')return{useTranslation:()=>({t:key=>key})};
  if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>({top:0,bottom:0})};
  if(name.includes('useResponsive'))return{useResponsive:()=>({gutter:16})};
  if(name.includes('AppTheme'))return require('./helpers/ui-theme.cjs');
  if(name.includes('mealTracking'))return{mealNutrition:items=>{nutritionIds=items.map(item=>item.id);return null;},foodNutrition:()=>null};
  return new Proxy({},{get:(_object,key)=>key});
 }});
 return {tree:exports.PhotoMealReview(props),nutritionIds:()=>nutritionIds};
}
const sample={scanId:'one',kind:'meal',mealType:'dinner',items:[{id:'a',name:'Riz',grams:200,visible:true,box:{x:.1,y:.1,width:.2,height:.2}},{id:'b',name:'Sauce',grams:30,visible:false,box:null}]};
const draw=(h,props)=>{h.render(props);const tree=h.render(props);h.paint();return tree;};
const review=tree=>all(tree,Review)[0];
const contour=(tree,id)=>all(review(tree).props.hero,'Ellipse').find(node=>node.props.testID===`food-contour-${id}`);
const fragment=(tree,id)=>all(tree,'AnimatedView').find(node=>node.props.testID===`food-flight-${id}`);
async function step(h,props,id,phase){
 const tree=draw(h,props);await tick();
 const value=phase==='ring'?contour(tree,id).props.strokeDashoffset.animatedValue:phase==='morph'?contour(tree,id).props.rx.animatedValue:fragment(tree,id).props.style[1].opacity.animatedValue;
 const alignment=contour(tree,id)?.props.cx.animatedValue;if(phase==='ring'&&h.animations.some(a=>!a.done&&a.value===alignment)){h.advance(alignment);await tick();}const animation=h.advance(value);await tick();
 if(phase==='ring'){
  let closed=draw(h,props);await tick();
  assert.equal(contour(closed,id).props.strokeDashoffset.animatedValue.value,1,'stroke is fully drawn before transformation');
  assert.equal(contour(closed,id).props.opacity.animatedValue.value,0,'completed contour stays fully opaque during its hold');
  h.expire(239);await tick();closed=draw(h,props);assert.equal(contour(closed,id).props.opacity.animatedValue.value,0,'closed contour has a minimum readable hold');
  h.expire(240);await tick();
 }
 return animation;
}
async function land(h,props,id){await step(h,props,id,'ring');await step(h,props,id,'morph');await step(h,props,id,'flight');}
(async()=>{
 let ready=0,expanded=0;
 const base={photo:{uri:'private-photo',width:1000,height:1000},analysis:null,title:'Repas',items:[],onTitle(){},onItems(){},onSave(){},onComplete(){ready++;},onExpand(){expanded++;},onBack(){},onRetry(){},onRetake(){},saving:false,error:'',processing:true};
 const h=harness();let tree=draw(h,base);assert.equal(all(tree,Review).length,0,'frozen photo precedes real detections');
 const rice={...sample.items[0],icon:'🍚',detectionRegion:sample.items[0].box,box:null,locationPending:true};
 const banana={...rice,id:'banana',name:'Banane',icon:'🍌',detectionRegion:{x:.55,y:.2,width:.2,height:.2}};
 const hidden={...sample.items[1],icon:'🫒'};
 let live={...base,progressItems:[rice]};tree=draw(h,live);await tick();
 assert(contour(tree,'a'),'first raw detection immediately owns a contour, without a verified position');assert.equal(h.animations.length,1);assert.equal(h.animations[0].duration,500);assert.equal(review(tree).props.analysis,null);assert.equal(review(tree).props.progressItems.length,0);
 const initialRing=h.animations[0];live={...base,progressItems:[rice,banana,hidden]};tree=draw(h,live);await tick();
 assert.equal(h.animations.length,2,'distinct regions start together; an enclosing fallback waits instead of masking them');tree=draw(h,live);assert.equal(review(tree).props.currentFood.id,'a','the announced food is drawing, never the last queued food');assert.equal(all(review(tree).props.hero,'View').filter(node=>node.props.testID?.startsWith('food-contour-label-')).length,2,'each visible contour names its own ingredient');assert(!all(review(tree).props.hero,'View').some(node=>node.props.testID==='food-contour-label-b'),'queued fallback cannot announce a contour it has not drawn');assert.equal(initialRing.done,false,'stream updates do not restart the first ring');assert(contour(tree,'banana'));assert(contour(tree,'b'),'inferred/no-location foods also get a zone contour');assert.equal(expanded,1);
 assert(contour(tree,'b').props.rx.outputRange[0]>0);assert(contour(tree,'b').props.ry.outputRange[0]>0);
 const liveReview=renderReview(review(tree).props);assert.equal(liveReview.nutritionIds().length,0,'recap nutrition follows landed ingredients, not raw detections');assert.equal(all(liveReview.tree,'ScrollView')[0].props.stickyHeaderIndices.join(','),'0','scrolling the ingredient sheet cannot hide the remaining contours');
 const originalPhoto=all(review(tree).props.hero,'Image')[0];assert.equal(originalPhoto.props.source.uri,'private-photo');assert.equal(originalPhoto.props.contentFit,'contain','the whole source photo stays visible while contours are drawing');assert.equal(review(tree).props.hero.props.style[1].height,320);
 assert.equal(all(review(tree).props.hero,'CameraBrand').length,1,'brand stays on the analysis photo');assert.equal(all(review(tree).props.hero,'NavigationIconButton').length,1,'only the close control remains after capture');
 // A verified refinement received during the ring supplies the photo fragment.
 live={...base,progressItems:[{...rice,box:sample.items[0].box,locationPending:false},banana,hidden]};draw(h,live);assert.equal(h.animations.filter(a=>a.duration===500).length,2,'location refinements cannot replay a contour');
 await step(h,live,'a','ring');tree=draw(h,live);assert(all(tree,'Image').some(node=>node.props.testID==='food-photo-a'),'verified pixels may replace the approximate region before flight');
 await step(h,live,'a','morph');tree=draw(h,live);assert.equal(review(tree).props.progressItems.length,0,'a contour/morph alone has not landed');await step(h,live,'a','flight');tree=draw(h,live);assert.equal(review(tree).props.progressItems.map(item=>item.id).join(','),'a');
 // No precise position: collapse the zone into the actual food emoji, then fly.
 live={...live,progressItems:live.progressItems.map(food=>food.id==='banana'?{...food,locationPending:false}:food)};await step(h,live,'banana','ring');tree=draw(h,live);assert(all(tree,'Text').some(node=>node.props.testID==='food-emoji-banana'&&node.props.children.includes('🍌')));assert(!all(tree,'Image').some(node=>node.props.testID==='food-photo-banana'),'an unverified region must never become a misleading photo crop');
 await step(h,live,'banana','morph');assert.equal(fragment(draw(h,live),'banana').props.children[0].props.style[1].opacity.animatedValue.value,1,'emoji becomes visible during the zone transformation');await step(h,live,'banana','flight');
 await land(h,live,'b');tree=draw(h,live);assert.equal(review(tree).props.progressItems.length,3,'every ingredient lands, including hidden and unlocated foods');assert.equal(ready,0,'animation completion cannot finalize incomplete nutrition');
 const actual=renderReview(review(tree).props);assert.equal(actual.nutritionIds().length,3);assert.equal(all(actual.tree,'TouchableOpacity').filter(node=>node.props.accessibilityLabel==='tracking.changeFood').length,3);
 const animationCount=h.animations.length;live={...live,progressItems:[live.progressItems[0],{...banana,locationPending:false,box:sample.items[0].box},hidden]};draw(h,live);assert.equal(h.animations.length,animationCount,'late positions never replay already landed ingredients');
 const finalAnalysis={...sample,items:live.progressItems};const final={...live,analysis:finalAnalysis,items:finalAnalysis.items};tree=draw(h,final);assert.equal(ready,1);assert.equal(review(tree).props.pending,false);assert.equal(review(tree).props.items.length,3);assert.equal(all(review(tree).props.hero,'Image')[0].props.contentFit,'cover','finished review keeps its original cover presentation');assert.equal(h.animations.filter(a=>a.duration!==180).length,9,'each ingredient had one ring, morph and flight; recentering does not replay them');draw(h,final);assert.equal(ready,1);h.unmount();
 // A late verified location moves the same stroke before its photo flight,
 // while another ingredient is still being detected independently.
 const recentered=harness();let rp={...base,progressItems:[rice,banana]};tree=draw(recentered,rp);await tick();const stroke=contour(tree,'a').props.strokeDashoffset.animatedValue;recentered.advance(stroke);await tick();tree=draw(recentered,rp);await tick();recentered.expire(1000);await tick();assert.equal(review(draw(recentered,rp)).props.progressItems.length,0,'an unverified food cannot fly away before its own location check');
 const trueBox={x:.6,y:.3,width:.2,height:.1};rp={...rp,progressItems:[{...rice,box:trueBox,locationPending:false},banana]};tree=draw(recentered,rp);tree=draw(recentered,rp);await tick();const position=contour(tree,'a').props.cx;assert.equal(position.outputRange[0],104);assert.equal(position.outputRange[1],264,'the stroke moves to the independently verified food center');assert.equal(contour(tree,'a').props.strokeDashoffset.animatedValue,stroke);assert.equal(stroke.value,1,'recentering preserves completed stroke progress');assert.equal(recentered.animations.filter(a=>a.duration===500).length,2,'position updates do not replay a ring');recentered.advance(position.animatedValue);await tick();draw(recentered,rp);await tick();recentered.expire(240);await tick();await step(recentered,rp,'a','morph');await step(recentered,rp,'a','flight');tree=draw(recentered,rp);assert.deepEqual(review(tree).props.progressItems[0].box,trueBox);assert(contour(tree,'banana'),'another pending ingredient is not discarded or required to finish');recentered.unmount();
 // Final metadata can arrive while all independent jobs are still in flight.
 let finalReady=0;const concurrent=harness(),complete={...base,analysis:sample,items:sample.items,onComplete(){finalReady++;}};tree=draw(concurrent,complete);await tick();assert.equal(concurrent.animations.length,1);await land(concurrent,complete,'a');assert.equal(finalReady,0,'one finished job cannot drop the other food animation');await land(concurrent,complete,'b');assert.equal(finalReady,1);assert.equal(review(draw(concurrent,complete)).props.pending,false);concurrent.unmount();
 // A covered/cropped-out sample falls back to a zone and emoji, never a fake crop.
 const outside=harness(),offscreen={...rice,id:'offscreen',locationPending:false,box:{x:0,y:0,width:.01,height:.01},detectionRegion:null};const outsideProps={...base,progressItems:[offscreen]};tree=draw(outside,outsideProps);assert(contour(tree,'offscreen'));await step(outside,outsideProps,'offscreen','ring');tree=draw(outside,outsideProps);assert(!all(tree,'Image').some(node=>node.props.testID==='food-photo-offscreen'));await step(outside,outsideProps,'offscreen','morph');await step(outside,outsideProps,'offscreen','flight');assert.equal(review(draw(outside,outsideProps)).props.progressItems.length,1);outside.unmount();
 let reducedReady=0;const reduced=harness({motion:false}),reducedProps={...complete,onComplete(){reducedReady++;}};tree=draw(reduced,reducedProps);assert.equal(reducedReady,1);assert.equal(reduced.animations.length,0);assert.equal(review(tree).props.pending,false);reduced.unmount();
 const changed=harness(),partial={...base,progressItems:[rice,banana]};draw(changed,partial);changed.setMotion(false);tree=draw(changed,partial);assert.equal(review(tree).props.progressItems.length,2);const count=changed.animations.length;changed.setMotion(true);draw(changed,partial);assert.equal(changed.animations.length,count,'returning from background/reduced motion cannot replay shown food');changed.unmount();
 // A transient inactive/background state suspends jobs, it does not land them.
 const background=harness();let bg={...base,progressItems:[{...rice,locationPending:false},banana]};draw(background,bg);await land(background,bg,'a');
 background.setForeground(false);tree=draw(background,bg);await tick();assert.equal(review(tree).props.progressItems.length,1,'backgrounding cannot silently deliver unfinished foods');
 bg={...bg,analysis:{...sample,items:[rice,banana,hidden]},items:[rice,banana,hidden]};tree=draw(background,bg);assert.equal(review(tree).props.pending,true,'final nutrition arriving in background cannot skip the remaining rings');
 background.setForeground(true);tree=draw(background,bg);await tick();assert(!contour(tree,'a'),'already landed food does not replay after resume');assert(contour(tree,'banana'));assert(contour(tree,'b'),'a food detected in background is still scheduled on resume');
 await land(background,bg,'banana');assert.equal(review(draw(background,bg)).props.pending,true);await land(background,bg,'b');assert.equal(review(draw(background,bg)).props.pending,false);background.unmount();
 // A false native completion is an interruption, never a successful ring.
 const interrupted=harness(),interruptedProps={...base,progressItems:[{...rice,locationPending:false}]};tree=draw(interrupted,interruptedProps);await tick();
 const interruptedValue=contour(tree,'a').props.strokeDashoffset.animatedValue;interrupted.interrupt(interruptedValue);await tick();draw(interrupted,interruptedProps);await tick();
 assert.equal(interrupted.animations.length,2,'interrupted ring is redrawn rather than jumping to morph/flight');assert.equal(interruptedValue.value,0);assert.equal(review(draw(interrupted,interruptedProps)).props.progressItems.length,0);await land(interrupted,interruptedProps,'a');interrupted.unmount();
 // Rendering can lag timers. No contour may run before its committed frame.
 let delayedReady=0;const delayed=harness(),delayedProps={...complete,onComplete(){delayedReady++;}};delayed.setPaintEnabled(false);draw(delayed,delayedProps);await tick();delayed.expire(10000);await tick();
 assert.equal(delayed.animations.length,0);assert.equal(delayedReady,0,'old final timeout cannot declare unpainted foods complete');assert.equal(review(draw(delayed,delayedProps)).props.progressItems.length,0);
 delayed.setPaintEnabled(true);draw(delayed,delayedProps);await tick();await land(delayed,delayedProps,'a');assert.equal(delayedReady,0);await land(delayed,delayedProps,'b');assert.equal(delayedReady,1);delayed.unmount();
 // Missing callbacks recover each individual phase and closed hold, never all
 // foods at once through a global finalization timeout.
 let boundedReady=0;const bounded=harness(),boundedProps={...complete,onComplete(){boundedReady++;}};draw(bounded,boundedProps);await tick();bounded.expire(3000);await tick();assert.equal(boundedReady,0,'watchdog cannot drop active contours');
 for(let attempt=0;attempt<32&&boundedReady===0;attempt++){draw(bounded,boundedProps);await tick();bounded.expire(10000);await tick();}
 tree=draw(bounded,boundedProps);assert.equal(boundedReady,1,'per-phase recovery still bounds missing native callbacks');assert.equal(review(tree).props.progressItems.length,2);bounded.unmount();
 // Equal unknown zones need separate readable contours, not stacked circles.
 const shared=harness(),sharedItems=[0,1,2].map(i=>({...rice,id:'same-'+i,detectionRegion:null,locationPending:false})),sharedProps={...base,analysis:{...sample,items:sharedItems},items:sharedItems};draw(shared,sharedProps);await tick();assert.equal(shared.animations.length,1,'identical fallback zones cannot obscure each other');
 for(const item of sharedItems){await land(shared,sharedProps,item.id);}
 assert.equal(review(draw(shared,sharedProps)).props.pending,false);assert.equal(shared.animations.length,9,'each shared-zone food still receives all phases');shared.unmount();
 // An enclosing region has low IoU with a smaller one: both still need
 // separate readable contours. Waiting jobs use newly verified positions.
 const enclosed=harness(),wide={...rice,id:'wide',locationPending:false,detectionRegion:{x:.05,y:.05,width:.9,height:.9}},small={...rice,id:'small',detectionRegion:{x:.4,y:.4,width:.05,height:.05}};let enclosedProps={...base,progressItems:[wide,small]};tree=draw(enclosed,enclosedProps);await tick();assert.equal(enclosed.animations.length,1,'an enclosing region cannot hide a small contour even with low IoU');tree=draw(enclosed,enclosedProps);assert.equal(review(tree).props.currentFood.id,'wide');
 const refined={...small,locationPending:false,box:{x:.7,y:.7,width:.08,height:.08}};enclosedProps={...base,progressItems:[wide,refined]};draw(enclosed,enclosedProps);await land(enclosed,enclosedProps,'wide');tree=draw(enclosed,enclosedProps);assert.equal(review(tree).props.currentFood.id,'small');assert.equal(contour(tree,'small').props.cx.outputRange[0],276.8,'queued ring starts on its latest verified center');await land(enclosed,enclosedProps,'small');assert.equal(review(draw(enclosed,enclosedProps)).props.progressItems.length,2);enclosed.unmount();
 // Burst delivery and early final metadata must drain every ingredient.
 const burst=harness(),burstItems=Array.from({length:20},(_,i)=>({...rice,id:'burst-'+i,detectionRegion:{x:.01+(i%4)*.24,y:.01+Math.floor(i/4)*.19,width:.1,height:.08}})),burstProps={...base,analysis:{...sample,items:burstItems},items:burstItems};draw(burst,burstProps);await tick();assert(burst.animations.length>0&&burst.animations.length<20,'overlapping labels/contours wait while separate regions begin immediately');
 const burstSeen=new Set();while(burstSeen.size<20){tree=draw(burst,burstProps);tree=draw(burst,burstProps);const label=all(review(tree).props.hero,'View').find(node=>node.props.testID?.startsWith('food-contour-label-'));assert(label,'remaining ingredients must have a visible named contour');const id=label.props.testID.slice('food-contour-label-'.length);assert(!burstSeen.has(id),'a landed ingredient cannot replace a waiting ingredient');await land(burst,burstProps,id);burstSeen.add(id);if(burstSeen.size<20)assert.equal(review(draw(burst,burstProps)).props.pending,true);}
 assert.equal(review(draw(burst,burstProps)).props.pending,false);assert.equal(burst.animations.length,60,'every burst ingredient completes all three phases');burst.unmount();
 // A validated inventory may reject a provisional food, including mid-stroke.
 const corrected=harness(),provisional={...rice,id:'invented-fat',locationPending:false},confirmedRice={...rice,locationPending:false};
 let correctedProps={...base,progressItems:[provisional,confirmedRice]};draw(corrected,correctedProps);await tick();
 assert(contour(draw(corrected,correctedProps),'invented-fat'));
 correctedProps={...correctedProps,analysis:{...sample,items:[confirmedRice]},items:[confirmedRice]};
 tree=draw(corrected,correctedProps);await tick();tree=draw(corrected,correctedProps);
 assert(!contour(tree,'invented-fat'),'a rejected provisional contour is removed');
 await land(corrected,correctedProps,confirmedRice.id);
 tree=draw(corrected,correctedProps);assert.equal(review(tree).props.pending,false);assert.equal(review(tree).props.progressItems.length,1);assert.equal(review(tree).props.progressItems[0].id,confirmedRice.id);corrected.unmount();
 let closedReady=0;const closed=harness(),closedProps={...complete,onComplete(){closedReady++;}};draw(closed,closedProps);closed.unmount();closed.expire(20000);await tick();assert.equal(closedReady,0,'dismissal invalidates every active job and timer');
 let emptyReady=0;const empty=harness(),emptyProps={...complete,analysis:{...sample,scanId:'empty',kind:'not_food',items:[]},items:[],onComplete(){emptyReady++;}};tree=draw(empty,emptyProps);assert.equal(emptyReady,1);assert.equal(review(tree).props.pending,false);empty.unmount();
 const failed=harness();tree=draw(failed,{...base,error:'offline',processing:false});assert.equal(all(tree,Review).length,0);draw(failed,partial);tree=draw(failed,{...partial,error:'offline',processing:false});assert.equal(review(tree).props.onRetry,base.onRetry);failed.unmount();
 console.log('Photo reveal: committed-frame start, full closed-contour hold, interrupted/missing callback recovery, background resume without skipped foods, 20-food bursts, final drain, emoji/photo morph, precise crops, recap, reduced motion and dismissal passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
