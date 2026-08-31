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

test('employee scan and supervisor pickup flows include English copy', () => {
  for (const required of [
    'Scan Device', 'Standard Phone', 'Foldable Phone', 'Screen-on Photo', 'Screen-off Photo',
    'Supervisor App', 'OB Account', 'On-site Pickup', 'Confirm Picked Up', 'Pickup cannot be undone'
  ]) assert.match(store, new RegExp(required));
});
