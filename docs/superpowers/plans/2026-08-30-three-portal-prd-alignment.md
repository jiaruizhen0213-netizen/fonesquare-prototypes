# FoneSquare Three-Portal PRD Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the platform, supplier, and recycler prototypes with the current approved PRDs while preserving the existing visual language and publishing all three bilingual pages to GitHub Pages.

**Architecture:** Keep the repository's three self-contained HTML prototypes with inline CSS and JavaScript. Add one cross-portal Node contract test that grows with each task, retain the existing PMS mapping tests, and validate visible behavior rather than backend-only implementation details.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Git, GitHub Pages.

## Global Constraints

- `platform.html`, `store.html`, and `recycler.html` must all support Simplified Chinese and English.
- Merchant management is the sole account-domain authority: FoneSquare is recycler-side; supplier-side roles are merchant main account and employee; store is attribution only.
- Publishing must not require seller phone or contract, and pricing failure must not block publishing or ordinary bids.
- Supplier pages preserve PMS facts, PPN, and source PPV; they must not expose manual mainland pricing SKU selection.
- Seller acceptance collects contract, `+60` mobile, and OTP after pre-win; seller rejection offers re-auction or end-lot.
- Re-auction inherits each recycler's highest valid active bid for a fixed 48 hours; inheritance does not start the 30-second edit window.
- The auction module alone owns AIH stair-step bidding and identifies AIH from an enabled FoneSquare recycler merchant ID.
- Do not expose idempotency keys, retry jobs, API names, database fields, or other backend-only mechanics.
- Preserve the existing single-file page architecture and existing visual system; no new runtime dependencies.
- The final push to `origin/main` is authorized and may include the 12 pre-existing local commits ahead of the remote branch.

---

### Task 1: Correct the platform account and store model

**Files:**
- Create: `tests/three-portal-prd-alignment.test.mjs`
- Modify: `tests/platform-pms-mapping.test.mjs:1-62`
- Modify: `platform.html:560-700`

**Interfaces:**
- Consumes: existing `users`, `employeeAccounts`, `stores`, `storeUserAccounts()`, `renderStoreMerchantList()`, `renderStoreList()`, and `openStoreDetail()` in `platform.html`.
- Produces: a platform prototype with recycler merchants separated from supplier accounts and no `store primary account` state, UI, or mutations.

- [ ] **Step 1: Write the failing platform account contract**

Create `tests/three-portal-prd-alignment.test.mjs` with these exact checks:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const platform = readFileSync(new URL('../platform.html', import.meta.url), 'utf8');
const store = readFileSync(new URL('../store.html', import.meta.url), 'utf8');
const recycler = readFileSync(new URL('../recycler.html', import.meta.url), 'utf8');

test('platform account model has no store primary account role', () => {
  for (const obsolete of ['店铺主账号', '修改店铺主账号', '独立店铺登录责任账号', 'primaryUserId']) {
    assert.doesNotMatch(platform, new RegExp(obsolete));
  }
  for (const required of ['FoneSquare 回收商', '供货商家', '商家主账号', '门店店员', '业务归属店铺（非账号）']) {
    assert.match(platform, new RegExp(required));
  }
});
```

Remove the obsolete SHA-256 assertion named `store prototype remains byte-for-byte unchanged` from `tests/platform-pms-mapping.test.mjs`; keep every PMS mapping test unchanged.

- [ ] **Step 2: Run the account contract and verify it fails**

Run:

```bash
node --test tests/three-portal-prd-alignment.test.mjs
```

Expected: FAIL because `platform.html` still contains `店铺主账号` and `primaryUserId`.

- [ ] **Step 3: Remove the store-primary account implementation**

In `platform.html`:

- Remove `primaryUserId` from every store fixture.
- Delete `storePrimaryAccount()`, `storeUserType()`, and `openStorePrimaryModal()`.
- Remove the store-primary column, detail card, edit button, creation selector, validation, role mutation, and audit copy.
- Change store detail ownership to a read-only supplier merchant card whose visible label is `业务归属店铺（非账号）`.
- Keep Max-device binding, store status, store auction permission, address, and history.
- Ensure FoneSquare registration creates recycler merchants only and supplier account views list merchant-main and employee accounts only.

The store detail ownership card must use this visible structure:

```html
<div class="readonly-box">
  <label>所属供货商家 / 商家主账号</label>
  <b>FS Retail Malaysia（SM-MY-1001）</b>
  <div>店铺仅作为业务归属，不是账号或角色</div>
</div>
```

- [ ] **Step 4: Run all account and existing PMS tests**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: PASS; the PMS mapping workflow remains intact and the new account contract passes.

- [ ] **Step 5: Commit the platform account correction**

```bash
git add platform.html tests/platform-pms-mapping.test.mjs tests/three-portal-prd-alignment.test.mjs
git commit -m "feat: align platform account domains"
```

---

### Task 2: Align platform pricing, auction, re-auction, order, and pickup views

**Files:**
- Modify: `tests/three-portal-prd-alignment.test.mjs`
- Modify: `platform.html:520-560`
- Modify: `platform.html:824-1100`

**Interfaces:**
- Consumes: `bids`, `rounds`, `orders`, `renderBidDetail()`, `renderRoundDetail()`, `reauction()`, `renderOrderDetail()`, and `submitPickup()`.
- Produces: user-visible platform status for PMS facts, frozen price results, AIH plans, seller decisions, inherited bids, order state, and direct pickup confirmation.

- [ ] **Step 1: Extend the contract with platform business rules**

Append these tests:

```js
test('platform pricing and auction ownership match the PRDs', () => {
  for (const required of [
    '版本 PPN', '来源 PPV', '价格失败不阻断发布和普通报价',
    'FoneSquare 回收商商家 ID', '90% / 95% / 100%',
    '80% / 90% / 95% / 100%', '历史最高有效主动报价',
    '固定 48 小时', '重拍', '结束标单'
  ]) assert.match(platform, new RegExp(required));
  assert.doesNotMatch(platform, /价格模块.{0,30}(创建|生成).{0,20}(自动报价|出价计划)/);
  assert.doesNotMatch(platform, /最终国内定价 SKU/);
});

test('platform order and pickup views contain no closed order or pickup batch', () => {
  for (const obsolete of ['关闭订单', '已关闭', '创建已取货批次', '取货批次号', '交接码']) {
    assert.doesNotMatch(platform, new RegExp(obsolete));
  }
  assert.match(platform, /逐单更新为已取货/);
});
```

- [ ] **Step 2: Run the platform business contracts and verify failure**

Run:

```bash
node --test tests/three-portal-prd-alignment.test.mjs
```

Expected: FAIL on old `最终国内定价 SKU`, automatic-bid ownership, order-close, and pickup-batch copy.

- [ ] **Step 3: Update platform fixtures and visible panels**

Apply these changes:

- Replace bid snapshot `最终国内定价 SKU` with `PMS 基础产品/SKU`, `最终等级`, `版本 PPN`, and `来源 PPV`.
- Add a price-result field with values `已冻结` or `失败（不阻断发布和普通报价）`.
- Keep the price tab read-only; it may show price version and frozen MYR benchmark but no automatic-bid task controls.
- Rename the round tab from `自动出价` to `爱回收阶梯出价` and render qualification as `命中 FoneSquare 回收商商家 ID：RC-AIH-MY-001`.
- Show either the 3-step or 4-step plan and execution result in the auction tab; do not expose an idempotency key or retry job.
- Extend quote fixtures with `source: '主动报价' | '历史沿用'`, `validUntil`, and `editWindow`; render the fixed 48-hour validity and the inherited-bid badge.
- In seller decision details, show acceptance fields only after acceptance. For rejection, render the actual creator's `重拍` or `结束标单` choice.
- Change `reauction()` to present report-age and device-in-store conditions, recomputed price result, and inherited-bid result. Do not display backend task or API details.
- Remove `closeOrder()` and every button or state that invokes it.
- Make `submitPickup()` update the selected orders directly to `已取货`; keep the existing same-store/same-recycler validation but remove batch nouns.

Use this re-auction summary copy:

```html
<div class="alert">
  <span>ⓘ</span>
  <div>报告完成不超过 1 小时且设备仍在店时，可在同一标单创建新轮次。系统自动沿用各回收商最近一轮最高有效主动报价，有效期自原轮次结束起固定 48 小时。</div>
</div>
```

- [ ] **Step 4: Run all tests and compile the platform inline script**

Run:

```bash
node --test tests/*.test.mjs
node -e "const fs=require('fs');const s=fs.readFileSync('platform.html','utf8').match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];new Function(s);"
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit the platform business-flow alignment**

```bash
git add platform.html tests/three-portal-prd-alignment.test.mjs
git commit -m "feat: align platform auction workflows"
```

---

### Task 3: Align supplier roles, publishing, seller acceptance, and rejection

**Files:**
- Modify: `tests/three-portal-prd-alignment.test.mjs`
- Modify: `store.html:416-760`
- Modify: `store.html:771-1342`

**Interfaces:**
- Consumes: `roleSwitch`, `I18N_EN`, page navigation helpers, publish validation, `acceptPreWinner`, `rejectPreWinner`, and `sellerDecisionDialog`.
- Produces: a bilingual supplier prototype with merchant-main/employee roles, non-blocking price failure, post-win contract/phone/OTP, and rejection follow-up choice.

- [ ] **Step 1: Add supplier-side contract tests**

Append:

```js
const publishPage = store.match(/data-page="confirm"[\s\S]*?data-page="success"/)?.[0] ?? '';

test('supplier roles and publishing fields match the PRDs', () => {
  assert.doesNotMatch(store, /value="store"|店铺主账号|FoneSquare 门店端/);
  assert.match(store, /value="merchant"/);
  assert.match(store, /value="employee"/);
  for (const required of ['版本 PPN', '来源 PPV', '价格暂不可用，不影响发布与普通竞价']) {
    assert.match(store, new RegExp(required));
  }
  assert.doesNotMatch(publishPage, /sellerMobile|contractConfirm|合同编号|卖家手机号/);
  assert.doesNotMatch(store, /最终国内定价 SKU|从国内 SKU 目录选择本单国内定价 SKU/);
});

test('supplier seller decision collects details after pre-win and offers re-auction', () => {
  for (const id of ['acceptContractConfirm', 'acceptSellerMobile', 'sendAcceptOtp', 'acceptOtpCode', 'chooseReauction', 'chooseEndLot']) {
    assert.match(store, new RegExp(`id="${id}"`));
  }
  for (const copy of ['重拍', '结束标单', '固定 48 小时', '自动沿用']) {
    assert.match(store, new RegExp(copy));
  }
});
```

- [ ] **Step 2: Run the supplier contracts and verify failure**

Run:

```bash
node --test tests/three-portal-prd-alignment.test.mjs
```

Expected: FAIL because the current role switch includes store owner and publishing still requires contract and seller mobile.

- [ ] **Step 3: Implement the supplier flow**

In `store.html`:

- Change title and shell labels from `FoneSquare 门店端` to `供货端 · 门店端 / 员工 App`.
- Keep only merchant-main and employee options in `roleSwitch`; remove every `store` role branch.
- Replace mainland pricing SKU labels with PMS facts, PPN, and source PPV.
- Remove `contractConfirm`, `sellerMobile`, `contractNumber`, their errors, and their publish validation from the confirmation page.
- Add a price-result card with one interactive demo toggle: `价格已生成` and `价格暂不可用，不影响发布与普通竞价`.
- Make either state publishable.
- Replace the existing seller-decision dialog with two flows:
  - Accept: `acceptContractConfirm`, `acceptSellerMobile`, `sendAcceptOtp`, `acceptOtpCode`, and final confirmation.
  - Reject: `chooseReauction` and `chooseEndLot`; re-auction checks report age/device status and renders inherited-bid outcome.
- Show that acceptance creates one transaction order; repeated confirmation returns the existing result.
- Remove pickup-batch wording and show direct per-order pickup results only.
- Add all new Chinese strings to `I18N_EN`; keep role, form state, and current page unchanged when switching language.

The failed-price card must be visible as:

```html
<div class="callout warning" id="priceResultCard">
  <strong>价格暂不可用</strong>
  <span>不影响发布与普通竞价；本轮不提供偏差提示。</span>
</div>
```

- [ ] **Step 4: Run tests and compile the supplier script**

Run:

```bash
node --test tests/*.test.mjs
node -e "const fs=require('fs');const s=fs.readFileSync('store.html','utf8').match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];new Function(s);"
```

Expected: PASS and exit 0.

- [ ] **Step 5: Commit the supplier prototype**

```bash
git add store.html tests/three-portal-prd-alignment.test.mjs
git commit -m "feat: align supplier publishing and reauction"
```

---

### Task 4: Align recycler identity, ordinary bids, and inherited bids

**Files:**
- Modify: `tests/three-portal-prd-alignment.test.mjs`
- Modify: `recycler.html:360-630`
- Modify: `recycler.html:638-818`

**Interfaces:**
- Consumes: page navigation, `zh`, `setLanguage()`, quote dialog, countdown, orders, and profile/settings sections.
- Produces: a bilingual FoneSquare recycler prototype with no supplier-store maintenance and correct ordinary/inherited bid behavior.

- [ ] **Step 1: Add recycler contract tests**

Append:

```js
test('recycler profile has no supplier store maintenance', () => {
  for (const obsolete of ['storeAddress', 'storeCountry', 'storePhone', 'useVerifiedAddress', 'Save store address', '保存门店地址']) {
    assert.doesNotMatch(recycler, new RegExp(obsolete));
  }
  assert.match(recycler, /FoneSquare 回收商/);
  assert.match(recycler, /无需先完成 KYC/);
});

test('recycler bid UI supports non-blocking and inherited bids without leaking strategy', () => {
  for (const required of ['历史最高有效主动报价', '固定 48 小时', '高于沿用价', '30 秒改价窗口']) {
    assert.match(recycler, new RegExp(required));
  }
  for (const leak of ['MYR 基准价', '偏差百分比', '90% / 95% / 100%', '80% / 90% / 95% / 100%', '爱回收阶梯出价计划']) {
    assert.doesNotMatch(recycler, new RegExp(leak));
  }
});
```

- [ ] **Step 2: Run recycler contracts and verify failure**

Run:

```bash
node --test tests/three-portal-prd-alignment.test.mjs
```

Expected: FAIL because recycler profile still manages a supplier store address and inherited-bid UI is absent.

- [ ] **Step 3: Implement recycler-side visible behavior**

In `recycler.html`:

- Remove the verified-address-to-store banner, store-address page, `addressForm`, and related localStorage code.
- Replace it with a read-only FoneSquare recycler merchant card showing account status and independent bidding permission.
- State that KYC is not a bid prerequisite.
- Add a demo lot with an inherited bid card containing amount, source round, and fixed validity end time.
- Disable submission when the entered first active bid is not strictly above the inherited amount; show the reason without exposing backend rules.
- Start the 30-second edit countdown only after a new active bid succeeds, never when the inherited bid is displayed.
- Add a second quote state with no benchmark: allow submission and omit the deviation-warning dialog.
- Retain the existing risk confirmation for a large deviation when a benchmark exists, but never display the benchmark or percentage.
- Keep seller rejection/timeout read-only and state that the supplier actual creator decides whether to re-auction.
- Add all new strings to `zh`; `setLanguage()` must preserve the current page and quote state.

Use this inherited-bid card:

```html
<div class="notice inherited-bid" id="inheritedBidCard">
  <strong>历史最高有效主动报价已沿用</strong>
  <span>MYR 3,080 · 有效至 23 Aug 2026, 09:40</span>
  <small>首次新报价须高于沿用价；提交成功后才开启 30 秒改价窗口。</small>
</div>
```

- [ ] **Step 4: Run tests and compile the recycler script**

Run:

```bash
node --test tests/*.test.mjs
node -e "const fs=require('fs');const s=fs.readFileSync('recycler.html','utf8').match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];new Function(s);"
```

Expected: PASS and exit 0.

- [ ] **Step 5: Commit the recycler prototype**

```bash
git add recycler.html tests/three-portal-prd-alignment.test.mjs
git commit -m "feat: align recycler bidding experience"
```

---

### Task 5: Complete bilingual and cross-portal residue coverage

**Files:**
- Modify: `tests/three-portal-prd-alignment.test.mjs`
- Modify: `platform.html`
- Modify: `store.html`
- Modify: `recycler.html`

**Interfaces:**
- Consumes: the three updated pages and their translation dictionaries.
- Produces: one passing cross-portal contract suite proving required visible rules and the absence of obsolete copy.

- [ ] **Step 1: Add final bilingual, residue, and compilation contracts**

Append:

```js
const pages = { platform, store, recycler };

test('all portal inline scripts compile', () => {
  for (const [name, html] of Object.entries(pages)) {
    const script = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)?.[1];
    assert.ok(script, `${name} inline script missing`);
    assert.doesNotThrow(() => new Function(script), `${name} inline script must compile`);
  }
});

test('all portals expose Simplified Chinese and English', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.match(html, /简体中文|中文/, `${name} Chinese option missing`);
    assert.match(html, /English/, `${name} English option missing`);
  }
});

test('obsolete cross-portal requirements are absent', () => {
  const all = `${platform}\n${store}\n${recycler}`;
  for (const obsolete of [
    '店铺主账号', '独立店铺登录责任账号', '发布前请先确认线下合同',
    '最终国内定价 SKU', '创建已取货批次', '关闭订单'
  ]) assert.doesNotMatch(all, new RegExp(obsolete));
});
```

- [ ] **Step 2: Run the complete test suite and inspect failures**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: any untranslated or residual old copy fails with its exact token.

- [ ] **Step 3: Fix every reported translation and residue issue**

For each failure:

- Remove the obsolete visible string and the corresponding dead event handler or state.
- Add the exact English translation for every new Chinese string.
- Do not satisfy a test by hiding old content in comments or unused constants; delete it.
- Preserve the current route and state in each language switch implementation.

- [ ] **Step 4: Re-run tests and the repository-wide residue scan**

Run:

```bash
node --test tests/*.test.mjs
rg -n "店铺主账号|独立店铺登录责任账号|发布前请先确认线下合同|最终国内定价 SKU|创建已取货批次|关闭订单" platform.html store.html recycler.html
```

Expected: tests PASS; `rg` exits 1 with no matches.

- [ ] **Step 5: Commit bilingual and residue fixes**

```bash
git add platform.html store.html recycler.html tests/three-portal-prd-alignment.test.mjs
git commit -m "test: enforce three-portal PRD contract"
```

---

### Task 6: Visually validate critical paths in both languages

**Files:**
- Modify only if defects are found: `platform.html`, `store.html`, `recycler.html`, `tests/three-portal-prd-alignment.test.mjs`

**Interfaces:**
- Consumes: locally served prototype pages.
- Produces: visually verified desktop platform and mobile supplier/recycler flows without overflow, dead actions, or language drift.

- [ ] **Step 1: Start the local static server**

Run:

```bash
python3 -m http.server 4173
```

Expected: server listens on `http://127.0.0.1:4173/`.

- [ ] **Step 2: Validate platform critical paths**

Open `http://127.0.0.1:4173/platform.html` and check in Chinese and English:

- Recycler merchant list and supplier account/store details.
- PMS mapping and frozen-price result.
- Auction round AIH plan and inherited quote log.
- Seller rejection followed by re-auction/end-lot display.
- Order detail with only pending pickup/picked up and direct pickup confirmation.

Expected: no store-primary account, final mainland pricing SKU, order-close, or pickup-batch UI appears.

- [ ] **Step 3: Validate supplier critical paths**

Open `http://127.0.0.1:4173/store.html` and check both merchant-main and employee in Chinese and English:

- Complete inspection and reach the publish page.
- Toggle price success/failure and publish successfully in both states.
- Confirm that publish page has no seller phone or contract.
- Accept pre-win and complete contract, `+60` mobile, OTP.
- Reject pre-win and choose re-auction, then repeat and choose end lot.

Expected: role/page state survives language switching and buttons remain usable.

- [ ] **Step 4: Validate recycler critical paths**

Open `http://127.0.0.1:4173/recycler.html` in Chinese and English:

- Submit a normal bid with and without deviation warning.
- View inherited bid and verify an equal/lower first new bid is rejected.
- Submit a higher bid and verify the 30-second edit window starts.
- Check orders and profile contain no supplier-store maintenance.

Expected: benchmark amount, deviation percentage, and AIH internal plan are never visible.

- [ ] **Step 5: Fix visual defects, rerun tests, and commit only if needed**

Run after any fix:

```bash
node --test tests/*.test.mjs
git add platform.html store.html recycler.html tests/three-portal-prd-alignment.test.mjs
git commit -m "fix: polish three-portal prototype flows"
```

Expected: tests PASS. If no files changed, do not create an empty commit.

---

### Task 7: Push and verify GitHub Pages

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: tested local `main` branch.
- Produces: deployed GitHub Pages at the three user-provided URLs.

- [ ] **Step 1: Confirm the final branch state**

Run:

```bash
git status --short
git log --oneline --decorate -8
git diff origin/main..HEAD --stat
```

Expected: clean working tree; the design, implementation plan, tests, and prototype commits are visible.

- [ ] **Step 2: Run the final automated suite**

```bash
node --test tests/*.test.mjs
```

Expected: PASS with zero failures.

- [ ] **Step 3: Push the authorized local main branch**

```bash
git push origin main
```

Expected: push succeeds and includes the pre-existing 12 local commits plus the new design, plan, tests, and prototype commits.

- [ ] **Step 4: Wait for GitHub Pages to serve the pushed revision**

Resolve the pushed commit and use it as the cache-busting query when opening the three production URLs:

```bash
pushed_sha=$(git rev-parse --short HEAD)
open "https://jiaruizhen0213-netizen.github.io/fonesquare-prototypes/platform.html?v=${pushed_sha}"
open "https://jiaruizhen0213-netizen.github.io/fonesquare-prototypes/store.html?v=${pushed_sha}"
open "https://jiaruizhen0213-netizen.github.io/fonesquare-prototypes/recycler.html?v=${pushed_sha}"
```

Expected: all return HTTP 200 and contain a required new token unique to each page.

- [ ] **Step 5: Perform final online visual verification**

Open all three cache-busted URLs and repeat one critical Chinese and English path per portal.

Expected: deployed behavior matches local validation, no stale GitHub Pages asset remains, and the three original non-cache-busted URLs resolve to the same revision.
