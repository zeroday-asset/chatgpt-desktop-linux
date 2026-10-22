// Versioned, local rules. Rates inform defaults, not a prediction of total cost.
(function(root){
 'use strict';
 const rates={asOf:'2026-10-21',unit:'credits per million tokens, standard speed',models:{'gpt-6-luna':{input:2.5,cached:0.25,output:12.5},'gpt-6.1-sol':{input:50,cached:2.5,output:250},'gpt-6-sol':{input:50,cached:5,output:250},'gpt-6-astra':{input:250,cached:25,output:1250}},source:'https://learn.chatgpt.com/docs/pricing'};
 const profiles={
  chat:{model:'gpt-6-luna',effort:'low',reason:'Conversation or a quick explanation'},
  lookup:{model:'gpt-6-luna',effort:'high',reason:'Focused lookup, extraction, summary, or small edit'},
  work:{model:'gpt-6.1-sol',effort:'medium',reason:'App building, debugging, investigation, or multi-source research'},
  review:{model:'gpt-6.1-sol',effort:'high',reason:'Difficult debugging or consequential analysis'},
  hardest:{model:'gpt-6-astra',effort:'low',reason:'Explicitly demanding end-to-end reasoning or a failed difficult approach'}
 };
 function choose(text,previous=null,options={}){
  const s=String(text||'').trim();
  const continuation=/^(ok(?:ay)?|yes|no|go ahead|continue(?: this chat)?|proceed|do it|thanks?|perfect|next|try again|keep going)[.!\s]*$/i.test(s)||/^(also|and|but|instead|can (?:you|we) also|what about|it still|that still|same (?:error|issue)|still (?:fails|broken))\b/i.test(s);
  if(previous&&continuation)return {...previous,reason:'Follow-up: retain the active task’s model and effort'};
  let key='chat';
  if(/\b(search|look up|browse|find|summari[sz]e|extract|translate|rewrite|format|convert|list|sort|calculate|simple (?:edit|fix))\b/i.test(s))key='lookup';
  if(options.attachments||s.length>1200||/\b(build|implement|debug|compile|refactor|investigate|research|compare|analy[sz]e|design|audit|diagnos\w*|architect\w*|code|repository|repo|app|application|protocol|security|encrypt\w*|medical|legal|financial)\b/i.test(s))key='work';
  // A focused code/text transformation need not use the general work model.
  if(!options.attachments&&s.length<700&&/\b(rename|fix (?:a |the )?typo|change (?:the |a )?(?:label|button text|color)|format (?:this |the )?json|extract (?:the |all )?(?:numbers|names|dates))\b/i.test(s))key='lookup';
  if(/\b(threat model|security audit|cryptographic protocol|race condition|deadlock|data loss|production incident|complex debugging|conflicting (?:sources|evidence)|differential diagnosis)\b/i.test(s)||s.length>8000)key='review';
  if(/\b(use (?:astra|the strongest model)|formal verification|prove (?:the |this )?(?:protocol|algorithm)|exhaustive security review|hardest end.to.end|sol (?:failed|couldn.t|cannot)|multiple approaches (?:have )?failed)\b/i.test(s))key='hardest';
  const result={profile:key,...profiles[key],speed:'standard'};
  if(options.preference==='economy'&&key==='hardest')return {...result,profile:'review',...profiles.review,reason:'Difficult work; economy preference keeps Sol High'};
  if(options.preference==='quality'&&key==='chat')return {...result,...profiles.lookup,profile:'lookup'};
  return result;
 }
 const api={choose,profiles,rates};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.LinuxRoutingPolicy=api;
})(typeof window!=='undefined'?window:globalThis);
