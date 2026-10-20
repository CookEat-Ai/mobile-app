const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies) {
  const output = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, { exports: output, require: name => { if (name in dependencies) return dependencies[name]; throw Error(name); } });
  return output;
}
const layout = load('constants/Layout.ts', { 'react-native': { Dimensions: { get: () => ({ width: 390, height: 844 }), addEventListener() {} }, PixelRatio: { roundToNearestPixel: n => n }, Platform: { OS: 'ios' } } });
const { contentColumn } = load('hooks/useResponsive.ts', { react: { useMemo: f => f() }, 'react-native': {}, '../constants/Layout': layout });
for (const [width, height, columns] of [[320,568,1],[390,844,1],[430,932,1],[744,1133,2],[768,1024,2],[834,1210,2],[1032,1376,3],[507,1210,1]]) {
  const info = layout.buildResponsiveInfo({ width, height });
  const columnWidth = Math.min(width, contentColumn().maxWidth);
  assert.equal(columnWidth, width, 'portrait and split-view screens use available width');
  assert.equal(info.columns, columns);
  assert(info.layoutWidth <= 560, 'wide content must not balloon proportional illustrations');
  assert(info.font(30) <= 33.6);
  assert.equal(info.gutter, width >= 1024 ? 48 : width >= 744 ? 40 : width <= 360 ? 16 : 20);
  const cardWidth = (columnWidth - 2 * info.gutter - (columns - 1) * 16) / columns;
  assert(cardWidth >= 250, 'each recipe tile remains readable');
}
assert.equal(layout.buildResponsiveInfo({ width:390,height:844 }).rw(.5), 195);
assert.equal(layout.getLayoutWidth(1032), 560);
assert.equal(layout.getTabBarHeight(834,1210), 72);
const React = { createElement: (type, props, ...children) => ({type, props:{...props,children}}), useState: () => [false,()=>{}] };
let expanded = false;
React.useState = () => [expanded,()=>{}];
const { MealCostEstimate } = load('components/planning/MealCostEstimate.tsx', { react: React, 'react-native': { Linking:{},StyleSheet:{create:s=>s},Text:'Text',TouchableOpacity:'Button',View:'View' }, '@expo/vector-icons':{Ionicons:'Icon'}, 'react-i18next':{useTranslation:()=>({t:(key,props)=>key+(props?JSON.stringify(props):''),i18n:{language:'fr'}})}, '../../constants/AppTheme':require('./helpers/ui-theme.cjs') });
const walk = node => Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
const cost={status:'estimated',amount:26.7,knownAmount:26.7,perServing:3.81,low:22,high:32,servings:1,currency:'EUR',missingIngredients:[]};
for(const amount of [0,26.7,35,30000]) {
 const nodes=walk(MealCostEstimate({cost:{...cost,amount},total:true,budget:30}));
 const bar=nodes.find(n=>Array.isArray(n.props?.style)&&n.props.style.some(s=>typeof s?.width==='string'&&s.width.endsWith('%')));
 assert(bar,'budget progress remains visible');
 const width=bar.props.style.find(s=>s.width).width;
 assert(parseFloat(width)>=0&&parseFloat(width)<=100,'over-budget bar stays inside card');
 assert(!nodes.some(n=>JSON.stringify(n.props.children).includes('mealCost.range')),'range stays in expandable details');
}
const budgetSummary=walk(MealCostEstimate({cost,total:true,budget:30}));
assert(budgetSummary.some(n=>JSON.stringify(n.props.children).includes('mealCost.remaining')), 'a defined budget shows its remaining amount rather than an expandable range');
for (const [width, scale, expected] of [[664,1,1],[754,1,2],[936,1,2],[754,1.3,1],[507,1,1]]) {
 assert.equal(layout.getOverviewColumns(width,scale),expected,'pair cards only when actual content and font size fit');
}
for (const fixture of [cost, {...cost,status:'partial',amount:null,knownAmount:12}, {...cost,status:'unavailable',amount:null}, {...cost,low:null,high:null}]) {
 const nodes=walk(MealCostEstimate({cost:fixture,total:true}));
 assert(nodes.some(n=>n.props.testID==='budget-progress'),'bar remains present without a target, including partial/unavailable costs');
 const track=nodes.find(n=>n.props.testID==='budget-progress');
 if (fixture.status==='estimated' && fixture.low!==null) {
  assert.equal(track.props.accessibilityValue.min,22);
  assert.equal(track.props.accessibilityValue.max,32);
  assert.equal(track.props.accessibilityValue.now,26.7);
 } else assert.equal(track.props.accessibilityValue.now,undefined,'missing reference never creates fake progress');
}
const unavailable=walk(MealCostEstimate({cost:{...cost,status:'unavailable',amount:null},total:true,budget:30})).find(n=>n.props.testID==='budget-progress');
assert.equal(unavailable.props.accessibilityValue.text,'mealCost.unavailable','an unavailable estimate does not claim the existing target is missing');
for (const file of ['components/planning/PlanWeekContent.tsx','app/onboarding/weeklyPlanPreview.tsx']) {
 assert(fs.readFileSync(file,'utf8').includes('<PlanningOverview'),'both week views share the same adaptive overview');
}
const overview=fs.readFileSync('components/planning/PlanningOverview.tsx','utf8');
assert(overview.indexOf('<MealCostEstimate')<overview.indexOf('<PlanningNutritionSummary'),'budget stays first in reading order');
for(const lang of ['fr','en','de','es-ES','es-MX','pt-BR'])assert(JSON.parse(fs.readFileSync(`locales/${lang}.json`)).mealCost.noTarget);

let measuredWidth=754, fontScale=1;
const summaryReact={...React,useState:()=>[measuredWidth,()=>{}]};
const {PlanningOverview}=load('components/planning/PlanningOverview.tsx', {react:summaryReact,'react-native':{StyleSheet:{create:s=>s},View:'View',useWindowDimensions:()=>({fontScale})},'../../constants/Layout':layout,'./MealCostEstimate':{MealCostEstimate:'Budget'},'./PlanningNutritionSummary':{PlanningNutritionSummary:'Nutrition'}});
for (const [width,scale,paired] of [[754,1,true],[664,1,false],[936,1,true],[754,1.3,false]]) {
 measuredWidth=width;fontScale=scale;
 const tree=PlanningOverview({plan:{_id:'plan',estimatedCost:cost,preferences:{weeklyBudget:30}},meals:[{}],day:0});
 assert.equal(tree.props.children[0].props.panel,paired,'real shared view follows measured width and text size');
 assert.equal(tree.props.style.some(s=>s?.flexDirection==='row'),paired);
}
assert.equal(PlanningOverview({plan:{_id:'empty',preferences:{}},meals:[{}],day:0}).props.children[0],false,'missing cost leaves no empty budget column');

console.log('Responsive layout passed: phones, iPad mini/11/13, Split View, larger gutters, paired summaries, large text, budget bars with/without target, partial estimates and reading order.');
