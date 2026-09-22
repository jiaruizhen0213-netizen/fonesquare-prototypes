const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.PROTOTYPE_BASE_URL||'http://127.0.0.1:8797', q=s=>page.locator(s), action=a=>q(`[data-auth="${a}"]`).click();
 const screenshot=async name=>{if(process.env.SCREENSHOT_DIR)await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/recycler-login-${name}.png`,fullPage:true});};
 try {
  await page.goto(base+'/recycler-pc.html');
  assert.ok(await q('#auth-screen').isVisible());assert.ok(await q('#quote-workspace').isHidden());assert.ok(await q('#quote-workspace').evaluate(e=>e.inert));assert.ok(await q('#auth-submit').isDisabled());
  assert.equal(await q('#auth-region').count(),0);await screenshot('mobile-code');await action('terms');assert.ok(await q('#auth-policy').isVisible());await action('close');
  await action('password');await screenshot('phone-password');await action('switch');await screenshot('email-password');assert.equal(await q('#auth-region').count(),0);
  await q('#auth-address').fill('invalid');await q('#auth-password').fill('Demo123456');await q('#auth-consent').check();assert.ok(await q('#auth-submit').isDisabled());
  await q('#auth-address').fill('buyer@example.com');await action('eye');assert.equal(await q('#auth-password').getAttribute('type'),'text');await action('eye');assert.equal(await q('#auth-password').getAttribute('type'),'password');
  await q('#auth-consent').uncheck();assert.ok(await q('#auth-submit').isDisabled());await q('#auth-consent').check();await q('#auth-submit').click();
  assert.ok(await q('#quote-workspace').isVisible());assert.equal(await q('[data-action="open"]').count(),5);await q('[data-action="open"]').first().click();assert.ok(await q('#pricing').isVisible());
  const stored=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));assert.ok(!stored.includes('Demo123456'));assert.ok(!stored.includes('buyer@example.com'));
  await page.reload();assert.ok(await q('#quote-workspace').isVisible());await q('#auth-logout').click();assert.ok(await q('#auth-screen').isVisible());await page.reload();assert.ok(await q('#quote-workspace').isHidden());
  // Phone code: consent, destination binding, resend countdown, wrong and correct code.
  await q('#auth-address').fill('123456789');await q('#auth-consent').check();await q('#auth-submit').click();assert.ok(await q('#auth-code').isVisible());assert.ok(await q('#auth-send').isDisabled());
  await q('#auth-code').fill('111111');await q('#auth-submit').click();assert.ok((await q('#auth-error').innerText()).includes('不正确'));await q('#auth-code').fill('123456');await q('#auth-submit').click();assert.ok(await q('#quote-workspace').isVisible());await q('#auth-logout').click();
  // Email code and fresh reset after changing the destination.
  await action('email');await q('#auth-address').fill('sample@example.com');await q('#auth-consent').check();await q('#auth-submit').click();assert.ok((await q('#auth-error').innerText()).includes('123456'));await action('back');await q('#auth-address').fill('second@example.com');await q('#auth-submit').click();await q('#auth-code').fill('123456');await q('#auth-submit').click();assert.ok(await q('#quote-workspace').isVisible());await q('#auth-logout').click();
  // Reset cannot bypass verification; success returns to sign-in without opening workspace.
  await action('password');await action('switch');await q('#auth-address').fill('sample@example.com');await action('reset');assert.equal(await q('#auth-region').count(),0);await q('#auth-consent').check();await q('#auth-password').fill('NewDemo123');await q('#auth-code').fill('123456');await q('#auth-submit').click();assert.ok((await q('#auth-error').innerText()).includes('先获取'));await action('send');await q('#auth-submit').click();assert.ok((await q('#auth-error').innerText()).includes('已重置'));assert.ok(await q('#quote-workspace').isHidden());
  // Registration requires code and password, uses only a simulated session.
  await action('register');assert.equal(await q('#auth-region').inputValue(),'');await q('#auth-password').fill('DemoRegister123');await action('send');await q('#auth-code').fill('123456');assert.ok(await q('#auth-submit').isDisabled());await page.locator('#auth-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.ok(await q('#quote-workspace').isHidden());await q('#auth-region').selectOption('MY');assert.ok(await q('#auth-submit').isEnabled());await action('language');assert.equal(await q('#auth-region').inputValue(),'MY');assert.equal(await q('label[for="auth-region"]').innerText(),'Country / Region *');await action('language');await screenshot('register');await action('switch');assert.equal(await q('#auth-region').inputValue(),'MY');await q('#auth-region').selectOption('HK');assert.equal(await q('#auth-dial').inputValue(),'+60');await action('switch');await q('#auth-address').fill('sample@example.com');await q('#auth-password').fill('DemoRegister123');await action('send');await q('#auth-code').fill('123456');await q('#auth-submit').click();assert.ok(await q('#quote-workspace').isVisible());await q('#auth-logout').click();
  assert.equal(await q('#auth-region').count(),0);await action('language');assert.equal(await q('#auth-submit').innerText(),'Sign in / Register');await action('password');await action('switch');assert.equal(await q('#auth-address').getAttribute('type'),'email');await action('language');
  for(const size of [{width:1280,height:720},{width:390,height:844}]){await page.setViewportSize(size);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await screenshot(`${size.width}`);}
  assert.deepEqual(errors,[]);console.log('PASS: three login modes, consent, validation, code binding, reset/register, session/logout, no credential persistence, workspace entry, language and responsive layouts');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
