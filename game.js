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
  const MAX_WAVES = 25;
  const MAX_LEVEL = 4;

  // Fases do jogo — cada fase libera mais torres, inimigos e ondas
  const LEVELS = [
    {
      id: 1, name: 'Vale Verde', desc: 'Gramados tranquilos do reino',
      waves: 10, money: 270, lives: 16, maxTowers: 8, hpMult: 1.12,
      towers: ['archer', 'cannon', 'precision'],
      enemies: ['slime', 'runner', 'tank']
    },
    {
      id: 2, name: 'Floresta Sombria', desc: 'Árvores escuras e névoa',
      waves: 15, money: 280, lives: 16, maxTowers: 10, hpMult: 1.3,
      towers: ['archer', 'cannon', 'precision', 'fire', 'frost'],
      enemies: ['slime', 'runner', 'tank', 'swarm', 'shield', 'regen']
    },
    {
      id: 3, name: 'Deserto Escaldante', desc: 'Areia e criaturas velozes',
      waves: 18, money: 300, lives: 15, maxTowers: 12, hpMult: 1.5,
      towers: ['archer', 'cannon', 'precision', 'fire', 'frost', 'tesla', 'poison'],
      enemies: ['slime', 'runner', 'tank', 'swarm', 'shield', 'regen', 'splitter', 'commander']
    },
    {
      id: 4, name: 'Pântano Venenoso', desc: 'Terreno traiçoeiro',
      waves: 20, money: 320, lives: 13, maxTowers: 14, hpMult: 1.75,
      towers: ['archer', 'cannon', 'precision', 'fire', 'frost', 'tesla', 'poison', 'support', 'necro'],
      enemies: ['slime', 'runner', 'tank', 'swarm', 'shield', 'regen', 'splitter', 'commander', 'ghost']
    },
    {
      id: 5, name: 'Fortaleza Kennedy', desc: 'A batalha final',
      waves: 25, money: 340, lives: 11, maxTowers: 16, hpMult: 2.0,
      towers: ['archer', 'cannon', 'precision', 'fire', 'frost', 'tesla', 'poison', 'support', 'necro', 'temporal'],
      enemies: ['slime', 'runner', 'tank', 'swarm', 'shield', 'regen', 'splitter', 'commander', 'ghost']
    }
  ];

  // ---------- Progresso (fases desbloqueadas e concluídas) ----------
  const UNLOCK_KEY = 'kennedy-defenders-unlocked';
  const CLEAR_KEY = 'kennedy-defenders-cleared';

  function loadProgress() {
    let maxId = 1;
    let cleared = [];
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(UNLOCK_KEY);
        if (raw) maxId = Math.max(1, Math.min(LEVELS.length, parseInt(raw, 10) || 1));
        const rawC = localStorage.getItem(CLEAR_KEY);
        if (rawC) {
          const parsed = JSON.parse(rawC);
          if (Array.isArray(parsed)) cleared = parsed.map(Number);
        }
      }
    } catch (e) { /* sem localStorage */ }
    for (const lv of LEVELS) {
      lv.unlocked = lv.id <= maxId;
      lv.completed = cleared.indexOf(lv.id) >= 0;
    }
  }

  function saveProgress(maxId) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(UNLOCK_KEY, String(maxId));
    } catch (e) { /* sem localStorage */ }
  }

  function markCleared(level) {
    if (!level) return;
    level.completed = true;
    try {
      if (typeof localStorage !== 'undefined') {
        const cleared = LEVELS.filter(l => l.completed).map(l => l.id);
        localStorage.setItem(CLEAR_KEY, JSON.stringify(cleared));
      }
    } catch (e) { /* sem localStorage */ }
  }

  function unlockNext(level) {
    if (!level) return null;
    const next = LEVELS.find(l => l.id === level.id + 1);
    if (!next) return null;
    next.unlocked = true;
    const maxId = LEVELS.reduce((m, l) => l.unlocked ? Math.max(m, l.id) : m, 1);
    saveProgress(maxId);
    return next;
  }

  loadProgress();

  const TOWER_TYPES = {
    // ---------- Básicas ----------
    archer: {
      name: 'Arqueiro', icon: '🏹', cost: 70, desc: 'Rápido • alvo único',
      range: 140, damage: 8, fireRate: 0.55, proj: 'arrow', projSpeed: 560,
      shots: 1, glow: '#ffe9a8',
      upgrade: { damage: 6, range: 12, fireRate: -0.05, shots: 0.67 }
    },
    cannon: {
      name: 'Canhão', icon: '💣', cost: 130, desc: 'Área • explosões',
      range: 150, damage: 26, fireRate: 1.5, proj: 'ball', projSpeed: 330,
      splash: 52, glow: '#ffb057',
      upgrade: { damage: 16, range: 9, fireRate: -0.08, splash: 6 }
    },
    precision: {
      name: 'Precisão', icon: '🎯', cost: 180, desc: 'Alcance e dano altíssimos',
      range: 270, damage: 55, fireRate: 2.2, proj: 'bullet', projSpeed: 900,
      critChance: 0.25, critMult: 2.4, glow: '#ffd479',
      upgrade: { damage: 35, range: 16, fireRate: -0.12, critChance: 0.06 }
    },

    // ---------- Elementais ----------
    fire: {
      name: 'Fogo', icon: '🔥', cost: 100, desc: 'Queimadura ao longo do tempo',
      range: 135, damage: 4, fireRate: 1.0, proj: 'flame', projSpeed: 360,
      splash: 38, burnDps: 8, burnDur: 2.5, glow: '#ff9a4d',
      upgrade: { damage: 3, range: 9, fireRate: -0.05, splash: 6, burnDps: 6, burnDur: 0.4 }
    },
    frost: {
      name: 'Gelo', icon: '❄️', cost: 110, desc: 'Desacelera e congela',
      range: 130, damage: 5, fireRate: 0.9, proj: 'shard', projSpeed: 430,
      splash: 46, slow: 0.45, slowDur: 1.4, freezeChance: 0.08, glow: '#bfefff',
      upgrade: { damage: 4, range: 9, fireRate: -0.05, slow: 0.05, slowDur: 0.15, splash: 4, freezeChance: 0.07 }
    },
    tesla: {
      name: 'Elétrica', icon: '⚡', cost: 200, desc: 'Raios saltam entre inimigos',
      range: 165, damage: 14, fireRate: 1.1, chains: 3, stunChance: 0.1, glow: '#d9c6ff',
      upgrade: { damage: 10, range: 9, fireRate: -0.06, chains: 1, stunChance: 0.08 }
    },
    poison: {
      name: 'Veneno', icon: '☠️', cost: 120, desc: 'Veneno + reduz resistência',
      range: 140, damage: 6, fireRate: 1.2, proj: 'venom', projSpeed: 400,
      splash: 44, poisonDps: 9, poisonDur: 3.5, vuln: 0.15, vulnDur: 3, glow: '#8aff9a',
      upgrade: { damage: 4, range: 9, fireRate: -0.05, poisonDps: 7, poisonDur: 0.3, vuln: 0.04, vulnDur: 0.2 }
    },

    // ---------- Estratégicas ----------
    support: {
      name: 'Suporte', icon: '🛡️', cost: 160, desc: 'Fortalece torres próximas',
      range: 130, damage: 0, fireRate: 999,
      buffDamage: 0.12, buffRange: 0.10, buffSpeed: 0.10, glow: '#9ef7c4',
      upgrade: { range: 14, buffDamage: 0.06, buffRange: 0.04, buffSpeed: 0.04 }
    },
    necro: {
      name: 'Necromante', icon: '💀', cost: 190, desc: 'Invoca esqueletos • recarga 30s',
      range: 200, damage: 0, fireRate: 30,
      summonCount: 1, summonHp: 38, summonDmg: 14, summonLife: 10, curse: 0.08,
      glow: '#c7b3ff',
      upgrade: { range: 8, fireRate: -5, summonCount: 1, summonHp: 14, summonDmg: 8, summonLife: 0.5, curse: 0.04 }
    },
    temporal: {
      name: 'Temporal', icon: '⏳', cost: 170, desc: 'Lentidão em área + acelera torres',
      range: 125, damage: 0, fireRate: 999,
      auraSlow: 0.32, buffSpeed: 0.12, glow: '#9fb8ff',
      upgrade: { range: 12, auraSlow: 0.05, buffSpeed: 0.04 }
    }
  };

  const ENEMY_TYPES = {
    slime:  { hp: 30, speed: 54, reward: 6,  radius: 13, color: '#7ce27f', color2: '#3d9142' },
    runner: { hp: 18, speed: 102, reward: 7,  radius: 11, color: '#ffc861', color2: '#c98820' },
    tank:   { hp: 115, speed: 35, reward: 15, radius: 17, color: '#a98ce6', color2: '#6247a3' },
    swarm:  { hp: 9,  speed: 126, reward: 3, radius: 8,  color: '#ffe066', color2: '#c9a01c' },
    shield: { hp: 135, speed: 33, reward: 17, radius: 16, color: '#9fb3c8', color2: '#4d5f73', armor: 6, shape: 'square' },
    regen:  { hp: 85, speed: 47, reward: 13, radius: 14, color: '#6fe3a1', color2: '#1f8f55', regenPct: 0.04 },
    splitter: { hp: 72, speed: 57, reward: 14, radius: 15, color: '#d98cff', color2: '#7a35b8', splits: 2 },
    spawnling: { hp: 14, speed: 84, reward: 3, radius: 8, color: '#e3b3ff', color2: '#8a4fc4' },
    ghost:  { hp: 75, speed: 66, reward: 15, radius: 14, color: '#cfe9ff', color2: '#6b7f9e', statusImmune: true, flying: true },
    commander: { hp: 260, speed: 31, reward: 32, radius: 19, color: '#ffab5c', color2: '#a84b1f', auraSpeed: 0.24, auraRange: 110, shape: 'square', armor: 3 },
    boss:   { hp: 800, speed: 28, reward: 85, radius: 24, color: '#ff7b7b', color2: '#a52f2f', shape: 'square', armor: 3 },
    warlord: { hp: 1150, speed: 26, reward: 130, radius: 27, color: '#ff9f43', color2: '#8f3b12', shape: 'square', armor: 6, regenPct: 0.01 },
    king:   { hp: 2400, speed: 22, reward: 300, radius: 33, color: '#ffd166', color2: '#9c4a12', shape: 'square', armor: 8, regenPct: 0.014 }
  };

  // ---------- Caminhos (um traçado diferente por fase) ----------
  const PATHS = {
    // 1 — Vale Verde: curva em zigue-zague suave
    1: [
      { x: -40, y: 120 }, { x: 200, y: 120 }, { x: 200, y: 300 },
      { x: 420, y: 300 }, { x: 420, y: 160 }, { x: 640, y: 160 },
      { x: 640, y: 480 }, { x: 820, y: 480 }, { x: 820, y: 320 },
      { x: 980, y: 320 }
    ],
    // 2 — Floresta Sombria: grande "S" sinuoso
    2: [
      { x: -40, y: 520 }, { x: 180, y: 520 }, { x: 180, y: 140 },
      { x: 400, y: 140 }, { x: 400, y: 420 }, { x: 620, y: 420 },
      { x: 620, y: 200 }, { x: 800, y: 200 }, { x: 800, y: 540 },
      { x: 980, y: 540 }
    ],
    // 3 — Deserto Escaldante: diagonais cortantes
    3: [
      { x: -40, y: 80 }, { x: 140, y: 80 }, { x: 340, y: 260 },
      { x: 180, y: 440 }, { x: 400, y: 560 }, { x: 580, y: 360 },
      { x: 760, y: 520 }, { x: 980, y: 380 }
    ],
    // 4 — Pântano Venenoso: serpentina de muitas voltas
    4: [
      { x: -40, y: 320 }, { x: 140, y: 320 }, { x: 140, y: 100 },
      { x: 300, y: 100 }, { x: 300, y: 540 }, { x: 460, y: 540 },
      { x: 460, y: 220 }, { x: 620, y: 220 }, { x: 620, y: 556 },
      { x: 780, y: 556 }, { x: 780, y: 340 }, { x: 980, y: 340 }
    ],
    // 5 — Fortaleza Kennedy: a grande serpente final
    5: [
      { x: -40, y: 60 }, { x: 160, y: 60 }, { x: 160, y: 240 },
      { x: 360, y: 240 }, { x: 360, y: 80 }, { x: 540, y: 80 },
      { x: 540, y: 360 }, { x: 720, y: 360 }, { x: 720, y: 160 },
      { x: 860, y: 160 }, { x: 860, y: 560 }, { x: 980, y: 560 }
    ]
  };

  let PATH = PATHS[1];

  function pathForLevel(level) {
    return (level && PATHS[level.id]) ? PATHS[level.id] : PATHS[1];
  }

  // Posições e ângulos do portal e do portão, mantendo-os dentro do mapa.
  function pathEndpoints(path) {
    const p = path || PATH;
    const start = p[0], next = p[1];
    const finish = p[p.length - 1], prev = p[p.length - 2];
    const startAngle = Math.atan2(next.y - start.y, next.x - start.x);
    const endAngle = Math.atan2(finish.y - prev.y, finish.x - prev.x);

    const pHalfW = Math.abs(Math.sin(startAngle)) * 30 + Math.abs(Math.cos(startAngle)) * 26;
    const pHalfH = Math.abs(Math.cos(startAngle)) * 30 + Math.abs(Math.sin(startAngle)) * 26;
    const gHalfW = Math.abs(Math.sin(endAngle)) * 70 + Math.abs(Math.cos(endAngle)) * 34;
    const gHalfH = Math.abs(Math.cos(endAngle)) * 70 + Math.abs(Math.sin(endAngle)) * 34;

    return {
      sx: Math.max(pHalfW + 4, Math.min(W - pHalfW - 4, start.x)),
      sy: Math.max(pHalfH + 4, Math.min(H - pHalfH - 4, start.y)),
      startAngle,
      gx: Math.max(gHalfW + 6, Math.min(W - gHalfW - 6, finish.x)),
      gy: Math.max(gHalfH + 6, Math.min(H - gHalfH - 6, finish.y)),
      endAngle
    };
  }

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
  const decorations = [];
  const flowers = [];

  let rand = mulberry32(20241108);

  // Recalcula o mapa inteiro para o caminho da fase atual:
  // bloqueia o caminho e posiciona decorações/flora sem cobrir a rota.
  function rebuildMap(path, seed) {
    PATH = path;
    blocked.clear();

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const x = c * CELL + CELL / 2;
        const y = r * CELL + CELL / 2;
        if (distToPath(x, y) < 45) blocked.add(cellKey(c, r));
      }
    }

    decorations.length = 0;
    flowers.length = 0;
    rand = mulberry32(seed || 20241108);

    let tries = 0;
    while (decorations.length < 24 && tries < 2000) {
      tries++;
      const c = Math.floor(rand() * COLS);
      const r = Math.floor(rand() * ROWS);
      const isEdge = c <= 2 || c >= COLS - 3 || r <= 1 || r >= ROWS - 2;
      const isInner = rand() < 0.18;
      if (!isEdge && !isInner) continue;
      const key = cellKey(c, r);
      if (blocked.has(key)) continue;
      blocked.add(key);
      const roll = rand();
      const kind = roll < 0.58 ? 'tree' : (roll < 0.82 ? 'bush' : 'rock');
      decorations.push({
        x: c * CELL + CELL / 2 + (rand() - 0.5) * 6,
        y: r * CELL + CELL / 2 + (rand() - 0.5) * 6,
        kind, s: 0.85 + rand() * 0.45, seed: rand() * Math.PI * 2
      });
    }

    const palette = ['#f2d06b', '#e88ab0', '#f4f4f4', '#9be8a0', '#c9a7ff'];
    for (let i = 0; i < 44; i++) {
      const x = rand() * W;
      const y = rand() * H;
      if (distToPath(x, y) < 32) continue;
      flowers.push({
        x, y, seed: rand() * Math.PI * 2,
        color: palette[Math.floor(rand() * palette.length)]
      });
    }
  }

  // ---------- Temas visuais das fases ----------
  const THEMES = {
    1: {
      key: 'meadow',
      accent: '#5be08a',
      base: ['#3a6b3f', '#335f39', '#2b5233'],
      patchDark: 'rgba(0,0,0,0.045)',
      patchLight: 'rgba(255,255,255,0.03)',
      speck: ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)', 'rgba(180,255,160,0.045)'],
      grid: 'rgba(255,255,255,0.045)',
      path: ['#4f4030', '#8a7352', 'rgba(0,0,0,0.10)'],
      pebble: ['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.12)'],
      flower: 'flowers',
      decor: 'meadow',
      atmos: 'pollen'
    },
    2: {
      key: 'forest',
      accent: '#7ee0b0',
      base: ['#1c2f27', '#162620', '#0c1714'],
      patchDark: 'rgba(0,0,0,0.13)',
      patchLight: 'rgba(150,255,200,0.022)',
      speck: ['rgba(160,255,200,0.04)', 'rgba(0,0,0,0.12)', 'rgba(90,180,140,0.05)'],
      grid: 'rgba(180,255,220,0.03)',
      path: ['#241f18', '#4b4030', 'rgba(0,0,0,0.24)'],
      pebble: ['rgba(140,255,190,0.08)', 'rgba(0,0,0,0.2)'],
      flower: 'glow',
      decor: 'forest',
      atmos: 'mist'
    },
    3: {
      key: 'desert',
      accent: '#ffcf4d',
      base: ['#c99a4e', '#bb8742', '#a97436'],
      patchDark: 'rgba(120,70,20,0.08)',
      patchLight: 'rgba(255,235,170,0.10)',
      speck: ['rgba(255,245,200,0.10)', 'rgba(120,70,20,0.08)', 'rgba(255,220,150,0.08)'],
      grid: 'rgba(90,55,20,0.07)',
      path: ['#8a5f32', '#d8b06a', 'rgba(120,70,20,0.10)'],
      pebble: ['rgba(255,240,190,0.18)', 'rgba(110,65,25,0.14)'],
      flower: 'tufts',
      decor: 'desert',
      atmos: 'dust'
    },
    4: {
      key: 'swamp',
      accent: '#9be86f',
      base: ['#2b3b2c', '#243326', '#18241c'],
      patchDark: 'rgba(0,10,0,0.15)',
      patchLight: 'rgba(120,200,120,0.035)',
      speck: ['rgba(150,255,170,0.05)', 'rgba(0,0,0,0.14)', 'rgba(80,140,90,0.06)'],
      grid: 'rgba(170,255,170,0.03)',
      path: ['#2b261b', '#5c5236', 'rgba(0,0,0,0.18)'],
      pebble: ['rgba(150,255,170,0.10)', 'rgba(0,0,0,0.2)'],
      flower: 'spores',
      decor: 'swamp',
      atmos: 'mist'
    },
    5: {
      key: 'fortress',
      accent: '#ff9f5c',
      base: ['#3a414d', '#313843', '#252b34'],
      patchDark: 'rgba(0,0,0,0.10)',
      patchLight: 'rgba(255,255,255,0.035)',
      speck: ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.10)', 'rgba(255,170,90,0.04)'],
      grid: 'rgba(255,255,255,0.045)',
      path: ['#242830', '#5b6270', 'rgba(0,0,0,0.18)'],
      pebble: ['rgba(255,255,255,0.09)', 'rgba(0,0,0,0.16)'],
      flower: 'embers',
      decor: 'fortress',
      atmos: 'embers'
    }
  };

  function themeForLevel(level) {
    return (level && THEMES[level.id]) ? THEMES[level.id] : THEMES[1];
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- Fundo pré-renderizado ----------
  const bg = document.createElement('canvas');
  bg.width = W;
  bg.height = H;

  function buildBackground(theme) {
    const b = bg.getContext('2d');
    const r2 = mulberry32(99);

    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, theme.base[0]);
    g.addColorStop(0.55, theme.base[1]);
    g.addColorStop(1, theme.base[2]);
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);

    // ---------- terreno específico de cada fase ----------
    if (theme.key === 'desert') {
      // dunas de areia
      for (let i = 0; i < 7; i++) {
        const y = 40 + i * 100 + r2() * 30;
        b.strokeStyle = i % 2 ? 'rgba(255,235,180,0.10)' : 'rgba(120,70,20,0.08)';
        b.lineWidth = 12 + r2() * 14;
        b.beginPath();
        b.moveTo(-40, y);
        b.bezierCurveTo(W * 0.25, y - 40 - r2() * 30, W * 0.6, y + 40 + r2() * 20, W + 40, y - 10);
        b.stroke();
      }
    } else if (theme.key === 'swamp') {
      // poças d'água e lama
      for (let i = 0; i < 16; i++) {
        const x = 40 + r2() * (W - 80);
        const y = 40 + r2() * (H - 80);
        if (distToPath(x, y) < 58) continue;
        const rx = 18 + r2() * 58, ry = rx * (0.35 + r2() * 0.25);
        b.fillStyle = r2() < 0.5 ? 'rgba(28,66,56,0.6)' : 'rgba(44,58,30,0.55)';
        b.beginPath(); b.ellipse(x, y, rx, ry, r2() * 0.5, 0, Math.PI * 2); b.fill();
        b.strokeStyle = 'rgba(120,220,160,0.12)';
        b.lineWidth = 2;
        b.stroke();
        b.fillStyle = 'rgba(150,255,190,0.06)';
        b.beginPath(); b.ellipse(x - rx * 0.2, y - ry * 0.2, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2); b.fill();
      }
    } else if (theme.key === 'fortress') {
      // lajes de pedra
      const tw = 64, th = 42;
      for (let r = 0; r < Math.ceil(H / th) + 1; r++) {
        for (let c = -1; c < Math.ceil(W / tw) + 1; c++) {
          const x = c * tw + (r % 2 ? tw / 2 : 0);
          const y = r * th;
          b.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.05)';
          b.fillRect(x + 1.5, y + 1.5, tw - 3, th - 3);
          b.strokeStyle = 'rgba(0,0,0,0.12)';
          b.lineWidth = 1;
          b.strokeRect(x + 1.5, y + 1.5, tw - 3, th - 3);
        }
      }
    }

    // manchas de terreno
    for (let i = 0; i < 90; i++) {
      const x = r2() * W, y = r2() * H, rad = 18 + r2() * 70;
      b.fillStyle = r2() < 0.5 ? theme.patchDark : theme.patchLight;
      b.beginPath(); b.arc(x, y, rad, 0, Math.PI * 2); b.fill();
    }

    // textura
    for (let i = 0; i < 3000; i++) {
      const x = r2() * W, y = r2() * H;
      const v = r2();
      b.fillStyle = v < 0.33 ? theme.speck[0] : v < 0.66 ? theme.speck[1] : theme.speck[2];
      b.fillRect(x, y, 2, 2);
    }

    // grade sutil de construção
    b.strokeStyle = theme.grid;
    b.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      b.beginPath(); b.moveTo(c * CELL + 0.5, 0); b.lineTo(c * CELL + 0.5, H); b.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      b.beginPath(); b.moveTo(0, r * CELL + 0.5); b.lineTo(W, r * CELL + 0.5); b.stroke();
    }

    // caminho — sombra suave, bordas e brilho central
    b.lineCap = 'round';
    b.lineJoin = 'round';

    b.save();
    b.shadowColor = 'rgba(0,0,0,0.38)';
    b.shadowBlur = 22;
    b.shadowOffsetY = 5;
    drawPathLine(b, 62, 'rgba(0,0,0,0.30)');
    b.restore();

    drawPathLine(b, 58, theme.path[0]);
    drawPathLine(b, 50, theme.path[1]);
    drawPathLine(b, 36, theme.path[2]);

    b.save();
    b.globalAlpha = theme.key === 'desert' ? 0.13 : 0.075;
    drawPathLine(b, 14, '#ffffff');
    b.restore();

    // pedrinhas / detalhes do caminho
    for (let i = 0; i < 260; i++) {
      const seg = Math.floor(r2() * (PATH.length - 1));
      const p1 = PATH[seg], p2 = PATH[seg + 1];
      const t = r2();
      const x = p1.x + (p2.x - p1.x) * t + (r2() - 0.5) * 28;
      const y = p1.y + (p2.y - p1.y) * t + (r2() - 0.5) * 28;
      if (distToPath(x, y) > 21) continue;
      b.fillStyle = r2() < 0.5 ? theme.pebble[0] : theme.pebble[1];
      b.beginPath();
      b.ellipse(x, y, 1.5 + r2() * 3.5, 1 + r2() * 2.2, r2() * Math.PI, 0, Math.PI * 2);
      b.fill();
    }

    // detalhes de chão (flores, cogumelos, tufos, brasas...)
    for (const f of flowers) drawGroundDetail(b, f, theme);

    // decorações
    for (const d of decorations) drawDecoration(b, d, theme);

    // névoa e vinheta para floresta/pântano
    if (theme.key === 'forest' || theme.key === 'swamp') {
      b.save();
      b.globalAlpha = theme.key === 'swamp' ? 0.10 : 0.075;
      b.fillStyle = theme.key === 'swamp' ? '#b6ffd0' : '#cfe6ff';
      for (let i = 0; i < 7; i++) {
        const x = r2() * W, y = r2() * H;
        const rx = 90 + r2() * 150, ry = 30 + r2() * 45;
        b.beginPath(); b.ellipse(x, y, rx, ry, r2() * 0.4, 0, Math.PI * 2); b.fill();
      }
      b.restore();
    }

    // vinheta geral + luz ambiente no topo
    const lg = b.createRadialGradient(W * 0.5, -H * 0.15, 40, W * 0.5, -H * 0.15, H * 1.25);
    lg.addColorStop(0, 'rgba(255,255,255,0.10)');
    lg.addColorStop(0.45, 'rgba(255,255,255,0.02)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = lg;
    b.fillRect(0, 0, W, H);

    const vg = b.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.92);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, theme.key === 'forest' || theme.key === 'swamp'
      ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.22)');
    b.fillStyle = vg;
    b.fillRect(0, 0, W, H);

    // portal inicial e portão final, alinhados ao caminho
    const ep = pathEndpoints(PATH);
    drawPortal(b, ep.sx, ep.sy, ep.startAngle);
    drawGate(b, ep.gx, ep.gy, ep.endAngle);
  }

  rebuildMap(PATHS[1], 1001);
  buildBackground(THEMES[1]);

  function drawPathLine(b, width, color) {
    b.strokeStyle = color;
    b.lineWidth = width;
    b.beginPath();
    b.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) b.lineTo(PATH[i].x, PATH[i].y);
    b.stroke();
  }

  function drawPortal(b, x, y, angle) {
    b.save();
    b.translate(x, y);
    if (angle !== undefined) b.rotate(angle);

    // halo
    const halo = b.createRadialGradient(0, 0, 2, 0, 0, 44);
    halo.addColorStop(0, 'rgba(190,160,255,0.55)');
    halo.addColorStop(0.55, 'rgba(120,90,235,0.20)');
    halo.addColorStop(1, 'rgba(70,45,170,0)');
    b.fillStyle = halo;
    b.beginPath(); b.arc(0, 0, 44, 0, Math.PI * 2); b.fill();

    // base de pedra
    b.fillStyle = '#4a3f63';
    b.beginPath(); b.ellipse(0, 20, 24, 9, 0, 0, Math.PI * 2); b.fill();
    b.fillStyle = '#6a5a8c';
    b.beginPath(); b.ellipse(0, 17, 20, 7, 0, 0, Math.PI * 2); b.fill();

    // anéis de energia
    const pulse = 1;
    b.strokeStyle = 'rgba(205,185,255,0.9)';
    b.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      b.beginPath();
      b.ellipse(0, 0, (13 + i * 6) * pulse, (22 - i * 5) * pulse, i * 0.55, 0, Math.PI * 2);
      b.stroke();
    }

    // núcleo luminoso
    const core = b.createRadialGradient(0, 0, 1, 0, 0, 12);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.5, 'rgba(200,175,255,0.85)');
    core.addColorStop(1, 'rgba(140,100,255,0.15)');
    b.fillStyle = core;
    b.beginPath(); b.ellipse(0, 0, 7, 15, 0, 0, Math.PI * 2); b.fill();

    // faíscas
    b.fillStyle = 'rgba(235,225,255,0.9)';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26;
      b.beginPath();
      b.arc(Math.cos(a) * 16, Math.sin(a) * 26, 1.4, 0, Math.PI * 2);
      b.fill();
    }
    b.restore();
  }

  function drawGate(b, x, y, angle) {
    b.save();
    b.translate(x, y);
    if (angle !== undefined) b.rotate(angle);

    // sombra
    b.fillStyle = 'rgba(0,0,0,0.30)';
    b.beginPath(); b.ellipse(0, 30, 34, 10, 0, 0, Math.PI * 2); b.fill();

    // muro
    b.fillStyle = '#59616e';
    b.fillRect(-28, -36, 22, 72);
    b.fillRect(6, -36, 22, 72);
    b.strokeStyle = '#333a45';
    b.lineWidth = 2;
    b.strokeRect(-28, -36, 22, 72);
    b.strokeRect(6, -36, 22, 72);

    // tijolos
    b.strokeStyle = 'rgba(0,0,0,0.20)';
    b.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const yy = -30 + i * 12;
      b.beginPath(); b.moveTo(-28, yy); b.lineTo(-6, yy); b.stroke();
      b.beginPath(); b.moveTo(6, yy); b.lineTo(28, yy); b.stroke();
    }

    // ameias
    b.fillStyle = '#6d7684';
    for (let i = 0; i < 3; i++) {
      b.fillRect(-28 + i * 8, -44, 5, 10);
      b.fillRect(6 + i * 8, -44, 5, 10);
    }

    // arco interno
    const arch = b.createLinearGradient(0, -20, 0, 24);
    arch.addColorStop(0, 'rgba(90,70,120,0.9)');
    arch.addColorStop(1, 'rgba(25,20,40,0.95)');
    b.fillStyle = arch;
    b.beginPath();
    b.moveTo(-6, 24);
    b.lineTo(-6, -4);
    b.arc(0, -4, 6, Math.PI, 0);
    b.lineTo(6, 24);
    b.closePath(); b.fill();

    // bandeira
    b.strokeStyle = '#3a3f47';
    b.lineWidth = 2;
    b.beginPath(); b.moveTo(-18, -44); b.lineTo(-18, -70); b.stroke();
    b.fillStyle = '#3ddc84';
    b.beginPath();
    b.moveTo(-18, -70); b.lineTo(-2, -63); b.lineTo(-18, -56);
    b.closePath(); b.fill();
    b.fillStyle = 'rgba(255,255,255,0.20)';
    b.beginPath();
    b.moveTo(-18, -70); b.lineTo(-10, -66.5); b.lineTo(-18, -63);
    b.closePath(); b.fill();

    b.restore();
  }

  function drawGroundDetail(b, f, theme) {
    if (theme.flower === 'flowers') {
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
    } else if (theme.flower === 'glow') {
      b.strokeStyle = 'rgba(150,220,190,0.5)';
      b.lineWidth = 1;
      b.beginPath();
      b.moveTo(f.x, f.y + 2);
      b.lineTo(f.x + Math.sin(f.seed) * 1.4, f.y + 5);
      b.stroke();
      const glow = b.createRadialGradient(f.x, f.y, 0.5, f.x, f.y, 7);
      glow.addColorStop(0, 'rgba(150,255,220,0.35)');
      glow.addColorStop(1, 'rgba(150,255,220,0)');
      b.fillStyle = glow;
      b.beginPath(); b.arc(f.x, f.y, 7, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#9df5c8';
      b.beginPath(); b.arc(f.x, f.y - 0.5, 2.1, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#d8fff0';
      b.beginPath(); b.arc(f.x, f.y - 1.4, 1, 0, Math.PI * 2); b.fill();
    } else if (theme.flower === 'tufts') {
      b.strokeStyle = 'rgba(120,80,30,0.55)';
      b.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const a = f.seed + k * 0.7;
        b.beginPath();
        b.moveTo(f.x, f.y + 2);
        b.lineTo(f.x + Math.cos(a) * 3.5, f.y + 2 - Math.abs(Math.sin(a)) * 5);
        b.stroke();
      }
      b.fillStyle = 'rgba(255,230,160,0.22)';
      b.beginPath(); b.arc(f.x, f.y, 2, 0, Math.PI * 2); b.fill();
    } else if (theme.flower === 'spores') {
      b.fillStyle = 'rgba(200,255,200,0.14)';
      b.beginPath(); b.arc(f.x, f.y, 4.5, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(150,255,170,0.38)';
      b.beginPath(); b.arc(f.x, f.y, 1.8, 0, Math.PI * 2); b.fill();
    } else if (theme.flower === 'embers') {
      b.fillStyle = 'rgba(255,150,80,0.18)';
      b.beginPath(); b.arc(f.x, f.y, 2.4, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(255,210,140,0.32)';
      b.beginPath(); b.arc(f.x, f.y, 1.1, 0, Math.PI * 2); b.fill();
    }
  }

  function drawDecoration(b, d, theme) {
    const s = d.s;
    b.save();
    b.translate(d.x, d.y);
    const style = theme ? theme.decor : 'meadow';

    if (style === 'meadow') {
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

    } else if (style === 'forest') {
      if (d.kind === 'tree') {
        // pinheiro sombrio
        b.fillStyle = 'rgba(0,0,0,0.28)';
        b.beginPath(); b.ellipse(0, 8 * s, 13 * s, 5 * s, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#2a1d14';
        b.fillRect(-2.5 * s, -2 * s, 5 * s, 15 * s);
        const layers = [
          { y: -4 * s, w: 13 * s },
          { y: -13 * s, w: 10 * s },
          { y: -21 * s, w: 7 * s }
        ];
        for (const L of layers) {
          const grd = b.createLinearGradient(-L.w, 0, L.w, 0);
          grd.addColorStop(0, '#2d6f4b');
          grd.addColorStop(1, '#103528');
          b.fillStyle = grd;
          b.beginPath();
          b.moveTo(0, L.y - 12 * s);
          b.lineTo(L.w, L.y + 3 * s);
          b.lineTo(-L.w, L.y + 3 * s);
          b.closePath();
          b.fill();
        }
        b.fillStyle = 'rgba(160,255,200,0.10)';
        b.beginPath(); b.arc(-3 * s, -22 * s, 4 * s, 0, Math.PI * 2); b.fill();
      } else if (d.kind === 'bush') {
        b.fillStyle = 'rgba(0,0,0,0.22)';
        b.beginPath(); b.ellipse(0, 5 * s, 12 * s, 5 * s, 0, 0, Math.PI * 2); b.fill();
        const grd = b.createRadialGradient(-4, -6, 1, 0, 0, 14 * s);
        grd.addColorStop(0, '#2c6b46');
        grd.addColorStop(1, '#103225');
        b.fillStyle = grd;
        b.beginPath(); b.arc(-7 * s, 0, 8 * s, 0, Math.PI * 2); b.fill();
        b.beginPath(); b.arc(6 * s, 0, 8 * s, 0, Math.PI * 2); b.fill();
        b.beginPath(); b.arc(0, -5 * s, 9 * s, 0, Math.PI * 2); b.fill();
        b.fillStyle = 'rgba(140,255,190,0.10)';
        b.beginPath(); b.arc(-4 * s, -8 * s, 3 * s, 0, Math.PI * 2); b.fill();
      } else {
        b.fillStyle = 'rgba(0,0,0,0.24)';
        b.beginPath(); b.ellipse(0, 5 * s, 11 * s, 4 * s, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#586a63';
        b.beginPath();
        b.moveTo(-10 * s, 4 * s);
        b.lineTo(-6 * s, -7 * s);
        b.lineTo(3 * s, -9 * s);
        b.lineTo(10 * s, 1 * s);
        b.lineTo(4 * s, 4 * s);
        b.closePath(); b.fill();
        b.fillStyle = 'rgba(110,220,150,0.35)';
        b.beginPath(); b.arc(-3 * s, -5 * s, 2.4 * s, 0, Math.PI * 2); b.fill();
        b.beginPath(); b.arc(5 * s, -2 * s, 1.7 * s, 0, Math.PI * 2); b.fill();
      }

    } else if (style === 'desert') {
      if (d.kind === 'tree') {
        // cacto
        b.fillStyle = 'rgba(0,0,0,0.20)';
        b.beginPath(); b.ellipse(0, 8 * s, 12 * s, 4 * s, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#3f7d4a';
        roundRect(b, -3.5 * s, -22 * s, 7 * s, 30 * s, 3 * s); b.fill();
        roundRect(b, -11 * s, -14 * s, 9 * s, 5 * s, 2.5 * s); b.fill();
        roundRect(b, -11 * s, -16 * s, 5 * s, 12 * s, 2.5 * s); b.fill();
        roundRect(b, 3 * s, -8 * s, 9 * s, 5 * s, 2.5 * s); b.fill();
        roundRect(b, 7 * s, -16 * s, 5 * s, 13 * s, 2.5 * s); b.fill();
        b.strokeStyle = 'rgba(210,255,190,0.35)';
        b.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          b.beginPath();
          b.moveTo(-3 * s, (-18 + i * 6) * s);
          b.lineTo(-5.5 * s, (-17 + i * 6) * s);
          b.stroke();
        }
        b.fillStyle = 'rgba(255,255,255,0.14)';
        b.fillRect(-2 * s, -21 * s, 1.6 * s, 25 * s);
      } else if (d.kind === 'bush') {
        // arbusto seco
        b.strokeStyle = 'rgba(90,60,25,0.7)';
        b.lineWidth = 1.6;
        for (let k = 0; k < 6; k++) {
          const a = -Math.PI * 0.15 - k * 0.28;
          b.beginPath();
          b.moveTo(0, 4 * s);
          b.lineTo(Math.cos(a) * 10 * s, 4 * s + Math.sin(a) * 10 * s);
          b.stroke();
        }
        b.fillStyle = 'rgba(210,170,90,0.45)';
        b.beginPath(); b.arc(0, 3 * s, 2.2 * s, 0, Math.PI * 2); b.fill();
      } else {
        // rocha de arenito
        b.fillStyle = 'rgba(0,0,0,0.18)';
        b.beginPath(); b.ellipse(0, 5 * s, 11 * s, 4 * s, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#b98a4e';
        b.beginPath();
        b.moveTo(-10 * s, 4 * s);
        b.lineTo(-6 * s, -7 * s);
        b.lineTo(3 * s, -9 * s);
        b.lineTo(10 * s, 1 * s);
        b.lineTo(4 * s, 4 * s);
        b.closePath(); b.fill();
        b.fillStyle = 'rgba(255,235,190,0.28)';
        b.beginPath();
        b.moveTo(-6 * s, -7 * s); b.lineTo(3 * s, -9 * s); b.lineTo(1 * s, -2 * s);
        b.closePath(); b.fill();
      }

    } else if (style === 'swamp') {
      if (d.kind === 'tree') {
        // árvore morta
        b.fillStyle = 'rgba(0,0,0,0.26)';
        b.beginPath(); b.ellipse(0, 7 * s, 12 * s, 5 * s, 0, 0, Math.PI * 2); b.fill();
        b.strokeStyle = '#3b2c1e';
        b.lineWidth = 5 * s;
        b.lineCap = 'round';
        b.beginPath();
        b.moveTo(0, 8 * s);
        b.lineTo(-1 * s, -12 * s);
        b.stroke();
        b.lineWidth = 3 * s;
        b.beginPath();
        b.moveTo(-0.5 * s, -4 * s); b.lineTo(-9 * s, -14 * s);
        b.moveTo(-1 * s, -9 * s); b.lineTo(7 * s, -19 * s);
        b.moveTo(-7 * s, -11 * s); b.lineTo(-12 * s, -9 * s);
        b.stroke();
        b.strokeStyle = 'rgba(120,200,120,0.4)';
        b.lineWidth = 1.4;
        b.beginPath(); b.arc(4 * s, 3 * s, 3 * s, 0, Math.PI * 2); b.stroke();
      } else if (d.kind === 'bush') {
        // juncos
        b.strokeStyle = '#3f5e35';
        b.lineWidth = 1.6;
        for (let k = 0; k < 5; k++) {
          const x = (-8 + k * 4) * s;
          b.beginPath();
          b.moveTo(x, 5 * s);
          b.quadraticCurveTo(x + 2 * s, -6 * s, x + Math.sin(k) * 3 * s, -14 * s);
          b.stroke();
          b.fillStyle = '#6b4a28';
          b.beginPath(); b.ellipse(x + Math.sin(k) * 3 * s, -14 * s, 1.8 * s, 3.6 * s, 0, 0, Math.PI * 2); b.fill();
        }
      } else {
        b.fillStyle = 'rgba(0,0,0,0.24)';
        b.beginPath(); b.ellipse(0, 5 * s, 11 * s, 4 * s, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#5a6b5c';
        b.beginPath();
        b.moveTo(-10 * s, 4 * s);
        b.lineTo(-6 * s, -7 * s);
        b.lineTo(3 * s, -9 * s);
        b.lineTo(10 * s, 1 * s);
        b.lineTo(4 * s, 4 * s);
        b.closePath(); b.fill();
        b.fillStyle = 'rgba(140,230,150,0.45)';
        b.beginPath(); b.arc(-4 * s, -6 * s, 2.8 * s, 0, Math.PI * 2); b.fill();
        b.beginPath(); b.arc(4 * s, -1 * s, 2 * s, 0, Math.PI * 2); b.fill();
      }

    } else if (style === 'fortress') {
      if (d.kind === 'tree') {
        // coluna de pedra com braseiro
        b.fillStyle = 'rgba(0,0,0,0.28)';
        b.beginPath(); b.ellipse(0, 9 * s, 12 * s, 5 * s, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#4a525e';
        b.fillRect(-8 * s, 7 * s, 16 * s, 4 * s);
        b.fillStyle = '#6b7480';
        b.fillRect(-5 * s, -17 * s, 10 * s, 25 * s);
        b.strokeStyle = '#313842';
        b.lineWidth = 1.6;
        b.strokeRect(-5 * s, -17 * s, 10 * s, 25 * s);
        b.fillStyle = '#59616e';
        b.fillRect(-8 * s, -21 * s, 16 * s, 5 * s);
        b.fillStyle = '#3f4652';
        b.fillRect(-9 * s, -23 * s, 18 * s, 3 * s);
        const flame = b.createRadialGradient(0, -28 * s, 1, 0, -28 * s, 9 * s);
        flame.addColorStop(0, 'rgba(255,230,160,0.95)');
        flame.addColorStop(0.45, 'rgba(255,150,60,0.75)');
        flame.addColorStop(1, 'rgba(255,90,20,0)');
        b.fillStyle = flame;
        b.beginPath(); b.arc(0, -28 * s, 9 * s, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#ffb066';
        b.beginPath();
        b.moveTo(-3 * s, -23 * s);
        b.quadraticCurveTo(-1 * s, -32 * s, 0, -34 * s);
        b.quadraticCurveTo(2 * s, -30 * s, 3 * s, -23 * s);
        b.closePath(); b.fill();
      } else if (d.kind === 'bush') {
        // barril
        b.fillStyle = 'rgba(0,0,0,0.2)';
        b.beginPath(); b.ellipse(0, 7 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#6a4a2a';
        roundRect(b, -8 * s, -9 * s, 16 * s, 18 * s, 4 * s); b.fill();
        b.strokeStyle = '#8d7452';
        b.lineWidth = 1.6;
        b.beginPath();
        b.moveTo(-8 * s, -3 * s); b.lineTo(8 * s, -3 * s);
        b.moveTo(-8 * s, 3 * s); b.lineTo(8 * s, 3 * s);
        b.stroke();
        b.strokeStyle = '#3c2a18';
        b.lineWidth = 1.2;
        b.beginPath(); b.moveTo(-5 * s, -9 * s); b.lineTo(-5 * s, 9 * s);
        b.moveTo(5 * s, -9 * s); b.lineTo(5 * s, 9 * s); b.stroke();
      } else {
        // entulho de pedra
        b.fillStyle = 'rgba(0,0,0,0.22)';
        b.beginPath(); b.ellipse(0, 5 * s, 12 * s, 4 * s, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#5c646f';
        b.beginPath();
        b.moveTo(-10 * s, 4 * s);
        b.lineTo(-6 * s, -5 * s);
        b.lineTo(2 * s, -7 * s);
        b.lineTo(10 * s, 1 * s);
        b.lineTo(5 * s, 4 * s);
        b.closePath(); b.fill();
        b.fillStyle = '#7b8592';
        b.beginPath(); b.arc(6 * s, 3 * s, 3 * s, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#434a55';
        b.beginPath(); b.arc(-7 * s, 2 * s, 2.2 * s, 0, Math.PI * 2); b.fill();
      }
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

    // aura de suporte/temporal
    if (t.type === 'support' || t.type === 'temporal') {
      const rr = (t.stats ? t.stats.range : towerStats(t).range);
      ctx.save();
      ctx.globalAlpha = (alpha !== undefined ? alpha : 1) * (0.10 + 0.04 * Math.sin(state.time * 2.2));
      ctx.fillStyle = t.type === 'support' ? '#3ddc84' : '#8fb2ff';
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = (alpha !== undefined ? alpha : 1) * 0.5;
      ctx.strokeStyle = t.type === 'support' ? 'rgba(61,220,132,0.7)' : 'rgba(143,178,255,0.7)';
      ctx.setLineDash([5, 7]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.translate(x, y);
    ctx.rotate(t.angle || 0);
    switch (t.type) {
      case 'archer': drawArcherTower(); break;
      case 'cannon': drawCannonTower(); break;
      case 'precision': drawPrecisionTower(); break;
      case 'fire': drawFireTower(); break;
      case 'frost': drawFrostTower(); break;
      case 'tesla': drawTeslaTower(); break;
      case 'poison': drawPoisonTower(); break;
      case 'support': drawSupportTower(); break;
      case 'necro': drawNecroTower(); break;
      case 'temporal': drawTemporalTower(); break;
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

  function drawPrecisionTower() {
    ctx.fillStyle = '#3f4857';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#232a35';
    ctx.lineWidth = 2;
    ctx.stroke();

    roundRect(ctx, 2, -3.2, 26, 6.4, 3);
    ctx.fillStyle = '#93a0b5';
    ctx.fill();
    ctx.strokeStyle = '#39445a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1c2230';
    ctx.fillRect(24, -4, 4, 8);

    ctx.fillStyle = '#ffd479';
    ctx.beginPath();
    ctx.arc(9, -8.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a20';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawFireTower() {
    ctx.fillStyle = '#4a3226';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b1b14';
    ctx.lineWidth = 2;
    ctx.stroke();

    const t = state.time;
    for (let i = 0; i < 3; i++) {
      const h = 12 + Math.sin(t * 8 + i * 1.7) * 3.5;
      ctx.fillStyle = i === 0 ? '#ff7a2f' : i === 1 ? '#ffb347' : '#ffe08a';
      ctx.beginPath();
      ctx.moveTo(-4.5 + i * 2.2, 4);
      ctx.quadraticCurveTo(-2.5 + i * 3, -h, 1.5 + i * 2, 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPoisonTower() {
    roundRect(ctx, -9.5, -6, 19, 15, 4);
    ctx.fillStyle = '#3b4b3a';
    ctx.fill();
    ctx.strokeStyle = '#22301f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#7ed9a0';
    ctx.beginPath();
    ctx.ellipse(0, -6, 7.5, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();

    const t = state.time;
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1;
      ctx.fillStyle = 'rgba(190,255,200,0.85)';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 4.2, -9 + Math.sin(a) * 2.6, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSupportTower() {
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(-2, -14, 4, 22);

    ctx.fillStyle = '#3ddc84';
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(10, -21);
    ctx.lineTo(8, -9);
    ctx.lineTo(0, -4);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-10, -21);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1f8f55';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#0c2a19';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(0, -11);
    ctx.moveTo(-5, -19);
    ctx.lineTo(5, -19);
    ctx.stroke();
  }

  function drawNecroTower() {
    ctx.fillStyle = '#3a3444';
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#221d2e';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ece8dc';
    ctx.beginPath();
    ctx.arc(0, -3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-4.5, 2, 9, 6);

    ctx.fillStyle = '#7b5bd6';
    ctx.beginPath();
    ctx.arc(-2.6, -3.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2.6, -3.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#b9b3a4';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2.4, 4);
      ctx.lineTo(i * 2.4, 7.5);
      ctx.stroke();
    }
  }

  function drawTemporalTower() {
    const t = state.time;
    ctx.save();
    ctx.rotate(t * 1.1);
    ctx.strokeStyle = 'rgba(143,178,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, 0, Math.PI * 1.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, Math.PI, Math.PI * 2.15);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#c9d6ff';
    ctx.beginPath();
    ctx.moveTo(-6, -9);
    ctx.lineTo(6, -9);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 9);
    ctx.lineTo(6, 9);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#6f86c9';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.lineTo(7, -10);
    ctx.moveTo(-7, 10);
    ctx.lineTo(7, 10);
    ctx.stroke();
  }

  function drawSummon(sk) {
    ctx.save();
    ctx.translate(sk.x, sk.y);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = Math.sin(state.time * 10 + sk.seed) * 1.5;

    ctx.fillStyle = '#dfe6d8';
    roundRect(ctx, -4, -2 + bob, 8, 10, 3);
    ctx.fill();

    ctx.strokeStyle = '#dfe6d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 2 + bob);
    ctx.lineTo(-8.5, 6 + bob);
    ctx.moveTo(4, 2 + bob);
    ctx.lineTo(8.5, 6 + bob);
    ctx.stroke();

    ctx.fillStyle = '#f2f4ec';
    ctx.beginPath();
    ctx.arc(0, -7 + bob, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4b3f6b';
    ctx.beginPath();
    ctx.arc(-1.8, -7.5 + bob, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1.8, -7.5 + bob, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const w = 18;
    const bx = sk.x - w / 2;
    const by = sk.y - 19;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, bx - 1, by - 1, w + 2, 5, 2);
    ctx.fill();
    const ratio = Math.max(0, sk.hp / sk.maxHp);
    if (ratio > 0) {
      ctx.fillStyle = '#9de8b8';
      roundRect(ctx, bx, by, w * ratio, 3, 1.5);
      ctx.fill();
    }
  }

  function drawEnemy(e) {
    const def = ENEMY_TYPES[e.type];
    const r = e.radius;
    const wob = 1 + Math.sin(state.time * 8 + e.seed) * 0.07;
    const ghost = e.statusImmune;

    ctx.save();
    ctx.translate(e.x, e.y);
    if (ghost) ctx.globalAlpha = 0.68 + Math.sin(state.time * 3 + e.seed) * 0.12;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.75, r * 0.9, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    const squash = e.type === 'runner' || e.type === 'swarm' ? 1.04 : wob;
    ctx.scale(1 / squash, squash);

    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.15, 0, 0, r * 1.15);
    grad.addColorStop(0, def.color);
    grad.addColorStop(1, def.color2);
    ctx.fillStyle = grad;

    if (def.shape === 'square') {
      roundRect(ctx, -r, -r, r * 2, r * 2, 7);
      ctx.fill();
    } else if (e.type === 'swarm') {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // bolhas do divisor
    if (e.type === 'splitter') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.25, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.3, r * 0.15, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // indicadores de status
    if (e.slowTimer > 0 && !ghost) {
      ctx.fillStyle = 'rgba(140,220,255,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.burnTimer > 0) {
      ctx.fillStyle = 'rgba(255,140,60,0.28)';
      ctx.beginPath();
      ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.poisonTimer > 0) {
      ctx.fillStyle = 'rgba(120,255,150,0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // flash branco no impacto
    if (e.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, e.hitFlash / 0.09)) * 0.7;
      ctx.fillStyle = '#ffffff';
      if (def.shape === 'square') {
        roundRect(ctx, -r, -r, r * 2, r * 2, 7);
        ctx.fill();
      } else if (e.type === 'swarm') {
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
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

    // coroa do chefe / rei
    if (e.type === 'boss' || e.type === 'king') {
      const k = e.type === 'king' ? 1.15 : 1;
      ctx.fillStyle = e.type === 'king' ? '#ffe066' : '#ffd84d';
      ctx.beginPath();
      ctx.moveTo(-r * 0.8 * k, -r * 0.75);
      ctx.lineTo(-r * 0.5 * k, -r * 1.25 * k);
      ctx.lineTo(-r * 0.2 * k, -r * 0.85);
      ctx.lineTo(0, -r * 1.35 * k);
      ctx.lineTo(r * 0.2 * k, -r * 0.85);
      ctx.lineTo(r * 0.5 * k, -r * 1.25 * k);
      ctx.lineTo(r * 0.8 * k, -r * 0.75);
      ctx.closePath();
      ctx.fill();
    }

    // chifres do Senhor da Guerra
    if (e.type === 'warlord') {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.55);
      ctx.lineTo(-r * 1.18, -r * 1.12);
      ctx.lineTo(-r * 0.45, -r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.85, -r * 0.55);
      ctx.lineTo(r * 1.18, -r * 1.12);
      ctx.lineTo(r * 0.45, -r * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    // cruz de regeneração (brilha só quando está realmente curando)
    if (e.regenPct > 0) {
      const healing = e.regenBlock <= 0 && e.hp < e.maxHp;
      ctx.strokeStyle = healing ? '#7dffab' : 'rgba(216,255,232,0.30)';
      ctx.lineWidth = healing ? 2.6 : 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.7);
      ctx.lineTo(r * 0.5, -r * 0.35);
      ctx.moveTo(r * 0.33, -r * 0.52);
      ctx.lineTo(r * 0.67, -r * 0.52);
      ctx.stroke();
    }

    // placa de armadura
    if (e.armor > 0) {
      ctx.strokeStyle = 'rgba(230,240,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.66, -0.7, 0.7);
      ctx.stroke();
    }

    ctx.restore();

    // aura do Comandante
    if (e.auraSpeed > 0) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.06 * Math.sin(state.time * 3);
      ctx.strokeStyle = '#ffb347';
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.auraRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // barra de vida
    if (e.hp < e.maxHp || e.type === 'boss' || e.type === 'king' || e.type === 'warlord' || e.auraSpeed > 0) {
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
    } else if (p.kind === 'bullet') {
      ctx.rotate(Math.atan2(p.vy, p.vx));
      if (p.crit) {
        ctx.fillStyle = 'rgba(255,212,121,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = p.crit ? '#ffe08a' : '#cfd8e6';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'flame') {
      const pulse = 4.5 + Math.sin((p.life || 0) * 30) * 1.2;
      const g = ctx.createRadialGradient(0, 0, 0.5, 0, 0, pulse + 3);
      g.addColorStop(0, '#fff2a8');
      g.addColorStop(0.45, '#ff9a4d');
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pulse + 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'venom') {
      const pulse = 5 + Math.sin((p.life || 0) * 22) * 1;
      ctx.fillStyle = 'rgba(138,255,154,0.28)';
      ctx.beginPath();
      ctx.arc(0, 0, pulse + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8aff9a';
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8ffd8';
      ctx.beginPath();
      ctx.arc(-1.5, -1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
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
      if (p.coin) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.28, p.y - p.size * 0.28, p.size * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of state.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      // dá um "pop" ao nascer e assenta no lugar, estilo arcade
      const pop = 1 + 0.4 * Math.max(0, Math.min(1, (a - 0.72) / 0.28));
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(pop, pop);
      ctx.globalAlpha = a;
      ctx.font = 'bold ' + t.size + 'px "Segoe UI", Arial, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- Estado do jogo ----------
  const state = {
    money: 350,
    lives: 20,
    startMoney: 350,
    startLives: 20,
    maxWaves: MAX_WAVES,
    maxTowers: 8,
    level: null,
    score: 0,
    wave: 0,
    phase: 'menu',             // menu | build | wave | gameover | victory
    towers: [],
    enemies: [],
    projectiles: [],
    summons: [],
    particles: [],
    effects: [],
    texts: [],
    buildType: null,
    selectedTower: null,
    hover: { col: -1, row: -1 },
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 0.6,
    waveTotal: 0,
    time: 0,
    paused: false,
    speed: 1,
    shake: 0,
    hurt: 0,
    autoStart: false,
    autoTimer: 2.5
  };

  // ---------- Regras ----------
  const STAT_KEYS = [
    'range', 'damage', 'fireRate', 'splash', 'slow', 'slowDur', 'chains',
    'burnDps', 'burnDur', 'poisonDps', 'poisonDur', 'vuln', 'vulnDur',
    'critChance', 'critMult', 'freezeChance', 'stunChance',
    'buffDamage', 'buffRange', 'buffSpeed', 'auraSlow',
    'summonCount', 'summonHp', 'summonDmg', 'summonLife', 'curse', 'shots'
  ];

  function towerStats(t) {
    const base = TOWER_TYPES[t.type];
    const up = base.upgrade || {};
    const L = t.level - 1;
    const out = {};
    for (const k of STAT_KEYS) {
      out[k] = (base[k] || 0) + (up[k] || 0) * L;
    }
    out.fireRate = Math.max(0.14, out.fireRate);
    out.shots = Math.max(1, Math.round(out.shots));
    out.chains = Math.max(0, Math.round(out.chains));
    out.summonCount = Math.max(0, Math.round(out.summonCount));
    out.critChance = Math.min(0.9, out.critChance);
    return out;
  }

  // Aplica bônus de torres de suporte e aceleração da torre temporal
  function effectiveStats(t) {
    const s = towerStats(t);
    for (const o of state.towers) {
      if (o === t) continue;
      if (o.type !== 'support' && o.type !== 'temporal') continue;
      const os = towerStats(o);
      if (Math.hypot(o.x - t.x, o.y - t.y) > os.range) continue;
      if (o.type === 'support') {
        s.damage *= 1 + os.buffDamage;
        s.range *= 1 + os.buffRange;
        s.fireRate /= 1 + os.buffSpeed;
      } else {
        s.fireRate /= 1 + os.buffSpeed;
      }
    }
    s.fireRate = Math.max(0.14, s.fireRate);
    return s;
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

  function addShake(amount) {
    state.shake = Math.min(14, Math.max(state.shake, amount));
  }

  function addRing(x, y, radius, color, life) {
    state.effects.push({
      type: 'ring', x, y, maxR: radius,
      life: life || 0.35, maxLife: life || 0.35, color
    });
  }

  function bumpMoney() {
    if (typeof UI === 'undefined' || !UI.moneyPill) return;
    UI.moneyPill.classList.remove('bump');
    UI.moneyPill.classList.add('bump');
    setTimeout(() => {
      if (UI.moneyPill) UI.moneyPill.classList.remove('bump');
    }, 650);
  }

  // Moedinhas girando: o feedback principal de abate no estilo Bloons.
  function coinBurst(x, y, count) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 70 + Math.random() * 150;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.55 + Math.random() * 0.45,
        maxLife: 1,
        color: Math.random() < 0.5 ? '#ffd23f' : '#fff1a8',
        size: 2.2 + Math.random() * 2.2,
        coin: true
      });
    }
  }

  // ---------- Inimigos ----------
  function isBossType(type) {
    return type === 'boss' || type === 'warlord' || type === 'king';
  }
  // Chefes crescem mais devagar que os inimigos comuns para não virarem sacos de HP.
  function enemyHpScale(n, type) {
    const rate = isBossType(type) ? 0.22 : 0.30;
    return 1 + (n - 1) * rate;
  }
  function enemySpeedScale(n) { return 1 + (n - 1) * 0.02; }

  function spawnEnemy(type, atX, atY, atWp) {
    const def = ENEMY_TYPES[type];
    const levelMult = state.level ? (state.level.hpMult || 1) : 1;
    const hpScale = enemyHpScale(state.wave, type) * levelMult;
    const spd = def.speed * enemySpeedScale(state.wave) * (0.94 + Math.random() * 0.12);
    const hp = Math.round(def.hp * hpScale);
    state.enemies.push({
      type,
      x: atX !== undefined ? atX : PATH[0].x + (Math.random() - 0.5) * 8,
      y: atY !== undefined ? atY : PATH[0].y + (Math.random() - 0.5) * 8,
      wp: atWp !== undefined ? atWp : 1,
      hp,
      maxHp: hp,
      speed: spd,
      baseSpeed: spd,
      reward: Math.max(1, Math.round((def.reward + Math.floor(state.wave * 0.35)) * 0.25)),
      radius: def.radius,
      armor: def.armor || 0,
      regenPct: def.regenPct || 0,
      regenBlock: 0,
      statusImmune: !!def.statusImmune,
      flying: !!def.flying,
      auraSpeed: def.auraSpeed || 0,
      auraRange: def.auraRange || 0,
      slowTimer: 0,
      slowFactor: 1,
      seed: Math.random() * Math.PI * 2,
      dead: false
    });
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    state.money += e.reward;
    state.score += e.reward;
    const def = ENEMY_TYPES[e.type];
    const big = e.type === 'boss' || e.type === 'warlord' || e.type === 'king';

    burst(e.x, e.y, big ? 26 : 12, def.color);
    burst(e.x, e.y, big ? 14 : 5, def.color2);
    addRing(e.x, e.y, e.radius * (big ? 3.4 : 2.1), def.color, big ? 0.55 : 0.32);
    coinBurst(e.x, e.y, big ? 16 : 5);
    addText(e.x, e.y - e.radius - 18, '+$' + e.reward, '#ffe066', big ? 22 : 15);
    if (big) {
      addShake(e.type === 'king' ? 12 : e.type === 'warlord' ? 9 : 6);
      addText(e.x, e.y - e.radius - 46, e.type === 'king' ? 'REI ABATIDO!' : 'CHEFE ABATIDO!', '#ffb347', 20);
    }

    if (def.splits) {
      for (let i = 0; i < def.splits; i++) {
        const ang = (i / def.splits) * Math.PI * 2;
        spawnEnemy('spawnling', e.x + Math.cos(ang) * 7, e.y + Math.sin(ang) * 7, e.wp);
      }
      addText(e.x, e.y - e.radius - 30, 'Dividiu!', '#e3b3ff', 12);
    }
  }

  function damageEnemy(e, dmg, slow, slowDur, opts) {
    if (!e || e.dead) return;
    let d = dmg;
    if (e.vulnTimer > 0) d *= 1 + e.vulnAmount;
    if (e.armor && !(opts && opts.silent)) d = Math.max(1, d - e.armor);
    e.hp -= d;
    // Regeneração só acontece "fora de combate": levar dano pausa a cura.
    if (e.regenPct > 0) {
      e.regenBlock = e.type === 'king' ? 2.2 : e.type === 'warlord' ? 1.8 : 1.4;
    }
    if (!(opts && opts.silent)) {
      const crit = opts && opts.crit;
      e.hitFlash = 0.09;
      addText(e.x + (Math.random() - 0.5) * 12, e.y - e.radius - 6,
        Math.round(d), crit ? '#ffd479' : '#ffffff', crit ? 18 : 13);
      if (crit) {
        addShake(1.8);
        burst(e.x, e.y, 5, '#ffe066');
      }
    }
    if (slow && slowDur && !e.statusImmune) {
      e.slowTimer = Math.max(e.slowTimer, slowDur);
      e.slowFactor = 1 - slow;
    }
    if (e.hp <= 0) killEnemy(e);
  }

  function applyBurn(e, dps, dur) {
    if (!e || e.dead || e.statusImmune) return;
    e.burnDps = Math.max(e.burnDps || 0, dps);
    e.burnTimer = Math.max(e.burnTimer || 0, dur);
  }

  function applyPoison(e, dps, dur) {
    if (!e || e.dead || e.statusImmune) return;
    e.poisonDps = Math.max(e.poisonDps || 0, dps);
    e.poisonTimer = Math.max(e.poisonTimer || 0, dur);
  }

  function applyVuln(e, amount, dur) {
    if (!e || e.dead || !amount || e.statusImmune) return;
    e.vulnAmount = Math.max(e.vulnAmount || 0, amount);
    e.vulnTimer = Math.max(e.vulnTimer || 0, dur);
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
    const commanders = state.enemies.filter(en => !en.dead && en.auraSpeed > 0);

    for (const e of state.enemies) {
      if (e.dead) continue;

      // Efeitos ao longo do tempo
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        damageEnemy(e, (e.burnDps || 0) * dt, 0, 0, { silent: true });
        if (Math.random() < dt * 6) {
          state.particles.push({
            x: e.x + (Math.random() - 0.5) * e.radius,
            y: e.y - e.radius * 0.5,
            vx: (Math.random() - 0.5) * 20,
            vy: -30 - Math.random() * 30,
            life: 0.4, maxLife: 0.4, color: '#ff9a4d', size: 2
          });
        }
        if (e.dead) continue;
      }
      if (e.poisonTimer > 0) {
        e.poisonTimer -= dt;
        damageEnemy(e, (e.poisonDps || 0) * dt, 0, 0, { silent: true });
        if (Math.random() < dt * 5) {
          state.particles.push({
            x: e.x + (Math.random() - 0.5) * e.radius,
            y: e.y - e.radius * 0.4,
            vx: (Math.random() - 0.5) * 14,
            vy: -18 - Math.random() * 20,
            life: 0.45, maxLife: 0.45, color: '#8aff9a', size: 1.8
          });
        }
        if (e.dead) continue;
      }
      if (e.vulnTimer > 0) e.vulnTimer -= dt;
      if (e.regenBlock > 0) e.regenBlock -= dt;
      if (e.regenPct > 0 && e.regenBlock <= 0 && e.hp > 0 && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regenPct * dt);
      }

      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) e.slowFactor = 1;
      }
      if (e.stunTimer > 0) e.stunTimer -= dt;

      // Velocidade efetiva (lentidão, auras temporais, bloqueio, atordoamento)
      let speedMul = 1;
      if (e.slowTimer > 0) speedMul = Math.min(speedMul, e.slowFactor);
      if (!e.statusImmune) {
        for (const t of state.towers) {
          if (t.type !== 'temporal') continue;
          const ts = t.stats || towerStats(t);
          if (Math.hypot(e.x - t.x, e.y - t.y) <= ts.range) {
            speedMul = Math.min(speedMul, 1 - ts.auraSlow);
          }
        }
      }
      if (!e.flying) {
        for (const sk of state.summons) {
          if (!sk.dead && Math.hypot(sk.x - e.x, sk.y - e.y) < e.radius + 13) {
            speedMul = 0;
            break;
          }
        }
      }
      // Aura do Comandante: acelera inimigos próximos
      for (const c of commanders) {
        if (c === e || c.dead) continue;
        if (Math.hypot(c.x - e.x, c.y - e.y) <= c.auraRange) {
          speedMul *= 1 + c.auraSpeed;
        }
      }
      if (e.stunTimer > 0) speedMul = 0;

      let remaining = e.speed * speedMul * dt;
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
        const ep = pathEndpoints(PATH);
        addText(ep.gx, ep.gy - 38, '-1 ❤', '#ff8080', 20);
        addRing(ep.gx, ep.gy, 48, '#ff5d7a', 0.5);
        burst(ep.gx, ep.gy, 16, '#ff5d7a');
        addShake(7);
        state.hurt = 0.55;
        if (state.lives <= 0) {
          gameOver();
          return;
        }
      }
    }
    state.enemies = state.enemies.filter(e => !e.dead);
  }

  // ---------- Esqueletos (Necromante) ----------
  function summonSkeleton(tower, s) {
    const alive = state.summons.filter(sk => !sk.dead && sk.owner === tower).length;
    if (alive >= s.summonCount) return;
    state.summons.push({
      owner: tower,
      x: tower.x + (Math.random() - 0.5) * 18,
      y: tower.y + (Math.random() - 0.5) * 18,
      hp: s.summonHp,
      maxHp: s.summonHp,
      dps: s.summonDmg,
      curse: s.curse,
      life: s.summonLife,
      speed: 82,
      target: null,
      seed: Math.random() * Math.PI * 2,
      dead: false
    });
    burst(tower.x, tower.y, 6, '#bfe9d0');
  }

  function updateSummons(dt) {
    for (const sk of state.summons) {
      if (sk.dead) continue;

      sk.life -= dt;
      if (sk.life <= 0) {
        sk.dead = true;
        burst(sk.x, sk.y, 6, '#9aa4b2');
        continue;
      }

      if (!sk.target || sk.target.dead || state.enemies.indexOf(sk.target) < 0) {
        sk.target = nearestEnemy(sk, 280, []);
      }

      if (sk.target) {
        const d = Math.hypot(sk.target.x - sk.x, sk.target.y - sk.y);
        const contact = sk.target.radius + 11;
        if (d > contact) {
          const ang = Math.atan2(sk.target.y - sk.y, sk.target.x - sk.x);
          const step = Math.min(d - contact, sk.speed * dt);
          sk.x += Math.cos(ang) * step;
          sk.y += Math.sin(ang) * step;
        } else {
          damageEnemy(sk.target, sk.dps * dt, 0, 0, { silent: true });
          if (sk.curse) applyVuln(sk.target, sk.curse, 1.2);
          sk.hp -= (5 + state.wave * 0.7) * dt;
          if (Math.random() < dt * 4) {
            state.particles.push({
              x: (sk.x + sk.target.x) / 2,
              y: (sk.y + sk.target.y) / 2,
              vx: (Math.random() - 0.5) * 40,
              vy: (Math.random() - 0.5) * 40,
              life: 0.3, maxLife: 0.3, color: '#dfe6d8', size: 1.6
            });
          }
          if (sk.hp <= 0) {
            sk.dead = true;
            burst(sk.x, sk.y, 8, '#dfe6d8');
          }
        }
      }
    }
    state.summons = state.summons.filter(sk => !sk.dead && state.towers.indexOf(sk.owner) >= 0);
  }

  // ---------- Torres ----------
  function updateTowers(dt) {
    for (const t of state.towers) {
      const s = t.stats || towerStats(t);

      if (t.type === 'support') continue;
      if (t.type === 'temporal') continue;

      if (t.type === 'necro') {
        t.cooldown -= dt;
        const alive = state.summons.filter(sk => !sk.dead && sk.owner === t).length;
        if (t.cooldown <= 0 && alive < s.summonCount && state.enemies.length > 0) {
          summonSkeleton(t, s);
          t.cooldown = s.fireRate;
          t.flash = 0.12;
        }
        continue;
      }

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

  function pickTargets(t, range, count, primary) {
    const list = [];
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - t.x, e.y - t.y) > range) continue;
      list.push(e);
    }
    list.sort((a, b) => {
      const na = PATH[a.wp] || PATH[PATH.length - 1];
      const nb = PATH[b.wp] || PATH[PATH.length - 1];
      return (b.wp * 1000 - Math.hypot(nb.x - b.x, nb.y - b.y)) -
        (a.wp * 1000 - Math.hypot(na.x - a.x, na.y - a.y));
    });
    const out = [];
    if (primary && !primary.dead) out.push(primary);
    for (const e of list) {
      if (out.length >= count) break;
      if (out.indexOf(e) < 0) out.push(e);
    }
    return out;
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
        if (!cur.statusImmune && Math.random() < s.stunChance) {
          cur.stunTimer = Math.max(cur.stunTimer || 0, 0.45);
        }
        burst(cur.x, cur.y, 4, '#d9c6ff');
        dmg *= 0.8;
        cur = nearestEnemy(cur, s.range * 0.95, hit);
      }
      state.effects.push({
        type: 'bolt', points: pts, life: 0.18, maxLife: 0.18, color: '#c7b3ff'
      });
      return;
    }

    if (t.type === 'archer' && s.shots > 1) {
      const targets = pickTargets(t, s.range, s.shots, target);
      for (const tg of targets) spawnProjectile(t, s, tg);
      return;
    }

    spawnProjectile(t, s, target);
  }

  function spawnProjectile(t, s, target) {
    const def = TOWER_TYPES[t.type];
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    const crit = t.type === 'precision' && Math.random() < s.critChance;

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
      burnDps: s.burnDps,
      burnDur: s.burnDur,
      poisonDps: s.poisonDps,
      poisonDur: s.poisonDur,
      vuln: s.vuln,
      vulnDur: s.vulnDur,
      freezeChance: s.freezeChance,
      crit,
      critMult: s.critMult,
      life: 0,
      dead: false
    });

    if (def.proj === 'ball') burst(t.x + Math.cos(ang) * 20, t.y + Math.sin(ang) * 20, 3, '#ffb057');
    if (def.proj === 'flame') burst(t.x + Math.cos(ang) * 18, t.y + Math.sin(ang) * 18, 2, '#ff9a4d');
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
    const targets = [];

    if (p.splash > 0) {
      for (const e of state.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= p.splash + e.radius) targets.push(e);
      }
      const color = p.kind === 'shard' ? '#9fe8ff'
        : p.kind === 'flame' ? '#ff9a4d'
        : p.kind === 'venom' ? '#8aff9a' : '#ffb057';
      state.effects.push({
        type: 'ring', x: p.x, y: p.y, maxR: p.splash,
        life: 0.35, maxLife: 0.35, color
      });
      burst(p.x, p.y, 12, color);
      if (targets.length) addShake(Math.min(4, 0.5 + targets.length * 0.28));
    } else if (p.target && !p.target.dead) {
      targets.push(p.target);
      burst(p.x, p.y, 5, p.crit ? '#ffd479' : '#ffd27a');
    }

    for (const e of targets) {
      const dmg = p.crit ? p.damage * p.critMult : p.damage;
      damageEnemy(e, dmg, p.slow, p.slowDur, { crit: p.crit });
      if (p.burnDps) applyBurn(e, p.burnDps, p.burnDur);
      if (p.poisonDps) {
        applyPoison(e, p.poisonDps, p.poisonDur);
        applyVuln(e, p.vuln, p.vulnDur);
      }
      if (!e.statusImmune && p.freezeChance && !e.dead && Math.random() < p.freezeChance) {
        e.stunTimer = Math.max(e.stunTimer || 0, 0.9);
        burst(e.x, e.y, 5, '#bfefff');
      }
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
    for (const e of state.enemies) {
      if (e.hitFlash > 0) e.hitFlash -= dt;
    }
  }

  // ---------- Ondas ----------
  function levelEnemies() {
    return (state.level && state.level.enemies) ? state.level.enemies : Object.keys(ENEMY_TYPES);
  }

  function bossForWave(n) {
    const lv = state.level;
    const levelId = lv ? lv.id : 1;
    const finalWave = lv ? lv.waves : MAX_WAVES;
    if (n === finalWave) {
      if (levelId >= 4) return 'king';
      if (levelId >= 3) return 'warlord';
      return 'boss';
    }
    if (n === 10 && levelId >= 2) return 'warlord';
    return 'boss';
  }

  function waveEnemies(n) {
    const arr = [];
    const pool = levelEnemies();
    const allow = t => pool.indexOf(t) >= 0;

    const slimes = 4 + Math.floor(n * 1.55);
    for (let i = 0; i < slimes; i++) arr.push('slime');
    if (allow('runner') && n >= 2) for (let i = 0; i < Math.floor(n * 0.95); i++) arr.push('runner');
    if (allow('tank') && n >= 3) for (let i = 0; i < Math.floor(n * 0.6); i++) arr.push('tank');
    if (allow('shield') && n >= 5) for (let i = 0; i < Math.floor((n - 2) / 1.7); i++) arr.push('shield');
    if (allow('regen') && n >= 6) for (let i = 0; i < Math.floor((n - 3) / 2.6); i++) arr.push('regen');
    if (allow('splitter') && n >= 7) for (let i = 0; i < Math.floor((n - 4) / 2.6); i++) arr.push('splitter');
    if (allow('commander') && n >= 8) for (let i = 0; i < Math.max(1, Math.floor((n - 2) / 5)); i++) arr.push('commander');
    if (allow('ghost') && n >= 9) for (let i = 0; i < Math.floor((n - 6) / 2.4); i++) arr.push('ghost');

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }

    // Enxames entram em grupos compactos, de forma surpresa
    if (allow('swarm') && n >= 4) {
      const packs = Math.min(7, 1 + Math.floor((n - 4) / 2.4));
      const size = 3 + Math.floor(n / 6);
      for (let p = 0; p < packs; p++) {
        const idx = Math.floor(Math.random() * (arr.length + 1));
        const pack = new Array(size).fill('swarm');
        arr.splice(idx, 0, ...pack);
      }
    }

    if (n % 5 === 0) {
      const boss = bossForWave(n);
      if (boss === 'king') {
        arr.push('king');
        arr.push('boss');
        // A fase 4 fica só com um chefe de escolta; a fortaleza final mantém dois.
        if ((state.level ? state.level.id : 1) >= 5) arr.push('boss');
      } else if (boss === 'warlord') {
        arr.push('warlord');
        if (n >= 15) arr.push('boss');
      } else {
        const bosses = Math.max(1, Math.ceil(n / 10));
        for (let i = 0; i < bosses; i++) arr.push('boss');
      }
    }
    return arr;
  }

  // Bônus pago ao concluir (ou pular) uma onda.
  // Cresce um pouco mais rápido a cada round para dar aquele reforço do BTD6.
  function waveBonus(n) {
    return 25 + n * 13;
  }

  // `carried` são os inimigos de uma onda pulada, que entram junto com a próxima.
  function startWave(carried) {
    if (state.phase !== 'build') return;
    state.wave++;
    state.phase = 'wave';
    const queue = waveEnemies(state.wave);
    state.spawnQueue = (carried && carried.length) ? queue.concat(carried) : queue;
    state.waveTotal = state.spawnQueue.length;
    state.spawnTimer = 0.6;
    state.spawnInterval = Math.max(0.2, 0.62 - state.wave * 0.022);
    addText(W / 2, 120, 'ONDA ' + state.wave, '#9fd4ff', 26);
    refreshUI();
  }

  function updateSpawning(dt) {
    if (state.phase !== 'wave') return;
    if (state.spawnQueue.length) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const type = state.spawnQueue.shift();
        spawnEnemy(type);
        // enxames entram todos juntos
        if (type === 'swarm') {
          while (state.spawnQueue[0] === 'swarm') spawnEnemy(state.spawnQueue.shift());
        }
        state.spawnTimer = state.spawnInterval;
      }
    } else if (state.enemies.length === 0) {
      endWave();
    }
  }

  function endWave() {
    if (state.phase !== 'wave') return;
    const bonus = waveBonus(state.wave);
    state.money += bonus;
    const ep = pathEndpoints(PATH);
    addText(W / 2, 90, 'Onda ' + state.wave + ' concluída!  +$' + bonus, '#8dffab', 22);
    addRing(ep.gx, ep.gy, 60, '#8dffab', 0.6);
    coinBurst(ep.gx, ep.gy - 8, 10);
    addShake(2.5);
    bumpMoney();
    if (state.wave >= state.maxWaves) {
      victory();
      return;
    }
    state.phase = 'build';
    state.autoTimer = 2.5;
    refreshUI();
  }

  // Pula a onda atual: recebe o bônus da onda na hora, mas todos os inimigos
  // restantes entram junto com a próxima onda. A próxima começa imediatamente.
  function skipWave() {
    if (state.phase !== 'wave') return;
    if (state.wave >= state.maxWaves) return;
    const carried = state.spawnQueue.slice();
    state.spawnQueue.length = 0;
    const bonus = waveBonus(state.wave);
    state.money += bonus;
    state.phase = 'build';
    addText(W / 2, 64, 'Onda ' + state.wave + ' pulada!  +$' + bonus, '#ffd479', 19);
    if (carried.length) {
      addText(W / 2, 90, carried.length + ' inimigos entram junto com a próxima onda', '#ffb36b', 14);
    }
    coinBurst(W / 2, 64, 8);
    addShake(2);
    bumpMoney();
    startWave(carried);
  }

  // ---------- Fim ----------
  let overlayNextLevel = null;

  function gameOver() {
    if (state.phase === 'gameover') return;
    state.phase = 'gameover';
    overlayNextLevel = null;
    showOverlay('💀 Fim de Jogo', 'Você resistiu até a onda ' + state.wave + ' e fez ' + state.score + ' pontos.', 'Tentar novamente');
  }

  function victory() {
    if (state.phase === 'victory') return;
    state.phase = 'victory';

    markCleared(state.level);
    const next = unlockNext(state.level);
    if (next) buildMenu();
    overlayNextLevel = next;

    let text = 'Você defendeu ' + (state.level ? state.level.name : 'o reino') +
      ' nas ' + state.maxWaves + ' ondas! Pontuação final: ' + state.score + '.';
    if (next) text += ' A fase "' + next.name + '" foi desbloqueada!';
    else text += ' Você concluiu todas as fases do reino!';

    showOverlay('🏆 Vitória!', text, next ? 'Próxima fase ▶' : 'Jogar novamente');
  }

  // ---------- UI ----------
  const UI = {
    money: document.getElementById('moneyVal'),
    moneyPill: document.getElementById('moneyPill'),
    lives: document.getElementById('livesVal'),
    livesPill: document.getElementById('livesPill'),
    wave: document.getElementById('waveVal'),
    score: document.getElementById('scoreVal'),
    towers: document.getElementById('towersVal'),
    towerList: document.getElementById('towerList'),
    selectedPanel: document.getElementById('selectedPanel'),
    selName: document.getElementById('selName'),
    selStats: document.getElementById('selStats'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    sellBtn: document.getElementById('sellBtn'),
    startWaveBtn: document.getElementById('startWaveBtn'),
    skipWaveBtn: document.getElementById('skipWaveBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    speedBtn: document.getElementById('speedBtn'),
    autoBtn: document.getElementById('autoBtn'),
    restartBtn: document.getElementById('restartBtn'),
    waveHint: document.getElementById('waveHint'),
    hud: document.getElementById('hud'),
    levelName: document.getElementById('levelName'),
    levelTag: document.getElementById('levelTag'),
    progressFill: document.getElementById('hudProgressFill'),
    overlay: document.getElementById('overlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayText: document.getElementById('overlayText'),
    overlayBtn: document.getElementById('overlayBtn'),
    overlayMenuBtn: document.getElementById('overlayMenuBtn'),
    menu: document.getElementById('menu'),
    gameWrap: document.getElementById('gameWrap'),
    levelList: document.getElementById('levelList'),
    menuBtn: document.getElementById('menuBtn'),
    mainView: document.getElementById('mainMenuView'),
    levelView: document.getElementById('levelSelectView'),
    playBtn: document.getElementById('playBtn'),
    howBtn: document.getElementById('howBtn'),
    creditsBtn: document.getElementById('creditsBtn'),
    backMenuBtn: document.getElementById('backMenuBtn'),
    howModal: document.getElementById('howModal'),
    creditsModal: document.getElementById('creditsModal'),
    menuProgress: document.getElementById('menuProgress'),
    levelsCount: document.getElementById('levelsCount')
  };

  const shopCards = [];

  // ---------- Menu principal ----------
  function updateMenuProgress() {
    const done = LEVELS.filter(l => l.completed).length;
    const next = LEVELS.find(l => l.unlocked && !l.completed);
    if (UI.levelsCount) UI.levelsCount.textContent = done + ' / ' + LEVELS.length;
    if (UI.menuProgress) {
      if (done >= LEVELS.length) {
        UI.menuProgress.textContent = '👑 Todas as fases concluídas!';
      } else if (next) {
        UI.menuProgress.textContent = 'Fase ' + next.id + ' disponível • ' +
          done + '/' + LEVELS.length + ' concluídas';
      } else {
        UI.menuProgress.textContent = done + ' / ' + LEVELS.length + ' concluídas';
      }
    }
  }

  function showMenuView(view) {
    const levels = view === 'levels';
    if (UI.mainView) UI.mainView.classList.toggle('hidden', levels);
    if (UI.levelView) UI.levelView.classList.toggle('hidden', !levels);
    if (levels) updateMenuProgress();
  }

  function closeMenuModals() {
    if (UI.howModal) UI.howModal.classList.add('hidden');
    if (UI.creditsModal) UI.creditsModal.classList.add('hidden');
  }

  function openMenuModal(which) {
    closeMenuModals();
    const modal = which === 'how' ? UI.howModal : UI.creditsModal;
    if (modal) modal.classList.remove('hidden');
  }

  // ---------- Menu de fases ----------
  function drawMenuPreview(cv, level) {
    if (!cv || typeof cv.getContext !== 'function') return;
    const c = cv.getContext('2d');
    if (!c) return;

    const pw = cv.width, ph = cv.height;
    const s = ph / H;
    const theme = themeForLevel(level);
    const path = pathForLevel(level);

    const g = c.createLinearGradient(0, 0, 0, ph);
    g.addColorStop(0, theme.base[0]);
    g.addColorStop(0.55, theme.base[1]);
    g.addColorStop(1, theme.base[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, pw, ph);

    const rnd = mulberry32(level.id * 191 + 7);

    // manchas de terreno
    for (let i = 0; i < 16; i++) {
      c.fillStyle = rnd() < 0.5 ? theme.patchDark : theme.patchLight;
      c.beginPath();
      c.arc(rnd() * pw, rnd() * ph, (10 + rnd() * 34) * s, 0, Math.PI * 2);
      c.fill();
    }

    // caminho em miniatura
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const trace = () => {
      c.beginPath();
      c.moveTo(path[0].x * s, path[0].y * s);
      for (let i = 1; i < path.length; i++) c.lineTo(path[i].x * s, path[i].y * s);
      c.stroke();
    };
    c.strokeStyle = 'rgba(0,0,0,0.30)';
    c.lineWidth = 20 * s;
    trace();
    c.strokeStyle = theme.path[1];
    c.lineWidth = 14 * s;
    trace();
    c.strokeStyle = 'rgba(255,255,255,0.16)';
    c.lineWidth = 4 * s;
    trace();

    // decoração pontual
    for (let i = 0; i < 14; i++) {
      const x = rnd() * pw, y = rnd() * ph;
      c.fillStyle = i % 3 === 0 ? theme.accent : 'rgba(0,0,0,0.28)';
      c.globalAlpha = 0.35 + rnd() * 0.35;
      c.beginPath();
      c.arc(x, y, (2 + rnd() * 3) * s, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // portal e portão
    const start = path[0], finish = path[path.length - 1];
    const px = Math.max(8, Math.min(pw - 8, start.x * s));
    const py = Math.max(8, Math.min(ph - 8, start.y * s));
    const gx = Math.max(8, Math.min(pw - 8, finish.x * s));
    const gy = Math.max(8, Math.min(ph - 8, finish.y * s));

    const pg = c.createRadialGradient(px, py, 1, px, py, 14 * s + 6);
    pg.addColorStop(0, 'rgba(220,200,255,0.9)');
    pg.addColorStop(1, 'rgba(140,100,255,0)');
    c.fillStyle = pg;
    c.beginPath(); c.arc(px, py, 14 * s + 6, 0, Math.PI * 2); c.fill();

    c.fillStyle = theme.accent;
    c.beginPath(); c.arc(gx, gy, 3.4 * s + 1.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(gx - 4, gy - 7 * s, 8, 14 * s);

    // vinheta
    const vg = c.createRadialGradient(pw / 2, ph / 2, ph * 0.2, pw / 2, ph / 2, ph * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    c.fillStyle = vg;
    c.fillRect(0, 0, pw, ph);
  }

  function buildMenu() {
    UI.levelList.innerHTML = '';

    for (const lv of LEVELS) {
      const theme = themeForLevel(lv);
      const btn = document.createElement('button');
      const stateClass = lv.completed ? ' completed' : (lv.unlocked ? '' : ' locked');
      btn.type = 'button';
      btn.className = 'level theme-' + theme.key + stateClass;
      btn.disabled = !lv.unlocked;

      const icons = lv.towers.map(t => TOWER_TYPES[t] ? TOWER_TYPES[t].icon : '').join('');
      const stateLabel = lv.completed ? '✓ Concluída' : (lv.unlocked ? '▶ Jogar' : '🔒 Bloqueada');
      const stateKind = lv.completed ? 'done' : (lv.unlocked ? 'open' : 'locked');

      btn.innerHTML =
        '<span class="level-preview">' +
          '<canvas width="300" height="200"></canvas>' +
          '<span class="level-num">' + lv.id + '</span>' +
          '<span class="level-tag">' + (lv.completed ? 'CONCLUÍDA' : (lv.unlocked ? 'DISPONÍVEL' : 'BLOQUEADA')) + '</span>' +
        '</span>' +
        '<span class="level-info">' +
          '<span class="level-name">' + lv.name + '</span>' +
          '<span class="level-desc">' + lv.desc + '</span>' +
          '<span class="level-meta">' +
            '<span>🌊 ' + lv.waves + ' ondas</span>' +
            '<span>🏰 ' + lv.maxTowers + ' torres</span>' +
            '<span>🗼 ' + lv.towers.length + ' tipos</span>' +
          '</span>' +
          '<span class="level-towers">' + icons + '</span>' +
        '</span>' +
        '<span class="level-state ' + stateKind + '">' + stateLabel + '</span>';

      const canvas = btn.querySelector ? btn.querySelector('canvas') : null;
      if (canvas) drawMenuPreview(canvas, lv);

      if (lv.unlocked) {
        btn.addEventListener('click', () => startLevel(lv));
      }
      UI.levelList.appendChild(btn);
    }
    updateMenuProgress();
  }

  function startLevel(level) {
    state.level = level;
    state.startMoney = level.money;
    state.startLives = level.lives;
    state.maxWaves = level.waves;
    state.maxTowers = level.maxTowers;
    overlayNextLevel = null;
    const theme = themeForLevel(level);
    rebuildMap(pathForLevel(level), 1000 + level.id * 977);
    buildBackground(theme);
    if (UI.hud) UI.hud.className = 'hud theme-' + theme.key;
    if (UI.levelName) UI.levelName.textContent = level.name;
    if (UI.levelTag) UI.levelTag.textContent = 'FASE ' + level.id;
    UI.menu.classList.add('hidden');
    UI.gameWrap.classList.remove('hidden');
    buildShop();
    restartGame();
  }

  function openMenu() {
    state.phase = 'menu';
    state.paused = false;
    overlayNextLevel = null;
    UI.overlay.classList.add('hidden');
    UI.gameWrap.classList.add('hidden');
    UI.menu.classList.remove('hidden');
    closeMenuModals();
    showMenuView('main');
    refreshUI();
    lastTime = performance.now();
  }

  const SHOP_GROUPS = [
    { title: 'Torres básicas', types: ['archer', 'cannon', 'precision'] },
    { title: 'Torres elementais', types: ['fire', 'frost', 'tesla', 'poison'] },
    { title: 'Estratégicas e especiais', types: ['support', 'necro', 'temporal'] }
  ];

  function unlockedTowers() {
    return (state.level && state.level.towers) ? state.level.towers : Object.keys(TOWER_TYPES);
  }

  function isTowerUnlocked(type) {
    return unlockedTowers().indexOf(type) >= 0;
  }

  function buildShop() {
    UI.towerList.innerHTML = '';
    shopCards.length = 0;
    const unlocked = unlockedTowers();

    for (const group of SHOP_GROUPS) {
      const types = group.types.filter(t => unlocked.indexOf(t) >= 0);
      if (types.length === 0) continue;

      const header = document.createElement('div');
      header.className = 'group-title';
      header.textContent = group.title;
      UI.towerList.appendChild(header);

      for (const type of types) {
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
  }

  function toggleBuild(type) {
    if (state.phase === 'menu' || state.phase === 'gameover' || state.phase === 'victory') return;
    if (!isTowerUnlocked(type)) return;
    state.buildType = (state.buildType === type) ? null : type;
    state.selectedTower = null;
    refreshUI();
  }

  function refreshUI() {
    UI.money.textContent = state.money;
    UI.lives.textContent = state.lives;
    UI.wave.textContent = state.wave + ' / ' + state.maxWaves;
    UI.score.textContent = state.score;
    UI.towers.textContent = state.towers.length + ' / ' + state.maxTowers;
    if (UI.livesPill) UI.livesPill.classList.toggle('danger', state.lives <= 5 && state.phase !== 'menu');
    if (UI.moneyPill) UI.moneyPill.classList.toggle('poor', state.money < 70);

    for (const c of shopCards) {
      c.el.classList.toggle('selected', state.buildType === c.type);
      c.el.classList.toggle('poor', state.money < TOWER_TYPES[c.type].cost);
    }

    if (state.phase === 'wave') {
      UI.startWaveBtn.disabled = true;
      UI.startWaveBtn.textContent = '⚔ Onda em andamento…';
      UI.waveHint.textContent = 'Inimigos a caminho! ⏭ Pular paga o bônus agora, mas junta os inimigos na próxima onda.';
    } else if (state.phase === 'build') {
      UI.startWaveBtn.disabled = false;
      UI.startWaveBtn.textContent = state.wave === 0 ? '▶ Iniciar Onda' : '▶ Próxima Onda';
      UI.waveHint.textContent = state.towers.length >= state.maxTowers
        ? 'Limite de ' + state.maxTowers + ' torres atingido — melhore ou venda torres.'
        : 'Construa torres e prepare-se! (' + state.towers.length + '/' + state.maxTowers + ' torres)';
    } else {
      UI.startWaveBtn.disabled = true;
    }

    if (UI.skipWaveBtn) {
      UI.skipWaveBtn.disabled = !(state.phase === 'wave' && state.wave < state.maxWaves);
    }

    UI.pauseBtn.textContent = state.paused ? '▶' : '⏸';
    UI.speedBtn.textContent = state.speed + 'x';
    UI.speedBtn.classList.toggle('fast', state.speed > 1);
    if (UI.autoBtn) {
      UI.autoBtn.classList.toggle('on', state.autoStart);
      UI.autoBtn.title = state.autoStart
        ? 'Auto-iniciar ligado — próxima onda em 2,5s'
        : 'Auto-iniciar ondas após 2,5s';
    }
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
    const s = effectiveStats(t);

    UI.selectedPanel.classList.remove('hidden');
    UI.selName.textContent = def.icon + ' ' + def.name + ' — Nv. ' + t.level;

    const add = (label, val) => '<span>' + label + ': <b>' + val + '</b></span>';
    const rows = [];

    if (t.type === 'support') {
      rows.push(add('Alcance', Math.round(s.range)));
      rows.push(add('Bônus dano', '+' + Math.round(s.buffDamage * 100) + '%'));
      rows.push(add('Bônus alcance', '+' + Math.round(s.buffRange * 100) + '%'));
      rows.push(add('Bônus cadência', '+' + Math.round(s.buffSpeed * 100) + '%'));
    } else if (t.type === 'temporal') {
      rows.push(add('Alcance', Math.round(s.range)));
      rows.push(add('Lentidão', Math.round(s.auraSlow * 100) + '%'));
      rows.push(add('Aceleração', '+' + Math.round(s.buffSpeed * 100) + '%'));
    } else if (t.type === 'necro') {
      rows.push(add('Recarga', s.fireRate.toFixed(0) + 's'));
      rows.push(add('Esqueletos', s.summonCount));
      rows.push(add('Vida', Math.round(s.summonHp)));
      rows.push(add('Dano', Math.round(s.summonDmg) + '/s'));
      rows.push(add('Duração', s.summonLife.toFixed(1) + 's'));
      rows.push(add('Maldição', '+' + Math.round(s.curse * 100) + '%'));
    } else {
      rows.push(add('Dano', Math.round(s.damage)));
      rows.push(add('Alcance', Math.round(s.range)));
      rows.push(add('Cadência', (1 / s.fireRate).toFixed(2) + '/s'));
      rows.push(add('DPS', (s.damage / s.fireRate).toFixed(1)));
      if (s.splash > 0) rows.push(add('Área', Math.round(s.splash)));
      if (s.slow > 0) rows.push(add('Lentidão', Math.round(s.slow * 100) + '%'));
      if (s.freezeChance > 0) rows.push(add('Congelar', Math.round(s.freezeChance * 100) + '%'));
      if (s.chains > 0) rows.push(add('Cadeia', s.chains));
      if (s.stunChance > 0) rows.push(add('Paralisia', Math.round(s.stunChance * 100) + '%'));
      if (s.burnDps > 0) rows.push(add('Queimadura', Math.round(s.burnDps) + '/s'));
      if (s.poisonDps > 0) rows.push(add('Veneno', Math.round(s.poisonDps) + '/s'));
      if (s.vuln > 0) rows.push(add('Vulnerável', '+' + Math.round(s.vuln * 100) + '%'));
      if (s.critChance > 0) rows.push(add('Crítico', Math.round(s.critChance * 100) + '% (x' + s.critMult.toFixed(1) + ')'));
      if (s.shots > 1) rows.push(add('Flechas', s.shots));
    }

    UI.selStats.innerHTML = rows.join('');

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

    if (state.towers.length >= state.maxTowers) {
      addText(cx, cy - 22, 'Limite de ' + state.maxTowers + ' torres', '#ff9a9a', 13);
      return;
    }

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
    addRing(cx, cy, 30, '#9fe8ff', 0.35);
    addShake(1.5);
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
    burst(t.x, t.y, 16, '#ffe066');
    addRing(t.x, t.y, 34, '#ffe066', 0.4);
    addText(t.x, t.y - 30, 'NÍVEL ' + t.level + '!', '#ffe066', 17);
    addShake(2);
    refreshUI();
  }

  function sellSelected() {
    const t = state.selectedTower;
    if (!t || state.towers.indexOf(t) < 0) return;
    const refund = Math.floor(t.invested * 0.7);
    state.money += refund;
    state.towers = state.towers.filter(x => x !== t);
    state.selectedTower = null;
    addText(t.x, t.y - 22, '+$' + refund, '#ffe066', 16);
    coinBurst(t.x, t.y, 8);
    burst(t.x, t.y, 10, '#9aa4b2');
    refreshUI();
  }

  function restartGame() {
    state.money = state.startMoney;
    state.lives = state.startLives;
    state.maxWaves = state.level ? state.level.waves : MAX_WAVES;
    state.maxTowers = state.level ? state.level.maxTowers : 8;
    state.score = 0;
    state.wave = 0;
    state.phase = 'build';
    state.towers.length = 0;
    state.enemies.length = 0;
    state.projectiles.length = 0;
    state.summons.length = 0;
    state.particles.length = 0;
    state.effects.length = 0;
    state.texts.length = 0;
    state.buildType = null;
    state.selectedTower = null;
    state.spawnQueue.length = 0;
    state.spawnTimer = 0;
    state.waveTotal = 0;
    state.paused = false;
    state.speed = 1;
    state.shake = 0;
    state.hurt = 0;
    state.autoTimer = 2.5;
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
    if (state.phase === 'menu' || state.phase === 'gameover' || state.phase === 'victory') return;
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
      if (UI.menu && !UI.menu.classList.contains('hidden')) {
        if ((UI.howModal && !UI.howModal.classList.contains('hidden')) ||
            (UI.creditsModal && !UI.creditsModal.classList.contains('hidden'))) {
          closeMenuModals();
          return;
        }
        if (UI.levelView && !UI.levelView.classList.contains('hidden')) {
          showMenuView('main');
          return;
        }
      }
      state.buildType = null;
      state.selectedTower = null;
      refreshUI();
    } else if (ev.key === ' ') {
      ev.preventDefault();
      if (state.phase === 'build') startWave();
    } else if (ev.key === 's' || ev.key === 'S') {
      skipWave();
    } else if ((ev.key >= '1' && ev.key <= '9') || ev.key === '0') {
      const order = ['archer', 'cannon', 'precision', 'fire', 'frost', 'tesla', 'poison', 'support', 'necro', 'temporal'];
      const idx = ev.key === '0' ? 9 : Number(ev.key) - 1;
      toggleBuild(order[idx]);
    }
  });

  // ---------- Loop / render ----------
  function update(dt) {
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 28);
    if (state.hurt > 0) state.hurt = Math.max(0, state.hurt - dt);

    if (state.phase === 'build' && state.autoStart && state.wave < state.maxWaves) {
      state.autoTimer -= dt;
      if (state.autoTimer <= 0) startWave();
    }

    for (const t of state.towers) t.stats = effectiveStats(t);
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateSummons(dt);
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

  function drawFireflies(t, color, count) {
    ctx.save();
    for (let i = 0; i < count; i++) {
      const x = (i * 167 + Math.sin(t * 0.55 + i * 1.7) * 22 + W) % W;
      const y = 90 + ((i * 113 + Math.sin(t * 0.8 + i * 2.1) * 38 + H) % (H - 160));
      const glow = Math.max(0, 0.35 + 0.35 * Math.sin(t * 2.2 + i * 1.3));
      ctx.globalAlpha = glow;
      const g = ctx.createRadialGradient(x, y, 0.5, x, y, 9);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffbe0';
      ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawThemeAtmosphere() {
    const theme = themeForLevel(state.level);
    if (!theme.atmos) return;
    const t = state.time;

    if (theme.atmos === 'mist') {
      ctx.save();
      ctx.globalAlpha = theme.key === 'swamp' ? 0.06 : 0.05;
      ctx.fillStyle = theme.key === 'swamp' ? '#b8ffd0' : '#d6e8ff';
      for (let i = 0; i < 4; i++) {
        const x = ((t * (6 + i) + i * 330) % (W + 500)) - 250;
        const y = 90 + i * 150;
        ctx.beginPath();
        ctx.ellipse(x, y, 220, 60, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      drawFireflies(t, theme.key === 'swamp' ? '#b6ffcf' : '#d6ffb0',
        theme.key === 'swamp' ? 15 : 10);

      if (theme.key === 'swamp') {
        // bolhas subindo das poças
        ctx.save();
        for (let i = 0; i < 16; i++) {
          const x = (i * 149 + Math.sin(t * 0.5 + i) * 18) % W;
          const y = H - ((t * (14 + (i % 5) * 7) + i * 61) % (H + 60)) + 20;
          const r = 1.5 + (i % 4) * 0.9;
          ctx.globalAlpha = Math.max(0, 0.10 + 0.12 * Math.sin(t * 2 + i));
          ctx.strokeStyle = '#b6ffd0';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
    } else if (theme.atmos === 'embers') {
      ctx.save();
      ctx.fillStyle = '#ffb066';
      for (let i = 0; i < 20; i++) {
        const x = (i * 173 + Math.sin(t * 0.7 + i) * 30 + W) % W;
        const y = H - ((t * (14 + (i % 5) * 6) + i * 53) % (H + 40)) + 20;
        ctx.globalAlpha = 0.10 + 0.08 * Math.sin(t * 2 + i);
        ctx.beginPath();
        ctx.arc(x, y, 1.4 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // braseiros das colunas tremulando
      for (const d of decorations) {
        if (d.kind !== 'tree') continue;
        const s = d.s;
        const fx = d.x, fy = d.y - 27 * s;
        const flick = Math.max(0.2, 0.55 + 0.25 * Math.sin(t * 11 + d.seed) + 0.15 * Math.sin(t * 23 + d.seed * 2));
        const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, 22 * s);
        glow.addColorStop(0, 'rgba(255,200,110,' + (0.30 * flick).toFixed(3) + ')');
        glow.addColorStop(0.55, 'rgba(255,130,50,' + (0.14 * flick).toFixed(3) + ')');
        glow.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(fx, fy, 22 * s, 0, Math.PI * 2); ctx.fill();
      }
    } else if (theme.atmos === 'pollen') {
      // pólen e pétalas levadas pelo vento
      ctx.save();
      for (let i = 0; i < 26; i++) {
        const x = ((t * (10 + (i % 5) * 4) + i * 149) % (W + 80)) - 40;
        const y = 40 + ((i * 97 + Math.sin(t * 0.8 + i) * 26 + H) % (H - 80));
        const a = 0.10 + 0.10 * (0.5 + 0.5 * Math.sin(t * 1.5 + i));
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 3 === 0 ? '#ffe9a8' : '#d8ffcf';
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // borboletas voando pelo campo
      for (let i = 0; i < 5; i++) {
        const x = (i * 211 + Math.sin(t * 0.6 + i * 1.4) * 46 + W) % W;
        const y = 90 + ((i * 127 + Math.sin(t * 0.9 + i * 2.3) * 34 + H) % (H - 180));
        const flap = 0.35 + 0.65 * Math.abs(Math.sin(t * 8 + i));
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = ['#ffe9a8', '#ffd1e8', '#cfe8ff'][i % 3];
        ctx.beginPath(); ctx.ellipse(-3 * flap, 0, 1 + 3 * flap, 4, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3 * flap, 0, 1 + 3 * flap, 4, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(60,40,20,0.65)';
        ctx.beginPath(); ctx.ellipse(0, 0, 1, 3.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else if (theme.atmos === 'dust') {
      // sol e poeira quente do deserto
      ctx.save();
      const sun = ctx.createRadialGradient(W * 0.84, H * 0.04, 6, W * 0.84, H * 0.04, 320);
      sun.addColorStop(0, 'rgba(255,245,190,0.16)');
      sun.addColorStop(0.5, 'rgba(255,220,140,0.06)');
      sun.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 22; i++) {
        const x = ((t * (18 + (i % 6) * 5) + i * 131) % (W + 120)) - 60;
        const y = 60 + ((i * 83 + Math.sin(t * 0.6 + i) * 18 + H) % (H - 100));
        ctx.globalAlpha = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(t + i));
        ctx.fillStyle = '#fff0c0';
        ctx.beginPath();
        ctx.ellipse(x, y, 5 + (i % 4) * 2, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // ondas de calor
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,245,200,0.07)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const baseY = H * 0.52 + i * 30;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 40) {
          const yy = baseY + Math.sin(x * 0.018 + t * 1.8 + i) * 4;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawPathLights() {
    const ep = pathEndpoints(PATH);
    const t = state.time;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);

    ctx.save();
    let g = ctx.createRadialGradient(ep.sx, ep.sy, 2, ep.sx, ep.sy, 44);
    g.addColorStop(0, 'rgba(228,214,255,' + (0.20 + 0.12 * pulse).toFixed(3) + ')');
    g.addColorStop(0.55, 'rgba(150,110,255,' + (0.08 + 0.06 * pulse).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(100,60,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ep.sx, ep.sy, 44, 0, Math.PI * 2); ctx.fill();

    g = ctx.createRadialGradient(ep.gx, ep.gy, 2, ep.gx, ep.gy, 36);
    g.addColorStop(0, 'rgba(255,214,148,' + (0.13 + 0.08 * pulse).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ep.gx, ep.gy, 36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const sh = state.shake;
    const ox = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;
    const oy = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;
    ctx.save();
    ctx.translate(ox, oy);

    ctx.drawImage(bg, 0, 0);
    drawThemeAtmosphere();
    drawPathLights();

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
    for (const sk of state.summons) drawSummon(sk);
    for (const p of state.projectiles) drawProjectile(p);
    drawEffects();
    drawParticles();
    drawTexts();
    ctx.restore();

    // vinheta vermelha ao perder vida
    if (state.hurt > 0) {
      const a = Math.min(0.55, state.hurt * 1.1);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.72);
      g.addColorStop(0, 'rgba(255,40,70,0)');
      g.addColorStop(1, 'rgba(255,40,70,' + a.toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

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
    UI.wave.textContent = state.wave + ' / ' + state.maxWaves;
    UI.score.textContent = state.score;
    UI.towers.textContent = state.towers.length + ' / ' + state.maxTowers;
    if (UI.livesPill) UI.livesPill.classList.toggle('danger', state.lives <= 5 && state.phase !== 'menu');
    if (UI.moneyPill) UI.moneyPill.classList.toggle('poor', state.money < 70);

    let done = state.wave;
    if (state.phase === 'wave') {
      const total = Math.max(1, state.waveTotal);
      const left = state.spawnQueue.length + state.enemies.length;
      const inside = Math.max(0, Math.min(1, 1 - left / total));
      done = Math.max(0, state.wave - 1) + inside;
    }
    const pct = Math.max(0, Math.min(100, (done / Math.max(1, state.maxWaves)) * 100));
    if (UI.progressFill && UI.progressFill.style) {
      UI.progressFill.style.width = pct.toFixed(1) + '%';
    }

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

    if (!state.paused && (state.phase === 'build' || state.phase === 'wave')) {
      for (let i = 0; i < state.speed; i++) update(dt);
    }

    updateLiveHUD();
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Init ----------
  function init() {
    buildShop();
    buildMenu();
    openMenu();

    UI.startWaveBtn.addEventListener('click', startWave);
    if (UI.skipWaveBtn) UI.skipWaveBtn.addEventListener('click', skipWave);
    UI.pauseBtn.addEventListener('click', () => {
      state.paused = !state.paused;
      refreshUI();
    });
    UI.speedBtn.addEventListener('click', () => {
      const steps = [1, 2, 3, 5];
      const idx = steps.indexOf(state.speed);
      state.speed = steps[(idx + 1) % steps.length];
      refreshUI();
    });
    if (UI.autoBtn) UI.autoBtn.addEventListener('click', () => {
      state.autoStart = !state.autoStart;
      state.autoTimer = 2.5;
      refreshUI();
    });
    UI.restartBtn.addEventListener('click', restartGame);
    UI.menuBtn.addEventListener('click', openMenu);
    UI.upgradeBtn.addEventListener('click', upgradeSelected);
    UI.sellBtn.addEventListener('click', sellSelected);

    if (UI.playBtn) UI.playBtn.addEventListener('click', () => showMenuView('levels'));
    if (UI.backMenuBtn) UI.backMenuBtn.addEventListener('click', () => showMenuView('main'));
    if (UI.howBtn) UI.howBtn.addEventListener('click', () => openMenuModal('how'));
    if (UI.creditsBtn) UI.creditsBtn.addEventListener('click', () => openMenuModal('credits'));

    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('[data-close]').forEach(el => {
        el.addEventListener('click', ev => {
          ev.stopPropagation();
          closeMenuModals();
        });
      });
    }
    for (const modal of [UI.howModal, UI.creditsModal]) {
      if (modal) modal.addEventListener('click', ev => {
        if (ev.target === modal) closeMenuModals();
      });
    }
    UI.overlayBtn.addEventListener('click', () => {
      if (overlayNextLevel) {
        const next = overlayNextLevel;
        overlayNextLevel = null;
        startLevel(next);
      } else {
        restartGame();
      }
    });
    UI.overlayMenuBtn.addEventListener('click', openMenu);

    requestAnimationFrame(frame);
  }

  init();
})();
