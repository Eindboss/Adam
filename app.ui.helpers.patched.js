/* app.ui.helpers.patched.js — helpers & safe utils */
(function(){
  'use strict';
  const C = window.AppCore;
  if(!C){ console.error('AppCore ontbreekt'); return; }
  const UI = window.AppUI || (window.AppUI = {});
  UI.helpers = UI.helpers || {};

  function qs(s){ return document.querySelector(s); }
  function ce(tag, cls){ const el=document.createElement(tag); if(cls) el.className=cls; return el; }

  function isAllDigits(str){ if(!str) return false; for(let i=0;i<str.length;i++){ const c=str.charCodeAt(i); if(c<48||c>57) return false; } return true; }
  function stripSliceSuffix(title){
    if(!title) return title;
    if(!title.endsWith(')')) return title;
    const openIdx = title.lastIndexOf(' (');
    if(openIdx === -1) return title;
    const inside = title.slice(openIdx + 2, -1);
    const parts = inside.split('/');
    if(parts.length !== 2) return title;
    if(isAllDigits(parts[0]) && isAllDigits(parts[1])){
      return title.slice(0, openIdx);
    }
    return title;
  }

  // Small utility to force focus in modals
  function focusAndSelect(input){
    if(!input) return;
    try { input.focus({preventScroll:true}); } catch{ try{ input.focus(); }catch{} }
    try { if('select' in input) input.select(); } catch{}
  }

  UI.helpers.qs = qs;
  UI.helpers.ce = ce;
  UI.helpers.stripSliceSuffix = stripSliceSuffix;
  UI.helpers.focusAndSelect = focusAndSelect;
})();