/* One account detail; App-specific records and permissions keep their original ownership. */
(function () {
  const A=window.realtimeAccounts, baseRender=renderDetail;
  let activeId=null;
  const storeFields=merchantDetailFields;
  merchantDetailFields=u=>storeFields(u).filter(([label])=>!['统一账号','账号状态','商家状态'].includes(label));
  const row=id=>A.rows().find(a=>a.id===id);
  const e=v=>esc(v==null||v===''?'—':String(v));
  const fields=items=>'<div class="account-facts">'+items.map(([label,value])=>'<div class="account-fact"><span>'+e(label)+'</span><div>'+e(value)+'</div></div>').join('')+'</div>';
  const card=(title,body,actions='')=>'<div class="card legacy-detail-card"><div class="card-head"><h3 class="section-title">'+title+'</h3>'+actions+'</div><div class="card-body">'+body+'</div></div>';
  const button=(action,id,label='编辑',extra='')=>'<button class="btn link" data-merged-action="'+action+'" data-record="'+id+'" '+extra+'>'+label+'</button>';
  const tabs=[['basic','基本信息'],['kyc','KYC 认证材料'],['limit','限额与保证金'],['permission','业务权限'],['share','分账规则'],['merchant-banks','收款账户'],['owner','维护人绑定'],['log','操作日志']];
  function selectedTab(){return $('#detailPage .tab.active')?.dataset.tab||'basic';}
  function context(a){currentUser=a.store||a.fs||{id:a.id,name:a.name,account:a.account};}
  function available(a,key){return key==='share'?a.role==='商家':key==='merchant-banks'?['商家','店员'].includes(a.role):true;}
  function tabTo(key){const a=row(activeId);if(!a)return;context(a);if(key==='log')renderLogs(a);activateTab(available(a,key)?key:'basic');}
  function recordChanges(id,source,before,after,reason='—'){
    for(const key of Object.keys(after))if(JSON.stringify(before[key])!==JSON.stringify(after[key])){const mask=v=>/证件号码|证照编号/.test(key)&&v&&v!=='—'?maskedDocumentNumber(v):v;A.log(id,key,mask(before[key])??'—',mask(after[key])??'—',source,reason);}
  }
  function fsBasic(fs){return card('FoneSquare 商家记录',fields([
    ['创建来源',fs.firstRegisteredApp?fs.firstRegisteredApp+' 注册':'FoneSquare 注册'],['商家 ID',fs.merchantId],['商家名称',fs.name],['商家类型',legacyMerchantRoles(fs).join(' / ')],['姓 / 名',[fs.lastName,fs.firstName].filter(Boolean).join(' ')],['手机',fs.rawPhone?maskPhone(fs.rawPhone):'—'],['邮箱',fs.rawEmail?maskEmail(fs.rawEmail):'—'],['所在地区',fs.region],['备注',fs.remark],['FoneSquare KYC 状态',fs.kyc]
  ]),button('profile',fs.merchantId));}
  function maskPhone(value){return String(value).replace(/(.{3}).*(.{3})$/,'$1****$2');}
  function maskEmail(value){return String(value).replace(/^(.{1,3})[^@]*(@.*)$/,'$1***$2');}
  function attachment(value){return value&&value.data?'<a href="'+value.data+'" download="'+esc(value.name)+'">'+esc(value.name)+'</a>':e(typeof value==='string'&&value!=='—'?value:'未上传');}
  function kyc(fs){
    if(!fs)return card('FoneSquare KYC 认证材料','<p class="subtle">暂无 FoneSquare 商家资料，未建立认证材料；查看账号不会自动创建商家记录。</p>');
    return card('个人 KYC 材料',fields([['认证状态',fs.kyc],['证件类型',fs.documentType],['证件号码',fs.documentNumber?maskedDocumentNumber(fs.documentNumber):'—'],['证件上的姓',fs.kycLastName??fs.lastName],['证件上的名',fs.kycFirstName??fs.firstName],['证件有效期',fs.documentExpiry],['资料来源',fs.kycSource||'—']])+ '<div class="attachment-grid">'+[['证件正面','documentFront'],['证件反面','documentBack'],['手持证件照','documentSelfie']].map(([l,k])=>'<div>'+l+'：'+attachment(fs[k])+'</div>').join('')+'</div>',button('kyc-personal',fs.merchantId))+
      card('企业 KYC 材料',fields([['企业名称',fs.companyName],['证照类型',fs.companyLicenseType],['证照编号',fs.companyRegistrationNo?maskedDocumentNumber(fs.companyRegistrationNo):'—'],['法定代表 / 董事',fs.companyLegalRepresentative],['企业地址',fs.companyAddress],['证照有效期',fs.companyLicenseExpiry]])+'<div class="attachment-grid">企业证照：'+attachment(fs.companyLicenseImage)+'</div>',button('kyc-company',fs.merchantId));
  }
  function limits(fs){
    if(!fs)return card('FoneSquare 限额与保证金','<p class="subtle">暂无 FoneSquare 商家资料，尚无卖场限额与保证金配置。</p>');
    if(!merchantRolesFor(fs).includes('买家商家'))return card('限额与保证金','<p class="subtle">当前 FoneSquare 商家无买家身份，限额与保证金不适用。</p>');
    return '<div class="alert">限额与保证金按 FoneSquare 卖场分别维护；免保上限以上须有保证金及转账凭证，限额不得超过保证金 × 10。</div>'+[['迪拜','AED'],['香港','HKD']].map(([site,currency])=>{
      const v=fs.limitsBySite?.[site]||{};
      return card(site+'卖场',fields([['每日下单限额（'+currency+'）',v.dailyLimit],['保证金金额（'+currency+'）',v.depositAmount],['免保上限（'+currency+'）',fs.guaranteeFreeLimit]])+'<div class="attachment-grid">保证金转账记录：'+attachment(v.proof||v.depositTransfer)+'</div>',button('limit',fs.merchantId,'编辑','data-site="'+site+'"'));
    }).join('');
  }
  function staffBasic(a){const s=a.staff,m=staffRelationStatus(s)==='已关联'?merchantById(s.merchantId):null;
    return card('门店端店员资料',fields([['成员 ID',s.id],['门店端身份','店员'],['关联状态',staffRelationStatus(s)],['当前所属商家',m?m.name+' · '+m.merchantId:'—'],['首次登录门店端',a.firstStoreLoginAt],['关联时间',s.linkedAt],['解除时间',s.unlinkedAt]])+'<h3>历史所属商家</h3><div class="timeline">'+staffRelationHistory(s)+'</div>',staffDetailActions(s).replace(/<button[^>]+data-staff-action="edit-bank"[\s\S]*?<\/button>/,''));
  }
  function staffBank(a){return card('店员个人收款账户','<p>'+e(maskedBankAccount(a.staff.bank))+'</p><p class="subtle">本人银行卡与所属商家关系独立；转移或解除关系不会清除。</p>','<button class="btn" data-staff-action="edit-bank" data-staff-id="'+a.staff.id+'">维护银行卡</button>');}
  function renderLogs(a){
    const events=[...(A.histories.get(a.id)||[])];
    for(const u of [a.fs,a.store].filter(Boolean)){
      const source=u===a.fs?'FoneSquare':'门店端';
      events.push({at:merchantCreatedAt(u),source,action:'创建商家',before:'—',after:u.merchantId,reason:'已有业务记录',operator:'系统'});
      for(const h of u.ownerHistory||[])events.push({at:h.unboundAt,source,action:'维护人历史',before:h.owner,after:'已解绑',reason:h.reason,operator:h.operator});
    }
    if(a.store)for(const h of prototypeState.merchantBanks.history(a.store.merchantId))events.push({...h,source:'门店端收款账户'});
    const render=(source='')=>{const shown=events.filter(h=>!source||h.source===source).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
      $('#mergedLogs').innerHTML=shown.length?'<table class="table"><thead><tr>'+['时间','所属业务','字段 / 动作','变更','原因','操作人'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+shown.map(h=>'<tr>'+[h.at,h.source,h.action,String(h.before??'—')+' → '+String(h.after??'—'),h.reason||'—',h.operator].map(x=>'<td>'+e(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<div class="empty-compact">暂无操作日志</div>';};
    $('#tab-log').innerHTML=card('操作日志','<div class="table-wrap" id="mergedLogs"></div>','<select class="control" id="mergedLogSource" style="width:180px"><option value="">全部业务</option>'+[...new Set(events.map(x=>x.source))].map(x=>'<option>'+e(x)+'</option>').join('')+'</select>');
    render();$('#mergedLogSource').onchange=ev=>render(ev.target.value);
  }
  function renderMerged(){
    const a=row(activeId);if(!a)return;const selected=selectedTab();context(a);
    let storeBasic='',storePermissions='';
    if(a.role==='商家'&&a.store){baseRender();storeBasic=$('#tab-basic').innerHTML;storePermissions=$('#tab-permission').innerHTML;prototypeState.renderMerchantBankAccounts();}
    else {$('#tab-share').innerHTML='';$('#tab-merchant-banks').innerHTML=a.role==='店员'?staffBank(a):'';}
    $('#detailName').textContent='账号详情 · '+a.name;$('#detailTags').innerHTML=statusTag(a.status)+tag(a.storeState==='未选择'?'已登录未选择身份':a.storeState,'blue');
    $('#detailMerchantId').textContent=a.id;$('#detailOwner').textContent=a.owner;$('#detailCreatedAt').textContent=a.time;
    $('#detailMeta').textContent='统一账号';$('#detailSourceBadge').textContent='';
    const noRole=a.firstStoreLoginAt?'已登录门店端，尚未选择身份。请由用户在门店端选择身份后完善资料。':'尚未登录门店端。首次登录并选择身份后，再展示对应业务资料。';
    $('#tab-basic').innerHTML=card('统一账号',fields([['统一账号',a.account],['账号状态',a.status],['账号 ID',a.id],['账号注册时间',a.time],['门店端使用状态',a.storeState==='未选择'?'已登录但未选择身份':a.storeState],['首次登录门店端',a.firstStoreLoginAt]]))+
      (a.fs?fsBasic(a.fs):card('FoneSquare 商家记录','<p class="subtle">暂无 FoneSquare 商家资料，资料待完善。出价权限可在“业务权限”中独立维护。</p>'))+
      (a.role==='商家'?storeBasic:a.role==='店员'?staffBasic(a):card('门店端资料','<p class="subtle">'+noRole+'</p>'));
    $('#tab-kyc').innerHTML=kyc(a.fs);$('#tab-limit').innerHTML=limits(a.fs);
    $('#tab-permission').innerHTML=card('FoneSquare 出价权限',A.fsBidSwitch(a)+'<p class="subtle">出价仍需满足认证等交易条件；开启不会创建商家资料或门店端身份。</p>')+
      (a.role==='商家'?storePermissions:a.role==='店员'?card('店员个人建拍权限',fields([['设置值',memberBuildState(a.staff).configured],['实际状态',memberBuildState(a.staff).effective]])+'<p class="subtle">在商家列表维护；须已关联商家、双方账号启用且商家建拍权限开启才可生效。</p>'):card('门店端建拍权限','<p class="subtle">'+noRole+' 当前不提供建拍配置。</p>'));
    $('#tab-owner').innerHTML=[a.fs,a.store].filter(Boolean).map(u=>'<div class="account-business-label">'+(u===a.fs?'FoneSquare':'门店端')+' · '+e(u.merchantId)+'</div>'+renderOwnerPanel(u)).join('')||card('维护人绑定','<p class="subtle">暂无可绑定维护人的商家业务记录；店员与商家的关系在基本信息中维护。</p>');
    renderLogs(a);
    for(const [key,label] of tabs){const b=$('#detailPage .tab[data-tab="'+key+'"]');b.textContent=label;b.style.display=available(a,key)?'':'none';b.onclick=()=>tabTo(key);}
    $('#statusBtn').textContent=a.status==='启用'?'停用':'启用';$('#statusBtn').className='btn link '+(a.status==='启用'?'account-danger':'');$('#statusBtn').onclick=()=>A.toggle(a.id);
    tabTo(selected);$('#crumbCurrent').textContent='账号详情';
  }
  function openUnified(id,tab='basic'){
    const a=row(String(id));if(!a)return;A.rememberOrigin();activeId=a.id;closeModals();context(a);setView('detail');renderMerged();tabTo(tab);
    const origin=A.returnPoint().view;$('#backBtn').hidden=false;$('#backBtn').className='btn';$('#backBtn').textContent='← 返回'+({staff:'店员列表',store:'店铺列表',storeDetail:'店铺详情',list:'商家列表'}[origin]||'列表');$('#backBtn').onclick=A.goBack;
    $$('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===(origin==='staff'?'staff':origin==='store'?'store':'list')));
  }
  // Global entry points keep existing store links and edit-save callbacks on this same detail.
  openDetail=(u,tab)=>{if(u)openUnified(u.accountId||u.id,tab);};
  openStaffDetail=id=>{const s=staffAccounts().find(s=>s.id===id);if(s)openUnified(A.staffId(s));};
  renderDetail=()=>{if(activeId)renderMerged();};
  const refreshStaff=refreshStaffViews;
  refreshStaffViews=function(){refreshStaff();if($('#detailPage').classList.contains('active')&&row(activeId)?.role==='店员')renderMerged();};
  const viewBase=setView;
  setView=function(v){viewBase(v);if(v==='detail'&&activeId){$('#crumbCurrent').textContent='账号详情';const origin=A.returnPoint().view;$$('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===(origin==='staff'?'staff':origin==='store'?'store':'list')));}};

  const personal=[['documentType','证件类型'],['documentNumber','证件号码'],['kycLastName','证件上的姓'],['kycFirstName','证件上的名'],['documentExpiry','证件有效期','date'],['kycSource','资料来源']];
  const company=[['companyName','企业名称'],['companyLicenseType','证照类型'],['companyRegistrationNo','证照编号'],['companyLegalRepresentative','法定代表 / 董事'],['companyAddress','企业地址'],['companyLicenseExpiry','证照有效期','date']];
  function fileInput(key,label){return '<div class="field"><label>'+label+'</label><input type="file" accept="image/*" id="merged-'+key+'" /><span class="subtle">不选择新图片则保留原附件</span></div>';}
  async function readUploads(keys){const out={};for(const key of keys){const file=$('#merged-'+key).files[0];if(!file)continue;if(!file.type.startsWith('image/'))throw Error('请选择图片文件');if(file.size>5*1024*1024)throw Error('单张图片不能超过 5 MB');out[key]={name:file.name,data:await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('图片读取失败'));r.readAsDataURL(file);})};}return out;}
  function editKyc(u,isCompany){
    const spec=isCompany?company:personal,files=isCompany?[['companyLicenseImage','企业证照']]:[['documentFront','证件正面'],['documentBack','证件反面'],['documentSelfie','手持证件照']];
    openBusinessModal(isCompany?'编辑企业 KYC 材料':'编辑个人 KYC 材料','<p class="subtle">各项均为选填，个人与企业材料不分先后；保存材料不自动改变账号状态或门店端身份。</p><div class="form-grid">'+spec.map(([k,l,t])=>'<div class="field"><label>'+l+'</label><input class="control" id="merged-'+k+'" type="'+(t||'text')+'" value="'+esc(u[k]||'')+'" /></div>').join('')+(!isCompany?'<div class="field"><label>认证状态</label><select class="control" id="merged-kyc">'+['未认证','已认证','认证失败'].map(v=>'<option '+(u.kyc===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div>':'')+files.map(([k,l])=>fileInput(k,l)).join('')+'</div>','保存',async()=>{
      const confirm=$('#businessConfirmBtn');confirm.disabled=true;
      try{const uploads=await readUploads(files.map(x=>x[0])),before={},after={};for(const [k,l] of spec){before[l]=u[k]||'—';after[l]=$('#merged-'+k).value.trim()||'—';}
        if(!isCompany){before['认证状态']=u.kyc;after['认证状态']=$('#merged-kyc').value;}
        for(const [k,l] of files)if(uploads[k]){before[l]=u[k]?.name||'未上传';after[l]=uploads[k].name;}
        for(const [k,l] of spec)u[k]=after[l]==='—'?'':after[l];if(!isCompany)u.kyc=after['认证状态'];Object.assign(u,uploads);
        recordChanges(u.id,'FoneSquare',before,after);closeModals();renderList();openUnified(u.id,'kyc');toast('KYC 材料已保存');
      }catch(error){modalError(error.message);}finally{confirm.disabled=false;}
    });
  }
  function editLimit(u,site){const item=u.limitsBySite?.[site]||{},currency=site==='香港'?'HKD':'AED',free=Number(u.guaranteeFreeLimit)||0;
    openBusinessModal('编辑'+site+'限额与保证金','<p>币种：'+currency+'；免保上限：'+free+'</p><div class="form-grid"><div class="field"><label>每日下单限额</label><input class="control" type="number" min="0" id="merged-daily" value="'+(Number(item.dailyLimit)||0)+'" /></div><div class="field"><label>保证金金额</label><input class="control" type="number" min="0" id="merged-deposit" value="'+(Number(item.depositAmount)||0)+'" /></div>'+fileInput('proof','保证金转账凭证')+'<div class="field"><label>调整原因 *</label><input class="control" id="merged-limit-reason" /></div></div>','保存',async()=>{
      const daily=Number($('#merged-daily').value),deposit=Number($('#merged-deposit').value),reason=$('#merged-limit-reason').value.trim();
      if(!Number.isFinite(daily)||!Number.isFinite(deposit)||daily<0||deposit<0||!reason){modalError('请填写有效的非负金额及调整原因');return;}
      if(daily>free&&daily>deposit*10){modalError('超过免保上限时，限额不得高于保证金 × 10');return;}
      const confirm=$('#businessConfirmBtn');confirm.disabled=true;
      try{const uploads=await readUploads(['proof']),proof=uploads.proof||item.proof,oldProof=item.depositTransfer&&item.depositTransfer!=='—'&&item.depositTransfer!=='未上传';if(daily>free&&!proof&&!oldProof){modalError('超过免保上限时须上传保证金转账凭证');return;}
        u.limitsBySite||={};u.limitsBySite[site]={...item,currency,dailyLimit:daily,depositAmount:deposit,...(proof?{proof,depositTransfer:proof.name}:{})};if(site==='香港'){u.dailyLimit=daily;u.depositAmount=deposit;}
        recordChanges(u.id,'FoneSquare',{[site+'每日下单限额']:item.dailyLimit,[site+'保证金']:item.depositAmount,[site+'转账凭证']:item.proof?.name||item.depositTransfer||'未上传'},{[site+'每日下单限额']:daily,[site+'保证金']:deposit,[site+'转账凭证']:proof?.name||item.depositTransfer||'未上传'},reason);
        closeModals();openUnified(u.id,'limit');toast('限额与保证金已保存');
      }catch(error){modalError(error.message);}finally{confirm.disabled=false;}
    });
  }
  // Reuse existing editors while adding field-level audit; shared bank module keeps its own log.
  function withAudit(open,u,source,snapshot){const before=snapshot();open();if(!$('#businessModal').classList.contains('show'))return;const confirm=$('#businessConfirmBtn'),save=confirm.onclick;confirm.onclick=()=>{const reason=$('#merchantOwnerReason')?.value||$('#staffTransferReason')?.value||$('#staffUnbindReason')?.value||'—';save();if(!$('#businessModal').classList.contains('show')){recordChanges(u.id||u.accountId,source,before,snapshot(),reason);if($('#detailPage').classList.contains('active'))renderMerged();}};}
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-merged-action]');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();const u=merchantById(b.dataset.record);if(!u)return;
    if(b.dataset.mergedAction==='profile')openMerchantProfileEditor(u);
    if(b.dataset.mergedAction==='kyc-personal')editKyc(u,false);
    if(b.dataset.mergedAction==='kyc-company')editKyc(u,true);
    if(b.dataset.mergedAction==='limit')editLimit(u,b.dataset.site);
  },true);
  const staffAction=handleStaffAction;
  handleStaffAction=function(action,id){const s=staffAccounts().find(x=>x.id===id);if(!s||action==='view'||action==='toggle-personal')return staffAction(action,id);
    withAudit(()=>staffAction(action,id),{id:A.staffId(s)},'门店端店员',()=>({'所属商家':s.merchantId||'—','关联状态':staffRelationStatus(s),'收款账户':maskedBankAccount(s.bank)}));};
  const profileEditor=openMerchantProfileEditor;
  openMerchantProfileEditor=u=>withAudit(()=>profileEditor(u),u,merchantSource(u)==='FoneSquare'?'FoneSquare':'门店端',()=>({'名':u.firstName,'姓':u.lastName,'所在地区':u.region,'备注':u.remark,'手机':maskPhone(u.rawPhone||''),'邮箱':maskEmail(u.rawEmail||'')}));
  const ownerEditor=openMerchantOwnerEditor;
  openMerchantOwnerEditor=u=>withAudit(()=>ownerEditor(u),u,merchantSource(u)==='FoneSquare'?'FoneSquare':'门店端',()=>({'维护人':u.owner}));
  Object.assign(prototypeState,{openUnifiedDetail:openUnified,openDetail,openStaffDetail});
  // Keep tab order stable regardless of the order in which legacy extensions created panels.
  tabs.forEach(([key])=>$('#detailPage .tabs').append($('#detailPage .tab[data-tab="'+key+'"]')));
})();
