/* Add one B2B product-management page; leave the existing product list intact. */
(function(w){
 'use strict';
 const d=w.document,nav=d.querySelector('[data-system-nav="b2b"]');
 const products=nav&&nav.querySelector('[data-nav="presaleProducts"]');
 if(!products||!w.setView)return;
 const view='delistingRules',button=d.createElement('div');
 button.className='nav-item';button.dataset.nav=view;button.tabIndex=0;
 button.setAttribute('role','button');
 button.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/><circle cx="9" cy="18" r="2" fill="white"/></svg><span>下架规则配置</span>';products.after(button);
 const page=d.createElement('section');page.id=view+'Page';page.className='page';
 const frame=d.createElement('iframe');frame.title='下架规则配置';
 frame.dataset.src='delisting-rules/index.html?v=20261104-2';
 frame.style.cssText='width:100%;height:calc(100vh - 125px);min-height:720px;border:0;background:transparent';
 page.append(frame);d.querySelector('#presaleProductsPage').after(page);
 const original=w.setView;
 w.setView=function(value){
  if(value===view&&nav.hidden)return;
  original(value);
  if(value===view){
   if(!frame.getAttribute('src'))frame.src=frame.dataset.src;
   d.querySelector('#crumbGroup').textContent='商品管理';
   d.querySelector('#crumbCurrent').textContent='下架规则配置';
  }
 };
 button.onclick=()=>{if(!nav.hidden)w.setView(view);};
 button.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();button.click();}};
 function deepLink(){
  if(location.hash!=='#delistingRules')return;
  if(nav.hidden)d.querySelector('[data-system-option="b2b"]').click();
  w.setView(view);
 }
 w.addEventListener('hashchange',deepLink);deepLink();
})(window);
