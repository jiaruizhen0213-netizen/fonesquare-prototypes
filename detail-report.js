/* Shared frozen report examples and presentation for both Apps. */
(() => {
  const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t = (zh,en) => document.documentElement.lang === 'en' ? en : zh;
  const models = {
    iphone: {name:['iPhone 17 Pro Max 512GB 星宇橙','iPhone 17 Pro Max 512GB Starry Orange'],spec:['国行 · 电池健康度 90%–95% · 双卡','CN Version · Battery Health 90%–95% · Dual SIM'],grade:'A',time:'2026-08-21 09:30',remark:['边框右下角有轻微划痕。\n仅设备本体，不含充电器和包装盒。','Minor scratches on the lower-right frame.\nDevice only; charger and box are not included.'],battery:'90%–95%',case:['外壳完好','Perfect casing']},
    huawei: {name:['Huawei Mate 70 Pro 512GB 金色','Huawei Mate 70 Pro 512GB Gold'],spec:['国行 · 电池健康度 85%–90%','CN Version · Battery Health 85%–90%'],grade:'B',time:'2026-08-20 09:30',remark:['后盖有轻微划痕，详见设备照片。','Small scratch on the back cover. See the device photos for details.'],battery:'85%–90%',case:['后盖轻微划痕','Minor back-cover scratches']},
    samsung: {name:['Samsung Galaxy S25 Ultra 256GB 银影蓝','Samsung Galaxy S25 Ultra 256GB Silver Shadow Blue'],spec:['香港版本 · 电池健康度 80%–85%','HK Version · Battery Health 80%–85%'],grade:'A-',time:'2026-08-23 10:18',remark:['边框轻微划痕，功能正常。','Minor frame scratches. Fully functional.'],battery:'80%–85%',case:['边框轻微划痕','Minor frame scratches']}
  };
  const pick = pair => Array.isArray(pair) ? t(...pair) : pair;
  function report(data, options = {}) {
    if (!data) return '<section class="section inspection shared-report"><h2>'+t('验机报告','Inspection Report')+'</h2><p>'+t('暂无该订单的质检快照','No inspection snapshot available for this order')+'</p></section>';
    const remark = options.remark !== undefined ? options.remark : pick(data.remark);
    const rows = [
      [['屏幕外观','Screen Exterior'],['屏幕/机身有轻微划痕','Minor scratches on screen/body'],true],
      [['边框 / 后盖','Frame / Back'],data.case,data.case[0]!=='外壳完好'],
      [['屏幕显示','Screen Display'],['显示完好','Perfect display']],
      [['功能情况','Functionality'],['功能正常','Fully functional']],
      [['维修情况','Repair Status'],['无维修','No repairs']],
      [['电池健康度','Battery Health'],data.battery]
    ];
    return '<section class="section inspection shared-report" data-no-i18n><div class="shared-report-heading"><div><h2>'+t('验机报告','Inspection Report')+'</h2><p>'+t('完成于 ','Completed ')+esc(data.time)+'</p></div><strong>'+esc(data.grade)+'</strong></div>'+
      (String(remark||'').trim()?'<p class="shared-remark"><span>'+t('备注：','Remarks: ')+'</span>'+esc(remark)+'</p>':'')+
      '<dl>'+rows.map(([label,value,issue])=>'<div><dt>'+esc(pick(label))+'</dt><dd'+(issue?' class="issue"':'')+'>'+esc(pick(value))+'</dd></div>').join('')+'</dl></section>';
  }
  function product(data) {
    if(!data)return '';
    return '<div class="shared-product" data-no-i18n><section class="shared-photos"><div class="shared-photo-strip">'+[0,1,2].map((n)=>'<button type="button" class="shared-photo shot-'+n+'" aria-label="'+t('查看设备图片 ','View device photo ')+(n+1)+'"><span class="shared-phone '+(data.grade==='B'?'gold':'')+'"><i></i></span></button>').join('')+'</div><span class="shared-photo-count">1 / 3</span></section><section class="section shared-product-summary"><div><span class="condition-tag">'+esc(data.grade)+'</span><h2>'+esc(pick(data.name))+'</h2></div><p>'+esc(pick(data.spec))+'</p></section></div>';
  }
  function wire(container) {
    container.querySelectorAll('.shared-photos').forEach(box=>{
      const strip=box.querySelector('.shared-photo-strip');
      strip.addEventListener('scroll',()=>box.querySelector('.shared-photo-count').textContent=(Math.round(strip.scrollLeft/strip.clientWidth)+1)+' / 3');
      strip.querySelectorAll('button').forEach((button,index)=>button.addEventListener('click',()=>{
        const dialog=document.createElement('dialog');dialog.className='shared-photo-preview';
        let active=index;
        function draw(){dialog.innerHTML='<button type="button" class="preview-close">'+t('关闭','Close')+'</button><div class="preview-body">'+strip.children[active].innerHTML+'</div><div class="preview-controls"><button type="button" class="preview-prev">‹</button><span>'+(active+1)+' / 3</span><button type="button" class="preview-next">›</button></div>';dialog.querySelector('.preview-body').className='preview-body shared-photo shot-'+active;dialog.querySelector('.preview-close').onclick=()=>dialog.close();dialog.querySelector('.preview-prev').onclick=()=>{active=(active+2)%3;draw();};dialog.querySelector('.preview-next').onclick=()=>{active=(active+1)%3;draw();};}
        document.body.append(dialog);draw();dialog.addEventListener('close',()=>{dialog.remove();button.focus();});dialog.showModal();
      }));
    });
  }
  window.SharedDetail = {models,report,product,wire,esc,t};
})();
