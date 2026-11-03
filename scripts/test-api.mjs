import assert from 'node:assert/strict';
import {rateLimit} from '../functions/_auth.js';
import {onRequestPost as submitInquiry} from '../functions/api/inquiries.js';
const store=new Map();
const kv={
 async get(k,type){const v=store.get(k);if(v===undefined)return null;return type==='json'?JSON.parse(v):v},
 async put(k,v){store.set(k,String(v))},
 async list(){return {keys:[],list_complete:true}}
};
const env={ASHKADAN_KV:kv};
const r1=await rateLimit(env,'test:ip',2,60);const r2=await rateLimit(env,'test:ip',2,60);const r3=await rateLimit(env,'test:ip',2,60);
assert.equal(r1.ok,true);assert.equal(r2.ok,true);assert.equal(r3.ok,false);
const request=(body,origin='https://example.test')=>new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.9'},body:JSON.stringify(body)});
const valid={name:'Test User',phone:'+4915112345678',city:'Frankfurt',kind:'Renovation',details:'Test inquiry'};
const good=await submitInquiry({request:request(valid),env});assert.equal(good.status,200);assert.equal((await good.json()).ok,true);
const bad=await submitInquiry({request:request({...valid,name:''},'https://evil.test'),env});assert.equal(bad.status,403);
const invalid=await submitInquiry({request:request({...valid,phone:'12'}),env});assert.equal(invalid.status,400);
console.log('API smoke tests passed: rate limiter, valid inquiry, origin rejection, validation.');
import {onRequestGet as readMedia} from '../functions/api/media/[[key]].js';
const mediaBytes=new TextEncoder().encode('test-image');
const mediaEnv={ASHKADAN_MEDIA:{async get(key){if(key!=='site/demo.webp')return null;return {body:mediaBytes, httpEtag:'"demo"',writeHttpMetadata(h){h.set('Content-Type','image/webp')}}}}};
const media=await readMedia({params:{key:'site/demo.webp'},env:mediaEnv});assert.equal(media.status,200);assert.equal(media.headers.get('Content-Type'),'image/webp');assert.equal(media.headers.get('Cache-Control'),'public, max-age=31536000, immutable');
const traversal=await readMedia({params:{key:'../secret'},env:mediaEnv});assert.equal(traversal.status,404);
console.log('R2 media smoke tests passed: object delivery, cache headers, traversal rejection.');
import {onRequestPost as adminLogin} from '../functions/api/admin/login.js';
import {onRequestGet as adminSession} from '../functions/api/admin/session.js';
import {onRequestPut as saveSiteState} from '../functions/api/state.js';
const authStore=new Map();
const authKV={
 async get(k,type){const v=authStore.get(k);if(v===undefined)return null;return type==='json'?JSON.parse(v):v},
 async put(k,v){authStore.set(k,String(v))},
 async list(){return {keys:[],list_complete:true}}
};
const authEnv={ASHKADAN_KV:authKV,ADMIN_USER:'admin',ADMIN_PASSWORD:'CorrectHorseBatteryStaple!2026',SESSION_SECRET:'0123456789abcdef0123456789abcdef0123456789abcdef'};
const loginReq=new Request('https://example.test/api/admin/login',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.10'},body:JSON.stringify({username:'admin',password:authEnv.ADMIN_PASSWORD})});
const loginRes=await adminLogin({request:loginReq,env:authEnv});assert.equal(loginRes.status,200);const loginBody=await loginRes.json();assert.equal(loginBody.ok,true);assert.ok(loginBody.csrf);
const cookie=loginRes.headers.get('Set-Cookie');assert.ok(cookie.includes('__Host-ashkadan_session='));
const sessionReq=new Request('https://example.test/api/admin/session',{headers:{Cookie:cookie.split(';')[0]}});const sessionRes=await adminSession({request:sessionReq,env:authEnv});assert.equal(sessionRes.status,200);assert.equal((await sessionRes.json()).authenticated,true);
const stateReq=new Request('https://example.test/api/state',{method:'PUT',headers:{Cookie:cookie.split(';')[0],'X-CSRF-Token':loginBody.csrf,'Content-Type':'application/json'},body:JSON.stringify({data:{phone:'09126110306',customSocials:[]}})});const stateRes=await saveSiteState({request:stateReq,env:authEnv});assert.equal(stateRes.status,200);assert.equal(JSON.parse(authStore.get('site:public:v1')).phone,'09126110306');
const wrongReq=new Request('https://example.test/api/admin/login',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.11'},body:JSON.stringify({username:'admin',password:'incorrect-password'})});const wrongRes=await adminLogin({request:wrongReq,env:authEnv});assert.equal(wrongRes.status,401);
console.log('Admin auth tests passed: secure login cookie, session validation, CSRF-protected KV save, wrong-password rejection.');

import {onRequestGet as privateManagerRoute} from '../functions/manage/[token].js';
import {onRequestGet as managerGateCheck} from '../functions/api/admin/gate.js';
const privateEnv={...authEnv,ADMIN_PATH_TOKEN:'a'.repeat(48)};
const badGate=await privateManagerRoute({request:new Request('https://example.test/manage/wrong'),env:privateEnv,params:{token:'wrong'}});assert.equal(badGate.status,404);
const goodGate=await privateManagerRoute({request:new Request('https://example.test/manage/'+privateEnv.ADMIN_PATH_TOKEN),env:privateEnv,params:{token:privateEnv.ADMIN_PATH_TOKEN}});assert.equal(goodGate.status,302);assert.match(goodGate.headers.get('Set-Cookie'),/__Host-ashkadan_gate=/);assert.match(goodGate.headers.get('Location'),/\?manage=1$/);
const gateCookie=goodGate.headers.get('Set-Cookie').split(';')[0];const gateCheck=await managerGateCheck({request:new Request('https://example.test/api/admin/gate',{headers:{Cookie:gateCookie}}),env:privateEnv});assert.equal(gateCheck.status,200);assert.equal((await gateCheck.json()).authorized,true);
const missingGate=await managerGateCheck({request:new Request('https://example.test/api/admin/gate'),env:privateEnv});assert.equal(missingGate.status,403);
console.log('Private manager route tests passed: unknown token rejected, temporary HttpOnly gate issued, gate validation enforced.');
