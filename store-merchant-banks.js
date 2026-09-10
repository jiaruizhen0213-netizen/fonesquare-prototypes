// The Store App demo uses the existing M1002 supplier record in the PC demo.
(function () {
  const A=window.ShopAddress, B=window.MerchantBanks, mid='M1002', q=id=>document.getElementById(id);
  const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=(zh,en)=>currentLanguage==='en'?en:zh;
  // Persist newly created demo stores so they remain available after refresh.
  const createdStoreKey='fs-app-created-stores-v1';
  try{const saved=JSON.parse(localStorage.getItem(createdStoreKey)||'[]');if(Array.isArray(saved))saved.filter(s=>s.id&&s.name&&s.bank&&!storeProfiles.some(existing=>existing.id===s.id)).forEach(s=>storeProfiles.push(s));}catch(_){}
  function persistCreatedStores(){localStorage.setItem(createdStoreKey,JSON.stringify(storeProfiles.filter(s=>s.id.startsWith('app-store-'))));}
  storeProfiles.forEach(s=>{B.attach(s,'app:'+s.id,mid);const saved=A.load('app:'+s.id);if(saved)A.apply(s,saved)});
  const entry=document.createElement('button');entry.type='button';entry.className='quick-entry';entry.id='merchantBankEntry';entry.setAttribute('data-no-i18n','');
  q('bankAccountEntry').before(entry);
  const page=document.createElement('section');page.className='page with-actions';page.id='merchantBanksPage';page.dataset.page='merchantBanks';page.setAttribute('data-no-i18n','');
  q('myPage').after(page);pages.push(page);
  function showBankPage(){showPage('merchantBanks');}
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
  const storeEntry=document.createElement('button');
  storeEntry.type='button';storeEntry.className='quick-entry';storeEntry.id='storeManagementEntry';storeEntry.setAttribute('data-no-i18n','');
  entry.after(storeEntry);
  function makePage(id,name){
    const element=document.createElement('section');element.id=id;element.dataset.page=name;
    element.className='page with-actions';element.setAttribute('data-no-i18n','');
    page.after(element);pages.push(element);return element;
  }
  const storeListPage=makePage('managedStoresPage','managedStores');
  const styles=document.createElement('style');styles.textContent='#managedStoreEditPage .form-field select,#managedStoreEditPage .form-field textarea{width:100%;max-width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:12px;background:#fff;padding:12px;font:inherit;font-size:14px;color:#222}#managedStoreEditPage .form-field textarea{min-height:100px;resize:vertical}#managedStoresPage .quick-entry>span:nth-child(2){min-width:0}#managedStoresPage .quick-entry small{overflow-wrap:anywhere}';document.head.append(styles);
  const storeEditPage=makePage('managedStoreEditPage','managedStoreEdit');
  function storeList(){
    if(roleSwitch.value!=='merchant')return;
    storeListPage.innerHTML='<header class="topbar"><button class="icon-button" id="storesBack">‹</button><h1>'+text('店铺管理','Store Management')+'</h1><span></span></header><section class="section"><p class="permission-note">'+text('选择店铺，维护店铺资料和收款账户。','Select a store to maintain its details and bank account.')+'</p>'+storeProfiles.map(s=>'<button type="button" class="quick-entry" style="width:100%;text-align:left" data-manage-store="'+esc(s.id)+'"><span class="entry-icon">店</span><span><strong>'+esc(s.name)+'</strong><small>'+esc(s.address)+'</small><small>'+esc(B.label(s.bank))+'</small></span><span class="entry-chevron">›</span></button>').join('')+'</section><nav class="action-bar single"><button class="action-button primary" id="addManagedStore">'+text('新增店铺','Add Store')+'</button></nav>';
    q('addManagedStore').onclick=()=>editStore();
    q('storesBack').onclick=()=>showPage('my');
    storeListPage.querySelectorAll('[data-manage-store]').forEach(button=>button.onclick=()=>editStore(button.dataset.manageStore));
    showPage('managedStores');
  }
  function editStore(id){
    if(roleSwitch.value!=='merchant')return;
    const creating=!id;
    const store=creating?{id:'app-store-'+crypto.randomUUID(),name:'',phone:'+60 12-345 6789',country:'MY',countryName:'马来西亚',address:'',bank:{holder:'',bankName:'',accountNumber:''}}:storeProfiles.find(s=>s.id===id);if(!store)return;
    const selected=creating?null:B.selection('app:'+id).accountId,bank=store.bank,accounts=B.list(mid);
    const input=(key,label,value,extra='')=>'<label class="form-field"><span>'+label+' <i class="required">*</i></span><input id="managed-'+key+'" value="'+esc(value)+'" '+extra+' /></label>';
    storeEditPage.innerHTML='<header class="topbar"><button class="icon-button" id="storeEditBack">‹</button><h1>'+text(creating?'新增店铺':'编辑店铺',creating?'Add Store':'Edit Store')+'</h1><span></span></header><section class="section"><h2 class="section-title">'+text('店铺资料','Store Details')+'</h2>'+input('name',text('店铺名称','Store Name'),store.name)+input('phone',text('联系电话','Contact Number'),store.phone,'type="tel"')+'<label class="form-field"><span>'+text('店铺地址','Store Address')+' <i class="required">*</i></span><textarea id="managed-address" rows="3">'+esc(store.address)+'</textarea></label></section><section class="section"><h2 class="section-title">'+text('店铺收款账户','Store Bank Account')+'</h2><label class="form-field"><span>'+text('收款账户方式','Account Setup')+'</span><select id="managed-bankMode"><option value="independent">'+text('自行新增／维护收款账户','Add / Maintain Independent Account')+'</option><option value="merchant">'+text('选择商家收款账户','Select Merchant Account')+'</option></select></label><div id="managed-shared"><label class="form-field"><span>'+text('商家收款账户','Merchant Bank Account')+' <i class="required">*</i></span><select id="managed-account"><option value="">'+text(accounts.length?'请选择账户':'暂无商家收款账户',accounts.length?'Select an account':'No merchant accounts available')+'</option>'+accounts.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===selected?'selected':'')+'>'+esc(B.label(a))+'</option>').join('')+'</select></label><div id="managed-accountSummary" class="permission-note"></div><p class="form-hint">'+text('商家账户信息只读，可重新选择。新增或编辑商家账户，请从“我的 → 商家收款账户”进入。','Merchant account details are read-only. To add or edit one, open Me → Merchant Bank Accounts.')+'</p></div><div id="managed-independent">'+input('holder',text('收款人银行登记名称','Account Holder Name'),selected?'':bank.holder)+input('bankName',text('收款银行','Bank Name'),selected?'':bank.bankName)+input('number',text('银行账号','Account Number'),selected?'':bank.accountNumber,'inputmode="numeric" maxlength="20"')+'</div><p class="inline-error" id="managed-error"></p></section><nav class="action-bar single"><button class="action-button primary" id="saveManagedStore">'+text(creating?'创建店铺':'保存店铺资料',creating?'Create Store':'Save Store Details')+'</button></nav>';
    q('managed-bankMode').value=selected?'merchant':'independent';
    const summary=()=>{const account=B.account(mid,q('managed-account').value);q('managed-accountSummary').textContent=account?B.label(account):'';};
    const modeChanged=()=>{const shared=q('managed-bankMode').value==='merchant';q('managed-shared').style.display=shared?'':'none';q('managed-independent').style.display=shared?'none':'';summary();};
    q('managed-bankMode').onchange=modeChanged;q('managed-account').onchange=summary;modeChanged();
    q('storeEditBack').onclick=storeList;
    const addressForm=A.mount(q('managed-address'),A.initial(A.fixtures[mid],creating?null:store),currentLanguage==='en');
    q('saveManagedStore').onclick=()=>{
      if(roleSwitch.value!=='merchant')return;
      try{
        const addressError=addressForm.error();if(addressError)throw Error(addressError);
        const addressParts=addressForm.read();
        const name=q('managed-name').value.trim(),phone=q('managed-phone').value.trim(),address=q('managed-address').value.trim();
        if(!name||address.length<8||!/^\+60[\s-]?1\d[\d\s-]{7,10}$/.test(phone))throw Error(text('请完整填写店铺名称、联系电话和地址。','Enter the store name, contact number and address.'));
        const shared=q('managed-bankMode').value==='merchant';
        let accountId=null,independent=null;
        if(shared){accountId=q('managed-account').value;if(!B.account(mid,accountId))throw Error(text('请选择本商家的收款账户。','Select a bank account belonging to this merchant.'));}
        else{independent={holder:q('managed-holder').value.trim(),bankName:q('managed-bankName').value.trim(),accountNumber:q('managed-number').value.trim()};if(!independent.holder||!independent.bankName||!/^\d{8,20}$/.test(independent.accountNumber))throw Error(text('请填写完整银行信息及8–20位银行账号。','Enter the bank details and an 8–20 digit account number.'));}
        B.bind('app:'+store.id,mid,name,accountId,independent,'商家主账号 · App');
        Object.assign(store,{name,phone});A.persist('app:'+store.id,store,addressParts);
        if(creating){B.attach(store,'app:'+store.id,mid);storeProfiles.push(store);}
        persistCreatedStores();
        renderProfileScope();storeList();showToast(text(creating?'店铺已创建':'店铺资料已保存',creating?'Store created':'Store details saved'));
      }catch(error){q('managed-error').textContent=error.message;q('managed-error').classList.add('show');}
    };
    showPage('managedStoreEdit');
  }
  storeEntry.onclick=storeList;
  const oldRender=renderProfileScope;
  renderProfileScope=function(){
    oldRender();const merchant=roleSwitch.value==='merchant';
    entry.style.display=merchant?'grid':'none';storeEntry.style.display=merchant?'grid':'none';
    q('storeProfileScope').style.display='none';q('storeAddressEntry').style.display='none';
    q('bankAccountEntry').style.display=merchant?'none':'grid';
    entry.innerHTML='<span class="entry-icon">▤</span><span><strong>'+text('商家收款账户','Merchant Bank Accounts')+'</strong><small>'+text('独立管理商家的多个收款账户','Manage the merchant’s bank accounts')+'</small></span><span class="entry-chevron">›</span>';
    storeEntry.innerHTML='<span class="entry-icon">店</span><span><strong>'+text('店铺管理','Store Management')+'</strong><small>'+text('维护店铺资料，配置店铺收款账户','Manage store details and bank account selection')+'</small></span><span class="entry-chevron">›</span>';
    if(merchant){q('profileVerificationHint').setAttribute('data-no-i18n','');q('profileVerificationHint').textContent=text('店铺资料和收款配置可在店铺管理中维护','Manage store details and payout settings in Store Management');}
    if(!merchant&&[page,storeListPage,storeEditPage].some(p=>p.classList.contains('active')))showPage('my');
  };
  roleSwitch.addEventListener('change',()=>renderProfileScope());
  window.addEventListener('merchant-banks-changed',()=>{renderProfileScope();if(storeListPage.classList.contains('active'))storeList();});
  Object.assign(window.prototypeState,{renderProfileScope,merchantBanks:B,openMerchantBanks:list,openManagedStores:storeList,editManagedStore:editStore});
  renderProfileScope();
})();
