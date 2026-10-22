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
    const turn=m.closest('[data-testid^="conversation-turn-"],article[data-turn-id]');
    const id=m.getAttribute('data-message-id')||m.getAttribute('data-turn-id')||m.id||turn?.getAttribute('data-turn-id')||turn?.getAttribute('data-testid')||m.getAttribute('data-testid');
    if(id&&id!=='user-message'&&id!=='assistant-message')return id+':'+messageRole(m);
    if(!fallbackIds.has(m))fallbackIds.set(m,'local-message-'+(++nextId));
    return fallbackIds.get(m);
  }
  function messages() {
    const candidates=[...document.querySelectorAll('[data-message-author-role="user"],[data-message-author-role="assistant"],[data-testid="user-message"],[data-testid="assistant-message"],[data-testid^="conversation-turn-"],article[data-turn-id]')];
    return candidates.filter(m=>!panel.contains(m)&&!candidates.some(other=>other!==m&&m.contains(other)));
  }
  function update() {
    const loaded=messages(), ids=loaded.map(m=>messageId(m));
    for(let i=ids.length-1;i>=0;i--)if(!order.includes(ids[i])){const next=order.indexOf(ids[i+1]);if(next>=0)order.splice(next,0,ids[i]);else order.push(ids[i]);}
    for(const m of loaded)if(selected.has(messageId(m)))snapshots.set(messageId(m),capture(m));
    mode.textContent=active?'Exit selection mode':'Select messages';mode.setAttribute('aria-pressed',String(active));
    status.textContent = active && !loaded.length ? 'No supported messages found on this page. Selection is still active; open a conversation or scroll to load messages.' : active ? `${selected.size} selected. Shift-click selects a range. Selections survive scrolling; scroll to load earlier messages.` : 'Select portions of this chat to copy or save. Original messages stay here.';
    for (const m of messages()) {
      let box = m.querySelector(':scope > .linux-message-checkbox');
      if (!active) { box?.remove(); continue; }
      if (!box) {
        box = document.createElement('input'); box.type = 'checkbox';
        box.className = 'linux-message-checkbox';
        box.setAttribute('aria-label', 'Select message');
        box.style.cssText = 'appearance:auto!important;display:block!important;width:26px!important;height:26px!important;margin:8px!important;accent-color:#10a37f;cursor:pointer;outline:2px solid #10a37f';
        box.addEventListener('click', e => {
          const list = messages(), id = messageId(m);
          const wanted = box.checked;
          const start = list.findIndex(x => messageId(x) === anchor);
          const end = list.indexOf(m);
          const targets = e.shiftKey && start >= 0 ? list.slice(Math.min(start,end), Math.max(start,end)+1) : [m];
          for (const x of targets) wanted ? selected.add(messageId(x)) : selected.delete(messageId(x));
          anchor = id; update();
        });
        m.prepend(box);
      }
      box.checked = selected.has(messageId(m));
    }
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
