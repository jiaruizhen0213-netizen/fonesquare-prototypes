/* Isolated demonstration model. No production PMS, BI or bidding requests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuoteDesk = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SELF = 'REC-MY-SELF-001';
  const clone = x => JSON.parse(JSON.stringify(x));
  const fields = [
    {key:'channel',name:'购买渠道',group:'基础信息',options:['大陆国行','其他版本']},
    {key:'appearance',name:'成色描述',group:'外观',options:['机身完好','机身轻微划痕','机身明显磕碰']},
    {key:'screen',name:'屏幕维修情况',group:'拆修',options:['屏幕无维修情况','屏幕已更换']},
    {key:'screenPart',name:'更换屏幕类型',group:'拆修',options:['原装屏','非原装屏'],when:a=>a.screen==='屏幕已更换'},
    {key:'battery',name:'电池健康',group:'使用功能',options:['90%以上','80%—89%','低于80%']},
    {key:'camera',name:'摄像头功能',group:'使用功能',options:['摄像正常','拍摄模糊','摄像头无法使用']},
    {key:'face',name:'生物识别',group:'使用功能',options:['面容识别正常','面容识别异常'],android:['指纹识别正常','指纹识别异常']},
    {key:'water',name:'进水情况',group:'拆修',options:['机身无进水','机身有进水']}
  ];
  const defaults={channel:'其他版本',appearance:'机身轻微划痕',screen:'屏幕无维修情况',battery:'80%—89%',camera:'摄像正常',face:'面容识别正常',water:'机身无进水'};
  const options=(f,t)=>t.model.startsWith('Samsung')&&f.android?f.android:f.options;
  const activeFields=t=>fields.filter(f=>!f.when||f.when(t.draft));
  const canAccess=code=>code===SELF;
  function validation(t) { return activeFields(t).filter(f=>!options(f,t).includes(t.draft[f.key])).map(f=>`请选择有效的${f.name}`); }
  const changed=t=>JSON.stringify(t.draft)!==JSON.stringify(t.report2);
  function change(t,key,value) {
    const f=fields.find(f=>f.key===key);
    if (!f||!options(f,t).includes(value)) throw Error('选项不适用于当前型号');
    t.draft[key]=value;
    if(t.draft.screen!=='屏幕已更换') delete t.draft.screenPart;
    t.revision++; t.confirmedRevision=null;
    t.previous=t.price||t.previous; t.price=null;
    t.priceState=validation(t).length?'invalid':'loading';
    if(!t.bidManual)t.bid='';
  }
  function calculate(t) {
    const issues=validation(t); if(issues.length)throw Error(issues[0]);
    if(!(t.fx>0))throw Error('汇率缺失或无效，请更新兑换关系后重新取价');
    if(t.failure)throw Error(t.failure);
    const base=t.baseCny; const local=t.localMyr;
    if(!(base>0&&local>0))throw Error('缺少有效的本地价格或 SKU 基准 P1');
    const a=t.draft;
    const deductions={appearance:{'机身轻微划痕':.04,'机身明显磕碰':.12},screen:{'屏幕已更换':.12},screenPart:{'非原装屏':.12},battery:{'80%—89%':.04,'低于80%':.10},camera:{'拍摄模糊':.08,'摄像头无法使用':.18},face:{'面容识别异常':.12,'指纹识别异常':.1},water:{'机身有进水':.2}};
    const factor=Math.max(.2,1-Object.entries(deductions).reduce((s,[k,v])=>s+(v[a[k]]||0),0));
    const actualCny=+(base*factor).toFixed(2), baseMyr=base*t.fx, actualMyr=actualCny*t.fx;
    const coefficient=local/baseMyr, item=actualMyr*coefficient;
    // Demo policy: signed fixed amount plus signed percentage; production comes from configuration.
    const rate=-5,fixed=-20,myr=+(item*(1+rate/100)+fixed).toFixed(2);
    return {revision:t.revision,myr,cny:+(myr/t.fx).toFixed(2),fx:t.fx,baseCny:base,actualCny,baseMyr,actualMyr,coefficient,item,rate,fixed,local,
      actualCode:`DEMO-P-${t.id.slice(-4)}-${t.revision}`,baseCode:`DEMO-B-${t.model.replace(/\W/g,'').toUpperCase()}-${t.memory}`,
      batch:'MY-20260916-01',policy:'PS-DEMO-01 / v3',standard:t.standard,at:new Date().toISOString()};
  }
  function applyResult(t,revision,result,error) {
    if(t.revision!==revision)return false;
    t.price=error?null:result; t.priceState=error?'error':'ready'; t.error=error||'';
    if(!error&&!t.bidManual)t.bid=result.myr.toFixed(2);
    return true;
  }
  function confirmReport(t) {
    const errors=validation(t);
    if(errors.length)throw Error(errors.join('；'));
    const snapshot={id:`PJT3-${t.id.slice(-4)}-v${t.reports.length+1}`,revision:t.revision,attrs:clone(t.draft),reason:t.reason,
      price:t.priceState==='ready'&&t.price?.revision===t.revision?clone(t.price):null,priceState:t.priceState,at:new Date().toISOString()};
    t.reports.push(snapshot);t.confirmedRevision=t.revision;t.handler='陈嘉明';return snapshot;
  }
  function makeBid(t) {
    if(!t.auctionActive)throw Error('竞拍已结束，无法出价');
    const amount=Number(t.bid);
    if(!Number.isFinite(amount)||amount<=0||!/^\d+(\.\d{1,2})?$/.test(String(t.bid)))throw Error('请输入大于 0 的马币金额，最多两位小数');
    if(!t.bidManual&&(t.priceState!=='ready'||t.price?.revision!==t.revision))throw Error('参考价尚未更新，请等待计算或手动输入出价');
    const bid={myr:amount,cny:t.fx>0?+(amount/t.fx).toFixed(2):null,fx:t.fx>0?t.fx:null,revision:t.revision,
      report:t.confirmedRevision===t.revision?t.reports.at(-1)?.id:null,manual:t.bidManual,at:new Date().toISOString()};
    t.bids.push(clone(bid));t.handler='陈嘉明';return bid;
  }
  function status(t){return !t.auctionActive?'竞拍结束':t.bids.length?'已出价':t.confirmedRevision===t.revision?'报告已确认':t.revision>1?'待确认':'待报价';}
  function seed() {
    return [
      ['0216','iPhone 15 Pro','256GB','AR Mobile Sdn Bhd','KL Sentral 店',4400,2880,''],
      ['0217','iPhone 14','128GB','Gadget Hub','Bukit Bintang 店',2800,1780,''],
      ['0218','Samsung S24','256GB','MY Digital','Petaling Jaya 店',3500,2300,'本机 P1 查询失败，请重试'],
      ['0219','iPhone 15 Pro','256GB','AR Mobile Sdn Bhd','Mid Valley 店',4400,2880,''],
      ['0220','iPhone 14','128GB','Gadget Hub','KLCC 店',2800,1780,'']
    ].map((r,i)=>{const a=clone(defaults);if(i===2)a.face='指纹识别正常';
      const t={id:`LOT-MY-20260916-${r[0]}`,model:r[1],memory:r[2],merchant:r[3],store:r[4],baseCny:r[5],localMyr:r[6],failure:r[7],fx:.65,
        report2:a,draft:clone(a),standard:'PJT-PHONE-2026 / v12',revision:1,confirmedRevision:null,reports:[],bids:[],handler:i===1?'陈嘉明':'未分配',
        created:`2026-09-16 ${['09:42','09:38','09:31','09:25','09:18'][i]}`,report1Version:'v1',auctionActive:i!==4,price:null,previous:null,bid:'',bidManual:false,reason:'',priceState:'loading',
        note:'Skrin ada calar halus. Kamera dan Face ID berfungsi dengan baik.',extra:'马来版'};
      try{t.price=calculate(t);t.priceState='ready';t.bid=t.price.myr.toFixed(2);}catch(e){t.priceState='error';t.error=e.message;}
      t.report2Price=clone(t.price);
      if(i===1){t.draft.battery='低于80%';t.revision=2;t.price=calculate(t);t.bid=t.price.myr.toFixed(2);}
      if(i===3){confirmReport(t);makeBid(t);}
      return t;});
  }
  return {SELF,clone,fields,options,activeFields,canAccess,validation,changed,change,calculate,applyResult,confirmReport,makeBid,status,seed};
});
