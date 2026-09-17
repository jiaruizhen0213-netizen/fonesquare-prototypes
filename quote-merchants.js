(function(){
'use strict';
const A=window.ShopAddress,KEY='fs-quote-merchants-v1',panel=document.querySelector('#merchants-panel');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let merchants=[],formOpen=false,pendingDelete=null;
const emptyDraft=()=>({name:'',addressParts:A.initial({registrationRegion:'MY'})});
let draft=emptyDraft(),addressEditor=null;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(saved))merchants=saved;}catch(_){}
const editable=()=>document.querySelector('#permission').value==='edit';
function capture(){if(!formOpen)return;draft.name=panel.querySelector('[name="name"]')?.value||'';if(addressEditor)draft.addressParts=addressEditor.read();}
function render(){
 const disabled=editable()?'':'disabled';
 panel.innerHTML=`<section class="card"><div class="card-head"><h2>报价商家列表</h2><button class="primary" data-merchant-action="new" ${disabled}>＋ 新建商家</button></div><div class="card-body">
 <div class="error" id="merchant-error" role="alert"></div>
 ${formOpen?`<form id="merchant-form" class="merchant-form" novalidate><h2>新建商家</h2><div class="merchant-fields">
 <label>商家名称 <span>*</span><input name="name" aria-label="商家名称" maxlength="100" value="${esc(draft.name)}" placeholder="请输入商家名称" required ${disabled}></label>
 <div class="field merchant-address-field"><label for="merchant-address">商家地址</label><input id="merchant-address"></div>
 </div><div class="merchant-form-actions"><button type="button" data-merchant-action="cancel">取消</button><button type="submit" class="primary" ${disabled}>保存</button></div></form>`:''}
 <div class="table-wrap"><table class="merchant-table"><thead><tr><th>商家名称</th><th>商家地址</th><th>对应坐标（经度，纬度）</th><th>操作</th></tr></thead><tbody>
 ${merchants.length?merchants.map(m=>`<tr><td>${esc(m.name)}</td><td>${esc(m.address)}</td><td>${esc(m.longitude)}，${esc(m.latitude)}</td><td>${pendingDelete===m.id?`<div class="merchant-delete"><span>确认删除该商家？</span><button class="link" data-merchant-action="keep">取消</button><button class="delete" data-merchant-action="confirm-delete" data-id="${esc(m.id)}" ${disabled}>确认删除</button></div>`:`<button class="delete" data-merchant-action="delete" data-id="${esc(m.id)}" ${disabled}>删除</button>`}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">暂无报价商家，点击“新建商家”添加</td></tr>'}
 </tbody></table></div></div></section>`;
 addressEditor=null;
 if(formOpen){
  addressEditor=A.mount(panel.querySelector('#merchant-address'),draft.addressParts);
  addressEditor.element.firstElementChild.textContent='商家地址';
  const search=panel.querySelector('#merchant-address-parts-search');
  search.placeholder='通过 Google 地图搜索小区、大楼或街道';
  addressEditor.element.querySelectorAll('input,button').forEach(control=>control.disabled=!editable());
 }
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
 if(action==='cancel'){formOpen=false;draft=emptyDraft();render();return;}
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
 const name=draft.name.trim(),parts=draft.addressParts;
 let error=!name?'请填写商家名称。':addressEditor.error();
 if(!error&&(!parts.placeId||!Number.isFinite(parts.longitude)||!Number.isFinite(parts.latitude)))error='请搜索并选择匹配地址，获取对应坐标。';
 if(error){panel.querySelector('#merchant-error').textContent=error;return;}
 try{persist([...merchants,{id:crypto.randomUUID(),name,address:A.full(parts),addressParts:{...parts},longitude:parts.longitude,latitude:parts.latitude}]);}
 catch(_){panel.querySelector('#merchant-error').textContent='保存失败，请重试；填写内容已保留。';return;}
 draft=emptyDraft();formOpen=false;render();
});
document.querySelector('#permission').addEventListener('change',()=>{capture();pendingDelete=null;render();});
render();
})();
