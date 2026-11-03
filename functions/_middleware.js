export async function onRequest({request,next}) {
 const response=await next(); const h=new Headers(response.headers);
 h.set('Strict-Transport-Security','max-age=31536000; includeSubDomains'); h.set('X-Content-Type-Options','nosniff'); h.set('Referrer-Policy','strict-origin-when-cross-origin'); h.set('X-Frame-Options','DENY'); h.set('Permissions-Policy','camera=(), microphone=(), geolocation=()'); h.set('Cross-Origin-Opener-Policy','same-origin'); h.set('Cross-Origin-Resource-Policy','same-origin'); h.set('X-Permitted-Cross-Domain-Policies','none'); h.set('Content-Security-Policy',"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; upgrade-insecure-requests");
 if(new URL(request.url).pathname.startsWith('/api/'))h.set('Cache-Control','no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
