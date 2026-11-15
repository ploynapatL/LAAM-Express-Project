'use strict';
let catalog=null,selected=null;
const $=id=>document.getElementById(id);
function safe(s){return String(s??'')}
function connection(text,ok=false){$('connection').textContent=text;$('connection').className=ok?'pass':'fail'}
function endpoint(path){const b=$('base').value.trim();if(!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(b))throw Error('Backend URL must be localhost HTTP');return b+path}
async function call(path,method='GET'){
  const r=await fetch(endpoint(path),{method,headers:{Authorization:'Bearer '+$('token').value,Accept:'application/json'},cache:'no-store'});
  const body=await r.json().catch(()=>({error:'Non-JSON response'}));if(!r.ok)throw Error(`${r.status}: ${body.error||'Request failed'}`);return body;
}
function el(tag,text,cls){const x=document.createElement(tag);if(text!=null)x.textContent=text;if(cls)x.className=cls;return x}
function renderTests(target,tests){target.replaceChildren();if(!tests.length){target.append(el('p','No test scenarios defined.'));return}
  for(const test of tests){const line=el('div',null,'test');line.append(el('b',test.id+' — '+test.name),el('span',' '+test.kind+' / '+test.coverage,'tag'));const btn=el('button','Run Prepared Test');btn.type='button';btn.onclick=()=>execute(test,btn);line.append(btn);target.append(line)}
}
function openRequirement(id){selected=catalog.requirements.find(r=>r.id===id);if(!selected)return;$('listSection').classList.add('hidden');$('detail').classList.remove('hidden');$('title').textContent=selected.id+' — '+selected.name;$('br').textContent=selected.br;$('actor').textContent=selected.actor;$('useCase').textContent=selected.useCase;$('outcome').textContent='No test executed.';$('result').textContent='Choose a prepared test.';renderTests($('tests'),catalog.tests.filter(t=>t.fr===id));window.scrollTo({top:0,behavior:'instant'})}
async function execute(test,button){button.disabled=true;$('outcome').textContent='Executing real PostgreSQL test...';$('result').textContent='';$('detail').classList.remove('hidden');try{const r=await call('/api/playground/run/'+encodeURIComponent(test.id),'POST');$('outcome').replaceChildren(el('span',`${r.verdict} | ${r.operation} | ${r.source} | ${r.transaction} | ${r.durationMs} ms`,r.verdict==='PASS'?'pass status':r.verdict==='NOT_IMPLEMENTED'?'warn status':'fail status'));$('result').textContent=JSON.stringify(r,null,2)}catch(e){$('outcome').replaceChildren(el('span','ERROR — '+e.message,'fail'));$('result').textContent='No validated database result received.'}finally{button.disabled=false}}
const primary={'FR-01':'TC-13','FR-02':'TC-15','FR-03':'TC-17','FR-04':'TC-08','FR-05':'TC-20','FR-06':'TC-21','FR-07':'TC-22','FR-08':'TC-26','FR-09':'TC-29','FR-10':'TC-31'};
$('runUseCase').onclick=()=>{if(!selected||!catalog)return;const t=catalog.tests.find(x=>x.id===primary[selected.id]);if(t)execute(t,$('runUseCase'))};
$('back').onclick=()=>{$('detail').classList.add('hidden');$('listSection').classList.remove('hidden')};
$('connect').onclick=async()=>{try{if($('token').value.trim().length<32)throw Error('Please enter the 32+ character demo token');catalog=await call('/api/playground/catalog');connection('Connected: '+catalog.mode+' / '+catalog.execution,true);$('reqList').replaceChildren();for(const r of catalog.requirements){const b=el('button',r.id+' — '+r.name);b.onclick=()=>openRequirement(r.id);$('reqList').append(b)}renderTests($('general'),catalog.tests.filter(t=>!t.fr||t.id==='TC-02'));}catch(e){connection('Connection failed: '+e.message)}};
