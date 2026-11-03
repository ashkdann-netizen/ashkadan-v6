const COOKIE = '__Host-ashkadan_session';
const GATE_COOKIE = '__Host-ashkadan_gate';
const enc = new TextEncoder();
function b64u(bytes) { let s=''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64u(s) { s=s.replace(/-/g,'+').replace(/_/g,'/'); return Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0)); }
async function key(env) { if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters'); return crypto.subtle.importKey('raw',enc.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']); }
async function sign(value,env) { const data=b64u(enc.encode(JSON.stringify(value))); const sig=await crypto.subtle.sign('HMAC',await key(env),enc.encode(data)); return data+'.'+b64u(new Uint8Array(sig)); }
async function verify(token,env) { try { const [data,sig]=token.split('.'); if(!data||!sig)return null; const ok=await crypto.subtle.verify('HMAC',await key(env),unb64u(sig),enc.encode(data)); if(!ok)return null; const obj=JSON.parse(new TextDecoder().decode(unb64u(data))); if(!obj.exp||obj.exp<Date.now())return null; return obj; } catch { return null; } }
export async function createManagerGate(env) { return sign({purpose:'manager-gate',exp:Date.now()+10*60*1000},env); }
export async function readManagerGate(request,env) { const cookie=request.headers.get('Cookie')||''; const match=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(GATE_COOKIE+'=')); if(!match)return false; const value=await verify(match.slice(GATE_COOKIE.length+1),env); return !!value && value.purpose==='manager-gate'; }
export function setManagerGateCookie(token) { return `${GATE_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=600`; }
export async function createSession(env) { const csrf=b64u(crypto.getRandomValues(new Uint8Array(24))); const token=await sign({sub:'admin',csrf,exp:Date.now()+8*60*60*1000},env); return {token,csrf}; }
export async function readSession(request,env) { const cookie=request.headers.get('Cookie')||''; const match=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'=')); if(!match)return null; return verify(match.slice(COOKIE.length+1),env); }
export function setSessionCookie(token) { return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`; }
export function clearSessionCookie() { return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`; }
export async function requireAdmin(request,env) { const session=await readSession(request,env); if(!session)return {ok:false,response:json({error:'نشست مدیر معتبر نیست یا منقضی شده است.'},401)}; if(request.method!=='GET'&&request.headers.get('X-CSRF-Token')!==session.csrf)return {ok:false,response:json({error:'درخواست معتبر نیست. صفحه را تازه‌سازی کنید.'},403)}; return {ok:true,session}; }
export function json(body,status=200,headers={}) { return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}}); }
export async function readJson(request,max=2_000_000) { const len=Number(request.headers.get('Content-Length')||0); if(len>max)throw new Error('حجم درخواست بیش از حد مجاز است.'); const text=await request.text(); if(new TextEncoder().encode(text).length>max)throw new Error('حجم درخواست بیش از حد مجاز است.'); return JSON.parse(text||'{}'); }
export async function sha256(s) { const h=await crypto.subtle.digest('SHA-256',enc.encode(s)); return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
export function constantTimeEqual(a,b) { if(typeof a!=='string'||typeof b!=='string')return false; let diff=a.length^b.length; const n=Math.max(a.length,b.length); for(let i=0;i<n;i++)diff|=(a.charCodeAt(i%Math.max(1,a.length))||0)^(b.charCodeAt(i%Math.max(1,b.length))||0); return diff===0; }

// Best-effort per-IP throttling. KV counters are deliberately conservative;
// for strict atomic limits, bind a Durable Object or Cloudflare Rate Limiting rule.
export async function rateLimit(env, key, limit, windowSeconds) {
  if (!env.ASHKADAN_KV) return { ok:false, unavailable:true };
  const digest = await sha256(key);
  const storageKey = `rl:${digest}`;
  const now = Math.floor(Date.now()/1000);
  let state = await env.ASHKADAN_KV.get(storageKey, 'json');
  if (!state || !Number.isFinite(state.reset) || state.reset <= now) state = { count:0, reset:now+windowSeconds };
  state.count += 1;
  await env.ASHKADAN_KV.put(storageKey, JSON.stringify(state), { expirationTtl:windowSeconds+5 });
  return { ok:state.count <= limit, remaining:Math.max(0,limit-state.count), reset:state.reset };
}
export function clientIp(request) { return request.headers.get('CF-Connecting-IP') || 'unknown'; }
