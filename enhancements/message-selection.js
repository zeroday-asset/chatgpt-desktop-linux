// Local-only transcript selection. No network requests or privileged bridges.
(() => {
  if (window.__linuxMessageSelection) return;
  window.__linuxMessageSelection = true;
  let active = false, anchor = null, route = location.href;
  const selected = new Set(), snapshots = new Map();
  let order = [];
  function capture(m){const clone=m.cloneNode(true);clone.querySelectorAll('.linux-message-checkbox,button,[aria-hidden="true"]').forEach(x=>x.remove());return {id:messageId(m),role:messageRole(m),text:(clone.innerText||clone.textContent||'').trim()};}
  const panel = document.createElement('div');
  panel.id = 'linux-message-selection';
  panel.style.cssText = 'position:fixed;bottom:18px;right:18px;z-index:2147483647;background:#202124;color:white;padding:12px;border:1px solid #888;border-radius:12px;max-width:420px;font:13px system-ui;box-shadow:0 4px 20px #0006';
  const title = document.createElement('strong');
  title.textContent = 'Local message selection';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const controls = document.createElement('div');
  panel.append(title, status, controls);
  function button(label, action) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'margin:3px;padding:6px;border:1px solid #aaa;border-radius:5px;background:#333;color:white;cursor:pointer';
    b.addEventListener('click', action); controls.append(b); return b;
  }
  const fallbackIds=new WeakMap();let nextId=0;
  function messageRole(m){
    const explicit=m.getAttribute('data-message-author-role')||m.getAttribute('data-turn');
    if(explicit==='user'||explicit==='assistant')return explicit;
    const test=m.getAttribute('data-testid')||'';
    if(test==='user-message'||test==='assistant-message')return test.split('-')[0];
    const heading=m.querySelector('h5,h6,[data-message-author-role]');
    const nested=heading?.getAttribute('data-message-author-role');if(nested)return nested;
    const label=heading?.textContent?.trim()||m.getAttribute('aria-label')||'';
    if(/^(you said|you:|user:)/i.test(label))return 'user';
    if(/^(chatgpt said|chatgpt:|assistant:)/i.test(label))return 'assistant';
    return 'message';
  }
  function messageId(m){
    const turn=m.closest('[data-testid^="conversation-turn"],article[data-turn-id]');
    const id=m.getAttribute('data-message-id')||m.closest('[data-message-id]')?.getAttribute('data-message-id')||m.getAttribute('data-turn-id')||m.id||turn?.getAttribute('data-turn-id')||turn?.getAttribute('data-testid')||m.getAttribute('data-testid');
    if(id&&id!=='user-message'&&id!=='assistant-message')return id+':'+messageRole(m);
    if(!fallbackIds.has(m))fallbackIds.set(m,'local-message-'+(++nextId));
    return fallbackIds.get(m);
  }
  function messages() {
    const candidates=[...document.querySelectorAll('[data-message-id],[data-message-author-role="user"],[data-message-author-role="assistant"],[data-testid="user-message"],[data-testid="assistant-message"],[data-testid^="conversation-turn"],article[data-turn-id]')];
    if(!candidates.length)candidates.push(...[...document.querySelectorAll('main article,[role="main"] article')].filter(m=>!m.parentElement.closest('article')));
    return candidates.filter(m=>!panel.contains(m)&&!candidates.some(other=>other!==m&&m.contains(other)));
  }
  const boxes=new Map();
  const dock=document.createElement('div');dock.id='linux-selection-dock';dock.style.cssText='position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#202124;color:white;border:2px solid #10a37f;border-radius:10px;padding:10px;display:flex;align-items:center;gap:10px;font:14px system-ui';
  const dockCount=document.createElement('span');dock.append(dockCount);
  for(const [label,fn]of [['Selection tools',()=>window.LinuxLocalTools?.toggle(panel.id)],['Done',()=>{active=false;update();}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='background:#333;color:white;padding:6px;border:1px solid #aaa;border-radius:5px';b.onclick=fn;dock.append(b);}
  document.documentElement.append(dock);
  window.addEventListener?.('scroll',()=>{if(active)update();},true);window.addEventListener?.('resize',()=>{if(active)update();});
  function update() {
    const loaded=messages(), ids=loaded.map(m=>messageId(m));
    for(let i=ids.length-1;i>=0;i--)if(!order.includes(ids[i])){const next=order.indexOf(ids[i+1]);if(next>=0)order.splice(next,0,ids[i]);else order.push(ids[i]);}
    for(const m of loaded)if(selected.has(messageId(m)))snapshots.set(messageId(m),capture(m));
    mode.textContent=active?'Exit selection mode':'Select messages';mode.setAttribute('aria-pressed',String(active));
    status.textContent = active && !loaded.length ? 'No supported messages found on this page. Selection is still active; open a conversation or scroll to load messages.' : active ? `${selected.size} selected. Shift-click selects a range. Selections survive scrolling; scroll to load earlier messages.` : 'Select portions of this chat to copy or save. Original messages stay here.';
    const present=new Set();
    for (const m of loaded) {
      const id=messageId(m);present.add(id);let box=boxes.get(id);
      if(!active){box?.remove();boxes.delete(id);continue;}
      if(!box){
        box=document.createElement('input');box.type='checkbox';box.className='linux-message-checkbox';
        box.setAttribute('aria-label','Select '+messageRole(m)+' message');box.dataset.selectionId=id;
        box.style.cssText='position:fixed!important;z-index:2147483647!important;appearance:auto!important;display:block!important;width:26px!important;height:26px!important;margin:0!important;accent-color:#10a37f!important;cursor:pointer!important;outline:2px solid #10a37f!important;pointer-events:auto!important;opacity:1!important';
        box.addEventListener('click',e=>{e.stopPropagation();const list=messages(),current=list.find(x=>messageId(x)===id);if(!current)return;const start=list.findIndex(x=>messageId(x)===anchor),end=list.indexOf(current),wanted=box.checked;
          const targets=e.shiftKey&&start>=0?list.slice(Math.min(start,end),Math.max(start,end)+1):[current];
          for(const x of targets){const key=messageId(x);if(wanted){selected.add(key);snapshots.set(key,capture(x));}else selected.delete(key);}anchor=id;update();});
        document.documentElement.append(box);boxes.set(id,box);
      }
      box.checked=selected.has(id);
      const r=m.getBoundingClientRect?.()||{top:0,bottom:1,left:40},top=document.getElementById('linux-thread-tabs')?46:4;
      box.style.setProperty('top',Math.max(top,r.top+8)+'px','important');box.style.setProperty('left',Math.max(8,r.left-32)+'px','important');
      box.hidden=r.bottom<top||r.top>(window.innerHeight||10000)||(m.getClientRects&&!m.getClientRects().length);
      box.style.setProperty('visibility',box.hidden?'hidden':'visible','important');
    }
    for(const [id,box]of boxes)if(!present.has(id)){box.remove();boxes.delete(id);}
    dock.hidden=!active;dock.style.display=active?'flex':'none';dockCount.textContent=selected.size+' selected';
  }

  function entries(all = false) {
    if(all)return messages().map(capture);
    for(const m of messages())if(selected.has(messageId(m)))snapshots.set(messageId(m),capture(m));
    return order.filter(id=>selected.has(id)&&snapshots.has(id)).map(id=>snapshots.get(id));
  }
  function transcript(all = false) {
    const chunks = entries(all).map(m => `## ${m.role === 'user' ? 'You' : m.role === 'assistant' ? 'ChatGPT' : m.role}\n\n${m.text}`);
    if (!chunks.length) throw new Error('Select at least one loaded message.');
    return `# ${all ? 'Loaded conversation dump' : 'Selected conversation excerpts'}\n\nSource: ${location.href}\n\nExported: ${new Date().toISOString()}\n\nOnly loaded messages are included. Text export only; attachments are not included.\n\n${chunks.join('\n\n---\n\n')}\n`;
  }
  function save(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  const mode=button('Select messages', () => { active = !active; update(); if(active&&messages().length)window.LinuxLocalTools?.close(); });
  button('Select loaded', () => { active = true; messages().forEach(m => selected.add(messageId(m))); update(); });
  button('Clear', () => { selected.clear(); snapshots.clear(); order=[]; anchor = null; update(); });
  button('Copy', async () => {
    try { await navigator.clipboard.writeText(transcript()); status.textContent = 'Copied. Paste into a new chat in your project.'; }
    catch (e) { status.textContent = `Copy failed: ${e.message}. Try Save .md.`; }
  });
  button('Save .md', () => {
    try {
      save(transcript(), 'selected-conversation.md', 'text/markdown;charset=utf-8');
      status.textContent = 'Export requested. Upload the file to your project; attachments must be added separately.';
    } catch (e) { status.textContent = e.message; }
  });
  button('Dump loaded thread', () => {
    try { save(transcript(true), 'conversation-dump.md', 'text/markdown;charset=utf-8'); status.textContent = `Dump requested: ${messages().length} loaded messages. Scroll earlier and export again if messages are missing.`; }
    catch (e) { status.textContent = e.message; }
  });
  button('Dump JSON', () => {
    save(JSON.stringify({source:location.href, exportedAt:new Date().toISOString(), scope:'loaded messages only', attachmentsIncluded:false, messages:entries(true)}, null, 2), 'conversation-dump.json', 'application/json');
  });
  button('Save layout diagnostic',()=>{
    const nodes=[...document.querySelectorAll('main,[role="main"],article,[data-message-id],[data-testid],[data-message-author-role]')].filter(n=>!panel.contains(n)).slice(0,1500).map(n=>({tag:n.tagName,id:n.id,testId:n.getAttribute('data-testid'),messageId:n.getAttribute('data-message-id'),author:n.getAttribute('data-message-author-role'),role:n.getAttribute('role'),classes:String(n.className||'').slice(0,250),parent:n.parentElement?.tagName}));
    save(JSON.stringify({version:'0.8.1',path:location.pathname,nodes},null,2),'chatgpt-layout-diagnostic.json','application/json');
  });
  button('Hide', () => { panel.hidden = true; update(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyM') {
      e.preventDefault(); if(window.LinuxLocalTools)window.LinuxLocalTools.toggle(panel.id);else panel.hidden = !panel.hidden;
    }
  });
  document.body.append(panel);
  window.LinuxLocalTools?.register(panel,'Message tools',['M7 3h10v18H7z','M10 8h4M10 12h4M10 16h3','M4 6v12']);
  update();
  let scheduled = false;
  new MutationObserver(records => {
    for(const r of records)for(const node of r.removedNodes||[]){if(node.nodeType!==1)continue;for(const m of [node,...node.querySelectorAll('[data-message-author-role],[data-testid^="conversation-turn-"]')]){const id=messageId(m);if(selected.has(id))snapshots.set(id,capture(m));}}
    if (records.every(r => panel.contains(r.target) || r.target === panel || r.target.classList?.contains('linux-message-checkbox'))) return;
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame||window.setTimeout)(() => {
      scheduled = false;
      if (route !== location.href) { route = location.href; selected.clear(); snapshots.clear(); order=[]; anchor = null; }
      update();
    });
  }).observe(document.body, {childList:true, subtree:true,characterData:true});
})();
