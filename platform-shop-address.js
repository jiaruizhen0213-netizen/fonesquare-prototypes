/* Address-only adapter: retain existing store and merchant-bank save behavior. */
(function(){
 const A=window.ShopAddress,q=id=>document.getElementById(id);
 // Explicit registration and approved KYC fixtures, not inferred from a marketplace.
 Object.entries(A.fixtures).forEach(([mid,p])=>{const u=users.find(u=>u.merchantId===mid);if(u){if(!u.registrationRegion)u.registrationRegion=p.registrationRegion;if(p.kycAddress&&!u.kycAddress)u.kycAddress={...p.kycAddress}}});
 function profile(mid){const user=merchantById(mid)||{};const account=users.find(u=>u.id===user.id&&u.registrationRegion)||user;return {...user,registrationRegion:account.registrationRegion};}
 stores.forEach(s=>{const saved=A.load('pc:'+s.id);if(saved)A.apply(s,saved)});renderStoreList();
 let form,lastMerchant='';
 function mountNew(){q('newStoreAddress').closest('.field').querySelector('.shop-address')?.remove();form=A.mount(q('newStoreAddress'),A.initial(profile(q('newStoreMerchant').value)),currentLanguage==='en');lastMerchant=q('newStoreMerchant').value;}
 const oldSync=syncNewStoreMerchant;syncNewStoreMerchant=function(){oldSync();mountNew()};
 q('newStoreMerchant').onchange=()=>{if(form&&Object.entries(form.read()).some(([k,v])=>k!=='country'&&v)&&!confirm('切换所属商家将清空当前地址，并重新读取新商家的注册资料，是否继续？')){q('newStoreMerchant').value=lastMerchant;return}syncNewStoreMerchant()};
 const save=q('saveStore').onclick;q('saveStore').onclick=function(){const error=form.error();if(error){q('storeError').textContent=error;q('storeError').classList.add('show');return}const a=form.read(),before=stores.length;save.call(this);if(stores.length>before){A.persist('pc:'+stores.at(-1).id,stores.at(-1),a);renderStoreList()}};
 const oldEditor=openStoreEditor;openStoreEditor=function(s){oldEditor(s);const editor=A.mount(q('editStoreAddress'),A.initial(profile(s.merchantId),s),currentLanguage==='en');const save=q('businessConfirmBtn').onclick;q('businessConfirmBtn').onclick=function(){const error=editor.error();if(error){modalError(error);return}const a=editor.read();save.call(this);if(!q('businessModal').classList.contains('show')){A.persist('pc:'+s.id,s,a);renderStoreList();openStoreDetail(s)}}};
 Object.assign(window.prototypeState,{openStoreEditor,shopAddress:A});
})();
