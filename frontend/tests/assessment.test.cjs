/* Contract tests run against transpiled TypeScript without a browser. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const filename=path.resolve(__dirname,'../src/assessment.ts');
const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod._compile(code,filename);
const {makeAnswerTurn,buildSubmission}=mod.exports;
const basic={kind:'free_text',answer:'Golgi sorts proteins',choice:null,codeMode:false,transcript:null,transcriptApproved:false};
test('free text retains typed answer',()=>assert.deepEqual(makeAnswerTurn(basic).submission.parts,[{modality:'text',text:basic.answer}]));
test('mcq picks the zero-indexed option',()=>assert.equal(makeAnswerTurn({...basic,kind:'mcq',answer:'',choice:0}).selected_option,0));
test('numeric rejects NaN and accepts finite decimals',()=>{
  assert.throws(()=>makeAnswerTurn({...basic,kind:'numeric',answer:'xyz'}),/numeric/i);
  assert.equal(makeAnswerTurn({...basic,kind:'numeric',answer:'-1.25'}).numeric_value,-1.25);
});
test('code uses code evidence',()=>assert.equal(makeAnswerTurn({...basic,kind:'code',answer:'print(1)'}).submission.parts[0].modality,'code'));
test('boolean requires explicit boolean text',()=>{
  assert.throws(()=>buildSubmission({...basic,kind:'boolean'}),/true or false/i);
  assert.equal(makeAnswerTurn({...basic,kind:'boolean',answer:'true'}).submission.parts[0].text,'true');
});
test('OCR must be reviewed and remains separate from typed answer',()=>{
  const unconfirmed={...basic,transcript:{text:'ATP',extraction_confidence:0.95,source:'image'}};
  assert.throws(()=>makeAnswerTurn(unconfirmed),/confirm/i);
  const done=makeAnswerTurn({...unconfirmed,transcriptApproved:true});
  assert.deepEqual(done.submission.parts.map(p=>p.modality),['text','handwriting']);
  assert.equal(done.input_mode,'mixed');
});
test('required modality cannot be silently skipped',()=>{
  assert.throws(()=>makeAnswerTurn({...basic,kind:'mixed',requiredModalities:['text','diagram']}),/diagram/);
});
