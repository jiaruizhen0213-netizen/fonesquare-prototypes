/* Merchant-scoped accounts; independent store and employee banking remain separate. */
(function () {
  const B=window.MerchantBanks, e=esc;
  Object.assign(I18N_EXACT,{'商家收款账户':'Merchant Bank Accounts','收款账户':'Bank Accounts','新增账户':'Add Account','＋ 新增账户':'＋ Add Account','新增商家收款账户':'Add Merchant Bank Account','编辑商家收款账户':'Edit Merchant Bank Account','收款人银行登记名称':'Account Holder Name','收款银行':'Bank Name','银行账号':'Account Number','使用店铺':'Stores Using Account','选择商家收款账户':'Select Merchant Bank Account','请选择商家收款账户':'Select a merchant bank account','店铺独立账户':'Independent Store Account','收款账户方式':'Account Setup','保存账户':'Save Account','商家收款账户已保存':'Merchant bank account saved','暂无商家收款账户，请新增账户':'No merchant accounts yet. Add an account.','收款账户操作记录':'Bank Account History','所选账户信息只读，保存后可在店铺编辑中切换。':'Account details are read-only. Edit the store to switch accounts later.'});
  stores.forEach(s=>B.attach(s,'pc:'+s.id,s.merchantId));
  const tab=document.createElement('button'); tab.className='tab';tab.dataset.tab='merchant-banks';tab.textContent='收款账户';
  document.querySelector('#detailPage .tabs').append(tab);
  const panel=document.createElement('div');panel.className='tab-panel';panel.id='tab-merchant-banks';document.querySelector('#detailPage').append(panel);
  tab.onclick=()=>{renderAccounts();activateTab('merchant-banks');};
  const oldOpenDetail=openDetail;
  openDetail=function(u,t){oldOpenDetail(u,t);tab.style.display=merchantSource(u)==='门店端'?'':'none';if(merchantSource(u)==='门店端')renderAccounts();};
  function renderAccounts(){
    const id=currentUser.merchantId, rows=B.list(id);
    panel.innerHTML='<div class="card"><div class="card-head"><h3 class="section-title">商家收款账户</h3><button class="btn primary" id="addMerchantBank">＋ 新增账户</button></div><div class="card-body"><div class="subtle">商家在门店端 App 与平台维护同一组账户。店铺选择后只读，可在编辑店铺时更换；商家账户修改会同步到引用店铺。</div></div><div class="table-wrap"><table class="table" style="min-width:900px"><thead><tr><th>收款人银行登记名称</th><th>收款银行</th><th>银行账号</th><th>使用店铺</th><th>更新时间</th><th>操作</th></tr></thead><tbody>'+rows.map(a=>'<tr><td>'+e(a.holder)+'</td><td>'+e(a.bankName)+'</td><td>•••• '+e(a.accountNumber.slice(-4))+'</td><td>'+B.used(id,a.id).length+' 家<div class="subtle">'+B.used(id,a.id).map(s=>e(s.name)).join('、')+'</div></td><td>'+e(a.updatedAt)+'</td><td><button class="btn link" data-edit-merchant-bank="'+e(a.id)+'">编辑</button></td></tr>').join('')+'</tbody></table>'+(rows.length?'':'<div class="empty-compact">暂无商家收款账户，请新增账户</div>')+'</div></div><div class="card"><div class="card-head">收款账户操作记录</div><div class="card-body">'+B.history(id).map(h=>'<div style="padding:10px 0;border-bottom:1px solid #f0f0f0;line-height:1.7">'+e(h.action+'：'+h.before+' → '+h.after+' · '+h.operator+' · '+h.at)+'</div>').join('')+'</div></div>';
    document.querySelector('#addMerchantBank').onclick=()=>editAccount();
    panel.querySelectorAll('[data-edit-merchant-bank]').forEach(button=>button.onclick=()=>editAccount(button.dataset.editMerchantBank));
  }
  function editAccount(id){
    const merchantId=currentUser.merchantId,a=B.account(merchantId,id)||{holder:'',bankName:'',accountNumber:''},affected=B.used(merchantId,id);
    openBusinessModal(id?'编辑商家收款账户':'新增商家收款账户','<div class="form-grid">'+[['holder','收款人银行登记名称'],['bankName','收款银行'],['accountNumber','银行账号']].map(([k,l])=>'<div class="field span-2"><label>'+l+' *</label><input class="control" id="merchantBank-'+k+'" value="'+e(k==='accountNumber'?'':a[k])+'" placeholder="'+(k==='accountNumber'&&id?'留空保留原账号（尾号 '+e(a.accountNumber.slice(-4))+'）':'请输入'+l)+'" /></div>').join('')+'</div>'+(affected.length?'<div class="alert warning">修改将同步影响：'+affected.map(s=>e(s.name)).join('、')+'。历史结算快照不变。</div><label><input type="checkbox" id="confirmBankImpact" /> 我已确认以上店铺的收款账户变更</label>':''),'保存账户',()=>{
      if(affected.length&&!document.querySelector('#confirmBankImpact').checked){modalError('请先确认受影响店铺。');return;}
      try{B.save(merchantId,{holder:document.querySelector('#merchantBank-holder').value.trim(),bankName:document.querySelector('#merchantBank-bankName').value.trim(),accountNumber:document.querySelector('#merchantBank-accountNumber').value.trim()||a.accountNumber},id,'平台运营');closeModals();renderAccounts();renderStoreList();toast('商家收款账户已保存');}catch(error){modalError(error.message);}
    },'primary');
  }
  function options(mid,selected){return '<option value="">请选择商家收款账户</option>'+B.list(mid).map(a=>'<option value="'+e(a.id)+'" '+(a.id===selected?'selected':'')+'>'+e(B.label(a))+'</option>').join('');}
  const mode=document.querySelector('#newStoreBankMode');mode.insertAdjacentHTML('beforeend','<option value="merchant">选择商家收款账户</option>');
  const source=document.createElement('div');source.className='field span-2';source.id='newMerchantBankWrap';source.style.display='none';source.innerHTML='<label>商家收款账户 *</label><select class="control" id="newMerchantBank"></select><div class="subtle">所选账户信息只读，保存后可在店铺编辑中切换。</div>';
  document.querySelector('#newStoreBankSourceWrap').after(source);
  const oldSync=syncNewStoreBankMode,oldMerchant=syncNewStoreMerchant;
  syncNewStoreBankMode=function(){oldSync();const selected=mode.value==='merchant';source.style.display=selected?'block':'none';if(selected)['newStoreBankHolderField','newStoreBankNameField','newStoreBankNumberField'].forEach(id=>document.getElementById(id).style.display='none');};
  syncNewStoreMerchant=function(){oldMerchant();const mid=document.querySelector('#newStoreMerchant').value;document.querySelector('#newMerchantBank').innerHTML=options(mid);if(!B.list(mid).length)document.querySelector('#newMerchantBank').options[0].textContent='该商家暂无收款账户，可使用其他维护方式';};
  mode.onchange=syncNewStoreBankMode;document.querySelector('#newStoreMerchant').onchange=syncNewStoreMerchant;
  const oldSave=saveStore;
  document.querySelector('#saveStore').onclick=function(){
    if(mode.value!=='merchant')return oldSave();
    const mid=document.querySelector('#newStoreMerchant').value,id=document.querySelector('#newMerchantBank').value,a=B.account(mid,id);
    if(!a){document.querySelector('#storeError').textContent='请选择本商家的收款账户。';document.querySelector('#storeError').classList.add('show');return;}
    const before=stores.length;mode.value='new';[['newStoreBankHolder','holder'],['newStoreBankName','bankName'],['newStoreBankNumber','accountNumber']].forEach(([field,k])=>document.getElementById(field).value=a[k]);oldSave();mode.value='merchant';
    if(stores.length>before){const s=stores.at(-1);B.bind('pc:'+s.id,mid,s.name,id,null,'平台运营');B.attach(s,'pc:'+s.id,mid);renderStoreList();toast('店铺已创建，已选择商家收款账户');}
  };
  const oldEditor=openStoreEditor;
  openStoreEditor=function(store){
    oldEditor(store);
    const originalConfirm=document.querySelector('#businessConfirmBtn').onclick;
    const body=document.querySelector('#businessModalBody'),selected=B.selection('pc:'+store.id).accountId;
    body.querySelector('.alert').innerHTML='<span>ⓘ</span><div>店铺可独立维护账户，也可选择本商家账户。所选商家账户只读，切换后保存生效。</div>';
    const wrap=document.createElement('div');wrap.className='field span-2';wrap.innerHTML='<label>收款账户方式</label><select class="control" id="editBankMode"><option value="independent">店铺独立账户</option><option value="merchant">选择商家收款账户</option></select><div id="editMerchantBankWrap"><label>商家收款账户 *</label><select class="control" id="editMerchantBank">'+options(store.merchantId,selected)+'</select><div class="subtle">账户信息只读；需要修改商家账户，请到商家详情的收款账户 Tab。</div></div>';
    body.querySelector('.form-grid').insertBefore(wrap,document.querySelector('#editStoreBankHolder').closest('.field'));
    document.querySelector('#editBankMode').value=selected?'merchant':'independent';
    const update=()=>{const shared=document.querySelector('#editBankMode').value==='merchant';document.querySelector('#editMerchantBankWrap').style.display=shared?'block':'none';['editStoreBankHolder','editStoreBankName','editStoreBankNumber'].forEach(id=>document.getElementById(id).closest('.field').style.display=shared?'none':'block');};
    document.querySelector('#editBankMode').onchange=update;update();
    document.querySelector('#businessConfirmBtn').onclick=()=>{
      if(document.querySelector('#editBankMode').value==='independent')return originalConfirm();
      const id=document.querySelector('#editMerchantBank').value;
      if(!B.account(store.merchantId,id)){modalError('请选择本商家的收款账户。');return;}
      const name=document.querySelector('#editStoreName').value.trim(),phone=document.querySelector('#editStorePhone').value.trim(),address=document.querySelector('#editStoreAddress').value.trim();
      if(!name||!phone||!address){modalError('请完整填写店铺名称、地址和电话。');return;}
      B.bind('pc:'+store.id,store.merchantId,name,id,null,'平台运营');Object.assign(store,{name,phone,address,city:address.split(',').pop().trim(),updatedAt:new Date().toLocaleString('zh-CN')});closeModals();renderStoreList();openStoreDetail(store);toast('店铺资料已保存，收款账户已更新');
    };
  };
  const oldStoreDetail=openStoreDetail;
  openStoreDetail=function(s){oldStoreDetail(s);const card=document.querySelector('#storeDetailBody .card-body');const line=document.createElement('div');line.style.padding='9px 0';line.textContent='收款账户方式：'+(B.selection('pc:'+s.id).accountId?'商家收款账户（可在编辑店铺时切换）':'店铺独立账户');card.append(line);if(B.selection('pc:'+s.id).accountId){document.querySelectorAll('#storeDetailBody .subtle').forEach(n=>{if(n.textContent.includes('本店铺资料与其他店铺独立'))n.textContent='店铺地址独立维护；当前引用商家收款账户，可在编辑店铺时更换。商家账户变更会同步到引用店铺。';});}};
  Object.assign(window.prototypeState,{openDetail,openStoreEditor,openMerchantBankEditor:editAccount,merchantBanks:B});
  window.addEventListener('merchant-banks-changed',()=>{renderStoreList();if(currentUser&&tab.style.display!=='none')renderAccounts();});
})();
