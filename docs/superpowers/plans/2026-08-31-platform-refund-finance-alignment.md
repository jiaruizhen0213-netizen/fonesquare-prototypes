# FoneSquare 平台退款与财务原型对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将平台端原型的退款、分账明细、预付金和月度结算行为对齐当前两份 PRD，同时不改动已人工确认的成交订单非退款流程。

**Architecture:** 保持 `platform.html` 单文件内嵌 CSS、HTML 和 JavaScript。新增一份 Node 契约测试锁定业务口径；在现有模拟数据和模态框框架上，以独立的退款、资金明细、预付金和结算单对象替代退款申请/财务确认流程。

**Tech Stack:** 静态 HTML/CSS/JavaScript、Node.js 内置测试运行器、Git、GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-08-31-platform-refund-finance-alignment-design.md`

## Global Constraints

- 只修改 `platform.html`、新增的契约测试及本次设计/计划文件；不修改 `store.html`、`recycler.html` 或飞书文档。
- 保留单文件静态原型、现有视觉系统、中英文切换和现有取货/隐私/轻量退回流程；不新增依赖或后端。
- 退款由业务侧发起和取消；财务仅只读查看退款影响。退款不依赖取货、隐私、退回或售后状态。
- 对门店退款仅恢复预付金；其他退款方向进入待结算；售后不生成资金方向。
- 退款权限：草稿结算可发起、待处理锁定、已处理关闭。结算单冲正不重新开放退款。
- 结算单按处理类型、付款主体及账户、收款主体及账户、方向和币种拆分，状态为草稿、待处理、已处理、已冲正。
- 新增的所有用户可见文案必须有简体中文和英文翻译，不展示幂等键、接口或后台任务技术细节。

---

### Task 1: 建立退款与财务契约测试

**Files:**

- Create: `tests/platform-refund-finance-alignment.test.mjs`
- Modify: `platform.html:60-65, 360-410, 860-1320`

**Interfaces:**

- Consumes: `platform.html` 内嵌脚本和现有 Node 测试结构。
- Produces: 后续任务必须满足的文案与函数契约。

- [ ] **Step 1: 写入会失败的合同测试**

创建 `tests/platform-refund-finance-alignment.test.mjs`：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test tests/platform-refund-finance-alignment.test.mjs
```

Expected: FAIL；现有原型仍保留财务确认/驳回退款、待支付/已支付状态，并缺失预付金与结算配置。

- [ ] **Step 3: 运行既有回归测试**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: 既有测试通过；新测试是预期失败来源。

- [ ] **Step 4: 提交测试基线**

```bash
git add tests/platform-refund-finance-alignment.test.mjs
git commit -m "test: define refund and finance prototype contract"
```

### Task 2: 将订单退款改为业务即时生效

**Files:**

- Modify: `platform.html:360-410, 860-952, 1095-1145`
- Test: `tests/platform-refund-finance-alignment.test.mjs`

**Interfaces:**

- Consumes: `orders`、`adjustments`、`openBusinessModal()`、`renderOrderList()`、`renderOrderDetail()`。
- Produces: `refundRecords`、`refundsForOrder(order)`、`activeRefundForOrder(order)`、`refundPermission(order)`、`refundAmountType(order)`、`openRefundEditor(order)`、`submitRefund(order, mode)`、`cancelRefund(record)`。

- [ ] **Step 1: 增加退款独立性断言**

在测试文件追加：

```js
test('refund is not gated by return or after-sales', () => {
  assert.match(platform, /退款与售后记录/);
  assert.match(platform, /对门店的退款只恢复预付金/);
  assert.doesNotMatch(platform, /确认已退回后才能发起需要退回的退款/);
});
```

- [ ] **Step 2: 运行新增断言确认失败**

Run:

```bash
node --test tests/platform-refund-finance-alignment.test.mjs
```

Expected: FAIL；当前退款被退回状态和财务处理申请锁定。

- [ ] **Step 3: 新增退款数据模型与权限函数**

在 `adjustments` 后定义 `refundRecords`。已发起记录必须包含 `id`、`order`、`status`、`reason`、`description`、`currency`、`amount`、发起/取消审计字段，以及方向数组。每个方向包含 `kind`、`payer`、`payerAccount`、`payee`、`payeeAccount`、`amount` 和 `currency`。

实现：

```js
function refundsForOrder(order) { return refundRecords.filter(x => x.order === order.id); }
function activeRefundForOrder(order) {
  return refundsForOrder(order).find(x => x.status === '已发起') || null;
}
function refundPermission(order) {
  const bill = settlementBills.find(x => (x.sourceOrderIds || []).includes(order.id) && x.status !== '已冲正');
  if (!bill || bill.status === '草稿') return '可发起';
  return bill.status === '待处理' ? '已锁定' : '已关闭';
}
function refundAmountType(order) {
  const refund = activeRefundForOrder(order);
  if (!refund) return '未退款';
  return refund.amount >= order.amount ? '全额退款' : '部分退款';
}
```

保留 `adjustments` 仅作售后事实；移除其作为退款、退款申请或资金方向来源的分支。

- [ ] **Step 4: 修改订单列表和详情的退款区域**

在 `renderOrderList()` 和 `renderOrderDetail()`：

- 将“待处理退款”改成“已发起退款”。
- 列表增加有效退款金额、退款记录号、退款权限和财务结算状态。
- 将“申请退款”替换为“发起退款”；移除所有等待财务处理、已驳回、财务处理人和处理凭证文案。
- 详情页签改为“退款与售后记录”，内部用两张卡片分离退款与售后。
- 退款卡片的操作仅由 `refundPermission(order)` 和 `activeRefundForOrder(order)` 决定，不读取取货、隐私、退回和售后状态。
- 售后卡片不显示资金状态、金额生效或冲正按钮。

使用提示：

```html
<div class="alert"><span>ⓘ</span><div>退款不以取货、隐私、退回或售后状态为前置条件。保存草稿不影响资金；正式发起后退款立即生效，财务仅只读查看资金影响。</div></div>
```

- [ ] **Step 5: 实现保存草稿、正式发起和取消退款**

用现有模态框实现 `openRefundEditor(order)`：

- 草稿只写 `refundRecords`，状态为草稿，不写资金明细。
- `submitRefund(order, mode)` 在正式发起时校验退款权限为可发起、无有效退款、金额大于零且不超过订单金额、至少一条有效方向。
- 正式发起后写 `status: '已发起'`、冻结金额和方向，调用 `rebuildLedgerEntries()`，刷新订单、分账明细和当前详情。
- `cancelRefund(record)` 收集必填取消原因，写已取消与审计信息，调用 `rebuildLedgerEntries()`；不得删除或改写原方向。

- [ ] **Step 6: 运行订单退款测试**

Run:

```bash
node --test tests/platform-refund-finance-alignment.test.mjs
node --test tests/*.test.mjs
```

Expected: 新退款契约通过，取货、隐私与退回既有测试仍通过。

- [ ] **Step 7: 提交订单退款修改**

```bash
git add platform.html tests/platform-refund-finance-alignment.test.mjs
git commit -m "feat: align order refund lifecycle"
```

### Task 3: 重建分账明细、预付金与门店付款

**Files:**

- Modify: `platform.html:60-65, 386-410, 860-882, 1272-1306`
- Test: `tests/platform-refund-finance-alignment.test.mjs`

**Interfaces:**

- Consumes: `orders`、`refundRecords`、`settlementBills`、`metricCards()`、`openBusinessModal()`。
- Produces: `ledgerEntries`、`prepaymentEntries`、`storePayments`、`rebuildLedgerEntries()`、`renderLedger()`、`openPrepaymentEditor()`、`openStorePaymentEditor()`、`createSupplementalBatch(entryIds)`。

- [ ] **Step 1: 增加预付金与分账明细断言**

追加：

```js
test('ledger supports prepayment and store advances', () => {
  for (const text of [
    '待结算', '已纳入结算单', '已结算', '已抵扣',
    '本月预付金使用额', '本月门店垫付额',
    'function rebuildLedgerEntries', 'function openPrepaymentEditor',
    'function openStorePaymentEditor', 'function createSupplementalBatch'
  ]) assert.match(platform, new RegExp(text));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test tests/platform-refund-finance-alignment.test.mjs
```

Expected: FAIL；当前资金台账不具备预付金、门店付款和补充批次能力。

- [ ] **Step 3: 定义逐笔资金和预付金数据**

以以下数组替换旧 `settlementLedger` 和 `refundRequests`：

```js
let ledgerEntries = [];
const prepaymentEntries = [{
  id: 'PPT-20260801-001', site: 'MY', storeId: 'ST-M1002-PJSS2',
  store: 'PJ SS2 店', currency: 'MYR', event: '发放',
  amount: 500, status: '已生效', balanceAfter: 500, createdAt: '2026-08-01 09:00'
}];
const storePayments = [{
  id: 'STP-20260820-001', order: 'ORD-MY-20260820-0041', site: 'MY',
  storeId: 'ST-M1002-PJSS2', store: 'PJ SS2 店', seller: '供货卖家 Hafiz',
  currency: 'MYR', amount: 650, prepaymentUsed: 500, advanceAmount: 150,
  status: '有效', paidAt: '2026-08-20 16:00'
}];
```

实现 `rebuildLedgerEntries()`：从成交订单、已发起退款的现金方向、预付金流水和门店付款生成只读明细。现金条目包含站点、订单、SKU、收付款主体及账户、处理类型、币种、原始金额、待结算金额、退款记录号、退款权限和结算状态。预付金恢复不进入现金待结算。

- [ ] **Step 4: 重绘分账明细页面**

- 导航“资金台账”改为“分账明细”，所有跳转改用 `renderLedger()`。
- 删除退款申请混排、退款处理状态和处理按钮。
- 工具栏增加登记预付金、登记门店付款、创建人工补充批次和导出。
- 汇总展示待结算金额、已结算金额、已生效退款金额和门店预付金关注数。
- 对门店维度展示可用余额、本月使用额、本月退款恢复额和本月门店垫付额；垫付额大于零显示“前置款不足，建议关注”。
- 列表展示需求文档的核心字段，退款方向与退款权限全部只读。

- [ ] **Step 5: 实现三种财务演示操作**

实现：

```js
function openPrepaymentEditor(eventType) { /* 发放、追加充值、退回 */ }
function openStorePaymentEditor() { /* 自动拆分预付金使用和门店垫付 */ }
function createSupplementalBatch(entryIds) { /* 只纳入待结算现金条目 */ }
```

实现时必须满足：

- 预付金退回不得超过同站点、门店、币种的当前可用余额。
- 门店付款金额大于零；`prepaymentUsed = Math.min(amount, availableBalance)`，`advanceAmount = amount - prepaymentUsed`，余额不足仍可保存。
- 补充批次拒绝空选择、非待结算条目和已进入有效结算单的条目。

- [ ] **Step 6: 运行测试与脚本编译**

Run:

```bash
node --test tests/platform-refund-finance-alignment.test.mjs
node --test tests/*.test.mjs
node -e "const fs=require('fs');const s=fs.readFileSync('platform.html','utf8').match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];new Function(s);"
```

Expected: 三个命令均以 0 退出。

- [ ] **Step 7: 提交分账明细与预付金**

```bash
git add platform.html tests/platform-refund-finance-alignment.test.mjs
git commit -m "feat: add ledger and prepayment workflows"
```

### Task 4: 重构结算单和站点自动建单配置

**Files:**

- Modify: `platform.html:60-65, 396-408, 1148-1270, 1272-1310`
- Test: `tests/platform-refund-finance-alignment.test.mjs`

**Interfaces:**

- Consumes: `ledgerEntries`、`refundPermission(order)`、`rebuildLedgerEntries()`、`openBusinessModal()`、`exportCsv()`。
- Produces: `settlementConfigs`、`buildSettlementDraft(input)`、`submitSettlementBill(bill)`、`returnSettlementToDraft(bill)`、`processSettlementBill(bill)`、`reverseSettlementBill(bill)`、`renderSettlementConfig()`、`saveSettlementConfig()`、`runMonthlySettlementPreview(config)`。

- [ ] **Step 1: 增加结算拆单和配置断言**

追加：

```js
test('settlement splits by account, direction, and currency', () => {
  for (const text of [
    '付款主体及账户', '收款主体及账户', '处理方向', '币种',
    '退款现金方向净额', '预付金抵扣', '预付金恢复', '门店垫付补回', '负数结转',
    '站点结算配置', '站点时区', '下次生成时间', '最近执行结果',
    'function buildSettlementDraft', 'function saveSettlementConfig',
    'function runMonthlySettlementPreview'
  ]) assert.match(platform, new RegExp(text));
  assert.doesNotMatch(platform, /一行一张商家账单/);
});
```

- [ ] **Step 2: 运行测试确认现有按商家账单逻辑失败**

Run:

```bash
node --test tests/platform-refund-finance-alignment.test.mjs
```

Expected: FAIL；当前逻辑仍以商家 ID 聚合，状态为待支付/已支付。

- [ ] **Step 3: 用资金明细结算键替换按商家聚合**

删除 `splitSnapshotForOrder()`、`settlementRecipientSpecs()`、`settlementOrderRows()`、`settlementEffectRows()` 和按商家 `groupFor()` 的路径。实现：

```js
function settlementKey(entry) {
  return [entry.handlingType, entry.payer, entry.payerAccount, entry.payee,
    entry.payeeAccount, entry.direction, entry.currency].join('|');
}
function eligibleSettlementEntries(monthStart, monthEnd) {
  return ledgerEntries.filter(x =>
    x.kind === '现金' && x.settlementStatus === '待结算' &&
    x.businessAt >= monthStart && x.businessAt < monthEnd
  );
}
function buildSettlementDraft({ site, month, source, entryIds }) {
  // 仅按 settlementKey 拆分，并保留来源条目和订单快照
}
```

每张草稿账单保存 `sourceOrderIds`、`sourceEntryIds`、收付款主体及账户、方向、币种、正常应结算金额、退款现金方向净额、手续费抵扣、财务调整、预付金抵扣、预付金恢复、门店垫付补回、结算净额、账户快照和日志。

- [ ] **Step 4: 实现状态机与结算详情动作**

实现：

```js
function submitSettlementBill(bill) { /* 草稿 -> 待处理，重新校验并锁定退款 */ }
function returnSettlementToDraft(bill) { /* 待处理 -> 草稿，重新开放退款 */ }
function processSettlementBill(bill) { /* 待处理 -> 已处理，登记线下事实 */ }
function reverseSettlementBill(bill) { /* 已处理 -> 已冲正，建立关联反向单 */ }
```

具体校验：

- 提交检查来源条目仍为待结算、退款版本未变化、账户齐全且币种一致；失败时保持草稿并指出订单或条目。
- 标记已处理要求处理方式和处理时间；线下转账或现金要求凭证；无需实付或负数结转要求说明。
- 负净额在本单处理为零，生成只可进入相同 `settlementKey` 的后续结转条目。
- 冲正必须填写原因，保留原单与快照，不改变来源订单的已关闭退款权限。

- [ ] **Step 5: 重绘结算单、结算配置和双语导航**

- “结算账单”统一改为“结算单”；状态筛选改为草稿、待处理、已处理、已冲正。
- 草稿展示重新计算/提交，待处理展示退回草稿/标记已处理，已处理展示结算单冲正。
- 详情展示收付款主体及账户、方向、币种、来源订单和资金明细、退款现金方向净额、预付金抵扣与恢复、门店垫付补回、净额、凭证、说明和审计。
- 新增“结算配置”导航与页面，使用如下演示配置：

```js
const settlementConfigs = [{
  id: 'SCF-MY-001', site: 'MY', timezone: 'Asia/Kuala_Lumpur',
  enabled: true, cycle: '自然月', generateAt: '次月 1 日 09:00',
  effectiveDate: '2026-08-01', status: '生效',
  nextRunAt: '2026-09-01 09:00',
  lastRun: '2026-08-01 09:00：成功，SB-202608-001'
}];
```

- `renderSettlementConfig()` 展示站点、时区、周期、启用状态、生成时间、生效日期、当前结算月、下次生成时间和执行结果。
- `saveSettlementConfig()` 只影响未开始月份；`runMonthlySettlementPreview(config)` 生成草稿，或记录“符合条件数量为 0，不创建空批次”。
- 为任务 2-4 的新增中文文案补全 `I18N_EXACT` 英文翻译，并确保导航点击与初始化调用新渲染函数。

- [ ] **Step 6: 全量测试和发布前检查**

Run:

```bash
node --test tests/*.test.mjs
node -e "const fs=require('fs');const s=fs.readFileSync('platform.html','utf8').match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];new Function(s);"
git diff --check
git status --short
```

Expected: 测试和脚本编译成功，差异检查无输出，状态仅含本次预期文件。

- [ ] **Step 7: 本地验收、提交和发布**

在浏览器验证：待取货订单可直接正式发起退款；草稿不影响资金；待处理锁定退款、退回草稿重新开放、已处理永久关闭；门店余额不足产生垫付提示；冲正不重新开放退款；中英文下三个财务页面均可用。

Run:

```bash
git add platform.html tests/platform-refund-finance-alignment.test.mjs
git commit -m "feat: align platform refund and finance management"
git push origin main
```

重新打开：

```text
https://jiaruizhen0213-netizen.github.io/fonesquare-prototypes/platform.html
```

确认线上页面不再包含财务处理退款、待支付/已支付、退回中禁止退款和结算后退款进入下一期等旧口径。
