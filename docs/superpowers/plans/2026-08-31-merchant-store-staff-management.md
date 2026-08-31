# Merchant, Store, and Staff Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the platform prototype so merchant, store, and staff are three independent management pages with source-aware merchant rows, no store-level listing permission, and independently configured staff listing permission whose effective state is gated by the merchant permission.

**Architecture:** Keep the repository's existing single-file `platform.html` structure, but separate merchant, store, and staff page state and render functions. Use `users` as App-scoped merchant records, `stores` as store records, and `employeeAccounts` as staff-only records; derive counts and permission status through pure helper functions so contract tests can verify the business rules. Add one focused Node contract test file and preserve all unrelated portal modules byte-for-byte unless `platform.html` must reference their existing data.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, Node.js built-in test runner (`node --test`), GitHub Pages.

## Global Constraints

- Modify only merchant-management navigation, merchant/store/staff pages, their demo data, translations, interactions, and tests in `platform.html`.
- Do not modify `store.html` or `recycler.html`.
- Do not change default revenue share, Max, auction, order, or finance workflows.
- The three pages are independent sidebar routes, not tabs.
- FoneSquare merchant rows have no stores or staff; their store/staff counts render as `—` and are not clickable.
- The backend add action creates only FoneSquare merchant records and never creates a store-app merchant.
- Store records have no listing-permission field, filter, switch, validation, or copy.
- Merchant listing permission may be enabled only when the store-app merchant has at least one active store and a valid merchant revenue-share rule.
- Enabling merchant listing permission must not create a store or change any staff personal-permission configuration.
- Staff personal listing permission is configured per staff account; effective state is `已生效` only when both merchant and personal permissions are enabled.
- Merchant primary accounts never enter the staff list.
- All new or changed user-visible copy must have Simplified Chinese and English translations.

## File Structure

- Modify: `platform.html` — sidebar routes, three page shells, merchant/store/staff demo data, render/filter/detail/action functions, translations, and event binding.
- Create: `tests/platform-merchant-management.test.mjs` — focused contract tests for page structure, conditional merchant fields, store-permission removal, staff permission matrix, add validation, translations, script compilation, and frozen-file protection.
- Modify: `docs/superpowers/specs/2026-08-31-merchant-store-staff-management-design.md` only if implementation exposes a contradiction; any such change requires a separate documentation commit before code continues.

---

### Task 1: Create Three Independent Page Routes

**Files:**
- Modify: `platform.html:49-140`
- Create: `tests/platform-merchant-management.test.mjs`

**Interfaces:**
- Consumes: existing `setView(view)` and `[data-nav]` event delegation.
- Produces: route names `list`, `store`, and `staff`; page IDs `listPage`, `storePage`, `staffPage`; staff containers `staffFilters`, `staffSummary`, and `staffResultArea`.

- [ ] **Step 1: Write the failing navigation contract test**

Create `tests/platform-merchant-management.test.mjs` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const platform = readFileSync(new URL('../platform.html', import.meta.url), 'utf8');
const store = readFileSync(new URL('../store.html', import.meta.url), 'utf8');
const recycler = readFileSync(new URL('../recycler.html', import.meta.url), 'utf8');

test('merchant management exposes three independent page routes', () => {
  for (const required of [
    'data-nav="list"', 'data-nav="store"', 'data-nav="staff"',
    'id="listPage"', 'id="storePage"', 'id="staffPage"',
    '>商家列表<', '>店铺列表<', '>店员列表<'
  ]) assert.match(platform, new RegExp(required));

  for (const obsolete of [
    'data-nav="storeMerchant"', 'id="storeMerchantPage"',
    'id="storeMerchantDetailPage"', '>门店用户<'
  ]) assert.doesNotMatch(platform, new RegExp(obsolete));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test tests/platform-merchant-management.test.mjs
```

Expected: FAIL because `data-nav="staff"` and `staffPage` are absent and the obsolete store-merchant route is present.

- [ ] **Step 3: Replace the mixed route with the staff route and shell**

In `platform.html`, make the merchant-management navigation exactly:

```html
<div class="nav-group">商家管理</div>
<div class="nav-item active" data-nav="list">▤ <span>商家列表</span></div>
<div class="nav-item" data-nav="store">⌂ <span>店铺列表</span></div>
<div class="nav-item" data-nav="staff">♙ <span>店员列表</span></div>
```

Keep “默认分账规则” under its existing management group. Delete `storeMerchantPage` and `storeMerchantDetailPage`. Add a staff page shell with these stable IDs:

```html
<section class="page" id="staffPage">
  <div class="page-title"><h1>店员列表</h1><div class="page-actions"><button class="btn" id="exportStaffBtn">⇩ 导出</button></div></div>
  <div class="card"><div class="card-body"><div class="filters" id="staffFilters">
    <div class="field"><label>成员 ID / 姓名 / 手机号 / 邮箱</label><input class="control" id="staffKeyword" /></div>
    <div class="field"><label>所属商家</label><input class="control" id="staffMerchantFilter" /></div>
    <div class="field"><label>关联状态</label><select class="control" id="staffRelationFilter"><option value="">全部</option><option>待关联</option><option>已关联</option><option>已解除</option></select></div>
    <div class="field"><label>账号状态</label><select class="control" id="staffAccountFilter"><option value="">全部</option><option>正常</option><option>停用</option></select></div>
    <div class="field"><label>个人建拍权限</label><select class="control" id="staffPersonalBuildFilter"><option value="">全部</option><option>开启</option><option>关闭</option></select></div>
    <div class="field"><label>实际权限状态</label><select class="control" id="staffEffectiveBuildFilter"><option value="">全部</option><option>已生效</option><option>已关闭</option><option>未生效（商家权限关闭）</option></select></div>
    <div class="filter-actions"><button class="btn" id="resetStaffBtn">↻ 重置</button><button class="btn primary" id="searchStaffBtn">⌕ 查询</button></div>
  </div></div></div>
  <div class="card"><div class="card-head"><div>店员列表 <span class="subtle" id="staffSummary"></span></div></div><div id="staffResultArea"></div></div>
</section>
```

Update `setView(view)` page and breadcrumb maps so `staff` activates `staffPage`, group `商家管理`, current page `店员列表`.

- [ ] **Step 4: Run the navigation test**

Run:

```bash
node --test tests/platform-merchant-management.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the page routes**

```bash
git add platform.html tests/platform-merchant-management.test.mjs
git commit -m "feat: split merchant store and staff routes"
```

---

### Task 2: Render App-Scoped Merchant Records

**Files:**
- Modify: `platform.html:77-90,241-250,416,568-609,650-693,806-825,1402-1417`
- Modify: `tests/platform-merchant-management.test.mjs`

**Interfaces:**
- Consumes: `users`, `stores`, `employeeAccounts`, `merchantById()`, `merchantStores()`.
- Produces:
  - `merchantRecords(): Array<User>`
  - `merchantSource(user): 'FoneSquare' | '门店端'`
  - `merchantStoreCount(user): number | null`
  - `merchantStaffCount(user): number | null`
  - App-scoped merchant row identity based on `merchantId`; `id` remains the reusable unified-account identity.
  - existing `renderList()`, `applyFilters()`, and `resetFilters()` operating on all merchant records.

- [ ] **Step 1: Add failing merchant-list tests**

Append:

```js
test('merchant list combines App-scoped merchants and conditionally exposes counts', () => {
  for (const required of [
    'function merchantRecords()', 'function merchantSource(',
    'function merchantStoreCount(', 'function merchantStaffCount(',
    '来源 App', 'FoneSquare', '门店端', 'data-merchant-stores', 'data-merchant-staff'
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));

  assert.match(platform, /function merchantStoreCount\(u\)\{return merchantSource\(u\)==='门店端'\?merchantStores\(u\)\.length:null\}/);
  assert.match(platform, /function merchantStaffCount\(u\)\{return merchantSource\(u\)==='门店端'\?employeesForMerchant\(u\.merchantId\)\.length:null\}/);
  assert.match(platform, /storeCount===null\?'—'/);
  assert.match(platform, /staffCount===null\?'—'/);
  assert.doesNotMatch(platform, /本页仅展示 FoneSquare 回收商/);
});

test('merchant rows use merchant record identity rather than reusable account identity', () => {
  assert.match(platform, /data-view="\$\{u\.merchantId\}"/);
  assert.match(platform, /merchantById\(view\.dataset\.view\)/);
  assert.doesNotMatch(platform, /data-view="\$\{u\.id\}"/);
});

test('merchant permission enable has prerequisites and no implicit child mutation', () => {
  assert.match(platform, /至少一个有效店铺/);
  assert.match(platform, /分账规则/);
  assert.doesNotMatch(platform, /own\.forEach\(s=>s\.build='开启'\)/);
  assert.doesNotMatch(platform, /employeesForMerchant\([^)]*\)\.forEach\(e=>e\.(businessAccess|personalBuild)='开启'\)/);
  assert.doesNotMatch(platform, /首次开启且暂无店铺时创建默认/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

```bash
node --test tests/platform-merchant-management.test.mjs
```

Expected: FAIL because merchant helpers and source/count columns do not exist, and implicit store/staff permission mutations remain.

- [ ] **Step 3: Add merchant data helpers and combined filtering**

Implement these helpers near `merchantById()`:

```js
function merchantRecords(){return users.filter(u=>u.type==='FoneSquare 回收商'||u.type==='供货商家')}
function merchantSource(u){return u.type==='FoneSquare 回收商'?'FoneSquare':'门店端'}
function merchantStoreCount(u){return merchantSource(u)==='门店端'?merchantStores(u).length:null}
function merchantStaffCount(u){return merchantSource(u)==='门店端'?employeesForMerchant(u.merchantId).length:null}
```

Initialize `filtered` with `merchantRecords()`. Add a source filter with ID `sourceAppFilter`. Update `applyFilters()` to use keyword, source App, account status, and source-specific business-state filters without requiring KYC fields on store-app merchants.

- [ ] **Step 4: Replace the merchant table with source-aware columns**

Keep `renderList()` as the public renderer but render these columns:

```js
const source=merchantSource(u),storeCount=merchantStoreCount(u),staffCount=merchantStaffCount(u);
const storeCell=storeCount===null?'—':`<button class="btn link" data-merchant-stores="${u.merchantId}">${storeCount}</button>`;
const staffCell=staffCount===null?'—':`<button class="btn link" data-merchant-staff="${u.merchantId}">${staffCount}</button>`;
```

Use source-specific business cells:

```js
const business=source==='FoneSquare'
  ? `${statusTag(u.kyc)} ${statusTag(u.bid)}`
  : `${statusTag(u.build)} ${statusTag(u.ratioStatus)}`;
```

Headers must include `商家 ID / 名称`, `统一账号`, `来源 App`, `账号状态`, `业务状态 / 权限`, `店铺数`, `店员数`, `业务开通时间`, `操作`.

Render each row action as `data-view="${u.merchantId}"` and resolve it with `merchantById(view.dataset.view)`. Never use `u.id` as a row or detail key: two App-scoped merchant records may deliberately share the same unified-account `id`.

- [ ] **Step 5: Correct merchant-permission enable behavior**

In `confirmPermission()`, when `key==='build'` and the next state is enabled:

```js
const activeStores=merchantStores(u).filter(s=>s.status==='营业中');
if(!activeStores.length){closeModals();toast('请先维护至少一个有效店铺');return}
if(u.ratioStatus!=='完整'){closeModals();toast('请先配置有效的商家分账规则');return}
```

Delete default-store creation, `s.build='开启'`, and employee auto-enable mutations. Changing merchant permission updates only `u.build`, then refreshes merchant and staff effective-state displays.

- [ ] **Step 6: Wire merchant count drill-downs**

Handle `data-merchant-stores` by setting `storeMerchantFilter` to the merchant ID, applying store filters, and opening `store`. Handle `data-merchant-staff` the same way with `staffMerchantFilter`, `applyStaffFilters()`, and `staff` after Task 4 defines those functions.

Until Task 4 lands, guard the staff call:

```js
if(typeof applyStaffFilters==='function'){applyStaffFilters();setView('staff')}
```

- [ ] **Step 7: Run the tests and compile check**

```bash
node --test tests/platform-merchant-management.test.mjs tests/three-portal-prd-alignment.test.mjs
```

Expected: all tests PASS and the inline script compiles.

- [ ] **Step 8: Commit merchant-list behavior**

```bash
git add platform.html tests/platform-merchant-management.test.mjs
git commit -m "feat: combine App scoped merchant records"
```

---

### Task 3: Remove Store-Level Listing Permission

**Files:**
- Modify: `platform.html:125-148,251-257,695-716,806-825`
- Modify: `tests/platform-merchant-management.test.mjs`

**Interfaces:**
- Consumes: `stores`, `maxDevices`, `merchantById()`, `devicesForStore()`.
- Produces: `renderStoreList()`, `applyStoreFilters()`, and `openStoreDetail()` with no dependency on `store.build`.

- [ ] **Step 1: Add the failing store contract**

Append:

```js
test('store management contains no store-level listing permission', () => {
  for (const obsolete of [
    '店铺建拍权限', 'storeBuildFilter', 'storeBuildSwitch',
    'data-store-build', '建拍权限开启'
  ]) assert.doesNotMatch(platform, new RegExp(obsolete));

  for (const required of [
    '银行卡尾号', '联系电话', 'Max 设备数', '启用设备数',
    '店铺编号 / 名称', '所属供货商家'
  ]) assert.match(platform, new RegExp(required));
});
```

- [ ] **Step 2: Run the test and verify failure**

```bash
node --test tests/platform-merchant-management.test.mjs
```

Expected: FAIL on existing store build filter, switch, metric, column, detail field, and copy.

- [ ] **Step 3: Remove store permission from page, data, and events**

Delete:

- `storeBuildFilter` from the store filters.
- `storeBuildSwitch()`.
- the store build metric and table column.
- `store.build` display and update logic.
- `data-store-build` event matching and handling.
- all “store permission controls new lots” copy.

Do not remove merchant-level `u.build` or staff personal permission.

- [ ] **Step 4: Add required store fields and conditional device counts**

Ensure each demo store has:

```js
{phone:'+60 3****8800',bankTail:'8821',country:'马来西亚',city:'Kuala Lumpur'}
```

Render address/contact as a summary and bank data only as `**** ${s.bankTail}`. Render both device totals:

```js
const devices=devicesForStore(s.id),enabledDevices=devices.filter(d=>d.status==='启用').length;
```

List and detail must never expose a full card number.

- [ ] **Step 5: Simplify store filters**

Implement:

```js
function applyStoreFilters(){
  const kw=$('#storeKeyword').value.trim().toLowerCase();
  const merchant=$('#storeMerchantFilter').value.trim().toLowerCase();
  const status=$('#storeStatusFilter').value;
  filteredStores=stores.filter(s=>(!kw||`${s.name}${s.id}`.toLowerCase().includes(kw))&&(!merchant||`${merchantById(s.merchantId)?.name||''}${s.merchantId}`.toLowerCase().includes(merchant))&&(!status||s.status===status));
  renderStoreList();
}
```

- [ ] **Step 6: Run focused and existing tests**

```bash
node --test tests/platform-merchant-management.test.mjs tests/three-portal-prd-alignment.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit store cleanup**

```bash
git add platform.html tests/platform-merchant-management.test.mjs
git commit -m "feat: align store list with business object model"
```

---

### Task 4: Build the Staff List and Permission Matrix

**Files:**
- Modify: `platform.html:259-271,416,568-646,650-669,806-825,1402-1417`
- Modify: `tests/platform-merchant-management.test.mjs`

**Interfaces:**
- Consumes: `employeeAccounts`, `merchantById()`, `statusTag()`, `openBusinessModal()`, `toast()`.
- Produces:
  - `staffAccounts(): Array<StaffAccount>`
  - `staffRelationStatus(staff): '待关联' | '已关联' | '已解除'`
  - `memberBuildState(staff): {configured: '开启' | '关闭', effective: '已生效' | '已关闭' | '未生效（商家权限关闭）'}`
  - `renderStaffList()`, `applyStaffFilters()`, `resetStaffFilters()`, `openStaffDetail(id)`, `handleStaffAction(action,id)`.

- [ ] **Step 1: Add failing staff and permission tests**

Append:

```js
test('staff list excludes merchant primary accounts and exposes relation history', () => {
  for (const required of [
    'function staffAccounts()', 'function staffRelationStatus(',
    'function renderStaffList()', 'function openStaffDetail(',
    '当前所属商家', '关联状态', '历史所属商家', '已解除'
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));
  assert.doesNotMatch(platform, /employeeAccounts\.unshift/);
  assert.doesNotMatch(platform, /isMerchantMain:true/);
});

test('staff listing permission keeps configuration separate from effective state', () => {
  for (const required of [
    'function memberBuildState(', 'personalBuild', '个人配置', '实际状态',
    '已生效', '已关闭', '未生效（商家权限关闭）'
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));
  assert.match(platform, /merchant\.build==='开启'/);
  assert.match(platform, /staff\.personalBuild==='开启'/);
});
```

- [ ] **Step 2: Run the test and verify failure**

```bash
node --test tests/platform-merchant-management.test.mjs
```

Expected: FAIL because staff helpers/page rendering do not exist and primary accounts are injected into `employeeAccounts`.

- [ ] **Step 3: Normalize staff-only demo data**

Delete `employeeAccounts.unshift(...)`. Rename `businessAccess` to `personalBuild` on every staff record and add explicit relationship data:

```js
{
  id:'E3001', name:'Aina Rahman', account:'aina***@armobile.my',
  rawAccount:'aina.rahman@armobile.my', appStatus:'正常',
  merchantId:'M1002', relationStatus:'已关联', personalBuild:'开启',
  registeredAt:'2026-08-10 08:45', linkedAt:'2026-08-12 09:30',
  unlinkedAt:'—', relationHistory:[]
}
```

Include at least one `待关联`, one `已解除`, one personally disabled, and one personally enabled staff member whose merchant permission is disabled.

- [ ] **Step 4: Implement pure relationship and permission helpers**

```js
function staffAccounts(){return employeeAccounts}
function staffRelationStatus(staff){return staff.relationStatus||(staff.merchantId?'已关联':'待关联')}
function memberBuildState(staff){
  const configured=staff.personalBuild==='开启'?'开启':'关闭';
  if(configured==='关闭')return {configured,effective:'已关闭'};
  const merchant=merchantById(staff.merchantId);
  return {configured,effective:merchant?.build==='开启'?'已生效':'未生效（商家权限关闭）'};
}
```

Do not include account status in `memberBuildState`; show disabled-account state separately in the account-status column.

- [ ] **Step 5: Implement staff filtering and table rendering**

`applyStaffFilters()` must combine keyword, merchant, relation, account, personal, and effective filters. `renderStaffList()` must render:

```js
const merchant=staffRelationStatus(e)==='已关联'?merchantById(e.merchantId):null;
const permission=memberBuildState(e);
```

Columns: member ID/name, unified account, current merchant, relation state, account state, personal configuration, effective state, relation/unlink time, operations. Only an `已关联` row renders a clickable merchant; pending/released rows render `—`.

- [ ] **Step 6: Refactor staff detail and actions**

Rename mixed-page functions to the produced staff interfaces. Keep bind, transfer, unbind, and personal-permission actions, with these state transitions:

```js
// bind
e.relationHistory.push({merchantId:e.merchantId,status:e.relationStatus,endedAt:e.unlinkedAt});
e.merchantId=targetMerchantId;e.relationStatus='已关联';e.linkedAt=now;e.unlinkedAt='—';

// unbind
e.relationHistory.push({merchantId:e.merchantId,status:'已解除',endedAt:now});
e.merchantId=null;e.relationStatus='已解除';e.unlinkedAt=now;

// personal permission toggle
e.personalBuild=e.personalBuild==='开启'?'关闭':'开启';
```

Unbinding must not force `personalBuild` to `关闭`; it remains configured but effective state becomes “未生效（商家权限关闭）” because no active merchant exists.

- [ ] **Step 7: Wire staff route, filters, export, and merchant drill-down**

Bind:

```js
$('#searchStaffBtn').onclick=applyStaffFilters;
$('#resetStaffBtn').onclick=resetStaffFilters;
$('#exportStaffBtn').onclick=()=>toast('已按当前筛选条件提交店员导出任务（原型演示）');
```

Update `[data-nav]`, `[data-staff-view]`, and `[data-staff-action]` event delegation. Remove old store-user selectors and functions from `window.prototypeState`; expose the new staff helpers and actions.

- [ ] **Step 8: Run focused tests**

```bash
node --test tests/platform-merchant-management.test.mjs tests/three-portal-prd-alignment.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit staff management**

```bash
git add platform.html tests/platform-merchant-management.test.mjs
git commit -m "feat: add independent staff permission management"
```

---

### Task 5: Complete FoneSquare Add Validation and Bilingual Copy

**Files:**
- Modify: `platform.html:183-213,420-476,590-609,1406-1417`
- Modify: `tests/platform-merchant-management.test.mjs`

**Interfaces:**
- Consumes: `users`, add-form controls, translation dictionary, `merchantRecords()`.
- Produces:
  - `normalizedAccount(value): string`
  - `accountKeys(user): string[]`
  - `findUnifiedAccount(phone,email): {account: User | null, conflict: boolean}`
  - `saveFoneSquareMerchant(): void`
  - bilingual copy for all new routes, fields, states, errors, and success messages.

- [ ] **Step 1: Add failing add-flow, translation, and frozen-file tests**

Append:

```js
test('backend add creates only FoneSquare merchants and blocks account conflicts', () => {
  for (const required of [
    'function normalizedAccount(', 'function accountKeys(', 'function findUnifiedAccount(',
    'function saveFoneSquareMerchant(', '账号标识冲突',
    '已有有效的 FoneSquare 商家记录', "type:'FoneSquare 回收商'"
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));
  assert.doesNotMatch(platform, /type:'供货商家'[\s\S]{0,160}(saveAdd|saveFoneSquareMerchant)/);
  assert.match(platform, /id:unifiedUserId/);
  assert.match(platform, /merchantId:`M\$\{recordNumber\}`/);
});

test('new merchant management copy is bilingual', () => {
  for (const required of [
    'Staff List', 'Source App', 'Personal Listing Permission',
    'Effective Permission Status', 'Effective', 'Disabled',
    'Inactive (Merchant Permission Disabled)', 'Linked', 'Pending Link', 'Unlinked'
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));
});

test('platform inline script compiles after merchant-management refactor', () => {
  const script=platform.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(()=>new Function(script));
});

test('scope-frozen portal files retain their required entry points', () => {
  assert.match(store, /data-page="login"/);
  assert.match(recycler, /FoneSquare/);
});
```

- [ ] **Step 2: Run the tests and verify failure**

```bash
node --test tests/platform-merchant-management.test.mjs
```

Expected: FAIL because validation helpers and new English copy do not exist.

- [ ] **Step 3: Add account normalization and conflict detection**

Give the existing registration-region select the stable ID `addRegistrationRegion`. Add a required merchant-profile select with ID `addMerchantProfile` (`个人` / `企业`) and stable KYC IDs `addDocumentType`, `addDocumentNumber`, and `addDocumentExpiry`.

Implement:

```js
function normalizedAccount(value){return String(value||'').replace(/[\s()-]/g,'').toLowerCase()}
function accountKeys(user){return [user.rawAccount,user.rawPhone,user.rawEmail].filter(Boolean).map(normalizedAccount)}
function findUnifiedAccount(phone,email){
  const phoneKey=normalizedAccount(phone),emailKey=normalizedAccount(email);
  const byPhone=phoneKey?users.find(u=>accountKeys(u).includes(phoneKey)):null;
  const byEmail=emailKey?users.find(u=>accountKeys(u).includes(emailKey)):null;
  return {account:byPhone||byEmail||null,conflict:Boolean(byPhone&&byEmail&&byPhone.id!==byEmail.id)};
}
```

Store both provided identifiers on newly created records as `rawPhone` and `rawEmail`, while retaining the existing `rawAccount` display/login fallback. This makes later phone-only and email-only lookups resolve to the same unified account.

- [ ] **Step 4: Replace the inline add handler with `saveFoneSquareMerchant()`**

The function must:

1. Validate name, one account identifier, registration region, merchant profile, and KYC inputs.
2. Block `lookup.conflict` with `账号标识冲突，请联系平台处理`.
3. Derive `unifiedUserId=lookup.account?.id||String(nextUnifiedAccountNumber)`; reuse only that unified-account identity when a match exists.
4. Block when `merchantRecords()` already contains an active FoneSquare record with `m.id===unifiedUserId`.
5. Create a new App-scoped record with a unique `merchantId`, `id:unifiedUserId`, and only `type:'FoneSquare 回收商'`.
6. Set store/staff relationships to none by omission; never create a store-app merchant or store.
7. Refresh `filtered=merchantRecords()`, render, return to list, and toast success.

Bind `#saveAdd` to `saveFoneSquareMerchant`.

- [ ] **Step 5: Complete Chinese/English translations**

Add dictionary entries for every new route, field, state, error, empty state, and action. At minimum map:

```js
'店员列表':'Staff List',
'来源 App':'Source App',
'个人建拍权限':'Personal Listing Permission',
'实际权限状态':'Effective Permission Status',
'已生效':'Effective',
'已关闭':'Disabled',
'未生效（商家权限关闭）':'Inactive (Merchant Permission Disabled)',
'已关联':'Linked',
'待关联':'Pending Link',
'已解除':'Unlinked'
```

- [ ] **Step 6: Run the complete local test suite**

```bash
node --test tests/*.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 7: Commit add validation and translations**

```bash
git add platform.html tests/platform-merchant-management.test.mjs
git commit -m "feat: validate FoneSquare merchant creation"
```

---

### Task 6: Perform Interaction QA, Regression QA, and Publish

**Files:**
- Modify: `platform.html` only for defects found by the checks below.
- Modify: `tests/platform-merchant-management.test.mjs` only when a reproduced defect needs a regression assertion.

**Interfaces:**
- Consumes: all interfaces produced by Tasks 1-5.
- Produces: a passing repository, pushed `main`, and deployed GitHub Pages content matching the tested commit.

- [ ] **Step 1: Run all automated tests and whitespace checks**

```bash
node --test tests/*.test.mjs
git diff --check
```

Expected: all tests PASS and `git diff --check` has no output.

- [ ] **Step 2: Prove frozen files were not changed**

```bash
git diff --exit-code a390b35 -- store.html recycler.html
```

Expected: exit code 0 with no diff.

- [ ] **Step 3: Start a local server for interaction QA**

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/platform.html` and verify:

1. Each of the three sidebar routes opens the correct independent page.
2. Source App filtering shows both merchant types; FoneSquare count cells are `—`.
3. Store and staff count links apply the correct merchant filter.
4. Store list/detail contain no store listing permission.
5. Staff personal permission covers all four matrix combinations and updates immediately.
6. Merchant permission disabled + personal enabled displays the warning state.
7. Merchant permission cannot enable without active store and valid share rule.
8. Merchant permission changes neither create stores nor change personal staff configuration.
9. Add merchant blocks account conflict and duplicate FoneSquare records.
10. Chinese/English switching translates all changed UI.
11. Default share, Max, auction, order, and finance pages still open and retain their prior primary interactions.

- [ ] **Step 4: Add a regression test before fixing any discovered defect**

For each defect, first add one exact assertion to `tests/platform-merchant-management.test.mjs`, run it to see FAIL, then patch `platform.html` and rerun to PASS. Do not batch unrelated fixes.

- [ ] **Step 5: Commit QA fixes if needed**

```bash
git add platform.html tests/platform-merchant-management.test.mjs
git commit -m "fix: close merchant management QA gaps"
```

Skip this commit when Step 3 finds no defects.

- [ ] **Step 6: Push the tested commit**

Confirm the remote and branch, then push:

```bash
git remote -v
git status --short --branch
git push origin main
```

Expected: push succeeds and local `main` matches `origin/main`.

- [ ] **Step 7: Verify the deployed page contains the new contract**

```bash
curl -L --fail --retry 5 --retry-delay 3 \
  'https://jiaruizhen0213-netizen.github.io/fonesquare-prototypes/platform.html' \
  -o /tmp/fonesquare-platform-deployed.html
rg 'data-nav="staff"|店员列表|未生效（商家权限关闭）|function memberBuildState' /tmp/fonesquare-platform-deployed.html
rg 'data-nav="storeMerchant"|店铺建拍权限|本页仅展示 FoneSquare 回收商' /tmp/fonesquare-platform-deployed.html && exit 1 || true
```

Expected: every required token is present and no retired token is found.

- [ ] **Step 8: Verify local, remote, and deployed file parity**

```bash
git fetch origin main
git show origin/main:platform.html > /tmp/fonesquare-platform-origin.html
shasum -a 256 platform.html /tmp/fonesquare-platform-origin.html /tmp/fonesquare-platform-deployed.html
```

Expected: all three SHA-256 hashes are identical.

- [ ] **Step 9: Record the final verification result**

Report the final commit SHA, full automated-test command and result, frozen-file proof, interaction scenarios checked, deployed URL, and the three matching SHA-256 values.
