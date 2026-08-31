import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const platform = readFileSync(new URL('../platform.html', import.meta.url), 'utf8');

test('business refunds are immediate and independent', () => {
  for (const text of [
    '退款草稿', '正式发起退款', '取消退款', '退款权限',
    '可发起', '已锁定', '已关闭', '退款立即生效',
    '退款不以取货、隐私、退回或售后状态为前置条件',
    'function submitRefund', 'function cancelRefund'
  ]) assert.match(platform, new RegExp(text));
  for (const oldText of [
    '等待财务处理', '处理退款申请', '确认已处理',
    'processRefundRequest', 'submitRefundDecision', '退回中禁止退款'
  ]) assert.doesNotMatch(platform, new RegExp(oldText));
});

test('finance has read-only refund directions and required pages', () => {
  for (const text of [
    '分账明细', '结算单', '结算配置', '登记预付金', '登记门店付款',
    '前置款不足，建议关注', '创建人工补充批次',
    'function renderLedger', 'function renderSettlementConfig'
  ]) assert.match(platform, new RegExp(text));
  assert.doesNotMatch(platform, /退款处理状态|退款申请与资金记录|财务按申请一次性处理/);
});

test('settlement has the required lifecycle', () => {
  for (const text of [
    '草稿', '待处理', '已处理', '已冲正', '提交结算单', '退回草稿',
    '标记已处理', '结算单冲正', '付款主体及账户', '收款主体及账户',
    '处理方向', '预付金恢复', '门店垫付补回',
    'function submitSettlementBill', 'function returnSettlementToDraft',
    'function processSettlementBill', 'function reverseSettlementBill'
  ]) assert.match(platform, new RegExp(text));
  for (const oldText of ['待支付', '已支付', '确认已支付', '结算后退款进入下一期']) {
    assert.doesNotMatch(platform, new RegExp(oldText));
  }
});

test('platform inline script compiles', () => {
  const script = platform.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});
