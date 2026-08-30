# PMS Generic Attribute Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the operations prototype from version-specific, price-bearing PMS mapping rules into reusable product attribute PPN/PPV mapping rules with no pricing configuration.

**Architecture:** Keep the existing single-file static prototype and its `mappingRule` route, but generalize the catalog from one PPN record per product to one product containing multiple PPN records. The form uses a product → PPN → PPV cascade, while rules persist only PMS identifiers, display names, status, audit metadata, and reason-driven versions.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Git, GitHub Pages.

## Global Constraints

- Modify only the product-mapping module in `platform.html` and its contract test.
- Remove overseas price coefficient and MYR fixed adjustment fields, data, validation, table output, and mapping-specific translations.
- Use the visible terms `属性项 PPN`, `源属性值 PPV`, and `目标属性值 PPV`.
- A product must expose multiple PMS PPN choices; the selected PPN determines both PPV lists.
- Keep the active-rule uniqueness key as site + product + PPN + source PPV.
- Do not configure a target `skuId` and do not add fallback behavior.
- Do not change unrelated finance, settlement, auction-price, or revenue-share modules.
- Keep `store.html` byte-for-byte unchanged with SHA-256 `7658cbd26ea07a0a107904fdddc5631ce70f0d4ce4585b5e9bc5cfb901e59d1c`.

---

### Task 1: Replace the version-and-price contract with the generic attribute contract

**Files:**
- Modify: `tests/platform-pms-mapping.test.mjs`
- Test: `tests/platform-pms-mapping.test.mjs`

**Interfaces:**
- Consumes: The current `platform.html` and frozen `store.html`.
- Produces: A failing contract that requires generic PPN/PPV copy, multiple PPNs per product, and no mapping price configuration.

- [ ] **Step 1: Update the navigation and form contract**

Replace the first three tests with assertions equivalent to:

```js
test('operations navigation exposes the generic PMS attribute mapping workflow', () => {
  assert.match(platform, /PMS 属性映射规则/);
  assert.match(platform, /PMS 属性映射转化规则/);
  assert.doesNotMatch(platform, /PMS 版本映射规则/);
  assert.doesNotMatch(platform, /候选固化治理/);
});

test('mapping form uses generic PMS PPN and PPV fields without pricing or target SKU', () => {
  for (const id of ['ruleSite', 'ruleProduct', 'rulePpn', 'ruleSourcePpv', 'ruleTargetPpv', 'ruleStatus', 'ruleReason']) {
    assert.match(platform, new RegExp(`id="${id}"`));
  }
  for (const removedId of ['ruleCoefficient', 'ruleFixedAdjustment', 'ruleTargetSku']) {
    assert.doesNotMatch(platform, new RegExp(`id="${removedId}"`));
  }
  for (const copy of ['属性项 PPN', '源属性值 PPV', '目标属性值 PPV']) {
    assert.match(platform, new RegExp(copy));
  }
});

test('mapping catalog supports multiple PPNs per product and contains no price fields', () => {
  for (const token of ['pmsAttributeCatalog', 'attributes', 'ppnId', 'sourcePpvId', 'targetPpvId', 'validateMappingDraft']) {
    assert.match(platform, new RegExp(token));
  }
  assert.match(platform, /PPN-REGION-001/);
  assert.match(platform, /PPN-CHANNEL-001/);
  assert.match(platform, /香港零售/);
  assert.match(platform, /大陆国行/);
  assert.doesNotMatch(platform, /coefficient|fixedAdjustment/);
});
```

Keep the candidate-removal, inline-script compilation, and `store.html` checksum tests.

- [ ] **Step 2: Add a mapping-module price residue assertion**

Extract the mapping page and mapping modal before asserting price absence, so unrelated revenue-share and auction modules remain allowed:

```js
const mappingPage = platform.match(/<section class="page" id="mappingRulePage">([\s\S]*?)<section class="page" id="bidListPage">/)?.[1] ?? '';
const mappingModal = platform.match(/<div class="modal wide" id="mappingRuleModal">([\s\S]*?)<div class="modal xwide" id="businessModal">/)?.[1] ?? '';

test('mapping UI contains no price configuration', () => {
  assert.ok(mappingPage);
  assert.ok(mappingModal);
  assert.doesNotMatch(`${mappingPage}${mappingModal}`, /价格系数|固定调整|价格策略|MYR/);
});
```

- [ ] **Step 3: Run the contract and verify it fails for the intended reasons**

Run:

```bash
/Users/a159264/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/platform-pms-mapping.test.mjs
```

Expected: the generic naming, multiple-PPN catalog, and price-removal tests fail; script compilation and frozen-store tests pass.

- [ ] **Step 4: Commit the failing contract**

```bash
git add tests/platform-pms-mapping.test.mjs
git commit -m "test: define generic PMS attribute mapping contract"
```

---

### Task 2: Generalize the mapping page, form, and PMS catalog

**Files:**
- Modify: `platform.html:55-56`
- Modify: `platform.html:159-173`
- Modify: `platform.html:219-233`
- Modify: `platform.html:283-319`
- Test: `tests/platform-pms-mapping.test.mjs`

**Interfaces:**
- Consumes: DOM IDs `ruleSite`, `ruleProduct`, `rulePpn`, `ruleSourcePpv`, `ruleTargetPpv`, `ruleStatus`, and `ruleReason`.
- Produces: `pmsAttributeCatalog: Array<{product:string, attributes:Array<{ppnId:string, ppnName:string, ppvs:Array<{id:string,name:string,legal:boolean}>}>}>` and price-free `mappingRules`.

- [ ] **Step 1: Replace version-specific visible copy**

Change the submenu and page title to:

```html
<div class="nav-item" data-nav="mappingRule">⇄ <span>PMS 属性映射规则</span></div>
<div class="page-title"><h1>PMS 属性映射转化规则</h1><div class="page-actions"><button class="btn primary" id="addMappingRuleBtn">＋ 新增映射规则</button></div></div>
```

Use this page explanation:

```html
<div class="alert"><span>ⓘ</span><div>属性项 PPN、源属性值 PPV和目标属性值 PPV均从 PMS 获取；海外系统只选择具体值，不自建 PPN/PPV，也不直接配置目标 skuId。规则变更仅影响后续标单。</div></div>
```

Rename the filter labels and placeholders to source/target attribute values.

- [ ] **Step 2: Remove price controls and generalize modal copy**

Keep the two-column form, delete `ruleCoefficient` and `ruleFixedAdjustment`, and use:

```html
<div class="alert"><span>ⓘ</span><div>商品、属性项 PPN及源/目标属性值 PPV均从 PMS 目录选择；平台仅维护站点下的属性值转化关系。</div></div>
<div class="field"><label>属性项 PPN *</label><select class="control" id="rulePpn"></select></div>
<div class="field"><label>源属性值 PPV *</label><select class="control" id="ruleSourcePpv"></select></div>
<div class="field"><label>目标属性值 PPV *</label><select class="control" id="ruleTargetPpv"></select></div>
```

- [ ] **Step 3: Replace the PMS catalog with a product-to-attributes structure**

Define `pmsAttributeCatalog` so iPhone 15 has at least two PPNs:

```js
const pmsAttributeCatalog = [
  {
    product: 'iPhone 15 / 256GB',
    attributes: [
      {
        ppnId: 'PPN-REGION-001',
        ppnName: '销售地区/版本',
        ppvs: [
          { id: 'PPV-OTHER-001', name: '海外其他版本', legal: true },
          { id: 'PPV-MY-001', name: '马来版本', legal: true },
          { id: 'PPV-CN-001', name: '国行版本', legal: true }
        ]
      },
      {
        ppnId: 'PPN-CHANNEL-001',
        ppnName: '购买渠道',
        ppvs: [
          { id: 'PPV-HK-RETAIL-001', name: '香港零售', legal: true },
          { id: 'PPV-CN-RETAIL-001', name: '大陆国行', legal: true },
          { id: 'PPV-OVERSEAS-001', name: '海外版本', legal: true }
        ]
      }
    ]
  }
];
```

Preserve equivalent region PPN examples for iPhone 14 Pro and Galaxy S24 within the same nested shape.

- [ ] **Step 4: Remove price properties from all mapping rule seeds**

Each `mappingRules` object must retain `id`, `site`, `product`, `ppnId`, `ppnName`, source/target PPV IDs and names, `pmsValidation`, `status`, `version`, `operator`, and `updatedAt`. Delete `coefficient` and `fixedAdjustment` only from mapping rules.

- [ ] **Step 5: Run the contract to verify structure is accepted and behavior remains pending**

Run the Node contract. Expected: generic copy, form, catalog, price absence, syntax, and store assertions pass; behavior-token assertions may remain pending until Task 3.

- [ ] **Step 6: Commit the generic structure**

```bash
git add platform.html
git commit -m "feat: generalize PMS mapping structure"
```

---

### Task 3: Implement multiple-PPN cascading, validation, rendering, and translations

**Files:**
- Modify: `platform.html:403-450`
- Modify: `platform.html:562-568`
- Modify: `platform.html:683-769`
- Modify: `platform.html:1378-1389`
- Test: `tests/platform-pms-mapping.test.mjs`

**Interfaces:**
- Consumes: `pmsAttributeCatalog`, price-free `mappingRules`, and existing modal DOM IDs.
- Produces: `pmsProductFor(product)`, `pmsCatalogFor(product, ppnId)`, `syncPmsRuleOptions(rule?, preservePpn?)`, `readMappingDraft()`, and `validateMappingDraft(draft,currentRule)`.

- [ ] **Step 1: Generalize route and i18n copy**

Update the route title mapping to `PMS 属性映射规则`. Replace mapping-only English translations with:

```js
'PMS 属性映射规则':'PMS Attribute Mapping Rules',
'PMS 属性映射转化规则':'PMS Attribute Conversion Rules',
'属性项 PPN':'Attribute PPN',
'源属性值 PPV':'Source Attribute PPV',
'目标属性值 PPV':'Target Attribute PPV',
'PPN 名称 / ID':'PPN Name / ID',
'源 PPV 名称 / ID':'Source PPV Name / ID',
'目标 PPV 名称 / ID':'Target PPV Name / ID'
```

Remove mapping-specific translations for price coefficient, fixed adjustment, and price-strategy copy. Do not remove price translations used by other modules.

- [ ] **Step 2: Render the price-free mapping table**

Remove the coefficient/fixed-adjustment column and values. The header must contain nine columns: rule/version, site/product, PPN, source PPV, target PPV, PMS validation, status, update metadata, and actions.

- [ ] **Step 3: Implement product and PPN lookups**

Use:

```js
function pmsProductFor(product) {
  return pmsAttributeCatalog.find(item => item.product === product);
}

function pmsCatalogFor(product, ppnId) {
  return pmsProductFor(product)?.attributes.find(attribute => attribute.ppnId === ppnId);
}
```

- [ ] **Step 4: Implement the product → PPN → PPV cascade**

Populate all PPNs for the selected product, preserve `rule.ppnId` during edit, and choose the first PPN otherwise. Populate source/target PPVs from only that selected PPN. For the region PPN, prefer the Malaysia source and mainland target when available; for other PPNs, use the first PPV as source and second PPV as target when available.

Bind both changes:

```js
$('#ruleProduct').onchange = () => syncPmsRuleOptions();
$('#rulePpn').onchange = () => syncPmsRuleOptions(null, true);
```

The second argument must preserve the selected product and PPN while refreshing PPVs.

- [ ] **Step 5: Remove price fields from draft reading and modal opening**

`readMappingDraft()` must return no `coefficient` or `fixedAdjustment`. `openMappingRuleModal()` must not query removed price controls.

- [ ] **Step 6: Generalize validation messages**

Use these Chinese errors and corresponding English translations:

```js
'未找到 PMS 返回的属性项 PPN，请重新选择商品。'
'源属性值 PPV或目标属性值 PPV不属于当前 PMS 属性项 PPN。'
'目标属性值 PPV无法与其他商品属性组成合法 SKU。'
'同一站点、商品、属性项 PPN和源属性值 PPV已有生效规则。'
```

Keep change reason required. Remove price number validation.

- [ ] **Step 7: Run tests and residue scans**

Run:

```bash
/Users/a159264/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/platform-pms-mapping.test.mjs
rg -n 'ruleCoefficient|ruleFixedAdjustment|coefficient|fixedAdjustment|PMS 版本映射规则|版本 PPN|源版本 PPV|目标版本 PPV' platform.html
```

Expected: all tests pass. The residue scan returns no matches from the mapping module; any broader `版本` or `价格` copy must belong to unrelated modules and remain unchanged.

- [ ] **Step 8: Commit the completed behavior**

```bash
git add platform.html
git commit -m "feat: support generic PMS attribute mappings"
```

---

### Task 4: Verify frozen scope and publish

**Files:**
- Test: `platform.html`
- Test: `store.html`
- Test: `tests/platform-pms-mapping.test.mjs`

**Interfaces:**
- Consumes: The completed generic mapping implementation.
- Produces: Browser and checksum evidence plus the published GitHub Pages URL.

- [ ] **Step 1: Run the full Node contract and syntax check**

Run the Node test command. Expected: every test passes, including inline script compilation.

- [ ] **Step 2: Serve and test the static prototype locally**

Run:

```bash
/Users/a159264/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m http.server 4173
```

Verify in `http://127.0.0.1:4173/platform.html`:

- Generic attribute navigation and title are visible.
- No mapping price fields or price column exists.
- iPhone 15 exposes both sales-region and purchase-channel PPNs.
- Changing PPN changes source and target PPV options.
- Duplicate active key is rejected.
- Valid create, edit, disable, enable, history, filter, reset, English, and Chinese interactions work.
- Browser console has no errors.

- [ ] **Step 3: Confirm frozen store scope**

Run:

```bash
shasum -a 256 store.html
git diff origin/main -- store.html
```

Expected: checksum `7658cbd26ea07a0a107904fdddc5631ce70f0d4ce4585b5e9bc5cfb901e59d1c` and an empty diff.

- [ ] **Step 4: Publish only the intended prototype source**

Attempt `git push origin main`. If HTTPS credentials are unavailable but the signed-in GitHub owner session is available, update only `platform.html` through GitHub's native editor and commit directly to `main` with message `Update generic PMS attribute mapping`.

- [ ] **Step 5: Verify GitHub and GitHub Pages content**

Compare local and remote SHA-256 values for `platform.html` and `store.html`. Then fetch the Pages URL with a commit-based cache-busting query and confirm `PMS 属性映射转化规则` is present while `PMS 版本映射规则`, mapping price controls, and candidate governance are absent.
