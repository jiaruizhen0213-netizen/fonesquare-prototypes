/* Order-card details use the selected order; pickup remains read-only. */
(function(){
 const isStore=!!document.getElementById('roleSwitch'),target=isStore?'storeOrderDetail':'won',page=document.getElementById(target+'Page');
 const S=window.SharedDetail;
 const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let selected=null,returnY=0;
 const snapshots={
  'FSO-260821-0098':{lot:'FS-HK-260821-0186',sold:'2026-08-21 11:02',condition:'A',privacy:['未记录','Not recorded'],returns:['未发起','Not initiated']},
  'FSO-260819-0039':{model:'huawei',reportTime:'2026-08-19 09:30',lot:'FS-HK-260819-0039',sold:'2026-08-19 11:02',deliveredAt:'2026-08-21 10:10',privacy:['通过','Passed'],returns:['未发起','Not initiated']},
  'FSO-260820-0048':{model:'huawei',lot:'FS-HK-260820-0048',sold:'2026-08-20 11:02',privacy:['不通过','Failed'],returns:['运营未发起','Not initiated by operations']},
  'FSO-260827-0101':{model:'samsung',lot:'FS-MY-260823-0197',source:['卖家接受预中标价','Seller accepted pre-winning price']}
 };
 const allowed=card=>card&&!card.hidden&&(!isStore||document.getElementById('roleSwitch').value!=='employee'||card.dataset.owner==='jia');
 function back(){showPage('orders');requestAnimationFrame(()=>window.scrollTo(0,returnY));}
 function render(){
  const card=document.querySelector('#ordersPage [data-order-id="'+selected+'"]');if(!allowed(card)){back();page.replaceChildren();return;}
  const en=document.documentElement.lang==='en',t=(zh,enText)=>en?enText:zh;
  const data=snapshots[selected]||{},delivered=(card.dataset.orderCard||card.dataset.orderStatus)==='delivered',pending=(card.dataset.orderCard||card.dataset.orderStatus)==='pending';
  const row=(label,value)=>'<div class="summary-row"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
  const owner=card.dataset.owner==='jia'||!['FSO-260820-0048','FSO-260819-0039'].includes(selected)?t('贾瑞真','Jia Ruizhen'):'Aina Rahman';
  const amount=card.querySelector('.unified-order-facts>span strong').textContent;
  page.innerHTML='<header class="topbar"><button class="icon-button" type="button" id="orderDetailBack" aria-label="'+t('返回订单','Back to orders')+'">‹</button><h1>'+t('订单详情','Order Details')+'</h1><span></span></header>'+
   S.product(S.models[data.model||'iphone'])+'<section class="section">'+row(t('订单号','Order number'),selected)+row(t('商家名称','Merchant'),'FS Retail Malaysia')+row(t('店铺名称','Store'),t('中心旗舰店','Central Flagship Store'))+row(t('实际建拍操作人','Actual listing operator'),owner)+'</section>'+
   '<section class="section">'+row(isStore?t('卖家应得金额','Seller proceeds'):t('成交价格','Transaction price'),amount)+(data.lot?row(t('标单号','Lot number'),data.lot):'')+(data.sold?row(t('成交时间','Transaction time'),data.sold):'')+(data.source?row(t('成交来源','Transaction source'),data.source[en?1:0]):'')+'</section>'+
   '<section class="section"><h2 class="section-title">'+t('取货结果','Pickup result')+'</h2>'+row(t('取货状态','Pickup status'),pending?t('待取货','Pending Pickup'):delivered?t('已送达','Delivered'):t('已取货','Picked Up'))+row(t('实际取货时间','Actual pickup time'),pending?'—':card.querySelector('.unified-pickup-time strong').textContent)+(delivered?row(t('实际送达时间','Actual delivery time'),data.deliveredAt):'')+'<p class="small muted">'+t('取货结果由平台督导维护，本页面只读。','Pickup is recorded by the platform supervisor. This page is read-only.')+'</p></section>'+
   (data.privacy?'<section class="section">'+row(t('隐私结果','Privacy result'),data.privacy[en?1:0])+row(t('退回状态','Return status'),data.returns[en?1:0])+'</section>':'');
  const reportData=snapshots[selected]?{...S.models[data.model||'iphone']}:null;
  if(reportData&&data.reportTime)reportData.time=data.reportTime;
  page.insertAdjacentHTML('beforeend',S.report(reportData));
  S.wire(page);
  document.getElementById('orderDetailBack').onclick=back;
 }
 page.setAttribute('data-no-i18n','');
 document.querySelectorAll('#ordersPage [data-order-id]').forEach(card=>{
  card.removeAttribute('data-toast');
  card.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();if(!allowed(card))return;selected=card.dataset.orderId;returnY=window.scrollY;render();showPage(target);},true);
 });
 if(isStore)document.getElementById('roleSwitch').addEventListener('change',()=>{if(page.classList.contains('active')){page.replaceChildren();selected=null;back();}});
 let lastLanguage=document.documentElement.lang;
 new MutationObserver(()=>{const next=document.documentElement.lang;if(next===lastLanguage)return;lastLanguage=next;if(selected&&page.classList.contains('active'))render();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
