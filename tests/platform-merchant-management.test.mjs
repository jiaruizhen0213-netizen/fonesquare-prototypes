import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const platform = readFileSync(new URL('../platform.html', import.meta.url), 'utf8');
const store = readFileSync(new URL('../store.html', import.meta.url), 'utf8');
const recycler = readFileSync(new URL('../recycler.html', import.meta.url), 'utf8');

test('merchant management exposes three independent page routes', () => {
  for (const required of [
    'data-nav="list"', 'data-nav="store"', 'data-nav="staff"',
    'id="listPage"', 'id="storePage"', 'id="staffPage"',
    '>商家列表<', '>店铺列表<', '>店员列表<'
  ]) assert.match(platform, new RegExp(required));

  for (const obsolete of [
    'data-nav="storeMerchant"', 'id="storeMerchantPage"',
    'id="storeMerchantDetailPage"', '>门店用户<'
  ]) assert.doesNotMatch(platform, new RegExp(obsolete));
});

test('merchant list combines App-scoped merchants and conditionally exposes counts', () => {
  for (const required of [
    'function merchantRecords()', 'function merchantSource(',
    'function merchantStoreCount(', 'function merchantStaffCount(',
    '来源 App', 'FoneSquare', '门店端', 'data-merchant-stores', 'data-merchant-staff'
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));

  assert.match(platform, /function merchantStoreCount\(u\)\{return merchantSource\(u\)==='门店端'\?merchantStores\(u\)\.length:null\}/);
  assert.match(platform, /function merchantStaffCount\(u\)\{return merchantSource\(u\)==='门店端'\?employeesForMerchant\(u\.merchantId\)\.length:null\}/);
  assert.match(platform, /storeCount===null\?'—'/);
  assert.match(platform, /staffCount===null\?'—'/);
  assert.doesNotMatch(platform, /本页仅展示 FoneSquare 回收商/);
});

test('merchant rows use merchant record identity rather than reusable account identity', () => {
  assert.match(platform, /data-view="\$\{u\.merchantId\}"/);
  assert.match(platform, /merchantById\(view\.dataset\.view\)/);
  assert.doesNotMatch(platform, /data-view="\$\{u\.id\}"/);
});

test('all merchant cross-navigation resolves App records by merchantId', () => {
  assert.match(platform, /data-store-merchant-view="\$\{m\?\.merchantId\|\|''\}"/);
  assert.doesNotMatch(platform, /data-store-merchant-view="\$\{(?:m\?\.|merchant\.)id/);
  assert.match(platform, /if\(smv\)\{const u=merchantById\(smv\.dataset\.storeMerchantView\);if\(u\)openDetail\(u\)\}/);
  assert.match(platform, /if\(staffMerchant\)\{const merchant=merchantById\(staffMerchant\.dataset\.staffMerchant\);if\(merchant\)openDetail\(merchant\)\}/);
  assert.doesNotMatch(platform, /data-store-merchant-stores/);
  assert.match(platform, /if\(vp\)openDetail\(merchantById\(vp\.dataset\.viewPermission\),'permission'\)/);
  assert.match(platform, /if\(vs\)\{const u=merchantById\(vs\.dataset\.viewStores\);if\(u\)openDetail\(u\)\}/);
  assert.match(platform, /<option value="\$\{u\.merchantId\}">/);
  assert.match(platform, /function syncNewStoreMerchant\(\)\{const u=merchantById\(/);
  assert.match(platform, /function saveStore\(\)\{const u=merchantById\(/);
});

test('merchant detail renders only the selected App record business data', () => {
  assert.match(platform, /function merchantDetailFields\(u\)/);
  assert.match(platform, /merchantSource\(u\)==='FoneSquare'/);
  for (const required of [
    '注册国家 / 地区', '可访问站点', '出价权限',
    '商家建拍权限', '商家分账规则', '来源 App'
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));
});

test('merchant permission enable has prerequisites and no implicit child mutation', () => {
  assert.match(platform, /至少一个有效店铺/);
  assert.match(platform, /分账规则/);
  assert.doesNotMatch(platform, /own\.forEach\(s=>s\.build='开启'\)/);
  assert.doesNotMatch(platform, /employeesForMerchant\([^)]*\)\.forEach\(e=>e\.(businessAccess|personalBuild)='开启'\)/);
  assert.doesNotMatch(platform, /首次开启且暂无店铺时创建默认/);
});

test('store management contains no store-level listing permission', () => {
  for (const obsolete of [
    '店铺建拍权限', 'storeBuildFilter', 'storeBuildSwitch',
    'data-store-build', 'buildOn', 'storeTypeFilter'
  ]) assert.doesNotMatch(platform, new RegExp(obsolete));
  assert.doesNotMatch(platform, /s\.build/);

  for (const required of [
    '银行卡尾号', '联系电话', 'Max 设备数', '启用设备数',
    '店铺编号 / 名称', '所属供货商家'
  ]) assert.match(platform, new RegExp(required));
  assert.match(platform, /bankTail:'\d{4}'/);
  assert.match(platform, /\*\*\*\* \$\{s\.bankTail\}/);
  assert.match(platform, /enabledDevices=devices\.filter\(d=>d\.status==='启用'\)\.length/);
});

test('staff list excludes merchant primary accounts and exposes relation history', () => {
  for (const required of [
    'function staffAccounts()', 'function staffRelationStatus(',
    'function renderStaffList()', 'function openStaffDetail(',
    '当前所属商家', '关联状态', '历史所属商家', '已解除'
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));
  assert.doesNotMatch(platform, /employeeAccounts\.unshift/);
  assert.doesNotMatch(platform, /isMerchantMain:true/);
});

test('staff listing permission keeps configuration separate from effective state', () => {
  for (const required of [
    'function memberBuildState(', 'personalBuild', '个人配置', '实际状态',
    '已生效', '已关闭', '未生效（商家权限关闭）'
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));
  assert.match(platform, /merchant\.build==='开启'/);
  assert.match(platform, /staff\.personalBuild==='开启'/);
});

test('staff relationship actions preserve personal configuration and remove mixed-page handlers', () => {
  for (const required of [
    'function applyStaffFilters()', 'function resetStaffFilters()',
    'function handleStaffAction(', 'data-staff-view', 'data-staff-action',
    "staff.relationStatus='已关联'", "staff.relationStatus='已解除'"
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));

  assert.ok(platform.includes("staff.personalBuild=staff.personalBuild==='开启'?'关闭':'开启'"));
  assert.match(platform, /staff\.merchantId=null;staff\.relationStatus='已解除';staff\.unlinkedAt=now/);
  assert.doesNotMatch(platform, /staff\.personalBuild='关闭'/);
  for (const obsolete of [
    'renderStoreMerchantList', 'openStoreUserDetail', 'handleEmployeeAction',
    'data-store-user-view', 'data-employee-action', 'data-merchant-employee-picker'
  ]) assert.doesNotMatch(platform, new RegExp(obsolete));
});

test('staff detail exposes context actions and refreshes after personal permission changes', () => {
  assert.match(platform, /function staffDetailActions\(staff\)/);
  assert.match(platform, /\$\{staffDetailActions\(staff\)\}/);
  for (const action of ['bind', 'transfer', 'unbind', 'toggle-personal']) {
    assert.match(platform, new RegExp(`data-staff-action="${action}"`));
  }
  assert.match(platform, /if\(\$\('#businessModal'\)\.classList\.contains\('show'\)\)openStaffDetail\(id\)/);
});

test('dead legacy detail and implicit store creation copy are absent', () => {
  assert.doesNotMatch(platform, /function renderLegacyDetail\(/);
  for (const obsolete of [
    '首次开启权限自动创建',
    '无店铺的商家首次开启时创建默认业务归属店铺',
    "'首次开启权限自动创建':'Auto-created When Permission Was First Enabled'"
  ]) assert.doesNotMatch(platform, new RegExp(obsolete));
});

test('FoneSquare add form exposes stable required identity and KYC fields', () => {
  for (const required of [
    'id="addRegistrationRegion"', 'id="addMerchantProfile"',
    'id="addDocumentType"', 'id="addDocumentNumber"', 'id="addDocumentExpiry"'
  ]) assert.match(platform, new RegExp(required));
  assert.match(platform, /id="addMerchantProfile"[\s\S]{0,240}<option>个人<\/option>[\s\S]{0,120}<option>企业<\/option>/);
});

test('backend add resolves unified accounts and creates only FoneSquare records', () => {
  for (const required of [
    'function normalizedAccount(', 'function accountKeys(', 'function findUnifiedAccount(',
    'function saveFoneSquareMerchant(', '账号标识冲突，请联系平台处理',
    '已有有效的 FoneSquare 商家记录', "type:'FoneSquare 回收商'"
  ]) assert.match(platform, new RegExp(required.replace(/[()]/g, '\\$&')));

  assert.match(platform, /\[user\.rawAccount,user\.rawPhone,user\.rawEmail\]/);
  assert.match(platform, /conflict:Boolean\(byPhone&&byEmail&&byPhone\.id!==byEmail\.id\)/);
  assert.match(platform, /id:unifiedUserId/);
  assert.match(platform, /merchantId:`M\$\{recordNumber\}`/);
  assert.match(platform, /merchantRecords\(\)\.some\([^)]*m\.id===unifiedUserId[^)]*m\.type==='FoneSquare 回收商'[^)]*m\.status==='正常'/);
  assert.match(platform, /rawPhone:phone,rawEmail:email/);
  assert.match(platform, /\$\('#saveAdd'\)\.onclick=saveFoneSquareMerchant/);

  const addImplementation=platform.match(/function saveFoneSquareMerchant\(\)\{([\s\S]*?)\n    \}/)?.[1]||'';
  assert.ok(addImplementation, 'saveFoneSquareMerchant implementation should be extractable');
  assert.doesNotMatch(addImplementation, /(stores|employeeAccounts)\.(push|unshift|splice)/);
  assert.doesNotMatch(addImplementation, /type:'供货商家'/);
});

test('new merchant management and add-flow copy is bilingual', () => {
  const translations = {
    '店员列表':'Staff List',
    '来源 App':'Source App',
    '个人建拍权限':'Personal Listing Permission',
    '实际权限状态':'Effective Permission Status',
    '已生效':'Effective',
    '已关闭':'Disabled',
    '未生效（商家权限关闭）':'Inactive (Merchant Permission Disabled)',
    '已关联':'Linked',
    '待关联':'Pending Link',
    '已解除':'Unlinked',
    '商家主体':'Merchant Profile',
    '注册国家 / 地区':'Registration Country / Region',
    '账号标识冲突，请联系平台处理':'Account identifiers conflict. Contact platform support.',
    '已有有效的 FoneSquare 商家记录':'An active FoneSquare merchant record already exists.'
  };
  for (const [source,target] of Object.entries(translations)) {
    assert.ok(platform.includes(`'${source}':'${target}'`), `${source} should translate to ${target}`);
  }
});

test('platform inline script compiles after merchant-management refactor', () => {
  const script=platform.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(()=>new Function(script));
});

test('scope-frozen portal files retain their required entry points', () => {
  assert.match(store, /id="homePage"/);
  assert.match(recycler, /FoneSquare/);
});
