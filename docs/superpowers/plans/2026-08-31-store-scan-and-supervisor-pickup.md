# Store Scan and Supervisor Pickup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the supplier mobile prototype so employees start auction creation by scanning a device, foldable devices conditionally require two photos, and a separately authenticated OB supervisor can confirm pickups.

**Architecture:** Keep the existing single-file `store.html` prototype and add two isolated state domains inside it: employee inspection state and supervisor pickup state. Employee scanning selects a deterministic demo profile and hydrates the inspection page; supervisor pages use their own navigation, fixtures and state and never reuse the merchant/employee role switch.

**Tech Stack:** Static HTML, CSS and browser JavaScript; Node.js built-in test runner; Codex in-app browser; GitHub Pages.

## Global Constraints

- Modify only `store.html`, tests and design/plan documentation; do not change `platform.html` or `recycler.html`.
- Preserve the existing visual language and all previously confirmed publishing, price, seller-decision and re-auction behavior.
- Ordinary phones require no local device photo; foldables require both a screen-on and screen-off photo.
- The supervisor uses an independent OB identity and must never inherit merchant or employee identity or data scope.
- Supervisor pickup creates no pickup batch, batch number, handover code or scan flow.
- New pages, dialogs, statuses and dynamic messages must work in Simplified Chinese and English.
- Prototype pages show user actions and observable outcomes only, not backend implementation details.

---

### Task 1: Add failing scan-flow contracts

**Files:**
- Create: `tests/store-scan-supervisor.test.mjs`
- Test: `tests/store-scan-supervisor.test.mjs`

**Interfaces:**
- Consumes: `store.html` source.
- Produces: source contracts for `scanProfiles`, `applyScanProfile(profileKey)`, `foldablePhotoSection`, `screenOnPhoto`, `screenOffPhoto` and the removed model-selection/photo flow.

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const store = readFileSync(new URL('../store.html', import.meta.url), 'utf8');

test('employee create-lot flow starts with device scan', () => {
  for (const required of ['scanProfiles', 'applyScanProfile', 'scanStandardDevice', 'scanFoldableDevice']) {
    assert.match(store, new RegExp(required));
  }
  for (const removed of ['data-page="modelSelect"', '选择回收物品', 'modelSearch', 'brandList', 'openModelSelector']) {
    assert.doesNotMatch(store, new RegExp(removed));
  }
});

test('IMEI is scan-filled and photos are foldable-only', () => {
  for (const required of ['detectedImei', 'foldablePhotoSection', 'screenOnPhoto', 'screenOffPhoto', '亮屏照片', '暗屏照片']) {
    assert.match(store, new RegExp(required));
  }
  assert.doesNotMatch(store, /id="imeiInput"|关于本机照片|aboutDevicePhoto/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/store-scan-supervisor.test.mjs`

Expected: FAIL because the old model selector and About-device photo are still present and the new IDs do not exist.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/store-scan-supervisor.test.mjs
git commit -m "test: define employee scan-first flow"
```

### Task 2: Implement scan-first inspection and conditional foldable photos

**Files:**
- Modify: `store.html` employee home, scan, inspection and report pages
- Modify: `store.html` inline employee-flow script
- Test: `tests/store-scan-supervisor.test.mjs`

**Interfaces:**
- Consumes: `scanProfiles.standard` and `scanProfiles.foldable` demo fixtures.
- Produces: `applyScanProfile(profileKey: 'standard' | 'foldable'): void`, `setFoldablePhoto(kind: 'screenOn' | 'screenOff'): void`, and `isInspectionReady(): boolean`.

- [ ] **Step 1: Replace the home entry and scan page**

Use a direct `showPage('scan')` action for `homeCreateLot` and `createAnother`. Delete the model-selection page and all brand/category/model catalog handlers. The scan page must expose two explicit demo buttons:

```html
<button id="scanStandardDevice" type="button">模拟扫码 · 普通手机</button>
<button id="scanFoldableDevice" type="button">模拟扫码 · 折叠屏手机</button>
```

- [ ] **Step 2: Add deterministic scan profiles**

```js
const scanProfiles = Object.freeze({
  standard: { model: '苹果 iPhone 14 Pro', imei: '353276109842761', foldable: false },
  foldable: { model: '三星 Galaxy Z Fold6', imei: '352981106314782', foldable: true }
});

function applyScanProfile(profileKey) {
  const profile = scanProfiles[profileKey];
  lotDraft.scanProfile = profileKey;
  lotDraft.imei = profile.imei;
  lotDraft.foldable = profile.foldable;
  lotDraft.foldablePhotos = { screenOn: false, screenOff: false };
  document.getElementById('currentInspectionModel').textContent = profile.model;
  document.getElementById('detectedImei').textContent = profile.imei;
  document.getElementById('foldablePhotoSection').hidden = !profile.foldable;
  importMaxResults();
}
```

- [ ] **Step 3: Replace IMEI and photo UI**

Replace the editable IMEI field with a read-only summary using `id="detectedImei"`. Delete the entire About-device photo section. Add a hidden foldable-only section containing `screenOnPhoto` and `screenOffPhoto`, with visible uploaded/not-uploaded states and remove actions.

- [ ] **Step 4: Update inspection validation**

```js
function isInspectionReady() {
  const itemsReady = [...document.querySelectorAll('[data-inspection-item][data-required="true"]')]
    .every((row) => row.dataset.complete === 'true');
  const photosReady = !lotDraft.foldable ||
    (lotDraft.foldablePhotos.screenOn && lotDraft.foldablePhotos.screenOff);
  return Boolean(lotDraft.imei) && lotDraft.scanImported && itemsReady && photosReady;
}
```

Call it from the inspection progress renderer and each photo/manual-answer handler. For a foldable, the progress text must name the missing screen-on or screen-off photo.

- [ ] **Step 5: Run the focused test**

Run: `node --test tests/store-scan-supervisor.test.mjs`

Expected: employee scan tests PASS.

- [ ] **Step 6: Commit the employee flow**

```bash
git add store.html tests/store-scan-supervisor.test.mjs
git commit -m "feat: start employee auction flow from device scan"
```

### Task 3: Add failing supervisor pickup contracts

**Files:**
- Modify: `tests/store-scan-supervisor.test.mjs`
- Test: `tests/store-scan-supervisor.test.mjs`

**Interfaces:**
- Consumes: `store.html` source.
- Produces: contracts for independent supervisor pages and pickup state functions.

- [ ] **Step 1: Add supervisor source tests**

```js
test('supervisor pickup is an isolated OB workspace', () => {
  for (const required of [
    'supervisorAppEntry', 'data-page="supervisorLogin"', 'data-page="supervisorPickup"',
    'OB 账号', '现场取货工作台', 'supervisorOrders', 'renderSupervisorOrders'
  ]) assert.match(store, new RegExp(required));
  assert.doesNotMatch(store, /<option value="supervisor"/);
});

test('supervisor supports single and constrained batch pickup without batch artifacts', () => {
  for (const required of ['confirmSupervisorPickup', '同一门店', '同一回收商', '状态不可撤销', '超过 72 小时']) {
    assert.match(store, new RegExp(required));
  }
  for (const forbidden of ['创建已取货批次', '取货批次号', '交接码', '扫码取货']) {
    assert.doesNotMatch(store, new RegExp(forbidden));
  }
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/store-scan-supervisor.test.mjs`

Expected: FAIL because the supervisor workspace and functions do not exist.

- [ ] **Step 3: Commit the failing supervisor tests**

```bash
git add tests/store-scan-supervisor.test.mjs
git commit -m "test: define supervisor pickup workspace"
```

### Task 4: Implement the isolated supervisor App

**Files:**
- Modify: `store.html` styles, supervisor pages, dialogs and inline script
- Test: `tests/store-scan-supervisor.test.mjs`

**Interfaces:**
- Consumes: independent `supervisorOrders` fixtures with `id`, `lotId`, `product`, `sku`, `region`, `store`, `recycler`, `operator`, `soldAt`, `over72h` and `pickupStatus`.
- Produces: `showSupervisorPage(pageName)`, `renderSupervisorOrders()`, `toggleSupervisorSelection(orderId)`, `openSupervisorOrder(orderId)` and `confirmSupervisorPickup(orderIds)`.

- [ ] **Step 1: Add a separate supervisor entry and login page**

Add `supervisorAppEntry` under the employee/merchant “My” page or home demo tools. It opens `supervisorLogin`; do not add a supervisor option to `roleSwitch`. The login page labels the identity as “督导 App · OB 账号” and offers a demo OB login button.

- [ ] **Step 2: Add supervisor fixtures and state**

```js
const supervisorOrders = [
  { id:'FSO-260821-0098', lotId:'FS-MY-260821-0192', product:'iPhone 15 Pro 256GB', sku:'IPH15P-256-NB', region:'Klang Valley', store:'中心旗舰店', recycler:'Eco Mobile MY', operator:'贾瑞真', soldAt:'2026-08-21 09:20', over72h:true, pickupStatus:'pending' },
  { id:'FSO-260827-0101', lotId:'FS-MY-260827-0204', product:'Galaxy S25 Ultra 256GB', sku:'S25U-256-TB', region:'Klang Valley', store:'中心旗舰店', recycler:'Eco Mobile MY', operator:'贾瑞真', soldAt:'2026-08-27 14:10', over72h:false, pickupStatus:'pending' },
  { id:'FSO-260827-0106', lotId:'FS-MY-260827-0209', product:'Huawei Mate 70 Pro 512GB', sku:'M70P-512-GD', region:'Selangor North', store:'北区门店', recycler:'Circular Tech', operator:'Aina', soldAt:'2026-08-27 16:05', over72h:false, pickupStatus:'pending' }
];
const supervisorState = { selectedIds: new Set(), activeOrderId: null, statusFilter: 'pending' };
```

- [ ] **Step 3: Render the pickup workbench and detail**

Implement statistics, filters, pending/picked tabs, order cards and a detail page. Keep amount, commission, refund, privacy and return fields absent. The first selected card defines the store and recycler constraint; render incompatible cards disabled with a user-facing explanation.

- [ ] **Step 4: Implement single and batch confirmation**

```js
function confirmSupervisorPickup(orderIds) {
  const orders = supervisorOrders.filter((order) => orderIds.includes(order.id));
  const eligible = orders.length > 0 && orders.every((order) =>
    order.pickupStatus === 'pending' &&
    order.store === orders[0].store &&
    order.recycler === orders[0].recycler
  );
  if (!eligible) return { ok: false, reason: '仅可同时确认同一门店、同一回收商的待取货订单。' };
  const pickedAt = '2026-08-31 10:30';
  orders.forEach((order) => Object.assign(order, { pickupStatus: 'picked', pickedAt, supervisor: 'OB-督导 李敏' }));
  return { ok: true, count: orders.length, pickedAt };
}
```

The confirmation dialog must list selected orders and state that pickup cannot be undone. On success, clear selection and show the picked-up result per order.

- [ ] **Step 5: Add supervisor account and permission-result states**

Add a “My Account” page showing the OB account and current region/store scope, plus prototype controls for no-role, no-range and disabled-account results. These controls show result pages only and do not expose configuration internals.

- [ ] **Step 6: Run the focused test**

Run: `node --test tests/store-scan-supervisor.test.mjs`

Expected: all focused tests PASS.

- [ ] **Step 7: Commit the supervisor flow**

```bash
git add store.html tests/store-scan-supervisor.test.mjs
git commit -m "feat: add OB supervisor pickup workspace"
```

### Task 5: Complete bilingual coverage and regression protection

**Files:**
- Modify: `store.html` `I18N_EN`, dynamic translation and language handlers
- Modify: `tests/store-scan-supervisor.test.mjs`
- Modify: `tests/three-portal-prd-alignment.test.mjs` only if an old pickup assertion conflicts with the confirmed supervisor App scope

**Interfaces:**
- Consumes: all new static and dynamic Chinese copy from Tasks 2 and 4.
- Produces: exact English equivalents and a full regression suite.

- [ ] **Step 1: Add bilingual tests**

```js
test('new employee and supervisor flows have English copy', () => {
  for (const required of [
    'Scan Device', 'Standard Phone', 'Foldable Phone', 'Screen-on Photo', 'Screen-off Photo',
    'Supervisor App', 'OB Account', 'On-site Pickup', 'Confirm Picked Up', 'Pickup cannot be undone'
  ]) assert.match(store, new RegExp(required));
});
```

- [ ] **Step 2: Add exact and dynamic translations**

Extend `I18N_EN` for every new page, button, filter, state and validation message. Extend `translateText()` for dynamic order counts, selected-count text, IMEI summaries and pickup success messages. Keep Chinese and English as two render modes of the same DOM/state.

- [ ] **Step 3: Remove obsolete residue**

Run:

```bash
rg -n "选择回收物品|请选择手机品牌和型号|关于本机照片|modelSelect|openModelSelector|创建已取货批次|取货批次号|交接码|扫码取货" store.html
```

Expected: no matches except a test assertion that explicitly bans the residue.

- [ ] **Step 4: Run all automated checks**

Run:

```bash
node --test tests/*.test.mjs
git diff --check
```

Expected: all tests PASS and `git diff --check` exits 0.

- [ ] **Step 5: Commit bilingual and regression coverage**

```bash
git add store.html tests/store-scan-supervisor.test.mjs tests/three-portal-prd-alignment.test.mjs
git commit -m "feat: localize scan and supervisor pickup flows"
```

### Task 6: Browser acceptance and GitHub Pages deployment

**Files:**
- Verify: `store.html`
- Verify: `tests/*.test.mjs`

**Interfaces:**
- Consumes: completed local prototype.
- Produces: deployed GitHub Pages version and evidence for each critical path.

- [ ] **Step 1: Run local in-app browser acceptance**

Verify these paths in Simplified Chinese and English:

1. Employee → create lot → standard scan → IMEI present → no photo section.
2. Employee → create lot → foldable scan → both photo fields required → upload both → continue.
3. Supervisor entry → OB demo login → pending pickup list → single confirm → irreversible picked state.
4. Supervisor batch select → incompatible store/recycler disabled → compatible two-order confirmation succeeds.
5. Existing price-unavailable publish, seller accept and seller reject/re-auction flows still work.

Read browser error logs after each portal state; expected error count is zero.

- [ ] **Step 2: Run the final automated suite**

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 3: Push the completed branch**

```bash
git push origin main
```

- [ ] **Step 4: Wait for Pages and verify the published file**

Use the Pages workflow status, then fetch `https://jiaruizhen0213-netizen.github.io/fonesquare-prototypes/store.html?v=<commit>` and confirm it contains `supervisorAppEntry`, `scanFoldableDevice`, `Screen-on Photo` and `确认已取货`.

- [ ] **Step 5: Verify the production page in the Codex in-app browser**

Repeat the standard scan, foldable photo and supervisor single-pickup smoke paths against the cache-busted production URL. Expected: all paths render correctly in both languages and browser error logs are empty.
