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
  for(const id of ['merchantTypeFilter','merchantSourceFilter','kycFilter'])assert.equal(await page.locator('#'+id).isVisible(),false);
  const text=await page.locator('#listPage').innerText();
  assert.doesNotMatch(text,/KYC|添加商家/);
  assert.equal(await page.locator('[data-unified-account]').count(),18);
  assert.equal(await row('1000835').count(),1); // Cross-App merchant, one account row.
  assert.equal(await row('1000829').count(),1); // Previously logged in, now disabled and unselected.
  assert.match(await row('1000825').innerText(),/未选择/);
  assert.equal(await row('1000811').count(),1); // Never logged into Store App.
  assert.equal(await row('1000806').count(),1);
  assert.match(await row('1000806').innerText(),/未登录/);
  assert.equal(await row('1000806').locator('[data-fs-bid]').count(),1);
  assert.equal(await row('2000010').locator('[data-fs-bid]').count(),1);
  assert.equal(await page.evaluate(()=>prototypeState.realtimeBidValue('2000010')),'关闭');
  assert.equal(await page.locator('[data-account-action="fs"],[data-account-action="store"]').count(),0);
  assert.equal(await page.locator('#merchantBidFilter').isVisible(),false);
  await page.screenshot({path:'/tmp/merged-account-list.png',fullPage:true});
  const tab=key=>page.locator('#detailPage .tab[data-tab="'+key+'"]');
  const back=()=>page.locator('#backBtn').click();
  // Never logged in and no selected identity remain readable, without Store configuration.
  for(const [id,message] of [['1000806','尚未登录门店端'],['1000825','尚未选择身份']]){
   await action(id,'view').click();assert.equal(await page.locator('#detailPage').isVisible(),true);assert.equal(await page.locator('#businessModal').isVisible(),false);
   await tab('store-info').click();assert.match(await page.locator('#tab-store-info').innerText(),new RegExp(message));assert.equal(await page.locator('#tab-store-info button').count(),0);
   assert.equal(await tab('share').isVisible(),false);assert.equal(await tab('merchant-banks').isVisible(),false);
   await tab('permission').click();assert.equal(await page.locator('#tab-permission [data-fs-bid]').count(),1);
   assert.equal(await page.locator('#tab-permission [data-permission="build"],#tab-permission [data-staff-build]').count(),0);
   await back();
  }
  // Neither App business profile exists: viewing never enrolls the account.
  await page.evaluate(()=>{users.push({id:'3000000',type:'统一账号',name:'No App Identity',account:'none***@example.com',status:'正常',createdAt:'2026-08-01 00:00',firstStoreLoginAt:null});renderList();});
  const noProfileCount=await page.evaluate(()=>users.length);
  await action('3000000','view').click();assert.match(await page.locator('#tab-basic').innerText(),/暂无 FoneSquare 商家资料/);await tab('store-info').click();assert.match(await page.locator('#tab-store-info').innerText(),/尚未登录门店端/);
  await tab('kyc').click();assert.equal(await page.locator('#tab-kyc button').count(),0);await tab('limit').click();assert.equal(await page.locator('#tab-limit button').count(),0);
  await tab('permission').click();await page.locator('#tab-permission [data-fs-bid]').click();await page.locator('#businessConfirmBtn').click();assert.equal(await page.evaluate(()=>users.length),noProfileCount);await back();
  await page.evaluate(()=>{users.splice(users.findIndex(u=>u.id==='3000000'),1);renderList();});
  // A merchant has both App profiles plus independent share and bank data in one page.
  await page.locator('#keyword').fill('1000835');await page.locator('#searchBtn').click();await action('1000835','view').click();
  assert.equal(await page.locator('#tab-basic > .card').count(),1);
  assert.deepEqual(await page.locator('#tab-basic .account-fact > span').allTextContents(),['创建来源','统一账号','商家 ID','商家名称','账号状态','商家类型','姓 / 名','手机','邮箱','所在地区','备注','FoneSquare KYC 状态']);
  assert.doesNotMatch(await page.locator('#tab-basic').innerText(),/门店端商家|门店端身份|首次登录/);
  await tab('store-info').click();assert.match(await page.locator('#tab-store-info').innerText(),/门店端商家信息/);
  assert.doesNotMatch(await page.locator('#tab-store-info').innerText(),/分账规则|银行卡|建拍权限|维护人/);assert.equal(await page.locator('#tab-store-info .store-card').count(),0);
  await page.screenshot({path:'/tmp/store-tab-merchant.png',fullPage:true});
  await tab('permission').click();assert.equal(await page.locator('#tab-permission #editRatioBtn').count(),0);
  assert.equal(await tab('share').isVisible(),true);assert.equal(await tab('kyc').isVisible(),true);
  await tab('merchant-banks').click();assert.equal(await page.locator('#addMerchantBank').isVisible(),true);
  await tab('basic').click();await page.screenshot({path:'/tmp/merged-account-merchant.png',fullPage:true});await back();assert.equal(await page.locator('#keyword').inputValue(),'1000835');await reset();
  // Missing FS record never materializes merely from viewing, editing bank, or changing bid.
  const usersBefore=await page.evaluate(()=>users.length);
  await action('2000010','view').click();assert.match(await page.locator('#tab-basic').innerText(),/暂无 FoneSquare 商家资料/);
  await tab('store-info').click();assert.match(await page.locator('#tab-store-info').innerText(),/门店端店员信息/);assert.doesNotMatch(await page.locator('#tab-store-info').innerText(),/银行卡|建拍权限|分账规则/);assert.equal(await tab('share').isVisible(),false);
  await tab('permission').click();await page.locator('#tab-permission [data-fs-bid]').click();await page.locator('#businessConfirmBtn').click();
  await tab('log').click();assert.match(await page.locator('#tab-log').innerText(),/关闭 → 开启/);assert.equal(await page.evaluate(()=>users.length),usersBefore);
  await back();await row('2000010').locator('[data-fs-bid]').click();await page.locator('#businessConfirmBtn').click();
  await action('2000010','view').click();await tab('store-info').click();const staffContent=await page.locator('#tab-store-info').innerText();await back();
  await page.locator('[data-nav="staff"]').click();await page.locator('#staffKeyword').fill('Kelvin');await page.evaluate(()=>applyStaffFilters());await page.locator('[data-staff-view="E3010"]').last().click();
  await tab('store-info').click();assert.equal(await page.locator('#tab-store-info').innerText(),staffContent);
  // Current relationship is maintained here; history appears only in logs.
  await page.locator('#tab-store-info [data-staff-action="bind"]').click();await page.locator('#targetStaffMerchant').selectOption('M1002');await page.locator('#businessConfirmBtn').click();
  assert.match(await page.locator('#tab-store-info').innerText(),/当前关联时间/);assert.equal(await page.locator('#tab-store-info [data-staff-merchant="M1002"]').count(),1);
  await page.locator('#tab-store-info [data-staff-action="unbind"]').click();await page.locator('#staffUnbindReason').fill('门店端信息验收');await page.locator('#businessConfirmBtn').click();
  assert.match(await page.locator('#tab-store-info').innerText(),/最近解除时间/);assert.equal(await page.locator('#tab-store-info .timeline').count(),0);
  await tab('log').click();assert.match(await page.locator('#mergedStaffHistory').innerText(),/Siti Nur/);
  await page.locator('#mergedLogSource').selectOption('门店端店员');assert.equal(await page.locator('#mergedStaffHistory').isVisible(),true);
  await page.locator('#mergedLogSource').selectOption('FoneSquare');assert.equal(await page.locator('#mergedStaffHistory').isVisible(),false);
  await tab('merchant-banks').click();await page.locator('#tab-merchant-banks [data-staff-action="edit-bank"]').click();
  await page.locator('#staffBankHolder').fill('Kelvin Goh');await page.locator('#staffBankName').fill('Test Bank');await page.locator('#staffBankNumber').fill('1234567890');await page.locator('#businessConfirmBtn').click();
  assert.match(await page.locator('#tab-merchant-banks').innerText(),/7890/);assert.doesNotMatch(await page.locator('#tab-merchant-banks').innerText(),/1234567890/);
  await back();assert.equal(await page.locator('#staffPage').isVisible(),true);assert.equal(await page.locator('#staffKeyword').inputValue(),'Kelvin');assert.equal(await page.locator('#staffResultArea tbody tr').count(),1);
  await page.evaluate(()=>resetStaffFilters());await page.locator('[data-nav="list"]').click();
  // Employee with FS record sees both, and KYC edits cannot change their Store identity.
  await page.evaluate(()=>{const fs=users.find(u=>u.type==='FoneSquare 回收商');users.push({...structuredClone(fs),id:'2000010',merchantId:'M-FS-EMPLOYEE',name:'Kelvin FS',firstStoreLoginAt:'2026-08-22 08:37'});renderList();});
  await action('2000010','view').click();assert.match(await page.locator('#tab-basic').innerText(),/FoneSquare 商家记录/);assert.doesNotMatch(await page.locator('#tab-basic').innerText(),/门店端店员/);await tab('store-info').click();assert.match(await page.locator('#tab-store-info').innerText(),/门店端店员信息/);await page.screenshot({path:'/tmp/store-tab-staff.png',fullPage:true});
  await tab('kyc').click();await page.locator('[data-merged-action="kyc-company"]').click();await page.locator('#merged-companyName').fill('Employee FS Company');await page.locator('#businessConfirmBtn').click();
  assert.match(await page.locator('#tab-kyc').innerText(),/Employee FS Company/);assert.equal(await page.evaluate(()=>prototypeState.realtimeAccountRows().find(a=>a.id==='2000010').role),'店员');
  await page.locator('[data-merged-action="kyc-personal"]').click();await page.locator('#merged-documentNumber').fill('P123456789');await page.locator('#merged-documentFront').setInputFiles({name:'proof.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/5xkAAAAASUVORK5CYII=','base64')});await page.locator('#businessConfirmBtn').click();await page.waitForTimeout(100);
  assert.match(await page.locator('#tab-kyc').innerText(),/proof.png/);await tab('log').click();assert.match(await page.locator('#tab-log').innerText(),/Employee FS Company/);assert.doesNotMatch(await page.locator('#tab-log').innerText(),/P123456789/);
  await tab('basic').click();await page.screenshot({path:'/tmp/merged-account-staff.png',fullPage:true});await back();
  // Profile changes are audited and remain local to their App record.
  await action('1000806','view').click();await page.locator('[data-merged-action="profile"]').click();await page.locator('#editMerchantRemark').fill('资料合并验收');await page.locator('#businessConfirmBtn').click();await tab('log').click();assert.match(await page.locator('#tab-log').innerText(),/资料合并验收/);await tab('limit').click();await page.locator('[data-merged-action="limit"][data-site="迪拜"]').click();
  await page.locator('#merged-daily').fill('100');await page.locator('#merged-deposit').fill('0');await page.locator('#merged-limit-reason').fill('测试独立卖场');await page.locator('#businessConfirmBtn').click();await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>users.find(u=>u.id==='1000806').limitsBySite['迪拜'].dailyLimit),100);
  await tab('owner').click();await page.locator('#tab-owner [data-merchant-owner-edit]').first().click();await page.locator('#targetMerchantOwner').selectOption({index:1});await page.locator('#merchantOwnerReason').fill('测试维护人');await page.locator('#businessConfirmBtn').click();await tab('log').click();assert.match(await page.locator('#tab-log').innerText(),/测试维护人/);await back();
  await page.locator('#expandAccountFilters').click();
  // Restored FS permission changes only the FS record, independent of Store App access.
  const storeBefore=await page.evaluate(()=>JSON.stringify(users.find(u=>u.id==='1000835'&&u.type==='供货商家')));
  await row('1000835').locator('[data-fs-bid]').click();assert.match(await page.locator('#businessModal').innerText(),/FoneSquare 出价权限/);await page.locator('#businessConfirmBtn').click();
  assert.equal(await page.evaluate(()=>users.find(u=>u.id==='1000835'&&u.type==='FoneSquare 回收商').bid),'开启');
  assert.equal(await page.evaluate(()=>JSON.stringify(users.find(u=>u.id==='1000835'&&u.type==='供货商家'))),storeBefore);
  await row('1000835').locator('[data-fs-bid]').click();await page.locator('#businessConfirmBtn').click();
  assert.equal(await page.evaluate(()=>users.find(u=>u.id==='1000835'&&u.type==='FoneSquare 回收商').bid),'关闭');
  await row('1000806').locator('[data-fs-bid]').click();await page.locator('#businessConfirmBtn').click();
  assert.equal(await page.evaluate(()=>users.find(u=>u.id==='1000806').bid),'关闭');
  assert.equal(await row('1000811').locator('[data-fs-bid]').isDisabled(),true);
  await row('1000806').locator('[data-fs-bid]').click();
  await page.evaluate(()=>{users.find(u=>u.id==='1000806').bid='开启';});
  await page.locator('#businessConfirmBtn').click();assert.match(await page.locator('#businessModal').innerText(),/状态已变化/);await close();
  assert.deepEqual(await page.locator('#merchantBidFilter option').evaluateAll(a=>a.map(o=>o.value)),['','开启','关闭']);await page.locator('#merchantBidFilter').selectOption('关闭');await page.locator('#searchBtn').click();assert.equal(await row('1000806').count(),0);assert.equal(await row('2000010').count(),1);await reset();
  await page.locator('#accountRoleFilter').selectOption('未登录');await page.locator('#searchBtn').click();assert.equal(await row('1000806').count(),1);assert.equal(await row('1000825').count(),0);await reset();
  // Unfiltered identity change retains row, closes old permissions, preserves login fact.
  await action('2000010','role').click();assert.equal(await page.locator('#businessConfirmBtn').isDisabled(),false);await page.locator('#businessConfirmBtn').click();
  assert.equal(await row('2000010').count(),1);assert.match(await row('2000010').innerText(),/商家[\s\S]*关闭[\s\S]*待完善/);
  await action('2000010','view').click();await tab('store-info').click();assert.match(await page.locator('#tab-store-info').innerText(),/待完善/);await page.locator('#backBtn').click();
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
  const downloadEvent=page.waitForEvent('download');await page.locator('#exportBtn').click();const download=await downloadEvent;const csv=await fs.readFile(await download.path(),'utf8');assert.match(csv,/1000825/);assert.match(csv,/FoneSquare 出价权限/);assert.doesNotMatch(csv,/1000811|1000834|KYC|\+60165555502/);
  await reset();
  // System switching never leaves merchant pages under B2B navigation.
  await page.locator('#systemSwitch').click();await page.locator('[data-system-option="b2b"]').click();assert.equal(await page.locator('#b2bHomePage').isVisible(),true);
  await page.locator('#systemSwitch').click();await page.locator('[data-system-option="auction"]').click();assert.equal(await page.locator('#listPage').isVisible(),true);
  await page.locator('[data-nav="bidList"]').click();assert.equal(await page.locator('#bidListPage').isVisible(),true);
  await page.locator('[data-nav="list"]').click();
  assert.deepEqual(errors,[]);
  console.log('PASS: merged account detail including merchant/staff/no-role/no-profile, screenshot fields, KYC image and company editors, profile/limit/owner audit, all unified accounts, separate FS bid permission and Store App permission, login-state filtering, deduplication, role-specific detail, identity transitions, permission guards, account disable/restore, store navigation/banking, filtered export and system navigation; no page errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
