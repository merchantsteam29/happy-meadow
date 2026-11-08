// Act 1: the cute 2D side-scroller. Three "days" that rot a little more each time.
import * as A from './art.js';
import { audio } from './audio.js';
import { input } from './input.js';

export const W = 960, H = 540;
const GROUND = 440;

const SPEAKERS = {
  Mochi: { col: '#ff7eb6', pitch: 760 },
  Bea: { col: '#c58b5c', pitch: 420 },
  Pip: { col: '#f2b600', pitch: 980 },
  Sunny: { col: '#ff9d00', pitch: 300 },
  '???': { col: '#8a0000', pitch: 120 }
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = ((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t;
  const g = ((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t;
  const bl = (pa & 255) * (1 - t) + (pb & 255) * t;
  return `rgb(${r | 0},${g | 0},${bl | 0})`;
}

const say = (who, text, glitch) => ({ say: [who, text], glitch });
const LEVELS = [
  {
    title: 'Day 1', sub: 'Sunny Meadow', width: 3200, corrupt: [0, 0], seed: 3,
    ground: [[0, 900], [1000, 1700], [1820, 3200]],
    plats: [[400, 350, 140], [620, 280, 140], [1090, 340, 150], [1330, 260, 150], [1980, 350, 120], [2220, 280, 120], [2470, 340, 160]],
    carrots: [[300, 410], [470, 320], [690, 250], [950, 360], [1160, 310], [1400, 230], [1600, 410], [2040, 320], [2280, 250], [2700, 410]],
    actors: [{ type: 'bear', x: 640 }, { type: 'duck', x: 1560, facing: -1 }],
    goal: 3000,
    events: [
      { x: 560, steps: [say('Bea', 'Good morning, Mochi! Isn\'t it a perfect day?'), say('Mochi', 'The best day ever! I\'m gonna collect ALL the carrots!')] },
      { x: 1470, steps: [say('Pip', 'Quack quack! Race you to the little pink house!'), say('Mochi', 'You\'re on, Pip!')] },
      { x: 2150, steps: [say('Sunny', 'Hello, little bunny! What a good friend you are :)'), say('Sunny', 'I\'ll always be watching over you.'), say('Mochi', 'Thank you, Sunny!')] }
    ]
  },
  {
    title: 'Day 2', sub: 'Sunny Meadow', width: 3200, corrupt: [0.15, 0.45], seed: 11,
    ground: [[0, 700], [820, 1650], [1780, 2400], [2500, 3200]],
    plats: [[560, 340, 130], [760, 270, 110], [1050, 330, 140], [1250, 250, 140], [1690, 330, 80], [2000, 340, 130], [2390, 300, 120], [2700, 330, 150]],
    carrots: [[260, 410], [610, 310], [800, 240], [1110, 300], [1320, 220], [1540, 410], [1720, 300], [2060, 310], [2430, 270], [2800, 410]],
    actors: [{ type: 'bear', x: 520, sad: true }, { type: 'hat', x: 1520 }],
    goal: 3000,
    events: [
      { x: 430, steps: [say('Bea', 'Mochi... have you seen Pip?'), say('Bea', 'Sunny said it wanted to show him a secret. He never came home.'), say('Mochi', 'I\'m sure he\'s okay! Let\'s look for him!')] },
      { x: 1450, steps: [say('Mochi', 'This is Pip\'s hat...'), { do: g => { g.glitch(0.4); g.sunMood = 1; } }, say('Sunny', 'Don\'t worry about Pip :)'), say('Sunny', 'He\'s on the other side now.', true), { do: g => { g.sunMood = 0; } }] },
      { x: 2350, steps: [say('Mochi', 'Bea? Where did you go?'), say('Mochi', '...everyone is so quiet today.')] }
    ]
  },
  {
    title: 'Day 3', sub: 'Sunny Meadow', badSub: 'IT IS NOT A SUN', width: 2900, corrupt: [0.55, 1], seed: 23, rotten: true, edge: 2760,
    ground: [[0, 820], [940, 1500], [1620, 2760]],
    plats: [[420, 340, 140], [640, 270, 120], [1080, 320, 140], [1500, 320, 90], [1800, 340, 140]],
    carrots: [[300, 410], [480, 310], [700, 240], [1140, 290], [1530, 290], [1700, 410], [1860, 310], [2100, 410]],
    actors: [{ type: 'bear', x: 1380, back: true }, { type: 'gore', x: 1980 }],
    goal: null,
    events: [
      { x: 120, steps: [say('Mochi', 'It\'s so quiet today...'), { do: g => { g.sunMood = 1; } }, say('Sunny', 'Good morning, Mochi.'), say('Sunny', 'I watched you sleep last night. You looked so soft.', true)] },
      { x: 1290, steps: [say('Mochi', 'Bea! There you are!'), { do: g => { const b = g.actors.find(a => a.type === 'bear'); b.back = false; b.hollow = true; g.glitch(0.5); audio.stinger(); } },
        say('Bea', 'it\'s not a sun, mochi.', true), say('Bea', 'it\'s a FACE.', true),
        { do: g => { g.actors = g.actors.filter(a => a.type !== 'bear'); g.glitch(0.8); g.faceFlash = 0.25; audio.scream(); } }] },
      { x: 1900, steps: [{ do: () => audio.stopMusic() }, say('Mochi', '...Pip?'), say('Mochi', 'P-Pip? that\'s your hat... why is it all red?'), { do: g => { g.sunMood = 2; audio.giggle(0, 0.25); } }] },
      { x: 2380, steps: [{ do: g => { g.lock = true; g.sunMode = 'descend'; g.sunT = 0; audio.stopMusic(); } }, { wait: 2.6 },
        say('Sunny', 'You\'ve been such a good friend, Mochi.'),
        say('Sunny', 'But this world is so small. So FLAT.', true),
        say('Sunny', 'Do you want to see the rest of the garden?'),
        { do: g => { g.sunMood = 3; g.glitch(0.6); audio.stinger(); } },
        say('Sunny', 'DO YOU WANT TO SEE WHAT I REALLY LOOK LIKE?', true),
        { do: g => { g.frozen = true; g.emit('transition'); } }] }
    ]
  }
];

const ENDING = {
  title: '', sub: '', width: 960, corrupt: [0, 0], seed: 5,
  ground: [[0, 960]], plats: [], carrots: [],
  actors: [{ type: 'bear', x: 520, facing: -1 }, { type: 'duck', x: 610, facing: -1 }],
  goal: null,
  events: [
    { x: 0, steps: [{ wait: 1.2 }, say('Bea', 'MOCHI! You\'re back!!'), say('Pip', 'Quack! I had the scariest dream...'), say('Mochi', 'I missed you both so much. Where\'s Sunny?'),
      say('Bea', 'Who\'s Sunny?'), { wait: 1.4 },
      { do: g => { g.sunMood = 3; g.glitch(0.7); g.faceFlash = 0.35; audio.scream(); } }, { wait: 1.2 },
      { do: g => { g.sunMood = 0; } }, say('Sunny', 'see you tomorrow, Mochi :)'), { do: g => g.emit('end') }] }
  ]
};

export class Cute2D {
  constructor(canvas, emit) {
    this.canvas = canvas;
    this.canvas.width = W * 2; this.canvas.height = H * 2;
    this.ctx = canvas.getContext('2d');
    this.emit = emit;
    this.t = 0;
  }

  start(levelIndex) {
    this.levelIndex = levelIndex;
    const L = this.L = levelIndex === 'ending' ? ENDING : LEVELS[levelIndex];
    this.p = { x: 80, y: GROUND, vx: 0, vy: 0, onGround: true, coyote: 0, jumpBuf: 0, facing: 1, squash: 0, safeX: 80, safeY: GROUND };
    if (levelIndex === 'ending') this.p.x = 220;
    this.camX = 0;
    this.carrots = L.carrots.map(([x, y]) => ({ x, y, taken: false }));
    this.got = 0;
    this.actors = L.actors.map(a => ({ ...a, facing: a.facing || -1 }));
    this.events = L.events.map(e => ({ ...e, done: false }));
    this.script = null; this.dialog = null; this.waitT = 0;
    this.sunMood = 0; this.sunMode = 'sky'; this.sunT = 0;
    this.lock = false; this.frozen = false; this.done = false;
    this.glitchT = 0; this.faceFlash = 0; this.extraC = 0;
    this.fade = 1; this.fadeTarget = 0;
    this.card = L.title ? { t: 0, title: L.title, sub: L.sub, bad: L.badSub } : null;
    this.buildDeco();
    const c0 = L.corrupt[0];
    audio.playMusic('cute', c0);
  }

  buildDeco() {
    const r = rng(this.L.seed), L = this.L;
    this.trees = []; this.flowers = []; this.clouds = [];
    for (let x = 120; x < L.width - 100; x += 180 + r() * 220) {
      if (L.ground.some(([a, b]) => x > a + 30 && x < b - 30)) this.trees.push({ x, s: 0.9 + r() * 0.5 });
    }
    for (let x = 40; x < L.width; x += 30 + r() * 70) {
      if (L.ground.some(([a, b]) => x > a + 10 && x < b - 10)) this.flowers.push({ x, s: 0.6 + r() * 0.5, hue: [330, 290, 50, 200, 10][(r() * 5) | 0] });
    }
    for (let i = 0; i < 9; i++) this.clouds.push({ x: r() * 1800, y: 40 + r() * 140, s: 0.7 + r() * 0.8 });
  }

  get corruption() {
    const [a, b] = this.L.corrupt;
    return Math.min(1, a + (b - a) * Math.max(0, Math.min(1, this.p.x / this.L.width)) + this.extraC);
  }

  glitch(len) { this.glitchT = Math.max(this.glitchT, len); audio.glitch(Math.min(0.6, len)); }

  // ---------------- update ----------------
  update(dt) {
    this.t += dt;
    this.fade += (this.fadeTarget - this.fade) * Math.min(1, dt * 3);
    this.glitchT = Math.max(0, this.glitchT - dt);
    this.faceFlash = Math.max(0, this.faceFlash - dt);
    const c = this.corruption;
    audio.setCorrupt(c);
    if (this.frozen) { if (Math.random() < dt * 3) this.glitchT = Math.max(this.glitchT, 0.1); return; }
    if (this.card) {
      this.card.t += dt;
      if (this.card.t > 2.6) this.card = null;
      return;
    }
    if (c > 0.25 && Math.random() < dt * c * 0.35) this.glitch(0.08 + Math.random() * 0.2 * c);
    if (this.levelIndex === 2 && Math.random() < dt * 0.025) { this.faceFlash = 0.07; audio.glitch(0.1); }

    const p = this.p;
    const busy = !!this.script || !!this.dialog || this.waitT > 0 || this.lock || this.done;
    this.runScript(dt);
    const mx = busy ? 0 : input.moveX;
    p.vx += (mx * 270 - p.vx) * Math.min(1, dt * 12);
    if (mx) p.facing = Math.sign(mx);
    if (!busy && input.jumpPressed()) p.jumpBuf = 0.13;
    p.jumpBuf -= dt; p.coyote -= dt;
    if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -650; p.jumpBuf = 0; p.coyote = 0; p.squash = -1; audio.jump(); }
    p.vy += (p.vy < 0 && !input.jumpHeld() ? 3400 : 1750) * dt;
    p.vy = Math.min(p.vy, 900);
    p.squash *= Math.pow(0.001, dt);

    // horizontal
    p.x += p.vx * dt;
    for (const [a, b] of this.L.ground) {
      if (p.y > GROUND + 2 && p.x + 13 > a && p.x - 13 < b) p.x = (p.x < (a + b) / 2) ? a - 13 : b + 13;
    }
    p.x = Math.max(20, Math.min((this.L.edge || this.L.width) - 20, p.x));
    // vertical
    const prevY = p.y; p.y += p.vy * dt;
    const was = p.onGround; p.onGround = false;
    if (p.vy >= 0) {
      for (const [a, b] of this.L.ground) if (p.x + 11 > a && p.x - 11 < b && prevY <= GROUND + 1 && p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
      for (const [x, y, w] of this.L.plats) if (p.x + 11 > x && p.x - 11 < x + w && prevY <= y + 1 && p.y >= y) { p.y = y; p.vy = 0; p.onGround = true; }
    }
    if (p.onGround) { p.coyote = 0.1; p.safeX = p.x; p.safeY = p.y; if (!was) p.squash = 0.8; }
    if (p.y > 720) { p.x = p.safeX; p.y = p.safeY - 2; p.vx = p.vy = 0; audio.boing(); }

    // carrots
    for (const k of this.carrots) if (!k.taken && Math.abs(k.x - p.x) < 26 && Math.abs(k.y - (p.y - 22)) < 34) {
      k.taken = true; this.got++; audio.carrot(this.L.rotten);
    }
    // actors face the player
    if (this.levelIndex === 1 && this.events[0].done && !this.script) this.actors = this.actors.filter(a => !(a.sad && a.x < this.camX - 90));
    for (const a of this.actors) if (!a.back && a.type !== 'hat' && a.type !== 'gore') a.facing = p.x < a.x ? -1 : 1;
    // events
    if (!this.script) for (const e of this.events) if (!e.done && p.x >= e.x) { e.done = true; this.script = [...e.steps]; this.nextStep(); break; }
    // goal
    if (this.L.goal && !this.done && p.x > this.L.goal - 20) {
      this.done = true; audio.win(); this.fadeTarget = 1;
      setTimeout(() => this.emit('levelDone', this.levelIndex), 1400);
    }
    // camera
    const target = Math.max(0, Math.min(this.L.width - W, p.x - W * 0.4));
    this.camX += (target - this.camX) * Math.min(1, dt * 6);
    if (this.sunMode === 'descend') this.sunT += dt;
  }

  nextStep() {
    this.dialog = null;
    while (this.script && this.script.length) {
      const s = this.script.shift();
      if (s.do) { s.do(this); if (this.frozen) { this.script = null; return; } continue; }
      if (s.wait) { this.waitT = s.wait; return; }
      if (s.say) { this.dialog = { who: s.say[0], text: s.say[1], shown: 0, glitch: s.glitch }; return; }
    }
    this.script = null;
  }

  runScript(dt) {
    if (!this.script && !this.dialog && this.waitT <= 0) return;
    if (this.waitT > 0) { this.waitT -= dt; if (this.waitT <= 0) this.nextStep(); return; }
    const d = this.dialog;
    if (!d) return;
    const before = Math.floor(d.shown);
    d.shown = Math.min(d.text.length, d.shown + dt * 38);
    if (Math.floor(d.shown) !== before && before % 2 === 0) audio.blip(SPEAKERS[d.who]?.pitch || 600);
    if (input.confirmPressed()) {
      if (d.shown < d.text.length) d.shown = d.text.length;
      else { this.nextStep(); if (!this.dialog && !this.script && this.waitT <= 0) this.dialog = null; }
    }
  }

  // ---------------- draw ----------------
  draw() {
    const ctx = this.ctx, c = this.corruption, t = this.t, cam = this.camX, p = this.p;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix('#8fd3ff', '#3b2a3a', c)); g.addColorStop(1, mix('#ffd6ec', '#6a3a3a', c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (c > 0.7) {
      ctx.fillStyle = `rgba(120,0,0,${(c - 0.7) * 0.9})`; ctx.font = '22px "Fredoka", sans-serif';
      ctx.fillText('it is watching', 140 + Math.sin(t) * 3, 120); ctx.fillText('dont look up', 520, 70 + Math.sin(t * 1.3) * 3);
    }
    // sun in the sky
    const lookX = Math.max(-1, Math.min(1, (p.x - cam - 820) / 300)), lookY = 1;
    if (this.sunMode === 'sky') A.sun(ctx, 820, 90, 48, t, { mood: this.sunMood || (c > 0.6 ? 1 : 0), lookX, lookY });
    // clouds
    const cloudCol = mix('#ffffff', '#5a4a55', c);
    for (const cl of this.clouds) {
      const x = ((cl.x + (c > 0.5 ? 0 : t * 8) - cam * 0.2) % 1900 + 1900) % 1900 - 200;
      A.cloud(ctx, x, cl.y, cl.s, cloudCol);
    }
    // hills
    for (const [par, col, cc, base, amp] of [[0.3, '#b6f0b0', '#3e4a3e', 360, 40], [0.55, '#8ee28a', '#2e3a2c', 390, 30]]) {
      ctx.fillStyle = mix(col, cc, c); ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base - Math.sin((x + cam * par) * 0.006) * amp - Math.sin((x + cam * par) * 0.013) * amp * 0.4);
      ctx.lineTo(W, H); ctx.fill();
    }
    ctx.save(); ctx.translate(-cam, 0);
    // trees + flowers
    for (const tr of this.trees) if (tr.x > cam - 100 && tr.x < cam + W + 100) A.tree(ctx, tr.x, GROUND + 2, tr.s, t, c, Math.sign(p.x - tr.x));
    // ground
    for (const [a, b] of this.L.ground) {
      ctx.fillStyle = mix('#c98e5a', '#3a2a22', c); ctx.fillRect(a, GROUND, b - a, H - GROUND);
      ctx.fillStyle = mix('#a8744a', '#2a1c16', c);
      for (let x = a + 14; x < b - 8; x += 38) ctx.beginPath(), ctx.arc(x, GROUND + 40 + (x * 7 % 30), 4, 0, 7), ctx.fill();
      ctx.fillStyle = mix('#7ad86b', '#3a4630', c);
      ctx.beginPath(); ctx.roundRect(a - 4, GROUND - 4, b - a + 8, 18, 9); ctx.fill();
      if (c > 0.75) { ctx.fillStyle = '#5a0000'; for (let x = a + 30; x < b; x += 97) ctx.fillRect(x, GROUND + 12, 3, 10 + (x % 23)); }
    }
    for (const fl of this.flowers) if (fl.x > cam - 40 && fl.x < cam + W + 40) {
      const near = Math.abs(fl.x - p.x) < 90;
      A.flower(ctx, fl.x, GROUND + 2, fl.s * (c > 0.8 && near ? 1.25 : 1), fl.hue, t, c, Math.sign(p.x - fl.x));
      if (c > 0.8) { ctx.fillStyle = 'rgba(110,0,0,0.8)'; ctx.beginPath(); ctx.ellipse(fl.x + 4, GROUND + 4, 9 * fl.s, 2.5, 0, 0, 7); ctx.fill(); }
    }
    // platforms
    for (const [x, y, w] of this.L.plats) {
      ctx.fillStyle = mix('#ffb3d1', '#4a3640', c); ctx.beginPath(); ctx.roundRect(x, y, w, 20, 10); ctx.fill();
      ctx.fillStyle = mix('#ffffff', '#5a4a50', c); ctx.beginPath(); ctx.roundRect(x + 4, y + 3, w - 8, 5, 3); ctx.fill();
    }
    if (this.L.goal) A.house(ctx, this.L.goal + 60, GROUND + 2, 1.1, c);
    // carrots
    for (const k of this.carrots) if (!k.taken) A.carrot(ctx, k.x, k.y + Math.sin(t * 3 + k.x) * 4, 1, this.L.rotten);
    // actors
    for (const a of this.actors) {
      const bob = Math.abs(Math.sin(t * 2 + a.x)) * (a.hollow ? 0 : 2);
      if (a.type === 'bear') A.bear(ctx, a.x, GROUND + 2 - bob, 1.1, { facing: a.facing, back: a.back, hollow: a.hollow, blood: a.hollow, blink: a.sad && Math.sin(t * 2) > 0.6 });
      if (a.type === 'duck') A.duck(ctx, a.x, GROUND + 2 - bob, 1, { facing: a.facing, blink: (t % 4) < 0.15 });
      if (a.type === 'hat') A.hat(ctx, a.x, GROUND - 2, 0.9);
      if (a.type === 'gore') this.drawGore(ctx, a.x);
    }
    // player
    A.bunny(ctx, p.x, p.y + 2, 1, { facing: p.facing, t, squash: p.squash, blink: (t % 3.5) < 0.12, earDroop: c > 0.8 });
    // descending sun
    if (this.sunMode === 'descend') {
      const k = Math.min(1, this.sunT / 2.4), e = k * k * (3 - 2 * k);
      const sx = cam + 820 + ((p.x + 230) - (cam + 820)) * e, sy = 90 + (230 - 90) * e, r = 48 + 92 * e;
      A.sun(ctx, sx + (Math.random() - 0.5) * 4 * e, sy, r, t, { mood: this.sunMood || 2, lookX: -1, lookY: 0.5 });
    }
    // paper edge / void
    if (this.L.edge) {
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(this.L.edge + 20, -10);
      for (let y = 0; y <= H + 20; y += 18) ctx.lineTo(this.L.edge + 10 + Math.sin(y * 1.7) * 9 + (y * 13 % 7), y);
      ctx.lineTo(this.L.edge + 2000, H + 20); ctx.lineTo(this.L.edge + 2000, -10); ctx.fill();
    }
    ctx.restore();

    // grading
    if (c > 0.02) {
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${c * 0.75})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(${(40 + c * 60) | 0},0,0,${c * 0.8})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    // HUD
    if (this.levelIndex !== 'ending') {
      A.carrot(ctx, 34, 34, 1, this.L.rotten);
      ctx.fillStyle = c > 0.6 ? '#ddd' : '#fff'; ctx.strokeStyle = 'rgba(80,40,60,0.6)'; ctx.lineWidth = 4;
      ctx.font = 'bold 24px "Fredoka", sans-serif'; ctx.textAlign = 'left';
      const txt = `${this.got} / ${this.carrots.length}`; ctx.strokeText(txt, 54, 44); ctx.fillText(txt, 54, 44);
      ctx.textAlign = 'right'; ctx.strokeText(this.L.title, W - 24, 44); ctx.fillText(this.L.title, W - 24, 44); ctx.textAlign = 'left';
    }
    this.drawDialog(ctx, c);
    if (this.glitchT > 0) this.drawGlitch();
    if (this.faceFlash > 0) {
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      A.sun(ctx, W / 2 + (Math.random() - 0.5) * 30, H / 2, 230, t, { mood: 3, lookX: 0, lookY: 0 });
    }
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    if (this.card) this.drawCard(ctx);
    if (this.fade > 0.01) { ctx.fillStyle = `rgba(255,240,248,${this.fade})`; if (this.levelIndex === 2) ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, W, H); }
  }

  drawGore(ctx, x) {
    ctx.fillStyle = '#6a0000'; ctx.beginPath(); ctx.ellipse(x, GROUND + 6, 70, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9a0a0a'; ctx.beginPath(); ctx.ellipse(x - 10, GROUND + 4, 40, 6, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 9; i++) {
      ctx.save(); ctx.translate(x - 50 + i * 12, GROUND - 2 - (i % 3) * 4); ctx.rotate(i * 1.3);
      A.ellipse(ctx, 0, 0, 7, 2.5, i % 2 ? '#ffe066' : '#d9b84a'); ctx.restore();
    }
    A.ellipse(ctx, x + 18, GROUND - 4, 9, 5, '#ff9d3b'); // beak
    ctx.fillStyle = '#7a0000'; ctx.fillRect(x + 12, GROUND - 5, 14, 2);
    A.hat(ctx, x - 28, GROUND - 2, 0.9);
    ctx.fillStyle = '#7a0000'; ctx.fillRect(x - 36, GROUND - 12, 6, 8); ctx.fillRect(x - 22, GROUND - 8, 4, 6);
  }

  drawDialog(ctx, c) {
    const d = this.dialog; if (!d) return;
    const sp = SPEAKERS[d.who] || SPEAKERS['???'];
    const x = 70, y = 82, w = 690, h = 120;
    ctx.fillStyle = c > 0.7 ? 'rgba(30,18,22,0.92)' : 'rgba(255,250,252,0.95)';
    ctx.strokeStyle = c > 0.7 ? '#5a0000' : sp.col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sp.col; ctx.beginPath(); ctx.roundRect(x + 20, y - 20, 130, 36, 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Fredoka", sans-serif'; ctx.fillText(d.who, x + 36, y + 5);
    let text = d.text.slice(0, Math.floor(d.shown));
    if (d.glitch || c > 0.75) {
      text = [...text].map(ch => (ch !== ' ' && Math.random() < (d.glitch ? 0.06 : 0.02)) ? '█▓▒░#?'[(Math.random() * 6) | 0] : ch).join('');
    }
    ctx.fillStyle = c > 0.7 ? '#e8d8d8' : '#4a3040';
    ctx.font = `${d.glitch && c > 0.5 ? 'bold ' : ''}22px "Fredoka", sans-serif`;
    const words = text.split(' '); let line = '', ly = y + 52;
    for (const wd of words) {
      if (ctx.measureText(line + wd).width > w - 60) { ctx.fillText(line, x + 30 + (d.glitch ? (Math.random() - 0.5) * 3 : 0), ly); line = ''; ly += 30; }
      line += wd + ' ';
    }
    ctx.fillText(line, x + 30 + (d.glitch ? (Math.random() - 0.5) * 3 : 0), ly);
    if (d.shown >= d.text.length && Math.sin(this.t * 6) > 0) { ctx.fillStyle = sp.col; ctx.fillText('▼', x + w - 40, y + h - 16); }
  }

  drawGlitch() {
    const ctx = this.ctx, cv = this.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const n = 6 + (Math.random() * 8) | 0;
    for (let i = 0; i < n; i++) {
      const y = Math.random() * cv.height, h = 6 + Math.random() * 70, dx = (Math.random() - 0.5) * 120;
      ctx.drawImage(cv, 0, y, cv.width, h, dx, y, cv.width, h);
    }
    if (Math.random() < 0.5) {
      ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = Math.random() < 0.5 ? '#ff0040' : '#00ffd0';
      ctx.fillRect(0, Math.random() * cv.height, cv.width, 10 + Math.random() * 40);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  drawCard(ctx) {
    const k = this.card.t, a = Math.min(1, k * 2, (2.6 - k) * 2);
    const dark = this.levelIndex === 2;
    ctx.fillStyle = dark ? '#000' : '#fff0f7'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
    ctx.fillStyle = dark ? '#ddd' : '#ff7eb6'; ctx.font = 'bold 64px "Fredoka", sans-serif';
    ctx.fillText(this.card.title, W / 2, H / 2 - 10);
    const bad = this.card.bad && Math.random() < 0.12;
    ctx.font = '28px "Fredoka", sans-serif'; ctx.fillStyle = bad ? '#a00' : (dark ? '#999' : '#c58bb0');
    ctx.fillText(bad ? this.card.bad : this.card.sub + ' ♥', W / 2 + (bad ? (Math.random() - 0.5) * 8 : 0), H / 2 + 40);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}

export const LEVEL_COUNT = LEVELS.length;
