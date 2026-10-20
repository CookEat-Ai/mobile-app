// Functional component harnesses consume the actual design tokens.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const moduleExports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../../constants/AppTheme.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:moduleExports,require:name=>{if(name==='react-native')return{StyleSheet:{create:value=>value}};throw Error(name);}});
module.exports=moduleExports;
