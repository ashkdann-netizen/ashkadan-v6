import {createManagerGate,setManagerGateCookie,constantTimeEqual} from '../_auth.js';
export async function onRequestGet({request,env,params}) {
 const expected=env.ADMIN_PATH_TOKEN||'';
 const supplied=String(params.token||'');
 if(expected.length<32||!constantTimeEqual(supplied,expected)) return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
 if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32) return new Response('مدیریت هنوز از نظر امنیتی پیکربندی نشده است.',{status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
 const gate=await createManagerGate(env);
 return new Response(null,{status:302,headers:{'Location':new URL('/?manage=1',request.url).toString(),'Set-Cookie':setManagerGateCookie(gate),'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}
