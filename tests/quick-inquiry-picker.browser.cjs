const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/daily-layout-browser/playwright/driver/package');
const base=process.env.PROTOTYPE_BASE_URL||'http://127.0.0.1:8879';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/home/ray/.cache/ms-playwright/chromium_headless_shell-1228/chrome-linux/headless_shell',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 try{
  await page.goto(base+'/store.html#quickInquiry');await page.locator('.qi-brand-rail').waitFor();
  assert.deepEqual(await page.locator('.qi-category-tabs button').allTextContents(),['手机','笔记本','平板电脑','智能数码']);
  assert.deepEqual(await page.locator('.qi-brand-rail button').allTextContents(),['苹果','三星']);
  assert.equal(await page.locator('[data-model]').count(),3);assert.equal(await page.locator('#qiQuery').count(),0);
  await page.screenshot({path:'/tmp/qi-picker-phone.png'});
  await page.locator('.qi-series-tabs [data-series="1"]').click();
  await page.waitForFunction(()=>document.querySelector('.qi-model-scroll').scrollTop>50);
  assert.equal(await page.locator('.qi-series-tabs [data-series="1"]').getAttribute('aria-pressed'),'true');
  await page.locator('.qi-model-scroll').evaluate(el=>{el.scrollTop=0;});await page.waitForFunction(()=>document.querySelector('.qi-series-tabs [data-series="0"]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-qi="expand-series"]').click();assert.equal(await page.locator('.qi-series-menu').isVisible(),true);await page.locator('.qi-series-menu [data-series="1"]').click();assert.equal(await page.locator('.qi-series-menu').isVisible(),false);
  await page.locator('[data-qi="expand-series"]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.qi-series-menu').isVisible(),false);
  await page.locator('[data-brand="Samsung"]').click();assert.equal(await page.locator('[data-model]').count(),1);assert.match(await page.locator('#qiModels').innerText(),/Galaxy S24/);assert.doesNotMatch(await page.locator('#qiModels').innerText(),/iPhone/);
  await page.locator('[data-category="LAPTOP"]').click();assert.equal(await page.locator('.qi-brand-rail button').count(),1);assert.match(await page.locator('#qiModels').innerText(),/MacBook/);
  await page.locator('[data-category="TABLET"]').click();assert.match(await page.locator('.qi-category-empty').innerText(),/暂无演示型号/);
  await page.locator('#qiModelSearch').fill('iPhone 15 Pro');assert.equal(await page.locator('[data-model]').count(),1);await page.locator('[data-model="103"]').click();assert.equal(await page.locator('#qiSpecDialog').isVisible(),true);
  await page.locator('[data-qi="close"]').click();await page.locator('[data-qi="change-model"]').click();assert.equal(await page.locator('[data-category="PHONE"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-brand="Apple"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#qiModelSearch').inputValue(),'');
  await page.locator('#qiModelSearch').fill('三星');assert.equal(await page.locator('[data-model="201"]').count(),1);await page.locator('[data-qi="clear-search"]').click();assert.equal(await page.locator('#qiModelSearch').inputValue(),'');assert.equal(await page.locator('.qi-brand-rail').isVisible(),true);
  for(const width of [320,430]){await page.setViewportSize({width,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.evaluate(()=>document.querySelector('#quickInquiryPage').getBoundingClientRect().height<=innerHeight+1),true);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/qi-picker-final.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,base,checks:'category/brand linkage, global search, model selection, series navigation and scroll sync, expandable menu, empty states, 320/390/430 layouts'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
