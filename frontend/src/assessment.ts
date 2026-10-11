/** Frontend projection of the backend's AnswerSubmission contract.
 * Raw images are not sent to the teaching API. They are first transcribed using
 * the authenticated /v1/learning/extract-image endpoint; this is NOT diagram grading.
 */
export type AnswerModality = 'text'|'audio'|'handwriting'|'diagram'|'code'|'numeric'|'choice';
export type AnswerKind = 'mcq'|'boolean'|'numeric'|'code'|'diagram'|'flowchart'|'labelled_image'|'mixed'|string;
export type Transcription = {
  text:string; extraction_confidence?:number|null; engine?:string;
  source?:'drawing'|'image';
};
export interface AnswerInput {
  kind:AnswerKind;
  answer:string;
  choice:number|null;
  codeMode:boolean;
  transcript:Transcription|null;
  transcriptApproved:boolean;
  fromSpeech?:boolean;
  requiredModalities?:string[];
}
export interface SubmissionPart {
  modality:AnswerModality;
  text?:string;
  code?:string;
  numeric_value?:number;
  selected_option?:number;
  extraction_confidence?:number|null;
}
export function buildSubmission(input:AnswerInput): {parts:SubmissionPart[]} {
  const value=input.answer.trim();
  const parts:SubmissionPart[]=[];
  if(input.kind==='mcq') {
    if(input.choice === null)throw new Error('Select an option.');
    parts.push({modality:'choice',selected_option:input.choice});
  } else if(input.kind==='numeric') {
    if(!value || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value))
      throw new Error('Enter a valid finite numeric answer.');
    const number=Number(value);
    if(!Number.isFinite(number))throw new Error('Numeric answer is out of range.');
    parts.push({modality:'numeric',numeric_value:number});
  } else if(input.kind==='code' || input.codeMode) {
    if(!value)throw new Error('Enter code to submit.');
    parts.push({modality:'code',code:value});
  } else if(input.kind==='boolean') {
    if(!['true','false'].includes(value.toLowerCase()))throw new Error('Choose True or False.');
    parts.push({modality:'text',text:value.toLowerCase()});
  } else {
    if(value)parts.push({modality:input.fromSpeech?'audio':'text',text:value});
    if(input.transcript){
      if(!input.transcriptApproved)throw new Error('Review and confirm the extracted transcript before submitting.');
      if(input.transcript.text.trim())parts.push({
        modality:input.transcript.source==='drawing'?'diagram':'handwriting',
        text:input.transcript.text.trim(),
        extraction_confidence:input.transcript.extraction_confidence??null,
      });
    }
  }
  if(!parts.length)throw new Error('Add an answer or readable transcription first.');
  const required=input.requiredModalities||[];
  const present=new Set<string>(parts.map(p=>p.modality));
  const missing=required.filter(m=>!present.has(m));
  if(missing.length)throw new Error(`This task also requires: ${missing.join(', ')}.`);
  return {parts};
}
export function makeAnswerTurn(input:AnswerInput) {
  const submission=buildSubmission(input);
  const kinds=new Set(submission.parts.map(p=>p.modality));
  const chosen=input.kind==='mcq'?input.choice:null;
  const numerical=input.kind==='numeric'?submission.parts[0].numeric_value??null:null;
  const code=input.kind==='code'||input.codeMode?input.answer.trim():null;
  return {
    response:input.kind==='mcq'?'':input.answer.trim(),
    selected_option:chosen,
    numeric_value:numerical,
    code,
    input_mode:kinds.size>1?'mixed':kinds.has('diagram')?'diagram':kinds.has('handwriting')?'handwriting':kinds.has('audio')?'voice':kinds.has('code')?'code':'text',
    learner_intent:'answer',
    submission:{parts:submission.parts,learner_confidence:null},
  };
}
