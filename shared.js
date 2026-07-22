(()=>{
  "use strict";
  const API_BASE=(window.DIAMONDMIND_API_BASE||"https://diamondmind-api.onrender.com/api/v1").replace(/\/$/,"");
  const SUPABASE_URL=(window.DIAMONDMIND_SUPABASE_URL||"https://ywttcnxulfyhdfzzrnwt.supabase.co").replace(/\/$/,"");
  const SUPABASE_KEY=window.DIAMONDMIND_SUPABASE_PUBLISHABLE_KEY||"sb_publishable__JivOxRrvBQdYHTlVWmJug_Uh0Cc79g";
  const SESSION_KEY="diamondmind.auth.session.v1";
  const CACHE_PREFIX="dm21.cache.";

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const cleanText=value=>{
    const text=String(value??"").replace(/\s+/g," ").trim();
    return /--chakra|@layer|\.css-[a-z0-9]|display:\s*(?:-webkit-)?flex|<\/?(?:style|script|svg)/i.test(text)?"":text;
  };
  const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null};
  const formatPercent=value=>{const n=number(value);return n===null?"—":`${n.toFixed(1)}%`};
  const formatOdds=value=>{const n=number(value);if(n===null)return"—";if(n>0&&n<20)return n.toFixed(2);return n>0?`+${Math.round(n)}`:`${Math.round(n)}`};
  const formatDate=value=>{if(!value)return"—";const d=new Date(value);return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Taipei"}).format(d)};
  const taiwanToday=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

  function toast(message){const el=document.getElementById("toast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600)}

  function cacheRead(key,maxAgeMs=900000){try{const raw=localStorage.getItem(CACHE_PREFIX+key);if(!raw)return null;const parsed=JSON.parse(raw);return {...parsed,stale:Date.now()-parsed.savedAt>maxAgeMs}}catch{return null}}
  function cacheWrite(key,data){try{localStorage.setItem(CACHE_PREFIX+key,JSON.stringify({savedAt:Date.now(),data}))}catch{}}

  async function fetchJson(path,{method="GET",body,token,timeout=12000,retries=1,cacheKey,staleMs=900000,headers={}}={}){
    const url=path.startsWith("http")?path:`${API_BASE}${path}`;
    let lastError;
    for(let attempt=0;attempt<=retries;attempt++){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeout);
      try{
        const response=await fetch(url,{method,cache:"no-store",signal:controller.signal,headers:{Accept:"application/json","Content-Type":"application/json",...headers,...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
        clearTimeout(timer);
        const text=await response.text();
        let payload={};
        try{payload=text?JSON.parse(text):{}}catch{payload={detail:text||`HTTP ${response.status}`}}
        if(!response.ok){const detail=payload?.detail;throw new Error(typeof detail==="string"?detail:detail?.message||`HTTP ${response.status}`)}
        if(cacheKey)cacheWrite(cacheKey,payload);
        return {data:payload,stale:false};
      }catch(error){clearTimeout(timer);lastError=error;if(attempt<retries)await sleep(450*(attempt+1))}
    }
    if(cacheKey){const cached=cacheRead(cacheKey,staleMs);if(cached)return {data:cached.data,stale:true,error:lastError}}
    throw lastError||new Error("Request failed");
  }

  function loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}}
  function saveSession(session){if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY)}
  function sessionExpired(session,margin=60){const expires=Number(session?.expires_at||0);return !expires||expires*1000<Date.now()+margin*1000}

  async function supabase(path,{method="GET",body,token,timeout=12000}={}){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(`${SUPABASE_URL}/auth/v1${path}`,{method,signal:controller.signal,cache:"no-store",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token||SUPABASE_KEY}`,Accept:"application/json","Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
      const text=await response.text();let payload={};try{payload=text?JSON.parse(text):{}}catch{}
      if(!response.ok)throw new Error(payload?.msg||payload?.error_description||payload?.message||`Auth HTTP ${response.status}`);
      return payload;
    }finally{clearTimeout(timer)}
  }

  async function refreshSession(session){if(!session?.refresh_token)return null;try{const payload=await supabase("/token?grant_type=refresh_token",{method:"POST",body:{refresh_token:session.refresh_token}});saveSession(payload);return payload}catch{saveSession(null);return null}}
  async function validSession(){let session=loadSession();if(sessionExpired(session))session=await refreshSession(session);return session}
  async function signIn(email,password){const payload=await supabase("/token?grant_type=password",{method:"POST",body:{email,password}});saveSession(payload);return payload}
  async function signUp(email,password){const payload=await supabase("/signup",{method:"POST",body:{email,password,data:{source:"diamondmind-v21"}}});if(payload?.access_token)saveSession(payload);return payload}
  async function signOut(){const session=loadSession();try{if(session?.access_token)await supabase("/logout",{method:"POST",token:session.access_token})}catch{}saveSession(null)}

  function submitCheckout(payload){if(!payload?.action||!payload?.fields)throw new Error("付款表單資料不完整");const form=document.createElement("form");form.method=payload.method||"POST";form.action=payload.action;form.style.display="none";Object.entries(payload.fields).forEach(([name,value])=>{const input=document.createElement("input");input.type="hidden";input.name=name;input.value=value;form.appendChild(input)});document.body.appendChild(form);form.submit()}

  window.DM={API_BASE,SUPABASE_URL,SUPABASE_KEY,escapeHtml,cleanText,number,formatPercent,formatOdds,formatDate,taiwanToday,toast,fetchJson,loadSession,saveSession,validSession,signIn,signUp,signOut,submitCheckout};
})();
