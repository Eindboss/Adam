// app.ui.events.patched.js — wire events (patched: confirm clear-done, theme persistence hook)
(function(){
  'use strict';
  const C = window.AppCore;
  const UI = window.AppUI;
  if(!C || !UI){ console.error('AppCore of AppUI ontbreekt'); return; }
  const R = UI.render;

  function bindBasic(){
    const el = UI.el;
    // Filters
    el.subjectFilter.onchange = ()=>{ C.state.filters.subject = el.subjectFilter.value; C.save(); R.renderAll(); };
    el.searchInput.oninput = ()=>{ C.state.filters.search = el.searchInput.value||''; C.save(); R.renderAll(); };
    el.showDoneToggle.onchange = ()=>{ C.state.filters.showDone = !!el.showDoneToggle.checked; C.save(); R.renderAll(); };

    // Navigation
    el.prevWeekBtn.onclick = ()=>{ C.state.weekStart = C.addDays(C.state.weekStart,-7); C.save(); R.renderAll(); };
    el.thisWeekBtn.onclick = ()=>{ C.state.weekStart = C.startOfWeek(new Date()); C.save(); R.renderAll(); };
    el.nextWeekBtn.onclick = ()=>{ C.state.weekStart = C.addDays(C.state.weekStart, 7); C.save(); R.renderAll(); };

    // View toggle
    el.toggleViewBtn.onclick = ()=>{ C.state.view = (C.state.view==='day' ? 'week':'day'); C.save(); R.renderAll(); };

    // New / Quick
    el.newTaskBtn.onclick = ()=> window.AppUI.forms.openForm('new');
    el.quickAddBtn.onclick = ()=> window.AppUI.forms.openQuick(true);

    // Clear done (confirm)
    if(el.clearDoneBtn){
      el.clearDoneBtn.onclick = ()=>{
        const weekDates = new Set(C.thisWeekDates().map(C.fmtISO));
        const doneThisWeek = C.state.tasks.filter(t=>t.done && weekDates.has(t.plannedDate)).length;
        if(doneThisWeek===0){ alert('Geen afgeronde taken in deze week.'); return; }
        if(confirm(`Wil je ${doneThisWeek} afgeronde taak/ taken van deze week verwijderen?`)){
          C.state.tasks = C.state.tasks.filter(t=> !(t.done && weekDates.has(t.plannedDate)));
          C.save(); R.renderAll();
        }
      };
    }

    // Theme toggle persistence (expects window.setTheme and window.getTheme to be defined by theme.js)
    const themeToggle = document.getElementById('theme-toggle');
    if(themeToggle){
      themeToggle.onclick = ()=>{
        if(window.setTheme){
          const current = document.documentElement.dataset.theme || 'light';
          const next = current==='light' ? 'dark' : 'light';
          window.setTheme(next, true); // true -> persist
        }
      };
    }
  }

  function init(){
    C.load();
    R.renderFiltersInit();
    R.renderAll();
    bindBasic();
    window.__APP_READY = true;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
})();