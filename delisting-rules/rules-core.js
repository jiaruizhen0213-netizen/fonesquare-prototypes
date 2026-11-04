(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DelistingRules=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const fields={grade:'海外等级',model:'型号',memory:'内存',channel:'购买渠道',color:'颜色',quantity:'有效库存数量'};
 const kinds={reserve:'预售',spot:'现货'};
 const operations={in:'包含',notIn:'不包含',lt:'小于',lte:'小于等于',eq:'等于',gte:'大于等于',gt:'大于'};
 const clone=x=>JSON.parse(JSON.stringify(x));
 function defaults(){return {version:1,rules:[
  {id:'RULE-001',name:'海外等级 N 默认下架',enabled:true,scopes:['reserve','spot'],conditions:[{field:'grade',op:'in',values:['N']}],note:'海外等级为 N 的商品默认不向买家展示，允许人工上架。',updatedAt:'2026/11/04 09:00:00'},
  {id:'RULE-002',name:'低库存预售下架（示例）',enabled:false,scopes:['reserve'],conditions:[{field:'quantity',op:'lt',value:10}],note:'停用的配置示例。启用后会修改预售上下架状态。',updatedAt:'2026/11/04 09:00:00'}
 ]};}
 function quantity(s,kind){
  const seen=new Set();return (s[kind]||[]).filter(item=>{
   if(seen.has(item.id)||(item.status&&item.status!=='可售')||(kind==='reserve'&&item.retentionResult))return false;
   seen.add(item.id);return true;
  }).length;
 }
 const listed=(s,kind)=>s[kind+'Enabled']??s.enabled??true;
 function matches(s,kind,condition){
  if(condition.field==='quantity'){
   const a=quantity(s,kind),b=Number(condition.value);
   return {lt:a<b,lte:a<=b,eq:a===b,gte:a>=b,gt:a>b}[condition.op]===true;
  }
  const found=(condition.values||[]).includes(s[condition.field]);
  return condition.op==='in'?found:condition.op==='notIn'?!found:false;
 }
 function validate(rule){
  if(!rule.name||!rule.name.trim())return '请输入规则名称';
  if(rule.name.trim().length>60)return '规则名称最多 60 个字符';
  if(!Array.isArray(rule.scopes)||!rule.scopes.length||rule.scopes.some(k=>!kinds[k]))return '请至少选择一个生效范围';
  if(!Array.isArray(rule.conditions)||!rule.conditions.length)return '请至少添加一个命中条件';
  for(const c of rule.conditions){
   if(!fields[c.field])return '请选择有效的条件字段';
   if(c.field==='quantity'){
    if(!['lt','lte','eq','gte','gt'].includes(c.op))return '请选择有效的数量判断方式';
    if(c.value===''||c.value===null||!Number.isSafeInteger(Number(c.value))||Number(c.value)<0)return '库存数量须为大于等于 0 的整数';
   }else if(!['in','notIn'].includes(c.op)||!Array.isArray(c.values)||!c.values.length||c.values.some(v=>!String(v).trim()))return '请为每个属性条件至少选择一个值';
  }
  return '';
 }
 function plan(catalog,rules,mode,scopes){
  if(!['down','full'].includes(mode))throw Error('无效的执行方式');
  if(!Array.isArray(scopes)||!scopes.length||scopes.some(k=>!kinds[k]))throw Error('请选择有效的执行范围');
  const active=rules.filter(r=>r.enabled);
  for(const rule of active){const error=validate(rule);if(error)throw Error(error);}
  const details=[];
  for(const s of catalog.skus)for(const kind of [...new Set(scopes)]){
   const hits=active.filter(r=>r.scopes.includes(kind)&&r.conditions.every(c=>matches(s,kind,c)));
   const before=listed(s,kind),after=hits.length?false:mode==='full'?true:before;
   details.push({skuId:s.id,title:[s.model,s.memory,s.channel,'海外等级'+s.grade,s.color].join(' '),kind,quantity:quantity(s,kind),before,after,changed:before!==after,ruleIds:hits.map(r=>r.id),ruleNames:hits.map(r=>r.name)});
  }
  return {details,scanned:catalog.skus.length,pairs:details.length,matched:details.filter(x=>x.ruleIds.length).length,down:details.filter(x=>x.changed&&!x.after).length,up:details.filter(x=>x.changed&&x.after).length,unchanged:details.filter(x=>!x.changed).length};
 }
 function apply(catalog,result,at){
  const data=clone(catalog),changed=new Set();
  for(const item of result.details.filter(x=>x.changed)){
   const s=data.skus.find(x=>x.id===item.skuId);if(!s)throw Error('商品数据已变化，请重新执行');
   // Materialize both old states before changing a legacy shared enabled flag.
   s.spotEnabled=listed(s,'spot');s.reserveEnabled=listed(s,'reserve');
   s[item.kind+'Enabled']=item.after;s.enabled=s.spotEnabled||s.reserveEnabled;s.updatedAt=at;changed.add(s.id);
  }
  if(changed.size)data.revision=(data.revision||0)+1;
  return data;
 }
 function describe(c){return fields[c.field]+' '+operations[c.op]+' '+(c.field==='quantity'?c.value+' 台':(c.values||[]).join('、'));}
 return {fields,kinds,operations,defaults,clone,quantity,listed,matches,validate,plan,apply,describe};
});
