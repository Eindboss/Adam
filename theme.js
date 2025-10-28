// THEME HANDLER (light/dark) — saved separately so je alleen dit bestand kunt vervangen
(function(){
  const THEME_KEY = 'adam-theme';
  const btn = document.getElementById('themeToggle');

  function systemPrefersDark(){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function getSavedTheme(){
    try{ return localStorage.getItem(THEME_KEY); }catch(e){ return null; }
  }
  function saveTheme(t){
    try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
  }
  function applyTheme(t){
    document.body.setAttribute('data-theme', t);
    if(btn){ btn.textContent = t==='dark' ? '🌗 Licht thema' : '🌑 Donker thema'; btn.setAttribute('aria-label', 'Wissel naar ' + (t==='dark'?'licht':'donker')); }
  }

  function init(){
    const saved = getSavedTheme();
    const theme = saved || (systemPrefersDark()? 'dark':'light');
    applyTheme(theme);

    if(btn){
      btn.style.display = 'inline-flex';
      btn.addEventListener('click',()=>{
        const current = document.body.getAttribute('data-theme') || 'dark';
        const next = current==='dark' ? 'light' : 'dark';
        applyTheme(next); saveTheme(next);
      });
    }
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init, {once:true}); }
  else{ init(); }
})();
