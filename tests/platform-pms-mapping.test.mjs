import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const platform = readFileSync(new URL('../platform.html', import.meta.url), 'utf8');
const mappingPage = platform.match(/<section class="page" id="mappingRulePage">([\s\S]*?)<section class="page" id="bidListPage">/)?.[1] ?? '';
const mappingModal = platform.match(/<div class="modal wide" id="mappingRuleModal">([\s\S]*?)<div class="modal xwide" id="businessModal">/)?.[1] ?? '';

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

test('mapping UI contains no price configuration', () => {
  assert.ok(mappingPage);
  assert.ok(mappingModal);
  assert.doesNotMatch(`${mappingPage}${mappingModal}`, /价格系数|固定调整|价格策略|MYR/);
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
