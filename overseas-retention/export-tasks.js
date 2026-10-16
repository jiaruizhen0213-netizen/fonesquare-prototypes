/* Static prototype: immutable export snapshots, scoped to this browser. */
(() => {
  'use strict';
  const key='retention-export-tasks-v1', root=document.getElementById('export-tasks-app');
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let tasks=[],page=1,filters={type:''},notice='';
  try { const saved=JSON.parse(localStorage.getItem(key)||'[]'); if(Array.isArray(saved))tasks=saved.filter(t=>t&&typeof t.id==='string'&&['csv','xlsx'].includes(t.format)); } catch { notice='无法读取历史任务，当前仍可创建和下载任务。'; }
  function save(){try{localStorage.setItem(key,JSON.stringify(tasks));}catch{notice='浏览器无法保存任务；本次任务仍可下载，刷新后可能丢失。';}}
  root.innerHTML=`<form class="panel filter"><label class="field">任务类型<select name="type"><option value="">全部任务类型</option><option>留货明细导出</option><option>留货库存导出</option></select></label><span class="grow"></span><button class="primary" type="submit">查询</button><button class="secondary" type="reset">重置</button></form><p class="hint" role="status" aria-live="polite"></p><div class="panel"><div class="panel-head"><h2>导出任务 <small id="et-count"></small></h2><button class="secondary" type="button" data-refresh>刷新</button></div><div class="table-wrap"><table><thead><tr>${['任务编号','任务类型','操作时间','操作人','状态','操作'].map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody></tbody></table></div><div class="panel-head" id="et-pager"></div></div>`;
  const form=root.querySelector('form');
  function update(){let changed=false;for(const t of tasks){if(t.status==='处理中'&&Date.now()>=t.readyAt){t.status='处理完成';changed=true;}}if(changed)save();}
  function render(){
    update();const rows=tasks.filter(t=>(!filters.type||t.type===filters.type));
    const pages=Math.max(1,Math.ceil(rows.length/10));page=Math.min(page,pages);
    root.querySelector('[role=status]').textContent=notice;
    root.querySelector('#et-count').textContent=`共 ${rows.length} 条`;
    root.querySelector('tbody').innerHTML=rows.slice((page-1)*10,page*10).map(t=>`<tr><td>${escape(t.id)}</td><td>${escape(t.type)}<div class="sub">${t.count} 条记录</div></td><td style="white-space:nowrap">${escape(t.time)}</td><td>${escape(t.operator)}</td><td><span class="state ${t.status==='处理完成'?'sale':'locked'}">${escape(t.status)}</span></td><td>${t.status==='处理完成'?`<button class="text-btn" type="button" data-download="${escape(t.id)}">下载文件</button>`:'<span class="sub">等待处理完成</span>'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">暂无导出任务，请在留货明细或留货库存中点击“导出”</td></tr>';
    root.querySelector('#et-pager').innerHTML=`<span class="hint">第 ${page} / ${pages} 页 · 每页 10 条</span><div class="buttons"><button class="secondary" data-step="-1" ${page===1?'disabled':''}>上一页</button><button class="secondary" data-step="1" ${page===pages?'disabled':''}>下一页</button></div>`;
  }
  function download(t){
    try{
      if(t.format==='xlsx'){
        const ws=XLSX.utils.aoa_to_sheet(t.matrix);ws['!cols']=t.matrix[0].map(k=>({wch:k==='SKU名称'?58:20}));
        const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'库存明细');XLSX.writeFile(wb,t.filename,{compression:true});
      }else{
        const url=URL.createObjectURL(new Blob([t.csv],{type:'text/csv;charset=utf-8'}));
        const a=document.createElement('a');a.href=url;a.download=t.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
      notice='已开始下载：'+t.filename;
    }catch{notice='文件下载失败，请重试。';}
    render();
  }
  window.RetentionExportTasks={create(payload){
    const now=new Date(),task={...JSON.parse(JSON.stringify(payload)),id:'EJ'+now.getTime()+'-'+Math.random().toString(36).slice(2,8),operator:'王小明',time:now.toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}),status:'处理中',readyAt:now.getTime()+1500};
    tasks.unshift(task);page=1;save();render();setTimeout(render,1550);return task.id;
  }};
  form.addEventListener('submit',event=>{event.preventDefault();filters={type:form.elements.type.value};page=1;render();});
  form.addEventListener('reset',()=>{filters={type:''};page=1;render();});
  root.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.download){const t=tasks.find(t=>t.id===b.dataset.download);if(t?.status==='处理完成')download(t);}else if(b.dataset.step){page+=Number(b.dataset.step);render();}else if(b.hasAttribute('data-refresh'))render();});
  document.querySelector('[data-view="exportTasks"]').addEventListener('click',render);
  window.addEventListener('storage',event=>{if(event.key!==key)return;try{const saved=JSON.parse(event.newValue||'[]');if(Array.isArray(saved)){tasks=saved;render();}}catch{}});
  // Resume simulated jobs after a reload, without requiring the task page to stay open.
  for(const t of tasks)if(t.status==='处理中')setTimeout(render,Math.max(0,t.readyAt-Date.now())+50);
  if(location.hash==='#exportTasks')showView('exportTasks');
  render();
})();
