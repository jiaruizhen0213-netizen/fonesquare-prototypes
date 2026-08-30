# PMS Version Mapping Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the operations prototype's legacy MAX/SKU-to-domestic-SKU mapping and candidate governance with a PMS-sourced PPN/PPV version mapping workflow, while leaving `store.html` byte-for-byte unchanged.

**Architecture:** Keep the repository's current dependency-free, single-file static-page architecture. `platform.html` will own a small in-memory PMS version catalog, the mapping-rule state, rendering, filtering, modal population, and validation. A Node built-in test file will check the required markup/data contract, removal of the obsolete candidate workflow, and the frozen `store.html` checksum.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript; Node.js built-in `node:test`, `assert`, `fs`, and `crypto` modules.

## Global Constraints

- Modify `platform.html`; do not modify `store.html`.
- Remove the “候选固化治理” navigation, page, modal, data, functions, event handlers, translations, and exported state.
- PPN, source PPV, and target PPV must come from the simulated PMS catalog.
- Do not expose or persist a target `skuId`, MAX SKU version, or manually entered PPN/PPV.
- Rule uniqueness is `site + product/model + ppnId + sourcePpvId` for active rules.
- A rule change affects future lots only; history remains a frozen read-only view.
- Saving an active rule must validate PMS ownership, legal SKU compatibility, coefficient, fixed adjustment, and change reason.
- Keep Chinese and English switching functional for all newly visible copy.
- Preserve the original `store.html` SHA-256: `7658cbd26ea07a0a107904fdddc5631ce70f0d4ce4585b5e9bc5cfb901e59d1c`.

---

### Task 1: Add a regression contract for the approved scope

**Files:**
- Create: `tests/platform-pms-mapping.test.mjs`
- Read: `platform.html`
- Read: `store.html`

**Interfaces:**
- Consumes: The current static files and the approved design vocabulary.
- Produces: A repeatable `node --test` contract that later tasks must satisfy.

- [ ] **Step 1: Write the failing test**

Create `tests/platform-pms-mapping.test.mjs` with the exact contract below:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const platform = readFileSync(new URL('../platform.html', import.meta.url), 'utf8');
const store = readFileSync(new URL('../store.html', import.meta.url));

test('operations navigation exposes only the PMS mapping workflow', () => {
  assert.match(platform, /PMS 版本映射规则/);
  assert.doesNotMatch(platform, /候选固化治理/);
  assert.doesNotMatch(platform, /id="candidatePage"/);
  assert.doesNotMatch(platform, /id="candidateModal"/);
});

test('mapping form uses PMS PPN and PPV fields without target SKU configuration', () => {
  for (const id of ['ruleSite', 'ruleProduct', 'rulePpn', 'ruleSourcePpv', 'ruleTargetPpv', 'ruleCoefficient', 'ruleFixedAdjustment']) {
    assert.match(platform, new RegExp(`id="${id}"`));
  }
  for (const legacyId of ['ruleMaxSku', 'ruleMaxVersion', 'ruleAttribute', 'ruleTargetSku', 'ruleTargetVersion']) {
    assert.doesNotMatch(platform, new RegExp(`id="${legacyId}"`));
  }
});

test('mapping data and validation expose the approved PMS contract', () => {
  for (const token of ['pmsVersionCatalog', 'ppnId', 'sourcePpvId', 'targetPpvId', 'coefficient', 'fixedAdjustment', 'validateMappingDraft']) {
    assert.match(platform, new RegExp(token));
  }
  assert.match(platform, /PPN-REGION-001/);
  assert.match(platform, /PPV-MY-001/);
  assert.match(platform, /PPV-CN-001/);
});

test('obsolete candidate state and functions are removed', () => {
  for (const token of ['const candidates=', 'renderCandidates', 'applyCandidateFilters', 'openCandidate', 'confirmCandidate', 'candidateView', 'filteredCandidates']) {
    assert.doesNotMatch(platform, new RegExp(token));
  }
});

test('the inline platform script compiles', () => {
  const match = platform.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  assert.ok(match, 'inline script should exist');
  assert.doesNotThrow(() => new Function(match[1]));
});

test('store prototype remains byte-for-byte unchanged', () => {
  const digest = createHash('sha256').update(store).digest('hex');
  assert.equal(digest, '7658cbd26ea07a0a107904fdddc5631ce70f0d4ce4585b5e9bc5cfb901e59d1c');
});
```

- [ ] **Step 2: Run the test and verify the legacy implementation fails**

Run:

```bash
/Users/a159264/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/platform-pms-mapping.test.mjs
```

Expected: the first four tests fail because `platform.html` still contains the candidate workflow and old SKU fields; the syntax and checksum tests pass.

- [ ] **Step 3: Commit the failing contract**

```bash
git add tests/platform-pms-mapping.test.mjs
git commit -m "test: define PMS version mapping prototype contract"
```

---

### Task 2: Replace the navigation, page, modal, and in-memory data model

**Files:**
- Modify: `platform.html:55-57`
- Modify: `platform.html:160-184`
- Modify: `platform.html:233-238`
- Modify: `platform.html:289-300`

**Interfaces:**
- Consumes: The DOM IDs asserted by Task 1.
- Produces: `pmsVersionCatalog`, `mappingRules`, and DOM controls consumed by Task 3.

- [ ] **Step 1: Replace the product-mapping navigation and page markup**

Keep the `data-nav="mappingRule"` route, rename its label to `PMS 版本映射规则`, and delete the `data-nav="candidate"` item. Replace `mappingRulePage` with a page containing:

```html
<div class="page-title"><h1>PMS 版本映射转化规则</h1><div class="page-actions"><button class="btn primary" id="addMappingRuleBtn">＋ 新增映射规则</button></div></div>
<div class="alert"><span>ⓘ</span><div>版本 PPN、源版本 PPV和目标版本 PPV均从 PMS 获取；海外系统只选择具体值，不自建 PPN/PPV，也不直接配置目标 skuId。规则变更仅影响后续标单。</div></div>
```

Use filter controls with IDs `mappingSiteFilter`, `mappingProductFilter`, `mappingSourceFilter`, `mappingTargetFilter`, and `mappingStatusFilter`. Delete the complete `candidatePage` section.

- [ ] **Step 2: Replace the mapping modal and delete the candidate modal**

Replace the legacy fields with these stable IDs:

```html
<select class="control" id="ruleSite"><option>马来西亚</option><option>中国香港</option><option>新加坡</option></select>
<select class="control" id="ruleProduct"></select>
<select class="control" id="rulePpn"></select>
<select class="control" id="ruleSourcePpv"></select>
<select class="control" id="ruleTargetPpv"></select>
<input class="control" id="ruleCoefficient" type="number" min="0.0001" step="0.0001" value="1" />
<input class="control" id="ruleFixedAdjustment" type="number" step="0.01" value="0" />
```

Retain `ruleStatus`, `ruleReason`, `mappingRuleError`, and `saveMappingRule`. Delete `candidateModal` and `confirmCandidateBtn`.

- [ ] **Step 3: Replace legacy mapping and candidate data**

Define the PMS catalog with this shape:

```js
const pmsVersionCatalog = [
  {
    product: 'iPhone 15 / 256GB',
    ppnId: 'PPN-REGION-001',
    ppnName: '销售地区/版本',
    ppvs: [
      { id: 'PPV-OTHER-001', name: '海外其他版本', legal: true },
      { id: 'PPV-MY-001', name: '马来版本', legal: true },
      { id: 'PPV-CN-001', name: '国行版本', legal: true }
    ]
  }
];
```

Add equivalent iPhone 14 Pro and Galaxy S24 catalog rows for Hong Kong and Singapore demonstrations. Replace every rule object with flat fields:

```js
{
  id: 'MAP-0008',
  site: '马来西亚',
  product: 'iPhone 15 / 256GB',
  ppnId: 'PPN-REGION-001',
  ppnName: '销售地区/版本',
  sourcePpvId: 'PPV-MY-001',
  sourcePpvName: '马来版本',
  targetPpvId: 'PPV-CN-001',
  targetPpvName: '国行版本',
  coefficient: 1,
  fixedAdjustment: 0,
  pmsValidation: '校验通过',
  status: '生效',
  version: 'MAP-v3',
  operator: '贾瑞真',
  updatedAt: '2026-08-30 14:20'
}
```

Delete `candidates` and initialize only `filteredMappings` for this feature.

- [ ] **Step 4: Run the contract to confirm markup/data progress**

Run the Task 1 command. Expected: navigation, form, and data tests pass; the obsolete-function test may still fail until Task 3; the checksum test remains green.

- [ ] **Step 5: Commit the structural replacement**

```bash
git add platform.html
git commit -m "feat: replace SKU mapping UI with PMS PPN PPV rules"
```

---

### Task 3: Replace mapping rendering, filtering, modal population, and validation

**Files:**
- Modify: `platform.html:650-680`
- Modify: `platform.html:677-710`
- Modify: `platform.html:382-486`
- Modify: `platform.html:1297`

**Interfaces:**
- Consumes: `pmsVersionCatalog`, the flat `mappingRules` shape, and the modal IDs from Task 2.
- Produces: `renderMappingRules()`, `applyMappingFilters()`, `resetMappingFilters()`, `syncPmsRuleOptions(rule)`, `readMappingDraft()`, `validateMappingDraft(draft, currentRule)`, `openMappingRuleModal(rule)`, and `saveMappingRule()`.

- [ ] **Step 1: Render and filter the new rule shape**

Change `mappingKey(rule)` to return:

```js
`${rule.site} / ${rule.product} / ${rule.ppnId} / ${rule.sourcePpvId}`
```

Render table columns for rule/version, site/product, PPN, source PPV, target PPV, coefficient/fixed adjustment, PMS validation, status, update metadata, and actions. Display every PPN/PPV as `name` plus its stable PMS ID. Filter on site, product, source name/ID, target name/ID, and status.

- [ ] **Step 2: Add PMS catalog-driven modal helpers**

Implement these exact contracts:

```js
function setSelectOptions(select, options, selectedValue) {
  select.innerHTML = options.map(option => `<option value="${esc(option.value)}">${esc(option.label)}</option>`).join('');
  if (options.some(option => option.value === selectedValue)) select.value = selectedValue;
}

function pmsCatalogFor(product, ppnId) {
  return pmsVersionCatalog.find(item => item.product === product && (!ppnId || item.ppnId === ppnId));
}

function syncPmsRuleOptions(rule = null) {
  const products = [...new Set(pmsVersionCatalog.map(item => item.product))];
  const product = rule?.product || $('#ruleProduct').value || products[0];
  setSelectOptions($('#ruleProduct'), products.map(value => ({ value, label: value })), product);
  const catalog = pmsCatalogFor($('#ruleProduct').value, rule?.ppnId) || pmsCatalogFor($('#ruleProduct').value);
  setSelectOptions($('#rulePpn'), [{ value: catalog.ppnId, label: `${catalog.ppnName}（${catalog.ppnId}）` }], catalog.ppnId);
  const ppvOptions = catalog.ppvs.map(ppv => ({ value: ppv.id, label: `${ppv.name}（${ppv.id}）` }));
  const sourceDefault = catalog.ppvs.find(ppv => ppv.name === '马来版本')?.id || catalog.ppvs[0].id;
  const targetDefault = catalog.ppvs.find(ppv => ppv.name === '国行版本')?.id || catalog.ppvs[0].id;
  setSelectOptions($('#ruleSourcePpv'), ppvOptions, rule?.sourcePpvId || sourceDefault);
  setSelectOptions($('#ruleTargetPpv'), ppvOptions, rule?.targetPpvId || targetDefault);
}

function readMappingDraft() {
  const catalog = pmsCatalogFor($('#ruleProduct').value, $('#rulePpn').value);
  const source = catalog?.ppvs.find(ppv => ppv.id === $('#ruleSourcePpv').value);
  const target = catalog?.ppvs.find(ppv => ppv.id === $('#ruleTargetPpv').value);
  return {
    site: $('#ruleSite').value,
    product: $('#ruleProduct').value,
    ppnId: $('#rulePpn').value,
    ppnName: catalog?.ppnName || '',
    sourcePpvId: $('#ruleSourcePpv').value,
    sourcePpvName: source?.name || '',
    targetPpvId: $('#ruleTargetPpv').value,
    targetPpvName: target?.name || '',
    coefficient: Number($('#ruleCoefficient').value),
    fixedAdjustment: Number($('#ruleFixedAdjustment').value),
    pmsValidation: '校验通过',
    status: $('#ruleStatus').value,
    reason: $('#ruleReason').value.trim()
  };
}

function validateMappingDraft(draft, currentRule) {
  const catalog = pmsCatalogFor(draft.product, draft.ppnId);
  if (!catalog) return '未找到 PMS 返回的版本 PPN，请重新选择商品。';
  const source = catalog.ppvs.find(ppv => ppv.id === draft.sourcePpvId);
  const target = catalog.ppvs.find(ppv => ppv.id === draft.targetPpvId);
  if (!source || !target) return '源版本 PPV或目标版本 PPV不属于当前 PMS 版本 PPN。';
  if (!target.legal) return '目标版本 PPV无法与其他商品属性组成合法 SKU。';
  if (!Number.isFinite(draft.coefficient) || draft.coefficient <= 0) return '海外价格系数必须大于 0。';
  if (!Number.isFinite(draft.fixedAdjustment)) return 'MYR 固定调整值必须为有效数字。';
  if (!draft.reason) return '请填写变更原因。';
  const duplicated = draft.status === '生效' && mappingRules.some(rule => rule !== currentRule && rule.status === '生效' && rule.site === draft.site && rule.product === draft.product && rule.ppnId === draft.ppnId && rule.sourcePpvId === draft.sourcePpvId);
  if (duplicated) return '同一站点、商品、版本 PPN和源版本 PPV已有生效规则。';
  return '';
}
```

Bind `ruleProduct.onchange` to repopulate PPN/PPV values and `rulePpn.onchange` to repopulate PPVs.

- [ ] **Step 3: Implement validation and versioned saves**

`validateMappingDraft` must check, in order:

1. A matching PMS catalog row exists.
2. Source and target PPVs both exist in that row.
3. The target PPV has `legal === true`.
4. `coefficient` is finite and greater than `0`.
5. `fixedAdjustment` is finite.
6. The change reason is non-empty.
7. No other active rule has the same site, product, PPN ID, and source PPV ID.

On success, remove `reason` from the persisted object, save `pmsValidation: '校验通过'`, increment the existing `MAP-vN` version or create `MAP-v1`, then rerender and show a success toast. Use this save structure:

```js
function saveMappingRule() {
  const draft = readMappingDraft();
  const error = validateMappingDraft(draft, currentMapping);
  if (error) {
    $('#mappingRuleError').textContent = error;
    $('#mappingRuleError').classList.add('show');
    return;
  }
  const { reason, ...persisted } = draft;
  if (currentMapping) {
    const next = Number((currentMapping.version.match(/v(\d+)$/) || ['', '0'])[1]) + 1;
    Object.assign(currentMapping, persisted, { version: `MAP-v${next}`, operator: '贾瑞真', updatedAt: '2026-08-30 14:30' });
  } else {
    mappingRules.unshift({ id: `MAP-${String(9 + mappingRules.length).padStart(4, '0')}`, ...persisted, version: 'MAP-v1', operator: '贾瑞真', updatedAt: '2026-08-30 14:30' });
  }
  filteredMappings = [...mappingRules];
  closeModals();
  renderMappingRules();
  toast(currentMapping ? '映射规则已保存为新版本' : '映射规则已创建');
}
```

Do not add fallback behavior.

- [ ] **Step 4: Delete all candidate workflow code and stale exports**

Remove candidate rendering/filtering/modal functions, candidate click routing, candidate initialization, candidate translations, and `candidates`/`renderCandidates` from `window.prototypeState`. Keep unrelated auction, order, and finance behavior unchanged.

- [ ] **Step 5: Add English translations for newly visible copy**

Extend `I18N_EXACT` with translations for the new navigation label, page title, explanatory copy, fields, table headers, validation status, and validation errors. Remove candidate-only translations. Toggle Chinese → English → Chinese must preserve the selected route and rerendered rule list.

- [ ] **Step 6: Run tests and static residue scans**

Run:

```bash
/Users/a159264/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/platform-pms-mapping.test.mjs
rg -n 'candidatePage|candidateModal|const candidates=|renderCandidates|openCandidate|confirmCandidate|ruleMaxSku|ruleTargetSku' platform.html
```

Expected: all tests pass and `rg` returns no matches.

- [ ] **Step 7: Commit the completed interaction**

```bash
git add platform.html
git commit -m "feat: validate PMS version mapping rules"
```

---

### Task 4: Verify behavior and frozen scope

**Files:**
- Test: `platform.html`
- Test: `store.html`
- Test: `tests/platform-pms-mapping.test.mjs`

**Interfaces:**
- Consumes: The complete implementation from Tasks 1-3.
- Produces: Evidence that the static prototype works and `store.html` was not changed.

- [ ] **Step 1: Run the complete Node contract**

Run the Task 1 test command. Expected: 6 tests pass, 0 fail.

- [ ] **Step 2: Run HTML script syntax checks**

The `the inline platform script compiles` test extracts the script with `/<script>([\s\S]*)<\/script>\s*<\/body>/` and compiles it using `new Function(match[1])`. Expected: no `SyntaxError`.

- [ ] **Step 3: Serve the repository locally**

Run:

```bash
/Users/a159264/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/platform.html` and verify:

- PMS 版本映射规则 is the only product-mapping submenu.
- Filters and reset change the visible rule count correctly.
- New and edit modals cascade product → PPN → PPV.
- A duplicate active key shows the uniqueness error.
- A valid Malaysia mapping saves as a new version.
- Enable/disable and history actions remain available.
- English switching translates the newly visible UI and can switch back to Chinese.

- [ ] **Step 4: Verify the store checksum and repository diff**

Run:

```bash
shasum -a 256 store.html
git diff HEAD~2 -- store.html
git status --short
```

Expected: checksum is `7658cbd26ea07a0a107904fdddc5631ce70f0d4ce4585b5e9bc5cfb901e59d1c`, the store diff is empty, and only intended plan/test/platform changes exist.

- [ ] **Step 5: Commit any verification-only test refinement**

If the syntax compilation assertion was added during verification:

```bash
git add tests/platform-pms-mapping.test.mjs
git commit -m "test: verify prototype script syntax"
```

If no file changed, do not create an empty commit.
