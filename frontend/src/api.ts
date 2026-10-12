/** Same-origin API client. Vite proxies /v1 to FastAPI in development. */
export type ApiErrorDetails={status:number;message:string};
const csrf=()=>document.cookie.split('; ').find(c=>c.startsWith('ovael_csrf='))?.split('=').slice(1).join('')||'';
export async function api(path:string,method='GET',body?:unknown, idempotencyKey?:string):Promise<any>{
  const headers:Record<string,string>={};
  if(method!=='GET'){
    headers['X-CSRF-Token']=decodeURIComponent(csrf());
    headers['Idempotency-Key']=idempotencyKey||crypto.randomUUID();
  }
  if(body!==undefined&&!(body instanceof FormData)){
    headers['Content-Type']='application/json';body=JSON.stringify(body);
  }
  let response:Response;
  try {response=await fetch(path,{method,headers,body:body as BodyInit,credentials:'same-origin'});}
  catch {throw new Error('Cannot reach OVAEL backend. Start FastAPI on port 8000 and retry.');}
  const raw=await response.text();let data:any;
  try{data=raw?JSON.parse(raw):null;}catch{data=raw;}
  if(!response.ok){
    const detail=data?.detail;
    const message=typeof detail==='string'?detail:typeof detail?.message==='string'?detail.message:
      response.status===401?'Session expired. Please sign in again.':
      response.status===413?'The uploaded file exceeds the server limit.':
      response.status===503?'The requested model or extraction engine is unavailable.':
      `${response.status} ${response.statusText}`;
    throw Object.assign(new Error(message),{status:response.status});
  }
  return data;
}
