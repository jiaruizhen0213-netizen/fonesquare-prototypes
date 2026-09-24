const test=require('node:test'),assert=require('node:assert/strict'),C=require('../quote-config-core.js');
test('percentage schema accepts first bid below 100% on last row',()=>{assert.equal(C.validate(C.initialRows()),'');assert.equal(C.initialRows().at(-1).firstBidPercent,95);assert.equal(C.validate([{startRemainingPercent:20,endRemainingPercent:0,firstBidPercent:85,bidCount:1}]),'');});
test('remaining time ranges validate endpoints, order and overlap',()=>{
 const row=(start,end)=>({startRemainingPercent:start,endRemainingPercent:end,firstBidPercent:85,bidCount:3});
 for(const v of [0,-1,101,null,NaN])assert.match(C.validate([row(v,0)]),/开始时间比例/);
 for(const v of [-1,101,null,NaN])assert.match(C.validate([row(100,v)]),/结束时间比例/);
 for(const end of [50,60])assert.match(C.validate([row(50,end)]),/大于结束/);
 assert.match(C.validate([row(100,80),row(90,0)]),/重叠/);
 assert.match(C.validate([row(50,0),row(100,50)]),/从大到小/);
 assert.equal(C.validate([row(100,90),row(90,0)]),'');
 assert.equal(C.validate([row(100,90),row(80.5,0)]),'');
});
test('single-value migration leaves ends unset and history untouched',()=>{
 const old={schema:2,current:{rows:[{remainingPercent:50,firstBidPercent:85,bidCount:5}]},history:[{rows:[{remainingPercent:25}]}]},before=JSON.stringify(old),next=C.migrate(old);
 assert.equal(JSON.stringify(old),before);assert.equal(next.schema,3);assert.equal(next.current.rows[0].startRemainingPercent,50);assert.equal(next.current.rows[0].endRemainingPercent,null);assert.deepEqual(next.history,old.history);assert.match(C.validate(next.current.rows),/结束时间比例/);
});
test('first price percentages and counts are validated independently',()=>{for(const firstBidPercent of [0,101,null,NaN])assert.match(C.validate([{startRemainingPercent:20,endRemainingPercent:0,firstBidPercent,bidCount:3}]),/首次出价比例/);for(const bidCount of [0,-1,1.5,null,NaN])assert.match(C.validate([{startRemainingPercent:20,endRemainingPercent:0,firstBidPercent:85,bidCount}]),/包含首次/);assert.equal(C.validate([{startRemainingPercent:80,endRemainingPercent:20,firstBidPercent:95,bidCount:1},{startRemainingPercent:20,endRemainingPercent:0,firstBidPercent:85,bidCount:3}]),'');});
test('save retains enabled selection and snapshots prior rows without mutation',()=>{const s=C.seed(),draft=C.clone(s.current);draft.rows[0].bidCount=7;draft.enabled=true;const next=C.save(s,draft,'now');assert.equal(next.current.version,2);assert.equal(next.current.enabled,true);assert.equal(next.current.rows[0].bidCount,7);assert.equal(next.history[0].rows[0].bidCount,5);assert.equal(s.current.version,1);draft.rows[0].bidCount=9;assert.equal(next.current.rows[0].bidCount,7);});
test('minute-based data retained only as legacy history, not reinterpreted as percentages',()=>{const old={state:{policies:[{id:'STEP-00001',version:9,rows:[{minutes:10,percent:100}],history:[]}]}},before=JSON.stringify(old),s=C.seed(old);assert.equal(JSON.stringify(old),before);assert.equal(s.legacyHistory[0].rows[0].minutes,10);assert.equal(s.current.rows[0].startRemainingPercent,100);assert.equal(s.current.enabled,false);assert.equal(s.current.rows.some(r=>'minutes' in r),false);});
test('no bids or execution functions exposed by configuration model',()=>{assert.equal(C.start,undefined);assert.equal(C.run,undefined);assert.equal(C.accept,undefined);assert.equal(C.validate([]),'至少配置一行报价规则。');});
