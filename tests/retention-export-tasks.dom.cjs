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

(async()=>{
  const {dom,w,errors,blobs}=await environment();
  const $=s=>w.document.querySelector(s), key='retention-export-tasks-v1';
  assert.equal($('.side .nav:last-of-type').dataset.view,'exportTasks');
  const headers=[...w.document.querySelectorAll('#rp-details-table th')].map(x=>x.textContent);
  assert(!headers.some(x=>x.includes('留货原因')));
  assert($('#rp-details-table tbody tr td:nth-child(3) small'));
  $('[data-transfer]').click();
  const fields=[...w.document.querySelectorAll('#rp-details-dialog dt')].map(x=>x.textContent);
  assert.equal(fields[fields.indexOf('调拨申请状态')+1],'调拨发起时间');
  $('#rp-details-dialog').close();
  $('#rp-details-filter [data-action=export]').click();
  assert.equal(blobs.length,0);
  assert.match($('#export-tasks-app tbody').textContent,/处理中/);
  assert.equal($('#export-tasks-app [data-download]'),null);
  const snapshot=JSON.parse(w.localStorage.getItem(key))[0];
  assert(snapshot.csv.includes('留货原因'));
  $('#rp-details-filter [data-key="物品编号"]').value='NO-MATCH';
  $('#rp-details-filter').dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert($('#rp-details-table .empty'));
  await new Promise(r=>setTimeout(r,1600));
  $('#export-tasks-app [data-download]').click();
  assert.equal(blobs.length,1);
  assert.equal(JSON.parse(w.localStorage.getItem(key))[0].csv,snapshot.csv);
  // Inventory integration preserves identifiers and freezes the queried data.
  $('#inventory-app input[name="物品编码"]').value='DEMO-BI-00001';
  $('#inventory-app [data-action=export]').click();
  let saved=JSON.parse(w.localStorage.getItem(key));
  assert.equal(saved[0].count,1);assert.equal(saved[0].matrix.length,2);
  assert(saved[0].matrix[1].includes('DEMO-BI-00001'));
  $('#inventory-app [data-action=reset]').click();
  let output;w.XLSX.writeFile=(book,name)=>output={book,name};
  await new Promise(r=>setTimeout(r,1600));
  $('#export-tasks-app [data-download]').click();
  assert.match(output.name,/xlsx$/);
  assert.equal(w.XLSX.utils.sheet_to_json(output.book.Sheets['库存明细'],{header:1}).length,2);
  const form=$('#export-tasks-app form');form.elements.type.value='留货明细导出';form.dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(w.document.querySelectorAll('#export-tasks-app tbody tr').length,1);
  assert.match($('#export-tasks-app tbody').textContent,/留货明细导出/);
  form.reset();assert.equal(w.document.querySelectorAll('#export-tasks-app tbody tr').length,2);
  // A reload retains both snapshots and download availability.
  const again=await environment({[key]:w.localStorage.getItem(key)});
  assert.equal(again.w.document.querySelectorAll('#export-tasks-app [data-download]').length,2);
  assert.deepEqual(errors,[]);assert.deepEqual(again.errors,[]);
  again.dom.window.close();dom.window.close();console.log('Export task integration passed');
})().catch(e=>{console.error(e);process.exit(1);});
