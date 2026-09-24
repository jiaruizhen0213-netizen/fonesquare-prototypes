/* Configuration-only prototype. No bidding, map or operator execution lives here. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuoteConfig=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const initialRows=()=>[
 {startRemainingPercent:100,endRemainingPercent:90,firstBidPercent:85,bidCount:5},
 {startRemainingPercent:90,endRemainingPercent:80,firstBidPercent:90,bidCount:3},
 {startRemainingPercent:80,endRemainingPercent:null,firstBidPercent:95,bidCount:2}
];
function validate(rows){
 if(!Array.isArray(rows)||!rows.length)return '至少配置一行报价规则。';
 for(let i=0;i<rows.length;i++){
  const r=rows[i];
  if(!Number.isFinite(r.startRemainingPercent)||r.startRemainingPercent<=0||r.startRemainingPercent>100)return `第${i+1}行：开始时间比例须大于0且不超过100%。`;
  const openEnd=i===rows.length-1&&r.endRemainingPercent===null;
  if(!openEnd&&(!Number.isFinite(r.endRemainingPercent)||r.endRemainingPercent<0||r.endRemainingPercent>100))return `第${i+1}行：结束时间比例须在0%至100%之间。`;
  if(!openEnd&&r.startRemainingPercent<=r.endRemainingPercent)return `第${i+1}行：开始时间比例须大于结束时间比例。`;
  if(i&&r.startRemainingPercent>rows[i-1].endRemainingPercent)return `第${i+1}行：区间须从大到小排列，且不能重叠。`;
  if(!Number.isFinite(r.firstBidPercent)||r.firstBidPercent<=0||r.firstBidPercent>100)return `第${i+1}行：首次出价比例须大于0且不超过100%。`;
  if(!Number.isSafeInteger(r.bidCount)||r.bidCount<1)return `第${i+1}行：出价次数须为正整数，包含首次出价。`;
 }
 return '';
}
function seed(legacy=null){
 // Preserve old minute-based records without silently treating minutes as percentages.
 const oldPolicies=legacy?.state?.policies;
 const legacyHistory=Array.isArray(oldPolicies)?oldPolicies.map(p=>clone(p)):[];
 return {schema:3,current:{id:'STEP-00001',version:1,enabled:false,rows:initialRows(),updatedBy:'贾瑞真',updatedAt:'2026-09-17 10:00'},history:[],legacyHistory};
}
function migrate(state){
 const next=clone(state);
 if(next.schema===2){
  next.current.rows=next.current.rows.map(({remainingPercent,...r})=>({...r,startRemainingPercent:remainingPercent,endRemainingPercent:null}));
  next.schema=3;
 }
 if(next.current.rows.at(-1)?.endRemainingPercent===0)next.current.rows.at(-1).endRemainingPercent=null;
 return next;
}
function save(state,draft,at){
 const error=validate(draft.rows);if(error)throw Error(error);
 if(typeof draft.enabled!=='boolean')throw Error('请选择启用或停用状态。');
 const next=clone(state),before=clone(next.current);
 next.history.unshift(before);
 next.current={id:before.id,version:before.version+1,rows:clone(draft.rows),enabled:draft.enabled,updatedBy:'贾瑞真',updatedAt:at};
 return next;
}
return {clone,initialRows,validate,seed,migrate,save};
});
