/* Share the published report without changing the owning App's action handlers. */
(() => {
  const S=window.SharedDetail,isStore=!!document.getElementById('roleSwitch');
  const mount=(page,data,remark)=>{
    page.querySelectorAll(':scope > .shared-product,:scope > .shared-report').forEach(n=>n.remove());
    const header=page.querySelector('.topbar');header.insertAdjacentHTML('afterend',S.product(data));
    const actions=page.querySelector('.action-bar');
    if(actions)actions.insertAdjacentHTML('beforebegin',S.report(data,{remark}));else page.insertAdjacentHTML('beforeend',S.report(data,{remark}));
    const info=page.querySelector('.field-grid')||Array.from(page.querySelectorAll(':scope > .section')).find(n=>n.querySelector('#lotAuctionCountdown'));
    info?.classList.add('shared-auction-info');
    const next=page.querySelector('#decisionNote')?.closest('section');
    if(next&&actions)actions.before(next);
    S.wire(page);
  };
  if(!isStore){
    const page=document.getElementById('auctionPage');
    page.querySelector('.image-section').hidden=true;
    page.querySelector('.product-title').closest('.section').hidden=true;
    const oldReport=page.querySelector('.inspection');oldReport.hidden=true;
    const original=renderAuction;
    renderAuction=()=>{
      original();
      const key=currentLotKey==='inherited'?'huawei':currentLotKey==='no-reference'?'samsung':'iphone';
      const data={...S.models[key],name:key==='samsung'?document.getElementById('auctionProduct').textContent.replace(/(\d+)G\b/g,'$1GB'):S.models[key].name,spec:document.getElementById('auctionSpecs').textContent,grade:document.getElementById('auctionCondition').textContent};
      const remark=document.getElementById('auctionRemarks');
      const remarkText=document.getElementById('auctionRemarksText').textContent;
      oldReport.append(remark);
      mount(page,data,remarkText);
      // Move the existing remark nodes into the visible report; renderer IDs remain stable.
      const fresh=page.querySelector(':scope > .shared-report');
      fresh.querySelector('.shared-remark')?.remove();
      Array.from(remark.childNodes).filter(n=>n.nodeType===3).forEach(n=>n.textContent=S.t('：',': '));
      remark.className='lot-remarks shared-remark';fresh.querySelector('.shared-report-heading').after(remark);
    };
    renderAuction();
  }else{
    const lot=document.getElementById('lotPage'),pre=document.getElementById('preWinnerDetailPage');
    const other=document.getElementById('otherAuctionPage');
    const otherCard=document.querySelector('#auctionList [data-owner="aina"]');
    otherCard.removeAttribute('data-toast');
    otherCard.addEventListener('click',()=>{if(document.getElementById('roleSwitch').value==='employee')return;showPage('otherAuction');});
    document.getElementById('roleSwitch').addEventListener('change',()=>{if(other.classList.contains('active'))showPage('auctions');});
    function render(){
      if(other.classList.contains('active')){
        if(document.getElementById('roleSwitch').value==='employee'){other.querySelectorAll('.shared-product,.shared-report,.shared-auction-fields').forEach(n=>n.remove());showPage('auctions');return;}
        other.querySelector('.shared-auction-fields')?.remove();
        mount(other,S.models.huawei);
        other.querySelector('.shared-report').insertAdjacentHTML('beforebegin','<section class="section shared-auction-fields" data-no-i18n><h2>'+S.t('竞拍信息','Auction information')+'</h2><p>'+S.t('标单号','Lot number')+'：FS-MY-260823-0208</p><p>'+S.t('竞拍状态：竞拍中','Auction status: Bidding')+'</p><p>'+S.t('竞拍轮次：第 1 轮','Auction round: 1')+'</p><p>'+S.t('本轮结果：—','Round result: —')+'</p><p>'+S.t('币种：MYR','Currency: MYR')+'</p><p>'+S.t('剩余时间：','Time left: ')+(otherCard.querySelector('[data-auction-countdown]')?.textContent||'—')+'</p><p>'+S.t('实际建拍操作人','Actual listing operator')+'：Aina Rahman</p></section>');
      }
      if(lot.classList.contains('active')){
        const name=lot.querySelector('.device-summary .product-name')?.textContent||'';
        const key=/Huawei|华为/i.test(name)?'huawei':/Samsung|三星/i.test(name)?'samsung':'iphone';
        const published=document.getElementById('publishedLotRemarkText').textContent;
        const data={...S.models[key]};
        if(published){data.name=name;data.spec=lot.querySelector('.device-summary .specs')?.textContent||data.spec;}
        mount(lot,data,published||undefined);
      }
      if(pre.classList.contains('active'))mount(pre,S.models.samsung);
    }
    [lot,pre,other].forEach(page=>new MutationObserver(render).observe(page,{attributes:true,attributeFilter:['class']}));
    let lastLanguage=document.documentElement.lang;
    new MutationObserver(()=>{const next=document.documentElement.lang;if(next===lastLanguage)return;lastLanguage=next;render();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    // Keep the pre-publication editor in the report and retain all save/validation IDs.
    const reportPage=document.getElementById('reportPage');
    const editor=document.getElementById('lotRemark').closest('section');
    const facts=Array.from(reportPage.querySelectorAll(':scope > section')).find(s=>s.textContent.includes('主要问题'));
    const title=document.createElement('div');title.className='shared-report-heading';title.innerHTML='<div><h2>验机报告</h2><p>质检结果核对与备注</p></div>';
    facts.classList.add('shared-report');facts.prepend(title);title.after(editor);
    render();
  }
})();
