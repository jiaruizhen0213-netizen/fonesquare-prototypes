import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../shop-address.js';
const A=globalThis.ShopAddress;
test('registration country is independent of optional KYC',()=>{const a=A.initial({registrationRegion:'马来西亚',kyc:'未认证'});assert.equal(a.country,'MY');assert.equal(a.state,'');assert.equal(A.validate({...a,state:'Selangor',city:'PJ',postcode:'01234',detail:'12 Jalan'}),'');});
test('only matching approved KYC supplies available address fields',()=>{const p={registrationRegion:'MY',kyc:'已认证',kycAddress:{country:'MY',state:'Selangor',city:'PJ',postcode:'47300',detail:'12 Jalan'}};assert.equal(A.initial(p).detail,'12 Jalan');assert.equal(A.initial({...p,kyc:'未认证'}).city,'');assert.equal(A.initial({...p,registrationRegion:'SG'}).city,'');assert.equal(A.initial({...p,registrationRegion:''}).country,'');});
test('saved shop address wins over changed KYC and registration',()=>{const saved={country:'MY',addressParts:{country:'MY',state:'Johor',city:'JB',postcode:'80000',detail:'old shop'}};const a=A.initial({...A.fixtures.M1003,registrationRegion:'SG'},saved);assert.equal(a.country,'MY');assert.equal(a.state,'Johor');assert.equal(a.detail,'old shop');assert.equal(a.prefilled,false);});
test('legacy detail stays intact, missing state is not guessed',()=>{const a=A.initial(A.fixtures.M1003,{country:'MY',address:'Original legacy address',city:'PJ'});assert.equal(a.detail,'Original legacy address');assert.equal(a.state,'');assert.ok(A.validate(a));});
test('malaysia state and postcode are validated',()=>{const a=A.initial(A.fixtures.M1003);assert.ok(A.validate({...a,postcode:'1234'}));assert.ok(A.validate({...a,state:'Unknown'}));assert.equal(A.validate({...a,postcode:'01234'}),'');});
