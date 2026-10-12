import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {makeAnswerTurn, type Transcription} from './assessment';
import {Activity,ArrowRight,BookOpen,Check,ChevronDown,Code2,FileText,GraduationCap,Image as ImageIcon,Layers3,LoaderCircle,LockKeyhole,LogOut,Mic,MoreHorizontal,Plus,RefreshCw,Send,ShieldCheck,Sparkles,UploadCloud,X,PenLine,Square,BrainCircuit,PanelLeftClose,Info,Network} from 'lucide-react';
import {Button,IconButton,Alert,Badge,EmptyState} from './components/ui';
import {AppShell,PageHeader} from './components/layout';
import {AuthPage} from './components/auth';
import {LearnLanding} from './components/learn';
import {ActiveSessionWorkspace} from './components/session';
import {AnswerComposer} from './components/composer';
import {DrawingPadModal} from './components/multimodal';
import {CourseLibrary} from './components/courses';
import {LearningEvidenceView} from './components/evidence';
import {SettingsView} from './components/settings';
import {NotificationProvider, useNotification, formatApiError} from './components/feedback';

type Obj=Record<string,any>;
type View='learn'|'courses'|'insights'|'settings';
function Brand(){return <div className="brand"><div className="brand-mark"><Layers3 size={20}/></div><span>ovael<span className="brand-dot">.</span><small> X</small></span></div>}
function AppRoot(){
  const {notifySuccess, notifyError}=useNotification();
  const[user,setUser]=useState<Obj|null>(null),[view,setView]=useState<View>('learn'),[courses,setCourses]=useState<Obj[]>([]),[activeCourse,setActiveCourse]=useState(''),[concepts,setConcepts]=useState<Obj[]>([]),[concept,setConcept]=useState(''),[newCourse,setNewCourse]=useState(''),[newConcept,setNewConcept]=useState(''),[session,setSession]=useState(''),[move,setMove]=useState<Obj|null>(null),[evidence,setEvidence]=useState<Obj|null>(null),[answer,setAnswer]=useState(''),[choice,setChoice]=useState<number|null>(null),[mode,setMode]=useState<'text'|'code'>('text'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[messages,setMessages]=useState<{who:'system'|'user',text:string}[]>([]),[showDraw,setShowDraw]=useState(false),[ocr,setOcr]=useState<Transcription|null>(null),[ocrConfirmed,setOcrConfirmed]=useState(false),[speechAnswer,setSpeechAnswer]=useState(false),[showTrace,setShowTrace]=useState(false),[goal,setGoal]=useState(''),[activeFile,setActiveFile]=useState<File|null>(null),[insights,setInsights]=useState<Obj|null>(null),[mic,setMic]=useState(false);
  const uploads=useRef<HTMLInputElement>(null),chatBottom=useRef<HTMLDivElement>(null),recognition=useRef<any>(null),pendingTurn=useRef<{signature:string,key:string}|null>(null);const currentCourse=courses.find(c=>c.course_id===activeCourse);const currentConcept=concepts.find(c=>c.concept_id===concept);
  function notify(msg:string){setNotice(msg);notifySuccess(msg)}
  function fail(e:any){const info=formatApiError(e);setError(info.message);notifyError(info.message)}
  async function reloadCourses(){const c=await api('/v1/courses');setCourses(c);setActiveCourse(old=>old&&c.some((i:Obj)=>i.course_id===old)?old:c[0]?.course_id||'')}
useEffect(()=>{api('/v1/auth/me').then(u=>{setUser(u);reloadCourses().catch(fail)}).catch(()=>{})},[]);
useEffect(()=>{if(!user||!activeCourse){setConcepts([]);return}api(`/v1/courses/${activeCourse}/concepts`).then((c:Obj[])=>{setConcepts(c);setConcept(old=>old&&c.some(x=>x.concept_id===old)?old:c[0]?.concept_id||'')}).catch(fail)},[user,activeCourse]);
useEffect(()=>{chatBottom.current?.scrollIntoView({behavior:'smooth'})},[messages,move,evidence]);
useEffect(()=>{if(!user)return;const previous=sessionStorage.getItem('ovael_session_id');if(!previous||session)return;
  api(`/v1/learning/sessions/${previous}`).then(s=>{if(s.status!=='active'){sessionStorage.removeItem('ovael_session_id');return;}setSession(previous);if(s.course_id)setActiveCourse(s.course_id);if(s.concept_id)setConcept(s.concept_id);setMove(s.move);setMode(s.move?.answer_type==='code'?'code':'text');setMessages(s.move?.content?[{who:'system',text:s.move.content}]:[])}).catch(()=>{sessionStorage.removeItem('ovael_session_id')});
},[user]);
async function handleLogin(credentials:{username:string;password:string}){setBusy(true);setError('');try{await api('/v1/auth/login','POST',credentials);const u=await api('/v1/auth/me');setUser(u);await reloadCourses()}catch(e:any){fail(e);throw e}finally{setBusy(false)}}
async function handleRegister(data:{username:string;password:string;role:'learner'|'teacher';teacher_invite_code?:string}){setBusy(true);setError('');try{const res=await api('/v1/auth/register','POST',data);const u=await api('/v1/auth/me');setUser(u);await reloadCourses();return res}catch(e:any){fail(e);throw e}finally{setBusy(false)}}
async function handleRecover(data:{username:string;recovery_key:string;new_password:string}){setBusy(true);setError('');try{return await api('/v1/auth/recover','POST',data)}catch(e:any){fail(e);throw e}finally{setBusy(false)}}
async function logout(){await api('/v1/auth/logout','POST').catch(()=>{});setUser(null);setSession('');sessionStorage.removeItem('ovael_session_id');setMove(null);setMessages([])}
async function handleCreateCourse(data:{name:string;description?:string;course_kind:'personal'|'class'}){
  setBusy(true);setError('');
  try{
    const c=await api('/v1/courses','POST',{
      name:data.name,
      subject_name:data.name,
      description:data.description||'Personal learning workspace',
      course_kind:data.course_kind||'personal'
    });
    await reloadCourses();
    setActiveCourse(c.course_id);
    notify(`Course "${c.name}" created successfully.`);
  }catch(e:any){fail(e);throw e}finally{setBusy(false)}
}
async function handleUpdateCourse(courseId:string,data:{name:string;description?:string}){
  setBusy(true);setError('');
  try{
    await api(`/v1/courses/${courseId}`,'PATCH',data);
    await reloadCourses();
    notify('Course updated successfully.');
  }catch(e:any){fail(e);throw e}finally{setBusy(false)}
}
async function handleDeleteCourse(courseId:string){
  setBusy(true);setError('');
  try{
    await api(`/v1/courses/${courseId}`,'DELETE');
    await reloadCourses();
    if(activeCourse===courseId){
      setActiveCourse('');
      setConcept('');
      setConcepts([]);
    }
    notify('Course deleted.');
  }catch(e:any){fail(e);throw e}finally{setBusy(false)}
}
async function handleAddConcept(name:string){
  if(!activeCourse)return;
  setBusy(true);setError('');
  try{
    const c=await api(`/v1/courses/${activeCourse}/concepts`,'POST',{name});
    const cs=await api(`/v1/courses/${activeCourse}/concepts`);
    setConcepts(cs);
    setConcept(c.concept_id);
    setNotice(`Topic "${c.name}" added.`);
  }catch(e:any){fail(e);throw e}finally{setBusy(false)}
}
function handleNavigateToLearn(courseId:string,conceptId?:string){
  setActiveCourse(courseId);
  if(conceptId)setConcept(conceptId);
  setSession('');
  setMove(null);
  setView('learn');
}
function present(m:Obj){setMove(m);setChoice(null);setAnswer('');setOcr(null);setOcrConfirmed(false);setSpeechAnswer(false);pendingTurn.current=null;setActiveFile(null);setMode(m?.answer_type==='code'?'code':'text');if(m?.content)setMessages(x=>[...x,{who:'system',text:m.content}])}
async function startSession(intent:'study'|'practice'|'review'='study'){if(!activeCourse||!concept||!currentCourse)return setError('Select or create a course and concept first.');setBusy(true);setError('');setEvidence(null);setSession('');sessionStorage.removeItem('ovael_session_id');setMessages([]);try{const data=await api('/v1/learning/sessions','POST',{course_id:activeCourse,subject_id:currentCourse.subject_id,concept_id:concept,mode:intent,goal:goal||currentConcept?.name,source_client:'web'});setSession(data.teaching_session_id);sessionStorage.setItem('ovael_session_id',data.teaching_session_id);present(data.move)}catch(e){fail(e)}finally{setBusy(false)}}
async function send(intent:'answer'|'ask_question'|'need_explanation'|'example'|'repeat'|'practice'|'skip'|'slow_down'='answer'){
  if(!session||busy)return;
  setError('');
  let payload:Obj;
  try{
    if(intent==='answer'){
      payload=makeAnswerTurn({kind:move?.answer_type||'free_text',answer,choice,codeMode:mode==='code',
        transcript:ocr,transcriptApproved:ocrConfirmed,fromSpeech:speechAnswer,
        requiredModalities:move?.required_modalities||[]});
    }else{
      // Asking for help must not be treated as a failed assessment attempt.
      payload={response:answer.trim(),learner_intent:intent,input_mode:'text'};
    }
  }catch(e){fail(e);return;}
  setBusy(true);
  try{
    if(intent==='answer'||answer.trim())setMessages(x=>[...x,{who:'user',text:answer.trim()||(ocr?.text||`Option ${(choice??0)+1}`)}]);
    const signature=JSON.stringify({session,intent,payload});
    if(pendingTurn.current?.signature!==signature)pendingTurn.current={signature,key:crypto.randomUUID()};
    const out=await api(`/v1/learning/sessions/${session}/turns`,'POST',payload,pendingTurn.current.key);
    pendingTurn.current=null;
    setEvidence(out.evidence);
    present(out.move);
  }catch(e){fail(e)}finally{setBusy(false)}
}
async function uploadAnswer(file:File){
  if(!file.type.startsWith('image/'))return setError('Please select an image file.');
  setBusy(true);setError('');
  try{
    const data=new FormData();data.append('file',file);
    const out=await api('/v1/learning/extract-image','POST',data);
    setActiveFile(file);
    setOcr({text:out.text||'',extraction_confidence:out.extraction_confidence,
      engine:out.engine,source:file.name==='drawing.png'?'drawing':'image'});
    setOcrConfirmed(false);
    if(!out.text)setError('No text was extracted. This version cannot inspect raw diagram topology. Type your answer or try a clearer image.');
  }catch(e){fail(e)}finally{setBusy(false)}
}
async function uploadCourse(file:File){setBusy(true);setError('');try{const data=new FormData();data.append('file',file);await api(`/v1/documents/upload?course_id=${encodeURIComponent(activeCourse)}&auto_route=true`,'POST',data);notify('Material accepted. You can check its processing status in the backend document list.')}catch(e){fail(e)}finally{setBusy(false)}}
function speech(){if(mic){recognition.current?.stop();setMic(false);return}const w=window as any;const SR=w.SpeechRecognition||w.webkitSpeechRecognition;if(!SR)return setError('This browser does not support speech recognition; use typed answers or upload a photo.');if(!window.confirm('Browser speech recognition may send audio to your browser vendor. Do not use this for confidential answers. Continue?'))return;const r=new SR();r.lang=navigator.language||'en-US';r.interimResults=false;r.onresult=(e:any)=>{setAnswer(a=>a+(a?' ':'')+e.results[0][0].transcript);setSpeechAnswer(true)};r.onerror=()=>{setMic(false);setError('Speech recognition failed. You can type instead.')};r.onend=()=>setMic(false);recognition.current=r;r.start();setMic(true)}
async function showInsights(){setView('insights');setBusy(true);setError('');try{setInsights(await api('/v1/proof-learning'))}catch(e){fail(e)}finally{setBusy(false)}}
if(!user)return <AuthPage onLogin={handleLogin} onRegister={handleRegister} onRecover={handleRecover} error={error} onClearError={()=>setError('')} busy={busy}/>;
return <><AppShell view={view} user={user} activeCourseName={currentCourse?.name} activeConceptName={currentConcept?.name} isSessionActive={Boolean(session)} onNavigate={v=>v==='insights'?showInsights():setView(v)} onLogout={logout}>{notice&&<Alert variant="success" onDismiss={()=>setNotice('')}>{notice}</Alert>}{error&&<Alert variant="error" onDismiss={()=>setError('')}>{error}</Alert>}
{view==='learn'&&(!session?(
  <LearnLanding
    courses={courses as any}
    activeCourseId={activeCourse}
    onSelectCourse={(id)=>{setActiveCourse(id);setConcept('')}}
    concepts={concepts as any}
    activeConceptId={concept}
    onSelectConcept={setConcept}
    goal={goal}
    onGoalChange={setGoal}
    onStartSession={intent=>startSession(intent)}
    onNavigateToCourses={()=>setView('courses')}
    busy={busy}
  />
):(
  <ActiveSessionWorkspace
    courseName={currentCourse?.name}
    conceptName={currentConcept?.name}
    mode="study"
    goal={goal}
    messages={messages}
    move={move}
    evidence={evidence}
    choice={choice}
    onSelectChoice={setChoice}
    busy={busy}
    user={user}
    activeFile={activeFile}
    onLeaveSession={()=>{setSession('');setMove(null)}}
    composerSlot={
      <AnswerComposer
        move={move}
        answer={answer}
        onAnswerChange={setAnswer}
        choice={choice}
        onSelectChoice={setChoice}
        mode={mode}
        onToggleMode={setMode}
        busy={busy}
        error={error}
        onClearError={() => setError('')}
        onSubmit={(intent = 'answer') => send(intent)}
        showTrace={showTrace}
        onToggleTrace={() => setShowTrace(!showTrace)}
        activeFile={activeFile}
        onUploadFile={uploadAnswer}
        onOpenDraw={() => setShowDraw(true)}
        micActive={mic}
        onToggleMic={speech}
        ocr={ocr}
        onOcrChange={setOcr}
        ocrConfirmed={ocrConfirmed}
        onOcrConfirmChange={setOcrConfirmed}
        onRemoveImage={() => {
          setOcr(null);
          setActiveFile(null);
          setOcrConfirmed(false);
        }}
      />
    }
  />
))}
{view==='courses'&&<CourseLibrary
  courses={courses as any}
  activeCourseId={activeCourse}
  onSelectCourse={(id)=>{setActiveCourse(id);setConcept('')}}
  concepts={concepts as any}
  activeConceptId={concept}
  onSelectConcept={setConcept}
  user={user as any}
  onCreateCourse={handleCreateCourse}
  onUpdateCourse={handleUpdateCourse}
  onDeleteCourse={handleDeleteCourse}
  onAddConcept={handleAddConcept}
  onNavigateToLearn={handleNavigateToLearn}
  onUploadMaterial={uploadCourse}
  busy={busy}
/>}
{view==='insights'&&<LearningEvidenceView
  snapshot={insights as any}
  loading={busy}
  error={error}
  onRefresh={async () => {
    try {
      setBusy(true);
      const res = await api('/v1/proof-learning');
      setInsights(res);
    } catch(e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }}
  onStudyConcept={(conceptId) => {
    setConcept(conceptId);
    setView('learn');
  }}
/>}
{view==='settings'&&<SettingsView
  user={user as any}
  onLogout={logout}
  onNotice={(msg) => notify(msg)}
/>}
</AppShell>{showDraw&&<DrawingPadModal onCancel={()=>setShowDraw(false)} onDone={blob=>{setShowDraw(false);uploadAnswer(new File([blob],'drawing.png',{type:'image/png'}))}}/>}</>;
}

export default function App() {
  return (
    <NotificationProvider>
      <AppRoot />
    </NotificationProvider>
  );
}
