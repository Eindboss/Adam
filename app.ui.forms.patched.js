/* app.ui.forms.patched.js — modals & forms (patched: focus, Esc to close) */
(function(){
  'use strict';
  const C = window.AppCore;
  const UI = window.AppUI;
  if(!C || !UI){ console.error('AppCore of AppUI ontbreekt'); return; }
  const H = UI.helpers;

  function openForm(mode, task){
    const el = UI.el;
    el.taskModal.classList.add('open');
    document.body.style.overflow='hidden';
    const app = document.getElementById('app'); if(app) app.style.filter='blur(1px)';
    el.formError.style.display='none';

    if(mode==='edit' && task){
      C.state.editingId=task.id; el.taskModalTitle.textContent='Taak bewerken'; el.submitFormBtn.textContent='Opslaan';
      el.f_title.value=task.title; el.f_subject.value=task.subject; el.f_type.value=task.type;
      el.f_estimate.value=task.estimate; el.f_plannedDate.value=task.plannedDate; el.f_dueDate.value=task.dueDate||''; el.f_notes.value=task.notes||'';
      el.f_split.checked=false; el.f_repeat.checked=false;
    }else{
      C.state.editingId=null; el.taskModalTitle.textContent='Nieuwe taak'; el.submitFormBtn.textContent='Toevoegen';
      el.f_title.value=''; el.f_subject.value=C.SUBJECTS[0]; el.f_type.value='Huiswerk';
      el.f_estimate.value=25; el.f_plannedDate.value=C.fmtISO(C.activeDate()); el.f_dueDate.value=''; el.f_notes.value='';
      el.f_split.checked=false; el.f_skipWeekend.checked=true; el.f_splitMinutes.value=25;
      el.f_repeat.checked=false; el.f_repeatMinutes.value=10; el.f_repeatPattern.value='1,3,7';
    }

    // Patched: focus title and add Esc handler
    H.focusAndSelect(el.f_title);
    const onKey = (e)=>{ if(e.key==='Escape'){ closeForm(); } };
    document.addEventListener('keydown', onKey, {once:true});
  }
  function closeForm(){
    const el = UI.el;
    el.taskModal.classList.remove('open');
    document.body.style.overflow='';
    const app = document.getElementById('app'); if(app) app.style.filter='';
  }
  function openQuick(flag){
    const el = UI.el;
    el.quickModal.classList.toggle('open', !!flag);
    document.body.style.overflow = flag ? 'hidden' : '';
    const app = document.getElementById('app'); if(app) app.style.filter = flag ? 'blur(1px)' : '';

    if(flag){
      H.focusAndSelect(el.q_title);
      const onKey = (e)=>{ if(e.key==='Escape'){ openQuick(false); } };
      document.addEventListener('keydown', onKey, {once:true});
    }
  }

  UI.forms = {
    openForm, closeForm, openQuick
  };
})();