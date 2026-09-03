import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const store = readFileSync(new URL('../store.html', import.meta.url), 'utf8');

test('store prototype opens with three explicit demo cases', () => {
  for (const required of [
    'data-page="caseHub"',
    'data-case-entry="account"',
    'data-case-entry="supervisor"',
    'data-case-entry="role"',
    '案例一 · 账号注册与登录',
    '案例二 · 督导登录后可见内容',
    '案例三 · 店员与商家可见内容'
  ]) assert.ok(store.includes(required), `missing case hub contract: ${required}`);
});

test('account case demonstrates registration, country selection and unified-account login', () => {
  for (const required of [
    'data-page="accountAccess"',
    'id="accountModeRegister"',
    'id="accountModeLogin"',
    'id="accountCountry"',
    'value="MY"',
    'value="HK"',
    'id="accountIdentifier"',
    'id="accountVerificationCode"',
    'id="accountPassword"',
    'id="submitAccountAccess"',
    '统一账号'
  ]) assert.ok(store.includes(required), `missing account-case contract: ${required}`);
});

test('supervisor case uses one global OB view and supports delivered orders', () => {
  for (const required of [
    '全部区域、商家和门店',
    'data-supervisor-status="delivered"',
    '确认已送达',
    'confirmSupervisorDelivery',
    "pending→picked→delivered"
  ]) assert.ok(store.includes(required), `missing supervisor contract: ${required}`);

  for (const forbidden of ['当前负责范围', '未分配负责区域或门店', 'data-supervisor-permission="no-range"']) {
    assert.ok(!store.includes(forbidden), `obsolete supervisor scope remains: ${forbidden}`);
  }
});

test('store app separates merchant-staff account login from supervisor Feishu login', () => {
  for (const required of [
    'data-page="supervisorLogin"',
    '登录门店端',
    '商家与店员',
    '使用门店统一账号登录',
    'id="supervisorStoreAccountLogin"',
    '内部督导',
    '使用飞书登录',
    'id="supervisorFeishuLogin"',
    '正在验证督导身份',
    '未关联 OB 账号',
    'data-supervisor-auth-outcome="unbound"',
    'data-supervisor-auth-outcome="disabled"',
    'data-supervisor-auth-outcome="no-role"',
    'data-supervisor-auth-outcome="cancelled"',
    '飞书登录成功 · OB 督导 李敏'
  ]) assert.ok(store.includes(required), `missing role-separated login contract: ${required}`);

  for (const forbidden of [
    'id="supervisorUsername"',
    'id="supervisorPassword"',
    '使用演示 OB 账号登录',
    '独立督导 App',
    '退出督导 App'
  ]) assert.ok(!store.includes(forbidden), `obsolete dedicated-supervisor login remains: ${forbidden}`);
});

test('role case states merchant and staff visibility boundaries', () => {
  for (const required of [
    'data-page="roleOverview"',
    'data-role-entry="employee"',
    'data-role-entry="merchant"',
    '商家主账号可查看本商家下属全部店铺',
    '店员仅查看本人创建的标单',
    '店员不得查看其他店员',
    '商家主账号不能替其他实际建拍操作人记录卖家决定'
  ]) assert.ok(store.includes(required), `missing role boundary: ${required}`);
});

test('store inline script compiles after three-case update', () => {
  const script = store.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'store inline script missing');
  assert.doesNotThrow(() => new Function(script));
});
