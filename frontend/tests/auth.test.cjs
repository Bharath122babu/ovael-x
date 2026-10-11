/* Contract tests run against transpiled TypeScript without a browser. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const filename=path.resolve(__dirname,'../src/auth.ts');
const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod._compile(code,filename);
const {MIN_PASSWORD_LENGTH,passwordMinLength}=mod.exports;
test('registration enforces the minimum, sign-in does not',()=>{
  assert.equal(passwordMinLength('register'),MIN_PASSWORD_LENGTH);
  assert.equal(passwordMinLength('login'),undefined);
});
test('frontend minimum matches the backend validator',()=>{
  const backend=fs.readFileSync(path.resolve(__dirname,'../../backend/src/adaptive_backend/auth.py'),'utf8');
  const match=backend.match(/len\(password\)\s*<\s*(\d+)/);
  assert.ok(match,'backend password-length check not found');
  assert.equal(MIN_PASSWORD_LENGTH,Number(match[1]));
});
