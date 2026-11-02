import {json,requireAdmin} from '../../_auth.js';
const TYPES=new Set(['image/jpeg','image/png','image/webp','image/avif','image/gif']);
export async function onRequestPost({request,env}) {
 const origin=request.headers.get('Origin'); if(origin!==new URL(request.url).origin)return json({error:'مبدأ درخواست معتبر نیست.'},403);
 const auth=await requireAdmin(request,env); if(!auth.ok)return auth.response;
 if(!env.ASHKADAN_MEDIA)return json({error:'فضای ذخیره‌سازی تصاویر R2 متصل نشده است.'},503);
 const type=request.headers.get('Content-Type')||''; if(!TYPES.has(type))return json({error:'فرمت تصویر پشتیبانی نمی‌شود.'},415);
 const len=Number(request.headers.get('Content-Length')||0); if(len>8*1024*1024)return json({error:'حداکثر حجم هر تصویر ۸ مگابایت است.'},413);
 const bytes=await request.arrayBuffer(); if(!bytes.byteLength||bytes.byteLength>8*1024*1024)return json({error:'حجم تصویر نامعتبر است.'},413);
 const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','image/gif':'gif'})[type];
 const key=`site/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
 await env.ASHKADAN_MEDIA.put(key,bytes,{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'}});
 return json({ok:true,key,url:`/api/media/${key}`});
}
