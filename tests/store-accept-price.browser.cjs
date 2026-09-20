const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto((process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1:8841') + '/store.html');
    await page.locator('[data-case-entry=role]').click();
    await page.locator('#roleOverviewPage [data-role-entry=employee]').click();
    await page.locator('#preWinnerAuctionCard').click();
    await page.locator('#acceptPreWinner').click();
    assert.doesNotMatch(await page.locator('#sellerDecisionDialog').innerText(), /OTP/i);
    assert.equal(await page.locator('#sendAcceptOtp, #acceptOtpCode').count(), 0);
    await page.locator('#confirmSellerDecisionButton').click();
    assert.equal(await page.locator('#acceptContractError').isVisible(), true);
    assert.equal(await page.locator('#acceptSellerMobileError').isVisible(), true);
    await page.locator('#acceptContractConfirm').check();
    await page.locator('#acceptSellerMobile').fill('123');
    await page.locator('#confirmSellerDecisionButton').click();
    assert.equal(await page.locator('#sellerDecisionDialog').isVisible(), true);
    await page.locator('#acceptSellerMobile').fill('+60 12 345 6789');
    await page.evaluate(() => applyLanguage('en'));
    assert.doesNotMatch(await page.locator('#sellerDecisionDialog').innerText(), /OTP/i);
    await page.screenshot({ path: '/tmp/store-accept-no-otp.png' });
    await page.locator('#confirmSellerDecisionButton').click();
    assert.equal(await page.locator('#sellerDecisionDialog').isVisible(), false);
    assert.equal(await page.evaluate(() => transactionOrderCreated), true);
    assert.equal(await page.locator('#generatedOrderCard').getAttribute('hidden'), null);
    await page.evaluate(() => document.getElementById('confirmSellerDecisionButton').click());
    assert.equal(await page.locator('#generatedOrderCard').count(), 1);
    // Independent rejected-lot path remains available.
    await page.reload();
    await page.evaluate(() => { roleSwitch.value = 'employee'; applyRoleScope(); showPage('preWinnerDetail'); });
    await page.locator('#rejectPreWinner').click();
    assert.equal(await page.locator('#chooseReauction').isVisible(), true);
    await page.locator('#chooseEndLot').click();
    assert.equal(await page.evaluate(() => transactionOrderCreated), false);
    assert.deepEqual(errors, []);
    console.log('PASS: acceptance without OTP, contract/mobile validation, order creation, duplicate confirmation and rejection path');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
