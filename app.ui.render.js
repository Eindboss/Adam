/* app.ui.render.js — rendering & UI pieces */
(function(){
  'use strict';
  const C = window.AppCore;
  const UI = window.AppUI;
  if(!C || !UI){ console.error('AppCore of AppUI ontbreekt'); return; }
  const H = UI.helpers;
  UI.render = UI.render || {};

  function renderTabs(){
    const el = UI.el.tablistEl;
    el.innerHTML='';
    C.thisWeekDates().forEach((d,i)=>{
      const b=H.ce('button','tab');
      b.setAttribute('role','tab');
      b.setAttribute('aria-selected', i===C.state.activeTab? 'true':'false');
      b.textContent=C.DAYS[i];
      b.onclick=()=>{ C.state.activeTab=i; C.save(); renderAll(); };
      el.appendChild(b);
    });
  }

  function taskCard(t){
    const card=H.ce('div','card'+(t.done?' done':'')); card.dataset.id=t.id;
    const row=H.ce('div','task-row');

    const left=H.ce('div','task-left');
    const check=H.ce('input'); check.type='checkbox'; check.checked=!!t.done;
    check.setAttribute('aria-label','Markeer als gedaan');
    check.onchange=()=>{ C.updateTask(t.id,{done:check.checked}); C.save(); renderAll(); };

    const pill=H.ce('span','pill'); pill.textContent=t.subject;
    const color=C.SUBJECT_COLORS[t.subject]||'#06B6D4'; pill.style.borderColor=color; pill.style.boxShadow=`inset 0 0 0 1px ${color}22`;
    left.append(check,pill);

    const mid=H.ce('div');
    const ti=H.ce('div','title'); ti.textContent=t.title;
    const meta=H.ce('div','meta');
    meta.textContent = `${t.type} · ${t.estimate} min` + (t.dueDate? ` · deadline ${C.fmtShort(C.parseISO(t.dueDate))}` : '');
    mid.append(ti,meta);
    if(t.notes){ const n=H.ce('div','form-help'); n.style.marginTop='6px'; n.textContent=t.notes; mid.append(n); }

    const act=H.ce('div','actions');
    const btnTomorrow = H.ce('button','icon-btn'); btnTomorrow.title='Naar morgen'; btnTomorrow.setAttribute('aria-label','Naar morgen'); btnTomorrow.textContent='🗓'; btnTomorrow.onclick=()=>{ C.moveTaskToTomorrow(t.id); C.save(); renderAll(); };
    const btnCopy = H.ce('button','icon-btn'); btnCopy.title='Kopieer'; btnCopy.setAttribute('aria-label','Kopieer'); btnCopy.textContent='📄'; btnCopy.onclick=()=>{ C.copyTask(t.id); C.save(); renderAll(); };
    const btnEdit = H.ce('button','icon-btn'); btnEdit.title='Bewerk'; btnEdit.setAttribute('aria-label','Bewerk'); btnEdit.textContent='✏️'; btnEdit.onclick=()=> window.AppUI.forms.openForm('edit',t);
    const btnDel = H.ce('button','icon-btn'); btnDel.title='Verwijder'; btnDel.setAttribute('aria-label','Verwijder'); btnDel.textContent='🗑'; btnDel.onclick=()=>{ if(confirm('Taak verwijderen?')){ C.deleteTask(t.id); C.save(); renderAll(); } };
    act.append(btnTomorrow,btnCopy,btnEdit,btnDel);

    row.append(left,mid,act); card.appendChild(row); return card;
  }

  function renderDay(){
    const date=C.activeDate(); const iso=C.fmtISO(date);
    UI.el.dayTitleEl.textContent = `${C.ucfirst(date.toLocaleDateString('nl-NL',{weekday:'long'}))} ${String(date.getDate()).padStart(2,'0')} ${date.toLocaleDateString('nl-NL',{month:'short'})}`;

    const todays=C.state.tasks.filter(t=>t.plannedDate===iso).filter(C.matchesFilters)
      .sort((a,b)=> a.done-b.done || a.subject.localeCompare(b.subject));

    const total=todays.reduce((s,t)=> s + (t.done?0:Number(t.estimate||0)),0);
    UI.el.dayTotalEl.textContent= total>0 ? `Totaal: ${C.minutesToText(total)}` : 'Totaal: 0 min';

    const list = UI.el.taskListEl;
    list.innerHTML='';
    if(!todays.length){
      const empty=H.ce('div','card'); empty.innerHTML=`<div class="form-help">Geen taken voor deze dag. Tip: gebruik “Nieuwe taak” of “Snel toevoegen”.</div>`;
      list.appendChild(empty); return;
    }
    todays.forEach(t=> list.appendChild(taskCard(t)));
  }

  function renderWeek(){
    const grid = UI.el.weekGridEl;
    grid.innerHTML='';
    C.thisWeekDates().forEach((d,i)=>{
      const iso=C.fmtISO(d);
      const col=H.ce('div','col'); col.dataset.dayIndex=String(i); col.dataset.date=iso;
      const h=H.ce('h4'); h.textContent=`${C.DAYS[i]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      col.appendChild(h);

      const tasks=C.state.tasks.filter(t=>t.plannedDate===iso).filter(C.matchesFilters)
        .sort((a,b)=> a.done-b.done || a.subject.localeCompare(b.subject));

      tasks.forEach(t=>{
        const item=H.ce('div','card'+(t.done?' done':'')); item.draggable=true; item.dataset.id=t.id;
        item.innerHTML=`
          <div class="task-row">
            <div class="task-left"><span class="pill" style="border-color:${C.SUBJECT_COLORS[t.subject]||'#06B6D4'}">${t.subject}</span></div>
            <div><div class="title">${t.title}</div><div class="meta">${t.type} · ${t.estimate} min</div></div>
            <div class="actions"><button class="icon-btn" title="Bewerk" aria-label="Bewerk">✏️</button></div>
          </div>`;
        item.querySelector('.icon-btn').onclick=()=>window.AppUI.forms.openForm('edit',t);

        item.addEventListener('dragstart',(e)=>{ item.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',t.id); }catch(_e){} });
        item.addEventListener('dragend',()=> item.classList.remove('dragging'));
        col.addEventListener('dragover',(e)=>{ e.preventDefault(); col.classList.add('drop-target'); });
        col.addEventListener('dragleave',()=> col.classList.remove('drop-target'));
        col.addEventListener('drop',(e)=>{ e.preventDefault(); col.classList.remove('drop-target'); let id=''; try{ id=e.dataTransfer.getData('text/plain'); }catch(_e){} if(!id) return; C.updateTask(id,{plannedDate:iso}); C.save(); renderAll(); });

        col.appendChild(item);
      });

      grid.appendChild(col);
    });
  }

  function renderStats(){
    const list = UI.el.statsListEl;
    list.innerHTML='';
    const per=C.buildWeeklyStats();
    C.SUBJECTS.forEach(s=>{
      const row=H.ce('div','stat-row');
      const label=H.ce('div'); label.style.minWidth='120px'; label.textContent=s;
      const bar=H.ce('div','bar'); const fill=H.ce('span');
      const total=per[s].total||0; const done=per[s].done||0; const pct= total? Math.round(done/total*100):0;
      fill.style.width=pct+'%'; fill.style.background=C.SUBJECT_COLORS[s]||'#06B6D4'; bar.appendChild(fill);
      const txt=H.ce('div'); txt.style.minWidth='70px'; txt.style.textAlign='right'; txt.textContent=`${done}/${total}`;
      row.append(label,bar,txt); list.appendChild(row);
    });
  }

  function renderFiltersInit(){
    UI.el.subjectFilter.innerHTML = `<option value="Alle">Alle vakken</option>` + C.SUBJECTS.map(s=>`<option>${s}</option>`).join('');
    UI.el.f_subject.innerHTML = C.SUBJECTS.map(s=>`<option>${s}</option>`).join('');
    UI.el.q_subject.innerHTML = C.SUBJECTS.map(s=>`<option>${s}</option>`).join('');
  }

  function renderAll(){
    renderTabs();
    if(C.state.view==='day'){ UI.el.dayView.style.display='block'; UI.el.weekView.style.display='none'; renderDay(); }
    else{ UI.el.dayView.style.display='none'; UI.el.weekView.style.display='block'; renderWeek(); }
    renderStats();
    UI.el.subjectFilter.value = C.state.filters.subject;
    UI.el.showDoneToggle.checked = C.state.filters.showDone;
    UI.el.searchInput.value = C.state.filters.search;
    UI.el.toggleViewBtn.textContent = C.state.view==='day' ? 'Weekoverzicht':'Dagweergave';
    UI.el.toggleViewBtn.setAttribute('aria-pressed', C.state.view==='week');
  }

  UI.render.renderTabs = renderTabs;
  UI.render.taskCard = taskCard;
  UI.render.renderDay = renderDay;
  UI.render.renderWeek = renderWeek;
  UI.render.renderStats = renderStats;
  UI.render.renderFiltersInit = renderFiltersInit;
  UI.render.renderAll = renderAll;
})();
