/* Prototype-only bank data, shared by both portals on the same origin. */
(function () {
  const key = 'fs-merchant-banks-v1';
  let data;
  try { data = JSON.parse(localStorage.getItem(key)); } catch (_) {}
  if (!data || !data.accounts || !data.stores) data = {accounts:{}, stores:{}, history:[]};
  const copy = value => JSON.parse(JSON.stringify(value));
  function persist() { localStorage.setItem(key, JSON.stringify(data)); }
  function list(merchantId) { return copy(data.accounts[merchantId] || []); }
  function account(merchantId, id) { return list(merchantId).find(a => a.id === id); }
  function label(a) { return a ? `${a.bankName} · •••• ${a.accountNumber.slice(-4)} · ${a.holder}` : '未配置'; }
  function used(merchantId, id) { return Object.values(data.stores).filter(s => s.merchantId === merchantId && s.accountId === id); }
  function save(merchantId, draft, id, operator) {
    if (!draft.holder.trim() || !draft.bankName.trim() || !/^\d{8,20}$/.test(draft.accountNumber)) throw Error('请填写收款人银行登记名称、收款银行和8–20位银行账号。');
    const rows = data.accounts[merchantId] ||= [];
    if (rows.some(a => a.id !== id && a.bankName === draft.bankName && a.accountNumber === draft.accountNumber)) throw Error('该银行账号已存在，请选择已有账户。');
    const before = id && rows.find(a => a.id === id);
    if (id && !before) throw Error('账户不存在，请重新选择。');
    const next = {...draft, id:id || 'MBA-' + crypto.randomUUID(), updatedAt:new Date().toLocaleString('zh-CN')};
    data.history.push({merchantId, action:before?'编辑商家账户':'新增商家账户', before:label(before), after:label(next), operator, at:next.updatedAt});
    if (before) rows.splice(rows.indexOf(before), 1, next); else rows.push(next);
    persist(); return copy(next);
  }
  function bind(storeKey, merchantId, name, accountId, independent, operator) {
    if (accountId && !account(merchantId, accountId)) throw Error('请选择本商家的有效账户。');
    const old = data.stores[storeKey];
    const next = {merchantId, name, accountId:accountId || null, independent:accountId?null:copy(independent)};
    data.history.push({merchantId, action:'店铺收款配置：'+name, before:old?label(old.accountId?account(merchantId,old.accountId):old.independent):'原店铺账户', after:label(accountId?account(merchantId,accountId):independent), operator, at:new Date().toLocaleString('zh-CN')});
    data.stores[storeKey]=next; persist();
  }
  function attach(store, storeKey, merchantId) {
    let original = copy(store.bank);
    Object.defineProperty(store, 'bank', {configurable:true, enumerable:true,
      get() { const s=data.stores[storeKey]; return s?.merchantId===merchantId ? (s.accountId?account(merchantId,s.accountId):copy(s.independent)) || original : original; },
      set(value) { original=copy(value); bind(storeKey,merchantId,store.name,null,value,'店铺资料'); }
    });
  }
  window.MerchantBanks = {list, account, label, used, save, bind, attach,
    selection:key => copy(data.stores[key] || {}),
    history:id => copy(data.history.filter(h=>h.merchantId===id)).reverse()};
  window.addEventListener('storage', e => { if(e.key===key && e.newValue) {try {data=JSON.parse(e.newValue);window.dispatchEvent(new Event('merchant-banks-changed'));}catch(_){}} });
})();
