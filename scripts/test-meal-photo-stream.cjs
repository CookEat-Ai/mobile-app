const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/mealPhotoStream.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:output,Set});
const item={id:'food-0',name:'Crème "maison" 🍄',grams:100},analysis={scanId:'finished',kind:'meal',items:[item]};
const frame=(name,data)=>`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
const bytes=new TextEncoder().encode(': waiting\n\n'+frame('food',{item})+frame('food',{item})+frame('done',{analysis}));
const foods=[],stream=output.createMealPhotoStream(food=>foods.push(food)),decoder=new TextDecoder();
for(const byte of bytes)stream.push(decoder.decode(new Uint8Array([byte]),{stream:true}));
stream.push(decoder.decode());assert.equal(foods.length,1);assert.equal(foods[0].name,item.name);assert.equal(stream.finish().scanId,'finished');
stream.push(frame('error',{message:'late'}));assert.equal(stream.finish().scanId,'finished');
const located=[],updates=output.createMealPhotoStream(food=>located.push(food));
updates.push(frame('food',{item:{...item,locationPending:true,box:null}}));
updates.push(frame('food-location',{item:{...item,box:{x:.1,y:.2,width:.1,height:.1}}}));
assert.equal(located.length,2,'spatial refinement updates the existing food after early nutrition');
assert.equal(located[0].id,located[1].id);assert.equal(located[1].locationPending,undefined);assert(located[1].box);
updates.push(frame('food-location',{item:{...item,id:'unknown'}}));assert.equal(located.length,2,'an unknown refinement cannot invent an extra food');
const truncated=output.createMealPhotoStream(()=>{});truncated.push(frame('food',{item}));assert.throws(()=>truncated.finish(),/incomplete/);
assert.throws(()=>output.createMealPhotoStream(()=>{}).push(frame('error',{message:'offline'})),/failed/);
assert.throws(()=>output.createMealPhotoStream(()=>{}).push(frame('done',{})),/invalid/);
const source=ts.createSourceFile('api.ts',fs.readFileSync('services/api.ts','utf8'),ts.ScriptTarget.Latest,true);
const method=source.statements.find(ts.isClassDeclaration).members.find(n=>n.name?.getText(source)==='analyzeTrackedMeal').getText(source);
function harness({body=bytes,type='text/event-stream',status=200,pendingSession=false}={}){
 let resolveSession,aborts=0,cancelled=0,invalidated=0;
 const session=pendingSession?new Promise(resolve=>{resolveSession=resolve;}):Promise.resolve('test');
 const slots=new Map();let id=0;
 const exports={};
 vm.runInNewContext(ts.transpileModule(`export class Service { getCurrentLanguage(){return 'fr'} invalidateReadCache(){} ${method} }`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,AbortController,TextDecoder,FormData:class{append(){}},File:class{},createMealPhotoStream:output.createMealPhotoStream,
  getAnonymousSessionToken:()=>session,invalidateAnonymousSession:()=>invalidated++,API_BASE_URL:'https://example.test/api',i18n:{t:key=>key},
  setTimeout(fn){slots.set(++id,fn);return id;},clearTimeout(key){slots.delete(key);},
  expoFetch:async(_url,options)=>{options.signal.addEventListener('abort',()=>aborts++);let cursor=0;return{ok:status===200,status,headers:{get:()=>type},json:async()=>({analysis}),body:{getReader:()=>({async read(){if(options.signal.aborted)throw Error('aborted');if(cursor>=body.length)return{done:true};return{done:false,value:body.slice(cursor,cursor+=17)};},async cancel(){cancelled++;}})}};},
 });
 return{service:new exports.Service(),slots,resolveSession(){resolveSession?.('late');},expire(){[...slots.values()].forEach(fn=>fn());},stats(){return{aborts,cancelled,invalidated};}};
}
(async()=>{
 const h=harness(),arrivals=[],result=await h.service.analyzeTrackedMeal('private',undefined,item=>arrivals.push(item));assert(result.data);assert.equal(arrivals.length,1);assert.equal(h.stats().cancelled,1);assert.equal(h.slots.size,0);
 const legacy=harness({type:'application/json'});assert((await legacy.service.analyzeTrackedMeal('private')).data,'old API JSON remains usable');
 const unauthorized=harness({status:401});assert.equal((await unauthorized.service.analyzeTrackedMeal('private')).status,401);assert.equal(unauthorized.stats().invalidated,1);
 const cut=harness({body:new TextEncoder().encode(frame('food',{item}))});assert((await cut.service.analyzeTrackedMeal('private')).error,'EOF without done cannot autosave');
 const controller=new AbortController(),aborted=harness();controller.abort();assert((await aborted.service.analyzeTrackedMeal('private',controller.signal)).error);
 const timeout=harness({pendingSession:true}),pending=timeout.service.analyzeTrackedMeal('private');timeout.expire();assert((await pending).error,'timeout returns even while credentials remain unresolved');timeout.resolveSession();assert.equal(timeout.slots.size,0);
 console.log('Meal photo transport: byte-split UTF-8/JSON, deduplication, heartbeat, final-only success, incomplete/error streams, old API JSON, auth expiry, cancellation and deadline cleanup passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
