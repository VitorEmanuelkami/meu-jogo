// ============================================================
// REINO DEFENSOR - Tower Defense
// ============================================================
(function () {
  'use strict';

  // ---------- Canvas / constantes ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const CELL = 40;
  const COLS = W / CELL;
  const ROWS = H / CELL;
  const MAX_WAVES = 20;
  const MAX_LEVEL = 4;

  const TOWER_TYPES = {
    archer: {
      name: 'Arqueiro', icon: '🏹', cost: 70, desc: 'Rápido • alvo único',
      range: 140, damage: 8, fireRate: 0.55, proj: 'arrow', projSpeed: 560,
      glow: '#ffe9a8',
      upgrade: { damage: 6, range: 12, fireRate: -0.05 }
    },
    cannon: {
      name: 'Canhão', icon: '💣', cost: 130, desc: 'Dano em área • lento',
      range: 150, damage: 26, fireRate: 1.5, proj: 'ball', projSpeed: 330,
      splash: 52, glow: '#ffb057',
      upgrade: { damage: 16, range: 9, fireRate: -0.08, splash: 6 }
    },
    frost: {
      name: 'Gelo', icon: '❄️', cost: 110, desc: 'Congela e desacelera',
      range: 130, damage: 5, fireRate: 0.9, proj: 'shard', projSpeed: 430,
      splash: 46, slow: 0.45, slowDur: 1.4, glow: '#bfefff',
      upgrade: { damage: 4, range: 9, fireRate: -0.05, slow: 0.05, slowDur: 0.15 }
    },
    tesla: {
      name: 'Tesla', icon: '⚡', cost: 200, desc: 'Raio em cadeia (3 alvos)',
      range: 165, damage: 14, fireRate: 1.1, chains: 3, glow: '#d9c6ff',
      upgrade: { damage: 10, range: 9, fireRate: -0.06, chains: 1 }
    }
  };

  const ENEMY_TYPES = {
    slime:  { hp: 26, speed: 52, reward: 7,  radius: 13, color: '#7ce27f', color2: '#3d9142' },
    runner: { hp: 16, speed: 98, reward: 8,  radius: 11, color: '#ffc861', color2: '#c98820' },
    tank:   { hp: 95, speed: 34, reward: 16, radius: 17, color: '#a98ce6', color2: '#6247a3' },
    boss:   { hp: 650, speed: 27, reward: 90, radius: 24, color: '#ff7b7b', color2: '#a52f2f' }
  };

  // ---------- Caminho ----------
  const PATH = [
    { x: -40, y: 80 },  { x: 180, y: 80 },  { x: 180, y: 300 },
    { x: 380, y: 300 }, { x: 380, y: 520 }, { x: 640, y: 520 },
    { x: 640, y: 200 }, { x: 860, y: 200 }, { x: 860, y: 420 },
    { x: 940, y: 420 }
  ];

  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function distToPath(x, y) {
    let best = Infinity;
    for (let i = 0; i < PATH.length - 1; i++) {
      const d = distToSegment(x, y, PATH[i].x, PATH[i].y, PATH[i + 1].x, PATH[i + 1].y);
      if (d < best) best = d;
    }
    return best;
  }

  // ---------- Mapa / células bloqueadas ----------
  const blocked = new Set();
  const cellKey = (c, r) => c + ',' + r;

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      if (distToPath(x, y) < 45) blocked.add(cellKey(c, r));
    }
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(20241108);
  const decorations = [];
  const flowers = [];

  (function generateDecor() {
    let tries = 0;
    while (decorations.length < 20 && tries < 1500) {
      tries++;
      const c = Math.floor(rand() * COLS);
      const r = Math.floor(rand() * ROWS);
      const isEdge = c <= 2 || c >= COLS - 3 || r <= 1 || r >= ROWS - 2;
      if (!isEdge) continue;
      const key = cellKey(c, r);
      if (blocked.has(key)) continue;
      blocked.add(key);
      const roll = rand();
      const kind = roll < 0.6 ? 'tree' : (roll < 0.82 ? 'bush' : 'rock');
      decorations.push({
        x: c * CELL + CELL / 2 + (rand() - 0.5) * 6,
        y: r * CELL + CELL / 2 + (rand() - 0.5) * 6,
        kind, s: 0.85 + rand() * 0.45, seed: rand() * Math.PI * 2
      });
    }

    const palette = ['#f2d06b', '#e88ab0', '#f4f4f4', '#9be8a0', '#c9a7ff'];
    for (let i = 0; i < 34; i++) {
      const x = rand() * W;
      const y = rand() * H;
      if (distToPath(x, y) < 32) continue;
      flowers.push({
        x, y, seed: rand() * Math.PI * 2,
        color: palette[Math.floor(rand() * palette.length)]
      });
    }
  })();

  // ---------- Fundo pré-renderizado ----------
  const bg = document.createElement('canvas');
  bg.width = W;
  bg.height = H;

  (function buildBackground() {
    const b = bg.getContext('2d');
    const r2 = mulberry32(99);

    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3a6b3f');
    g.addColorStop(0.55, '#335f39');
    g.addColorStop(1, '#2b5233');
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);

    // manchas de grama
    for (let i = 0; i < 90; i++) {
      const x = r2() * W, y = r2() * H, rad = 18 + r2() * 70;
      b.fillStyle = r2() < 0.5 ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.03)';
      b.beginPath(); b.arc(x, y, rad, 0, Math.PI * 2); b.fill();
    }

    // textura
    for (let i = 0; i < 3000; i++) {
      const x = r2() * W, y = r2() * H;
      const v = r2();
      b.fillStyle = v < 0.33 ? 'rgba(255,255,255,0.05)'
        : v < 0.66 ? 'rgba(0,0,0,0.06)' : 'rgba(180,255,160,0.045)';
      b.fillRect(x, y, 2, 2);
    }

    // grade sutil de construção
    b.strokeStyle = 'rgba(255,255,255,0.045)';
    b.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      b.beginPath(); b.moveTo(c * CELL + 0.5, 0); b.lineTo(c * CELL + 0.5, H); b.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      b.beginPath(); b.moveTo(0, r * CELL + 0.5); b.lineTo(W, r * CELL + 0.5); b.stroke();
    }

    // caminho
    b.lineCap = 'round';
    b.lineJoin = 'round';
    drawPathLine(b, 56, '#4f4030');
    drawPathLine(b, 48, '#8a7352');
    drawPathLine(b, 36, 'rgba(0,0,0,0.10)');

    // pedrinhas no caminho
    for (let i = 0; i < 220; i++) {
      const seg = Math.floor(r2() * (PATH.length - 1));
      const p1 = PATH[seg], p2 = PATH[seg + 1];
      const t = r2();
      const x = p1.x + (p2.x - p1.x) * t + (r2() - 0.5) * 28;
      const y = p1.y + (p2.y - p1.y) * t + (r2() - 0.5) * 28;
      if (distToPath(x, y) > 20) continue;
      b.fillStyle = r2() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
      b.beginPath();
      b.ellipse(x, y, 1.5 + r2() * 3.5, 1 + r2() * 2.2, r2() * Math.PI, 0, Math.PI * 2);
      b.fill();
    }

    // flores
    for (const f of flowers) {
      b.strokeStyle = 'rgba(40,120,50,0.7)';
      b.lineWidth = 1;
      b.beginPath();
      b.moveTo(f.x, f.y + 2);
      b.lineTo(f.x + Math.sin(f.seed) * 1.5, f.y + 5);
      b.stroke();
      b.fillStyle = f.color;
      for (let k = 0; k < 4; k++) {
        const a = f.seed + k * Math.PI / 2;
        b.beginPath();
        b.arc(f.x + Math.cos(a) * 2.3, f.y + Math.sin(a) * 2.3, 1.6, 0, Math.PI * 2);
        b.fill();
      }
      b.fillStyle = '#f7e9b0';
      b.beginPath(); b.arc(f.x, f.y, 1.3, 0, Math.PI * 2); b.fill();
    }

    // decorações
    for (const d of decorations) drawDecoration(b, d);

    // portal inicial e portão final
    drawPortal(b, 12, 80);
    drawGate(b, 936, 420);
  })();

  function drawPathLine(b, width, color) {
    b.strokeStyle = color;
    b.lineWidth = width;
    b.beginPath();
    b.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) b.lineTo(PATH[i].x, PATH[i].y);
    b.stroke();
  }

  function drawPortal(b, x, y) {
    b.save();
    b.translate(x, y);
    const grd = b.createRadialGradient(0, 0, 2, 0, 0, 34);
    grd.addColorStop(0, 'rgba(150,120,255,0.9)');
    grd.addColorStop(0.5, 'rgba(110,80,220,0.35)');
    grd.addColorStop(1, 'rgba(80,50,180,0)');
    b.fillStyle = grd;
    b.beginPath(); b.arc(0, 0, 34, 0, Math.PI * 2); b.fill();
    b.strokeStyle = 'rgba(190,170,255,0.85)';
    b.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      b.beginPath();
      b.ellipse(0, 0, 12 + i * 5, 20 - i * 4, i * 0.6, 0, Math.PI * 2);
      b.stroke();
    }
    b.fillStyle = 'rgba(230,220,255,0.95)';
    b.beginPath(); b.ellipse(0, 0, 6, 13, 0, 0, Math.PI * 2); b.fill();
    b.restore();
  }

  function drawGate(b, x, y) {
    b.save();
    b.translate(x, y);
    // muro
    b.fillStyle = '#59616e';
    b.fillRect(-26, -34, 20, 68);
    b.fillRect(6, -34, 20, 68);
    b.strokeStyle = '#333a45';
    b.lineWidth = 2;
    b.strokeRect(-26, -34, 20, 68);
    b.strokeRect(6, -34, 20, 68);
    // ameias
    b.fillStyle = '#6d7684';
    for (let i = 0; i < 3; i++) {
      b.fillRect(-26 + i * 8, -42, 5, 9);
      b.fillRect(6 + i * 8, -42, 5, 9);
    }
    // arco
    b.strokeStyle = '#8d97a6';
    b.lineWidth = 4;
    b.beginPath();
    b.arc(-3, 2, 12, Math.PI, 0);
    b.stroke();
    // bandeira
    b.strokeStyle = '#3a3f47';
    b.lineWidth = 2;
    b.beginPath(); b.moveTo(-16, -42); b.lineTo(-16, -64); b.stroke();
    b.fillStyle = '#3ddc84';
    b.beginPath();
    b.moveTo(-16, -64); b.lineTo(-2, -58); b.lineTo(-16, -52);
    b.closePath(); b.fill();
    b.restore();
  }

  function drawDecoration(b, d) {
    const s = d.s;
    b.save();
    b.translate(d.x, d.y);
    if (d.kind === 'tree') {
      b.fillStyle = 'rgba(0,0,0,0.18)';
      b.beginPath(); b.ellipse(0, 6 * s, 15 * s, 6 * s, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#5b4326';
      b.fillRect(-3 * s, -4 * s, 6 * s, 16 * s);
      const grd = b.createRadialGradient(-5 * s, -10 * s, 2, 0, -4 * s, 17 * s);
      grd.addColorStop(0, '#5fae5a');
      grd.addColorStop(1, '#2f7136');
      b.fillStyle = grd;
      b.beginPath(); b.arc(0, -10 * s, 15 * s, 0, Math.PI * 2); b.fill();
      b.beginPath(); b.arc(-9 * s, -3 * s, 10 * s, 0, Math.PI * 2); b.fill();
      b.beginPath(); b.arc(9 * s, -4 * s, 10 * s, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(255,255,255,0.14)';
      b.beginPath(); b.arc(-5 * s, -14 * s, 5 * s, 0, Math.PI * 2); b.fill();
    } else if (d.kind === 'bush') {
      b.fillStyle = 'rgba(0,0,0,0.15)';
      b.beginPath(); b.ellipse(0, 5 * s, 13 * s, 5 * s, 0, 0, Math.PI * 2); b.fill();
      const grd = b.createRadialGradient(-4, -6, 1, 0, 0, 14 * s);
      grd.addColorStop(0, '#4f9e4c');
      grd.addColorStop(1, '#2c6a31');
      b.fillStyle = grd;
      b.beginPath(); b.arc(-7 * s, 0, 8 * s, 0, Math.PI * 2); b.fill();
      b.beginPath(); b.arc(6 * s, 0, 8 * s, 0, Math.PI * 2); b.fill();
      b.beginPath(); b.arc(0, -5 * s, 9 * s, 0, Math.PI * 2); b.fill();
    } else {
      b.fillStyle = 'rgba(0,0,0,0.18)';
      b.beginPath(); b.ellipse(0, 5 * s, 11 * s, 4 * s, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#8d949e';
      b.beginPath();
      b.moveTo(-10 * s, 4 * s);
      b.lineTo(-6 * s, -7 * s);
      b.lineTo(3 * s, -9 * s);
      b.lineTo(10 * s, 1 * s);
      b.lineTo(4 * s, 4 * s);
      b.closePath(); b.fill();
      b.fillStyle = 'rgba(255,255,255,0.18)';
      b.beginPath();
      b.moveTo(-6 * s, -7 * s); b.lineTo(3 * s, -9 * s); b.lineTo(1 * s, -2 * s);
      b.closePath(); b.fill();
    }
    b.restore();
  }

  // ---------- Helpers de desenho ----------
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawRange(x, y, range, stroke, fill) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  }

  function drawTower(t, alpha) {
    const def = TOWER_TYPES[t.type];
    const x = t.x, y = t.y;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 13, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // base
    roundRect(ctx, x - 17, y - 17, 34, 34, 8);
    ctx.fillStyle = '#4b515b';
    ctx.fill();
    ctx.strokeStyle = '#272c33';
    ctx.lineWidth = 2;
    ctx.stroke();

    roundRect(ctx, x - 14, y - 14, 28, 28, 6);
    const baseGrad = ctx.createLinearGradient(x - 14, y - 14, x + 14, y + 14);
    baseGrad.addColorStop(0, '#697180');
    baseGrad.addColorStop(1, '#4a505a');
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // marcadores de nível
    if (t.level) {
      for (let i = 0; i < t.level - 1; i++) {
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(x - 10 + i * 7, y + 13, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.translate(x, y);
    ctx.rotate(t.angle || 0);
    switch (t.type) {
      case 'archer': drawArcherTower(); break;
      case 'cannon': drawCannonTower(); break;
      case 'frost': drawFrostTower(); break;
      case 'tesla': drawTeslaTower(); break;
    }
    ctx.restore();

    // brilho no disparo
    if (t.flash > 0) {
      const a = Math.min(1, t.flash / 0.09);
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      const gx = x + Math.cos(t.angle || 0) * 17;
      const gy = y + Math.sin(t.angle || 0) * 17;
      const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, 14);
      grd.addColorStop(0, def.glow || '#fff');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(gx, gy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawArcherTower() {
    ctx.fillStyle = '#5c3d1d';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5228';
    ctx.lineWidth = 3;
    ctx.stroke();

    // arco
    ctx.strokeStyle = '#d8b273';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(11, 0, 8, -Math.PI * 0.62, Math.PI * 0.62);
    ctx.stroke();

    // corda
    const ax = 11 + 8 * Math.cos(-Math.PI * 0.62);
    const ay = 8 * Math.sin(-Math.PI * 0.62);
    const bx = 11 + 8 * Math.cos(Math.PI * 0.62);
    const by = 8 * Math.sin(Math.PI * 0.62);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(4, 0);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // flecha
    ctx.strokeStyle = '#f0e2b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(17, 0);
    ctx.stroke();
    ctx.fillStyle = '#e8d8a8';
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(13, -3);
    ctx.lineTo(13, 3);
    ctx.closePath();
    ctx.fill();
  }

  function drawCannonTower() {
    const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11);
    g.addColorStop(0, '#8b929c');
    g.addColorStop(1, '#4a4f57');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f343a';
    ctx.lineWidth = 2;
    ctx.stroke();

    roundRect(ctx, 2, -6, 22, 12, 5);
    const g2 = ctx.createLinearGradient(0, -6, 0, 6);
    g2.addColorStop(0, '#565d67');
    g2.addColorStop(0.5, '#3a4048');
    g2.addColorStop(1, '#23272c');
    ctx.fillStyle = g2;
    ctx.fill();
    ctx.strokeStyle = '#15181c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#15181c';
    ctx.beginPath();
    ctx.arc(23, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c0e10';
    ctx.beginPath();
    ctx.arc(23, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9aa2ad';
    ctx.beginPath();
    ctx.arc(-2, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFrostTower() {
    ctx.save();
    ctx.rotate(Math.PI / 4);
    const g = ctx.createLinearGradient(-9, -9, 9, 9);
    g.addColorStop(0, '#d6f7ff');
    g.addColorStop(0.5, '#8fdcf7');
    g.addColorStop(1, '#4aa8cc');
    ctx.fillStyle = g;
    roundRect(ctx, -8.5, -8.5, 17, 17, 4);
    ctx.fill();
    ctx.strokeStyle = '#3d92b5';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#f0fdff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(190,240,255,0.9)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
  }

  function drawTeslaTower() {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i % 2 ? '#a895e0' : '#7a63b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, -4 + i * 4, 9 - i * 1.4, 3.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 7);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#d9c6ff');
    g.addColorStop(1, '#7c5bd6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(200,180,255,0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEnemy(e) {
    const def = ENEMY_TYPES[e.type];
    const r = e.radius;
    const wob = 1 + Math.sin(state.time * 8 + e.seed) * 0.07;

    ctx.save();
    ctx.translate(e.x, e.y);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.75, r * 0.9, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    const squash = e.type === 'runner' ? 1.04 : wob;
    ctx.scale(1 / squash, squash);

    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.15, 0, 0, r * 1.15);
    grad.addColorStop(0, def.color);
    grad.addColorStop(1, def.color2);
    ctx.fillStyle = grad;

    if (e.type === 'tank' || e.type === 'boss') {
      roundRect(ctx, -r, -r, r * 2, r * 2, 7);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (e.slowTimer > 0) {
      ctx.fillStyle = 'rgba(140,220,255,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // olhos
    const eyeY = -r * 0.15;
    const er = Math.max(2.5, r * 0.27);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.34, eyeY, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.34, eyeY, er, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#161616';
    const pr = Math.max(1.2, r * 0.13);
    ctx.beginPath(); ctx.arc(-r * 0.3, eyeY + r * 0.03, pr, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.39, eyeY + r * 0.03, pr, 0, Math.PI * 2); ctx.fill();

    if (e.type === 'boss') {
      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.75);
      ctx.lineTo(-r * 0.5, -r * 1.25);
      ctx.lineTo(-r * 0.2, -r * 0.85);
      ctx.lineTo(0, -r * 1.35);
      ctx.lineTo(r * 0.2, -r * 0.85);
      ctx.lineTo(r * 0.5, -r * 1.25);
      ctx.lineTo(r * 0.8, -r * 0.75);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // barra de vida
    if (e.hp < e.maxHp || e.type === 'boss') {
      const w = r * 2.4;
      const bx = e.x - w / 2;
      const by = e.y - r - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(ctx, bx - 1, by - 1, w + 2, 7, 3);
      ctx.fill();
      const ratio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = ratio > 0.5 ? '#4cd964' : ratio > 0.25 ? '#f0c419' : '#e05c5c';
      if (ratio > 0) {
        roundRect(ctx, bx, by, w * ratio, 5, 2.5);
        ctx.fill();
      }
    }
  }

  function drawProjectile(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.kind === 'arrow') {
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.strokeStyle = '#e9d9a6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
      ctx.fillStyle = '#c9a15d';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(3, -3);
      ctx.lineTo(3, 3);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'ball') {
      ctx.fillStyle = '#2b2f36';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a616c';
      ctx.beginPath();
      ctx.arc(-1.6, -1.6, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'shard') {
      ctx.rotate((p.life || 0) * 9);
      ctx.fillStyle = '#9fe8ff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-4.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4db8dd';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEffects() {
    for (const fx of state.effects) {
      const a = Math.max(0, fx.life / fx.maxLife);
      if (fx.type === 'ring') {
        const rr = fx.maxR * (1 - a);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (fx.type === 'bolt') {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(150,110,255,0.45)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        fx.points.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
        ctx.stroke();
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of state.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.font = 'bold ' + t.size + 'px "Segoe UI", Arial, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  // ---------- Estado do jogo ----------
  const state = {
    money: 350,
    lives: 20,
    score: 0,
    wave: 0,
    phase: 'build',            // build | wave | gameover | victory
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    effects: [],
    texts: [],
    buildType: null,
    selectedTower: null,
    hover: { col: -1, row: -1 },
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 0.6,
    time: 0,
    paused: false,
    speed: 1
  };

  // ---------- Regras ----------
  function towerStats(t) {
    const base = TOWER_TYPES[t.type];
    const L = t.level - 1;
    const up = base.upgrade;
    return {
      range: base.range + L * (up.range || 0),
      damage: base.damage + L * (up.damage || 0),
      fireRate: Math.max(0.14, base.fireRate + L * (up.fireRate || 0)),
      splash: (base.splash || 0) + L * (up.splash || 0),
      slow: (base.slow || 0) + L * (up.slow || 0),
      slowDur: (base.slowDur || 0) + L * (up.slowDur || 0),
      chains: (base.chains || 0) + L * (up.chains || 0)
    };
  }

  function upgradeCost(t) {
    return Math.round(TOWER_TYPES[t.type].cost * 0.8 * t.level);
  }

  function towerAt(col, row) {
    return state.towers.find(t => t.col === col && t.row === row) || null;
  }

  function canBuild(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    if (blocked.has(cellKey(col, row))) return false;
    if (towerAt(col, row)) return false;
    return true;
  }

  function angLerp(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  // ---------- Efeitos ----------
  function burst(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 130;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 25,
        life: 0.45 + Math.random() * 0.45,
        maxLife: 0.9,
        color,
        size: 1.5 + Math.random() * 2.6
      });
    }
  }

  function addText(x, y, text, color, size) {
    state.texts.push({
      x, y, text,
      color: color || '#fff',
      size: size || 13,
      life: 0.8,
      maxLife: 0.8
    });
  }

  // ---------- Inimigos ----------
  function spawnEnemy(type) {
    const def = ENEMY_TYPES[type];
    const hpScale = 1 + (state.wave - 1) * 0.17;
    const spd = def.speed * (1 + (state.wave - 1) * 0.012);
    const hp = Math.round(def.hp * hpScale);
    state.enemies.push({
      type,
      x: PATH[0].x,
      y: PATH[0].y,
      wp: 1,
      hp,
      maxHp: hp,
      speed: spd,
      baseSpeed: spd,
      reward: def.reward + Math.floor(state.wave * 0.9),
      radius: def.radius,
      slowTimer: 0,
      slowFactor: 1,
      seed: Math.random() * Math.PI * 2,
      dead: false
    });
  }

  function damageEnemy(e, dmg, slow, slowDur) {
    if (!e || e.dead) return;
    e.hp -= dmg;
    addText(e.x + (Math.random() - 0.5) * 12, e.y - e.radius - 6, Math.round(dmg), '#ffffff');
    if (slow && slowDur) {
      e.slowTimer = Math.max(e.slowTimer, slowDur);
      e.slowFactor = 1 - slow;
    }
    if (e.hp <= 0) {
      e.dead = true;
      state.money += e.reward;
      state.score += e.reward;
      burst(e.x, e.y, 12, ENEMY_TYPES[e.type].color);
      addText(e.x, e.y - e.radius - 18, '+$' + e.reward, '#ffe066', 14);
    }
  }

  function nearestEnemy(from, range, exclude) {
    let best = null;
    let bd = Infinity;
    for (const e of state.enemies) {
      if (e.dead || exclude.indexOf(e) >= 0) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d <= range && d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  function updateEnemies(dt) {
    for (const e of state.enemies) {
      if (e.dead) continue;

      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) e.slowFactor = 1;
      }

      let remaining = e.speed * e.slowFactor * dt;
      while (remaining > 0 && e.wp < PATH.length) {
        const target = PATH[e.wp];
        const dx = target.x - e.x;
        const dy = target.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= remaining) {
          e.x = target.x;
          e.y = target.y;
          remaining -= dist;
          e.wp++;
        } else {
          e.x += dx / dist * remaining;
          e.y += dy / dist * remaining;
          remaining = 0;
        }
      }

      if (e.wp >= PATH.length) {
        e.dead = true;
        state.lives = Math.max(0, state.lives - 1);
        addText(900, 380, '-1 ❤', '#ff8080', 18);
        if (state.lives <= 0) {
          gameOver();
          return;
        }
      }
    }
    state.enemies = state.enemies.filter(e => !e.dead);
  }

  // ---------- Torres ----------
  function updateTowers(dt) {
    for (const t of state.towers) {
      const s = towerStats(t);
      t.cooldown -= dt;

      let best = null;
      let bestScore = -Infinity;
      for (const e of state.enemies) {
        if (e.dead) continue;
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        if (dx * dx + dy * dy > s.range * s.range) continue;
        const next = PATH[e.wp] || PATH[PATH.length - 1];
        const score = e.wp * 1000 - Math.hypot(next.x - e.x, next.y - e.y);
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
      t.target = best;

      if (best) {
        const desired = Math.atan2(best.y - t.y, best.x - t.x);
        t.angle = angLerp(t.angle || 0, desired, Math.min(1, dt * 12));
        if (t.cooldown <= 0) {
          fire(t, s, best);
          t.cooldown = s.fireRate;
        }
      }
    }
  }

  function fire(t, s, target) {
    const def = TOWER_TYPES[t.type];
    t.flash = 0.1;

    if (t.type === 'tesla') {
      const hit = [];
      let cur = target;
      let dmg = s.damage;
      const pts = [{ x: t.x, y: t.y }];
      for (let i = 0; i < s.chains && cur; i++) {
        pts.push({ x: cur.x, y: cur.y });
        hit.push(cur);
        damageEnemy(cur, dmg);
        burst(cur.x, cur.y, 4, '#d9c6ff');
        dmg *= 0.8;
        cur = nearestEnemy(cur, s.range * 0.95, hit);
      }
      state.effects.push({
        type: 'bolt', points: pts, life: 0.18, maxLife: 0.18, color: '#c7b3ff'
      });
      return;
    }

    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    state.projectiles.push({
      kind: def.proj,
      x: t.x + Math.cos(ang) * 16,
      y: t.y + Math.sin(ang) * 16,
      vx: Math.cos(ang) * def.projSpeed,
      vy: Math.sin(ang) * def.projSpeed,
      speed: def.projSpeed,
      target,
      damage: s.damage,
      splash: s.splash,
      slow: s.slow,
      slowDur: s.slowDur,
      life: 0,
      dead: false
    });

    if (def.proj === 'ball') burst(t.x + Math.cos(ang) * 20, t.y + Math.sin(ang) * 20, 3, '#ffb057');
  }

  // ---------- Projéteis ----------
  function updateProjectiles(dt) {
    for (const p of state.projectiles) {
      if (p.dead) continue;
      p.life = (p.life || 0) + dt;

      if (p.target && (p.target.dead || state.enemies.indexOf(p.target) < 0)) {
        p.target = null;
        if (!p.splash) {
          p.dead = true;
          continue;
        }
      }

      if (p.target) {
        const desired = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        const cur = Math.atan2(p.vy, p.vx);
        const na = angLerp(cur, desired, Math.min(1, dt * 14));
        p.vx = Math.cos(na) * p.speed;
        p.vy = Math.sin(na) * p.speed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) {
        p.dead = true;
        continue;
      }

      let hit = false;
      if (p.splash > 0) {
        for (const e of state.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 6) {
            hit = true;
            break;
          }
        }
      } else if (p.target) {
        if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < p.target.radius + 7) hit = true;
      }

      if (hit) {
        impact(p);
        p.dead = true;
      }
    }
    state.projectiles = state.projectiles.filter(p => !p.dead);
  }

  function impact(p) {
    if (p.splash > 0) {
      for (const e of state.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= p.splash + e.radius) {
          damageEnemy(e, p.damage, p.slow, p.slowDur);
        }
      }
      const color = p.kind === 'shard' ? '#9fe8ff' : '#ffb057';
      state.effects.push({
        type: 'ring', x: p.x, y: p.y, maxR: p.splash,
        life: 0.35, maxLife: 0.35, color
      });
      burst(p.x, p.y, 12, color);
    } else if (p.target && !p.target.dead) {
      damageEnemy(p.target, p.damage, p.slow, p.slowDur);
      burst(p.x, p.y, 5, '#ffd27a');
    }
  }

  // ---------- Efeitos update ----------
  function updateEffects(dt) {
    for (const p of state.particles) {
      p.life -= dt;
      p.vy += 170 * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    for (const t of state.texts) {
      t.life -= dt;
      t.y -= 28 * dt;
    }
    state.texts = state.texts.filter(t => t.life > 0);
    if (state.texts.length > 80) state.texts.splice(0, state.texts.length - 80);

    for (const fx of state.effects) fx.life -= dt;
    state.effects = state.effects.filter(fx => fx.life > 0);

    for (const t of state.towers) {
      if (t.flash > 0) t.flash -= dt;
    }
  }

  // ---------- Ondas ----------
  function waveEnemies(n) {
    const arr = [];
    const slimes = 5 + Math.floor(n * 1.8);
    for (let i = 0; i < slimes; i++) arr.push('slime');
    if (n >= 2) for (let i = 0; i < Math.floor(n * 1.1); i++) arr.push('runner');
    if (n >= 3) for (let i = 0; i < Math.floor(n * 0.65); i++) arr.push('tank');

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }

    if (n % 5 === 0) {
      const bosses = Math.max(1, Math.ceil(n / 10));
      for (let i = 0; i < bosses; i++) arr.push('boss');
    }
    return arr;
  }

  function startWave() {
    if (state.phase !== 'build') return;
    state.wave++;
    state.phase = 'wave';
    state.spawnQueue = waveEnemies(state.wave);
    state.spawnTimer = 0.7;
    state.spawnInterval = Math.max(0.28, 0.72 - state.wave * 0.02);
    addText(W / 2, 120, 'ONDA ' + state.wave, '#9fd4ff', 26);
    refreshUI();
  }

  function updateSpawning(dt) {
    if (state.phase !== 'wave') return;
    if (state.spawnQueue.length) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(state.spawnQueue.shift());
        state.spawnTimer = state.spawnInterval;
      }
    } else if (state.enemies.length === 0) {
      endWave();
    }
  }

  function endWave() {
    if (state.phase !== 'wave') return;
    const bonus = 25 + state.wave * 9;
    state.money += bonus;
    addText(W / 2, 90, 'Onda ' + state.wave + ' concluída!  +$' + bonus, '#8dffab', 20);
    if (state.wave >= MAX_WAVES) {
      victory();
      return;
    }
    state.phase = 'build';
    refreshUI();
  }

  // ---------- Fim ----------
  function gameOver() {
    if (state.phase === 'gameover') return;
    state.phase = 'gameover';
    showOverlay('💀 Fim de Jogo', 'Você resistiu até a onda ' + state.wave + ' e fez ' + state.score + ' pontos.', 'Tentar novamente');
  }

  function victory() {
    if (state.phase === 'victory') return;
    state.phase = 'victory';
    showOverlay('🏆 Vitória!', 'Você defendeu o reino nas ' + MAX_WAVES + ' ondas! Pontuação final: ' + state.score + '.', 'Jogar novamente');
  }

  // ---------- UI ----------
  const UI = {
    money: document.getElementById('moneyVal'),
    lives: document.getElementById('livesVal'),
    wave: document.getElementById('waveVal'),
    score: document.getElementById('scoreVal'),
    towerList: document.getElementById('towerList'),
    selectedPanel: document.getElementById('selectedPanel'),
    selName: document.getElementById('selName'),
    selStats: document.getElementById('selStats'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    sellBtn: document.getElementById('sellBtn'),
    startWaveBtn: document.getElementById('startWaveBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    speedBtn: document.getElementById('speedBtn'),
    restartBtn: document.getElementById('restartBtn'),
    waveHint: document.getElementById('waveHint'),
    overlay: document.getElementById('overlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayText: document.getElementById('overlayText'),
    overlayBtn: document.getElementById('overlayBtn')
  };

  const shopCards = [];

  function buildShop() {
    UI.towerList.innerHTML = '';
    shopCards.length = 0;
    const order = ['archer', 'cannon', 'frost', 'tesla'];
    for (const type of order) {
      const def = TOWER_TYPES[type];
      const btn = document.createElement('button');
      btn.className = 'card';
      btn.type = 'button';
      btn.dataset.type = type;
      btn.innerHTML =
        '<span class="icon">' + def.icon + '</span>' +
        '<span class="info">' +
          '<span class="name">' + def.name + '</span>' +
          '<span class="desc">' + def.desc + '</span>' +
        '</span>' +
        '<span class="cost">$' + def.cost + '</span>';
      btn.addEventListener('click', () => toggleBuild(type));
      UI.towerList.appendChild(btn);
      shopCards.push({ type, el: btn });
    }
  }

  function toggleBuild(type) {
    if (state.phase === 'gameover' || state.phase === 'victory') return;
    state.buildType = (state.buildType === type) ? null : type;
    state.selectedTower = null;
    refreshUI();
  }

  function refreshUI() {
    UI.money.textContent = state.money;
    UI.lives.textContent = state.lives;
    UI.wave.textContent = state.wave + ' / ' + MAX_WAVES;
    UI.score.textContent = state.score;

    for (const c of shopCards) {
      c.el.classList.toggle('selected', state.buildType === c.type);
      c.el.classList.toggle('poor', state.money < TOWER_TYPES[c.type].cost);
    }

    if (state.phase === 'wave') {
      UI.startWaveBtn.disabled = true;
      UI.startWaveBtn.textContent = '⚔ Onda em andamento…';
      UI.waveHint.textContent = 'Inimigos a caminho!';
    } else if (state.phase === 'build') {
      UI.startWaveBtn.disabled = false;
      UI.startWaveBtn.textContent = state.wave === 0 ? '▶ Iniciar Onda' : '▶ Próxima Onda';
      UI.waveHint.textContent = 'Construa torres e prepare-se!';
    } else {
      UI.startWaveBtn.disabled = true;
    }

    UI.pauseBtn.textContent = state.paused ? '▶' : '⏸';
    UI.speedBtn.textContent = state.speed + 'x';
    refreshSelectedPanel();
  }

  function refreshSelectedPanel() {
    const t = state.selectedTower;
    if (!t || state.towers.indexOf(t) < 0) {
      UI.selectedPanel.classList.add('hidden');
      if (t && state.towers.indexOf(t) < 0) state.selectedTower = null;
      return;
    }
    const def = TOWER_TYPES[t.type];
    const s = towerStats(t);

    UI.selectedPanel.classList.remove('hidden');
    UI.selName.textContent = def.icon + ' ' + def.name + ' — Nv. ' + t.level;

    let html = '';
    html += '<span>Dano: <b>' + Math.round(s.damage) + '</b></span>';
    html += '<span>Alcance: <b>' + Math.round(s.range) + '</b></span>';
    html += '<span>Cadência: <b>' + (1 / s.fireRate).toFixed(2) + '/s</b></span>';
    html += '<span>DPS: <b>' + (s.damage / s.fireRate).toFixed(1) + '</b></span>';
    if (s.splash > 0) html += '<span>Área: <b>' + Math.round(s.splash) + '</b></span>';
    if (s.slow > 0) html += '<span>Lentidão: <b>' + Math.round(s.slow * 100) + '%</b></span>';
    if (s.chains > 0) html += '<span>Corrente: <b>' + s.chains + '</b></span>';
    UI.selStats.innerHTML = html;

    if (t.level >= MAX_LEVEL) {
      UI.upgradeBtn.disabled = true;
      UI.upgradeBtn.textContent = 'Nível máximo';
    } else {
      const cost = upgradeCost(t);
      UI.upgradeBtn.disabled = state.money < cost;
      UI.upgradeBtn.textContent = 'Melhorar ($' + cost + ')';
    }
    UI.sellBtn.textContent = 'Vender ($' + Math.floor(t.invested * 0.7) + ')';
  }

  function showOverlay(title, text, btnLabel) {
    UI.overlayTitle.textContent = title;
    UI.overlayText.textContent = text;
    UI.overlayBtn.textContent = btnLabel;
    UI.overlay.classList.remove('hidden');
    refreshUI();
  }

  // ---------- Ações do jogador ----------
  function tryBuild(col, row) {
    if (!canBuild(col, row)) return;
    const type = state.buildType;
    const def = TOWER_TYPES[type];
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;

    if (state.money < def.cost) {
      addText(cx, cy - 22, 'Dinheiro insuficiente', '#ff9a9a', 13);
      return;
    }

    state.money -= def.cost;
    state.towers.push({
      type, col, row,
      x: cx, y: cy,
      level: 1,
      cooldown: 0.15,
      angle: -Math.PI / 2,
      target: null,
      flash: 0,
      invested: def.cost
    });
    burst(cx, cy, 8, '#cfe3ff');
    refreshUI();
  }

  function upgradeSelected() {
    const t = state.selectedTower;
    if (!t || state.towers.indexOf(t) < 0) return;
    if (t.level >= MAX_LEVEL) return;
    const cost = upgradeCost(t);
    if (state.money < cost) return;
    state.money -= cost;
    t.invested += cost;
    t.level++;
    burst(t.x, t.y, 14, '#ffe066');
    addText(t.x, t.y - 30, 'Nível ' + t.level, '#ffe066', 15);
    refreshUI();
  }

  function sellSelected() {
    const t = state.selectedTower;
    if (!t || state.towers.indexOf(t) < 0) return;
    const refund = Math.floor(t.invested * 0.7);
    state.money += refund;
    state.towers = state.towers.filter(x => x !== t);
    state.selectedTower = null;
    addText(t.x, t.y - 22, '+$' + refund, '#ffe066', 15);
    burst(t.x, t.y, 10, '#9aa4b2');
    refreshUI();
  }

  function restartGame() {
    state.money = 350;
    state.lives = 20;
    state.score = 0;
    state.wave = 0;
    state.phase = 'build';
    state.towers.length = 0;
    state.enemies.length = 0;
    state.projectiles.length = 0;
    state.particles.length = 0;
    state.effects.length = 0;
    state.texts.length = 0;
    state.buildType = null;
    state.selectedTower = null;
    state.spawnQueue.length = 0;
    state.spawnTimer = 0;
    state.paused = false;
    state.speed = 1;
    state.time = 0;
    UI.overlay.classList.add('hidden');
    refreshUI();
    lastTime = performance.now();
  }

  // ---------- Entrada ----------
  function mousePos(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (canvas.width / r.width),
      y: (ev.clientY - r.top) * (canvas.height / r.height)
    };
  }

  canvas.addEventListener('mousemove', ev => {
    const m = mousePos(ev);
    const col = Math.floor(m.x / CELL);
    const row = Math.floor(m.y / CELL);
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      state.hover.col = col;
      state.hover.row = row;
    } else {
      state.hover.col = -1;
      state.hover.row = -1;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    state.hover.col = -1;
    state.hover.row = -1;
  });

  canvas.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    state.buildType = null;
    state.selectedTower = null;
    refreshUI();
  });

  canvas.addEventListener('click', ev => {
    if (state.phase === 'gameover' || state.phase === 'victory') return;
    const m = mousePos(ev);
    const col = Math.floor(m.x / CELL);
    const row = Math.floor(m.y / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    const existing = towerAt(col, row);
    if (existing) {
      state.selectedTower = existing;
      state.buildType = null;
      refreshUI();
      return;
    }
    if (state.buildType) {
      tryBuild(col, row);
    } else {
      state.selectedTower = null;
      refreshUI();
    }
  });

  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') {
      state.buildType = null;
      state.selectedTower = null;
      refreshUI();
    } else if (ev.key === ' ') {
      ev.preventDefault();
      if (state.phase === 'build') startWave();
    } else if (ev.key >= '1' && ev.key <= '4') {
      const order = ['archer', 'cannon', 'frost', 'tesla'];
      toggleBuild(order[Number(ev.key) - 1]);
    }
  });

  // ---------- Loop / render ----------
  function update(dt) {
    state.time += dt;
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateEffects(dt);
  }

  function drawPlacement() {
    if (!state.buildType) return;
    const col = state.hover.col;
    const row = state.hover.row;
    if (col < 0 || row < 0) return;

    const x = col * CELL + CELL / 2;
    const y = row * CELL + CELL / 2;
    const def = TOWER_TYPES[state.buildType];
    const ok = canBuild(col, row);
    const valid = ok && state.money >= def.cost;

    if (ok) {
      drawRange(x, y, def.range, 'rgba(120,255,150,0.55)', 'rgba(120,255,150,0.06)');
    }

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = valid ? 'rgba(90,220,120,0.25)' : 'rgba(230,80,80,0.3)';
    roundRect(ctx, x - CELL / 2 + 3, y - CELL / 2 + 3, CELL - 6, CELL - 6, 8);
    ctx.fill();
    ctx.strokeStyle = valid ? 'rgba(140,255,170,0.9)' : 'rgba(255,120,120,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (valid) {
      drawTower({ type: state.buildType, x, y, angle: -Math.PI / 2, flash: 0, level: 1 }, 0.55);
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0);

    if (state.selectedTower && state.towers.indexOf(state.selectedTower) >= 0) {
      const st = towerStats(state.selectedTower);
      drawRange(
        state.selectedTower.x, state.selectedTower.y, st.range,
        'rgba(130,200,255,0.7)', 'rgba(90,170,255,0.07)'
      );
    }

    drawPlacement();

    for (const t of state.towers) drawTower(t);
    for (const e of state.enemies) drawEnemy(e);
    for (const p of state.projectiles) drawProjectile(p);
    drawEffects();
    drawParticles();
    drawTexts();

    if (state.paused) {
      ctx.save();
      ctx.fillStyle = 'rgba(6,10,16,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e9f0fa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
      ctx.fillText('PAUSADO', W / 2, H / 2);
      ctx.font = '16px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#8fa3bd';
      ctx.fillText('Clique em ⏸ para continuar', W / 2, H / 2 + 42);
      ctx.restore();
    }
  }

  let lastTime = performance.now();

  function updateLiveHUD() {
    UI.money.textContent = state.money;
    UI.lives.textContent = state.lives;
    UI.wave.textContent = state.wave + ' / ' + MAX_WAVES;
    UI.score.textContent = state.score;

    if (state.phase === 'wave') {
      UI.waveHint.textContent = 'Inimigos a caminho! Restam ' + (state.enemies.length + state.spawnQueue.length);
    }

    for (const c of shopCards) {
      c.el.classList.toggle('poor', state.money < TOWER_TYPES[c.type].cost);
    }

    if (state.selectedTower) {
      const t = state.selectedTower;
      if (t.level < MAX_LEVEL) {
        UI.upgradeBtn.disabled = state.money < upgradeCost(t);
      }
    }
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!state.paused && state.phase !== 'gameover' && state.phase !== 'victory') {
      for (let i = 0; i < state.speed; i++) update(dt);
    }

    updateLiveHUD();
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Init ----------
  function init() {
    buildShop();
    refreshUI();

    UI.startWaveBtn.addEventListener('click', startWave);
    UI.pauseBtn.addEventListener('click', () => {
      state.paused = !state.paused;
      refreshUI();
    });
    UI.speedBtn.addEventListener('click', () => {
      state.speed = state.speed === 1 ? 2 : 1;
      refreshUI();
    });
    UI.restartBtn.addEventListener('click', restartGame);
    UI.upgradeBtn.addEventListener('click', upgradeSelected);
    UI.sellBtn.addEventListener('click', sellSelected);
    UI.overlayBtn.addEventListener('click', restartGame);

    requestAnimationFrame(frame);
  }

  init();
})();
