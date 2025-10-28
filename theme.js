// theme.patched.js — light/dark theme with persistence
(function(){
  'use strict';
  const KEY = 'adam-leeragenda-theme';
  function apply(theme){
    document.documentElement.dataset.theme = theme;
  }
  function setTheme(theme, persist){
    apply(theme);
    if(persist){
      try{ localStorage.setItem(KEY, theme); }catch{}
    }
  }
  function getTheme(){
    try{ return localStorage.getItem(KEY) || 'light'; }catch{ return 'light'; }
  }
  // init
  const initial = getTheme();
  apply(initial);
  // expose
  window.setTheme = setTheme;
  window.getTheme = getTheme;
})();