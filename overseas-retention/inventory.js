/* Static demonstration only; no PMS, BI or Galaxy requests. */
(() => {
  const baseColumns = ["快照时间", "物品编码", "SKU名称", "货源主体", "型号名称", "购买渠道", "内存", "颜色", "IMEI", "运营中心", "PJT等级", "最新看图成色", "海外购买渠道", "海外等级", "质检报告编号", "商品码", "边框背板", "屏幕外观", "屏幕显示", "机身弯曲情况", "受潮情况", "电池健康度", "维修情况", "屏幕维修情况", "主板维修情况", "电池维修情况", "零件维修情况", "后壳维修情况", "前摄维修情况", "后摄维修情况", "前摄拍摄功能", "后摄拍摄功能", "光线距离感应正常", "售后案例情况", "开机情况", "通话功能", "充电功能", "无线功能", "苹果保修期时长", "ICLOUD是否可注销", "指纹功能", "指南针功能", "触摸功能", "面容识别功能", "实体按键功能", "振动功能", "侧键", "声音功能", "数据连接功能", "是否可恢复出厂设置", "机身美容情况", "关联策略", "比货留货时间", "留货结果", "结算价", "预估售价"];
  const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stamp = '2026-10-14 11:00:00';
  const fields = ['型号名称','内存','颜色','运营中心','库存状态','海外等级','最新看图成色','商品码','物品编码','质检报告编号','货源主体','海外购买渠道'];
  const textFields = new Set(['商品码','物品编码','质检报告编号']);
  const placeholders = {'型号名称':'选择型号','内存':'选择内存','颜色':'选择颜色','运营中心':'选择运营中心','海外等级':'选择海外等级'};
  const sample = Array.from({length:24}, (_, i) => {
    const r = Object.fromEntries(baseColumns.map(k => [k, '']));
    const model = ['苹果 iPhone 13','苹果 iPhone 15 Pro','苹果 iPhone 12 Pro Max'][i % 3];
    Object.assign(r, {'快照时间':stamp,'物品编码':'DEMO-BI-'+String(i+1).padStart(5,'0'),'商品码':'DEMO-P-'+String(i+1).padStart(5,'0'),'IMEI':'DEMO-IMEI-'+String(i+1).padStart(4,'0'),
      '型号名称':model,'内存':i%2?'256G':'128G','颜色':i%2?'黑色':'蓝色','货源主体':i%2?'演示货源甲':'演示货源乙','运营中心':i%2?'演示东莞中心':'演示武汉中心',
      '购买渠道':'大陆国行','海外购买渠道':i%2?'CH':'LL','PJT等级':'B','海外等级':i%2?'C':'B','最新看图成色':i%2?'85新':'9新',
      '质检报告编号':'DEMO-R-'+String(i+1).padStart(5,'0'),'边框背板':'轻微划痕','屏幕外观':'细微划痕','屏幕显示':'显示正常','电池健康度':'90%–99%',
      '库存状态':['可售','已锁定','不可售'][i%3],'结算价':i===0?'':1800+i*20,'预估售价':i===0?'':2100+i*20,
      '关联策略':i%4===0?'演示策略 A':'','比货留货时间':i%4===0?'2026-10-14 10:00:00':'','留货结果':i%4===0?'成功':''});
    r['SKU名称'] = [model,r['内存'],r['颜色'],r['购买渠道']].join(' ');
    return r;
  });
  // Prices are separate from inventory attributes. A BI sync never writes price fields.
  const prices = new Map(sample.filter(r=>r['结算价']!=='').map(r=>[r['物品编码'],{amount:r['结算价'],updated:'2026-10-14 08:00:00'}]));
  const source = '可留货库存';
  const visibleColumns = ["快照时间", "商品码", "IMEI", "SKU名称", "型号名称", "内存", "颜色", "货源主体", "运营中心", "购买渠道", "海外购买渠道", "海外等级", "PJT等级", "质检报告编号", "物品编码", "最新看图成色", "边框背板", "屏幕外观", "屏幕显示", "机身弯曲情况", "受潮情况", "电池健康度", "维修情况", "屏幕维修情况", "主板维修情况", "电池维修情况", "零件维修情况", "后壳维修情况", "前摄维修情况", "后摄维修情况", "前摄拍摄功能", "后摄拍摄功能", "光线距离感应正常", "售后案例情况", "开机情况", "通话功能", "充电功能", "无线功能", "苹果保修期时长", "ICLOUD是否可注销", "指纹功能", "指南针功能", "触摸功能", "面容识别功能", "实体按键功能", "振动功能", "侧键", "声音功能", "数据连接功能", "是否可恢复出厂设置", "机身美容情况", "结算价", "预估售价", "关联策略", "比货留货时间", "留货结果"];
  let filters = {}, page = 1, size = 10, sort = '', direction = 1;
  const app = () => document.getElementById('inventory-app');
  const money = v => v === '' || v == null ? '—' : '¥'+Number(v).toLocaleString('zh-CN',{maximumFractionDigits:2});
  const display = (r,k) => ['结算价','预估售价'].includes(k) ? money(r[k]) : r[k] === '' || r[k] == null ? '—' : String(r[k]);
  const getRows = () => sample.map(r=>({...r,'数据来源':source,'结算价':prices.get(r['物品编码'])?.amount??'','价格更新时间':prices.get(r['物品编码'])?.updated??''}));
  const columns = () => [...visibleColumns,'价格更新时间'];
  const exportColumns = () => [...baseColumns,'数据来源','价格更新时间'];
  function matches() {
    let rows = getRows().filter(r=>Object.entries(filters).every(([k,v])=>!v || String(r[k]??'') === v));
    if(sort) rows=rows.slice().sort((a,b)=> (typeof a[sort]==='number'&&typeof b[sort]==='number' ? a[sort]-b[sort] : String(a[sort]??'').localeCompare(String(b[sort]??''),'zh-CN',{numeric:true}))*direction);
    return rows;
  }
  function controls() {
    const field = k => `<label class="inv-field"><span class="inv-sr-only">${e(k)}</span>${textFields.has(k)?`<input name="${e(k)}" aria-label="${e(k)}" placeholder="${e(k)}" value="${e(filters[k]||'')}">`:`<select name="${e(k)}" aria-label="${e(k)}"><option value="">${e(placeholders[k]||k)}</option>${[...new Set(getRows().map(r=>r[k]).filter(Boolean))].map(v=>`<option value="${e(v)}" ${filters[k]===v?'selected':''}>${e(v)}</option>`).join('')}</select>`}</label>`;
    return fields.slice(0,-1).map(field).join('')+`<div class="inv-actions"><button class="primary" type="submit">查询</button><button class="secondary" type="button" data-action="reset">重置</button><button class="secondary" type="button" data-action="export">导出</button>${field('海外购买渠道')}</div>`;
  }
  function readFilters() { return Object.fromEntries(new FormData(app().querySelector('form')).entries()); }
  function build() {
    app().innerHTML = `<div class="heading"><div><h1>留货库存</h1><p>当前快照：${stamp}，数据截止 ${stamp}</p></div></div><p class="inv-price-note">海外结算价每日 8:00 更新，执行留货时重新获取最新价格。未获取价格显示“—”。</p><form class="panel inv-filters">${controls()}</form><div class="panel"><div class="panel-head"><h2>可留货库存物品 <small id="inv-count"></small></h2><small>页面只读，不提供锁货操作 · 演示数据</small></div><div class="table-wrap"><table id="inv-table"></table></div><div id="inv-pager" class="inv-pager"></div></div><p class="inv-message" role="status"></p><dialog id="inv-detail" class="inv-dialog"><header><h2>库存详情</h2><button type="button" class="secondary" data-action="close">关闭</button></header><dl></dl></dialog>`;
    app().querySelector('form').onsubmit = event => {event.preventDefault();filters=readFilters();page=1;render();};
    app().onclick = event => {
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.action==='reset'){filters={};page=1;build();}
      if(b.dataset.action==='export'){filters=readFilters();page=1;render();download();}
      if(b.dataset.action==='close')app().querySelector('dialog').close();
      if(b.dataset.sort){direction=sort===b.dataset.sort?-direction:1;sort=b.dataset.sort;render();}
      if(b.dataset.open){const r=getRows().find(r=>r['物品编码']===b.dataset.open);const d=app().querySelector('dialog');d.querySelector('dl').innerHTML=exportColumns().map(k=>`<dt>${e(k)}</dt><dd>${e(display(r,k))}</dd>`).join('');d.showModal();}
      if(b.dataset.step){page+=Number(b.dataset.step);render();}
    };
    render();
  }
  function render() {
    const rows=matches(),pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,pages);const cols=columns();
    app().querySelector('#inv-count').textContent='共 '+rows.length+' 条';
    app().querySelector('#inv-table').innerHTML='<thead><tr>'+cols.map(k=>`<th><button type="button" data-sort="${e(k)}">${e(k)}${sort===k?(direction===1?' ↑':' ↓'):''}</button></th>`).join('')+'</tr></thead><tbody>'+ (rows.length?rows.slice((page-1)*size,page*size).map(r=>'<tr>'+cols.map(k=>`<td>${['商品码','物品编码'].includes(k)?`<button type="button" class="text-btn" data-open="${e(r['物品编码'])}">${e(display(r,k))}</button>`:e(display(r,k))}</td>`).join('')+'</tr>').join(''):`<tr><td colspan="${cols.length}" class="empty">暂无符合条件的库存</td></tr>`)+'</tbody>';
    app().querySelector('#inv-pager').innerHTML=`<span>第 ${page} / ${pages} 页</span><select aria-label="每页条数">${[10,50,100].map(n=>`<option ${n===size?'selected':''}>${n}</option>`).join('')}</select><button class="secondary" data-step="-1" ${page===1?'disabled':''}>上一页</button><button class="secondary" data-step="1" ${page===pages?'disabled':''}>下一页</button>`;
    app().querySelector('#inv-pager select').onchange=event=>{size=Number(event.target.value);page=1;render();};
  }
  function download() {
    const cols=exportColumns(),rows=matches(),matrix=[cols,...rows.map(r=>cols.map(k=>r[k]??''))];
    const ws=XLSX.utils.aoa_to_sheet(matrix);
    // Identifiers remain strings, preserving long numbers and leading zeroes.
    ws['!cols']=cols.map(k=>({wch:k==='SKU名称'?58:20}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'库存明细');XLSX.writeFile(wb,source+'明细-演示数据.xlsx',{compression:true});
    app().querySelector('.inv-message').textContent='已导出当前筛选的全部 '+rows.length+' 条记录';
  }
  document.addEventListener('DOMContentLoaded',build);
})();
