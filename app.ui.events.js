/* app.ui.events.js — wiring all events */
(function(){
  'use strict';
  const C = window.AppCore;
  const UI = window.AppUI;
  if(!C || !UI){ console.error('AppCore of AppUI ontbreekt'); return; }
  const R = UI.render;

  function wireEvents(){
    const el = UI.el;

    el.prevWeekBtn.onclick=()=>{ C.state.weekStart=C.addDays(C.state.weekStart,-7); C.save(); R.renderAll(); };
    el.thisWeekBtn.onclick=()=>{ C.state.weekStart=C.startOfWeek(new Date()); C.save(); R.renderAll(); };
    el.nextWeekBtn.onclick=()=>{ C.state.weekStart=C.addDays(C.state.weekStart,7); C.save(); R.renderAll(); };

    el.toggleViewBtn.onclick=()=>{ C.state.view = C.state.view==='day' ? 'week':'day'; C.save(); R.renderAll(); };

    el.quickAddBtn.onclick=()=>{
      const d=C.fmtISO(C.activeDate());
      el.q_title.value=''; el.q_subject.value=C.SUBJECTS[0]; el.q_minutes.value=15; el.q_date.value=d; el.q_type.value='Huiswerk';
      UI.forms.openQuick(true);
    };
    el.quickCancel.onclick=()=> UI.forms.openQuick(false);
    el.quickForm.onsubmit=(e)=>{
      e.preventDefault();
      const t={ id:'', title:el.q_title.value.trim(), subject:el.q_subject.value, type:el.q_type.value,
        estimate:Number(el.q_minutes.value)||0, plannedDate:el.q_date.value, dueDate:'', notes:'', done:false };
      if(!t.title) return;
      C.addTask(t); C.save(); UI.forms.openQuick(false); R.renderAll();
    };

    el.subjectFilter.onchange=()=>{ C.state.filters.subject=el.subjectFilter.value; C.save(); R.renderAll(); };
    el.showDoneToggle.onchange=()=>{ C.state.filters.showDone=el.showDoneToggle.checked; C.save(); R.renderAll(); };
    el.searchInput.oninput=()=>{ C.state.filters.search=el.searchInput.value; R.renderAll(); };

    el.clearDoneBtn.onclick=()=>{
      const dates=C.thisWeekDates().map(C.fmtISO);
      const before=C.state.tasks.length;
      C.state.tasks = C.state.tasks.filter(t=> !(t.done && dates.includes(t.plannedDate)));
      if(before!==C.state.tasks.length){ C.save(); R.renderAll(); }
    };
    el.clearDoneBtn.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); el.clearDoneBtn.click(); } });

    el.chevLeft.onclick=()=>{ if(C.state.activeTab>0){ C.state.activeTab--; C.save(); R.renderAll(); } };
    el.chevRight.onclick=()=>{ if(C.state.activeTab<6){ C.state.activeTab++; C.save(); R.renderAll(); } };

    window.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'){ if(C.state.activeTab>0){ C.state.activeTab--; C.save(); R.renderAll(); } }
      if(e.key==='ArrowRight'){ if(C.state.activeTab<6){ C.state.activeTab++; C.save(); R.renderAll(); } }
    });

    // Swipe
    let touchStartX=null;
    document.addEventListener('touchstart',e=>{ if(e.touches.length===1){ touchStartX=e.touches[0].clientX; } },{passive:true});
    document.addEventListener('touchend',e=>{
      if(touchStartX==null) return;
      const dx=e.changedTouches[0].clientX - touchStartX;
      if(Math.abs(dx)>60){ if(dx<0 && C.state.activeTab<6) C.state.activeTab++; if(dx>0 && C.state.activeTab>0) C.state.activeTab--; C.save(); R.renderAll(); }
      touchStartX=null;
    });

    // Modals
    el.newTaskBtn.onclick=()=> UI.forms.openForm('new');
    el.cancelFormBtn.onclick=()=> UI.forms.closeForm();
    el.taskModal.addEventListener('click',e=>{ if(e.target===el.taskModal) UI.forms.closeForm(); });

    el.taskForm.onsubmit=(e)=>{
      e.preventDefault();
      const v={
        title:el.f_title.value.trim(), subject:el.f_subject.value, type:el.f_type.value,
        estimate:Number(el.f_estimate.value)||0, plannedDate:el.f_plannedDate.value,
        dueDate:el.f_dueDate.value||'', notes:el.f_notes.value.trim(),
        split:el.f_split.checked, splitMinutes:Number(el.f_splitMinutes.value)||25,
        skipWeekend:el.f_skipWeekend.checked, repeat:el.f_repeat.checked,
        repeatMinutes:Number(el.f_repeatMinutes.value)||10, repeatPattern:el.f_repeatPattern.value.trim()
      };
      const err=C.validateSplitAndRepeat(v);
      if(err){ el.formError.textContent=err; el.formError.style.display='block'; return; }
      el.formError.style.display='none';

      if(C.state.editingId){
        if(v.split && v.dueDate){
          C.deleteTask(C.state.editingId);
          const set=C.planSplitTasks({ title:v.title, subject:v.subject, type:v.type, splitMinutes:v.splitMinutes, skipWeekend:v.skipWeekend, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes });
          set.forEach(t=>C.state.tasks.push(t));
          if(v.repeat && v.repeatPattern){
            set.forEach(slice=>{
              const reps=C.planRepetitions(slice.plannedDate, v.repeatPattern, v.repeatMinutes, slice.subject, UI.helpers.stripSliceSuffix(slice.title), v.dueDate, v.notes);
              reps.forEach(r=>C.state.tasks.push(r));
            });
          }
        }else{
          C.updateTask(C.state.editingId,{ title:v.title, subject:v.subject, type:v.type, estimate:v.estimate, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes });
          if(v.repeat && v.repeatPattern){
            const reps=C.planRepetitions(v.plannedDate, v.repeatPattern, v.repeatMinutes, v.subject, v.title, v.dueDate, v.notes);
            reps.forEach(r=>C.state.tasks.push(r));
          }
        }
      }else{
        if(v.split && v.dueDate){
          const set=C.planSplitTasks({ title:v.title, subject:v.subject, type:v.type, splitMinutes:v.splitMinutes, skipWeekend:v.skipWeekend, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes });
          set.forEach(t=>C.state.tasks.push(t));
          if(v.repeat && v.repeatPattern){
            set.forEach(slice=>{
              const reps=C.planRepetitions(slice.plannedDate, v.repeatPattern, v.repeatMinutes, slice.subject, UI.helpers.stripSliceSuffix(slice.title), v.dueDate, v.notes);
              reps.forEach(r=>C.state.tasks.push(r));
            });
          }
        }else{
          C.addTask({ title:v.title, subject:v.subject, type:v.type, estimate:v.estimate, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes, done:false });
          if(v.repeat && v.repeatPattern){
            const reps=C.planRepetitions(v.plannedDate, v.repeatPattern, v.repeatMinutes, v.subject, v.title, v.dueDate, v.notes);
            reps.forEach(r=>C.state.tasks.push(r));
          }
        }
      }

      C.save(); UI.forms.closeForm(); UI.render.renderAll();
    });

    // Focus trap
    ['taskModal','quickModal'].forEach(id=>{
      const m=document.getElementById(id);
      m.addEventListener('keydown',(e)=>{
        if(e.key!=='Tab' || !m.classList.contains('open')) return;
        const f=m.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if(!f.length) return;
        const first=f[0], last=f[f.length-1];
        if(e.shiftKey && document.activeElement===first){ last.focus(); e.preventDefault(); }
        else if(!e.shiftKey && document.activeElement===last){ first.focus(); e.preventDefault(); }
      });
    });
  }

  UI.events = { wireEvents };
})();
