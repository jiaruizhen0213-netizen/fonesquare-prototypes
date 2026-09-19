/* Unified overseas attribute configuration; UI and storage are scoped to this module. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root?.document){root.PmsMapping=api;api.mount(root);}})(typeof window==='undefined'?null:window,function(){
'use strict';
const KEY='fs-pms-special-attributes-v2', LEGACY_KEY='fs-pms-special-attributes-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const categories=[{id:'PHONE',name:'手机',source:'DEMO-PHONE-L2',target:'DEMO-PHONE-L1'},{id:'LAPTOP',name:'笔记本',source:'DEMO-LAPTOP-L2',target:'DEMO-LAPTOP-L1'}];
const models=[{id:'103',category:'PHONE',name:'iPhone 15 Pro',brand:'Apple',series:'iPhone 15'},{id:'101',category:'PHONE',name:'iPhone 15',brand:'Apple',series:'iPhone 15'},{id:'102',category:'PHONE',name:'iPhone 14 Pro',brand:'Apple',series:'iPhone 14'},{id:'201',category:'PHONE',name:'Samsung Galaxy S24',brand:'Samsung',series:'Galaxy S24'},{id:'301',category:'LAPTOP',name:'MacBook Pro 14',brand:'Apple',series:'MacBook Pro'},{id:'302',category:'LAPTOP',name:'ThinkPad X1 Carbon',brand:'Lenovo',series:'ThinkPad'}];
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
const begins=v=>Date.parse(v.activatedAt||v.updatedAt||v.start||'1970-01-01T00:00:00Z');
const ends=v=>Math.min(instant(v.disabledAt),instant(v.replacedAt));
function status(v,at=Date.now()){if(v.replacedAt&&instant(v.replacedAt)<=at)return '已替换';if(!v.enabled||begins(v)>at||(v.disabledAt&&instant(v.disabledAt)<=at))return '停用';return '启用';}
const latest=r=>r.versions.at(-1), active=(r,at=Date.now())=>r.versions.slice().reverse().find(v=>status(v,at)==='启用');
const scopes=v=>v.models.length?v.models:models.filter(m=>m.category===v.category).map(m=>m.id);
const validFor=(v,id)=>!!v&&v.valid!==false&&!!model(id)&&(!v.category||v.category===model(id).category)&&(!v.models?.length||v.models.includes(id));
const detailFor=(d,id)=>d.valid!==false&&(!d.models.length||d.models.includes(id));
const needsExtra=v=>v.details.some(d=>d.code||d.name);
const overlap=(a,b)=>!a.length||!b.length||a.some(x=>b.includes(x));
const sameBase=(a,b)=>a.country===b.country&&a.category===b.category&&a.sourceStandard===b.sourceStandard&&a.sourcePpn===b.sourcePpn&&a.triggerPpv===b.triggerPpv;
function permission(p){if(p!=='maintain')throw Error('当前仅有查看权限，无法修改配置。');}
function audit(s,action,id,version,reason,at){s.revision++;s.audit.unshift({action,id,version,reason,operator:'贾瑞真',at});}
function catalogItems(s){return s.extraCatalog.filter(x=>!x.deletedAt);}
function extraAttribute(s,x){if(attributes.some(a=>a.id===x.sourcePpn))return x.sourcePpn;const refs=[...new Set(s.rules.flatMap(r=>r.versions).filter(v=>v.details.some(d=>d.code===x.code)).map(v=>v.sourcePpn))];return refs.length===1?refs[0]:'';}
function upgradeCatalog(s){for(const x of s.extraCatalog){if(!x.name){const d=s.rules.flatMap(r=>r.versions).reverse().filter(v=>sameBase(v,x)).flatMap(v=>v.details).find(d=>d.code===x.code);x.name=d?.name||x.code;}x.revision=x.revision||1;x.updatedAt=x.updatedAt||'2026-09-14T07:00:00Z';x.operator=x.operator||'贾瑞真';}return s;}
function extraReferences(s,code){return s.rules.flatMap(r=>r.versions.filter(v=>v.details.some(d=>d.code===code)).map(v=>({id:r.id,version:v.version,name:v.name,status:status(v)})));}
function saveExtra(s,draft,code,expectedRevision,p='maintain',at=new Date().toISOString()){
 permission(p);upgradeCatalog(s);const old=s.extraCatalog.find(x=>x.code===code&&!x.deletedAt);if(code&&(!old||old.revision!==expectedRevision))throw Error('附加属性值已变化，请刷新后提交。');
 const v={name:String(draft.name||'').trim(),sourcePpn:draft.sourcePpn},a=attributes.find(a=>a.id===v.sourcePpn);if(!a)throw Error('请先选择二级属性项。');if(!v.name)throw Error('请填写附加属性值名称。');if(old&&extraReferences(s,code).length&&extraAttribute(s,old)!==a.id)throw Error('已有规则引用，不能修改所属二级属性项。');if(catalogItems(s).some(x=>x.code!==code&&extraAttribute(s,x)===a.id&&x.name===v.name))throw Error('同一二级属性项下的附加属性值不能重复。');
 const before=old?clone(old):null;const next={...old,sourcePpn:a.id,category:a.category,sourceStandard:category(a.category).source,name:v.name,code:code||'EXT-'+String(s.extraSerial++).padStart(5,'0'),revision:(old?.revision||0)+1,updatedAt:at,operator:'贾瑞真'};
 if(old)Object.assign(old,next);else s.extraCatalog.push(next);audit(s,code?'编辑附加属性值':'新建附加属性值',next.code,next.revision,v.name,at);Object.assign(s.audit[0],{before,after:clone(next)});return old||next;
}
function deleteExtra(s,code,expectedRevision,p='maintain',at=new Date().toISOString()){
 permission(p);const x=s.extraCatalog.find(x=>x.code===code&&!x.deletedAt);if(!x||x.revision!==expectedRevision)throw Error('附加属性值已变化，请刷新。');const refs=extraReferences(s,code);if(refs.length)throw Error('无法删除：已被 '+refs.map(r=>`${r.id} / V${r.version}（${r.status}）`).join('、')+' 引用。');x.deletedAt=at;x.revision++;audit(s,'删除附加属性值',code,x.revision,x.name,at);return x;
}
function validate(s,v,enabling=false,excludeId='',at=Date.now()){
 const cat=category(v.category),a=attr(v.sourcePpn),pv=source(v.triggerPpv);
 if(v.country!=='MY'||!cat)return '请选择国家和品类。';
 if(v.sourceStandard!==cat.source||v.targetStandard!==cat.target)return '属性标准与品类不一致。';
 if(!a||a.category!==v.category||pv?.ppn!==v.sourcePpn)return '属性项、触发属性值须属于当前品类的二级模板。';
 if(!attributes.some(x=>x.targetId===v.targetPpn&&x.category===v.category))return '请选择当前品类的一级取价映射属性项。';
 if(v.models.some(id=>model(id)?.category!==v.category))return '型号范围无效，不允许跨品类引用。';
 if(!Number.isInteger(v.priority)||v.priority<1)return '优先级须为正整数，数字越小越优先。';
 if(!v.details.length)return '请至少添加一行映射明细。';
 const extra=needsExtra(v),codes=new Set(),names=new Set();
 if(!extra&&(v.details.length!==1||pv.requiresConfirmation))return '需要补充确认的触发值必须配置具体附加值；直接映射只能保留一行空附加值。';
 for(const d of v.details){
  if(extra&&(!d.code||!d.name.trim()))return '请选择已维护的附加属性值，不能混用附加确认和直接映射明细。';
  if(d.code&&(codes.has(d.code)||source(d.code)||target(d.code)))return '附加编码重复或与 PMS 编码混用。';
  if(extra&&names.has(d.name.trim()))return '同一规则的附加属性值名称不能重复。';
  if(d.code){const registered=s.extraCatalog.find(x=>x.code===d.code);if(!registered||registered.deletedAt)return '附加属性值已删除或不存在，请重新选择。';if(extraAttribute(s,registered)!==v.sourcePpn)return '附加属性值不属于当前二级属性项，请重新选择。';codes.add(d.code);}
  names.add(d.name.trim());
  if(d.models.some(id=>!scopes(v).includes(id)))return '明细适用型号不能超出规则范围。';
  if(target(d.targetPpv)?.ppn!==v.targetPpn)return '每行须选择对应一级属性项下的取价映射值。';
 }
 if(enabling){
  const applicable=scopes(v).filter(id=>validFor(pv,id));if(!applicable.length)return '触发属性值已失效或不适用于所选型号。';
  for(const id of applicable){const rows=v.details.filter(d=>detailFor(d,id));if(!rows.length)return '所选型号下没有有效附加选项。';if(rows.some(d=>!validFor(target(d.targetPpv),id)))return '取价映射值已失效或不支持明细适用型号。';}
  const conflicts=[];
  s.rules.filter(r=>r.id!==excludeId).forEach(r=>{const w=active(r,at);if(w&&sameBase(w,v)&&w.priority===v.priority&&overlap(v.models,w.models))conflicts.push(`${r.id} / V${w.version}（型号 ${w.models.map(id=>model(id)?.name||id).join('、')||'本品类全部'}）`);});
  if(conflicts.length)return '同优先级规则范围重叠：'+conflicts.join('；')+'。附加选项不同也不能同时启用，可保存为停用。';
 }
 return '';
}
function saveRule(s,draft,id,expectedRevision,p='maintain',at=new Date().toISOString()){
 permission(p);const rule=s.rules.find(r=>r.id===id);if(id&&(!rule||rule.revision!==expectedRevision))throw Error('配置已被更新，请刷新后提交。');
 upgradeCatalog(s);const v=clone(draft);['channels','start','end','prompt','desiredStatus'].forEach(k=>delete v[k]);v.details.forEach(d=>d.models=[]);v.details.forEach(d=>{if(d.code){const x=catalogItems(s).find(x=>x.code===d.code);if(x)d.name=x.name;}});const error=validate(s,v);if(error)throw Error(error);
 v.details.forEach(d=>{d.targetName=target(d.targetPpv).name;});
 v.sourceName=source(v.triggerPpv).name;v.attributeName=attr(v.sourcePpn).name;v.version=rule?latest(rule).version+1:1;v.enabled=false;['disabledAt','replacedAt','activatedAt','activationReason'].forEach(k=>delete v[k]);v.updatedAt=at;v.operator='贾瑞真';
 const r=rule||{id:'OMAP-'+String(s.serial++).padStart(4,'0'),revision:0,createdAt:at,createdBy:'贾瑞真',versions:[]};if(!rule)s.rules.unshift(r);r.versions.push(v);r.revision++;audit(s,'保存转换规则',r.id,v.version,v.reason,at);return r;
}
function registerCoverage(s,v,at){
 let c=s.coverage.find(c=>sameBase(c,v));if(!c){c={country:v.country,category:v.category,sourceStandard:v.sourceStandard,sourcePpn:v.sourcePpn,triggerPpv:v.triggerPpv,codes:[],version:0,history:[]};s.coverage.push(c);}else c.history.push(clone({...c,history:undefined}));
 c.codes=[...new Set([...c.codes,...v.details.map(d=>d.code).filter(Boolean)])];c.version++;c.at=at;
}
function enableRule(s,id,version,expectedRevision,reason,p='maintain',at=new Date().toISOString()){
 permission(p);const r=s.rules.find(r=>r.id===id);if(!r||r.revision!==expectedRevision)throw Error('规则版本已变化，请刷新。');let v=r.versions.find(v=>v.version===version);if(!v||status(v,instant(at))==='启用')throw Error('请选择停用的规则。');
 const error=validate(s,{...v,reason},true,id,instant(at));if(error)throw Error(error);
 if(v.enabled){saveRule(s,v,id,r.revision,p,at);v=latest(r);}
 r.versions.filter(w=>status(w,instant(at))==='启用').forEach(w=>w.replacedAt=at);v.enabled=true;v.activatedAt=at;v.activationReason=reason;r.revision++;registerCoverage(s,v,at);audit(s,'启用整条规则',id,v.version,reason,at);
}
function disableRule(s,id,expectedRevision,reason,p='maintain',at=new Date().toISOString()){
 permission(p);const r=s.rules.find(r=>r.id===id);if(!r||r.revision!==expectedRevision)throw Error('规则版本已变化，请刷新。');r.versions.filter(v=>status(v,instant(at))==='启用').forEach(v=>v.disabledAt=at);r.revision++;audit(s,'停用整条规则',id,null,reason,at);
}
function snapshot(s,context,draft=null){
 const rules=s.rules.flatMap(r=>{const v=active(r,instant(context.at));return v?[{...clone(v),id:r.id}]:[];});
 if(draft){const v=clone(draft);rules.splice(0,rules.length,...rules.filter(r=>r.id!==v.id));['disabledAt','replacedAt','activatedAt'].forEach(k=>delete v[k]);rules.push({...v,enabled:true});}
 const coverage=s.coverage.flatMap(c=>{const v=[...c.history,c].filter(v=>instant(v.at)<=instant(context.at)).sort((a,b)=>b.version-a.version)[0];return v?[clone({...v,history:undefined})]:[];});
 const inputs=clone(context);delete inputs.channel;rules.forEach(v=>delete v.channels);
 return {id:`SNAP-${s.revision}`,at:context.at,context:inputs,rules,coverage,ruleVersions:rules.map(v=>`${v.id} / V${v.version}`)};
}
function resolve(snap,item){
 const c=snap.context,pv=source(item.ppv);if(!category(c.category)||model(c.model)?.category!==c.category||!validFor(pv,c.model)||pv.category!==c.category||(item.standard&&item.standard!==category(c.category).source))return {error:'品类、型号、属性值或标准不一致',options:[],matches:[]};
 const matches=snap.rules.filter(v=>v.category===c.category&&v.country===c.country&&v.sourceStandard===category(c.category).source&&v.sourcePpn===pv.ppn&&v.triggerPpv===item.ppv&&(!v.models.length||v.models.includes(c.model))&&begins(v)<=instant(c.at)&&instant(c.at)<ends(v)).sort((a,b)=>a.priority-b.priority);
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
 const v={version:1,name:'其他版本补充与取价',category:'PHONE',country:'MY',models:[],sourceStandard:'DEMO-PHONE-L2',sourcePpn:'P2-CHANNEL',triggerPpv:'P2-OTHER',targetStandard:'DEMO-PHONE-L1',targetPpn:'P1-CHANNEL',details:[{code:'EXT-00001',name:'马来版',targetPpv:'P1-CN',models:[]},{code:'EXT-00002',name:'新加坡版',targetPpv:'P1-CN',models:[]}],prompt:'请选择具体版本',priority:100,start:early,end:'',enabled:true,updatedAt:early,operator:'贾瑞真',reason:'初始化演示'};
 const old={...clone(v),replacedAt:t};old.details[0].targetPpv='P1-RETIRED';const current={...clone(v),version:2,start:t,updatedAt:t,reason:'更新有效取价目标'};
 const specific={...clone(v),name:'iPhone 15 版本映射',models:['101'],priority:10,start:t,updatedAt:t};
 const notebook={...clone(v),name:'笔记本键盘布局映射（示例）',category:'LAPTOP',sourceStandard:'DEMO-LAPTOP-L2',targetStandard:'DEMO-LAPTOP-L1',sourcePpn:'N2-KEYBOARD',triggerPpv:'N2-OTHER',targetPpn:'N1-KEYBOARD',details:[{code:'EXT-00003',name:'马来西亚键盘布局',targetPpv:'N1-US',models:[]}],prompt:'请选择具体键盘布局',start:t,updatedAt:t};
 const s={schema:2,revision:1,serial:4,extraSerial:4,rules:[{id:'OMAP-0001',revision:2,versions:[old,current],createdAt:early,createdBy:'贾瑞真'},{id:'OMAP-0002',revision:1,versions:[specific],createdAt:t,createdBy:'贾瑞真'},{id:'OMAP-0003',revision:1,versions:[notebook],createdAt:t,createdBy:'贾瑞真'}],extraCatalog:[],coverage:[],records:[],audit:[]};
 for(const rule of [v,notebook]){rule.details.forEach(d=>s.extraCatalog.push({code:d.code,country:rule.country,category:rule.category,sourceStandard:rule.sourceStandard,sourcePpn:rule.sourcePpn,triggerPpv:rule.triggerPpv}));registerCoverage(s,rule,early);}
 const context={category:'PHONE',country:'MY',model:'101',at:'2026-09-13T07:00:00Z',inputs:{actual:[{ppv:'P2-OTHER',extraCode:'EXT-00001'},{ppv:'P2-BLACK'}],baseline:[{ppv:'P2-CN'},{ppv:'P2-BLACK'}]}};const snap=snapshot(s,context);
 s.records.push({id:'RUN-0001',taskNo:'MAX-DEMO-001',orderNo:'INSP-DEMO-001',shop:'KL 演示店铺',report:'REPORT-DEMO-001 / V1',factVersion:'V1',maxRaw:'其他版本',confirmedBy:'原操作人（演示）',confirmedAt:context.at,confirmationRule:'OMAP-0001 / V1',lot:'尚未发布',context,snapshot:snap,result:evaluate(s,snap),createdAt:context.at,attempts:1,frozen:false});return upgradeCatalog(s);
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
 const pill=s=>`<span class="pms-status ${['启用','已映射','已确认'].includes(s)?'ok':['待人工确认'].includes(s)?'pending':s.includes('异常')||s.includes('停止')||s==='待补映射'?'bad':''}">${esc(s)}</span>`;
 const multi=(id,items,values)=>`<select id="${id}" class="control pms-multi" multiple>${items.map(x=>option(x.id,x.name,values.includes(x.id))).join('')}${values.filter(v=>!items.some(x=>x.id===v)).map(v=>option(v,`不在当前范围（${name(v)}）`,true)).join('')}</select>`;
 const selected=id=>[...$(id).selectedOptions].map(o=>o.value);
 let state;try{state=JSON.parse(win.localStorage.getItem(KEY));}catch{}if(state?.schema!==2||!Array.isArray(state.rules))state=seed();
 upgradeCatalog(state);
 let tab='rules',access='maintain',editor={},filter={keyword:'',category:'',model:'',trigger:'',extra:'',status:''};
 const dialog=win.document.createElement('dialog');dialog.id='pmsMappingDialog';dialog.className='pms-dialog';win.document.body.append(dialog);
 const extraDialog=win.document.createElement('dialog');extraDialog.id='pmsExtraDialog';extraDialog.className='pms-dialog';win.document.body.append(extraDialog);let extraEditing={};
 function refresh(){try{const v=JSON.parse(win.localStorage.getItem(KEY));if(v?.schema===2&&v.revision>state.revision)state=upgradeCatalog(v);}catch{}}
 function persist(){win.localStorage.setItem(KEY,JSON.stringify(state));refreshLotPanel();}
 function notify(s){if(win.toast)win.toast(s);}
 function error(s){$('#pmsError').textContent=s;$('#pmsError').hidden=false;}
 function show(title,body,footer=''){dialog.innerHTML=`<header><div><small>一级属性转换规则</small><h2>${esc(title)}</h2></div><button class="pms-close" data-pms="close" aria-label="关闭">×</button></header><div class="pms-dialog-body">${body}<p id="pmsError" class="pms-error" role="alert" hidden></p></div><footer>${button('close','关闭')}${footer}</footer>`;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
 function detailsHtml(v){return `<div class="pms-pairs">${v.details.map(d=>`<div><span>${esc(d.name||'直接映射')}<small>${esc(d.code||'无需附加确认')}</small></span><span class="pms-arrow">→</span><span>${esc(d.targetName||targetName(d.targetPpv))}<small>${esc(d.targetPpv)}</small></span></div>`).join('')}</div>`;}
 function render(){
  refresh();const rules=state.rules;
  page.innerHTML=`<div class="page-title"><div><h1>一级属性转换规则</h1><p class="subtle">按品类维护触发条件及附加属性值的取价关系</p></div><div class="page-actions"><label class="pms-permission">演示权限 <select id="pmsPermission" class="control">${option('maintain','查看与维护',access==='maintain')}${option('view','仅查看',access==='view')}</select></label>${access==='maintain'?button(tab==='extras'?'extra-new':'new',tab==='extras'?'＋ 新建附加属性值':'＋ 新增规则','','primary'):''}</div></div>
  <div class="pms-note">品类 ＋ 属性项 ＋ 触发属性值 → 店员选择附加属性值 → 对应取价映射值。整条规则及所有明细统一启用或停用。</div>
  <div class="pms-tabs" role="tablist">${[['rules','规则配置'],['extras','附加属性值']].map(([id,label])=>`<button role="tab" aria-selected="${tab===id}" class="${tab===id?'active':''}" data-pms="tab" data-id="${id}">${label}</button>`).join('')}</div>
  <div id="pmsContent"></div><p class="pms-footnote">当前为演示字典、编码及处理记录，未接入 PMS；笔记本选项仅示意品类联动。规则保存在当前浏览器。${win.localStorage.getItem(LEGACY_KEY)?'旧版演示配置原样保留，未自动转换为新规则。':''}</p>`;
  if(tab==='extras'){renderExtras();return;}
  $('#pmsContent').innerHTML=`<div class="metric-grid pms-metrics">${[[rules.length,'规则总数'],[rules.filter(r=>active(r)).length,'当前启用'],[rules.filter(r=>!active(r)).length,'已停用'],[catalogItems(state).length,'附加属性值']].map(([n,t])=>`<div class="metric"><div class="metric-label">${t}</div><div class="metric-value">${n}</div></div>`).join('')}</div>
  <div class="card"><div class="card-body pms-filters">${field('规则编号',input('pmsKeyword',filter.keyword))}${field('品类',`<select id="pmsCategoryFilter" class="control">${options(categories,filter.category,'全部品类')}</select>`)}${field('型号',`<select id="pmsModelFilter" class="control">${options(models.filter(m=>!filter.category||m.category===filter.category),filter.model,'全部型号')}</select>`)}${field('触发属性值',input('pmsTriggerFilter',filter.trigger))}${field('附加属性值',input('pmsExtraFilter',filter.extra))}${field('状态',`<select id="pmsStatusFilter" class="control">${options(['启用','停用'].map(s=>({id:s,name:s})),filter.status,'全部状态')}</select>`)}<div class="pms-filter-actions">${button('reset','重置')}${button('search','查询','','primary')}</div></div></div><div id="pmsRuleResults"></div>`;
  renderRows();
 }
 function readFilters(){filter={keyword:$('#pmsKeyword').value.trim(),category:$('#pmsCategoryFilter').value,model:$('#pmsModelFilter').value,trigger:$('#pmsTriggerFilter').value.trim(),extra:$('#pmsExtraFilter').value.trim(),status:$('#pmsStatusFilter').value};}
 function renderRows(){const rows=state.rules.filter(r=>{const v=latest(r);return (!filter.keyword||r.id.toLowerCase().includes(filter.keyword.toLowerCase()))&&(!filter.category||v.category===filter.category)&&(!filter.model||scopes(v).includes(filter.model))&&(!filter.trigger||(pvName(v.triggerPpv)+' '+v.triggerPpv).includes(filter.trigger))&&(!filter.extra||v.details.some(d=>(d.name+' '+d.code).includes(filter.extra)))&&(!filter.status||status(v)===filter.status||(filter.status==='启用'&&active(r)));});
  $('#pmsRuleResults').innerHTML=`<div class="card"><div class="card-head"><b>转换规则 · ${rows.length} 条</b>${button('coverage','查看映射覆盖范围','','link')}</div><div class="table-wrap"><table class="table pms-rules"><thead><tr><th>规则编号</th><th>品类／适用范围</th><th>属性项／触发属性值</th><th>附加属性值 → 一级取价映射值</th><th>优先级</th><th>状态</th><th>最近更新</th><th>操作</th></tr></thead><tbody>${rows.map(r=>{const v=latest(r),current=active(r);return `<tr><td><b>${r.id} / V${v.version}</b></td><td><b>${esc(catName(v.category))}</b><div>马来西亚</div><small>${esc(v.models.length?v.models.map(name).join('、'):'本品类全部支持型号')}</small></td><td><b>${esc(attr(v.sourcePpn)?.name)}</b><div>${esc(pvName(v.triggerPpv))}</div><small>二级 · ${esc(v.sourcePpn)} / ${esc(v.triggerPpv)}</small></td><td>${detailsHtml(v)}</td><td><b>${v.priority}</b></td><td>${pill(status(v))}${current&&current.version!==v.version?`<small>当前生效 V${current.version}</small>`:''}</td><td>${esc(v.operator)}<small>${time(v.updatedAt)}</small></td><td><div class="pms-actions">${button('history','版本',r.id,'link')}${access==='maintain'?button('edit','编辑',r.id,'link')+(status(v)!=='启用'?button('enable','启用',r.id,'link'):'')+(!!active(r)?button('disable','停用',r.id,'link'):''):''}</div></td></tr>`;}).join('')||'<tr><td colspan="8" class="pms-empty">没有符合条件的规则</td></tr>'}</tbody></table></div></div>`;
 }
 function renderExtras(){const q=editor.extraKeyword||'',ppn=editor.extraPpn||'';$('#pmsContent').innerHTML=`<div class="card"><div class="card-body pms-extra-search">${field('二级属性项',`<select id="extraPpnFilter" class="control">${options(attributes.map(a=>({id:a.id,name:catName(a.category)+' / '+a.name})),ppn,'全部二级属性项')}</select>`)}${field('附加属性值／编码',input('extraKeyword',q))}${button('extra-search','查询','','primary')}</div></div><div class="card"><div class="card-head"><b>附加属性值</b><span class="subtle">在转换规则中选择使用；已被规则引用的值不能删除</span></div><div class="table-wrap"><table class="table"><thead><tr><th>二级属性项</th><th>附加属性值</th><th>引用版本数</th><th>更新信息</th><th>操作</th></tr></thead><tbody>${catalogItems(state).filter(x=>(!ppn||extraAttribute(state,x)===ppn)&&(!q||(x.code+' '+x.name).toLowerCase().includes(q.toLowerCase()))).map(x=>`<tr data-extra-code="${esc(x.code)}"><td>${esc(attr(extraAttribute(state,x))?.name||'待设置')}<small>${esc(catName(attr(extraAttribute(state,x))?.category)||'')}</small></td><td><b>${esc(x.name)}</b><small>${esc(x.code)}</small></td><td>${button('extra-refs',String(extraReferences(state,x.code).length),x.code,'link')}</td><td>${esc(x.operator)}<small>${time(x.updatedAt)}</small></td><td><div class="pms-actions">${access==='maintain'?button('extra-edit','编辑',x.code,'link')+button('extra-delete','删除',x.code,'link'):button('extra-refs','查看引用',x.code,'link')}</div></td></tr>`).join('')||'<tr><td colspan="5" class="pms-empty">暂无附加属性值</td></tr>'}</tbody></table></div></div>`;}
 function extraEditor(code,fromRule=false){const x=catalogItems(state).find(x=>x.code===code);if(code&&!x)throw Error('附加属性值已删除，请刷新。');extraEditing={code,revision:x?.revision,fromRule};extraDialog.innerHTML=`<header><h2>${x?'编辑':'新增'}附加属性值</h2><button class="pms-close" data-extra-action="close" aria-label="关闭">×</button></header><div class="pms-dialog-body">${field('二级属性项 *',`<select id="exAttribute" class="control" ${fromRule||(x&&extraReferences(state,code).length)?'disabled':''}>${options(attributes.map(a=>({id:a.id,name:catName(a.category)+' / '+a.name})),fromRule?editor.draft.sourcePpn:x?extraAttribute(state,x):'','请选择二级属性项')}</select>`)}${field('附加属性值 *',input('exName',x?.name||'','text','placeholder="例如：马来版" maxlength="100"'))}<p id="pmsExtraError" class="pms-error" role="alert" hidden></p></div><footer><button class="btn" data-extra-action="close">取消</button><button class="btn primary" data-extra-action="save">保存</button></footer>`;extraDialog.showModal();$('#exName').disabled=!$('#exAttribute').value;($('#exAttribute').value?$('#exName'):$('#exAttribute')).focus();}
 extraDialog.addEventListener('click',e=>{const action=e.target.closest('[data-extra-action]')?.dataset.extraAction;if(!action)return;if(action==='close'){extraDialog.close();return;}try{permission(access);refresh();const x=saveExtra(state,{sourcePpn:$('#exAttribute').value,name:$('#exName').value},extraEditing.code,extraEditing.revision,access);persist();extraDialog.close();if(extraEditing.fromRule&&dialog.open){renderDetails();}else render();}catch(err){$('#pmsExtraError').textContent=err.message;$('#pmsExtraError').hidden=false;}});
 extraDialog.addEventListener('change',e=>{if(e.target.id==='exAttribute')$('#exName').disabled=!e.target.value;});
 extraDialog.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='exName'){e.preventDefault();extraDialog.querySelector('[data-extra-action="save"]').click();}});
 function refsHtml(code){const refs=extraReferences(state,code);return refs.length?`<table class="table"><thead><tr><th>规则／版本</th><th>状态</th></tr></thead><tbody>${refs.map(r=>`<tr><td>${button('history',r.id+' / V'+r.version,r.id,'link')}</td><td>${pill(r.status)}</td></tr>`).join('')}</tbody></table>`:'<p>当前没有规则配置引用。</p>';}
 function extraDelete(code){const x=catalogItems(state).find(x=>x.code===code);if(!x)throw Error('附加属性值已删除，请刷新。');const refs=extraReferences(state,code);editor={extraCode:code,extraRevision:x.revision};show(refs.length?'无法删除附加属性值':'删除附加属性值',`<p><b>${esc(x.name)}</b> · ${x.code}</p><p>${refs.length?'以下规则版本仍在引用，不能删除。':'确认删除后，该值将从可选列表移除，编码不再复用。'}</p>${refsHtml(code)}`,refs.length?'':button('extra-delete-confirm','确认删除','','danger'));}
 function blankDetail(){return {code:'',name:'',targetPpv:'',models:[]};}
 function openEditor(id){
  refresh();const r=state.rules.find(r=>r.id===id),v=r?clone(latest(r)):{name:'',country:'MY',category:'',models:[],sourceStandard:'',sourcePpn:'',triggerPpv:'',targetStandard:'',targetPpn:'',details:[blankDetail()],priority:100,reason:''};
  editor={id:r?.id,revision:r?.revision,draft:v,direct:r?!needsExtra(v):false};
  show(r?'编辑转换规则':'新增转换规则',`<p class="subtle">${r?esc(r.id)+' · 保存为新版本':'选择启用或停用后保存'}</p>
  <section class="pms-editor-section"><h3>1. 适用范围</h3><div class="pms-form">${field('品类 *',`<select id="pmCategory" class="control">${options(categories,v.category,'请选择品类')}</select>`)}${field('适用型号',`<select id="pmModelMode" class="control">${option('all','全部支持型号',!v.models.length)}${option('selected','指定型号',v.models.length)}</select>`)}<div id="pmModelChoices" class="pms-span"></div></div></section>
  <section class="pms-editor-section"><h3>2. 触发条件</h3><div id="pmAttributeFields"></div></section>
  <section class="pms-editor-section"><h3>3. 映射关系</h3><div id="pmDetailRows"></div><div id="pmAddDetail">${button('detail-add','＋ 添加映射')}</div><div class="pms-version" id="pmExtraMaintenance"></div></section>
  <section class="pms-editor-section"><h3>生效设置</h3><div class="pms-form">${field('优先级 *',input('pmPriority',v.priority,'number','min="1" step="1"')+'<small>数字越小越优先。</small>')}${field('状态',`<select id="pmEnabled" class="control">${option('enabled','启用',r&&status(v)==='启用')}${option('disabled','停用',!r||status(v)!=='启用')}</select>`)}</div></section>`,button('save','保存','','primary'));

  renderModels();renderAttributes();renderDetails();syncScopes();
 }
 function renderModels(){const v=editor.draft,ms=models.filter(m=>m.category===v.category);$('#pmModelChoices').innerHTML=`<div class="pms-model-filters"><select id="pmBrand" class="control">${options([...new Set(ms.map(m=>m.brand))].map(x=>({id:x,name:x})),'','全部品牌')}</select><select id="pmSeries" class="control">${options([...new Set(ms.map(m=>m.series))].map(x=>({id:x,name:x})),'','全部系列')}</select>${input('pmModelSearch','','search','placeholder="搜索型号"')}</div><div id="pmModels">${ms.map(m=>`<label data-model="${m.id}"><input type="checkbox" value="${m.id}" ${v.models.includes(m.id)?'checked':''}> ${esc(m.name)}</label>`).join('')||'<span class="subtle">请先选择品类</span>'}</div>`;}
 function renderAttributes(){const v=editor.draft,attrs=attributes.filter(a=>a.category===v.category),required=source(v.triggerPpv)?.requiresConfirmation;if(required)editor.direct=false;$('#pmAttributeFields').innerHTML=`<div class="pms-form">${field('属性项 *',`<select id="pmAttribute" class="control">${options(attrs,v.sourcePpn,'请选择属性项')}</select>`)}${field('处理方式',`<select id="pmConfirmMode" class="control"><option value="extra" ${!editor.direct?'selected':''}>店员补充选择后映射</option><option value="direct" ${editor.direct?'selected':''} ${required?'disabled':''}>直接映射</option></select>`)}</div>`;}
 function readDetails(){return $$('#pmDetailRows [data-detail-row]').map((row,i)=>({code:editor.direct?'':row.querySelector('[data-detail-extra]').value,name:editor.direct?'':catalogItems(state).find(x=>x.code===row.querySelector('[data-detail-extra]').value)?.name||editor.draft.details[i]?.name||'',targetPpv:row.querySelector('[data-detail-target]').value,models:[]}));}
 function currentScope(){const id=$('#pmCategory').value;return $('#pmModelMode').value==='all'?models.filter(m=>m.category===id):models.filter(m=>$$('#pmModels input:checked').some(c=>c.value===m.id));}
 function renderDetails(){const v=editor.draft,targets=attr(v.targetPpn)?.targets||[],triggerCell=`<td data-detail-trigger rowspan="${Math.max(1,v.details.length)}"><select id="pmTrigger" class="control" aria-label="触发属性值" ${!v.sourcePpn?'disabled':''}>${options(attr(v.sourcePpn)?.values||[],v.triggerPpv,'请选择触发属性值')}</select></td>`;$('#pmDetailRows').innerHTML=`<table class="table pms-detail-table"><thead><tr><th>触发属性值</th><th>店员可选的附加属性值</th><th>一级取价映射值 *</th>${editor.direct?'':'<th></th>'}</tr></thead><tbody>${v.details.map((d,i)=>`<tr data-detail-row="${i}">${i===0?triggerCell:''}${editor.direct?'<td class="subtle">无需补充</td>':`<td><select class="control" data-detail-extra>${options(catalogItems(state).filter(x=>extraAttribute(state,x)===v.sourcePpn).map(x=>({id:x.code,name:x.name})),d.code,'请选择附加属性值')}</select></td>`}<td><select class="control" data-detail-target ${!v.targetPpn?'disabled':''}>${options(targets,d.targetPpv,v.targetPpn?'请选择一级属性值':'请先选择属性项')}</select></td>${editor.direct?'':`<td>${button('detail-remove','移除',String(i),'link')}</td>`}</tr>`).join('')||`<tr>${triggerCell}<td colspan="3" class="subtle">请添加映射</td></tr>`}</tbody></table>`;$('#pmAddDetail').hidden=editor.direct;$('#pmExtraMaintenance').innerHTML=`<h3>附加属性值维护</h3><p class="subtle">新增后，可在上方映射关系中选择使用。</p><button class="btn" data-pms="extra-rule-new" ${!v.sourcePpn?'disabled':''}>＋ 新增附加属性值</button>`;}
 function syncScopes(){$('#pmModelChoices').hidden=$('#pmModelMode').value==='all';}
 function captureDraft(){const v=editor.draft,cat=category($('#pmCategory').value);Object.assign(v,{country:'MY',category:cat?.id||'',sourceStandard:cat?.source||'',targetStandard:cat?.target||'',models:$('#pmModelMode').value==='all'?[]:$$('#pmModels input:checked').map(x=>x.value),sourcePpn:$('#pmAttribute').value,triggerPpv:$('#pmTrigger').value,details:readDetails(),priority:Number($('#pmPriority').value),reason:editor.id?'编辑配置':'新建配置'});return v;}
 function history(id){const r=state.rules.find(r=>r.id===id);show(id+' · 历史版本',`<p class="subtle">创建人 ${esc(r.createdBy)} · ${time(r.createdAt)}</p>`+r.versions.slice().reverse().map(v=>`<section class="pms-version"><h3>V${v.version} ${pill(status(v))}</h3><div class="pms-summary"><span>品类：${catName(v.category)}</span><span>国家：马来西亚</span><span>型号：${esc(v.models.map(name).join('、')||'本品类全部')}</span><span>属性项：${esc(attr(v.sourcePpn)?.name)} / ${esc(v.sourcePpn)}</span><span>触发属性值：${esc(v.sourceName||pvName(v.triggerPpv))}</span><span>优先级：${v.priority}</span><span>更新：${esc(v.operator)} · ${time(v.updatedAt)}</span></div>${detailsHtml(v)}</section>`).join('')+'<h3>操作记录</h3>'+state.audit.filter(a=>a.id===id).map(a=>`<p>${time(a.at)} · ${esc(a.operator)} · ${esc(a.action)}</p>`).join(''));}
 function lifecycle(id,action){const r=state.rules.find(r=>r.id===id);editor={id,revision:r.revision,version:latest(r).version,action};show(action==='enable'?'启用整条规则':'停用整条规则',`<p><b>${id} / V${latest(r).version}</b></p><p class="pms-note">${action==='enable'?'启用后立即生效，整体替换原版本。启用前校验品类、型号、明细完整性和优先级冲突。':'停用后不参与新匹配，历史版本和命中记录保留。'}</p>`,button('lifecycle-save','确认'+(action==='enable'?'启用':'停用'),'','primary'));}
 function coverage(){show('映射覆盖范围',`<p class="pms-note">启用规则时登记覆盖范围，停用不会移除。该范围用于识别漏配，不维护另一套人工确认或映射关系。</p><table class="table"><thead><tr><th>品类</th><th>属性项／触发属性值</th><th>已登记附加编码</th><th>范围版本</th></tr></thead><tbody>${state.coverage.map(c=>`<tr><td>${catName(c.category)}</td><td>${esc(attr(c.sourcePpn)?.name)}／${esc(pvName(c.triggerPpv))}</td><td>${esc(c.codes.join('、')||'直接映射')}</td><td>V${c.version}<small>${time(c.at)}</small></td></tr>`).join('')}</tbody></table>`);}
 function resultHtml(result){return ['actual','baseline'].map(g=>{const r=result[g];return `<section class="pms-version"><h3>${g==='actual'?'本机实际质检':'基准值对照'} ${pill(r.status)}</h3><table class="table"><thead><tr><th>属性项／触发属性值</th><th>附加属性值</th><th>取价映射值</th><th>规则／处理结果</th></tr></thead><tbody>${r.items.map(i=>`<tr><td>${esc(attr(i.sourcePpn)?.name)}<br>${esc(pvName(i.sourcePpv))}<small>${esc(i.sourcePpv)}</small></td><td>${esc(i.extraName||i.extraCode||'—')}<small>${esc(i.extraCode||'')}</small></td><td>${esc(i.targetPpv?targetName(i.targetPpv):'—')}<small>${esc(i.targetPpv||'')}</small></td><td>${pill(i.status)}<small>${esc(i.rule||'')}${i.reason?'<br>'+esc(i.reason):''}</small>${i.candidates.length?`<details><summary>候选规则与优先级</summary>${i.candidates.map(c=>`<p>${esc(c)}</p>`).join('')}</details>`:''}</td></tr>`).join('')}</tbody></table><p>剩余待标准转换：${r.remaining.map(i=>esc(pvName(i.ppv))).join('、')||'无'}</p>${r.errors.length?`<p class="pms-error">${esc(r.errors.join('；'))}</p>`:'<small>已映射一级值单独保留，完整结果仍须 PMS 转换／校验。</small>'}</section>`;}).join('');}
 function initializeLotDemo(){const b=win.prototypeState?.bids?.find(b=>b.id==='LOT-MY-20260821-0216');if(!b||state.publications?.[b.id])return;state.publications=state.publications||{};const at='2026-08-21T00:08:00Z',context={category:'PHONE',country:'MY',model:'103',at,inputs:{actual:[{ppv:'P2-OTHER',extraCode:'EXT-00001'}],baseline:[{ppv:'P2-CN'}]}},snap=snapshot(seed(),context);
 state.publications[b.id]={productName:b.sku+' / 马来版',facts:[{ppn:'P2-CHANNEL',ppv:'P2-OTHER',sourceName:'其他版本',extraCode:'EXT-00001',extraName:'马来版',displayName:'马来版',confirmedBy:b.operator,confirmedAt:at,rule:'OMAP-0001 / V1'}]};
 state.records.push({id:'LOT-DEMO-001',taskNo:b.max,orderNo:b.recycle,shop:b.store,report:b.report,factVersion:'发布快照',maxRaw:'其他版本',confirmedBy:b.operator,confirmedAt:at,confirmationRule:'OMAP-0001 / V1',lot:b.id,roundId:b.roundId,context,snapshot:snap,result:evaluate(state,snap),createdAt:at,attempts:1,frozen:false});win.localStorage.setItem(KEY,JSON.stringify(state));
 }
 let displayedLot=null;
 function lotGroupCell(r,g,ppn){if(!r)return '<span class="subtle">暂无处理记录</span>';const x=r.result[g]?.items.find(i=>i.sourcePpn===ppn);if(!x)return '<span class="subtle">本组无此属性</span>';return `<b>${esc(x.targetPpv?targetName(x.targetPpv):x.status==='无需海外映射'?pvName(x.sourcePpv):'未完成映射')}</b><small>${esc(x.status)}</small><small>${x.reason?esc(x.reason):'本组来源：'+esc(pvName(x.sourcePpv))}</small>`;}
 const reportKinds=[{id:'max',name:'MAX 原始报告',standard:'MAX 机检结果'},{id:'secondary',name:'二级质检报告',standard:'二级质检标准'},{id:'primary',name:'一级质检报告',standard:'拍机堂质检标准'}];
 const reportDialog=win.document.createElement('dialog');
 reportDialog.id='pmsInspectionDialog';reportDialog.className='pms-dialog pms-report-dialog';reportDialog.setAttribute('aria-labelledby','pmsInspectionTitle');win.document.body.appendChild(reportDialog);
 reportDialog.addEventListener('click',e=>{if(e.target.closest('[data-report-close]'))reportDialog.close();});
 function demoReport(b,kind){
  const normal=(title,texts)=>({title,items:texts.map(text=>({text,status:'normal'}))});
  const appearance=normal('成色描述',['电池100%','后摄拍摄无明显异常','屏幕或机身仅细微划痕、无磕碰或掉漆','显示完美']);
  const repairs=normal('拆修情况',['前摄像头无维修和缺失','后摄像头无维修和缺失','后壳无异常','电池无维修','功能零件无维修和缺失','屏幕无维修情况','主板无维修情况','机身无进水']);
  const functions=normal('使用功能',['无售后维修案例','正常开机','已激活，可还原','前摄拍照摄像正常','通话功能正常','声音功能正常','iCloud已注销','机身无弯曲','充电正常','无线充电功能正常','无线正常','指南针功能正常','触摸功能正常','面容识别功能正常','光线、距离感应正常','振动功能正常','正常连接电脑','侧键正常','无丢失／更换情况']);
  return {number:kind==='max'?b.max:kind==='secondary'?b.report:'PJT-DEMO-001',demo:true,groups:kind==='max'?[normal('检测结果',['电池健康度100%','显示检测正常']),normal('使用功能',['正常开机','前摄拍照摄像正常','通话功能正常','声音功能正常','充电正常','无线充电功能正常','无线正常','指南针功能正常','触摸功能正常','面容识别功能正常','振动功能正常','侧键正常'])]:[appearance,repairs,functions]};
 }
 function inspectionReport(b,kind){return b.inspectionReports?.[kind]||(b.id==='LOT-MY-20260821-0216'?demoReport(b,kind):null);}
 function reportNumber(b,kind){return inspectionReport(b,kind)?.number||(kind==='max'?b.max:kind==='secondary'?b.report:'');}
 function inspectionReportHtml(b,kind){const definition=reportKinds.find(k=>k.id===kind),report=inspectionReport(b,kind);
  if(!report)return '<div class="pms-report-empty">暂无该类型的质检报告</div>';
  const groups=report.groups||[],all=groups.flatMap(g=>g.items||[]),sections=[{id:'abnormal',label:'异常项',icon:'!',open:true},{id:'normal',label:'正常项',icon:'✓',open:true},{id:'unknown',label:'未检测项',icon:'—',open:false}];
  return `<div class="pms-report-meta"><div><b>${esc(definition.name)}</b><span>${esc(report.number||'—')}</span></div><span>${esc(definition.standard)} · 只读</span></div>${report.demo?'<p class="pms-report-demo">原型示例，展示质检报告样式；非实际接口返回数据。</p>':''}${all.length?sections.map(section=>{const match=i=>(['normal','abnormal'].includes(i.status)?i.status:'unknown')===section.id,count=all.filter(match).length;if(!count)return '';return `<details class="pms-report-section ${section.id}" ${section.open?'open':''}><summary><b>${section.label}</b><span class="pms-report-count"><i aria-hidden="true">${section.icon}</i>${count} 项</span><span class="pms-report-chevron" aria-hidden="true">⌃</span></summary><div class="pms-report-section-body">${groups.map(group=>{const items=(group.items||[]).filter(match);if(!items.length)return '';return `<section class="pms-report-group"><h4>${esc(group.title)}</h4><div class="pms-inspection-items">${items.map(i=>`<div class="pms-inspection-item"><span class="pms-inspection-icon" aria-hidden="true">${section.icon}</span><div><span>${esc(i.text)}</span>${i.note?`<small>${esc(i.note)}</small>`:''}</div>${i.image&&/^https?:\/\//i.test(i.image)?`<a class="pms-report-photo" href="${esc(i.image)}" target="_blank" rel="noopener noreferrer" aria-label="查看质检图片"><img src="${esc(i.image)}" alt="${esc(i.text)}" loading="lazy"></a>`:''}</div>`).join('')}</div></section>`;}).join('')}</div></details>`;}).join(''):'<div class="pms-report-empty">报告暂无质检项</div>'}`;
 }
 function inspectionReports(b){return reportKinds.map(k=>{const number=reportNumber(b,k.id);return `<div class="snapshot-item"><label>${k.name}</label>${number?`<button type="button" class="pms-report-number" data-pms="inspection-report" data-id="${k.id}" aria-haspopup="dialog" aria-controls="pmsInspectionDialog" aria-label="查看${k.name} ${esc(number)}">${esc(number)}</button>`:'<span class="subtle">暂无报告</span>'}</div>`;}).join('');}
 function selectInspectionReport(kind){if(!displayedLot||!reportKinds.some(k=>k.id===kind)||!reportNumber(displayedLot,kind))return;reportDialog.innerHTML=`<header><h2 id="pmsInspectionTitle">质检报告详情</h2><button type="button" class="pms-close" data-report-close aria-label="关闭质检报告详情" autofocus>×</button></header><div id="pms-report-panel">${inspectionReportHtml(displayedLot,kind)}</div><footer><button type="button" class="btn" data-report-close>关闭</button></footer>`;reportDialog.showModal();}
 function renderLotPanel(b){refresh();displayedLot=b;const publication=state.publications?.[b.id],records=state.records.filter(r=>r.lot===b.id).sort((a,b)=>instant(b.createdAt)-instant(a.createdAt)),latestRecord=records[0],facts=publication?.facts||[];
 const item=(label,value)=>`<div class="snapshot-item"><label>${label}</label><b>${esc(value||'—')}</b></div>`;
 return `<div class="card"><div class="card-head"><h3 class="section-title">发布展示快照</h3><span class="subtle">发布后不可回写</span></div><div class="card-body"><div class="snapshot-grid">${item('商品名称',publication?.productName||b.sku)}${item('一级商品名称',b.sku)}${item('等级',b.grade||'—')}${inspectionReports(b)}</div></div></div><div class="card pms-lot-conversion"><div class="card-head"><h3 class="section-title">属性转换记录</h3><span class="subtle">${latestRecord?esc(latestRecord.roundId||'预取价')+' · '+time(latestRecord.createdAt):'尚未关联处理记录'}</span></div><div class="card-body"><p class="subtle">商品展示采用已确认的真实值；国内映射目标仅用于取价。以下为演示处理记录。</p>${facts.length?`<div class="table-wrap"><table class="table"><thead><tr><th>属性项</th><th>PMS 原属性值</th><th>店员确认的附加值</th><th>最终展示值</th><th>本机取价映射值／状态</th><th>基准组取价映射值／状态</th></tr></thead><tbody>${facts.map(f=>`<tr><td>${esc(attr(f.ppn)?.name)}<small>${esc(f.ppn)}</small></td><td>${esc(f.sourceName)}<small>${esc(f.ppv)}</small></td><td>${esc(f.extraName)}<small>${esc(f.extraCode)}</small></td><td><b>${esc(f.displayName)}</b></td><td>${lotGroupCell(latestRecord,'actual',f.ppn)}</td><td>${lotGroupCell(latestRecord,'baseline',f.ppn)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-inline">暂无已关联的确认或海外映射记录</div>'}</div></div>`;
 }
 function refreshLotPanel(){const el=win.document.querySelector('#tab-bid-snapshot');if(el&&displayedLot)el.innerHTML=renderLotPanel(displayedLot);}
 function record(id){const r=state.records.find(r=>r.id===id);show(id+' · 处理详情',`<div class="pms-summary"><span>MAX 任务：${r.taskNo}</span><span>业务单号：${r.orderNo}</span><span>品类／型号：${catName(r.context.category)} / ${esc(name(r.context.model))}</span><span>商家店铺：${esc(r.shop)}</span><span>报告：${r.report}</span><span>质检版本：${r.factVersion} · 标单：${r.lot}</span><span>MAX 原始值：${esc(r.maxRaw)}</span><span>确认时统一规则：${r.confirmationRule}</span><span>确认人／时间：${esc(r.confirmedBy)} / ${time(r.confirmedAt)}</span><span>配置快照：${r.snapshot.id}</span><span>关联原记录：${r.parentId||'无'}</span><span>尝试次数：${r.attempts} · 价格：${r.frozen?'已冻结':'未生成'}</span></div><details><summary>输入、统一规则及覆盖范围快照</summary><pre>${esc(JSON.stringify(r.snapshot,null,2))}</pre></details>${resultHtml(r.result)}<p class="pms-note">示例尚未生成商品码和 BI 价格；取价失败不影响有效报告发布。</p>`,access==='maintain'&&!r.frozen?button('retry','按原快照重试',id)+button('reprocess','按新配置重新处理',id,'primary'):'');}
 function reprocessConfirm(id){const old=state.records.find(r=>r.id===id),next=snapshot(state,{...clone(old.context),at:new Date().toISOString()});editor={recordId:id,configRevision:state.revision};show('按新配置重新处理',`<p>新建关联处理记录，保留 ${id} 的原始输入及失败结果。</p><table class="table"><thead><tr><th>内容</th><th>原配置</th><th>新配置</th></tr></thead><tbody><tr><td>快照</td><td>${old.snapshot.id}</td><td>${next.id}</td></tr><tr><td>统一规则版本</td><td>${old.snapshot.ruleVersions.map(esc).join('<br>')}</td><td>${next.ruleVersions.map(esc).join('<br>')}</td></tr></tbody></table><div class="pms-comparison"><section><h3>原明细</h3>${old.snapshot.rules.map(v=>`<p>${v.id} / V${v.version}</p>${detailsHtml(v)}`).join('')}</section><section><h3>新明细</h3>${next.rules.map(v=>`<p>${v.id} / V${v.version}</p>${detailsHtml(v)}`).join('')}</section></div><p class="pms-note">两组使用同一新快照；真实质检和已冻结价格保持原样。</p>`,button('reprocess-confirm','确认重新处理','','primary'));}
 function act(e){const b=e.target.closest('[data-pms]');if(!b)return;const action=b.dataset.pms,id=b.dataset.id;try{
  if(action==='inspection-report'){selectInspectionReport(id);return;}if(action==='close'){dialog.close();return;}if(action==='tab'){tab=id;editor={};render();return;}if(action==='search'){readFilters();renderRows();return;}if(action==='reset'){filter={keyword:'',category:'',model:'',trigger:'',extra:'',status:''};render();return;}
  if(action==='extra-search'){editor.extraKeyword=$('#extraKeyword').value.trim();editor.extraPpn=$('#extraPpnFilter').value;renderExtras();return;}if(action==='extra-refs'){show('配置引用',refsHtml(id));return;}
  if(action==='history'){history(id);return;}if(action==='coverage'){coverage();return;}if(action==='record'){record(id);return;}
  permission(access);refresh();if(action==='extra-new'||action==='extra-edit'){extraEditor(id||undefined);return;}if(action==='extra-delete'){extraDelete(id);return;}if(action==='extra-delete-confirm'){deleteExtra(state,editor.extraCode,editor.extraRevision,access);persist();dialog.close();render();return;}if(action==='extra-rule-new'){captureDraft();extraEditor(undefined,true);return;}if(action==='new'||action==='edit'){openEditor(id);return;}
  if(action==='detail-add'){editor.draft.details=readDetails();editor.draft.details.push(blankDetail());renderDetails();return;}
  if(action==='detail-remove'){editor.draft.details=readDetails();editor.draft.details.splice(Number(id),1);renderDetails();return;}
  if(action==='save'){const d=captureDraft();if($('#pmModelMode').value==='selected'&&!d.models.length)throw Error('请选择至少一个型号。');const candidate=clone(state),r=saveRule(candidate,d,editor.id,editor.revision,access);if($('#pmEnabled').value==='enabled')enableRule(candidate,r.id,latest(r).version,r.revision,'启用配置',access);else disableRule(candidate,r.id,r.revision,'停用配置',access);const previous=state;state=candidate;try{persist();}catch(err){state=previous;throw err;}dialog.close();render();notify('转换规则已保存');return;}
  if(action==='enable'||action==='disable'){lifecycle(id,action);return;}if(action==='lifecycle-save'){const reason=editor.action==='enable'?'启用配置':'停用配置';if(editor.action==='enable')enableRule(state,editor.id,editor.version,editor.revision,reason,access);else disableRule(state,editor.id,editor.revision,reason,access);persist();dialog.close();render();notify('整条规则状态已更新');return;}
  if(action==='retry'){retryRecord(state,id,access);persist();render();record(id);return;}if(action==='reprocess'){reprocessConfirm(id);return;}if(action==='reprocess-confirm'){if(editor.configRevision!==state.revision)throw Error('配置已变化，请重新查看差异。');const r=reprocess(state,editor.recordId,access);persist();render();record(r.id);return;}
 }catch(err){if(dialog.open)error(err.message);else notify(err.message);}}
 page.addEventListener('click',act);dialog.addEventListener('click',act);win.document.querySelector('#bidDetailBody')?.addEventListener('click',act);
 page.addEventListener('change',e=>{if(e.target.id==='pmsPermission'){access=e.target.value;render();}if(e.target.id==='pmsCategoryFilter'){$('#pmsModelFilter').innerHTML=options(models.filter(m=>!e.target.value||m.category===e.target.value),'','全部型号');}});
 function filterModels(){const brand=$('#pmBrand').value,series=$('#pmSeries').value,q=$('#pmModelSearch').value.toLowerCase();$$('#pmModels label').forEach(l=>{const m=model(l.dataset.model);l.hidden=!!((brand&&m.brand!==brand)||(series&&m.series!==series)||(q&&!m.name.toLowerCase().includes(q)));});}
 dialog.addEventListener('change',e=>{const id=e.target.id;if(id==='pmCategory'){captureDraft();Object.assign(editor.draft,{models:[],sourcePpn:'',triggerPpv:'',targetPpn:'',details:[blankDetail()]});editor.direct=false;$('#pmModelMode').value='all';renderModels();renderAttributes();renderDetails();syncScopes();}
 if(id==='pmAttribute'||id==='pmTrigger'){captureDraft();if(id==='pmAttribute'){editor.draft.triggerPpv='';editor.draft.targetPpn=attr(editor.draft.sourcePpn)?.targetId||'';}editor.draft.details=[blankDetail()];editor.direct=false;renderAttributes();renderDetails();}
 if(id==='pmConfirmMode'){captureDraft();editor.direct=e.target.value==='direct'&&!source(editor.draft.triggerPpv)?.requiresConfirmation;editor.draft.details=[blankDetail()];renderAttributes();renderDetails();}
 if(id==='pmModelMode'){editor.draft.details=readDetails();syncScopes();renderDetails();}
 if(e.target.closest('#pmModels')){editor.draft.details=readDetails();renderDetails();}
 if(id==='pmBrand'){$('#pmSeries').innerHTML=options([...new Set(models.filter(m=>m.category===editor.draft.category&&(!e.target.value||m.brand===e.target.value)).map(m=>m.series))].map(s=>({id:s,name:s})),'','全部系列');filterModels();}if(id==='pmSeries')filterModels();
 });
 dialog.addEventListener('input',e=>{if(e.target.id==='pmModelSearch')filterModels();});
 win.addEventListener('storage',e=>{if(e.key===KEY){refresh();if(!dialog.open&&!extraDialog.open)render();}});
 win.renderMappingRules=render;win.applyMappingFilters=()=>{readFilters();renderRows();};win.resetMappingFilters=()=>{filter={keyword:'',category:'',model:'',trigger:'',extra:'',status:''};render();};win.openMappingRuleModal=()=>{permission(access);openEditor();};
 if(win.prototypeState)win.prototypeState.pmsMapping={getState:()=>clone(state),getPermission:()=>access,render,renderLotPanel};
 initializeLotDemo();
 render();win.setInterval(()=>{if(page.classList.contains('active')&&!dialog.open&&!extraDialog.open&&!page.contains(win.document.activeElement))render();},60000);
}
return {KEY,LEGACY_KEY,categories,models,attributes,source,target,category,clone,catalogItems,extraAttribute,upgradeCatalog,extraReferences,saveExtra,deleteExtra,seed,status,active,latest,validate,saveRule,enableRule,disableRule,snapshot,resolve,confirmation,evaluate,retryRecord,reprocess,mount};
});
