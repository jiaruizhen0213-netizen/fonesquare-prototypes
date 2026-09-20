const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),s=await ctx.newPage(),r=await ctx.newPage(),errors=[];
 for(const p of [s,r]){p.setDefaultTimeout(7000);p.on('pageerror',e=>errors.push(e.message));}
 const base=process.env.PROTOTYPE_BASE_URL||'http://127.0.0.1:8794';
 await s.goto(base+'/store.html',{waitUntil:'domcontentloaded'});await r.goto(base+'/recycler.html',{waitUntil:'domcontentloaded'});
 await s.evaluate(()=>{roleSwitch.value='merchant';roleSwitch.dispatchEvent(new Event('change'));showPage('lot');});
 await r.evaluate(()=>{setLanguage('zh');showPage('auction');});
 assert.equal(await s.locator('#lotPage>.shared-report').innerText(),await r.locator('#auctionPage>.shared-report').innerText());
 assert.equal(await s.locator('#lotPage>.shared-product').innerText(),await r.locator('#auctionPage>.shared-product').innerText());
 await s.locator('#lotPage .shared-photo').first().click();assert.equal(await s.locator('dialog.shared-photo-preview').isVisible(),true);await s.locator('.preview-next').click();assert.match(await s.locator('.preview-controls').innerText(),/2 \/ 3/);await s.locator('.preview-close').click();
 await r.locator('#auctionPage .shared-photo').first().click();await r.locator('.preview-close').click();
 await s.screenshot({path:'/tmp/shared-store-auction.png',fullPage:true});await r.screenshot({path:'/tmp/shared-recycler-auction.png',fullPage:true});
 await r.evaluate(()=>{currentLotKey='inherited';renderAuction();});assert.match(await r.locator('#auctionPage>.shared-report').innerText(),/85%–90%/);assert.match(await r.locator('#auctionPage>.shared-product').innerText(),/Huawei/);
 await r.evaluate(()=>{currentLotKey='no-reference';renderAuction();});assert.equal(await r.locator('#auctionRemarks').isVisible(),false);
 await s.evaluate(()=>showPage('otherAuction'));assert.match(await s.locator('#otherAuctionPage').innerText(),/Huawei/);assert.equal(await s.locator('#otherAuctionPage .shared-report').count(),1);
 await s.evaluate(()=>showPage('preWinnerDetail'));assert.equal(await s.locator('#preWinnerDetailPage>.shared-report').count(),1);assert.equal(await s.locator('#preWinnerDecisionActions').isVisible(),false);
 for(const id of ['FSO-260821-0098','FSO-260820-0048','FSO-260819-0039']){
  await s.evaluate(()=>showPage('orders'));await r.evaluate(()=>showPage('orders'));
  await s.locator('[data-order-id="'+id+'"]').click();await r.locator('[data-order-id="'+id+'"]').click();
  assert.equal(await s.locator('#storeOrderDetailPage .shared-report').innerText(),await r.locator('#wonPage .shared-report').innerText());
  assert.match(await s.locator('#storeOrderDetailPage').innerText(),/卖家应得金额/);assert.doesNotMatch(await r.locator('#wonPage').innerText(),/卖家应得金额|分成/);
  if(id==='FSO-260819-0039'){
   for(const [p,selector] of [[s,'#storeOrderDetailPage'],[r,'#wonPage']]){assert.match(await p.locator(selector).innerText(),/已送达/);assert.match(await p.locator(selector).innerText(),/2026-08-20 15:20/);assert.match(await p.locator(selector).innerText(),/2026-08-21 10:10/);}
  }
 }
 await s.screenshot({path:'/tmp/shared-store-delivered.png',fullPage:true});await r.screenshot({path:'/tmp/shared-recycler-delivered.png',fullPage:true});
 await s.locator('#orderDetailBack').click();await r.locator('#orderDetailBack').click();
 await s.locator('[data-order-tab="delivered"]').click();await r.locator('[data-status="delivered"]').click();
 assert.equal(await s.locator('.unified-order-card:visible').count(),1);assert.equal(await r.locator('.unified-order-card:visible').count(),1);
 await s.evaluate(()=>{roleSwitch.value='employee';roleSwitch.dispatchEvent(new Event('change'));});assert.equal(await s.locator('.unified-order-card:visible').count(),0);await s.evaluate(()=>showPage('otherAuction'));assert.equal(await s.locator('#otherAuctionPage').isVisible(),false);
 await r.evaluate(()=>setLanguage('en'));assert.match(await r.locator('[data-status="delivered"]').innerText(),/Delivered/);
 for(const p of [s,r])assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS shared report/product parity, remarks, photos, selected order, all states, role guard, i18n and mobile widths');
 }catch(e){console.error(e);throw e;}finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);}
})().catch(e=>{console.error(e);process.exit(1)});
