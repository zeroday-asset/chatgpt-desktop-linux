const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const {window}=parseHTML('<html><body>'+[1,2,3].map(n=>`<div data-message-id="${n}" data-message-author-role="user">Message ${n}</div>`).join('')+'</body></html>');
let copied='',download;
const context={window,document:window.document,location:{href:'https://chatgpt.com/c/test'},navigator:{clipboard:{writeText:async s=>{copied=s}}},MutationObserver:class{observe(){}},requestAnimationFrame:()=>{},setTimeout:()=>{},Blob,URL:{createObjectURL:b=>{download=b;return 'blob:test'},revokeObjectURL(){}},Date};
vm.runInNewContext(fs.readFileSync('enhancements/message-selection.js','utf8'),context);
const buttons=[...window.document.querySelectorAll('button')];const click=name=>buttons.find(b=>b.textContent===name).click();
click('Select messages');const boxes=[...window.document.querySelectorAll('input')];boxes[0].checked=true;boxes[0].dispatchEvent(new window.Event('click'));boxes[2].checked=true;const event=new window.Event('click');event.shiftKey=true;boxes[2].dispatchEvent(event);
assert(boxes.every(b=>b.checked));click('Copy');assert(copied.includes('Message 1'));assert(copied.indexOf('Message 1')<copied.indexOf('Message 3'));
click('Clear');assert(boxes.every(b=>!b.checked));click('Dump JSON');download.text().then(s=>{const d=JSON.parse(s);assert.equal(d.messages.length,3);assert.equal(d.attachmentsIncluded,false);console.log('PASS range selection, ordered text, clear and JSON dump');});
