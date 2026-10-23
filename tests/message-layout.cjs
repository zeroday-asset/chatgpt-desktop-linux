const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('enhancements/message-selection.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,35));
test('split IDs and role attributes select, retain removed text and restore checks',async()=>{
 const dom=new JSDOM('<body><main><article data-testid="conversation-turn-1"><div data-message-id="a"><div data-message-author-role="user">First message</div></div></article><article data-testid="conversation-turn-2"><div data-message-author-role="assistant">Second message</div></article></main></body>',{url:'https://chatgpt.com/c/1',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;let copied='';w.navigator.clipboard={writeText:async s=>{copied=s;}};w.eval(source);
 const button=t=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===t);
 button('Select messages').click();assert.equal(w.document.querySelectorAll('.linux-message-checkbox').length,2);
 const turn=w.document.querySelector('article');w.document.querySelector('.linux-message-checkbox').click();turn.remove();await tick();button('Copy').click();await tick();assert.match(copied,/First message/);
 w.document.querySelector('main').insertAdjacentHTML('afterbegin','<article data-testid="conversation-turn-1"><div data-message-id="a"><div data-message-author-role="user">First message</div></div></article>');await tick();assert.equal(w.document.querySelector('[data-selection-id="a:user"]').checked,true);w.close();
});
test('semantic turn wrappers work without role nodes; zero matches explain failure',()=>{
 const dom=new JSDOM('<body><main><article data-testid="conversation-turn-0"><h5>You said:</h5>Hello</article><article data-testid="conversation-turn-1"><h6>ChatGPT said:</h6>World</article></main></body>',{url:'https://chatgpt.com/c/1',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;w.eval(source);const mode=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Select messages');mode.click();assert.equal(w.document.querySelectorAll('.linux-message-checkbox').length,2);w.close();
 const empty=new JSDOM('<body></body>',{url:'https://chatgpt.com/',runScripts:'outside-only',pretendToBeVisual:true});empty.window.eval(source);[...empty.window.document.querySelectorAll('button')].find(b=>b.textContent==='Select messages').click();assert.match(empty.window.document.querySelector('[role="status"]').textContent,/No supported messages/);empty.window.close();
});
