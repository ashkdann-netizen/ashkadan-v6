export async function onRequestGet({params,env}) {
 if(!env.ASHKADAN_MEDIA)return new Response('Media storage unavailable',{status:503});
 const key=String(params.key||'').replace(/^\/+/, ''); if(!key||key.includes('..')||key.includes('\\'))return new Response('Not found',{status:404});
 const object=await env.ASHKADAN_MEDIA.get(key); if(!object)return new Response('Not found',{status:404});
 const headers=new Headers(); object.writeHttpMetadata(headers); headers.set('etag',object.httpEtag); headers.set('Cache-Control','public, max-age=31536000, immutable'); headers.set('X-Content-Type-Options','nosniff'); return new Response(object.body,{headers});
}
