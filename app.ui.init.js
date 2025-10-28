/* app.ui.init.js — grab DOM and boot */
(function(){
  'use strict';
  const C = window.AppCore;
  const UI = window.AppUI;
  if(!C || !UI){ console.error('AppCore of AppUI ontbreekt'); return; }

  function init(){
    const q = UI.helpers.qs;
    const el = UI.el;
    el.tablistEl = q('#tablist'); el.taskListEl = q('#taskList'); el.dayTitleEl = q('#dayTitle'); el.dayTotalEl = q('#dayTotal'); el.statsListEl = q('#statsList'); el.weekGridEl = q('#weekGrid');
    el.prevWeekBtn = q('#prevWeekBtn'); el.thisWeekBtn = q('#thisWeekBtn'); el.nextWeekBtn = q('#nextWeekBtn'); el.newTaskBtn = q('#newTaskBtn'); el.toggleViewBtn = q('#toggleViewBtn'); el.quickAddBtn = q('#quickAddBtn');
    el.subjectFilter = q('#subjectFilter'); el.searchInput = q('#searchInput'); el.showDoneToggle = q('#showDoneToggle'); el.clearDoneBtn = q('#clearDoneBtn');
    el.chevLeft = q('#chevLeft'); el.chevRight = q('#chevRight'); el.dayView = q('#dayView'); el.weekView = q('#weekView');
    el.taskModal = q('#taskModal'); el.taskForm = q('#taskForm'); el.formError = q('#formError'); el.cancelFormBtn = q('#cancelFormBtn'); el.taskModalTitle = q('#taskModalTitle'); el.submitFormBtn = q('#submitFormBtn');
    el.f_title = q('#f_title'); el.f_subject = q('#f_subject'); el.f_type = q('#f_type'); el.f_estimate = q('#f_estimate'); el.f_plannedDate = q('#f_plannedDate'); el.f_dueDate = q('#f_dueDate'); el.f_notes = q('#f_notes'); el.f_split = q('#f_split'); el.f_splitMinutes = q('#f_splitMinutes'); el.f_skipWeekend = q('#f_skipWeekend'); el.f_repeat = q('#f_repeat'); el.f_repeatMinutes = q('#f_repeatMinutes'); el.f_repeatPattern = q('#f_repeatPattern');
    el.quickModal = q('#quickModal'); el.q_title = q('#q_title'); el.q_subject = q('#q_subject'); el.q_minutes = q('#q_minutes'); el.q_date = q('#q_date'); el.q_type = q('#q_type'); el.quickForm = q('#quickForm'); el.quickCancel = q('#quickCancel');

    C.load(); document.documentElement.setAttribute('data-view', C.state.view||'week'); UI.render.renderFiltersInit(); UI.render.renderAll(); UI.events.wireEvents();
    window.__APP_READY = true;
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init, {once:true}); }
  else{ init(); }
})();
