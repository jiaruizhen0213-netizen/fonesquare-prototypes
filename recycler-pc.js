(function () {
'use strict';
const C=window.QuoteDesk, KEY='fs-recycler-pc-quote-demo-v1', app=document.getElementById('app');
let tasks=C.seed(), selected=null, merchant=C.SELF, filters={id:'',model:'',handler:'',status:''}, timer, pendingBid=null;
try { const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===1&&Array.isArray(saved.tasks)&&saved.tasks.length===5)tasks=saved.tasks; } catch (_) {}
// Pending computations are restarted after reload rather than restored as successful prices.
for(const t of tasks)if(t.priceState==='loading'){t.priceState='error';t.error='上次计算未完成，请重新取价';t.price=null;}
const $=s=>document.querySelector(s), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>Number(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({version:1,tasks}));}catch(_){toast('浏览器无法保存演示进度，本次操作仅在当前页面保留');}};
const current=()=>tasks.find(t=>t.id===selected);
const pill=(s,color='')=>`<span class="badge ${color}">${esc(s)}</span>`;
const statusPill=t=>pill(C.status(t),t.bids.length?'green':t.auctionActive?'orange':'');
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.display='none',3500);}
function phone(back=false){return `<svg viewBox="0 0 140 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${back?'手机背面':'手机正面'}示意图"><defs><linearGradient id="${back?'back':'front'}"><stop stop-color="#94b5c0"/><stop offset="1" stop-color="#213f50"/></linearGradient></defs><rect x="17" y="6" width="106" height="218" rx="19" fill="#485764"/><rect x="20" y="9" width="100" height="212" rx="17" fill="url(#${back?'back':'front'})"/>${back?'<rect x="26" y="16" width="49" height="53" rx="12" fill="#637581"/><circle cx="39" cy="30" r="10" fill="#1d2932"/><circle cx="39" cy="54" r="10" fill="#1d2932"/><circle cx="62" cy="42" r="10" fill="#1d2932"/><circle cx="72" cy="110" r="9" fill="#ffffff20"/>':'<rect x="51" y="15" width="38" height="9" rx="5" fill="#172932"/><path d="M21 169Q105 66 120 95V205Q115 221 105 220H34Q20 215 21 203Z" fill="#a6cbd640"/><rect x="49" y="211" width="42" height="3" rx="2" fill="#ffffff70"/>'}</svg>`;}
function demoTools(){return `<details class="demo-tools"><summary>演示设置</summary><label>模拟商家身份 <select id="merchant"><option value="${C.SELF}" ${merchant===C.SELF?'selected':''}>自营商家 · ${C.SELF}</option><option value="REC-MY-OTHER" ${merchant!==C.SELF?'selected':''}>其他回收商 · REC-MY-OTHER</option></select></label><button class="quiet" data-action="reset">重置演示数据</button></details>`;}
function render(){
 if(!C.canAccess(merchant)) {app.innerHTML=`<section class="panel denied"><span class="stat-icon" style="margin:auto">▣</span><h1>当前商家暂未开放报价工作台</h1><p>本期仅自营商家可进入，请切换到自营商家账号。</p></section>${demoTools()}`;return;}
 selected?renderDetail():renderList();
}
function renderList(){
 $('#breadcrumb').innerHTML='工作空间 <span>/</span> 报价工作台';
 const rows=tasks.filter(t=>(!filters.id||t.id.toLowerCase().includes(filters.id.toLowerCase()))&&(!filters.model||t.model===filters.model)&&(!filters.handler||t.handler===filters.handler)&&(!filters.status||C.status(t)===filters.status));
 const metrics=[['竞拍中',tasks.filter(t=>t.auctionActive).length,'◷'],['待报价',tasks.filter(t=>t.auctionActive&&!t.bids.length).length,'↗'],['已出价',tasks.filter(t=>t.bids.length).length,'✓'],['取价异常',tasks.filter(t=>t.auctionActive&&t.priceState==='error').length,'!']];
 app.innerHTML=`<div class="page-heading"><div><h1>报价工作台</h1><p>查看质检结果，调整属性与报价。</p></div><div class="heading-actions">${pill('自营商家专属','orange')}<button data-action="refresh">↻ 刷新</button></div></div>
 <section class="stats">${metrics.map(([n,v,i])=>`<div class="stat"><div><span class="sub">${n}</span><div class="number">${v.toString().padStart(2,'0')}</div></div><span class="stat-icon">${i}</span></div>`).join('')}</section>
 <section class="panel"><div class="panel-title"><h2>报价任务</h2><span class="sub">马来西亚 · MYR</span></div><form class="filters" id="filters">
 <label>标单号<input name="id" placeholder="输入标单号查询" value="${esc(filters.id)}"></label>
 ${filterSelect('model','型号',[...new Set(tasks.map(t=>t.model))])}${filterSelect('handler','处理人',['陈嘉明','未分配'])}${filterSelect('status','状态',['待报价','待确认','报告已确认','已出价','竞拍结束'])}
 <div class="heading-actions"><button class="primary" type="submit">查询</button><button type="button" data-action="clear">重置</button></div></form>
 <div class="table-scroll"><table><thead><tr><th>商品 / 型号</th><th>标单号</th><th>商家 / 店铺</th><th>报告1版本</th><th>创建时间</th><th>处理人</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(t=>`<tr><td><div class="model-cell"><span class="mini-phone"></span><div><strong>${esc(t.model)}</strong><div class="sub">${t.memory} · ${t.extra}</div></div></div></td><td>${t.id.replace('LOT-MY-','LOT-MY-<br>')}</td><td>${esc(t.merchant)}<div class="sub">${esc(t.store)}</div></td><td>${t.report1Version}</td><td>${t.created.replace(' ','<br>')}</td><td>${esc(t.handler)}</td><td>${statusPill(t)}${t.priceState==='error'?'<div class="sub" style="color:#bd7950">取价异常</div>':''}</td><td><button class="link" data-action="open" data-id="${t.id}">${t.auctionActive?'进入报价':'查看详情'} →</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty">没有符合条件的任务</td></tr>'}</tbody></table></div><div class="list-footer"><span>共 ${rows.length} 条任务</span><span>1 / 1</span></div></section>${demoTools()}`;
}
function filterSelect(key,label,opts){return `<label>${label}<select name="${key}"><option value="">全部${label}</option>${opts.map(v=>`<option ${filters[key]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;}
function reportLink(label,type,id){return `<div class="report-row"><span>${label}</span><button class="link" data-action="report" data-type="${type}">${id} ↗</button></div>`;}
function renderDetail(){const t=current();if(!t){selected=null;render();return;}
 $('#breadcrumb').innerHTML='报价工作台 <span>/</span> 报价详情';
 app.innerHTML=`<button class="quiet back" data-action="list">← 返回报价任务</button><div class="page-heading"><div class="device-heading"><span class="mini-phone"></span><div><h1>${esc(t.model)} <span style="font-weight:400;color:#8b99a5">/ ${t.memory}</span></h1><div class="order-meta"><span>${t.id}</span><span>·</span><span>${esc(t.merchant)} / ${esc(t.store)}</span></div></div></div><div class="heading-actions">${t.auctionActive?pill('竞拍中','green'):pill('竞拍结束')}${statusPill(t)}</div></div>
 ${!t.auctionActive?'<div class="callout warn" style="margin-bottom:18px">本轮竞拍已结束，报价入口已关闭。可查看已保存的报告与报价记录。</div>':''}
 <div class="detail-grid"><section class="panel evidence"><div class="panel-title"><div><div class="step">01 / 查看证据</div><h2>设备与质检报告</h2></div></div><div class="panel-body">
 <div class="photo-grid">${[false,true].map((b,i)=>`<button class="photo" data-action="photo" data-side="${i}">${phone(b)}<span>${b?'背面':'正面'} · 示意图 ⤢</span></button>`).join('')}</div>
 <div class="small-section"><h3>质检报告 <span class="sub">只读</span></h3>${reportLink('MAX 原始报告','max','MAX-881920 / v4')}${reportLink('二级质检报告','secondary','PMS-'+t.id.slice(-4)+' / v1')}${reportLink('拍机堂质检报告1','r1','PJT1-'+t.id.slice(-4)+' / v1')}${reportLink('拍机堂质检报告2','r2','PJT2-'+t.id.slice(-4)+' / v1')}${t.reports.length?reportLink('拍机堂质检报告3','r3',t.reports.at(-1).id):''}</div>
 <div class="small-section"><h3>店员备注</h3><div class="note">${esc(t.note)}</div><div class="sub">Aina Rahman · ${t.created}<br>原文保留，仅用于查看</div></div><div class="small-section"><h3>附加属性值</h3><div class="sub">购买渠道：其他版本<br>店员确认：马来版</div></div></div></section>
 <div class="stack"><section class="panel"><div class="panel-title"><div><div class="step">02 / 调整质检属性</div><h2>一级属性对照</h2></div>${pill('草稿 v'+t.revision,'blue')}</div><div class="panel-body" style="padding:12px 18px"><span class="sub">标准：${t.standard} · 仅展示当前型号有效选项</span></div>
 <div class="attribute-head"><span>属性项</span><span>报告2结果</span><span>报告3草稿</span></div>
 ${C.activeFields(t).map(f=>{const modified=t.report2[f.key]!==t.draft[f.key];return `<div class="attribute-row ${modified?'modified':''}"><div class="attr-name">${f.name}<span class="required">*</span><div class="sub">${f.group}</div></div><div class="old-value">${esc(t.report2[f.key]||'不适用')}</div><div><select aria-label="${f.name}" data-field="${f.key}"><option value="">请选择</option>${C.options(f,t).map(v=>`<option ${t.draft[f.key]===v?'selected':''}>${v}</option>`).join('')}</select>${modified?'<div class="sub" style="color:#d78153;font-size:10px;margin-top:5px">'+(t.draft[f.key]?'已调整':'新增必填项')+'</div>':''}</div></div>`;}).join('')}
 <div class="attribute-foot">${C.validation(t).length?`<div class="callout warn">${C.validation(t).map(esc).join('；')}</div>`:''}<label>属性调整依据 ${C.changed(t)?'<span class="required">*</span>':'<span class="sub">有调整时填写</span>'}<textarea id="reason" placeholder="例如：根据屏幕照片确认已更换非原装屏">${esc(t.reason)}</textarea></label><div class="action-row"><span class="sub">${t.confirmedRevision===t.revision?'✓ 当前属性已确认':'确认后生成报告3，不会自动出价'}</span><button data-action="confirm-report" ${C.validation(t).length||t.confirmedRevision===t.revision?'disabled':''}>${t.confirmedRevision===t.revision?'报告已确认':'确认报告3'}</button></div></div></section>
 <div class="callout">橙色行表示与报告2不同的属性。调整只作用于报告3草稿，报告1、报告2与历史报价保留原结果。</div>
 ${history(t)}</div><aside class="pricing" id="pricing">${pricing(t)}</aside></div>${demoTools()}`;
}
function kv(label,val){return `<div class="kv"><span>${label}</span><strong>${val}</strong></div>`;}
function pricing(t){const p=t.priceState==='ready'&&t.price?.revision===t.revision?t.price:null;
 const body=p?`<div class="sub">当前草稿参考价 ${pill('已更新','green')}</div><div class="reference"><small>MYR</small>${money(p.myr)}</div><div class="converted">≈ CNY ${money(p.cny)}</div>`:
 `<div class="price-loading"><div class="sub">当前草稿参考价</div><div class="reference">${t.priceState==='loading'?'<span class="spin"></span> 计算中':t.priceState==='invalid'?'待补全属性':'暂无法计算'}</div></div><div class="callout ${t.priceState==='error'?'error':'warn'}">${esc(t.priceState==='loading'?'正在更新商品码与参考价格':t.priceState==='invalid'?'请先补全当前型号的必填属性':t.error)}${t.previous?`<br>旧参考价 MYR ${money(t.previous.myr)} · 待更新，不作为当前参考价`:''}</div><div style="margin-top:12px"><button data-action="retry" ${t.priceState==='loading'||C.validation(t).length?'disabled':''}>重新取价</button></div>`;
 return `<section class="panel price-panel"><div class="panel-title"><div><div class="step">03 / 查看参考价并出价</div><h2>参考价格</h2></div></div><div class="panel-body"><div>${body}
 <div class="price-comparison"><span>报告2参考价</span><strong>${t.report2Price?'MYR '+money(t.report2Price.myr):'未取得'}</strong></div>
 <div class="code-box">${kv('本机商品码',p?esc(p.actualCode):'待生成')}${kv('基准商品码',p?esc(p.baseCode):'—')}</div>
 ${p?`<details><summary>查看价格计算明细</summary>${kv('SKU 基准 P1（CNY）',money(p.baseCny))}${kv('本机 P1（CNY）',money(p.actualCny))}${kv('汇率（演示）','1 CNY = '+p.fx+' MYR')}${kv('SKU 基准 P1（MYR）',money(p.baseMyr))}${kv('马来本地价格（MYR）',money(p.local))}${kv('换算系数',p.coefficient.toFixed(4))}${kv('本机物品价（MYR）',money(p.item))}${kv('价格策略',p.rate+'% '+p.fixed+' MYR')}${kv('策略版本',p.policy)}${kv('本地价格批次',p.batch)}${kv('对应属性版本','v'+p.revision)}<p class="sub">示例金额保留两位小数；接口、汇率和价格策略均为演示数据。</p></details>`:''}</div>
 <div class="bid-box"><h3>自营出价 <span class="sub">以马币提交</span></h3><label class="money-input"><span>MYR</span><input id="bid" aria-label="马币出价" inputmode="decimal" placeholder="输入出价" value="${esc(t.bid)}" ${!t.auctionActive?'disabled':''}></label><div class="bid-convert" id="bid-convert">${bidConversion(t)}</div>
 <div class="action-row" style="margin-top:8px"><span class="sub" id="bid-source">${t.bidManual?'已手动调整':'自动带入参考价'}</span><button class="link" data-action="use-price" ${!p||!t.auctionActive?'disabled':''}>使用参考价</button></div>
 <button class="primary" data-action="bid" ${!t.auctionActive?'disabled':''}>${t.auctionActive?'确认出价':'竞拍已结束'}</button><p class="sub" style="font-size:10px;margin-bottom:0">人民币金额仅供参考。${!p?'取价暂不可用，仍可手动输入马币出价。':'出价前可再次调整马币金额。'}</p></div></div></section>`;
}
function bidConversion(t){return !(t.fx>0)?'人民币参考金额：待换算':t.bid!==''&&Number.isFinite(+t.bid)?'≈ CNY '+money(Number(t.bid)/t.fx)+' · 汇率 '+t.fx:'人民币参考金额：—';}
function history(t){return `<section class="panel history"><div class="panel-title"><h3>本单操作记录</h3><span class="sub">仅演示</span></div>${!t.bids.length&&!t.reports.length?'<div class="empty" style="padding:25px">暂无报告确认或出价记录</div>':`<div class="table-scroll"><table><thead><tr><th>操作</th><th>内容</th><th>时间</th></tr></thead><tbody>${[...t.reports.map(r=>({type:'确认报告3',content:r.id+(r.price?' · MYR '+money(r.price.myr):' · 未附参考价'),at:r.at})),...t.bids.map(b=>({type:'自营出价',content:'MYR '+money(b.myr)+' / '+(b.cny!==null?'CNY '+money(b.cny):'待换算'),at:b.at}))].sort((a,b)=>b.at.localeCompare(a.at)).map(r=>`<tr><td>${r.type}</td><td>${r.content}</td><td>${r.at.slice(11,19)}</td></tr>`).join('')}</tbody></table></div>`}</section>`;}
function openModal(title,content,actions=''){const d=$('#modal');$('#modal-body').innerHTML=`<div class="modal-head"><h2 id="modal-title">${title}</h2><button class="quiet" data-action="close" aria-label="关闭弹窗">✕</button></div><div class="modal-content">${content}</div>${actions?`<div class="modal-actions"><button data-action="close">取消</button>${actions}</div>`:''}`;if(!d.open)d.showModal();}
function closeModal(){$('#modal').close();}
function report(type){const t=current();if(!t)return;const types={max:'MAX 原始报告',secondary:'二级质检报告',r1:'拍机堂质检报告1',r2:'拍机堂质检报告2',r3:'拍机堂质检报告3'};
 const raw={...t.report2,battery:'90%以上',appearance:'机身完好'};
 const attrs=type==='r3'?t.reports.at(-1)?.attrs:type==='r2'?t.report2:raw;
 if(!attrs)return toast('报告尚未生成');
 const id=type==='max'?'MAX-881920 / v4':type==='secondary'?'PMS-'+t.id.slice(-4)+' / v1':type==='r3'?t.reports.at(-1).id:(type==='r1'?'PJT1-':'PJT2-')+t.id.slice(-4)+' / v1';
 openModal(types[type],`<div class="report-tabs">${Object.entries(types).filter(([k])=>k!=='r3'||t.reports.length).map(([k,v])=>`<button class="${k===type?'selected':''}" data-action="report" data-type="${k}">${v}</button>`).join('')}</div><div class="modal-meta"><strong>${id}</strong> · ${esc(t.model)} / ${t.memory}<br>只读报告快照 · 原型数据，仅展示报告详情样式</div>${['基础信息','外观','拆修','使用功能'].map(group=>`<section class="report-section"><h3>${group}</h3><div class="report-items">${C.fields.filter(f=>f.group===group&&attrs[f.key]).map(f=>`<div class="report-item"><span class="check ${/异常|磕碰|更换|低于|模糊|有进水/.test(attrs[f.key])?'issue':''}">${/异常|磕碰|更换|低于|模糊|有进水/.test(attrs[f.key])?'!':'✓'}</span><div><small>${f.name}</small>${esc(attrs[f.key])}</div></div>`).join('')}</div></section>`).join('')}`);
}
function recalculate(t){const rev=t.revision, request=(t.request||0)+1;t.request=request;t.previous=t.price||t.previous;t.price=null;t.priceState='loading';if(!t.bidManual)t.bid='';save();if(selected===t.id)renderDetail();
 setTimeout(()=>{if(!C.canAccess(merchant)||t.request!==request||t.revision!==rev)return;let result,error;try{result=C.calculate(t);}catch(e){error=e.message;}C.applyResult(t,rev,result,error);save();if(selected===t.id)renderDetail();},750);
}
// All mutations are guarded by merchant-code authorization, including delegated events.
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action,t=current();
 if(a==='close')return closeModal();
 if(a==='reset'){openModal('重置演示数据','仅清除该报价工作台在当前浏览器的演示进度，恢复初始任务。','<button class="primary" data-action="do-reset">确认重置</button>');return;}
 if(a==='do-reset'){tasks=C.seed();selected=null;closeModal();save();render();return;}
 if(!C.canAccess(merchant))return;
 if(a==='list'){selected=null;render();}
 if(a==='refresh'){render();toast('任务列表已刷新');}
 if(a==='clear'){filters={id:'',model:'',handler:'',status:''};renderList();}
 if(a==='open'){selected=b.dataset.id;render();window.scrollTo(0,0);}
 if(a==='photo')openModal('设备照片 · 原型示意图',`<div class="large-photo">${phone(b.dataset.side==='1')}</div><p class="sub">用于演示照片放大交互，非真实质检照片。</p>`);
 if(a==='report')report(b.dataset.type);
 if(!t)return;
 if(a==='retry'){
   // Retry simulates the service recovering from the seeded transient BI failure.
   if(t.failure==='本机 P1 查询失败，请重试')t.failure='';recalculate(t);
 }
 if(a==='use-price'&&t.auctionActive&&t.priceState==='ready'){t.bid=t.price.myr.toFixed(2);t.bidManual=false;save();$('#pricing').innerHTML=pricing(t);}
 if(a==='confirm-report'){
   if(C.changed(t)&&!t.reason.trim())return toast('请先填写属性调整依据');
   openModal('确认生成拍机堂质检报告3',`<p>将使用当前草稿 v${t.revision} 的完整一级属性生成报告3。</p><div class="callout ${t.priceState==='ready'?'':'warn'}">${t.priceState==='ready'?'关联本次参考价：MYR '+money(t.price.myr):'本次取价尚未成功，报告3将保留价格状态，不附带旧参考价。'}</div><p class="sub">${C.changed(t)?'调整依据：'+esc(t.reason):'属性与报告2一致，仍将生成已确认的报告3。'}<br>确认报告不会自动出价。</p>`,'<button class="primary" data-action="save-report">确认生成</button>');
 }
 if(a==='save-report'){try{C.confirmReport(t);save();closeModal();render();toast('报告3已生成，尚未提交出价');}catch(e){toast(e.message);}}
 if(a==='bid'){
   pendingBid={id:t.id,revision:t.revision,bid:t.bid,fx:t.fx};
   try{const copy=C.clone(t);C.makeBid(copy);}catch(e){return toast(e.message);}
   openModal('确认自营出价',`<p>${esc(t.model)} / ${t.memory}</p><div class="confirm-money"><small>MYR</small> ${money(t.bid)}</div><p>${bidConversion(t)}</p><div class="callout">${t.confirmedRevision===t.revision?'当前属性已生成报告3。':'本次按手动报价入口出价，不自动生成报告3。'}<br>原型操作仅保存演示记录，不会发送真实报价。</div>`,'<button class="primary" data-action="save-bid">确认出价（演示）</button>');
 }
 if(a==='save-bid'){try{if(!pendingBid||pendingBid.id!==t.id||pendingBid.revision!==t.revision||pendingBid.bid!==t.bid||pendingBid.fx!==t.fx)throw Error('报价内容已更新，请关闭弹窗后重新确认');C.makeBid(t);save();closeModal();render();toast('演示出价已保存');}catch(e){toast(e.message);}}
});
document.addEventListener('change',e=>{
 if(e.target.id==='merchant'){merchant=e.target.value;for(const task of tasks)if(task.priceState==='loading'){task.request=(task.request||0)+1;task.priceState='error';task.error='计算已中断，请重新取价';task.price=null;}save();selected=null;closeModal();render();return;}
 if(!C.canAccess(merchant))return;const t=current();if(!t)return;
 if(e.target.dataset.field){try{C.change(t,e.target.dataset.field,e.target.value);t.handler='陈嘉明';save();if(C.validation(t).length)render();else recalculate(t);}catch(err){toast(err.message);render();}}
});
document.addEventListener('input',e=>{if(!C.canAccess(merchant))return;const t=current();if(!t)return;
 if(e.target.id==='reason'){t.reason=e.target.value;save();}
 if(e.target.id==='bid'&&t.auctionActive){t.bid=e.target.value;t.bidManual=true;save();$('#bid-convert').textContent=bidConversion(t);$('#bid-source').textContent='已手动调整';}
});
document.addEventListener('submit',e=>{if(e.target.id==='filters'){e.preventDefault();if(!C.canAccess(merchant))return;filters=Object.fromEntries(new FormData(e.target));renderList();}});
render();
})();
