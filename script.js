'use strict';

// ── Estado global ───────────────────────────────────────
const state = {
  currentSection: null, showStars: true, activeFilter: 'Todas',
  zC: 50, dragging: null, dragOX: 0, dragOY: 0,
  birdsOn: false, flocks: [],
  matrixOn: false, matrixRAF: null,
  netOn: false, netRAF: null, netNodes: [], netEdges: [],
  logoProg: 0, logoLine: 0, logoHtml: '', logoRAF: null,
  termTid: null, transRunning: false, iceParticles: [],
  site: null, fotos: [], blog: [],
  imgCache: new Map()
};

// ═══════════════════════════════════════════════════════
//  FETCH — carga defensiva de JSON
// ═══════════════════════════════════════════════════════
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
  return res.json();
}

function toArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  const found = Object.values(data || {}).find(v => Array.isArray(v));
  return found || [];
}

const BASE_DATA  = 'https://photosofcrow.github.io/blog/data/';
const BASE_FOTOS = 'https://photosofcrow.github.io/blog/fotos/';

function fixFotoUrl(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('fotos/') || url.startsWith('./fotos/')) return url;
  if (url.startsWith('/')) return BASE_FOTOS + url.slice(1);
  return BASE_FOTOS + url;
}

async function loadAllData() {
  const [site, equipo, fotosRaw, blogRaw] = await Promise.all([
    loadJSON(BASE_DATA + 'site.json'),
    loadJSON(BASE_DATA + 'equipo.json'),
    loadJSON(BASE_DATA + 'fotos.json'),
    loadJSON(BASE_DATA + 'blog.json'),
  ]);
  state.site        = site;
  state.site.equipo = Array.isArray(equipo) ? equipo : (equipo.items || []);
  state.site.cita   = equipo.cita || '';
  state.fotos = toArray(fotosRaw, 'fotos').map(f => ({ ...f, url: fixFotoUrl(f.url) }));
  state.blog  = toArray(blogRaw, 'blog');
}

// ═══════════════════════════════════════════════════════
//  PRECARGA DE IMÁGENES
// ═══════════════════════════════════════════════════════
function preloadImages(fotos) {
  const CHUNK = 4;
  let i = 0;
  function loadNext() {
    const chunk = fotos.slice(i, i + CHUNK);
    if (!chunk.length) return;
    chunk.forEach(foto => {
      if (!foto.url || state.imgCache.has(foto.url)) return;
      const img = new Image();
      img.onload  = () => state.imgCache.set(foto.url, true);
      img.onerror = () => state.imgCache.set(foto.url, false);
      img.decoding = 'async';
      img.src = foto.url;
    });
    i += CHUNK;
    setTimeout(loadNext, 300);
  }
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(loadNext);
  } else {
    setTimeout(loadNext, 500);
  }
}

// ═══════════════════════════════════════════════════════
//  CANVAS — resize unificado
// ═══════════════════════════════════════════════════════
const bgCanvas     = document.getElementById('bg-canvas');
const birdCanvas   = document.getElementById('bird-canvas');
const matrixCanvas = document.getElementById('matrix-canvas');
const transCanvas  = document.getElementById('trans-canvas');
const netCanvas    = document.getElementById('net-canvas');
const logoCanvas   = document.getElementById('logo-canvas');

const bgCtx     = bgCanvas.getContext('2d');
const birdCtx   = birdCanvas.getContext('2d');
const matrixCtx = matrixCanvas.getContext('2d');
const transCtx  = transCanvas.getContext('2d');
const netCtx    = netCanvas.getContext('2d');
const logoCtx   = logoCanvas.getContext('2d');

const transOverlay = document.getElementById('trans-overlay');
const transLabel   = document.getElementById('trans-label');

function resizeAllCanvases() {
  [bgCanvas, birdCanvas, matrixCanvas, transCanvas].forEach(c => {
    c.width = innerWidth; c.height = innerHeight;
  });
  // net-canvas: ajustar resolución interna al tamaño visual
  netCanvas.width = netCanvas.offsetWidth || 700;
}
resizeAllCanvases();
window.addEventListener('resize', resizeAllCanvases);

// ═══════════════════════════════════════════════════════
//  STARS
// ═══════════════════════════════════════════════════════
const stars = Array.from({ length: 300 }, () => ({
  x: Math.random(), y: Math.random(),
  r: Math.random() * 1.4 + 0.3,
  a: Math.random() * 0.5 + 0.08,
  da: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1)
}));

(function animStars() {
  requestAnimationFrame(animStars);
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  if (!state.showStars) return;
  stars.forEach(s => {
    s.a += s.da;
    if (s.a > 0.75 || s.a < 0.05) s.da *= -1;
    bgCtx.beginPath();
    bgCtx.arc(s.x * bgCanvas.width, s.y * bgCanvas.height, s.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(255,255,255,${s.a})`;
    bgCtx.fill();
  });
})();

// ═══════════════════════════════════════════════════════
//  ICE PARTICLES
// ═══════════════════════════════════════════════════════
const logoTextEl = document.getElementById('logo-text-el');
if (logoTextEl) {
  logoTextEl.addEventListener('mousemove', e => {
    for (let i = 0; i < 3; i++) {
      state.iceParticles.push({
        x: e.clientX, y: e.clientY,
        vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 3 - 1,
        life: 1, r: Math.random() * 3 + 1
      });
    }
  });
}

(function animIce() {
  requestAnimationFrame(animIce);
  if (!state.iceParticles.length) return;
  bgCtx.save();
  for (let i = state.iceParticles.length - 1; i >= 0; i--) {
    const p = state.iceParticles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.025;
    if (p.life <= 0) { state.iceParticles.splice(i, 1); continue; }
    bgCtx.globalAlpha = p.life * 0.8;
    bgCtx.fillStyle = `hsl(${190 + Math.random() * 30},80%,${70 + Math.random() * 20}%)`;
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    bgCtx.fill();
  }
  bgCtx.restore();
})();

// ═══════════════════════════════════════════════════════
//  CUSTOM CURSOR
// ═══════════════════════════════════════════════════════
const cursorDot  = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

// Solo activar en dispositivos con puntero fino (no táctil)
if (window.matchMedia('(pointer: fine)').matches) {
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (cursorDot) { cursorDot.style.left = mx + 'px'; cursorDot.style.top = my + 'px'; }
  });
  document.addEventListener('mousedown', () => {
    if (cursorRing) { cursorRing.style.width = cursorRing.style.height = '24px'; }
  });
  document.addEventListener('mouseup', () => {
    if (cursorRing) { cursorRing.style.width = cursorRing.style.height = '36px'; }
  });
  (function animCursor() {
    rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
    if (cursorRing) { cursorRing.style.left = rx + 'px'; cursorRing.style.top = ry + 'px'; }
    requestAnimationFrame(animCursor);
  })();
}

// ═══════════════════════════════════════════════════════
//  BIRDS
// ═══════════════════════════════════════════════════════
function makeFlock(n, x, y, vx, vy, sz, col) {
  return {
    x, y, vx, vy, sz, col, wt: 0,
    members: Array.from({ length: n }, (_, i) => ({
      ox: -(i + 1) * (sz * 2.5 + Math.random() * 5),
      oy: (i % 2 ? 1 : -1) * (i + 1) * sz * 1.5 + (Math.random() - 0.5) * 7,
      ph: Math.random() * Math.PI * 2, ps: 0.07 + Math.random() * 0.04
    }))
  };
}

function drawBird(ctx, x, y, wing, sz, col) {
  ctx.beginPath();
  ctx.moveTo(x - sz, y + wing * sz * 0.55);
  ctx.quadraticCurveTo(x, y - wing * sz, x + sz, y + wing * sz * 0.55);
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.8, sz * 0.55);
  ctx.lineCap = 'round'; ctx.stroke();
}

function animBirds() {
  if (!state.birdsOn) return;
  requestAnimationFrame(animBirds);
  birdCtx.clearRect(0, 0, birdCanvas.width, birdCanvas.height);
  state.flocks.forEach(f => {
    f.wt += 0.065; f.x += f.vx;
    f.y += f.vy + Math.sin(f.wt * 0.35) * 0.18; f.vy *= 0.999;
    if (Math.random() < 0.008) f.vy += (Math.random() - 0.5) * 0.12;
    if (f.x > birdCanvas.width + 150) {
      f.x = -80; f.y = 55 + Math.random() * (birdCanvas.height * 0.42);
      f.vx = 0.5 + Math.random() * 0.65; f.vy = (Math.random() - 0.5) * 0.3;
    }
    const wl = Math.sin(f.wt) * 0.55;
    drawBird(birdCtx, f.x, f.y, wl, f.sz, f.col);
    f.members.forEach(m => {
      m.ph += m.ps;
      drawBird(birdCtx, f.x + m.ox, f.y + m.oy, Math.sin(f.wt + m.ph) * 0.55, f.sz, f.col);
    });
  });
  if (Math.random() < 0.0006 && state.flocks.length < 7) {
    state.flocks.push(makeFlock(
      2 + Math.floor(Math.random() * 4), -70,
      70 + Math.random() * (birdCanvas.height * 0.38),
      0.52 + Math.random() * 0.5, (Math.random() - 0.5) * 0.22,
      2.2 + Math.random() * 1.6, 'rgba(18,10,4,.7)'
    ));
  }
}

function startBirds() {
  if (state.birdsOn) return;
  state.birdsOn = true;
  state.flocks = [
    makeFlock(7, -130, 85,  0.88, -0.07, 3.0, 'rgba(14,8,3,.78)'),
    makeFlock(4, -320, 145, 0.62,  0.06, 2.2, 'rgba(18,10,5,.62)'),
    makeFlock(9, -220, 62,  0.74,  0.03, 2.6, 'rgba(11,6,2,.70)')
  ];
  animBirds();
}
function stopBirds() {
  state.birdsOn = false;
  birdCtx.clearRect(0, 0, birdCanvas.width, birdCanvas.height);
}

// ═══════════════════════════════════════════════════════
//  MATRIX
// ═══════════════════════════════════════════════════════
function initMatrix() {
  matrixCanvas.width = innerWidth; matrixCanvas.height = innerHeight;
  const cols  = Math.floor(innerWidth / 14);
  const drops = Array.from({ length: cols }, () => Math.random() * matrixCanvas.height / 14 | 0);
  const chars = 'アイウエオカキクケABCDEFGHIJKLMNOP0123456789@#$%&*';
  state.matrixOn = true;
  (function frame() {
    if (!state.matrixOn) return;
    matrixCtx.fillStyle = 'rgba(0,0,0,.045)';
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    matrixCtx.font = '13px monospace';
    drops.forEach((y, i) => {
      matrixCtx.fillStyle = Math.random() > 0.96
        ? '#e0ffe0'
        : `rgba(0,255,65,${Math.random() * 0.65 + 0.35})`;
      matrixCtx.fillText(chars[Math.random() * chars.length | 0], i * 14, y * 14);
      if (y * 14 > matrixCanvas.height && Math.random() > 0.972) drops[i] = 0;
      drops[i]++;
    });
    state.matrixRAF = requestAnimationFrame(frame);
  })();
}

function stopMatrix() {
  state.matrixOn = false;
  if (state.matrixRAF) cancelAnimationFrame(state.matrixRAF);
  matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
}

// ═══════════════════════════════════════════════════════
//  NETWORK MAP
// ═══════════════════════════════════════════════════════
const NODE_LABELS = ['10.0.0.1','192.168.1.1','FIREWALL','SOC','ATTACKER','DB-SRV','WEB-SRV','DNS','IDS','C2'];
const NODE_COLORS = { FIREWALL:'#ff4400', ATTACKER:'#ff0000', C2:'#ff2020', SOC:'#00aaff', IDS:'#ffaa00' };

function initNet() {
  const w = netCanvas.width || netCanvas.offsetWidth || 700;
  const h = netCanvas.height || 200;
  state.netNodes = NODE_LABELS.map(label => ({
    label, r: label === 'FIREWALL' ? 10 : label === 'ATTACKER' ? 9 : 7,
    color: NODE_COLORS[label] || '#00ff41',
    x: 60 + Math.random() * (w - 120), y: 30 + Math.random() * (h - 60),
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    pulse: Math.random() * Math.PI * 2
  }));
  state.netEdges = [];
  for (let i = 0; i < state.netNodes.length; i++)
    for (let j = i + 1; j < state.netNodes.length; j++)
      if (Math.random() < 0.35) state.netEdges.push({ a: i, b: j, packets: [] });

  setInterval(() => {
    if (!state.netOn) return;
    const e = state.netEdges[Math.floor(Math.random() * state.netEdges.length)];
    if (e) e.packets.push({
      t: 0, speed: 0.012 + Math.random() * 0.01,
      rev: Math.random() > 0.5,
      color: Math.random() > 0.7 ? '#ff3333' : '#00ff41'
    });
  }, 600);
  state.netOn = true;
  animNet();
}

function stopNet() {
  state.netOn = false;
  if (state.netRAF) cancelAnimationFrame(state.netRAF);
}

function animNet() {
  if (!state.netOn) return;
  const w = netCanvas.width, h = netCanvas.height;
  netCtx.clearRect(0, 0, w, h);
  state.netEdges.forEach(e => {
    const a = state.netNodes[e.a], b = state.netNodes[e.b];
    netCtx.beginPath(); netCtx.moveTo(a.x, a.y); netCtx.lineTo(b.x, b.y);
    netCtx.strokeStyle = 'rgba(0,255,65,0.12)'; netCtx.lineWidth = 0.8; netCtx.stroke();
    for (let i = e.packets.length - 1; i >= 0; i--) {
      const pk = e.packets[i]; pk.t += pk.speed;
      if (pk.t > 1) { e.packets.splice(i, 1); continue; }
      const t = pk.rev ? 1 - pk.t : pk.t;
      netCtx.beginPath();
      netCtx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2.5, 0, Math.PI * 2);
      netCtx.fillStyle = pk.color; netCtx.fill();
    }
  });
  state.netNodes.forEach(n => {
    n.pulse += 0.05; n.x += n.vx; n.y += n.vy;
    if (n.x < n.r || n.x > w - n.r) n.vx *= -1;
    if (n.y < n.r || n.y > h - n.r) n.vy *= -1;
    const grd = netCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
    grd.addColorStop(0, n.color.replace('rgb(', 'rgba(').replace(')', ',0.3)'));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    netCtx.fillStyle = grd; netCtx.beginPath();
    netCtx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2); netCtx.fill();
    netCtx.beginPath();
    netCtx.arc(n.x, n.y, n.r + Math.sin(n.pulse) * 0.8, 0, Math.PI * 2);
    netCtx.fillStyle = n.color; netCtx.fill();
    netCtx.fillStyle = 'rgba(0,255,65,0.75)'; netCtx.font = '9px monospace';
    netCtx.textAlign = 'center'; netCtx.fillText(n.label, n.x, n.y + n.r + 11);
  });
  state.netRAF = requestAnimationFrame(animNet);
}

// ═══════════════════════════════════════════════════════
//  TERMINAL TYPING
// ═══════════════════════════════════════════════════════
const TERM_LINES = [
  { t:'cmd', v:'icesmoke@kali:~$ whoami' },
  { t:'out', v:'> icesmoke — security researcher & photographer' },
  { t:'gap' },
  { t:'cmd', v:'icesmoke@kali:~$ cat /etc/skills' },
  { t:'ok',  v:'> [✓] Penetration Testing — OSCP' },
  { t:'ok',  v:'> [✓] Red Team Operations' },
  { t:'ok',  v:'> [✓] Blue Team / SOC Analyst' },
  { t:'ok',  v:'> [✓] Digital Forensics & IR' },
  { t:'ok',  v:'> [✓] OSINT & Threat Intelligence' },
  { t:'gap' },
  { t:'cmd', v:'icesmoke@kali:~$ _' }
];
const TERM_COLORS = { cmd:'#82aaff', out:'rgba(0,255,65,.85)', ok:'#c3e88d' };

function startTyping() {
  const el = document.getElementById('typed-out');
  if (!el) return;
  el.innerHTML = ''; let html = '', li = 0, ci = 0;
  if (state.termTid) clearTimeout(state.termTid);
  function tick() {
    if (li >= TERM_LINES.length) { el.innerHTML = html + '<span class="cursor-blink"></span>'; return; }
    const ln = TERM_LINES[li];
    if (ln.t === 'gap') { html += '<br>'; li++; ci = 0; state.termTid = setTimeout(tick, 110); return; }
    if (ci === 0) html += `<span style="color:${TERM_COLORS[ln.t]}">`;
    if (ci < ln.v.length) {
      const ch = ln.v[ci]; html += ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch; ci++;
    } else {
      html += '</span><br>'; li++; ci = 0;
      el.innerHTML = html + '<span class="cursor-blink"></span>';
      state.termTid = setTimeout(tick, 180); return;
    }
    el.innerHTML = html + '<span class="cursor-blink"></span>';
    state.termTid = setTimeout(tick, li < 2 ? 44 : 20);
  }
  tick();
}

// ═══════════════════════════════════════════════════════
//  LOGO
// ═══════════════════════════════════════════════════════
const LOGO_CX = 238, LOGO_CY = 100, LOGO_R = 72, LOGO_RI = 50;
const LOGO_CODE = [
  { c:'#c792ea', t:'const icesmoke = {' },
  { c:'#546e7a', t:'  // hexágono exterior...' },
  { c:'#82aaff', t:'  drawHex(238,100,72,-90)' },
  { c:'#546e7a', t:'  // hexágono interior 30°' },
  { c:'#82aaff', t:'  drawHex(238,100,50,-60)' },
  { c:'#c3e88d', t:'  connectVertices(o,i)' },
  { c:'#c3e88d', t:'  crossLines([0,3],[1,4],[2,5])' },
  { c:'#f78c6c', t:'  text("icesmoke",238,92)' },
  { c:'#f78c6c', t:'  text("DEV",238,112,"#00d4ff")' },
  { c:'#c3e88d', t:'  vertices.forEach(dot)' },
  { c:'#c792ea', t:'} // ✓ 0 errores' }
];
const LOGO_PH = [0, 0.12, 0.24, 0.36, 0.48, 0.58, 0.68, 0.78, 0.87, 1];

function hexPts(cx, cy, r, rot = 0) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 + rot) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function drawLogo(p) {
  logoCtx.clearRect(0, 0, logoCanvas.width, logoCanvas.height);
  p = Math.min(1, Math.max(0, p));
  const oh = hexPts(LOGO_CX, LOGO_CY, LOGO_R, -90);
  const ih = hexPts(LOGO_CX, LOGO_CY, LOGO_RI, -60);
  const g = logoCtx.createRadialGradient(LOGO_CX, LOGO_CY, 8, LOGO_CX, LOGO_CY, LOGO_R + 22);
  g.addColorStop(0, 'rgba(0,180,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  logoCtx.fillStyle = g; logoCtx.fillRect(0, 0, logoCanvas.width, logoCanvas.height);

  if (p > LOGO_PH[0]) {
    const t = Math.min(1, (p - LOGO_PH[0]) / (LOGO_PH[1] - LOGO_PH[0]));
    logoCtx.strokeStyle = 'rgba(0,212,255,.9)'; logoCtx.lineWidth = 2.2; logoCtx.setLineDash([]); logoCtx.beginPath();
    for (let i = 0; i < 6; i++) { if (i/6 > t) break; const np = Math.min(1,t*6-i); const [ax,ay]=oh[i],[bx,by]=oh[(i+1)%6]; if(!i)logoCtx.moveTo(ax,ay); logoCtx.lineTo(ax+(bx-ax)*np,ay+(by-ay)*np); } logoCtx.stroke();
  }
  if (p > LOGO_PH[1]) {
    const t = Math.min(1, (p - LOGO_PH[1]) / (LOGO_PH[2] - LOGO_PH[1]));
    logoCtx.strokeStyle = 'rgba(0,180,255,.6)'; logoCtx.lineWidth = 1.5; logoCtx.beginPath();
    for (let i = 0; i < 6; i++) { if (i/6 > t) break; const np = Math.min(1,t*6-i); const [ax,ay]=ih[i],[bx,by]=ih[(i+1)%6]; if(!i)logoCtx.moveTo(ax,ay); logoCtx.lineTo(ax+(bx-ax)*np,ay+(by-ay)*np); } logoCtx.stroke();
  }
  if (p > LOGO_PH[2]) {
    const t = Math.min(1, (p - LOGO_PH[2]) / (LOGO_PH[3] - LOGO_PH[2]));
    logoCtx.strokeStyle = 'rgba(100,200,255,.28)'; logoCtx.lineWidth = 1; logoCtx.setLineDash([3,3]);
    for (let i = 0; i < 6; i++) { if (i/6 > t) break; const lt=Math.min(1,t*6-i); logoCtx.beginPath(); logoCtx.moveTo(oh[i][0],oh[i][1]); logoCtx.lineTo(oh[i][0]+(ih[i][0]-oh[i][0])*lt,oh[i][1]+(ih[i][1]-oh[i][1])*lt); logoCtx.stroke(); } logoCtx.setLineDash([]);
  }
  if (p > LOGO_PH[3]) {
    const t = Math.min(1, (p - LOGO_PH[3]) / (LOGO_PH[4] - LOGO_PH[3]));
    logoCtx.strokeStyle = 'rgba(0,200,255,.18)'; logoCtx.lineWidth = 1; logoCtx.setLineDash([2,4]);
    [[0,3],[1,4],[2,5]].forEach(([a,b],idx) => { if(idx/3>t)return; const lt=Math.min(1,t*3-idx); logoCtx.beginPath(); logoCtx.moveTo(oh[a][0],oh[a][1]); logoCtx.lineTo(oh[a][0]+(oh[b][0]-oh[a][0])*lt,oh[a][1]+(oh[b][1]-oh[a][1])*lt); logoCtx.stroke(); }); logoCtx.setLineDash([]);
  }
  logoCtx.textAlign = 'center'; logoCtx.textBaseline = 'middle';
  if (p > LOGO_PH[5]) { const t=Math.min(1,(p-LOGO_PH[5])/(LOGO_PH[6]-LOGO_PH[5])); logoCtx.globalAlpha=t; logoCtx.fillStyle='#fff'; logoCtx.font='bold 16px "Courier New",monospace'; logoCtx.fillText('icesmoke',LOGO_CX,LOGO_CY-8); logoCtx.globalAlpha=1; }
  if (p > LOGO_PH[6]) { const t=Math.min(1,(p-LOGO_PH[6])/(LOGO_PH[7]-LOGO_PH[6])); logoCtx.globalAlpha=t; logoCtx.fillStyle='rgba(0,212,255,.95)'; logoCtx.font='bold 11px "Courier New",monospace'; logoCtx.fillText('DEV',LOGO_CX,LOGO_CY+12); logoCtx.globalAlpha=1; }
  if (p > LOGO_PH[7]) { const t=Math.min(1,(p-LOGO_PH[7])/(LOGO_PH[8]-LOGO_PH[7])); oh.slice(0,Math.ceil(t*6)).forEach((pt,i)=>{const dt=Math.min(1,t*6-i);logoCtx.beginPath();logoCtx.arc(pt[0],pt[1],3*dt,0,Math.PI*2);logoCtx.fillStyle='rgba(0,212,255,.9)';logoCtx.fill();}); }
  if (p > LOGO_PH[8]) { const t=Math.min(1,(p-LOGO_PH[8])/(LOGO_PH[9]-LOGO_PH[8])); ih.slice(0,Math.ceil(t*6)).forEach((pt,i)=>{const dt=Math.min(1,t*6-i);logoCtx.beginPath();logoCtx.arc(pt[0],pt[1],2*dt,0,Math.PI*2);logoCtx.fillStyle='rgba(100,200,255,.7)';logoCtx.fill();}); }
  if (p >= 1) { logoCtx.strokeStyle='rgba(0,180,255,0.12)'; logoCtx.lineWidth=8; logoCtx.beginPath(); logoCtx.arc(LOGO_CX,LOGO_CY,LOGO_R+6,0,Math.PI*2); logoCtx.stroke(); }
}

function replayLogo() {
  state.logoProg = 0; state.logoLine = 0; state.logoHtml = '';
  const codeEl = document.getElementById('logo-code-display');
  const statEl = document.getElementById('logo-status');
  if (codeEl) codeEl.innerHTML = '';
  if (statEl) { statEl.textContent = 'Compilando...'; statEl.style.color = '#444'; }
  if (state.logoRAF) cancelAnimationFrame(state.logoRAF);
  (function anim() {
    if (state.logoProg < 1) {
      state.logoProg += 0.007; drawLogo(state.logoProg);
      const idx = Math.floor(state.logoProg * LOGO_CODE.length);
      if (idx > state.logoLine && state.logoLine < LOGO_CODE.length) {
        const l = LOGO_CODE[state.logoLine];
        state.logoHtml += `<span style="color:${l.c}">${l.t}</span>\n`;
        if (codeEl) { codeEl.innerHTML = state.logoHtml + '<span style="color:#00ff41;opacity:.6">█</span>'; codeEl.scrollTop = codeEl.scrollHeight; }
        state.logoLine++;
      }
      state.logoRAF = requestAnimationFrame(anim);
    } else {
      drawLogo(1);
      if (statEl) { statEl.textContent = '✓ Build OK — 0 errores'; statEl.style.color = '#007700'; }
    }
  })();
}

// ═══════════════════════════════════════════════════════
//  SMOKE TRANSITION — máx 1 segundo
// ═══════════════════════════════════════════════════════
const smokeParticles = [];

function spawnSmoke(W, H) {
  smokeParticles.length = 0;
  const count = Math.max(20, Math.floor(W / 18));
  for (let i = 0; i < count; i++) {
    smokeParticles.push({
      x:     Math.random() * W,
      y:     H + 10 + Math.random() * 40,
      r:     55 + Math.random() * 85,
      vx:    (Math.random() - 0.5) * 1.2,
      vy:    -(2.8 + Math.random() * 3.8),
      a:     0,
      ta:    0.16 + Math.random() * 0.24,
      rot:   Math.random() * Math.PI * 2,
      vr:    (Math.random() - 0.5) * 0.018,
      phase: Math.random(),
    });
  }
}

function updateSmoke() {
  smokeParticles.forEach(p => {
    p.x   += p.vx;
    p.y   += p.vy;
    p.vy  *= 0.984;
    p.vx  += (Math.random() - 0.5) * 0.09;
    p.r   += 1.1;
    p.rot += p.vr;
    p.a    = Math.min(p.ta, p.a + 0.048);
  });
}

function drawSmoke(progress, W, H) {
  transCtx.save();
  smokeParticles.forEach(p => {
    let alpha;
    if (progress <= 1) {
      alpha = p.a * Math.min(1, progress * 2.8);
    } else {
      alpha = p.a * Math.max(0, 1 - (progress - 1) * 2.8);
    }
    if (alpha <= 0.004) return;

    transCtx.save();
    transCtx.translate(p.x, p.y);
    transCtx.rotate(p.rot);

    const hue = 200 + Math.sin(p.phase + progress * 2) * 18;
    const grd = transCtx.createRadialGradient(0, 0, 0, 0, 0, p.r);
    grd.addColorStop(0,    `hsla(${hue}, 8%, 52%, ${alpha * 0.9})`);
    grd.addColorStop(0.38, `hsla(${hue}, 6%, 36%, ${alpha * 0.6})`);
    grd.addColorStop(0.72, `hsla(${hue}, 5%, 20%, ${alpha * 0.28})`);
    grd.addColorStop(1,    `hsla(${hue}, 4%, 8%, 0)`);

    transCtx.beginPath();
    transCtx.ellipse(0, 0, p.r, p.r * 0.7, 0, 0, Math.PI * 2);
    transCtx.fillStyle = grd;
    transCtx.fill();
    transCtx.restore();
  });
  transCtx.restore();
}

function runTransition(targetName, callback) {
  if (state.transRunning) return;
  state.transRunning = true;

  transCanvas.width  = innerWidth;
  transCanvas.height = innerHeight;
  const W = transCanvas.width, H = transCanvas.height;

  transOverlay.style.opacity       = '1';
  transOverlay.style.pointerEvents = 'all';

  // Ocultar label (no lo usamos en la transición de humo)
  if (transLabel) transLabel.style.color = 'rgba(255,255,255,0)';

  spawnSmoke(W, H);

  // Timing: 1000ms total
  // 0–350ms  → humo sube y cubre        (progress 0→1)
  // 350–650ms → pantalla cubierta        (progress = 1)
  // 650–1000ms → humo se disipa          (progress 1→2)
  const T_COVER = 350;
  const T_HOLD  = 300;
  const T_RISE  = 350;
  const TOTAL   = T_COVER + T_HOLD + T_RISE; // 1000ms

  let start  = null;
  let cbDone = false;

  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t) * t; }

  function frame(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;

    transCtx.clearRect(0, 0, W, H);
    updateSmoke();

    let progress;

    if (elapsed < T_COVER) {
      progress = easeInOut(elapsed / T_COVER);
      // Lanzar callback cuando el humo lleva ~300ms (casi opaco)
      if (!cbDone && elapsed >= 300) { cbDone = true; callback(); }

    } else if (elapsed < T_COVER + T_HOLD) {
      progress = 1;
      if (!cbDone) { cbDone = true; callback(); }

    } else {
      const rElapsed = elapsed - T_COVER - T_HOLD;
      progress = 1 + easeInOut(Math.min(1, rElapsed / T_RISE));
    }

    drawSmoke(progress, W, H);

    if (elapsed < TOTAL) {
      requestAnimationFrame(frame);
    } else {
      transCtx.clearRect(0, 0, W, H);
      transOverlay.style.opacity       = '0';
      transOverlay.style.pointerEvents = 'none';
      smokeParticles.length            = 0;
      state.transRunning               = false;
    }
  }

  requestAnimationFrame(frame);
}

// ═══════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════
function goTo(t) {
  // Cerrar menú móvil si está abierto
  const mobileMenu = document.getElementById('mobile-menu');
  const hamBtn     = document.getElementById('ham-btn');
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamBtn)     hamBtn.classList.remove('open');

  runTransition(t, () => {
    if (state.currentSection === 'cyber') { stopMatrix(); stopNet(); }
    if (state.currentSection === 'photo') {
      stopBirds();
      const ps = document.getElementById('photo-section');
      if (ps) ps.removeEventListener('scroll', onPhotoScroll);
    }
    state.showStars = (t === 'landing');
    const landing = document.getElementById('landing');
    if (landing) landing.classList.toggle('hidden', t !== 'landing');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    if (t !== 'landing') {
      const sec = document.getElementById(t === 'win95' ? 'win95-section' : `${t}-section`);
      if (sec) sec.classList.add('active');
      if (t === 'cyber') setTimeout(() => { initMatrix(); startTyping(); initNet(); }, 150);
      if (t === 'photo') {
        const ps = document.getElementById('photo-section');
        if (ps) ps.addEventListener('scroll', onPhotoScroll);
        setTimeout(startBirds, 700);
      }
      if (t === 'win95') updateWinTime();
    }
    state.currentSection = t;
  });
}

function onPhotoScroll(e) {
  const el = e.target;
  const p  = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
  const fh = document.getElementById('hillfar');
  const nh = document.getElementById('hillnear');
  if (fh) fh.setAttribute('transform', `translate(0,${p * -42})`);
  if (nh) nh.setAttribute('transform', `translate(0,${p * -88})`);
}

// Menú hamburguesa
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('ham-btn');
  if (menu) menu.classList.toggle('open');
  if (btn)  btn.classList.toggle('open');
}

// ═══════════════════════════════════════════════════════
//  WIN95
// ═══════════════════════════════════════════════════════
const WIN_NAMES = {
  logo:'Mi Logo', about:'Sobre mí', projects:'Proyectos',
  tech:'Tecnologías', contact:'Contacto', browser:'Proyectos Web'
};

function startDrag(e, id) {
  // No arrastrar en móvil
  if (window.innerWidth <= 768) return;
  state.dragging = id;
  const w = document.getElementById(id), r = w.getBoundingClientRect();
  state.dragOX = e.clientX - r.left; state.dragOY = e.clientY - r.top;
  w.style.zIndex = ++state.zC;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
}
function onDrag(e) {
  if (!state.dragging) return;
  const w  = document.getElementById(state.dragging);
  const dr = document.getElementById('desktop').getBoundingClientRect();
  w.style.left = Math.max(0, Math.min(dr.width  - w.offsetWidth,  e.clientX - dr.left - state.dragOX)) + 'px';
  w.style.top  = Math.max(0, Math.min(dr.height - w.offsetHeight, e.clientY - dr.top  - state.dragOY)) + 'px';
}
function endDrag() {
  state.dragging = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
}

function openWin(n) {
  const w = document.getElementById(`win-${n}`);
  if (!w) return;
  w.style.display = 'block';
  w.style.zIndex  = ++state.zC;
  if (n === 'logo') setTimeout(replayLogo, 150);
  updateTaskbar();
}
function closeWin(id)    { const w = document.getElementById(id); if(w) w.style.display = 'none'; updateTaskbar(); }
function minimizeWin(id) { const w = document.getElementById(id); if(w) w.style.display = 'none'; updateTaskbar(); }

function updateTaskbar() {
  const t = document.getElementById('taskbar-tasks');
  if (!t) return;
  t.innerHTML = '';
  Object.keys(WIN_NAMES).forEach(n => {
    const w = document.getElementById(`win-${n}`);
    if (w && w.style.display !== 'none') {
      const b = document.createElement('button');
      b.className = 'taskbar-task active';
      b.textContent = WIN_NAMES[n];
      b.onclick = () => minimizeWin(`win-${n}`);
      t.appendChild(b);
    }
  });
}
setInterval(updateTaskbar, 600);

function toggleStart() {
  document.getElementById('start-menu').classList.toggle('visible');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.start-btn') && !e.target.closest('.start-menu'))
    document.getElementById('start-menu').classList.remove('visible');
});

function updateWinTime() {
  const t = document.getElementById('win-time');
  if (!t) return;
  const d = new Date();
  t.textContent = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}
setInterval(updateWinTime, 15000);

// ═══════════════════════════════════════════════════════
//  POLAROIDS
// ═══════════════════════════════════════════════════════
const POLAROID_DATA = [
  { emoji:'🦌', label:'Ciervo · Pirineos', color:'#1a2e0a,#3d5a28', rot:-8, top:10,  left:0,   w:110 },
  { emoji:'🌅', label:'Amanecer · Sierra', color:'#3a1a0a,#7a4a18', rot: 5, top:30,  left:100, w:120 },
  { emoji:'🦊', label:'Zorro · Nov 24',    color:'#2a1a08,#5a3a18', rot:-3, top: 5,  left:215, w:105 },
  { emoji:'🌲', label:'Bosque · Cuenca',   color:'#0a1a0a,#1a3a1a', rot: 9, top:35,  left:310, w:115 },
  { emoji:'🦋', label:'Macro · Primavera', color:'#1a0a2a,#3a1a5a', rot:-6, top:15,  left:420, w:108 },
];

function renderPolaroids() {
  const area = document.getElementById('polaroids-area');
  if (!area) return;
  POLAROID_DATA.forEach(p => {
    const d = document.createElement('div');
    d.className = 'polaroid';
    d.style.cssText = `transform:rotate(${p.rot}deg);top:${p.top}px;left:${p.left}px;width:${p.w}px`;
    d.innerHTML = `<div class="polaroid-img" style="background:linear-gradient(135deg,#${p.color})">${p.emoji}</div><div class="polaroid-label">${p.label}</div>`;
    area.appendChild(d);
  });
}

// ═══════════════════════════════════════════════════════
//  RENDER DESDE JSON
// ═══════════════════════════════════════════════════════
function renderSite() {
  const d = state.site;
  if (!d) return;
  const $   = id => document.getElementById(id);
  const set = (id, val, prop = 'textContent') => { const el = $(id); if (el) el[prop] = val; };

  const h1 = $('site-name-h1');
  if (h1) h1.innerHTML = `<strong>${d.nombre}</strong>`;

  const le = $('logo-text-el');
  if (le) {
    const cut = d.nombre.length > 4 ? 4 : Math.ceil(d.nombre.length / 2);
    le.innerHTML = `${d.nombre.slice(0, cut)}<span>${d.nombre.slice(cut)}</span>`;
  }
  document.title = `${d.nombre} — Portfolio`;

  set('site-bio',      d.bio);
  set('footer-tagline', d.tagline);

  const skillsEl = $('site-skills');
  if (skillsEl) skillsEl.innerHTML = (d.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('');

  const statsEl = $('site-stats');
  if (statsEl) statsEl.innerHTML = (d.stats || []).map(s =>
    `<div class="stat"><div class="stat-num">${s.num}</div><div class="stat-label">${s.label}</div></div>`
  ).join('');

  set('portal-photo-desc', d.portales?.foto  || '');
  set('portal-cyber-desc', d.portales?.cyber || '');
  set('portal-code-desc',  d.portales?.code  || '');

  const gear = $('photo-gear');
  if (gear) gear.innerHTML = (d.equipo || []).map(g => `<span class="notice-tag">${g}</span>`).join('');

  set('photo-quote', d.cita ? `"${d.cita}"` : '');

  const contactEl = $('win-contact-items');
  if (contactEl) contactEl.innerHTML = (d.contacto || []).map(c =>
    `<div class="tech-item">${c.icono} ${c.texto}</div>`
  ).join('');
}

// ── Paleta de categorías ──
const CAT_PALETTE = {
  Fauna:   { bg:'linear-gradient(135deg,#1a2e0a,#3d5a28)', accent:'#5aaa38' },
  Paisaje: { bg:'linear-gradient(135deg,#0a1a2a,#1a3a5a)', accent:'#3a8aaa' },
  Macro:   { bg:'linear-gradient(135deg,#2a1a0a,#5a3a18)', accent:'#aa7a30' },
};
function getCatStyle(cat) {
  if (!CAT_PALETTE[cat]) {
    const hue = (Object.keys(CAT_PALETTE).length * 67) % 360;
    CAT_PALETTE[cat] = {
      bg: `linear-gradient(135deg,hsl(${hue},40%,10%),hsl(${hue},40%,22%))`,
      accent: `hsl(${hue},60%,55%)`
    };
  }
  return CAT_PALETTE[cat];
}
function getCategories() { return ['Todas', ...new Set(state.fotos.map(f => f.categoria))]; }

// ── Landing strip ──
function renderLandingStrip() {
  const strip = document.getElementById('landing-photo-strip');
  if (!strip) return;
  const frag = document.createDocumentFragment();
  state.fotos.slice(-8).forEach(foto => {
    const col  = getCatStyle(foto.categoria);
    const item = document.createElement('div');
    item.className = 'photo-item';
    item.onclick   = () => goTo('photo');
    item.innerHTML = (foto.url
      ? `<img src="${foto.url}" alt="${foto.nombre}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="photo-item-inner" style="background:${col.bg};display:none">${foto.emoji||'📷'}</div>`
      : `<div class="photo-item-inner" style="background:${col.bg}">${foto.emoji||'📷'}</div>`)
      + `<div class="photo-overlay"><div class="red-bar"></div><h4>${foto.nombre}</h4><span>${foto.categoria}</span></div>`;
    frag.appendChild(item);
  });
  const more = document.createElement('div');
  more.className = 'photo-more';
  more.onclick   = () => goTo('photo');
  more.innerHTML = '<span>→</span><span>Ver galería completa</span>';
  frag.appendChild(more);
  strip.innerHTML = '';
  strip.appendChild(frag);
}

// ── Filtros ──
function buildPhotoFilters() {
  const container = document.getElementById('photo-filters');
  if (!container) return;
  const frag = document.createDocumentFragment();
  getCategories().forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.className   = 'filter-btn' + (cat === state.activeFilter ? ' active' : '');
    btn.onclick = () => { state.activeFilter = cat; buildPhotoFilters(); renderPhotoGallery(); };
    frag.appendChild(btn);
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

// ── Galería con IntersectionObserver ──
let galleryObserver = null;
// Estado para el lightbox con navegación
let currentPhotoList = [];
let currentPhotoIdx  = 0;

function renderPhotoGallery() {
  const grid = document.getElementById('photo-gallery-grid');
  if (!grid) return;
  if (galleryObserver) galleryObserver.disconnect();

  const fotos = state.activeFilter === 'Todas'
    ? state.fotos
    : state.fotos.filter(f => f.categoria === state.activeFilter);

  currentPhotoList = fotos;

  if (!fotos.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:rgba(255,255,255,0.3);font-size:.85rem">No hay fotos en esta categoría aún.</div>`;
    return;
  }

  galleryObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target.querySelector('img[data-src]');
      if (img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.onload = () => { img.style.opacity = '1'; };
      }
      obs.unobserve(e.target);
    });
  }, { rootMargin: '200px' });

  const frag = document.createDocumentFragment();
  fotos.forEach((foto, idx) => {
    const col  = getCatStyle(foto.categoria);
    const card = document.createElement('div');
    card.className = 'rural-card';
    card.onclick   = () => openPhotoModal(idx);

    const imgHtml = foto.url
      ? `<img data-src="${foto.url}" alt="${foto.nombre}" decoding="async" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;opacity:0;transition:opacity .4s" onerror="this.style.display='none'">`
      : `<span style="position:relative;z-index:1;font-size:3rem">${foto.emoji||'📷'}</span>`;

    card.innerHTML = `
      <div class="rural-card-img" style="aspect-ratio:4/3;background:${col.bg};position:relative;overflow:hidden">
        ${imgHtml}
        <div class="rural-card-info">
          <span style="font-size:.52rem;letter-spacing:.2em;text-transform:uppercase;color:${col.accent};display:block;margin-bottom:.2rem">${foto.categoria}</span>
          <h3>${foto.nombre}</h3>
          <p>${(foto.temas_relacionados||[]).slice(0,3).join(' · ')}</p>
        </div>
      </div>`;

    frag.appendChild(card);
    galleryObserver.observe(card);
  });
  grid.innerHTML = '';
  grid.appendChild(frag);
}

// ── Modal foto con navegación prev/next ──
// Construye el contenido del modal dinámicamente para no depender de IDs fijos en el HTML
function openPhotoModal(idx) {
  currentPhotoIdx = idx;
  const foto = currentPhotoList[idx];
  if (!foto) return;

  const col   = getCatStyle(foto.categoria);
  const modal = document.getElementById('photo-modal');
  if (!modal) return;

  const hasPrev = idx > 0;
  const hasNext = idx < currentPhotoList.length - 1;
  const tags    = (foto.temas_relacionados||[]).map(t => `<span class="photo-tag">#${t}</span>`).join('');
  const imgHtml = foto.url
    ? `<img src="${foto.url}" alt="${foto.nombre}" decoding="async"
        style="width:100%;height:100%;object-fit:contain;max-height:70vh;display:block"
        onerror="this.style.display='none'">`
    : `<span style="font-size:6rem">${foto.emoji||'📷'}</span>`;

  modal.innerHTML = `
    <div class="pm-inner" onclick="event.stopPropagation()">

      <!-- Barra superior -->
      <div class="pm-bar">
        <span class="pm-counter">${idx + 1} / ${currentPhotoList.length}</span>
        <button class="pm-close" onclick="closePhotoModal()">✕</button>
      </div>

      <!-- Imagen -->
      <div class="pm-img" style="background:${col.bg}">${imgHtml}</div>

      <!-- Navegación -->
      <button class="pm-nav pm-prev" onclick="photoModalNav(-1)" ${hasPrev ? '' : 'disabled'}>‹</button>
      <button class="pm-nav pm-next" onclick="photoModalNav(1)"  ${hasNext ? '' : 'disabled'}>›</button>

      <!-- Info -->
      <div class="pm-footer">
        <div class="pm-cat">${foto.categoria}</div>
        <div class="pm-name">${foto.nombre}</div>
        ${foto.descripcion ? `<div class="pm-desc">${foto.descripcion}</div>` : ''}
        ${tags ? `<div class="pm-tags">${tags}</div>` : ''}
      </div>
    </div>`;

  modal.classList.add('open');
}

function photoModalNav(dir) {
  const next = currentPhotoIdx + dir;
  if (next < 0 || next >= currentPhotoList.length) return;
  openPhotoModal(next);
}

function closePhotoModal() {
  const modal = document.getElementById('photo-modal');
  if (modal) modal.classList.remove('open');
}

// Click fuera cierra
const photoModalEl = document.getElementById('photo-modal');
if (photoModalEl) {
  photoModalEl.addEventListener('click', e => { if (e.target === e.currentTarget) closePhotoModal(); });
}

// Teclado: flechas y Escape
document.addEventListener('keydown', e => {
  const modal = document.getElementById('photo-modal');
  if (!modal || !modal.classList.contains('open')) return;
  if (e.key === 'ArrowRight') photoModalNav(1);
  if (e.key === 'ArrowLeft')  photoModalNav(-1);
  if (e.key === 'Escape')     closePhotoModal();
});

// ── Blog ──
function renderBlog() {
  const blogGrid = document.getElementById('blog-grid');
  if (!blogGrid) return;
  blogGrid.innerHTML = state.blog.map((b, i) => `
    <div class="blog-item" onclick="openBlog(${i})">
      <span class="blog-cat">${b.cat}</span>
      <span class="blog-title">${b.titulo}</span>
      <span class="blog-meta">${b.fecha} · ${b.minutos} min</span>
    </div>`).join('');
}

function openBlog(i) {
  const b = state.blog[i]; if (!b) return;
  const catEl   = document.getElementById('modal-cat');
  const titleEl = document.getElementById('modal-title');
  const bodyEl  = document.getElementById('modal-body');
  if (catEl)   catEl.textContent   = b.cat;
  if (titleEl) titleEl.textContent = b.titulo;
  if (bodyEl)  bodyEl.innerHTML    = `<div class="modal-meta">${b.fecha} · ${b.minutos} min lectura</div>${b.cuerpo}`;
  const modal = document.getElementById('blog-modal');
  if (modal) modal.classList.add('open');
}

function closeBlogModal() {
  const modal = document.getElementById('blog-modal');
  if (modal) modal.classList.remove('open');
}

const blogModalEl = document.getElementById('blog-modal');
if (blogModalEl) {
  blogModalEl.addEventListener('click', e => { if (e.target === e.currentTarget) closeBlogModal(); });
}

// ═══════════════════════════════════════════════════════
//  ARRANQUE
// ═══════════════════════════════════════════════════════
async function initSite() {
  try {
    await loadAllData();
  } catch (err) {
    console.error('[icesmoke] Error cargando JSON:', err);
    if (!state.site) {
      state.site = {
        nombre:'icesmoke', bio:'', tagline:'', skills:[], stats:[],
        portales:{ foto:'', cyber:'', code:'' }, equipo:[], contacto:[], cita:''
      };
    }
  }
  renderSite();
  renderBlog();
  renderLandingStrip();
  buildPhotoFilters();
  renderPhotoGallery();
  renderPolaroids();
  preloadImages(state.fotos);
}

initSite();
