// Serve the repo and set PROTOTYPE_BASE_URL. Optional BASELINE_HTML verifies unchanged list DOM.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const XLSX=require('../vendor/xlsx-0.20.3.min.js');
const schemas={
 settlement:['结算周期','结算单号','结算方向/类型','站点','门店 ID','门店名称','收款人银行登记名称','收款银行','银行账号','币种','结算金额'],
 summary:['门店名称','门店ID','站点','币种','预付金余额','周期内已使用金额','退款恢复金额','取消退款扣回金额','已退金额','收款人银行登记名称','收款银行','银行账号'],
 prepayment:['流水号','业务发生时间','门店名称','门店ID','站点','币种','流水类型','本次变动金额','变动前余额','变动后余额','资金账户流水号','资金发生时间'],
 ledger:['资金明细号','订单号','业务类型','业务时间','站点','币种','业务归属门店','完整中标价','卖家应得金额','门店分成','店员分成','平台分成','当前应结算金额','预付金影响','回收商收款状态','关联结算单号','结算单状态']
};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-gpu'],executablePath:process.env.CHROMIUM_PATH});
 try {
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=(process.env.PROTOTYPE_BASE_URL || 'http://localhost:8862')+'/platform.html';
  await page.goto(url,{waitUntil:'domcontentloaded'});console.log('loaded');
  async function render(p,view,tab){await p.evaluate(({view,tab})=>{const s=window.prototypeState;if(view==='settlementBill')s.renderSettlementListV2();if(view==='financeLedger')s.renderFundsLedgerV2();if(view==='storePrepayment')s.renderStorePrepaymentV2(tab);setView(view);},{view,tab});}
  if(process.env.BASELINE_HTML){
   const baseline=await browser.newPage();
   await baseline.route('**/platform.html',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.BASELINE_HTML,'utf8')}));
   await baseline.goto(url,{waitUntil:'domcontentloaded'});console.log('baseline loaded');
   for(const [view,tab] of [['settlementBill'],['financeLedger'],['storePrepayment','summary'],['storePrepayment','ledger']]){
    await render(baseline,view,tab);await render(page,view,tab);
    assert.equal(await page.locator('#'+view+'Body').innerHTML(),await baseline.locator('#'+view+'Body').innerHTML(),view+' list must be unchanged');
   }
   await baseline.close();
  }
  async function download(action){
   const before=await page.evaluate(()=>JSON.stringify([prototypeState.settlementBillsV2,prototypeState.prepaymentLedgerV2,prototypeState.prepaymentSummariesV2]));
   const pending=page.waitForEvent('download');await page.locator('[data-finance-v2="'+action+'"]').click();const file=await pending;
   const workbook=XLSX.read(fs.readFileSync(await file.path()),{type:'buffer'});
   assert.equal(await page.evaluate(()=>JSON.stringify([prototypeState.settlementBillsV2,prototypeState.prepaymentLedgerV2,prototypeState.prepaymentSummariesV2])),before,'exports cannot mutate finance facts');
   return workbook;
  }
  const rows=(book,name)=>XLSX.utils.sheet_to_json(book.Sheets[name],{header:1});
  await render(page,'settlementBill');
  let book=await download('export-settlement');
  assert.deepEqual(book.SheetNames,['打款明细','请款汇总']);
  let detail=rows(book,'打款明细');assert.deepEqual(detail[0],schemas.settlement);
  assert.equal(detail.length,3);assert.equal(detail[1][8],'214011827314');assert.equal(book.Sheets['打款明细'].I2.t,'s');
  const merged=detail.find(r=>r[4]==='DEMO-STORE-1、DEMO-STORE-2');assert.equal(merged[10],300);
  assert.deepEqual(rows(book,'请款汇总')[1],['MYR',2,2,478.2]);
  await page.locator('#settlementV2Keyword').fill('DEMO');await page.locator('[data-finance-v2="search-settlements"]').click();
  book=await download('export-settlement');assert.equal(rows(book,'打款明细').length,2);assert.equal(rows(book,'请款汇总')[1][3],300);
  await render(page,'storePrepayment','summary');
  book=await download('export-prepayment');detail=rows(book,'门店预付金汇总');assert.deepEqual(detail[0],schemas.summary);assert.equal(detail.length,4);assert.equal(detail[1][4],-428.4);assert.equal(detail[1][11],'214011827314');assert.equal(book.Sheets['门店预付金汇总'].L2.t,'s');
  await page.locator('#prepaymentV2BalanceStatus').selectOption('insufficient');await page.locator('[data-finance-v2="search-prepayment-summary"]').click();book=await download('export-prepayment');assert.equal(rows(book,'门店预付金汇总').length,2);
  await render(page,'storePrepayment','ledger');book=await download('export-prepayment');detail=rows(book,'预付金流水');assert.deepEqual(detail[0],schemas.prepayment);assert.equal(detail.length,8);assert.equal(detail[1][7],-500);assert.equal(detail[2][10],'—');assert.equal(detail[2][11],'—');
  await page.locator('#prepaymentV2Type').selectOption('成交核销');await page.locator('[data-finance-v2="search-prepayment"]').click();book=await download('export-prepayment');assert.equal(rows(book,'预付金流水').length,2);assert.equal(rows(book,'预付金流水')[1][8],3000);
  await render(page,'financeLedger');book=await download('export-ledger');detail=rows(book,'资金台账');assert.deepEqual(detail[0],schemas.ledger);assert.equal(detail.length,7);assert.equal(detail[1][13],-2152.4);
  await page.locator('#fundV2Type').selectOption('发起退款');await page.locator('[data-finance-v2="search-ledger"]').click();book=await download('export-ledger');detail=rows(book,'资金台账');assert.equal(detail.length,3);assert.ok(detail.slice(1).every(r=>r[2]==='发起退款'&&r[13]===2152.4));
  assert.deepEqual(errors,[]);console.log('PASS: 4 export schemas, actual XLSX downloads, text bank accounts, filtered rows, balances, merged settlements, totals and no state mutation; list DOM unchanged when baseline supplied.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
