// app.ui.js — UI, rendering, events, init
(function(){
  'use strict';
  const C = window.AppCore;
  if(!C){ console.error('AppCore ontbreekt'); return; }

  const qs = (s)=>document.querySelector(s);
  function ce(tag, cls){ const el=document.createElement(tag); if(cls) el.className=cls; return el; }

  // Safe helper: remove trailing " (n/N)" slice suffix without regex
  function isAllDigits(str){ if(!str) return false; for(let i=0;i<str.length;i++){ const c=str.charCodeAt(i); if(c<48||c>57) return false; } return true; }
  function stripSliceSuffix(title){
    if(!title) return title;
    if(!title.endsWith(')')) return title;
    const openIdx = title.lastIndexOf(' (');
    if(openIdx === -1) return title;
    const inside = title.slice(openIdx + 2, -1); // between "( .. )"
    const parts = inside.split('/');
    if(parts.length !== 2) return title;
    if(isAllDigits(parts[0]) && isAllDigits(parts[1])){
      return title.slice(0, openIdx);
    }
    return title;
  }

  let tablistEl, taskListEl, dayTitleEl, dayTotalEl, statsListEl, weekGridEl;
  let prevWeekBtn, thisWeekBtn, nextWeekBtn, newTaskBtn, toggleViewBtn, quickAddBtn;
  let subjectFilter, searchInput, showDoneToggle, clearDoneBtn;
  let chevLeft, chevRight, dayView, weekView;
  let taskModal, taskForm, formError, cancelFormBtn, taskModalTitle, submitFormBtn;
  let f_title, f_subject, f_type, f_estimate, f_plannedDate, f_dueDate, f_notes, f_split, f_splitMinutes, f_skipWeekend, f_repeat, f_repeatMinutes, f_repeatPattern;
  let quickModal, q_title, q_subject, q_minutes, q_date, q_type, quickForm, quickCancel;

  function renderTabs(){
    tablistEl.innerHTML='';
    C.thisWeekDates().forEach((d,i)=>{
      const b=ce('button','tab');
      b.setAttribute('role','tab');
      b.setAttribute('aria-selected', i===C.state.activeTab? 'true':'false');
      b.textContent=C.DAYS[i];
      b.onclick=()=>{ C.state.activeTab=i; C.save(); renderAll(); };
      tablistEl.appendChild(b);
    });
  }
  function taskCard(t){
    const card=ce('div','card'+(t.done?' done':'')); card.dataset.id=t.id;
    const row=ce('div','task-row');

    const left=ce('div','task-left');
    const check=ce('input'); check.type='checkbox'; check.checked=!!t.done;
    check.setAttribute('aria-label','Markeer als gedaan');
    check.onchange=()=>{ C.updateTask(t.id,{done:check.checked}); C.save(); renderAll(); };

    const pill=ce('span','pill'); pill.textContent=t.subject;
    const color=C.SUBJECT_COLORS[t.subject]||'#06B6D4'; pill.style.borderColor=color; pill.style.boxShadow=`inset 0 0 0 1px ${color}22`;
    left.append(check,pill);

    const mid=ce('div');
    const ti=ce('div','title'); ti.textContent=t.title;
    const meta=ce('div','meta');
    meta.textContent = `${t.type} · ${t.estimate} min` + (t.dueDate? ` · deadline ${C.fmtShort(C.parseISO(t.dueDate))}` : '');
    mid.append(ti,meta);
    if(t.notes){ const n=ce('div','form-help'); n.style.marginTop='6px'; n.textContent=t.notes; mid.append(n); }

    const act=ce('div','actions');
    const btnTomorrow = ce('button','icon-btn'); btnTomorrow.title='Naar morgen'; btnTomorrow.setAttribute('aria-label','Naar morgen'); btnTomorrow.textContent='🗓'; btnTomorrow.onclick=()=>{ C.moveTaskToTomorrow(t.id); C.save(); renderAll(); };
    const btnCopy = ce('button','icon-btn'); btnCopy.title='Kopieer'; btnCopy.setAttribute('aria-label','Kopieer'); btnCopy.textContent='📄'; btnCopy.onclick=()=>{ C.copyTask(t.id); C.save(); renderAll(); };
    const btnEdit = ce('button','icon-btn'); btnEdit.title='Bewerk'; btnEdit.setAttribute('aria-label','Bewerk'); btnEdit.textContent='✏️'; btnEdit.onclick=()=> openForm('edit',t);
    const btnDel = ce('button','icon-btn'); btnDel.title='Verwijder'; btnDel.setAttribute('aria-label','Verwijder'); btnDel.textContent='🗑'; btnDel.onclick=()=>{ if(confirm('Taak verwijderen?')){ C.deleteTask(t.id); C.save(); renderAll(); } };
    act.append(btnTomorrow,btnCopy,btnEdit,btnDel);

    row.append(left,mid,act); card.appendChild(row); return card;
  }
  function renderDay(){
    const date=C.activeDate(); const iso=C.fmtISO(date);
    dayTitleEl.textContent = `${C.ucfirst(date.toLocaleDateString('nl-NL',{weekday:'long'}))} ${String(date.getDate()).padStart(2,'0')} ${date.toLocaleDateString('nl-NL',{month:'short'})}`;

    const todays=C.state.tasks.filter(t=>t.plannedDate===iso).filter(C.matchesFilters)
      .sort((a,b)=> a.done-b.done || a.subject.localeCompare(b.subject));

    const total=todays.reduce((s,t)=> s + (t.done?0:Number(t.estimate||0)),0);
    dayTotalEl.textContent= total>0 ? `Totaal: ${C.minutesToText(total)}` : 'Totaal: 0 min';

    taskListEl.innerHTML='';
    if(!todays.length){
      const empty=ce('div','card'); empty.innerHTML=`<div class="form-help">Geen taken voor deze dag. Tip: gebruik “Nieuwe taak” of “Snel toevoegen”.</div>`;
      taskListEl.appendChild(empty); return;
    }
    todays.forEach(t=> taskListEl.appendChild(taskCard(t)));
  }
  function renderWeek(){
    weekGridEl.innerHTML='';
    C.thisWeekDates().forEach((d,i)=>{
      const iso=C.fmtISO(d);
      const col=ce('div','col'); col.dataset.dayIndex=String(i); col.dataset.date=iso;
      const h=ce('h4'); h.textContent=`${C.DAYS[i]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      col.appendChild(h);

      const tasks=C.state.tasks.filter(t=>t.plannedDate===iso).filter(C.matchesFilters)
        .sort((a,b)=> a.done-b.done || a.subject.localeCompare(b.subject));

      tasks.forEach(t=>{
        const item=ce('div','card'+(t.done?' done':'')); item.draggable=true; item.dataset.id=t.id;
        item.innerHTML=`
          <div class="task-row">
            <div class="task-left"><span class="pill" style="border-color:${C.SUBJECT_COLORS[t.subject]||'#06B6D4'}">${t.subject}</span></div>
            <div><div class="title">${t.title}</div><div class="meta">${t.type} · ${t.estimate} min</div></div>
            <div class="actions"><button class="icon-btn" title="Bewerk" aria-label="Bewerk">✏️</button></div>
          </div>`;
        item.querySelector('.icon-btn').onclick=()=>openForm('edit',t);

        item.addEventListener('dragstart',(e)=>{ item.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',t.id); }catch(_e){} });
        item.addEventListener('dragend',()=> item.classList.remove('dragging'));
        col.addEventListener('dragover',(e)=>{ e.preventDefault(); col.classList.add('drop-target'); });
        col.addEventListener('dragleave',()=> col.classList.remove('drop-target'));
        col.addEventListener('drop',(e)=>{ e.preventDefault(); col.classList.remove('drop-target'); let id=''; try{ id=e.dataTransfer.getData('text/plain'); }catch(_e){} if(!id) return; C.updateTask(id,{plannedDate:iso}); C.save(); renderAll(); });

        col.appendChild(item);
      });

      weekGridEl.appendChild(col);
    });
  }
  function renderStats(){
    statsListEl.innerHTML='';
    const per=C.buildWeeklyStats();
    C.SUBJECTS.forEach(s=>{
      const row=ce('div','stat-row');
      const label=ce('div'); label.style.minWidth='120px'; label.textContent=s;
      const bar=ce('div','bar'); const fill=ce('span');
      const total=per[s].total||0; const done=per[s].done||0; const pct= total? Math.round(done/total*100):0;
      fill.style.width=pct+'%'; fill.style.background=C.SUBJECT_COLORS[s]||'#06B6D4'; bar.appendChild(fill);
      const txt=ce('div'); txt.style.minWidth='70px'; txt.style.textAlign='right'; txt.textContent=`${done}/${total}`;
      row.append(label,bar,txt); statsListEl.appendChild(row);
    });
  }
  function renderFiltersInit(){
    subjectFilter.innerHTML = `<option value="Alle">Alle vakken</option>` + C.SUBJECTS.map(s=>`<option>${s}</option>`).join('');
    f_subject.innerHTML = C.SUBJECTS.map(s=>`<option>${s}</option>`).join('');
    q_subject.innerHTML = C.SUBJECTS.map(s=>`<option>${s}</option>`).join('');
  }
  function renderAll(){
    renderTabs();
    if(C.state.view==='day'){ dayView.style.display='block'; weekView.style.display='none'; renderDay(); }
    else{ dayView.style.display='none'; weekView.style.display='block'; renderWeek(); }
    renderStats();
    subjectFilter.value = C.state.filters.subject;
    showDoneToggle.checked = C.state.filters.showDone;
    searchInput.value = C.state.filters.search;
    toggleViewBtn.textContent = C.state.view==='day' ? 'Weekoverzicht':'Dagweergave';
    toggleViewBtn.setAttribute('aria-pressed', C.state.view==='week');
  }

  function openForm(mode, task){
    taskModal.classList.add('open');
    document.body.style.overflow='hidden';
    const app = document.getElementById('app'); if(app) app.style.filter='blur(1px)';
    formError.style.display='none';

    if(mode==='edit' && task){
      C.state.editingId=task.id; taskModalTitle.textContent='Taak bewerken'; submitFormBtn.textContent='Opslaan';
      f_title.value=task.title; f_subject.value=task.subject; f_type.value=task.type;
      f_estimate.value=task.estimate; f_plannedDate.value=task.plannedDate; f_dueDate.value=task.dueDate||''; f_notes.value=task.notes||'';
      f_split.checked=false; f_repeat.checked=false;
    }else{
      C.state.editingId=null; taskModalTitle.textContent='Nieuwe taak'; submitFormBtn.textContent='Toevoegen';
      f_title.value=''; f_subject.value=C.SUBJECTS[0]; f_type.value='Huiswerk';
      f_estimate.value=25; f_plannedDate.value=C.fmtISO(C.activeDate()); f_dueDate.value=''; f_notes.value='';
      f_split.checked=false; f_skipWeekend.checked=true; f_splitMinutes.value=25;
      f_repeat.checked=false; f_repeatMinutes.value=10; f_repeatPattern.value='1,3,7';
    }
  }
  function closeForm(){
    taskModal.classList.remove('open');
    document.body.style.overflow='';
    const app = document.getElementById('app'); if(app) app.style.filter='';
  }
  function openQuick(flag){
    quickModal.classList.toggle('open', !!flag);
    document.body.style.overflow = flag ? 'hidden' : '';
    const app = document.getElementById('app'); if(app) app.style.filter = flag ? 'blur(1px)' : '';
  }

  function wireEvents(){
    prevWeekBtn.onclick=()=>{ C.state.weekStart=C.addDays(C.state.weekStart,-7); C.save(); renderAll(); };
    thisWeekBtn.onclick=()=>{ C.state.weekStart=C.startOfWeek(new Date()); C.save(); renderAll(); };
    nextWeekBtn.onclick=()=>{ C.state.weekStart=C.addDays(C.state.weekStart,7); C.save(); renderAll(); };

    toggleViewBtn.onclick=()=>{ C.state.view = C.state.view==='day' ? 'week':'day'; C.save(); renderAll(); };

    quickAddBtn.onclick=()=>{
      const d=C.fmtISO(C.activeDate());
      q_title.value=''; q_subject.value=C.SUBJECTS[0]; q_minutes.value=15; q_date.value=d; q_type.value='Huiswerk';
      openQuick(true);
    };
    quickCancel.onclick=()=> openQuick(false);
    quickForm.onsubmit=(e)=>{
      e.preventDefault();
      const t={ id:'', title:q_title.value.trim(), subject:q_subject.value, type:q_type.value,
        estimate:Number(q_minutes.value)||0, plannedDate:q_date.value, dueDate:'', notes:'', done:false };
      if(!t.title) return;
      C.addTask(t); C.save(); openQuick(false); renderAll();
    };

    subjectFilter.onchange=()=>{ C.state.filters.subject=subjectFilter.value; C.save(); renderAll(); };
    showDoneToggle.onchange=()=>{ C.state.filters.showDone=showDoneToggle.checked; C.save(); renderAll(); };
    searchInput.oninput=()=>{ C.state.filters.search=searchInput.value; renderAll(); };

    clearDoneBtn.onclick=()=>{
      const dates=C.thisWeekDates().map(C.fmtISO);
      const before=C.state.tasks.length;
      C.state.tasks = C.state.tasks.filter(t=> !(t.done && dates.includes(t.plannedDate)));
      if(before!==C.state.tasks.length){ C.save(); renderAll(); }
    };
    clearDoneBtn.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); clearDoneBtn.click(); } });

    chevLeft.onclick=()=>{ if(C.state.activeTab>0){ C.state.activeTab--; C.save(); renderAll(); } };
    chevRight.onclick=()=>{ if(C.state.activeTab<6){ C.state.activeTab++; C.save(); renderAll(); } };

    window.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'){ if(C.state.activeTab>0){ C.state.activeTab--; C.save(); renderAll(); } }
      if(e.key==='ArrowRight'){ if(C.state.activeTab<6){ C.state.activeTab++; C.save(); renderAll(); } }
    });

    // Swipe
    let touchStartX=null;
    document.addEventListener('touchstart',e=>{ if(e.touches.length===1){ touchStartX=e.touches[0].clientX; } },{passive:true});
    document.addEventListener('touchend',e=>{
      if(touchStartX==null) return;
      const dx=e.changedTouches[0].clientX - touchStartX;
      if(Math.abs(dx)>60){ if(dx<0 && C.state.activeTab<6) C.state.activeTab++; if(dx>0 && C.state.activeTab>0) C.state.activeTab--; C.save(); renderAll(); }
      touchStartX=null;
    });

    // Modals
    newTaskBtn.onclick=()=> openForm('new');
    cancelFormBtn.onclick=()=> closeForm();
    taskModal.addEventListener('click',e=>{ if(e.target===taskModal) closeForm(); });

    taskForm.onsubmit=(e)=>{
      e.preventDefault();
      const v={
        title:f_title.value.trim(), subject:f_subject.value, type:f_type.value,
        estimate:Number(f_estimate.value)||0, plannedDate:f_plannedDate.value,
        dueDate:f_dueDate.value||'', notes:f_notes.value.trim(),
        split:f_split.checked, splitMinutes:Number(f_splitMinutes.value)||25,
        skipWeekend:f_skipWeekend.checked, repeat:f_repeat.checked,
        repeatMinutes:Number(f_repeatMinutes.value)||10, repeatPattern:f_repeatPattern.value.trim()
      };
      const err=C.validateSplitAndRepeat(v);
      if(err){ formError.textContent=err; formError.style.display='block'; return; }
      formError.style.display='none';

      if(C.state.editingId){
        if(v.split && v.dueDate){
          C.deleteTask(C.state.editingId);
          const set=C.planSplitTasks({ title:v.title, subject:v.subject, type:v.type, splitMinutes:v.splitMinutes, skipWeekend:v.skipWeekend, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes });
          set.forEach(t=>C.state.tasks.push(t));
          if(v.repeat && v.repeatPattern){
            set.forEach(slice=>{
              const reps=C.planRepetitions(slice.plannedDate, v.repeatPattern, v.repeatMinutes, slice.subject, stripSliceSuffix(slice.title), v.dueDate, v.notes);
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
              const reps=C.planRepetitions(slice.plannedDate, v.repeatPattern, v.repeatMinutes, slice.subject, stripSliceSuffix(slice.title), v.dueDate, v.notes);
              reps.forEach(r=>C.state.tasks.push(r));
            });
          }
        }else{
          C.state.tasks.push({ id:(Math.random()+Date.now()).toString(36), title:v.title, subject:v.subject, type:v.type, estimate:v.estimate, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes, done:false });
          if(v.repeat && v.repeatPattern){
            const reps=C.planRepetitions(v.plannedDate, v.repeatPattern, v.repeatMinutes, v.subject, v.title, v.dueDate, v.notes);
            reps.forEach(r=>C.state.tasks.push(r));
          }
        }
      }

      C.save(); closeForm(); renderAll();
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

  function init(){
    tablistEl = qs('#tablist'); taskListEl = qs('#taskList'); dayTitleEl = qs('#dayTitle'); dayTotalEl = qs('#dayTotal'); statsListEl = qs('#statsList'); weekGridEl = qs('#weekGrid');
    prevWeekBtn = qs('#prevWeekBtn'); thisWeekBtn = qs('#thisWeekBtn'); nextWeekBtn = qs('#nextWeekBtn'); newTaskBtn = qs('#newTaskBtn'); toggleViewBtn = qs('#toggleViewBtn'); quickAddBtn = qs('#quickAddBtn');
    subjectFilter = qs('#subjectFilter'); searchInput = qs('#searchInput'); showDoneToggle = qs('#showDoneToggle'); clearDoneBtn = qs('#clearDoneBtn');
    chevLeft = qs('#chevLeft'); chevRight = qs('#chevRight'); dayView = qs('#dayView'); weekView = qs('#weekView');
    taskModal = qs('#taskModal'); taskForm = qs('#taskForm'); formError = qs('#formError'); cancelFormBtn = qs('#cancelFormBtn'); taskModalTitle = qs('#taskModalTitle'); submitFormBtn = qs('#submitFormBtn');
    f_title = qs('#f_title'); f_subject = qs('#f_subject'); f_type = qs('#f_type'); f_estimate = qs('#f_estimate'); f_plannedDate = qs('#f_plannedDate'); f_dueDate = qs('#f_dueDate'); f_notes = qs('#f_notes'); f_split = qs('#f_split'); f_splitMinutes = qs('#f_splitMinutes'); f_skipWeekend = qs('#f_skipWeekend'); f_repeat = qs('#f_repeat'); f_repeatMinutes = qs('#f_repeatMinutes'); f_repeatPattern = qs('#f_repeatPattern');
    quickModal = qs('#quickModal'); q_title = qs('#q_title'); q_subject = qs('#q_subject'); q_minutes = qs('#q_minutes'); q_date = qs('#q_date'); q_type = qs('#q_type'); quickForm = qs('#quickForm'); quickCancel = qs('#quickCancel');

    C.load(); renderFiltersInit(); renderAll(); wireEvents();
    window.__APP_READY = true;
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init, {once:true}); }
  else{ init(); }
})();
