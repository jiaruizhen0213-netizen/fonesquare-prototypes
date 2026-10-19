const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require(process.env.JSDOM_MODULE || 'jsdom');
const root = path.resolve(__dirname, '../overseas-retention');

(async () => {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://example.test/overseas-retention/#strategy', runScripts: 'dangerously',
    pretendToBeVisual: true, virtualConsole,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollIntoView = () => {};
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.SVGElement.prototype.getComputedTextLength = function () { return this.textContent.length * 7; };
    }
  });
  const w = dom.window, $ = selector => w.document.querySelector(selector);
  await new Promise(resolve => w.addEventListener('load', resolve));
  ['strategy-price-trial.js','strategy-editor.js'].forEach(file => w.eval(fs.readFileSync(path.join(root, file), 'utf8')));
  const rows = () => [...w.document.querySelectorAll('#strategy .strategy-list-table tbody > tr:not(#se-filter-empty)')];
  const visible = () => rows().filter(row => !row.hidden);
  const status = row => row.querySelector('.pill').textContent;
  const change = (input,value) => { input.value=String(value); input.dispatchEvent(new w.Event('input',{bubbles:true})); };
  const selectModel = value => {
    const checkbox = [...$('#se-filter-model').querySelectorAll('input')].find(input => input.value===value);
    assert(checkbox, 'A structured range model is available');
    checkbox.checked=true;checkbox.dispatchEvent(new w.Event('change',{bubbles:true}));
  };
  const query = () => $('#se-filter-query').click();
  const reset = () => $('#se-filter-reset').click();
  const completed = rows().find(row => status(row)==='已完成');
  assert(completed, 'A completed sample supports direct interaction acceptance');
  assert(completed.querySelector('.se-edit'), 'Completed strategies retain the edit entry');
  completed.querySelector('.se-edit').click();
  assert.equal($('#strategy-editor-modal').open,true);
  assert.equal($('#se-save').textContent,'保存修改');
  assert.equal($('#se-save-draft').hidden,true);
  change($('#se-target'),250);$('#se-cancel').click();
  assert.equal(status(completed),'已完成','Cancel cannot reactivate the strategy');
  assert.equal(completed.cells[3].textContent,'200 / 200');

  completed.querySelector('.se-edit').click();
  change($('#se-target'),199);$('#se-save').click();
  assert.equal($('#strategy-editor-modal').open,true);
  assert.match($('#se-error').textContent,/目标留货数量不得少于已锁数量/);
  assert.equal(status(completed),'已完成','Invalid target cannot change status');
  change($('#se-target'),200);$('#se-save').click();
  assert.equal(status(completed),'已完成','A target equal to already retained quantity stays completed');
  assert.equal(completed.cells[5].textContent,'—');

  $('#se-filter-status').value='已完成';query();
  assert.deepEqual(visible(),[completed]);
  completed.cells[0].querySelector('.link').click();
  assert.equal($('#drawer .pill').textContent,'已完成');
  $('#drawer .buttons .primary').click();
  assert.equal($('#strategy-editor-modal').open,true,'The drawer also edits a completed strategy');
  change($('#se-target'),250);$('#se-save').click();
  assert.equal(status(completed),'执行中','Increasing the target above retained quantity resumes execution');
  assert.equal(completed.cells[3].textContent,'200 / 250');
  assert.equal(completed.cells[5].textContent,'按配置执行');
  assert.equal(visible().length,0,'Saving rechecks the active completed-status filter');
  assert.match($('#se-filter-empty').textContent,/暂无符合条件/);
  reset();
  completed.cells[0].querySelector('.link').click();
  assert.equal($('#drawer .pill').textContent,'执行中','The drawer reads the saved status');
  w.closeDrawer();

  selectModel('苹果 iPhone 15 Pro');selectModel('三星 Galaxy S24');
  assert.equal(visible().length,5,'Changing selections waits for the query action');
  assert.match($('#se-filter-model summary').textContent,/已选 2 项/);
  query();
  assert.equal(visible().length,2,'Multiple models match using OR');
  $('#se-filter-country').value='日本';query();
  assert.equal(visible().length,1,'Different filter fields combine using AND');
  assert.match(visible()[0].cells[2].textContent,/Galaxy S24/);
  reset();
  assert.equal(visible().length,5);
  assert.equal($('#se-filter-model').querySelectorAll('input:checked').length,0);
  assert.equal($('#se-filter-model summary').textContent,'选择型号');

  // Renaming a strategy to another model cannot affect its actual model membership.
  rows()[0].querySelector('.se-edit').click();
  change($('#se-name'),'Galaxy S24 名称测试');$('#se-save').click();
  selectModel('三星 Galaxy S24');query();
  assert.equal(visible().length,1);
  assert.match(visible()[0].cells[2].textContent,/Galaxy S24/);
  $('#se-filter-model .se-model-clear').click();query();
  assert.equal(visible().length,5,'Clear model selection removes only the model restriction');
  change($('#se-filter-search'),'名称测试');query();
  assert.equal(visible().length,1,'The existing name filter remains usable');
  assert.match(visible()[0].cells[2].textContent,/iPhone 15 Pro/);
  reset();
  $('#se-filter-status').value='已暂停';query();
  const paused=visible()[0];paused.querySelector('.se-edit').click();
  change($('#se-target'),600);$('#se-save').click();
  assert.equal(status(paused),'已暂停','The requested completed transition does not resume paused strategies');
  assert.equal(visible().length,1);
  assert.deepEqual(errors,[]);
  dom.window.close();
  console.log('PASS completed edit/cancel/validation/boundaries, drawer and list status, next execution, model OR, cross-filter AND, query/reset/clear, structured model source, paused status preservation');
})().catch(error => { console.error(error);process.exitCode=1; });
