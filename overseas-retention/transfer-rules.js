/* Automatic transfer rule configuration. Prototype data only; no Galaxy request. */
(function () {
  'use strict';
  const STORAGE_KEY = 'retention-transfer-rules-v1';
  const warehouses = [
    { id: 'CB020304', name: '优检东莞检测中心（1仓）' },
    { id: 'CB000240', name: '优检天津检测中心' },
    { id: 'CB001442', name: '优检常州检测中心' },
    { id: 'CB000243', name: '优检武汉检测中心' }
  ];
  const defaults = [
    { id: 'TR-DEMO-001', name: 'iPhone 13 调拨东莞', priority: 1, models: ['iPhone 13'], memories: ['128G'], grades: ['C'], colors: [], centers: [warehouses[1].name, warehouses[2].name, warehouses[0].name], warehouseId: 'CB020304', enabled: true, updatedAt: '2026-10-16 09:00' },
    { id: 'TR-DEMO-002', name: 'iPhone 15 Pro 调拨武汉', priority: 1, models: ['iPhone 15 Pro'], memories: ['256G'], grades: ['A'], colors: [], centers: [warehouses[0].name], warehouseId: 'CB000243', enabled: true, updatedAt: '2026-10-16 09:00' },
    { id: 'TR-DEMO-003', name: 'iPhone 15 调拨天津', priority: 1, models: ['iPhone 15'], memories: [], grades: [], colors: [], centers: [], warehouseId: 'CB000240', enabled: false, updatedAt: '2026-10-16 09:00' }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const warehouseLabel = id => { const item = warehouses.find(w => w.id === id); return item ? item.id + ' · ' + item.name : (id || '—'); };
  const dimensions = [
    ['models', '型号名称', '型号'], ['memories', '内存', '内存'], ['grades', '海外等级', '海外等级'], ['colors', '颜色', '颜色'], ['centers', '运营中心', '运营中心']
  ];
  let storageAvailable = true;
  let rules = clone(defaults);
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(stored) && stored.every(r => r && typeof r.id === 'string' && typeof r.name === 'string' && typeof r.enabled === 'boolean' && dimensions.every(([key]) => Array.isArray(r[key]) && r[key].every(v => typeof v === 'string')))) rules = stored;
  } catch (_) { storageAvailable = false; }
  // Update untouched examples cached by the previous prototype, preserving edited rules.
  rules = rules.map(rule => {
    const index = defaults.findIndex(sample => sample.id === rule.id);
    const previous = index > 0 ? { ...defaults[index], priority: index + 1 } : null;
    return previous && Object.keys(previous).every(key => JSON.stringify(rule[key]) === JSON.stringify(previous[key])) ? { ...rule, priority: 1 } : rule;
  });
  // Legacy browser rules shared equal precedence; retain that when adding priority.
  rules = rules.map(rule => ({ ...rule, priority: Number.isSafeInteger(Number(rule.priority)) && Number(rule.priority) >= 1 ? Number(rule.priority) : 1 }));
  const normalize = (value, key) => {
    let text = String(value == null ? '' : value).trim();
    if (key === 'models') return text.replace(/^苹果\s*/, '').toLowerCase().replace(/\s+/g, ' ');
    if (key === 'memories') return text.toUpperCase().replace(/GB$/, 'G').replace(/\s+/g, '');
    if (key === 'centers') { const center = warehouses.find(w => w.id === text); text = center ? center.name : text; if (text === '优检东莞检测中心') text = warehouses[0].name; return text.replace(/[（(]/g, '(').replace(/[）)]/g, ')').replace(/\s+/g, ''); }
    return text;
  };
  function evaluate(item) {
    const empty = { warehouseId: '', warehouseName: '', ruleNames: [], status: '无需调拨', reason: '' };
    if (!['成功', '留货成功', '锁货成功', '已留货'].includes(String(item['留货结果'] || '').trim())) return { ...empty, reason: '商品未留货成功' };
    const matched = [], incomplete = [];
    rules.filter(r => r.enabled).forEach(rule => {
      let mismatch = false; const missing = [];
      dimensions.forEach(([key, field, label]) => {
        const conditions = rule[key];
        if (!conditions.length) return;
        const value = normalize(item[field], key);
        if (!value || value === '—' || value === '-') missing.push(label);
        else if (!conditions.some(option => normalize(option, key) === value)) mismatch = true;
      });
      if (!mismatch) { if (missing.length) incomplete.push({ rule, missing }); else matched.push(rule); }
    });
    const candidates = matched.concat(incomplete.map(x => x.rule));
    if (!candidates.length) return { ...empty, reason: '未命中已启用的调拨规则' };
    const priority = Math.min(...candidates.map(rule => rule.priority));
    const selected = matched.filter(rule => rule.priority === priority);
    const unresolved = incomplete.filter(x => x.rule.priority === priority);
    if (unresolved.length) return { ...empty, priority, ruleNames: [...new Set(selected.concat(unresolved.map(x => x.rule)).map(r => r.name))], status: '待处理', reason: '最高优先级规则的匹配信息缺失：' + [...new Set(unresolved.flatMap(x => x.missing))].join('、') };
    const targets = [...new Set(selected.map(r => r.warehouseId))];
    const ruleNames = selected.map(r => r.name);
    if (targets.length > 1) return { ...empty, priority, ruleNames, status: '待处理', reason: '最高优先级相同但调拨目标仓不同，请处理规则冲突' };
    const target = warehouses.find(w => w.id === targets[0]);
    if (!target) return { ...empty, ruleNames, status: '待处理', reason: '调拨目标仓或目标仓ID缺失' };
    const snapshot = { ...empty, priority, warehouseId: target.id, warehouseName: target.name, ruleNames };
    const source = normalize(item['运营中心'], 'centers');
    if (!source || source === '—' || source === '-') return { ...snapshot, status: '待处理', reason: '商品当前运营中心缺失' };
    if (source === normalize(target.name, 'centers')) return { ...snapshot, reason: '商品已在调拨目标仓，无需调拨' };
    return { ...snapshot, status: '待发起', reason: '已命中调拨规则，等待发起调拨申请' };
  }
  window.RetentionTransfer = { warehouses: clone(warehouses), warehouseLabel, getRules: () => clone(rules), evaluate };

  function mount() {
    const root = document.getElementById('transferRules');
    if (!root || root.dataset.transferMounted) return;
    root.dataset.transferMounted = 'true';
    root.innerHTML = `
      <div class="heading"><div><h1>自动调拨规则</h1><p>留货成功后，按商品条件与当前运营中心匹配调拨目标仓。</p></div><button class="primary" id="trCreate">＋ 新建调拨规则</button></div>
      <div class="panel tr-filters"><div class="tr-filter-fields"><label class="tr-field">规则名称<input id="trFilterName" placeholder="搜索规则名称" autocomplete="off"></label><div class="tr-field"><label>运营中心</label><div id="trFilterCenters"></div></div><div class="tr-field"><label>调拨仓库</label><div id="trFilterWarehouse"></div></div><div class="tr-field"><label>状态</label><div id="trFilterStatus"></div></div></div><div class="tr-actions"><button class="primary" id="trQuery">查询</button><button class="secondary" id="trReset">重置</button></div></div>
      <div class="panel"><div class="tr-list-head"><h2>调拨规则 <span id="trRuleCount"></span></h2><span class="tr-muted">数字越小越优先 · 原型演示</span></div><div class="table-wrap"><table class="tr-table"><thead><tr><th>规则名称</th><th title="数字越小越优先，1 为最高">优先级 ↑</th><th>商品条件</th><th>运营中心</th><th>调拨仓库</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody id="trRuleRows"></tbody></table></div></div>
      <div class="tr-feedback" id="trFeedback" role="status" aria-live="polite"></div>
      <dialog class="tr-dialog" id="trRuleDialog" aria-labelledby="trDialogTitle"><form id="trRuleForm" novalidate><header><div><h2 id="trDialogTitle">新建调拨规则</h2><p>不同字段同时满足，同一字段满足任一选项。</p></div><button type="button" class="tr-close" data-tr-close aria-label="关闭">×</button></header><article>
      <section class="tr-form-section"><h3>基本信息</h3><div class="tr-grid tr-basic-grid"><label class="tr-field">规则名称 <span class="tr-required">*</span><input id="trName" required maxlength="60" placeholder="例如：iPhone 13 调拨东莞"></label><label class="tr-field">优先级 <span class="tr-required">*</span><input id="trPriority" type="number" min="1" step="1" required aria-describedby="trPriorityHint"></label><div class="tr-field"><label>状态</label><div class="tr-radio"><label><input type="radio" name="trEnabled" value="true" checked> 启用</label><label><input type="radio" name="trEnabled" value="false"> 停用</label></div></div></div><p class="tr-priority-hint" id="trPriorityHint">默认 1，可编辑；数字越小越优先。同优先级命中不同目标仓时，标记为待处理。</p></section>
      <section class="tr-form-section"><h3>商品匹配条件</h3><p class="tr-muted">未选择表示不限；运营中心为商品当前所在中心。</p><div class="tr-grid">${dimensions.map(([key,,label]) => `<div class="tr-field"><label>${label}</label><div id="trEdit-${key}"></div></div>`).join('')}</div></section>
      <section class="tr-form-section"><h3>调拨去向</h3><div class="tr-grid"><div class="tr-field"><label>调拨仓库 <span class="tr-required">*</span></label><div id="trEditTarget"></div></div><label class="tr-field">目标仓ID<input id="trInstitution" readonly placeholder="选择调拨仓库后自动带出"></label></div></section>
      <p class="tr-form-note">保存后用于后续新发起的调拨判断，历史留货明细保留当时的目标仓。</p><p id="trFormError" role="alert" class="tr-form-error" hidden></p></article><footer><button type="button" class="secondary" data-tr-close>取消</button><button type="submit" class="primary">保存</button></footer></form></dialog>`;
    const $ = selector => root.querySelector(selector);
    const centerOptions = warehouses.map(w => ({ value: w.name, label: w.name }));
    const warehouseOptions = warehouses.map(w => ({ value: w.id, label: warehouseLabel(w.id) }));
    const pickerMap = new Map();
    function picker(host, options, values, placeholder, single, onChange, ariaLabel) {
      const selected = new Set(values || []);
      const target = typeof host === 'string' ? $(host) : host;
      target.innerHTML = `<details class="tr-picker"><summary aria-label="${escape(ariaLabel || placeholder)}"><span class="tr-picker-value"></span><span class="tr-chevron">⌄</span></summary><div class="tr-picker-menu"><input class="tr-picker-search" type="search" placeholder="搜索名称${options === warehouseOptions ? '或 ID' : ''}" aria-label="搜索${escape(ariaLabel || placeholder)}"><div class="tr-picker-options"></div><div class="tr-picker-footer"><span>${single ? '单选' : '可多选'}</span><button type="button" class="tr-clear">清空</button></div></div></details>`;
      const details = target.querySelector('details'), text = target.querySelector('.tr-picker-value'), list = target.querySelector('.tr-picker-options');
      function summary() {
        const labels = options.filter(o => selected.has(o.value)).map(o => o.label);
        text.textContent = labels.length ? labels.join('、') : placeholder;
        text.classList.toggle('tr-placeholder', !labels.length);
        text.title = labels.join('、');
      }
      function draw(query) {
        const items = options.filter(o => o.label.toLowerCase().includes(String(query || '').toLowerCase()));
        list.innerHTML = items.length ? items.map(o => `<label class="tr-option"><input type="${single ? 'radio' : 'checkbox'}" value="${escape(o.value)}" ${selected.has(o.value) ? 'checked' : ''}><span>${escape(o.label)}</span></label>`).join('') : '<div class="tr-no-options">无匹配选项</div>';
      }
      function changed() { summary(); if (onChange) onChange([...selected]); }
      list.addEventListener('change', event => {
        const input = event.target;
        if (input.tagName !== 'INPUT') return;
        if (single) { selected.clear(); selected.add(input.value); details.open = false; } else if (input.checked) selected.add(input.value); else selected.delete(input.value);
        changed(); draw(target.querySelector('.tr-picker-search').value);
      });
      target.querySelector('.tr-picker-search').addEventListener('input', event => draw(event.target.value));
      target.querySelector('.tr-clear').addEventListener('click', () => { selected.clear(); changed(); draw(target.querySelector('.tr-picker-search').value); });
      details.addEventListener('toggle', () => { if (details.open) { root.querySelectorAll('.tr-picker[open]').forEach(other => { if (other !== details) other.open = false; }); target.querySelector('.tr-picker-search').focus(); } });
      summary(); draw('');
      const api = { values: () => [...selected], reset: () => { selected.clear(); target.querySelector('.tr-picker-search').value = ''; changed(); draw(''); details.open = false; } };
      pickerMap.set(target.id, api); return api;
    }
    const filters = {
      centers: picker('#trFilterCenters', centerOptions, [], '全部运营中心', false, null, '运营中心筛选'),
      warehouses: picker('#trFilterWarehouse', warehouseOptions, [], '全部调拨仓库', false, null, '调拨仓库筛选'),
      status: picker('#trFilterStatus', [{ value: 'true', label: '启用' }, { value: 'false', label: '停用' }], [], '全部状态', false, null, '状态筛选')
    };
    let activeFilters = { name: '', centers: [], warehouses: [], status: [] };
    function render() {
      const f = activeFilters;
      const visible = rules.filter(rule => (!f.name || rule.name.toLowerCase().includes(f.name)) && (!f.centers.length || !rule.centers.length || rule.centers.some(v => f.centers.includes(v))) && (!f.warehouses.length || f.warehouses.includes(rule.warehouseId)) && (!f.status.length || f.status.includes(String(rule.enabled)))).sort((a, b) => a.priority - b.priority);
      $('#trRuleCount').textContent = `共 ${visible.length} 条`;
      $('#trRuleRows').innerHTML = visible.length ? visible.map(rule => {
        const goods = dimensions.slice(0, 4).map(([key,,label]) => `${label}：${rule[key].length ? rule[key].join('、') : '不限'}`).join('；');
        const centerText = rule.centers.length ? rule.centers.join('、') : '不限';
        const target = warehouses.find(w => w.id === rule.warehouseId);
        return `<tr><td><strong>${escape(rule.name)}</strong></td><td class="tr-priority">${rule.priority}</td><td><div class="tr-goods" title="${escape(goods)}">${escape(goods)}</div></td><td><div class="tr-centers" title="${escape(centerText)}">${escape(centerText)}</div></td><td><div class="tr-warehouse"><b>${escape(rule.warehouseId || '—')}</b><span>${escape(target ? target.name : '仓库映射缺失')}</span></div></td><td><span class="pill ${rule.enabled ? '' : 'draft'}">${rule.enabled ? '启用' : '停用'}</span></td><td class="tr-time">${escape(rule.updatedAt || '—')}</td><td><div class="tr-row-actions"><button class="text-btn" data-tr-edit="${escape(rule.id)}">编辑</button><button class="text-btn" data-tr-toggle="${escape(rule.id)}">${rule.enabled ? '停用' : '启用'}</button></div></td></tr>`;
      }).join('') : '<tr><td colspan="8" class="empty">暂无符合条件的调拨规则</td></tr>';
    }
    function feedback(message) { $('#trFeedback').textContent = message; }
    function persist(message) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); storageAvailable = true; } catch (_) { storageAvailable = false; }
      render(); feedback(message + (storageAvailable ? '。' : '；当前浏览器无法保存，刷新后配置将恢复。'));
    }
    $('#trQuery').addEventListener('click', () => { activeFilters = { name: $('#trFilterName').value.trim().toLowerCase(), centers: filters.centers.values(), warehouses: filters.warehouses.values(), status: filters.status.values() }; root.querySelectorAll('.tr-picker[open]').forEach(node => node.open = false); render(); });
    $('#trReset').addEventListener('click', () => { $('#trFilterName').value = ''; Object.values(filters).forEach(p => p.reset()); activeFilters = { name: '', centers: [], warehouses: [], status: [] }; render(); });
    $('#trFilterName').addEventListener('keydown', event => { if (event.key === 'Enter') $('#trQuery').click(); });
    const modelOptions = ['iPhone 12', 'iPhone 12 Pro Max', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 14', 'iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 16', 'iPhone 16 Pro'].map(value => ({ value, label: value }));
    const fields = { models: modelOptions, memories: ['64G', '128G', '256G', '512G', '1T'].map(value => ({ value, label: value })), grades: ['S', 'A', 'B', 'C', 'D'].map(value => ({ value, label: value })), colors: ['黑色', '白色', '蓝色', '粉色', '紫色', '绿色', '金色', '银色', '原色钛金属', '蓝色钛金属', '白色钛金属', '黑色钛金属'].map(value => ({ value, label: value })), centers: centerOptions };
    let editingId = null;
    function openDialog(id) {
      const existing = rules.find(rule => rule.id === id);
      const rule = existing || { name: '', priority: 1, enabled: true, warehouseId: '', models: [], memories: [], grades: [], colors: [], centers: [] };
      editingId = existing ? id : null;
      $('#trDialogTitle').textContent = existing ? '编辑调拨规则' : '新建调拨规则';
      $('#trName').value = rule.name;
      $('#trPriority').value = rule.priority;
      $(`input[name="trEnabled"][value="${rule.enabled}"]`).checked = true;
      $('#trInstitution').value = rule.warehouseId;
      dimensions.forEach(([key,,label]) => {
        const options = fields[key].concat(rule[key].filter(v => !fields[key].some(o => o.value === v)).map(value => ({ value, label: value })));
        picker('#trEdit-' + key, options, rule[key], '不限', false, null, label);
      });
      picker('#trEditTarget', warehouseOptions, rule.warehouseId ? [rule.warehouseId] : [], '请选择调拨仓库', true, values => $('#trInstitution').value = values[0] || '', '调拨仓库');
      $('#trFormError').hidden = true;
      $('#trRuleDialog').showModal();
      $('#trName').focus();
    }
    $('#trCreate').addEventListener('click', () => openDialog());
    root.addEventListener('click', event => {
      const close = event.target.closest('[data-tr-close]');
      if (close) $('#trRuleDialog').close();
      const edit = event.target.closest('[data-tr-edit]');
      if (edit) openDialog(edit.dataset.trEdit);
      const toggle = event.target.closest('[data-tr-toggle]');
      if (toggle) {
        const rule = rules.find(r => r.id === toggle.dataset.trToggle);
        if (!rule) return;
        if (!rule.enabled && !warehouses.some(w => w.id === rule.warehouseId)) { feedback('该仓库尚未配置目标仓ID，无法启用。'); return; }
        rule.enabled = !rule.enabled; rule.updatedAt = timestamp(); persist(`规则已${rule.enabled ? '启用' : '停用'}，历史明细保持不变`);
      }
      if (!event.target.closest('.tr-picker')) root.querySelectorAll('.tr-picker[open]').forEach(node => node.open = false);
    });
    root.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const opened = root.querySelectorAll('.tr-picker[open]');
      if (opened.length) { opened.forEach(node => { node.open = false; node.querySelector('summary').focus(); }); event.preventDefault(); event.stopPropagation(); }
    });
    $('#trRuleForm').addEventListener('submit', event => {
      event.preventDefault();
      const name = $('#trName').value.trim();
      const priority = Number($('#trPriority').value);
      const warehouseId = pickerMap.get('trEditTarget').values()[0] || '';
      let error = !name ? '请输入规则名称。' : !Number.isSafeInteger(priority) || priority < 1 ? '优先级请输入大于等于 1 的整数。' : !warehouseId ? '请选择调拨仓库。' : !warehouses.some(w => w.id === warehouseId) ? '该仓库尚未配置目标仓ID。' : '';
      if (error) { $('#trFormError').textContent = error; $('#trFormError').hidden = false; if (!name) $('#trName').focus(); return; }
      const record = { id: editingId || 'TR-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name, priority, enabled: $('input[name="trEnabled"]:checked').value === 'true', warehouseId, updatedAt: timestamp() };
      dimensions.forEach(([key]) => record[key] = pickerMap.get('trEdit-' + key).values());
      if (editingId) rules[rules.findIndex(r => r.id === editingId)] = record; else rules.unshift(record);
      $('#trRuleDialog').close(); persist('规则已保存，后续新发起的调拨判断使用新配置');
    });
    $('#trRuleDialog').addEventListener('close', () => root.querySelectorAll('.tr-picker[open]').forEach(node => node.open = false));
    function timestamp() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); }
    render();
    if (!storageAvailable) feedback('当前浏览器存储不可用，配置仅在本次页面停留期间有效。');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
}());
