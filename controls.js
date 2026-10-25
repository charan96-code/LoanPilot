(function(){
const DATE_FORMAT=new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'});
const MONTH_FORMAT=new Intl.DateTimeFormat('en-IN',{month:'long'});
const WEEKDAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
let openPopup=null;

function emit(element,type){
 element.dispatchEvent(new Event(type,{bubbles:true}));
}

function selectedLabel(select){
 const option=select.selectedOptions[0];
 return option?option.textContent.trim():'Select an option';
}

function closePopup(){
 if(!openPopup)return;
 openPopup.classList.remove('is-open');
 const popup=openPopup.querySelector('.app-select-menu,.app-date-popup');
 popup?.classList.remove('is-open');
 const trigger=openPopup.querySelector('.app-select-trigger,.app-date-trigger');
 trigger?.setAttribute('aria-expanded','false');
 openPopup=null;
}

function togglePopup(wrapper,popup,trigger){
 if(openPopup&&openPopup!==wrapper)closePopup();
 const opening=!wrapper.classList.contains('is-open');
 wrapper.classList.toggle('is-open',opening);
 popup.classList.toggle('is-open',opening);
 trigger.setAttribute('aria-expanded',String(opening));
 openPopup=opening?wrapper:null;
 if(opening&&popup.classList.contains('app-date-popup')){
  const rect=trigger.getBoundingClientRect(),popupRect=popup.getBoundingClientRect(),gap=6;
  const left=Math.max(12,Math.min(rect.left,window.innerWidth-popupRect.width-12));
  const below=rect.bottom+gap,top=below+popupRect.height<=window.innerHeight-12?below:Math.max(12,rect.top-popupRect.height-gap);
  popup.style.left=`${left}px`;
  popup.style.top=`${top}px`;
 }
}

function enhanceSelect(select){
 if(select.dataset.appSelect==='true'){select.__appSync?.();return}
 if(select.multiple||select.size>1)return;
 select.dataset.appSelect='true';
 const required=select.required;
 const wrapper=document.createElement('div');
 wrapper.className='app-select';
 const trigger=document.createElement('button');
 trigger.type='button';
 trigger.className='app-select-trigger';
 trigger.setAttribute('aria-haspopup','listbox');
 trigger.setAttribute('aria-expanded','false');
 if(required)trigger.setAttribute('aria-required','true');
 trigger.setAttribute('aria-label',select.getAttribute('aria-label')||select.closest('label')?.childNodes[0]?.textContent?.trim()||'Choose an option');
 const text=document.createElement('span');
 text.className='app-select-value';
 const arrow=document.createElement('span');
 arrow.className='app-select-arrow';
 arrow.setAttribute('aria-hidden','true');
 trigger.append(text,arrow);
 const menu=document.createElement('div');
 menu.className='app-select-menu';
 menu.setAttribute('role','listbox');
 const error=document.createElement('span');
 error.className='app-select-error';
 error.setAttribute('role','alert');
 let options=[],optionSignature='';
 const buildOptions=()=>{
  options=[...select.options].map(option=>{
   const item=document.createElement('button');
   item.type='button';
   item.className='app-select-option';
   item.setAttribute('role','option');
   item.dataset.value=option.value;
   item.textContent=option.textContent.trim();
   item.disabled=option.disabled;
   item.addEventListener('click',()=>{
    if(option.disabled)return;
    select.value=option.value;
    trigger.removeAttribute('aria-invalid');
    error.textContent='';
    sync();
    closePopup();
    trigger.focus();
    emit(select,'input');
    emit(select,'change');
   });
   return item;
  });
  menu.replaceChildren(...options);
  optionSignature=[...select.options].map(option=>`${option.value}\u0000${option.textContent}\u0000${option.disabled}`).join('\u0001');
 };
 const sync=()=>{
  const signature=[...select.options].map(option=>`${option.value}\u0000${option.textContent}\u0000${option.disabled}`).join('\u0001');
  if(signature!==optionSignature)buildOptions();
  text.textContent=selectedLabel(select);
  menu.querySelectorAll('[role="option"]').forEach(option=>{
   const active=option.dataset.value===select.value;
   option.setAttribute('aria-selected',String(active));
   option.classList.toggle('is-selected',active);
  });
 };
 select.insertAdjacentElement('afterend',wrapper);
 wrapper.append(trigger,menu,error);
 select.classList.add('app-control-source');
 select.tabIndex=-1;
 select.setAttribute('aria-hidden','true');
 if(required){
  select.required=false;
  select.form?.addEventListener('submit',event=>{
   if(select.value)return;
   event.preventDefault();
   trigger.setAttribute('aria-invalid','true');
   error.textContent='Choose an option to continue.';
   trigger.focus();
  },true);
 }
 select.__appSync=sync;
 sync();
 trigger.addEventListener('click',()=>togglePopup(wrapper,menu,trigger));
 trigger.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closePopup();return}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();
   if(!wrapper.classList.contains('is-open'))togglePopup(wrapper,menu,trigger);
   const current=options.findIndex(item=>item.dataset.value===select.value);
   const direction=event.key==='ArrowDown'?1:-1;
   const next=options.slice(current+direction).find(item=>!item.disabled)
    ||options.slice(0,current).reverse().find(item=>!item.disabled);
   next?.focus();
  }
 });
 menu.addEventListener('keydown',event=>{
  const enabled=options.filter(item=>!item.disabled),index=enabled.indexOf(document.activeElement);
  if(event.key==='Escape'){event.preventDefault();closePopup();trigger.focus()}
  else if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();
   enabled[(index+(event.key==='ArrowDown'?1:-1)+enabled.length)%enabled.length]?.focus();
  }else if(event.key==='Home'){event.preventDefault();enabled[0]?.focus()}
  else if(event.key==='End'){event.preventDefault();enabled.at(-1)?.focus()}
  else if(event.key==='Enter'||event.key===' '){event.preventDefault();document.activeElement?.click()}
 });
 select.addEventListener('change',sync);
 select.form?.addEventListener('reset',()=>queueMicrotask(sync));
}

function parseDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
 const [year,month,day]=value.split('-').map(Number);
 const date=new Date(year,month-1,day);
 return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;
}

function dateValue(date){
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function enhanceDate(input){
 if(input.dataset.appDate==='true'){input.__appSync?.();return}
 input.dataset.appDate='true';
 const wrapper=document.createElement('div');
 wrapper.className='app-date-field';
 const label=input.getAttribute('aria-label')||input.closest('label')?.childNodes[0]?.textContent?.trim()||'Choose a date';
 const trigger=document.createElement('button');
 trigger.type='button';
 trigger.className='app-date-trigger';
 trigger.setAttribute('aria-haspopup','dialog');
 trigger.setAttribute('aria-expanded','false');
 trigger.setAttribute('aria-label',label);
 const display=document.createElement('span');
 display.className='app-date-value';
 const icon=document.createElement('span');
 icon.className='app-date-icon';
 icon.setAttribute('aria-hidden','true');
 trigger.append(display,icon);
 const popup=document.createElement('div');
 popup.className='app-date-popup';
 popup.setAttribute('role','dialog');
 popup.setAttribute('aria-label',`${label} calendar`);
 popup.setAttribute('aria-modal','false');
 let visibleMonth=parseDate(input.value)||parseDate(input.min)||new Date();
 visibleMonth=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),1);
 const sync=()=>{
  const date=parseDate(input.value);
  display.textContent=date?DATE_FORMAT.format(date):'Select a date';
  trigger.classList.toggle('has-value',!!date);
  trigger.setAttribute('aria-label',date?`${label}: ${DATE_FORMAT.format(date)}`:label);
 };
 input.__appSync=sync;
 const setDate=date=>{
  const value=date?dateValue(date):'';
  if(value&&((input.min&&value<input.min)||(input.max&&value>input.max)))return;
  input.value=value;
  sync();
  emit(input,'input');
  emit(input,'change');
  closePopup();
  trigger.focus();
 };
 const draw=()=>{
  const year=visibleMonth.getFullYear(),month=visibleMonth.getMonth();
  const first=new Date(year,month,1),startOffset=(first.getDay()+6)%7;
  const gridStart=new Date(year,month,1-startOffset);
  const today=dateValue(new Date());
  const cells=Array.from({length:42},(_,index)=>{
   const date=new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+index);
   const value=dateValue(date),outside=date.getMonth()!==month,disabled=(input.min&&value<input.min)||(input.max&&value>input.max);
   const day=document.createElement('button');
   day.type='button';
   day.className=`app-calendar-day${outside?' is-outside':''}${value===input.value?' is-selected':''}${value===today?' is-today':''}`;
   day.textContent=String(date.getDate());
   day.disabled=!!disabled;
   day.setAttribute('aria-label',DATE_FORMAT.format(date));
   day.setAttribute('aria-pressed',String(value===input.value));
   day.addEventListener('click',()=>setDate(date));
   return day;
  });
  popup.replaceChildren();
  const header=document.createElement('div');
  header.className='app-calendar-header';
  const heading=document.createElement('div');
  heading.className='app-calendar-date-selectors';
  const makeSelector=(label,options,selected,onSelect,className)=>{
   const wrapper=document.createElement('div');
   wrapper.className=`app-select app-calendar-selector ${className}`;
   const trigger=document.createElement('button');
   trigger.type='button';
   trigger.className='app-select-trigger';
   trigger.setAttribute('aria-haspopup','listbox');
   trigger.setAttribute('aria-expanded','false');
   trigger.setAttribute('aria-label',label);
   const text=document.createElement('span');
   text.className='app-select-value';
   const arrow=document.createElement('span');
   arrow.className='app-select-arrow';
   arrow.setAttribute('aria-hidden','true');
   trigger.append(text,arrow);
   const menu=document.createElement('div');
   menu.className='app-select-menu';
   menu.setAttribute('role','listbox');
   options.forEach(option=>{
    const item=document.createElement('button');
    item.type='button';
    item.className='app-select-option';
    item.setAttribute('role','option');
    item.setAttribute('aria-selected',String(option.value===selected));
    item.classList.toggle('is-selected',option.value===selected);
    item.textContent=option.label;
    item.addEventListener('click',event=>{
     event.stopPropagation();
     onSelect(option.value);
    });
    menu.append(item);
   });
   trigger.addEventListener('click',event=>{
    event.stopPropagation();
    const opening=!menu.classList.contains('is-open');
    heading.querySelectorAll('.app-select-menu.is-open').forEach(openMenu=>openMenu.classList.remove('is-open'));
    heading.querySelectorAll('.app-select-trigger[aria-expanded="true"]').forEach(openTrigger=>openTrigger.setAttribute('aria-expanded','false'));
    menu.classList.toggle('is-open',opening);
    trigger.setAttribute('aria-expanded',String(opening));
   });
   wrapper.append(trigger,menu);
   text.textContent=options.find(option=>option.value===selected)?.label||'';
   return wrapper;
  };
  const currentYear=new Date().getFullYear();
  const minYear=Math.min(parseDate(input.min)?.getFullYear()??currentYear-100,year);
  const maxYear=Math.max(parseDate(input.max)?.getFullYear()??currentYear+100,year);
  const months=Array.from({length:12},(_,index)=>({value:index,label:MONTH_FORMAT.format(new Date(2020,index,1))}));
  const years=Array.from({length:maxYear-minYear+1},(_,index)=>{const value=minYear+index;return {value,label:String(value)}});
  let selectedMonth=month,selectedYear=year;
  const changeMonth=(nextMonth,nextYear)=>{
   selectedMonth=nextMonth;
   selectedYear=nextYear;
   visibleMonth=new Date(selectedYear,selectedMonth,1);
   draw();
  };
  heading.append(
   makeSelector('Calendar month',months,month,value=>changeMonth(value,selectedYear),'app-calendar-month'),
   makeSelector('Calendar year',years,year,value=>changeMonth(selectedMonth,value),'app-calendar-year')
  );
  const controls=document.createElement('div');
  controls.className='app-calendar-month-controls';
  const prev=document.createElement('button'),next=document.createElement('button');
  prev.type=next.type='button';
  prev.className=next.className='app-calendar-nav';
  prev.setAttribute('aria-label','Previous month');
  next.setAttribute('aria-label','Next month');
  prev.textContent='‹';next.textContent='›';
  prev.addEventListener('click',event=>{event.stopPropagation();visibleMonth=new Date(year,month-1,1);draw()});
  next.addEventListener('click',event=>{event.stopPropagation();visibleMonth=new Date(year,month+1,1);draw()});
  controls.append(prev,next);header.append(heading,controls);
  const weekdays=document.createElement('div');
  weekdays.className='app-calendar-weekdays';
  WEEKDAYS.forEach(day=>{const item=document.createElement('span');item.textContent=day;weekdays.append(item)});
  const days=document.createElement('div');
  days.className='app-calendar-days';
  cells.forEach(day=>days.append(day));
  const footer=document.createElement('div');
  footer.className='app-calendar-footer';
  const todayButton=document.createElement('button');
  todayButton.type='button';todayButton.className='app-calendar-today';todayButton.textContent='Today';
  todayButton.addEventListener('click',()=>setDate(new Date()));
  footer.append(todayButton);
  if(!input.required){
   const clear=document.createElement('button');
   clear.type='button';clear.className='app-calendar-clear';clear.textContent='Clear';
   clear.addEventListener('click',()=>setDate(null));
   footer.prepend(clear);
  }
  popup.append(header,weekdays,days,footer);
 };
 input.insertAdjacentElement('afterend',wrapper);
 wrapper.append(trigger,popup);
 input.classList.add('app-control-source');
 input.tabIndex=-1;
 input.setAttribute('aria-hidden','true');
 sync();
 trigger.addEventListener('click',()=>{
  const open=!wrapper.classList.contains('is-open');
  if(open){
   visibleMonth=parseDate(input.value)||parseDate(input.min)||new Date();
   visibleMonth=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),1);
   draw();
  }
  togglePopup(wrapper,popup,trigger);
 });
 trigger.addEventListener('keydown',event=>{
  if(event.key==='Escape')closePopup();
  if(event.key==='ArrowDown'||event.key==='Enter'||event.key===' '){
   event.preventDefault();
   if(!wrapper.classList.contains('is-open'))trigger.click();
   popup.querySelector('.app-calendar-day:not(:disabled)')?.focus();
  }
 });
 popup.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closePopup();trigger.focus()}
 });
 input.addEventListener('change',sync);
 input.form?.addEventListener('reset',()=>queueMicrotask(sync));
}

function enhance(root=document){
 root.querySelectorAll('select').forEach(enhanceSelect);
 root.querySelectorAll('input[type="date"]').forEach(enhanceDate);
}

window.refreshAppControls=()=>enhance();
document.addEventListener('click',event=>{
 if(openPopup&&!event.composedPath().includes(openPopup))closePopup();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape')closePopup();
});
window.addEventListener('resize',closePopup);
document.addEventListener('DOMContentLoaded',()=>{
 enhance();
 const observer=new MutationObserver(records=>{
  records.forEach(record=>{
   if(record.target instanceof HTMLSelectElement)record.target.__appSync?.();
   record.addedNodes.forEach(node=>{
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    if(node.matches('select,input[type="date"]'))enhance(node.parentElement||document);
    else enhance(node);
   });
  });
 });
 observer.observe(document.body,{childList:true,subtree:true});
});
})();
