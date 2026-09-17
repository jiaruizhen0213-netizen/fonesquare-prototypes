/* Configuration-only prototype. No bidding, map or operator execution lives here. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuoteConfig=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const initialRows=()=>[
 {remainingPercent:50,firstBidPercent:85,bidCount:5},
 {remainingPercent:25,firstBidPercent:90,bidCount:3},
 {remainingPercent:10,firstBidPercent:95,bidCount:2}
];
function validate(rows){
 if(!Array.isArray(rows)||!rows.length)return '至少配置一行报价规则。';
 for(let i=0;i<rows.length;i++){
  const r=rows[i];
  if(!Number.isFinite(r.remainingPercent)||r.remainingPercent<=0||r.remainingPercent>100)return `第${i+1}行：竞拍剩余时间比例须大于0且不超过100%。`;
  if(i&&r.remainingPercent>=rows[i-1].remainingPercent)return `第${i+1}行：竞拍剩余时间比例须从大到小排列，且不能重复。`;
  if(!Number.isFinite(r.firstBidPercent)||r.firstBidPercent<=0||r.firstBidPercent>100)return `第${i+1}行：首次出价比例须大于0且不超过100%。`;
  if(!Number.isSafeInteger(r.bidCount)||r.bidCount<1)return `第${i+1}行：出价次数须为正整数，包含首次出价。`;
 }
 return '';
}
function seed(legacy=null){
 // Preserve old minute-based records without silently treating minutes as percentages.
 const oldPolicies=legacy?.state?.policies;
 const legacyHistory=Array.isArray(oldPolicies)?oldPolicies.map(p=>clone(p)):[];
 return {schema:2,current:{id:'STEP-00001',version:1,enabled:false,rows:initialRows(),updatedBy:'贾瑞真',updatedAt:'2026-09-17 10:00'},history:[],legacyHistory};
}
function save(state,draft,at){
 const error=validate(draft.rows);if(error)throw Error(error);
 if(typeof draft.enabled!=='boolean')throw Error('请选择启用或停用状态。');
 const next=clone(state),before=clone(next.current);
 next.history.unshift(before);
 next.current={id:before.id,version:before.version+1,rows:clone(draft.rows),enabled:draft.enabled,updatedBy:'贾瑞真',updatedAt:at};
 return next;
}
return {clone,initialRows,validate,seed,save};
});
