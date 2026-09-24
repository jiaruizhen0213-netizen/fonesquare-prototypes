(function(){
'use strict';
const C=window.QuoteConfig,KEY='fs-quote-config-v2',LEGACY_KEY='fs-quote-config-demo-v1';
const $=s=>document.querySelector(s),app=$('#app');
if(new URLSearchParams(location.search).has('embed'))document.body.classList.add('embed');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state,canEdit=true,historyOpen=false,toastTimer;
try{const saved=JSON.parse(localStorage.getItem(KEY));state=[2,3].includes(saved?.schema)&&saved.current?C.migrate(saved):C.seed(JSON.parse(localStorage.getItem(LEGACY_KEY)));}catch(_){state=C.seed();}
let draft=C.clone(state.current),dirty=false,previewCap=2000;
const preview=r=>Number.isFinite(previewCap)&&previewCap>0&&Number.isFinite(r.firstBidPercent)&&r.firstBidPercent>0?'MYR '+(previewCap*r.firstBidPercent/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const now=()=>new Date().toLocaleString('sv-SE');
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3200);}
function readRows(){return [...document.querySelectorAll('[data-row]')].map(row=>Object.fromEntries(['startRemainingPercent','endRemainingPercent','firstBidPercent','bidCount'].map(k=>{const value=row.querySelector(`[data-field="${k}"]`).value;return [k,value===''?null:Number(value)];})));}
function capture(){draft.rows=readRows();draft.enabled=$('#enabled').value==='true';}
function markDirty(){dirty=JSON.stringify(draft.rows)!==JSON.stringify(state.current.rows)||draft.enabled!==state.current.enabled;$('#dirty').textContent=dirty?'有未保存修改':'';}
function input(key,value,i){const count=key==='bidCount',labels={startRemainingPercent:'开始时间比例',endRemainingPercent:'结束时间比例',firstBidPercent:'首次出价比例',bidCount:'出价次数'};return `<div class="input-unit"><input aria-label="第${i+1}行${labels[key]}" data-field="${key}" type="number" min="${count?'1':'0'}" ${count?'step="1"':'max="100" step="any"'} value="${Number.isFinite(value)?value:''}" placeholder="${count?'输入次数':key==='endRemainingPercent'&&i===draft.rows.length-1?'留空表示竞拍结束':'输入比例'}" ${!canEdit?'disabled':''}><span>${count?'次':'%'}</span></div>`;}
function renderRows(){
 $('#rows').innerHTML=draft.rows.map((r,i)=>`<tr data-row="${i}"><td class="row-number">${i+1}</td><td>${input('startRemainingPercent',r.startRemainingPercent,i)}</td><td>${input('endRemainingPercent',r.endRemainingPercent,i)}</td><td>${input('firstBidPercent',r.firstBidPercent,i)}</td><td>${input('bidCount',r.bidCount,i)}</td><td class="preview-amount">${preview(r)}</td><td><button class="delete" data-action="remove" data-index="${i}" ${draft.rows.length===1||!canEdit?'disabled':''}>删除</button></td></tr>`).join('');
}
function tableOf(rows,legacy=false){
 const range=!legacy&&rows.some(r=>'startRemainingPercent' in r);
 const pct=v=>Number.isFinite(v)?esc(v)+'%':'待补充';
 return `<div class="table-wrap"><table class="history-table"><thead><tr>${range?'<th>开始时间比例（%）</th><th>结束时间比例（%）</th>':`<th>${legacy?'原剩余时间（分钟）':'原竞拍剩余时间比例（单值）'}</th>`}<th>${legacy?'原出价比例':'首次出价比例'}</th>${legacy?'':'<th>出价次数</th>'}</tr></thead><tbody>${rows.map((r,i)=>`<tr>${range?`<td>${pct(r.startRemainingPercent)}</td><td>${r.endRemainingPercent===null&&i===rows.length-1?'—（至竞拍结束）':pct(r.endRemainingPercent)}</td>`:`<td>${legacy?esc(r.minutes):pct(r.remainingPercent)}</td>`}<td>${esc(legacy?r.percent:r.firstBidPercent)}%</td>${legacy?'':`<td>${esc(r.bidCount)} 次</td>`}</tr>`).join('')}</tbody></table></div>`;
}
function history(){return `<section class="card history-card"><div class="card-head"><h2>历史版本</h2><button class="link" data-action="history">收起</button></div><div class="history-body">${state.history.length?state.history.map(p=>`<div class="history-entry"><div class="history-heading"><b>${esc(p.id)} / v${p.version}</b><span>${p.enabled?'启用':'停用'} · ${esc(p.updatedBy)} · ${esc(p.updatedAt)}</span></div>${tableOf(p.rows)}</div>`).join(''):'<p class="empty">暂无当前配置的历史版本</p>'}${state.legacyHistory.length?`<details class="legacy"><summary>旧版分钟配置（仅保留历史）</summary><p>旧版时间单位为分钟，未换算为当前百分比配置。</p>${state.legacyHistory.map(p=>`<div class="history-entry"><b>${esc(p.id)} / v${p.version}</b>${tableOf(p.rows,true)}${(p.history||[]).slice().reverse().map(v=>`<div class="legacy-version">旧版 v${v.version}${tableOf(v.rows,true)}</div>`).join('')}</div>`).join('')}</details>`:''}</div></section>`;}
function render(){
 app.innerHTML=`<section class="card"><div class="card-head"><h2>自营报价规则</h2><div class="version">当前版本 ${esc(state.current.id)}-v${state.current.version}</div></div><div class="card-body">
 <div class="config-meta"><label class="field">状态<select id="enabled" ${!canEdit?'disabled':''}><option value="true" ${draft.enabled?'selected':''}>启用</option><option value="false" ${!draft.enabled?'selected':''}>停用</option></select></label><label class="field preview-field">预览最高出价<div class="input-unit"><input id="preview-cap" aria-label="预览最高出价" type="number" min="0.01" step="0.01" value="${esc(previewCap)}"><span>MYR</span></div></label><button class="link history-link" data-action="history">${historyOpen?'收起历史版本':'历史版本'}</button></div>
 <p class="range-help">竞拍剩余时间比例＝剩余时间 ÷ 本轮竞拍总时长；区间按开始比例 ≥ 剩余比例 > 结束比例匹配；最后一行结束比例留空，表示持续至本轮竞拍结束。</p>${draft.rows.slice(0,-1).some(r=>r.endRemainingPercent===null)?'<p class="range-help">请补充非最后一行的结束时间比例后保存。</p>':''}<div class="error" id="error" role="alert"></div>
 <div class="table-wrap"><table class="config-table"><colgroup><col style="width:6%"><col style="width:18%"><col style="width:18%"><col style="width:19%"><col style="width:16%"><col style="width:16%"><col style="width:7%"></colgroup><thead><tr><th>序号</th><th>开始时间比例（%）<small>竞拍剩余时间比例 · 开始</small></th><th>结束时间比例（%）<small>竞拍剩余时间比例 · 结束</small></th><th>首次出价比例（%）<small>首次报价占自营最高出价的比例</small></th><th>出价次数<small>包含首次出价的总次数</small></th><th>预计首次报价</th><th>操作</th></tr></thead><tbody id="rows"></tbody></table></div>
 <div class="config-actions"><span id="dirty" class="dirty">${dirty?'有未保存修改':''}</span><div class="buttons"><button data-action="add" ${!canEdit?'disabled':''}>＋ 增加配置</button><button data-action="restore" ${!canEdit?'disabled':''}>恢复当前值</button><button class="primary" data-action="save" ${!canEdit?'disabled':''}>保存新版本</button></div></div>
 </div></section>${historyOpen?history():''}`;
 renderRows();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
 if(a==='history'){capture();historyOpen=!historyOpen;render();return;}
 if(!canEdit)return;
 try{
  if(a==='add'){capture();draft.rows.push({startRemainingPercent:null,endRemainingPercent:null,firstBidPercent:null,bidCount:null});renderRows();markDirty();}
  if(a==='remove'){capture();if(draft.rows.length>1)draft.rows.splice(Number(b.dataset.index),1);renderRows();markDirty();}
  if(a==='restore'){draft=C.clone(state.current);dirty=false;render();toast('已恢复当前保存值');}
  if(a==='save'){
   capture();const next=C.save(state,draft,now());
   try{localStorage.setItem(KEY,JSON.stringify(next));}catch(_){throw Error('保存失败，浏览器存储不可用；已保留当前编辑内容。');}
   state=next;draft=C.clone(state.current);dirty=false;render();toast('新版本已保存');
  }
 }catch(err){$('#error').textContent=err.message;}
});
document.addEventListener('input',e=>{if(e.target.id==='preview-cap'){previewCap=e.target.value===''?null:Number(e.target.value);}if(canEdit&&e.target.matches('[data-field]')){capture();markDirty();$('#error').textContent='';}if(e.target.id==='preview-cap'||e.target.matches('[data-field]')){document.querySelectorAll('[data-row]').forEach((row,i)=>row.querySelector('.preview-amount').textContent=preview(draft.rows[i]));}});
document.addEventListener('change',e=>{
 if(e.target.id==='enabled'&&canEdit){capture();markDirty();}
 if(e.target.id==='permission'){capture();canEdit=e.target.value==='edit';render();}
});
render();
})();
