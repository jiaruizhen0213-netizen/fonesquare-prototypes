/* Prototype fixtures only. No inventory updates or Galaxy API calls. */
(() => {
  const root = document.getElementById('strategyResults');
  const strategyRows = [...document.querySelectorAll('#strategy > .panel:last-child tbody tr')];
  const strategies = strategyRows.map((row, index) => {
    const cells = row.querySelectorAll('td');
    const goods = cells[2].childNodes[0].textContent.trim();
    const model = goods.replace(/\s+\d+G$/, '');
    const memory = (goods.match(/\d+G$/) || ['—'])[0];
    const prices = cells[4].textContent.match(/[\d,]+/g) || ['1500'];
    return { index, name: cells[0].querySelector('.link').textContent.trim(), model, memory,
      acceptable: index === 0 ? 4362 : Number(prices[0].replace(/,/g, '')),
      draft: cells[6].textContent.includes('草稿') };
  });
  const batchTimes = ['2026-10-13 18:00', '2026-10-13 05:00'];
  const sample = [
    ['20260807135404011810', '粉色', -20, 'success'], ['20260807135404011811', '白色', 80, 'price'],
    ['20260807135404011812', '白色', 120, 'price'], ['20260807135404011813', '粉色', -70, 'failed'],
    ['20260807135404011814', '白色', -40, 'pending'], ['20260807135404011815', '白色', 180, 'price'],
    ['20260807135404011816', '粉色', -30, 'success'], ['20260807135404011817', '白色', 90, 'price'],
    ['20260807135404011818', '粉色', -80, 'failed']
  ];
  let selected = strategies[0], batch = 0, tab = 'all', query = '', cause = '';
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => value == null ? '—' : '¥' + value.toLocaleString('zh-CN');
  const isSubmitted = record => ['pending','success','failed'].includes(record.outcome);
  function records() {
    if (selected.draft) return [];
    return sample.map(([id, color, offset, outcome]) => {
      if (batch === 1 && id === '20260807135404011811') { offset = -10; outcome = 'success'; }
      const availableColors = selected.model.includes('Galaxy') ? ['黑色','灰色'] : selected.model.includes('15 Pro') ? ['原色钛金属','白色钛金属'] : ['红色','白色'];
      return {id, goods: `${selected.model} / ${selected.memory} / ${color === '粉色' ? availableColors[0] : availableColors[1]}`,
        price: offset == null ? null : selected.acceptable + offset, acceptable: selected.acceptable, outcome,
        reason: outcome === 'price' ? '超出可接受价格' : outcome === 'failed' ? (id === '20260807135404011818' ? '拍机堂下架失败，物品取消交易失败' : '不存在已分银河库存') : ''};
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
      && (!query || (r.id + ' ' + r.goods).toLowerCase().includes(query.toLowerCase())) && (!cause || r.outcome === cause));
    $('sr-rows').innerHTML = visible.length ? visible.map(r => {
      const status = {pending:'待锁',success:'成功',failed:'失败'}[r.outcome] || '';
      const statusCell = status ? `<span class="sr-status ${r.outcome}">${status}</span>` : '';
      return `<tr><td>${escape(r.id)}</td><td>${escape(r.goods)}</td><td>${money(r.price)}</td><td>${money(r.acceptable)}</td><td>${statusCell}</td><td class="${r.outcome === 'price' ? 'sr-price-reason' : ''}">${escape(r.reason)}</td></tr>`;
    }).join('') : `<tr><td colspan="6" class="empty">${selected.draft ? '该策略尚未启用，暂无留货结果' : '暂无符合条件的处理记录'}</td></tr>`;
    $('sr-count').textContent = '共 ' + visible.length + ' 条演示记录';
    $('sr-batch').disabled = selected.draft;
  }
  window.openStrategyResults = index => {
    selected = strategies[index] || strategies[0]; batch = 0; tab = 'all'; query = ''; cause = '';
    $('sr-batch').value = '0'; $('sr-query').value = ''; $('sr-cause').value = '';
    render(); showView('strategyResults');
    document.querySelector('[data-view="strategy"]').classList.add('active');
    $('sr-title').focus({preventScroll:true});
  };
  names.strategyResults = '留货结果';
  $('sr-back').onclick = () => { showView('strategy'); strategyRows[selected.index].querySelector('.sr-entry').focus({preventScroll:true}); };
  $('sr-batch').onchange = event => { batch = Number(event.target.value); render(); };
  root.querySelectorAll('[data-sr-tab]').forEach(button => button.onclick = () => { tab = button.dataset.srTab; render(); });
  $('sr-filter').onsubmit = event => { event.preventDefault(); query = $('sr-query').value.trim(); cause = $('sr-cause').value; render(); };
  $('sr-reset').onclick = () => { $('sr-filter').reset(); query = ''; cause = ''; render(); };
  render();
})();
