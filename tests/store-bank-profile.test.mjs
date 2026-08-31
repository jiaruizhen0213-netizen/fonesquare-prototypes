import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const platform = readFileSync(new URL('../platform.html', import.meta.url), 'utf8');
const store = readFileSync(new URL('../store.html', import.meta.url), 'utf8');

test('platform models one independently editable bank account per store', () => {
  for (const required of [
    'function bankConfigured(',
    'function maskedBankAccount(',
    'function cloneStoreBank(',
    'function openStoreEditor(',
    'data-store-bank-source',
    'id="newStoreBankMode"',
    'id="newStoreBankSource"',
    'id="newStoreBankHolder"',
    'id="newStoreBankName"',
    'id="newStoreBankNumber"',
    '从本商家已有店铺复制',
    '复制后为当前店铺的独立银行卡，后续修改互不影响'
  ]) assert.ok(platform.includes(required), `missing platform store-bank contract: ${required}`);

  assert.match(platform, /merchantStores\(u\)\.filter\(bankConfigured\)/);
  assert.match(platform, /copiedBank=mode==='copy'\?cloneStoreBank\(sourceStore\):null/);
  assert.match(platform, /const bank=mode==='copy'\?Object\.assign\(\{\},copiedBank,/);
  assert.match(platform, /else if\(!address\)err='请填写店铺地址。'/);
  assert.doesNotMatch(platform, /address=\$\('#newStoreAddress'\)\.value\.trim\(\)\|\|u\?\.address/);
});

test('platform exposes masked employee bank state and an authorized editor', () => {
  for (const required of [
    'function openStaffBankEditor(',
    'data-staff-action="edit-bank"',
    '收款银行卡',
    '银行卡状态',
    '仅展示脱敏卡号',
    '银行卡资料与商家关系独立，转移或解除关系不会清除'
  ]) assert.ok(platform.includes(required), `missing platform employee-bank contract: ${required}`);

  assert.match(platform, /bank:\{holder:/);
  assert.match(platform, /maskedBankAccount\(staff\.bank\)/);
  assert.match(platform, /if\(action==='edit-bank'\)\{openStaffBankEditor\(staff\);return\}/);
});

test('supplier app separates merchant store profiles from the employee bank profile', () => {
  for (const required of [
    'id="storeProfileScope"',
    'id="profileStoreSelector"',
    'id="storeAddressEntry"',
    'const storeProfiles=',
    'const employeeBankProfile=',
    'function selectedStoreProfile()',
    'function renderProfileScope()',
    '当前店铺',
    '员工个人收款银行卡'
  ]) assert.ok(store.includes(required), `missing supplier profile contract: ${required}`);

  assert.match(store, /storeProfileScope\.style\.display=role==='merchant'\?'block':'none'/);
  assert.match(store, /storeAddressEntry\.style\.display=role==='merchant'\?'grid':'none'/);
  assert.match(store, /role==='employee'\?employeeBankProfile:selectedStoreProfile\(\)\.bank/);
  assert.match(store, /selectedStoreProfile\(\)\.address=address/);
  assert.match(store, /target\.accountNumber=number/);
});

test('both edited inline scripts still compile', () => {
  for (const [name, html] of [['platform', platform], ['store', store]]) {
    const script = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)?.[1];
    assert.ok(script, `${name} inline script missing`);
    assert.doesNotThrow(() => new Function(script), `${name} inline script should compile`);
  }
});
