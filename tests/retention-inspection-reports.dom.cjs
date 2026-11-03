const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require(process.env.JSDOM_MODULE || 'jsdom');

const root = path.resolve(__dirname, '../overseas-retention');
const reportFields = ['物品编号','商品码','货源主体','运营中心','型号名称','内存','颜色','海外购买渠道','海外等级','PJT等级','质检报告编号','最新看图成色','边框背板','屏幕外观','屏幕显示','电池健康度'];
const bannedFields = /价格|结算价|售价|利润|策略|比货|运行批次|留货来源|留货原因|留货结果|调拨|WMS/;
const first = '20260807135404011810';
const second = '20260921000000000001';
const leadingZero = '00001234567890123456';
const retryId = '20260921000000000002';
const missingId = '20260000000000009999';

async function until(check, label, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  assert.fail('Timed out: ' + label);
}

(async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => { if (!/navigation/.test(error.message)) errors.push(error.message); });
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    runScripts: 'dangerously', url: 'https://example.test/overseas-retention/#inspectionReports',
    pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.alert = () => {};
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function () { this.open = false; };
    }
  });
  const w = dom.window;
  await new Promise(resolve => w.addEventListener('load', resolve));
  w.eval(fs.readFileSync(path.join(root, 'export-tasks.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(root, 'inventory.js'), 'utf8').replace("document.addEventListener('DOMContentLoaded',build);", 'build();'));
  w.eval(fs.readFileSync(path.join(root, 'inspection-reports.js'), 'utf8'));
  await until(() => w.document.querySelector('#ir-upload'), 'module initializes');
  const $ = selector => w.document.querySelector(selector);
  const $$ = selector => [...w.document.querySelectorAll(selector)];
  const click = selector => { assert($(selector), selector + ' exists'); $(selector).click(); };
  const tableRows = () => $$('#ir-table tbody tr').filter(row => row.cells.length > 1);
  const headers = () => $$('#ir-table thead th').map(node => node.textContent.trim());
  const rowValues = row => Object.fromEntries(headers().map((key, i) => [key, row.cells[i]?.textContent.trim()]));
  const records = () => tableRows().map(rowValues);
  const byId = id => records().find(row => row['物品编号'] === id);
  const tasks = () => JSON.parse(w.localStorage.getItem('retention-export-tasks-v1') || '[]');
  const initialDetail = $('#rp-details-table').outerHTML;
  const initialInventory = $('#inventory-app').outerHTML;
  const manualState = w.localStorage.getItem('overseas-specified-items-prototype-v1');
  let download = null;
  w.XLSX.writeFile = (book, filename) => { download = { book, filename }; };
  const workbook = matrix => {
    const book = w.XLSX.utils.book_new();
    w.XLSX.utils.book_append_sheet(book, w.XLSX.utils.aoa_to_sheet(matrix), '物品编号');
    return book;
  };
  const fileFrom = (book, name = '质检查询.xlsx') => {
    const array = w.XLSX.write(book, { bookType: 'xlsx', type: 'array' });
    return { name, size: array.byteLength, arrayBuffer: async () => array };
  };
  const selectFile = file => {
    Object.defineProperty($('#ir-file'), 'files', { configurable: true, value: [file] });
    $('#ir-file').dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const finished = () => !/查询中|待查询/.test($('#ir-table tbody').textContent) && !$('#ir-export').disabled;
  const upload = async (book, name) => {
    click('#ir-upload'); selectFile(fileFrom(book, name)); click('#ir-submit');
    await until(() => !$('#ir-upload-dialog').open, 'upload dialog closes after parsing');
    await until(finished, 'query batch finishes');
  };
  const submitFilters = () => $('#ir-filters').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const choose = (field, value) => {
    const checkbox = $$('#ir-filters details[data-filter="' + field + '"] input[type=checkbox]').find(input => input.value === value);
    assert(checkbox, field + ' option ' + value + ' exists'); checkbox.click();
  };

  assert($('#inspectionReports').classList.contains('active'), 'Direct hash opens the report query module');
  assert.equal($('#ir-filters select'), null, 'New dropdown filters are multi-selects');
  assert.equal(headers()[0], '物品编号');
  assert.deepEqual(headers().filter(key => reportFields.includes(key)), reportFields);
  assert(headers().every(key => !bannedFields.test(key)), 'No price, strategy, comparison, retention or transfer columns');
  assert.match($('#inspectionReports').textContent, /演示/);
  assert.equal(tableRows().length, 0);

  click('#ir-template');
  assert(download && /模板/.test(download.filename));
  const template = download.book.Sheets[download.book.SheetNames[0]];
  assert.equal(template.A1.v, '物品编号');
  assert.equal(template.A2.t, 's');
  assert.equal(template.A2.z, '@', 'Long identifiers are entered in text-formatted cells');
  assert(!Object.values(template).some(cell => cell?.v === '国家/地区'));
  click('#ir-example-download');
  assert(download && /示例|演示/.test(download.filename));

  await upload(workbook([['物品编号'], [first], [second], [leadingZero], [retryId], [missingId]]));
  assert.equal(tableRows().length, 5);
  assert.equal(byId(first)['查询状态'], '查询成功', 'An already-retained item is still queryable');
  assert.equal(byId(second)['查询状态'], '查询成功');
  assert.equal(byId(leadingZero)['查询状态'], '查询成功');
  assert.equal(byId(retryId)['查询状态'], '查询失败');
  assert.equal(byId(missingId)['查询状态'], '未查询到');
  assert.match(byId(retryId)['查询失败原因'], /超时|失败|异常/);
  assert.equal(byId(missingId)['质检报告编号'], '—');
  const firstButton = $$('#ir-table [data-report]').find(button => button.textContent === first);
  assert(firstButton, 'Successful item number opens the detail report'); firstButton.click();
  assert.equal($('#ir-report-dialog').open, true);
  const detailLabels = $$('#ir-report-fields dt').map(node => node.textContent.trim());
  assert(reportFields.every(key => detailLabels.includes(key)));
  assert(detailLabels.every(key => !bannedFields.test(key)));
  click('[data-close="ir-report-dialog"]');
  assert.equal($('#ir-report-dialog').open, false);

  click('#ir-export');
  const firstExport = tasks()[0];
  assert.equal(firstExport.type, '质检报告查询导出');
  assert.equal(firstExport.count, 5);
  assert.equal(firstExport.matrix.length, 6);
  assert(firstExport.matrix[0].every(key => !bannedFields.test(key)));
  const noCol = firstExport.matrix[0].indexOf('物品编号');
  assert(firstExport.matrix.slice(1).some(row => row[noCol] === leadingZero), 'Export preserves exact leading-zero string');
  const frozenExport = JSON.stringify(firstExport.matrix);
  click('#ir-retry');
  assert.equal($('#ir-export').disabled, true, 'No partial export while retry is still querying');
  await until(finished, 'retry finishes');
  assert.equal(tableRows().length, 5, 'Retry updates the failed row without duplicating it');
  assert.equal(byId(retryId)['查询状态'], '查询成功');
  assert.equal(byId(missingId)['查询状态'], '未查询到');
  assert.equal(JSON.stringify(tasks().find(task => task.id === firstExport.id).matrix), frozenExport,
    'Previously exported results are an immutable snapshot');

  choose('status', '查询成功');
  assert.equal(tableRows().length, 5, 'Changing draft filters does not silently query');
  submitFilters(); assert.equal(tableRows().length, 4);
  choose('status', '未查询到'); submitFilters(); assert.equal(tableRows().length, 5, 'Same-field status options use OR');
  const selectedModel = byId(first)['型号名称'];
  choose('model', selectedModel); submitFilters();
  assert(records().every(row => row['型号名称'] === selectedModel), 'Model AND status filters compose');
  $('#ir-filters input[name=query]').value = first.slice(0, -1); submitFilters();
  assert.equal(tableRows().length, 0, 'Item number uses exact matching');
  $('#ir-filters input[name=query]').value = first; submitFilters();
  assert.equal(tableRows().length, 1);
  click('#ir-export'); assert.equal(tasks()[0].count, 1);
  click('#ir-reset');
  assert.equal(tableRows().length, 5);
  assert.equal($('#ir-filters input[name=query]').value, '');
  assert.equal($$('#ir-filters input:checked').length, 0);

  const statusMulti = $('#ir-filters details[data-filter=status]');
  statusMulti.open = true;
  const firstCheck = statusMulti.querySelector('input[type=checkbox]');
  firstCheck.focus();
  firstCheck.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(statusMulti.open, false);
  statusMulti.open = true; $('#inspectionReports h1').click(); assert.equal(statusMulti.open, false);

  const oldRows = $('#ir-table tbody').innerHTML;
  for (const bad of [workbook([['错误表头'], [first]]), workbook([['物品编号']])]) {
    click('#ir-upload'); selectFile(fileFrom(bad)); click('#ir-submit');
    await until(() => $('#ir-upload-error').textContent.trim(), 'invalid workbook error');
    assert.equal($('#ir-table tbody').innerHTML, oldRows, 'Invalid file must preserve earlier results');
    $('#ir-file').closest('dialog').close();
  }
  click('#ir-upload');
  selectFile({ name: 'broken.xlsx', size: 3, arrayBuffer: async () => new w.Uint8Array([255, 0, 5]).buffer });
  click('#ir-submit');
  await until(() => $('#ir-upload-error').textContent.trim(), 'corrupt workbook error');
  assert.equal($('#ir-table tbody').innerHTML, oldRows);
  $('#ir-file').closest('dialog').close();

  const delayedBytes = w.XLSX.write(workbook([['物品编号'], [first]]), { bookType: 'xlsx', type: 'array' });
  let releaseRead;
  let readCalls = 0;
  const pendingRead = new Promise(resolve => { releaseRead = resolve; });
  click('#ir-upload');
  selectFile({ name: '延迟读取.xlsx', size: delayedBytes.byteLength, arrayBuffer: () => { readCalls++; return pendingRead; } });
  const beforeRead = $('#ir-table tbody').innerHTML;
  click('#ir-submit');
  for (const id of ['ir-submit', 'ir-choose', 'ir-remove', 'ir-upload', 'ir-demo', 'ir-file', 'ir-export']) {
    assert.equal($('#' + id).disabled, true, id + ' is guarded while reading the selected file');
  }
  $('#ir-submit').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  $('#ir-demo').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  selectFile(fileFrom(workbook([['物品编号'], [second]]), '不应替换.xlsx'));
  assert.equal(readCalls, 1, 'Repeated submit cannot start a second read');
  assert.equal($('#ir-filename').textContent, '延迟读取.xlsx', 'File changes cannot replace a file being read');
  assert.equal($('#ir-table tbody').innerHTML, beforeRead, 'Concurrent demo loading cannot replace the current results');
  const cancelRead = new w.Event('cancel', { cancelable: true });
  $('#ir-upload-dialog').dispatchEvent(cancelRead);
  assert.equal(cancelRead.defaultPrevented, true, 'Escape cannot dismiss the active read');
  assert.equal($('#ir-upload-dialog').open, true);
  releaseRead(delayedBytes);
  await until(() => !$('#ir-upload-dialog').open, 'delayed upload finishes parsing');
  await until(finished, 'delayed upload finishes querying');
  assert.equal(tableRows().length, 1);
  assert.equal(byId(first)['查询状态'], '查询成功');
  assert.equal(byId(second), undefined, 'The original selected file is the only new query batch');

  const mixed = workbook([['物品编号'], [first], [first], [leadingZero], [20260921000000000001], ['<img src=x>'], ['formula']]);
  mixed.Sheets[mixed.SheetNames[0]].A7 = { t: 's', v: second, f: '"' + second + '"' };
  await upload(mixed);
  assert.equal(tableRows().length, 5, 'One valid duplicate is merged; invalid rows remain visible');
  assert.equal(records().filter(row => row['查询状态'] === '查询成功').length, 2);
  assert.equal(records().filter(row => row['查询状态'] === '查询失败').length, 3);
  assert.match($('#inspectionReports').textContent, /重复/);
  assert.match($('#ir-table tbody').textContent, /精度|文本/);
  assert.match($('#ir-table tbody').textContent, /公式/);
  assert.equal($('#ir-table tbody img'), null, 'Imported content is rendered as text');
  assert.equal($('#ir-retry').disabled, true, 'Non-retryable invalid identifiers do not call PMS');

  const many = Array.from({ length: 23 }, (_, index) => 'UNKNOWN-' + String(index).padStart(3, '0'));
  await upload(workbook([['物品编号'], ...many.map(no => [no])]));
  assert(tableRows().length < 23, 'Large results are paginated');
  assert.match($('#ir-pager').textContent, /下一页/);
  const next = $$('#ir-pager button').find(button => /下一页/.test(button.textContent)); next.click();
  click('#ir-export');
  assert.equal(tasks()[0].count, 23, 'Export includes every filtered result, not just the current page');
  assert.deepEqual(tasks()[0].matrix.slice(1).map(row => row[tasks()[0].matrix[0].indexOf('物品编号')]), many);

  await until(() => tasks().find(task => task.id === firstExport.id)?.status === '处理完成', 'export snapshot ready');
  click('.nav[data-view="exportTasks"]');
  click('[data-download="' + firstExport.id + '"]');
  assert(download && download.book.SheetNames.includes('质检报告'), 'New task type downloads a report workbook');
  const exportedSheet = download.book.Sheets['质检报告'];
  const exportedMatrix = Array.from(w.XLSX.utils.sheet_to_json(exportedSheet, { header: 1, defval: '' }), row => Array.from(row));
  assert.deepEqual(exportedMatrix, firstExport.matrix, 'Actual workbook values match the original immutable export');
  const leadingRow = exportedMatrix.findIndex(row => row[noCol] === leadingZero);
  const leadingCell = exportedSheet[w.XLSX.utils.encode_cell({ r: leadingRow, c: noCol })];
  assert.equal(leadingCell.t, 's');
  assert.equal(leadingCell.v, leadingZero, 'Downloaded XLSX stores the exact ID as text');

  assert.equal($('#rp-details-table').outerHTML, initialDetail, 'Querying does not change retention detail records');
  assert.equal($('#inventory-app').outerHTML, initialInventory, 'Querying does not change inventory');
  assert.equal(w.localStorage.getItem('overseas-specified-items-prototype-v1'), manualState);
  click('.nav[data-view="stayDetails"]'); assert($('#stayDetails').classList.contains('active'));
  click('.nav[data-view="inspectionReports"]'); assert($('#inspectionReports').classList.contains('active'));
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log('PASS inspection reports: real XLSX import/template, precise IDs, per-row validation, duplicates, report outcomes/retry, detail field scope, filter OR/AND/reset, export snapshot/all pages and unchanged existing records');
})().catch(error => { console.error(error); process.exitCode = 1; });
