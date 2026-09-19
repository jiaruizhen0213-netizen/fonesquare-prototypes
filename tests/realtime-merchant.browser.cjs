// Run against a local server with PLAYWRIGHT_MODULE / CHROMIUM_PATH as needed.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-gpu',...(process.env.CHROMIUM_SINGLE_PROCESS?['--single-process','--no-zygote']:[])]});
 try {
  const page=await browser.newPage({viewport:{width:1680,height:1050}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.PROTOTYPE_BASE_URL||'http://127.0.0.1:8794')+'/platform.html',{waitUntil:'domcontentloaded'});
  const action=(id,kind)=>page.locator(`[data-unified-account="${id}"] [data-account-action="${kind}"]`).last();
  const row=id=>page.locator(`[data-unified-account="${id}"]`);
  const reset=()=>page.locator('#resetBtn').click();
  const close=()=>page.evaluate(()=>closeModals());
  assert.equal(await page.locator('#systemName').innerText(),'实时竞拍');
  for(const view of ['list','store','staff']){
   assert.equal(await page.locator(`[data-system-nav="auction"] [data-nav="${view}"]`).count(),1);
   assert.equal(await page.locator(`[data-system-nav="b2b"] [data-nav="${view}"]`).count(),0);
  }
  assert.equal(await page.locator('#addBtn').isVisible(),false);
  for(const id of ['merchantTypeFilter','merchantSourceFilter','kycFilter','merchantBidFilter'])assert.equal(await page.locator('#'+id).isVisible(),false);
  const text=await page.locator('#listPage').innerText();
  assert.doesNotMatch(text,/FoneSquare|KYC|出价权限|添加商家/);
  assert.equal(await page.locator('[data-unified-account]').count(),16);
  assert.equal(await row('1000835').count(),1); // Cross-App merchant, one account row.
  assert.equal(await row('1000829').count(),1); // Previously logged in, now disabled and unselected.
  assert.match(await row('1000825').innerText(),/未选择/);
  assert.equal(await row('1000811').count(),0); // Never logged into Store App.
  assert.equal(await row('1000806').count(),0);
  // Source/identity must not substitute for a login fact.
  await page.evaluate(()=>{users.push({id:'TEST-NO-LOGIN',name:'Never logged in',account:'test***@example.com',type:'供货商家',merchantId:'M-NO-LOGIN',status:'正常',build:'关闭',firstRegisteredApp:'门店端',firstStoreLoginAt:null});renderList();});
  assert.equal(await row('TEST-NO-LOGIN').count(),0);
  await page.screenshot({path:'/tmp/realtime-merchant-list.png',fullPage:true});
  await action('1000825','view').click();
  assert.match(await page.locator('#businessModal').innerText(),/门店端身份：未选择/);
  assert.doesNotMatch(await page.locator('#businessModal').innerText(),/FoneSquare|建拍权限/);
  await close();
  await page.locator('#keyword').fill('1000835');await page.locator('#searchBtn').click();
  await action('1000835','view').click();
  assert.equal(await page.locator('#detailPage').isVisible(),true);
  assert.equal(await page.locator('#businessModal').isVisible(),false);
  assert.match(await page.locator('#tab-basic').innerText(),/门店端商家记录/);
  assert.doesNotMatch(await page.locator('#detailPage').innerText(),/FoneSquare|KYC|限额与保证金|出价权限/);
  await page.locator('[data-tab="merchant-banks"]').click();assert.equal(await page.locator('#addMerchantBank').isVisible(),true);
  await page.locator('[data-tab="basic"]').click();await page.screenshot({path:'/tmp/realtime-merchant-detail.png',fullPage:true});
  await page.locator('#backBtn').click();assert.equal(await page.locator('#keyword').inputValue(),'1000835');assert.equal(await page.locator('[data-unified-account]').count(),1);
  await reset();await action('2000010','view').click();assert.match(await page.locator('#businessModal').innerText(),/Kelvin Goh|店员详情/);assert.doesNotMatch(await page.locator('#businessModal').innerText(),/FoneSquare 资料/);await close();
  // Unfiltered identity change retains row, closes old permissions, preserves login fact.
  await action('2000010','role').click();assert.equal(await page.locator('#businessConfirmBtn').isDisabled(),false);await page.locator('#businessConfirmBtn').click();
  assert.equal(await row('2000010').count(),1);assert.match(await row('2000010').innerText(),/商家[\s\S]*关闭[\s\S]*待完善/);
  await action('2000010','view').click();assert.match(await page.locator('#tab-basic').innerText(),/待完善/);await page.locator('#backBtn').click();
  await page.locator('[data-nav="staff"]').click();assert.equal(await page.locator('[data-staff-view="E3010"]').count(),0);
  await page.locator('[data-nav="list"]').click();
  // Filtered identity change removes only the result, not the account.
  await page.locator('#accountRoleFilter').selectOption('店员');await page.locator('#searchBtn').click();
  await action('2000008','role').click();await page.locator('#businessConfirmBtn').click();assert.equal(await row('2000008').count(),0);assert.match(await page.locator('#toast').innerText(),/当前身份筛选下不再展示/);
  await reset();assert.equal(await row('2000008').count(),1);
  // Return to staff is explicit and leaves archived merchant information intact.
  await action('2000008','role').click();await page.locator('#businessConfirmBtn').click();assert.match(await row('2000008').innerText(),/店员[\s\S]*待关联/);
  // Existing business prevents role changes, and rejection is read-only.
  await page.evaluate(()=>{employeeAccounts.find(s=>s.accountId==='2000002').hasStoreBusiness=true;});
  await action('2000002','role').click();assert.equal(await page.locator('#businessConfirmBtn').isDisabled(),true);assert.match(await page.locator('#accountRoleError').innerText(),/已发生门店端业务/);await close();
  assert.match(await row('2000008').innerText(),/未生效/);
  await row('2000008').locator('[data-staff-build]').click();await page.locator('#businessConfirmBtn').click();
  assert.equal(await row('2000008').locator('[data-staff-build]').isDisabled(),true);
  // Enable only a linked, enabled employee of an enabled merchant.
  await row('2000002').locator('[data-staff-build]').click();await page.locator('#businessConfirmBtn').click();assert.match(await row('2000002').innerText(),/开启/);
  // Store count and merchant link resolve scoped navigation.
  await row('1000834').locator('[data-merchant-stores]').click();assert.equal(await page.locator('#storePage').isVisible(),true);assert.equal(await page.locator('#storeMerchantFilter').inputValue(),'M1002');
  await page.locator('#storeResultArea [data-store-merchant-view="M1002"]').first().click();assert.equal(await page.locator('#detailPage').isVisible(),true);assert.equal(await page.locator('#crumbGroup').innerText(),'实时竞拍');await page.locator('#backBtn').click();assert.equal(await page.locator('#storePage').isVisible(),true);
  await page.evaluate(()=>openNewStoreModal());assert.equal(await page.locator('#storeModal').isVisible(),true);assert.deepEqual(await page.locator('#newStoreBankMode option').evaluateAll(a=>a.map(o=>o.value)),['new','merchant']);await close();
  await page.locator('[data-nav="list"]').click();await reset();
  // Disable preserves membership and separates merchant account from staff account.
  await action('1000834','toggle').click();assert.match(await page.locator('#businessModal').innerText(),/两个 App 均不可登录/);await page.locator('#businessConfirmBtn').click();assert.match(await row('1000834').innerText(),/停用/);
  assert.match(await row('2000002').innerText(),/启用[\s\S]*已解除/);assert.equal(await row('1000834').count(),1);
  await action('1000834','toggle').click();await page.locator('#businessConfirmBtn').click();assert.match(await row('2000002').innerText(),/已解除/);
  // Export uses active scope/filters and masks identifiers.
  await page.locator('#accountRoleFilter').selectOption('未选择');await page.locator('#searchBtn').click();
  const downloadEvent=page.waitForEvent('download');await page.locator('#exportBtn').click();const download=await downloadEvent;const csv=await fs.readFile(await download.path(),'utf8');assert.match(csv,/1000825/);assert.doesNotMatch(csv,/1000811|1000834|KYC|FoneSquare|\+60165555502/);
  await reset();
  // System switching never leaves merchant pages under B2B navigation.
  await page.locator('#systemSwitch').click();await page.locator('[data-system-option="b2b"]').click();assert.equal(await page.locator('#b2bHomePage').isVisible(),true);
  await page.locator('#systemSwitch').click();await page.locator('[data-system-option="auction"]').click();assert.equal(await page.locator('#listPage').isVisible(),true);
  await page.locator('[data-nav="bidList"]').click();assert.equal(await page.locator('#bidListPage').isVisible(),true);
  await page.locator('[data-nav="list"]').click();
  assert.deepEqual(errors,[]);
  console.log('PASS: login membership, deduplication, role-specific detail, identity transitions, permission guards, account disable/restore, store navigation/banking, filtered export and system navigation; no page errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
