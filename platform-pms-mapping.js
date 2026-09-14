/* PMS mapping prototype. Its state, styles and events are scoped to mappingRulePage. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) { root.PmsMapping = api; api.mount(root); }
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const SOURCE = 'JDX-L2', TARGET = 'PJT-L1', KEY = 'fs-pms-special-attributes-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const models = [
    {id:'101',name:'iPhone 15',brand:'Apple',series:'iPhone 15'},
    {id:'102',name:'iPhone 14 Pro',brand:'Apple',series:'iPhone 14'},
    {id:'201',name:'Samsung Galaxy S24',brand:'Samsung',series:'Galaxy S24'}
  ];
  const channels = [{id:'STORE',name:'门店 MAX',country:'MY'},{id:'PARTNER',name:'合作渠道',country:'MY'}];
  // Illustrative PMS dictionaries. Matching uses IDs and explicit business-attribute relationships.
  const attributes = [
    {id:'L2-REGION',targetId:'L1-REGION',name:'销售地区／版本',business:'region',values:[
      {id:'L2-OTHER',name:'海外其他版本',generic:true}, {id:'L2-MY',name:'马来版本'},
      {id:'L2-HK',name:'中国香港版本',models:['101','102']}, {id:'L2-SG',name:'新加坡版本'}, {id:'L2-CN',name:'国行版本'}
    ],targets:[{id:'L1-CN',name:'国行版本'},{id:'L1-INTL',name:'国内其他版本',models:['101','102']}]},
    {id:'L2-CHANNEL',targetId:'L1-CHANNEL',name:'购买渠道',business:'channel',values:[
      {id:'L2-RETAIL-OTHER',name:'其他购买渠道',generic:true},{id:'L2-RETAIL-MY',name:'马来零售渠道'}, {id:'L2-RETAIL-CN',name:'国内零售渠道'}
    ],targets:[{id:'L1-RETAIL-CN',name:'国内零售渠道'}]}
  ];
  const attr = id => attributes.find(a=>a.id===id || a.targetId===id);
  const source = id => attributes.flatMap(a=>a.values.map(v=>({...v,ppn:a.id}))).find(v=>v.id===id);
  const target = id => attributes.flatMap(a=>a.targets.map(v=>({...v,ppn:a.targetId}))).find(v=>v.id===id);
  const validFor = (value, model) => Boolean(value && value.valid!==false && (!value.models || value.models.includes(model)));
  const idsFor = r => r.models.length ? r.models : models.map(m=>m.id);
  const intersection = (a,b) => !a.length || !b.length || a.some(x=>b.includes(x));
  const instant = value => value ? Date.parse(value) : Infinity;
  const begins = v => Math.max(instant(v.start),v.activatedAt?instant(v.activatedAt):-Infinity);
  function status(v, now=Date.now()) {
    if (!v.enabled) return '草稿';
    if (v.disabledAt && instant(v.disabledAt)<=now) return '停用';
    if (v.replacedAt && instant(v.replacedAt)<=now) return '已替换';
    if (instant(v.end)<=now) return '已过期';
    return begins(v)>now ? '待生效' : '启用';
  }
  function active(rule, at=Date.now()) { return rule.versions.find(v=>status(v,at)==='启用'); }
  function latest(rule) { return rule.versions[rule.versions.length-1]; }
  const endTime = v => Math.min(instant(v.end),instant(v.replacedAt),instant(v.disabledAt));
  function seed() {
    const version = (type, patch) => ({version:1,type,name:'',country:'MY',channels:[],models:[],sourceStandard:SOURCE,sourcePpn:'L2-REGION',sourcePvIds:[],candidateIds:[],targetStandard:TARGET,targetPpn:'L1-REGION',targetPpv:'L1-CN',priority:100,start:'2026-01-01T00:00:00+08:00',end:'',prompt:'',reason:'初始化演示规则',operator:'贾瑞真',updatedAt:'2026-09-14T07:00:00Z',enabled:true,...patch});
    const state={schema:1,serial:4,revision:1,rules:[
      {id:'OMAP-0001',revision:1,versions:[version('mapping',{name:'马来版本取价映射',sourcePvIds:['L2-MY']})]},
      {id:'OMAP-0002',revision:1,versions:[version('mapping',{name:'iPhone 15 马来版本优先规则',sourcePvIds:['L2-MY'],models:['101'],priority:10})]},
      {id:'CONF-0003',revision:1,versions:[version('confirmation',{name:'海外其他版本人工确认',sourcePvIds:['L2-OTHER'],candidateIds:['L2-MY','L2-SG'],targetPpn:'',targetPpv:'',prompt:'请确认设备的实际销售版本'})]}
    ],sourceSets:[{country:'MY',standard:SOURCE,ppn:'L2-REGION',version:1,values:['L2-MY','L2-HK','L2-SG'],reason:'初始化需映射来源',operator:'贾瑞真',updatedAt:'2026-09-14T07:00:00Z',history:[]}],records:[],audit:[]};
    const ctx={country:'MY',channel:'STORE',model:'101',at:'2026-09-14T07:00:00Z',inputs:{actual:['L2-SG'],baseline:['L2-MY']}};
    const snap=snapshot(state,ctx);state.records.push({id:'RUN-0001',taskNo:'MAX-DEMO-001',orderNo:'INSP-DEMO-001',model:'101',country:'MY',shop:'KL 演示店铺',report:'REPORT-DEMO-001',reportVersion:'V1',factVersion:'V1',maxRaw:'海外其他版本',actualSource:'人工确认',confirmationRule:'CONF-0003 / V1',confirmedBy:'原操作人（演示）',confirmedAt:ctx.at,lot:'尚未发布',context:ctx,snapshot:snap,result:evaluate(state,snap),createdAt:ctx.at,attempts:1,frozen:false});
    return state;
  }
  function checkPermission(permission) { if(permission!=='maintain') throw Error('当前仅有查看权限，无法维护配置。'); }
  function validate(state,v, enabling=false, excludeId='', now=Date.now()) {
    if(!v.name.trim() || !v.reason.trim()) return '请填写规则名称及修改／启停原因。';
    if(v.country!=='MY' || v.sourceStandard!==SOURCE) return '请选择有效国家及 PMS 二级来源标准。';
    if(!Number.isInteger(v.priority) || v.priority<=0) return '优先级须为正整数，数字越小越优先。';
    if(!Number.isFinite(instant(v.start)) || (v.end && (!Number.isFinite(instant(v.end)) || instant(v.end)<=instant(v.start)))) return '请填写有效生效时间，结束时间必须晚于开始时间。';
    if(v.channels.some(id=>!channels.some(c=>c.id===id&&c.country===v.country)) || v.models.some(id=>!models.some(m=>m.id===id))) return '渠道或型号范围无效。';
    const a=attr(v.sourcePpn);if(!a || !v.sourcePvIds.length || v.sourcePvIds.some(id=>source(id)?.ppn!==a.id)) return '请从来源属性下选择有效二级 PPV。';
    if(v.type==='mapping') {
      if(v.sourcePvIds.length!==1 || v.targetStandard!==TARGET || a.targetId!==v.targetPpn || target(v.targetPpv)?.ppn!==v.targetPpn) return '目标须为同一业务属性的拍机堂一级 PPV，跨标准 PPN ID 可以不同。';
      if(v.sourcePvIds.some(id=>source(id).generic)) return '需确认的泛化值不能直接配置为取价输入，请先配置人工确认规则。';
      if(!state.sourceSets.some(s=>s.country===v.country&&s.ppn===v.sourcePpn&&s.values.includes(v.sourcePvIds[0]))) return '来源 PPV 不在本国家的需映射来源集合中，请先维护来源值。';
    } else if(v.type==='confirmation') {
      if(!v.candidateIds.length || v.candidateIds.some(id=>source(id)?.ppn!==a.id || source(id)?.generic)) return '请配置同一二级属性下明确的真实候选值。';
    } else return '规则类型无效。';
    if(enabling) {
      if(instant(v.end)<=now) return '规则已过期，不能启用。';
      const scope=idsFor(v);
      if(v.sourcePvIds.some(id=>!scope.some(m=>validFor(source(id),m)))) return '来源值已失效或不适用于所选型号。';
      if(v.type==='mapping' && scope.some(m=>validFor(source(v.sourcePvIds[0]),m)&&!validFor(target(v.targetPpv),m))) return '目标值失效或不支持适用范围内的型号。';
      if(v.type==='confirmation' && scope.some(m=>v.sourcePvIds.some(id=>validFor(source(id),m))&&!v.candidateIds.some(id=>validFor(source(id),m)))) return '适用型号下没有有效的人工确认候选。';
      const collisions=[];
      state.rules.filter(r=>r.id!==excludeId).forEach(r=>r.versions.forEach(w=>{
        if(!w.enabled || w.type!==v.type || w.country!==v.country || w.sourceStandard!==v.sourceStandard || w.sourcePpn!==v.sourcePpn || w.priority!==v.priority) return;
        if(v.sourcePvIds.some(id=>w.sourcePvIds.includes(id)) && intersection(v.channels,w.channels) && intersection(v.models,w.models) && Math.max(instant(v.start),now)<endTime(w)&&begins(w)<instant(v.end)) collisions.push(`${r.id} / V${w.version}（渠道 ${w.channels.join('、')||'全部'}；型号 ${w.models.join('、')||'全部'}；${w.start} 至 ${w.end||'长期'}）`);
      }));
      if(collisions.length)return `同优先级规则的来源、渠道／型号及生效时间重叠：${collisions.join('、')}。可保存草稿，禁止启用。`;
    }
    return '';
  }
  function audit(state,action,id,version,reason,now) {state.audit.unshift({action,id,version,reason,operator:'贾瑞真',at:now});state.revision++;}
  function saveRule(state,draft,id,expectedRevision,permission='maintain',now=new Date().toISOString()) {
    checkPermission(permission);const r=state.rules.find(r=>r.id===id);
    if(r && r.revision!==expectedRevision)throw Error('规则已被其他操作更新，请刷新后再提交。');
    const v=clone(draft);const error=validate(state,v);if(error)throw Error(error);
    v.version=r?latest(r).version+1:1;v.enabled=false;delete v.disabledAt;delete v.replacedAt;delete v.activatedAt;delete v.activationReason;v.updatedAt=now;v.operator='贾瑞真';
    v.sourceNames=v.sourcePvIds.map(id=>({id,name:source(id).name}));v.candidateNames=v.candidateIds.map(id=>({id,name:source(id).name}));v.targetName=target(v.targetPpv)?.name||'';
    let record=r;
    if(!record){record={id:(v.type==='mapping'?'OMAP-':'CONF-')+String(state.serial++).padStart(4,'0'),revision:0,createdAt:now,createdBy:'贾瑞真',versions:[]};state.rules.unshift(record);}
    record.versions.push(v);record.revision++;audit(state,'保存草稿',record.id,v.version,v.reason,now);return record;
  }
  function enableRule(state,id,version,expectedRevision,reason,permission='maintain',now=new Date().toISOString()) {
    checkPermission(permission);const r=state.rules.find(r=>r.id===id);if(!r || r.revision!==expectedRevision)throw Error('规则版本已变化，请刷新。');
    const v=r.versions.find(v=>v.version===version);if(!v || v.enabled)throw Error('请选择尚未启用的草稿版本。');
    if(!reason.trim())throw Error('请填写启用原因。');
    const error=validate(state,{...v,reason},true,id,instant(now));if(error)throw Error(error);
    if(r.versions.some(w=>status(w,instant(now))==='待生效'))throw Error('已有待生效版本，请先停用该规则编号后再启用。');
    // Deployments use the activation instant when a configured start is already in the past.
    const effective=Math.max(instant(v.start),instant(now));
    r.versions.filter(w=>status(w,instant(now))==='启用').forEach(w=>w.replacedAt=new Date(effective).toISOString());
    v.enabled=true;v.activatedAt=now;v.activationReason=reason;r.revision++;audit(state,'启用',id,version,reason,now);return v;
  }
  function disableRule(state,id,expectedRevision,reason,permission='maintain',now=new Date().toISOString()) {
    checkPermission(permission);const r=state.rules.find(r=>r.id===id);if(!r||r.revision!==expectedRevision)throw Error('规则版本已变化，请刷新。');if(!reason.trim())throw Error('请填写停用原因。');
    r.versions.filter(v=>['启用','待生效'].includes(status(v,instant(now)))).forEach(v=>v.disabledAt=now);r.revision++;audit(state,'停用编号并撤销待生效版本',id,null,reason,now);
  }
  function saveSources(state,country,ppn,values,reason,expectedRevision,permission='maintain') {
    checkPermission(permission);if(state.revision!==expectedRevision)throw Error('配置已更新，请刷新后重试。');
    if(country!=='MY'||!attr(ppn)||!values.length||values.some(id=>source(id)?.ppn!==ppn||source(id)?.generic))throw Error('请选择本国家下有效、明确的二级来源 PPV。');
    if(!reason.trim())throw Error('请填写变更原因。');
    let set=state.sourceSets.find(s=>s.country===country&&s.ppn===ppn);const at=new Date().toISOString();
    if(!set){set={country,ppn,version:0,history:[]};state.sourceSets.push(set);}else set.history.push(clone({...set,history:undefined}));
    Object.assign(set,{standard:SOURCE,version:set.version+1,values:[...values],names:values.map(id=>({id,name:source(id).name})),reason,operator:'贾瑞真',updatedAt:at});audit(state,'更新需映射来源值',ppn,set.version,reason,at);
  }
  function snapshot(state,context,includeDraft=null) {
    const rules=state.rules.flatMap(r=>r.versions.filter(v=>status(v,instant(context.at))==='启用').map(v=>({...clone(v),id:r.id})));
    if(includeDraft){const v=clone(includeDraft);rules.splice(0,rules.length,...rules.filter(r=>r.id!==v.id));rules.push({...v,enabled:true});}
    const sourceSets=state.sourceSets.flatMap(s=>{const version=[...(s.history||[]),s].filter(v=>instant(v.updatedAt)<=instant(context.at)).sort((a,b)=>b.version-a.version)[0];return version?[clone({...version,standard:SOURCE,history:undefined})]:[];});
    return {id:`SNAP-${state.revision}`,at:context.at,context:clone(context),sourceSets,rules,ruleVersions:rules.map(r=>`${r.id} / V${r.version}`)};
  }
  function candidates(snap,ctx,type,ppn,pv) {return snap.rules.filter(v=>v.type===type&&v.country===ctx.country&&v.sourceStandard===SOURCE&&v.sourcePpn===ppn&&v.sourcePvIds.includes(pv)&&(!v.models.length||v.models.includes(ctx.model))&&(!v.channels.length||v.channels.includes(ctx.channel))&&begins(v)<=instant(ctx.at)&&instant(ctx.at)<endTime(v)).sort((a,b)=>a.priority-b.priority);}
  function confirmation(snap,pv) {
    const ctx=snap.context, val=source(pv);if(!validFor(val,ctx.model))return {status:'异常',reason:'来源值无效或不适用当前型号'};
    const matches=candidates(snap,ctx,'confirmation',val.ppn,pv),top=matches[0];
    if(!top)return {status:val.generic?'异常':'无需人工确认',reason:val.generic?'泛化值缺少人工确认配置':'采用明确机检值；取价时仍按映射配置处理',candidates:[]};
    if(matches[1]?.priority===top.priority)return {status:'异常',reason:'最高优先级并列',matches};
    const options=top.candidateIds.filter(id=>validFor(source(id),ctx.model));return {status:options.length?'待人工确认':'异常',reason:options.length?(top.prompt||'请确认实际属性'):'无有效真实候选',candidates:options,rule:`${top.id} / V${top.version}`,matches};
  }
  function evaluate(state,snap) {
    const ctx=snap.context,result={};
    for(const group of ['actual','baseline']) {
      const items=[],errors=[],mapped=[],remaining=[];
      if(!(ctx.inputs[group]||[]).length)errors.push('来源属性为空');
      for(const pv of ctx.inputs[group]||[]) {
        const val=source(pv),item={sourcePpv:pv,sourcePpn:val?.ppn,sourceStandard:SOURCE,candidates:[]};items.push(item);
        if(!validFor(val,ctx.model)){item.status='异常';item.reason='来源值失效或不支持型号';errors.push(item.reason);continue;}
        if(val.generic){item.status='待人工确认';item.reason='泛化值未确认，不能进入取价';errors.push(item.reason);continue;}
        const needed=snap.sourceSets.some(s=>s.country===ctx.country&&s.ppn===val.ppn&&s.values.includes(pv));
        if(!needed){item.status='无需海外映射';remaining.push({standard:SOURCE,ppn:val.ppn,ppv:pv});continue;}
        const matches=candidates(snap,ctx,'mapping',val.ppn,pv);item.candidates=matches.map(r=>`${r.id} / V${r.version}（优先级 ${r.priority}）`);const rule=matches[0];
        if(!rule){item.status='待补映射';item.reason='需映射来源值没有有效规则';errors.push(item.reason);continue;}
        if(matches[1]?.priority===rule.priority){item.status='异常';item.reason='最高优先级并列，不随机选择';errors.push(item.reason);continue;}
        item.rule=`${rule.id} / V${rule.version}`;item.priority=rule.priority;
        if(!validFor(target(rule.targetPpv),ctx.model)||attr(val.ppn)?.targetId!==rule.targetPpn){item.status='异常';item.reason='目标失效或不支持型号，不回退低优先级';errors.push(item.reason);continue;}
        item.status='已映射';item.targetStandard=TARGET;item.targetPpn=rule.targetPpn;item.targetPpv=rule.targetPpv;item.mapped=true;mapped.push(clone(item));
      }
      const targets=new Map();mapped.forEach(i=>{if(targets.has(i.targetPpn)&&targets.get(i.targetPpn)!==i.targetPpv)errors.push('同一目标业务属性存在冲突值');targets.set(i.targetPpn,i.targetPpv);});
      result[group]={status:errors.length?'停止该组取价':'映射完成，待 PMS 转换／校验',items,mapped,remaining,errors,canRequestProductCode:false};
    }
    return result;
  }
  function retryRecord(state,id,permission='maintain') {checkPermission(permission);const r=state.records.find(r=>r.id===id);if(!r||r.frozen)throw Error('记录不存在或价格已冻结，不能重试。');r.result=evaluate(state,r.snapshot);r.attempts++;audit(state,'按原快照重试',id,null,'沿用原输入和配置快照',new Date().toISOString());return r;}
  function reprocess(state,id,permission='maintain') {
    checkPermission(permission);const old=state.records.find(r=>r.id===id);if(!old||old.frozen)throw Error('记录不存在或价格已冻结，不能重新处理。');
    const ctx={...clone(old.context),at:new Date().toISOString()},snap=snapshot(state,ctx),r={...clone(old),id:'RUN-'+String(state.records.length+1).padStart(4,'0'),parentId:id,context:ctx,snapshot:snap,result:evaluate(state,snap),createdAt:ctx.at,attempts:1};state.records.unshift(r);audit(state,'按新配置重新处理',r.id,null,`原记录 ${id}`,ctx.at);return r;
  }
  function mount(win) {
    const page=win.document.getElementById('mappingRulePage');if(!page)return;
    const $=selector=>win.document.querySelector(selector), $$=selector=>[...win.document.querySelectorAll(selector)];
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let state;try{state=JSON.parse(win.localStorage.getItem(KEY));}catch{}if(state?.schema!==1)state=seed();
    let tab='mapping',permission='maintain',editor=null,filter={keyword:'',model:'',channel:'',source:'',status:''};
    const dialog=win.document.createElement('dialog');dialog.id='pmsMappingDialog';dialog.className='pms-dialog';win.document.body.append(dialog);
    const option=(value,label,selected)=>`<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;
    const sourceName=id=>`${source(id)?.name||'失效选项'}（${id}）`, targetName=id=>`${target(id)?.name||'失效选项'}（${id}）`;
    const modelName=id=>models.find(m=>m.id===id)?.name||id;
    const pill=s=>`<span class="pms-status ${s==='启用'||s==='已映射'?'ok':s==='草稿'||s==='待生效'?'pending':s.includes('异常')||s.includes('停止')||s==='待补映射'?'bad':''}">${esc(s)}</span>`;
    const time=value=>value?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(value)):'长期';
    const localTime=iso=>new Date(instant(iso)+8*3600000).toISOString().slice(0,16);
    const fromLocal=value=>value?value+':00+08:00':'';
    const multi=(id,options,values,emptyLabel='可多选')=>`<select class="control pms-multi" id="${id}" multiple aria-label="${emptyLabel}">${options.map(o=>option(o.id,o.name,values.includes(o.id))).join('')}</select>`;
    const selected=id=>[...$(id).selectedOptions].map(o=>o.value);
    const field=(label,input,wide=false)=>`<div class="field ${wide?'pms-span':''}"><label>${label}</label>${input}</div>`;
    const input=(id,value='',type='text',extra='')=>`<input class="control" id="${id}" type="${type}" value="${esc(value)}" ${extra}>`;
    function persist(){win.localStorage.setItem(KEY,JSON.stringify(state));}
    function refresh(){try{const saved=JSON.parse(win.localStorage.getItem(KEY));if(saved?.schema===1 && saved.revision>state.revision)state=saved;}catch{}}
    function notify(message){if(typeof win.toast==='function')win.toast(message);}
    function error(message){$('#pmsError').textContent=message;$('#pmsError').hidden=false;}
    function show(title,body,footer='') {dialog.innerHTML=`<header><div><small>PMS 属性映射规则</small><h2>${esc(title)}</h2></div><button class="pms-close" data-pms="close" aria-label="关闭">×</button></header><div class="pms-dialog-body">${body}<p id="pmsError" class="pms-error" role="alert" hidden></p></div><footer><button class="btn" data-pms="close">关闭</button>${footer}</footer>`;if(!dialog.open)dialog.showModal();}
    const button=(action,label,id='',extra='')=>`<button class="btn ${extra}" data-pms="${action}" data-id="${esc(id)}">${label}</button>`;
    function render(){
      refresh();const typeRules=state.rules.filter(r=>latest(r).type===tab), activeCount=typeRules.filter(r=>active(r)).length;
      page.innerHTML=`<div class="page-title"><div><h1>PMS 属性映射规则</h1><p class="subtle">海外特殊属性值转换配置 · 马来西亚</p></div><div class="page-actions"><label class="pms-permission">演示权限 <select class="control" id="pmsPermission">${option('maintain','查看与维护',permission==='maintain')}${option('view','仅查看',permission==='view')}</select></label>${button('preview','命中预览')}${permission==='maintain'&&['mapping','confirmation'].includes(tab)?button('new',tab==='mapping'?'＋ 新增取价映射':'＋ 新增人工确认','','primary'):''}</div></div>
      <div class="pms-note">先确认真实属性，再分别映射两组取价来源值。取价目标不回写真实质检报告；配置变更不改写历史快照。</div>
      <div class="pms-tabs" role="tablist">${[['mapping','取价映射'],['confirmation','人工确认'],['sources','需映射来源值'],['records','异常记录']].map(([id,name])=>`<button role="tab" aria-selected="${tab===id}" class="${tab===id?'active':''}" data-pms="tab" data-id="${id}">${name}</button>`).join('')}</div>
      ${['mapping','confirmation'].includes(tab)?`<div class="metric-grid pms-metrics">${[[typeRules.length,'规则编号'],[activeCount,'当前启用'],[typeRules.filter(r=>r.versions.some(v=>status(v)==='待生效')).length,'待生效'],[typeRules.filter(r=>status(latest(r))==='草稿').length,'最新版本为草稿']].map(([n,t])=>`<div class="metric"><div class="metric-label">${t}</div><div class="metric-value">${n}</div></div>`).join('')}</div>
      <div class="card"><div class="card-body pms-filters">${field('编号／名称',input('pmsKeyword',filter.keyword))}${field('型号',`<select class="control" id="pmsModelFilter">${option('','全部型号')}${models.map(m=>option(m.id,m.name,filter.model===m.id)).join('')}</select>`)}${field('渠道',`<select class="control" id="pmsChannelFilter">${option('','全部渠道')}${channels.map(c=>option(c.id,c.name,filter.channel===c.id)).join('')}</select>`)}${field('来源属性值',input('pmsSourceFilter',filter.source))}${field('状态',`<select class="control" id="pmsStatusFilter">${option('','全部')}${['草稿','待生效','启用','停用','已过期'].map(s=>option(s,s,filter.status===s)).join('')}</select>`)}<div class="filter-actions">${button('reset','重置')}${button('search','查询','','primary')}</div></div></div><div id="pmsRuleResults"></div>`:''}<div id="pmsTabBody"></div><p class="pms-footnote">示例属性字典及处理记录用于原型演示；规则保存在当前浏览器中。</p>`;
      if(tab==='sources')renderSources();else if(tab==='records')renderRecords();else renderRows(typeRules);
    }
    function renderRows(rules){
      const filtered=rules.filter(r=>{
        const v=latest(r),current=active(r);return (!filter.keyword||`${r.id}${v.name}`.toLowerCase().includes(filter.keyword.toLowerCase()))&&(!filter.model||!v.models.length||v.models.includes(filter.model))&&(!filter.channel||!v.channels.length||v.channels.includes(filter.channel))&&(!filter.source||v.sourcePvIds.some(id=>sourceName(id).toLowerCase().includes(filter.source.toLowerCase())))&&(!filter.status||status(v)===filter.status||current&&filter.status==='启用');
      });
      $('#pmsRuleResults').innerHTML=`<div class="card"><div class="card-head"><b>${tab==='mapping'?'取价映射':'人工确认'}规则 · ${filtered.length} 条</b><span class="subtle">${tab==='mapping'?'二级来源 → 拍机堂一级目标 · 两组均应用':'二级触发值 → 二级真实候选值'}</span></div><div class="table-wrap"><table class="table pms-rules"><thead><tr><th>编号／版本 · 规则名称</th><th>适用范围</th><th>来源属性／触发值</th><th>${tab==='mapping'?'一级目标':'真实候选值'}</th><th>优先级</th><th>状态／生效时间</th><th>最近更新</th><th>操作</th></tr></thead><tbody>${filtered.map(r=>{const v=latest(r),current=active(r);return `<tr><td><b>${esc(r.id)} / V${v.version}</b><div>${esc(v.name)}</div>${current&&current.version!==v.version?`<small>当前生效 V${current.version}；${status(v)==='待生效'?'新版本到时替换':'草稿不参与匹配'}</small>`:''}</td><td>马来西亚<div>${esc(v.channels.length?v.channels.map(id=>channels.find(c=>c.id===id)?.name||id).join('、'):'全部渠道')}</div><small>${esc(v.models.length?v.models.map(modelName).join('、'):'全部 MAX 支持型号')}</small></td><td><b>${esc(attr(v.sourcePpn)?.name)}</b><small>${esc(v.sourceStandard)} · ${esc(v.sourcePpn)}</small>${v.sourcePvIds.map(id=>`<div>${esc(sourceName(id))}</div>`).join('')}</td><td>${v.type==='mapping'?`<b>${esc(target(v.targetPpv)?.name||'失效目标')}</b><small>${esc(v.targetPpn)} / ${esc(v.targetPpv)}</small>`:v.candidateIds.map(id=>`<div>${esc(sourceName(id))}</div>`).join('')}</td><td><b>${v.priority}</b></td><td>${pill(status(v))}<small>${time(v.start)}<br>至 ${time(v.end)}（MYT）</small></td><td>${esc(v.operator)}<small>${time(v.updatedAt)}</small></td><td><div class="pms-actions">${button('history','版本',r.id,'link')}${button('draft-preview','预览',r.id,'link')}${permission==='maintain'?button('edit','编辑',r.id,'link')+(status(v)==='草稿'?button('enable','启用',r.id,'link'):'')+(r.versions.some(w=>['启用','待生效'].includes(status(w)))?button('disable','停用',r.id,'link'):''):''}</div></td></tr>`;}).join('')||'<tr><td colspan="8" class="pms-empty">没有符合条件的规则，可调整筛选条件。</td></tr>'}</tbody></table></div></div>`;
    }
    function renderSources(){
      $('#pmsTabBody').innerHTML=`<div class="card"><div class="card-head"><b>需映射来源值集合</b>${permission==='maintain'?button('sources-edit','维护来源值','','primary'):''}</div><div class="card-body"><p class="subtle">来源集合独立于映射规则维护。停用具体规则不会移除来源值；集合中的值缺少有效规则时，应进入“待补映射”。集合外的有效二级值交 PMS 常规转换。</p><div class="table-wrap"><table class="table"><thead><tr><th>国家</th><th>二级来源属性</th><th>需映射 PPV</th><th>版本</th><th>修改人／时间</th><th>操作</th></tr></thead><tbody>${state.sourceSets.map(s=>`<tr><td>马来西亚</td><td>${esc(attr(s.ppn)?.name)}<small>${SOURCE} / ${esc(s.ppn)}</small></td><td>${s.values.map(id=>esc(sourceName(id))).join('<br>')}</td><td>V${s.version}</td><td>${esc(s.operator)}<small>${time(s.updatedAt)}</small></td><td>${button('source-history','历史版本',s.ppn,'link')}</td></tr>`).join('')}</tbody></table></div></div></div>`;
    }
    function renderRecords(){
      $('#pmsTabBody').innerHTML=`<div class="card"><div class="card-head"><b>处理记录与异常恢复</b><label>状态 <select id="pmsRecordStatus" class="control"><option value="">全部</option><option value="error">有失败组</option><option value="ready">映射已完成</option></select></label></div><div class="card-body"><p class="subtle">自动重试沿用原输入及快照；按新配置重新处理会创建关联记录，两组一起使用新快照。已冻结价格不可重算。映射成功后仍须由 PMS 转换其余属性并校验完整一级结果。</p><div id="pmsRecordRows"></div></div></div>`;recordRows();
    }
    function recordRows(){const value=$('#pmsRecordStatus').value,rows=state.records.filter(r=>!value||(value==='error')===Object.values(r.result).some(g=>g.errors.length));$('#pmsRecordRows').innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>处理记录／业务归属</th><th>型号／取价组</th><th>来源／失败阶段</th><th>状态</th><th>配置快照／时间</th><th>操作</th></tr></thead><tbody>${rows.map(r=>['actual','baseline'].map((g,i)=>`<tr><td><b>${r.id}</b><small>${r.orderNo} · ${esc(r.shop)}</small></td><td>${esc(modelName(r.model))}<small>${g==='actual'?'本机实际质检':'基准值对照'}</small></td><td>${r.context.inputs[g].map(id=>esc(sourceName(id))).join('<br>')}<small>${esc(r.result[g].errors.join('；')||'待 PMS 后续标准转换')}</small></td><td>${pill(r.result[g].status)}</td><td>${esc(r.snapshot.id)}<small>${time(r.createdAt)}</small></td><td>${i===0?button('record','查看记录',r.id,'link'):''}</td></tr>`).join('')).join('')||'<tr><td colspan="6" class="pms-empty">暂无符合条件的记录</td></tr>'}</tbody></table></div>`;}
    function openEditor(id){
      refresh();const r=state.rules.find(r=>r.id===id),v=r?clone(latest(r)):{type:tab,name:'',country:'MY',channels:[],models:[],sourceStandard:SOURCE,sourcePpn:'',sourcePvIds:[],candidateIds:[],targetStandard:TARGET,targetPpn:'',targetPpv:'',priority:100,start:new Date().toISOString(),end:'',prompt:'',reason:''};
      editor={id:r?.id,revision:r?.revision,type:v.type};
      show(r?'编辑并保存为新版本':'新增'+(v.type==='mapping'?'取价映射':'人工确认')+'规则',`<div class="pms-note">保存生成草稿，启用后才参与匹配。编辑不会立即替换当前生效版本。</div><div class="pms-form">
        ${field('规则编号／版本',input('pmId',r?`${r.id} / 下一版本 V${latest(r).version+1}`:'保存后自动生成','text','readonly'))}${field('规则名称 *',input('pmName',v.name))}
        ${field('国家／站点 *',`<select id="pmCountry" class="control"><option value="MY">马来西亚</option></select>`)}${field('渠道范围 *',`<select id="pmChannelMode" class="control">${option('all','全部渠道',!v.channels.length)}${option('selected','指定渠道',v.channels.length)}</select><div id="pmChannelChoices">${multi('pmChannels',channels,v.channels,'选择渠道')}</div>`)}
        ${field('型号范围 *',`<select id="pmModelMode" class="control">${option('all','全部 MAX 支持型号',!v.models.length)}${option('selected','指定型号',v.models.length)}</select><div id="pmModelChoices"><div class="pms-model-filters"><select id="pmBrand" class="control"><option value="">全部品牌</option><option>Apple</option><option>Samsung</option></select><select id="pmSeries" class="control"><option value="">全部系列</option>${[...new Set(models.map(m=>m.series))].map(s=>option(s,s)).join('')}</select>${input('pmModelSearch','','search','placeholder="搜索型号"')}</div><div id="pmModels">${models.map(m=>`<label data-model="${m.id}"><input type="checkbox" value="${m.id}" ${v.models.includes(m.id)?'checked':''}> ${esc(m.name)} <small>productId ${m.id}</small></label>`).join('')}</div></div>`,true)}
        ${field('来源标准',input('pmSourceStandard','机大侠二级 · '+SOURCE,'text','readonly'))}${field('来源属性 PPN *',`<select id="pmSourcePpn" class="control">${option('','请选择来源属性')}${attributes.map(a=>option(a.id,`${a.name}（${a.id}）`,v.sourcePpn===a.id)).join('')}</select>`)}
        <div id="pmValueFields" class="pms-span"></div>
        ${field('优先级 *',input('pmPriority',v.priority,'number','min="1" step="1"')+'<small>正整数，数字越小越优先；指定型号不会自动优先。</small>')}${field('保存状态',input('pmStatus','草稿','text','readonly'))}
        ${field('生效开始时间 *（马来西亚 UTC+8）',input('pmStart',localTime(v.start),'datetime-local'))}${field('生效结束时间（不含结束时刻）',input('pmEnd',v.end?localTime(v.end):'','datetime-local')+'<small>不填表示长期有效。</small>')}
        ${v.type==='confirmation'?field('店员确认提示',input('pmPrompt',v.prompt,'text','placeholder="请确认实际属性"'),true):''}
        ${field('修改原因 *',`<textarea id="pmReason" class="control" rows="2" placeholder="填写本次新增或调整原因"></textarea>`,true)}</div>`,button('save','保存草稿','','primary'));
      renderValueFields(v);syncScopes();
    }
    function renderValueFields(v={}){
      const a=attr($('#pmSourcePpn').value);let html='';
      if(editor.type==='mapping'){
        const set=state.sourceSets.find(s=>s.country===$('#pmCountry').value&&s.ppn===a?.id);const vals=(a?.values||[]).filter(v=>set?.values.includes(v.id)&&!v.generic);
        html=field('来源属性值 PPV *',`<select id="pmSourcePv" class="control">${option('','请选择来源值')}${vals.map(x=>option(x.id,sourceName(x.id),v.sourcePvIds?.includes(x.id))).join('')}</select><small>${set?'来源集合 V'+set.version:'请先在“需映射来源值”中维护该属性。'}</small>`)+field('目标标准',input('pmTargetStandard','拍机堂一级 · '+TARGET,'text','readonly'))+field('目标属性 PPN *',`<select id="pmTargetPpn" class="control">${option('','请选择目标属性')}${a?option(a.targetId,`${a.name}（${a.targetId}）`,v.targetPpn===a.targetId):''}</select><small>与来源对应同一业务属性，PPN ID 可以不同。</small>`)+field('目标属性值 PPV *',`<select id="pmTargetPv" class="control">${option('','请选择国内目标值')}</select>`)+field('应用取价组',input('pmGroups','本机实际质检 ＋ 基准值对照','text','readonly'),true);
      }else html=field('触发人工确认的 PPV *（多选）',multi('pmTrigger',a?.values||[],v.sourcePvIds||[],'选择触发值'))+field('允许选择的真实 PPV *（多选）',multi('pmCandidates',(a?.values||[]).filter(v=>!v.generic),v.candidateIds||[],'选择真实候选值'))+`<p class="pms-note pms-span">命中后必须由店员明确选择，只有一个候选也不自动确认；候选还须与当前型号、模板及条件生效项取交集。机器未覆盖项仍按模板补齐。</p>`;
      $('#pmValueFields').innerHTML=`<div class="pms-form">${html}</div>`;if(editor.type==='mapping')targetOptions(v.targetPpv);
    }
    function targetOptions(selectedId=''){const a=attr($('#pmTargetPpn').value);$('#pmTargetPv').innerHTML=option('','请选择国内目标值')+(a?.targets||[]).map(v=>option(v.id,targetName(v.id),v.id===selectedId)).join('');}
    function syncScopes(){$('#pmChannelChoices').hidden=$('#pmChannelMode').value==='all';$('#pmModelChoices').hidden=$('#pmModelMode').value==='all';}
    function readDraft(){
      const modelIds=$$('#pmModels input:checked').map(x=>x.value),channelIds=selected('#pmChannels');
      if($('#pmModelMode').value==='selected'&&!modelIds.length)throw Error('请选择至少一个型号。');if($('#pmChannelMode').value==='selected'&&!channelIds.length)throw Error('请选择至少一个渠道。');
      return {type:editor.type,name:$('#pmName').value.trim(),country:$('#pmCountry').value,channels:$('#pmChannelMode').value==='all'?[]:channelIds,models:$('#pmModelMode').value==='all'?[]:modelIds,sourceStandard:SOURCE,sourcePpn:$('#pmSourcePpn').value,sourcePvIds:editor.type==='mapping'?[$('#pmSourcePv').value]:selected('#pmTrigger'),candidateIds:editor.type==='confirmation'?selected('#pmCandidates'):[],targetStandard:TARGET,targetPpn:$('#pmTargetPpn')?.value||'',targetPpv:$('#pmTargetPv')?.value||'',priority:Number($('#pmPriority').value),start:fromLocal($('#pmStart').value),end:fromLocal($('#pmEnd').value),prompt:$('#pmPrompt')?.value.trim()||'',reason:$('#pmReason').value.trim()};
    }
    function history(id){const r=state.rules.find(r=>r.id===id);show(id+' · 历史版本',`<p class="subtle">创建人：${esc(r.createdBy||r.versions[0].operator)} · 创建时间：${time(r.createdAt||r.versions[0].updatedAt)}</p>`+r.versions.slice().reverse().map(v=>`<section class="pms-version"><h3>V${v.version} ${pill(status(v))}</h3><div class="pms-summary"><span>名称：${esc(v.name)}</span><span>渠道：${esc(v.channels.join('、')||'全部')}</span><span>型号：${esc(v.models.map(modelName).join('、')||'全部')}</span><span>优先级：${v.priority}</span><span>来源标准／PPN：${esc(v.sourceStandard)} / ${esc(v.sourcePpn)}</span><span>来源：${v.sourcePvIds.map(id=>esc(sourceName(id))).join('、')}</span><span>${v.type==='mapping'?'一级目标：'+esc(targetName(v.targetPpv)):'真实候选：'+v.candidateIds.map(id=>esc(sourceName(id))).join('、')}</span><span>${v.type==='mapping'?'目标标准／PPN：'+esc(v.targetStandard)+' / '+esc(v.targetPpn):'确认提示：'+esc(v.prompt||'请确认实际属性')}</span><span>生效：${time(v.start)} 至 ${time(v.end)}</span><span>原因：${esc(v.reason)}</span><span>操作人：${esc(v.operator)} · ${time(v.updatedAt)}</span></div></section>`).join('')+'<h3>操作记录</h3>'+state.audit.filter(a=>a.id===id).map(a=>`<p>${time(a.at)} · ${esc(a.operator)} · ${esc(a.action)} · ${esc(a.reason)}</p>`).join(''));}
    function lifecycle(id,action){const r=state.rules.find(r=>r.id===id),v=latest(r);editor={id,revision:r.revision,version:v.version,action};show(action==='enable'?'启用规则版本':'停用整个规则编号',`<p><b>${esc(id)} / V${v.version}</b> · ${esc(v.name)}</p><p class="pms-note">${action==='enable'?'启用前校验字典、型号、生效时间和同优先级冲突；新版本生效时替换原版本。':'当前生效版本及待生效版本一并停止。来源集合、历史版本和已冻结结果保留。'}</p>${field('操作原因 *','<textarea id="pmLifecycleReason" class="control" rows="3"></textarea>')}`,button('lifecycle-save','确认'+(action==='enable'?'启用':'停用'),'','primary'));}
    function sourcesEditor(){editor={revision:state.revision};show('维护需映射来源值',`<div class="pms-form">${field('国家',`<select id="psCountry" class="control"><option value="MY">马来西亚</option></select>`)}${field('二级来源 PPN',`<select id="psPpn" class="control">${attributes.map(a=>option(a.id,`${a.name}（${a.id}）`)).join('')}</select>`)}<div id="psValues" class="pms-span"></div>${field('变更原因 *',`<textarea id="psReason" class="control" rows="2"></textarea>`,true)}</div><p class="pms-note">集合单独保存版本。停用取价规则不自动移除这里的来源值；上线和字典更新时须核对覆盖范围。</p>`,button('sources-save','保存新版本','','primary'));sourceChoices();}
    function sourceChoices(){const ppn=$('#psPpn').value,s=state.sourceSets.find(s=>s.country===$('#psCountry').value&&s.ppn===ppn);$('#psValues').innerHTML=field('需映射 PPV *（多选）',multi('psSelected',attr(ppn).values.filter(v=>!v.generic),s?.values||[],'选择需映射来源值'));}
    function preview(id){const r=state.rules.find(r=>r.id===id),draft=r?{...clone(latest(r)),id}:null;editor={previewDraft:draft};
      const values=attributes.flatMap(a=>a.values.map(v=>({id:v.id,name:`${a.name} · ${v.name}（${v.id}）`})));
      show(draft?`${r.id} / V${draft.version} · 版本预览`:'规则命中预览',`<p class="pms-note">${draft?'本次临时使用所选版本；草稿预览不影响实际启用规则。':'使用指定时间生效的配置快照。'}预览不创建商品码，不修改报告或价格。</p><div class="pms-form">${field('国家',`<select id="pvCountry" class="control"><option value="MY">马来西亚</option></select>`)}${field('渠道',`<select id="pvChannel" class="control">${channels.map(c=>option(c.id,c.name)).join('')}</select>`)}${field('型号',`<select id="pvModel" class="control">${models.map(m=>option(m.id,m.name)).join('')}</select>`)}${field('执行时间（MYT）',input('pvTime',localTime(new Date().toISOString()),'datetime-local'))}${field('来源标准',input('pvStandard',SOURCE+' · 机大侠二级','text','readonly'),true)}${draft?.type==='confirmation'?field('二级识别值',`<select id="pvConfirm" class="control">${values.map(v=>option(v.id,v.name,draft.sourcePvIds.includes(v.id))).join('')}</select>`,true):field('本机实际质检 · 来源 PPV',multi('pvActual',values,['L2-MY','L2-RETAIL-CN'],'本机实际质检来源'))+field('基准值对照 · 来源 PPV',multi('pvBaseline',values,['L2-SG','L2-RETAIL-CN'],'基准值对照来源'))}</div><div id="pvOutput" class="pms-preview"></div>`,button('preview-run','执行预览','','primary'));}
    function resultHtml(result){return ['actual','baseline'].map(g=>{const r=result[g];return `<section class="pms-version"><h3>${g==='actual'?'本机实际质检':'基准值对照'} ${pill(r.status)}</h3><table class="table"><thead><tr><th>二级来源</th><th>匹配结果</th><th>一级目标</th></tr></thead><tbody>${r.items.map(i=>`<tr><td>${esc(sourceName(i.sourcePpv))}<small>${esc(i.sourcePpn)}</small></td><td>${pill(i.status)}<small>${esc(i.rule||i.reason||'交 PMS 常规转换')}</small>${i.candidates?.length?`<details><summary>候选规则与优先级</summary>${i.candidates.map(x=>`<p>${esc(x)}</p>`).join('')}</details>`:''}</td><td>${i.targetPpv?`${esc(targetName(i.targetPpv))}<small>${esc(i.targetPpn)} · 已完成一级映射</small>`:'—'}</td></tr>`).join('')}</tbody></table><p>剩余待标准转换项：${r.remaining.map(i=>esc(sourceName(i.ppv))).join('、')||'无'}</p>${r.errors.length?`<p class="pms-error">${esc(r.errors.join('；'))}</p>`:'<p class="subtle">已映射一级值单独保留，其余二级项按 ZH202605 转换；完整一级结果校验后才可请求商品码。</p>'}</section>`;}).join('');}
    function runPreview(){
      const ctx={country:$('#pvCountry').value,channel:$('#pvChannel').value,model:$('#pvModel').value,at:fromLocal($('#pvTime').value),inputs:{actual:$('#pvActual')?selected('#pvActual'):[],baseline:$('#pvBaseline')?selected('#pvBaseline'):[]}};
      if(!Number.isFinite(instant(ctx.at)))throw Error('请选择有效的执行时间。');const snap=snapshot(state,ctx,editor.previewDraft);
      if($('#pvConfirm')){const result=confirmation(snap,$('#pvConfirm').value);$('#pvOutput').innerHTML=`<h3>${pill(result.status)}</h3><p>${esc(result.reason)}</p><p>命中规则：${esc(result.rule||'无')}</p><p>当前型号有效候选：${(result.candidates||[]).map(id=>esc(sourceName(id))).join('、')||'无'}</p><small>不默认选择候选；本预览不修改真实质检结果。</small>`;}
      else $('#pvOutput').innerHTML=`<p>共用快照 ${snap.id} · 来源集合 ${snap.sourceSets.map(s=>`${s.ppn} V${s.version}`).join('、')}</p>${resultHtml(evaluate(state,snap))}`;
    }
    function record(id){const r=state.records.find(r=>r.id===id);show(id+' · 处理详情',`<div class="pms-summary"><span>MAX 任务：${r.taskNo}</span><span>接入记录：${r.orderNo}</span><span>商家店铺：${esc(r.shop)}</span><span>型号：${esc(modelName(r.model))} / ${r.model}</span><span>报告：${r.report} / ${r.reportVersion}</span><span>质检版本：${r.factVersion}；标单／轮次：${esc(r.lot)}</span><span>MAX 原始值：${esc(r.maxRaw)}</span><span>真实值来源：${esc(r.actualSource)}</span><span>确认规则：${r.confirmationRule}</span><span>确认人／时间：${esc(r.confirmedBy)} / ${time(r.confirmedAt)}</span><span>配置快照：${r.snapshot.id}</span><span>执行时间：${time(r.context.at)}</span><span>原处理记录：${r.parentId||'无'}</span><span>尝试次数：${r.attempts}</span><span>价格快照：${r.frozen?'已冻结':'尚未生成'}</span></div><details><summary>配置、来源集合和输入快照</summary><pre>${esc(JSON.stringify(r.snapshot,null,2))}</pre></details>${resultHtml(r.result)}<p class="pms-note">示例尚未生成商品码及 BI 取价结果；取价失败不影响有效报告发布。</p>`,permission==='maintain'&&!r.frozen?button('retry','按原快照重试',id)+button('reprocess','按新配置重新处理',id,'primary'):'');}
    function reprocessConfirm(id){const r=state.records.find(r=>r.id===id),snap=snapshot(state,{...clone(r.context),at:new Date().toISOString()});editor={recordId:id,configRevision:state.revision};show('确认按新配置重新处理',`<p>将为两组创建新的处理记录，保留 ${id} 的原输入、结果和快照。</p><table class="table"><thead><tr><th>内容</th><th>原配置</th><th>新配置</th></tr></thead><tbody><tr><td>快照</td><td>${r.snapshot.id}</td><td>${snap.id}</td></tr><tr><td>规则版本</td><td>${r.snapshot.ruleVersions.map(esc).join('<br>')}</td><td>${snap.ruleVersions.map(esc).join('<br>')}</td></tr><tr><td>来源集合</td><td>${r.snapshot.sourceSets.map(s=>`${s.ppn} V${s.version}`).join('<br>')}</td><td>${snap.sourceSets.map(s=>`${s.ppn} V${s.version}`).join('<br>')}</td></tr></tbody></table><p class="pms-note">此操作不修改真实质检、报告或已冻结价格。</p>`,button('reprocess-confirm','确认重新处理','','primary'));}
    function act(event){const b=event.target.closest('[data-pms]');if(!b)return;const action=b.dataset.pms,id=b.dataset.id;
      try{
        if(action==='close'){dialog.close();return;}
        if(action==='tab'){tab=id;filter={keyword:'',model:'',channel:'',source:'',status:''};render();return;}
        if(action==='search'){filter={keyword:$('#pmsKeyword').value.trim(),model:$('#pmsModelFilter').value,channel:$('#pmsChannelFilter').value,source:$('#pmsSourceFilter').value.trim(),status:$('#pmsStatusFilter').value};render();return;}
        if(action==='reset'){filter={keyword:'',model:'',channel:'',source:'',status:''};render();return;}
        if(action==='history'){history(id);return;}if(action==='preview'){preview();return;}if(action==='draft-preview'){preview(id);return;}if(action==='preview-run'){runPreview();return;}
        if(action==='record'){record(id);return;}
        if(action==='source-history'){const s=state.sourceSets.find(s=>s.ppn===id);show('来源集合历史版本',[...s.history,{...s,history:undefined}].reverse().map(v=>`<section class="pms-version"><h3>V${v.version}</h3><p>${v.values.map(id=>esc(sourceName(id))).join('、')}</p><p>${esc(v.reason)} · ${esc(v.operator)} · ${time(v.updatedAt)}</p></section>`).join(''));return;}
        checkPermission(permission);refresh();
        if(action==='new'||action==='edit'){openEditor(id);return;}
        if(action==='save'){saveRule(state,readDraft(),editor.id,editor.revision,permission);persist();dialog.close();render();notify('已保存草稿，启用后生效');return;}
        if(action==='enable'||action==='disable'){lifecycle(id,action);return;}
        if(action==='lifecycle-save'){const reason=$('#pmLifecycleReason').value;if(editor.action==='enable')enableRule(state,editor.id,editor.version,editor.revision,reason,permission);else disableRule(state,editor.id,editor.revision,reason,permission);persist();dialog.close();render();notify('规则状态已更新，历史快照保留');return;}
        if(action==='sources-edit'){sourcesEditor();return;}
        if(action==='sources-save'){saveSources(state,$('#psCountry').value,$('#psPpn').value,selected('#psSelected'),$('#psReason').value,editor.revision,permission);persist();dialog.close();render();notify('来源集合已保存新版本');return;}
        if(action==='retry'){retryRecord(state,id,permission);persist();render();record(id);return;}
        if(action==='reprocess'){reprocessConfirm(id);return;}
        if(action==='reprocess-confirm'){if(editor.configRevision!==state.revision)throw Error('配置已变化，请关闭后重新查看差异再确认。');const r=reprocess(state,editor.recordId,permission);persist();render();record(r.id);return;}
      }catch(e){if(dialog.open)error(e.message);else notify(e.message);}
    }
    page.addEventListener('click',act);dialog.addEventListener('click',act);
    page.addEventListener('change',e=>{if(e.target.id==='pmsPermission'){permission=e.target.value;render();}if(e.target.id==='pmsRecordStatus')recordRows();});
    dialog.addEventListener('change',e=>{
      if(e.target.id==='pmSourcePpn')renderValueFields();if(e.target.id==='pmTargetPpn')targetOptions();
      if(['pmModelMode','pmChannelMode'].includes(e.target.id))syncScopes();
      if(e.target.id==='pmCountry'){$$('#pmChannels option').forEach(o=>o.selected=false);renderValueFields();}
      if(['psPpn','psCountry'].includes(e.target.id))sourceChoices();
      if(e.target.id==='pmBrand'){$('#pmSeries').value='';$('#pmSeries').innerHTML=option('','全部系列')+[...new Set(models.filter(m=>!e.target.value||m.brand===e.target.value).map(m=>m.series))].map(s=>option(s,s)).join('');filterModels();}
      if(e.target.id==='pmSeries')filterModels();
    });
    function filterModels(){const brand=$('#pmBrand').value,series=$('#pmSeries').value,q=$('#pmModelSearch').value.toLowerCase();$$('#pmModels label').forEach(label=>{const m=models.find(m=>m.id===label.dataset.model);label.hidden=Boolean((brand&&m.brand!==brand)||(series&&m.series!==series)||(q&&!m.name.toLowerCase().includes(q)));});}
    dialog.addEventListener('input',e=>{if(e.target.id==='pmModelSearch')filterModels();});
    win.addEventListener('storage',e=>{if(e.key===KEY){refresh();if(!dialog.open)render();}});
    // Keep existing navigation entry points, replace only their mapping-module renderer.
    win.renderMappingRules=render;win.applyMappingFilters=()=>render();win.resetMappingFilters=()=>{filter={keyword:'',model:'',channel:'',source:'',status:''};render();};
    win.openMappingRuleModal=()=>{checkPermission(permission);openEditor();};
    win.prototypeState.pmsMapping={getState:()=>clone(state),getPermission:()=>permission,render};
    render();
    win.setInterval(()=>{if(page.classList.contains('active')&&!dialog.open&&!page.contains(win.document.activeElement))render();},60000);
  }
  return {SOURCE,TARGET,KEY,models,channels,attributes,seed,status,active,latest,validate,saveRule,enableRule,disableRule,saveSources,snapshot,evaluate,confirmation,retryRecord,reprocess,mount};
});
