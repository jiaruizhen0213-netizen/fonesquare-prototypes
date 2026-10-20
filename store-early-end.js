/* Early closing stops bidding; seller acceptance remains a separate decision. */
(() => {
  const $ = id => document.getElementById(id);
  const lot = $('lotPage'), card = $('currentAuctionCard');
  const t = (zh, en) => document.documentElement.lang === 'en' ? en : zh;
  const state = { ended: false, result: '', decision: false, order: false, round: 1 };
  // This existing sample has a valid quote. Newly published lots start without quotes.
  card.dataset.sellerProceeds = '2115.00';
  const bar = lot.querySelector('.action-bar');
  bar.insertAdjacentHTML('afterbegin', '<button type="button" class="action-button secondary" id="endActiveLot" data-no-i18n></button>');
  const result = document.createElement('section');
  result.className = 'section'; result.id = 'earlyEndResult'; result.setAttribute('data-no-i18n', '');
  bar.before(result);
  document.body.insertAdjacentHTML('beforeend', '<dialog id="endActiveLotDialog" aria-labelledby="endActiveLotTitle" data-no-i18n><div class="dialog-body"><h2 id="endActiveLotTitle"></h2><p></p><div class="dialog-actions"><button type="button" class="secondary" id="cancelEndActiveLot"></button><button type="button" class="primary" id="confirmEndActiveLot"></button></div></div></dialog>');
  const dialog = $('endActiveLotDialog');
  document.body.insertAdjacentHTML('beforeend', '<dialog id="earlyPriceDialog" aria-labelledby="earlyPriceTitle" data-no-i18n><div class="dialog-body"></div></dialog>');
  const priceDialog = $('earlyPriceDialog');
  function openPriceDialog() {
    if (state.result === 'pending' && editable() && !priceDialog.open) priceDialog.showModal();
  }

  const order = $('generatedOrderCard').cloneNode(true);
  order.id = 'earlyEndOrderCard'; order.dataset.orderId = 'FSO-261020-0216';
  order.querySelector('.unified-order-head strong').textContent = 'iPhone 17 Pro Max 512GB';
  order.querySelector('.unified-order-head small').textContent = 'FSO-261020-0216 · FS Retail Malaysia · 中心旗舰店';
  $('generatedOrderCard').after(order);
  const editable = () => roleSwitch.value === 'employee';
  const hasQuote = () => Number(card.dataset.sellerProceeds) > 0;
  function render() {
    $('endActiveLot').textContent = t('结束标单', 'End lot');
    $('endActiveLot').hidden = state.ended || !editable();
    bar.classList.toggle('single', $('endActiveLot').hidden);
    result.hidden = !state.ended;
    if (!state.ended) return;
    const pending = state.result === 'pending';
    const rows = lot.querySelectorAll('.shared-auction-info .summary-row');
    if (rows.length > 3) {
      rows[1].querySelector('strong').setAttribute('data-no-i18n', '');
      rows[1].querySelector('strong').textContent = t('第 ' + state.round + ' 轮', 'Round ' + state.round);
      rows[3].querySelector('strong').setAttribute('data-no-i18n', '');
      rows[3].querySelector('strong').textContent = pending ? t('预中标 · 待卖家决定', 'Pre-winning · Awaiting seller decision') : state.order ? t('卖家已接受', 'Seller accepted') : hasQuote() ? t('卖家拒绝', 'Seller declined') : t('无报价', 'No bids');
    }
    const status = lot.querySelector('.status-line');
    status.setAttribute('data-no-i18n', ''); status.textContent = t('已结束', 'Ended');
    const banner = lot.querySelector('.callout'); banner.setAttribute('data-no-i18n', '');
    banner.textContent = pending ? t('已结束 · 等待卖家确认价格', 'Ended · Awaiting seller decision') : state.order ? t('已结束 · 卖家已接受，成交订单已生成', 'Ended · Seller accepted, order created') : t('已结束', 'Ended');
    const meta = card.querySelector('.auction-meta'); meta.setAttribute('data-no-i18n', '');
    meta.innerHTML = '<span>' + t('竞拍状态：已结束', 'Auction status: Ended') + '</span><span>' + (pending ? t('结果：预中标 · 等待卖家决定', 'Result: Pre-winning · Awaiting seller decision') : state.order ? t('结果：卖家已接受', 'Result: Seller accepted') : hasQuote() ? t('结果：卖家拒绝', 'Result: Seller declined') : t('结果：无报价', 'Result: No bids')) + '</span>';
    $('decisionNote').setAttribute('data-no-i18n', '');
    $('decisionNote').textContent = pending ? t('请向卖家确认卖家应得金额。接受后维护合同和 +60 手机号；拒绝后选择重拍或结束标单。', 'Confirm seller proceeds. Acceptance requires contract confirmation and a +60 mobile; rejection allows re-auction or ending the lot.') : t('本轮竞拍已结束。', 'This auction round has ended.');
    result.innerHTML = hasQuote() ? '<h2 class="section-title">' + t('卖家应得金额', 'Seller proceeds') + '</h2><strong>MYR ' + Number(card.dataset.sellerProceeds).toLocaleString('en-MY', {minimumFractionDigits:2}) + '</strong>' : '<p>' + t('暂无有效报价，标单已结束。', 'No valid bids. The lot has ended.') + '</p>';
    if (pending && editable()) {
      result.innerHTML = '<button type="button" class="wide-button secondary" id="openEarlyPrice">' + t('确认是否接受报价', 'Review price') + '</button>';
      $('openEarlyPrice').onclick = openPriceDialog;
      priceDialog.querySelector('.dialog-body').innerHTML = '<h2 id="earlyPriceTitle">' + t('是否接受报价？', 'Accept this price?') + '</h2><p>' + t('标单已结束，请确认是否接受本次报价。', 'Bidding has ended. Please accept or decline this price.') + '</p><div class="dialog-summary"><div class="summary-row"><span>' + t('卖家应得金额', 'Seller proceeds') + '</span><strong>MYR ' + Number(card.dataset.sellerProceeds).toLocaleString('en-MY', {minimumFractionDigits:2}) + '</strong></div></div><div class="dialog-actions"><button type="button" class="secondary" id="rejectEarlyPrice">' + t('不接受', 'Decline') + '</button><button type="button" class="primary" id="acceptEarlyPrice">' + t('接受预中标价', 'Accept pre-winning price') + '</button></div><button type="button" class="wide-button tertiary" id="closeEarlyPrice">' + t('稍后确认', 'Decide later') + '</button>';
      $('rejectEarlyPrice').onclick = () => decide('reject');
      $('acceptEarlyPrice').onclick = () => decide('accept');
      $('closeEarlyPrice').onclick = () => priceDialog.close();
    } else {
      priceDialog.close();
      priceDialog.querySelector('.dialog-body').replaceChildren();
    }
  }
  function decide(choice) {
    if (!editable() || state.result !== 'pending') return;
    priceDialog.close();
    state.decision = true;
    $('acceptContractConfirm').checked = false; $('acceptSellerMobile').value = '';
    $('acceptContractError').classList.remove('show'); $('acceptSellerMobileError').classList.remove('show');
    showSellerDecisionPanel(choice);
  }
  $('endActiveLot').onclick = () => {
    if (state.ended || !editable()) return;
    dialog.querySelector('h2').textContent = t('确认结束标单？', 'End this lot?');
    dialog.querySelector('p').textContent = t('确认后立即停止竞拍。若已有有效报价，结束后仍需确认是否接受价格。', 'Confirmation stops bidding immediately. If a valid quote exists, you will then need to accept or decline the price.');
    $('cancelEndActiveLot').textContent = t('取消', 'Cancel');
    $('confirmEndActiveLot').textContent = t('确认结束', 'Confirm end');
    dialog.showModal();
  };
  $('cancelEndActiveLot').onclick = () => dialog.close();
  $('confirmEndActiveLot').onclick = () => {
    if (state.ended || !editable()) { dialog.close(); return; }
    state.ended = true; state.result = hasQuote() ? 'pending' : 'no-bids';
    activeAuctionEnd = Date.now(); card.dataset.deadline = String(activeAuctionEnd);
    $('lotAuctionEnd').textContent = formatAuctionTime(activeAuctionEnd);
    updateAuctionCountdowns(); sortAuctionCards(); dialog.close(); render(); openPriceDialog();
  };
  window.storeEarlyEnd = {
    render, isDecision: () => state.decision, orderCreated: () => state.order,
    leaveDecision() { state.decision = false; },
    createOrder() {
      if (!editable() || state.result !== 'pending' || state.order) return;
      state.order = true;
      order.querySelector('.unified-order-facts strong').textContent = 'MYR ' + Number(card.dataset.sellerProceeds).toLocaleString('en-MY', {minimumFractionDigits:2});
      order.hidden = false;
    },
    reset() {
      priceDialog.close();
      priceDialog.querySelector('.dialog-body').replaceChildren();
      state.ended = false; state.result = ''; state.decision = false;
      const resultRow = lot.querySelectorAll('.shared-auction-info .summary-row')[3];
      if (resultRow) resultRow.querySelector('strong').textContent = '—';
      card.dataset.sellerProceeds = '';
      lot.querySelector('.status-line').textContent = t('竞拍中', 'Bidding');
      lot.querySelector('.callout').textContent = t('发布成功 · 竞拍中', 'Published · Bidding');
      card.querySelector('.auction-meta').innerHTML = '<span>' + t('竞拍状态：竞拍中', 'Auction status: Bidding') + '</span><span><i data-auction-countdown>10:00</i></span>';
      $('decisionNote').textContent = t('竞拍结束并产生预中标后，由实际建拍操作人确认卖家接受或拒绝。', 'After bidding ends, the listing operator confirms the seller decision.');
      render();
    },
    complete(outcome) {
      if (!editable() || state.result !== 'pending') return;
      if (outcome === 'reauction') {
        const proceeds = card.dataset.sellerProceeds;
        startAuction(); card.dataset.sellerProceeds = proceeds;
        state.round += 1;
        const rows = lot.querySelectorAll('.summary-row');
        rows[1].querySelector('strong').textContent = t('第 ' + state.round + ' 轮', 'Round ' + state.round);
      } else { state.result = outcome; render(); }
      applyOrderScope();
    }
  };
  roleSwitch.addEventListener('change', () => { dialog.close(); priceDialog.close(); sellerDecisionDialog.close(); render(); });
  let language = document.documentElement.lang;
  new MutationObserver(() => { if (language !== document.documentElement.lang) { language = document.documentElement.lang; render(); } }).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  render();
})();
