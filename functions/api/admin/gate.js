import {json,readManagerGate} from '../../_auth.js';
export async function onRequestGet({request,env}) { return await readManagerGate(request,env)?json({authorized:true}):json({authorized:false},403); }
