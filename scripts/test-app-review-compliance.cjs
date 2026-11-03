const fs=require('fs');const vm=require('vm');const assert=require('assert/strict');const root=require('path').resolve(__dirname,'..');const ts=require(root+'/node_modules/typescript');
function load(path, mocks, globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/'+path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:id=>{assert(id in mocks,'unexpected import '+id);return mocks[id];},console,setTimeout,clearTimeout,__DEV__:false,...globals});return exports;}
(async()=>{for(const os of ['ios','android']){let calls=0;const values=new Map([['promo_code_activated','true'],['rc_last_subscription_status',JSON.stringify({isSubscribed:true,currentPlan:'promo_code'})]]);const storage={getItem:async k=>values.get(k),setItem:async(k,v)=>values.set(k,v)};const policy=load('config/storeCompliance.ts',{'react-native':{Platform:{OS:os}}});const rc=load('config/revenuecat.ts',{'../services/reviewerAccess':{hasReviewerAccess:async()=>false},'./storeCompliance':policy,'@react-native-async-storage/async-storage':{default:storage,__esModule:true},'react-native':{Platform:{OS:os}},'react-native-purchases':{},'../services/api':{apiService:{validatePromoCode:async()=>{calls++;return {data:{isValid:true}};}}},'../services/analytics':{},'../services/appsflyer':{},'./env':{PUBLIC_ENV:{}}}).default;
assert.equal(await rc.isPromoCodeActivated(),os!=='ios');assert.equal(await rc.activatePromoCode('CREATOR'),os!=='ios');assert.equal(calls,os==='ios'?0:1);if(os==='ios')assert.equal(await rc.getLastSubscriptionStatus(),null);console.log(os+': creator activation, persisted access and API calls verified');}
let granted=false, unavailable=false;
const access=load('services/reviewerAccess.ts',{'./presentationMode':{enablePresentationModeByDefault:async()=>{}},'./api':{__esModule:true,default:{
 activateAdminAccess:async code=>({data:{active:code==='test-admin'}}),
 getAdminAccess:async()=>{if(unavailable)throw Error('offline');return {data:{active:granted}};}
}}});
assert.equal(await access.activateReviewerAccess('CREATOR'),false);
assert.equal(await access.activateReviewerAccess(' test-admin '),true);
assert.equal(await access.hasReviewerAccess(),false);
granted=true;assert.equal(await access.hasReviewerAccess(),true);
granted=false;assert.equal(await access.hasReviewerAccess(),false);
unavailable=true;assert.equal(await access.hasReviewerAccess(),false);
console.log('Admin access: server validation, revocation and offline denial verified');
// Both app build modes defer every code and access check to the server.
for (const dev of [true, false]) {
  let active = false, offline = false, activationCalls = 0, statusCalls = 0;
  const serverAccess = load('services/reviewerAccess.ts', {
    // A stale local grant must never be read or trusted.
    '@react-native-async-storage/async-storage': { __esModule: true, default: {
      getItem: async () => { throw Error('local access must not be read'); },
      setItem: async () => { throw Error('local access must not be written'); },
    } },
    './presentationMode': { enablePresentationModeByDefault: async () => {} },
    './api': { __esModule: true, default: {
      activateAdminAccess: async submitted => {
        activationCalls++;
        if (offline) throw Error('offline');
        active = submitted === '1234';
        return { data: { active } };
      },
      getAdminAccess: async () => {
        statusCalls++;
        if (offline) throw Error('offline');
        return { data: { active } };
      },
    } },
  }, { __DEV__: dev });
  assert.equal(await serverAccess.hasReviewerAccess(), false);
  assert.equal(await serverAccess.activateReviewerAccess('wrong'), false);
  assert.equal(await serverAccess.activateReviewerAccess(' 1234 '), true);
  assert.equal(activationCalls, 2, 'every code is submitted to the server');
  assert.equal(await serverAccess.hasReviewerAccess(), true);
  active = false;
  assert.equal(await serverAccess.hasReviewerAccess(), false, 'server revocation applies immediately');
  assert.equal(statusCalls, 3);
  offline = true;
  assert.equal(await serverAccess.hasReviewerAccess(), false);
  await assert.rejects(serverAccess.activateReviewerAccess('1234'), /offline/);
  console.log(`${dev ? 'Development' : 'Release'} client: server activation, revocation and offline denial verified`);
}
let requested=0, timer=null;
const values=new Map();
const review=load('services/planningReview.ts',{
 '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async k=>values.get(k)}},
 'react-native':{AppState:{currentState:'active'}},
 'expo-store-review':{hasAction:async()=>true,requestReview:async()=>requested++},
 './analytics':{__esModule:true,default:{track:()=>{}}}
},{setTimeout:(fn,ms)=>{assert.equal(ms,5000);timer=fn;return 1;},clearTimeout:()=>{timer=null;}});
review.schedulePlanningReview('onboarding',true);assert.equal(timer,null);
review.schedulePlanningReview('unflagged-onboarding');await timer();assert.equal(requested,0);
values.set('onboarding_completed','true');
review.schedulePlanningReview('first-post-onboarding');await timer();assert.equal(requested,1);
review.schedulePlanningReview('pending-plan');review.schedulePlanningReview('onboarding',true);assert.equal(timer,null);
console.log('Rating: onboarding blocked; usual five-second request restored after onboarding');
})().catch(e=>{console.error(e);process.exitCode=1});
