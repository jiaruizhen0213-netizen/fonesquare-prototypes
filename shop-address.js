/* Shared prototype address form. Search candidates are sample data, not Google results. */
(function(root){
  const states=['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Perak','Perlis','Pulau Pinang','Sabah','Sarawak','Selangor','Terengganu','W.P. Kuala Lumpur','W.P. Labuan','W.P. Putrajaya'];
  const countries={MY:'马来西亚',SG:'新加坡',HK:'中国香港',AE:'阿联酋'};
  const code=value=>Object.keys(countries).find(k=>k===value||countries[k]===value)||({Malaysia:'MY',Singapore:'SG','香港':'HK','迪拜':'AE'}[value])||value||'';
  const fields=['country','state','city','postcode','detail'];
  const samples=[
    {country:'MY',state:'Selangor',city:'Petaling Jaya',postcode:'47810',detail:'Demo Garden, 18 Jalan Contoh',name:'Demo Garden 公寓（示例）',keywords:'公寓 garden 雪兰莪'},
    {country:'MY',state:'W.P. Kuala Lumpur',city:'Kuala Lumpur',postcode:'50450',detail:'Demo Tower, 12 Jalan Contoh',name:'Demo Tower 大楼（示例）',keywords:'吉隆坡 大楼 tower'},
    {country:'MY',state:'Johor',city:'Johor Bahru',postcode:'80000',detail:'Demo Square, 8 Jalan Contoh',name:'Demo Square 商业楼（示例）',keywords:'新山 柔佛'},
    {country:'MY',state:'Pulau Pinang',city:'George Town',postcode:'10450',detail:'Demo Garden, 28 Jalan Contoh',name:'Demo Garden 公寓（槟城示例）',keywords:'槟城 公寓 penang garden'}
  ];
  const fixtures={
    M1002:{registrationRegion:'马来西亚',kyc:'未认证'},
    M1003:{registrationRegion:'马来西亚',kyc:'已认证',kycAddress:{country:'MY',state:'Selangor',city:'Petaling Jaya',postcode:'47300',detail:'18, Jalan SS2/24'}},
    M1006:{registrationRegion:'马来西亚',kyc:'已认证',kycAddress:{country:'MY',state:'Johor',city:'Johor Bahru',postcode:'80400',detail:'12, Jalan Serampang, Taman Pelangi'}},
    M1009:{registrationRegion:'马来西亚',kyc:'未认证'}
  };
  function initial(profile={},store){
    const country=code(profile.registrationRegion);
    if(store){return {country:code(store.addressParts?.country||store.country)||country,state:store.addressParts?.state||'',city:store.addressParts?.city||store.city||'',postcode:store.addressParts?.postcode||'',detail:store.addressParts?.detail??store.address??'',prefilled:false};}
    const a={country,state:'',city:'',postcode:'',detail:'',prefilled:false},k=profile.kycAddress;
    if(country&&profile.kyc==='已认证'&&k&&code(k.country)===country){fields.slice(1).forEach(f=>a[f]=k[f]||'');if(country==='MY'&&!states.includes(a.state))a.state='';a.prefilled=fields.slice(1).some(f=>a[f]);}
    return a;
  }
  function validate(a){
    if(!a.country)return '请先补充所属商家的注册国家/地区。';
    if(!a.state||!a.city||!a.postcode||!a.detail)return '请完整填写州、城市、邮政编码和详细地址。';
    if(a.country==='MY'&&!states.includes(a.state))return '请选择有效的州 / 联邦直辖区。';
    if(a.country==='MY'&&!/^\d{5}$/.test(a.postcode))return '马来西亚邮政编码须为 5 位数字。';
    return '';
  }
  const full=a=>[a.detail,[a.postcode,a.city].filter(Boolean).join(' '),a.state,countries[a.country]||a.country].filter(Boolean).join(', ');
  function load(key){try{return JSON.parse(root.localStorage.getItem('fs-shop-address-v1')||'{}')[key]}catch{return undefined}}
  function apply(store,a){store.addressParts={...a};store.address=full(a);store.country=store.merchantId?(countries[a.country]||a.country):a.country;store.city=a.city;}
  function persist(key,store,a){apply(store,a);let saved={};try{saved=JSON.parse(root.localStorage.getItem('fs-shop-address-v1')||'{}')}catch{}saved[key]={...a};root.localStorage.setItem('fs-shop-address-v1',JSON.stringify(saved));}
  const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(input,a,english=false){
    const t=(zh,en)=>english?en:zh,id=input.id+'-parts';
    input.type='hidden';input.hidden=true;
    const host=input.closest('.field,.form-field');host.querySelector('label,span')?.remove();
    // App's form-field itself is a label; use a neutral container for the new controls.
    const box=document.createElement('div');box.className='shop-address';box.setAttribute('data-no-i18n','');
    if(host.tagName==='LABEL'){host.replaceWith(box);box.append(input)}else host.append(box);
    if(!document.getElementById('shop-address-style')){const style=document.createElement('style');style.id='shop-address-style';style.textContent='.shop-address{width:100%;margin:4px 0 16px}.shop-address-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.shop-address label{display:block;font-size:14px;color:#595959;margin-bottom:6px}.shop-address input,.shop-address select{width:100%;box-sizing:border-box;border:1px solid #d9d9d9;border-radius:6px;padding:9px 11px;font:inherit;background:white;color:#333}.shop-address input[readonly]{background:#f5f5f5;color:#666}.shop-address .wide{grid-column:1/-1}.shop-address-note{font-size:12px;color:#888;margin:7px 0;line-height:1.5}.shop-address-results{border:1px solid #ddd;border-radius:6px;max-height:180px;overflow:auto}.shop-address-results button{display:block;width:100%;text-align:left;background:white;border:0;border-bottom:1px solid #eee;padding:10px;font:inherit;color:#444;cursor:pointer}.shop-address-results button:hover{background:#e6f4ff}.shop-address-results small{display:block;color:#888;margin-top:4px}.shop-address [hidden]{display:none!important}@media(max-width:600px){.shop-address-grid{grid-template-columns:1fr}}';document.head.append(style)}
    box.insertAdjacentHTML('beforeend','<div style="font-weight:600;margin-bottom:12px">'+t('店铺地址','Store Address')+'</div><div class="shop-address-grid">'+fields.map((f,i)=>'<div class="'+(f==='detail'?'wide':'')+'"><label for="'+id+'-'+f+'">'+[t('国家/地区','Country/Region'),t('州 / 联邦直辖区','State / Federal Territory'),t('城市','City'),t('邮政编码','Postcode'),t('详细地址','Detailed Address')][i]+' *</label>'+(f==='state'&&a.country==='MY'?'<select id="'+id+'-'+f+'"><option value="">'+t('请选择州 / 联邦直辖区','Select a state')+'</option>'+states.map(s=>'<option>'+s+'</option>').join('')+'</select>':'<input id="'+id+'-'+f+'" '+(f==='country'?'readonly':'')+' '+(f==='postcode'?'inputmode="numeric" maxlength="12"':'maxlength="250"')+' placeholder="'+(f==='detail'?t('输入街道、门牌、小区/大楼及楼层单元号','Street, building, floor and unit'):t('请输入','Enter value'))+'" autocomplete="off" />')+'</div>').join('')+'</div><div class="shop-address-note" data-hint></div><div class="shop-address-results" hidden></div><div class="shop-address-note">'+t('地址搜索为模拟演示，可试填 Demo / 公寓；也可直接手动填写。','Sample search: try Demo; manual entry is supported.')+'</div>');
    const el=f=>document.getElementById(id+'-'+f),results=box.querySelector('.shop-address-results'),hint=box.querySelector('[data-hint]');
    fields.forEach(f=>el(f).value=f==='country'?(countries[a.country]||a.country):a[f]||'');
    if(english&&a.country==='MY')el('country').value='Malaysia';
    hint.textContent=a.prefilled?t('已根据认证资料预填，请核对实际店铺地址。','Prefilled from verified details. Check the store address.'):a.country?'':t('请先补充所属商家的注册国家/地区。','Complete the merchant registration country first.');
    const read=()=>Object.fromEntries(fields.map(f=>[f,f==='country'?a.country:el(f).value.trim()]));
    function sync(){input.value=full(read())}sync();
    box.addEventListener('input',sync);box.addEventListener('change',sync);
    el('detail').addEventListener('input',()=>{results.replaceChildren();const query=el('detail').value.trim().toLowerCase();const matches=query?samples.filter(s=>s.country===a.country&&(s.name+' '+s.keywords+' '+s.city+' '+s.detail).toLowerCase().includes(query)):[];results.hidden=!matches.length;matches.forEach(s=>{const button=document.createElement('button');button.type='button';button.innerHTML=esc(s.name)+'<small>'+esc(s.city+', '+s.state+', Malaysia')+'</small>';button.onclick=()=>{if(el('state').value&&el('state').value!==s.state&&!root.confirm(t('所选地址位于 '+s.state+'，是否更新州并回填地址？','Update state and address to '+s.state+'?')))return;fields.slice(1).forEach(f=>el(f).value=s[f]||'');results.hidden=true;hint.textContent=t('已回填示例地址，请补充门牌、楼层或单元号。','Sample address filled. Add the floor or unit.');sync()};results.append(button)})});
    box.addEventListener('keydown',event=>{if(event.key==='Escape')results.hidden=true});
    box.addEventListener('focusout',()=>setTimeout(()=>{if(!box.contains(document.activeElement))results.hidden=true},0));
    return {read,element:box,error(){const error=validate(read());if(!error)return '';if(!english)return error;return !a.country?'Complete the merchant registration country first.':'Complete all address fields and enter a valid postcode (5 digits for Malaysia).';}};
  }
  root.ShopAddress={states,countries,code,fixtures,initial,validate,full,load,apply,persist,mount};
})(typeof window==='undefined'?globalThis:window);
