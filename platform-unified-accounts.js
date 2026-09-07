/* Unified account view. App business records retain their existing IDs and history. */
(function () {
  const accountStates = new Map(), roles = new Map(), histories = new Map();
  const oldRenderList = renderList, oldOpenDetail = openDetail;
  const oldStaffAccounts = staffAccounts;
  employeeAccounts.forEach((s, i) => { s.accountId = s.accountId || String(2000001 + i); });
  function staffId(s) { return s.accountId || s.id; }
  function records(id) { return users.filter(u => u.id === id); }
  function staffFor(id) { return employeeAccounts.find(s => staffId(s) === id); }
  function storeFor(id) { return records(id).find(u => u.type === '供货商家' && !u.identityArchived); }
  function fsFor(id) { return records(id).find(u => u.type === 'FoneSquare 回收商'); }
  function role(id) { return roles.get(id) || (storeFor(id) ? '商家' : staffFor(id) ? '店员' : '未选择'); }
  function state(id) {
    if (!accountStates.has(id)) {
      const rs = records(id), staff = staffFor(id);
      accountStates.set(id, rs.some(u => u.status === '停用' || ['停用','冻结','受限','注销'].includes(u.accountStatus)) || staff?.appStatus === '停用' ? '停用' : '启用');
    }
    return accountStates.get(id);
  }
  function log(id, action, before, after) {
    if (!histories.has(id)) histories.set(id, []);
    histories.get(id).push({action, before, after, operator:'平台运营', at:new Date().toLocaleString('zh-CN')});
  }
  function rows() {
    const ids = [...new Set([...users.map(u => u.id), ...employeeAccounts.map(staffId)])];
    return ids.map(id => {
      const rs = records(id), staff = staffFor(id), first = [...rs].sort((a,b) => String(a.createdAt || a.time).localeCompare(String(b.createdAt || b.time)))[0];
      const u = first || staff;
      return {id, name:u.name, account:u.account, raw:[...rs.flatMap(accountKeys),staff?.rawAccount || ''].join(' '), fs:fsFor(id), store:storeFor(id), staff, role:role(id), status:state(id), owner:first?.owner || '未分配', source:first?.firstRegisteredApp || (first ? merchantSource(first) : '门店端'), time:first?.createdAt || first?.time || staff?.registeredAt || '—'};
    }).sort((a,b) => b.time.localeCompare(a.time));
  }
  function unlink(s) {
    if (s.merchantId) { s.relationHistory ||= []; s.relationHistory.push({merchantId:s.merchantId,status:'已解除',endedAt:new Date().toLocaleString('zh-CN')}); }
    s.merchantId=null; s.relationStatus='已解除'; s.unlinkedAt=new Date().toLocaleString('zh-CN');
  }
  function refresh() { filtered=rows(); renderList(); filteredStaff=staffAccounts(); renderStaffList(); renderStoreList(); }
  function applyState(id, next) {
    const previous=state(id); accountStates.set(id,next);
    records(id).forEach(u => { u.accountStatus=next==='启用'?'正常':'停用'; u.status=u.accountStatus; });
    const s=staffFor(id); if(s)s.appStatus=next==='启用'?'正常':'停用';
    if(next==='停用' && role(id)==='商家') { const m=storeFor(id); if(m)employeesForMerchant(m.merchantId).forEach(unlink); }
    log(id,'账号状态',previous,next); refresh();
  }
  function toggle(id) {
    const next=state(id)==='启用'?'停用':'启用';
    const message=next==='停用' ? '停用后两个 App 均不可登录，现有登录失效，业务数据保留。'+(role(id)==='商家'?'同时解除全部店员关系，店员账号本身不停用。':'') : '恢复两个 App 登录，业务仍按原有权限开放。原店员关系不会自动恢复，需要平台重新绑定。';
    openBusinessModal(next+'账号','<p>'+message+'</p>','确认'+next,()=>{applyState(id,next);closeModals();if($('#detailPage').classList.contains('active') && currentUser?.id===id)openDetail(currentUser);toast('账号已'+next);},next==='停用'?'danger':'primary');
  }
  function businessReason(id) {
    const m=storeFor(id),s=staffFor(id),isMerchant=role(id)==='商家';
    // Seeded business records retain original actor / merchant references, even after a relationship ends.
    const happened=[...bids,...orders,...settlementLedger].some(b => isMerchant ? m && (b.merchantId===m.merchantId || b.merchant===m.name || b.merchantName===m.name) : s && (b.operatorId===s.id || b.operator===s.name || b.recipientId===s.id));
    if(happened || (isMerchant ? m?.hasStoreBusiness : s?.hasStoreBusiness)) return '已发生门店端业务，不能修改身份（已结束或取消也计入）。';
    if(isMerchant && m && employeesForMerchant(m.merchantId).length) return '当前仍有关联店员，请先解除关系。';
    return '';
  }
  function changeRole(id,target) {
    const before=role(id);
    if(!['商家','店员'].includes(before) || target===before) return '请选择不同的目标身份。';
    const reason=businessReason(id); if(reason)return reason;
    if(target==='商家') {
      const s=staffFor(id); unlink(s);
      const archived=records(id).find(u=>u.type==='供货商家');
      if(archived)archived.identityArchived=false;
      else users.push({id,merchantId:'M-UA-'+id,name:s.name,account:s.account,rawAccount:s.rawAccount,type:'供货商家',status:state(id)==='启用'?'正常':'停用',accountStatus:state(id)==='启用'?'正常':'停用',build:'关闭',bid:'关闭',kyc:'—',ratioStatus:'未配置',merchantMain:true,employeeAppAccess:true,owner:'未分配',time:s.registeredAt,createdAt:s.registeredAt,firstRegisteredApp:rows().find(a=>a.id===id)?.source || '门店端'});
    } else {
      const m=storeFor(id); m.identityArchived=true;
      stores.filter(s=>s.merchantId===m.merchantId).forEach(s=>{s.status='停用';s.identityArchived=true;});
      if(!staffFor(id))employeeAccounts.push({id:'E-UA-'+id,accountId:id,name:m.name,account:m.account,rawAccount:m.rawAccount,appStatus:state(id)==='启用'?'正常':'停用',merchantId:null,relationStatus:'待关联',personalBuild:'关闭',registeredAt:m.createdAt||m.time,linkedAt:'—',unlinkedAt:'—',relationHistory:[]});
      else {const s=staffFor(id);s.merchantId=null;s.relationStatus='待关联';}
    }
    roles.set(id,target);log(id,'门店端身份',before,target);refresh();return '';
  }
  function roleModal(id) {
    const before=role(id),reason=businessReason(id);
    openBusinessModal('修改门店端身份','<p>当前身份：'+before+'</p><div class="field"><label>目标身份</label><select class="control" id="accountRoleTarget"><option>'+ (before==='商家'?'店员':'商家') +'</option></select></div><p>仅从未发生门店端业务时可修改；FoneSquare 业务不影响判断。账号及历史数据保留。</p><p id="accountRoleError" style="color:var(--red)">'+esc(reason)+'</p>','确认修改',()=>{const error=changeRole(id,$('#accountRoleTarget').value);if(error){$('#accountRoleError').textContent=error;return;}closeModals();toast(role(id)==='商家'?'身份已修改，请在门店端完善商家和店铺资料':'身份已修改，请在店员列表关联商家');},'primary');
    $('#businessConfirmBtn').disabled=!!reason;
  }
  staffAccounts=function(){return oldStaffAccounts().filter(s=>role(staffId(s))==='店员');};
  merchantAccountStatus=function(u){return state(u.id)==='启用'?'正常':'停用';};
  function displayAccountStates(root) { root.querySelectorAll('.tag').forEach(el=>{if(el.textContent==='正常')el.textContent='启用';}); }
  const originalStaffList=renderStaffList, originalStaffDetail=openStaffDetail;
  renderStaffList=function(){originalStaffList();displayAccountStates($('#staffResultArea'));};
  openStaffDetail=function(id){originalStaffDetail(id);displayAccountStates($('#businessModal'));};
  function staffBuildReason(s) {
    if(role(staffId(s))!=='店员')return '当前账号不是店员';
    if(staffRelationStatus(s)!=='已关联'||!s.merchantId)return '请先绑定商家';
    const m=merchantById(s.merchantId);
    if(!m||m.identityArchived)return '请先绑定商家';
    if(state(staffId(s))!=='启用')return '店员账号已停用';
    if(state(m.id)!=='启用')return '所属商家账号已停用';
    if(m.build!=='开启')return '请先开启所属商家的建拍权限';
    return '';
  }
  memberBuildState=function(s){
    const configured=s.personalBuild==='开启'?'开启':'关闭',reason=staffBuildReason(s);
    return {configured,effective:configured==='关闭'?'已关闭':reason?'未生效（'+(reason==='请先开启所属商家的建拍权限'?'商家建拍权限已关闭':reason)+'）':'已生效'};
  };
  function staffBuildSwitch(s) {
    const permission=memberBuildState(s),on=permission.configured==='开启',reason=staffBuildReason(s);
    return '<div class="switch-row"><button class="switch '+(on?'on':'')+'" aria-label="切换店员建拍权限" data-staff-build="'+staffId(s)+'" '+(!on&&reason?'disabled':'')+' title="'+esc(!on?reason:'关闭店员建拍权限')+'"></button><span>'+permission.configured+'</span></div>'+(on&&reason?'<div class="merchant-account">已开启，'+esc(permission.effective)+'</div>':!on&&reason?'<div class="merchant-account">'+esc(reason)+'</div>':'');
  }
  function requestStaffBuild(id) {
    const s=staffFor(id);if(!s||role(id)!=='店员')return;
    const previous=s.personalBuild,next=previous==='开启'?'关闭':'开启';
    const reason=next==='开启'?staffBuildReason(s):'';if(reason){toast(reason);return;}
    openBusinessModal(next+'店员建拍权限','<p>'+esc(s.name)+'：'+previous+' → '+next+'</p><p>开启需已绑定商家、双方账号启用，且商家建拍权限开启。</p>','确认'+next,()=>{
      const error=role(id)!=='店员'?'当前账号不是店员':s.personalBuild!==previous?'权限已变化，请刷新后重试':next==='开启'?staffBuildReason(s):'';
      if(error){toast(error);return;}
      s.personalBuild=next;log(id,'店员建拍权限',previous,next);closeModals();renderList();renderStaffList();toast('店员建拍权限已'+next);
    });
  }
  toggleMerchantBusiness=function(u){toggle(u.id);};
  function filters() {
    const val=id=>$(id).value.trim(),kw=val('#keyword').toLowerCase();
    return rows().filter(a=>(!kw||[a.id,a.name,a.account,a.raw].join(' ').toLowerCase().includes(kw))&&(!val('#businessStatusFilter')||a.status===val('#businessStatusFilter'))&&(!val('#accountRoleFilter')||a.role===val('#accountRoleFilter'))&&(!val('#merchantSourceFilter')||a.source===val('#merchantSourceFilter'))&&(!val('#ownerFilter')||a.owner===val('#ownerFilter'))&&(!val('#kycFilter')||a.fs?.kyc===val('#kycFilter'))&&(!val('#merchantBuildFilter')||((a.role==='商家'?a.store?.build:a.role==='店员'?a.staff?.personalBuild:null)===val('#merchantBuildFilter')))&&(!val('#merchantBidFilter')||a.fs?.bid===val('#merchantBidFilter'))&&(!val('#merchantTypeFilter')||records(a.id).some(u=>!u.identityArchived&&legacyMerchantRoles(u).includes(val('#merchantTypeFilter')))));
  }
  renderList=function(){
    if(activeState!=='normal')return oldRenderList();
    const list=filters();
    $('#resultArea').innerHTML='<div class="table-wrap"><table class="table merchant-list-table" style="min-width:1900px"><thead><tr>'+['账号 ID / 名称','统一账号','首次注册 App','账号状态','门店端身份','KYC 认证状态','建拍权限','出价权限','分账规则','店铺数','店员数','账号注册时间','操作'].map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+list.map(a=>{
      const m=a.role==='商家'?a.store:null,fs=a.fs;
      const action=(kind,label)=>'<button class="btn link" data-account-action="'+kind+'" data-account-id="'+a.id+'">'+label+'</button>';
      return '<tr data-unified-account="'+a.id+'"><td>'+action('view',esc(a.name))+'<div class="merchant-account">'+a.id+'</div></td><td>'+esc(a.account||'—')+'</td><td>'+tag(a.source,a.source==='FoneSquare'?'orange':'cyan')+'</td><td>'+statusTag(a.status)+'</td><td>'+tag(a.role,a.role==='商家'?'cyan':a.role==='店员'?'blue':'gray')+'</td><td>'+statusTag(fs?.kyc||'未完善')+'</td><td>'+(m?permissionSwitch(m,'build'):a.role==='店员'?staffBuildSwitch(a.staff):'—')+'</td><td>'+(fs?permissionSwitch(fs,'bid'):'未配置')+'</td><td>'+(m?statusTag(m.ratioStatus):'—')+'</td><td>'+(m?'<button class="btn link" data-view-stores="'+m.merchantId+'">'+merchantStoreCount(m)+'</button>':'—')+'</td><td>'+(m?'<button class="btn link" data-merchant-staff="'+m.merchantId+'">'+merchantStaffCount(m)+'</button>':'—')+'</td><td>'+esc(a.time)+'</td><td><div class="operations">'+action('view','查看')+action('toggle',a.status==='启用'?'停用':'启用')+(a.role==='未选择'?'':action('role','修改门店端身份'))+'</div></td></tr>';
    }).join('')+'</tbody></table>'+(list.length?'':'<div class="empty-compact">没有符合当前条件的账号</div>')+'</div><div class="pagination"><span>共 '+list.length+' 条记录 第 1 / 1 页</span><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">›</button></div>';
  };
  applyFilters=function(){activeState='normal';renderList();};
  resetFilters=function(){$$('#listPage .filters input').forEach(e=>e.value='');$$('#listPage .filters select').forEach(e=>e.value='');applyFilters();};
  function overview(id) {
    const a=rows().find(a=>a.id===id);if(!a)return;
    const buttons=(a.fs?'<button class="btn" data-account-business="fs" data-account-id="'+id+'">FoneSquare 资料</button>':'<p>FoneSquare：可使用启用账号登录，业务资料未完善，交易按权限开放。</p>')+(a.role==='商家'?'<button class="btn" data-account-business="store" data-account-id="'+id+'">门店端商家资料</button>':a.role==='店员'?'<button class="btn" data-account-business="staff" data-account-id="'+id+'">门店端店员资料</button>':'<p>门店端：首次登录时选择身份。</p>');
    openBusinessModal('账号详情 · '+a.name,'<p>统一账号：'+esc(id)+'　'+esc(a.account)+'</p><p>账号状态：'+a.status+'　门店端身份：'+a.role+'</p>'+buttons+'<div style="margin-top:16px">'+(histories.get(id)||[]).map(h=>'<p>'+esc(h.at+' · '+h.operator+' · '+h.action+'：'+h.before+' → '+h.after)+'</p>').join('')+'</div>','关闭',closeModals);
  }
  openDetail=function(u,tab){oldOpenDetail(u,tab);$('#detailTags').innerHTML=statusTag(state(u.id))+tag(role(u.id),'blue');$('#statusBtn').onclick=()=>toggle(u.id);$('#statusBtn').textContent=state(u.id)==='启用'?'停用':'启用';};
  $('#merchantBuildFilter').previousElementSibling.textContent='建拍权限';
  $('#businessStatusFilter').previousElementSibling.textContent='账号状态';
  $('#merchantSourceFilter').previousElementSibling.textContent='首次注册 App';
  $('#keyword').previousElementSibling.textContent='名称 / 账号';$('#keyword').placeholder='名称、账号 ID、手机号或邮箱';
  const field=document.createElement('div');field.className='field';field.innerHTML='<label>门店端身份</label><select class="control" id="accountRoleFilter"><option value="">全部</option><option>未选择</option><option>商家</option><option>店员</option></select>';
  $('.merchant-filters .filter-actions').before(field);
  $('#staffAccountFilter').innerHTML='<option value="">全部</option><option value="正常">启用</option><option>停用</option>';
  $('#searchBtn').onclick=applyFilters;$('#resetBtn').onclick=resetFilters;
  document.addEventListener('click',e=>{
    const permission=e.target.closest('[data-staff-build]');
    if(permission){e.preventDefault();e.stopImmediatePropagation();if(!permission.disabled)requestStaffBuild(permission.dataset.staffBuild);return;}
    const btn=e.target.closest('[data-account-action],[data-account-business]');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();const id=btn.dataset.accountId;
    if(btn.dataset.accountBusiness){closeModals();if(btn.dataset.accountBusiness==='staff')openStaffDetail(staffFor(id).id);else openDetail(btn.dataset.accountBusiness==='fs'?fsFor(id):storeFor(id));return;}
    if(btn.dataset.accountAction==='view')overview(id);
    if(btn.dataset.accountAction==='toggle')toggle(id);
    if(btn.dataset.accountAction==='role')roleModal(id);
  },true);
  findUnifiedAccount=function(phone,email){const keys=[normalizedAccount(phone),normalizedAccount(email)].filter(Boolean);const hit=keys.map(key=>users.find(u=>accountKeys(u).includes(key))||employeeAccounts.find(s=>accountKeys(s).includes(key))).filter(Boolean);const ids=[...new Set(hit.map(u=>u.accountId||u.id))];return {account:hit[0]?{...hit[0],id:ids[0]}:null,conflict:ids.length>1};};
  // Keep newly added App records on the existing unified account and preserve its status.
  const oldPush=users.unshift;
  users.unshift=function(u){if(accountStates.has(u.id)){u.status=state(u.id)==='启用'?'正常':'停用';u.accountStatus=u.status;}return oldPush.call(this,u);};
  users.forEach(u=>{if(u.kyc==='已拒绝-账号受限')u.kyc='认证失败';});
  Array.from($('#kycFilter').options).filter(o=>o.value==='已拒绝-账号受限').forEach(o=>o.remove());
  rows().forEach(a=>{records(a.id).forEach(u=>{u.accountStatus=a.status==='启用'?'正常':'停用';u.status=u.accountStatus;});});
  refresh();
})();
