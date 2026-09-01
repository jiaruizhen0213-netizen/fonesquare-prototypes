(function () {
  'use strict';

  const financeViewNames = {
    financeLedger: '资金台账',
    prepaymentDisbursementDetail: '预付金记录详情',
    recyclerReceiptDetail: '回收商收款单详情',
    settlementBill: '结算单',
    settlementBillDetail: '结算单详情',
    settlementConfig: '结算配置',
    platformFundAccount: '平台资金账户'
  };
  const financeDetailNav = {
    prepaymentDisbursementDetail: 'financeLedger',
    recyclerReceiptDetail: 'financeLedger',
    settlementBillDetail: 'settlementBill'
  };
  const baseSetView = setView;

  setView = function (view) {
    if (!financeViewNames[view]) {
      baseSetView(view);
      return;
    }
    $$('.page').forEach(function (page) { page.classList.remove('active'); });
    const page = $('#' + view + 'Page');
    if (!page) return;
    page.classList.add('active');
    $('#crumbGroup').textContent = '财务管理';
    $('#crumbCurrent').textContent = financeViewNames[view];
    const navKey = financeDetailNav[view] || view;
    $$('[data-nav]').forEach(function (item) {
      item.classList.toggle('active', item.dataset.nav === navKey);
    });
    window.scrollTo(0, 0);
  };

  function moneyV2(value, currency) {
    return (currency || 'MYR') + ' ' + Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function payoutAccountsV2() {
    return platformFundAccounts.filter(function (account) {
      return account.status === '启用' && ['打款账户', '收付款两用'].includes(account.usage);
    });
  }

  function receiptAccountsV2() {
    return platformFundAccounts.filter(function (account) {
      return account.status === '启用' && ['收款账户', '收付款两用'].includes(account.usage);
    });
  }

  function accountOptionsV2(accounts, selectedId) {
    return accounts.map(function (account) {
      return '<option value="' + esc(account.id) + '" ' + (account.id === selectedId ? 'selected' : '') + '>' +
        esc(account.accountName + ' / ' + account.bankName + ' / ' + account.accountNumber) +
        (account.isDefault ? '（默认）' : '') + '</option>';
    }).join('');
  }

  const prepaymentDisbursementOrdersV2 = [
    {id:'PPR-MY-20260830-004',site:'MY',supplier:'Lim Wei Jian',supplierId:'M1003',type:'实际退回',currency:'MYR',amount:500,platformAccount:'Maybank Collection / 5566',supplierAccount:'Lim Wei Jian 预付金账户 / 4428',paidAt:'2026-08-30 16:20',reference:'BANK-IN-20260830-014',voucher:'prepayment-return-004.pdf',operator:'陈财务',status:'已生效'},
    {id:'PPD-MY-20260828-003',site:'MY',supplier:'AR Mobile Sdn Bhd',supplierId:'M1006',type:'下拨',currency:'MYR',amount:3000,platformAccount:'Maybank Payout / 9988',supplierAccount:'AR Mobile 预付金账户 / 7314',paidAt:'2026-08-28 15:10',reference:'BANK-OUT-20260828-031',voucher:'prepayment-003.pdf',operator:'陈财务',status:'已生效'},
    {id:'PPD-MY-20260801-002',site:'MY',supplier:'Siti Nur',supplierId:'M1002',type:'下拨',currency:'MYR',amount:11000,platformAccount:'Maybank Payout / 9988',supplierAccount:'Siti Nur 预付金账户 / 8821',paidAt:'2026-08-01 09:15',reference:'BANK-OUT-20260801-002',voucher:'prepayment-002.pdf',operator:'陈财务',status:'已生效'},
    {id:'PPD-MY-20260801-001',site:'MY',supplier:'Lim Wei Jian',supplierId:'M1003',type:'下拨',currency:'MYR',amount:2500,platformAccount:'Maybank Payout / 9988',supplierAccount:'Lim Wei Jian 预付金账户 / 4428',paidAt:'2026-08-01 09:00',reference:'BANK-OUT-20260801-001',voucher:'prepayment-001.pdf',operator:'陈财务',status:'已生效'}
  ];
  const prepaymentSummariesV2 = [
    {supplierId:'M1006',supplier:'AR Mobile Sdn Bhd',prepayment:3000,used:3428.40,returned:0},
    {supplierId:'M1002',supplier:'Siti Nur',prepayment:11000,used:9857.40,returned:0},
    {supplierId:'M1003',supplier:'Lim Wei Jian',prepayment:2500,used:1500,returned:500}
  ];

  const recyclerReceiptOrdersV2 = [
    {id:'RCO-MY-20260820-0041',order:'ORD-MY-20260820-0041',site:'MY',recycler:'回收商 M***11',currency:'MYR',amount:2410,status:'已收款',platformAccount:'Maybank Collection / 5566',recyclerAccount:'Maybank / ****9911',receivedAt:'2026-08-21 10:05',reference:'BANK-IN-20260821-041',voucher:'receipt-0041.pdf',operator:'陈财务',createdAt:'2026-08-20 18:05',voidReason:'—'},
    {id:'RCO-MY-20260819-0032',order:'ORD-MY-20260819-0032',site:'MY',recycler:'回收商 L***06',currency:'MYR',amount:1980,status:'待收款',platformAccount:'Maybank Collection / 5566',recyclerAccount:'Public Bank / ****6103',receivedAt:'—',reference:'—',voucher:'—',operator:'—',createdAt:'2026-08-19 18:40',voidReason:'—'},
    {id:'RCO-MY-20260818-0017',order:'ORD-MY-20260818-0017',site:'MY',recycler:'回收商 R***18',currency:'MYR',amount:1680,status:'已作废',platformAccount:'Maybank Collection / 5566',recyclerAccount:'CIMB / ****4428',receivedAt:'—',reference:'—',voucher:'—',operator:'王财务',createdAt:'2026-08-18 16:30',voidReason:'来源订单生成错误'}
  ];

  const settlementBillsV2 = [
    {id:'STL-MY-202608-SUP-003',site:'MY',period:'2026-08 月结',type:'供货商结算单',payee:'AR Mobile Sdn Bhd',payeeAccount:'RHB Bank / ****7314',currency:'MYR',amount:178.20,status:'待付款',deadline:'2026-09-10',createdAt:'2026-09-07 02:00',platformAccount:'Maybank Payout / 9988',paidAt:'—',reference:'—',voucher:'—',operator:'—',voidReason:'—',prepaymentBalance:-428.40,sources:[{order:'ORD-MY-20260819-0021',dealAt:'2026-08-19 11:08',winning:1980,originalShare:178.20,refund:'未退款',currentShare:178.20}]},
    {id:'STL-MY-202608-STAFF-002',site:'MY',period:'2026-08 月结',type:'店员结算单',payee:'Aina Rahman',payeeAccount:'Maybank / ****1190',currency:'MYR',amount:27.80,status:'已付款',deadline:'2026-09-10',createdAt:'2026-09-07 02:00',platformAccount:'Maybank Payout / 9988',paidAt:'2026-09-08 11:05',reference:'BANK-OUT-20260908-018',voucher:'staff-settlement-002.pdf',operator:'陈财务',voidReason:'—',prepaymentBalance:null,sources:[{order:'ORD-MY-20260820-0041',dealAt:'2026-08-20 14:10',winning:2410,originalShare:27.80,refund:'未退款',currentShare:27.80}]},
    {id:'STL-MY-202608-SUP-001',site:'MY',period:'2026-08 月结',type:'供货商结算单',payee:'Siti Nur',payeeAccount:'Maybank / ****8821',currency:'MYR',amount:89.80,status:'已作废',deadline:'2026-09-10',createdAt:'2026-09-07 02:00',platformAccount:'Maybank Payout / 9988',paidAt:'—',reference:'—',voucher:'—',operator:'李财务',voidReason:'收款账户配置错误，修复后重新生成',prepaymentBalance:1142.60,sources:[{order:'ORD-MY-20260820-0041',dealAt:'2026-08-20 14:10',winning:2410,originalShare:89.80,refund:'未退款',currentShare:89.80}]}
  ];

  const settlementConfigV2 = {
    site: 'MY',
    timezone: 'Asia/Kuala_Lumpur',
    enabled: true,
    cycle: '月结',
    delayDays: 7,
    generateAt: '02:00',
    paymentDueDays: 3,
    effectiveDate: '2026-08-01',
    lastRun: '2026-09-07 02:00：自动生成成功，3 张结算单'
  };

  const fundLedgerRowsV2 = [
    {id:'FND-20260820-0041-A',order:'ORD-MY-20260820-0041',type:'正式成交',businessAt:'2026-08-20 14:10',winning:2410,seller:2152.40,supplier:89.80,staff:27.80,platform:140,current:117.60,prepayment:-2152.40,receipt:'已收款',settlement:'待生成'},
    {id:'FND-20260820-0041-R',order:'ORD-MY-20260820-0041',type:'退款恢复',businessAt:'2026-08-20 17:50',winning:2410,seller:2152.40,supplier:89.80,staff:27.80,platform:140,current:0,prepayment:2152.40,receipt:'已收款',settlement:'退款后金额已重算'},
    {id:'FND-20260819-0021-A',order:'ORD-MY-20260819-0021',type:'正式成交',businessAt:'2026-08-19 11:08',winning:1980,seller:1701.80,supplier:178.20,staff:24,platform:76,current:202.20,prepayment:-1701.80,receipt:'待收款',settlement:'待生成'},
    {id:'FND-20260818-0017-B',order:'ORD-MY-20260818-0017',type:'资金退回',businessAt:'2026-08-23 16:20',winning:1680,seller:1450,supplier:120,staff:30,platform:80,current:0,prepayment:1450,receipt:'已收款',settlement:'无需结算'}
  ];

  let visiblePrepaymentOrdersV2 = prepaymentDisbursementOrdersV2.slice();
  let visibleRecyclerReceiptsV2 = recyclerReceiptOrdersV2.slice();
  let visibleSettlementsV2 = settlementBillsV2.slice();

  function renderFundsLedgerV2(activeTab) {
    const tab = activeTab || 'details';
    $('#financeLedgerBody').innerHTML =
      '<div class="page-title"><h1>资金台账</h1><div class="page-actions"><button class="btn" data-finance-v2="export-ledger">⇩ 导出当前页签</button></div></div>' +
      '<div class="alert"><span>ⓘ</span><div>资金台账只记录和展示资金事实。成交、退款、预付金与角色分成分别核算；退款不以取货或送达状态为前置条件。</div></div>' +
      '<div class="tabs"><button class="tab ' + (tab === 'details' ? 'active' : '') + '" data-finance-v2="switch-ledger-tab" data-tab="details">资金明细</button><button class="tab ' + (tab === 'prepayment' ? 'active' : '') + '" data-finance-v2="switch-ledger-tab" data-tab="prepayment">门店预付金</button><button class="tab ' + (tab === 'receipts' ? 'active' : '') + '" data-finance-v2="switch-ledger-tab" data-tab="receipts">回收商收款单</button></div>' +
      '<div class="tab-panel ' + (tab === 'details' ? 'active' : '') + '" id="ledgerV2DetailsPanel"></div>' +
      '<div class="tab-panel ' + (tab === 'prepayment' ? 'active' : '') + '" id="ledgerV2PrepaymentPanel"></div>' +
      '<div class="tab-panel ' + (tab === 'receipts' ? 'active' : '') + '" id="ledgerV2ReceiptsPanel"></div>';
    renderFundDetailsPanelV2();
    renderPrepaymentListV2();
    renderRecyclerReceiptListV2();
  }

  function renderFundDetailsPanelV2() {
    $('#ledgerV2DetailsPanel').innerHTML =
      metricCards([['回收商待收', moneyV2(1980)], ['供货商／店员待付', moneyV2(380.40)], ['退款恢复预付金', moneyV2(3602.40)], ['预付金剩余', moneyV2(-428.40)]]) +
      '<div class="card"><div class="card-body"><div class="filters"><div class="field"><label>明细号 / 订单号</label><input class="control" id="fundV2Keyword" placeholder="请输入编号" /></div><div class="field"><label>业务类型</label><select class="control" id="fundV2Type"><option value="">全部</option><option>正式成交</option><option>退款恢复</option><option>资金退回</option></select></div><div class="field"><label>回收商收款状态</label><select class="control" id="fundV2Receipt"><option value="">全部</option><option>待收款</option><option>已收款</option></select></div><div class="filter-actions"><button class="btn" data-finance-v2="reset-ledger">↻ 重置</button><button class="btn primary" data-finance-v2="search-ledger">⌕ 查询</button></div></div></div></div>' +
      '<div class="card"><div class="card-head"><div>逐笔资金明细 <span class="subtle" id="fundV2Summary"></span></div><span class="subtle">退款生效恢复预付金，取消退款反向扣减</span></div><div id="fundV2Result"></div></div>';
    filterFundsLedgerV2();
  }

  function filterFundsLedgerV2() {
    const keyword = ($('#fundV2Keyword') || {}).value || '';
    const type = ($('#fundV2Type') || {}).value || '';
    const receipt = ($('#fundV2Receipt') || {}).value || '';
    const normalized = keyword.trim().toLowerCase();
    const rows = fundLedgerRowsV2.filter(function (row) {
      return (!normalized || (row.id + row.order).toLowerCase().includes(normalized)) &&
        (!type || row.type === type) && (!receipt || row.receipt === receipt);
    });
    $('#fundV2Summary').textContent = '共 ' + rows.length + ' 条';
    $('#fundV2Result').innerHTML = rows.length ?
      '<div class="table-wrap"><table class="table" style="min-width:2100px"><thead><tr><th>资金明细号</th><th>订单号</th><th>业务类型 / 时间</th><th>完整中标价</th><th>卖家应得金额</th><th>供货商分成</th><th>店员分成</th><th>平台分成</th><th>当前应结算金额</th><th>预付金影响</th><th>回收商收款</th><th>结算状态</th></tr></thead><tbody>' + rows.map(function (row) {
        return '<tr><td>' + esc(row.id) + '</td><td>' + esc(row.order) + '</td><td>' + statusTag(row.type) + '<div class="merchant-account">' + esc(row.businessAt) + '</div></td><td class="money">' + moneyV2(row.winning) + '</td><td class="money">' + moneyV2(row.seller) + '</td><td class="money">' + moneyV2(row.supplier) + '</td><td class="money">' + moneyV2(row.staff) + '</td><td class="money">' + moneyV2(row.platform) + '</td><td class="money">' + moneyV2(row.current) + '</td><td class="money ' + (row.prepayment < 0 ? 'negative' : '') + '">' + (row.prepayment > 0 ? '+' : '') + moneyV2(row.prepayment) + '</td><td>' + statusTag(row.receipt) + '</td><td>' + statusTag(row.settlement) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty-compact">没有符合当前条件的资金明细</div>';
  }

  function renderPrepaymentListV2() {
    const downTotal = prepaymentDisbursementOrdersV2.filter(function (order) { return order.type === '下拨'; }).reduce(function (sum, order) { return sum + order.amount; }, 0);
    const returnedTotal = prepaymentDisbursementOrdersV2.filter(function (order) { return order.type === '实际退回'; }).reduce(function (sum, order) { return sum + order.amount; }, 0);
    $('#ledgerV2PrepaymentPanel').innerHTML =
      '<div class="page-actions" style="margin-bottom:16px"><button class="btn" data-finance-v2="export-prepayment">⇩ 导出</button><button class="btn primary" data-finance-v2="create-prepayment">＋ 登记预付金</button></div>' +
      '<div class="alert"><span>ⓘ</span><div>预付金仅用于向卖家支付订单款。操作类型只有“下拨”和“实际退回”；退款恢复与取消退款扣减记录在资金明细中。</div></div>' +
      '<div class="card"><div class="card-head"><div>门店预付金</div><span class="subtle">剩余金额＝预付金金额－已使用金额－已退金额，允许为负数</span></div><div class="table-wrap"><table class="table"><thead><tr><th>门店 / 供货商</th><th>预付金金额</th><th>已使用金额</th><th>剩余金额</th><th>已退金额</th></tr></thead><tbody>' +
      prepaymentSummariesV2.map(function (item) { const remaining = item.prepayment - item.used - item.returned; return '<tr><td>' + esc(item.supplier) + '</td><td class="money">' + moneyV2(item.prepayment) + '</td><td class="money">' + moneyV2(item.used) + '</td><td class="money ' + (remaining < 0 ? 'negative' : '') + '">' + moneyV2(remaining) + '</td><td class="money">' + moneyV2(item.returned) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      metricCards([['累计下拨', moneyV2(downTotal)], ['累计实际退回', moneyV2(returnedTotal)], ['操作记录', prepaymentDisbursementOrdersV2.length + ' 条'], ['异常记录', '0 条']]) +
      '<div class="card"><div class="card-body"><div class="filters"><div class="field"><label>单号 / 供货商</label><input class="control" id="prepaymentV2Keyword" placeholder="请输入单号或供货商" /></div><div class="field"><label>操作类型</label><select class="control" id="prepaymentV2Type"><option value="">全部</option><option>下拨</option><option>实际退回</option></select></div><div class="field"><label>站点</label><select class="control" id="prepaymentV2Site"><option value="">全部</option><option>MY</option></select></div><div class="filter-actions"><button class="btn" data-finance-v2="reset-prepayment">↻ 重置</button><button class="btn primary" data-finance-v2="search-prepayment">⌕ 查询</button></div></div></div></div>' +
      '<div class="card"><div class="card-head"><div>预付金记录 <span class="subtle" id="prepaymentV2Summary"></span></div><span class="subtle">确认后冻结账户、金额、时间和凭证</span></div><div id="prepaymentV2Result"></div></div>';
    filterPrepaymentV2();
  }

  function filterPrepaymentV2() {
    const keyword = ($('#prepaymentV2Keyword') || {}).value || '';
    const type = ($('#prepaymentV2Type') || {}).value || '';
    const site = ($('#prepaymentV2Site') || {}).value || '';
    const normalized = keyword.trim().toLowerCase();
    visiblePrepaymentOrdersV2 = prepaymentDisbursementOrdersV2.filter(function (order) {
      return (!normalized || (order.id + order.supplier).toLowerCase().includes(normalized)) &&
        (!type || order.type === type) && (!site || order.site === site);
    });
    $('#prepaymentV2Summary').textContent = '共 ' + visiblePrepaymentOrdersV2.length + ' 张';
    $('#prepaymentV2Result').innerHTML = visiblePrepaymentOrdersV2.length ?
      '<div class="table-wrap"><table class="table" style="min-width:1750px"><thead><tr><th>记录单号</th><th>操作类型</th><th>供货商</th><th>站点 / 币种</th><th>金额</th><th>平台资金账户</th><th>供货商预付金账户</th><th>实际发生时间</th><th>流水号 / 凭证</th><th>操作人</th><th>操作</th></tr></thead><tbody>' + visiblePrepaymentOrdersV2.map(function (order) {
        return '<tr><td><button class="btn link" data-finance-v2="view-prepayment" data-id="' + esc(order.id) + '">' + esc(order.id) + '</button></td><td>' + statusTag(order.type) + '</td><td>' + esc(order.supplier) + '<div class="merchant-account">' + esc(order.supplierId) + '</div></td><td>' + esc(order.site + ' / ' + order.currency) + '</td><td class="money">' + moneyV2(order.amount, order.currency) + '</td><td>' + esc(order.platformAccount) + '</td><td>' + esc(order.supplierAccount) + '</td><td>' + esc(order.paidAt) + '</td><td>' + esc(order.reference) + '<div class="merchant-account">' + esc(order.voucher) + '</div></td><td>' + esc(order.operator) + '</td><td><button class="btn link" data-finance-v2="view-prepayment" data-id="' + esc(order.id) + '">查看</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty-compact">没有符合条件的预付金记录</div>';
  }

  function renderPrepaymentDetailV2(order) {
    if (!order) return;
    const actualTimeLabel = order.type === '实际退回' ? '实际退回时间' : '实际下拨时间';
    const accountLabel = order.type === '实际退回' ? '平台收款账户' : '平台打款账户';
    $('#prepaymentDisbursementDetailBody').innerHTML =
      '<div class="page-title"><button class="btn" data-finance-v2="back-prepayment">← 返回门店预付金</button><div class="page-actions"><button class="btn" data-finance-v2="export-prepayment-detail" data-id="' + esc(order.id) + '">⇩ 导出</button></div></div>' +
      '<div class="card detail-hero"><div><span class="detail-name">' + esc(order.id) + '</span><span class="detail-tags">' + statusTag(order.type) + statusTag(order.status) + '</span><div class="detail-meta">' + esc(order.site + ' · ' + order.supplier + ' · ' + order.currency) + '</div></div></div>' +
      metricCards([['金额', moneyV2(order.amount, order.currency)], ['操作类型', order.type], ['实际发生时间', order.paidAt], ['登记结果', order.status]]) +
      '<div class="section-grid"><div class="card"><div class="card-head"><h3 class="section-title">资金与账户快照</h3></div><div class="card-body">' + [['供货商',order.supplier],[accountLabel,order.platformAccount],['供货商预付金账户',order.supplierAccount],['币种',order.currency],['金额',moneyV2(order.amount,order.currency)]].map(function (item) { return '<div class="desc"><span class="desc-label">' + esc(item[0]) + '</span><span>' + esc(item[1]) + '</span></div>'; }).join('') + '</div></div><div class="card"><div class="card-head"><h3 class="section-title">线下资金事实</h3></div><div class="card-body">' + [[actualTimeLabel,order.paidAt],['资金流水号',order.reference],['资金凭证',order.voucher],['操作人',order.operator],['记录状态','确认后只读']].map(function (item) { return '<div class="desc"><span class="desc-label">' + esc(item[0]) + '</span><span>' + esc(item[1]) + '</span></div>'; }).join('') + '</div></div></div>' +
      '<div class="card"><div class="card-head"><h3 class="section-title">审计记录</h3></div><div class="card-body timeline"><div class="event"><b>登记' + esc(order.type) + '并更新预付金余额</b><div class="event-time">' + esc(order.paidAt + ' · ' + order.operator) + '</div></div></div></div>';
    setView('prepaymentDisbursementDetail');
  }

  function openPrepaymentCreateV2() {
    const accounts = platformFundAccounts.filter(function (account) { return account.status === '启用'; });
    if (!accounts.length) { toast('没有可用的平台资金账户，请先维护平台资金账户。'); return; }
    openBusinessModal('登记预付金',
      '<div class="alert"><span>ⓘ</span><div>仅登记已真实发生的资金事实：下拨增加预付金，实际退回减少预付金并计入已退金额。</div></div><div class="form-grid"><div class="field"><label>操作类型 *</label><select class="control" id="prepaymentV2CreateType"><option>下拨</option><option>实际退回</option></select></div><div class="field"><label>供货商 *</label><select class="control" id="prepaymentV2Supplier"><option value="M1002">Siti Nur</option><option value="M1003">Lim Wei Jian</option><option value="M1006">AR Mobile Sdn Bhd</option></select></div><div class="field span-2"><label>平台资金账户 *</label><select class="control" id="prepaymentV2PlatformAccount">' + accountOptionsV2(accounts, accounts.find(function (account) { return account.isDefault; })?.id) + '</select></div><div class="field"><label>金额 *</label><input class="control" id="prepaymentV2Amount" type="number" min="0.01" placeholder="请输入金额" /></div><div class="field"><label>实际发生时间 *</label><input class="control" id="prepaymentV2PaidAt" value="2026-09-01 14:00" /></div><div class="field"><label>资金流水号 *</label><input class="control" id="prepaymentV2Reference" placeholder="请输入银行流水号" /></div><div class="field"><label>资金凭证 *</label><input class="control" id="prepaymentV2Voucher" placeholder="请输入凭证编号或文件名" /></div></div>',
      '保存', function () {
        const amount = Number($('#prepaymentV2Amount').value);
        const supplierId = $('#prepaymentV2Supplier').value;
        const supplierName = $('#prepaymentV2Supplier').selectedOptions[0].textContent;
        const account = platformFundAccounts.find(function (item) { return item.id === $('#prepaymentV2PlatformAccount').value; });
        const reference = $('#prepaymentV2Reference').value.trim();
        const voucher = $('#prepaymentV2Voucher').value.trim();
        if (!(amount > 0) || !reference || !voucher) { modalError('请完整填写金额、流水号和付款凭证。'); return; }
        const operationType = $('#prepaymentV2CreateType').value;
        prepaymentDisbursementOrdersV2.unshift({id:'PPR-MY-20260901-' + String(prepaymentDisbursementOrdersV2.length + 1).padStart(3,'0'),site:'MY',supplier:supplierName,supplierId:supplierId,type:operationType,currency:'MYR',amount:amount,platformAccount:account.accountName + ' / ' + account.accountNumber.slice(-4),supplierAccount:supplierName + ' 预付金账户',paidAt:$('#prepaymentV2PaidAt').value,reference:reference,voucher:voucher,operator:'贾瑞真',status:'已生效'});
        const summary = prepaymentSummariesV2.find(function (item) { return item.supplierId === supplierId; });
        if (summary) {
          if (operationType === '下拨') summary.prepayment += amount;
          if (operationType === '实际退回') summary.returned += amount;
        }
        closeModals(); renderFundsLedgerV2('prepayment'); toast('预付金' + operationType + '已登记，汇总金额已更新。');
      }, 'primary');
  }

  function renderRecyclerReceiptListV2() {
    const pending = recyclerReceiptOrdersV2.filter(function (order) { return order.status === '待收款'; });
    const received = recyclerReceiptOrdersV2.filter(function (order) { return order.status === '已收款'; });
    $('#ledgerV2ReceiptsPanel').innerHTML =
      '<div class="page-actions" style="margin-bottom:16px"><button class="btn" data-finance-v2="export-recycler-receipts">⇩ 导出</button></div>' +
      '<div class="alert"><span>ⓘ</span><div>成交后系统按订单生成回收商收款单，应收金额为完整中标价。财务仅在线下款项真实到账后标记已收款；确认后记录只读保留。</div></div>' +
      metricCards([['待收款单据', pending.length + ' 张'], ['待收金额', moneyV2(pending.reduce(function (sum, order) { return sum + order.amount; }, 0))], ['已收款单据', received.length + ' 张'], ['已收金额', moneyV2(received.reduce(function (sum, order) { return sum + order.amount; }, 0))]]) +
      '<div class="card"><div class="card-body"><div class="filters"><div class="field"><label>收款单号 / 订单号 / 回收商</label><input class="control" id="receiptV2Keyword" placeholder="请输入关键词" /></div><div class="field"><label>状态</label><select class="control" id="receiptV2Status"><option value="">全部</option><option>待收款</option><option>已收款</option><option>已作废</option></select></div><div class="field"><label>站点</label><select class="control" id="receiptV2Site"><option value="">全部</option><option>MY</option></select></div><div class="filter-actions"><button class="btn" data-finance-v2="reset-receipts">↻ 重置</button><button class="btn primary" data-finance-v2="search-receipts">⌕ 查询</button></div></div></div></div>' +
      '<div class="card"><div class="card-head"><div>收款单列表 <span class="subtle" id="receiptV2Summary"></span></div><span class="subtle">未收款且整单生成错误时可作废</span></div><div id="receiptV2Result"></div></div>';
    filterRecyclerReceiptsV2();
  }

  function filterRecyclerReceiptsV2() {
    const keyword = ($('#receiptV2Keyword') || {}).value || '';
    const status = ($('#receiptV2Status') || {}).value || '';
    const site = ($('#receiptV2Site') || {}).value || '';
    const normalized = keyword.trim().toLowerCase();
    visibleRecyclerReceiptsV2 = recyclerReceiptOrdersV2.filter(function (order) {
      return (!normalized || (order.id + order.order + order.recycler).toLowerCase().includes(normalized)) &&
        (!status || order.status === status) && (!site || order.site === site);
    });
    $('#receiptV2Summary').textContent = '共 ' + visibleRecyclerReceiptsV2.length + ' 张';
    $('#receiptV2Result').innerHTML = visibleRecyclerReceiptsV2.length ?
      '<div class="table-wrap"><table class="table" style="min-width:1850px"><thead><tr><th>收款单号</th><th>订单号</th><th>回收商</th><th>站点 / 币种</th><th>应收金额</th><th>平台收款账户</th><th>创建时间</th><th>实际到账时间</th><th>流水号 / 凭证</th><th>状态</th><th>操作</th></tr></thead><tbody>' + visibleRecyclerReceiptsV2.map(function (order) {
        const action = order.status === '待收款' ? '<button class="btn primary" data-finance-v2="mark-recycler-received" data-id="' + esc(order.id) + '">标记已收款</button><button class="btn link danger-link" data-finance-v2="void-recycler-receipt" data-id="' + esc(order.id) + '">作废</button>' : '';
        return '<tr><td><button class="btn link" data-finance-v2="view-recycler-receipt" data-id="' + esc(order.id) + '">' + esc(order.id) + '</button></td><td>' + esc(order.order) + '</td><td>' + esc(order.recycler) + '</td><td>' + esc(order.site + ' / ' + order.currency) + '</td><td class="money">' + moneyV2(order.amount, order.currency) + '</td><td>' + esc(order.platformAccount) + '</td><td>' + esc(order.createdAt) + '</td><td>' + esc(order.receivedAt) + '</td><td>' + esc(order.reference) + '<div class="merchant-account">' + esc(order.voucher) + '</div></td><td>' + statusTag(order.status) + '</td><td><div class="inline-actions"><button class="btn link" data-finance-v2="view-recycler-receipt" data-id="' + esc(order.id) + '">查看</button>' + action + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty-compact">没有符合条件的回收商收款单</div>';
  }

  function renderRecyclerReceiptDetailV2(order) {
    if (!order) return;
    const action = order.status === '待收款' ? '<button class="btn primary" data-finance-v2="mark-recycler-received" data-id="' + esc(order.id) + '">标记已收款</button><button class="btn danger" data-finance-v2="void-recycler-receipt" data-id="' + esc(order.id) + '">作废</button>' : '';
    $('#recyclerReceiptDetailBody').innerHTML =
      '<div class="page-title"><button class="btn" data-finance-v2="back-recycler-receipts">← 返回回收商收款单</button><div class="page-actions"><button class="btn" data-finance-v2="export-recycler-detail" data-id="' + esc(order.id) + '">⇩ 导出</button>' + action + '</div></div>' +
      '<div class="card detail-hero"><div><span class="detail-name">' + esc(order.id) + '</span><span class="detail-tags">' + statusTag(order.status) + '</span><div class="detail-meta">' + esc(order.order + ' · ' + order.recycler + ' · ' + order.currency) + '</div></div></div>' +
      metricCards([['应收金额', moneyV2(order.amount, order.currency)], ['收款状态', order.status], ['实际到账时间', order.receivedAt], ['关联订单', order.order]]) +
      (order.status === '已作废' ? '<div class="alert warning"><span>!</span><div><b>收款单已作废</b><br>' + esc(order.voidReason) + '</div></div>' : '') +
      '<div class="section-grid"><div class="card"><div class="card-head"><h3 class="section-title">应收关系</h3></div><div class="card-body">' + [['付款主体',order.recycler],['收款主体','FoneSquare Malaysia Sdn Bhd'],['应收金额',moneyV2(order.amount,order.currency)],['回收商账户',order.recyclerAccount],['平台默认收款账户',order.platformAccount]].map(function (item) { return '<div class="desc"><span class="desc-label">' + esc(item[0]) + '</span><span>' + esc(item[1]) + '</span></div>'; }).join('') + '</div></div><div class="card"><div class="card-head"><h3 class="section-title">实际到账记录</h3></div><div class="card-body">' + [['实际到账时间',order.receivedAt],['实际到账金额',order.status === '已收款' ? moneyV2(order.amount,order.currency) : '—'],['银行流水号',order.reference],['到账凭证',order.voucher],['操作人',order.operator]].map(function (item) { return '<div class="desc"><span class="desc-label">' + esc(item[0]) + '</span><span>' + esc(item[1]) + '</span></div>'; }).join('') + '</div></div></div>' +
      '<div class="card"><div class="card-head"><h3 class="section-title">审计记录</h3></div><div class="card-body timeline"><div class="event"><b>系统生成收款单</b><div class="event-time">' + esc(order.createdAt) + ' · 系统任务</div></div>' + (order.status === '已收款' ? '<div class="event"><b>标记已收款并冻结到账快照</b><div class="event-time">' + esc(order.receivedAt + ' · ' + order.operator) + '</div></div>' : '') + (order.status === '已作废' ? '<div class="event"><b>作废：' + esc(order.voidReason) + '</b><div class="event-time">2026-08-18 17:00 · ' + esc(order.operator) + '</div></div>' : '') + '</div></div>';
    setView('recyclerReceiptDetail');
  }

  function openRecyclerReceiveV2(order) {
    const accounts = receiptAccountsV2();
    if (!accounts.length) { toast('没有可用的平台收款账户，请先维护平台资金账户。'); return; }
    openBusinessModal('标记已收款',
      '<div class="alert"><span>ⓘ</span><div>仅在线下款项真实到账后确认。当前不支持部分收款，实际到账金额必须等于完整中标价。</div></div><div class="form-grid"><div class="field span-2"><label>平台实际收款账户 *</label><select class="control" id="receiptV2PlatformAccount">' + accountOptionsV2(accounts, accounts.find(function (account) { return account.isDefault; })?.id) + '</select></div><div class="field"><label>实际到账金额 *</label><input class="control readonly" id="receiptV2ActualAmount" value="' + order.amount + '" readonly /></div><div class="field"><label>实际到账时间 *</label><input class="control" id="receiptV2ReceivedAt" value="2026-09-01 14:20" /></div><div class="field"><label>银行流水号 *</label><input class="control" id="receiptV2Reference" placeholder="请输入银行流水号" /></div><div class="field"><label>到账凭证 *</label><input class="control" id="receiptV2Voucher" placeholder="请输入凭证编号或文件名" /></div></div>',
      '确认已收款', function () {
        const reference = $('#receiptV2Reference').value.trim();
        const voucher = $('#receiptV2Voucher').value.trim();
        if (!reference || !voucher) { modalError('请填写银行流水号和到账凭证。'); return; }
        const account = platformFundAccounts.find(function (item) { return item.id === $('#receiptV2PlatformAccount').value; });
        Object.assign(order,{status:'已收款',platformAccount:account.accountName + ' / ' + account.accountNumber.slice(-4),receivedAt:$('#receiptV2ReceivedAt').value,reference:reference,voucher:voucher,operator:'贾瑞真'});
        closeModals(); renderFundsLedgerV2('receipts'); toast('已标记收款，到账记录已冻结。');
      }, 'primary');
  }

  function openRecyclerVoidV2(order) {
    if (order.status !== '待收款') return;
    openBusinessModal('作废回收商收款单', '<div class="alert warning"><span>!</span><div>仅当收款单整体生成错误且尚未实际收款时可以作废。原单据和原因将永久保留。</div></div><div class="field"><label>作废原因 *</label><textarea class="control" id="receiptV2VoidReason" placeholder="请说明整单生成错误的原因"></textarea></div>', '确认作废', function () {
      const reason = $('#receiptV2VoidReason').value.trim();
      if (!reason) { modalError('请填写作废原因。'); return; }
      order.status = '已作废'; order.voidReason = reason; order.operator = '贾瑞真';
      closeModals(); renderFundsLedgerV2('receipts'); toast('回收商收款单已作废。');
    }, 'danger');
  }

  function renderSettlementListV2() {
    const pending = settlementBillsV2.filter(function (bill) { return bill.status === '待付款'; });
    const paid = settlementBillsV2.filter(function (bill) { return bill.status === '已付款'; });
    $('#settlementBillBody').innerHTML =
      '<div class="page-title"><h1>结算单</h1><div class="page-actions"><button class="btn" data-finance-v2="export-settlements">⇩ 导出</button></div></div>' +
      '<div class="alert"><span>ⓘ</span><div>结算单由系统按配置自动生成并直接进入待付款，不提供草稿或手工创建。纳入范围按成交时间及生成时最新退款结果判断，不使用取货或送达状态。</div></div>' +
      metricCards([['待付款单据', pending.length + ' 张'], ['待付款金额', moneyV2(pending.reduce(function (sum, bill) { return sum + bill.amount; }, 0))], ['已付款单据', paid.length + ' 张'], ['已付款金额', moneyV2(paid.reduce(function (sum, bill) { return sum + bill.amount; }, 0))]]) +
      '<div class="card"><div class="card-body"><div class="filters"><div class="field"><label>结算单号 / 收款主体</label><input class="control" id="settlementV2Keyword" placeholder="请输入关键词" /></div><div class="field"><label>结算单类型</label><select class="control" id="settlementV2Type"><option value="">全部</option><option>供货商结算单</option><option>店员结算单</option></select></div><div class="field"><label>状态</label><select class="control" id="settlementV2Status"><option value="">全部</option><option>待付款</option><option>已付款</option><option>已作废</option></select></div><div class="filter-actions"><button class="btn" data-finance-v2="reset-settlements">↻ 重置</button><button class="btn primary" data-finance-v2="search-settlements">⌕ 查询</button></div></div></div></div>' +
      '<div class="card"><div class="card-head"><div>结算单列表 <span class="subtle" id="settlementV2Summary"></span></div><span class="subtle">待付款时锁定来源订单退款；已付款后永久关闭退款</span></div><div id="settlementV2Result"></div></div>';
    filterSettlementsV2();
  }

  function filterSettlementsV2() {
    const keyword = ($('#settlementV2Keyword') || {}).value || '';
    const type = ($('#settlementV2Type') || {}).value || '';
    const status = ($('#settlementV2Status') || {}).value || '';
    const normalized = keyword.trim().toLowerCase();
    visibleSettlementsV2 = settlementBillsV2.filter(function (bill) {
      return (!normalized || (bill.id + bill.payee).toLowerCase().includes(normalized)) &&
        (!type || bill.type === type) && (!status || bill.status === status);
    });
    $('#settlementV2Summary').textContent = '共 ' + visibleSettlementsV2.length + ' 张';
    $('#settlementV2Result').innerHTML = visibleSettlementsV2.length ?
      '<div class="table-wrap"><table class="table" style="min-width:1800px"><thead><tr><th>结算单号</th><th>结算周期</th><th>结算单类型</th><th>收款主体</th><th>收款账户</th><th>结算金额</th><th>期末预付金余额</th><th>生成时间</th><th>付款截止日期</th><th>状态</th><th>操作</th></tr></thead><tbody>' + visibleSettlementsV2.map(function (bill) {
        const action = bill.status === '待付款' ? '<button class="btn primary" data-finance-v2="mark-settlement-paid-v2" data-id="' + esc(bill.id) + '">标记已付款</button><button class="btn link danger-link" data-finance-v2="void-settlement-v2" data-id="' + esc(bill.id) + '">作废</button>' : '';
        return '<tr><td><button class="btn link" data-finance-v2="view-settlement-v2" data-id="' + esc(bill.id) + '">' + esc(bill.id) + '</button></td><td>' + esc(bill.period) + '</td><td>' + statusTag(bill.type) + '</td><td>' + esc(bill.payee) + '</td><td>' + esc(bill.payeeAccount) + '</td><td class="money">' + moneyV2(bill.amount,bill.currency) + '</td><td class="money ' + (bill.prepaymentBalance < 0 ? 'negative' : '') + '">' + (bill.prepaymentBalance == null ? '—' : moneyV2(bill.prepaymentBalance,bill.currency)) + '</td><td>' + esc(bill.createdAt) + '</td><td>' + esc(bill.deadline) + '</td><td>' + statusTag(bill.status) + '</td><td><div class="inline-actions"><button class="btn link" data-finance-v2="view-settlement-v2" data-id="' + esc(bill.id) + '">查看</button>' + action + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty-compact">没有符合条件的结算单</div>';
  }

  function renderSettlementDetailV2(bill) {
    if (!bill) return;
    const action = bill.status === '待付款' ? '<button class="btn primary" data-finance-v2="mark-settlement-paid-v2" data-id="' + esc(bill.id) + '">标记已付款</button><button class="btn danger" data-finance-v2="void-settlement-v2" data-id="' + esc(bill.id) + '">作废</button>' : '';
    $('#settlementBillDetailBody').innerHTML =
      '<div class="page-title"><button class="btn" data-finance-v2="back-settlements">← 返回结算单</button><div class="page-actions"><button class="btn" data-finance-v2="export-settlement-detail-v2" data-id="' + esc(bill.id) + '">⇩ 导出</button>' + action + '</div></div>' +
      '<div class="card detail-hero"><div><span class="detail-name">' + esc(bill.id) + '</span><span class="detail-tags">' + statusTag(bill.type) + statusTag(bill.status) + '</span><div class="detail-meta">' + esc(bill.period + ' · ' + bill.payee + ' · ' + bill.currency) + '</div></div></div>' +
      metricCards([['结算金额',moneyV2(bill.amount,bill.currency)],['来源订单',bill.sources.length + ' 笔'],['付款截止日期',bill.deadline],['结算单状态',bill.status]]) +
      (bill.status === '已作废' ? '<div class="alert warning"><span>!</span><div><b>结算单已作废</b><br>' + esc(bill.voidReason) + '。原单不可恢复或付款，来源订单在未进入替换单时恢复待结算。</div></div>' : '') +
      '<div class="section-grid"><div class="card"><div class="card-head"><h3 class="section-title">结算与账户快照</h3></div><div class="card-body">' + [['结算周期',bill.period],['结算单类型',bill.type],['付款主体','FoneSquare Malaysia Sdn Bhd'],['收款主体',bill.payee],['收款账户',bill.payeeAccount],['平台打款账户',bill.platformAccount]].map(function (item) { return '<div class="desc"><span class="desc-label">' + esc(item[0]) + '</span><span>' + esc(item[1]) + '</span></div>'; }).join('') + '</div></div><div class="card"><div class="card-head"><h3 class="section-title">实际付款记录</h3><span class="subtle">确认后作为不可变事实只读保留</span></div><div class="card-body">' + [['付款状态',bill.status],['实际付款金额',bill.status === '已付款' ? moneyV2(bill.amount,bill.currency) : '—'],['付款时间',bill.paidAt],['银行流水号',bill.reference],['付款凭证',bill.voucher],['操作人',bill.operator]].map(function (item) { return '<div class="desc"><span class="desc-label">' + esc(item[0]) + '</span><span>' + esc(item[1]) + '</span></div>'; }).join('') + '</div></div></div>' +
      '<div class="card"><div class="card-head"><div>来源订单与退款快照 <span class="subtle">' + bill.sources.length + ' 笔</span></div><span class="subtle">按成交时间归属周期；生成时按有效退款重算</span></div><div class="table-wrap"><table class="table"><thead><tr><th>订单号</th><th>成交时间</th><th>完整中标价</th><th>原分成金额</th><th>生成时退款状态</th><th>当前应结算金额</th></tr></thead><tbody>' + bill.sources.map(function (source) { return '<tr><td>' + esc(source.order) + '</td><td>' + esc(source.dealAt) + '</td><td class="money">' + moneyV2(source.winning,bill.currency) + '</td><td class="money">' + moneyV2(source.originalShare,bill.currency) + '</td><td>' + statusTag(source.refund) + '</td><td class="money">' + moneyV2(source.currentShare,bill.currency) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-head"><h3 class="section-title">审计记录</h3></div><div class="card-body timeline"><div class="event"><b>系统自动生成结算单并锁定来源订单退款</b><div class="event-time">' + esc(bill.createdAt) + ' · 结算任务</div></div>' + (bill.status === '已付款' ? '<div class="event"><b>标记已付款并冻结付款快照</b><div class="event-time">' + esc(bill.paidAt + ' · ' + bill.operator) + '</div></div>' : '') + (bill.status === '已作废' ? '<div class="event"><b>作废：' + esc(bill.voidReason) + '</b><div class="event-time">2026-09-07 10:20 · ' + esc(bill.operator) + '</div></div>' : '') + '</div></div>';
    setView('settlementBillDetail');
  }

  function openSettlementPaidV2(bill) {
    const accounts = payoutAccountsV2();
    if (!accounts.length) { toast('没有可用的平台打款账户，请先维护平台资金账户。'); return; }
    openBusinessModal('标记已付款', '<div class="alert"><span>ⓘ</span><div>仅在线下打款真实完成后确认。当前不支持部分付款；确认后付款记录只读保留，不支持修改或重新付款，来源订单永久关闭退款。</div></div><div class="form-grid"><div class="field span-2"><label>平台实际打款账户 *</label><select class="control" id="settlementV2PlatformAccount">' + accountOptionsV2(accounts, accounts.find(function (account) { return account.isDefault; })?.id) + '</select></div><div class="field"><label>实际付款金额 *</label><input class="control readonly" value="' + bill.amount + '" readonly /></div><div class="field"><label>实际付款时间 *</label><input class="control" id="settlementV2PaidAt" value="2026-09-08 11:00" /></div><div class="field"><label>银行流水号 *</label><input class="control" id="settlementV2Reference" placeholder="请输入银行流水号" /></div><div class="field"><label>付款凭证 *</label><input class="control" id="settlementV2Voucher" placeholder="请输入凭证编号或文件名" /></div></div>', '确认已付款', function () {
      const reference = $('#settlementV2Reference').value.trim();
      const voucher = $('#settlementV2Voucher').value.trim();
      if (!reference || !voucher) { modalError('请填写银行流水号和付款凭证。'); return; }
      const account = platformFundAccounts.find(function (item) { return item.id === $('#settlementV2PlatformAccount').value; });
      Object.assign(bill,{status:'已付款',platformAccount:account.accountName + ' / ' + account.accountNumber.slice(-4),paidAt:$('#settlementV2PaidAt').value,reference:reference,voucher:voucher,operator:'贾瑞真'});
      closeModals(); renderSettlementListV2(); toast('结算单已付款，付款记录已冻结。');
    }, 'primary');
  }

  function openSettlementVoidV2(bill) {
    if (bill.status !== '待付款') return;
    openBusinessModal('作废结算单', '<div class="alert warning"><span>!</span><div>仅当待付款结算单整体生成错误时可以作废。作废不回滚成交、退款或预付金流水；修复数据后由系统生成关联的新结算单。</div></div><div class="field"><label>作废原因 *</label><textarea class="control" id="settlementV2VoidReason" placeholder="请说明整单生成错误的原因"></textarea></div>', '确认作废', function () {
      const reason = $('#settlementV2VoidReason').value.trim();
      if (!reason) { modalError('请填写作废原因。'); return; }
      bill.status = '已作废'; bill.voidReason = reason; bill.operator = '贾瑞真';
      closeModals(); renderSettlementListV2(); toast('结算单已作废，来源订单已释放。');
    }, 'danger');
  }

  function settlementPeriodRuleV2() {
    return settlementConfigV2.cycle === '半月结' ? '每月 1–15 日、16 日–月末' : '每月 1 日–月末';
  }

  function nextSettlementRunV2() {
    const periodEnd = settlementConfigV2.cycle === '半月结' ? new Date(Date.UTC(2026, 8, 15)) : new Date(Date.UTC(2026, 7, 31));
    periodEnd.setUTCDate(periodEnd.getUTCDate() + Number(settlementConfigV2.delayDays));
    return periodEnd.getUTCFullYear() + '-' + String(periodEnd.getUTCMonth() + 1).padStart(2,'0') + '-' + String(periodEnd.getUTCDate()).padStart(2,'0') + ' ' + settlementConfigV2.generateAt;
  }

  function renderSettlementConfigV2() {
    $('#settlementConfigBody').innerHTML =
      '<div class="page-title"><h1>结算配置</h1><div class="page-actions"><button class="btn" data-finance-v2="run-settlement-preview-v2">运行结算预览</button><button class="btn" data-finance-v2="rerun-settlement-v2">补跑自动任务</button><button class="btn primary" data-finance-v2="edit-settlement-config-v2">编辑配置</button></div></div>' +
      '<div class="alert"><span>ⓘ</span><div>系统在结算周期结束后等待配置的自然日天数，再按生成时刻自动建单。延迟期用于等待业务状态稳定，但纳入资格不读取取货或送达状态。</div></div>' +
      '<div class="card"><div class="card-head"><div>站点结算配置</div><span class="subtle">同一站点同一时刻仅一条配置生效</span></div><div class="card-body">' + [['站点',settlementConfigV2.site],['结算周期',settlementConfigV2.cycle],['周期规则',settlementPeriodRuleV2()],['生成延迟天数',settlementConfigV2.delayDays + ' 个自然日（≥ 1）'],['生成时刻',settlementConfigV2.generateAt + '（站点时区）'],['生成日期公式','周期最后一个自然日＋生成延迟天数'],['付款截止天数',settlementConfigV2.paymentDueDays + ' 个自然日'],['站点时区',settlementConfigV2.timezone],['启用状态',settlementConfigV2.enabled ? '开启' : '停用'],['生效日期',settlementConfigV2.effectiveDate],['下次生成时间',settlementConfigV2.enabled ? nextSettlementRunV2() : '—（已停用）'],['最近执行结果',settlementConfigV2.lastRun]].map(function (item) { return '<div class="desc"><span class="desc-label">' + esc(item[0]) + '</span><span>' + esc(item[1]) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="card"><div class="card-head"><div>生成日期示例</div><span class="subtle">生成时刻均为站点时区 02:00</span></div><div class="card-body">' + [['月结：2026-08','2026-08-31 ＋ 7 天 ＝ 2026-09-07 02:00'],['半月结：2026-09-01～15','2026-09-15 ＋ 7 天 ＝ 2026-09-22 02:00'],['半月结：2026-09-16～30','2026-09-30 ＋ 7 天 ＝ 2026-10-07 02:00']].map(function (item) { return '<div class="desc"><span class="desc-label">' + esc(item[0]) + '</span><span>' + esc(item[1]) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="card"><div class="card-head"><div>自动纳入规则</div><span class="subtle">以成交及资金状态为准</span></div><div class="card-body"><div class="relation-strip"><div class="relation-node"><b>① 周期归属</b><div class="merchant-account">成交时间位于结算周期</div></div><div class="relation-arrow">→</div><div class="relation-node"><b>② 生成时重算</b><div class="merchant-account">读取最新有效退款结果</div></div><div class="relation-arrow">→</div><div class="relation-node"><b>③ 资格校验</b><div class="merchant-account">回收商全额到账 · 无争议 · 未重复纳入</div></div><div class="relation-arrow">→</div><div class="relation-node"><b>④ 自动建单</b><div class="merchant-account">直接待付款并锁定退款</div></div></div><div class="audit-note" style="margin-top:12px"><b>不参与资格判断：</b>取货状态、送达状态。退款处理中或账户异常的订单保留在原周期，问题解决后通过受控补跑生成。</div></div></div>';
  }

  function openSettlementConfigV2() {
    openBusinessModal('编辑结算配置',
      '<div class="alert"><span>ⓘ</span><div>修改只影响尚未开始的结算周期；已生成结算单继续使用原配置快照。</div></div><div class="form-grid"><div class="field"><label>结算周期 *</label><select class="control" id="settlementConfigV2Cycle"><option ' + (settlementConfigV2.cycle === '半月结' ? 'selected' : '') + '>半月结</option><option ' + (settlementConfigV2.cycle === '月结' ? 'selected' : '') + '>月结</option></select></div><div class="field"><label>启用状态 *</label><select class="control" id="settlementConfigV2Enabled"><option value="true" ' + (settlementConfigV2.enabled ? 'selected' : '') + '>开启</option><option value="false" ' + (!settlementConfigV2.enabled ? 'selected' : '') + '>停用</option></select></div><div class="field"><label>生成延迟天数 *</label><input class="control" id="settlementConfigV2Delay" type="number" min="1" max="31" value="' + settlementConfigV2.delayDays + '" /></div><div class="field"><label>生成时刻 *</label><input class="control" id="settlementConfigV2Time" type="time" value="' + settlementConfigV2.generateAt + '" /></div><div class="field"><label>付款截止天数 *</label><input class="control" id="settlementConfigV2Due" type="number" min="1" max="30" value="' + settlementConfigV2.paymentDueDays + '" /></div><div class="field"><label>站点时区 *</label><input class="control readonly" value="' + esc(settlementConfigV2.timezone) + '" readonly /></div><div class="field span-2"><label>生效日期 *</label><input class="control" id="settlementConfigV2Effective" type="date" value="' + settlementConfigV2.effectiveDate + '" /></div></div>',
      '保存', function () {
        const delay = Number($('#settlementConfigV2Delay').value);
        const due = Number($('#settlementConfigV2Due').value);
        if (!Number.isInteger(delay) || delay < 1 || delay > 31 || !Number.isInteger(due) || due < 1 || due > 30) { modalError('生成延迟天数须为 1–31，付款截止天数须为 1–30。'); return; }
        Object.assign(settlementConfigV2,{cycle:$('#settlementConfigV2Cycle').value,enabled:$('#settlementConfigV2Enabled').value === 'true',delayDays:delay,generateAt:$('#settlementConfigV2Time').value,paymentDueDays:due,effectiveDate:$('#settlementConfigV2Effective').value});
        closeModals(); renderSettlementConfigV2(); toast('结算配置已保存，仅影响后续周期。');
      }, 'primary');
  }

  function openSettlementPreviewV2() {
    openBusinessModal('结算预览',
      '<div class="alert success"><span>✓</span><div><b>预览完成：3 张待付款结算单候选</b><br>按成交时间归属 2026-08 月结，并读取 2026-09-07 02:00 的最新退款结果。</div></div>' +
      metricCards([['扫描成交订单','4 笔'],['符合资格订单','2 笔'],['退款后金额重算','1 笔'],['暂缓纳入','1 笔']]) +
      '<div class="table-wrap"><table class="table"><thead><tr><th>订单号</th><th>成交时间</th><th>退款状态</th><th>回收商收款</th><th>预览结果</th><th>原因</th></tr></thead><tbody><tr><td>ORD-MY-20260820-0041</td><td>2026-08-20 14:10</td><td>未退款</td><td>已收款</td><td><span class="tag green">纳入</span></td><td>符合全部资格</td></tr><tr><td>ORD-MY-20260819-0021</td><td>2026-08-19 11:08</td><td>未退款</td><td>已收款</td><td><span class="tag green">纳入</span></td><td>符合全部资格</td></tr><tr><td>ORD-MY-20260819-0028</td><td>2026-08-19 16:35</td><td>退款已生效</td><td>已收款</td><td><span class="tag blue">金额重算</span></td><td>按退款后的当前应结算金额计算</td></tr><tr><td>ORD-MY-20260819-0032</td><td>2026-08-19 18:40</td><td>未退款</td><td>待收款</td><td><span class="tag orange">暂缓</span></td><td>回收商款未全额到账</td></tr></tbody></table></div><div class="audit-note" style="margin-top:12px">预览不落库、不锁定退款、不生成空结算单；列表不展示取货或送达条件。</div>',
      '关闭', function () { closeModals(); }, 'primary');
  }

  function exportFinanceV2(name) {
    toast(name + '导出任务已提交（原型演示）。');
  }

  Object.assign(I18N_EXACT, {
    '预付金记录详情':'Prepayment Record Details','回收商收款单详情':'Recycler Receipt Details','资金明细':'Fund Details','门店预付金':'Store Prepayment','回收商收款单':'Recycler Receipt Orders','登记预付金':'Record Prepayment','预付金金额':'Prepayment Amount','已使用金额':'Used Amount','剩余金额':'Remaining Amount','已退金额':'Returned Amount','实际退回':'Actual Return','预付金记录':'Prepayment Records','实际发生时间':'Actual Time','供货商预付金账户':'Supplier Prepayment Account','收款单列表':'Receipt Orders','应收金额':'Amount Receivable','实际到账时间':'Actual Receipt Time','到账凭证':'Receipt Evidence','作废':'Void','已作废':'Voided','待付款':'Pending Payment','已付款':'Paid','付款截止日期':'Payment Due Date','生成延迟天数':'Generation Delay Days','生成时刻':'Generation Time','生成日期公式':'Generation Date Formula','付款截止天数':'Payment Due Days','自动纳入规则':'Automatic Inclusion Rules','运行结算预览':'Preview Settlement Run','退款后金额重算':'Recalculated After Refund','当前应结算金额':'Current Settlement Amount','资金台账只记录和展示资金事实。成交、退款、预付金与角色分成分别核算；退款不以取货或送达状态为前置条件。':'The fund ledger records financial facts only. Transactions, refunds, prepayments, and revenue shares are calculated separately; refunds do not depend on pickup or delivery status.'
  });

  renderFinanceLedger = renderFundsLedgerV2;
  renderSettlementBillList = renderSettlementListV2;
  renderSettlementBillDetail = renderSettlementDetailV2;
  renderSettlementConfig = renderSettlementConfigV2;
  document.addEventListener('click', function (event) {
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      if (nav.dataset.nav === 'financeLedger') { renderFundsLedgerV2(); setView('financeLedger'); }
      if (nav.dataset.nav === 'settlementBill') { renderSettlementListV2(); setView('settlementBill'); }
      if (nav.dataset.nav === 'settlementConfig') { renderSettlementConfigV2(); setView('settlementConfig'); }
    }
    const target = event.target.closest('[data-finance-v2]');
    if (!target) return;
    const action = target.dataset.financeV2;
    const id = target.dataset.id;
    const prepayment = prepaymentDisbursementOrdersV2.find(function (order) { return order.id === id; });
    const receipt = recyclerReceiptOrdersV2.find(function (order) { return order.id === id; });
    const settlement = settlementBillsV2.find(function (bill) { return bill.id === id; });
    if (action === 'switch-ledger-tab') { renderFundsLedgerV2(target.dataset.tab); }
    if (action === 'search-ledger') filterFundsLedgerV2();
    if (action === 'reset-ledger') { $('#fundV2Keyword').value=''; $('#fundV2Type').value=''; $('#fundV2Receipt').value=''; filterFundsLedgerV2(); }
    if (action === 'search-prepayment') filterPrepaymentV2();
    if (action === 'reset-prepayment') { $('#prepaymentV2Keyword').value=''; $('#prepaymentV2Type').value=''; $('#prepaymentV2Site').value=''; filterPrepaymentV2(); }
    if (action === 'create-prepayment') openPrepaymentCreateV2();
    if (action === 'view-prepayment' && prepayment) renderPrepaymentDetailV2(prepayment);
    if (action === 'back-prepayment') { renderFundsLedgerV2('prepayment'); setView('financeLedger'); }
    if (action === 'search-receipts') filterRecyclerReceiptsV2();
    if (action === 'reset-receipts') { $('#receiptV2Keyword').value=''; $('#receiptV2Status').value=''; $('#receiptV2Site').value=''; filterRecyclerReceiptsV2(); }
    if (action === 'view-recycler-receipt' && receipt) renderRecyclerReceiptDetailV2(receipt);
    if (action === 'mark-recycler-received' && receipt) openRecyclerReceiveV2(receipt);
    if (action === 'void-recycler-receipt' && receipt) openRecyclerVoidV2(receipt);
    if (action === 'back-recycler-receipts') { renderFundsLedgerV2('receipts'); setView('financeLedger'); }
    if (action === 'search-settlements') filterSettlementsV2();
    if (action === 'reset-settlements') { $('#settlementV2Keyword').value=''; $('#settlementV2Type').value=''; $('#settlementV2Status').value=''; filterSettlementsV2(); }
    if (action === 'view-settlement-v2' && settlement) renderSettlementDetailV2(settlement);
    if (action === 'mark-settlement-paid-v2' && settlement) openSettlementPaidV2(settlement);
    if (action === 'void-settlement-v2' && settlement) openSettlementVoidV2(settlement);
    if (action === 'back-settlements') { renderSettlementListV2(); setView('settlementBill'); }
    if (action === 'edit-settlement-config-v2') openSettlementConfigV2();
    if (action === 'run-settlement-preview-v2') openSettlementPreviewV2();
    if (action === 'rerun-settlement-v2') { settlementConfigV2.lastRun='2026-09-07 11:25：补跑完成，无新增结算单'; renderSettlementConfigV2(); toast('补跑完成，当前没有遗漏的待结算明细。'); }
    if (action && action.startsWith('export-')) exportFinanceV2(target.textContent.replace('⇩','').trim() || '当前页面');
  });

  Object.assign(window.prototypeState, {
    prepaymentDisbursementOrdersV2: prepaymentDisbursementOrdersV2,
    recyclerReceiptOrdersV2: recyclerReceiptOrdersV2,
    settlementBillsV2: settlementBillsV2,
    settlementConfigV2: settlementConfigV2,
    renderFundsLedgerV2: renderFundsLedgerV2,
    renderPrepaymentListV2: renderPrepaymentListV2,
    renderRecyclerReceiptListV2: renderRecyclerReceiptListV2,
    renderSettlementListV2: renderSettlementListV2,
    renderSettlementConfigV2: renderSettlementConfigV2
  });

  renderFundsLedgerV2();
  renderSettlementListV2();
  renderSettlementConfigV2();
})();
