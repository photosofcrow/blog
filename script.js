// ===== POLAROIDS =====
const polaroidData=[
  {emoji:'🦌',label:'Ciervo · Pirineos',color:'#1a2e0a,#3d5a28',rot:-8,top:10,left:0,w:110},
  {emoji:'🌅',label:'Amanecer · Sierra',color:'#3a1a0a,#7a4a18',rot:5,top:30,left:100,w:120},
  {emoji:'🦊',label:'Zorro · Nov 24',color:'#2a1a08,#5a3a18',rot:-3,top:5,left:215,w:105},
  {emoji:'🌲',label:'Bosque · Cuenca',color:'#0a1a0a,#1a3a1a',rot:9,top:35,left:310,w:115},
  {emoji:'🦋',label:'Macro · Primavera',color:'#1a0a2a,#3a1a5a',rot:-6,top:15,left:420,w:108},
];
const area=document.getElementById('polaroids-area');
polaroidData.forEach(p=>{
  const d=document.createElement('div');
  d.className='polaroid';
  d.style.cssText=`transform:rotate(${p.rot}deg);top:${p.top}px;left:${p.left}px;width:${p.w}px`;
  d.innerHTML=`<div class="polaroid-img" style="background:linear-gradient(135deg,#${p.color})">${p.emoji}</div><div class="polaroid-label">${p.label}</div>`;
  area.appendChild(d);
});

// ===== STARS =====
const bgCanvas=document.getElementById('bg-canvas');
const bgCtx=bgCanvas.getContext('2d');
function resizeBg(){bgCanvas.width=innerWidth;bgCanvas.height=innerHeight}
resizeBg();window.addEventListener('resize',resizeBg);
const stars=Array.from({length:280},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.5+0.3,a:Math.random()*0.5+0.1,da:(Math.random()*0.006+0.002)*(Math.random()>0.5?1:-1)}));
let showStars=true;
(function animBg(){
  requestAnimationFrame(animBg);
  bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
  if(!showStars)return;
  stars.forEach(s=>{s.a+=s.da;if(s.a>0.8||s.a<0.05)s.da*=-1;bgCtx.beginPath();bgCtx.arc(s.x*bgCanvas.width,s.y*bgCanvas.height,s.r,0,Math.PI*2);bgCtx.fillStyle='rgba(255,255,255,'+s.a+')';bgCtx.fill();});
})();

// ===== BIRDS =====
const birdCanvas=document.getElementById('bird-canvas');
const birdCtx=birdCanvas.getContext('2d');
let birdsOn=false;let flocks=[];
function resizeBird(){birdCanvas.width=innerWidth;birdCanvas.height=innerHeight}
resizeBird();window.addEventListener('resize',resizeBird);
function makeFlock(n,x,y,vx,vy,sz,col){
  const members=Array.from({length:n},(_,i)=>({ox:-(i+1)*(sz*2.5+Math.random()*5),oy:(i%2===0?1:-1)*(i+1)*sz*1.5+(Math.random()-0.5)*7,ph:Math.random()*Math.PI*2,ps:0.07+Math.random()*0.04}));
  return{x,y,vx,vy,members,sz,col,wt:0,alive:true};
}
function drawBird(ctx,x,y,wing,sz,col){
  ctx.beginPath();ctx.moveTo(x-sz,y+wing*sz*0.55);ctx.quadraticCurveTo(x,y-wing*sz,x+sz,y+wing*sz*0.55);ctx.strokeStyle=col;ctx.lineWidth=Math.max(0.8,sz*0.55);ctx.lineCap='round';ctx.stroke();
}
function animBirds(){
  if(!birdsOn)return;requestAnimationFrame(animBirds);
  birdCtx.clearRect(0,0,birdCanvas.width,birdCanvas.height);
  flocks.forEach(f=>{
    f.wt+=0.065;f.x+=f.vx;f.y+=f.vy+Math.sin(f.wt*0.35)*0.18;
    f.vy*=0.999;if(Math.random()<0.008)f.vy+=(Math.random()-0.5)*0.12;
    if(f.x>birdCanvas.width+150){f.x=-80;f.y=55+Math.random()*(birdCanvas.height*0.42);f.vx=0.5+Math.random()*0.65;f.vy=(Math.random()-0.5)*0.3;}
    const wl=Math.sin(f.wt)*0.55;
    drawBird(birdCtx,f.x,f.y,wl,f.sz,f.col);
    f.members.forEach(m=>{m.ph+=m.ps;drawBird(birdCtx,f.x+m.ox,f.y+m.oy,Math.sin(f.wt+m.ph)*0.55,f.sz,f.col);});
  });
  if(Math.random()<0.0006&&flocks.length<7)flocks.push(makeFlock(2+Math.floor(Math.random()*4),-70,70+Math.random()*(birdCanvas.height*0.38),0.52+Math.random()*0.5,(Math.random()-0.5)*0.22,2.2+Math.random()*1.6,'rgba(20,12,5,0.72)'));
}
function startBirds(){if(birdsOn)return;birdsOn=true;flocks=[makeFlock(7,-130,85,0.88,-0.07,3.0,'rgba(15,10,4,0.78)'),makeFlock(4,-320,145,0.62,0.06,2.2,'rgba(18,12,6,0.62)'),makeFlock(9,-220,62,0.74,0.03,2.6,'rgba(12,8,3,0.70)')];animBirds();}
function stopBirds(){birdsOn=false;birdCtx.clearRect(0,0,birdCanvas.width,birdCanvas.height);}

// ===== MATRIX =====
const mCanvas=document.getElementById('matrix-canvas');
const mCtx=mCanvas.getContext('2d');
let matrixOn=false,mRAF=null;
function initMatrix(){
  mCanvas.width=innerWidth;mCanvas.height=innerHeight;
  const cols=Math.floor(innerWidth/14);
  const drops=Array.from({length:cols},()=>Math.random()*mCanvas.height/14|0);
  const chars='アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFGHIJKLMNOP@#$%&*/\\<>';
  matrixOn=true;
  (function frame(){
    if(!matrixOn)return;
    mCtx.fillStyle='rgba(0,0,0,0.045)';mCtx.fillRect(0,0,mCanvas.width,mCanvas.height);
    mCtx.font='13px monospace';
    drops.forEach((y,i)=>{
      mCtx.fillStyle=Math.random()>0.96?'#e0ffe0':'rgba(0,255,65,'+(0.35+Math.random()*0.65)+')';
      mCtx.fillText(chars[Math.random()*chars.length|0],i*14,y*14);
      if(y*14>mCanvas.height&&Math.random()>0.972)drops[i]=0;drops[i]++;
    });
    mRAF=requestAnimationFrame(frame);
  })();
}
function stopMatrix(){matrixOn=false;if(mRAF)cancelAnimationFrame(mRAF);mCtx.clearRect(0,0,mCanvas.width,mCanvas.height);}

// ===== TERMINAL TYPING =====
const termLines=[
  {t:'cmd',v:'icesmoke@kali:~$ whoami'},
  {t:'out',v:'> icesmoke — security researcher & photographer'},
  {t:'gap',v:''},
  {t:'cmd',v:'icesmoke@kali:~$ cat /etc/skills'},
  {t:'ok',v:'> [✓] Penetration Testing — OSCP'},
  {t:'ok',v:'> [✓] Red Team Operations'},
  {t:'ok',v:'> [✓] Blue Team / SOC Analyst'},
  {t:'ok',v:'> [✓] Digital Forensics & IR'},
  {t:'ok',v:'> [✓] OSINT & Threat Intelligence'},
  {t:'gap',v:''},
  {t:'cmd',v:'icesmoke@kali:~$ uptime'},
  {t:'out',v:'> 5 years — no critical incidents'},
  {t:'gap',v:''},
  {t:'cmd',v:'icesmoke@kali:~$ _'},
];
let typingTid=null;
function startTyping(){
  const el=document.getElementById('typed-out');el.innerHTML='';let html='';let li=0,ci=0;
  if(typingTid)clearTimeout(typingTid);
  const cols={cmd:'#82aaff',out:'rgba(0,255,65,0.85)',ok:'#c3e88d',gap:''};
  function tick(){
    if(li>=termLines.length){el.innerHTML=html+'<span class="cursor-blink"></span>';return;}
    const ln=termLines[li];
    if(ln.t==='gap'){html+='<br>';li++;ci=0;typingTid=setTimeout(tick,110);return;}
    if(ci===0)html+='<span style="color:'+cols[ln.t]+'">';
    if(ci<ln.v.length){html+=ln.v[ci]==='<'?'&lt;':ln.v[ci]==='>'?'&gt;':ln.v[ci];ci++;}
    else{html+='</span><br>';li++;ci=0;el.innerHTML=html+'<span class="cursor-blink"></span>';typingTid=setTimeout(tick,180);return;}
    el.innerHTML=html+'<span class="cursor-blink"></span>';
    typingTid=setTimeout(tick,li<2?44:20);
  }tick();
}

// ===== LOGO ANIMATION =====
const lc=document.getElementById('logo-canvas');
const lCtx=lc.getContext('2d');
const codeEl=document.getElementById('logo-code-display');
const statusEl=document.getElementById('logo-status');
const CX=238,CY=100,R=72,ri=50;
const logoCodeLines=[
  {c:'#c792ea',t:'const icesmoke = {'},
  {c:'#546e7a',t:'  // Construyendo hexágono exterior...'},
  {c:'#82aaff',t:'  drawHex(cx:238, cy:100, r:72)'},
  {c:'#546e7a',t:'  // Hexágono interior girado 30°'},
  {c:'#82aaff',t:'  drawHex(cx:238, cy:100, r:50, rot:30)'},
  {c:'#546e7a',t:'  // Líneas de conexión diagonales'},
  {c:'#c3e88d',t:'  connectVertices(outer, inner)'},
  {c:'#546e7a',t:'  // Líneas cruzadas internas'},
  {c:'#c3e88d',t:'  crossLines([0,3],[1,4],[2,5])'},
  {c:'#546e7a',t:'  // Renderizando nombre...'},
  {c:'#f78c6c',t:'  text("icesmoke", y:94, size:16)'},
  {c:'#f78c6c',t:'  text("DEV", y:112, color:"#00d4ff")'},
  {c:'#546e7a',t:'  // Puntos de vértice'},
  {c:'#c3e88d',t:'  vertices.forEach(dot)'},
  {c:'#c792ea',t:'} // ✓ Build complete — 0 errors'},
];
function hexPts(cx,cy,radius,rot=0){return Array.from({length:6},(_,i)=>{const a=(i*60+rot)*Math.PI/180;return[cx+radius*Math.cos(a),cy+radius*Math.sin(a)];})}
let lProg=0,lLine=0,lHtml='',lRAF=null,lTid=null;
function drawLogoAt(p){
  lCtx.clearRect(0,0,lc.width,lc.height);
  p=Math.max(0,Math.min(1,p));
  const oh=hexPts(CX,CY,R,-90),ih=hexPts(CX,CY,ri,-60);
  const grd=lCtx.createRadialGradient(CX,CY,8,CX,CY,R+22);
  grd.addColorStop(0,'rgba(0,180,255,0.06)');grd.addColorStop(1,'rgba(0,0,0,0)');
  lCtx.fillStyle=grd;lCtx.fillRect(0,0,lc.width,lc.height);
  const ph=[0,0.12,0.24,0.36,0.48,0.58,0.68,0.78,0.87,1.0];
  // outer hex
  if(p>ph[0]){const t=Math.min(1,(p-ph[0])/(ph[1]-ph[0]));lCtx.strokeStyle='rgba(0,212,255,0.9)';lCtx.lineWidth=2.2;lCtx.setLineDash([]);lCtx.beginPath();const n=Math.ceil(t*6);for(let i=0;i<n;i++){const np=Math.min(1,t*6-i);const[ax,ay]=oh[i];const[bx,by]=oh[(i+1)%6];if(i===0)lCtx.moveTo(ax,ay);lCtx.lineTo(ax+(bx-ax)*np,ay+(by-ay)*np);}lCtx.stroke();}
  // inner hex
  if(p>ph[1]){const t=Math.min(1,(p-ph[1])/(ph[2]-ph[1]));lCtx.strokeStyle='rgba(0,180,255,0.6)';lCtx.lineWidth=1.5;lCtx.beginPath();const n=Math.ceil(t*6);for(let i=0;i<n;i++){const np=Math.min(1,t*6-i);const[ax,ay]=ih[i];const[bx,by]=ih[(i+1)%6];if(i===0)lCtx.moveTo(ax,ay);lCtx.lineTo(ax+(bx-ax)*np,ay+(by-ay)*np);}lCtx.stroke();}
  // diagonals
  if(p>ph[2]){const t=Math.min(1,(p-ph[2])/(ph[3]-ph[2]));lCtx.strokeStyle='rgba(100,200,255,0.32)';lCtx.lineWidth=1;lCtx.setLineDash([3,3]);for(let i=0;i<6;i++){if(i/6>t)break;const lt=Math.min(1,t*6-i);lCtx.beginPath();lCtx.moveTo(oh[i][0],oh[i][1]);lCtx.lineTo(oh[i][0]+(ih[i][0]-oh[i][0])*lt,oh[i][1]+(ih[i][1]-oh[i][1])*lt);lCtx.stroke();}lCtx.setLineDash([]);}
  // cross lines
  if(p>ph[3]){const t=Math.min(1,(p-ph[3])/(ph[4]-ph[3]));lCtx.strokeStyle='rgba(0,200,255,0.22)';lCtx.lineWidth=1;lCtx.setLineDash([2,4]);[[0,3],[1,4],[2,5]].forEach(([a,b],idx)=>{if(idx/3>t)return;const lt=Math.min(1,t*3-idx);lCtx.beginPath();lCtx.moveTo(oh[a][0],oh[a][1]);lCtx.lineTo(oh[a][0]+(oh[b][0]-oh[a][0])*lt,oh[a][1]+(oh[b][1]-oh[a][1])*lt);lCtx.stroke();});lCtx.setLineDash([]);}
  // icesmoke text
  if(p>ph[5]){const t=Math.min(1,(p-ph[5])/(ph[6]-ph[5]));lCtx.globalAlpha=t;lCtx.fillStyle='#ffffff';lCtx.font='bold 16px "Courier New",monospace';lCtx.textAlign='center';lCtx.textBaseline='middle';lCtx.fillText('icesmoke',CX,CY-8);lCtx.globalAlpha=1;}
  // DEV text
  if(p>ph[6]){const t=Math.min(1,(p-ph[6])/(ph[7]-ph[6]));lCtx.globalAlpha=t;lCtx.fillStyle='rgba(0,212,255,0.95)';lCtx.font='bold 11px "Courier New",monospace';lCtx.textAlign='center';lCtx.textBaseline='middle';lCtx.fillText('DEV',CX,CY+12);lCtx.globalAlpha=1;}
  // outer dots
  if(p>ph[7]){const t=Math.min(1,(p-ph[7])/(ph[8]-ph[7]));oh.slice(0,Math.ceil(t*6)).forEach((pt,i)=>{const dt=Math.min(1,t*6-i);lCtx.beginPath();lCtx.arc(pt[0],pt[1],3*dt,0,Math.PI*2);lCtx.fillStyle='rgba(0,212,255,0.9)';lCtx.fill();});}
  // inner dots
  if(p>ph[8]){const t=Math.min(1,(p-ph[8])/(ph[9]-ph[8]));ih.slice(0,Math.ceil(t*6)).forEach((pt,i)=>{const dt=Math.min(1,t*6-i);lCtx.beginPath();lCtx.arc(pt[0],pt[1],2*dt,0,Math.PI*2);lCtx.fillStyle='rgba(100,200,255,0.7)';lCtx.fill();});}
  // glow ring
  if(p>=1){lCtx.strokeStyle='rgba(0,180,255,0.16)';lCtx.lineWidth=10;lCtx.beginPath();lCtx.arc(CX,CY,R+8,0,Math.PI*2);lCtx.stroke();}
}
function replayLogo(){
  lProg=0;lLine=0;lHtml='';codeEl.innerHTML='';
  statusEl.textContent='Compilando...';statusEl.style.color='#444';
  if(lRAF)cancelAnimationFrame(lRAF);if(lTid)clearTimeout(lTid);
  (function anim(){
    if(lProg<1){lProg+=0.007;drawLogoAt(lProg);
      const idx=Math.floor(lProg*logoCodeLines.length);
      if(idx>lLine&&lLine<logoCodeLines.length){const l=logoCodeLines[lLine];lHtml+='<span style="color:'+l.c+'">'+l.t+'</span>\n';codeEl.innerHTML=lHtml+'<span style="color:#00ff41;opacity:0.6">█</span>';codeEl.scrollTop=codeEl.scrollHeight;lLine++;}
      lRAF=requestAnimationFrame(anim);
    }else{drawLogoAt(1);statusEl.textContent='✓ Build OK — 0 errores';statusEl.style.color='#008800';}
  })();
}

// ===== NAV =====
let current=null;
function goTo(t){
  if(current==='cyber')stopMatrix();
  if(current==='photo'){stopBirds();document.getElementById('photo-section').removeEventListener('scroll',onPhotoScroll);}
  showStars=(t==='landing');
  document.getElementById('landing').classList.toggle('hidden',t!=='landing');
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  if(t!=='landing'){
    const id=t==='win95'?'win95-section':t+'-section';
    const sec=document.getElementById(id);if(sec)sec.classList.add('active');
    if(t==='cyber'){setTimeout(()=>{initMatrix();startTyping();},120);}
    if(t==='photo'){document.getElementById('photo-section').addEventListener('scroll',onPhotoScroll);setTimeout(startBirds,700);}
    if(t==='win95')updateWinTime();
  }
  current=t;
}

// ===== PARALLAX =====
function onPhotoScroll(e){
  const el=e.target,p=el.scrollTop/(el.scrollHeight-el.clientHeight||1);
  const fh=document.getElementById('hillfar'),nh=document.getElementById('hillnear');
  if(fh)fh.setAttribute('transform','translate(0,'+(p*-40)+')');
  if(nh)nh.setAttribute('transform','translate(0,'+(p*-85)+')');
}

// ===== WIN95 =====
let dragging=null,dOX=0,dOY=0,zC=50;
function startDrag(e,id){dragging=id;const w=document.getElementById(id),r=w.getBoundingClientRect();dOX=e.clientX-r.left;dOY=e.clientY-r.top;w.style.zIndex=++zC;document.addEventListener('mousemove',onDrag);document.addEventListener('mouseup',endDrag);}
function onDrag(e){if(!dragging)return;const w=document.getElementById(dragging),d=document.getElementById('desktop'),dr=d.getBoundingClientRect();let nx=Math.max(0,Math.min(dr.width-w.offsetWidth,e.clientX-dr.left-dOX));let ny=Math.max(0,Math.min(dr.height-w.offsetHeight,e.clientY-dr.top-dOY));w.style.left=nx+'px';w.style.top=ny+'px';}
function endDrag(){dragging=null;document.removeEventListener('mousemove',onDrag);document.removeEventListener('mouseup',endDrag);}
const winNames={logo:'Mi Logo',about:'Sobre mí',projects:'Proyectos',tech:'Tecnologías',contact:'Contacto',browser:'Proyectos Web'};
function openWin(n){const w=document.getElementById('win-'+n);if(!w)return;w.style.display='block';w.style.zIndex=++zC;if(n==='logo')setTimeout(replayLogo,150);updateTaskbar();}
function closeWin(id){document.getElementById(id).style.display='none';updateTaskbar();}
function minimizeWin(id){document.getElementById(id).style.display='none';updateTaskbar();}
function updateTaskbar(){const t=document.getElementById('taskbar-tasks');t.innerHTML='';Object.keys(winNames).forEach(n=>{const w=document.getElementById('win-'+n);if(w&&w.style.display!=='none'){const b=document.createElement('button');b.className='taskbar-task active';b.textContent=winNames[n];b.onclick=()=>minimizeWin('win-'+n);t.appendChild(b);}});}
setInterval(updateTaskbar,600);
function toggleStart(){document.getElementById('start-menu').classList.toggle('visible');}
document.addEventListener('click',e=>{if(!e.target.closest('.start-btn')&&!e.target.closest('.start-menu'))document.getElementById('start-menu').classList.remove('visible');});
function updateWinTime(){const t=document.getElementById('win-time');if(!t)return;const d=new Date();t.textContent=d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');}
setInterval(updateWinTime,15000);
