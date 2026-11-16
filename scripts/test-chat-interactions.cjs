const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const Chat=()=>{},tracking=()=>{};
function harness(file,extra={}) {
 const slots=[],effects=[];let cursor=0;let rerender;
 const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:'fragment',useRef:value=>{const i=cursor++;return slots[i]||(slots[i]={current:value});},useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useEffect:(effect,deps)=>{const i=cursor++;const previous=slots[i];if(!previous||deps.some((d,j)=>d!==previous[j]))effects.push(effect);slots[i]=deps;},useCallback:fn=>fn};react.default=react;
 const exports={};const jsx=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(jsx,{exports,require:name=>{
  if(name==='react')return react;
  if(name==='react-native')return {StyleSheet:{create:x=>x},View:'View',Text:'Text',TouchableOpacity:'Button',Alert:{alert:()=>{}},Platform:{OS:'ios'},Animated:{},Keyboard:{}};
  if(name.includes('vector-icons'))return {Ionicons:'Icon'};
  if(name==='react-i18next')return {useTranslation:()=>({t:key=>key})};
  if(name.includes('safe-area'))return {useSafeAreaInsets:()=>({top:0,bottom:0})};
  if(name.includes('MotionPreferences'))return {useMotionAllowed:()=>false};
  if(name.includes('AppIconBadge'))return {AppIconBadge:'IconBadge'};
  if(name.endsWith('/ui/AppModal'))return {AppModal:'Modal'};
  if(name.includes('NavigationIconButton'))return {NavigationIconButton:'NavigationIconButton'};
  if(name.includes('ChatSheet'))return {ChatSheet:Chat};
  if(name.includes('AppTheme'))return require('./helpers/ui-theme.cjs');
  if(name.includes('anonymousSession'))return {getAnonymousUserId:async()=>'qa'};
  if(name.includes('planningUpdates'))return {invalidatePlanning:()=>{}};
  if(name.includes('personalRecipe'))return {personalRecipeFingerprint:()=>'',personalRecipeKey:()=>'',readPersonalRecipe:async()=>null,writePersonalRecipe:async()=>{},clearPersonalRecipe:async()=>{}};
  if(name.includes('/api'))return {apiService:extra.api};
  throw Error(name);
 }});
 return {render:(fn,props)=>{cursor=0;const tree=exports[fn](props);while(effects.length)effects.shift()();return tree;},exports};
}
function find(tree,type) {if(!tree||typeof tree!=='object')return null;if(tree.type===type)return tree;for(const child of [tree.props?.children].flat(Infinity)){const found=find(child,type);if(found)return found;}return null;}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 for(const [file,name,method,props]of [
  ['components/RecipeChat.tsx','RecipeChat','chatAboutRecipe',{recipe:{id:'qa',title:'Riz',servings:1,ingredients:[{name:'Riz'}]},context:'qa',onChange:()=>{}}],
  ['components/tracking/TrackingMealChat.tsx','TrackingMealChat','chatAboutTrackedMeal',{title:'Riz',items:[{id:'r',name:'Riz',grams:200,foodKey:'cookedRice'}],onChange:()=>{}}],
 ]) {
  let resolve,reject,calls=0,change=null;props.onChange=(...args)=>{change=args;};
  const api={[method]:()=>{calls++;return new Promise((a,b)=>{resolve=a;reject=b;});}};
  const h=harness(file,{api});let tree=h.render(name,props);await tick();tree=h.render(name,props);
  find(tree,Chat).props.onDraft('Corrige le riz à 150 g');tree=h.render(name,props);find(tree,Chat).props.onSend();
  tree=h.render(name,props);let chat=find(tree,Chat).props;
  assert.equal(chat.messages.length,1);assert.equal(chat.messages[0].role,'user');assert.equal(chat.draft,'');assert(chat.sending,'pending user message is visible before server response');
  chat.onSend();assert.equal(calls,1,'double tap is blocked');
  reject(Error('offline'));await tick();tree=h.render(name,props);chat=find(tree,Chat).props;assert(chat.error);assert.equal(chat.messages.length,1);
  chat.onRetry();tree=h.render(name,props);chat=find(tree,Chat).props;assert.equal(chat.messages.length,1,'retry must not duplicate user message');
  resolve({data:{action:'answer',reply:'Voici comment vérifier la quantité.',recipe:null,meal:null}});await tick();tree=h.render(name,props);chat=find(tree,Chat).props;
  assert.equal(chat.messages.length,2);assert.equal(chat.messages[1].role,'assistant');assert(!chat.sending);assert(!chat.error);assert.equal(change,null,'a question must not change the meal or recipe');
  chat.onDraft('Change le riz à 150 g');tree=h.render(name,props);find(tree,Chat).props.onSend();
  const updatedItems=[{id:'r',name:'Riz',foodKey:'cookedRice',grams:150}];
  resolve({data:{action:'modify',reply:'Quantité corrigée.',recipe:{title:'Riz adapté',ingredients:updatedItems},meal:{title:'Riz corrigé',items:updatedItems}}});await tick();tree=h.render(name,props);
  assert(change,'an explicit successful correction reaches the displayed result');
  if(method==='chatAboutTrackedMeal') {assert.equal(change[0],'Riz corrigé');assert.equal(change[1][0].grams,150);}else assert.equal(change[0].ingredients[0].grams,150);

 }
 const h=harness('components/chat/ChatSheet.tsx');const overlap=h.exports.keyboardOverlap;
 assert.equal(overlap(800,500),300);assert.equal(overlap(500,500),0,'native-resized window must not subtract keyboard twice');assert.equal(overlap(700,500),200,'page-sheet offset belongs to screen coordinates');assert.equal(overlap(800,null),0);
 console.log('Chat UI: optimistic send, immediate draft clear, duplicate-send guard, offline recovery without duplicate messages, replies and measured modal keyboard overlap passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
