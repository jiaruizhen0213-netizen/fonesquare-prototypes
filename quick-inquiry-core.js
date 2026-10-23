/* Demo-only catalog and inquiry state. No real inspection, quote or order requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.QuickInquiry=api;})(typeof window==='undefined'?null:window,function(){
'use strict';
const KEY='fs-quick-inquiry-demo-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const categories=[{id:'PHONE',name:'手机'},{id:'LAPTOP',name:'笔记本'}];
const models=[
 {id:'103',category:'PHONE',brand:'Apple',name:'iPhone 15 Pro',series:'iPhone 15 系列',price:2490},
 {id:'101',category:'PHONE',brand:'Apple',name:'iPhone 15',series:'iPhone 15 系列',price:1890},
 {id:'102',category:'PHONE',brand:'Apple',name:'iPhone 14 Pro',series:'iPhone 14 系列',price:2090},
 {id:'201',category:'PHONE',brand:'Samsung',name:'Galaxy S24',series:'Galaxy S 系列',price:1790},
 {id:'301',category:'LAPTOP',brand:'Apple',name:'MacBook Pro 14',series:'MacBook 系列',price:4690}
];
const pv=(id,name,isSkuProperty,extra={})=>({id,name,isSkuProperty,active:true,beUseToSku:true,...extra});
const catalog=[
 {id:'P1-MEMORY',category:'PHONE',name:'存储容量',values:[pv('M128','128GB',true,{models:['101','102','201'],delta:0}),pv('M256','256GB',true,{delta:180}),pv('M512','512GB',true,{delta:430})]},
 {id:'P1-COLOR',category:'PHONE',name:'机身颜色',values:[pv('C-BLACK','黑色',true),pv('C-WHITE','白色',true),pv('C-BLUE','蓝色',true,{models:['101','103']})]},
 {id:'P1-CHANNEL',category:'PHONE',name:'购买渠道',values:[pv('P1-CN','大陆国行',true),pv('P1-HK','港澳台版',true,{models:['101','102']})]},
 {id:'P1-SCREEN',category:'PHONE',name:'屏幕外观',values:[pv('S-GOOD','无划痕',false,{isPreferred:true,delta:0}),pv('S-LIGHT','轻微划痕',false,{delta:-120}),pv('S-HEAVY','明显划痕',false,{delta:-260}),pv('S-OLD','旧选项（已停用）',false,{active:false})]},
 {id:'P1-BATTERY',category:'PHONE',name:'电池健康度',values:[pv('B90','90% 及以上',false,{isPreferred:true}),pv('B80','80%–89%',false,{delta:-90}),pv('BLOW','低于 80%',false,{delta:-220})]},
 {id:'N1-MEMORY',category:'LAPTOP',name:'内存容量',values:[pv('N16','16GB',true)]},
 {id:'N1-STORAGE',category:'LAPTOP',name:'硬盘容量',values:[pv('N512','512GB',true),pv('N1024','1TB',true,{delta:350})]},
 {id:'N1-BODY',category:'LAPTOP',name:'机身外观',values:[pv('N-GOOD','外观完好',false,{isPreferred:true}),pv('N-LIGHT','轻微使用痕迹',false,{delta:-180})]}
];
const attr=id=>catalog.find(a=>a.id===id),model=id=>models.find(m=>m.id===id);
const valid=(v,m)=>v.active&&(!v.models||v.models.includes(m.id));
function seed(){return {schema:1,revision:1,rows:[{id:'QI-001',category:'PHONE',ppn:'P1-SCREEN',values:['S-GOOD','S-LIGHT','S-HEAVY'],label:'屏幕外观',order:1,enabled:true,updatedBy:'演示管理员',updatedAt:'2026-10-23T09:00:00Z'},{id:'QI-002',category:'PHONE',ppn:'P1-BATTERY',values:['B90','B80','BLOW'],label:'电池健康度',order:2,enabled:false,updatedBy:'演示管理员',updatedAt:'2026-10-23T09:00:00Z'}],audit:[]};}
function read(storage){try{const s=JSON.parse(storage.getItem(KEY));if(s?.schema===1&&Array.isArray(s.rows))return s;}catch{}return seed();}
function configValues(id){return (attr(id)?.values||[]).filter(v=>v.active&&v.isSkuProperty===false);}
function validate(s,r,id){const a=attr(r.ppn);if(!a||a.category!==r.category)return '请选择当前品类下的有效一级属性项。';if(s.rows.some(x=>x.id!==id&&x.category===r.category&&x.ppn===r.ppn))return '该品类下已配置此属性项，请编辑已有配置。';if(!r.values.length||r.values.some(id=>!configValues(a.id).some(v=>v.id===id)))return '只能选择启用的非 SKU 属性值，且至少选择一项。';if(!r.label.trim())return '请填写前台显示名称。';if(!Number.isInteger(r.order)||r.order<1)return '显示顺序须为正整数。';return '';}
function save(storage,draft,id,revision){const s=read(storage);if(s.revision!==revision)throw Error('配置已更新，请关闭表单并刷新后重试。');const error=validate(s,draft,id);if(error)throw Error(error);const old=s.rows.find(r=>r.id===id);if(id&&!old)throw Error('配置不存在，请刷新。');const now=new Date().toISOString();const row={...clone(draft),id:id||'QI-'+Date.now(),updatedAt:now,updatedBy:'演示管理员'};s.audit.unshift({id:row.id,action:old?'编辑配置':'新增配置',before:old?clone(old):null,after:clone(row),at:now,by:row.updatedBy});if(old)s.rows[s.rows.indexOf(old)]=row;else s.rows.push(row);s.revision++;storage.setItem(KEY,JSON.stringify(s));return s;}
function toggle(storage,id,revision){const s=read(storage),r=s.rows.find(r=>r.id===id);if(!r)throw Error('配置不存在。');return save(storage,{...r,enabled:!r.enabled},id,revision);}
function fields(s,modelId){const m=model(modelId);if(!m)return [];return catalog.filter(a=>a.category===m.category).flatMap(a=>{const values=a.values.filter(v=>valid(v,m));const sku=values.filter(v=>v.isSkuProperty&&v.beUseToSku);const row=s.rows.find(r=>r.category===m.category&&r.ppn===a.id&&r.enabled);const non=row?values.filter(v=>!v.isSkuProperty&&row.values.includes(v.id)):[];if(!sku.length&&!non.length)return [];return [{...a,label:row?.label||a.name,sku:!!sku.length,order:row?.order||0,values:[...sku,...non]}];}).sort((a,b)=>Number(b.sku)-Number(a.sku)||(a.sku?catalog.indexOf(attr(a.id))-catalog.indexOf(attr(b.id)):a.order-b.order||a.id.localeCompare(b.id)));}
function report(s,modelId,selections){const m=model(modelId);if(!m)throw Error('请先选择型号。');const shown=fields(s,modelId);return catalog.filter(a=>a.category===m.category).map(a=>{const f=shown.find(f=>f.id===a.id),choice=selections[a.id];if(f){const v=f.values.find(v=>v.id===choice?.value);if(!v)throw Error('请完成 '+f.label+' 的选择。');return {ppn:a.id,ppv:v.id,source:'manual',value:clone(v),display:choice.label,rule:choice.rule||null};}const baseline=a.values.filter(v=>valid(v,m)&&v.isSkuProperty===false&&v.isPreferred);if(baseline.length!==1)throw Error(a.name+' 缺少唯一有效基准值，请联系管理员维护。');return {ppn:a.id,ppv:baseline[0].id,source:'baseline',value:clone(baseline[0])};});}
function estimate(modelId,report){const m=model(modelId);const raw=m.price+report.reduce((sum,x)=>sum+(x.value.delta||0),0);return {amount:Math.round(raw*.92/10)*10,currency:'MYR',time:new Date().toISOString(),strategy:'DEMO-PRICE / V1',raw};}
return {KEY,clone,categories,models,catalog,attr,model,seed,read,configValues,validate,save,toggle,fields,report,estimate};
});
