/* B2B-only additive entry points. Existing pages and storage remain untouched. */
(function(w){
 'use strict';
 const d=w.document,nav=d.querySelector('[data-system-nav="b2b"]'),anchor=d.querySelector('#b2bHomePage');
 if(!nav||!anchor)return;
 const modules={presaleProducts:['商品管理','products'],presaleRecords:['更新与异常记录','records']};
 const group=d.createElement('div');group.className='nav-group';group.textContent='商品管理';nav.append(group);
 for(const [view,[label,mode]] of Object.entries(modules)){
  const button=d.createElement('div');button.className='nav-item';button.dataset.nav=view;button.tabIndex=0;button.setAttribute('role','button');button.textContent='▤ '+label;if(view==='presaleRecords'){button.hidden=true;button.style.display='none';}nav.append(button);
  const page=d.createElement('section');page.id=view+'Page';page.className='page';const frame=d.createElement('iframe');frame.title=label;frame.dataset.src='presale-admin/index.html?mode='+mode+'&v=20261022-3';frame.style.cssText='width:100%;height:calc(100vh - 125px);min-height:700px;border:0;background:transparent';page.append(frame);anchor.after(page);
  button.onclick=()=>{if(nav.hidden)return;w.setView(view);};button.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();button.click();}};
 }
 const original=w.setView;
 w.setView=function(view){
  if(modules[view]&&nav.hidden)return;
  original(view);
  if(modules[view]){const frame=d.querySelector('#'+view+'Page iframe');if(!frame.src)frame.src=frame.dataset.src;d.querySelector('#crumbGroup').textContent='海外 B2B 管理后台';d.querySelector('#crumbCurrent').textContent=modules[view][0];}
 };
})(window);
