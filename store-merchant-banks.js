// The Store App demo uses the existing M1002 supplier record in the PC demo.
(function () {
  const B=window.MerchantBanks, mid='M1002', q=id=>document.getElementById(id);
  const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=(zh,en)=>currentLanguage==='en'?en:zh;
  storeProfiles.forEach(s=>B.attach(s,'app:'+s.id,mid));
  const entry=document.createElement('button');entry.type='button';entry.className='quick-entry';entry.id='merchantBankEntry';entry.setAttribute('data-no-i18n','');
  q('bankAccountEntry').before(entry);
  const page=document.createElement('section');page.className='page with-actions';page.id='merchantBanksPage';page.dataset.page='merchantBanks';page.setAttribute('data-no-i18n','');
  q('myPage').after(page);pages.push(page);
  function showBankPage(){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));page.classList.add('active');}
  function list(){
    if(roleSwitch.value!=='merchant')return;
    const rows=B.list(mid);
    page.innerHTML='<header class="topbar"><button class="icon-button" id="bankListBack">‹</button><h1>'+text('商家收款账户','Merchant Bank Accounts')+'</h1><span></span></header><section class="section"><p class="permission-note">'+text('统一维护商家账户，供下属店铺选择。修改账户会同步影响引用店铺。','Manage accounts for your stores. Changes apply to stores using the account.')+'</p>'+rows.map(a=>'<div class="summary-row"><span>'+esc(a.bankName)+' · •••• '+esc(a.accountNumber.slice(-4))+'<small style="display:block">'+esc(a.holder)+'</small><small style="display:block">'+text('使用店铺：','Used by: ')+B.used(mid,a.id).length+'</small></span><button class="outline-button" data-bank-edit="'+esc(a.id)+'">'+text('编辑','Edit')+'</button></div>').join('')+(rows.length?'':'<p>'+text('暂无商家收款账户','No merchant bank accounts yet')+'</p>')+'</section><nav class="action-bar single"><button class="action-button primary" id="addAppMerchantBank">'+text('新增收款账户','Add Bank Account')+'</button></nav>';
    q('bankListBack').onclick=()=>showPage('my');q('addAppMerchantBank').onclick=()=>editor();page.querySelectorAll('[data-bank-edit]').forEach(b=>b.onclick=()=>editor(b.dataset.bankEdit));showBankPage();
  }
  function editor(id){
    if(roleSwitch.value!=='merchant')return;
    const a=B.account(mid,id)||{holder:'',bankName:'',accountNumber:''},affected=B.used(mid,id);
    page.innerHTML='<header class="topbar"><button class="icon-button" id="bankEditorBack">‹</button><h1>'+text(id?'编辑商家账户':'新增商家账户',id?'Edit Merchant Account':'Add Merchant Account')+'</h1><span></span></header><section class="section">'+[['holder',text('收款人银行登记名称','Account Holder Name')],['bankName',text('收款银行','Bank Name')],['accountNumber',text('银行账号','Account Number')]].map(([k,l])=>'<label class="form-field"><span>'+l+' *</span><input id="appMerchant-'+k+'" value="'+esc(k==='accountNumber'?'':a[k])+'" placeholder="'+(k==='accountNumber'&&id?text('留空保留原账号，尾号 ','Leave blank to keep account ending ')+esc(a.accountNumber.slice(-4)):l)+'" /></label>').join('')+(affected.length?'<div class="callout">'+text('修改将影响店铺：','Changes affect: ')+affected.map(s=>esc(s.name)).join('、')+text('。历史结算快照不变。','. Historical settlement snapshots are unchanged.')+'</div><label><input type="checkbox" id="appBankImpact" /> '+text('确认以上店铺的账户变更','Confirm changes for these stores')+'</label>':'')+'<p class="inline-error" id="appMerchantError"></p></section><nav class="action-bar single"><button class="action-button primary" id="saveAppMerchantBank">'+text('保存账户','Save Account')+'</button></nav>';
    q('bankEditorBack').onclick=list;q('saveAppMerchantBank').onclick=()=>{
      try{if(roleSwitch.value!=='merchant')return;if(affected.length&&!q('appBankImpact').checked)throw Error(text('请先确认受影响店铺。','Confirm the affected stores first.'));
        B.save(mid,{holder:q('appMerchant-holder').value.trim(),bankName:q('appMerchant-bankName').value.trim(),accountNumber:q('appMerchant-accountNumber').value.trim()||a.accountNumber},id,'商家主账号 · App');renderProfileScope();list();showToast(text('商家账户已保存','Merchant account saved'));
      }catch(error){q('appMerchantError').textContent=error.message;q('appMerchantError').classList.add('show');}
    };showBankPage();
  }
  entry.onclick=list;
  ['languageZh','languageEn'].forEach(id=>q(id).addEventListener('click',()=>renderProfileScope()));
  const controls=document.createElement('section');controls.className='section';controls.id='storeBankChoice';controls.setAttribute('data-no-i18n','');
  q('bankAccountOwner').after(controls);
  const oldLoad=loadBankAccountForm;
  loadBankAccountForm=function(){oldLoad();renderChoice();};
  function renderChoice(){
    const merchant=roleSwitch.value==='merchant';controls.style.display=merchant?'':'none';
    if(!merchant){setFields(true);return;}
    const selected=B.selection('app:'+selectedStoreProfile().id).accountId;
    controls.innerHTML='<label class="form-field"><span>'+text('收款账户方式','Account Setup')+'</span><select id="appStoreBankMode"><option value="independent">'+text('店铺独立账户','Independent Store Account')+'</option><option value="merchant">'+text('选择商家收款账户','Select Merchant Account')+'</option></select></label><div id="appStoreMerchantChoice"><label class="form-field"><span>'+text('商家收款账户','Merchant Bank Account')+'</span><select id="appStoreMerchantAccount"><option value="">'+text('请选择账户','Select an account')+'</option>'+B.list(mid).map(a=>'<option value="'+esc(a.id)+'" '+(a.id===selected?'selected':'')+'>'+esc(B.label(a))+'</option>').join('')+'</select></label><p class="form-hint">'+text('账户信息只读。可切换账户，保存后生效。','Account details are read-only. Select another account and save to switch.')+'</p><button class="outline-button" id="goMerchantBanks">'+text('管理商家收款账户','Manage Merchant Accounts')+'</button></div>';
    q('appStoreBankMode').value=selected?'merchant':'independent';
    const update=()=>{const shared=q('appStoreBankMode').value==='merchant';q('appStoreMerchantChoice').style.display=shared?'':'none';setFields(!shared);};
    q('appStoreBankMode').onchange=update;q('goMerchantBanks').onclick=list;update();
  }
  function setFields(visible){['bankAccountHolder','bankNameInput','bankAccountNumber'].forEach(id=>q(id).closest('.form-field').style.display=visible?'':'none');}
  const oldRender=renderProfileScope;
  renderProfileScope=function(){oldRender();const merchant=roleSwitch.value==='merchant';entry.style.display=merchant?'grid':'none';entry.innerHTML='<span class="entry-icon">▤</span><span><strong>'+text('商家收款账户','Merchant Bank Accounts')+'</strong><small>'+text('管理商家账户，供店铺选择','Manage accounts available to stores')+'</small></span><span class="entry-chevron">›</span>';q('storeProfileScope').querySelector('.form-hint').textContent=text('店铺地址独立维护；收款可使用商家账户或店铺独立账户。','Each store maintains its own address and can use a merchant or independent bank account.');if(!merchant&&page.classList.contains('active'))showPage('my');};
  // Capture shared selections before the legacy independent-account submit listener.
  q('saveBankAccount').addEventListener('click',event=>{
    if(roleSwitch.value!=='merchant')return;
    if(q('appStoreBankMode')?.value==='merchant'){
      event.stopImmediatePropagation();const id=q('appStoreMerchantAccount').value;
      if(!B.account(mid,id)){q('bankAccountError').textContent=text('请选择商家收款账户；暂无账户时可先新增。','Select a merchant account or create one first.');q('bankAccountError').classList.add('show');return;}
      const s=selectedStoreProfile();B.bind('app:'+s.id,mid,s.name,id,null,'商家主账号 · App');renderProfileScope();showPage('my');showToast(text('店铺收款账户已切换','Store bank account updated'));
    }else{
      const a={holder:q('bankAccountHolder').value.trim(),bankName:q('bankNameInput').value.trim(),accountNumber:q('bankAccountNumber').value.trim()};
      if(a.holder.length>1&&a.bankName.length>1&&/^\d{8,20}$/.test(a.accountNumber)){const s=selectedStoreProfile();B.bind('app:'+s.id,mid,s.name,null,a,'商家主账号 · App');}
    }
  },true);
  q('bankAccountEntry').addEventListener('click',()=>loadBankAccountForm());
  roleSwitch.addEventListener('change',()=>renderProfileScope());
  window.addEventListener('merchant-banks-changed',()=>renderProfileScope());
  Object.assign(window.prototypeState,{renderProfileScope,merchantBanks:B,openMerchantBanks:list});
  renderProfileScope();
})();
