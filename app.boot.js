// app.boot.js — laadt core en ui; toont status en errors
(function(){
  'use strict';
  const STATUS_ID = 'boot-status';
  function show(msg, kind){
    let bar = document.getElementById(STATUS_ID);
    if(!bar){
      bar = document.createElement('div'); bar.id=STATUS_ID;
      bar.style.position='fixed'; bar.style.left='50%'; bar.style.transform='translateX(-50%)';
      bar.style.bottom='12px'; bar.style.zIndex='99999'; bar.style.padding='8px 12px';
      bar.style.borderRadius='12px'; bar.style.fontFamily='Outfit, system-ui, sans-serif'; bar.style.fontWeight='700'; bar.style.fontSize='13px';
      bar.style.border='1px solid'; bar.style.backdropFilter='blur(8px)';
      document.body.appendChild(bar);
    }
    bar.style.color = kind==='err' ? '#7f1d1d' : '#0b1220';
    bar.style.background = kind==='err' ? 'rgba(254,226,226,.95)' : 'rgba(167,243,208,.95)';
    bar.style.borderColor = kind==='err' ? '#fecaca' : '#bbf7d0';
    bar.textContent = msg;
    clearTimeout(show._t); show._t=setTimeout(()=>{ if(bar && bar.parentNode) bar.parentNode.removeChild(bar); }, 4000);
  }

  window.addEventListener('error', (e)=> show('Fout: ' + (e.message||'onbekend'), 'err'));
  window.addEventListener('unhandledrejection', (e)=> show('Scriptfout: ' + (e.reason && e.reason.message ? e.reason.message : 'onbekend'), 'err'));

  function loadScript(src){ return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=src; s.defer=true; s.onload=resolve; s.onerror=()=>reject(new Error('Kon '+src+' niet laden')); document.head.appendChild(s); }); }

  async function boot(){
    try{
      show('App start…');
      await loadScript('./app.core.js');
      await loadScript('./app.ui.js');
      setTimeout(()=>{
        if(window.__APP_READY){ show('App gereed'); }
        else { show('App script geladen maar niet gestart', 'err'); }
      }, 300);
    }catch(err){
      show(err.message || 'Boot error', 'err');
    }
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot, {once:true}); }
  else{ boot(); }
})();
