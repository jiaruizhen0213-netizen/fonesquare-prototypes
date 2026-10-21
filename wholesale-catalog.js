/* Isolated mock catalog shared by the wholesale App and B2B prototype only. */
(function(w){'use strict';
const KEY='fs-wholesale-reservation-v2',VERSION=2,stamp=()=>new Date().toLocaleString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'});
const esc=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pool(prefix,n,price,missing=0){return Array.from({length:n},(_,i)=>({id:prefix+'-'+(i+1),settlement:i<n-missing?price:null}));}
function seed(){const at='2026/10/21 09:00:00';const defs=[
 ['W001','iPhone 16','128G','A','大陆国行','白色',4050,2,356,298000,285000,6],
 ['W002','iPhone 16','128G','A','大陆国行','黑色',3900,3,87,280000,275000,0],
 ['W003','iPhone 16','128G','A','大陆国行','粉色',4900,0,120,0,310000,0],
 ['W004','iPhone 16','256G','B','大陆国行','白色',4300,5,0,300000,0,0],
 ['W005','iPhone 15 Pro','256G','A','美国版','原色钛金属',null,0,63,0,0,63],
 ['W006','iPhone 14','128G','C','大陆国行','紫色',2100,1,210,145000,135000,0],
 ['W007','iPhone 13','128G','B','大陆国行','绿色',1600,0,9,0,100000,0],
 ['W008','iPhone 15','128G','A','大陆国行','蓝色',2800,0,0,0,0,0],
 ['W009','iPhone 15 Plus','256G','B','国际版','黑色',3200,0,500,0,220000,0]
 ];return {schema:VERSION,revision:0,skus:defs.map((a,i)=>({id:a[0],code:'PMS-'+a[0],model:a[1],memory:a[2],grade:a[3],channel:a[4],color:a[5],price:a[6],currency:'HKD',site:'香港',enabled:true,fx:1.10,fxAt:at,spot:pool(a[0]+'-SPOT',a[7],a[9]),reserve:pool(a[0]+'-RES',a[8],a[10],a[11]),createdAt:at,updatedAt:at,report:'RPT-'+a[0],reportAt:at,photos:['背面','正面','侧面']})),logs:[]};}
function read(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x?.schema===VERSION&&Array.isArray(x.skus))return x;}catch{}return seed();}
function commit(data){try{localStorage.setItem(KEY,JSON.stringify(data));w.dispatchEvent(new CustomEvent('wholesale-change'));return true;}catch{return false;}}
const groupKey=s=>JSON.stringify([s.site,s.model,s.memory,s.grade,s.channel]);
const title=s=>`${s.model} ${s.memory} / ${s.grade}级 / ${s.channel}`;
const band=n=>n>=100?'100+':n>=10?Math.floor(n/10)*10+'+':'0';
const canReserve=s=>s.reserve.length>=10;
const canSpot=s=>s.spot.length>0&&Number.isFinite(s.price)&&s.price>0;
const visible=s=>s.enabled&&(s.spot.length>0||canReserve(s));
function groups(data,publicOnly=false){const map=new Map();for(const s of data.skus){if(publicOnly&&!visible(s))continue;const k=groupKey(s);if(!map.has(k))map.set(k,{key:k,...Object.fromEntries(['model','memory','grade','channel','site'].map(k=>[k,s[k]])),skus:[]});map.get(k).skus.push(s);}return [...map.values()];}
function priceRange(skus){const a=skus.map(s=>s.price).filter(x=>Number.isFinite(x)&&x>0);if(!a.length)return '联系销售询价';const lo=Math.min(...a),hi=Math.max(...a);return 'HKD '+number(lo)+(lo===hi?'':'～'+number(hi));}
function number(x,d=0){return Number(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});}
function cost(s,kind){const items=s[kind],valid=items.filter(x=>Number.isFinite(x.settlement)&&x.settlement>0);const avg=valid.length?valid.reduce((n,x)=>n+x.settlement,0)/valid.length/100:null;const hkd=avg!=null&&s.fx>0?avg*s.fx:null;const margin=hkd!=null&&s.price>0?s.price-hkd:null;return {count:items.length,valid:valid.length,missing:items.length-valid.length,average:avg,hkd,margin,rate:margin==null?null:margin/s.price*100};}
function listing(ids,enabled){const data=read(),targets=data.skus.filter(s=>ids.includes(s.id)&&s.enabled!==enabled);if(!targets.length)return {ok:true,count:0};const at=stamp();for(const s of targets){s.enabled=enabled;s.updatedAt=at;}data.revision++;data.logs.unshift({by:'演示运营员',time:at,action:enabled?'上架':'下架',ids:targets.map(s=>s.id),content:targets.map(s=>`${title(s)} / ${s.color}`).join('；')});return {ok:commit(data),count:targets.length};}
function refreshInventory(){const data=read(),at=stamp();data.revision++;for(const s of data.skus)s.updatedAt=at;return commit(data);}
function image(s,i=0,uid='photo'){const fill={'白色':'#e8eceb','黑色':'#43474d','蓝色':'#b5c6db','绿色':'#c5d6c4','紫色':'#c8c0d6','粉色':'#e8ced2'}[s.color]||'#c9c5be';return `<svg viewBox="0 0 180 260" role="img" aria-label="${esc(s.color)}${esc(s.photos[i])}白底示意图"><rect width="180" height="260" fill="white"/>${i===2?`<rect x="81" y="10" width="18" height="230" rx="7" fill="${fill}" stroke="#8c9299"/><rect x="98" y="71" width="3" height="26" rx="1" fill="#858d93"/>`:`<rect x="33" y="10" width="114" height="230" rx="23" fill="${fill}" stroke="#8c9299"/>${i===1?'<rect x="38" y="15" width="104" height="220" rx="19" fill="#202936"/><rect x="63" y="22" width="54" height="12" rx="6" fill="#070e16"/>':`<rect x="42" y="21" width="49" height="57" rx="14" fill="${fill}" stroke="#949ca5"/><circle cx="56" cy="36" r="10" fill="#282e36"/><circle cx="77" cy="60" r="10" fill="#252d37"/>`}<text x="90" y="139" text-anchor="middle" fill="white" font-size="10">FONE</text>`}</svg>`;}
function report(s){return [['屏幕显示状况','屏幕显示完好'],['屏幕外观状况',s.grade==='A'?'外观完美或仅有极细软划痕':'可见轻微划痕'],['边框背板状况',s.grade==='A'?'可能有极轻微磕碰掉漆':'可见轻微磕碰、划痕'],['功能状况','功能正常'],['维修状况','无维修'],['电池健康度',s.grade==='A'?'90%–99%':'80%–89%']];}
w.WholesaleCatalog={KEY,seed,read,commit,groups,groupKey,title,band,canReserve,canSpot,visible,priceRange,number,cost,listing,refreshInventory,image,report,esc};
})(window);
