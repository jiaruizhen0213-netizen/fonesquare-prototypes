import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
function model(){const items=new Map();const window={addEventListener(){}};vm.runInNewContext(readFileSync(new URL('../merchant-bank-data.js',import.meta.url),'utf8'),{window,localStorage:{getItem:k=>items.get(k),setItem:(k,v)=>items.set(k,v)},crypto:{randomUUID}});return window.MerchantBanks;}
const draft={holder:'FS Retail',bankName:'Maybank',accountNumber:'123456789012'};
test('shared account updates affect referencing stores, but preserve independent stores and snapshots',()=>{
 const b=model(),a=b.save('m1',draft,null,'App'),s={name:'A',bank:{...draft}},ind={name:'B',bank:{...draft}};
 b.attach(s,'s1','m1');b.attach(ind,'s2','m1');b.bind('s1','m1','A',a.id,null,'PC');
 const snapshot=JSON.parse(JSON.stringify(s.bank));b.save('m1',{...draft,bankName:'CIMB'},a.id,'PC');
 assert.equal(s.bank.bankName,'CIMB');assert.equal(ind.bank.bankName,'Maybank');assert.equal(snapshot.bankName,'Maybank');assert.equal(b.used('m1',a.id).length,1);
});
test('switching and detaching affects only the chosen store; cross-merchant references are rejected',()=>{
 const b=model(),a=b.save('m1',draft,null,'App'),other=b.save('m1',{...draft,accountNumber:'999999999999'},null,'App');
 b.bind('s1','m1','A',a.id,null,'PC');b.bind('s2','m1','B',a.id,null,'PC');b.bind('s1','m1','A',other.id,null,'PC');
 assert.equal(b.selection('s2').accountId,a.id);assert.equal(b.selection('s1').accountId,other.id);
 assert.throws(()=>b.bind('bad','m2','C',a.id,null,'PC'));assert.equal(b.list('m2').length,0);
 b.bind('s1','m1','A',null,draft,'App');assert.equal(b.selection('s1').accountId,null);assert.equal(b.used('m1',other.id).length,0);
 assert.ok(b.history('m1').every(h=>!JSON.stringify(h).includes(draft.accountNumber)));
});
test('all portal inline and bank extension scripts compile separately',()=>{
 for(const file of ['platform.html','store.html']){const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(match[1].trim())assert.doesNotThrow(()=>new Function(match[1]));}
 for(const file of ['merchant-bank-data.js','platform-merchant-banks.js','store-merchant-banks.js'])assert.doesNotThrow(()=>new Function(readFileSync(new URL('../'+file,import.meta.url),'utf8')));
});
