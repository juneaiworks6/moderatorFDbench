window.AudioEvalTimeline=(()=>{
  const fmt=x=>Number.isFinite(x)?`${Math.floor(Math.max(0,x)/60)}:${(Math.max(0,x)%60).toFixed(1).padStart(4,"0")}`:"—";
  function spans(run){return run.clock_spans||run.participant_spans||run.input_spans||[]}
  function sessionToSource(t,run){const ss=spans(run);if(!ss.length)return null;let prev=ss[0];if(t<prev.session_start_sec)return prev.source_start_sec+t-prev.session_start_sec;for(const s of ss){if(t>=s.session_start_sec&&t<=s.session_end_sec)return s.source_start_sec+t-s.session_start_sec;if(t<s.session_start_sec)return prev.source_end_sec;prev=s}return prev.source_end_sec+t-prev.session_end_sec}
  function sourceToSession(t,run){const ss=spans(run);if(!ss.length)return 0;for(let i=ss.length-1;i>=0;i--){const s=ss[i];if(t>=s.source_start_sec-1e-7&&t<=s.source_end_sec+1e-7)return s.session_start_sec+t-s.source_start_sec}const s=t<ss[0].source_start_sec?ss[0]:ss[ss.length-1];return s.session_start_sec+t-s.source_start_sec}
  function mount(o){
    const root=typeof o.root==="string"?document.querySelector(o.root):o.root;
    const A=typeof o.audio==="string"?document.querySelector(o.audio):o.audio;
    const C=root.querySelector("canvas"),clock=root.querySelector("[data-ae-clock]"),mode=root.querySelector("[data-ae-mode]");
    let current=o.getSelectedRun();
    function modelTurns(){return current.model_turns||current.completed_model_turns||[]}
    function inputSpans(){return current.input_spans||current.participant_spans||[]}
    function pauses(){return current.pause_spans||current.automatic_output_pauses||[]}
    function phaseSpans(){return current.phase_spans||[]}
    function moderatorGaps(){return current.moderator_gap_spans||[]}
    function deadlines(){if(current.deadlines)return current.deadlines;return (current.triggers||[]).map(x=>({session_sec:(x.window?.[1]||0)+(current.reference_time_shift_sec||0),code:x.code}))}
    function draw(){
      const dpr=devicePixelRatio||1,w=C.clientWidth,h=164,dur=current.duration_sec||A.duration||1;
      const left=68,right=Math.max(left+1,w-12),space=right-left,sx=t=>left+Math.max(0,Math.min(1,(Number(t)||0)/dur))*space;
      C.width=w*dpr;C.height=h*dpr;
      const x=C.getContext("2d");x.scale(dpr,dpr);x.clearRect(0,0,w,h);x.fillStyle="#f7f9f7";x.fillRect(0,0,w,h);
      const phaseColors={1:"#e7f0ff",2:"#fff2d9",3:"#f0e8fb"};
      for(const p of phaseSpans()){
        const a=p.session_start_sec,b=p.session_end_sec;
        if(a==null||b==null||b<=a)continue;
        x.fillStyle=p.color||phaseColors[p.phase]||"#edf2ef";
        x.fillRect(sx(a),7,Math.max(1,sx(b)-sx(a)),130);
        x.fillStyle="#51615d";x.font="10px system-ui";
        x.fillText(p.label||`P${p.phase}`,Math.min(right-18,sx(a)+4),18);
      }
      x.fillStyle="#60706b22";for(const p of pauses()){if(p.resume_session_sec!=null)x.fillRect(sx(p.pause_start_session_sec),7,sx(p.resume_session_sec)-sx(p.pause_start_session_sec),130)}
      x.font="11px system-ui";x.fillStyle="#68797b";x.fillText("Debaters",8,45);x.fillText("GPT-Live",8,105);
      const drawWave=(data,y,color,fallback)=>{
        x.strokeStyle="#dce4dd";x.lineWidth=1;x.beginPath();x.moveTo(left,y+.5);x.lineTo(right,y+.5);x.stroke();
        if(Array.isArray(data)&&data.length){
          const step=space/data.length;x.fillStyle=color;
          data.forEach((v,i)=>{const amp=Math.min(1,Math.max(0,Number(v)||0))*29;if(amp>0)x.fillRect(left+i*step,y-amp,Math.max(1,step),Math.max(1,amp*2))});
        }else{
          x.fillStyle=color;for(const p of fallback){const a=p.start_sec??p.playback_start_sec??p.session_start_sec,b=p.end_sec??p.playback_end_session_sec??p.session_end_sec;if(a!=null)x.fillRect(sx(a),y-12,Math.max(1,sx(b??a+.2)-sx(a)),24)}
        }
      };
      drawWave(current.input_peaks,42,"#577fc8",inputSpans());
      drawWave(current.model_peaks||current.output_peaks,103,"#20866b",modelTurns());
      x.fillStyle="#159a9488";for(const g of moderatorGaps()){
        const a=g.session_start_sec,b=g.session_end_sec;
        if(a!=null&&b!=null&&b>=a)x.fillRect(sx(a),128,Math.max(2,sx(b)-sx(a)),8)
      }
      x.strokeStyle="#aeb9b3";x.lineWidth=1;for(const d of deadlines()){const px=sx(d.session_sec);x.beginPath();x.moveTo(px,7);x.lineTo(px,137);x.stroke()}
      x.fillStyle="#8a9893";for(let t=0;t<=dur;t+=30)x.fillText(fmt(t),Math.min(w-39,Math.max(left,sx(t)-14)),154);
      x.strokeStyle="#162c30";x.lineWidth=2;const px=sx(A.currentTime);x.beginPath();x.moveTo(px,2);x.lineTo(px,138);x.stroke();
      const src=sessionToSource(A.currentTime,current);clock.textContent=`${fmt(A.currentTime)} / ${fmt(dur)}`;
    }
    let loadGeneration=0;
    function load(run,sourceTime){
      current=run;const generation=++loadGeneration;
      for(const opt of mode.options)opt.disabled=!current.files?.[opt.value];
      if(!current.files?.[mode.value])mode.value=["stereo","model","input"].find(k=>current.files?.[k])||"stereo";
      const targetSession=sourceTime==null?0:sourceToSession(sourceTime,current);
      root.dataset.aeTargetSession=String(targetSession);
      const applyPosition=()=>{if(generation!==loadGeneration||A.readyState<1)return;A.currentTime=targetSession;root.dataset.aeAppliedSession=String(A.currentTime);draw()};
      const setPosition=()=>{applyPosition();setTimeout(applyPosition,100);setTimeout(applyPosition,500)};
      A.addEventListener("loadedmetadata",setPosition,{once:true});
      A.addEventListener("loadeddata",setPosition,{once:true});
      A.addEventListener("canplay",setPosition,{once:true});
      A.src=current.files?.[mode.value]||"";A.load();
      if(A.readyState>=1)setPosition();
      draw();
    }
    mode.addEventListener("change",()=>load(current,sessionToSource(A.currentTime,current)));
    root.querySelector("[data-ae-back]").addEventListener("click",()=>{A.currentTime=Math.max(0,A.currentTime-5);draw()});
    root.querySelector("[data-ae-forward]").addEventListener("click",()=>{A.currentTime=Math.min(current.duration_sec||A.duration,A.currentTime+5);draw()});
    C.addEventListener("click",e=>{const r=C.getBoundingClientRect(),leftPx=68,rightPx=Math.max(leftPx+1,r.width-12),f=(e.clientX-r.left-leftPx)/(rightPx-leftPx);A.currentTime=Math.max(0,Math.min(1,f))*(current.duration_sec||A.duration);draw()});
    root.addEventListener("click",e=>{const n=e.target.closest("[data-session],[data-source]");if(!n)return;A.currentTime=n.dataset.session!==undefined?Number(n.dataset.session):sourceToSession(Number(n.dataset.source),current);draw()});
    A.addEventListener("timeupdate",draw);window.addEventListener("resize",draw);load(current,null);
    return {draw,changeRun(run){const src=sessionToSource(A.currentTime,current);load(run,src)},getRun(){return current}}
  }
  return {mount,fmt,sessionToSource,sourceToSession};
})();
