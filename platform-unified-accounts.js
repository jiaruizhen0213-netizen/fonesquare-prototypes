/* Unified account view. App business records retain their existing IDs and history. */
(function () {
  const accountStates = new Map(), roles = new Map(), histories = new Map();
  const oldOpenDetail = openDetail;
  const oldStaffAccounts = staffAccounts;
  employeeAccounts.forEach((s, i) => { s.accountId = s.accountId || String(2000001 + i); });
  // Explicit demo login facts, independent of current identity, status, or registration App.
  const storeLoginFixtures = {
    '1000835':'2026-08-20 13:44', '1000834':'2026-08-20 11:18',
    '1000832':'2026-08-19 16:35', '1000818':'2026-08-17 14:02',
    '1000829':'2026-08-19 10:10', '1000825':'2026-08-18 17:25',
    '2000001':'2026-08-10 08:46', '2000002':'2026-08-11 12:21',
    '2000003':'2026-08-12 09:06', '2000004':'2026-08-13 16:41',
    '2000005':'2026-08-15 09:26', '2000006':'2026-08-16 18:11',
    '2000007':'2026-08-17 13:09', '2000008':'2026-08-21 10:19',
    '2000009':'2026-08-21 11:07', '2000010':'2026-08-22 08:37'
  };
  users.forEach(u=>{u.firstStoreLoginAt=storeLoginFixtures[u.id]||null;});
  employeeAccounts.forEach(s=>{s.firstStoreLoginAt=storeLoginFixtures[s.accountId]||null;});
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
      const u = storeFor(id) || staff || first;
      const firstStoreLoginAt=[...rs,staff].filter(Boolean).map(x=>x.firstStoreLoginAt).filter(Boolean).sort()[0]||null;
      return {id, firstStoreLoginAt, name:u.name, account:u.account, raw:[...rs.flatMap(accountKeys),staff?.rawAccount || ''].join(' '), fs:fsFor(id), store:storeFor(id), staff, role:role(id), status:state(id), owner:storeFor(id)?.owner || first?.owner || '未分配', source:first?.firstRegisteredApp || (first ? merchantSource(first) : '门店端'), time:first?.createdAt || first?.time || staff?.registeredAt || '—'};
    }).filter(a=>a.firstStoreLoginAt).sort((a,b) => b.firstStoreLoginAt.localeCompare(a.firstStoreLoginAt));
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
    if(!['商家','店员'].includes(target))return '请选择有效的目标身份。';
    if(!['商家','店员'].includes(before) || target===before) return '请选择不同的目标身份。';
    const reason=businessReason(id); if(reason)return reason;
    if(target==='商家') {
      const s=staffFor(id); unlink(s);
      const archived=records(id).find(u=>u.type==='供货商家');
      if(archived){archived.identityArchived=false;archived.build='关闭';}
      else users.push({id,merchantId:'M-UA-'+id,name:s.name,account:s.account,rawAccount:s.rawAccount,type:'供货商家',status:state(id)==='启用'?'正常':'停用',accountStatus:state(id)==='启用'?'正常':'停用',build:'关闭',bid:'关闭',kyc:'—',ratioStatus:'未配置',profileStatus:'待完善',firstStoreLoginAt:s.firstStoreLoginAt,merchantMain:true,employeeAppAccess:true,owner:'未分配',time:s.registeredAt,createdAt:s.registeredAt,firstRegisteredApp:rows().find(a=>a.id===id)?.source || '门店端'});
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
    openBusinessModal('修改门店端身份','<p>当前身份：'+before+'</p><div class="field"><label>目标身份</label><select class="control" id="accountRoleTarget"><option>'+ (before==='商家'?'店员':'商家') +'</option></select></div><p>仅从未发生门店端业务时可修改；FoneSquare 业务不影响判断。账号及历史数据保留。</p><p id="accountRoleError" style="color:var(--red)">'+esc(reason)+'</p>','确认修改',()=>{const error=changeRole(id,$('#accountRoleTarget').value);if(error){$('#accountRoleError').textContent=error;return;}closeModals();const excluded=$('#accountRoleFilter').value && $('#accountRoleFilter').value!==role(id);toast('身份已修改为'+role(id)+(excluded?'，当前身份筛选下不再展示':role(id)==='商家'?'，请在门店端完善商家和店铺资料':'，请在店员列表关联商家'));},'primary');
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
    return '<div class="switch-row"><button class="switch '+(on?'on'+(reason?' staff-build-inactive':''):'')+'" aria-label="切换店员建拍权限" data-staff-build="'+staffId(s)+'" '+(!on&&reason?'disabled':'')+' title="'+esc(!on?reason:'关闭店员建拍权限')+'"></button><span>'+permission.configured+'</span></div>'+(on&&reason?'<div class="merchant-account">已开启，'+esc(permission.effective)+'</div>':!on&&reason?'<div class="merchant-account">'+esc(reason)+'</div>':'');
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
    return rows().filter(a=>(!kw||[a.id,a.name,a.account,a.raw].join(' ').toLowerCase().includes(kw))&&(!val('#businessStatusFilter')||a.status===val('#businessStatusFilter'))&&(!val('#accountRoleFilter')||a.role===val('#accountRoleFilter'))&&(!val('#ownerFilter')||a.owner===val('#ownerFilter'))&&(!val('#merchantBuildFilter')||((a.role==='商家'?a.store?.build:a.role==='店员'?a.staff?.personalBuild:null)===val('#merchantBuildFilter'))));
  }
  function businessInfo(a) {
    const m=a.role==='商家'?a.store:null;
    if(m)return '<div>'+esc(m.profileStatus||'已完善')+' · 分账：'+esc(m.ratioStatus||'未配置')+'</div><button class="btn link" data-merchant-stores="'+m.merchantId+'">店铺 '+merchantStoreCount(m)+'</button> / <button class="btn link" data-merchant-staff="'+m.merchantId+'">店员 '+merchantStaffCount(m)+'</button>';
    if(a.role==='店员')return staffMerchantCell(a.staff)+'<div class="merchant-account">'+esc(staffRelationStatus(a.staff))+'</div>';
    return '<span class="subtle">门店端身份未选择</span>';
  }
  renderList=function(){
    const list=filters();
    $('#resultSummary').textContent='共 '+list.length+' 条，按首次登录门店端时间倒序';
    if(activeState!=='normal') {
      const box=$('#resultArea');
      if(activeState==='loading')box.innerHTML='<div class="state-box">正在加载门店端账号…</div>';
      else if(activeState==='failed'){box.innerHTML='<div class="state-box"><div>账号加载失败，当前筛选条件已保留。<button class="btn" id="retryBtn">重新加载</button></div></div>';$('#retryBtn').onclick=()=>{activeState='normal';renderList();};}
      else box.innerHTML='<div class="state-box">暂无成功登录门店端的账号</div>';
      return;
    }
    $('#resultArea').innerHTML='<div class="table-wrap"><table class="table merchant-list-table" style="min-width:1350px"><thead><tr>'+['账号 ID / 名称','统一账号','账号状态','门店端身份','建拍权限','业务信息','维护人','首次登录门店端','操作'].map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+list.map(a=>{
      const m=a.role==='商家'?a.store:null;
      const action=(kind,label)=>'<button class="btn link" data-account-action="'+kind+'" data-account-id="'+a.id+'">'+label+'</button>';
      return '<tr data-unified-account="'+a.id+'"><td>'+action('view',esc(a.name))+'<div class="merchant-account">'+a.id+'</div></td><td>'+esc(a.account||'—')+'</td><td>'+statusTag(a.status)+'</td><td>'+tag(a.role,a.role==='商家'?'cyan':a.role==='店员'?'blue':'gray')+'</td><td>'+(m?permissionSwitch(m,'build'):a.role==='店员'?staffBuildSwitch(a.staff):'—')+'</td><td>'+businessInfo(a)+'</td><td>'+esc(a.owner)+'</td><td>'+esc(a.firstStoreLoginAt.split(' ')[0])+'<div class="merchant-account">'+esc(a.firstStoreLoginAt.split(' ')[1]||'')+'</div></td><td><div class="operations">'+action('view','查看')+action('toggle',a.status==='启用'?'停用账号':'启用账号')+(a.role==='未选择'?'':action('role','修改门店端身份'))+'</div></td></tr>';
    }).join('')+'</tbody></table>'+(list.length?'':'<div class="empty-compact">没有符合当前条件的账号</div>')+'</div><div class="pagination"><span>共 '+list.length+' 条记录 第 1 / 1 页</span><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">›</button></div>';
  };
  applyFilters=function(){activeState='normal';renderList();};
  resetFilters=function(){$$('#listPage .filters input').forEach(e=>e.value='');$$('#listPage .filters select').forEach(e=>e.value='');applyFilters();};
  function overview(id) {
    const a=rows().find(a=>a.id===id);if(!a)return;
    if(a.role==='商家'){openDetail(a.store);return;}
    if(a.role==='店员'){openStaffDetail(a.staff.id);return;}
    openBusinessModal('门店端账号资料 · '+a.name,'<p>统一账号：'+esc(id)+'　'+esc(a.account)+'</p><p>账号状态：'+a.status+'</p><p>门店端身份：未选择</p><p>首次登录门店端：'+esc(a.firstStoreLoginAt)+'</p><p>用户尚未选择门店端身份，暂无商家或店员资料。请由用户在门店端选择身份后继续完善资料。</p>','关闭',closeModals);
  }
  const baseMerchantFields=merchantDetailFields;
  merchantDetailFields=function(u){return baseMerchantFields(u).filter(f=>!['来源 App','商家类型'].includes(f[0])).map(f=>['账号状态','商家状态'].includes(f[0])?[f[0],state(u.id)]:f).concat([['资料完善情况',u.profileStatus||'已完善']]);};
  let detailReturnView='list';
  openDetail=function(u,tab){
    if(!u)return;
    const merchant=storeFor(u.id);
    if(!merchant){overview(u.id);return;}
    const origin=$('.page.active')?.id?.replace(/Page$/,'');
    if(['list','store','storeDetail','staff'].includes(origin))detailReturnView=origin;
    closeModals();
    oldOpenDetail(merchant,tab);
    $('#backBtn').hidden=false;$('#backBtn').className='btn';$('#backBtn').textContent='← 返回'+({list:'商家列表',store:'店铺列表',storeDetail:'店铺详情',staff:'店员列表'}[detailReturnView]);$('#backBtn').onclick=()=>setView(detailReturnView);
    $('#detailTags').innerHTML=statusTag(state(u.id))+tag(role(u.id),'blue');
    $('#statusBtn').onclick=()=>toggle(u.id);$('#statusBtn').textContent=state(u.id)==='启用'?'停用账号':'启用账号';
    $('#crumbCurrent').textContent='门店端商家资料';
    const history=histories.get(u.id)||[];
    if(history.length)$('#tab-log').insertAdjacentHTML('beforeend','<div class="card"><div class="card-head">账号与身份操作记录</div><div class="card-body">'+history.map(h=>'<p>'+esc(h.at+' · '+h.action+'：'+h.before+' → '+h.after)+'</p>').join('')+'</div></div>');
  };
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
    if(btn.dataset.accountBusiness){closeModals();overview(id);return;}
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
  $('#addBtn').onclick=null;
  $('#exportBtn').onclick=()=>{
    const header=['账号 ID','名称','统一账号','账号状态','门店端身份','建拍权限','首次登录门店端','维护人'];
    const escapeCell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const csv=[header,...filters().map(a=>[a.id,a.name,a.account,a.status,a.role,a.role==='商家'?a.store.build:a.role==='店员'?a.staff.personalBuild:'—',a.firstStoreLoginAt,a.owner])].map(r=>r.map(escapeCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'})),link=document.createElement('a');link.href=url;link.download='实时竞拍商家列表.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  Object.assign(window.prototypeState,{realtimeAccountRows:rows,filteredRealtimeAccounts:filters});
  refresh();
})();
