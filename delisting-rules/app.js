(function(){
 'use strict';
 const C=window.WholesaleCatalog,R=window.DelistingRules,E=C.esc,$=s=>document.querySelector(s);
 const KEY='fs-product-delisting-rules-v1',clone=R.clone;
 const stamp=()=>new Date().toLocaleString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'});
 let state=readState(),tab='rules',draft=null,runDraft=null,currentLog=null,returnFocus=null;
 function readState(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.rules)&&Number.isInteger(s.version))return s;}catch{}return R.defaults();}
 function saveState(next){try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}catch{toast('保存失败，请检查浏览器存储后重试');return false;}}
 function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3500);}
 function badge(text,color='gray'){return '<span class="badge '+color+'">'+E(text)+'</span>';}
 function scopeTags(scopes){return scopes.map(k=>badge(R.kinds[k]+'商品',k==='reserve'?'blue':'purple')).join('');}
 function allLogs(){return (C.read().logs||[]).filter(x=>x.type==='delisting-rule').slice().reverse();}
 function setTab(value){tab=value;$('#tabRules').setAttribute('aria-selected',String(value==='rules'));$('#tabLogs').setAttribute('aria-selected',String(value==='logs'));$('#rulesPanel').hidden=value!=='rules';$('#logsPanel').hidden=value!=='logs';render();}
 function render(){
  state=readState();const logs=allLogs();
  $('#ruleCount').textContent=state.rules.length;$('#logCount').textContent=logs.length;
  renderRules();renderLogs();
 }
 function renderRules(){
  const query=$('#ruleSearch').value.trim().toLowerCase(),scope=$('#scopeFilter').value,status=$('#statusFilter').value;
  const rows=state.rules.filter(r=>(!query||r.name.toLowerCase().includes(query))&&(!scope||r.scopes.includes(scope))&&(!status||r.enabled===(status==='on')));
  $('#ruleSummary').textContent='共 '+rows.length+' 条规则';
  $('#ruleTable').innerHTML=rows.length?'<table><thead><tr><th>规则名称</th><th>生效范围</th><th>命中条件</th><th>命中动作</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>'+rows.map(r=>'<tr data-rule-id="'+E(r.id)+'"><td><div class="rule-name">'+E(r.name)+'</div><span class="cell-sub">'+E(r.id)+'</span></td><td>'+scopeTags(r.scopes)+'</td><td>'+r.conditions.map((c,i)=>'<div class="condition-line">'+(i?'<span class="and">且</span>':'')+E(R.describe(c))+'</div>').join('')+'</td><td>'+badge('下架','orange')+'</td><td><button class="switch" role="switch" aria-checked="'+r.enabled+'" aria-label="'+E(r.name)+'启用状态" data-action="toggle" data-id="'+E(r.id)+'"></button><span class="muted">'+(r.enabled?'已启用':'已停用')+'</span></td><td class="muted">'+E(r.updatedAt)+'</td><td><button class="link" data-action="edit" data-id="'+E(r.id)+'">编辑</button><button class="link" data-action="copy" data-id="'+E(r.id)+'">复制</button><button class="link danger" data-action="delete" data-id="'+E(r.id)+'">删除</button></td></tr>').join('')+'</tbody></table>':'<div class="empty"><strong>暂无匹配规则</strong>可调整筛选条件或新建下架规则。</div>';
 }
 function renderLogs(){
  const source=$('#logSourceFilter').value,logs=allLogs().filter(x=>!source||x.source===source);
  $('#logSummary').textContent='共 '+logs.length+' 条执行记录';
  $('#logTable').innerHTML=logs.length?'<table><thead><tr><th>执行编号 / 时间</th><th>执行来源</th><th>执行方式</th><th>执行范围</th><th>执行结果</th><th>状态</th><th>操作人</th><th>操作</th></tr></thead><tbody>'+logs.map(log=>'<tr><td><span>'+E(log.id)+'</span><span class="cell-sub">'+E(log.at)+'</span></td><td>'+badge(log.source==='inventory'?'库存更新自动执行':'手动执行',log.source==='inventory'?'purple':'blue')+'</td><td>'+E(log.mode==='full'?'全量重置上下架':'仅下架命中商品')+'</td><td>'+scopeTags(log.scopes)+'</td><td><span class="log-counts">扫描 <b>'+log.result.pairs+'</b> 项 · 命中 <b>'+log.result.matched+'</b> 项<br>下架 <b>'+log.result.down+'</b> · 上架 <b>'+log.result.up+'</b> · 不变 <b>'+log.result.unchanged+'</b></span></td><td>'+badge('执行成功','green')+'</td><td class="muted">'+(log.source==='inventory'?'系统（演示）':'运营人员（演示）')+'</td><td><button class="link" data-action="log-detail" data-id="'+E(log.id)+'">查看日志</button></td></tr>').join('')+'</tbody></table>':'<div class="empty"><strong>暂无执行记录</strong>执行规则后，在这里查看处理结果和逐项日志。</div>';
 }
 function rememberFocus(){returnFocus=document.activeElement;}
 function closeEditor(){if($('#editor').open)$('#editor').close();draft=null;returnFocus?.focus();}
 function closeModal(){if($('#modal').open)$('#modal').close();runDraft=null;currentLog=null;returnFocus?.focus();}
 function modal(title,html){rememberFocus();$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').showModal();}
 function syncDraft(){if(!draft)return;draft.name=$('#ruleName').value;draft.note=$('#ruleNote').value;draft.enabled=$('#ruleEnabled').checked;draft.scopes=[...document.querySelectorAll('[name="ruleScope"]:checked')].map(x=>x.value);}
 function openEditor(id,copy=false){
  const existing=state.rules.find(r=>r.id===id);
  draft=existing?clone(existing):{id:null,name:'',enabled:true,scopes:['reserve','spot'],conditions:[{field:'grade',op:'in',values:[]}],note:''};
  if(copy){draft.id=null;draft.name+='（副本）';draft.enabled=false;}
  rememberFocus();$('#editorTitle').textContent=draft.id?'编辑下架规则':'新建下架规则';renderEditor();$('#editor').showModal();$('#ruleName').focus();
 }
 function optionsFor(field,values){
  const extra={grade:['N','S','A','B','C','D'],memory:['128G','256G','512G','1T']};
  return [...new Set([...(extra[field]||[]),...C.read().skus.map(s=>s[field]).filter(Boolean),...(values||[])])];
 }
 function conditionEditor(c,i){
  const qty=c.field==='quantity',ops=qty?['lt','lte','eq','gte','gt']:['in','notIn'];
  const values=(c.values||[]),names=values.length?values.join('、'):'请选择，可多选';
  return (i?'<div class="condition-join">且 · 同时满足</div>':'')+'<div class="condition-row" data-condition="'+i+'"><select aria-label="条件'+(i+1)+'字段" data-condition-field="'+i+'">'+Object.entries(R.fields).map(([k,v])=>'<option value="'+k+'" '+(k===c.field?'selected':'')+'>'+v+'</option>').join('')+'</select><select aria-label="条件'+(i+1)+'判断方式" data-condition-op="'+i+'">'+ops.map(op=>'<option value="'+op+'" '+(op===c.op?'selected':'')+'>'+R.operations[op]+'</option>').join('')+'</select>'+(qty?'<input class="quantity-input" aria-label="条件'+(i+1)+'库存数量" type="number" min="0" step="1" value="'+E(c.value??'')+'" data-condition-value="'+i+'">':'<details class="multi-select"><summary aria-label="条件'+(i+1)+'取值"><span>'+E(names)+'</span><b aria-hidden="true"></b></summary><div class="multi-options"><input class="option-search" placeholder="搜索选项" aria-label="搜索条件选项">'+optionsFor(c.field,c.values).map(value=>'<label data-option="'+E(value.toLowerCase())+'"><input type="checkbox" data-condition-option="'+i+'" value="'+E(value)+'" '+(values.includes(value)?'checked':'')+'>'+E(value)+'</label>').join('')+'</div></details>')+'<button type="button" class="remove" aria-label="删除条件'+(i+1)+'" data-action="remove-condition" data-index="'+i+'" '+(draft.conditions.length===1?'disabled':'')+'>×</button></div>';
 }
 function renderEditor(){
  $('#editorBody').innerHTML='<label class="field"><span class="label required">规则名称</span><input id="ruleName" class="text-input" maxlength="60" value="'+E(draft.name)+'" placeholder="例如：海外等级 N 默认下架"><span class="field-hint">便于识别业务用途，最多 60 个字符</span></label><div class="field"><span class="label required">生效范围</span><div class="scope-options">'+Object.entries(R.kinds).map(([k,label])=>'<label class="scope-option"><input type="checkbox" name="ruleScope" value="'+k+'" '+(draft.scopes.includes(k)?'checked':'')+'>'+label+'商品</label>').join('')+'</div><span class="field-hint">支持仅预售、仅现货或两者都选</span></div><div class="section-title"><h3>命中条件 <small>每个条件都满足时命中</small></h3></div><div class="conditions">'+draft.conditions.map(conditionEditor).join('')+'<button type="button" class="link" data-action="add-condition">＋ 添加条件</button></div><div class="field-hint">同一字段多个值满足任一值即可；多条启用规则之间满足任一条即可下架。</div><div class="action-preview"><span>↓</span><div><p>命中动作：下架所选类型</p><small>不修改真实库存及成本；现货、预售分别处理，允许后续人工上架。</small></div></div><label class="field"><span class="label">规则说明</span><textarea id="ruleNote" class="text-input" rows="2" maxlength="300" placeholder="补充业务原因或运营说明">'+E(draft.note)+'</textarea></label><label class="enable-row"><span>启用状态</span><input type="checkbox" class="enable-switch" id="ruleEnabled" '+(draft.enabled?'checked':'')+'></label><span class="field-hint">保存后不立即重置商品状态，可点击“执行规则”处理现有商品。</span><p id="editorError" class="error" role="alert"></p>';
 }
 function persistRule(){
  syncDraft();const error=R.validate(draft);if(error){$('#editorError').textContent=error;return;}
  const next=readState(),item=clone(draft);item.name=item.name.trim();item.updatedAt=stamp();
  if(!item.id){const n=Math.max(next.nextRuleNumber||1,Math.max(0,...next.rules.map(r=>Number(r.id.replace('RULE-',''))||0))+1);next.nextRuleNumber=n+1;item.id='RULE-'+String(n).padStart(3,'0');next.rules.push(item);}else{const idx=next.rules.findIndex(r=>r.id===item.id);if(idx<0){$('#editorError').textContent='该规则已在其他页面删除，请关闭后重新新建';return;}next.rules[idx]=item;}
  next.version++;if(saveState(next)){closeEditor();render();toast('规则已保存，下次库存更新或手动执行时应用');}
 }
 function openRun(){
  runDraft={mode:'down',scopes:['reserve','spot']};
  modal('执行下架规则','<div class="modal-content"><h3>选择执行方式</h3><div class="mode-options"><label class="mode-card"><input type="radio" name="runMode" value="down" checked><div><strong>仅下架命中商品</strong><p>命中的已上架商品改为下架；其余商品保持原状态。</p></div></label><label class="mode-card"><input type="radio" name="runMode" value="full"><div><strong>全量重置上下架</strong><p>命中规则的下架，未命中的上架，覆盖原人工上下架状态。</p></div></label></div><h3>执行范围</h3><div class="scope-options" style="margin-top:10px">'+Object.entries(R.kinds).map(([k,v])=>'<label class="scope-option"><input type="checkbox" name="runScope" value="'+k+'" checked>'+v+'商品</label>').join('')+'</div><div id="runFeedback" role="status"></div></div><div class="modal-footer"><button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="confirm-run" id="confirmRun">确认执行</button></div>');updateRunOptions();
 }
 function updateRunOptions(){
  if(!runDraft)return;
  if(!runDraft.scopes.length){$('#runFeedback').innerHTML='<p class="error">请至少选择一个执行范围</p>';$('#confirmRun').disabled=true;return;}
  const latest=readState(),active=latest.rules.filter(r=>r.enabled&&r.scopes.some(k=>runDraft.scopes.includes(k)));
  $('#confirmRun').disabled=false;
  $('#runFeedback').innerHTML=runDraft.mode==='full'?'<div class="warning">全量重置会将未命中的人工下架商品重新上架。上架后仍须满足前台库存及展示条件。'+(!active.length?' 当前范围没有启用规则，全部商品都会设置为上架。':'')+'</div>':'';
 }
 function execute(source='manual'){
  const started=performance.now(),latest=readState(),catalog=C.read();
  const mode=source==='inventory'?'down':runDraft.mode,scopes=source==='inventory'?['reserve','spot']:clone(runDraft.scopes);
  const at=stamp(),result=R.plan(catalog,latest.rules,mode,scopes),next=R.apply(catalog,result,at);
  const log={type:'delisting-rule',id:'RUN-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,5).toUpperCase(),at,source,mode,scopes,result,version:latest.version,ruleSnapshot:clone(latest.rules.filter(r=>r.enabled)),durationMs:Math.max(1,Math.round(performance.now()-started))};
  next.logs=Array.isArray(next.logs)?next.logs:[];next.logs.push(log);
  // Catalog state and its immutable execution record are saved in one localStorage commit.
  if(!C.commit(next)){toast('执行结果保存失败，商品状态未更新，请重试');return;}
  if($('#modal').open)closeModal();setTab('logs');openLog(log.id);
  toast('执行完成：下架 '+result.down+' 项，上架 '+result.up+' 项，记录已保存');
 }
 function openLog(id){
  const log=allLogs().find(x=>x.id===id);if(!log)return;currentLog=log;
  const scopes=log.scopes.map(k=>R.kinds[k]).join('、'),snap=log.ruleSnapshot.filter(r=>r.scopes.some(k=>log.scopes.includes(k)));
  modal('规则执行日志','<div class="modal-content"><div class="record-meta"><div>执行编号：<b>'+E(log.id)+'</b></div><div>执行时间：<b>'+E(log.at)+'</b></div><div>执行来源：<b>'+(log.source==='inventory'?'库存更新自动执行（演示）':'手动执行')+'</b></div><div>执行方式：<b>'+(log.mode==='full'?'全量重置上下架':'仅下架命中商品')+'</b></div><div>执行范围：<b>'+scopes+'</b></div><div>配置版本：<b>V'+log.version+'</b>　'+badge('执行成功','green')+'</div></div><div class="console">'+E(log.at)+' [INFO] 开始执行，范围：'+scopes+'\n[INFO] 读取配置快照 V'+log.version+'，适用规则 '+snap.length+' 条\n[INFO] 扫描 '+log.result.scanned+' 个颜色 SKU，共 '+log.result.pairs+' 个类型项\n[INFO] 命中 '+log.result.matched+' 项；下架 '+log.result.down+' 项；上架 '+log.result.up+' 项；不变 '+log.result.unchanged+' 项\n<span class="ok">[SUCCESS] 状态与执行记录已保存 · 演示处理耗时 '+log.durationMs+' ms</span></div><div class="snapshot"><strong>本次执行的规则快照</strong>'+(snap.length?snap.map(r=>'<p>'+E(r.id+' · '+r.name+' ｜ '+r.scopes.map(k=>R.kinds[k]).join('、')+' ｜ '+r.conditions.map(R.describe).join(' 且 '))+'</p>').join(''):'<p>无适用的启用规则</p>')+'</div><div class="section-caption">商品处理明细 <label><input type="checkbox" id="onlyChanges" checked> 仅看状态变更</label></div><div id="logDetails"></div><p class="summary-note">每项为一个颜色 SKU 的一种商品类型。历史日志保留执行时的数据，不随规则修改变化。</p></div><div class="modal-footer"><button class="button" data-action="close-modal">关闭</button></div>');renderLogDetails();
 }
 function renderLogDetails(){
  if(!currentLog)return;const only=$('#onlyChanges').checked,details=currentLog.result.details.filter(x=>!only||x.changed);
  $('#logDetails').innerHTML=details.length?'<div class="plan-table"><table><thead><tr><th>商品 / 颜色 SKU</th><th>类型</th><th>原状态 → 执行后</th><th>命中规则 / 处理原因</th></tr></thead><tbody>'+details.map(x=>'<tr><td>'+E(x.title)+'<small class="cell-sub">'+E(x.skuId)+'</small></td><td>'+R.kinds[x.kind]+'</td><td>'+E(x.before?'已上架':'已下架')+' → '+E(x.after?'已上架':'已下架')+'</td><td>'+E(x.ruleNames.length?x.ruleNames.join('、'):currentLog.mode==='full'?'未命中，设置为上架':'未命中，保持原状态')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty" style="padding:20px">本次没有状态变更，可取消勾选查看全部处理项。</div>';
 }
 function toggle(id){const next=readState(),r=next.rules.find(x=>x.id===id);if(!r)return;r.enabled=!r.enabled;r.updatedAt=stamp();next.version++;if(saveState(next)){render();toast(r.enabled?'规则已启用，下次执行时应用':'规则已停用，已下架商品保留当前状态');}}
 function remove(id){
  const rule=state.rules.find(r=>r.id===id);if(!rule)return;
  modal('删除下架规则','<div class="modal-content"><p>确认删除“'+E(rule.name)+'”？</p><p class="summary-note">历史执行记录会保留；已下架商品保持当前状态。</p></div><div class="modal-footer"><button class="button" data-action="close-modal">取消</button><button class="button danger" data-action="confirm-delete" data-id="'+E(id)+'">删除规则</button></div>');
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action,id=button.dataset.id;
  if(action==='tab-rules')setTab('rules');if(action==='tab-logs')setTab('logs');
  if(action==='create')openEditor();if(action==='edit')openEditor(id);if(action==='copy')openEditor(id,true);
  if(action==='toggle')toggle(id);if(action==='delete')remove(id);
  if(action==='close-editor')closeEditor();if(action==='close-modal')closeModal();
  if(action==='add-condition'){syncDraft();draft.conditions.push({field:'grade',op:'in',values:[]});renderEditor();}
  if(action==='remove-condition'){syncDraft();draft.conditions.splice(Number(button.dataset.index),1);renderEditor();}
  if(action==='clear-filters'){$('#ruleSearch').value='';$('#scopeFilter').value='';$('#statusFilter').value='';renderRules();}
  if(action==='run')openRun();if(action==='confirm-run')execute();
  if(action==='inventory')execute('inventory');if(action==='log-detail')openLog(id);if(action==='refresh-logs')render();
  if(action==='confirm-delete'){const next=readState();next.rules=next.rules.filter(r=>r.id!==id);next.version++;if(saveState(next)){closeModal();render();toast('规则已删除，历史执行记录保留');}}
  if(action==='products'){if(window.parent!==window&&window.parent.setView)window.parent.setView('presaleProducts');else toast('请从平台“商品管理”入口打开商品列表');}
  document.querySelectorAll('.multi-select[open]').forEach(el=>{if(!el.contains(event.target))el.open=false;});
 });
 document.addEventListener('change',event=>{
  const el=event.target;
  if(['scopeFilter','statusFilter'].includes(el.id))renderRules();if(el.id==='logSourceFilter')renderLogs();
  if(el.dataset.conditionField!==undefined){syncDraft();const i=Number(el.dataset.conditionField);draft.conditions[i]=el.value==='quantity'?{field:'quantity',op:'lt',value:10}:{field:el.value,op:'in',values:[]};renderEditor();}
  if(el.dataset.conditionOp!==undefined)draft.conditions[Number(el.dataset.conditionOp)].op=el.value;
  if(el.dataset.conditionValue!==undefined)draft.conditions[Number(el.dataset.conditionValue)].value=el.value;
  if(el.dataset.conditionOption!==undefined){const i=Number(el.dataset.conditionOption),details=el.closest('details'),values=[...details.querySelectorAll('[data-condition-option]:checked')].map(x=>x.value);draft.conditions[i].values=values;details.querySelector('summary span').textContent=values.join('、')||'请选择，可多选';}
  if(el.name==='runMode'||el.name==='runScope'){runDraft.mode=$('[name="runMode"]:checked').value;runDraft.scopes=[...document.querySelectorAll('[name="runScope"]:checked')].map(x=>x.value);updateRunOptions();}
  if(el.id==='onlyChanges')renderLogDetails();
 });
 document.addEventListener('input',event=>{
  if(event.target.id==='ruleSearch')renderRules();
  if(event.target.classList.contains('option-search')){const query=event.target.value.trim().toLowerCase();event.target.parentElement.querySelectorAll('[data-option]').forEach(el=>el.hidden=!el.dataset.option.includes(query));}
 });
 $('#ruleForm').addEventListener('submit',event=>{event.preventDefault();persistRule();});
 $('#editor').addEventListener('cancel',()=>{draft=null;});$('#modal').addEventListener('cancel',()=>{runDraft=null;currentLog=null;});
 window.addEventListener('storage',event=>{if(event.key===KEY||event.key===C.KEY){render();if(runDraft)updateRunOptions();}});
 window.delistingDemo={render,get rules(){return clone(readState());}};
 render();
})();
