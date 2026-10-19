/* Prototype fixtures only. No inventory updates or Galaxy API calls. */
(() => {
  const root = document.getElementById('strategyResults');
  const strategyRows = [...document.querySelectorAll('#strategy > .panel:last-child tbody tr')];
  const strategies = strategyRows.map((row, index) => {
    const cells = row.querySelectorAll('td');
    const goods = cells[3].childNodes[0].textContent.trim();
    const model = cells[2].textContent.trim();
    const memory = (goods.match(/\d+G$/) || ['—'])[0];
    const prices = cells[5].textContent.match(/[\d,]+/g) || ['1500'];
    return { index, name: cells[0].querySelector('.link').textContent.trim(), model, memory,
      base: Number(prices[0].replace(/,/g, '')), ceiling: Number(prices[1].replace(/,/g, '')),
      estimated: [4680, 3650, 2980, null][index],
      acceptable: index === 0 ? 4362 : Number(prices[0].replace(/,/g, '')),
      draft: cells[7].textContent.includes('草稿') };
  });
  const batchTimes = ['2026-10-13 18:00', '2026-10-13 05:00'];
  const sample = [
    ['20260807135404011810', '粉色', -20, 'success'], ['20260807135404011811', '白色', 80, 'price'],
    ['20260807135404011812', '白色', 120, 'price'], ['20260807135404011813', '粉色', -70, 'failed'],
    ['20260807135404011814', '白色', -40, 'pending'], ['20260807135404011815', '白色', 180, 'price'],
    ['20260807135404011816', '粉色', -30, 'success'], ['20260807135404011817', '白色', 90, 'price'],
    ['20260807135404011818', '粉色', -80, 'failed']
  ];
  let selected = strategies[0], batch = 0, tab = 'all', query = '', causes = [];
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => value == null ? '—' : '¥' + value.toLocaleString('zh-CN');
  const isSubmitted = record => ['pending','success','failed'].includes(record.outcome);
  function records() {
    if (selected.draft) return [];
    return sample.map(([id, color, offset, outcome]) => {
      if (batch === 1 && id === '20260807135404011811') { offset = -10; outcome = 'success'; }
      if (id === '20260807135404011815') offset = selected.ceiling - selected.acceptable + 60;
      const price = selected.acceptable + offset;
      const cause = outcome === 'price' ? (price > selected.ceiling ? 'ceiling' : 'acceptable')
        : outcome === 'failed' ? (id === '20260807135404011818' ? 'cancel' : 'inventory') : '';
      const availableColors = selected.model.includes('Galaxy') ? ['黑色','灰色'] : selected.model.includes('15 Pro') ? ['原色钛金属','白色钛金属'] : ['红色','白色'];
      return {id, goods: `${selected.model} / ${selected.memory} / ${color === '粉色' ? availableColors[0] : availableColors[1]}`,
        price, acceptable: selected.acceptable, base: selected.base, ceiling: selected.ceiling, estimated: selected.estimated, outcome, cause,
        reason: {acceptable:'超出策略可接受价格',ceiling:'超出策略最高价',inventory:'不存在已分银河库存',cancel:'拍机堂下架失败，物品取消交易失败'}[cause] || ''};
    });
  }
  function render() {
    const all = records(), rejected = all.filter(r => r.outcome === 'price').length;
    const submitted = all.filter(isSubmitted).length;
    $('sr-strategy-name').textContent = selected.name;
    $('sr-total').textContent = all.length;
    $('sr-rejected').textContent = rejected;
    $('sr-submitted').textContent = submitted;
    $('sr-all-tab').textContent = '全部处理记录 ' + all.length;
    $('sr-price-tab').textContent = '价格未通过 ' + rejected;
    $('sr-submitted-tab').textContent = '已提交锁货 ' + submitted;
    root.querySelectorAll('[data-sr-tab]').forEach(button => button.classList.toggle('active', button.dataset.srTab === tab));
    const visible = all.filter(r => (tab === 'all' || (tab === 'price' ? r.outcome === 'price' : isSubmitted(r)))
      && (!query || (r.id + ' ' + r.goods).toLowerCase().includes(query.toLowerCase())) && (!causes.length || causes.includes(r.cause)));
    $('sr-rows').innerHTML = visible.length ? visible.map(r => {
      const status = {pending:'待锁',success:'成功',failed:'失败'}[r.outcome] || '';
      const statusCell = status ? `<span class="sr-status ${r.outcome}">${status}</span>` : '';
      return `<tr><td>${escape(r.id)}</td><td>${escape(r.goods)}</td><td>${money(r.price)}</td><td>${money(r.acceptable)}</td><td>${statusCell}</td><td class="${r.outcome === 'price' ? 'sr-price-reason' : ''}">${escape(r.reason)}</td><td>${money(r.base)}</td><td>${money(r.ceiling)}</td><td>${money(r.estimated)}</td></tr>`;
    }).join('') : `<tr><td colspan="9" class="empty">${selected.draft ? '该策略尚未启用，暂无留货结果' : '暂无符合条件的处理记录'}</td></tr>`;
    $('sr-count').textContent = '共 ' + visible.length + ' 条演示记录';
    $('sr-batch').disabled = selected.draft;
  }
  window.openStrategyResults = index => {
    selected = strategies[index] || strategies[0]; batch = 0; tab = 'all'; query = ''; causes = [];
    $('sr-batch').value = '0'; $('sr-query').value = ''; $('sr-filter').reset(); updateCauseLabel(); $('sr-cause').open = false;
    render(); showView('strategyResults');
    document.querySelector('[data-view="strategy"]').classList.add('active');
    $('sr-title').focus({preventScroll:true});
  };
  names.strategyResults = '留货结果';
  $('sr-back').onclick = () => { showView('strategy'); strategyRows[selected.index].querySelector('.sr-entry').focus({preventScroll:true}); };
  $('sr-batch').onchange = event => { batch = Number(event.target.value); render(); };
  root.querySelectorAll('[data-sr-tab]').forEach(button => button.onclick = () => { tab = button.dataset.srTab; render(); });
  $('sr-filter').onsubmit = event => { event.preventDefault(); query = $('sr-query').value.trim(); causes = [...$('sr-cause').querySelectorAll('input:checked')].map(input => input.value); $('sr-cause').open = false; render(); };
  $('sr-reset').onclick = () => { $('sr-filter').reset(); query = ''; causes = []; updateCauseLabel(); $('sr-cause').open = false; render(); };
  function updateCauseLabel() {
    const checked = [...$('sr-cause').querySelectorAll('input:checked')];
    $('sr-cause-label').textContent = checked.length ? '原因（已选 ' + checked.length + ' 项）' : '全部原因';
  }
  $('sr-cause').addEventListener('change', updateCauseLabel);
  document.addEventListener('click', event => { if (!$('sr-cause').contains(event.target)) $('sr-cause').open = false; });
  $('sr-cause').addEventListener('keydown', event => { if (event.key === 'Escape') { $('sr-cause').open = false; $('sr-cause-label').focus(); } });
  render();
})();
