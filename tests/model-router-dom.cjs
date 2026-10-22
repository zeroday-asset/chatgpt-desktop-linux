const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),vm=require('node:vm'),fs=require('node:fs');
function fixture({unsupported=false,fallback=false,failEffort=false,changeDraft=false}={}){
 const {window}=new JSDOM(`<html><body><select aria-label="Model"><option value="luna">GPT-6 Luna</option>${fallback?'':'<option value="sol61">GPT-6.1 Sol</option>'}<option value="sol6">GPT-6 Sol</option><option value="astra">GPT-6 Astra</option></select><select aria-label="Reasoning effort"><option value="low">Light</option><option value="medium">Medium</option><option value="high">High</option></select><select aria-label="Speed"><option value="fast">Fast</option><option value="standard">Standard</option></select><textarea id="prompt-textarea"></textarea><button data-testid="send-button">Send</button></body></html>`);
 window.Element.prototype.getClientRects=function(){return this.hidden?[]:[{}]};
 const doc=window.document,picker=doc.querySelector('select'),effort=doc.querySelector('[aria-label="Reasoning effort"]'),speed=doc.querySelector('[aria-label="Speed"]'),send=doc.querySelector('button'),draft=doc.querySelector('textarea');
 draft.value='implement a JSON export';let sent=0;
 if(unsupported){picker.removeAttribute('aria-label');picker.options[0].textContent='Unknown';}
 picker.addEventListener('change',()=>{if(changeDraft)draft.value='edited while changing model';});
 if(failEffort)effort.addEventListener('change',()=>{effort.value='low'});
 send.addEventListener('click',()=>sent++);
 Object.defineProperty(window,'localStorage',{value:{getItem:()=>null,setItem:()=>{}}});
 const context={window,location:{href:'https://chatgpt.com/c/one'},setTimeout,Date,console};
 vm.runInNewContext(fs.readFileSync('enhancements/routing-policy.js','utf8'),context);
 vm.runInNewContext(fs.readFileSync('enhancements/model-router.js','utf8'),context);
 return {send,picker,effort,speed,doc,sent:()=>sent};
}
test('no setup: model and effort switch, Standard speed, exactly one send',async()=>{
 const f=fixture();f.send.click();await new Promise(r=>setTimeout(r,80));assert.equal(f.picker.value,'sol61');assert.equal(f.effort.value,'medium');assert.equal(f.speed.value,'standard');assert.equal(f.sent(),1);
});
test('Sol 6 used only when 6.1 unavailable',async()=>{
 const f=fixture({fallback:true});f.send.click();await new Promise(r=>setTimeout(r,80));assert.equal(f.picker.value,'sol6');assert.equal(f.sent(),1);
});
test('unrecognized picker leaves draft unsent',async()=>{
 const f=fixture({unsupported:true});f.send.click();await new Promise(r=>setTimeout(r,80));assert.equal(f.sent(),0);assert.match(f.doc.querySelector('#linux-model-router [role="status"]').textContent,/Not sent/);
});
test('effort verification failure leaves draft unsent',async()=>{
 const f=fixture({failEffort:true});f.send.click();await new Promise(r=>setTimeout(r,1650));assert.equal(f.sent(),0);
});
test('editing during model change prevents sending',async()=>{
 const f=fixture({changeDraft:true});f.send.click();await new Promise(r=>setTimeout(r,80));assert.equal(f.sent(),0);
});

test('explicit normal Chat mode does not block sending',async()=>{
 const f=fixture({unsupported:true});const tab=f.doc.createElement('button');tab.textContent='Chat';tab.setAttribute('role','tab');tab.setAttribute('aria-selected','true');f.doc.body.append(tab);f.send.click();await new Promise(r=>setTimeout(r,30));assert.equal(f.sent(),1);
});
