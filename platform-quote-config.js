/* Additive navigation only: the quotation prototype owns isolated storage and UI. */
(function(w){
 const d=w.document,anchor=d.querySelector('[data-nav="roundList"]'),pageAnchor=d.querySelector('#roundListPage');
 if(!anchor||!pageAnchor||typeof w.setView!=='function')return;
 const nav=d.createElement('div');nav.className='nav-item';nav.dataset.nav='quoteConfig';nav.tabIndex=0;nav.setAttribute('role','button');nav.innerHTML='◷ <span>报价配置</span>';anchor.after(nav);
 const page=d.createElement('section');page.className='page';page.id='quoteConfigPage';page.innerHTML='<iframe title="自营阶梯报价配置" src="quote-config.html?embed=1&v=20260917-4" style="width:100%;min-height:850px;border:0;background:transparent" loading="lazy"></iframe>';pageAnchor.after(page);
 const prev=w.setView;w.setView=function(view){prev(view);if(view==='quoteConfig'){d.querySelector('#crumbGroup').textContent='竞拍运营';d.querySelector('#crumbCurrent').textContent='报价配置';}};
 nav.onclick=()=>w.setView('quoteConfig');nav.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();nav.click();}};
 if(location.hash==='#quoteConfig')w.setView('quoteConfig');
})(window);
