const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu',...(process.env.CHROMIUM_SINGLE_PROCESS?['--single-process','--no-zygote']:[])]});
 try{
 const page=await browser.newPage({viewport:{width:1680,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.PROTOTYPE_BASE_URL||'http://127.0.0.1:8794')+'/platform.html',{waitUntil:'domcontentloaded'});
 const row=id=>page.locator('[data-unified-account="'+id+'"]');
 const view=async(id,scope)=>{await row(id).locator('[data-account-action="view"]').click();await page.locator('.account-view-menu [data-profile-page="'+scope+'"]').click();};
 const tab=key=>page.locator('#detailPage .tab[data-tab="'+key+'"]');
 const visibleTabs=()=>page.locator('#detailPage .tab:visible').allTextContents();
 const back=()=>page.locator('#backBtn').click();
 const confirm=()=>page.locator('#businessConfirmBtn').click();
 assert.equal(await page.locator('[data-unified-account]').count(),18);
 await view('1000835','fs');assert.equal(await page.locator('#fsRecordPage').isVisible(),true);assert.equal(await page.locator('#storeRecordPage').isVisible(),false);
 assert.deepEqual(await visibleTabs(),['基本信息','KYC 认证材料','限额与保证金','维护人绑定','操作日志']);
 assert.equal(await page.locator('#tab-basic > .card').count(),1);
 assert.deepEqual(await page.locator('#tab-basic .account-fact > span').allTextContents(),['创建来源','统一账号','商家 ID','商家名称','账号状态','商家类型','姓 / 名','手机','邮箱','所在地区','备注','FoneSquare KYC 状态']);
 assert.doesNotMatch(await page.locator('#fsRecordPage').innerText(),/门店端身份|分账规则|建拍权限|首次登录|收款账户|账号注册时间/);
 await page.screenshot({path:'/tmp/split-fs-basic.png',fullPage:true});
 await page.locator('[data-merged-action="profile"]').click();await page.locator('#editMerchantRemark').fill('FS独立页面验收');await confirm();assert.equal(await page.locator('#fsRecordPage').isVisible(),true);
 await tab('kyc').click();await page.locator('[data-merged-action="kyc-company"]').click();await page.locator('#merged-companyName').fill('FS Company');await confirm();assert.match(await page.locator('#tab-kyc').innerText(),/FS Company/);
 await tab('log').click();assert.match(await page.locator('#tab-log').innerText(),/FS独立页面验收/);assert.doesNotMatch(await page.locator('#tab-log').innerText(),/门店端收款账户|M1009/);await back();
 await view('1000835','store');assert.equal(await page.locator('#storeRecordPage').isVisible(),true);
 assert.deepEqual(await visibleTabs(),['基本信息','业务权限','分账规则','收款账户','维护人绑定','操作日志']);
 assert.match(await page.locator('#tab-basic').innerText(),/门店端商家信息/);assert.doesNotMatch(await page.locator('#storeRecordPage').innerText(),/FoneSquare 商家记录|KYC 认证材料|限额与保证金/);
 await tab('merchant-banks').click();assert.equal(await page.locator('#addMerchantBank').isVisible(),true);
 await tab('permission').click();assert.equal(await page.locator('#tab-permission [data-fs-bid]').count(),0);assert.equal(await page.locator('#tab-permission #editRatioBtn').count(),0);
 await tab('basic').click();await page.screenshot({path:'/tmp/split-store-basic.png',fullPage:true});await back();
 // Missing business records produce neither a fake profile nor a blocked account view.
 const before=await page.evaluate(()=>users.length);
 await view('2000010','fs');assert.match(await page.locator('#tab-basic').innerText(),/暂无 FoneSquare 商家资料/);assert.equal(await page.locator('#tab-basic button').count(),0);await back();
 assert.equal(await page.evaluate(()=>users.length),before);
 await row('2000010').locator('[data-fs-bid]').click();await confirm();assert.equal(await page.evaluate(()=>prototypeState.realtimeBidValue('2000010')),'开启');assert.equal(await page.evaluate(()=>users.length),before);
 // Staff links and the list menu resolve the identical Store page.
 await view('2000010','store');const content=await page.locator('#tab-basic').innerText();
 assert.deepEqual(await visibleTabs(),['基本信息','业务权限','收款账户','操作日志']);await back();
 await page.locator('[data-nav="staff"]').click();await page.locator('#staffKeyword').fill('Kelvin');await page.evaluate(()=>applyStaffFilters());await page.locator('[data-staff-view="E3010"]').last().click();
 assert.equal(await page.locator('#storeRecordPage').isVisible(),true);assert.equal(await page.locator('#tab-basic').innerText(),content);
 await page.locator('#tab-basic [data-staff-action="bind"]').click();await page.locator('#targetStaffMerchant').selectOption('M1002');await confirm();assert.match(await page.locator('#tab-basic').innerText(),/当前关联时间/);
 await page.locator('#tab-basic [data-staff-action="unbind"]').click();await page.locator('#staffUnbindReason').fill('解除验收');await confirm();await tab('log').click();assert.match(await page.locator('#mergedStaffHistory').innerText(),/Siti Nur/);assert.doesNotMatch(await page.locator('#tab-log').innerText(),/FoneSquare/);
 await tab('merchant-banks').click();await page.locator('#tab-merchant-banks [data-staff-action="edit-bank"]').click();await page.locator('#staffBankHolder').fill('Kelvin');await page.locator('#staffBankName').fill('Test Bank');await page.locator('#staffBankNumber').fill('1234567890');await confirm();assert.match(await page.locator('#tab-merchant-banks').innerText(),/7890/);
 await back();assert.equal(await page.locator('#staffPage').isVisible(),true);assert.equal(await page.locator('#staffKeyword').inputValue(),'Kelvin');await page.locator('[data-nav="list"]').click();
 for(const [id,message] of [['1000806','尚未登录门店端'],['1000825','尚未选择身份']]){
 await view(id,'store');assert.deepEqual(await visibleTabs(),['基本信息','操作日志']);assert.match(await page.locator('#tab-basic').innerText(),new RegExp(message));assert.equal(await page.locator('#tab-basic button').count(),0);await back();
 }
 // Account disablement is shared but the detail stays in the chosen business page.
 await view('1000835','fs');await page.locator('#statusBtn').click();assert.match(await page.locator('#businessModal').innerText(),/两个 App 均不可登录/);await confirm();assert.equal(await page.locator('#fsRecordPage').isVisible(),true);assert.match(await page.locator('#tab-basic').innerText(),/停用/);await page.locator('#statusBtn').click();await confirm();await back();
 // System switching restores the same independent page.
 await view('1000806','fs');await page.locator('#systemSwitch').click();await page.locator('[data-system-option="b2b"]').click();await page.locator('#systemSwitch').click();await page.locator('[data-system-option="auction"]').click();assert.equal(await page.locator('#fsRecordPage').isVisible(),true);assert.equal(await page.locator('#crumbCurrent').innerText(),'FoneSquare 商家记录');await back();
 // Role transition doesn't remove the unified account and its new Store profile remains scoped.
 await row('2000010').locator('[data-account-action="role"]').click();await confirm();assert.equal(await row('2000010').count(),1);await view('2000010','store');assert.match(await page.locator('#tab-basic').innerText(),/待完善/);assert.equal(await tab('share').isVisible(),true);await back();
 assert.deepEqual(errors,[]);console.log('PASS: independent FS/Store pages, exact screenshot fields and five FS tabs, scoped records/logs/owners, edits, missing profiles, staff relation/bank management, no-role states, identity changes, shared disablement and system navigation; no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
