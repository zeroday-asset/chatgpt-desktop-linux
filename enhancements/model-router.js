// Visible-control adapter. No private APIs, classifier calls, or account tokens.
(function(root){
 'use strict';
 if(!root.document||root.__linuxModelRouter)return;
 root.__linuxModelRouter=true;
 const document=root.document,policy=root.LinuxRoutingPolicy;
 if(!policy)return;
 const key='linux-port.model-router.v2';
 let settings={mode:'auto',preference:'balanced'};
 try{settings={...settings,...JSON.parse(root.localStorage.getItem(key)||'{}')};}catch(_){}
 if(!['off','suggest','auto'].includes(settings.mode))settings.mode='auto';
 if(!['economy','balanced','quality'].includes(settings.preference))settings.preference='balanced';
 let busy=false,allowClick=null;
 const tasks=new Map(),locks=new Map();
 const panel=document.createElement('section');panel.id='linux-model-router';
 panel.style.cssText='position:fixed;top:70px;right:16px;z-index:2147483646;width:300px;max-height:70vh;overflow:auto;padding:12px;background:#202124;color:white;border:1px solid #888;border-radius:12px;font:13px system-ui';
 const title=document.createElement('strong');title.textContent='Automatic model rules';
 const status=document.createElement('p');status.setAttribute('role','status');
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Rules and override';details.append(summary);panel.append(title,status,details);
 function select(label,values,value,change){
  const row=document.createElement('label');row.textContent=label+' ';const el=document.createElement('select');
  for(const [v,name]of values){const o=document.createElement('option');o.value=v;o.textContent=name;el.append(o);}el.value=value;el.addEventListener('change',()=>change(el.value));row.append(el);details.append(row,document.createElement('br'));return el;
 }
 function persist(){try{root.localStorage.setItem(key,JSON.stringify(settings));}catch(_) {}}
 select('Mode',[['auto','Automatic'],['suggest','Suggest only'],['off','Off']],settings.mode,v=>{settings.mode=v;persist();refresh();});
 select('Preference',[['economy','Economy'],['balanced','Balanced'],['quality','Quality']],settings.preference,v=>{settings.preference=v;persist();refresh();});
 const lockSelect=select('This chat',[['auto','Automatic'],...Object.entries(policy.profiles).map(([id,p])=>[id,`${p.model} · ${p.effort}`])],'auto',v=>{if(v==='auto')locks.delete(location.href);else locks.set(location.href,{profile:v,...policy.profiles[v],speed:'standard',reason:'Manual override'});refresh();});
 const rules=document.createElement('p');rules.textContent='Chat: Luna Light. Lookup, summary, small edit: Luna High. Build/debug/research: Sol Medium. Difficult review: Sol High. Hardest explicit tasks: Astra Light. Standard speed. Follow-ups retain the active task. No model assignment needed.';details.append(rules);
 const note=document.createElement('p');note.textContent='Local rules, not measured credit savings. If a required control cannot be verified, the draft stays unsent. Ctrl+Shift+R shows this panel.';details.append(note);
 const hide=document.createElement('button');hide.textContent='Hide';hide.addEventListener('click',()=>panel.hidden=true);panel.append(hide);document.body.append(panel);
 root.LinuxLocalTools?.register(panel,'Model routing',['M4 6h16M4 12h16M4 18h16','M8 3v6M16 9v6M10 15v6']);
 function txt(el){return(el?.innerText||el?.textContent||'').trim().replace(/\s+/g,' ');}
 function visible(el){return el&&!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&!el.closest('[hidden],[aria-hidden="true"]')&&el.getClientRects().length>0;}
 function enabled(el){return !el.disabled&&el.getAttribute('aria-disabled')!=='true';}
 const actionable='button,[role="button"],select';
 const optionSelector='[role="menuitem"],[role="menuitemradio"],[role="option"],[role="radio"]';
 function options(){return[...document.querySelectorAll(optionSelector)].filter(x=>visible(x)&&enabled(x)&&!panel.contains(x));}
 function label(el){const value=el?.tagName==='SELECT'?(el.selectedOptions?.[0]?.textContent||el.value):txt(el);return `${value||''} ${el?.getAttribute('aria-label')||''}`.trim();}
 function modelIn(s){
  const n=s.toLowerCase().replace(/[‐‑–—]/g,'-');
  if(/\b(?:gpt[- ]?)?6[. ]1[- ]?sol\b/.test(n))return'gpt-6.1-sol';
  if(/\b(?:gpt[- ]?)?6[- ]?sol\b/.test(n))return'gpt-6-sol';
  if(/\b(?:gpt[- ]?)?(?:6[- ]?)?luna\b/.test(n)&&!/[0-9]\.[0-9].*luna/.test(n))return'gpt-6-luna';
  if(/\b(?:gpt[- ]?)?(?:6[- ]?)?astra\b/.test(n))return'gpt-6-astra';
  return null;
 }
 function effortIn(s){const m=s.toLowerCase().match(/\b(extra[ -]?high|xhigh|medium|light|low|high|max|ultra)\b/);if(!m)return null;return({light:'low','extra high':'xhigh','extra-high':'xhigh'})[m[1]]||m[1];}
 function composer(){return document.querySelector('#prompt-textarea')||document.querySelector('textarea[data-testid="prompt-textarea"]');}
 function draft(){const el=composer();return el?('value'in el?el.value:txt(el)):'';}
 function attachments(){return!!document.querySelector('[data-testid="attachment"],[data-testid="file-attachment"],[data-testid="attachment-preview"]');}
 function lastTask(){
  if(tasks.has(location.href))return tasks.get(location.href);
  const prior=[...document.querySelectorAll('[data-message-author-role="user"]')].slice(-8);
  let task=null;for(const el of prior)task=policy.choose(txt(el),task,{preference:settings.preference});
  return task;
 }
 function decision(){return locks.get(location.href)||policy.choose(draft(),lastTask(),{attachments:attachments(),preference:settings.preference});}
 function controls(){return[...document.querySelectorAll(actionable)].filter(x=>visible(x)&&!panel.contains(x)&&!x.closest(optionSelector));}
 function picker(){
  const all=controls();
  let matches=all.filter(x=>/^(model-picker|model-switcher|model-switcher-dropdown-button|work-model-picker|power-picker)$/.test(x.getAttribute('data-testid')||''));
  if(matches.length===1)return matches[0];
  matches=all.filter(x=>/\b(model|power|intelligence)\b/i.test(x.getAttribute('aria-label')||'')&&!/effort|reasoning|speed/i.test(x.getAttribute('aria-label')||''));
  if(matches.length===1)return matches[0];
  matches=all.filter(x=>modelIn(label(x))&&(x.getAttribute('aria-haspopup')||x.tagName==='SELECT'));
  return matches.length===1?matches[0]:null;
 }
 function effortControl(){const all=controls();let matches=all.filter(x=>/reasoning|effort/i.test(`${x.getAttribute('aria-label')||''} ${x.getAttribute('data-testid')||''}`));if(matches.length===1)return matches[0];matches=all.filter(x=>/^(light|low|medium|high|extra high|max|ultra)$/i.test(txt(x)));return matches.length===1?matches[0]:null;}
 function speedControl(){const matches=controls().filter(x=>/\bspeed\b/i.test(`${x.getAttribute('aria-label')||''} ${x.getAttribute('data-testid')||''}`)||/^(standard|fast|ultrafast)$/i.test(txt(x)));return matches.length===1?matches[0]:null;}
 function selectedModel(el){return el?.tagName==='SELECT'?modelIn(el.selectedOptions?.[0]?.textContent||el.value):modelIn(label(el));}
 function selectedEffort(el){return el?.tagName==='SELECT'?effortIn(el.selectedOptions?.[0]?.textContent||el.value):effortIn(label(el));}
 function verified(target){const p=picker();return selectedModel(p)===target.model&&(selectedEffort(effortControl())||selectedEffort(p))===target.effort;}
 function waitFor(fn,timeout=1500){return new Promise((resolve,reject)=>{const start=Date.now();function tick(){const v=fn();if(v)return resolve(v);if(Date.now()-start>timeout)return reject(new Error('Required picker state could not be verified'));setTimeout(tick,35);}tick();});}
 function nativeSelect(el,predicate){if(el?.tagName!=='SELECT')return false;const matches=[...el.options].filter(x=>!x.disabled&&predicate(txt(x)));if(matches.length!==1)return false;el.value=matches[0].value;el.dispatchEvent(new root.Event('input',{bubbles:true}));el.dispatchEvent(new root.Event('change',{bubbles:true}));return true;}
 function uniqueOption(predicate){const m=options().filter(x=>predicate(label(x)));return m.length===1?m[0]:null;}
 function fallbackModels(model){return({'gpt-6-luna':['gpt-6-luna','gpt-6.1-sol','gpt-6-sol'],'gpt-6.1-sol':['gpt-6.1-sol','gpt-6-sol'],'gpt-6-astra':['gpt-6-astra','gpt-6.1-sol','gpt-6-sol']})[model]||[model];}
 async function switchModel(target){
  let p=picker();if(!p)throw new Error('Model control not recognized; switch routing Off to send manually');
  if(selectedModel(p)===target.model)return target;
  const candidates=fallbackModels(target.model);
  if(p.tagName==='SELECT'){
   for(const id of candidates)if(nativeSelect(p,s=>modelIn(s)===id))return {...target,model:id,effort:target.model==='gpt-6-astra'&&id!==target.model?'high':target.effort};
   throw new Error('No supported model is available');
  }
  p.click();await waitFor(()=>options().length);
  for(const id of candidates){
   const effort=target.model==='gpt-6-astra'&&id!==target.model?'high':target.effort;
   // Prefer an exact combined preset, then a separate model choice.
   let item=uniqueOption(s=>modelIn(s)===id&&effortIn(s)===effort);
   if(!item)item=uniqueOption(s=>modelIn(s)===id&&!effortIn(s));
   if(item){item.click();await waitFor(()=>selectedModel(picker())===id);return {...target,model:id,effort};}
  }
  // Luna's documented default is High; accept that preset if Light is absent.
  if(target.model==='gpt-6-luna'){
   const item=uniqueOption(s=>modelIn(s)==='gpt-6-luna'&&effortIn(s)==='high');
   if(item){item.click();await waitFor(()=>selectedModel(picker())==='gpt-6-luna');return{...target,effort:'high'};}
  }
  throw new Error('Model menu has no supported unambiguous option');
 }
 async function switchEffort(target){
  if(verified(target))return target;
  let el=effortControl();
  if(el){
   if(nativeSelect(el,s=>effortIn(s)===target.effort)){await waitFor(()=>verified(target));return target;}
   el.click();await waitFor(()=>options().length);
   let item=uniqueOption(s=>effortIn(s)===target.effort&&!modelIn(s));
   if(!item&&target.model==='gpt-6-luna'&&target.effort==='low'){item=uniqueOption(s=>effortIn(s)==='high'&&!modelIn(s));if(item)target={...target,effort:'high'};}
   if(!item)throw new Error('Required reasoning effort is unavailable');
   item.click();await waitFor(()=>verified(target));return target;
  }
  const p=picker();p.click();await waitFor(()=>options().length);
  let item=uniqueOption(s=>modelIn(s)===target.model&&effortIn(s)===target.effort);
  if(!item&&target.model==='gpt-6-luna'&&target.effort==='low'){item=uniqueOption(s=>modelIn(s)===target.model&&effortIn(s)==='high');if(item)target={...target,effort:'high'};}
  if(!item)throw new Error('Reasoning control not recognized');item.click();await waitFor(()=>verified(target));return target;
 }
 async function standardSpeed(){
  const el=speedControl();if(!el)return 'not exposed';
  if(/\bstandard\b/i.test(label(el)))return 'standard';
  if(nativeSelect(el,s=>/^standard$/i.test(s)))return 'standard';
  el.click();const item=await waitFor(()=>uniqueOption(s=>/^standard$/i.test(s)));item.click();await waitFor(()=>/\bstandard\b/i.test(label(speedControl())));return 'standard';
 }
 function sendButton(){return[...document.querySelectorAll('button[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="Send message"]')].find(visible);}
 function stop(e){e.preventDefault();e.stopImmediatePropagation();}
 function normalChatSelected(){return [...document.querySelectorAll('[role="tab"][aria-selected="true"],[role="radio"][aria-checked="true"],button[aria-pressed="true"],button[data-state="active"],button[data-state="on"]')].some(el=>txt(el)==='Chat');}
 async function beforeSend(e,button){
  if(settings.mode!=='auto'||!draft().trim())return;
  if(normalChatSelected()){status.textContent='Chat mode uses its own model controls; Work routing is inactive.';return;}
  if(allowClick&&allowClick===button){allowClick=null;return;}
  stop(e);if(busy)return;
  const route=location.href,original=draft();let d=decision();busy=true;status.textContent=`Choosing ${d.model} · ${d.effort}…`;
  try{
   d=await switchModel(d);d=await switchEffort(d);const speed=await standardSpeed();
   if(location.href!==route||draft()!==original)throw new Error('Chat or draft changed');
   if(!verified(d))throw new Error('Selected model/effort changed');
   const send=sendButton();if(!send||send.disabled)throw new Error('Send button unavailable');
   tasks.set(route,d);status.textContent=`Verified ${d.model} · ${d.effort}${speed==='standard'?' · standard speed':'; speed control not exposed'}. Sending.`;
   allowClick=send;try{send.click();}finally{allowClick=null;}
  }catch(err){status.textContent=`Not sent: ${err.message}. Your draft is preserved.`;panel.hidden=false;}
  finally{busy=false;}
 }
 function refresh(){if(busy)return;lockSelect.value=locks.get(location.href)?.profile||'auto';if(settings.mode==='off'){status.textContent='Routing off.';return;}const d=decision();status.textContent=`${d.model} · ${d.effort}: ${d.reason}. ${settings.mode==='suggest'?'Suggestion only.':'Automatic before send.'}`;}
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b===sendButton())beforeSend(e,b);},true);
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.code==='KeyR'){e.preventDefault();if(root.LinuxLocalTools)root.LinuxLocalTools.toggle(panel.id);else panel.hidden=!panel.hidden;return;}const c=composer();if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing&&c&&(e.target===c||c.contains(e.target)))beforeSend(e,sendButton());},true);
 document.addEventListener('input',e=>{if(!panel.contains(e.target))refresh();});
 refresh();
})(typeof window!=='undefined'?window:globalThis);
