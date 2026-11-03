'use strict';
const $=s=>document.querySelector(s),main=$('#main');
const state={user:null,catalog:[],history:[],active:null,game:null,feedback:null,authMode:'login',pendingStart:null,clock:null,boardType:'bubble',boardLevel:1,routeVersion:0,visualizer:null,visualSpeed:1,submitting:false};
const names={bubble:'Bubble Sort',stack:'Stack Challenge',queue:'Queue Rush'};
const desc={bubble:'จับคู่ เปรียบเทียบ และสลับตัวเลขให้ถูกลำดับ',stack:'ใครเข้าทีหลัง ออกก่อน ฝึกคิดให้เป็น Stack',queue:'จัดคิวให้ถูก แล้วค้นพบจังหวะของ FIFO'};
const symbol={bubble:'↔',stack:'▤',queue:'⇥'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>t.classList.remove('visible'),4000);}
async function api(path,data){const response=await fetch('/api/'+path,data?{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)}:{});const result=await response.json();if(!response.ok){if(response.status===401){state.user=null;renderAccount();}throw new Error(result.error||'เชื่อมต่อไม่สำเร็จ');}return result;}
function duration(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
function medal(score){return score>=900?'🥇':score>=700?'🥈':score>=500?'🥉':'✦';}
function renderAccount(){$('#account').innerHTML=state.user?`<div class="account-controls"><span class="user-name"><span class="avatar">${esc(state.user.username[0].toUpperCase())}</span>${esc(state.user.username)}</span><button class="btn small ghost" data-action="logout">ออกจากระบบ</button></div>`:`<div class="account-controls"><button class="btn ghost small" data-action="login">เข้าสู่ระบบ</button><button class="btn primary small" data-action="register">สมัครสมาชิก ↗</button></div>`;}
function intro(title,sub,tag='YOUR NEXT LEVEL STARTS HERE'){return `<div class="page-intro"><div><div class="eyebrow">${tag}</div><h1>${title}</h1><p>${sub}</p></div><span class="date-badge">◌ &nbsp; 3 สนาม · 15 ด่าน · พร้อมให้ท้าทาย</span></div>`;}
function art(type){return `<div class="card-art ${type}"><span class="card-no">0${['bubble','stack','queue'].indexOf(type)+1} / ARENA</span><span class="card-tag">${type==='bubble'?'SORTING':'DATA STRUCTURE'}</span>${type==='bubble'?'<i class="mini-bar">3</i><i class="mini-bar">8</i><i class="mini-bar">5</i><i class="mini-bar">9</i>':type==='stack'?'<span class="art-arrow">↓</span><span class="mini-stack"><i></i><i></i><i></i><i></i></span><span class="art-arrow">↑</span>':'<span class="mini-queue"><span>←</span><i>1</i><i>2</i><i>3</i></span>'}</div>`;}
function card(type){let done=new Set(state.history.filter(h=>h.type===type).map(h=>h.level)).size;return `<article class="arena-card">${art(type)}<div class="card-body"><div class="card-kicker">${type==='bubble'?'THINK IN STEPS':type==='stack'?'LAST IN, FIRST OUT':'FIRST IN, FIRST OUT'}</div><h3>${names[type]}</h3><p>${desc[type]}</p><div class="card-meta"><span class="chip">${type==='bubble'?'เปรียบเทียบและสลับ':type==='stack'?'LIFO':'FIFO'}</span><span>5 ด่าน</span><span>·</span><span>เล่นตามจังหวะคุณ</span></div><div class="card-bottom"><span>ผ่านแล้ว ${done}/5 ด่าน</span><button data-action="choose" data-type="${type}">เข้าสนาม ↗</button></div></div></article>`;}
function historyRows(rows,short=false){if(!rows.length)return `<div class="empty"><span class="empty-icon">◷</span>ยังไม่มีรอบที่เล่นจบ<p>เริ่มด่านแรก แล้วกลับมาดูพัฒนาการของคุณ</p><a class="btn small" href="#arena">เลือกสนาม ↗</a></div>`;return `<div class="table-wrap"><table><thead><tr><th>สนาม / ด่าน</th><th>คะแนน</th>${short?'':'<th>ตอบถูก</th><th>เวลา</th>'}<th>ผลการเล่น</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.title)} <span class="muted">/ ${r.level}</span>${short?'':`<br><small class="muted">${new Date(r.started).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}</small>`}</td><td class="table-score">${r.score.toLocaleString()} <small class="muted">/ 1,000</small></td>${short?'':`<td>${r.correct}/${r.total}</td><td>${duration(r.elapsed)}</td>`}<td><button class="btn small ghost" data-action="review" data-id="${esc(r.id)}">ดูผล ↗</button></td></tr>`).join('')}</tbody></table></div>`;}
function home(){const completed=new Set(state.history.map(r=>r.type+r.level)).size;const avg=state.history.length?Math.round(state.history.reduce((a,r)=>a+r.correct/r.total*100,0)/state.history.length):0;main.innerHTML=intro(state.user?`พร้อมลุยต่อไหม ${esc(state.user.username)}?`:'อัปสกิลคอม ให้สนุกกว่าที่เคย','ฝึกคิดทีละขั้น ผ่านเกมอัลกอริทึมที่คุณเป็นคนลงมือเล่น')+`<section class="hero"><div class="hero-copy"><div class="eyebrow">LESS SCROLLING. MORE SOLVING.</div><h2>PLAY. LEARN.<br><em>LEVEL UP.</em></h2><p>เปลี่ยนเรื่องอัลกอริทึมให้เป็นสนามฝึกสมอง<br>เริ่มจากก้าวเล็ก ๆ แล้วไปให้ไกลกว่าเดิม</p><div class="hero-actions"><a href="#arena" class="btn lime">เลือกสนามของคุณ <span>↗</span></a><a href="#guide" class="btn dark-outline">วิธีเล่น</a></div></div><div class="hero-art" aria-hidden="true"><span class="art-tag">while (curious) { play(); }</span><span class="art-spark">✳</span><div class="art-bars"><div class="art-bar">3</div><div class="art-bar">8</div><div class="art-bar">5</div><div class="art-bar">9</div><div class="art-bar">1</div></div><div class="art-code">compare → think → make your move</div></div></section>${state.active?`<div class="resume"><span>◷ &nbsp; คุณมีเกม ${esc(state.active.title)} ด่าน ${state.active.level} ที่เล่นค้างไว้</span><button class="btn primary small" data-action="resume">เล่นต่อ ↗</button></div>`:''}<div class="stats-grid"><div class="stat"><span class="stat-icon">⚑</span><div><span class="stat-label">ด่านที่เล่นจบ</span><strong>${completed}<small>/ 15 ด่าน</small></strong></div></div><div class="stat"><span class="stat-icon">◎</span><div><span class="stat-label">ความแม่นยำเฉลี่ย*</span><strong>${avg}<small>%</small></strong></div></div><div class="stat"><span class="stat-icon">↗</span><div><span class="stat-label">คะแนนสูงสุด</span><strong>${Math.max(0,...state.history.map(r=>r.score)).toLocaleString()}<small>/ 1,000</small></strong></div></div></div><div class="section-head"><div><h2>เลือกสนาม แล้วเริ่มสนุก</h2><p>สามแนวคิดพื้นฐาน ที่ฝึกแล้วนำไปใช้ต่อได้จริง</p></div><a href="#arena" class="text-link">ดูทั้งหมด ↗</a></div><div class="arena-grid">${['bubble','stack','queue'].map(card).join('')}</div><div class="lower-grid"><section class="panel"><div class="section-head"><h2>รอบล่าสุดของคุณ</h2><a class="text-link" href="#history">ดูประวัติ ↗</a></div>${historyRows(state.history.slice(0,3),true)}<small class="muted">*สถิติจากรอบที่เล่นจบล่าสุดไม่เกิน 50 รอบ</small></section><section class="panel"><div class="eyebrow">HOW IT WORKS</div><h2>เริ่มง่าย ๆ ใน 3 ขั้นตอน</h2><div class="step-list"><div class="guide-step"><span class="guide-number">01</span><div><h3>เลือกสนามที่อยากฝึก</h3><p>เริ่มจาก Sort, Stack หรือ Queue ได้เลย</p></div></div><div class="guide-step"><span class="guide-number">02</span><div><h3>คิด แล้วเลือกขั้นตอนถัดไป</h3><p>ไม่แน่ใจ? อ่านแนวคิดข้างสนามช่วยได้</p></div></div><div class="guide-step"><span class="guide-number">03</span><div><h3>เรียนรู้จากคำตอบ แล้วลองอีกครั้ง</h3><p>ทุกครั้งที่เล่น คืออีกก้าวของความเข้าใจ</p></div></div></div></section></div>`;}
function arena(){main.innerHTML=intro('เลือกสนามของคุณ','ทุกด่านเล่นซ้ำได้ คะแนนดีที่สุดของแต่ละคนจะเข้าสู่ตารางอันดับ','PICK YOUR CHALLENGE')+`<div class="notice">คะแนนเต็ม 1,000 ทุกด่าน · คิดจากสัดส่วนคำตอบถูก · คะแนนเท่ากันใช้เวลาน้อยกว่าได้อันดับดีกว่า</div>`+['bubble','stack','queue'].map(type=>`<section class="level-section" id="levels-${type}"><div class="level-top"><span class="level-icon">${symbol[type]}</span><div><h2>${names[type]}</h2><p>${desc[type]}</p></div></div><div class="levels">${state.catalog.filter(c=>c.type===type).map(c=>{const scores=state.history.filter(h=>h.type===type&&h.level===c.level).map(h=>h.score);return `<article class="level"><span class="level-num">LEVEL / 0${c.level}</span><h3>ด่าน ${c.level}</h3><p>${c.steps} ขั้นตอน · ${type==='bubble'?'เรียงลำดับตัวเลข':'เลือกตัวที่ออกถัดไป'}</p><div class="level-best">${scores.length?'✓ ดีที่สุด '+Math.max(...scores)+' คะแนน':'ยังไม่ได้ลองสนามนี้'}</div><button class="btn ${c.level===1?'primary':''}" data-action="start" data-type="${type}" data-level="${c.level}">เริ่มเล่น ↗</button></article>`;}).join('')}</div></section>`).join('');}
function toolbar(){return `<div class="toolbar"><label for="board-type">สนาม</label><select id="board-type">${Object.entries(names).map(([k,v])=>`<option value="${k}" ${state.boardType===k?'selected':''}>${v}</option>`).join('')}</select><label for="board-level">ด่าน</label><select id="board-level">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===state.boardLevel?'selected':''}>ด่าน ${n}</option>`).join('')}</select></div>`;}
async function leaderboard(){main.innerHTML=intro('สนามนี้ ใครเป็นตัวท็อป?','เปรียบเทียบเฉพาะสนามและด่านเดียวกัน ใช้ผลงานที่ดีที่สุดของแต่ละคน','THE LEADERBOARD')+toolbar()+'<section class="panel" id="board-table"><div class="loading">กำลังโหลดอันดับ…</div></section>';await updateBoard();}
async function updateBoard(){const type=state.boardType,level=state.boardLevel;try{const rows=await api(`leaderboard?type=${type}&level=${level}`);if(type!==state.boardType||level!==state.boardLevel||!$('#board-table'))return;$('#board-table').innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>อันดับ</th><th>ผู้เล่น</th><th>คะแนนดีที่สุด</th><th>เวลา</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="rank ${r.rank===1?'first':''}">${r.rank===1?'♜':String(r.rank).padStart(2,'0')}</span></td><td>${esc(r.username)}${state.user?.username===r.username?' <span class="chip">คุณ</span>':''}</td><td class="table-score">${r.score.toLocaleString()} / 1,000</td><td>${duration(r.elapsed)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><span class="empty-icon">♜</span>อันดับหนึ่งยังว่างอยู่<p>ยังไม่มีผู้เล่นจบด่านนี้ มาเป็นคนแรกกัน</p><button class="btn primary small" data-action="start" data-type="${type}" data-level="${level}">ลองสนามนี้ ↗</button></div>`;}catch(e){if($('#board-table'))$('#board-table').innerHTML=`<p class="error">${esc(e.message)}</p>`;}}
function history(){main.innerHTML=intro('ทุกครั้งที่ฝึก มีความหมาย','ดูผลและทบทวนคำตอบจากรอบที่เล่นจบล่าสุด 50 รอบ','YOUR PROGRESS')+(state.user?`<section class="panel">${historyRows(state.history)}</section>`:`<section class="panel"><div class="empty"><span class="empty-icon">◷</span>เก็บทุกก้าวของคุณไว้ในบัญชี<p>เข้าสู่ระบบเพื่อดูประวัติการเล่น</p><button class="btn primary" data-action="login">เข้าสู่ระบบ ↗</button></div></section>`);}
function guide(){main.innerHTML=intro('เข้าใจเกม ก่อนเข้าสนาม','ไม่มีการรันโค้ด คุณจะฝึกคิดผ่านภาพและตัวเลือกในแต่ละขั้นตอน','A QUICK FIELD GUIDE')+`<div class="guide-grid">${['bubble','stack','queue'].map(type=>`<section class="panel"><div class="eyebrow">${type.toUpperCase()}</div><h2>${names[type]}</h2><p>${esc(state.catalog.find(c=>c.type===type)?.concept||'')}</p><p>${type==='bubble'?'กล่องสีเขียวคือคู่ที่กำลังเปรียบเทียบ เลือกว่าจะสลับหรือไม่สลับ ทำครบทุกคู่เพื่อเรียงจากน้อยไปมาก':type==='stack'?'ดูแอนิเมชัน PUSH เพิ่มข้อมูลบนสุด ตำแหน่ง TOP คือยอดของ Stack จากนั้นเลือกตัวที่จะถูก POP ออก':'ดูแอนิเมชัน ENQUEUE เพิ่มข้อมูลที่ REAR ด้านขวา จากนั้นเลือกตัวที่จะถูก DEQUEUE ออกจาก FRONT ด้านซ้าย'}</p><button class="btn small" data-action="start" data-type="${type}" data-level="1">ลองด่านแรก ↗</button></section>`).join('')}</div><section class="panel level-section"><h2>ดูขั้นตอนให้เข้าใจ</h2><p>ภาพจะแสดงการเปรียบเทียบหรือเพิ่มข้อมูลก่อนตอบ หลังส่งคำตอบจะเห็นการสลับหรือการนำข้อมูลออกตามเฉลย กดดูภาพซ้ำได้โดยไม่ส่งคำตอบใหม่ ปรับความเร็วได้ 0.5×, 1× และ 2× หรือข้ามภาพเคลื่อนไหวได้ ระบบรองรับการตั้งค่าลดภาพเคลื่อนไหวของอุปกรณ์ด้วย</p><h2>กติกาคะแนนและเวลา</h2><p>คะแนน = ปัดเศษ (จำนวนคำตอบถูก ÷ จำนวนขั้นตอนทั้งหมด × 1,000) ไม่มีคะแนนติดลบ ทุกขั้นตอนตอบได้ครั้งเดียว และเกมเดินต่อด้วยสถานะที่ถูกต้องเสมอ แม้คุณตอบผิด</p><p>เวลานับจากเริ่มด่านจนตอบขั้นตอนสุดท้าย รวมเวลาอ่านเฉลยระหว่างขั้นตอน ไม่มีเวลาบังคับจบ คะแนนเท่ากันในด่านเดียวกันจะเรียงผู้ที่ใช้เวลาน้อยกว่าก่อน</p><p>เหรียญทอง: 900–1,000 · เงิน: 700–899 · ทองแดง: 500–699 · ต่ำกว่า 500: ลองใหม่ได้เสมอ</p><p>แต่ละด่านใช้โจทย์เดิมเพื่อให้ฝึกซ้ำและเปรียบเทียบผลได้ ตารางอันดับจึงเป็นการแข่งขันฝึกทักษะ ไม่ใช่การสอบ</p></section><div class="notice">เกมที่ค้างไว้กลับมาเล่นต่อได้หลังรีเฟรชหรือเข้าสู่ระบบใหม่ เวลายังคงเดินต่อ การเริ่มเกมใหม่จะยุติรอบเดิมโดยไม่นำรอบที่ยังไม่จบไปจัดอันดับ</div>`;}
function disposeVisualizer(){state.visualizer?.destroy();state.visualizer=null;}
const codeLessons={
 bubble:{
  title:'Bubble Sort',
  lines:[
   'for (int end = a.size() - 1; end > 0; end--) {',
   '    for (int i = 0; i < end; i++) {',
   '        int left = a.get(i);',
   '        int right = a.get(i + 1);',
   '        if (left > right) {',
   '            Collections.swap(a, i, i + 1);',
   '        }',
   '    }',
   '}'
  ],
  notes:[['1–2','วนเปรียบเทียบคู่ที่ติดกันจากซ้ายไปขวา เมื่อจบรอบ ค่ามากสุดจะอยู่ท้าย จึงลด end ลงทีละ 1'],['3–4','get(index) อ่านค่าตามตำแหน่ง โดยตำแหน่งแรกคือ 0 ส่วน i + 1 คือตัวถัดไป'],['5–6','ถ้าซ้ายมากกว่าขวา จึงสลับด้วย Collections.swap() ถ้าน้อยกว่าหรือเท่ากัน ให้คงลำดับเดิม']]
 },
 stack:{
  title:'Stack · LIFO',
  lines:[
   'List<Integer> values = new ArrayList<>();',
   '',
   'void push(int value) {',
   '    values.add(value);',
   '}',
   '',
   'int pop() {',
   '    if (values.isEmpty()) {',
   '        throw new IllegalStateException();',
   '    }',
   '    int top = values.size() - 1;',
   '    return values.remove(top);',
   '}'
  ],
  notes:[['1','สร้างรายการเก็บจำนวนเต็ม ในเกมนี้ใช้ ArrayList และให้ท้ายรายการเป็น TOP'],['3–4','push(value) เพิ่มข้อมูลที่ท้ายรายการ ทำให้ข้อมูลใหม่อยู่บนสุด'],['7–12','pop() ตรวจว่ามีข้อมูล คำนวณตำแหน่งสุดท้ายด้วย size() - 1 แล้ว remove(top) จะลบและคืนค่านั้นให้ผู้เรียก']]
 },
 queue:{
  title:'Queue · FIFO',
  lines:[
   'List<Integer> values = new ArrayList<>();',
   '',
   'void enqueue(int value) {',
   '    values.add(value);',
   '}',
   '',
   'int dequeue() {',
   '    if (values.isEmpty()) {',
   '        throw new IllegalStateException();',
   '    }',
   '    return values.remove(0);',
   '}'
  ],
  notes:[['1','สร้างรายการเก็บจำนวนเต็ม ตำแหน่ง 0 เป็น FRONT และท้ายรายการเป็น REAR'],['3–4','enqueue(value) เพิ่มข้อมูลใหม่ที่ท้ายคิว โดยข้อมูลเดิมยังอยู่ข้างหน้า'],['7–11','dequeue() ตรวจว่ามีข้อมูล แล้ว remove(0) จะลบและคืนตัวแรก ตัวที่เหลือเลื่อนไปด้านหน้า การลบหน้าของ ArrayList ใช้เวลา O(n)']]
 }
};
function javaSyntax(source){
 const pattern=/\b(?:for|int|if|return|void|new|throw)\b|\b(?:List|Integer|ArrayList|Collections|IllegalStateException)\b|\b\d+\b|\b\w+(?=\()/g;
 let output='',end=0;
 for(const match of source.matchAll(pattern)){
  const token=match[0],kind=/^(for|int|if|return|void|new|throw)$/.test(token)?'keyword':/^\d+$/.test(token)?'number':/^[A-Z]/.test(token)?'type':'method';
  output+=esc(source.slice(end,match.index))+`<span class="java-${kind}">${esc(token)}</span>`;end=match.index+token.length;
 }
 return output+esc(source.slice(end));
}
function codeLessonMarkup(g){
 const lesson=codeLessons[g.type];
 return `<section class="panel code-panel" aria-labelledby="code-title"><div class="eyebrow">SEE THE LOGIC</div><div class="code-heading"><h2 id="code-title">อ่านโค้ดไปพร้อมกัน</h2><span class="code-language">JAVA</span></div><p class="code-intro">${esc(lesson.title)} · ตัวอย่างย่อของหลักการในเกม</p><div class="code-scroll" tabindex="0" role="region" aria-label="ตัวอย่างโค้ด Java ${esc(lesson.title)}"><pre class="lesson-code"><code>${lesson.lines.map((line,index)=>`<span class="code-line" data-code-line="${index+1}"><span class="code-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span>${javaSyntax(line)||' '}</span></span>`).join('')}</code></pre></div><div class="code-explanation" aria-live="polite" aria-atomic="true"><span class="code-step-label" id="code-stage">กำลังเตรียมข้อมูล</span><p id="code-explanation">ดูบรรทัดที่เน้นสี เพื่อเชื่อมโค้ดกับภาพในกระดาน</p></div><div class="code-watch"><h3>ค่าตัวแปรตอนนี้</h3><dl id="code-variables"></dl></div><details class="code-notes"><summary>อธิบายโค้ดทีละส่วน</summary>${lesson.notes.map(([line,text])=>`<p><strong>บรรทัด ${line}</strong>${esc(text)}</p>`).join('')}</details></section>`;
}
function updateCodeLesson(g,event){
 const panel=$('.code-panel');if(!panel)return;
 const {phase,settled}=event,values=event.values??g.step.values;
 let lines=[],title='',description='',variables=[];
 if(g.type==='bubble'){
  const [i,j]=g.step.highlight,left=g.step.values[i],right=g.step.values[j];
  const round=Number(g.step.operation.match(/(\d+)$/)?.[1]||1),end=g.step.values.length-round;
  variables=[['a',`[${values.join(', ')}]`],['end',end],['i',i],['left',left],['right',right]];
  if(phase==='swap'){
   lines=[6];title='บรรทัด 6 · สลับตำแหน่ง';description=`${left} > ${right} เป็นจริง จึงเรียก Collections.swap(a, ${i}, ${j}) เพื่อสลับค่าสองตำแหน่ง${settled?' ตอนนี้ a เปลี่ยนเป็นลำดับที่เห็นในกระดานแล้ว':''}`;
  }else if(phase==='keep'){
   lines=[5];title='บรรทัด 5 · เงื่อนไขเป็นเท็จ';description=`${left} > ${right} เป็นเท็จ จึงข้ามคำสั่ง swap และคงลำดับเดิม รวมถึงกรณีที่ตัวเลขเท่ากัน`;
  }else{
   lines=[3,4,5];title='บรรทัด 3–5 · อ่านค่าแล้วเปรียบเทียบ';description=`i = ${i} จึงอ่าน a.get(${i}) ได้ ${left} และ a.get(${j}) ได้ ${right} จากนั้นพิจารณาเงื่อนไข left > right แล้วลองเลือกคำตอบ`;
  }
 }else{
  const stack=g.type==='stack',adding=phase==='push'||phase==='enqueue',removing=phase==='pop'||phase==='dequeue';
  variables=[[ 'values',`[${values.join(', ')}]`],['size()',values.length]];
  if(adding){
   lines=[3,4];title=`บรรทัด 3–4 · ${stack?'PUSH':'ENQUEUE'}`;description=`รับ value = ${event.value} แล้วเรียก values.add(value) เพื่อเพิ่มไว้${stack?'ที่ท้ายรายการ ซึ่งเป็น TOP ของ Stack':'ที่ท้ายคิว หรือ REAR'} ข้อมูลเดิมยังอยู่ในรายการ`;
   variables.push(['value',event.value]);
  }else if(removing){
   const index=stack?g.step.values.length-1:0,value=g.step.values[index];
   lines=stack?[11,12]:[11];title=stack?'บรรทัด 11–12 · POP':'บรรทัด 11 · DEQUEUE';description=stack?`size() ก่อนนำออก = ${g.step.values.length} จึงได้ top = ${index} จากนั้น remove(top) ลบและคืนค่า ${value} ซึ่งอยู่บนสุด`:`remove(0) ลบและคืนค่า ${value} ที่ FRONT ตัวอื่นจึงเลื่อนไปข้างหน้า`;
   if(stack)variables.push(['top',index]);
   if(settled)variables.push(['ค่าที่ return',value]);
  }else{
   lines=[7,8];title=`บรรทัด 7–8 · ก่อนเรียก ${stack?'pop()':'dequeue()'}`;description=`isEmpty() ตรวจว่ารายการว่างหรือไม่ ถ้าว่างจะ throw เพื่อป้องกันการนำข้อมูลออกจากรายการที่ไม่มีสมาชิก ตอนนี้มี ${values.length} ตัว ลองใช้โค้ดด้านล่างคิดว่าจะนำตัวไหนออก`;
  }
 }
 panel.querySelectorAll('[data-code-line]').forEach(line=>{const active=lines.includes(Number(line.dataset.codeLine));line.classList.toggle('is-current',active);if(active)line.setAttribute('aria-current','step');else line.removeAttribute('aria-current');});
 $('#code-stage').textContent=title;$('#code-explanation').textContent=description;
 $('#code-variables').innerHTML=variables.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('');
}
function visualMarkup(g){return `<div class="visual algorithm-visual"><div class="visual-toolbar"><span class="visual-title"><span class="live-dot"></span> LIVE ALGORITHM</span><div class="visual-controls"><button class="btn small ghost" data-visual="replay" type="button">↻ ดูภาพซ้ำ</button><label for="visual-speed">ความเร็ว</label><select id="visual-speed" aria-label="ความเร็วแอนิเมชัน">${[.5,1,2].map(speed=>`<option value="${speed}" ${state.visualSpeed===speed?'selected':''}>${speed}×</option>`).join('')}</select></div></div><div class="visual-stage"><div class="visual-values ${g.type}" role="group" aria-label="${g.type==='bubble'?'ตัวเลขเรียงจากซ้ายไปขวา':g.type==='stack'?'ข้อมูลใน Stack เรียงจากล่างขึ้นบน':'ข้อมูลใน Queue เรียงจาก FRONT ไป REAR'}"></div><div class="visual-output" hidden><span>นำออกแล้ว</span><strong></strong></div></div><div class="visual-description" aria-live="polite" aria-atomic="true"><span class="visual-status"></span><p class="visual-caption"></p></div><div class="visual-bottom"><span class="visual-note">${g.type==='bubble'?'ASCENDING ORDER · น้อย → มาก':g.type==='stack'?'LIFO · เข้าทีหลัง ออกก่อน':'FIFO · เข้าก่อน ออกก่อน'}</span><button type="button" class="visual-skip" data-visual="skip" hidden>ข้ามภาพเคลื่อนไหว →</button></div></div>`;}
function game(){
 disposeVisualizer();
 window.scrollTo({top:0,behavior:'instant'});
 const g=state.game;
 if(!g){location.hash='arena';return;}
 if(g.completed){result(g);return;}
 const s=g.step;
 main.innerHTML=`<div class="game-header"><div><a class="text-link" href="#arena">← กลับไปเลือกสนาม</a><div class="eyebrow">ARENA / ${g.type.toUpperCase()} / LEVEL 0${g.level}</div><h1>${esc(g.title)}</h1></div><div class="game-meta"><div>คะแนน<strong id="game-score">${g.score}</strong></div><div>ตอบถูก<strong id="game-correct">${g.correct}<small> / ${g.total}</small></strong></div><div>เวลาที่ใช้<strong id="timer">${duration(g.elapsed)}</strong></div></div></div><div class="game-grid"><section class="game-board"><div class="board-top"><span>${esc(s.operation)}</span><span>STEP ${g.index+1} / ${g.total}</span></div><div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>${visualMarkup(g)}<div class="question-area"><div class="eyebrow">YOUR MOVE</div><h2>${esc(s.prompt)}</h2><div class="answer-options">${s.choices.map((c,i)=>`<button class="answer-btn" data-action="answer" data-choice="${i}">${esc(c)}</button>`).join('')}</div><div id="feedback" aria-live="polite"></div></div></section><aside class="game-aside">${codeLessonMarkup(g)}<section class="panel"><div class="eyebrow">A LITTLE REMINDER</div><h2>คิดแบบ ${g.type==='bubble'?'Bubble Sort':g.type==='stack'?'Stack':'Queue'}</h2><p>${esc(g.concept)}</p><div class="rule-item"><span>คะแนนเต็ม</span><strong>1,000</strong></div><div class="rule-item"><span>จำนวนขั้นตอน</span><strong>${g.total}</strong></div><div class="rule-item"><span>ตอบผิด</span><strong>ดูเฉลย แล้วไปต่อ</strong></div></section></aside></div>`;
 $('#progress-fill').style.width=(g.index/g.total*100)+'%';
 const visualizer=new ArenaVisualizer($('.algorithm-visual'),g,{
  speed:state.visualSpeed,
  onSpeed:speed=>state.visualSpeed=speed,
  onStep:event=>updateCodeLesson(g,event),
  onBusy:busy=>{
   document.querySelectorAll('.answer-btn').forEach(button=>button.disabled=busy||!!state.feedback||state.submitting);
   const nextButton=$('[data-action="next"]');if(nextButton)nextButton.disabled=busy;
  }
 });
 state.visualizer=visualizer;
 visualizer.play();
 startClock(g.elapsed);
}
function startClock(elapsed){clearInterval(state.clock);const from=Date.now();state.clock=setInterval(()=>{if($('#timer'))$('#timer').textContent=duration(elapsed+Math.floor((Date.now()-from)/1000));},1000);}
async function refreshCompletedGame(){try{await refreshPersonal();if(['#home','#history',''].includes(location.hash))await route();}catch(error){toast('โหลดสถิติล่าสุดไม่สำเร็จ: '+error.message);}}
async function answer(choice){
 const g=state.game,visualizer=state.visualizer,version=state.routeVersion;
 if(state.feedback||state.submitting||g.completed||visualizer?.busy||!g.step.choices[choice])return;
 state.submitting=true;
 const buttons=[...document.querySelectorAll('.answer-btn')];
 buttons.forEach(button=>button.disabled=true);buttons[choice]?.classList.add('chosen');
 try{
  const response=await api('answer',{id:g.id,index:g.index,answer:g.step.choices[choice]});
  state.active=response.game.completed?null:response.game;
  const personalUpdate=response.game.completed?refreshCompletedGame():Promise.resolve();
  if(version!==state.routeVersion||state.game!==g){if(state.game===g){state.game=response.game;if(location.hash==='#game')game();}await personalUpdate;return;}
  state.feedback=response;
  if(response.game.completed)clearInterval(state.clock);
  $('#game-score').textContent=response.game.score;
  $('#game-correct').innerHTML=`${response.game.correct}<small> / ${response.game.total}</small>`;
  $('#progress-fill').style.width=(response.game.index/g.total*100)+'%';
  if(response.game.completed)$('#timer').textContent=duration(response.game.elapsed);
  $('#feedback').innerHTML=`<div class="feedback ${response.correct?'':'wrong'}"><h3>${response.correct?'✓ ถูกต้อง! ไปต่อกัน':'↳ ยังไม่ถูก ลองดูเหตุผลกัน'}</h3><p>${esc(response.explanation)}${response.correct?'':`<br>คำตอบที่ถูก: <strong>${esc(response.answer)}</strong>`}</p><button class="btn primary small" data-action="next" disabled>${response.game.completed?'ดูผลการเล่น':'ขั้นตอนถัดไป'} →</button></div>`;
  await visualizer.reveal(response);
  if(version===state.routeVersion&&state.visualizer===visualizer){
   const nextButton=$('#feedback button');if(nextButton&&!visualizer.busy)nextButton.focus({preventScroll:true});
  }
  await personalUpdate;
 }catch(error){
  if(version===state.routeVersion&&state.game===g){buttons.forEach(button=>{button.disabled=false;button.classList.remove('chosen');});toast(error.message);}
 }finally{state.submitting=false;document.querySelectorAll('.answer-btn').forEach(button=>button.disabled=!!state.visualizer?.busy||!!state.feedback);}
}
async function next(){if(!state.feedback||state.visualizer?.busy)return;disposeVisualizer();state.game=state.feedback.game;state.feedback=null;if(state.game.completed)result(state.game);else game();}
async function result(g){disposeVisualizer();clearInterval(state.clock);const score=g.score;main.innerHTML=`<div class="result-wrap"><section class="result-hero"><div class="eyebrow">CHALLENGE COMPLETED</div><div class="result-medal">${medal(score)}</div><h1>${score>=900?'เล่นได้ยอดเยี่ยม!':score>=500?'อีกก้าวของความเข้าใจ!':'ทุกครั้งที่ลอง คุณได้เรียนรู้'}</h1><p>${esc(g.title||names[g.type])} · ด่าน ${g.level}</p><div class="result-score">${score.toLocaleString()}<small> / 1,000</small></div><div class="result-metrics"><div>ตอบถูก<strong>${g.correct} / ${g.total}</strong></div><div>ความแม่นยำ<strong>${Math.round(g.correct/g.total*100)}%</strong></div><div>เวลาที่ใช้<strong>${duration(g.elapsed)}</strong></div></div><div class="result-actions"><button class="btn lime" data-action="start" data-type="${g.type}" data-level="${g.level}">ลองอีกครั้ง ↻</button>${g.level<5?`<button class="btn dark-outline" data-action="start" data-type="${g.type}" data-level="${g.level+1}">ด่านถัดไป →</button>`:'<a href="#arena" class="btn dark-outline">เลือกสนามใหม่ ↗</a>'}<button class="btn dark-outline" data-action="board" data-type="${g.type}" data-level="${g.level}">ดูอันดับ ↗</button></div></section><section class="panel level-section"><div class="eyebrow">LEARN FROM EVERY MOVE</div><h2>ทบทวนคำตอบ</h2><div id="review-list"><p class="muted">กำลังโหลด…</p></div></section></div>`;try{const rows=await api('review?id='+encodeURIComponent(g.id));if(!$('#review-list'))return;$('#review-list').innerHTML=rows.map(r=>`<div class="review-row"><h3><span class="${r.correct?'good':'bad'}">${r.correct?'✓':'×'}</span> ${r.index}. ${esc(r.prompt)}</h3><p>คุณตอบ: ${esc(r.submitted)}${r.correct?'':` · คำตอบที่ถูก: ${esc(r.answer)}`}</p><p>${esc(r.explanation)}</p></div>`).join('');}catch(e){if($('#review-list'))$('#review-list').innerHTML=`<p class="error">${esc(e.message)}</p>`;}}
async function refreshPersonal(){if(state.user){[state.history,state.active]=await Promise.all([api('history'),api('active')]);}else{state.history=[];state.active=null;}}
async function start(type,level){if(!state.user){state.pendingStart={type,level};openAuth('login');return;}if(state.active&&!confirm('การเริ่มด่านใหม่จะยุติเกมที่ค้างไว้ ต้องการเริ่มด่านใหม่หรือไม่?'))return;state.game=await api('start',{type,level});state.active=state.game;state.feedback=null;if(location.hash==='#game')game();else location.hash='game';}
function openAuth(mode){state.authMode=mode;$('#auth-form').reset();updateAuth();$('#auth-dialog').showModal();}
function updateAuth(){const signup=state.authMode==='register';$('#auth-title').textContent=signup?'เริ่มต้นสนามของคุณ':'กลับเข้าสู่สนาม';$('#auth-description').textContent=signup?'สร้างบัญชีเพื่อเก็บคะแนนและความคืบหน้า':'เข้าสู่ระบบเพื่อเล่นและบันทึกสถิติของคุณ';$('#auth-submit').textContent=signup?'สมัครสมาชิก ↗':'เข้าสู่ระบบ ↗';$('#auth-toggle').textContent=signup?'มีบัญชีแล้ว? เข้าสู่ระบบ':'ยังไม่มีบัญชี? สมัครสมาชิก';$('#password').autocomplete=signup?'new-password':'current-password';$('#auth-error').textContent='';}
async function route(){const version=++state.routeVersion;disposeVisualizer();clearInterval(state.clock);if(state.feedback){state.game=state.feedback.game;state.feedback=null;}window.scrollTo({top:0,behavior:'instant'});const key=location.hash.slice(1).split('/')[0]||'home';document.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===key));try{if(key==='game'){if(!state.game&&state.user){state.game=await api('active');if(version!==state.routeVersion)return;}game();}else if(key==='arena'){arena();const target=location.hash.split('/')[1];if(target&&['bubble','stack','queue'].includes(target))$('#levels-'+target)?.scrollIntoView({behavior:'smooth',block:'start'});}else if(key==='leaderboard')await leaderboard();else if(key==='history')history();else if(key==='guide')guide();else home();}catch(e){main.innerHTML=`<section class="panel"><h1>โหลดข้อมูลไม่สำเร็จ</h1><p class="error">${esc(e.message)}</p><button class="btn" data-action="reload">ลองอีกครั้ง</button></section>`;}}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;try{if(action==='login'||action==='register')openAuth(action);else if(action==='choose')location.hash='arena/'+el.dataset.type;else if(action==='start'){el.disabled=true;await start(el.dataset.type,Number(el.dataset.level));}else if(action==='resume'){state.game=state.active;state.feedback=null;location.hash='game';}else if(action==='answer')await answer(Number(el.dataset.choice));else if(action==='next'){el.disabled=true;await next();}else if(action==='board'){state.boardType=el.dataset.type;state.boardLevel=Number(el.dataset.level);location.hash='leaderboard';}else if(action==='review'){const g=state.history.find(h=>h.id===el.dataset.id);if(g){state.game={...g,completed:true};state.feedback=null;location.hash='game';}}else if(action==='reload'){await refreshPersonal();await route();}else if(action==='logout'){await api('logout',{});state.user=null;state.game=null;state.feedback=null;await refreshPersonal();renderAccount();if(location.hash==='#home')await route();else location.hash='home';toast('ออกจากระบบแล้ว');}}catch(err){toast(err.message);}finally{if(el.isConnected&&action!=='answer')el.disabled=false;}});
document.addEventListener('change',e=>{if(e.target.id==='board-type'){state.boardType=e.target.value;updateBoard();}if(e.target.id==='board-level'){state.boardLevel=Number(e.target.value);updateBoard();}});
$('#close-auth').onclick=()=>$('#auth-dialog').close();$('#auth-dialog').addEventListener('close',()=>state.pendingStart=null);$('#auth-toggle').onclick=()=>{state.authMode=state.authMode==='login'?'register':'login';updateAuth();};
$('#auth-form').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#auth-submit');btn.disabled=true;$('#auth-error').textContent='';try{const r=await api(state.authMode,{username:$('#username').value,password:$('#password').value});state.user=r.user;await refreshPersonal();renderAccount();const pending=state.pendingStart;state.pendingStart=null;$('#auth-dialog').close();if(pending)await start(pending.type,pending.level);else await route();toast('ยินดีต้อนรับ '+state.user.username);}catch(err){$('#auth-error').textContent=err.message;}finally{btn.disabled=false;}});
window.addEventListener('hashchange',route);
(async()=>{main.innerHTML='<div class="loading">กำลังเตรียมสนาม…</div>';try{const [me,catalog]=await Promise.all([api('me'),api('catalog')]);state.user=me.user.id?me.user:null;state.catalog=catalog;await refreshPersonal();renderAccount();await route();}catch(e){main.innerHTML=`<section class="panel"><h1>ยังเชื่อมต่อสนามไม่ได้</h1><p class="error">${esc(e.message)}</p><button class="btn" data-action="reload">ลองอีกครั้ง</button></section>`;}})();
