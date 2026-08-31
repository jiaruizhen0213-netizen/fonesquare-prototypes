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
