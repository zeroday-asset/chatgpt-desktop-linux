const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),vm=require('node:vm'),fs=require('node:fs');
test('toolbar panels start collapsed, are exclusive, close outside and on Escape',()=>{
 const {window}=new JSDOM('<body><div id="outside"></div><section id="one"><button>One</button></section><section id="two"><button>Two</button></section></body>');
 vm.runInNewContext(fs.readFileSync('enhancements/local-toolbar.js','utf8'),{window,document:window.document,MutationObserver:window.MutationObserver});
 const d=window.document,one=d.querySelector('#one'),two=d.querySelector('#two');
 window.LinuxLocalTools.register(one,'Message tools',['M1 1h2']);window.LinuxLocalTools.register(two,'Model routing',['M1 1h2']);
 const buttons=d.querySelectorAll('#linux-local-tools button');assert(one.hidden&&two.hidden);
 buttons[0].click();assert(!one.hidden&&two.hidden);assert.equal(buttons[0].getAttribute('aria-expanded'),'true');
 buttons[1].click();assert(one.hidden&&!two.hidden);
 d.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(two.hidden);
 buttons[0].click();d.querySelector('#outside').click();assert(one.hidden);
});
