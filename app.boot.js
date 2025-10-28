// app.boot.js — statusbalk en eenvoudige boot
(function(){
  'use strict';
  const STATUS_ID = 'boot-status';

  function show(msg, kind){
    let bar = document.getElementById(STATUS_ID);
    if(!bar){
      bar = document.createElement('div'); bar.id=STATUS_ID;
      bar.style.position='fixed'; bar.style.left='50%'; bar.style.transform='translateX(-50%)';
      bar.style.bottom='12px'; bar.style.zIndex='99999'; bar.style.padding='8px 12px';
      bar.style.borderRadius='12px'; bar.style.fontFamily='system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      bar.style.fontWeight='600'; bar.style.fontSize='13px'; bar.style.border='1px solid';
      bar.style.backdropFilter='blur(8px)'; bar.style.background='rgba(255,255,255,0.85)';
      document.body.appendChild(bar);
    }
    bar.style.color = (kind==='err') ? '#7f1d1d' : '#0b1220';
    bar.style.borderColor = (kind==='err') ? '#fecaca' : '#93c5fd';
    bar.textContent = msg;
    clearTimeout(show._t);
    show._t = setTimeout(()=>{ bar.remove(); }, 2500);
  }

  window.addEventListener('error', (e)=>{
    try { show(e.message || 'Scriptfout', 'err'); } catch(_){}
  });

  async function boot(){
    try{
      show('App start…');
      // Alle scripts zijn met <script defer> geladen in index.html
      setTimeout(()=>{
        if(window.__APP_READY){ show('App gereed'); }
        else { show('App geladen, nog niet gestart', 'err'); }
      }, 300);
    }catch(err){
      show(err && err.message ? err.message : 'Boot error', 'err');
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();