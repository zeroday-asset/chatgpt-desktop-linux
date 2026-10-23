// One native window, one tab strip, independent WebContentsViews.
if(process.platform==='linux'){
 globalThis.__linuxWebContentsViewClass=Gfe.WebContentsView;
 const tabs=new Map();globalThis.__linuxLiveTabWindows=tabs;
 let root=null,container=null,strip=null,active=null,serial=0,restored=false,quitting=false;
 const nativeURL=url=>globalThis.__linuxNativeThreadURL?.(url)||url;
 const file=()=>Tg.join(Gfe.app.getPath('userData'),'linux-thread-tabs.json');
 function safeURL(value){try{const u=new URL(value);return u.origin==='https://chatgpt.com'&&!u.username&&!u.password&&/^\/(?:c\/[^/]+|g\/[^/]+(?:\/c\/[^/]+)?)?\/?$/.test(u.pathname)?u.origin+u.pathname:null;}catch{return null;}}
 function trusted(c){try{return !c.isDestroyed()&&new URL(c.getURL()).origin==='https://chatgpt.com';}catch{return false;}}
 function snapshot(){return {version:2,active,tabs:[...tabs].filter(([,t])=>!t.contents.isDestroyed()).map(([id,t])=>({id,url:safeURL(t.contents.getURL())||t.url,title:t.title,loading:t.loading}))};}
 function save(){if(quitting||!restored)return;try{const tmp=file()+'.tmp';LINUX_LOCAL_TOOLS_FS.writeFileSync(tmp,JSON.stringify(snapshot()),{mode:0o600});LINUX_LOCAL_TOOLS_FS.renameSync(tmp,file());}catch{}}
 function draw(){if(strip&&!strip.webContents.isDestroyed())strip.webContents.executeJavaScript('window.updateTabs?.('+JSON.stringify(snapshot())+')').catch(()=>{});save();}
 function layout(){if(!root||root.isDestroyed())return;const [width,height]=root.getContentSize(),bar=Math.min(42,height);for(const [id,t]of tabs){t.view.setBounds({x:0,y:bar,width,height:Math.max(0,height-bar)});t.view.setVisible(id===active);}strip.setBounds({x:0,y:0,width,height:bar});}
 function activate(id){const t=tabs.get(id);if(!t||t.contents.isDestroyed())return;active=id;layout();t.contents.focus();root.setTitle(t.title||'ChatGPT');draw();}
 function attach(view,id,title,url,original=false){id=id||'tab-'+Date.now().toString(36)+'-'+(++serial);const contents=view.webContents;tabs.set(id,{view,contents,win:root,id,title:title||'New chat',url,original,loading:false});if(!active)active=id;contents.setBackgroundThrottling(false);
  contents.on('page-title-updated',(_,title)=>{const t=tabs.get(id);if(t){t.title=String(title).replace(/\s*[-–—|]\s*ChatGPT\s*$/i,'').slice(0,100)||'New chat';if(active===id)root.setTitle(t.title);draw();}});
  contents.on('did-start-loading',()=>{const t=tabs.get(id);if(t){t.loading=true;draw();}});
  contents.on('did-stop-loading',()=>{const t=tabs.get(id);if(t){t.loading=false;draw();}});
  for(const name of ['did-finish-load','did-navigate-in-page'])contents.on(name,()=>{const t=tabs.get(id);if(t){t.url=safeURL(contents.getURL())||t.url;draw();}});
  contents.on('before-input-event',(event,input)=>{if(input.type!=='keyDown'||!(input.control||input.meta)||input.alt||!trusted(contents))return;const key=input.key.toLowerCase();if(!['t','w','tab','1','2','3','4','5','6','7','8','9'].includes(key))return;event.preventDefault();handle(contents,{action:key==='t'?'open':key==='w'?'close':key==='tab'?'next':'index',url:'https://chatgpt.com/',delta:input.shift?-1:1,index:key==='9'?-1:Number(key)-1});});return id;
 }
 async function open(url='https://chatgpt.com/',foreground=true,id=null,title='New chat'){
  url=safeURL(url);if(!url||quitting||!root)return;
  if(url!=='https://chatgpt.com/'){const found=[...tabs].find(([,t])=>(safeURL(t.contents.getURL())||t.url)===url);if(found){if(foreground)activate(found[0]);return;}}
  const view=globalThis.__linuxCreateThreadView(url,root);container.addChildView(view);const key=attach(view,id,title,url);container.addChildView(strip);layout();if(foreground)activate(key);else draw();try{await view.webContents.loadURL(nativeURL(url));}catch(e){const t=tabs.get(key);if(t){t.title='Failed to load — retry';draw();}}
 }
 async function close(id=active){const t=tabs.get(id);if(!t)return;const running=await t.contents.executeJavaScript(`!!document.querySelector('[data-testid="stop-button"],button[aria-label="Stop generating"],button[aria-label="Stop streaming"]')`).catch(()=>false);if(running){const answer=await Gfe.dialog.showMessageBox(root,{type:'question',message:'Close this working tab?',detail:'Closing may interrupt the task. Switching tabs keeps it loaded.',buttons:['Keep open','Close tab'],defaultId:0,cancelId:0});if(answer.response!==1)return;}
  const index=[...tabs.keys()].indexOf(id);tabs.delete(id);container.removeChildView(t.view);if(t.original){t.view.setVisible(false);root.webContents.loadURL('about:blank');}else t.contents.close();
  if(!tabs.size)await open();else if(active===id)activate([...tabs.keys()][Math.min(index,tabs.size-1)]);draw();
 }
 function handle(sender,msg){const source=[...tabs].find(([,t])=>t.contents===sender);const fromStrip=sender===strip?.webContents;if(!fromStrip&&(!source||!trusted(sender)))return;const id=fromStrip?active:source[0];switch(msg.action){case 'sync':draw();break;case 'open':open(msg.url,msg.foreground!==false).catch(report);break;case 'activate':if(typeof msg.id==='string')activate(msg.id);break;case 'close':close(typeof msg.id==='string'?msg.id:id).catch(report);break;case 'next':{const ids=[...tabs.keys()],i=ids.indexOf(id);activate(ids[(i+(msg.delta===-1?-1:1)+ids.length)%ids.length]);break;}case 'index':{const ids=[...tabs.keys()],i=msg.index===-1?ids.length-1:msg.index;if(Number.isInteger(i)&&ids[i])activate(ids[i]);break;}}}
 function report(e){Gfe.dialog.showErrorBox('Thread tabs',String(e?.message||e));}
 function popup(sender,details){let u;try{u=new URL(details.url);}catch{return null;}if(u.origin!=='https://chatgpt.com'||u.pathname!=='/__linux_thread_tabs__')return null;if(u.search.length<4096)try{const msg=JSON.parse(u.searchParams.get('command'));if(msg&&typeof msg==='object')handle(sender,msg);}catch{}return {action:'deny'};}
 globalThis.__linuxThreadTabsCommand=popup;
 async function initialize(contents){if(root||!trusted(contents))return;const win=Gfe.BrowserWindow.fromWebContents(contents);if(!win)return;root=win;
  let stored;try{stored=JSON.parse(LINUX_LOCAL_TOOLS_FS.readFileSync(file(),'utf8'));}catch{}
  const old=Array.isArray(stored?.tabs)?stored.tabs.filter(t=>t&&typeof t.id==='string'&&safeURL(t.url)).slice(0,30):[],url=safeURL(contents.getURL())||'https://chatgpt.com/';const first=old.find(t=>t.url===url)||(url==='https://chatgpt.com/'?(old.find(t=>t.id===stored.active)||old[0]):null);
  container=root.contentView;
  strip=new Gfe.WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});strip.setBackgroundColor('#171717');strip.webContents.setWindowOpenHandler(d=>popup(strip.webContents,d)||{action:'deny'});strip.webContents.on('will-navigate',e=>e.preventDefault());container.addChildView(strip);
  root.on('resize',layout);root.on('closed',()=>{for(const t of tabs.values())if(!t.original&&!t.contents.isDestroyed())t.contents.close();if(!strip.webContents.isDestroyed())strip.webContents.close();});
  restored=true;layout();await strip.webContents.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(LINUX_TAB_STRIP_HTML));draw();
  await open(first&&url==='https://chatgpt.com/'?first.url:url,true,first?.id,first?.title||root.getTitle());
  for(const t of old)if(t.id!==first?.id)await open(t.url,false,t.id,t.title);if(url==='https://chatgpt.com/'&&tabs.has(stored?.active))activate(stored.active);else activate(active);draw();
 }
 function detect(c){c.on('did-finish-load',()=>initialize(c).catch(report));if(!c.isLoading()&&trusted(c))initialize(c).catch(report);}
 Gfe.app.on('before-quit',()=>{save();quitting=true;});Gfe.app.on('web-contents-created',(_,c)=>detect(c));Gfe.webContents.getAllWebContents().forEach(detect);
}
