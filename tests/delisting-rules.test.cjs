const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../delisting-rules/rules-core.js');
const pool=(n,prefix='I')=>Array.from({length:n},(_,i)=>({id:prefix+i,status:'可售'}));
const sku=(id,grade='N',extra={})=>({id,model:'iPhone 17',memory:'256G',channel:'大陆国行',color:'白色',grade,spot:pool(4,'S'),reserve:pool(20,'R'),enabled:true,...extra});
const catalog=(...skus)=>({revision:7,skus,logs:[]});
const rule=(extra={})=>({...R.defaults().rules[0],...extra});

test('海外等级 N 命中；其他等级保留人工上下架状态',()=>{
 const d=catalog(sku('N'),sku('A','A',{spotEnabled:false,reserveEnabled:true}));
 const p=R.plan(d,[rule()],'down',['spot','reserve']);
 assert.equal(p.down,2);assert.equal(p.up,0);assert.equal(p.matched,2);assert.equal(p.scanned,2);assert.equal(p.pairs,4);
 const next=R.apply(d,p,'now');
 assert.equal(next.skus[0].spotEnabled,false);assert.equal(next.skus[0].reserveEnabled,false);
 assert.equal(next.skus[1].spotEnabled,false);assert.equal(next.skus[1].reserveEnabled,true);
 assert.equal(d.skus[0].enabled,true);assert.equal(d.revision,7);assert.equal(next.revision,8);
});
test('仅预售规则保留现货，选择现货执行也不会误命中',()=>{
 const d=catalog(sku('N'));const rules=[rule({scopes:['reserve']})];
 const next=R.apply(d,R.plan(d,rules,'down',['spot','reserve']),'now');
 assert.equal(next.skus[0].spotEnabled,true);assert.equal(next.skus[0].reserveEnabled,false);
 assert.equal(R.plan(d,rules,'down',['spot']).down,0);
});
test('仅现货规则保留预售',()=>{
 const d=catalog(sku('N')),r=rule({scopes:['spot']});
 const next=R.apply(d,R.plan(d,[r],'down',['spot','reserve']),'now');
 assert.equal(next.skus[0].spotEnabled,false);assert.equal(next.skus[0].reserveEnabled,true);
});
test('全量重跑把未命中商品的人工下架状态改为上架',()=>{
 const d=catalog(sku('N'),sku('A','A',{enabled:false}));
 const p=R.plan(d,[rule()],'full',['spot','reserve']);
 assert.equal(p.down,2);assert.equal(p.up,2);
 const next=R.apply(d,p,'now');assert.equal(next.skus[1].spotEnabled,true);assert.equal(next.skus[1].reserveEnabled,true);
});
test('全量执行仍保留未选类型的状态',()=>{
 const d=catalog(sku('A','A',{enabled:false}));
 const next=R.apply(d,R.plan(d,[rule()],'full',['reserve']),'now');
 assert.equal(next.skus[0].spotEnabled,false);assert.equal(next.skus[0].reserveEnabled,true);
});
test('人工上架后，下一次库存更新仍命中时再次下架；重复执行幂等',()=>{
 const d=catalog(sku('N','N',{enabled:false,reserveEnabled:true,spotEnabled:false}));
 const first=R.apply(d,R.plan(d,[rule()],'down',['reserve','spot']),'now');
 assert.equal(first.skus[0].reserveEnabled,false);
 const second=R.plan(first,[rule()],'down',['reserve','spot']);assert.equal(second.down,0);assert.equal(second.unchanged,2);
 assert.equal(R.apply(first,second,'later').revision,first.revision);
});
test('同字段值是或，不同条件是且，多条规则是或',()=>{
 const grade={field:'grade',op:'in',values:['N','C']},channel={field:'channel',op:'in',values:['美国版']};
 const combined=rule({conditions:[grade,channel]});
 const d=catalog(sku('N'),sku('C','C',{channel:'美国版'}),sku('A','A'));
 let p=R.plan(d,[combined],'down',['reserve']);assert.deepEqual(p.details.filter(x=>x.ruleIds.length).map(x=>x.skuId),['C']);
 const other=rule({id:'other',conditions:[{field:'grade',op:'in',values:['A']}]});
 p=R.plan(d,[combined,other],'down',['reserve']);assert.equal(p.matched,2);
});
test('库存数量条件按类型分别判断，并过滤非可售、非空留货结果与重复物品',()=>{
 const reserve=[{id:'a'},{id:'a'},{id:'b',status:'可售',retentionResult:''},{id:'c',retentionResult:'待锁'},{id:'d',retentionResult:'失败'},{id:'e',retentionResult:'成功'},{id:'f',status:'不可售'}];
 const d=catalog(sku('N','N',{reserve}));assert.equal(R.quantity(d.skus[0],'reserve'),2);
 const r=rule({conditions:[{field:'quantity',op:'lt',value:3}]});
 const p=R.plan(d,[r],'down',['spot','reserve']);assert.equal(p.matched,1);assert.equal(p.details.find(x=>x.ruleIds.length).kind,'reserve');
});
test('库存边界与排除条件',()=>{
 const d=catalog(sku('A','A',{reserve:pool(10)}));
 assert.equal(R.matches(d.skus[0],'reserve',{field:'quantity',op:'lt',value:10}),false);
 for(const op of ['lte','eq','gte'])assert.equal(R.matches(d.skus[0],'reserve',{field:'quantity',op,value:10}),true);
 assert.equal(R.matches(d.skus[0],'reserve',{field:'quantity',op:'gt',value:10}),false);
 assert.equal(R.matches(d.skus[0],'reserve',{field:'grade',op:'notIn',values:['N']}),true);
});
test('停用规则不参与执行，无启用规则时仅下架方式不改状态，全量方式上架',()=>{
 const d=catalog(sku('N','N',{enabled:false})),r=rule({enabled:false});
 assert.equal(R.plan(d,[r],'down',['reserve']).matched,0);
 assert.equal(R.plan(d,[r],'down',['reserve']).up,0);
 assert.equal(R.plan(d,[r],'full',['reserve']).up,1);
});
test('执行结果快照不随修改原规则变化',()=>{
 const r=rule(),d=catalog(sku('N')),p=R.plan(d,[r],'down',['reserve']);
 const snapshot=R.clone(r);r.name='changed';r.conditions[0].values=['A'];
 assert.deepEqual(p.details[0].ruleNames,['海外等级 N 默认下架']);assert.deepEqual(snapshot.conditions[0].values,['N']);
});
test('无库存商品全量重跑可设为上架，但规则执行不生成库存',()=>{
 const d=catalog(sku('A','A',{enabled:false,spot:[],reserve:[]}));
 const next=R.apply(d,R.plan(d,[rule()],'full',['reserve']),'now');
 assert.equal(next.skus[0].reserveEnabled,true);assert.deepEqual(next.skus[0].reserve,[]);
});
test('校验缺失名称、范围、条件和值，拒绝负数或小数库存',()=>{
 assert.match(R.validate(rule({name:' '})),/名称/);
 assert.match(R.validate(rule({scopes:[]})),/生效范围/);
 assert.match(R.validate(rule({conditions:[]})),/条件/);
 assert.match(R.validate(rule({conditions:[{field:'grade',op:'in',values:[]}]})),/选择/);
 for(const value of [-1,1.5,'',null])assert.match(R.validate(rule({conditions:[{field:'quantity',op:'lt',value}]})),/整数/);
 assert.equal(R.validate(rule({conditions:[{field:'quantity',op:'eq',value:0}]})),'');
 assert.throws(()=>R.plan(catalog(),[],'down',[]));assert.throws(()=>R.plan(catalog(),[],'other',['reserve']));
});
