/* Static prototype: isolated, simulated PMS report lookup. No inventory or locking writes. */
(() => {
  'use strict';
  // Follow the 2026-11-02 inventory export headers; keep report attributes only.
  const columns = [
    '物品编号','SKU名称','型号名称','购买渠道','内存','颜色','IMEI','PJT等级','最新看图成色',
    '海外购买渠道','海外等级','质检报告编号','商品码','边框背板','屏幕外观','屏幕显示',
    '机身弯曲情况','受潮情况','电池健康度','维修情况','屏幕维修情况','主板维修情况',
    '电池维修情况','零件维修情况','后壳维修情况','前摄维修情况','后摄维修情况',
    '前摄拍摄功能','后摄拍摄功能','光线距离感应正常','售后案例情况','开机情况','通话功能',
    '充电功能','无线功能','苹果保修期时长','ICLOUD是否可注销','指纹功能','指南针功能',
    '触摸功能','面容识别功能','实体按键功能','振动功能','侧键','声音功能','数据连接功能',
    '是否可恢复出厂设置','机身美容情况'
  ];
  const resultColumns = [columns[0],'查询状态',...columns.slice(1),'查询时间','查询失败原因'];
  const statuses = ['查询中','成功','失败'];
  const sampleIds = ['20260807135404011810','20260921000000000001','00001234567890123456','20260921000000000002','20260921000000000099'];
  const report = (item, code, model, memory, color, grade, number, pjtGrade, imei) => ({
    '物品编号':item,'SKU名称':model+' '+memory+' '+color+' 大陆国行（演示）','商品码':code,
    '型号名称':model,'购买渠道':'大陆国行','内存':memory,'颜色':color,'IMEI':imei,
    '海外购买渠道':'CH','海外等级':grade,'PJT等级':pjtGrade,'质检报告编号':number,'最新看图成色':'95新',
    '边框背板':'轻微划痕','屏幕外观':'细微划痕','屏幕显示':'显示正常','机身弯曲情况':'机身无弯曲',
    '受潮情况':'机身无进水','电池健康度':'90%–99%','维修情况':'无维修','屏幕维修情况':'屏幕无维修情况',
    '主板维修情况':'主板无维修情况','电池维修情况':'电池无维修','零件维修情况':'功能零件无维修和缺失',
    '后壳维修情况':'后壳无异常','前摄维修情况':'前摄像头无维修和缺失','后摄维修情况':'后摄像头无维修和缺失',
    '前摄拍摄功能':'前摄拍照摄像正常','后摄拍摄功能':'后摄拍照摄像正常','光线距离感应正常':'光线、距离感应正常',
    '售后案例情况':'无售后维修案例','开机情况':'正常开机','通话功能':'通话功能正常','充电功能':'充电正常',
    '无线功能':'无线正常','苹果保修期时长':'保修时长＜30天','ICLOUD是否可注销':'iCloud已注销',
    '指纹功能':'不支持','指南针功能':'指南针功能正常','触摸功能':'触摸功能正常','面容识别功能':'面容识别功能正常',
    '实体按键功能':'实体按键功能正常','振动功能':'振动功能正常','侧键':'侧键正常','声音功能':'声音功能正常',
    '数据连接功能':'正常连接电脑','是否可恢复出厂设置':'已激活，可还原','机身美容情况':'无美容'
  });
  const fixtures = new Map([
    [sampleIds[0],report(sampleIds[0],'DEMO-P-001','苹果 iPhone 13','128G','绿色','C','PMS-DEMO-001','B','000000000000001')],
    [sampleIds[1],report(sampleIds[1],'DEMO-P-002','苹果 iPhone 15','256G','黑色','B','PMS-DEMO-002','A','000000000000002')],
    [sampleIds[2],report(sampleIds[2],'DEMO-P-003','苹果 iPhone 15 Pro','256G','蓝色','A','PMS-DEMO-003','A1','000000000000003')],
    [sampleIds[3],report(sampleIds[3],'DEMO-P-004','苹果 iPhone 14 Pro','256G','紫色','A','PMS-DEMO-004','A2','000000000000004')]
  ]);
  fixtures.get(sampleIds[2])['电池健康度']='';
  delete fixtures.get(sampleIds[2])['维修情况'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const display = value => value === '' || value == null ? '—' : String(value);
  const timestamp = () => new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'});
  let app, rows=[], busy=false, reading=false, chosenFile=null, page=1, batchInfo=null, filters={query:'',status:[]}, generation=0;
  const pageSize=10;
  const $ = selector => app.querySelector(selector);

  function multi(name,label) {
    return '<label class="ir-label">'+label+'</label><details class="ir-multi" data-filter="'+name+'"><summary>不限</summary><div class="ir-options"><div class="ir-option-list"></div><button type="button" data-clear="'+name+'">清空选择</button></div></details>';
  }
  function boot() {
    app=document.getElementById('inspection-reports-app');
    if(!app || app.dataset.initialized)return;
    app.dataset.initialized='true';
    app.innerHTML=[
      '<div class="heading"><div><h1>质检报告查询</h1><p class="muted">上传物品编号，查询对应质检报告，查看商品信息与质检属性。</p></div><div class="ir-heading-actions"><button class="secondary" id="ir-template" type="button">下载模板</button><button class="primary" id="ir-upload" type="button">上传物品编号</button></div></div>',
      '<div class="ir-demo-note"><span>原型演示 · 模拟 PMS 查询，不执行留货或锁货。</span><button type="button" class="text-btn" id="ir-demo">加载演示数据</button></div>',
      '<form id="ir-filters" class="panel ir-filters"><div><label class="ir-label" for="ir-query-number">物品编号</label><input id="ir-query-number" name="query" type="text" placeholder="输入完整物品编号"></div><div>'+multi('status','查询状态')+'</div><div class="ir-filter-actions"><button class="primary" id="ir-query" type="submit">查询</button><button class="secondary" id="ir-reset" type="reset">重置</button></div></form>',
      '<p id="ir-notice" class="ir-notice" role="status" aria-live="polite"></p>',
      '<div class="panel ir-results"><div class="panel-head"><div><h2>本次查询结果 <small id="ir-count">共 0 条</small></h2><p id="ir-batch" class="ir-batch">上传后展示本次查询结果，物品编号可点击查看报告详情。</p></div><div class="ir-result-actions"><button class="secondary" id="ir-retry" type="button" disabled>重试失败</button><button class="secondary" id="ir-export" type="button" disabled>导出</button></div></div>',
      '<div id="ir-progress" class="ir-progress" role="status" aria-live="polite" hidden></div>',
      '<div class="ir-table-wrap"><table id="ir-table"><thead><tr>'+resultColumns.map(k=>'<th scope="col">'+escape(k)+'</th>').join('')+'</tr></thead><tbody></tbody></table></div><div id="ir-pager" class="ir-pager"></div></div>',
      '<dialog id="ir-upload-dialog" class="ir-dialog"><header><h2>上传物品编号</h2><button class="secondary" data-close="ir-upload-dialog" type="button" aria-label="关闭上传弹窗">关闭</button></header><div class="ir-dialog-body"><p>模板只需填写“物品编号”，请使用文本格式保存完整编号。</p><div id="ir-drop-zone" class="ir-drop-zone"><span class="ir-upload-icon">↑</span><strong>点击选择或拖拽 Excel 文件到这里</strong><span>.xlsx / .xls，最多 500 行，文件不超过 5 MB</span><button type="button" class="secondary" id="ir-choose">选择文件</button><input id="ir-file" type="file" accept=".xlsx,.xls" hidden></div><div class="ir-file-chip" id="ir-file-chip" hidden><span id="ir-filename"></span><button type="button" class="text-btn" id="ir-remove">移除</button></div><div class="ir-upload-links"><button type="button" class="text-btn" id="ir-template-modal">下载模板</button><button type="button" class="text-btn" id="ir-example-download">下载演示文件</button></div><p class="ir-upload-help">文件内重复编号合并查询；格式错误的行单独显示失败原因。新上传会替换本次结果，请先导出需要保留的数据。</p><p class="ir-upload-help">当前为原型演示，请使用演示文件体验查询中、成功、失败及失败重试。</p><p id="ir-upload-error" class="ir-error" role="alert"></p></div><footer><button type="button" class="secondary" data-close="ir-upload-dialog">取消</button><button type="button" class="primary" id="ir-submit" disabled>上传并查询</button></footer></dialog>',
      '<dialog id="ir-report-dialog" class="ir-dialog ir-report-dialog"><header><h2>质检报告详情</h2><button type="button" class="secondary" data-close="ir-report-dialog">关闭</button></header><div class="ir-dialog-body"><p class="ir-report-note">PMS 查询结果 · 原型演示数据；接口未返回的字段显示“—”。</p><dl id="ir-report-fields"></dl></div></dialog>'
    ].join('');
    setChoices('status',statuses);
    $('#ir-template').onclick=$('#ir-template-modal').onclick=downloadTemplate;
    $('#ir-upload').onclick=()=>{ $('#ir-upload-error').textContent='';$('#ir-upload-dialog').showModal(); };
    $('#ir-choose').onclick=()=>$('#ir-file').click();
    $('#ir-file').onchange=event=>selectFile(event.target.files[0]);
    $('#ir-remove').onclick=()=>{if(!busy&&!reading)clearFile();};
    $('#ir-submit').onclick=submit;
    $('#ir-example-download').onclick=()=>downloadWorkbook(makeWorkbook(sampleIds),'质检报告查询演示文件.xlsx');
    $('#ir-demo').onclick=async()=>{
      if(busy||reading)return;
      const book=makeWorkbook(sampleIds);
      startBatch(parseWorkbook(book),'演示物品编号.xlsx');
    };
    const zone=$('#ir-drop-zone');
    zone.addEventListener('click',event=>{if(!busy&&!reading&&!event.target.closest('button,input'))$('#ir-file').click();});
    $('#ir-upload-dialog').addEventListener('cancel',event=>{if(reading)event.preventDefault();});
    ['dragenter','dragover'].forEach(type=>zone.addEventListener(type,event=>{event.preventDefault();zone.classList.add('drag');}));
    ['dragleave','drop'].forEach(type=>zone.addEventListener(type,event=>{event.preventDefault();zone.classList.remove('drag');}));
    zone.addEventListener('drop',event=>selectFile(event.dataTransfer.files[0]));
    $('#ir-retry').onclick=retryFailed;
    $('#ir-export').onclick=exportRows;
    $('#ir-filters').onsubmit=event=>{
      event.preventDefault();
      filters={query:$('#ir-query-number').value.trim(),status:selected('status')};page=1;closeMultis();render();
    };
    $('#ir-filters').onreset=()=>{
      filters={query:'',status:[]};page=1;
      app.querySelectorAll('.ir-multi input').forEach(input=>input.checked=false);
      app.querySelectorAll('.ir-multi').forEach(refreshSummary);closeMultis();render();
    };
    app.addEventListener('change',event=>{if(event.target.matches('.ir-multi input'))refreshSummary(event.target.closest('.ir-multi'));});
    app.addEventListener('click',event=>{
      const summary=event.target.closest('.ir-multi > summary');
      if(summary)closeMultis(summary.parentElement);
      const button=event.target.closest('button');if(!button)return;
      if(button.dataset.close)$('#'+button.dataset.close).close();
      if(button.dataset.report)openReport(button.dataset.report);
      if(button.dataset.page){page+=Number(button.dataset.page);render();}
      if(button.dataset.clear){
        const menu=button.closest('.ir-multi');menu.querySelectorAll('input').forEach(input=>input.checked=false);refreshSummary(menu);
      }
    });
    app.addEventListener('keydown',event=>{
      if(event.key==='Escape'){
        const menu=event.target.closest('.ir-multi[open]');
        if(menu){menu.open=false;menu.querySelector('summary').focus();event.stopPropagation();event.preventDefault();}
      }
    });
    document.addEventListener('click',event=>{if(!event.target.closest('#inspection-reports-app .ir-multi'))closeMultis();});
    render();
  }
  function selected(name){return [...app.querySelectorAll('.ir-multi[data-filter="'+name+'"] input:checked')].map(input=>input.value);}
  function setChoices(name,values){
    const menu=$('.ir-multi[data-filter="'+name+'"]'), old=new Set(selected(name));
    menu.querySelector('.ir-option-list').innerHTML=values.length?values.map(value=>'<label><input type="checkbox" value="'+escape(value)+'" '+(old.has(value)?'checked':'')+'><span>'+escape(value)+'</span></label>').join(''):'<span class="ir-no-options">暂无可选项</span>';
    refreshSummary(menu);
  }
  function refreshSummary(menu){
    const values=[...menu.querySelectorAll('input:checked')].map(input=>input.value),summary=menu.querySelector('summary');
    summary.textContent=!values.length?'不限':values.length===1?values[0]:'已选 '+values.length+' 项';summary.title=values.join('、');
  }
  function closeMultis(except){app.querySelectorAll('.ir-multi[open]').forEach(menu=>{if(menu!==except)menu.open=false;});}
  function matchingRows(){return rows.filter(row=>(!filters.query||row['物品编号']===filters.query)&&(!filters.status.length||filters.status.includes(row['查询状态'])));}
  function render(){
    const found=matchingRows(),pages=Math.max(1,Math.ceil(found.length/pageSize));page=Math.max(1,Math.min(page,pages));
    $('#ir-count').textContent='共 '+found.length+' 条';
    $('#ir-table tbody').innerHTML=found.length?found.slice((page-1)*pageSize,page*pageSize).map(row=>'<tr>'+resultColumns.map((key,index)=>{
      const value=display(row[key]);
      if(index===0)return '<td>'+(row['查询状态']==='成功'?'<button type="button" class="text-btn" data-report="'+row.id+'">'+escape(value)+'</button>':escape(value))+'</td>';
      if(key==='查询状态')return '<td><span class="ir-state '+(row['查询状态']==='成功'?'success':row['查询状态']==='失败'?'error':'pending')+'">'+escape(value)+'</span></td>';
      return '<td'+(key==='查询失败原因'?' class="ir-reason"':'')+'>'+escape(value)+'</td>';
    }).join('')+'</tr>').join(''):'<tr><td colspan="'+resultColumns.length+'" class="ir-empty">'+(rows.length?'暂无符合条件的查询结果':'暂无查询结果，请上传物品编号或加载演示数据')+'</td></tr>';
    $('#ir-pager').innerHTML='<span>第 '+page+' / '+pages+' 页 · 每页 '+pageSize+' 条</span><button type="button" class="secondary" data-page="-1" '+(page===1?'disabled':'')+'>上一页</button><button type="button" class="secondary" data-page="1" '+(page===pages?'disabled':'')+'>下一页</button>';
    $('#ir-upload').disabled=$('#ir-demo').disabled=busy||reading;
    $('#ir-file').disabled=$('#ir-choose').disabled=$('#ir-remove').disabled=busy||reading;
    $('#ir-submit').disabled=busy||reading||!chosenFile;
    app.querySelectorAll('#ir-upload-dialog [data-close]').forEach(button=>button.disabled=reading);
    $('#ir-retry').disabled=busy||reading||!rows.some(row=>row.retryable&&row['查询状态']==='失败');
    $('#ir-export').disabled=busy||reading||!found.length;
    if(batchInfo){
      const done=rows.filter(row=>row['查询状态']!=='查询中').length;
      const count=status=>rows.filter(row=>row['查询状态']===status).length;
      $('#ir-progress').hidden=false;
      $('#ir-progress').textContent=(busy?'查询中':'查询完成')+'：'+done+' / '+rows.length+' 条 · 成功 '+count('成功')+' · 失败 '+count('失败');
      $('#ir-batch').textContent=batchInfo.name+' · 上传 '+batchInfo.inputCount+' 行 · 重复编号合并 '+batchInfo.duplicates+' 行 · 仅保留本次查询结果';
    }
  }
  function makeWorkbook(ids){
    const sheet=XLSX.utils.aoa_to_sheet([['物品编号'],...ids.map(value=>[value])]);
    sheet['!cols']=[{wch:30}];ids.forEach((_,index)=>{sheet['A'+(index+2)].t='s';sheet['A'+(index+2)].z='@';});
    const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'物品编号');return book;
  }
  function downloadWorkbook(book,name){
    try{XLSX.writeFile(book,name,{compression:true});}
    catch{ $('#ir-notice').textContent='文件下载失败，请重试。'; }
  }
  function downloadTemplate(){
    const book=makeWorkbook([]);
    for(let row=2;row<=501;row++)book.Sheets['物品编号']['A'+row]={t:'s',v:'',z:'@'};
    book.Sheets['物品编号']['!ref']='A1:A501';downloadWorkbook(book,'质检报告查询导入模板.xlsx');
  }
  function clearFile(){chosenFile=null;$('#ir-file').value='';$('#ir-file-chip').hidden=true;$('#ir-submit').disabled=true;}
  function selectFile(file){
    if(!file||busy||reading)return;
    clearFile();$('#ir-upload-error').textContent='';
    if(!/\.(xlsx|xls)$/i.test(file.name)){ $('#ir-upload-error').textContent='请上传 Excel 文件（.xlsx 或 .xls）。';return; }
    if(file.size>5*1024*1024){$('#ir-upload-error').textContent='文件不能超过 5 MB。';return;}
    chosenFile=file;$('#ir-filename').textContent=file.name;$('#ir-file-chip').hidden=false;$('#ir-submit').disabled=false;
  }
  function parseWorkbook(book){
    const sheet=book.Sheets[book.SheetNames[0]];
    if(!sheet)throw Error('文件中没有工作表，请使用模板重新上传。');
    const cells=Object.keys(sheet).filter(key=>/^[A-Z]+[1-9]\d*$/.test(key));
    const header=cells.find(key=>XLSX.utils.decode_cell(key).r===0 && String(sheet[key].v??'').trim()==='物品编号');
    if(!header)throw Error('模板表头必须包含：物品编号。');
    const column=XLSX.utils.decode_cell(header).c;
    // Walk actual cells, not the formatted sheet range, to avoid counting blank template rows.
    const occupied=[...new Set(cells.filter(key=>{
      const cell=sheet[key];return XLSX.utils.decode_cell(key).r>0&&(cell.f||String(cell.v??'').trim()!=='');
    }).map(key=>XLSX.utils.decode_cell(key).r))].sort((a,b)=>a-b);
    if(!occupied.length)throw Error('文件中没有物品编号，请填写模板后重新上传。');
    if(occupied.length>500)throw Error('每次最多上传 500 行，请拆分后重新上传。');
    const records=[],seen=new Set();let duplicates=0;
    occupied.forEach(index=>{
      const cell=sheet[XLSX.utils.encode_cell({r:index,c:column})]||{},raw=cell.v;
      const number=String(raw??'').trim();let error='';
      if(cell.f)error='物品编号不支持公式，请按文本格式填写';
      else if(!number)error='物品编号不能为空';
      else if(typeof raw==='number'&&(!Number.isSafeInteger(raw)||raw<0||number.length>15))error='数字格式的物品编号可能丢失精度，请按文本格式重新填写';
      else if(typeof raw!=='string'&&typeof raw!=='number')error='物品编号格式不正确，请按文本格式填写';
      else if(!/^[A-Za-z0-9_-]+$/.test(number))error='物品编号格式不正确，请使用数字、字母、下划线或短横线';
      if(!error&&seen.has(number)){duplicates++;return;}
      if(!error)seen.add(number);
      records.push({number,row:index+1,error});
    });
    return {records,duplicates,inputCount:occupied.length};
  }
  async function submit(){
    if(!chosenFile||busy||reading)return;
    reading=true;render();
    const file=chosenFile;$('#ir-submit').disabled=true;$('#ir-submit').textContent='正在读取…';$('#ir-upload-error').textContent='';
    try{
      const book=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:true});
      const parsed=parseWorkbook(book);
      $('#ir-upload-dialog').close();clearFile();reading=false;
      await startBatch(parsed,file.name);
    }catch(error){$('#ir-upload-error').textContent=error.message||'文件读取失败，请使用模板重新上传。';}
    finally{reading=false;$('#ir-submit').textContent='上传并查询';render();}
  }
  async function mockQuery(row){
    await new Promise(resolve=>setTimeout(resolve,180));
    // The transient fixture fails once in each uploaded batch, then succeeds on retry.
    if(row['物品编号']===sampleIds[3]&&row.attempts===1)throw Error('PMS 查询超时，请重试');
    return fixtures.get(row['物品编号'])||null;
  }
  async function runQueries(targets){
    busy=true;render();
    let next=0;
    async function worker(){
      while(next<targets.length){
        const row=targets[next++];row['查询状态']='查询中';row['查询失败原因']='';row.attempts++;render();
        try{
          const value=await mockQuery(row);
          if(value){
            columns.slice(1).forEach(key=>{row[key]=value[key]??'';});
            row['查询状态']='成功';row.retryable=false;
          }else{row['查询状态']='失败';row['查询失败原因']='PMS 未返回该物品的质检报告';row.retryable=false;}
        }catch(error){row['查询状态']='失败';row['查询失败原因']=error.message||'PMS 查询失败，请重试';row.retryable=true;}
        row['查询时间']=timestamp();render();
      }
    }
    try{await Promise.all(Array.from({length:Math.min(4,targets.length)},worker));}
    finally{busy=false;render();}
  }
  async function startBatch(parsed,name){
    if(busy)return;
    const id=++generation;filters={query:'',status:[]};page=1;
    $('#ir-filters').reset();$('#ir-report-dialog').close();$('#ir-notice').textContent='';
    batchInfo={name,inputCount:parsed.inputCount,duplicates:parsed.duplicates};
    rows=parsed.records.map((record,index)=>Object.assign(Object.fromEntries(columns.map(key=>[key,''])),{
      id:'IR-'+id+'-'+index,'物品编号':record.number,'查询状态':record.error?'失败':'查询中',
      '查询时间':'','查询失败原因':record.error?'第 '+record.row+' 行：'+record.error:'',retryable:false,attempts:0
    }));
    await runQueries(rows.filter(row=>row['查询状态']==='查询中'));
  }
  async function retryFailed(){
    if(busy||reading)return;
    const failed=rows.filter(row=>row.retryable&&row['查询状态']==='失败');
    failed.forEach(row=>{row['查询状态']='查询中';row['查询失败原因']='';});
    $('#ir-notice').textContent='正在重新查询 '+failed.length+' 条接口失败记录。';
    await runQueries(failed);
    $('#ir-notice').textContent='失败记录已重新查询，请查看最新结果。';
  }
  function openReport(id){
    const row=rows.find(record=>record.id===id);
    if(!row||row['查询状态']!=='成功')return;
    $('#ir-report-fields').innerHTML=[...columns,'查询状态','查询时间'].map(key=>'<dt>'+escape(key)+'</dt><dd>'+escape(display(row[key]))+'</dd>').join('');
    $('#ir-report-dialog').showModal();
  }
  function exportRows(){
    if(busy||reading)return;
    const found=matchingRows();if(!found.length)return;
    const matrix=[resultColumns,...found.map(row=>resultColumns.map(key=>row[key]??''))];
    try{
      window.RetentionExportTasks.create({type:'质检报告查询导出',format:'xlsx',filename:'质检报告查询结果-演示数据.xlsx',matrix,count:found.length});
      $('#ir-notice').textContent='已创建导出任务，共 '+found.length+' 条记录，请前往导出任务列表下载。';
    }catch{$('#ir-notice').textContent='创建导出任务失败，请重试。';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
