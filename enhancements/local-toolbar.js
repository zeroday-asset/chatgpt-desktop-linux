// Two compact controls; tool panels stay closed until requested.
(()=>{
 if(window.LinuxLocalTools)return;
 const bar=document.createElement('nav');bar.id='linux-local-tools';bar.setAttribute('aria-label','Local app tools');
 bar.style.cssText='position:fixed;top:12px;right:76px;z-index:2147483647;display:flex;gap:6px;-webkit-app-region:no-drag';
 document.body.append(bar);
 const entries=new Map();
 function place(){
  if(!bar.isConnected)document.body.append(bar);
  const share=[...document.querySelectorAll('button')].find(b=>/^share(?: chat| conversation)?$/i.test(b.getAttribute('aria-label')||b.textContent.trim())&&b.getBoundingClientRect().top<120);
  if(share&&share.parentElement!==bar&&share.parentElement!==document.body){
   if(bar.nextSibling!==share)share.before(bar);
   bar.style.position='relative';bar.style.top='auto';bar.style.right='auto';bar.style.marginInlineEnd='8px';
  }else{bar.style.position='fixed';bar.style.top=document.getElementById('linux-thread-tabs')?'107px':'65px';bar.style.right='18px';}
 }
 window.addEventListener('resize',place);
 let pending=false;new MutationObserver(()=>{if(!pending){pending=true;(window.requestAnimationFrame||window.setTimeout)(()=>{pending=false;place();});}}).observe(document.body,{childList:true,subtree:true});
 place();
 function sync(){for(const{panel,button}of entries.values())button.setAttribute('aria-expanded',String(!panel.hidden));}
 function close(){for(const{panel}of entries.values())panel.hidden=true;sync();}
 function toggle(id){const entry=entries.get(id);if(!entry)return;const open=entry.panel.hidden;close();entry.panel.hidden=!open;sync();if(open)entry.panel.querySelector('button,select,input')?.focus();}
 function register(panel,label,paths){
  panel.hidden=true;panel.style.top=document.getElementById('linux-thread-tabs')?'100px':'58px';panel.style.bottom='auto';panel.style.right='18px';panel.style.maxHeight='calc(100vh - 82px)';panel.style.overflow='auto';panel.style.maxWidth='calc(100vw - 36px)';
  panel.setAttribute('role','region');panel.setAttribute('aria-label',label);
  const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.setAttribute('aria-controls',panel.id);b.setAttribute('aria-expanded','false');
  b.style.cssText='display:grid;place-items:center;width:34px;height:34px;border:1px solid #7776;border-radius:9px;background:#202124;color:#eee;cursor:pointer';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','19');svg.setAttribute('height','19');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('aria-hidden','true');
  for(const d of paths){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);svg.append(p);}b.append(svg);
  entries.set(panel.id,{panel,button:b});bar.append(b);b.addEventListener('click',()=>toggle(panel.id));
  new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['hidden']});
 }
 document.addEventListener('click',e=>{if(bar.contains(e.target))return;for(const{panel}of entries.values())if(!panel.hidden&&panel.contains(e.target))return;close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const opened=[...entries.values()].find(x=>!x.panel.hidden);close();opened?.button.focus();}});
 window.LinuxLocalTools={register,toggle,close};
})();
