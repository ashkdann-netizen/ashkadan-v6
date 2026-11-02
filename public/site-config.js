/* Set this to the final HTTPS domain before production deployment. */
window.ASHKADAN_SITE_URL = '';
(function(){
 const url=String(window.ASHKADAN_SITE_URL||'').trim().replace(/\/$/,'');
 if(!/^https:\/\//i.test(url)) return;
 const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=url+'/';document.head.appendChild(canonical);
 const og=document.querySelector('meta[property="og:url"]')||document.createElement('meta');og.setAttribute('property','og:url');og.content=url+'/';document.head.appendChild(og);
 const ld=document.querySelector('script[type="application/ld+json"]');if(ld){try{const data=JSON.parse(ld.textContent);data.url=url+'/';ld.textContent=JSON.stringify(data)}catch(_){}}
})();
