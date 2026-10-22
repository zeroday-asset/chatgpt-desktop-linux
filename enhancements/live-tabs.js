// Main-process live thread windows. Only fixed tab commands from chatgpt.com are accepted.
if(process.platform==='linux'){
 const windows=new Map();globalThis.__linuxLiveTabWindows=windows;
 let active=null,serial=0,root=null,restored=false,quitting=false;
 const file=()=>Tg.join(Gfe.app.getPath('userData'),'linux-thread-tabs.json');
 function safeURL(value){try{const u=new URL(value);return u.origin==='https://chatgpt.com'&&!u.username&&!u.password&&/^\/(?:c\/[^/]+|g\/[^/]+(?:\/c\/[^/]+)?)?\/?$/.test(u.pathname)?u.origin+u.pathname:null;}catch{return null;}}
 function primaryURL(contents){try{return new URL(contents.getURL()).origin==='https://chatgpt.com';}catch{return false;}}
 function snapshot(){return {version:1,active,tabs:[...windows].filter(([,t])=>!t.win.isDestroyed()).map(([id,t])=>({id,url:safeURL(t.win.webContents.getURL())||t.url,title:t.title||'Chat'}))};}
 function save(){if(quitting||!restored)return;try{const tmp=file()+'.tmp';LINUX_LOCAL_TOOLS_FS.writeFileSync(tmp,JSON.stringify(snapshot()),{mode:0o600});LINUX_LOCAL_TOOLS_FS.renameSync(tmp,file());}catch{}}
 function broadcast(){const data=JSON.stringify(snapshot());for(const t of windows.values())if(!t.win.isDestroyed()&&primaryURL(t.win.webContents))t.win.webContents.executeJavaScript('window.LinuxThreadTabs?.update('+data+')').catch(()=>{});save();}
 function focused(){return windows.get(active)?.win||root;}
 function activate(id){const target=windows.get(id);if(!target||target.win.isDestroyed())return;const previous=focused();if(previous&&previous!==target.win&&!previous.isDestroyed()){if(!previous.isMaximized()&&!previous.isFullScreen())target.win.setBounds(previous.getBounds());if(previous.isMaximized())target.win.maximize();else if(target.win.isMaximized())target.win.unmaximize();}
  active=id;target.win.show();target.win.focus();for(const [other,t]of windows)if(other!==id&&!t.win.isDestroyed())t.win.hide();broadcast();}
 function factory(){const make=globalThis.__linuxCreateThreadWindow;if(typeof make!=='function')throw new Error('Native tab window factory is not ready.');return make;}
 async function open(url='https://chatgpt.com/',foreground=true,id=null,title='New chat'){
  url=safeURL(url);if(!url)return;
  if(url!=='https://chatgpt.com/'){const existing=[...windows].find(([,t])=>(safeURL(t.win.webContents.getURL())||t.url)===url);if(existing){if(foreground)activate(existing[0]);return;}}
  const make=await factory();if(quitting)return;const win=make(url);attach(win,id,title,url);if(foreground)activate([...windows].find(([,t])=>t.win===win)[0]);else broadcast();
 }
 function close(id=active){const entry=windows.get(id);if(!entry)return;
  const busy=entry.win.webContents.executeJavaScript(`!!document.querySelector('[data-testid="stop-button"],button[aria-label="Stop generating"],button[aria-label="Stop streaming"]')`).catch(()=>false);
  busy.then(async running=>{if(running){const answer=await Gfe.dialog.showMessageBox(entry.win,{type:'question',message:'Close this working tab?',detail:'Closing unloads this page and may interrupt its task. Switching tabs keeps it loaded.',buttons:['Keep open','Close tab'],defaultId:0,cancelId:0});if(answer.response!==1)return;}remove(id);});
 }
 function remove(id){const t=windows.get(id);if(!t)return;const ids=[...windows.keys()],index=ids.indexOf(id);windows.delete(id);if(!windows.size){if(t.win===root){windows.set(id,t);t.win.webContents.loadURL('https://chatgpt.com/');activate(id);return;}open().catch(report);}
  else if(active===id)activate([...windows.keys()][Math.min(index,windows.size-1)]);
  if(t.win===root){t.title='New chat';t.url='https://chatgpt.com/';root.hide();root.webContents.loadURL('about:blank');}else t.win.destroy();broadcast();}
 function report(e){Gfe.dialog.showErrorBox('Thread tabs',String(e?.message||e));}
 function attach(win,id=null,title='Chat',url=null){if([...windows.values()].some(t=>t.win===win))return;id=id||'tab-'+Date.now().toString(36)+'-'+(++serial);windows.set(id,{win,title,url:url||safeURL(win.webContents.getURL())||'https://chatgpt.com/'});if(!active)active=id;win.webContents.setBackgroundThrottling(false);
  win.on('focus',()=>{if(active!==id){active=id;broadcast();}});
  win.on('closed',()=>{if(quitting)return;windows.delete(id);if(active===id&&windows.size)activate(windows.keys().next().value);broadcast();});
  win.webContents.on('page-title-updated',(_,title)=>{const t=windows.get(id);if(t){t.title=String(title).replace(/\s*[-–—|]\s*ChatGPT\s*$/i,'').slice(0,100)||'New chat';broadcast();}});
  for(const event of ['did-finish-load','did-navigate-in-page'])win.webContents.on(event,()=>{const t=windows.get(id);if(t){const u=safeURL(win.webContents.getURL());if(u)t.url=u;broadcast();}});
  win.webContents.on('before-input-event',(event,input)=>{if(input.type!=='keyDown'||!(input.control||input.meta)||input.alt||!primaryURL(win.webContents))return;const key=input.key.toLowerCase();if(!['t','w','tab','1','2','3','4','5','6','7','8','9'].includes(key))return;event.preventDefault();handle(win.webContents,{action:key==='t'?'open':key==='w'?'close':key==='tab'?'next':'index',url:'https://chatgpt.com/',delta:input.shift?-1:1,index:key==='9'?-1:Number(key)-1});});
 }
 function handle(sender,msg){const source=[...windows].find(([,t])=>t.win.webContents===sender);if(!source||!primaryURL(sender))return;switch(msg.action){case 'sync':broadcast();break;case 'open':open(msg.url,msg.foreground!==false).catch(report);break;case 'activate':if(typeof msg.id==='string')activate(msg.id);break;case 'close':close(typeof msg.id==='string'?msg.id:source[0]);break;case 'next':{const ids=[...windows.keys()],i=ids.indexOf(source[0]);activate(ids[(i+(msg.delta===-1?-1:1)+ids.length)%ids.length]);break;}case 'index':{const ids=[...windows.keys()],i=msg.index===-1?ids.length-1:msg.index;if(Number.isInteger(i)&&ids[i])activate(ids[i]);break;}}}
 globalThis.__linuxThreadTabsCommand=(sender,details)=>{let u;try{u=new URL(details.url);}catch{return null;}if(u.origin!=='https://chatgpt.com'||u.pathname!=='/__linux_thread_tabs__')return null;
  if(primaryURL(sender)&&u.search.length<4096){try{const msg=JSON.parse(u.searchParams.get('command'));if(msg&&typeof msg==='object')handle(sender,msg);}catch{}}return {action:'deny'};};
 function detect(contents){contents.on('did-finish-load',async()=>{if(root||contents.isDestroyed()||!primaryURL(contents))return;const win=Gfe.BrowserWindow.fromWebContents(contents);if(!win)return;root=win;root.on('show',()=>{if(![...windows.values()].some(t=>t.win===root)&&focused()&&focused()!==root){root.hide();focused().show();focused().focus();}});
  let stored;try{stored=JSON.parse(LINUX_LOCAL_TOOLS_FS.readFileSync(file(),'utf8'));}catch{}
  const tabs=Array.isArray(stored?.tabs)?stored.tabs.filter(t=>t&&typeof t.id==='string'&&safeURL(t.url)).slice(0,30):[];
  const url=safeURL(contents.getURL());const first=tabs.find(t=>t.url===url)||(url==='https://chatgpt.com/'?(tabs.find(t=>t.id===stored?.active)||tabs[0]):null);attach(win,first?.id,first?.title,url);restored=true;
  try{if(first&&url==='https://chatgpt.com/'&&first.url!==url)await contents.loadURL(first.url);for(const t of tabs)if(t.id!==first?.id)await open(t.url,false,t.id,t.title);const wanted=stored?.active;if(url==='https://chatgpt.com/'&&windows.has(wanted))activate(wanted);else activate(active);}catch(e){report(e);}broadcast();
 });if(!root&&!contents.isLoading()&&primaryURL(contents))contents.emit('did-finish-load');}
 Gfe.app.on('before-quit',()=>{save();quitting=true;});Gfe.app.on('web-contents-created',(_,contents)=>detect(contents));Gfe.webContents.getAllWebContents().forEach(detect);
}
