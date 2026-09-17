(function(){
'use strict';
const KEY='fs-quote-merchants-v1',panel=document.querySelector('#merchants-panel');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let merchants=[],formOpen=false,pendingDelete=null;
let draft={name:'',address:'',longitude:'',latitude:''};
try{const saved=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(saved))merchants=saved;}catch(_){}
const editable=()=>document.querySelector('#permission').value==='edit';
function capture(){if(!formOpen)return;for(const key of Object.keys(draft)){const input=panel.querySelector(`[name="${key}"]`);if(input)draft[key]=input.value;}}
function render(){
 const disabled=editable()?'':'disabled';
 panel.innerHTML=`<section class="card"><div class="card-head"><h2>报价商家列表</h2><button class="primary" data-merchant-action="new" ${disabled}>＋ 新建商家</button></div><div class="card-body">
 <div class="error" id="merchant-error" role="alert"></div>
 ${formOpen?`<form id="merchant-form" class="merchant-form" novalidate><h2>新建商家</h2><div class="merchant-fields">
 <label>商家名称 <span>*</span><input name="name" aria-label="商家名称" maxlength="100" value="${esc(draft.name)}" placeholder="请输入商家名称" required ${disabled}></label>
 <label>商家地址 <span>*</span><input name="address" aria-label="商家地址" maxlength="300" value="${esc(draft.address)}" placeholder="请输入完整商家地址" required ${disabled}></label>
 <label>经度 <span>*</span><input name="longitude" aria-label="经度" type="number" min="-180" max="180" step="any" value="${esc(draft.longitude)}" placeholder="-180 至 180" required ${disabled}></label>
 <label>纬度 <span>*</span><input name="latitude" aria-label="纬度" type="number" min="-90" max="90" step="any" value="${esc(draft.latitude)}" placeholder="-90 至 90" required ${disabled}></label>
 </div><div class="merchant-form-actions"><button type="button" data-merchant-action="cancel">取消</button><button type="submit" class="primary" ${disabled}>保存</button></div></form>`:''}
 <div class="table-wrap"><table class="merchant-table"><thead><tr><th>商家名称</th><th>商家地址</th><th>对应坐标（经度，纬度）</th><th>操作</th></tr></thead><tbody>
 ${merchants.length?merchants.map(m=>`<tr><td>${esc(m.name)}</td><td>${esc(m.address)}</td><td>${esc(m.longitude)}，${esc(m.latitude)}</td><td>${pendingDelete===m.id?`<div class="merchant-delete"><span>确认删除该商家？</span><button class="link" data-merchant-action="keep">取消</button><button class="delete" data-merchant-action="confirm-delete" data-id="${esc(m.id)}" ${disabled}>确认删除</button></div>`:`<button class="delete" data-merchant-action="delete" data-id="${esc(m.id)}" ${disabled}>删除</button>`}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">暂无报价商家，点击“新建商家”添加</td></tr>'}
 </tbody></table></div></div></section>`;
}
function persist(next){localStorage.setItem(KEY,JSON.stringify(next));merchants=next;}
function selectTab(tab){
 document.querySelectorAll('[data-quote-tab]').forEach(button=>{const active=button.dataset.quoteTab===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
 document.querySelector('#app').hidden=tab!=='rules';panel.hidden=tab!=='merchants';
}
document.querySelector('.quote-tabs').addEventListener('click',e=>{const tab=e.target.closest('[data-quote-tab]');if(tab)selectTab(tab.dataset.quoteTab);});
document.querySelector('.quote-tabs').addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
 const tabs=[...document.querySelectorAll('[data-quote-tab]')],i=tabs.indexOf(document.activeElement);
 const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 selectTab(tabs[next].dataset.quoteTab);tabs[next].focus();
});
panel.addEventListener('click',e=>{
 const button=e.target.closest('[data-merchant-action]');if(!button||button.disabled)return;
 const action=button.dataset.merchantAction;capture();
 if(action==='cancel'){formOpen=false;draft={name:'',address:'',longitude:'',latitude:''};render();return;}
 if(!editable())return;
 if(action==='new'){formOpen=true;pendingDelete=null;render();panel.querySelector('[name="name"]').focus();}
 if(action==='delete'){pendingDelete=button.dataset.id;render();}
 if(action==='keep'){pendingDelete=null;render();}
 if(action==='confirm-delete'&&pendingDelete===button.dataset.id){
  try{persist(merchants.filter(m=>m.id!==pendingDelete));pendingDelete=null;render();}
  catch(_){panel.querySelector('#merchant-error').textContent='删除失败，请重试。';}
 }
});
panel.addEventListener('submit',e=>{
 e.preventDefault();if(!editable())return;capture();
 const name=draft.name.trim(),address=draft.address.trim(),longitude=Number(draft.longitude),latitude=Number(draft.latitude);
 let error='';
 if(!name||!address)error='请填写商家名称和商家地址。';
 else if(!draft.longitude.trim()||!Number.isFinite(longitude)||longitude< -180||longitude>180)error='请填写有效经度，范围为 -180 至 180。';
 else if(!draft.latitude.trim()||!Number.isFinite(latitude)||latitude< -90||latitude>90)error='请填写有效纬度，范围为 -90 至 90。';
 if(error){panel.querySelector('#merchant-error').textContent=error;return;}
 try{persist([...merchants,{id:crypto.randomUUID(),name,address,longitude,latitude}]);}
 catch(_){panel.querySelector('#merchant-error').textContent='保存失败，请重试；填写内容已保留。';return;}
 draft={name:'',address:'',longitude:'',latitude:''};formOpen=false;render();
});
document.querySelector('#permission').addEventListener('change',()=>{capture();pendingDelete=null;render();});
render();
})();
