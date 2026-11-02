import {requireAdmin,json,clearSessionCookie} from '../../_auth.js';
export async function onRequestPost({request,env}) { const a=await requireAdmin(request,env);if(!a.ok)return a.response;return json({ok:true},200,{'Set-Cookie':clearSessionCookie()}); }
