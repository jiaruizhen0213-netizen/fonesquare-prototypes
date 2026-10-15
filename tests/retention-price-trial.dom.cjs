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
  assert.match(rows()[0].cells[4].textContent, /5,000.*5,100/);
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
  assert.match(rows().at(-1).cells[4].textContent, /4,300.*4,580/);
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
  if (!process.argv.includes('--module-only')) await integrationAcceptance();
})().catch(error => { console.error(error); process.exitCode = 1; });
