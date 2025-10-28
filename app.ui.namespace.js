/* app.ui.namespace.js — creates AppUI namespace and element registry */
(function(){
  'use strict';
  window.AppUI = window.AppUI || {};
  const UI = window.AppUI;
  UI.el = {
    tablistEl:null, taskListEl:null, dayTitleEl:null, dayTotalEl:null, statsListEl:null, weekGridEl:null,
    prevWeekBtn:null, thisWeekBtn:null, nextWeekBtn:null, newTaskBtn:null, toggleViewBtn:null, quickAddBtn:null,
    subjectFilter:null, searchInput:null, showDoneToggle:null, clearDoneBtn:null,
    chevLeft:null, chevRight:null, dayView:null, weekView:null,
    taskModal:null, taskForm:null, formError:null, cancelFormBtn:null, taskModalTitle:null, submitFormBtn:null,
    f_title:null, f_subject:null, f_type:null, f_estimate:null, f_plannedDate:null, f_dueDate:null, f_notes:null, f_split:null, f_splitMinutes:null, f_skipWeekend:null, f_repeat:null, f_repeatMinutes:null, f_repeatPattern:null,
    quickModal:null, q_title:null, q_subject:null, q_minutes:null, q_date:null, q_type:null, quickForm:null, quickCancel:null,
    studentView:null, studentDayTitle:null, studentTaskList:null, studentEmpty:null, studentAddBtn:null
  };
})(); 
