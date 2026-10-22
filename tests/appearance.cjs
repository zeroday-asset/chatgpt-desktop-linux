const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs');
test('typography controls persist and bound CSS values',async()=>{
 const dom=new JSDOM('<body><main>hello</main></body>',{url:'https://chatgpt.com/c/1',runScripts:'outside-only'}),w=dom.window;
 w.indexedDB={open(){const r={};setTimeout(()=>{r.result={transaction(){return {objectStore(){return {get(){const q={};setTimeout(()=>q.onsuccess?.(),0);return q;}};}};}};r.onsuccess?.();},0);return r;}};
 w.eval(fs.readFileSync('enhancements/appearance.js','utf8'));
 function set(label,value){const el=[...w.document.querySelectorAll('label')].find(r=>r.textContent.startsWith(label)).querySelector('input');if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('input'));}
 set('Custom typography',true);set('Installed font family','Noto Sans');set('Font size',25);set('Bold',true);set('Italic',true);
 let css=w.document.querySelector('style').textContent;assert.match(css,/Noto Sans/);assert.match(css,/25px/);assert.match(css,/font-weight:700/);assert.match(css,/font-style:italic/);assert.equal(JSON.parse(w.localStorage.getItem('linux-port.appearance.v1')).bold,true);
 set('Font size',999);assert.match(w.document.querySelector('style').textContent,/32px/);await new Promise(r=>setTimeout(r,30));w.close();
});
