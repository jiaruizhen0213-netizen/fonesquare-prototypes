import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const platform = readFileSync(new URL('../platform.html', import.meta.url), 'utf8');
const store = readFileSync(new URL('../store.html', import.meta.url), 'utf8');
const recycler = readFileSync(new URL('../recycler.html', import.meta.url), 'utf8');
const pages = { platform, store, recycler };
const publishPage = store.match(/data-page="confirm"[\s\S]*?data-page="success"/)?.[0] ?? '';

test('platform account model has no store primary account role', () => {
  for (const obsolete of [
    '店铺主账号', '修改店铺主账号', '独立店铺登录责任账号', 'primaryUserId',
    'syncStoreManager', 'openStorePrimaryModal'
  ]) {
    assert.doesNotMatch(platform, new RegExp(obsolete));
  }
  for (const required of ['FoneSquare 回收商', '供货商家', '商家主账号', '门店店员', '业务归属店铺（非账号）']) {
    assert.match(platform, new RegExp(required));
  }
});

test('platform pricing and auction ownership match the PRDs', () => {
  for (const required of [
    '版本 PPN', '来源 PPV', '价格失败不阻断发布和普通报价',
    'FoneSquare 回收商商家 ID', '90% / 95% / 100%',
    '80% / 90% / 95% / 100%', '历史最高有效主动报价',
    '固定 48 小时', '重拍', '结束标单'
  ]) assert.match(platform, new RegExp(required));
  assert.doesNotMatch(platform, /价格模块.{0,30}(创建|生成).{0,20}(自动报价|出价计划)/);
  assert.doesNotMatch(platform, /最终国内定价 SKU/);
});

test('platform order and pickup views contain no closed order or pickup batch', () => {
  for (const obsolete of ['关闭订单', '订单已关闭', "status:'已关闭'", "status==='已关闭'", '创建已取货批次', '取货批次号', '交接码']) {
    assert.doesNotMatch(platform, new RegExp(obsolete));
  }
  assert.match(platform, /逐单更新为已取货/);
  assert.doesNotMatch(platform, /data-biz="close-order"|closeOrder/);
});

test('supplier roles and publishing fields match the PRDs', () => {
  assert.doesNotMatch(store, /value="store"|店铺主账号|FoneSquare 门店端/);
  assert.match(store, /value="merchant"/);
  assert.match(store, /value="employee"/);
  for (const required of ['版本 PPN', '来源 PPV', '价格暂不可用，不影响发布与普通竞价']) {
    assert.match(store, new RegExp(required));
  }
  assert.doesNotMatch(publishPage, /sellerMobile|contractConfirm|合同编号|卖家手机号/);
  assert.doesNotMatch(store, /最终国内定价 SKU|从国内 SKU 目录选择本单国内定价 SKU/);
});

test('supplier seller decision collects details after pre-win and offers re-auction', () => {
  for (const id of ['acceptContractConfirm', 'acceptSellerMobile', 'sendAcceptOtp', 'acceptOtpCode', 'chooseReauction', 'chooseEndLot']) {
    assert.match(store, new RegExp(`id="${id}"`));
  }
  for (const copy of ['重拍', '结束标单', '固定 48 小时', '自动沿用']) {
    assert.match(store, new RegExp(copy));
  }
});

test('recycler profile has no supplier store maintenance', () => {
  for (const obsolete of ['storeAddress', 'storeCountry', 'storePhone', 'useVerifiedAddress', 'Save store address', '保存门店地址']) {
    assert.doesNotMatch(recycler, new RegExp(obsolete));
  }
  assert.match(recycler, /FoneSquare 回收商/);
  assert.match(recycler, /无需先完成 KYC/);
});

test('recycler bid UI supports non-blocking and inherited bids without leaking strategy', () => {
  for (const required of ['历史最高有效主动报价', '固定 48 小时', '高于沿用价', '30 秒改价窗口']) {
    assert.match(recycler, new RegExp(required));
  }
  for (const leak of ['MYR 基准价', '偏差百分比', '90% / 95% / 100%', '80% / 90% / 95% / 100%', '爱回收阶梯出价计划']) {
    assert.doesNotMatch(recycler, new RegExp(leak));
  }
  assert.match(recycler, /\.inherited-bid\[hidden\]\s*\{\s*display:\s*none;/);
});

test('all portal inline scripts compile', () => {
  for (const [name, html] of Object.entries(pages)) {
    const script = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)?.[1];
    assert.ok(script, `${name} inline script missing`);
    assert.doesNotThrow(() => new Function(script), `${name} inline script must compile`);
  }
});

test('all portals expose Simplified Chinese and English', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.match(html, /简体中文|中文/, `${name} Chinese option missing`);
    assert.match(html, /English/, `${name} English option missing`);
  }
});

test('obsolete cross-portal requirements are absent', () => {
  const all = `${platform}\n${store}\n${recycler}`;
  for (const obsolete of [
    '店铺主账号', '独立店铺登录责任账号', '发布前请先确认线下合同',
    '最终国内定价 SKU', '创建已取货批次', '关闭订单'
  ]) assert.doesNotMatch(all, new RegExp(obsolete));
});
