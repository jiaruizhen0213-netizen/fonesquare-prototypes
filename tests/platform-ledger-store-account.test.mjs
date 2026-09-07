import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../platform.html',import.meta.url),'utf8');
const start=html.indexOf('  function storeAccountKeyV2(');
const end=html.indexOf('  // Existing examples retain',start);
const exportStart=html.indexOf('  function buildStorePayoutExportV2(');
const exportEnd=html.indexOf('  function exportStoreSettlementV2(',exportStart);
const context=vm.createContext({});
vm.runInContext(html.slice(start,end)+html.slice(exportStart,exportEnd),context);
const merge=context.mergeStoreSettlementsV2;
const buildExport=context.buildStorePayoutExportV2;
const plain=value=>JSON.parse(JSON.stringify(value));
function bill(id,amount,extra={}) {
  return {id,site:'MY',payer:'Platform MY',currency:'MYR',period:'2026-08 月结',type:'平台应付（门店收款）',settlementDirection:'平台应付',billStatus:'待处理',paymentStatus:'待打款',deadline:'2026-09-10',accountSnapshot:{holder:'Test Trading',bankName:'Maybank',accountNumber:'001234567890'},amount,stores:[{id,name:id}],storeBalances:[{id,name:id,balance:amount*10}],sources:[{order:id+'-ORDER',storeId:id,currentShare:amount}],paymentRecords:[],restoreRecords:[],...extra};
}
test('same complete bank account merges stores, preserves source amounts and independent balances',()=>{
  const input=[bill('A',100),bill('B',200)],before=structuredClone(input),out=merge(input);
  assert.equal(out.length,1);assert.equal(out[0].amount,300);
  assert.deepEqual(plain(out[0].sources.map(s=>s.currentShare)),[100,200]);
  assert.deepEqual(plain(out[0].storeBalances.map(s=>s.balance)),[1000,2000]);
  assert.equal(out[0].prepaymentBalance,null);assert.deepEqual(input,before);
  assert.deepEqual(plain(merge(out)),plain(out));
});
test('splits by complete bank identity, platform payer, site, currency and period',()=>{
  const base=bill('A',100);
  for(const change of [{payer:'Other Platform'},{site:'HK'},{currency:'HKD'},{period:'2026-09 月结'},...['holder','bankName','accountNumber'].map(key=>({accountSnapshot:{...base.accountSnapshot,[key]:'different'}}))])assert.equal(merge([base,bill('B',200,change)]).length,2);
  assert.equal(merge([base,bill('B',200,{accountSnapshot:{...base.accountSnapshot,accountNumber:'991234567890'}})]).length,2,'matching tails are insufficient');
  assert.equal(merge([base,bill('B',200,{accountSnapshot:null})]).length,2);
});
test('does not merge staff, receipts or historical payment/restoration records',()=>{
  for(const change of [{type:'平台应付（店员收款）'},{type:'平台应收（回收商付款）',settlementDirection:'平台应收'},{billStatus:'已作废'},{billStatus:'已处理',paymentStatus:'已打款'},{paymentRecords:[{amount:200}]},{restoreRecords:[{reason:'误标'}]}])assert.equal(merge([bill('A',100),bill('B',200,change)]).length,2);
});
test('export emits one merged payout, keeps full account as text and excludes paid/void bills',()=>{
  const grouped=merge([bill('A',100),bill('B',200)]);
  const data=buildExport([...grouped,...grouped,bill('C',50,{billStatus:'已作废'}),bill('D',60,{paymentStatus:'已打款'})]);
  assert.equal(data.details.length,1);assert.equal(data.details[0][6],'001234567890');assert.equal(data.details[0][8],300);
  assert.match(data.details[0][3],/A.*B/);assert.deepEqual(plain(data.summaries),[['MYR',1,1,300]]);
});
test('export separates currencies, deduplicates recipients and refuses incomplete bank snapshots',()=>{
  const data=buildExport([bill('A',100),bill('B',200,{period:'2026-09 月结'}),bill('C',50,{currency:'HKD'})]);
  assert.deepEqual(plain(data.summaries),[['MYR',2,1,300],['HKD',1,1,50]]);
  assert.throws(()=>buildExport([bill('A',100,{accountSnapshot:null})]),/完整收款账户/);
});
