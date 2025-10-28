// CONFIG
const STORAGE_KEY = 'adam-leeragenda-v1';
const SUBJECTS = ['Aardrijkskunde','Geschiedenis','Nederlands','Latijn','Wiskunde','Frans','Engels','Biologie'];
const SUBJECT_COLORS = {
  'Aardrijkskunde':'#06B6D4','Geschiedenis':'#D97706','Nederlands':'#A7F3D0',
  'Latijn':'#06B6D4','Wiskunde':'#D97706','Frans':'#A7F3D0','Engels':'#06B6D4','Biologie':'#D97706'
};
const DAYS = ['Ma','Di','Wo','Do','Vr','Za','Zo'];

// UTILITIES
const uid = (()=>{
  if (typeof crypto!=='undefined' && crypto.randomUUID) return ()=>crypto.randomUUID();
  return ()=> 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
})();
const qs = (s)=>document.querySelector(s);
function ce(tag, cls){ const el=document.createElement(tag); if(cls) el.className=cls; return el; }
function ucfirst(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
function minutesToText(min){ const h=Math.floor(min/60), m=min%60; if(h===0) return `${m} min`; if(m===0) return `${h} u`; return `${h} u ${m} min`; }

// DATES
function startOfWeek(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtISO(d){ return d.toISOString().slice(0,10); }
function parseISO(s){ const [y,m,dd]=(s||'').split('-').map(Number); const d=new Date(y||NaN,(m||1)-1,dd||1); d.setHours(0,0,0,0); return d; }
function fmtShort(d){ return d.toLocaleDateString('nl-NL',{day:'2-digit',month:'2-digit'}); }
function isWeekend(d){ const day=(d.getDay()+6)%7; return day>=5; }

// STATE
const state = {
  tasks: [],
  weekStart: startOfWeek(new Date()),
  activeTab: 0,
  view: 'day',
  filters: { subject:'Alle', showDone:false, search:'' },
  editingId: null
};

// STORAGE
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const obj = JSON.parse(raw);
    state.tasks = Array.isArray(obj.tasks) ? obj.tasks : [];
    state.weekStart = obj.weekStart ? parseISO(obj.weekStart) : startOfWeek(new Date());
    state.activeTab = Number.isInteger(obj.activeTab) ? obj.activeTab : 0;
    state.view = (obj.view==='week' || obj.view==='day') ? obj.view : 'day';
    state.filters = obj.filters || state.filters;
  }catch(e){
    try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  }
}
function save(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tasks: state.tasks,
      weekStart: fmtISO(state.weekStart),
      activeTab: state.activeTab,
      view: state.view,
      filters: state.filters
    }));
  }catch(e){}
}

// HELPERS
function thisWeekDates(){ return Array.from({length:7},(_,i)=>addDays(state.weekStart,i)); }
function activeDate(){ return addDays(state.weekStart, state.activeTab); }
function matchesFilters(task){
  if(state.filters.subject!=='Alle' && task.subject!==state.filters.subject) return false;
  if(!state.filters.showDone && task.done) return false;
  if(state.filters.search){
    const q=state.filters.search.toLowerCase();
    if(!task.title.toLowerCase().includes(q)) return false;
  }
  return true;
}
function buildWeeklyStats(){
  const dates=thisWeekDates().map(fmtISO);
  const per={}; SUBJECTS.forEach(s=> per[s]={done:0,total:0});
  for(const t of state.tasks){
    if(dates.includes(t.plannedDate) && per[t.subject]){
      per[t.subject].total += 1; if(t.done) per[t.subject].done += 1;
    }
  }
  return per;
}

// CRUD
function addTask(t){ t.id=uid(); state.tasks.push(t); }
function updateTask(id,patch){ const i=state.tasks.findIndex(x=>x.id===id); if(i>-1) state.tasks[i]={...state.tasks[i],...patch}; }
function deleteTask(id){ state.tasks=state.tasks.filter(x=>x.id!==id); }
function copyTask(id){ const t=state.tasks.find(x=>x.id===id); if(!t) return; state.tasks.push({...t,id:uid(),title:t.title+' (kopie)'}); }
function moveTaskToTomorrow(id){ const t=state.tasks.find(x=>x.id===id); if(!t) return; updateTask(id,{plannedDate: fmtISO(addDays(parseISO(t.plannedDate),1))}); }

// SPLIT / REPEAT
function validateSplitAndRepeat(v){
  if(v.split){
    if(!v.dueDate) return 'Bij verdelen is een deadline verplicht.';
    if(parseISO(v.dueDate) < parseISO(v.plannedDate)) return 'Deadline moet op of na de plandag liggen.';
  }
  if(v.repeat && v.repeatPattern){
    const ok=v.repeatPattern.split(',').map(s=>s.trim()).every(x=>/^[1-9]\d*$/.test(x));
    if(!ok) return 'Patroon alleen positieve gehele getallen, gescheiden door komma’s.';
  }
  return null;
}
function planSplitTasks(base){
  const { title, subject, type, splitMinutes, skipWeekend, plannedDate, dueDate, notes } = base;
  const start=parseISO(plannedDate), end=parseISO(dueDate);
  const days=[]; let d=new Date(start);
  while(d<=end){ if(!skipWeekend || !isWeekend(d)) days.push(fmtISO(d)); d=addDays(d,1); }
  const N=days.length||1;
  return days.map((iso,i)=>({ id:uid(), title:`${title} (${i+1}/${N})`, subject, type, estimate:splitMinutes, plannedDate:iso, dueDate:fmtISO(end), notes, done:false }));
}
function planRepetitions(baseISO, patternStr, repeatMinutes, subject, title, dueDate, notes){
  const out=[]; const start=parseISO(baseISO); const end= dueDate? parseISO(dueDate): null;
  const offs=patternStr.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>n>0);
  offs.forEach(off=>{
    const d=addDays(start,off); if(end && d>end) return;
    out.push({ id:uid(), title:`${title} · herhaling`, subject, type:'Herhaling', estimate:repeatMinutes, plannedDate:fmtISO(d), dueDate:dueDate||'', notes, done:false });
  });
  return out;
}

// RENDER
let tablistEl, taskListEl, dayTitleEl, dayTotalEl, statsListEl, weekGridEl;
let prevWeekBtn, thisWeekBtn, nextWeekBtn, newTaskBtn, toggleViewBtn, quickAddBtn;
let subjectFilter, searchInput, showDoneToggle, clearDoneBtn;
let chevLeft, chevRight, dayView, weekView;
let taskModal, taskForm, formError, cancelFormBtn, taskModalTitle, submitFormBtn;
let f_title, f_subject, f_type, f_estimate, f_plannedDate, f_dueDate, f_notes, f_split, f_splitMinutes, f_skipWeekend, f_repeat, f_repeatMinutes, f_repeatPattern;
let quickModal, q_title, q_subject, q_minutes, q_date, q_type, quickForm, quickCancel;

function renderTabs(){
  tablistEl.innerHTML='';
  thisWeekDates().forEach((d,i)=>{
    const b=ce('button','tab');
    b.setAttribute('role','tab');
    b.setAttribute('aria-selected', i===state.activeTab? 'true':'false');
    b.textContent=DAYS[i];
    b.onclick=()=>{ state.activeTab=i; save(); renderAll(); };
    tablistEl.appendChild(b);
  });
}
function taskCard(t){
  const card=ce('div','card'+(t.done?' done':'')); card.dataset.id=t.id;
  const row=ce('div','task-row');

  const left=ce('div','task-left');
  const check=ce('input'); check.type='checkbox'; check.checked=!!t.done;
  check.setAttribute('aria-label','Markeer als gedaan');
  check.onchange=()=>{ updateTask(t.id,{done:check.checked}); save(); renderAll(); };

  const pill=ce('span','pill'); pill.textContent=t.subject;
  const color=SUBJECT_COLORS[t.subject]||'#06B6D4'; pill.style.borderColor=color; pill.style.boxShadow=`inset 0 0 0 1px ${color}22`;
  left.append(check,pill);

  const mid=ce('div');
  const ti=ce('div','title'); ti.textContent=t.title;
  const meta=ce('div','meta');
  meta.textContent = `${t.type} · ${t.estimate} min` + (t.dueDate? ` · deadline ${fmtShort(parseISO(t.dueDate))}` : '');
  mid.append(ti,meta);
  if(t.notes){ const n=ce('div','form-help'); n.style.marginTop='6px'; n.textContent=t.notes; mid.append(n); }

  const act=ce('div','actions');
  const btnTomorrow = ce('button','icon-btn'); btnTomorrow.title='Naar morgen'; btnTomorrow.setAttribute('aria-label','Naar morgen'); btnTomorrow.textContent='🗓'; btnTomorrow.onclick=()=>{ moveTaskToTomorrow(t.id); save(); renderAll(); };
  const btnCopy = ce('button','icon-btn'); btnCopy.title='Kopieer'; btnCopy.setAttribute('aria-label','Kopieer'); btnCopy.textContent='📄'; btnCopy.onclick=()=>{ copyTask(t.id); save(); renderAll(); };
  const btnEdit = ce('button','icon-btn'); btnEdit.title='Bewerk'; btnEdit.setAttribute('aria-label','Bewerk'); btnEdit.textContent='✏️'; btnEdit.onclick=()=> openForm('edit',t);
  const btnDel = ce('button','icon-btn'); btnDel.title='Verwijder'; btnDel.setAttribute('aria-label','Verwijder'); btnDel.textContent='🗑'; btnDel.onclick=()=>{ if(confirm('Taak verwijderen?')){ deleteTask(t.id); save(); renderAll(); } };
  act.append(btnTomorrow,btnCopy,btnEdit,btnDel);

  row.append(left,mid,act); card.appendChild(row); return card;
}
function renderDay(){
  const date=activeDate(); const iso=fmtISO(date);
  dayTitleEl.textContent = `${ucfirst(date.toLocaleDateString('nl-NL',{weekday:'long'}))} ${String(date.getDate()).padStart(2,'0')} ${date.toLocaleDateString('nl-NL',{month:'short'})}`;

  const todays=state.tasks.filter(t=>t.plannedDate===iso).filter(matchesFilters)
    .sort((a,b)=> a.done-b.done || a.subject.localeCompare(b.subject));

  const total=todays.reduce((s,t)=> s + (t.done?0:Number(t.estimate||0)),0);
  dayTotalEl.textContent= total>0 ? `Totaal: ${minutesToText(total)}` : 'Totaal: 0 min';

  taskListEl.innerHTML='';
  if(!todays.length){
    const empty=ce('div','card'); empty.innerHTML=`<div class="form-help">Geen taken voor deze dag. Tip: gebruik “Nieuwe taak” of “Snel toevoegen”.</div>`;
    taskListEl.appendChild(empty); return;
  }
  todays.forEach(t=> taskListEl.appendChild(taskCard(t)));
}
function renderWeek(){
  weekGridEl.innerHTML='';
  thisWeekDates().forEach((d,i)=>{
    const iso=fmtISO(d);
    const col=ce('div','col'); col.dataset.dayIndex=i; col.dataset.date=iso;
    const h=ce('h4'); h.textContent=`${DAYS[i]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    col.appendChild(h);

    const tasks=state.tasks.filter(t=>t.plannedDate===iso).filter(matchesFilters)
      .sort((a,b)=> a.done-b.done || a.subject.localeCompare(b.subject));

    tasks.forEach(t=>{
      const item=ce('div','card'+(t.done?' done':'')); item.draggable=true; item.dataset.id=t.id;
      item.innerHTML=`
        <div class="task-row">
          <div class="task-left"><span class="pill" style="border-color:${SUBJECT_COLORS[t.subject]||'#06B6D4'}">${t.subject}</span></div>
          <div><div class="title">${t.title}</div><div class="meta">${t.type} · ${t.estimate} min</div></div>
          <div class="actions"><button class="icon-btn" title="Bewerk" aria-label="Bewerk">✏️</button></div>
        </div>`;
      item.querySelector('.icon-btn').onclick=()=>openForm('edit',t);

      item.addEventListener('dragstart',(e)=>{ item.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',t.id); }catch(_e){} });
      item.addEventListener('dragend',()=> item.classList.remove('dragging'));
      col.addEventListener('dragover',(e)=>{ e.preventDefault(); col.classList.add('drop-target'); });
      col.addEventListener('dragleave',()=> col.classList.remove('drop-target'));
      col.addEventListener('drop',(e)=>{ e.preventDefault(); col.classList.remove('drop-target'); let id=''; try{ id=e.dataTransfer.getData('text/plain'); }catch(_e){} if(!id) return; updateTask(id,{plannedDate:iso}); save(); renderAll(); });

      col.appendChild(item);
    });

    weekGridEl.appendChild(col);
  });
}
function renderStats(){
  statsListEl.innerHTML='';
  const per=buildWeeklyStats();
  SUBJECTS.forEach(s=>{
    const row=ce('div','stat-row');
    const label=ce('div'); label.style.minWidth='120px'; label.textContent=s;
    const bar=ce('div','bar'); const fill=ce('span');
    const total=per[s].total||0; const done=per[s].done||0; const pct= total? Math.round(done/total*100):0;
    fill.style.width=pct+'%'; fill.style.background=SUBJECT_COLORS[s]||'#06B6D4'; bar.appendChild(fill);
    const txt=ce('div'); txt.style.minWidth='70px'; txt.style.textAlign='right'; txt.textContent=`${done}/${total}`;
    row.append(label,bar,txt); statsListEl.appendChild(row);
  });
}
function renderFiltersInit(){
  subjectFilter.innerHTML = `<option value="Alle">Alle vakken</option>` + SUBJECTS.map(s=>`<option>${s}</option>`).join('');
  f_subject.innerHTML = SUBJECTS.map(s=>`<option>${s}</option>`).join('');
  q_subject.innerHTML = SUBJECTS.map(s=>`<option>${s}</option>`).join('');
}
function renderAll(){
  renderTabs();
  if(state.view==='day'){ dayView.style.display='block'; weekView.style.display='none'; renderDay(); }
  else{ dayView.style.display='none'; weekView.style.display='block'; renderWeek(); }
  renderStats();
  subjectFilter.value = state.filters.subject;
  showDoneToggle.checked = state.filters.showDone;
  searchInput.value = state.filters.search;
  toggleViewBtn.textContent = state.view==='day' ? 'Weekoverzicht':'Dagweergave';
  toggleViewBtn.setAttribute('aria-pressed', state.view==='week');
}

// EVENTS
function wireEvents(){
  prevWeekBtn.onclick=()=>{ state.weekStart=addDays(state.weekStart,-7); save(); renderAll(); };
  thisWeekBtn.onclick=()=>{ state.weekStart=startOfWeek(new Date()); save(); renderAll(); };
  nextWeekBtn.onclick=()=>{ state.weekStart=addDays(state.weekStart,7); save(); renderAll(); };

  toggleViewBtn.onclick=()=>{ state.view = state.view==='day' ? 'week':'day'; save(); renderAll(); };

  quickAddBtn.onclick=()=>{
    const d=fmtISO(activeDate());
    q_title.value=''; q_subject.value=SUBJECTS[0]; q_minutes.value=15; q_date.value=d; q_type.value='Huiswerk';
    openQuick(true);
  };
  quickCancel.onclick=()=> openQuick(false);
  quickForm.onsubmit=(e)=>{
    e.preventDefault();
    const t={ id:'', title:q_title.value.trim(), subject:q_subject.value, type:q_type.value,
      estimate:Number(q_minutes.value)||0, plannedDate:q_date.value, dueDate:'', notes:'', done:false };
    if(!t.title) return;
    addTask(t); save(); openQuick(false); renderAll();
  };

  subjectFilter.onchange=()=>{ state.filters.subject=subjectFilter.value; save(); renderAll(); };
  showDoneToggle.onchange=()=>{ state.filters.showDone=showDoneToggle.checked; save(); renderAll(); };
  searchInput.oninput=()=>{ state.filters.search=searchInput.value; renderAll(); };

  clearDoneBtn.onclick=()=>{
    const dates=thisWeekDates().map(fmtISO);
    const before=state.tasks.length;
    state.tasks = state.tasks.filter(t=> !(t.done && dates.includes(t.plannedDate)));
    if(before!==state.tasks.length){ save(); renderAll(); }
  };
  clearDoneBtn.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); clearDoneBtn.click(); } });

  chevLeft.onclick=()=>{ if(state.activeTab>0){ state.activeTab--; save(); renderAll(); } };
  chevRight.onclick=()=>{ if(state.activeTab<6){ state.activeTab++; save(); renderAll(); } };

  window.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'){ if(state.activeTab>0){ state.activeTab--; save(); renderAll(); } }
    if(e.key==='ArrowRight'){ if(state.activeTab<6){ state.activeTab++; save(); renderAll(); } }
  });

  // Swipe
  let touchStartX=null;
  document.addEventListener('touchstart',e=>{ if(e.touches.length===1){ touchStartX=e.touches[0].clientX; } },{passive:true});
  document.addEventListener('touchend',e=>{
    if(touchStartX==null) return;
    const dx=e.changedTouches[0].clientX - touchStartX;
    if(Math.abs(dx)>60){ if(dx<0 && state.activeTab<6) state.activeTab++; if(dx>0 && state.activeTab>0) state.activeTab--; save(); renderAll(); }
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
    const err=validateSplitAndRepeat(v);
    if(err){ formError.textContent=err; formError.style.display='block'; return; }
    formError.style.display='none';

    if(state.editingId){
      if(v.split && v.dueDate){
        deleteTask(state.editingId);
        const set=planSplitTasks({ title:v.title, subject:v.subject, type:v.type, splitMinutes:v.splitMinutes, skipWeekend:v.skipWeekend, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes });
        set.forEach(t=>state.tasks.push(t));
        if(v.repeat && v.repeatPattern){
          set.forEach(slice=>{
            const reps=planRepetitions(slice.plannedDate, v.repeatPattern, v.repeatMinutes, slice.subject, slice.title.replace(/\s\(\d+\/\d+\)$/,''), v.dueDate, v.notes);
            reps.forEach(r=>state.tasks.push(r));
          });
        }
      }else{
        updateTask(state.editingId,{ title:v.title, subject:v.subject, type:v.type, estimate:v.estimate, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes });
        if(v.repeat && v.repeatPattern){
          const reps=planRepetitions(v.plannedDate, v.repeatPattern, v.repeatMinutes, v.subject, v.title, v.dueDate, v.notes);
          reps.forEach(r=>state.tasks.push(r));
        }
      }
    }else{
      if(v.split && v.dueDate){
        const set=planSplitTasks({ title:v.title, subject:v.subject, type:v.type, splitMinutes:v.splitMinutes, skipWeekend:v.skipWeekend, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes });
        set.forEach(t=>state.tasks.push(t));
        if(v.repeat && v.repeatPattern){
          set.forEach(slice=>{
            const reps=planRepetitions(slice.plannedDate, v.repeatPattern, v.repeatMinutes, slice.subject, slice.title.replace(/\s\(\d+\/\d+\)$/,''), v.dueDate, v.notes);
            reps.forEach(r=>state.tasks.push(r));
          });
        }
      }else{
        state.tasks.push({ id:uid(), title:v.title, subject:v.subject, type:v.type, estimate:v.estimate, plannedDate:v.plannedDate, dueDate:v.dueDate, notes:v.notes, done:false });
        if(v.repeat && v.repeatPattern){
          const reps=planRepetitions(v.plannedDate, v.repeatPattern, v.repeatMinutes, v.subject, v.title, v.dueDate, v.notes);
          reps.forEach(r=>state.tasks.push(r));
        }
      }
    }

    save(); closeForm(); renderAll();
  });

  // Focus trap binnen modals
  ['taskModal','quickModal'].forEach(id=>{
    const m=document.getElementById(id);
    m.addEventListener('keydown',(e)=>{
      if(e.key!=='Tab' || !m.classList.contains('open')) return;
      const focusables = m.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if(!focusables.length) return;
      const first=focusables[0], last=focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement===first){ last.focus(); e.preventDefault(); }
      else if(!e.shiftKey && document.activeElement===last){ first.focus(); e.preventDefault(); }
    });
  });
}

// MODALS OPEN/CLOSE
function openForm(mode, task=null){
  taskModal.classList.add('open');
  document.body.style.overflow='hidden';
  const app = document.getElementById('app'); if(app) app.style.filter='blur(1px)';
  formError.style.display='none';

  if(mode==='edit' && task){
    state.editingId=task.id; taskModalTitle.textContent='Taak bewerken'; submitFormBtn.textContent='Opslaan';
    f_title.value=task.title; f_subject.value=task.subject; f_type.value=task.type;
    f_estimate.value=task.estimate; f_plannedDate.value=task.plannedDate; f_dueDate.value=task.dueDate||''; f_notes.value=task.notes||'';
    f_split.checked=false; f_repeat.checked=false;
  }else{
    state.editingId=null; taskModalTitle.textContent='Nieuwe taak'; submitFormBtn.textContent='Toevoegen';
    f_title.value=''; f_subject.value=SUBJECTS[0]; f_type.value='Huiswerk';
    f_estimate.value=25; f_plannedDate.value=fmtISO(activeDate()); f_dueDate.value=''; f_notes.value='';
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

// INIT
function init(){
  tablistEl = qs('#tablist'); taskListEl = qs('#taskList'); dayTitleEl = qs('#dayTitle'); dayTotalEl = qs('#dayTotal'); statsListEl = qs('#statsList'); weekGridEl = qs('#weekGrid');
  prevWeekBtn = qs('#prevWeekBtn'); thisWeekBtn = qs('#thisWeekBtn'); nextWeekBtn = qs('#nextWeekBtn'); newTaskBtn = qs('#newTaskBtn'); toggleViewBtn = qs('#toggleViewBtn'); quickAddBtn = qs('#quickAddBtn');
  subjectFilter = qs('#subjectFilter'); searchInput = qs('#searchInput'); showDoneToggle = qs('#showDoneToggle'); clearDoneBtn = qs('#clearDoneBtn');
  chevLeft = qs('#chevLeft'); chevRight = qs('#chevRight'); dayView = qs('#dayView'); weekView = qs('#weekView');
  taskModal = qs('#taskModal'); taskForm = qs('#taskForm'); formError = qs('#formError'); cancelFormBtn = qs('#cancelFormBtn'); taskModalTitle = qs('#taskModalTitle'); submitFormBtn = qs('#submitFormBtn');
  f_title = qs('#f_title'); f_subject = qs('#f_subject'); f_type = qs('#f_type'); f_estimate = qs('#f_estimate'); f_plannedDate = qs('#f_plannedDate'); f_dueDate = qs('#f_dueDate'); f_notes = qs('#f_notes'); f_split = qs('#f_split'); f_splitMinutes = qs('#f_splitMinutes'); f_skipWeekend = qs('#f_skipWeekend'); f_repeat = qs('#f_repeat'); f_repeatMinutes = qs('#f_repeatMinutes'); f_repeatPattern = qs('#f_repeatPattern');
  quickModal = qs('#quickModal'); q_title = qs('#q_title'); q_subject = qs('#q_subject'); q_minutes = qs('#q_minutes'); q_date = qs('#q_date'); q_type = qs('#q_type'); quickForm = qs('#quickForm'); quickCancel = qs('#quickCancel');

  load(); renderFiltersInit(); renderAll(); wireEvents();
  window.__APP_READY = true;
}

if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init, {once:true}); }
else{ init(); }
