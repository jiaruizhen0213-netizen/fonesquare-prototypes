const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require(process.env.JSDOM_MODULE || 'jsdom');

const root = path.resolve(__dirname, '../overseas-retention');
const chartFile = path.join(root, 'strategy-price-trial.js');
const editorFile = path.join(root, 'strategy-editor.js');

function environment(html, fullPage = false) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => { if (!/navigation/.test(error.message)) errors.push(error.message); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://example.test/overseas-retention/#strategy',
    virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.alert = message => { w.lastAlert = message; };
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function () {
        this.open = false;
        this.dispatchEvent(new w.Event('close'));
      };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.SVGElement.prototype.getBoundingClientRect = function () {
        return { x: 0, y: 0, left: 0, top: 0, width: 720, height: 260, right: 720, bottom: 260 };
      };
      w.SVGElement.prototype.setPointerCapture = () => {};
      w.SVGElement.prototype.releasePointerCapture = () => {};
      w.SVGElement.prototype.getComputedTextLength = function () { return this.textContent.length * 7; };
    }
  });
  return { dom, w: dom.window, errors };
}

function change(w, element, value, eventName = 'input') {
  assert(element, 'The requested control exists');
  element.value = String(value);
  element.dispatchEvent(new w.Event(eventName, { bubbles: true }));
}

async function moduleAcceptance() {
  const { dom, w, errors } = environment('<main><section id="trial"></section></main>');
  w.eval(fs.readFileSync(chartFile, 'utf8'));
  const container = w.document.getElementById('trial');
  const role = name => container.querySelector('[data-trial-role="' + name + '"]');
  const number = name => Number(role(name).textContent.replace(/[^0-9.-]/g, ''));
  const applied = [];
  const context = {
    label: 'iPhone 13 · 256G · C · CH / LL', currency: 'CNY', initialPrice: 1920,
    snapshotTime: '2026-10-15 11:00:00', priceTime: '2026-10-15 08:00:00',
    items: [
      { id: 'a', price: 1800 }, { id: 'b', price: 1920 }, { id: 'c', price: 1920 },
      { id: 'd', price: 1980 }, { id: 'e', price: 2100 },
      { id: 'f', price: null }, { id: 'g' }, { id: 'h', price: '' }
    ],
    estimatedPrices: [{ channel: 'CH', price: 2050 }, { channel: 'LL', price: 1980 }],
    // Supply trial must never be truncated to a strategy target.
    target: 1
  };
  const trial = w.RetentionPriceTrial.mount(container, context, value => applied.push(value));
  assert.equal(number('count'), 3, 'The threshold includes all inventory at the exact same price');
  assert.equal(number('priced'), 5);
  assert.equal(number('missing'), 3, 'Blank and absent prices do not count as zero-price inventory');
  assert.equal(number('reference'), 1980, 'Use the lowest selected-channel estimate');
  assert.equal(Number(role('slider').value), 1920);
  assert(Number(role('slider').max) >= 2100 && Number(role('slider').max) > 1980,
    'The drag domain includes the stock maximum and extends beyond the estimate');

  // Exercise pointer dragging independently of the accessible native slider.
  const frame = role('chart').querySelector('[data-chart-frame]');
  const left = Number(frame.getAttribute('x'));
  const plotWidth = Number(frame.getAttribute('width'));
  const min = Number(role('slider').min), max = Number(role('slider').max);
  const pointer = (name, price) => {
    const event = new w.Event(name, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0,
      clientX: left + (price - min) / (max - min) * plotWidth, clientY: 120 });
    role('chart').dispatchEvent(event);
  };
  pointer('pointerdown', 1920);
  pointer('pointermove', 2100);
  pointer('pointerup', 2100);
  assert.equal(Number(role('slider').value), 2100, 'Dragging the chart itself can cross the estimate');
  assert.equal(number('count'), 5);

  change(w, role('slider'), 1980);
  assert.equal(number('count'), 4, 'Count is inclusive and is not capped at target = 1');
  role('apply').click();
  assert.equal(applied.length, 1);
  assert.equal(applied[0].base, 1980);
  assert.equal(applied[0].ceiling, 1980, 'Applying a valid price uses the estimate as U');

  change(w, role('slider'), 2100);
  assert.equal(Number(role('slider').value), 2100, 'The estimate is advisory and does not cap dragging');
  assert.equal(number('count'), 5);
  assert.equal(Number(role('price').value), 2100, 'Numeric price and slider stay synchronized');
  role('apply').click();
  assert.equal(applied.length, 1, 'An over-estimate selection must not mutate draft prices');
  assert.equal(role('message').textContent.trim(), '超出预估售价请确认后手动输入');

  change(w, role('price'), 1919);
  assert.equal(number('count'), 1, 'Counts change at actual saved prices, without interpolation');
  assert.equal(Number(role('slider').value), 1919);
  role('apply').click();
  assert.equal(applied.length, 2);
  assert.equal(applied[1].base, 1919);
  assert.equal(applied[1].ceiling, 1980);

  trial.update({ ...context, label: 'Different strategy', initialPrice: 2000,
    items: [{ id: 'new', price: 2000 }, { id: 'missing', price: null }],
    estimatedPrices: [{ channel: 'CH', price: 2400 }, { channel: 'LL', price: 2200 }] });
  assert.equal(number('count'), 1, 'Changing the scope discards the previous inventory results');
  assert.equal(number('priced'), 1);
  assert.equal(number('missing'), 1);
  assert.equal(number('reference'), 2200);
  assert.equal(Number(role('slider').value), 2000, 'Changing scope resets the selected trial price');
  assert(!role('message').textContent.includes('超出预估售价'), 'An old warning cannot remain attached to a new scope');

  trial.update({ ...context, estimatedPrices: [{ channel: 'CH', price: 2050 }, { channel: 'LL', price: null }] });
  assert.equal(number('count'), 3, 'Missing estimates do not prevent inspecting saved-price inventory');
  role('apply').click();
  assert.equal(applied.length, 2, 'A missing channel estimate cannot silently produce a partial minimum');
  assert(!role('reference').textContent.includes('2,050'));

  trial.update({ ...context, items: [{ id: 'only-missing', price: null }] });
  assert.equal(number('count'), 0);
  assert.equal(number('priced'), 0);
  assert.equal(number('missing'), 1);
  assert(!container.innerHTML.includes('NaN'));

  trial.update({ ...context, initialPrice: 0, items: [{ id: 'zero', price: 0 }, { id: 'blank', price: null }] });
  assert.equal(number('count'), 1, 'An explicit saved zero price remains distinct from missing data');
  assert.equal(number('priced'), 1);
  assert.equal(number('missing'), 1);

  trial.update({ ...context, items: [], estimatedPrices: [] });
  assert.equal(number('count'), 0);
  assert.equal(number('priced'), 0);
  assert.equal(number('missing'), 0);
  assert(!container.innerHTML.includes('NaN'));
  role('apply').click();
  assert.equal(applied.length, 2);

  for (const width of [320, 360, 720]) {
    container.querySelector('.spt-chart-wrap').getBoundingClientRect = () => ({ width });
    trial.update(context);
    const viewBox = role('chart').getAttribute('viewBox').split(' ').map(Number);
    assert.equal(viewBox[2], width, 'The chart uses the actual available width');
    const frame = role('chart').querySelector('[data-chart-frame]');
    const point = role('chart').querySelector('[data-price][data-count]');
    const x = Number(frame.getAttribute('x')), y = Number(frame.getAttribute('y'));
    assert(Number(point.getAttribute('cx')) >= x && Number(point.getAttribute('cx')) <= x + Number(frame.getAttribute('width')));
    assert(Number(point.getAttribute('cy')) >= y && Number(point.getAttribute('cy')) <= y + Number(frame.getAttribute('height')));
    assert(!role('chart').innerHTML.includes('NaN'));
  }

  trial.update({ ...context, disabledReason: '请先选择货品范围和质量模板' });
  assert(container.textContent.includes('请先选择货品范围和质量模板'));
  role('apply').click();
  assert.equal(applied.length, 2, 'An incomplete strategy scope cannot apply stale prices');
  trial.destroy();
  assert.equal(container.childElementCount, 0);
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log('PASS price trial module: exact cumulative counts, ties, missing prices, channel minimum, pointer/range crossing, guarded application, context replacement, empty scope, 320/360/720 chart geometry and teardown');
}

async function colorStatisticsAcceptance() {
  const { dom, w, errors } = environment('<section id="trial"></section>');
  w.eval(fs.readFileSync(chartFile, 'utf8'));
  const container = w.document.getElementById('trial');
  const role = name => container.querySelector('[data-trial-role="' + name + '"]');
  const groups = () => Object.fromEntries([...role('color-rows').rows]
    .filter(row => row.cells.length === 4)
    .map(row => [row.cells[0].textContent, [Number(row.cells[1].textContent), row.cells[2].textContent]]));
  const checkCount = expected => {
    assert.equal(Number(role('count').textContent), expected);
    assert.equal(Object.values(groups()).reduce((sum, group) => sum + group[0], 0), expected,
      'The color counts must sum to the same inventory prefix as the total and chart');
    if (role('chart').querySelector('[data-count]')) {
      assert.equal(Number(role('chart').querySelector('[data-count]').dataset.count), expected);
    }
  };
  const applied = [];
  const context = {
    initialPrice: 300,
    estimatedPrices: [{ channel: 'CH', price: 300 }],
    items: [
      { price: 100, color: '蓝色' }, { price: 100, color: '蓝色' }, { price: 100, color: '蓝色' },
      { price: 300, color: '黄色' }, { price: 300, color: '白色' },
      { price: 200 }, { price: 200, color: '  ' },
      { price: 450, color: '绿色' }, { price: 500, color: '<img src=x onerror=alert(1)>' },
      { price: null, color: '紫色' }, { price: '', color: '紫色' },
      { price: -1, color: '紫色' }, { price: 'invalid', color: '紫色' }
    ]
  };
  const trial = w.RetentionPriceTrial.mount(container, context, value => applied.push(value));
  checkCount(7);
  assert.equal(role('average').textContent, '¥185.71', 'Overall mean weights each actual item, not each color equally');
  assert.deepEqual(groups(), {
    '蓝色': [3, '¥100.00'], '未标注颜色': [2, '¥200.00'],
    '黄色': [1, '¥300.00'], '白色': [1, '¥300.00']
  });
  assert.equal(role('missing').textContent, '4', 'Missing and invalid prices never enter the group counts or averages');
  role('apply').click();
  assert.equal(applied.length, 1);
  assert.equal(applied[0].base, 300);
  assert.equal(applied[0].ceiling, 300);

  change(w, role('slider'), 200);
  checkCount(5);
  assert.equal(role('average').textContent, '¥140.00');
  assert.deepEqual(groups(), { '蓝色': [3, '¥100.00'], '未标注颜色': [2, '¥200.00'] },
    'Dragging removes colors with no qualifying inventory');
  change(w, role('price'), 500);
  checkCount(9);
  assert.equal(role('average').textContent, '¥250.00');
  assert.deepEqual(groups()['<img src=x onerror=alert(1)>'], [1, '¥500.00']);
  assert.equal(role('color-rows').querySelector('img'), null, 'Color names are rendered as plain text');
  role('apply').click();
  assert.equal(applied.length, 1, 'Statistics above the estimate do not bypass apply-price safeguards');
  assert.equal(role('message').textContent, '超出预估售价请确认后手动输入');

  change(w, role('price'), 0);
  checkCount(0);
  assert.equal(role('average').textContent, '—');
  assert.match(role('color-rows').textContent, /暂无符合价格的库存/);
  change(w, role('price'), 300);
  change(w, role('price'), '');
  assert.equal(role('average').textContent, '—');
  assert.equal(role('count').textContent, '—');
  assert.deepEqual(groups(), {});
  assert.match(role('color-rows').textContent, /请输入有效价格/);
  assert.equal(role('chart').querySelector('[data-count]'), null, 'Invalid input also clears the chart selection');
  assert.equal(role('apply').disabled, true);

  trial.update({ ...context, initialPrice: 1.01, items: [
    { price: 1, color: '蓝色' }, { price: 1.01, color: '蓝色' }, { price: 0 }
  ] });
  checkCount(3);
  assert.equal(role('average').textContent, '¥0.67');
  assert.deepEqual(groups(), { '未标注颜色': [1, '¥0.00'], '蓝色': [2, '¥1.01'] },
    'A fractional-cent mean rounds to two decimals, and explicit zero prices remain valid');
  change(w, role('slider'), 0);
  checkCount(1);
  assert.equal(role('average').textContent, '¥0.00');
  trial.update({ ...context, initialPrice: 650, items: [{ price: 650, color: '绿色' }] });
  checkCount(1);
  assert.equal(role('average').textContent, '¥650.00');
  assert.deepEqual(groups(), { '绿色': [1, '¥650.00'] }, 'Context replacement cannot keep previous colors or amounts');
  trial.update({ ...context, items: [] });
  checkCount(0);
  assert.equal(role('average').textContent, '—');
  assert.match(role('color-rows').textContent, /暂无有价格的库存/);
  trial.update({ ...context, disabledReason: '请先选择货品范围和质量模板' });
  assert.equal(role('average').textContent, '—');
  assert.deepEqual(groups(), {}, 'An incomplete scope must not present stale per-color results');
  trial.destroy();
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log('PASS color statistics: inclusive thresholds, weighted mean, missing price/color handling, rounding, reactive grouping, invalid/empty scope and apply-price safeguards');
}

async function exchangeRateAcceptance() {
  const { dom, w, errors } = environment('<section id="trial"></section>');
  w.eval(fs.readFileSync(chartFile, 'utf8'));
  const container = w.document.getElementById('trial');
  const role = name => container.querySelector('[data-trial-role="' + name + '"]');
  const groups = () => Object.fromEntries([...role('color-rows').rows]
    .filter(row => row.cells.length === 4)
    .map(row => [row.cells[0].textContent, [...row.cells].slice(1).map(cell => cell.textContent)]));
  const fxRate = { provider: 'WorldFirst', from: 'CNY', to: 'HKD', rate: 1.09,
    updatedAt: '2026-10-29 08:00:00', demo: true };
  const context = { currency: 'CNY', initialPrice: 300, fxRate,
    estimatedPrices: [{ channel: 'CH', price: 500 }],
    items: [{ price: 100, color: '蓝色' }, { price: 100, color: '蓝色' },
      { price: 300, color: '黑色' }, { price: null, color: '黄色' }] };
  const applied = [];
  const trial = w.RetentionPriceTrial.mount(container, context, value => applied.push(value));
  assert.equal(role('average').textContent, '¥166.67');
  assert.equal(role('average-hk').textContent, 'HK$181.67', 'HK overall mean weights items, not color means');
  assert.deepEqual(groups(), {
    '蓝色': ['2', '¥100.00', 'HK$109.00'], '黑色': ['1', '¥300.00', 'HK$327.00']
  }, 'Every color gets its own HK mean using the same quote');
  assert.match(role('fx-rate').textContent, /万里汇/);
  assert.match(role('fx-rate').textContent, /1\.09/);
  assert.match(role('fx-rate').textContent, /演示/);
  change(w, role('slider'), 100);
  assert.equal(role('average-hk').textContent, 'HK$109.00');
  assert.deepEqual(groups(), { '蓝色': ['2', '¥100.00', 'HK$109.00'] });
  role('apply').click();
  assert.deepEqual(JSON.parse(JSON.stringify(applied)), [{ base: 100, ceiling: 500 }],
    'HK display must not change the CNY prices applied to the strategy');
  change(w, role('price'), 0);
  assert.equal(role('average-hk').textContent, '—');
  assert.equal(role('color-rows').rows[0].cells[0].colSpan, 4);
  change(w, role('price'), '');
  assert.equal(role('average-hk').textContent, '—', 'Invalid selection clears HK along with CN');

  trial.update({ ...context, initialPrice: 1.01,
    fxRate: { ...fxRate, rate: 1.2345 },
    items: [{ price: 1, color: '蓝色' }, { price: 1.01, color: '蓝色' }] });
  assert.equal(role('average').textContent, '¥1.01');
  assert.equal(role('average-hk').textContent, 'HK$1.24',
    'Multiply the unrounded source average before rounding HK, not the displayed CN mean');
  assert.deepEqual(groups()['蓝色'], ['2', '¥1.01', 'HK$1.24']);

  trial.update({ ...context, initialPrice: 1,
    fxRate: { ...fxRate, rate: 1.005 }, items: [{ price: 1, color: '蓝色' }] });
  assert.equal(role('average-hk').textContent, 'HK$1.01',
    'A half-cent converted value rounds up without binary floating-point loss');

  for (const invalidRate of [undefined, null, { ...fxRate, rate: 0 }, { ...fxRate, rate: -1 },
    { ...fxRate, rate: NaN }, { ...fxRate, rate: Infinity }, { ...fxRate, rate: '' },
    { ...fxRate, from: 'HKD', to: 'CNY' }, { ...fxRate, provider: 'other' }]) {
    trial.update({ ...context, fxRate: invalidRate });
    assert.equal(role('average').textContent, '¥166.67');
    assert.equal(role('average-hk').textContent, '—', 'Missing or invalid quote must not reuse an older HK value');
    assert(Object.values(groups()).every(row => row[2] === '—'));
    assert.equal(role('apply').disabled, false, 'FX availability does not block existing CNY application');
    assert(!container.textContent.includes('NaN') && !container.textContent.includes('Infinity'));
  }
  trial.update({ ...context, fxRate: { ...fxRate, rate: 1.2, demo: false } });
  assert.equal(role('average-hk').textContent, 'HK$200.00', 'A replacement rate refreshes all displayed averages');
  assert.deepEqual(groups()['黑色'], ['1', '¥300.00', 'HK$360.00']);
  trial.update({ ...context, items: [{ price: 0, color: '白色' }] });
  assert.equal(role('average-hk').textContent, 'HK$0.00', 'Zero price is valid and differs from missing FX');
  trial.update({ ...context, items: [] });
  assert.equal(role('average-hk').textContent, '—');
  trial.update({ ...context, disabledReason: '请先选择货品范围和质量模板' });
  assert.equal(role('average-hk').textContent, '—');
  assert.deepEqual(groups(), {});
  trial.destroy();
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log('PASS HK averages: WorldFirst quote, per-color and weighted totals, live selection, precision, invalid/missing FX, rate replacement and unchanged CNY application');
}

async function integrationAcceptance() {
  // The full-page fixture keeps the existing prototype renderers and data together.
  const { dom, w, errors } = environment(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), true);
  await new Promise(resolve => w.addEventListener('load', resolve));
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.eval(fs.readFileSync(path.join(root, 'inventory.js'), 'utf8').replace("document.addEventListener('DOMContentLoaded',build);", 'build();'));
  w.eval(fs.readFileSync(path.join(root, 'strategy-results.js'), 'utf8'));
  w.eval(fs.readFileSync(chartFile, 'utf8'));
  w.eval(fs.readFileSync(editorFile, 'utf8'));
  const $ = selector => w.document.querySelector(selector);
  const role = name => $('#strategy-trial [data-trial-role="' + name + '"]');
  const number = name => Number(role(name).textContent.replace(/[^0-9.-]/g, ''));
  const tick = () => new Promise(resolve => w.requestAnimationFrame(resolve));
  const rows = () => [...w.document.querySelectorAll('#strategy .strategy-list-table tbody > tr')];
  const originalRows = rows().map(row => row.textContent);
  w.showCreate();
  await tick();
  const dialog = $('#strategy-editor-modal');
  assert(dialog && dialog.open, 'New strategy opens a dialog');
  assert(dialog.querySelector('#strategy-trial'), 'Trial is inside the editing dialog');
  assert(dialog.querySelector('#se-base') && dialog.querySelector('#se-ceiling'));
  assert(dialog.querySelector('#strategy-trial').compareDocumentPosition(dialog.querySelector('#se-base')) & w.Node.DOCUMENT_POSITION_FOLLOWING,
    'The trial appears above the strategy target and price fields');
  assert.equal(number('reference'), 4580);
  assert.equal($('#se-base').value, '4320');
  change(w, $('#se-target'), 1);
  change(w, role('slider'), 4500);
  assert(number('count') > 1, 'Changing a target quantity cannot truncate the inventory trial');
  const colorRows = [...role('color-rows').rows];
  assert(colorRows.length > 1, 'The editor forwards actual item colors to the trial');
  assert(colorRows.every(row => row.cells.length === 4 && row.cells[0].textContent !== '未标注颜色'));
  assert.equal(colorRows.reduce((sum, row) => sum + Number(row.cells[1].textContent), 0), number('count'));
  assert(number('average') > 0 && number('average') <= 4500);
  assert(number('average-hk') > 0);
  assert(colorRows.every(row => /^HK\$/.test(row.cells[3].textContent)));
  assert.match(role('fx-rate').textContent, /万里汇/);
  role('apply').click();
  assert.equal($('#se-base').value, '4500');
  assert.equal($('#se-ceiling').value, '4580');
  assert.deepEqual(rows().map(row => row.textContent), originalRows, 'Apply updates only the unsaved draft');
  change(w, role('slider'), 5000);
  role('apply').click();
  assert.equal(role('message').textContent.trim(), '超出预估售价请确认后手动输入');
  assert.equal($('#se-base').value, '4500');
  assert.equal($('#se-ceiling').value, '4580');
  $('#se-cancel').click();
  assert.equal(dialog.open, false);

  w.showCreate();
  await tick();
  assert.equal($('#se-base').value, '4320', 'Reopening after cancel does not retain applied draft values');
  assert.equal($('#se-ceiling').value, '4580');
  const allChannelsCount = number('priced');
  change(w, $('#se-range'), 'ip15-ch', 'change');
  assert.equal(number('reference'), 4680, 'A single-channel scope uses its own estimate');
  assert(number('priced') < allChannelsCount, 'The inventory scope follows selected purchase channels');
  change(w, $('#se-range'), 'ip13pro', 'change');
  assert.equal($('#se-template').value, 'ip13pro-c');
  assert.equal(number('reference'), 2000, 'Model, memory and grade changes replace the price context');
  assert.match(role('scope').textContent, /iPhone 13 Pro/);
  assert.doesNotMatch(role('scope').textContent, /iPhone 15 Pro/);
  change(w, role('slider'), 1999);
  role('apply').click();
  assert.equal($('#se-base').value, '1999');
  assert.equal($('#se-ceiling').value, '2000');
  change(w, role('slider'), 2100);
  role('apply').click();
  assert.equal($('#se-base').value, '1999');
  assert.equal($('#se-ceiling').value, '2000');
  change(w, $('#se-country'), '日本', 'change');
  assert.equal(role('apply').disabled, true, 'Missing regional estimates prevent incorrect ceiling application');
  assert(number('priced') > 0, 'Inventory remains inspectable while the estimate is missing');
  $('#se-close').click();
  assert.equal(dialog.open, false);

  w.RetentionStrategyEditor.open(0);
  await tick();
  const rowBeforeEdit = rows()[0].textContent;
  const statusBeforeEdit = rows()[0].querySelector('.pill').textContent;
  const nameBeforeEdit = rows()[0].cells[0].querySelector('.link').textContent;
  assert.equal($('#se-title').textContent, '编辑留货策略');
  ['country', 'range', 'template'].forEach(key => assert.equal($('#se-' + key).disabled, true));
  change(w, role('slider'), 4300);
  role('apply').click();
  assert.equal($('#se-base').value, '4300');
  $('#se-cancel').click();
  assert.equal(rows()[0].textContent, rowBeforeEdit, 'Cancel does not write changed prices to an existing strategy');
  w.RetentionStrategyEditor.open(0);
  await tick();
  assert.equal($('#se-base').value, '4320');
  change(w, $('#se-base'), 5000);
  change(w, $('#se-ceiling'), 4999);
  $('#se-save').click();
  assert.equal(dialog.open, true, 'U < P cannot be saved');
  assert.match($('#se-error').textContent, /最高价不得低于基准价/);
  assert.equal(rows()[0].textContent, rowBeforeEdit);
  change(w, $('#se-ceiling'), 5100);
  change(w, $('#se-base'), 5000.001);
  $('#se-save').click();
  assert.equal(dialog.open, true, 'A three-decimal base price cannot be saved');
  assert.equal(rows()[0].textContent, rowBeforeEdit);
  change(w, $('#se-base'), 5000);
  change(w, $('#se-ceiling'), 5100.001);
  $('#se-save').click();
  assert.equal(dialog.open, true, 'A three-decimal ceiling price cannot be saved');
  assert.equal(rows()[0].textContent, rowBeforeEdit);
  change(w, $('#se-ceiling'), 5100);
  $('#se-save').click();
  assert.equal(dialog.open, false, 'Manual P/U above the estimate can be saved when U >= P');
  assert.match(rows()[0].cells[5].textContent, /5,000.*5,100/);
  assert.equal(rows()[0].querySelector('.pill').textContent, statusBeforeEdit, 'Editing preserves the strategy status');
  assert.equal(rows()[0].cells[0].querySelector('.link').textContent, nameBeforeEdit);
  assert.equal(rows().length, originalRows.length, 'Editing does not create a second strategy');
  w.RetentionStrategyEditor.open(0);
  await tick();
  assert.equal($('#se-base').value, '5000');
  assert.equal($('#se-ceiling').value, '5100');
  $('#se-close').click();

  w.showCreate();
  await tick();
  change(w, $('#se-name'), '价格试算验收草稿');
  change(w, $('#se-target'), 1);
  change(w, role('slider'), 4300);
  role('apply').click();
  $('#se-save-draft').click();
  assert.equal(dialog.open, false);
  assert.equal(rows().length, originalRows.length + 1);
  assert.equal(rows().at(-1).querySelector('.pill').textContent, '草稿');
  assert.match(rows().at(-1).cells[5].textContent, /4,300.*4,580/);
  assert.equal(rows().at(-1).cells[0].querySelector('.link').textContent, '价格试算验收草稿');
  w.showView('create');
  await tick();
  assert.equal(dialog.open, true, 'The existing create route also opens the modal');
  w.showView('stayInventory');
  assert.equal(dialog.open, false, 'Navigation closes the modal');
  assert($('#stayInventory').classList.contains('active'));
  assert.match($('#inv-count').textContent, /24 条/, 'Inventory rendering survives the combined module navigation');
  w.openStrategyResults(0);
  assert($('#strategyResults').classList.contains('active'));
  assert.equal(w.document.querySelectorAll('#sr-rows tr').length, 9, 'The original retention results remain available');
  $('#sr-back').click();
  assert($('#strategy').classList.contains('active'), 'The results back action still reaches the strategy list');
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log('PASS full page: modal placement, scope/channel/grade updates, guarded apply, cancel isolation, manual prices, edit validation/status preservation, draft save and navigation');
}

(async () => {
  await moduleAcceptance();
  await colorStatisticsAcceptance();
  await exchangeRateAcceptance();
  if (!process.argv.includes('--module-only')) await integrationAcceptance();
})().catch(error => { console.error(error); process.exitCode = 1; });
