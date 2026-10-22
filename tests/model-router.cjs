const {test}=require('node:test'),assert=require('node:assert/strict');
const {choose,rates}=require('../enhancements/routing-policy.js');
test('chat and simple web lookup stay on Luna',()=>{
 assert.equal(choose('hi how are you?').model,'gpt-6-luna');assert.equal(choose('hi how are you?').effort,'low');
 const d=choose('look up the opening hours online');assert.equal(d.model,'gpt-6-luna');assert.equal(d.effort,'high');
});
test('building and difficult review use Sol 6.1 at appropriate effort',()=>{
 assert.equal(choose('build an Android app').model,'gpt-6.1-sol');assert.equal(choose('build an Android app').effort,'medium');
 assert.equal(choose('security audit of the handshake').effort,'high');
});
test('Astra reserved for explicit hardest tasks',()=>{
 assert.equal(choose('formal verification of this protocol').model,'gpt-6-astra');
 assert.equal(choose('formal verification of this protocol',null,{preference:'economy'}).model,'gpt-6.1-sol');
});
test('followups retain active work and new subjects may downgrade',()=>{
 const previous=choose('build an Android app');
 for(const s of ['okay','continue','go ahead','also add a button','it still fails'])assert.equal(choose(s,previous).model,previous.model);
 assert.equal(choose('hello how are you?',previous).model,'gpt-6-luna');
});
test('small edits remain economical, attachments raise scope, rates distinguish cache',()=>{
 assert.equal(choose('change the button text').model,'gpt-6-luna');
 assert.equal(choose('what is this?',null,{attachments:true}).model,'gpt-6.1-sol');
 assert.equal(rates.models['gpt-6.1-sol'].input,rates.models['gpt-6-sol'].input);
 assert(rates.models['gpt-6.1-sol'].cached<rates.models['gpt-6-sol'].cached);
});
