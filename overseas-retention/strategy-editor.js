/* Static prototype: stored-price trial snapshots, no price requests or actual locking. */
(() => {
  'use strict';
  const form = document.getElementById('create');
  if (!form || !window.RetentionPriceTrial) return;
  const originalShowView = window.showView;
  const originalOpenDrawer = window.openDrawer;
  const money = value => '¥' + Number(value).toLocaleString('zh-CN', {maximumFractionDigits:2});
  const ranges = [
    {id:'ip15-all',name:'iPhone 15 Pro · 港版全色',model:'苹果 iPhone 15 Pro',memory:'256G',channels:['CH','LL'],colors:[],region:'香港'},
    {id:'ip15-black',name:'iPhone 15 Pro · 黑色优先',model:'苹果 iPhone 15 Pro',memory:'256G',channels:['CH','LL'],colors:['黑色'],region:'香港'},
    {id:'ip15-ch',name:'iPhone 15 Pro · 大陆渠道',model:'苹果 iPhone 15 Pro',memory:'256G',channels:['CH'],colors:[],region:'香港'},
    {id:'s24',name:'Galaxy S24 · 日本补货',model:'三星 Galaxy S24',memory:'256G',channels:['LL'],colors:[],region:'日本'},
    {id:'ip14',name:'iPhone 14 · 海外现货',model:'苹果 iPhone 14',memory:'128G',channels:['CH','LL'],colors:[],region:'香港'},
    {id:'pixel9',name:'Pixel 9 · 美版试采',model:'谷歌 Pixel 9',memory:'128G',channels:['LL'],colors:[],region:'美国'},
    {id:'ip13pro',name:'iPhone 13 Pro · 256G 全色',model:'苹果 iPhone 13 Pro',memory:'256G',channels:['CH','LL'],colors:[],region:'香港'}
  ];
  const templates = [
    {id:'ip15-s',model:'苹果 iPhone 15 Pro',grade:'S',tiers:['S / 准新机','S / 99新','A / 95新'],name:'iPhone 15 Pro · S级 · V3（已启用）',sale:{CH:4680,LL:4580},base:4320},
    {id:'ip15-a',model:'苹果 iPhone 15 Pro',grade:'A',name:'iPhone 15 Pro · A级 · V2（已启用）',sale:{CH:4480,LL:4380},base:4120},
    {id:'s24-a',model:'三星 Galaxy S24',grade:'A',name:'Galaxy S24 · A级 · V4（已启用）',sale:{LL:3400},base:3150},
    {id:'ip14-b',model:'苹果 iPhone 14',grade:'B',name:'iPhone 14 · B级 · V2（已启用）',sale:{CH:2780,LL:2700},base:2520},
    {id:'pixel9-a',model:'谷歌 Pixel 9',grade:'A',name:'Pixel 9 · A级 · V1（已启用）',sale:{LL:3500},base:3280},
    {id:'ip13pro-c',model:'苹果 iPhone 13 Pro',grade:'C',name:'iPhone 13 Pro · C级 · V1（已启用）',sale:{CH:2080,LL:2000},base:1920}
  ];
  // Independent, explicitly labelled demonstration snapshot for the strategy trial.
  // Prices are saved per item; neither selecting a scope nor dragging fetches prices.
  const snapshotTime = '2026-10-14 11:00:00', priceTime = '2026-10-14 08:00:00';
  // Illustrative CNY -> HKD quote only, not a live WorldFirst response.
  const trialFxRate = Object.freeze({provider:'WorldFirst',from:'CNY',to:'HKD',rate:1.09,demo:true});
  const snapshot = templates.flatMap((template,t) => Array.from({length:72},(_,i) => ({
    id:'TRIAL-DEMO-'+t+'-'+String(i+1).padStart(3,'0'), model:template.model,
    memory:ranges.find(r=>r.model===template.model).memory,grade:template.grade,
    channel:Object.keys(template.sale)[i%Object.keys(template.sale).length],
    color:i%3===0?'黑色':'蓝色', available:i%19!==0,
    price:i%13===0?null:Math.max(1,template.base-360+Math.floor(i/2)*25)
  })));
  const priceCatalog = new Map();
  templates.forEach(t => {
    const range = ranges.find(r=>r.model===t.model);
    Object.entries(t.sale).forEach(([channel,price]) => priceCatalog.set([t.model,range.memory,t.grade,channel,range.region,'CNY'].join('|'),price));
  });
  const rows = [...document.querySelectorAll('#strategy .strategy-list-table tbody > tr')];
  const defaults = [
    {range:'ip15-all',template:'ip15-s',base:4320,ceiling:4580,target:1000,locked:720},
    {range:'s24',template:'s24-a',base:3150,ceiling:3400,target:500,locked:205},
    {range:'ip14',template:'ip14-b',base:2520,ceiling:2700,target:500,locked:325},
    {range:'pixel9',template:'pixel9-a',base:3280,ceiling:3500,target:150,locked:0}
  ];
  const records = rows.map((row,i) => ({...defaults[i],id:'STRATEGY-DEMO-'+(i+1),
    name:row.cells[0].querySelector('.link').textContent.trim(),country:row.cells[1].textContent.trim(),
    status:row.querySelector('.pill').textContent.trim(),deadline:'2026-08-15T18:00',frequency:'3',note:'',
    tolerances:['10','10','8']}));
  // A completed fixture makes editing and reopening a fulfilled target reviewable.
  const completedRow=rows[0].cloneNode(true);
  completedRow.querySelector('.strategy-row-actions').innerHTML='<span class="link">查看</span><span class="link">编辑</span>';
  completedRow.cells[0].querySelector('.sub').textContent='演示策略 · 当前页面保存';
  completedRow.cells[6].textContent='—';
  records.push({...records[0],id:'STRATEGY-DEMO-5',name:'iPhone 13 Pro 香港补货',range:'ip13pro',template:'ip13pro-c',base:1920,ceiling:2000,target:200,locked:200,status:'已完成'});
  rows.push(completedRow);rows[0].parentElement.append(completedRow);
  updateRow(completedRow,records.at(-1));
  const filterPanel=document.querySelector('#strategy > .panel.filter');
  const searchFilter=filterPanel.querySelector('input');
  const [statusFilter,countryFilter,categoryFilter]=filterPanel.querySelectorAll('select');
  searchFilter.id='se-filter-search';searchFilter.setAttribute('aria-label','搜索策略名称或配置名称');
  [statusFilter,countryFilter,categoryFilter].forEach((select,i)=>{select.id=['se-filter-status','se-filter-country','se-filter-category'][i];select.setAttribute('aria-label',['策略状态','国家/地区','品类'][i]);});
  if(![...countryFilter.options].some(option=>option.value==='美国'))countryFilter.add(new Option('美国','美国'));
  const modelFilter=document.createElement('details');modelFilter.id='se-filter-model';modelFilter.className='se-model-filter';
  modelFilter.innerHTML='<summary aria-label="型号，多选"><span>选择型号</span></summary><div class="se-model-options" role="group" aria-label="型号选项"><div class="se-model-list"></div><button type="button" class="se-model-clear">清空选择</button></div>';
  [...new Set(ranges.map(range=>range.model))].forEach(model=>{
    const label=document.createElement('label'),checkbox=document.createElement('input'),text=document.createElement('span');
    checkbox.type='checkbox';checkbox.value=model;checkbox.name='strategyModel';text.textContent=model;label.append(checkbox,text);modelFilter.querySelector('.se-model-list').append(label);
  });
  categoryFilter.after(modelFilter);
  const resetFilter=filterPanel.querySelector(':scope > .text-btn'),queryFilter=filterPanel.querySelector(':scope > .secondary');
  resetFilter.id='se-filter-reset';queryFilter.id='se-filter-query';
  let activeFilters={query:'',models:[],status:'',country:'',category:''};
  function selectedModels(){return [...modelFilter.querySelectorAll('input:checked')].map(input=>input.value);}
  function refreshModelLabel(){
    const values=selectedModels(),summary=modelFilter.querySelector('summary');
    summary.querySelector('span').textContent=values.length===0?'选择型号':values.length===1?values[0]:'型号：已选 '+values.length+' 项';
    summary.title=values.length?values.join('、'):'型号，多选';
  }
  function applyFilters(){
    document.getElementById('se-filter-empty')?.remove();
    let count=0;
    records.forEach((record,index)=>{
      const range=ranges.find(item=>item.id===record.range);
      const visible=(!activeFilters.query||(record.name+' '+range.name).toLowerCase().includes(activeFilters.query))&&(!activeFilters.models.length||activeFilters.models.includes(range.model))&&(!activeFilters.status||record.status===activeFilters.status)&&(!activeFilters.country||record.country===activeFilters.country)&&(!activeFilters.category||activeFilters.category==='手机');
      rows[index].hidden=!visible;if(visible)count++;
    });
    document.querySelector('#strategy .strategy-list .panel-head small').textContent='共 '+count+' 条';
    if(!count){const empty=document.createElement('tr');empty.id='se-filter-empty';empty.innerHTML='<td colspan="9" class="empty">暂无符合条件的策略</td>';rows[0].parentElement.append(empty);}
  }
  function queryStrategies(){
    activeFilters={query:searchFilter.value.trim().toLowerCase(),models:selectedModels(),status:statusFilter.selectedIndex?statusFilter.value:'',country:countryFilter.selectedIndex?countryFilter.value:'',category:categoryFilter.selectedIndex?categoryFilter.value:''};
    modelFilter.open=false;applyFilters();
  }
  modelFilter.addEventListener('change',refreshModelLabel);
  modelFilter.querySelector('.se-model-clear').onclick=()=>{modelFilter.querySelectorAll('input:checked').forEach(input=>input.checked=false);refreshModelLabel();};
  modelFilter.addEventListener('keydown',event=>{if(event.key==='Escape'){modelFilter.open=false;modelFilter.querySelector('summary').focus();event.preventDefault();}});
  modelFilter.addEventListener('focusout',event=>{if(event.relatedTarget&&!modelFilter.contains(event.relatedTarget))modelFilter.open=false;});
  document.addEventListener('click',event=>{if(!modelFilter.contains(event.target))modelFilter.open=false;});
  queryFilter.onclick=queryStrategies;
  searchFilter.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();queryStrategies();}});
  resetFilter.onclick=()=>{searchFilter.value='';[statusFilter,countryFilter,categoryFilter].forEach(select=>select.selectedIndex=0);modelFilter.querySelectorAll('input:checked').forEach(input=>input.checked=false);refreshModelLabel();queryStrategies();};
  applyFilters();
  const fields = {};
  const names = {'策略名称':'name','国家/地区':'country','货品范围配置':'range','质量模板版本':'template','目标留货数量':'target','最晚完成时间':'deadline','基准价 P':'base','最高价 U':'ceiling','执行频次':'frequency','策略备注':'note'};
  form.querySelectorAll('.field').forEach(field => {
    const label = field.querySelector('label');
    const key = names[label?.textContent.replace('*','').trim()];
    if (!key) return;
    const input = field.querySelector('input,select');
    input.id = 'se-'+key; label.htmlFor=input.id; fields[key]=input;
  });
  ['base','ceiling'].forEach(key => {
    const input=fields[key]; input.type='number';input.min='0.01';input.step='0.01';input.required=true;
    const wrapper=document.createElement('div');wrapper.className='se-currency';
    const unit=document.createElement('span');unit.textContent='¥';input.before(wrapper);wrapper.append(unit,input);
  });
  fields.target.min='1';fields.target.step='1';fields.target.required=true;
  function setOptions(select,options){select.replaceChildren(...options.map(({value,label})=>new Option(label,value)));}
  setOptions(fields.range,ranges.map(r=>({value:r.id,label:r.name})));
  setOptions(fields.frequency,[{value:'3',label:'每日 3 次（05:00 / 11:00 / 18:00）'},{value:'1',label:'每日 1 次（08:00）'}]);
  const oldHeading=form.querySelector('.heading'), oldStepper=form.querySelector('.stepper');
  oldHeading.remove();oldStepper.remove();
  const sections=form.querySelectorAll('.panel.section'),targetSection=sections[1];
  const basics=sections[0];basics.classList.add('se-basics');
  basics.querySelector('h2').hidden=true;
  const qualityDetails=document.createElement('details');qualityDetails.className='se-disclosure se-quality-details';
  qualityDetails.innerHTML='<summary><span>质量分层与容差 <small>3 项</small></span><span class="se-disclosure-toggle"><span class="se-when-closed">展开</span><span class="se-when-open">收起</span> <span aria-hidden="true">⌄</span></span></summary>';
  const qualityContent=document.createElement('div');qualityContent.className='se-disclosure-content';
  qualityContent.append(basics.querySelector('p'),basics.querySelector('.quality'));
  qualityDetails.append(qualityContent);basics.append(qualityDetails);
  const targetGrid=targetSection.querySelector('.grid');targetGrid.classList.add('se-target-grid');
  ['target','deadline','frequency','base','ceiling','note'].forEach(key=>targetGrid.append(fields[key].closest('.field')));
  fields.deadline.closest('.field').querySelector('.req')?.remove();
  fields.note.placeholder='选填';
  const targetUnit=document.createElement('span');targetUnit.className='se-unit';targetUnit.textContent='台';
  const targetInput=document.createElement('div');targetInput.className='se-quantity';fields.target.before(targetInput);targetInput.append(fields.target,targetUnit);
  const calculationDetails=document.createElement('details');calculationDetails.className='se-calculation-details';
  calculationDetails.innerHTML='<summary>留货计算说明</summary>';
  calculationDetails.append(targetSection.querySelector('p'),targetSection.querySelector('.summary'));targetSection.append(calculationDetails);
  const trialSection=document.createElement('section');trialSection.id='strategy-trial';trialSection.className='panel section';targetSection.before(trialSection);
  const footer=form.querySelector('.bottom-actions');footer.querySelectorAll('button').forEach(button=>button.removeAttribute('onclick'));
  const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent='取消';cancel.id='se-cancel';footer.prepend(cancel);
  footer.querySelectorAll('button')[1].id='se-save-draft';footer.querySelectorAll('button')[2].id='se-save';
  const dialog=document.createElement('dialog');dialog.id='strategy-editor-modal';dialog.setAttribute('aria-labelledby','se-title');
  dialog.innerHTML='<header class="se-header"><div><h2 id="se-title">新建留货策略</h2><p>选择货品范围与质量模板，试算后设置留货目标。</p></div><button class="close" id="se-close" type="button" aria-label="关闭策略弹窗">×</button></header><div class="se-body"></div><p class="se-error" id="se-error" role="alert"></p><footer class="se-footer"></footer>';
  form.classList.remove('view','form-page','active');dialog.querySelector('.se-body').append(form);dialog.querySelector('.se-footer').append(footer);document.body.append(dialog);
  let editIndex=null, lastViewed=0, returnFocus=null, trial=null, opening=false;
  const error=dialog.querySelector('#se-error');
  const note=document.createElement('p');note.className='se-save-note';note.setAttribute('role','status');document.querySelector('#strategy > .heading').after(note);
  function selectedRange(){return ranges.find(r=>r.id===fields.range.value);}
  function selectedTemplate(){return templates.find(t=>t.id===fields.template.value);}
  function refreshTemplates(preferred){
    const range=selectedRange();
    setOptions(fields.template,templates.filter(t=>t.model===range?.model).map(t=>({value:t.id,label:t.name})));
    if ([...fields.template.options].some(o=>o.value===preferred))fields.template.value=preferred;
  }
  function refreshQuality(){
    const template=selectedTemplate();
    form.querySelectorAll('.quality tbody tr').forEach((row,i)=>{
      row.cells[0].textContent=template?.tiers?.[i]||((template?.grade||'—')+' / '+['准新机','99新','95新'][i]);
    });
  }
  function context(){
    const range=selectedRange(), template=selectedTemplate();
    if(!range||!template)return {label:'请先选择货品范围和质量模板',items:[],estimatedPrices:[],disabledReason:'请先选择货品范围和质量模板'};
    const items=snapshot.filter(item=>item.available&&item.model===range.model&&item.memory===range.memory&&item.grade===template.grade&&range.channels.includes(item.channel)&&(!range.colors.length||range.colors.includes(item.color)));
    return {label:[range.model,range.memory,'海外等级 '+template.grade,'海外购买渠道 '+range.channels.join(' / '),range.colors.length?'颜色 '+range.colors.join(' / '):'全色'].join(' · '),
      currency:'CNY',fxRate:trialFxRate,items:items.map(({id,price,color})=>({id,price,color})),
      estimatedPrices:range.channels.map(channel=>({channel,price:priceCatalog.get([range.model,range.memory,template.grade,channel,fields.country.value,'CNY'].join('|'))??null})),
      initialPrice:fields.base.value===''?undefined:Number(fields.base.value),snapshotTime,priceTime};
  }
  function refreshTrial(){
    const next=context();refreshQuality();error.textContent='';
    if(trial)trial.update(next);else trial=window.RetentionPriceTrial.mount(trialSection,next,applyPrice);
  }
  function refreshSummary(){
    const summary=targetSection.querySelector('.summary');
    summary.textContent=editIndex===null||records[editIndex]?.locked===0
      ?'首次启用时尚无已锁货，当前单台可接受价格按基准价 P = '+money(fields.base.value||0)+' 判断；后续按最新已锁账本动态计算。'
      :'保存后，后续新建批次使用最新策略配置，并按已锁账本计算可接受价格。试算不会执行实际留货。';
  }
  function applyPrice({base,ceiling}){
    fields.base.value=base;fields.ceiling.value=ceiling;refreshSummary();
    ['base','ceiling'].forEach(key=>{fields[key].classList.remove('se-updated');void fields[key].offsetWidth;fields[key].classList.add('se-updated');});
    error.textContent='';
  }
  function close(){dialog.close();}
  function open(index=null,focusTrial=false){
    returnFocus=document.activeElement;editIndex=Number.isInteger(index)&&records[index]?index:null;
    if(document.getElementById('drawer').classList.contains('show'))window.closeDrawer();
    originalShowView('strategy');
    const record=editIndex===null?{...defaults[0],name:'iPhone 15 Pro 香港留货',country:'香港',deadline:'',frequency:'3',note:'',status:'草稿',tolerances:['10','10','8']}:records[editIndex];
    opening=true;
    qualityDetails.open=false;calculationDetails.open=false;
    Object.entries(fields).forEach(([key,field])=>{if(!['template','range'].includes(key))field.value=record[key]??'';});
    fields.range.value=record.range;refreshTemplates(record.template);
    fields.name.dataset.manual='true';
    const immutable=editIndex!==null&&record.status!=='草稿';
    ['country','range','template'].forEach(key=>fields[key].disabled=immutable);
    form.querySelectorAll('.quality input').forEach((input,i)=>{input.value=record.tolerances[i];input.disabled=immutable;});
    dialog.querySelector('#se-title').textContent=editIndex===null?'新建留货策略':'编辑留货策略';
    dialog.querySelector('#se-save-draft').hidden=editIndex!==null&&record.status!=='草稿';
    dialog.querySelector('#se-save').textContent=editIndex===null||record.status==='草稿'?'保存并启用':'保存修改';
    refreshTrial();refreshSummary();opening=false;
    if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';
    dialog.querySelector('.se-body').scrollTop=0;
    requestAnimationFrame(()=>{trial.update(context());if(focusTrial)trialSection.scrollIntoView({block:'start'});});
  }
  function currentRecord(status){
    const target=Number(fields.target.value),base=Number(fields.base.value),ceiling=Number(fields.ceiling.value);
    if(!fields.name.value.trim())return '请输入策略名称';
    if(!Number.isInteger(target)||target<1)return '目标留货数量须为正整数';
    if(!(base>0)||!(ceiling>0)||!Number.isFinite(base)||!Number.isFinite(ceiling))return '请输入有效的基准价和最高价';
    if(fields.base.validity.stepMismatch||fields.ceiling.validity.stepMismatch)return '基准价和最高价最多保留两位小数';
    if(ceiling<base)return '最高价不得低于基准价';
    const old=records[editIndex];if(old&&target<old.locked)return '目标留货数量不得少于已锁数量';
    return {...old,changed:true,id:old?.id||'STRATEGY-DEMO-'+(records.length+1),name:fields.name.value.trim(),country:fields.country.value,
      range:fields.range.value,template:fields.template.value,target,base,ceiling,locked:old?.locked||0,
      status:old?.status==='已完成'&&old.locked<target?'执行中':old&&old.status!=='草稿'?old.status:status,deadline:fields.deadline.value,frequency:fields.frequency.value,note:fields.note.value,
      tolerances:[...form.querySelectorAll('.quality input')].map(input=>input.value)};
  }
  function updateRow(row,record){
    const range=ranges.find(r=>r.id===record.range),template=templates.find(t=>t.id===record.template);
    row.cells[0].querySelector('.link').textContent=record.name;row.cells[1].textContent=record.country;
    row.cells[2].textContent=range.model;
    row.cells[3].replaceChildren(document.createTextNode(range.model.replace(/^苹果 |^三星 |^谷歌 /,'' )+' '+range.memory));
    const sub=document.createElement('div');sub.className='sub';sub.textContent='质量模板：'+template.name;row.cells[3].append(sub);
    row.cells[4].textContent=record.locked+' / '+record.target;row.cells[5].textContent=money(record.base)+' / '+money(record.ceiling);
    if(record.status==='已完成')row.cells[6].textContent='—';
    else if(record.changed&&record.status==='执行中')row.cells[6].textContent='按配置执行';
    row.cells[7].querySelector('.pill').textContent=record.status;
    row.cells[7].querySelector('.pill').className='pill'+(record.status==='草稿'?' draft':record.status==='已暂停'?' pause':record.status==='已完成'?' done':'');
  }
  function bindRow(row,index){
    row.cells[0].querySelector('.link').onclick=()=>openDetails(index);
    const actions=row.querySelector('.strategy-row-actions');
    actions.querySelectorAll('.link').forEach(link=>{
      const label=link.textContent.trim();
      if(label==='编辑'){
        const button=document.createElement('button');button.type='button';button.className='text-btn se-edit';button.textContent='编辑';button.onclick=()=>open(index);link.replaceWith(button);
      }else if(label==='查看')link.onclick=()=>openDetails(index);
    });
    const trialButton=document.createElement('button');trialButton.type='button';trialButton.className='text-btn se-trial';trialButton.textContent='价格试算';trialButton.onclick=()=>open(index,true);actions.append(trialButton);
  }
  function save(status){
    const record=currentRecord(status);if(typeof record==='string'){error.textContent=record;return;}
    if(editIndex===null){
      const row=rows[0].cloneNode(true);row.querySelector('.se-trial')?.remove();row.querySelector('.sr-entry')?.remove();
      row.querySelector('.se-edit')?.replaceWith(Object.assign(document.createElement('span'),{className:'link',textContent:'编辑'}));
      row.cells[0].querySelector('.sub').textContent='演示策略 · 当前页面保存';row.cells[6].textContent=record.status==='草稿'?'启用后计算':'按配置执行';
      records.push(record);rows.push(row);document.querySelector('#strategy .strategy-list-table tbody').append(row);bindRow(row,records.length-1);updateRow(row,record);
    }else{records[editIndex]=record;updateRow(rows[editIndex],record);}
    applyFilters();
    note.textContent='已保存策略「'+record.name+'」：'+record.status+'，基准价 '+money(record.base)+'，最高价 '+money(record.ceiling)+'（原型演示）';close();
  }
  function openDetails(index){
    lastViewed=index;originalOpenDrawer();const record=records[index],range=ranges.find(r=>r.id===record.range),template=templates.find(t=>t.id===record.template);
    const drawer=document.getElementById('drawer');drawer.querySelector('h2').textContent=record.name;drawer.querySelector('.pill').textContent=record.status;
    drawer.querySelector('.pill').className='pill'+(record.status==='草稿'?' draft':record.status==='已暂停'?' pause':record.status==='已完成'?' done':'');
    const values={'国家 / 地区':record.country,'货品范围':range.name,'质量模板':template.name,'目标 / 已锁':record.target+' / '+record.locked+' 台','最晚完成时间':record.deadline||'—','基准价 P / 最高价 U':money(record.base)+' / '+money(record.ceiling)};
    drawer.querySelectorAll('.kv > div').forEach(cell=>{const label=cell.querySelector('label');if(Object.hasOwn(values,label.textContent.trim()))cell.replaceChildren(label,document.createTextNode(values[label.textContent.trim()]));});
    const showRecordedRun=index===0&&!record.changed;
    const calculation=drawer.querySelector('.drawer-body > .panel');
    const timeline=drawer.querySelector('.timeline');
    calculation.hidden=!showRecordedRun;timeline.hidden=!showRecordedRun;timeline.previousElementSibling.hidden=!showRecordedRun;
    drawer.querySelectorAll('.kv > div').forEach(cell=>{
      const label=cell.querySelector('label');
      if(label.textContent.trim()==='当前可接受价格')cell.replaceChildren(label,document.createTextNode(showRecordedRun?'¥4,362':record.locked===0?money(record.base):'执行时计算'));
      if(label.textContent.trim()==='配置修订')cell.replaceChildren(label,document.createTextNode(showRecordedRun?'R2（2026-07-18 13:42 生效）':record.changed?'当前页面已修改（演示）':'演示配置'));
    });
  }
  fields.range.addEventListener('change',()=>{if(opening)return;const range=selectedRange();fields.country.value=range.region;refreshTemplates(fields.template.value);refreshTrial();});
  fields.template.addEventListener('change',()=>{if(!opening)refreshTrial();});fields.country.addEventListener('change',()=>{if(!opening)refreshTrial();});
  fields.base.addEventListener('input',refreshSummary);
  dialog.querySelector('#se-close').onclick=close;cancel.onclick=close;
  dialog.querySelector('#se-save-draft').onclick=()=>save('草稿');dialog.querySelector('#se-save').onclick=()=>save('执行中');
  dialog.addEventListener('close',()=>{document.body.style.overflow='';if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
  document.getElementById('drawer').querySelector('.buttons .primary').onclick=()=>open(lastViewed);
  rows.forEach(bindRow);
  window.showCreate=()=>open();
  window.showView=id=>{if(id==='create'){open();return;}if(dialog.open)close();originalShowView(id);};
  window.RetentionStrategyEditor={open,close,getContext:context};
  if(location.hash==='#create')open();
})();
