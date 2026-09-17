/* Prototype-only engine: one self-operated bidder, executable stage offers, no synthetic merchants. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuoteConfig=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const SELF='SELF-MY-001';
const initialRows=()=>[{minutes:10,percent:85},{minutes:5,percent:95},{minutes:1,percent:100}];
function validate(rows){
 if(!rows.length)return '至少配置一个出价档位。';
 for(let i=0;i<rows.length;i++){const r=rows[i];
  if(!Number.isFinite(r.minutes)||r.minutes<=0)return `第${i+1}档：剩余时间须大于0。`;
  if(!Number.isFinite(r.percent)||r.percent<=0||r.percent>100)return `第${i+1}档：比例须大于0且不超过100%。`;
  if(i&&r.minutes>=rows[i-1].minutes)return `第${i+1}档：剩余时间须逐档减少且不能重复。`;
  if(i&&r.percent<=rows[i-1].percent)return `第${i+1}档：出价比例须逐档增加。`;
 }
 return rows.at(-1).percent!==100?'最后一档的最高出价比例必须为100%。':'';
}
function seed(){return {serial:2,policies:[{id:'STEP-00001',version:1,enabled:true,rows:initialRows(),updatedBy:'贾瑞真',updatedAt:'2026-09-17 10:00',history:[],logs:[{action:'初始化演示策略',at:'2026-09-17 10:00'}]}]};}
function savePolicy(state,rows,id,at){const error=validate(rows);if(error)throw Error(error);const next=clone(state),old=next.policies.find(p=>p.id===id);if(id&&!old)throw Error('策略已不存在，请刷新。');const snapshot=old?{version:old.version,rows:clone(old.rows),enabled:old.enabled,updatedAt:old.updatedAt}:null;
 const p={id:old?.id||'STEP-'+String(next.serial++).padStart(5,'0'),version:(old?.version||0)+1,rows:clone(rows),enabled:false,updatedBy:'贾瑞真',updatedAt:at,history:old?[...old.history,snapshot]:[],logs:[...(old?.logs||[]),{action:old?'编辑并保存新版本（停用）':'新建（停用）',at}]};
 next.policies=next.policies.filter(x=>x.id!==p.id);next.policies.unshift(p);return next;}
function togglePolicy(state,id,at){const next=clone(state),p=next.policies.find(p=>p.id===id);if(!p)throw Error('策略不存在。');if(!p.enabled){const error=validate(p.rows);if(error)throw Error(error);if(next.policies.some(q=>q.id!==id&&q.enabled))throw Error('已有启用策略，请先停用原策略。');}p.enabled=!p.enabled;p.updatedAt=at;p.logs.push({action:p.enabled?'启用':'停用',at});return next;}
function round(){return {id:'ROUND-DEMO-001',remaining:720,elapsed:0,plan:null,bids:[],errors:[],settled:null,direct:false};}
function start(r,policy,cap,merchant=SELF){
 if(merchant!==SELF)throw Error('仅自营商家可启动阶梯报价。');
 if(r.settled||r.remaining<=0)throw Error('本轮已成交或结束，不能启动。');
 if(r.direct||r.bids.length&&!r.plan)throw Error('已提交普通报价，不能重新从低价启动阶梯报价。');
 if(r.plan)return false;
 if(!policy?.enabled)throw Error('请先启用一套有效策略。');const error=validate(policy.rows);if(error)throw Error(error);
 if(!Number.isFinite(cap)||cap<.01||Math.abs(cap*100-Math.round(cap*100))>1e-7)throw Error('请输入有效最高出价，演示支持最多两位小数。');
 if(policy.rows.some(x=>amount(cap,x.percent)<=0))throw Error('阶段报价不足 MYR 0.01，请提高最高出价。');
 r.plan={id:'PLAN-DEMO-001',cap,merchant,policy:clone(policy),state:'running',lastStage:-1,createdElapsed:r.elapsed};return true;
}
function amount(cap,pct){return Math.round(cap*100*pct/100)/100;}
function dueIndex(r){if(!r.plan)return -1;let idx=-1;r.plan.policy.rows.forEach((x,i)=>{if(r.remaining<=x.minutes*60)idx=i;});return idx;}
function run(r,fail=false){
 const p=r.plan;if(!p||p.state!=='running'||r.settled||r.remaining<=0)return null;
 const i=dueIndex(r);if(i<0||i<=p.lastStage)return null;
 const row=p.policy.rows[i],price=amount(p.cap,row.percent);
 if(fail){r.errors.push({stage:i,elapsed:r.elapsed,message:'报价提交失败，当前有效报价保持不变'});return null;}
 const previous=r.bids.at(-1);p.lastStage=i;
 if(previous&&price<=previous.price)return null;
 const bid={id:'BID-'+String(r.bids.length+1).padStart(3,'0'),stage:i,price,percent:row.percent,elapsed:r.elapsed,remaining:r.remaining,merchant:p.merchant};r.bids.push(bid);return bid;
}
function advance(r,seconds,fail=false){if(!Number.isFinite(seconds)||seconds<0)throw Error('时间不可倒退。');if(r.settled)return null;const jump=Math.min(r.remaining,seconds);r.remaining-=jump;r.elapsed+=jump;if(r.remaining===0){if(r.plan?.state==='running')r.plan.state='ended';return null;}return run(r,fail);}
function stop(r){if(r.plan?.state==='running')r.plan.state='stopped';}
function accept(r,bidId){if(r.settled)throw Error('本轮已成交。');if(r.remaining<=0)throw Error('本轮已结束，请进入最终结果确认流程。');const latest=r.bids.at(-1);if(!latest)throw Error('暂无有效报价。');if(latest.id!==bidId)throw Error('报价已更新，请查看最新金额后重新确认。');r.settled={bid:clone(latest),elapsed:r.elapsed};if(r.plan)r.plan.state='settled';return r.settled;}
return {clone,SELF,initialRows,validate,seed,savePolicy,togglePolicy,round,start,amount,dueIndex,run,advance,stop,accept};
});
