// Procedural "realistic" textures: albedo + normal + roughness maps drawn into canvases.
import * as THREE from 'three';

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// tileable value noise + fbm
function makeNoise(seed) {
  const r = rng(seed), N = 256, v = new Float32Array(N * N);
  for (let i = 0; i < v.length; i++) v[i] = r();
  const at = (x, y) => v[((y & (N - 1)) * N) + (x & (N - 1))];
  return (x, y, period) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const p = period || N;
    const a = at(x0 % p, y0 % p), b = at((x0 + 1) % p, y0 % p), c = at(x0 % p, (y0 + 1) % p), d = at((x0 + 1) % p, (y0 + 1) % p);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
function fbmFn(seed) {
  const n = makeNoise(seed);
  return (x, y, oct = 5, period = 8) => {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += amp * n(x * f, y * f, period * f); amp *= 0.5; f *= 2; }
    return s;
  };
}

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// heights in [0,1] → tangent-space normal map canvas
function normalFromHeight(H, w, h, strength = 2) {
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = H[y * w + ((x - 1 + w) % w)], r = H[y * w + ((x + 1) % w)], u = H[((y - 1 + h) % h) * w + x], dn = H[((y + 1) % h) * w + x];
    let nx = (l - r) * strength, ny = (u - dn) * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const i = (y * w + x) * 4;
    d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = nz * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}

function fromPixels(w, h, fn) {
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a = 255] = fn(x, y), i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  }
  ctx.putImageData(img, 0, 0); return c;
}

export function tex(c, { repeat = 1, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = aniso;
  return t;
}
const set = (alb, nrm, rough, o = {}) => ({
  map: tex(alb, o), normalMap: tex(nrm, { ...o, srgb: false }), roughnessMap: rough ? tex(rough, { ...o, srgb: false }) : null
});
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = v => Math.max(0, Math.min(255, v));

// --- ground: dead grass, mud, wet puddles, fallen leaves
export function ground(size = 512, repeat = 18) {
  const f = fbmFn(11), g = fbmFn(12), H = new Float32Array(size * size), R = new Float32Array(size * size);
  const r = rng(5);
  const alb = fromPixels(size, size, (x, y) => {
    const u = x / size * 8, v = y / size * 8;
    const n = f(u, v, 6, 8), m = g(u * 0.5, v * 0.5, 4, 4), fine = f(u * 8, v * 8, 2, 64);
    const grass = Math.max(0, Math.min(1, (n - 0.42) * 4));
    const wet = m < 0.36 ? Math.min(1, (0.36 - m) * 12) : 0;
    H[y * size + x] = n * 0.6 + fine * 0.4 - wet * 0.3;
    R[y * size + x] = lerp(0.95, 0.08, wet);
    let cr = lerp(48, 58, grass) + fine * 25, cg = lerp(38, 56, grass) + fine * 22, cb = lerp(28, 30, grass) + fine * 12;
    cr *= 1 - wet * 0.55; cg *= 1 - wet * 0.55; cb *= 1 - wet * 0.45;
    return [clamp(cr), clamp(cg), clamp(cb)];
  });
  // leaves and twigs
  const ctx = alb.getContext('2d');
  for (let i = 0; i < 260; i++) {
    ctx.save(); ctx.translate(r() * size, r() * size); ctx.rotate(r() * 6.28);
    ctx.fillStyle = `rgba(${70 + r() * 50 | 0},${40 + r() * 30 | 0},${20 + r() * 15 | 0},0.8)`;
    ctx.beginPath(); ctx.ellipse(0, 0, 2 + r() * 3, 1 + r() * 1.5, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.strokeStyle = 'rgba(30,22,15,0.7)'; ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) { const x = r() * size, y = r() * size, a = r() * 6.28, l = 6 + r() * 16; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
  const rough = fromPixels(size, size, (x, y) => { const v = R[y * size + x] * 255; return [v, v, v]; });
  return set(alb, normalFromHeight(H, size, size, 6), rough, { repeat });
}

// --- bark: long vertical fissures
export function bark(size = 256) {
  const f = fbmFn(21), H = new Float32Array(size * size);
  const alb = fromPixels(size, size, (x, y) => {
    const u = x / size * 8, v = y / size * 2;
    const ridge = 1 - Math.abs(f(u * 2.5, v * 0.6, 5, 20) * 2 - 1);
    const n = f(u * 4, v * 4, 3, 32);
    H[y * size + x] = ridge * 0.8 + n * 0.2;
    const k = 22 + ridge * 40 + n * 18;
    return [clamp(k * 1.05), clamp(k * 0.95), clamp(k * 0.85)];
  });
  return set(alb, normalFromHeight(H, size, size, 9), null);
}

// --- pale dead skin with veins and dirt (Sunny)
export function skin(size = 512) {
  const f = fbmFn(31), H = new Float32Array(size * size), r = rng(9);
  const alb = fromPixels(size, size, (x, y) => {
    const u = x / size * 6, v = y / size * 6;
    const n = f(u, v, 5, 6), fine = f(u * 10, v * 10, 2, 60);
    H[y * size + x] = fine * 0.7 + n * 0.3;
    const dirt = Math.max(0, (n - 0.55) * 3);
    return [clamp(168 - dirt * 70 + fine * 20), clamp(158 - dirt * 70 + fine * 15), clamp(140 - dirt * 60 + fine * 10)];
  });
  const ctx = alb.getContext('2d');
  for (let i = 0; i < 70; i++) {
    let x = r() * size, y = r() * size;
    ctx.strokeStyle = `rgba(${60 + r() * 40 | 0},${40 + r() * 30 | 0},${80 + r() * 40 | 0},${0.25 + r() * 0.3})`; ctx.lineWidth = 0.6 + r() * 1.4;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 12; k++) { x += (r() - 0.5) * 22; y += r() * 14; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(80,20,15,${0.15 + r() * 0.3})`; ctx.beginPath(); ctx.ellipse(r() * size, r() * size, 3 + r() * 10, 2 + r() * 6, r() * 3, 0, 7); ctx.fill(); }
  return set(alb, normalFromHeight(H, size, size, 3), null);
}

// --- Sunny's mask: cracked, yellowed porcelain sun face with carved holes and blood.
export function mask(size = 512) {
  const f = fbmFn(41), H = new Float32Array(size * size), r = rng(4);
  const alb = fromPixels(size, size, (x, y) => {
    const u = x / size * 5, v = y / size * 5, n = f(u, v, 5, 5);
    H[y * size + x] = 0.6 + n * 0.1;
    return [clamp(205 + n * 30), clamp(170 + n * 30), clamp(90 + n * 30)];
  });
  const ctx = alb.getContext('2d'), c = size / 2;
  // stains
  for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(90,60,20,${r() * 0.15})`; ctx.beginPath(); ctx.arc(r() * size, r() * size, 10 + r() * 60, 0, 7); ctx.fill(); }
  // eyes + grin (drawn black = holes)
  const eye = (x) => { ctx.fillStyle = '#050202'; ctx.beginPath(); ctx.ellipse(x, c - size * 0.08, size * 0.075, size * 0.105, 0, 0, 7); ctx.fill(); };
  eye(c - size * 0.15); eye(c + size * 0.15);
  ctx.fillStyle = '#070202'; ctx.beginPath();
  ctx.moveTo(c - size * 0.3, c + size * 0.06);
  ctx.quadraticCurveTo(c, c + size * 0.42, c + size * 0.3, c + size * 0.06);
  ctx.quadraticCurveTo(c, c + size * 0.2, c - size * 0.3, c + size * 0.06); ctx.fill();
  // cracks
  ctx.strokeStyle = 'rgba(40,25,10,0.85)'; ctx.lineWidth = 1.3;
  const crackPts = [];
  for (let i = 0; i < 14; i++) {
    let x = c + (r() - 0.5) * size * 0.8, y = c + (r() - 0.5) * size * 0.8; ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 10; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; ctx.lineTo(x, y); crackPts.push([x | 0, y | 0]); }
    ctx.stroke();
  }
  for (const [x, y] of crackPts) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < size && yy < size) H[yy * size + xx] = 0.3; }
  // holes are deep
  const img = ctx.getImageData(0, 0, size, size).data;
  for (let i = 0; i < size * size; i++) if (img[i * 4] < 20) H[i] = 0;
  // blood: tears from the eyes, drool from the grin
  const R = new Float32Array(size * size).fill(0.55);
  ctx.fillStyle = 'rgba(95,0,0,0.92)';
  const run = (x, y, len, w) => {
    ctx.beginPath(); ctx.moveTo(x - w, y);
    let yy = y; for (; yy < y + len; yy += 6) ctx.lineTo(x - w + Math.sin(yy * 0.2) * 1.5, yy);
    ctx.arc(x, yy, w * 1.4, Math.PI, 0, true); ctx.lineTo(x + w, y); ctx.fill();
    for (let yv = y; yv < yy + w; yv++) for (let xv = (x - w * 2) | 0; xv < x + w * 2; xv++) if (xv >= 0 && yv >= 0 && xv < size && yv < size) R[yv * size + xv] = 0.06;
  };
  run(c - size * 0.15, c - size * 0.0, size * 0.26, 4); run(c + size * 0.16, c - size * 0.0, size * 0.36, 5); run(c - size * 0.2, c + size * 0.12, size * 0.14, 3);
  for (let i = 0; i < 6; i++) run(c - size * 0.12 + i * size * 0.05, c + size * 0.26, size * (0.06 + r() * 0.16), 2.5 + r() * 2);
  const rough = fromPixels(size, size, (x, y) => { const v = R[y * size + x] * 255; return [v, v, v]; });
  return set(alb, normalFromHeight(H, size, size, 8), rough, { repeat: 1 });
}

// --- wet flesh (flowers, gore)
export function flesh(size = 256) {
  const f = fbmFn(51), H = new Float32Array(size * size), r = rng(7);
  const alb = fromPixels(size, size, (x, y) => {
    const u = x / size * 6, v = y / size * 6, n = f(u, v, 5, 6), fine = f(u * 8, v * 8, 2, 48);
    H[y * size + x] = n * 0.5 + fine * 0.5;
    return [clamp(120 + n * 70), clamp(25 + n * 30), clamp(35 + n * 25)];
  });
  const ctx = alb.getContext('2d');
  for (let i = 0; i < 40; i++) {
    let x = r() * size, y = r() * size; ctx.strokeStyle = `rgba(${50 + r() * 40 | 0},0,${20 + r() * 30 | 0},0.6)`; ctx.lineWidth = 0.6 + r() * 2;
    ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (r() - 0.5) * 18; y += (r() - 0.5) * 18; ctx.lineTo(x, y); } ctx.stroke();
  }
  return set(alb, normalFromHeight(H, size, size, 5), null);
}

export function eyeball(size = 256) {
  const r = rng(3);
  const c = fromPixels(size, size, () => [226, 214, 196]);
  const ctx = c.getContext('2d');
  // the iris sits at u = 0.75 (front after rotating the sphere by -PI/2 ... handled by caller)
  for (let i = 0; i < 90; i++) {
    let x = r() * size, y = r() * size; ctx.strokeStyle = `rgba(${140 + r() * 60 | 0},${10 + r() * 20 | 0},10,${0.3 + r() * 0.5})`; ctx.lineWidth = 0.5 + r();
    ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 16; y += (r() - 0.5) * 16; ctx.lineTo(x, y); } ctx.stroke();
  }
  return tex(c);
}
export function iris(size = 128) {
  const c = canvas(size, size), ctx = c.getContext('2d'), r = rng(8), m = size / 2;
  const g = ctx.createRadialGradient(m, m, 2, m, m, m); g.addColorStop(0, '#000'); g.addColorStop(0.28, '#000'); g.addColorStop(0.32, '#5a2a10'); g.addColorStop(0.9, '#2a0c04'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 120; i++) { const a = r() * 6.28; ctx.strokeStyle = `rgba(${150 + r() * 80 | 0},${80 + r() * 40 | 0},20,0.35)`; ctx.beginPath(); ctx.moveTo(m + Math.cos(a) * m * 0.32, m + Math.sin(a) * m * 0.32); ctx.lineTo(m + Math.cos(a) * m * 0.85, m + Math.sin(a) * m * 0.85); ctx.stroke(); }
  return tex(c);
}

// --- irregular blood splat alpha (white = blood)
export function splat(seed = 1, size = 256) {
  const c = canvas(size, size), ctx = c.getContext('2d'), r = rng(seed), m = size / 2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.28, rad = m * (0.45 + r() * 0.2); ctx.lineTo(m + Math.cos(a) * rad, m + Math.sin(a) * rad * 0.8); }
  ctx.fill();
  for (let i = 0; i < 22; i++) { const a = r() * 6.28, d = m * (0.5 + r() * 0.45); ctx.beginPath(); ctx.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, 1 + r() * 7, 0, 7); ctx.fill(); }
  for (let i = 0; i < 5; i++) { const a = r() * 6.28; ctx.lineWidth = 3 + r() * 6; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(m, m); ctx.lineTo(m + Math.cos(a) * m * 0.95, m + Math.sin(a) * m * 0.95); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); return t;
}

// --- weathered painted wood (fence, house)
export function wood(size = 256, paint = [200, 190, 175]) {
  const f = fbmFn(61), H = new Float32Array(size * size);
  const alb = fromPixels(size, size, (x, y) => {
    const u = x / size * 3, v = y / size * 12, grain = f(u * 6, v * 0.4, 4, 18), n = f(u * 2, v * 0.5, 4, 6);
    const peel = n > 0.52;
    H[y * size + x] = grain * 0.6 + (peel ? 0 : 0.3);
    const w = 55 + grain * 50;
    return peel ? [clamp(w * 1.1), clamp(w * 0.85), clamp(w * 0.6)] : [clamp(paint[0] * (0.75 + grain * 0.35)), clamp(paint[1] * (0.75 + grain * 0.35)), clamp(paint[2] * (0.75 + grain * 0.35))];
  });
  return set(alb, normalFromHeight(H, size, size, 4), null);
}

// --- soggy cardboard with corrugation + scrawl
export function cardboard(size = 256) {
  const f = fbmFn(71), H = new Float32Array(size * size);
  const alb = fromPixels(size, size, (x, y) => {
    const n = f(x / size * 4, y / size * 4, 4, 4), stripes = Math.sin(y * 0.9) * 0.5 + 0.5;
    H[y * size + x] = stripes * 0.4 + n * 0.6;
    const wet = n < 0.4 ? 0.65 : 1;
    return [clamp((150 + n * 40) * wet), clamp((110 + n * 30) * wet), clamp((70 + n * 20) * wet)];
  });
  const ctx = alb.getContext('2d');
  ctx.fillStyle = 'rgba(25,10,10,0.85)'; ctx.font = 'bold 44px "Fredoka", sans-serif'; ctx.fillText('MOCHI', 50, 120);
  ctx.fillStyle = 'rgba(110,0,0,0.85)'; ctx.fillText('♥', 108, 172);
  ctx.fillStyle = '#000'; ctx.fillRect(40, 58, 176, 9);
  ctx.fillStyle = 'rgba(80,0,0,0.6)'; for (let i = 0; i < 4; i++) ctx.fillRect(60 + i * 40, 180, 4, 40 + i * 12);
  return set(alb, normalFromHeight(H, size, size, 3), null);
}

// --- white fur (Mochi's paw)
export function fur(size = 128) {
  const f = fbmFn(81), H = new Float32Array(size * size);
  const alb = fromPixels(size, size, (x, y) => {
    const s = f(x / size * 30, y / size * 3, 3, 30); H[y * size + x] = s;
    const k = 200 + s * 50; return [clamp(k), clamp(k * 0.97), clamp(k * 0.97)];
  });
  return set(alb, normalFromHeight(H, size, size, 6), null);
}

export function softDot(size = 64) {
  const c = canvas(size, size), ctx = c.getContext('2d'), g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export function mist(size = 256) {
  const f = fbmFn(91);
  const c = fromPixels(size, size, (x, y) => {
    const dx = x / size - 0.5, dy = y / size - 0.5, fall = Math.max(0, 1 - Math.hypot(dx, dy) * 2);
    const n = f(x / size * 4, y / size * 4, 5, 4);
    return [255, 255, 255, clamp(fall * fall * n * 255 * 1.4)];
  });
  return new THREE.CanvasTexture(c);
}
