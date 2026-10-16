const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require(process.env.JSDOM_MODULE || 'jsdom');
const root = path.resolve(__dirname, '../overseas-retention');
const tick = () => new Promise(resolve => setTimeout(resolve, 30));

async function environment(saved = {}) {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  html = html.replace(/<script\b[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g, (_, src) => {
    if (/^https?:/.test(src)) return '';
    return '<script>' + fs.readFileSync(path.join(root, src.split('?')[0]), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>';
  });
  const errors = [], blobs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => { if (!/navigation/.test(error.message)) errors.push(error.message); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/#transferRules', virtualConsole: vc,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.alert = message => { w.lastAlert = message; };
      w.confirm = () => true;
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
      w.HTMLAnchorElement.prototype.click = () => {};
      w.URL.createObjectURL = blob => { blobs.push(blob); return 'blob:test'; };
      w.URL.revokeObjectURL = () => {};
      for (const [key, value] of Object.entries(saved)) w.localStorage.setItem(key, value);
    }
  });
  await tick();
  return { dom, w: dom.window, errors, blobs };
}

(async () => {
  const { dom, w, errors, blobs } = await environment();
  const api = w.RetentionTransfer;
  assert(api);
  assert.deepEqual(Array.from(api.warehouses, row => [row.id, row.name]), [
    ['CB020304', '优检东莞检测中心（1仓）'], ['CB000240', '优检天津检测中心'],
    ['CB001442', '优检常州检测中心'], ['CB000243', '优检武汉检测中心']
  ]);
  assert(w.document.querySelector('#transferRules.active'));
  const candidate = { '型号名称': '苹果 iPhone 13', '内存': '128G', '海外等级': 'C', '颜色': '绿色', '运营中心': '优检常州检测中心', '留货结果': '成功' };
  assert.equal(api.evaluate(candidate).warehouseId, 'CB020304');
  assert.equal(api.evaluate({ ...candidate, '运营中心': '优检天津检测中心' }).warehouseId, 'CB020304', 'Source center multi-options use OR');
  assert.notEqual(api.evaluate({ ...candidate, '内存': '512G' }).status, '待发起', 'Different dimensions use AND');
  assert.notEqual(api.evaluate({ ...candidate, '留货结果': '失败' }).status, '待发起');
  assert.notEqual(api.evaluate({ ...candidate, '留货结果': '待锁' }).status, '待发起');
  assert.equal(api.evaluate({ ...candidate, '运营中心': '优检东莞检测中心（1仓）' }).status, '无需调拨');

  w.showView('stayDetails');
  const headers = Array.from(w.document.querySelectorAll('#rp-details-table th'), el => el.textContent.replace(/[↕↑↓]/g, '').trim());
  const sourceIndex = headers.indexOf('运营中心'), targetIndex = headers.indexOf('调拨仓库');
  assert.equal(targetIndex, sourceIndex + 1);
  const rows = () => Array.from(w.document.querySelectorAll('#rp-details-table tbody tr'));
  assert(rows()[0].children[targetIndex].textContent.includes('CB020304'));
  assert(rows()[0].children[targetIndex].textContent.includes('优检东莞检测中心（1仓）'));
  assert.equal(rows()[0].children[sourceIndex].textContent, '优检常州检测中心');
  const initialDestinations = rows().map(row => row.children[targetIndex].textContent);
  w.showView('transferRules');
  const choose = (host, value) => {
    const input = Array.from(w.document.querySelectorAll(host + ' input')).find(el => el.value === value);
    assert(input, 'Picker option exists: ' + value);
    input.click();
  };
  const submitRule = () => w.document.querySelector('#trRuleForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  w.document.querySelector('#trCreate').click();
  submitRule();
  assert.equal(w.document.querySelector('#trFormError').hidden, false, 'Blank required fields cannot be saved');
  w.document.querySelector('#trName').value = '测试补充规则';
  choose('#trEdit-models', 'iPhone 13');
  choose('#trEdit-memories', '128G');
  choose('#trEdit-grades', 'C');
  choose('#trEdit-centers', '优检常州检测中心');
  choose('#trEditTarget', 'CB020304');
  assert.equal(w.document.querySelector('#trInstitution').value, 'CB020304');
  assert(w.document.querySelector('#trInstitution').readOnly);
  submitRule();
  assert.equal(w.document.querySelector('#trRuleDialog').open, false);
  const created = api.getRules().find(r => r.name === '测试补充规则');
  assert(created);
  assert.equal(api.evaluate(candidate).warehouseId, 'CB020304');
  assert.equal(api.evaluate(candidate).ruleNames.length, 2, 'Same-target overlapping rules produce a single destination');
  w.document.querySelector('[data-tr-edit="' + created.id + '"]').click();
  choose('#trEditTarget', 'CB000240');
  submitRule();
  assert.equal(api.evaluate(candidate).status, '待处理', 'Different target overlap cannot choose one arbitrarily');
  w.document.querySelector('[data-tr-toggle="' + created.id + '"]').click();
  assert.equal(api.evaluate(candidate).warehouseId, 'CB020304', 'Disabled rule no longer matches');
  assert.deepEqual(rows().map(row => row.children[targetIndex].textContent), initialDestinations, 'Editing or disabling rules does not rewrite history');
  const saved = Object.fromEntries(Array.from({ length: w.localStorage.length }, (_, i) => { const k = w.localStorage.key(i); return [k, w.localStorage.getItem(k)]; }));
  const restored = await environment(saved);
  assert.equal(restored.w.RetentionTransfer.getRules().find(r => r.id === created.id).warehouseId, 'CB000240');
  assert.equal(restored.w.RetentionTransfer.getRules().find(r => r.id === created.id).enabled, false);
  assert.deepEqual(Array.from(restored.w.document.querySelectorAll('#rp-details-table tbody tr'), row => row.children[targetIndex].textContent), initialDestinations, 'Historical target snapshots survive refresh');
  assert.deepEqual(restored.errors, []);
  restored.dom.window.close();
  w.showView('stayDetails');
  const form = w.document.querySelector('#rp-details-filter');
  const targetFilter = form.querySelector('[data-key="调拨仓库"]');
  assert.equal(targetFilter.querySelectorAll('input[type=checkbox]').length, 4);
  const boxes = Array.from(targetFilter.querySelectorAll('input[type=checkbox]'));
  boxes.find(box => box.value.includes('CB020304')).checked = true;
  boxes.find(box => box.value.includes('CB000243')).checked = true;
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(rows().length, 4, 'Two warehouse choices include both targets');
  form.querySelector('[data-action="export"]').click();
  assert.equal(blobs.length, 1);
  const csv = await new Promise(resolve => { const r = new w.FileReader(); r.onload = () => resolve(r.result); r.readAsText(blobs[0]); });
  assert(csv.includes('"运营中心","调拨仓库","型号名称"'));
  assert(csv.includes('CB020304 · 优检东莞检测中心（1仓）'));
  assert(csv.includes('CB000243 · 优检武汉检测中心'));
  form.querySelector('[data-action="reset"]').click();
  assert.deepEqual(rows().map(row => row.children[targetIndex].textContent), initialDestinations);
  const failed = Array.from(w.document.querySelectorAll('[data-transfer]')).find(b => b.textContent.includes('发起失败'));
  failed.click();
  const detail = w.document.querySelector('#rp-details-dialog');
  assert(detail.open);
  assert(detail.textContent.includes('CB020304 · 优检东莞检测中心（1仓）'));
  assert(detail.textContent.includes('不代表已经到仓'));
  detail.querySelector('.tr-retry').click();
  assert(!detail.querySelector('.tr-retry'), 'Retry cannot be submitted twice');
  assert(detail.textContent.includes('待发起'));
  assert(detail.textContent.includes('CB020304 · 优检东莞检测中心（1仓）'), 'Retry preserves destination');
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log('PASS transfer: supplied IDs/names, create/edit/disable/persistence, OR/AND matching, overlaps, historical snapshots, detail column order, multi-filter, CSV, reset and failure retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
