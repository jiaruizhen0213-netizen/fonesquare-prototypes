/* Account lifecycle model. Business records retain their own merchant IDs. */
(function (root) {
  'use strict';
  function create(records, staff, stores) {
    const accounts = new Map(), logs = [];
    function add(id, data) {
      if (!accounts.has(id)) accounts.set(id, {id, name:data.name, contact:data.account||'—', raw:data.rawAccount||'', status:['停用','冻结'].includes(data.accountStatus||data.appStatus)?data.accountStatus||data.appStatus:'正常', registeredAt:data.createdAt||data.time||data.registeredAt||'2026-09-06 09:00', opened:false, role:'none', sessions:{fs:1,store:1}});
      return accounts.get(id);
    }
    records.forEach(m=>{
      if (m.primaryAccountId===undefined) m.primaryAccountId=m.id;
      const a=add(m.id,m);
      if(m.type==='供货商家'&&m.primaryAccountId){a.role='primary';a.opened=true;}
    });
    staff.forEach(s=>{s.accountId=s.accountId||'U-'+s.id;s.roleActive=s.roleActive!==false;const a=add(s.accountId,s);if(a.role==='primary'&&s.roleActive)throw Error('角色冲突');if(s.roleActive){a.role='staff';a.opened=true;}});
    const account=id=>accounts.get(id);
    const merchant=id=>records.find(m=>m.merchantId===id);
    const profile=id=>staff.find(s=>s.accountId===id);
    const primary=id=>records.find(m=>m.type==='供货商家'&&m.primaryAccountId===id);
    const fs=id=>records.find(m=>m.type==='FoneSquare 回收商'&&m.primaryAccountId===id);
    const related=id=>primary(id)||merchant(profile(id)?.roleActive?profile(id).merchantId:null);
    const active=m=>Boolean(m&&m.status==='正常');
    function snapshot(id,extra=[]){
      const m=merchant(id),a=account(id),ids=new Set([id,...extra]);
      if(m){if(m.primaryAccountId)ids.add(m.primaryAccountId);staff.filter(s=>s.merchantId===id).forEach(s=>ids.add(s.accountId));}
      const accountLines=[...accounts.values()].filter(x=>ids.has(x.id)).map(x=>`账号 ${x.id} · ${x.name||'—'} · ${x.status} · ${role(x.id)}`);
      const merchantLines=records.filter(x=>x===m||a&&x.primaryAccountId===a.id).map(x=>`商家 ${x.merchantId} · ${x.name||'—'} · ${active(x)?'使用':'停用'} · 主账号 ${x.primaryAccountId||'未配置'}`);
      const staffLines=staff.filter(s=>ids.has(s.accountId)).map(s=>`店员 ${s.id} · ${s.roleActive?'当前档案':'历史档案'} · ${s.relationStatus} · 所属 ${s.merchantId||'—'} · 建拍配置 ${s.personalBuild}`);
      return [...accountLines,...merchantLines,...staffLines].join('\n');
    }
    function must(ok,msg){if(!ok)throw Error(msg);}
    function mutate(action,id,reason,fn){must(reason?.trim(),'请填写操作原因');const m=merchant(id),accountIds=[...accounts.values()].filter(a=>a.id===id||m&&(m.primaryAccountId===a.id||profile(a.id)?.merchantId===id)).map(a=>a.id);const before=snapshot(id,accountIds);fn();logs.unshift({action,id,accountIds,reason:reason.trim(),operator:'平台管理员 / OB1008',time:new Date().toISOString(),before,after:snapshot(id,accountIds)});}
    function endRelation(s){if(s.merchantId)(s.relationHistory||(s.relationHistory=[])).push({merchantId:s.merchantId,status:'已解除',endedAt:new Date().toISOString()});s.merchantId=null;s.relationStatus='已解除';s.unlinkedAt=new Date().toISOString();}
    function role(id){const a=account(id);return a?.role==='primary'?'商家主账号':a?.role==='staff'?'店员':a?.draft?'开通中':a?.opened?'无有效身份':'未开通';}
    function allowed(id,app){const a=account(id),m=app==='fs'?fs(id):related(id);return Boolean(a&&a.status==='正常'&&active(m)&&(app==='fs'||a.role==='primary'||(a.role==='staff'&&profile(id)?.relationStatus==='已关联')));}
    function effective(s){const a=account(s.accountId),m=merchant(s.merchantId);if(!s.roleActive||a?.role!=='staff')return '历史档案';if(a.status!=='正常')return '账号不可用';if(s.relationStatus!=='已关联')return '未关联商家';if(!active(m))return '商家已停用';if(s.personalBuild!=='开启')return '已关闭';if(m.build!=='开启')return '商家权限关闭';return '已生效';}
    function setAccount(id,status,reason){const a=account(id);must(a&&['正常','停用','冻结'].includes(status),'账号不可用');mutate('统一账号状态',id,reason,()=>{a.status=status;a.sessions.fs++;a.sessions.store++;staff.filter(s=>s.accountId===id).forEach(s=>s.appStatus=status);});}
    function setBusiness(id,status,reason){const m=merchant(id);must(m&&['正常','停用'].includes(status),'商家不存在');if(status==='正常'&&m.type==='供货商家')must(m.primaryAccountId&&account(m.primaryAccountId)?.role==='primary','请先配置主账号');mutate('商家业务状态',id,reason,()=>{m.status=status;for(const a of accounts.values())if((m.type==='FoneSquare 回收商'?fs(a.id):related(a.id))===m)a.sessions[m.type==='供货商家'?'store':'fs']++;});}
    function reset(id,reason){const a=account(id),m=primary(id);must(a&&a.role!=='none','没有需要重置的身份');must(!m||(!active(m)&&m.closedOut===true),'请先交接主账号，或完成业务收尾并停用');mutate('重置门店端身份',id,reason,()=>{const s=profile(id);if(s?.roleActive){endRelation(s);s.roleActive=false;}if(m){m.primaryAccountId=null;m.merchantMain=false;}a.role='none';a.opened=true;a.sessions.store++;});}
    function link(id,target,reason){const a=account(id),m=merchant(target),s=profile(id);must(a?.status==='正常','账号不可用');must(a.role!=='primary','商家主账号不能直接绑定为店员');must(active(m)&&m.type==='供货商家','目标商家不可用');must(!s?.merchantId||s.merchantId!==target,'已经关联该商家');mutate('关联/转移店员',id,reason,()=>{let p=s;if(!p){p={id:'E'+(staff.length+4000),accountId:id,name:a.name,account:a.contact,appStatus:a.status,relationHistory:[],personalBuild:'关闭'};staff.push(p);}if(p.merchantId)endRelation(p);p.roleActive=true;p.merchantId=target;p.relationStatus='已关联';p.linkedAt=new Date().toISOString();p.personalBuild='关闭';a.role='staff';a.opened=true;a.sessions.store++;});}
    function unlink(id,reason){const s=profile(id);must(s?.roleActive&&s.merchantId,'没有有效店员关系');mutate('解除店员关系',id,reason,()=>{endRelation(s);account(id).sessions.store++;});}
    function handover(mid,id,reason){const m=merchant(mid),a=account(id),s=profile(id);must(m?.type==='供货商家'&&a?.status==='正常','接任账号不可用');must(s?.roleActive&&s.merchantId===mid&&s.relationStatus==='已关联'&&a.role==='staff'||(!m.primaryAccountId&&a.role==='none'),'请选择本商家已关联店员；无主账号时可选择无有效身份账号');mutate('更换主账号',mid,reason,()=>{const old=account(m.primaryAccountId);if(old){old.role='none';old.opened=true;old.sessions.store++;}if(s?.roleActive){endRelation(s);s.roleActive=false;}m.primaryAccountId=id;m.merchantMain=true;a.role='primary';a.opened=true;a.sessions.store++;});}
    function markClosed(mid,reason){const m=merchant(mid);must(m&&!active(m),'请先停用商家');must(!(m.pendingTasks>0),'仍有未完成业务，请先处理');mutate('确认业务收尾',mid,reason,()=>{m.closedOut=true;});}
    function openStoreBusiness(id,draft,reason){const a=account(id);must(a?.status==='正常'&&a.role==='none','请先由平台结束旧身份');must(['name','store','address','phone','holder','bankName','accountNumber'].every(k=>String(draft[k]||'').trim()),'请完成商家及店铺必填信息');must(/^\d{8,20}$/.test(draft.accountNumber),'银行账号格式不正确');mutate('商家开通',id,reason,()=>{const mid='M-V11-'+(records.length+1);records.push({id,primaryAccountId:id,merchantId:mid,type:'供货商家',name:draft.name,status:'正常',build:'关闭',bid:'关闭',merchantMain:true,owner:'贾瑞真',ownerId:'OB1008',time:new Date().toISOString(),ratioStatus:'未配置',ratioSource:'—',account:a.contact,shareRules:[]});stores.push({id:'S-V11-'+(stores.length+1),merchantId:mid,name:draft.store,status:'营业中',address:draft.address,phone:draft.phone,country:'马来西亚',city:'—',bankTail:draft.accountNumber.slice(-4),bank:{holder:draft.holder,bankName:draft.bankName,accountNumber:draft.accountNumber},updatedAt:new Date().toISOString(),createdBy:'门店端首次开通'});a.role='primary';a.opened=true;delete a.draft;});}
    return {accounts,records,staff,stores,logs,add,account,merchant,profile,primary,fs,related,active,role,allowed,effective,setAccount,setBusiness,reset,link,unlink,handover,markClosed,openStoreBusiness};
  }
  if(typeof module!=='undefined')module.exports={create};else root.AccountLifecycle={create};
})(typeof globalThis==='undefined'?this:globalThis);
