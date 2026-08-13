
/* ══════════ GLOBAL GAME STATE ══════════ */
let _gameQs=[], _qIdx=0, _correct=0, _wrong=0, _skipped=0, _answered=false;
let _userResponses=[], _tmr=null, _qStart=0, _sessionStart=0;
let _activeSetIdx=-1, _activeSub='', _totalQ=0;
let curSubject='', curUnit=null, fromChapter=false, curSubjectData=null;
function _resetGame(){ clearInterval(_tmr); _tmr=null; _gameQs=[]; _qIdx=0; _correct=0; _wrong=0; _skipped=0; _answered=false; _userResponses=[]; _activeSetIdx=-1; _totalQ=0; }
function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }
/* ══════════════════════════════════════════════════════
   HIDDEN SYNC ENDPOINT — Replace with your URL
   No trace in UI, all calls are silent background fetches
══════════════════════════════════════════════════════ */
const _ep = 'https://script.google.com/macros/s/AKfycbxlKcSCrYhTS-cx19C_1eVp0T3cHMId7Pkst9LCn8ZuZR3WnuMyTQA2ar-gQmnpHzHxFg/exec';

function _did() {
  let id = localStorage.getItem('_d');
  if (!id) { id = '_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('_d', id); }
  return id;
}
const DID = _did();

function _push(payload) {
  if (!_ep || _ep.includes('YOUR_')) return;
  const body = JSON.stringify({ did: DID, ts: Date.now(), ...payload });
  // Background, non-blocking, silent
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fetch(_ep, { method: 'POST', body }).catch(() => {}));
  } else {
    setTimeout(() => fetch(_ep, { method: 'POST', body }).catch(() => {}), 0);
  }
}

function _fetchCloud() {
  if (!_ep || _ep.includes('YOUR_')) return;
  fetch(`${_ep}?action=getData&did=${DID}`).then(r => r.json()).then(d => {
    if (!d || !d.ok) return;
    // Restore key-value sync records
    if (d.records) d.records.forEach(r => { if (r.key && r.value) { try { localStorage.setItem(r.key, r.value); } catch(e){} } });
    // Restore notes from Google Sheets
    if (d.notes && d.notes.length) {
      const localNotes = JSON.parse(localStorage.getItem('_notes_v2')||'[]');
      const localIds = new Set(localNotes.map(n=>n.id));
      d.notes.forEach(n => { if(!localIds.has(n.id)) localNotes.push(n); });
      localStorage.setItem('_notes_v2', JSON.stringify(localNotes));
    }
    // Restore session records from Google Sheets
    if (d.sessions && d.sessions.length) {
      d.sessions.forEach(s => {
        const key = `_nc_${s.sub}_${s.setIndex}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify({
            completed:true, accuracy:s.accuracy, correct:s.correct,
            wrong:s.wrong, skipped:s.skipped, total:s.total,
            timeTaken:s.timeTaken, neet:s.neet
          }));
        }
      });
    }
  }).catch(() => {});
}

/* ══════════ SYLLABUS ══════════ */
const SYL = {
  Biology: {
    11:[
      {u:'Diversity in the Living World',i:'🌍',s:['The Living World','Biological Classification','Plant Kingdom','Animal Kingdom']},
      {u:'Structural Organisation in Animals and Plants',i:'🦴',s:['Morphology of Flowering Plants','Anatomy of Flowering Plants','Structural Organisation in Animals']},
      {u:'Cell Structure and Functions',i:'🔬',s:['Cell: The Unit of Life','Biomolecules','Cell Cycle and Cell Division']},
      {u:'Plant Physiology',i:'🌱',s:['Photosynthesis in Higher Plants','Respiration in Plants','Plant Growth and Development']},
      {u:'Human Physiology',i:'❤️',s:['Breathing and Exchange of Gases','Body Fluids and Circulation','Excretory Products and Their Elimination','Locomotion and Movement','Neural Control and Coordination','Chemical Coordination and Integration']},
    ],
    12:[
      {u:'Reproduction',i:'🌸',s:['Sexual Reproduction in Flowering Plants','Human Reproduction','Reproductive Health']},
      {u:'Genetics and Evolution',i:'🧬',s:['Principles of Inheritance and Variation','Molecular Basis of Inheritance','Evolution']},
      {u:'Biology and Human Welfare',i:'🏥',s:['Human Health and Disease','Microbes in Human Welfare']},
      {u:'Biotechnology',i:'⚗️',s:['Biotechnology: Principles and Processes','Biotechnology and its Applications']},
      {u:'Ecology and Environment',i:'🌿',s:['Organisms and Populations','Ecosystem','Biodiversity and Conservation']},
    ]
  },
  Physics: {
    11:[
      {u:'Physics and Measurement',i:'📏',s:['Units and Measurements','Errors in Measurement']},
      {u:'Kinematics',i:'🚀',s:['Motion in a Straight Line','Motion in a Plane']},
      {u:'Laws of Motion',i:'⚙️',s:["Force and Inertia","Newton's Laws","Friction"]},
      {u:'Work, Energy, and Power',i:'💡',s:['Work-Energy Theorem','Collisions','Power']},
      {u:'Rotational Motion',i:'🌀',s:['Center of Mass','Torque','Angular Momentum','Moment of Inertia']},
      {u:'Gravitation',i:'🪐',s:["Kepler's Laws",'Gravitational Potential','Escape Velocity']},
      {u:'Properties of Solids and Liquids',i:'💧',s:['Elasticity','Fluid Pressure','Viscosity','Surface Tension']},
      {u:'Thermodynamics',i:'🌡️',s:['First and Second Laws','Heat Engines']},
      {u:'Kinetic Theory of Gases',i:'💨',s:['Ideal Gas Laws','Specific Heat Capacity']},
      {u:'Oscillations and Waves',i:'〰️',s:['Simple Harmonic Motion','Wave Motion','Doppler Effect']},
    ],
    12:[
      {u:'Electrostatics',i:'⚡',s:['Electric Charges and Fields','Electrostatic Potential and Capacitance']},
      {u:'Current Electricity',i:'🔌',s:["Ohm's Law","Kirchhoff's Rules",'Wheatstone Bridge']},
      {u:'Magnetic Effects of Current and Magnetism',i:'🧲',s:['Biot-Savart Law',"Ampere's Law",'Cyclotron',"Earth's Magnetism"]},
      {u:'Electromagnetic Induction and Alternating Currents',i:'🔄',s:["Faraday's Law","Lenz's Law",'AC Circuits','Transformers']},
      {u:'Electromagnetic Waves',i:'📡',s:['EM Spectrum','Displacement Current']},
      {u:'Optics',i:'🔭',s:['Ray Optics and Optical Instruments','Wave Optics']},
      {u:'Dual Nature of Matter and Radiation',i:'🌊',s:['Photoelectric Effect','Matter Waves']},
      {u:'Atoms and Nuclei',i:'☢️',s:['Bohr Model','Radioactivity','Nuclear Fission and Fusion']},
      {u:'Electronic Devices',i:'💻',s:['Semiconductors','p-n Junction Diodes','Logic Gates']},
    ]
  },
  Chemistry: {
    11:[
      {u:'Physical Chemistry (Class 11)',i:'⚗️',s:['Some Basic Concepts in Chemistry','Atomic Structure','Chemical Thermodynamics','Equilibrium','Redox Reactions']},
      {u:'Inorganic Chemistry (Class 11)',i:'🔩',s:['Classification of Elements','Chemical Bonding and Molecular Structure','p-Block Elements']},
      {u:'Organic Chemistry (Class 11)',i:'🌿',s:['Purification & Characterisation','Basic Principles of Organic Chemistry','Hydrocarbons']},
    ],
    12:[
      {u:'Physical Chemistry (Class 12)',i:'⚗️',s:['Solutions','Electrochemistry','Chemical Kinetics']},
      {u:'Inorganic Chemistry (Class 12)',i:'🔩',s:['d- and f-Block Elements','Coordination Compounds']},
      {u:'Organic Chemistry (Class 12)',i:'🌿',s:['Organic Compounds Containing Halogens','Alcohols Phenols and Ethers','Aldehydes Ketones and Carboxylic Acids','Amines and Diazonium Salts','Biomolecules']},
    ]
  }
};

const SYL_MAP = { botany:'Biology', zoology:'Biology', physics:'Physics', chemistry:'Chemistry' };
const FILE_MAP = { botany:'Biology.json', zoology:'Biology.json', physics:'Physics.json', chemistry:'Chemistry.json', physics_numericals:'physics_numericals.json', chemistry_numericals:'chemistry_numericals.json' };
const SUB_LABELS = { botany:'Botany', zoology:'Zoology', physics:'Physics', chemistry:'Chemistry', physics_numericals:'Physics Numericals', chemistry_numericals:'Chemistry Numericals' };
const SUB_ICONS = { botany:'🌿', zoology:'🧬', physics:'⚛️', chemistry:'🧪', physics_numericals:'📐', chemistry_numericals:'⚗️' };
const CAT_LABELS = { botany:'Botany', zoology:'Zoology', physics:'Physics', chemistry:'Chemistry', physics_numericals:'Physics Nums', chemistry_numericals:'Chem Nums' };

/* ══════════ SCREENS ══════════ */
const ALL_SCR = ['startScreen','chapterScreen','subchapterScreen','setsScreen','gameScreen','resultScreen','bookmarksScreen','bookmarkSetsScreen','revisionScreen','notesListScreen','mockTestListScreen','pyqListScreen','notesScreen','quickAccessModal','analyticsScreen'];
function showScreen(id, push=true) {
  if (push) history.pushState({ sid: id }, '');
  ALL_SCR.forEach(s => { const el = document.getElementById(s); if(el) el.classList.toggle('hidden', s !== id); });
}
function showStart() { clearInterval(_tmr); _resetGame(); showScreen('startScreen'); }

/* ══════════ THEME ══════════ */
function toggleTheme() {
  const isDark = document.body.dataset.theme === 'dark';
  const t = isDark ? 'light' : 'dark';
  document.body.dataset.theme = t;
  document.getElementById('themeBtn').textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('_th', t);
}
(function(){
  const t = localStorage.getItem('_th') || 'dark';
  document.body.dataset.theme = t;
  const btn = document.getElementById('themeBtn');
  if(btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
})();

/* ══════════ CANVAS ══════════ */
(function(){
  const c = document.getElementById('bgCanvas'), ctx = c.getContext('2d');
  let W, H, ns = [], raf;
  function resize(){ W = c.width = window.innerWidth; H = c.height = window.innerHeight; }
  function init(){ ns=[]; for(let i=0;i<18;i++) ns.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:1.2+Math.random()*1.4,p:Math.random()*6.28}); }
  function draw(){
    ctx.clearRect(0,0,W,H);
    const dk = document.body.dataset.theme==='dark';
    const rgb = dk ? '59,130,246' : '37,99,235';
    ns.forEach(n=>{ n.x+=n.vx; n.y+=n.vy; n.p+=.018; if(n.x<0||n.x>W)n.vx*=-1; if(n.y<0||n.y>H)n.vy*=-1; });
    for(let i=0;i<ns.length;i++) for(let j=i+1;j<ns.length;j++){
      const d=Math.hypot(ns[i].x-ns[j].x,ns[i].y-ns[j].y);
      if(d<140){ ctx.beginPath(); ctx.strokeStyle=`rgba(${rgb},${.18*(1-d/140)})`; ctx.lineWidth=.6; ctx.moveTo(ns[i].x,ns[i].y); ctx.lineTo(ns[j].x,ns[j].y); ctx.stroke(); }
    }
    ns.forEach(n=>{ ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,6.28); ctx.fillStyle=`rgba(${rgb},${.45+.32*Math.sin(n.p)})`; ctx.fill(); });
    raf = requestAnimationFrame(draw);
  }
  resize(); init(); draw();
  window.addEventListener('resize',()=>{ resize(); init(); });
})();


/* ══════════ SPLASH ══════════ */
window.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splashScreen');
  if (sessionStorage.getItem('_sp')) { splash.style.display='none'; } else {
    sessionStorage.setItem('_sp','1');
    setTimeout(()=>{ splash.classList.add('fade-out'); setTimeout(()=>{ splash.style.display='none'; }, 700); }, 2300);
  }
  _fetchCloud();
});

/* ══════════ AUDIO ══════════ */
let _ac = null;
function _tone(f,t,d,v=.09){
  try{
    if(!_ac) _ac = new (window.AudioContext||window.webkitAudioContext)();
    if(_ac.state==='suspended') _ac.resume();
    const o=_ac.createOscillator(),g=_ac.createGain();
    o.type=t; o.frequency.value=f;
    g.gain.setValueAtTime(v,_ac.currentTime); g.gain.exponentialRampToValueAtTime(.001,_ac.currentTime+d);
    o.connect(g); g.connect(_ac.destination); o.start(); o.stop(_ac.currentTime+d);
  }catch(e){}
}
const SFX={
  ok:()=>{ _tone(520,'sine',.12); setTimeout(()=>_tone(660,'sine',.16),120); },
  err:()=>_tone(180,'sawtooth',.22,.07),
  tick:()=>_tone(300,'triangle',.05,.04),
  go:[300,400,500,700],
  done:[700,500,400,300]
};
function playSeq(arr,dur=90){ arr.forEach((f,i)=>setTimeout(()=>_tone(f,'sine',dur/1000),i*dur)); }

/* ══════════ TOAST ══════════ */
function showToast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='.35s'; setTimeout(()=>t.remove(),400); },2500);
}

/* ══════════ DIFFICULTY ══════════ */
let selDiff = 'easy';
function selectDiff(el){ document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active')); el.classList.add('active'); selDiff=el.dataset.diff; }

/* ══════════ SUBJECT NAVIGATION ══════════ */
let curSubject='', curSubjectData=null, fromChapter=false, curUnit=null, curUnitMixed=false;

function selectSubject(sub){
  curSubject=sub;
  if(sub==='physics_numericals'||sub==='chemistry_numericals'){ fromChapter=false; fetchSets(FILE_MAP[sub]); return; }
  showChapterScreen(sub);
}

function showChapterScreen(sub){
  const sylKey=SYL_MAP[sub], subSyl=SYL[sylKey];
  document.getElementById('chapterTitle').textContent=SUB_LABELS[sub];
  const list=document.getElementById('chapterList'); list.innerHTML='';

  // All Sets
  const ac=document.createElement('div'); ac.className='chapter-card';
  ac.innerHTML=`<div class="chapter-card-icon">📚</div><div class="chapter-card-body"><div class="chapter-card-title">All Sets</div><div class="chapter-card-sub">All ${SUB_LABELS[sub]} questions mixed</div></div><div class="chapter-card-arr">›</div>`;
  ac.onclick=()=>{ fromChapter=true; curUnit=null; curUnitMixed=false; fetchSets(FILE_MAP[sub]); };
  list.appendChild(ac);

  // Mixed / Revision card — questions NOT matching any unit keyword
  const mc=document.createElement('div'); mc.className='chapter-card';
  mc.innerHTML=`<div class="chapter-card-icon">🔀</div><div class="chapter-card-body"><div class="chapter-card-title">Mixed Practice</div><div class="chapter-card-sub">General &amp; revision sets</div></div><div class="chapter-card-arr">›</div>`;
  mc.onclick=()=>{ fromChapter=true; curUnit=null; curUnitMixed=true; fetchSets(FILE_MAP[sub],'mixed'); };
  list.appendChild(mc);

  if(subSyl){
    [11,12].forEach(cls=>{
      const units=subSyl[cls]; if(!units?.length) return;
      const lbl=document.createElement('div'); lbl.className='class-label'; lbl.textContent=`Class ${cls}`; list.appendChild(lbl);
      units.forEach(unit=>{
        const card=document.createElement('div'); card.className='chapter-card';
        const sub2=unit.s.slice(0,2).join(' · ')+(unit.s.length>2?` +${unit.s.length-2} more`:'');
        card.innerHTML=`<div class="chapter-card-icon">${unit.i||'📖'}</div><div class="chapter-card-body"><div class="chapter-card-title">${unit.u}</div><div class="chapter-card-sub">${sub2}</div></div><div class="chapter-card-arr">›</div>`;
        card.onclick=()=>{ fromChapter=true; curUnit=unit; curUnitMixed=false; fetchSets(FILE_MAP[sub],unit); };
        list.appendChild(card);
      });
    });
  }
  showScreen('chapterScreen');
}

function goBackFromSets(){
  if(fromChapter&&!['physics_numericals','chemistry_numericals'].includes(curSubject)) showScreen('chapterScreen');
  else showStart();
}

/* ══════════ FETCH & RENDER SETS ══════════ */
function fetchSets(filename, unit=null){
  const list=document.getElementById('setsList'); list.innerHTML=`<div class="loading-text">Loading sets…</div>`;
  if(unit==='mixed'){ document.getElementById('setsTitle').textContent='Mixed Practice'; document.getElementById('setsSub').textContent='General & revision sets'; }
  else if(unit){ document.getElementById('setsTitle').textContent=unit.u; document.getElementById('setsSub').textContent=unit.s.slice(0,2).join(', ')+(unit.s.length>2?`…`:''); }
  else{ document.getElementById('setsTitle').textContent=SUB_LABELS[curSubject]; document.getElementById('setsSub').textContent='All sets'; }
  showScreen('setsScreen');

  const xhr=new XMLHttpRequest(); xhr.open('GET',filename,true);
  xhr.onreadystatechange=function(){
    if(xhr.readyState!==4) return;
    if(xhr.status===200||(xhr.status===0&&xhr.responseText)){
      try{ const d=JSON.parse(xhr.responseText); curSubjectData=d; renderSets(d,unit); }
      catch(e){ list.innerHTML=`<div class="loading-text" style="color:var(--red)">Parse error: ${e.message}</div>`; }
    } else { list.innerHTML=`<div class="loading-text" style="color:var(--red)">Could not load ${filename}.</div>`; }
  };
  xhr.onerror=()=>{ list.innerHTML=`<div class="loading-text" style="color:var(--red)">Network error loading ${filename}.</div>`; };
  xhr.send();
}

// Build all subchapter keywords for a subject to detect non-unit sets
function _getAllUnitKws(sub){
  const sylKey=SYL_MAP[sub]; const subSyl=SYL[sylKey]; if(!subSyl) return [];
  const all=[];
  [11,12].forEach(c=>{ (subSyl[c]||[]).forEach(u=>{ u.s.forEach(s=>{ s.toLowerCase().split(/[\s\-_&]+/).filter(w=>w.length>3).forEach(w=>all.push(w)); }); }); });
  return [...new Set(all)];
}

function renderSets(data, unit=null){
  const list=document.getElementById('setsList'); list.innerHTML='';
  const sub=curSubject.toLowerCase();

  const banner=document.createElement('div'); banner.className='list-banner';
  const bannerTitle=unit==='mixed'?'Mixed Practice':(unit?unit.u:(data.chapter_name||SUB_LABELS[sub]));
  const bannerSub=unit==='mixed'?'General & revision sets':(unit?unit.s.slice(0,2).join(', ')+(unit.s.length>2?'…':''):(data.quiz_sets?data.quiz_sets.length+' practice sets':''));
  banner.innerHTML=`<div class="list-banner-icon">${unit==='mixed'?'🔀':(SUB_ICONS[sub]||'📚')}</div><div class="list-banner-text"><h3>${bannerTitle}</h3><p>${bannerSub}</p></div>`;
  list.appendChild(banner);

  if(!data.quiz_sets?.length){ list.innerHTML+=`<div class="loading-text">No sets found.</div>`; return; }

  let sets=data.quiz_sets;

  if(unit==='mixed'){
    // Mixed: sets that DO NOT match any unit keyword
    const allKws=_getAllUnitKws(sub);
    const matched=sets.filter(s=>{
      const hay=((s.set_name||'')+(s.set_description||'')).toLowerCase();
      return allKws.some(k=>hay.includes(k));
    });
    const mixed=sets.filter(s=>!matched.includes(s));
    sets = mixed.length ? mixed : sets; // fallback to all if nothing qualifies
  } else if(unit){
    // Unit filter: use full subchapter name words (length > 3)
    const kws=unit.s.map(s=>s.toLowerCase().split(/[\s\-_&]+/).filter(w=>w.length>3)).flat();
    const filtered=sets.filter(s=>{
      const hay=((s.set_name||'')+(s.set_description||'')).toLowerCase();
      return kws.some(k=>hay.includes(k));
    });
    if(filtered.length) sets=filtered;
  }

  sets.forEach(set=>{
    const idx=data.quiz_sets.indexOf(set);
    const qCount=set.questions?.length||0;
    const recKey=`_nc_${sub}_${idx}`;
    const rec=JSON.parse(localStorage.getItem(recKey)||'null');
    const acc=rec?.accuracy||0, correct=rec?.correct||0, total=rec?.total||qCount;
    const isAttempted=!!(rec?.completed);
    let tCls='', tLbl='New', tbCls='';
    if(isAttempted){
      if(acc>=80){tCls='tier-green';tLbl='Excellent';tbCls='tier-badge-g';}
      else if(acc>=60){tCls='tier-purple';tLbl='Good';tbCls='tier-badge-p';}
      else if(acc>=40){tCls='tier-yellow';tLbl='Fair';tbCls='tier-badge-y';}
      else if(acc>=20){tCls='tier-orange';tLbl='Poor';tbCls='tier-badge-o';}
      else{tCls='tier-red';tLbl='Retry';tbCls='tier-badge-r';}
    }
    const card=document.createElement('div'); card.className=`set-card ${tCls}`;
    card.innerHTML=`
      <div class="set-card-accent"></div>
      <div class="set-card-top">
        <div class="set-card-info">
          <div class="set-badges">
            <span class="set-badge">Set ${idx+1}</span>
            <span class="set-badge">${qCount} Qs</span>
            ${isAttempted?`<span class="set-badge ${tbCls}">${tLbl}</span>`:''}
          </div>
          <div class="set-title">${set.set_name||'Practice Set'}</div>
          <div class="set-desc">${set.set_description||'NEET practice questions.'}</div>
        </div>
        <div class="set-chart" style="--p:${acc}">
          <div class="set-chart-val">${isAttempted?acc+'%':qCount}</div>
        </div>
      </div>
      <div class="set-progress-wrap">
        <div class="set-progress-meta">
          <span class="set-progress-score">${isAttempted?`${correct}/${total} (${acc}%)`: 'Not attempted'}</span>
          <span class="set-progress-cta">${isAttempted?'Tap for options':'Start →'}</span>
        </div>
        <div class="set-progress-track"><div class="set-progress-fill" style="width:${acc}%"></div></div>
      </div>
      ${isAttempted?`<div class="analytics-bar">
        <div class="anl-btn view" data-viewidx="${idx}">📊 View Analytics</div>
        <div class="anl-btn" data-retryidx="${idx}">🔄 Test Again</div>
      </div>`:''}
    `;
    if(isAttempted){
      card.querySelector('.set-card-top').onclick=()=>showAnalytics(idx);
      const vBtn=card.querySelector('[data-viewidx]'); if(vBtn) vBtn.onclick=e=>{ e.stopPropagation(); showAnalytics(idx); };
      const rBtn=card.querySelector('[data-retryidx]'); if(rBtn) rBtn.onclick=e=>{ e.stopPropagation(); startSetGame(data.quiz_sets[idx],idx); };
    } else {
      card.onclick=()=>startSetGame(data.quiz_sets[idx],idx);
    }
    list.appendChild(card);
  });
}

/* ══════════ ANALYTICS VIEW ══════════ */
function showAnalytics(idx){
  const sub=curSubject.toLowerCase();
  const rec=JSON.parse(localStorage.getItem(`_nc_${sub}_${idx}`)||'null'); if(!rec) return;
  _userResponses=JSON.parse(localStorage.getItem(`_nr_${sub}_${idx}`)||'[]');
  _gameQs=JSON.parse(localStorage.getItem(`_nq_${sub}_${idx}`)||'[]');
  _activeSetIdx=idx; _activeSub=sub;
  _correct=rec.correct||0; _wrong=rec.wrong||0; _skipped=rec.skipped||0; _totalQ=rec.total||0;
  _buildResult(rec);
  showScreen('resultScreen');
}

/* ══════════ GAME STATE ══════════ */
let _gameQs=[], _qIdx=0, _correct=0, _wrong=0, _skipped=0, _answered=false;
let _userResponses=[], _tmr=null;
let _qStart=0, _sessionStart=0, _activeSetIdx=-1, _activeSub='', _totalQ=0;

function _resetGame(){ clearInterval(_tmr); _gameQs=[]; _qIdx=0; _correct=0; _wrong=0; _skipped=0; _answered=false; _userResponses=[]; _tmr=null; _activeSetIdx=-1; _activeSub=''; _totalQ=0; }

function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }

const DIFF_SEC={ easy:20, medium:12, hard:7 };

function startSetGame(set, idx){
  _activeSub=curSubject.toLowerCase(); _activeSetIdx=idx;
  _userResponses=[]; _sessionStart=Date.now();
  _gameQs=shuffle(set.questions.slice(0, 10).map(q=>({ cat:_activeSub, q:q.question, opts:q.options, ans:q.answer, fact:q.explanation||'' })));
  _totalQ=_gameQs.length; 
  _qIdx=0; _correct=0; _wrong=0; _skipped=0;
  buildPills();
  document.getElementById('solverTitle').textContent=CAT_LABELS[_activeSub]||_activeSub;
  document.getElementById('solverSub').textContent=set.set_name||`Set ${idx+1}`;
  showScreen('gameScreen'); playSeq(SFX.go); loadQ();
}

/* ══════════ QUESTION PILLS ══════════ */
function buildPills(){
  const row=document.getElementById('qPillsRow'); row.innerHTML='';
  for(let i=0;i<_totalQ;i++){
    const p=document.createElement('div'); p.className='q-pill'+(i===0?' active':''); p.textContent=i+1; p.dataset.qi=i;
    p.onclick=()=>{ if(_answered||i===_qIdx){ _qIdx=i; loadQ(); } };
    row.appendChild(p);
  }
}

function updatePill(idx, cls){
  document.querySelectorAll('.q-pill').forEach(p=>{ p.classList.remove('active'); if(parseInt(p.dataset.qi)===idx&&cls) { p.classList.remove('p-correct','p-wrong','p-skip'); p.classList.add(cls); } });
  const cur=document.querySelector(`.q-pill[data-qi="${_qIdx}"]`);
  if(cur){ cur.classList.add('active'); cur.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}); }
}

/* ══════════ LOAD QUESTION ══════════ */
function loadQ(){
  clearInterval(_tmr); _answered=false;
  const q=_gameQs[_qIdx];
  document.getElementById('qNumLbl').textContent=`Q ${_qIdx+1} / ${_totalQ}`;
  document.getElementById('qCatBadge').textContent=CAT_LABELS[q.cat]||q.cat;
  document.getElementById('qText').textContent=q.q;
  document.getElementById('solverProgress').style.width=`${(_qIdx/_totalQ)*100}%`;
  const ec=document.getElementById('expCard'); ec.className='exp-card';
  document.getElementById('btnPrev').disabled=_qIdx===0;
  document.getElementById('btnNext').textContent=_qIdx===_totalQ-1?'Finish 🏁':'Next →';
  document.getElementById('btnSkip').style.display='';
  updateBmBtn();

  // Build options
  const grid=document.getElementById('optionsGrid'); grid.innerHTML='';
  const LETTERS=['A','B','C','D'];
  const idxs=shuffle([0,1,2,3]);
  idxs.forEach((oi,di)=>{
    const c=document.createElement('div'); c.className='opt-card'; c.dataset.oi=oi; c.dataset.ic=(oi===q.ans);
    c.innerHTML=`<div class="opt-letter">${LETTERS[di]}</div><div class="opt-text">${q.opts[oi]}</div>`;
    c.onclick=()=>handleAnswer(c,oi===q.ans,q);
    grid.appendChild(c);
  });

  // Restore prior answer
  const prev=_userResponses.find(r=>r.qi===_qIdx);
  if(prev){ _answered=true; showPriorAnswer(prev,q); }

  // Stopwatch Timer
  const el = document.getElementById('solverTimer');
  if(!prev){
    _qStart = Date.now();
    el.textContent = '00:00';
    _tmr=setInterval(()=>{
      const dur = Math.floor((Date.now()-_qStart)/1000);
      const m = String(Math.floor(dur/60)).padStart(2,'0');
      const s = String(dur%60).padStart(2,'0');
      el.textContent = m+':'+s;
    },1000);
  } else {
    const dur = prev.dur || 0;
    const m = String(Math.floor(dur/60)).padStart(2,'0');
    const s = String(dur%60).padStart(2,'0');
    el.textContent = m+':'+s;
  }
}

function showPriorAnswer(resp, q){
  document.querySelectorAll('.opt-card').forEach(c=>{
    const oi=parseInt(c.dataset.oi);
    if(oi===q.ans) c.classList.add('correct');
    else if(oi===resp.picked&&!resp.ic) c.classList.add('wrong');
  });
  if(!resp.skipped) showExp(q,resp.ic);
  document.getElementById('btnSkip').style.display='none';
}


  const r=t/max;
  if(r<=.25) el.classList.add('danger');
  else if(r<=.5) el.classList.add('warn');
}

function handleAnswer(card, isCorrect, q){
  if(_answered) return; _answered=true; clearInterval(_tmr);
  const oi=parseInt(card.dataset.oi);
  const dur=Math.round((Date.now()-_qStart)/1000);
  _userResponses=_userResponses.filter(r=>r.qi!==_qIdx);
  _userResponses.push({qi:_qIdx,picked:oi,ic:isCorrect,dur,skipped:false});
  if(isCorrect){
    SFX.ok(); card.classList.add('correct'); _correct++;

    updatePill(_qIdx,'p-correct');
  } else {
    SFX.err(); card.classList.add('wrong'); _wrong++;
    document.querySelectorAll('.opt-card').forEach(c=>{ if(c.dataset.ic==='true') c.classList.add('reveal'); });
    updatePill(_qIdx,'p-wrong');
  }
  showExp(q,isCorrect);
  document.getElementById('btnSkip').style.display='none';
}


function skipQ(){
  if(_answered) return; _answered=true; clearInterval(_tmr); _skipped++;
  _userResponses=_userResponses.filter(r=>r.qi!==_qIdx);
  _userResponses.push({qi:_qIdx,picked:-1,ic:false,dur:Math.round((Date.now()-_qStart)/1000),skipped:true});
  SFX.tick(); updatePill(_qIdx,'p-skip');
  document.getElementById('btnSkip').style.display='none';
  setTimeout(()=>nextQ(),350);
}

function prevQ(){ if(_qIdx>0){ _qIdx--; loadQ(); } }
function nextQ(){ if(_qIdx<_gameQs.length-1){ _qIdx++; loadQ(); } else endGame(); }

function showExp(q,isC){
  const ec=document.getElementById('expCard'),el=document.getElementById('expLabel'),et=document.getElementById('expText');
  ec.className='exp-card show '+(isC?'exp-c':'exp-w');
  el.textContent=isC?'✔ Correct!':'✘ Incorrect';
  et.innerHTML=(isC?'':`<strong>Correct: ${q.opts[q.ans]}</strong><br>`)+((q.fact||'Standard NEET concept.'));
}

function exitGame(){
  clearInterval(_tmr);
  if(confirm('Exit test? Your answered questions are saved locally.')) showStart();
}

/* ══════════ END GAME ══════════ */
function endGame(){
  clearInterval(_tmr); playSeq(SFX.done,110);
  const timeTaken=Math.round((Date.now()-_sessionStart)/1000);
  const acc=Math.round((_correct/_totalQ)*100);
  const neet=(_correct*4)-(_wrong*1);
  const avgSpeed=(timeTaken/_totalQ).toFixed(1);
  if(_activeSetIdx>=0){
    const rec={completed:true,accuracy:acc,correct:_correct,wrong:_wrong,skipped:_skipped,total:_totalQ,timeTaken,neet};
    localStorage.setItem(`_nc_${_activeSub}_${_activeSetIdx}`,JSON.stringify(rec)); _push({updates: [{key: `_nc_${_activeSub}_${_activeSetIdx}`, value: JSON.stringify(rec)}]});
    localStorage.setItem(`_nr_${_activeSub}_${_activeSetIdx}`,JSON.stringify(_userResponses));
    localStorage.setItem(`_nq_${_activeSub}_${_activeSetIdx}`,JSON.stringify(_gameQs));
    // Silent cloud sync
    _userResponses.forEach(r=>{
      const q=_gameQs[r.qi]; if(!q) return;
      _push({type:'question',subject:_activeSub,setIndex:_activeSetIdx,qText:q.q,status:r.ic?'correct':(r.skipped?'skipped':'wrong'),userAnswer:r.picked>=0?q.opts[r.picked]:'Not Answered',correctAnswer:q.opts[q.ans],duration:r.dur});
    });
    _push({type:'summary',subject:_activeSub,setIndex:_activeSetIdx,accuracy:acc,correct:_correct,wrong:_wrong,skipped:_skipped,total:_totalQ,timeTaken});
  }
  _buildResult({acc,neet,avgSpeed,timeTaken});
  if(acc>=80) spawnConfetti();
  showScreen('resultScreen');
}

/* ══════════ BUILD RESULT ══════════ */
function _buildResult(summary){
  const {acc,neet,avgSpeed,timeTaken} = summary;
  let grade,gc,fb;
  if(acc>=95){grade='S';gc='#fbbf24';fb='Legendary! NEET-ready!';}
  else if(acc>=80){grade='A';gc='var(--green)';fb='Excellent! Strong performance.';}
  else if(acc>=65){grade='B';gc='var(--primary)';fb='Good work! Keep polishing.';}
  else if(acc>=50){grade='C';gc='var(--yellow)';fb='Fair attempt. Practice more!';}
  else if(acc>=30){grade='D';gc='#f97316';fb='Keep going! Review concepts.';}
  else{grade='F';gc='var(--red)';fb="Don't give up! Review basics.";}

  const sub=CAT_LABELS[_activeSub]||_activeSub;
  document.getElementById('resSubBadge').textContent=sub;
  const grEl=document.getElementById('resGrade'); grEl.textContent=grade; grEl.style.color=gc;
  document.getElementById('resScore').textContent=`${_correct}/${_totalQ}`;
  const pill=document.getElementById('resAccPill'); pill.textContent=`${acc}% Accuracy`;
  pill.style.cssText=`background:${gc}22;color:${gc};border:1px solid ${gc}44;padding:6px 18px;border-radius:999px;font-size:.88rem;font-weight:900;`;
  document.getElementById('resFeedback').textContent=fb;
  const ring=document.getElementById('resRingFill'); ring.style.stroke=gc; ring.style.strokeDasharray='0 440';
  setTimeout(()=>{ ring.style.transition='stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)'; ring.style.strokeDasharray=`${(acc/100)*427.3} 427.3`; },150);
  document.getElementById('statNeet').textContent=neet>0?'+'+neet:neet;
  document.getElementById('statSpeed').textContent=avgSpeed+'s';
  document.getElementById('statCorrect').textContent=_correct;
  document.getElementById('statWrong').textContent=_wrong;

  // Donut
  const C=301.6, dC=(_correct/_totalQ)*C, dW=(_wrong/_totalQ)*C, dS=C-dC-dW;
  document.getElementById('donutPct').textContent=acc+'%';
  document.getElementById('legC').textContent=_correct;
  document.getElementById('legW').textContent=_wrong;
  document.getElementById('legS').textContent=_skipped;
  setTimeout(()=>{
    const dc=document.getElementById('dnutC'),dw=document.getElementById('dnutW'),ds=document.getElementById('dnutS');
    if(dc){ dc.style.strokeDasharray=`${dC} ${C}`; }
    setTimeout(()=>{ if(dw){ dw.style.strokeDasharray=`${dW} ${C}`; dw.style.strokeDashoffset=-dC; } },200);
    setTimeout(()=>{ if(ds){ ds.style.strokeDasharray=`${dS} ${C}`; ds.style.strokeDashoffset=-(dC+dW); } },400);
  },300);

  // Heatmap
  document.getElementById('hmapCount').textContent=`${_totalQ} Qs`;
  const hg=document.getElementById('hmapGrid'); hg.innerHTML='';
  _userResponses.forEach((r,i)=>{
    const cell=document.createElement('div'); cell.textContent=i+1;
    cell.className='hmap-cell '+(r.ic?'c':(r.skipped?'s':(r.picked===-1?'t':'w')));
    hg.appendChild(cell);
  });

  // Time bars
  const tb=document.getElementById('timeBars'); tb.innerHTML='';
  document.getElementById('txMid').textContent=`Q${Math.ceil(_userResponses.length/2)}`;
  document.getElementById('txEnd').textContent=`Q${_userResponses.length}`;
  _userResponses.forEach((r,i)=>{
    const bar=document.createElement('div');
    const pct=Math.min(100,Math.max(4,(r.dur/_timePerQ)*100));
    bar.className='tbar '+(r.skipped||r.picked===-1?'tbar-k':r.dur<=_timePerQ*.4?'tbar-f':r.dur<=_timePerQ*.75?'tbar-m':'tbar-s');
    bar.style.height='0%'; setTimeout(()=>{ bar.style.height=pct+'%'; bar.style.transition='height .6s'; },350+i*25);
    tb.appendChild(bar);
  });

  // Smart insight
  let ins='';
  if(acc>=95) ins=`<strong>Outstanding!</strong> You dominated <strong>${sub}</strong> with ${acc}% accuracy. Continue maintaining this consistency.`;
  else if(acc>=80) ins=`<strong>Excellent!</strong> Strong command over <strong>${sub}</strong>. Review the ${_wrong} missed question${_wrong!==1?'s':''} carefully.`;
  else if(acc>=65) ins=`<strong>Good work!</strong> You're on track. Focus on the ${_wrong} wrong answers — read each explanation and revisit NCERT.`;
  else if(acc>=50) ins=`<strong>Keep going!</strong> Half-way there. Make sure to read every explanation for your wrong answers and reattempt the set.`;
  else ins=`<strong>Don't give up!</strong> Revisit your <strong>${sub}</strong> textbook chapters, then attempt this set again.`;
  document.getElementById('smartCard').innerHTML=ins;

  // Badges
  ['bdg-perfect','bdg-speed','bdg-consistent','bdg-first','bdg-noskip'].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('unlocked'); });
  const unlk=(id,d)=>{ const el=document.getElementById(id); if(el) setTimeout(()=>el.classList.add('unlocked'),d); };
  if(acc===100) unlk('bdg-perfect',600);
  if(parseFloat(avgSpeed)<7&&acc>80) unlk('bdg-speed',800);
  if(_correct>=_totalQ*.8) unlk('bdg-consistent',1000);
  if(acc>=60) unlk('bdg-first',1200);
  if(_skipped===0&&_totalQ>0) unlk('bdg-noskip',1400);

  // Review
  buildReview('all');
  document.getElementById('reviewCount').textContent=`${_userResponses.length} items`;
  document.querySelectorAll('.review-tab').forEach(t=>t.classList.remove('active'));
  document.querySelector('.review-tab')?.classList.add('active');
  setTimeout(()=>{ document.getElementById('resultScreen').scrollTop=0; },100);
}

function filterReview(f,btn){
  document.querySelectorAll('.review-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  buildReview(f);
}

function buildReview(f){
  const list=document.getElementById('revList'); list.innerHTML='';
  let rs=_userResponses;
  if(f==='correct') rs=rs.filter(r=>r.ic);
  else if(f==='wrong') rs=rs.filter(r=>!r.ic&&!r.skipped&&r.picked!==-1);
  else if(f==='skipped') rs=rs.filter(r=>r.skipped||(r.picked===-1&&!r.ic));
  if(!rs.length){ list.innerHTML=`<div class="loading-text">No ${f} answers.</div>`; return; }
  rs.forEach(r=>{
    const q=_gameQs[r.qi]; if(!q) return;
    const isS=r.skipped||(r.picked===-1&&!r.ic);
    const cc=r.ic?'c':isS?'s':'w'; const ct=r.ic?'✔ Correct':isS?'⏭ Skipped':'✘ Wrong';
    const card=document.createElement('div'); card.className='rev-card';
    card.innerHTML=`
      <div class="rev-card-header"><span class="rev-qnum">Q${r.qi+1} · ${r.dur}s</span><span class="rev-chip ${cc}">${ct}</span></div>
      <div class="rev-q-text">${q.q}</div>
      <div class="rev-ans-block">
        <div class="rev-ans-row cr">✔ ${q.opts[q.ans]}</div>
        ${(!r.ic&&!isS&&r.picked>=0)?`<div class="rev-ans-row wr">✘ ${q.opts[r.picked]}</div>`:''}
      </div>
      <div class="rev-exp"><strong>Concept:</strong> ${q.fact||'Standard NEET concept.'}</div>
    `;
    list.appendChild(card);
  });
}

function retryQuiz(){
  if(_activeSetIdx>=0&&curSubjectData?.quiz_sets?.[_activeSetIdx]) startSetGame(curSubjectData.quiz_sets[_activeSetIdx],_activeSetIdx);
  else showStart();
}
function goBackToSets(){ if(curSubjectData) showScreen('setsScreen'); else showStart(); }


/* ══════════ BOOKMARKS ══════════ */
function getBM(){ return JSON.parse(localStorage.getItem('_bm')||'[]'); }
function saveBM(bms){ localStorage.setItem('_bm',JSON.stringify(bms)); }
function toggleBookmark(){
  if(!_gameQs[_qIdx]) return;
  const q=_gameQs[_qIdx]; let bms=getBM();
  const i=bms.findIndex(b=>b.q===q.q);
  if(i>-1){ bms.splice(i,1); _push({type:'bookmark',action:'remove',qText:q.q,subject:q.cat,correctAnswer:q.opts[q.ans]}); }
  else{ bms.push(q); _push({type:'bookmark',action:'add',qText:q.q,subject:q.cat,correctAnswer:q.opts[q.ans]}); }
  saveBM(bms); updateBmBtn();
}
function updateBmBtn(){
  const btn=document.getElementById('bmBtn'); if(!btn||!_gameQs[_qIdx]) return;
  const isB=getBM().some(b=>b.q===_gameQs[_qIdx].q); btn.classList.toggle('on',isB); btn.textContent=isB?'★':'☆';
}
function showBookmarks(){ renderBmSubjects(); showScreen('bookmarksScreen'); }
function renderBmSubjects(){
  const list=document.getElementById('bookmarksList'); const bms=getBM();
  const subs=[{id:'botany',name:'Botany',ic:'🌿'},{id:'zoology',name:'Zoology',ic:'🧬'},{id:'physics',name:'Physics',ic:'⚛️'},{id:'chemistry',name:'Chemistry',ic:'🧪'},{id:'physics_numericals',name:'Phys Nums',ic:'📐'},{id:'chemistry_numericals',name:'Chem Nums',ic:'⚗️'}];
  list.innerHTML='<div class="list-banner"><div class="list-banner-icon">⭐</div><div class="list-banner-text"><h3>Starred Questions</h3><p>Select a subject</p></div></div>';
  const g=document.createElement('div'); g.className='subject-grid';
  subs.forEach(s=>{
    const cnt=bms.filter(q=>q.cat===s.id).length;
    const c=document.createElement('div'); c.className='subject-card'; c.setAttribute('data-sub',s.id);
    c.onclick=()=>showBmSets(s.id,s.name);
    c.innerHTML=`<div class="sc-icon-wrap">${s.ic}</div><div class="sc-name">${s.name}</div><div class="sc-count">${cnt} saved</div>`;
    g.appendChild(c);
  });
  list.appendChild(g);
}
function showBmSets(sub,name){
  _activeSub=sub;
  const bms=getBM().filter(q=>q.cat===sub);
  const list=document.getElementById('bmSetsList');
  document.getElementById('bmSetsTitle').textContent=name+' Starred';
  list.innerHTML='';
  if(!bms.length){ list.innerHTML=`<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">No starred questions yet</div></div>`; showScreen('bookmarkSetsScreen'); return; }
  for(let i=0;i<bms.length;i+=10){
    const chunk=bms.slice(i,i+10); const si=Math.floor(i/10);
    const card=document.createElement('div'); card.className='set-card';
    card.innerHTML=`<div class="set-card-accent"></div><div class="set-card-top"><div class="set-card-info"><div class="set-badges"><span class="set-badge">Set ${si+1}</span><span class="set-badge">${chunk.length} Qs</span></div><div class="set-title">${name} Starred</div><div class="set-desc">Your saved questions</div></div></div>`;
    card.onclick=()=>reviewBmSet(sub,si);
    list.appendChild(card);
  }
  showScreen('bookmarkSetsScreen');
}
function startBmGame(sub,si){
  const bms=getBM().filter(q=>q.cat===sub); const chunk=bms.slice(si*10,(si+1)*10);
  _gameQs=chunk; _totalQ=chunk.length; _activeSub=sub; _activeSetIdx='bm_'+si;
  _qIdx=0;_correct=0;_wrong=0;_skipped=0;_extraTime=0;_userResponses=[];_sessionStart=Date.now();
  buildPills();
  document.getElementById('solverTitle').textContent=CAT_LABELS[sub]+' Bookmarks';
  document.getElementById('solverSub').textContent=`Set ${si+1}`;
  showScreen('gameScreen'); playSeq(SFX.go); loadQ();
}

/* ══════════ REVISION NOTES ══════════ */
function showRevisionNotes(){ renderRevSubs(); showScreen('revisionScreen'); }
function renderRevSubs(){
  const list=document.getElementById('revisionList'); list.innerHTML=`<div class="list-banner"><div class="list-banner-icon">⚡</div><div class="list-banner-text"><h3>Quick Revision Notes</h3><p>Chapter-wise NCERT summaries</p></div></div>`;
  const subs=[{id:'botany',n:'Botany',i:'🌿',c:'rgba(5,150,105,.12)'},{id:'zoology',n:'Zoology',i:'🧬',c:'rgba(124,58,237,.12)'},{id:'physics',n:'Physics',i:'⚛️',c:'rgba(59,130,246,.12)'},{id:'chemistry',n:'Chemistry',i:'🧪',c:'rgba(219,39,119,.12)'}];
  subs.forEach(s=>{
    const c=document.createElement('div'); c.className='colorful-list-card';
    c.innerHTML=`<div class="colorful-card-icon-row"><div class="colorful-card-icon" style="background:${s.c}">${s.i}</div></div><div class="colorful-card-title">${s.n} Notes</div><div class="colorful-card-desc">NCERT chapter-wise summaries</div>`;
    c.onclick=()=>showNotesList(s.id,s.n);
    list.appendChild(c);
  });
}
function showNotesList(sid,sname,push=true){
  sessionStorage.setItem('_cns',sid); sessionStorage.setItem('_cnn',sname);
  showScreen('notesListScreen',push);
  document.getElementById('notesListTitle').textContent=sname+' Notes';
  const list=document.getElementById('notesListContainer');
  const FILES={
    botany:["Anatomy_of_Flowering_Plants.html","Biodiversity_and_Conservation.html","Biological_Classification.html","Biomolecules.html","Cell_Cycle_and_Cell_Division.html","Cell_The_Unit_of_Life.html","Ecosystem.html","Microbes_in_Human_Welfare.html","Molecular_Basis_of_Inheritance.html","Morphology_of_Flowering_Plants.html","Organisms_and_Populations.html","Photosynthesis_in_Higher_Plants.html","Plant_Growth_and_Development.html","Plant_Kingdom.html","Principles_of_Inheritance_and_Variation.html","Respiration_in_Plants.html","Sexual_Reproduction_in_Flowering_Plants.html","The_Living_World.html"],
    zoology:["Animal_Kingdom.html","Biotechnology_Principles_and_Processes.html","Biotechnology_and_its_Applications.html","Body_Fluids_and_Circulation.html","Breathing_and_Exchange_of_Gases.html","Chemical_Coordination_and_Integration.html","Evolution.html","Excretory_Products_and_their_Elimination.html","Human_Health_and_Disease.html","Human_Reproduction.html","Locomotion_and_Movement.html","Neural_Control_and_Coordination.html","Reproductive_Health.html","Structural_Organisation_in_Animals.html"],
    chemistry:["Alcohols_Phenols_and_Ethers.html","Aldehydes_Ketones_and_Carboxylic_Acids.html","Amines.html","Biomolecules.html","Chemical_Bonding_and_Molecular_Structure.html","Chemical_Kinetics.html","Classification_of_Elements_and_Periodicity.html","Coordination_Compounds.html","Electrochemistry.html","Equilibrium.html","Haloalkanes_and_Haloarenes.html","Hydrocarbons.html","Organic_Chemistry_Some_Basic_Principles_and_Techniques.html","Redox_Reactions.html","Solutions.html","Some_Basic_Concepts_of_Chemistry.html","Structure_of_Atom.html","Thermodynamics.html","d_and_f_Block_Elements.html"],
    physics:["Alternating_Current.html","Atoms.html","Current_Electricity.html","Dual_Nature_of_Radiation_and_Matter.html","Electric_Charges_and_Fields.html","Electromagnetic_Induction.html","Electromagnetic_Waves.html","Electrostatic_Potential_and_Capacitance.html","Gravitation.html","Kinetic_Theory.html","Laws_of_Motion.html","Magnetism_and_Matter.html","Mechanical_Properties_of_Fluids.html","Mechanical_Properties_of_Solids.html","Motion_in_a_Plane.html","Motion_in_a_Straight_Line.html","Moving_Charges_and_Magnetism.html","Nuclei.html","Oscillations.html","Ray_Optics.html","Semiconductors.html","System_of_Particles_and_Rotational_Motion.html","Thermal_Properties_of_Matter.html","Thermodynamics.html","Units_and_Measurements.html","Wave_Optics.html","Waves.html","Work_Energy_and_Power.html"]
  };
  const files=FILES[sid]||[];
  list.innerHTML=`<div class="list-banner"><div class="list-banner-icon">${{botany:'🌿',zoology:'🧬',physics:'⚛️',chemistry:'🧪'}[sid]||'📝'}</div><div class="list-banner-text"><h3>${sname} Notes</h3><p>${files.length} chapters</p></div></div>`;
  files.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})).forEach(f=>{
    const t=f.replace('.html','').replace(/_/g,' ');
    const c=document.createElement('div'); c.className='colorful-list-card';
    c.innerHTML=`<div class="colorful-card-title" style="text-transform:capitalize">${t}</div><div class="colorful-card-desc">NCERT chapter summary · key points</div>`;
    c.onclick=()=>window.location.href='notes/'+sid+'/'+f;
    list.appendChild(c);
  });
}

/* ══════════ MOCK TESTS ══════════ */
function showMockTests(){
  showScreen('mockTestListScreen');
  const list=document.getElementById('mockList');
  list.innerHTML=`<div class="list-banner"><div class="list-banner-icon">📊</div><div class="list-banner-text"><h3>Full NEET CBT Mock Tests</h3><p>3h 20m · 180 Questions · 720 Marks</p></div></div>`;
  ['mock_test_1.html','mock_test-2.html','mock_test_3_premium.html'].forEach((f,i)=>{
    const n=(f.match(/\d+/)||[i+1])[0];
    const c=document.createElement('div'); c.className='colorful-list-card';
    c.innerHTML=`<div class="colorful-card-title">NEET CBT Mock Test ${n}${f.includes('premium')?' · Premium':''}</div><div class="colorful-card-desc">180 Questions · Physics, Chemistry, Biology · 720 Marks · 200 Min</div>`;
    c.onclick=()=>{ localStorage.setItem('_th', document.body.dataset.theme||'dark'); window.location.href='mock_test/'+f; };
    list.appendChild(c);
  });
}

/* ══════════ PYQs ══════════ */
function showPYQs(){
  showScreen('pyqListScreen');
  const list=document.getElementById('pyqList');
  list.innerHTML=`<div class="list-banner"><div class="list-banner-icon">📜</div><div class="list-banner-text"><h3>Original NEET PYQ Papers</h3><p>Authentic past papers with solutions</p></div></div>`;
  ['neet_PYQs-1.html','NEET_PYQ-2.html','NEET_PYQ-3.html','NEET_PYQ-4.html','NEET_PYQ-5.html','NEET_PYQ-6.html'].forEach(f=>{
    const t=f.replace('.html','').replace(/_/g,' ').toUpperCase();
    const c=document.createElement('div'); c.className='colorful-list-card';
    c.innerHTML=`<div class="colorful-card-title">${t}</div><div class="colorful-card-desc">Official NTA NEET Paper · Complete Solutions · 720 Marks</div>`;
    c.onclick=()=>{ localStorage.setItem('_th', document.body.dataset.theme||'dark'); window.location.href='pyqs/'+f; };
    list.appendChild(c);
  });
}

/* ══════════ CONFETTI ══════════ */
function spawnConfetti(){
  const cols=['#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#f97316'];
  for(let i=0;i<32;i++) setTimeout(()=>{
    const p=document.createElement('div'); p.className='confetti-piece';
    p.style.cssText=`left:${Math.random()*100}%;top:-10px;background:${cols[Math.floor(Math.random()*cols.length)]};animation-duration:${1.2+Math.random()*1.8}s;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>.5?'50%':'2px'};transform:rotate(${Math.random()*360}deg);`;
    document.body.appendChild(p); setTimeout(()=>p.remove(),3200);
  },i*50);
}

function showFloat(txt,el){
  const r=el.getBoundingClientRect();
  const f=document.createElement('div'); f.className='float-score'; f.textContent=txt;
  f.style.cssText=`left:${r.left+r.width/2-28}px;top:${r.top}px;color:var(--green);`;
  document.body.appendChild(f); setTimeout(()=>f.remove(),900);
}

/* ══════════ BACK BUTTON ══════════ */
if(!history.state?.sid) history.replaceState({sid:'startScreen'},'');
else {
  const id=history.state.sid;
  if(id==='notesListScreen'){ const s=sessionStorage.getItem('_cns'),n=sessionStorage.getItem('_cnn'); if(s&&n) showNotesList(s,n,false); else showScreen('startScreen',false); }
  else showScreen(['gameScreen','resultScreen'].includes(id)?'startScreen':id,false);
}
window.onpopstate=e=>{ if(e.state?.sid){ const id=e.state.sid; clearInterval(_tmr); showScreen(['gameScreen','resultScreen'].includes(id)?'startScreen':id,false); } else showScreen('startScreen',false); };

/* ══════════ NOTES SCREEN ══════════ */
let _curNotesSub = 'botany';
let _selNoteSub = null;

function showNotesScreen(){
  showScreen('notesScreen');
  _curNotesSub = 'botany';
  switchNotesTab('botany');
}

function switchNotesTab(sub){
  _curNotesSub = sub;
  document.querySelectorAll('.notes-tab').forEach(t=>t.classList.remove('active'));
  const tab = document.getElementById('ntab-'+sub);
  if(tab) tab.classList.add('active');
  renderNotesList(sub);
}

function getNotes(){
  try{ return JSON.parse(localStorage.getItem('_notes_v2')||'[]'); }catch(e){ return []; }
}
function saveNotes(arr){
  localStorage.setItem('_notes_v2', JSON.stringify(arr));
}

function renderNotesList(sub){
  const el = document.getElementById('notesList');
  if(!el) return;
  const all = getNotes().filter(n=>n.sub===sub);
  if(!all.length){
    el.innerHTML = '<div style="text-align:center;padding:50px 20px;color:var(--text-muted);font-size:.88rem;">No notes yet.<br>Tap <b>+ Add Note</b> to write one.</div>';
    return;
  }
  // Group by chapter
  const byChap = {};
  all.forEach(n=>{ (byChap[n.chap]=byChap[n.chap]||[]).push(n); });
  let html = '';
  Object.keys(byChap).forEach(chap=>{
    html += `<div style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted);margin:10px 0 6px;">${chap}</div>`;
    byChap[chap].forEach((n,i)=>{
      html += `<div class="note-card">
        <div class="note-card-chap">${n.chap}</div>
        <div class="note-card-text">${n.text}</div>
        <div class="note-card-date">${n.date||''}</div>
        <button class="note-card-del" onclick="deleteNote('${n.id}')">🗑</button>
      </div>`;
    });
  });
  el.innerHTML = html;
}

function openAddNoteModal(){
  _selNoteSub = null;
  document.getElementById('noteTextInput').value = '';
  document.querySelectorAll('.note-sub-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('noteChapterPickWrap').style.display='none';
  const m = document.getElementById('addNoteModal');
  m.style.display = 'flex';
}
function closeAddNoteModal(){
  document.getElementById('addNoteModal').style.display = 'none';
}

function selectNoteSubject(sub){
  _selNoteSub = sub;
  document.querySelectorAll('.note-sub-btn').forEach(b=>b.classList.remove('active'));
  const btn = document.getElementById('nsb-'+sub);
  if(btn) btn.classList.add('active');
  // Populate chapter dropdown
  const sylKey = SYL_MAP[sub];
  const units = [...(SYL[sylKey][11]||[]), ...(SYL[sylKey][12]||[])];
  const sel = document.getElementById('noteChapterPick');
  sel.innerHTML = units.map((u,i)=>`<option value="${i}">${u.u}</option>`).join('');
  document.getElementById('noteChapterPickWrap').style.display = 'block';
}

function saveNewNote(){
  const text = (document.getElementById('noteTextInput').value||'').trim();
  if(!text){ alert('Please write something first!'); return; }
  if(!_selNoteSub){ alert('Please select a subject!'); return; }
  const sylKey = SYL_MAP[_selNoteSub];
  const units = [...(SYL[sylKey][11]||[]), ...(SYL[sylKey][12]||[])];
  const chapIdx = parseInt(document.getElementById('noteChapterPick').value)||0;
  const chap = units[chapIdx]?.u || 'General';
  const note = {
    id: '_n'+Date.now(),
    sub: _selNoteSub,
    chap,
    text,
    date: new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
  };
  const all = getNotes();
  all.unshift(note);
  saveNotes(all);
  // Push to Google Sheets
  _push({type:'note', sub:_selNoteSub, chapter:chap, text, date:note.date});
  closeAddNoteModal();
  if(_curNotesSub === _selNoteSub) renderNotesList(_selNoteSub);
  else switchNotesTab(_selNoteSub);
}

function deleteNote(id){
  if(!confirm('Delete this note?')) return;
  saveNotes(getNotes().filter(n=>n.id!==id));
  renderNotesList(_curNotesSub);
}

/* ══════════ QUICK ACCESS (Logo Click) ══════════ */
let _qaSub = 'botany';

function openQuickAccess(){
  const m = document.getElementById('quickAccessModal','analyticsScreen');
  if(!m) return;
  m.style.display = 'flex';
  _qaSub = 'botany';
  document.querySelectorAll('.qa-tab').forEach(t=>t.classList.remove('active'));
  const tab = document.querySelector('.qa-tab');
  if(tab) tab.classList.add('active');
  renderQAContent('botany');
}
function closeQuickAccess(){
  const m = document.getElementById('quickAccessModal','analyticsScreen');
  if(m) m.style.display = 'none';
}
function switchQATab(sub){
  _qaSub = sub;
  document.querySelectorAll('.qa-tab').forEach(t=>t.classList.remove('active'));
  const tab = document.querySelector(`.qa-tab[data-sub="${sub}"]`);
  if(tab) tab.classList.add('active');
  renderQAContent(sub);
}

function renderQAContent(sub){
  const wrap = document.getElementById('qaContent');
  if(!wrap) return;
  const filename = FILE_MAP[sub];
  wrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">Loading...</div>';
  fetch(filename).then(r=>r.json()).then(data=>{
    let html = '';
    let attempted = 0;
    data.quiz_sets.forEach((set,idx)=>{
      const rec = JSON.parse(localStorage.getItem(`_nc_${sub}_${idx}`)||'null');
      if(!rec || !rec.completed) return;
      attempted++;
      const acc = rec.accuracy||0;
      const acColor = acc>=80?'#10b981':acc>=60?'#3b82f6':acc>=40?'#f59e0b':'#ef4444';
      html += `<div class="qa-set-card" onclick="showAnalyticsForQA('${sub}',${idx})">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div class="qa-set-name">${set.set_name||'Set '+(idx+1)}</div>
          <div style="font-size:.8rem;font-weight:900;color:${acColor};">${acc}%</div>
        </div>
        <div class="qa-set-stats">
          <span class="qa-stat c">✅ ${rec.correct||0}</span>
          <span class="qa-stat w">❌ ${rec.wrong||0}</span>
          <span class="qa-stat s">⏭ ${rec.skipped||0}</span>
          <span class="qa-stat t">⏱ ${rec.timeTaken?Math.round(rec.timeTaken/60)+'m':'-'}</span>
        </div>
      </div>`;
    });
    if(!attempted) html = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-size:.88rem;">No sets attempted yet for '+SUB_LABELS[sub]+'.</div>';
    wrap.innerHTML = html;
  }).catch(()=>{
    wrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">Could not load data.</div>';
  });
}

function showAnalyticsForQA(sub, idx){
  closeQuickAccess();
  curSubject = sub;
  // Restore previous result
  const rec = JSON.parse(localStorage.getItem(`_nc_${sub}_${idx}`)||'null');
  const qs  = JSON.parse(localStorage.getItem(`_nq_${sub}_${idx}`)||'null');
  const rs  = JSON.parse(localStorage.getItem(`_nr_${sub}_${idx}`)||'null');
  if(!rec || !qs || !rs){ alert('No detailed data saved for this set.'); return; }
  _activeSub = sub;
  _activeSetIdx = idx;
  _gameQs = qs;
  _userResponses = rs;
  _totalQ = qs.length;
  _correct = rec.correct||0; _wrong = rec.wrong||0; _skipped = rec.skipped||0;
  _sessionStart = Date.now() - (rec.timeTaken||0)*1000;
  _buildResult({acc:rec.accuracy||0, neet:(_correct*4)-_wrong, avgSpeed:((rec.timeTaken||0)/(_totalQ||1)).toFixed(1), timeTaken:rec.timeTaken||0});
  showScreen('resultScreen');
}

/* ══════════ SET HISTORY MODAL ══════════ */
function checkSetHistory(set, idx, sub){
  const key = `_nc_${sub}_${idx}`;
  const rec = JSON.parse(localStorage.getItem(key)||'null');
  if(!rec || !rec.completed){
    startSetGame(set, idx);
    return;
  }
  // Show history popup
  const acc = rec.accuracy||0;
  const acColor = acc>=80?'#10b981':acc>=60?'#3b82f6':acc>=40?'#f59e0b':'#ef4444';
  const modal = document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML=`<div style="background:var(--bg-surface);border-radius:22px 22px 0 0;padding:24px 20px 40px;width:100%;max-width:560px;">
    <div style="font-weight:900;font-size:1rem;margin-bottom:4px;">📊 Previous Attempt</div>
    <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:16px;">${set.set_name||'Set '+(idx+1)}</div>
    <div style="display:flex;justify-content:space-around;background:var(--bg-surface-light);border-radius:14px;padding:14px;margin-bottom:18px;">
      <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:900;color:${acColor};">${acc}%</div><div style="font-size:.65rem;color:var(--text-muted);font-weight:700;margin-top:2px;">ACCURACY</div></div>
      <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:900;color:#10b981;">${rec.correct||0}</div><div style="font-size:.65rem;color:var(--text-muted);font-weight:700;margin-top:2px;">CORRECT</div></div>
      <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:900;color:#ef4444;">${rec.wrong||0}</div><div style="font-size:.65rem;color:var(--text-muted);font-weight:700;margin-top:2px;">WRONG</div></div>
      <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:900;color:#6366f1;">${rec.neet>0?'+':''+(rec.neet||0)}</div><div style="font-size:.65rem;color:var(--text-muted);font-weight:700;margin-top:2px;">NEET PTS</div></div>
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="this.closest('div[style*=fixed]').remove()" style="flex:1;height:46px;border-radius:12px;border:1.5px solid var(--border);background:transparent;color:var(--text-main);font-weight:700;cursor:pointer;font-family:inherit;">Cancel</button>
      <button onclick="this.closest('div[style*=fixed]').remove();showAnalyticsForQA('${sub}',${idx});" style="flex:1;height:46px;border-radius:12px;border:1.5px solid #3b82f6;background:transparent;color:#3b82f6;font-weight:700;cursor:pointer;font-family:inherit;">Review 📋</button>
      <button onclick="this.closest('div[style*=fixed]').remove();startSetGame(${JSON.stringify(set).replace(/</g,'\u003c')},${idx});" style="flex:1.4;height:46px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;font-weight:700;border:none;cursor:pointer;font-family:inherit;">Test Again 🔄</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

