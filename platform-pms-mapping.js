/* Unified overseas attribute configuration; UI and storage are scoped to this module. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root?.document){root.PmsMapping=api;api.mount(root);}})(typeof window==='undefined'?null:window,function(){
'use strict';
const KEY='fs-pms-special-attributes-v2', LEGACY_KEY='fs-pms-special-attributes-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const categories=[{id:'PHONE',name:'手机',source:'DEMO-PHONE-L2',target:'DEMO-PHONE-L1'},{id:'LAPTOP',name:'笔记本',source:'DEMO-LAPTOP-L2',target:'DEMO-LAPTOP-L1'}];
const models=[{id:'101',category:'PHONE',name:'iPhone 15',brand:'Apple',series:'iPhone 15'},{id:'102',category:'PHONE',name:'iPhone 14 Pro',brand:'Apple',series:'iPhone 14'},{id:'201',category:'PHONE',name:'Samsung Galaxy S24',brand:'Samsung',series:'Galaxy S24'},{id:'301',category:'LAPTOP',name:'MacBook Pro 14',brand:'Apple',series:'MacBook Pro'},{id:'302',category:'LAPTOP',name:'ThinkPad X1 Carbon',brand:'Lenovo',series:'ThinkPad'}];
const channels=[{id:'STORE',name:'门店渠道'},{id:'PARTNER',name:'合作渠道'}];
// IDs and laptop dictionary entries are illustrative, not verified production PMS values.
const attributes=[
{id:'P2-CHANNEL',category:'PHONE',name:'购买渠道',targetId:'P1-CHANNEL',values:[{id:'P2-CN',name:'大陆国行'},{id:'P2-DISPLAY',name:'国行展示机'},{id:'P2-HK',name:'港澳台版'},{id:'P2-REPLACE',name:'国行官换机'},{id:'P2-RESOURCE',name:'国行资源机'},{id:'P2-US-UNLOCK',name:'美版-无锁'},{id:'P2-US-LOCK',name:'美版-有锁'},{id:'P2-OTHER',name:'其他版本',requiresConfirmation:true}],targets:[{id:'P1-CN',name:'大陆国行'},{id:'P1-HK',name:'港澳台版',models:['101','102']},{id:'P1-RETIRED',name:'旧取价选项（已失效示例）',valid:false}]},
{id:'P2-COLOR',category:'PHONE',name:'机身颜色',targetId:'P1-COLOR',values:[{id:'P2-BLACK',name:'黑色'},{id:'P2-WHITE',name:'白色'}],targets:[{id:'P1-BLACK',name:'黑色'},{id:'P1-WHITE',name:'白色'}]},
{id:'N2-KEYBOARD',category:'LAPTOP',name:'键盘布局',targetId:'N1-KEYBOARD',values:[{id:'N2-CN',name:'中文键盘'},{id:'N2-US',name:'美式键盘'},{id:'N2-OTHER',name:'其他键盘布局',requiresConfirmation:true}],targets:[{id:'N1-CN',name:'中文键盘'},{id:'N1-US',name:'美式键盘'}]},
{id:'N2-CHANNEL',category:'LAPTOP',name:'购买渠道',targetId:'N1-CHANNEL',values:[{id:'N2-DOMESTIC',name:'国内渠道'},{id:'N2-OVERSEAS',name:'海外渠道',requiresConfirmation:true}],targets:[{id:'N1-DOMESTIC',name:'国内渠道'}]}
];
const category=id=>categories.find(c=>c.id===id), model=id=>models.find(m=>m.id===id), attr=id=>attributes.find(a=>a.id===id||a.targetId===id);
const source=id=>{for(const a of attributes){const v=a.values.find(v=>v.id===id);if(v)return {...v,ppn:a.id,category:a.category};}};
const target=id=>{for(const a of attributes){const v=a.targets.find(v=>v.id===id);if(v)return {...v,ppn:a.targetId,category:a.category};}};
const instant=x=>x?Date.parse(x):Infinity;
const begins=v=>Math.max(instant(v.start),v.activatedAt?instant(v.activatedAt):-Infinity);
const ends=v=>Math.min(instant(v.end),instant(v.disabledAt),instant(v.replacedAt));
function status(v,at=Date.now()){if(!v.enabled)return '草稿';if(v.disabledAt&&instant(v.disabledAt)<=at)return '停用';if(v.replacedAt&&instant(v.replacedAt)<=at)return '已替换';if(instant(v.end)<=at)return '已过期';return begins(v)>at?'待生效':'启用';}
const latest=r=>r.versions.at(-1), active=(r,at=Date.now())=>r.versions.find(v=>status(v,at)==='启用');
const scopes=v=>v.models.length?v.models:models.filter(m=>m.category===v.category).map(m=>m.id);
const validFor=(v,id)=>!!v&&v.valid!==false&&!!model(id)&&(!v.category||v.category===model(id).category)&&(!v.models?.length||v.models.includes(id));
const detailFor=(d,id)=>d.valid!==false&&(!d.models.length||d.models.includes(id));
const needsExtra=v=>v.details.some(d=>d.code||d.name);
const overlap=(a,b)=>!a.length||!b.length||a.some(x=>b.includes(x));
const sameBase=(a,b)=>a.country===b.country&&a.category===b.category&&a.sourceStandard===b.sourceStandard&&a.sourcePpn===b.sourcePpn&&a.triggerPpv===b.triggerPpv;
function permission(p){if(p!=='maintain')throw Error('当前仅有查看权限，无法修改配置。');}
function audit(s,action,id,version,reason,at){s.revision++;s.audit.unshift({action,id,version,reason,operator:'贾瑞真',at});}
function validate(s,v,enabling=false,excludeId='',at=Date.now()){
 if(!v.name.trim()||!v.reason.trim())return '请填写规则名称及修改原因。';
 const cat=category(v.category),a=attr(v.sourcePpn),pv=source(v.triggerPpv);
 if(v.country!=='MY'||!cat)return '请选择国家和品类。';
 if(v.sourceStandard!==cat.source||v.targetStandard!==cat.target)return '属性标准与品类不一致。';
 if(!a||a.category!==v.category||pv?.ppn!==v.sourcePpn)return '属性项、触发属性值须属于当前品类的二级模板。';
 if(a.targetId!==v.targetPpn)return '取价目标属性项须为同品类、同一业务属性的一级属性项。';
 if(v.models.some(id=>model(id)?.category!==v.category)||v.channels.some(id=>!channels.some(c=>c.id===id)))return '型号或渠道范围无效，不允许跨品类引用。';
 if(!Number.isInteger(v.priority)||v.priority<1)return '优先级须为正整数，数字越小越优先。';
 if(!Number.isFinite(instant(v.start))||(v.end&&(!Number.isFinite(instant(v.end))||instant(v.end)<=instant(v.start))))return '生效时间无效，结束时间须晚于开始时间。';
 if(!v.details.length)return '请至少添加一行映射明细。';
 const extra=needsExtra(v),codes=new Set(),names=new Set();
 if(!extra&&(v.details.length!==1||pv.requiresConfirmation))return '需要补充确认的触发值必须配置具体附加值；直接映射只能保留一行空附加值。';
 for(const d of v.details){
  if(extra&&!d.name.trim())return '附加属性值不能为空，不能混用附加确认和直接映射明细。';
  if(d.code&&(codes.has(d.code)||source(d.code)||target(d.code)))return '附加编码重复或与 PMS 编码混用。';
  if(extra&&names.has(d.name.trim()))return '同一规则的附加属性值名称不能重复。';
  if(d.code){const registered=s.extraCatalog.find(x=>x.code===d.code);if(!registered||!sameBase(registered,v))return '附加编码不属于当前品类和触发条件，请重新添加明细。';codes.add(d.code);}
  names.add(d.name.trim());
  if(d.models.some(id=>!scopes(v).includes(id)))return '明细适用型号不能超出规则范围。';
  if(target(d.targetPpv)?.ppn!==v.targetPpn)return '每行须选择对应一级属性项下的取价映射值。';
 }
 if(enabling){
  if(instant(v.end)<=at)return '规则已过期，不能启用。';
  const applicable=scopes(v).filter(id=>validFor(pv,id));if(!applicable.length)return '触发属性值已失效或不适用于所选型号。';
  for(const id of applicable){const rows=v.details.filter(d=>detailFor(d,id));if(!rows.length)return '所选型号下没有有效附加选项。';if(rows.some(d=>!validFor(target(d.targetPpv),id)))return '取价映射值已失效或不支持明细适用型号。';}
  const conflicts=[];
  s.rules.filter(r=>r.id!==excludeId).forEach(r=>r.versions.forEach(w=>{if(w.enabled&&sameBase(w,v)&&w.priority===v.priority&&overlap(v.channels,w.channels)&&overlap(v.models,w.models)&&Math.max(instant(v.start),at)<ends(w)&&begins(w)<instant(v.end))conflicts.push(`${r.id} / V${w.version}（渠道 ${w.channels.join('、')||'全部'}；型号 ${w.models.map(id=>model(id)?.name||id).join('、')||'本品类全部'}；${w.start} 至 ${w.end||'长期'}）`);}));
  if(conflicts.length)return '同优先级规则范围重叠：'+conflicts.join('；')+'。附加选项不同也不能同时启用，可保存草稿。';
 }
 return '';
}
function saveRule(s,draft,id,expectedRevision,p='maintain',at=new Date().toISOString()){
 permission(p);const rule=s.rules.find(r=>r.id===id);if(id&&(!rule||rule.revision!==expectedRevision))throw Error('配置已被更新，请刷新后提交。');
 const v=clone(draft),error=validate(s,v);if(error)throw Error(error);
 v.details.forEach(d=>{if(d.name&&!d.code)d.code='EXT-'+String(s.extraSerial++).padStart(5,'0');if(d.code&&!s.extraCatalog.some(x=>x.code===d.code))s.extraCatalog.push({code:d.code,country:v.country,category:v.category,sourceStandard:v.sourceStandard,sourcePpn:v.sourcePpn,triggerPpv:v.triggerPpv});d.targetName=target(d.targetPpv).name;});
 v.sourceName=source(v.triggerPpv).name;v.attributeName=attr(v.sourcePpn).name;v.version=rule?latest(rule).version+1:1;v.enabled=false;['disabledAt','replacedAt','activatedAt','activationReason'].forEach(k=>delete v[k]);v.updatedAt=at;v.operator='贾瑞真';
 const r=rule||{id:'OMAP-'+String(s.serial++).padStart(4,'0'),revision:0,createdAt:at,createdBy:'贾瑞真',versions:[]};if(!rule)s.rules.unshift(r);r.versions.push(v);r.revision++;audit(s,'保存整条规则草稿',r.id,v.version,v.reason,at);return r;
}
function registerCoverage(s,v,at){
 let c=s.coverage.find(c=>sameBase(c,v));if(!c){c={country:v.country,category:v.category,sourceStandard:v.sourceStandard,sourcePpn:v.sourcePpn,triggerPpv:v.triggerPpv,codes:[],version:0,history:[]};s.coverage.push(c);}else c.history.push(clone({...c,history:undefined}));
 c.codes=[...new Set([...c.codes,...v.details.map(d=>d.code).filter(Boolean)])];c.version++;c.at=at;
}
function enableRule(s,id,version,expectedRevision,reason,p='maintain',at=new Date().toISOString()){
 permission(p);const r=s.rules.find(r=>r.id===id);if(!r||r.revision!==expectedRevision)throw Error('规则版本已变化，请刷新。');const v=r.versions.find(v=>v.version===version);if(!v||v.enabled)throw Error('请选择未启用的草稿。');if(!reason.trim())throw Error('请填写启用原因。');
 const error=validate(s,{...v,reason},true,id,instant(at));if(error)throw Error(error);
 if(r.versions.some(w=>status(w,instant(at))==='待生效'))throw Error('已有待生效版本，请先停用该编号后再启用。');
 const start=Math.max(instant(v.start),instant(at));r.versions.filter(w=>status(w,instant(at))==='启用').forEach(w=>w.replacedAt=new Date(start).toISOString());v.enabled=true;v.activatedAt=at;v.activationReason=reason;r.revision++;registerCoverage(s,v,at);audit(s,'启用整条规则',id,version,reason,at);
}
function disableRule(s,id,expectedRevision,reason,p='maintain',at=new Date().toISOString()){
 permission(p);const r=s.rules.find(r=>r.id===id);if(!r||r.revision!==expectedRevision)throw Error('规则版本已变化，请刷新。');if(!reason.trim())throw Error('请填写停用原因。');r.versions.filter(v=>['启用','待生效'].includes(status(v,instant(at)))).forEach(v=>v.disabledAt=at);r.revision++;audit(s,'停用整条规则及待生效版本',id,null,reason,at);
}
function snapshot(s,context,draft=null){
 const rules=s.rules.flatMap(r=>r.versions.filter(v=>status(v,instant(context.at))==='启用').map(v=>({...clone(v),id:r.id})));
 if(draft){const v=clone(draft);rules.splice(0,rules.length,...rules.filter(r=>r.id!==v.id));['disabledAt','replacedAt','activatedAt'].forEach(k=>delete v[k]);rules.push({...v,enabled:true});}
 const coverage=s.coverage.flatMap(c=>{const v=[...c.history,c].filter(v=>instant(v.at)<=instant(context.at)).sort((a,b)=>b.version-a.version)[0];return v?[clone({...v,history:undefined})]:[];});
 return {id:`SNAP-${s.revision}`,at:context.at,context:clone(context),rules,coverage,ruleVersions:rules.map(v=>`${v.id} / V${v.version}`)};
}
function resolve(snap,item){
 const c=snap.context,pv=source(item.ppv);if(!category(c.category)||model(c.model)?.category!==c.category||!validFor(pv,c.model)||pv.category!==c.category||(item.standard&&item.standard!==category(c.category).source))return {error:'品类、型号、属性值或标准不一致',options:[],matches:[]};
 const matches=snap.rules.filter(v=>v.category===c.category&&v.country===c.country&&v.sourceStandard===category(c.category).source&&v.sourcePpn===pv.ppn&&v.triggerPpv===item.ppv&&(!v.channels.length||v.channels.includes(c.channel))&&(!v.models.length||v.models.includes(c.model))&&begins(v)<=instant(c.at)&&instant(c.at)<ends(v)).sort((a,b)=>a.priority-b.priority);
 const top=matches[0],covered=snap.coverage.some(v=>v.category===c.category&&v.country===c.country&&v.sourcePpn===pv.ppn&&v.triggerPpv===pv.id);
 if(!top)return {error:covered||pv.requiresConfirmation?'待补映射：没有生效规则':'',ordinary:!covered&&!pv.requiresConfirmation,options:[],matches};
 if(matches[1]?.priority===top.priority)return {error:'最高优先级并列，不能随机选择',options:[],matches};
 const options=top.details.filter(d=>detailFor(d,c.model));return {top,matches,options,needsExtra:needsExtra(top),error:options.length?'':'当前型号无有效附加选项'};
}
function confirmation(snap,item){const r=resolve(snap,item);if(r.error)return {...r,status:'配置异常'};if(r.ordinary||!r.needsExtra)return {...r,status:'无需附加确认'};const chosen=r.options.find(d=>d.code===item.extraCode);return {...r,status:chosen?'已确认':'待人工确认',chosen};}
function evaluate(s,snap){
 const result={};for(const group of ['actual','baseline']){
  const items=[],mapped=[],remaining=[],errors=[];if(!(snap.context.inputs[group]||[]).length)errors.push('来源属性为空');
  for(const input of snap.context.inputs[group]||[]){const pv=source(input.ppv),r=resolve(snap,input),item={sourcePpv:input.ppv,sourcePpn:pv?.ppn,sourceStandard:category(snap.context.category)?.source,extraCode:input.extraCode||'',candidates:r.matches.map(v=>`${v.id} / V${v.version}（优先级 ${v.priority}）`)};items.push(item);
   const fail=message=>{item.status=message.startsWith('待补映射')?'待补映射':'停止取价';item.reason=message;errors.push(message);};
   if(r.error){fail(r.error);continue;}
   if(r.ordinary){if(input.extraCode){fail('没有对应规则，不能使用附加属性值');continue;}item.status='无需海外映射';remaining.push({standard:item.sourceStandard,ppn:pv.ppn,ppv:pv.id});continue;}
   const v=r.top;item.rule=`${v.id} / V${v.version}`;item.priority=v.priority;
   const d=r.needsExtra?r.options.find(d=>d.code===input.extraCode):r.options[0];
   if(!d||(!r.needsExtra&&input.extraCode)){fail('附加属性值未选择或不属于命中版本，不回退其他规则');continue;}
   item.extraName=d.name;item.confirmationComplete=true;
   if(target(d.targetPpv)?.ppn!==v.targetPpn||!validFor(target(d.targetPpv),snap.context.model)){fail('取价映射值失效或型号不适用；真实确认保留，不回退目标');continue;}
   item.status='已映射';item.targetPpn=v.targetPpn;item.targetPpv=d.targetPpv;item.targetStandard=v.targetStandard;item.mapped=true;mapped.push(clone(item));
  }
  const targets=new Map();mapped.forEach(i=>{if(targets.has(i.targetPpn)&&targets.get(i.targetPpn)!==i.targetPpv)errors.push('同一一级属性存在冲突值');targets.set(i.targetPpn,i.targetPpv);});
  result[group]={status:errors.length?'停止该组取价':'映射完成，待 PMS 转换／校验',items,mapped,remaining,errors,canRequestProductCode:false};
 }return result;
}
function retryRecord(s,id,p='maintain'){permission(p);const r=s.records.find(r=>r.id===id);if(!r||r.frozen)throw Error('记录不存在或价格已冻结。');r.result=evaluate(s,r.snapshot);r.attempts++;audit(s,'按原快照重试',id,null,'保留原输入和规则版本',new Date().toISOString());return r;}
function reprocess(s,id,p='maintain',at=new Date().toISOString()){permission(p);const old=s.records.find(r=>r.id===id);if(!old||old.frozen)throw Error('记录不存在或价格已冻结。');const context={...clone(old.context),at},snap=snapshot(s,context),r={...clone(old),id:'RUN-'+String(s.records.length+1).padStart(4,'0'),parentId:id,context,snapshot:snap,result:evaluate(s,snap),createdAt:at,attempts:1};s.records.unshift(r);audit(s,'按新配置重新处理',r.id,null,`关联 ${id}`,at);return r;}
function seed(){
 const t='2026-09-14T07:00:00Z',early='2026-01-01T00:00:00Z';
 const v={version:1,name:'其他版本补充与取价',category:'PHONE',country:'MY',channels:[],models:[],sourceStandard:'DEMO-PHONE-L2',sourcePpn:'P2-CHANNEL',triggerPpv:'P2-OTHER',targetStandard:'DEMO-PHONE-L1',targetPpn:'P1-CHANNEL',details:[{code:'EXT-00001',name:'马来版',targetPpv:'P1-CN',models:[]},{code:'EXT-00002',name:'新加坡版',targetPpv:'P1-CN',models:[]}],prompt:'请选择具体版本',priority:100,start:early,end:'',enabled:true,updatedAt:early,operator:'贾瑞真',reason:'初始化演示'};
 const old={...clone(v),replacedAt:t};old.details[0].targetPpv='P1-RETIRED';const current={...clone(v),version:2,start:t,updatedAt:t,reason:'更新有效取价目标'};
 const specific={...clone(v),name:'iPhone 15 版本映射',models:['101'],priority:10,start:t,updatedAt:t};
 const notebook={...clone(v),name:'笔记本键盘布局映射（示例）',category:'LAPTOP',sourceStandard:'DEMO-LAPTOP-L2',targetStandard:'DEMO-LAPTOP-L1',sourcePpn:'N2-KEYBOARD',triggerPpv:'N2-OTHER',targetPpn:'N1-KEYBOARD',details:[{code:'EXT-00003',name:'马来西亚键盘布局',targetPpv:'N1-US',models:[]}],prompt:'请选择具体键盘布局',start:t,updatedAt:t};
 const s={schema:2,revision:1,serial:4,extraSerial:4,rules:[{id:'OMAP-0001',revision:2,versions:[old,current],createdAt:early,createdBy:'贾瑞真'},{id:'OMAP-0002',revision:1,versions:[specific],createdAt:t,createdBy:'贾瑞真'},{id:'OMAP-0003',revision:1,versions:[notebook],createdAt:t,createdBy:'贾瑞真'}],extraCatalog:[],coverage:[],records:[],audit:[]};
 for(const rule of [v,notebook]){rule.details.forEach(d=>s.extraCatalog.push({code:d.code,country:rule.country,category:rule.category,sourceStandard:rule.sourceStandard,sourcePpn:rule.sourcePpn,triggerPpv:rule.triggerPpv}));registerCoverage(s,rule,early);}
 const context={category:'PHONE',country:'MY',channel:'STORE',model:'101',at:'2026-09-13T07:00:00Z',inputs:{actual:[{ppv:'P2-OTHER',extraCode:'EXT-00001'},{ppv:'P2-BLACK'}],baseline:[{ppv:'P2-CN'},{ppv:'P2-BLACK'}]}};const snap=snapshot(s,context);
 s.records.push({id:'RUN-0001',taskNo:'MAX-DEMO-001',orderNo:'INSP-DEMO-001',shop:'KL 演示店铺',report:'REPORT-DEMO-001 / V1',factVersion:'V1',maxRaw:'其他版本',confirmedBy:'原操作人（演示）',confirmedAt:context.at,confirmationRule:'OMAP-0001 / V1',lot:'尚未发布',context,snapshot:snap,result:evaluate(s,snap),createdAt:context.at,attempts:1,frozen:false});return s;
}
function mount(win){
 const page=win.document.getElementById('mappingRulePage');if(!page)return;
 const $=s=>win.document.querySelector(s),$$=s=>[...win.document.querySelectorAll(s)],esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const name=id=>model(id)?.name||id,catName=id=>category(id)?.name||id,pvName=id=>source(id)?.name||'失效属性值',targetName=id=>target(id)?.name||'失效取价值';
 const time=x=>x?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(x)):'长期';
 const local=x=>new Date(instant(x)+8*3600000).toISOString().slice(0,19),fromLocal=x=>x?(x.length===16?x+':00':x)+'+08:00':'';
 const option=(value,label,selected)=>`<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;
 const options=(items,value,placeholder='请选择')=>option('',placeholder)+items.map(x=>option(x.id,x.name+(x.valid===false?'（已失效）':''),x.id===value)).join('')+(value&&!items.some(x=>x.id===value)?option(value,`已失效／不适用（${value}）`,true):'');
 const input=(id,value='',type='text',extra='')=>`<input class="control" id="${id}" type="${type}" value="${esc(value)}" ${extra}>`;
 const field=(label,body,wide=false)=>`<div class="field ${wide?'pms-span':''}"><label>${label}</label>${body}</div>`;
 const button=(action,label,id='',style='')=>`<button class="btn ${style}" data-pms="${action}" data-id="${esc(id)}">${label}</button>`;
 const pill=s=>`<span class="pms-status ${['启用','已映射','已确认'].includes(s)?'ok':['草稿','待生效','待人工确认'].includes(s)?'pending':s.includes('异常')||s.includes('停止')||s==='待补映射'?'bad':''}">${esc(s)}</span>`;
 const multi=(id,items,values)=>`<select id="${id}" class="control pms-multi" multiple>${items.map(x=>option(x.id,x.name,values.includes(x.id))).join('')}${values.filter(v=>!items.some(x=>x.id===v)).map(v=>option(v,`不在当前范围（${name(v)}）`,true)).join('')}</select>`;
 const selected=id=>[...$(id).selectedOptions].map(o=>o.value);
 let state;try{state=JSON.parse(win.localStorage.getItem(KEY));}catch{}if(state?.schema!==2||!Array.isArray(state.rules))state=seed();
 let tab='rules',access='maintain',editor={},filter={keyword:'',category:'',model:'',channel:'',trigger:'',extra:'',status:''};
 const dialog=win.document.createElement('dialog');dialog.id='pmsMappingDialog';dialog.className='pms-dialog';win.document.body.append(dialog);
 function refresh(){try{const v=JSON.parse(win.localStorage.getItem(KEY));if(v?.schema===2&&v.revision>state.revision)state=v;}catch{}}
 function persist(){win.localStorage.setItem(KEY,JSON.stringify(state));}
 function notify(s){if(win.toast)win.toast(s);}
 function error(s){$('#pmsError').textContent=s;$('#pmsError').hidden=false;}
 function show(title,body,footer=''){dialog.innerHTML=`<header><div><small>PMS 属性映射规则</small><h2>${esc(title)}</h2></div><button class="pms-close" data-pms="close" aria-label="关闭">×</button></header><div class="pms-dialog-body">${body}<p id="pmsError" class="pms-error" role="alert" hidden></p></div><footer>${button('close','关闭')}${footer}</footer>`;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
 function detailsHtml(v){return `<div class="pms-pairs">${v.details.map(d=>`<div><span>${esc(d.name||'直接映射')}<small>${esc(d.code||'无需附加确认')}${d.models.length?' · '+esc(d.models.map(name).join('、')):''}</small></span><span class="pms-arrow">→</span><span>${esc(d.targetName||targetName(d.targetPpv))}<small>${esc(d.targetPpv)}</small></span></div>`).join('')}</div>`;}
 function render(){
  refresh();const rules=state.rules;
  page.innerHTML=`<div class="page-title"><div><h1>PMS 属性映射规则</h1><p class="subtle">按品类维护触发条件及附加属性值的取价关系</p></div><div class="page-actions"><label class="pms-permission">演示权限 <select id="pmsPermission" class="control">${option('maintain','查看与维护',access==='maintain')}${option('view','仅查看',access==='view')}</select></label>${button('preview','命中预览')}${access==='maintain'&&tab==='rules'?button('new','＋ 新增规则','','primary'):''}</div></div>
  <div class="pms-note">品类 ＋ 属性项 ＋ 触发属性值 → 店员选择附加属性值 → 对应取价映射值。整条规则及所有明细共用编号、版本和生效时间。</div>
  <div class="pms-tabs" role="tablist">${[['rules','规则配置'],['records','异常记录']].map(([id,label])=>`<button role="tab" aria-selected="${tab===id}" class="${tab===id?'active':''}" data-pms="tab" data-id="${id}">${label}</button>`).join('')}</div>
  <div id="pmsContent"></div><p class="pms-footnote">当前为演示字典、编码及处理记录，未接入 PMS；笔记本选项仅示意品类联动。规则保存在当前浏览器。${win.localStorage.getItem(LEGACY_KEY)?'旧版演示配置原样保留，未自动转换为新规则。':''}</p>`;
  if(tab==='records'){renderRecords();return;}
  $('#pmsContent').innerHTML=`<div class="metric-grid pms-metrics">${[[rules.length,'规则总数'],[rules.filter(r=>active(r)).length,'当前启用'],[rules.filter(r=>r.versions.some(v=>status(v)==='待生效')).length,'待生效'],[rules.filter(r=>status(latest(r))==='草稿').length,'最新版本为草稿']].map(([n,t])=>`<div class="metric"><div class="metric-label">${t}</div><div class="metric-value">${n}</div></div>`).join('')}</div>
  <div class="card"><div class="card-body pms-filters">${field('编号／名称',input('pmsKeyword',filter.keyword))}${field('品类',`<select id="pmsCategoryFilter" class="control">${options(categories,filter.category,'全部品类')}</select>`)}${field('型号',`<select id="pmsModelFilter" class="control">${options(models.filter(m=>!filter.category||m.category===filter.category),filter.model,'全部型号')}</select>`)}${field('渠道',`<select id="pmsChannelFilter" class="control">${options(channels,filter.channel,'全部渠道')}</select>`)}${field('触发属性值',input('pmsTriggerFilter',filter.trigger))}${field('附加属性值',input('pmsExtraFilter',filter.extra))}${field('状态',`<select id="pmsStatusFilter" class="control">${options(['草稿','待生效','启用','停用','已过期'].map(s=>({id:s,name:s})),filter.status,'全部状态')}</select>`)}<div class="pms-filter-actions">${button('reset','重置')}${button('search','查询','','primary')}</div></div></div><div id="pmsRuleResults"></div>`;
  renderRows();
 }
 function readFilters(){filter={keyword:$('#pmsKeyword').value.trim(),category:$('#pmsCategoryFilter').value,model:$('#pmsModelFilter').value,channel:$('#pmsChannelFilter').value,trigger:$('#pmsTriggerFilter').value.trim(),extra:$('#pmsExtraFilter').value.trim(),status:$('#pmsStatusFilter').value};}
 function renderRows(){const rows=state.rules.filter(r=>{const v=latest(r);return (!filter.keyword||(r.id+' '+v.name).toLowerCase().includes(filter.keyword.toLowerCase()))&&(!filter.category||v.category===filter.category)&&(!filter.model||scopes(v).includes(filter.model))&&(!filter.channel||!v.channels.length||v.channels.includes(filter.channel))&&(!filter.trigger||(pvName(v.triggerPpv)+' '+v.triggerPpv).includes(filter.trigger))&&(!filter.extra||v.details.some(d=>(d.name+' '+d.code).includes(filter.extra)))&&(!filter.status||status(v)===filter.status||(filter.status==='启用'&&active(r)));});
  $('#pmsRuleResults').innerHTML=`<div class="card"><div class="card-head"><b>统一规则 · ${rows.length} 条</b>${button('coverage','查看映射覆盖范围','','link')}</div><div class="table-wrap"><table class="table pms-rules"><thead><tr><th>规则编号／名称</th><th>品类／适用范围</th><th>属性项／触发属性值</th><th>附加属性值 → 取价映射值</th><th>优先级</th><th>版本状态／时间</th><th>最近更新</th><th>操作</th></tr></thead><tbody>${rows.map(r=>{const v=latest(r),current=active(r);return `<tr><td><b>${r.id} / V${v.version}</b><div>${esc(v.name)}</div></td><td><b>${esc(catName(v.category))}</b><div>马来西亚 · ${esc(v.channels.length?v.channels.map(id=>channels.find(c=>c.id===id)?.name).join('、'):'全部渠道')}</div><small>${esc(v.models.length?v.models.map(name).join('、'):'本品类全部支持型号')}</small></td><td><b>${esc(attr(v.sourcePpn)?.name)}</b><div>${esc(pvName(v.triggerPpv))}</div><small>二级 · ${esc(v.sourcePpn)} / ${esc(v.triggerPpv)}</small></td><td>${detailsHtml(v)}</td><td><b>${v.priority}</b></td><td>${pill(status(v))}${current&&current.version!==v.version?`<small>当前生效 V${current.version}</small>`:''}<small>${time(v.start)}<br>至 ${time(v.end)}（MYT）</small></td><td>${esc(v.operator)}<small>${time(v.updatedAt)}</small></td><td><div class="pms-actions">${button('history','版本',r.id,'link')}${button('version-preview','预览',r.id,'link')}${access==='maintain'?button('edit','编辑',r.id,'link')+(status(v)==='草稿'?button('enable','启用',r.id,'link'):'')+(r.versions.some(w=>['启用','待生效'].includes(status(w)))?button('disable','停用',r.id,'link'):''):''}</div></td></tr>`;}).join('')||'<tr><td colspan="8" class="pms-empty">没有符合条件的规则</td></tr>'}</tbody></table></div></div>`;
 }
 function blankDetail(){return {code:'',name:'',targetPpv:'',models:[]};}
 function openEditor(id){
  refresh();const r=state.rules.find(r=>r.id===id),v=r?clone(latest(r)):{name:'',country:'MY',category:'',channels:[],models:[],sourceStandard:'',sourcePpn:'',triggerPpv:'',targetStandard:'',targetPpn:'',details:[blankDetail()],priority:100,prompt:'请选择具体版本',start:new Date().toISOString(),end:'',reason:''};
  editor={id:r?.id,revision:r?.revision,draft:v,direct:r?!needsExtra(v):false};
  show(r?'编辑统一规则 · 保存为新版本':'新增统一规则',`<div class="pms-note">一组触发条件下逐行维护“附加属性值—取价映射值”。保存为草稿；编辑不会立即替换生效版本。</div><div class="pms-form">
  ${field('规则编号／版本',input('pmId',r?`${r.id} / 新版本 V${v.version+1}`:'保存后自动生成','text','readonly'))}${field('规则名称 *',input('pmName',v.name))}
  ${field('国家／站点 *','<select id="pmCountry" class="control"><option value="MY">马来西亚</option></select>')}${field('渠道范围',`<select id="pmChannelMode" class="control">${option('all','全部渠道',!v.channels.length)}${option('selected','指定渠道',v.channels.length)}</select><div id="pmChannelChoices">${multi('pmChannels',channels,v.channels)}</div>`)}
  ${field('品类 *',`<select id="pmCategory" class="control">${options(categories,v.category,'请选择品类')}</select>`)}${field('适用型号范围',`<select id="pmModelMode" class="control">${option('all','本品类全部支持型号',!v.models.length)}${option('selected','指定型号',v.models.length)}</select>`)}
  <div id="pmModelChoices" class="pms-span"></div><div id="pmAttributeFields" class="pms-span"></div>
  <div class="pms-span"><div class="pms-detail-head"><div><b>映射明细</b><small>附加值由海外维护；取价映射值来自 PMS 一级字典。</small></div><label><input id="pmDirect" type="checkbox" ${editor.direct?'checked':''}> 无需附加确认，直接映射</label></div><div id="pmDetailRows"></div><div id="pmAddDetail">${button('detail-add','＋ 添加明细')}</div></div>
  ${field('确认提示',input('pmPrompt',v.prompt),true)}
  ${field('优先级 *',input('pmPriority',v.priority,'number','min="1" step="1"')+'<small>数字越小越优先；先选中整条规则，再读取明细。</small>')}${field('保存状态',input('pmStatus','草稿','text','readonly'))}
  ${field('生效开始时间 *（MYT / UTC+8）',input('pmStart',local(v.start),'datetime-local','step="1"'))}${field('生效结束时间（不含结束时刻）',input('pmEnd',v.end?local(v.end):'','datetime-local','step="1"')+'<small>不填表示长期有效。</small>')}
  ${field('修改原因 *','<textarea id="pmReason" class="control" rows="2" placeholder="填写本次修改原因"></textarea>',true)}</div>`,button('save','保存草稿','','primary'));
  renderModels();renderAttributes();renderDetails();syncScopes();
 }
 function renderModels(){const v=editor.draft,ms=models.filter(m=>m.category===v.category);$('#pmModelChoices').innerHTML=`<div class="pms-model-filters"><select id="pmBrand" class="control">${options([...new Set(ms.map(m=>m.brand))].map(x=>({id:x,name:x})),'','全部品牌')}</select><select id="pmSeries" class="control">${options([...new Set(ms.map(m=>m.series))].map(x=>({id:x,name:x})),'','全部系列')}</select>${input('pmModelSearch','','search','placeholder="搜索型号"')}</div><div id="pmModels">${ms.map(m=>`<label data-model="${m.id}"><input type="checkbox" value="${m.id}" ${v.models.includes(m.id)?'checked':''}> ${esc(m.name)}</label>`).join('')||'<span class="subtle">请先选择品类</span>'}</div>`;}
 function renderAttributes(){const v=editor.draft,attrs=attributes.filter(a=>a.category===v.category),a=attr(v.sourcePpn);$('#pmAttributeFields').innerHTML=`<div class="pms-form">${field('属性项 *',`<select id="pmAttribute" class="control">${options(attrs,v.sourcePpn,'请选择二级属性项')}</select>`)}${field('触发属性值 *',`<select id="pmTrigger" class="control">${options(a?.values||[],v.triggerPpv,'请选择二级触发属性值')}</select>`)}${field('取价目标属性项 *',`<select id="pmTargetAttribute" class="control">${options(a?[{id:a.targetId,name:a.name}]:[],v.targetPpn,'请选择一级目标属性项')}</select>`)}${field('属性标准',input('pmStandards',v.category?'PMS 二级 → 拍机堂一级':'先选择品类','text','readonly'))}</div>`;}
 function readDetails(){return $$('#pmDetailRows [data-detail-row]').map((row,i)=>({code:editor.draft.details[i]?.code||'',name:editor.direct?'':row.querySelector('[data-detail-name]').value.trim(),targetPpv:row.querySelector('[data-detail-target]').value,models:[...row.querySelector('[data-detail-models]').selectedOptions].map(o=>o.value)}));}
 function currentScope(){const id=$('#pmCategory').value;return $('#pmModelMode').value==='all'?models.filter(m=>m.category===id):models.filter(m=>$$('#pmModels input:checked').some(c=>c.value===m.id));}
 function renderDetails(){const v=editor.draft,ms=currentScope(),targets=attr(v.targetPpn)?.targets||[];$('#pmDetailRows').innerHTML=`<table class="table pms-detail-table"><thead><tr><th>附加属性值</th><th>取价映射值 *</th><th>明细适用型号</th><th></th></tr></thead><tbody>${v.details.map((d,i)=>`<tr data-detail-row="${i}"><td>${editor.direct?'<span class="subtle">留空 · 无需附加确认</span>':`<input class="control" data-detail-name value="${esc(d.name)}" placeholder="例如：马来版"><small>海外编码：${esc(d.code||'保存后生成')}</small>`}</td><td><select class="control" data-detail-target>${options(targets,d.targetPpv,'请选择一级取价映射值')}</select></td><td><select class="control pms-row-models" multiple data-detail-models>${ms.map(m=>option(m.id,m.name,d.models.includes(m.id))).join('')}${d.models.filter(id=>!ms.some(m=>m.id===id)).map(id=>option(id,`不在当前范围（${name(id)}）`,true)).join('')}</select><small>不选则跟随规则型号范围</small></td><td>${!editor.direct?button('detail-remove','移除',String(i),'link'):''}</td></tr>`).join('')}</tbody></table>`;$('#pmAddDetail').hidden=editor.direct;$('#pmPrompt').disabled=editor.direct;}
 function syncScopes(){$('#pmChannelChoices').hidden=$('#pmChannelMode').value==='all';$('#pmModelChoices').hidden=$('#pmModelMode').value==='all';}
 function captureDraft(){const v=editor.draft,cat=category($('#pmCategory').value);Object.assign(v,{name:$('#pmName').value.trim(),country:$('#pmCountry').value,category:cat?.id||'',sourceStandard:cat?.source||'',targetStandard:cat?.target||'',channels:$('#pmChannelMode').value==='all'?[]:selected('#pmChannels'),models:$('#pmModelMode').value==='all'?[]:$$('#pmModels input:checked').map(x=>x.value),sourcePpn:$('#pmAttribute').value,triggerPpv:$('#pmTrigger').value,targetPpn:$('#pmTargetAttribute').value,details:readDetails(),prompt:$('#pmPrompt').value.trim(),priority:Number($('#pmPriority').value),start:fromLocal($('#pmStart').value),end:fromLocal($('#pmEnd').value),reason:$('#pmReason').value.trim()});return v;}
 function history(id){const r=state.rules.find(r=>r.id===id);show(id+' · 历史版本',`<p class="subtle">创建人 ${esc(r.createdBy)} · ${time(r.createdAt)}</p>`+r.versions.slice().reverse().map(v=>`<section class="pms-version"><h3>V${v.version} ${pill(status(v))}</h3><div class="pms-summary"><span>名称：${esc(v.name)}</span><span>品类：${catName(v.category)}</span><span>国家：马来西亚 · 渠道：${esc(v.channels.join('、')||'全部')}</span><span>型号：${esc(v.models.map(name).join('、')||'本品类全部')}</span><span>属性项：${esc(attr(v.sourcePpn)?.name)} / ${esc(v.sourcePpn)}</span><span>触发属性值：${esc(v.sourceName||pvName(v.triggerPpv))}</span><span>优先级：${v.priority}</span><span>有效时间：${time(v.start)} 至 ${time(v.end)}</span><span>确认提示：${esc(v.prompt)}</span><span>原因：${esc(v.reason)} · ${esc(v.operator)} · ${time(v.updatedAt)}</span></div>${detailsHtml(v)}</section>`).join('')+'<h3>操作记录</h3>'+state.audit.filter(a=>a.id===id).map(a=>`<p>${time(a.at)} · ${esc(a.operator)} · ${esc(a.action)} · ${esc(a.reason)}</p>`).join(''));}
 function lifecycle(id,action){const r=state.rules.find(r=>r.id===id);editor={id,revision:r.revision,version:latest(r).version,action};show(action==='enable'?'启用整条规则':'停用整条规则',`<p><b>${id} / V${latest(r).version}</b> · ${esc(latest(r).name)}</p><p class="pms-note">${action==='enable'?'全部明细共用本次生效时间，新版本生效时整体替换原版本。启用前校验品类、型号、明细完整性和优先级冲突。':'同时停止当前及待生效版本；历史明细、命中记录和需映射范围保留。'}</p>${field('操作原因 *','<textarea id="pmLifecycleReason" class="control" rows="3"></textarea>')}`,button('lifecycle-save','确认'+(action==='enable'?'启用':'停用'),'','primary'));}
 function coverage(){show('映射覆盖范围',`<p class="pms-note">启用规则时登记覆盖范围，停用不会移除。该范围用于识别漏配，不维护另一套人工确认或映射关系。</p><table class="table"><thead><tr><th>品类</th><th>属性项／触发属性值</th><th>已登记附加编码</th><th>范围版本</th></tr></thead><tbody>${state.coverage.map(c=>`<tr><td>${catName(c.category)}</td><td>${esc(attr(c.sourcePpn)?.name)}／${esc(pvName(c.triggerPpv))}</td><td>${esc(c.codes.join('、')||'直接映射')}</td><td>V${c.version}<small>${time(c.at)}</small></td></tr>`).join('')}</tbody></table>`);}
 function preview(id){const r=state.rules.find(r=>r.id===id),v=r?{...clone(latest(r)),id}:null;editor={previewDraft:v,previewCategory:v?.category||'PHONE'};show(v?`${id} / V${v.version} · 版本预览`:'统一命中预览',`<p class="pms-note">先命中整条规则，再选择附加值并查看对应取价目标。${v?'本次临时使用所选版本，草稿不参与实际处理。':''}预览不创建商品码，不修改真实结果或价格。</p><div class="pms-form">${field('国家','<select id="pvCountry" class="control"><option value="MY">马来西亚</option></select>')}${field('品类',`<select id="pvCategory" class="control">${options(categories,editor.previewCategory)}</select>`)}${field('渠道',`<select id="pvChannel" class="control">${channels.map(c=>option(c.id,c.name)).join('')}</select>`)}${field('型号','<select id="pvModel" class="control"></select>')}${field('执行时间（MYT）',input('pvTime',local(new Date().toISOString()),'datetime-local','step="1"'),true)}</div><div id="pvGroups"></div><div id="pvOutput" class="pms-preview"></div>`,button('preview-run','执行预览','','primary'));$('#pvTime').dataset.initial=$('#pvTime').value;previewCategory();}
 function previewCategory(){const cat=$('#pvCategory').value,ms=models.filter(m=>m.category===cat);$('#pvModel').innerHTML=ms.map(m=>option(m.id,m.name)).join('');const values=attributes.filter(a=>a.category===cat).flatMap(a=>a.values.map(v=>({id:v.id,name:a.name+' · '+v.name})));const sourceId=editor.previewDraft?.category===cat?editor.previewDraft.triggerPpv:cat==='PHONE'?'P2-OTHER':'N2-OTHER';$('#pvGroups').innerHTML=`<div class="pms-preview-groups">${['actual','baseline'].map(g=>`<section class="pms-version"><h3>${g==='actual'?'本机实际质检':'基准值对照'}</h3>${field('二级属性值（可多选）',multi('pv-'+g,values,[sourceId,...(cat==='PHONE'?['P2-BLACK']:[])]))}<div id="pv-extra-${g}"></div></section>`).join('')}</div>`;previewExtras();}
 function previewContext(){const entered=$('#pvTime').value;return {category:$('#pvCategory').value,country:$('#pvCountry').value,channel:$('#pvChannel').value,model:$('#pvModel').value,at:entered===$('#pvTime').dataset.initial?new Date().toISOString():fromLocal(entered),inputs:{actual:[],baseline:[]}};}
 function previewExtras(){const c=previewContext();if(!category(c.category)||!c.model)return;const snap=snapshot(state,c,editor.previewDraft);for(const g of ['actual','baseline']){const ids=selected('#pv-'+g);$('#pv-extra-'+g).innerHTML=ids.map(id=>{const r=resolve(snap,{ppv:id});if(r.ordinary||(!r.error&&!r.needsExtra))return `<small>${esc(pvName(id))}：${r.ordinary?'交 PMS 常规转换':'无需附加确认'}</small>`;return `<label class="pms-preview-extra">${esc(pvName(id))} · 附加属性值<select class="control" data-preview-extra="${id}" data-group="${g}">${option('','请由店员明确选择')}${r.options.map(d=>option(d.code,d.name)).join('')}</select><small>${r.error?esc(r.error):`${r.top.id} / V${r.top.version} · 优先级 ${r.top.priority}`}</small></label>`;}).join('');}$('#pvOutput').innerHTML='';}
 function resultHtml(result){return ['actual','baseline'].map(g=>{const r=result[g];return `<section class="pms-version"><h3>${g==='actual'?'本机实际质检':'基准值对照'} ${pill(r.status)}</h3><table class="table"><thead><tr><th>属性项／触发属性值</th><th>附加属性值</th><th>取价映射值</th><th>规则／处理结果</th></tr></thead><tbody>${r.items.map(i=>`<tr><td>${esc(attr(i.sourcePpn)?.name)}<br>${esc(pvName(i.sourcePpv))}<small>${esc(i.sourcePpv)}</small></td><td>${esc(i.extraName||i.extraCode||'—')}<small>${esc(i.extraCode||'')}</small></td><td>${esc(i.targetPpv?targetName(i.targetPpv):'—')}<small>${esc(i.targetPpv||'')}</small></td><td>${pill(i.status)}<small>${esc(i.rule||'')}${i.reason?'<br>'+esc(i.reason):''}</small>${i.candidates.length?`<details><summary>候选规则与优先级</summary>${i.candidates.map(c=>`<p>${esc(c)}</p>`).join('')}</details>`:''}</td></tr>`).join('')}</tbody></table><p>剩余待标准转换：${r.remaining.map(i=>esc(pvName(i.ppv))).join('、')||'无'}</p>${r.errors.length?`<p class="pms-error">${esc(r.errors.join('；'))}</p>`:'<small>已映射一级值单独保留，完整结果仍须 PMS 转换／校验。</small>'}</section>`;}).join('');}
 function runPreview(){const c=previewContext();if(!Number.isFinite(instant(c.at)))throw Error('请选择有效执行时间。');for(const g of ['actual','baseline'])c.inputs[g]=selected('#pv-'+g).map(ppv=>({ppv,extraCode:dialog.querySelector(`[data-preview-extra="${ppv}"][data-group="${g}"]`)?.value||''}));const snap=snapshot(state,c,editor.previewDraft);$('#pvOutput').innerHTML=`<p>共用快照 ${snap.id} · ${esc(catName(c.category))} · ${esc(name(c.model))}</p>${resultHtml(evaluate(state,snap))}<p class="pms-note">真实输入保持原属性值＋附加属性值。取价目标异常不撤销已完成的真实确认，不阻断有效报告发布。</p>`;}
 function renderRecords(){$('#pmsContent').innerHTML=`<div class="card"><div class="card-head"><b>处理记录与异常恢复</b><div class="pms-actions"><select id="pmsRecordCategory" class="control">${options(categories,'','全部品类')}</select><select id="pmsRecordStatus" class="control"><option value="">全部状态</option><option value="error">有失败组</option><option value="ready">映射已完成</option></select></div></div><div class="card-body"><p class="subtle">按原快照重试保留规则版本；按新配置重新处理会创建关联记录，两组共用新快照。冻结价格不重算。</p><div id="pmsRecordRows"></div></div></div>`;recordRows();}
 function recordRows(){const cat=$('#pmsRecordCategory').value,statusFilter=$('#pmsRecordStatus').value,rs=state.records.filter(r=>(!cat||r.context.category===cat)&&(!statusFilter||(statusFilter==='error')===Object.values(r.result).some(g=>g.errors.length)));$('#pmsRecordRows').innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>记录／业务归属</th><th>品类／型号／取价组</th><th>触发属性／附加值</th><th>状态／失败原因</th><th>快照／时间</th><th>操作</th></tr></thead><tbody>${rs.map(r=>['actual','baseline'].map((g,i)=>`<tr><td>${r.id}<small>${r.orderNo} · ${esc(r.shop)}</small></td><td>${catName(r.context.category)} · ${esc(name(r.context.model))}<small>${g==='actual'?'本机实际质检':'基准值对照'}</small></td><td>${r.context.inputs[g].map(x=>`${esc(pvName(x.ppv))}${x.extraCode?' ＋ '+esc(r.snapshot.rules.flatMap(v=>v.details).find(d=>d.code===x.extraCode)?.name||x.extraCode):''}`).join('<br>')}</td><td>${pill(r.result[g].status)}<small>${esc(r.result[g].errors.join('；')||'')}</small></td><td>${r.snapshot.id}<small>${time(r.createdAt)}</small></td><td>${i===0?button('record','查看记录',r.id,'link'):''}</td></tr>`).join('')).join('')||'<tr><td colspan="6" class="pms-empty">暂无符合条件的记录</td></tr>'}</tbody></table></div>`;}
 function record(id){const r=state.records.find(r=>r.id===id);show(id+' · 处理详情',`<div class="pms-summary"><span>MAX 任务：${r.taskNo}</span><span>业务单号：${r.orderNo}</span><span>品类／型号：${catName(r.context.category)} / ${esc(name(r.context.model))}</span><span>商家店铺：${esc(r.shop)}</span><span>报告：${r.report}</span><span>质检版本：${r.factVersion} · 标单：${r.lot}</span><span>MAX 原始值：${esc(r.maxRaw)}</span><span>确认时统一规则：${r.confirmationRule}</span><span>确认人／时间：${esc(r.confirmedBy)} / ${time(r.confirmedAt)}</span><span>配置快照：${r.snapshot.id}</span><span>关联原记录：${r.parentId||'无'}</span><span>尝试次数：${r.attempts} · 价格：${r.frozen?'已冻结':'未生成'}</span></div><details><summary>输入、统一规则及覆盖范围快照</summary><pre>${esc(JSON.stringify(r.snapshot,null,2))}</pre></details>${resultHtml(r.result)}<p class="pms-note">示例尚未生成商品码和 BI 价格；取价失败不影响有效报告发布。</p>`,access==='maintain'&&!r.frozen?button('retry','按原快照重试',id)+button('reprocess','按新配置重新处理',id,'primary'):'');}
 function reprocessConfirm(id){const old=state.records.find(r=>r.id===id),next=snapshot(state,{...clone(old.context),at:new Date().toISOString()});editor={recordId:id,configRevision:state.revision};show('按新配置重新处理',`<p>新建关联处理记录，保留 ${id} 的原始输入及失败结果。</p><table class="table"><thead><tr><th>内容</th><th>原配置</th><th>新配置</th></tr></thead><tbody><tr><td>快照</td><td>${old.snapshot.id}</td><td>${next.id}</td></tr><tr><td>统一规则版本</td><td>${old.snapshot.ruleVersions.map(esc).join('<br>')}</td><td>${next.ruleVersions.map(esc).join('<br>')}</td></tr></tbody></table><div class="pms-comparison"><section><h3>原明细</h3>${old.snapshot.rules.map(v=>`<p>${v.id} / V${v.version}</p>${detailsHtml(v)}`).join('')}</section><section><h3>新明细</h3>${next.rules.map(v=>`<p>${v.id} / V${v.version}</p>${detailsHtml(v)}`).join('')}</section></div><p class="pms-note">两组使用同一新快照；真实质检和已冻结价格保持原样。</p>`,button('reprocess-confirm','确认重新处理','','primary'));}
 function act(e){const b=e.target.closest('[data-pms]');if(!b)return;const action=b.dataset.pms,id=b.dataset.id;try{
  if(action==='close'){dialog.close();return;}if(action==='tab'){tab=id;render();return;}if(action==='search'){readFilters();renderRows();return;}if(action==='reset'){filter={keyword:'',category:'',model:'',channel:'',trigger:'',extra:'',status:''};render();return;}
  if(action==='history'){history(id);return;}if(action==='coverage'){coverage();return;}if(action==='preview'||action==='version-preview'){preview(id);return;}if(action==='preview-run'){runPreview();return;}if(action==='record'){record(id);return;}
  permission(access);refresh();if(action==='new'||action==='edit'){openEditor(id);return;}
  if(action==='detail-add'){editor.draft.details=readDetails();editor.draft.details.push(blankDetail());renderDetails();return;}
  if(action==='detail-remove'){editor.draft.details=readDetails();editor.draft.details.splice(Number(id),1);renderDetails();return;}
  if(action==='save'){const d=captureDraft();if($('#pmModelMode').value==='selected'&&!d.models.length)throw Error('请选择至少一个型号。');if($('#pmChannelMode').value==='selected'&&!d.channels.length)throw Error('请选择至少一个渠道。');saveRule(state,d,editor.id,editor.revision,access);persist();dialog.close();render();notify('已保存整条规则草稿，启用后生效');return;}
  if(action==='enable'||action==='disable'){lifecycle(id,action);return;}if(action==='lifecycle-save'){const reason=$('#pmLifecycleReason').value;if(editor.action==='enable')enableRule(state,editor.id,editor.version,editor.revision,reason,access);else disableRule(state,editor.id,editor.revision,reason,access);persist();dialog.close();render();notify('整条规则状态已更新');return;}
  if(action==='retry'){retryRecord(state,id,access);persist();render();record(id);return;}if(action==='reprocess'){reprocessConfirm(id);return;}if(action==='reprocess-confirm'){if(editor.configRevision!==state.revision)throw Error('配置已变化，请重新查看差异。');const r=reprocess(state,editor.recordId,access);persist();render();record(r.id);return;}
 }catch(err){if(dialog.open)error(err.message);else notify(err.message);}}
 page.addEventListener('click',act);dialog.addEventListener('click',act);
 page.addEventListener('change',e=>{if(e.target.id==='pmsPermission'){access=e.target.value;render();}if(e.target.id==='pmsCategoryFilter'){$('#pmsModelFilter').innerHTML=options(models.filter(m=>!e.target.value||m.category===e.target.value),'','全部型号');}if(['pmsRecordCategory','pmsRecordStatus'].includes(e.target.id))recordRows();});
 function filterModels(){const brand=$('#pmBrand').value,series=$('#pmSeries').value,q=$('#pmModelSearch').value.toLowerCase();$$('#pmModels label').forEach(l=>{const m=model(l.dataset.model);l.hidden=!!((brand&&m.brand!==brand)||(series&&m.series!==series)||(q&&!m.name.toLowerCase().includes(q)));});}
 dialog.addEventListener('change',e=>{const id=e.target.id;if(id==='pmCategory'){captureDraft();Object.assign(editor.draft,{models:[],sourcePpn:'',triggerPpv:'',targetPpn:'',details:[blankDetail()]});editor.direct=false;$('#pmDirect').checked=false;$('#pmModelMode').value='all';renderModels();renderAttributes();renderDetails();syncScopes();}
 if(id==='pmAttribute'||id==='pmTrigger'){captureDraft();if(id==='pmAttribute')Object.assign(editor.draft,{triggerPpv:'',targetPpn:''});editor.draft.details=[blankDetail()];editor.direct=false;$('#pmDirect').checked=false;renderAttributes();renderDetails();}
 if(id==='pmTargetAttribute'){captureDraft();editor.draft.details.forEach(d=>d.targetPpv='');renderDetails();}
 if(id==='pmDirect'){editor.direct=e.target.checked;editor.draft.details=[blankDetail()];renderDetails();}
 if(['pmChannelMode','pmModelMode'].includes(id)){editor.draft.details=readDetails();syncScopes();renderDetails();}
 if(e.target.closest('#pmModels')){editor.draft.details=readDetails();renderDetails();}
 if(id==='pmBrand'){$('#pmSeries').innerHTML=options([...new Set(models.filter(m=>m.category===editor.draft.category&&(!e.target.value||m.brand===e.target.value)).map(m=>m.series))].map(s=>({id:s,name:s})),'','全部系列');filterModels();}if(id==='pmSeries')filterModels();
 if(id==='pvCategory')previewCategory();else if(['pvModel','pvChannel','pvTime','pv-actual','pv-baseline'].includes(id))previewExtras();else if(e.target.matches('[data-preview-extra]'))$('#pvOutput').innerHTML='';
 });
 dialog.addEventListener('input',e=>{if(e.target.id==='pmModelSearch')filterModels();});
 win.addEventListener('storage',e=>{if(e.key===KEY){refresh();if(!dialog.open)render();}});
 win.renderMappingRules=render;win.applyMappingFilters=()=>{readFilters();renderRows();};win.resetMappingFilters=()=>{filter={keyword:'',category:'',model:'',channel:'',trigger:'',extra:'',status:''};render();};win.openMappingRuleModal=()=>{permission(access);openEditor();};
 if(win.prototypeState)win.prototypeState.pmsMapping={getState:()=>clone(state),getPermission:()=>access,render};
 render();win.setInterval(()=>{if(page.classList.contains('active')&&!dialog.open&&!page.contains(win.document.activeElement))render();},60000);
}
return {KEY,LEGACY_KEY,categories,models,channels,attributes,source,target,category,clone,seed,status,active,latest,validate,saveRule,enableRule,disableRule,snapshot,resolve,confirmation,evaluate,retryRecord,reprocess,mount};
});
