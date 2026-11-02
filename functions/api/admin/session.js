import {readSession,json} from '../../_auth.js';
export async function onRequestGet({request,env}) { const s=await readSession(request,env);return s?json({authenticated:true,csrf:s.csrf}):json({authenticated:false},401); }
