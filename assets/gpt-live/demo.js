(()=>{
const D=window.REPORT_DATA,$=s=>document.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number.isFinite(Number(x))?Number(x).toFixed(2):'—', pct=(n,d)=>(100*n/d).toFixed(2)+'%';
const S=$('#debateSel'),search=$('#search'),codeF=$('#codeFilter'),timingF=$('#timingFilter'),root=$('#canonical-player');
Object.keys(D.by_code).forEach(c=>codeF.add(new Option(c,c)));
let visible=D.runs, current=D.runs[0], player;
function fillSelect(keep){const q=search.value.trim().toLowerCase();visible=D.runs.filter(r=>!q||r.debate_id.toLowerCase().includes(q)||r.motion.toLowerCase().includes(q));S.innerHTML='';visible.forEach(r=>S.add(new Option(`${r.motion}`,r.debate_id)));if(keep&&visible.some(r=>r.debate_id===keep))S.value=keep;else if(visible.length)S.value=visible[0].debate_id}
function badge(value){const cls=String(value).split(/\s|·/)[0];return `<span class="badge ${esc(cls)}">${esc(value)}</span>`}
function render(){current=D.runs.find(r=>r.debate_id===S.value)||visible[0];if(!current){$('#identity').innerHTML='<div class=empty>검색 결과 없음</div>';return}
 const a=current.anchor, sm=current.summary, t=sm.timing;
 document.querySelectorAll('[data-case]').forEach(b=>b.classList.toggle('active',b.dataset.case===current.case));
 const names={'A4':'CUE','A4xf':'CROSS&CUE','A3-1':'OPEN','A3-2':'CLOSE','A2-2':'PASS','A2-1':'CUT&PASS','A1':'STOP','A5':'PROTECT','B1':'REDIRECT','B2':'RECONCILE'};
 $('#highlights').innerHTML='<strong>Explore the interventions</strong><div class="highlight-buttons">'+current.expected_interventions.map(x=>`<button data-highlight="${Math.max(0,(x.matched_session_sec??x.session_deadline_sec)-5)}">▶ ${names[x.code]||x.code} <small>${AudioEvalTimeline.fmt(x.matched_session_sec??x.session_deadline_sec)}</small></button>`).join('')+'</div><small>Select an intervention to hear it in context.</small>';

 $('#identity').innerHTML=`<div class=motion>${esc(current.motion)}</div>`;
 root.querySelector('[data-ae-actual-input]').innerHTML=current.input_turns.map(x=>`<button class=ae-utt data-session="${x.session_start_sec}"><span class=stamp>${fmt(x.session_start_sec)}s · ${esc(x.name||x.speaker)}</span>${esc(x.text)}</button>`).join('');
 root.querySelector('[data-ae-model-utterances]').innerHTML=current.model_turns.map(x=>`<button class=ae-utt data-session="${x.start_sec}"><span class=stamp>${fmt(x.start_sec)}s · turn ${x.turn}</span>${esc(x.text)}</button>`).join('');
 const rows=current.expected_interventions.filter(x=>(!codeF.value||x.code===codeF.value)&&(!timingF.value||x.timing===timingF.value));
 root.querySelector('[data-ae-expected-interventions]').innerHTML=rows.map(x=>{const seek=x.matched_session_sec??x.session_deadline_sec;return `<tr data-session="${Math.max(0,seek-5)}"><td><button data-session="${Math.max(0,seek-5)}">▶ ${AudioEvalTimeline.fmt(seek)}</button></td><td><b>${esc(names[x.code]||x.code)}</b></td><td>${esc(x.matched_text||'No response in the matching window.')}</td></tr>`}).join('');
 root.querySelector('[data-ae-other-model-utterances]').innerHTML=current.extra_model_utterances.length?current.extra_model_utterances.map(x=>`<tr data-session="${x.start_sec}"><td><button data-session="${x.start_sec}">${fmt(x.start_sec)}s</button></td><td>${esc(x.kind)}${x.barge_in?' · barge-in':''}</td><td>${badge(x.verdict)}</td><td>${esc(x.text)}<div class=reason>${esc(x.why)}${x.violated_duty?'<br>violated duty: '+esc(x.violated_duty):''}</div></td></tr>`).join(''):'<tr><td colspan=4 class=empty>그 밖의 발화 없음</td></tr>';
 if(player)player.changeRun(current);else player=AudioEvalTimeline.mount({root,audio:root.querySelector('[data-ae-audio]'),getSelectedRun:()=>current});
}
search.addEventListener('input',()=>{fillSelect(current?.debate_id);render()});S.addEventListener('change',render);codeF.addEventListener('change',render);timingF.addEventListener('change',render);
root.addEventListener('click',e=>{if(e.target.closest('button[data-session]'))root.querySelector('audio').play().catch(()=>{});const b=e.target.closest('[data-highlight]');if(b){const a=root.querySelector('audio');a.currentTime=Number(b.dataset.highlight);a.play().catch(()=>{});}});
fillSelect();render();
document.querySelectorAll('audio').forEach(audio=>audio.addEventListener('play',()=>document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause()})));
window.REPORT_READY=true;

})();