/* Contact details belong only to this recycler merchant, never to supplier stores. */
(function () {
  const A=window.ShopAddress, q=id=>document.getElementById(id);
  const profile={merchantId:'FSR-MY-0088',registrationRegion:'马来西亚',kyc:'未认证'};
  const storageKey='fs-recycler-contact-v1:'+profile.merchantId;
  const t=(zh,en)=>currentLanguage==='zh'?zh:en;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const entry=document.createElement('button');entry.type='button';entry.className='menu-row';entry.id='recyclerContactEntry';
  q('mePage').querySelector('.menu-heading').after(entry);
  function renderEntry(){entry.innerHTML='<span class="menu-icon" aria-hidden="true">⌖</span><span><span class="menu-title">'+t('联系信息','Contact Information')+'</span><span class="menu-description">'+t('维护联系地址和联系电话','Manage contact address and phone number')+'</span></span><span class="chevron" aria-hidden="true">›</span>';}
  const page=document.createElement('section');page.id='recyclerContactPage';page.className='page';page.dataset.page='contact';q('mePage').after(page);pages.push(page);
  const style=document.createElement('style');style.textContent='#recyclerContactPage .contact-phone label{display:block;font-size:14px;color:#595959;margin-bottom:6px}#recyclerContactPage .contact-phone input{width:100%;padding:12px;border:1px solid #ddd;border-radius:6px}#recyclerContactPage .contact-error{color:#c5221f;font-size:13px}#recyclerContactPage .action-bar{grid-template-columns:1fr}';document.head.append(style);
  function readSaved(){try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}}
  function open(){
    const saved=readSaved();
    page.innerHTML='<header class="topbar"><button class="icon-button" type="button" id="contactBack" aria-label="'+t('返回','Back')+'">‹</button><h1>'+t('联系信息','Contact Information')+'</h1><span></span></header><section class="section"><div class="field"><label>'+t('联系地址','Contact Address')+'</label><input id="recyclerContactAddress" /></div><div class="contact-phone"><label for="recyclerContactPhone">'+t('联系电话','Contact Number')+'</label><input id="recyclerContactPhone" type="tel" value="'+esc(saved?.phone||'')+'" autocomplete="tel" /></div><p class="contact-error" id="contactError" role="alert"></p></section><nav class="action-bar"><button class="action-button primary" type="button" id="saveRecyclerContact">'+t('保存','Save')+'</button></nav>';
    const form=A.mount(q('recyclerContactAddress'),A.initial(profile,saved),currentLanguage==='en');
    form.element.querySelector('.shop-address-grid').previousElementSibling.textContent=t('联系地址','Contact Address');
    q('contactBack').onclick=()=>showPage('me');
    q('saveRecyclerContact').onclick=()=>{
      const error=form.error(),phone=q('recyclerContactPhone').value.trim();
      if(error){q('contactError').textContent=error;return;}
      const addressParts=form.read();
      try{localStorage.setItem(storageKey,JSON.stringify({addressParts,address:A.full(addressParts),phone}));}
      catch{q('contactError').textContent=t('保存失败，请重试。','Save failed. Please try again.');return;}
      showPage('me');showToast('Contact information saved','联系信息已保存');
    };
    showPage('contact');
  }
  entry.onclick=open;renderEntry();
  document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',renderEntry));
})();
