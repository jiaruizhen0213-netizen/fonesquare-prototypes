const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-gpu'],executablePath:process.env.CHROMIUM_PATH});
 const page=await browser.newPage({viewport:{width:430,height:932}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.PROTOTYPE_BASE_URL||'http://localhost:8778';
 try{
  await page.goto(base+'/recycler.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>localStorage.setItem('fs-shop-address-v1',JSON.stringify({'app:central':{detail:'Supplier address untouched'}})));
  await page.locator('[data-nav="me"]').click();await page.locator('#recyclerContactEntry').click();
  const f=k=>page.locator('#recyclerContactAddress-parts-'+k);
  assert.equal(await f('country').inputValue(),'Malaysia');assert.equal(await f('state').evaluate(e=>e.tagName),'INPUT');assert.equal(await f('latitude').getAttribute('readonly'),'');
  await page.locator('#saveRecyclerContact').click();assert.ok((await page.locator('#contactError').innerText()).length>0);
  await f('search').fill('Garden');await page.locator('.shop-address-results button').first().click();
  await f('search').fill('Tower');assert.equal(await f('state').inputValue(),'Selangor');await page.locator('.shop-address-results button').click();
  assert.equal(await f('city').inputValue(),'Kuala Lumpur');assert.equal(await f('longitude').inputValue(),'101.711600');
  await page.locator('#recyclerContactPhone').fill('+60 12-345 6789');await page.locator('#saveRecyclerContact').click();
  assert.equal(await page.locator('#mePage').isVisible(),true);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fs-shop-address-v1'))['app:central'].detail),'Supplier address untouched');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-nav="me"]').click();await page.locator('#recyclerContactEntry').click();
  assert.equal(await f('longitude').inputValue(),'101.711600');await f('detail').fill('Cancelled detail');assert.equal(await f('longitude').inputValue(),'');await page.locator('#contactBack').click();await page.locator('#recyclerContactEntry').click();assert.equal(await f('detail').inputValue(),'Demo Tower, 12 Jalan Contoh');
  await f('detail').fill('Manual address');await page.locator('#saveRecyclerContact').click();await page.locator('#recyclerContactEntry').click();assert.equal(await f('latitude').inputValue(),'');
  await f('search').fill('Demo');await page.locator('.shop-address-results button').first().click();
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('quota')}});await page.locator('#saveRecyclerContact').click();assert.equal(await page.locator('#contactError').innerText(),'Save failed. Please try again.');assert.equal(await f('state').inputValue(),'Selangor');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-nav="me"]').click();await page.locator('[data-open="settings"]').click();await page.locator('[data-language="zh"]').click();await page.locator('[data-back="me"]').click();assert.ok((await page.locator('#recyclerContactEntry').innerText()).includes('联系信息'));await page.locator('#recyclerContactEntry').click();assert.equal(await f('country').inputValue(),'马来西亚');await f('search').fill('Tower');await page.locator('.shop-address-results button').click();await page.screenshot({path:'/tmp/recycler-contact.png',fullPage:true});
  await page.goto(base+'/store.html',{waitUntil:'domcontentloaded'});await page.evaluate(()=>{roleSwitch.value='merchant';renderProfileScope();showPage('storeAddress')});assert.equal(await page.locator('#managedStoreEditPage').isVisible(),true);assert.equal(await page.locator('#managed-address-parts-search').isVisible(),true);assert.equal(await page.locator('#storeAddressPage').isVisible(),false);
  await page.evaluate(()=>{roleSwitch.value='employee';renderProfileScope();showPage('storeAddress')});assert.equal(await page.locator('#managedStoreEditPage').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('PASS: recycler contact search/save/reload/cancel/failure/language/storage isolation; supplier legacy entry uses structured editor and role guard');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
