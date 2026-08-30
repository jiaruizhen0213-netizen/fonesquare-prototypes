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
