// In-page commands only. The tab strip and page bounds are owned by Electron.
(()=>{
 if(window.LinuxThreadTabs)return;
 function command(action,args={}){window.open('https://chatgpt.com/__linux_thread_tabs__?command='+encodeURIComponent(JSON.stringify({action,...args})),'_blank');}
 function link(e){if(!(e.button===1||(e.button===0&&(e.ctrlKey||e.metaKey))))return;const a=e.target.closest?.('a[href]');if(!a)return;let u;try{u=new URL(a.href);}catch{return;}if(u.origin!=='https://chatgpt.com'||!/^\/(?:c\/[^/]+|g\/[^/]+(?:\/c\/[^/]+)?)\/?$/.test(u.pathname))return;e.preventDefault();e.stopImmediatePropagation();command('open',{url:u.href,foreground:!!e.shiftKey});}
 document.addEventListener('click',link,true);document.addEventListener('auxclick',link,true);
 window.LinuxThreadTabs={update(){}};command('sync');
})();
