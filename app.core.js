// app.core.js — state, storage, utils, logic
(function(global){
  'use strict';

  const STORAGE_KEY = 'adam-leeragenda-v1';
  const SUBJECTS = ['Aardrijkskunde','Geschiedenis','Nederlands','Latijn','Wiskunde','Frans','Engels','Biologie'];
  const SUBJECT_COLORS = {
    'Aardrijkskunde':'#06B6D4','Geschiedenis':'#D97706','Nederlands':'#A7F3D0',
    'Latijn':'#06B6D4','Wiskunde':'#D97706','Frans':'#A7F3D0','Engels':'#06B6D4','Biologie':'#D97706'
  };
  const DAYS = ['Ma','Di','Wo','Do','Vr','Za','Zo'];

  const uid = (()=>{
    if (typeof crypto!=='undefined' && crypto.randomUUID) return ()=>crypto.randomUUID();
    return ()=> 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  })();

  function startOfWeek(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
  function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function fmtISO(d){ return d.toISOString().slice(0,10); }
  function parseISO(s){ const [y,m,dd]=(s||'').split('-').map(Number); const d=new Date(y||NaN,(m||1)-1,dd||1); d.setHours(0,0,0,0); return d; }
  function fmtShort(d){ return d.toLocaleDateString('nl-NL',{day:'2-digit',month:'2-digit'}); }
  function isWeekend(d){ const day=(d.getDay()+6)%7; return day>=5; }
  function minutesToText(min){ const h=Math.floor(min/60), m=min%60; if(h===0) return `${m} min`; if(m===0) return `${h} u`; return `${h} u ${m} min`; }
  function ucfirst(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  const state = {
    tasks: [],
    weekStart: startOfWeek(new Date()),
    activeTab: 0,
    view: 'day',
    filters: { subject:'Alle', showDone:false, search:'' },
    editingId: null
  };

  function load(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const obj=JSON.parse(raw);
      state.tasks = Array.isArray(obj.tasks) ? obj.tasks : [];
      state.weekStart = obj.weekStart ? parseISO(obj.weekStart) : startOfWeek(new Date());
      state.activeTab = Number.isInteger(obj.activeTab) ? obj.activeTab : 0;
      state.view = (obj.view==='week'||obj.view==='day') ? obj.view : 'day';
      state.filters = obj.filters || state.filters;
    }catch(e){
      try{ localStorage.removeItem(STORAGE_KEY);}catch{}
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

  function addTask(t){ t.id=uid(); state.tasks.push(t); }
  function updateTask(id,patch){ const i=state.tasks.findIndex(x=>x.id===id); if(i>-1) state.tasks[i]={...state.tasks[i],...patch}; }
  function deleteTask(id){ state.tasks=state.tasks.filter(x=>x.id!==id); }
  function copyTask(id){ const t=state.tasks.find(x=>x.id===id); if(!t) return; state.tasks.push({...t,id:uid(),title:t.title+' (kopie)'}); }
  function moveTaskToTomorrow(id){ const t=state.tasks.find(x=>x.id===id); if(!t) return; updateTask(id,{plannedDate: fmtISO(addDays(parseISO(t.plannedDate),1))}); }

  function validateSplitAndRepeat(v){
    if(v.split){
      if(!v.dueDate) return 'Bij verdelen is een deadline verplicht.';
      if(parseISO(v.dueDate) < parseISO(v.plannedDate)) return 'Deadline moet op of na de plandag liggen.';
    }
    if(v.repeat && v.repeatPattern){
      const ok=v.repeatPattern.split(',').map(s=>s.trim()).every(x=>/^[1-9]\\d*$/.test(x));
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

  // expose
  global.AppCore = {
    STORAGE_KEY, SUBJECTS, SUBJECT_COLORS, DAYS,
    state, load, save, thisWeekDates, activeDate, matchesFilters, buildWeeklyStats,
    addTask, updateTask, deleteTask, copyTask, moveTaskToTomorrow,
    validateSplitAndRepeat, planSplitTasks, planRepetitions,
    startOfWeek, addDays, fmtISO, parseISO, fmtShort, isWeekend, minutesToText, ucfirst
  };
})(window);
