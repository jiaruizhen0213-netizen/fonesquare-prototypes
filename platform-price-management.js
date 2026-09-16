/* Malaysia price-management prototype. Isolated state; never writes reports or bids. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root?.document){root.PriceManagement=api;api.mount(root);}})(typeof window==='undefined'?null:window,function(){
'use strict';
const KEY='fs-price-management-v1',copy=x=>JSON.parse(JSON.stringify(x));
const models=[
 {id:'103',name:'iPhone 15 Pro',category:'PHONE',memories:['128GB','256GB','512GB','1TB']},
 {id:'101',name:'iPhone 15',category:'PHONE',memories:['128GB','256GB','512GB']},
 {id:'102',name:'iPhone 14 Pro',category:'PHONE',memories:['128GB','256GB','512GB','1TB']},
 {id:'201',name:'Samsung Galaxy S24',category:'PHONE',memories:['256GB','512GB']},
 {id:'301',name:'MacBook Pro 14',category:'LAPTOP',memories:['512GB','1TB']},
 {id:'302',name:'ThinkPad X1 Carbon',category:'LAPTOP',memories:['256GB','512GB','1TB']}
];
const categories=[{id:'PHONE',name:'手机'},{id:'LAPTOP',name:'笔记本'}];
const headers=['型号编码','内存','卖场','币种','本地价格'];
const normMemory=x=>{const s=String(x??'').trim().toUpperCase().replace(/\s/g,'');return /^\d+$/.test(s)?s+'GB':s;};
const key=x=>x.modelId+'|'+x.memory;
function validateImport(rows){
 const seen=new Set();
 return rows.map((r,i)=>{
  const modelId=String(r['型号编码']??'').trim(),model=models.find(m=>m.id===modelId),memory=normMemory(r['内存']),market=String(r['卖场']??'').trim(),currency=String(r['币种']??'').trim().toUpperCase(),raw=r['本地价格'],price=Number(raw);
  const errors=[];if(!model)errors.push('型号编码无效');if(!memory||model&&!model.memories.includes(memory))errors.push('内存不属于该型号支持的选项');if(!market)errors.push('卖场必填');if(currency!=='MYR')errors.push('马来本地价格币种须为MYR');if(raw===null||String(raw??'').trim()===''||!Number.isFinite(price)||price<=0)errors.push('本地价格须大于0');
  const k=modelId+'|'+memory;if(seen.has(k))errors.push('同批次型号＋内存重复');seen.add(k);
  return {row:r.__row||i+2,modelId,modelName:model?.name||'—',category:model?.category,memory,market,currency,price,errors};
 });
}
function importPrices(state,rows,file,operator,time){
 const checked=validateImport(rows);if(!checked.length||checked.some(r=>r.errors.length))throw Error('请修正上传错误后重新上传。');
 const next=copy(state),id='MYPRICE-'+String(next.batchSerial++).padStart(5,'0'),changes=[];
 for(const r of checked){const before=next.prices.find(p=>key(p)===key(r));const after={...r,batchId:id,updatedBy:operator,updatedAt:time};delete after.errors;delete after.row;changes.push({before:before?copy(before):null,after:copy(after)});next.prices=next.prices.filter(p=>key(p)!==key(r));next.prices.push(after);}
 next.batches.unshift({id,file:copy(file),operator,time,changes});next.revision++;return next;
}
function scopedModels(p){return models.filter(m=>m.category===p.category&&(p.modelMode==='all'||p.modelIds.includes(m.id)));}
function memories(p){return [...new Set(scopedModels(p).flatMap(m=>m.memories))];}
// Old single-range versions remain readable; saving creates a new multi-range version.
function policyRanges(p){return Array.isArray(p.ranges)?p.ranges:[{min:p.min,max:p.max,rate:p.rateOn?p.rate:0,fixed:p.fixedOn?p.fixed:0}];}
function blankPolicy(){return {category:'PHONE',modelMode:'all',modelIds:[],memoryMode:'all',memories:[],priority:10,ranges:[{min:0,max:null,rate:0,fixed:0}]};}
const rangeOverlap=(a,b)=>Math.max(a.min,b.min)<Math.min(a.max??Infinity,b.max??Infinity);
function validatePolicy(p){
 if(!categories.some(c=>c.id===p.category))return '请选择品类。';
 if(!['all','selected'].includes(p.modelMode)||!scopedModels(p).length||p.modelMode==='selected'&&p.modelIds.some(id=>!models.some(m=>m.id===id&&m.category===p.category)))return '请选择当前品类的有效型号。';
 if(!['all','selected'].includes(p.memoryMode)||p.memoryMode==='selected'&&(!p.memories.length||p.memories.some(m=>!memories(p).includes(m))))return '请选择型号支持的有效内存。';
 if(!Number.isSafeInteger(p.priority)||p.priority<1)return '优先级须为正整数。';
 const rows=policyRanges(p);if(!rows.length)return '请至少配置一条价格区间。';
 for(let i=0;i<rows.length;i++){const r=rows[i];if(!Number.isFinite(r.min)||r.min<0||r.max!==null&&(!Number.isFinite(r.max)||r.max<=r.min))return `第${i+1}行：价格区间须满足0≤下限＜上限；上限可留空。`;
  if(!Number.isFinite(r.rate)||r.rate< -100)return `第${i+1}行：平台比例须为有效数字，最低为-100%。`;
  if(!Number.isFinite(r.fixed))return `第${i+1}行：平台固定金额须为有效数字。`;
  const other=rows.slice(0,i).findIndex(x=>rangeOverlap(x,r));if(other>=0)return `第${other+1}行与第${i+1}行价格区间重叠，请调整。`;
 }
 return '';
}
function matchesScope(p,modelId,memory){return scopedModels(p).some(m=>m.id===modelId&&m.memories.includes(memory))&&(p.memoryMode==='all'||p.memories.includes(memory));}
function conflict(a,b){return a.priority===b.priority&&policyRanges(a).some(x=>policyRanges(b).some(y=>rangeOverlap(x,y)))&&scopedModels(a).some(m=>m.memories.some(v=>matchesScope(a,m.id,v)&&matchesScope(b,m.id,v)));}
function savePolicy(state,draft,id,operator,time){
 const error=validatePolicy(draft);if(error)throw Error(error);const next=copy(state),old=next.policies.find(p=>p.id===id);if(id&&!old)throw Error('策略不存在，请刷新。');
 const clean={category:draft.category,modelMode:draft.modelMode,modelIds:copy(draft.modelIds),memoryMode:draft.memoryMode,memories:copy(draft.memories),priority:draft.priority,ranges:copy(policyRanges(draft))};
 const snapshot=old?copy(old):null;if(snapshot){delete snapshot.history;delete snapshot.logs;}
 const policy={...clean,id:old?.id||'PRICE-'+String(next.policySerial++).padStart(5,'0'),version:(old?.version||0)+1,status:'停用',createdBy:old?.createdBy||operator,createdAt:old?.createdAt||time,updatedBy:operator,updatedAt:time,history:old?[...old.history,snapshot]:[],logs:[...(old?.logs||[]),{action:old?'编辑并保存新版本':'新建',operator,time}]};
 next.policies=next.policies.filter(p=>p.id!==policy.id);next.policies.unshift(policy);next.revision++;return next;
}
function togglePolicy(state,id,operator,time){
 const next=copy(state),p=next.policies.find(p=>p.id===id);if(!p)throw Error('策略不存在。');
 if(p.status==='停用'){const error=validatePolicy(p);if(error)throw Error(error);const hit=next.policies.find(q=>q.id!==id&&q.status==='启用'&&conflict(p,q));if(hit)throw Error('与'+hit.id+'优先级相同且适用范围、价格区间重叠，请调整后启用。');}
 p.status=p.status==='启用'?'停用':'启用';p.updatedAt=time;p.updatedBy=operator;p.logs.push({action:p.status,operator,time});next.revision++;return next;
}
function calculate(state,{modelId,memory,actualP1,baselineP1}){
 const p=state.prices.find(p=>key(p)===modelId+'|'+memory);if(!p)throw Error('缺少该型号、内存的马来本地价格。');
 if(!Number.isFinite(actualP1)||actualP1<=0)throw Error('本机P1须为大于0的有效金额。');if(!Number.isFinite(baselineP1)||baselineP1<=0)throw Error('SKU基准P1须为大于0的有效金额。');
 const coefficient=p.price/baselineP1,itemPrice=actualP1*coefficient;if(!Number.isFinite(itemPrice)||itemPrice<=0)throw Error('换算结果无效，请检查价格。');
 const matched=state.policies.filter(q=>q.status==='启用'&&matchesScope(q,modelId,memory)).flatMap(q=>{const rows=policyRanges(q).map((r,index)=>({...r,index})).filter(r=>itemPrice>=r.min&&(r.max===null||itemPrice<r.max));if(rows.length>1)throw Error('同一策略命中多个价格区间，请处理配置重叠。');return rows.map(r=>({policy:q,range:r}));}).sort((a,b)=>a.policy.priority-b.policy.priority);
 if(matched.length>1&&matched[0].policy.priority===matched[1].policy.priority)throw Error('命中同优先级的多条策略，请处理配置冲突。');const strategy=matched[0]?.policy||null,matchedRange=matched[0]?.range||null;
 const rateAmount=matchedRange?itemPrice*matchedRange.rate/100:0,fixedAmount=matchedRange?.fixed||0,referencePrice=itemPrice+rateAmount+fixedAmount;
 if(!Number.isFinite(referencePrice)||referencePrice<=0)throw Error('策略计算结果无效，请检查调整比例和金额。');
 return {localPrice:p.price,batchId:p.batchId,coefficient,itemPrice,rateAmount,fixedAmount,referencePrice,matchedRange:matchedRange?copy(matchedRange):null,strategy:strategy?copy(strategy):null};
}
function seed(){
 let s={revision:1,batchSerial:1,policySerial:1,prices:[],batches:[],policies:[]};
 s=importPrices(s,[{'型号编码':'103','内存':'256GB','卖场':'KL 示例卖场','币种':'MYR','本地价格':1000},{'型号编码':'101','内存':'128GB','卖场':'KL 示例卖场','币种':'MYR','本地价格':800},{'型号编码':'301','内存':'512GB','卖场':'KL 示例卖场','币种':'MYR','本地价格':3500}],{name:'演示价格批次',data:null},'贾瑞真','2026-09-16 10:00:00');
 return savePolicy(s,{...blankPolicy(),ranges:[{min:0,max:1000,rate:-5,fixed:-20},{min:1000,max:3000,rate:-4,fixed:-30},{min:3000,max:null,rate:-3,fixed:-50}]},null,'贾瑞真','2026-09-16 10:00:00');
}
function readWorkbook(XLSX,data){
 const book=XLSX.read(data,{type:'array'}),sheet=book.Sheets[book.SheetNames[0]];if(!sheet)throw Error('Excel中没有工作表。');
 const grid=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',blankrows:true}),head=(grid[0]||[]).map(x=>String(x).trim());
 const required=headers.slice(0,5);if(required.some(h=>!head.includes(h))||new Set(head.filter(Boolean)).size!==head.filter(Boolean).length)throw Error('表头缺失或重复，请使用下载的Excel模板。');
 if(grid.length>5001)throw Error('每批最多上传5000行。');
 return grid.slice(1).map((line,i)=>({line,i})).filter(x=>x.line.some(c=>String(c??'').trim())).map(({line,i})=>{const r={__row:i+2};head.forEach((h,j)=>{if(headers.includes(h))r[h]=line[j]??'';});return r;});
}
function templateWorkbook(XLSX){const b=XLSX.utils.book_new();const s=XLSX.utils.aoa_to_sheet([headers]);s['!cols']=headers.map(()=>({wch:22}));XLSX.utils.book_append_sheet(b,s,'马来本地价格');const catalog=XLSX.utils.aoa_to_sheet([['型号编码','型号名称','支持内存（原型示例）'],...models.map(m=>[m.id,m.name,m.memories.join('、')])]);catalog['!cols']=[{wch:18},{wch:26},{wch:42}];XLSX.utils.book_append_sheet(b,catalog,'型号参考');return b;}
function mount(w){
 const d=w.document,$=s=>d.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state;try{state=JSON.parse(w.localStorage.getItem(KEY));}catch{}if(!state?.prices||!state?.policies)state=seed();let tab='prices',permission=true,filter={model:'',memory:''},policyFilter='',editing=null,upload=null,uploadToken=0;
 const now=()=>new Date().toLocaleString('sv-SE'),operator='贾瑞真';
 const page=d.createElement('section');page.id='priceManagementPage';page.className='page';$('#report2RulePage').after(page);
 const nav=d.createElement('div');nav.className='nav-item';nav.dataset.nav='priceManagement';nav.tabIndex=0;nav.setAttribute('role','button');nav.innerHTML='¥ <span>价格管理与策略配置</span>';$('[data-nav="report2Rule"]').after(nav);
 const dialog=d.createElement('dialog');dialog.id='priceDialog';dialog.setAttribute('aria-labelledby','priceDialogTitle');d.body.append(dialog);
 const prev=w.setView;w.setView=function(v){prev(v);if(v==='priceManagement'){$('#crumbGroup').textContent='商品映射管理';$('#crumbCurrent').textContent='价格管理与策略配置';render();}};
 nav.onclick=()=>w.setView('priceManagement');nav.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();nav.click();}};
 const opt=(v,t,current)=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(t)}</option>`;
 const button=(action,label,id='',disabled=false,primary=false)=>`<button class="btn ${primary?'primary':''}" data-price="${action}" data-id="${esc(id)}" ${disabled?'disabled':''}>${label}</button>`;
 const field=(label,body)=>`<label class="price-field"><span>${label}</span>${body}</label>`;
 const input=(id,value='',type='text',other='')=>`<input id="${id}" class="control" type="${type}" value="${esc(value)}" ${other}>`;
 const modelOptions=(current='',all=true)=>`${all?opt('','全部支持型号',current):''}${models.map(m=>opt(m.id,m.name,current)).join('')}`;
 const n=x=>Number(x).toLocaleString('en-US',{maximumFractionDigits:6});
 const name=id=>models.find(m=>m.id===id)?.name||id;
 const scope=p=>p.modelMode==='all'?'全部支持型号':p.modelIds.map(name).join('、');
 const range=p=>`${n(p.min)} ≤ 物品价 ${p.max===null?'（无上限）':'< '+n(p.max)} MYR`;
 const adjustment=p=>`固定金额 ${p.fixed>0?'+':''}${n(p.fixed)} MYR，比例 ${p.rate>0?'+':''}${n(p.rate)}%`;
 function error(message){const el=$('#priceError');if(dialog.open&&el)el.textContent=message;else w.toast(message);}
 function persist(next){try{w.localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}catch{error('保存失败，浏览器存储空间不足或不可用，原配置未变更。');return false;}}
 function close(){uploadToken++;dialog.close();editing=null;upload=null;}
 function modal(title,body,footer=''){dialog.innerHTML=`<header><h2 id="priceDialogTitle">${esc(title)}</h2>${button('close','×')}</header><div class="price-body"><div id="priceError" role="alert"></div>${body}</div><footer>${button('close','关闭')}${footer}</footer>`;if(!dialog.open)dialog.showModal();}
 function table(head,rows){return `<div class="table-wrap"><table class="table"><thead><tr>${head.map(h=>'<th>'+h+'</th>').join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${head.length}" class="price-empty">暂无数据</td></tr>`}</tbody></table></div>`;}
 function render(){
  page.innerHTML=`<div class="page-title"><div><h1>价格管理与策略配置</h1><p class="subtle">维护本地基准价格与调整策略，供报价工作台取价使用</p></div><select id="pricePermission" class="control" aria-label="价格模块演示权限">${opt('maintain','查看与维护',permission?'maintain':'view')}${opt('view','仅查看',permission?'maintain':'view')}</select></div><div class="price-note">马来本地价格按“型号＋内存”维护，代表完美状态，对应SKU基准P1。</div><div class="tabs">${[['prices','马来本地价格'],['policies','价格策略'],['preview','计算预览']].map(([v,t])=>`<button class="tab ${tab===v?'active':''}" data-price="tab" data-id="${v}">${t}</button>`).join('')}</div><div id="priceContent"></div><p class="price-footnote">原型示例：型号及价格用于演示，尚未连接PMS、BI和报价工作台。配置保存在当前浏览器。</p>`;
  if(tab==='prices')renderPrices();if(tab==='policies')renderPolicies();if(tab==='preview')renderPreview();
 }
 function renderPrices(){
  const list=state.prices.filter(p=>(!filter.model||p.modelId===filter.model)&&(!filter.memory||p.memory===filter.memory));
  $('#priceContent').innerHTML=`<div class="card"><div class="price-toolbar">${field('型号',`<select class="control" id="priceModelFilter">${modelOptions(filter.model)}</select>`)}${field('内存',input('priceMemoryFilter',filter.memory,'text','placeholder="例如256GB"'))}${button('filter','查询')}${button('reset','重置')}<div class="price-spacer"></div>${button('template','下载Excel模板')}${button('upload','上传本地价格','',!permission,true)}${button('batches','上传记录')}</div></div><div class="card"><div class="card-head"><b>当前生效价格 · ${list.length} 条</b><span class="subtle">同型号、内存仅一条生效价格</span></div>${table(['型号编码 / 名称','内存','卖场','币种','本地价格','更新人 / 时间','操作'],list.map(p=>`<tr><td><b>${esc(p.modelName)}</b><small>${esc(p.modelId)}</small></td><td>${esc(p.memory)}</td><td>${esc(p.market)}</td><td>MYR</td><td><b>${n(p.price)}</b></td><td>${esc(p.updatedBy)}<small>${esc(p.updatedAt)}</small></td><td>${button('price-history','更新记录',key(p))}</td></tr>`).join(''))}</div>`;
 }
 function uploadModal(){if(!permission)return;upload=null;modal('上传马来本地价格',`<p>支持.xlsx文件，最大5MB；使用模板中的型号编码和内存。校验通过后，确认生效才更新价格。</p><input id="priceFile" type="file" accept=".xlsx"><div id="priceUploadPreview" class="price-upload-preview"></div>`,button('confirm-upload','确认生效','',true,true));}
 function readFile(file,method){return new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('文件读取失败'));reader[method](file);});}
 async function parseUpload(file){
  const token=++uploadToken;upload=null;const confirm=dialog.querySelector('[data-price="confirm-upload"]');if(confirm)confirm.disabled=true;$('#priceError').textContent='';$('#priceUploadPreview').textContent='读取并校验中…';
  try{if(!file||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('请选择.xlsx文件。');if(file.size>5*1024*1024)throw Error('文件超过5MB，请拆分上传。');const data=await readFile(file,'readAsArrayBuffer');const rows=readWorkbook(w.XLSX,data),checked=validateImport(rows);if(!checked.length)throw Error('价格表没有数据。');const archive=await readFile(file,'readAsDataURL');if(token!==uploadToken||!dialog.open)return;
   upload={rows,file:{name:file.name,data:archive}};const bad=checked.filter(r=>r.errors.length).length;
   $('#priceUploadPreview').innerHTML=`<p>共${checked.length}行，${bad}行有误。${bad?'请修正后重新上传。':'校验通过，请核对覆盖范围后确认生效。'}</p>${table(['行号','型号 / 内存','卖场','币种 / 本地价格','处理结果'],checked.map(r=>`<tr><td>${r.row}</td><td>${esc(r.modelName)}<small>${esc(r.modelId)} / ${esc(r.memory)}</small></td><td>${esc(r.market)}</td><td>${esc(r.currency)} ${Number.isFinite(r.price)?n(r.price):'—'}</td><td class="${r.errors.length?'price-bad':''}">${esc(r.errors.join('；')||(state.prices.some(p=>key(p)===key(r))?'覆盖当前价格':'新增价格'))}</td></tr>`).join(''))}`;
   dialog.querySelector('[data-price="confirm-upload"]').disabled=!!bad||!permission;
  }catch(e){if(token===uploadToken&&dialog.open){$('#priceUploadPreview').textContent='';error(e.message);}}
 }
 function batches(){modal('上传记录',table(['批次编号','文件','上传人 / 生效时间','更新条数','操作'],state.batches.map(b=>`<tr><td>${b.id}</td><td>${esc(b.file.name)}</td><td>${esc(b.operator)}<small>${esc(b.time)}</small></td><td>${b.changes.length}</td><td>${button('batch-detail','查看',b.id)} ${b.file.data?button('download-file','下载文件',b.id):''}</td></tr>`).join('')));}
 function batchDetail(id){const b=state.batches.find(x=>x.id===id);modal('批次 '+id,`<p>${esc(b.file.name)} · ${esc(b.operator)} · ${esc(b.time)}</p>`+table(['型号 / 内存','原价格（MYR）','生效价格（MYR）','卖场'],b.changes.map(c=>`<tr><td>${esc(c.after.modelName)} / ${c.after.memory}</td><td>${c.before?n(c.before.price):'新增'}</td><td>${n(c.after.price)}</td><td>${esc(c.after.market)}</td></tr>`).join('')));}
 function priceHistory(id){const logs=state.batches.flatMap(b=>b.changes.filter(c=>key(c.after)===id).map(c=>({b,c})));modal('本地价格更新记录',table(['批次','原价格（MYR）','更新后（MYR）','卖场','操作人 / 时间'],logs.map(({b,c})=>`<tr><td>${b.id}</td><td>${c.before?n(c.before.price):'新增'}</td><td>${n(c.after.price)}</td><td>${esc(c.after.market)}</td><td>${esc(b.operator)}<small>${esc(b.time)}</small></td></tr>`).join('')));}
 function renderPolicies(){const list=state.policies.filter(p=>!policyFilter||p.status===policyFilter).sort((a,b)=>a.priority-b.priority);$('#priceContent').innerHTML=`<div class="card"><div class="price-toolbar">${field('状态',`<select id="pricePolicyFilter" class="control">${['','启用','停用'].map(x=>opt(x,x||'全部',policyFilter)).join('')}</select>`)}<span class="subtle">数字越小越优先；多条策略不叠加</span><div class="price-spacer"></div>${button('new-policy','＋ 新建策略','',!permission,true)}</div></div><div class="card">${table(['策略编号 / 版本','适用范围','价格区间','调整方式','优先级','状态','更新信息','操作'],list.map(p=>`<tr><td><b>${p.id}</b><small>v${p.version}</small></td><td>${categories.find(c=>c.id===p.category)?.name}<small>${esc(scope(p))}</small><small>${p.memoryMode==='all'?'全部支持内存':esc(p.memories.join('、'))}</small></td><td>${policyRanges(p).map(r=>`<div class="price-band-summary">${range(r)}</div>`).join('')}</td><td>${policyRanges(p).map(r=>`<div class="price-band-summary">${adjustment(r)}</div>`).join('')}</td><td>${p.priority}</td><td><span class="tag ${p.status==='启用'?'green':'gray'}">${p.status}</span></td><td>${esc(p.updatedBy)}<small>${esc(p.updatedAt)}</small></td><td><div class="price-actions">${button('edit-policy','编辑',p.id,!permission)}${button('toggle-policy',p.status==='启用'?'停用':'启用',p.id,!permission)}${button('policy-history','历史版本',p.id)}</div></td></tr>`).join(''))}</div>`;}
 function policyEditor(id){if(!permission)return;const old=state.policies.find(p=>p.id===id);editing={id:id||null,draft:copy(old||blankPolicy())};const p=editing.draft;p.ranges=copy(policyRanges(p));
  modal(id?'编辑价格策略':'新建价格策略',`<p class="price-note">保存为停用版本，检查后在列表启用。每次修改保留历史版本及操作记录。</p><div class="price-grid">${field('策略编号',input('pricePolicyId',id||'保存后自动生成','text','disabled'))}${field('版本',input('pricePolicyVersion',old?'v'+old.version+' → v'+(old.version+1):'v1','text','disabled'))}${field('品类 *',`<select id="priceCategory" class="control">${categories.map(c=>opt(c.id,c.name,p.category)).join('')}</select>`)}${field('型号范围 *',`<select id="priceModelMode" class="control">${opt('all','全部支持型号',p.modelMode)}${opt('selected','指定型号',p.modelMode)}</select>`)}<div id="priceModelChoices" class="price-wide"></div>${field('内存范围 *',`<select id="priceMemoryMode" class="control">${opt('all','全部支持内存',p.memoryMode)}${opt('selected','指定内存',p.memoryMode)}</select>`)}<div id="priceMemoryChoices"></div>${field('优先级 *',input('pricePriority',p.priority,'number','min="1" step="1"'))}</div><div class="price-section"><h3>价格区间</h3><p class="subtle">按物品价命中一条区间，含下限、不含上限；上限留空表示无上限。固定金额与比例一起计算，填0表示不调整，正数上调、负数下调。</p><div id="priceRangeRows"></div>${button('range-add','＋ 添加价格区间')}</div>`,button('save-policy','保存策略','',false,true));renderPolicyScope();renderRanges();
 }
 function renderPolicyScope(){const p=editing.draft;$('#priceModelChoices').innerHTML=p.modelMode==='all'?'':`<div class="price-checks">${models.filter(m=>m.category===p.category).map(m=>`<label><input type="checkbox" data-price-model="${m.id}" ${p.modelIds.includes(m.id)?'checked':''}> ${esc(m.name)}</label>`).join('')}</div>`;$('#priceMemoryChoices').innerHTML=p.memoryMode==='all'?'<span class="subtle">全部支持内存</span>':`<div class="price-checks">${memories(p).map(m=>`<label><input type="checkbox" data-price-memory="${m}" ${p.memories.includes(m)?'checked':''}> ${m}</label>`).join('')||'请先选择型号'}</div>`;}
 function renderRanges(){const rows=editing.draft.ranges;$('#priceRangeRows').innerHTML=table(['价格下限（MYR，含）','价格上限（MYR，不含）','平台固定金额（MYR）','平台比例（%）',''],rows.map((r,i)=>`<tr data-price-range="${i}">${[['min','priceMin',r.min,'min="0"'],['max','priceMax',r.max,'min="0" placeholder="无上限"'],['fixed','priceFixed',r.fixed,''],['rate','priceRate',r.rate,'min="-100"']].map(([key,id,value,attrs])=>`<td><input class="control" id="${id}${i?'-'+i:''}" data-range-field="${key}" type="number" step="any" value="${esc(value??'')}" ${attrs} aria-label="第${i+1}行${({min:'价格下限',max:'价格上限',fixed:'平台固定金额',rate:'平台比例'})[key]}"></td>`).join('')}<td>${button('range-remove','删除',String(i),rows.length===1)}</td></tr>`).join(''));}
 function readPolicy(){return {...editing.draft,priority:Number($('#pricePriority').value),ranges:[...dialog.querySelectorAll('[data-price-range]')].map(row=>Object.fromEntries(['min','max','fixed','rate'].map(k=>{const value=row.querySelector(`[data-range-field="${k}"]`).value;return [k,value===''?(k==='max'?null:NaN):Number(value)];})))};}

 function policyHistory(id){const p=state.policies.find(x=>x.id===id);modal(id+' · 历史版本',[p,...p.history.slice().reverse()].map((v,i)=>`<section class="price-version"><h3>v${v.version} · ${i?'历史版本':'当前版本'} · ${v.status}</h3><p>${esc(scope(v))} / ${v.memoryMode==='all'?'全部支持内存':esc(v.memories.join('、'))}</p><p>优先级 ${v.priority}</p>${table(['价格区间','平台固定金额 / 平台比例'],policyRanges(v).map(r=>`<tr><td>${range(r)}</td><td>${adjustment(r)}</td></tr>`).join(''))}<small>${esc(v.updatedBy)} · ${esc(v.updatedAt)}</small></section>`).join('')+'<h3>操作记录</h3>'+p.logs.slice().reverse().map(l=>`<p>${esc(l.action)} · ${esc(l.operator)} · ${esc(l.time)}</p>`).join(''));}
 function renderPreview(){$('#priceContent').innerHTML=`<div class="card"><div class="card-head"><b>价格计算预览</b><span class="subtle">不创建报告、不提交报价</span></div><div class="card-body"><div class="price-grid">${field('型号',`<select id="pricePreviewModel" class="control">${modelOptions('103',false)}</select>`)}${field('内存','<select id="pricePreviewMemory" class="control"></select>')}${field('本机P1',input('priceActualP1',1600,'number','min="0" step="any"'))}${field('SKU基准P1',input('priceBaselineP1',2000,'number','min="0" step="any"'))}</div><p class="subtle">两组P1使用相同币种和金额单位。预览最多显示6位小数，正式金额取整方式待确认。</p>${button('calculate','计算预览','',false,true)}<div id="pricePreviewResult" class="price-result" aria-live="polite"></div></div></div>`;previewMemories();}
 function previewMemories(){const m=models.find(m=>m.id===$('#pricePreviewModel').value);$('#pricePreviewMemory').innerHTML=m.memories.map(v=>opt(v,v,'256GB')).join('');$('#pricePreviewResult').innerHTML='';}
 function previewCalculation(){const el=$('#pricePreviewResult');try{const result=calculate(state,{modelId:$('#pricePreviewModel').value,memory:$('#pricePreviewMemory').value,actualP1:Number($('#priceActualP1').value),baselineP1:Number($('#priceBaselineP1').value)});el.innerHTML=`<div class="price-calc-grid">${[['马来本地价格',n(result.localPrice)+' MYR'],['换算系数',n(result.coefficient)],['本机马来价格（物品价）',n(result.itemPrice)+' MYR'],['命中策略',result.strategy?result.strategy.id+' / v'+result.strategy.version:'未命中，使用物品价'],['命中价格区间',result.matchedRange?range(result.matchedRange):'—'],['策略调整',result.matchedRange?adjustment(result.matchedRange):'不调整'],['参考报价',n(result.referencePrice)+' MYR']].map(([l,v])=>`<div><span>${l}</span><strong>${esc(v)}</strong></div>`).join('')}</div><p class="subtle">本地价格批次 ${result.batchId}；本次结果仅供预览。</p>`;}catch(e){el.innerHTML=`<p class="price-bad">${esc(e.message)}</p>`;}}
 function download(data,name){const a=d.createElement('a');a.href=data;a.download=name;d.body.append(a);a.click();a.remove();}
 async function click(e){const b=e.target.closest('[data-price]');if(!b||b.disabled)return;const a=b.dataset.price,id=b.dataset.id;
  try{if(a==='close'){close();return;}if(a==='tab'){tab=id;render();return;}if(a==='filter'){filter={model:$('#priceModelFilter').value,memory:$('#priceMemoryFilter').value.trim()?normMemory($('#priceMemoryFilter').value):''};renderPrices();return;}if(a==='reset'){filter={model:'',memory:''};renderPrices();return;}
   if(a==='template'){w.XLSX.writeFile(templateWorkbook(w.XLSX),'马来本地价格模板.xlsx');return;}if(a==='batches'){batches();return;}if(a==='batch-detail'){batchDetail(id);return;}if(a==='price-history'){priceHistory(id);return;}if(a==='download-file'){const f=state.batches.find(b=>b.id===id).file;if(f.data)download(f.data,f.name);return;}if(a==='policy-history'){policyHistory(id);return;}if(a==='calculate'){previewCalculation();return;}
   if(!permission)return;if(a==='upload')uploadModal();if(a==='confirm-upload'&&upload){const next=importPrices(state,upload.rows,upload.file,operator,now());if(persist(next)){close();renderPrices();w.toast('本地价格已生效，更新记录已保留');}}
   if(a==='range-add'&&editing){editing.draft=readPolicy();const last=editing.draft.ranges.at(-1);editing.draft.ranges.push({min:last?.max??null,max:null,fixed:0,rate:0});renderRanges();return;}if(a==='range-remove'&&editing){if(editing.draft.ranges.length<=1)return;editing.draft=readPolicy();editing.draft.ranges.splice(Number(id),1);renderRanges();return;}if(a==='new-policy')policyEditor();if(a==='edit-policy')policyEditor(id);if(a==='save-policy'&&editing){const next=savePolicy(state,readPolicy(),editing.id,operator,now());if(persist(next)){close();renderPolicies();w.toast('策略已保存，请检查后启用');}}
   if(a==='toggle-policy'){const p=state.policies.find(p=>p.id===id);modal((p.status==='启用'?'停用':'启用')+'价格策略',`<p>${p.id} / v${p.version}</p><p>仅作用于后续计算，已冻结的报价保持不变。</p>`,button('confirm-toggle',p.status==='启用'?'确认停用':'确认启用',id,false,true));}
   if(a==='confirm-toggle'){const next=togglePolicy(state,id,operator,now());if(persist(next)){close();renderPolicies();w.toast('策略状态已更新');}}
  }catch(e){error(e.message);}
 }
 page.addEventListener('click',click);dialog.addEventListener('click',click);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 page.addEventListener('change',e=>{if(e.target.id==='pricePermission'){permission=e.target.value==='maintain';render();}if(e.target.id==='pricePolicyFilter'){policyFilter=e.target.value;renderPolicies();}if(e.target.id==='pricePreviewModel')previewMemories();if(['pricePreviewMemory','priceActualP1','priceBaselineP1'].includes(e.target.id))$('#pricePreviewResult').innerHTML='';});
 page.addEventListener('input',e=>{if(['priceActualP1','priceBaselineP1'].includes(e.target.id))$('#pricePreviewResult').innerHTML='';});
 dialog.addEventListener('change',e=>{const t=e.target;if(t.id==='priceFile'){parseUpload(t.files[0]);return;}if(!editing)return;const p=editing.draft;if(t.id==='priceCategory'){p.category=t.value;p.modelIds=[];p.memories=[];renderPolicyScope();}if(t.id==='priceModelMode'){p.modelMode=t.value;p.modelIds=[];p.memories=[];renderPolicyScope();}if(t.id==='priceMemoryMode'){p.memoryMode=t.value;p.memories=[];renderPolicyScope();}if(t.dataset.priceModel){p.modelIds=[...dialog.querySelectorAll('[data-price-model]:checked')].map(x=>x.dataset.priceModel);p.memories=p.memories.filter(m=>memories(p).includes(m));renderPolicyScope();}if(t.dataset.priceMemory)p.memories=[...dialog.querySelectorAll('[data-price-memory]:checked')].map(x=>x.dataset.priceMemory);});
 w.priceManagementState={getState:()=>copy(state),open:()=>w.setView('priceManagement')};
}
return {KEY,models,headers,normMemory,validateImport,importPrices,blankPolicy,policyRanges,validatePolicy,savePolicy,togglePolicy,calculate,seed,readWorkbook,templateWorkbook,mount};
});
