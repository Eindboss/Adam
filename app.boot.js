// Bootloader die app.js dynamisch laadt en fouten toont in een overlay
(function(){
  const STATUS_ID = 'boot-status';
  function el(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt) e.textContent=txt; return e; }
  function show(msg, kind){
    let bar = document.getElementById(STATUS_ID);
    if(!bar){
      bar = el('div'); bar.id=STATUS_ID;
      bar.style.position='fixed'; bar.style.left='50%'; bar.style.transform='translateX(-50%)';
      bar.style.bottom='12px'; bar.style.zIndex='99999'; bar.style.padding='8px 12px';
      bar.style.borderRadius='12px'; bar.style.fontFamily='Outfit, system-ui, sans-serif';
      bar.style.fontWeight='700'; bar.style.fontSize='13px';
      bar.style.border='1px solid'; bar.style.backdropFilter='blur(8px)';
      document.body.appendChild(bar);
    }
    bar.style.color = kind==='err' ? '#7f1d1d' : '#0b1220';
    bar.style.background = kind==='err' ? 'rgba(254,226,226,.95)' : 'rgba(167,243,208,.95)';
    bar.style.borderColor = kind==='err' ? '#fecaca' : '#bbf7d0';
    bar.textContent = msg;
    clearTimeout(show._t); show._t=setTimeout(()=>{ bar.remove(); }, 4000);
  }

  window.addEventListener('error', function(e){
    show('Fout: ' + (e.message||'onbekend'), 'err');
  });
  window.addEventListener('unhandledrejection', function(e){
    show('Scriptfout (promise): ' + (e.reason && e.reason.message ? e.reason.message : 'onbekend'), 'err');
  });

  function loadScript(src, onload, onerror){
    const s=document.createElement('script');
    s.src=src; s.defer=true; s.onload=onload; s.onerror=onerror||(()=>show('Kon ' + src + ' niet laden', 'err'));
    document.head.appendChild(s);
  }

  function boot(){
    show('App start…');
    loadScript('./app.js', function(){
      // wacht even of init klaar is
      setTimeout(()=>{
        if(window.__APP_READY){ show('App gereed'); }
        else { show('App script geladen maar niet gestart', 'err'); }
      }, 500);
    });
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot, {once:true}); }
  else{ boot(); }
})();
