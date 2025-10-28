// THEME HANDLER (light/dark)
(function(){
  const KEY_PRIMARY   = 'theme';        // nieuwe sleutel
  const KEY_LEGACY    = 'adam-theme';   // oude sleutel (migratie)
  const root = document.documentElement; // <html>
  const btn  = document.getElementById('themeToggle');

  function prefersDark(){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function readStored(){
    try{
      // eerst nieuwe sleutel
      let v = localStorage.getItem(KEY_PRIMARY);
      // migratiepad vanaf oude sleutel
      if(!v){
        const legacy = localStorage.getItem(KEY_LEGACY);
        if(legacy){
          localStorage.setItem(KEY_PRIMARY, legacy);
          localStorage.removeItem(KEY_LEGACY);
          v = legacy;
        }
      }
      return v;
    }catch(_){ return null; }
  }

  function store(val){
    try{ localStorage.setItem(KEY_PRIMARY, val); }catch(_){}
  }

  function apply(val){
    root.setAttribute('data-theme', val);
    if(btn){
      btn.textContent = (val === 'dark') ? '🌗 Licht thema' : '🌑 Donker thema';
      btn.setAttribute('aria-label', 'Wissel naar ' + (val==='dark' ? 'licht' : 'donker'));
      btn.style.display = 'inline-flex';
    }
  }

  function current(){
    return root.getAttribute('data-theme');
  }

  function init(){
    // volgorde van voorkeuren:
    // 1) expliciet op <html data-theme="...">
    // 2) opgeslagen in storage (nieuwe of legacy key)
    // 3) systeemvoorkeur
    // 4) default: 'light'
    const fromDom = current();
    const fromStore = readStored();
    const start = fromDom || fromStore || (prefersDark() ? 'dark' : 'light');
    apply(start);

    if(btn){
      btn.addEventListener('click', function(){
        const next = (current() === 'dark') ? 'light' : 'dark';
        apply(next);
        store(next);
      }, {passive: true});
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once: true});
  }else{
    init();
  }
})();