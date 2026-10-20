const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const slots=[],effects=[],cleanups=new Map();let cursor=0,key=null,activeListener,responseListener,enabled=false,registered=0,activity=0,opened=[],cleared=0;
const cold={notification:{request:{identifier:'meal-cold',content:{data:{type:'meal_photo_reminder'}}}}};
const react={useRef:value=>{const i=cursor++;return slots[i]||(slots[i]={current:value});},useEffect:(effect,deps)=>{const i=cursor++;if(!slots[i]||deps.some((value,j)=>value!==slots[i][j])){cleanups.get(i)?.();effects.push(()=>cleanups.set(i,effect()));}slots[i]=deps;}};
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('hooks/useNotifications.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:exportsObject,require:name=>{
 if(name==='react')return react;
 if(name==='react-native')return{Platform:{OS:'ios'},AppState:{addEventListener:(_event,fn)=>{activeListener=fn;return{remove(){activeListener=null;}};}}};
 if(name==='expo-notifications')return{getLastNotificationResponseAsync:async()=>cold,clearLastNotificationResponseAsync:async()=>{cleared++;}};
 if(name==='expo-router')return{router:{push:path=>opened.push(path)},useRootNavigationState:()=>key?{key}:null};
 if(name.endsWith('notificationService'))return{notificationService:{updateUserActivity:async()=>{activity++;},areNotificationsEnabled:async()=>enabled,registerForPushNotificationsAsync:async ask=>{assert.equal(ask,false,'foreground token sync cannot ask for permission');registered++;},addNotificationResponseReceivedListener:fn=>{responseListener=fn;return{remove(){responseListener=null;}};}}};
 if(name.endsWith('analytics'))return{__esModule:true,default:{track:async()=>{}}};throw Error(name);
}});
const render=()=>{cursor=0;exportsObject.useNotifications();while(effects.length)effects.shift()();};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 render();await tick();assert.equal(activity,1);assert.equal(registered,0,'startup never asks for permission or gets a token without a grant');assert.equal(opened.length,0,'cold response waits for navigation');
 key='ready';render();await tick();assert.equal(opened[0],'/(tabs)/tracking');assert.equal(cleared,1);
 responseListener(cold);assert.equal(opened.length,1,'cold/live delivery of the same response opens once');
 responseListener({notification:{request:{identifier:'meal-warm',content:{data:{type:'meal_photo_reminder'}}}}});assert.equal(opened.length,2);
 enabled=true;activeListener('inactive');await tick();assert.equal(registered,0);activeListener('active');await tick();assert.equal(activity,2);assert.equal(registered,1,'foreground refreshes timezone and token after permission or travel');
 for(const cleanup of cleanups.values())cleanup?.();assert.equal(activeListener,null);assert.equal(responseListener,null);
 console.log('Notifications: no startup permission prompt, foreground timezone/token refresh, cold/warm journal routing, response deduplication and listener cleanup passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
