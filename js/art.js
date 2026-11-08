// Cute (and not so cute) procedural drawings shared by the 2D act and the 3D textures.

export function ellipse(ctx, x, y, rx, ry, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function eyes(ctx, ex, ey, gap, o) {
  if (o.scribble) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i < 9; i++) ctx.lineTo(ex + s * gap + Math.sin(i * 2.7) * 5, ey + Math.cos(i * 1.9) * 5);
      ctx.stroke();
    }
    return;
  }
  for (const s of [-1, 1]) {
    const x = ex + s * gap;
    if (o.hollow) {
      ellipse(ctx, x, ey, 4.5, 6.5, '#000');
      if (o.blood) {
        ctx.fillStyle = '#8a0000';
        ctx.fillRect(x - 1.2, ey + 4, 2.4, 9 + (s > 0 ? 5 : 0));
      }
      continue;
    }
    if (o.blink) {
      ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 3, ey); ctx.lineTo(x + 3, ey); ctx.stroke();
      continue;
    }
    ellipse(ctx, x + (o.lookX || 0), ey + (o.lookY || 0), 3.2, 4, '#2a2230');
    ellipse(ctx, x + (o.lookX || 0) + 1, ey + (o.lookY || 0) - 1.5, 1.2, 1.2, '#fff');
  }
}

// x,y = feet centre. ~60px tall at s=1.
export function bunny(ctx, x, y, s, o = {}) {
  const f = o.facing || 1, t = o.t || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
  const sq = o.squash || 0;
  ctx.scale(1 + sq * 0.15, 1 - sq * 0.15);
  const fur = o.fur || '#ffffff', line = o.line || '#e6cdd8';
  const wig = Math.sin(t * 3) * 0.08;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 8, -32); ctx.rotate(side * 0.2 + wig * side + (o.earDroop ? side * 0.9 : 0));
    ellipse(ctx, 0, -14, 6, 15, fur, line); ellipse(ctx, 0, -13, 3, 10, o.hollow ? '#6b2a3a' : '#ffb6c9');
    ctx.restore();
  }
  ellipse(ctx, -9, -3, 7, 4, fur, line); ellipse(ctx, 9, -3, 7, 4, fur, line);
  ellipse(ctx, 0, -19, 20, 18, fur, line);
  ellipse(ctx, -16, -12, 5, 5, fur, line); // tail-ish cheek bump
  if (!o.back) {
    eyes(ctx, 4, -22, 7, o);
    if (!o.hollow && !o.scribble) {
      ellipse(ctx, -6, -15, 3.5, 2.2, '#ffc2d4'); ellipse(ctx, 15, -15, 3.5, 2.2, '#ffc2d4');
    }
    ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(2.5, -15, 2.2, 0.2, Math.PI - 0.2); ctx.arc(7, -15, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.restore();
}

export function bear(ctx, x, y, s, o = {}) {
  const f = o.facing || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
  const fur = o.fur || '#c58b5c', line = '#8d5c37';
  ellipse(ctx, -16, -52, 8, 8, fur, line); ellipse(ctx, 16, -52, 8, 8, fur, line);
  ellipse(ctx, -16, -52, 4, 4, '#e8b98f'); ellipse(ctx, 16, -52, 4, 4, '#e8b98f');
  ellipse(ctx, -11, -3, 8, 5, fur, line); ellipse(ctx, 11, -3, 8, 5, fur, line);
  ellipse(ctx, 0, -27, 24, 26, fur, line);
  if (!o.back) {
    ellipse(ctx, 0, -22, 10, 8, '#f0cfa8');
    ellipse(ctx, 0, -25, 3.5, 2.5, '#3a2618');
    eyes(ctx, 0, -34, 8, o);
    if (!o.hollow) { ellipse(ctx, -14, -24, 3.5, 2.2, '#f19a9a'); ellipse(ctx, 14, -24, 3.5, 2.2, '#f19a9a'); }
    ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (o.hollow) { ctx.moveTo(-5, -17); ctx.lineTo(5, -17); }
    else ctx.arc(0, -21, 3.5, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // little bow
  if (!o.noBow) { ctx.fillStyle = '#ff7eb6'; ctx.beginPath(); ctx.moveTo(14, -48); ctx.lineTo(24, -54); ctx.lineTo(24, -42); ctx.closePath(); ctx.moveTo(14, -48); ctx.lineTo(4, -54); ctx.lineTo(4, -42); ctx.fill(); }
  ctx.restore();
}

export function duck(ctx, x, y, s, o = {}) {
  const f = o.facing || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
  ellipse(ctx, -6, -2, 6, 3, '#ff9d3b'); ellipse(ctx, 6, -2, 6, 3, '#ff9d3b');
  ellipse(ctx, 0, -18, 19, 16, '#ffe066', '#e0b93a');
  ellipse(ctx, -10, -18, 8, 6, '#ffd23f', '#e0b93a');
  if (!o.back) {
    eyes(ctx, 6, -24, 5, o);
    ellipse(ctx, 18, -18, 8, 4, '#ff9d3b', '#d9781e');
  }
  if (!o.noHat) hat(ctx, 2, -32, 1);
  ctx.restore();
}

export function hat(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#5aa9ff'; ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#3d86d8'; ctx.fillRect(-13, -2, 26, 5);
  ellipse(ctx, 0, -12, 4, 4, '#fff');
  ctx.restore();
}

// mood: 0 happy closed eyes, 1 open eyes that look, 2 hollow + wide grin, 3 full horror
export function sun(ctx, x, y, r, t, o = {}) {
  const mood = o.mood || 0;
  ctx.save(); ctx.translate(x, y);
  const rays = 12;
  ctx.save(); ctx.rotate(t * (mood >= 2 ? 0 : 0.25));
  for (let i = 0; i < rays; i++) {
    ctx.rotate(Math.PI * 2 / rays);
    const len = r * (0.45 + (mood >= 2 ? Math.sin(i * 7.1 + t * 9) * 0.12 : 0));
    ctx.fillStyle = mood >= 3 ? '#d8a000' : '#ffc93c';
    ctx.beginPath(); ctx.moveTo(-r * 0.16, -r * 0.95); ctx.lineTo(0, -r - len); ctx.lineTo(r * 0.16, -r * 0.95); ctx.fill();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, mood >= 3 ? '#f2d34a' : '#fff1a0'); g.addColorStop(1, mood >= 3 ? '#c98a00' : '#ffcb2e');
  ellipse(ctx, 0, 0, r, r, g, mood >= 2 ? '#9c6a00' : '#f5b301', r * 0.05);
  const lx = (o.lookX || 0) * r * 0.12, ly = (o.lookY || 0) * r * 0.12;
  if (mood === 0) {
    ctx.strokeStyle = '#6b4200'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.33, -r * 0.1, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.35, 0.25, Math.PI - 0.25); ctx.stroke();
    ellipse(ctx, -r * 0.58, r * 0.15, r * 0.14, r * 0.09, '#ff9e7a'); ellipse(ctx, r * 0.58, r * 0.15, r * 0.14, r * 0.09, '#ff9e7a');
  } else if (mood === 1) {
    for (const s of [-1, 1]) {
      ellipse(ctx, s * r * 0.32, -r * 0.12, r * 0.15, r * 0.19, '#fff', '#6b4200', r * 0.03);
      ellipse(ctx, s * r * 0.32 + lx, -r * 0.12 + ly, r * 0.07, r * 0.07, '#1a1000');
    }
    ctx.strokeStyle = '#6b4200'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.42, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    // hollow eyes
    for (const s of [-1, 1]) {
      ellipse(ctx, s * r * 0.32, -r * 0.15, r * 0.16, r * 0.22, '#000');
      ellipse(ctx, s * r * 0.32 + lx * 0.6, -r * 0.13 + ly * 0.6, r * 0.025, r * 0.025, mood >= 3 ? '#ff2a2a' : '#fff');
      if (mood >= 3) {
        ctx.fillStyle = '#7a0000';
        ctx.fillRect(s * r * 0.32 - r * 0.03, -r * 0.0, r * 0.06, r * (0.35 + (s > 0 ? 0.25 : 0)));
      }
    }
    // grin with teeth
    ctx.fillStyle = '#120000';
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, r * 0.05);
    ctx.quadraticCurveTo(0, r * (mood >= 3 ? 1.05 : 0.85), r * 0.72, r * 0.05);
    ctx.quadraticCurveTo(0, r * 0.42, -r * 0.72, r * 0.05);
    ctx.fill();
    ctx.fillStyle = mood >= 3 ? '#e8e0c0' : '#fff';
    for (let i = -5; i <= 5; i++) {
      const tx = i * r * 0.12, ty = r * 0.05 + (1 - (i / 6) ** 2) * r * 0.38;
      ctx.beginPath(); ctx.moveTo(tx - r * 0.05, ty); ctx.lineTo(tx, ty + r * 0.11); ctx.lineTo(tx + r * 0.05, ty); ctx.fill();
    }
    if (mood >= 3) {
      ctx.fillStyle = '#8a0000';
      for (let i = 0; i < 5; i++) ctx.fillRect(-r * 0.4 + i * r * 0.2, r * 0.55, r * 0.035, r * (0.15 + (i * 37 % 5) * 0.08));
    }
  }
  ctx.restore();
}

export function carrot(ctx, x, y, s, rotten) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = rotten ? '#4d5a2a' : '#5cc55c';
  for (const a of [-0.5, 0, 0.5]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -14, 3, 8, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = rotten ? '#5a3a22' : '#ff8c2b';
  ctx.beginPath(); ctx.moveTo(-7, -7); ctx.quadraticCurveTo(0, -11, 7, -7); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rotten ? '#2e1d10' : '#d96a12'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(2, -1); ctx.moveTo(-1, 5); ctx.lineTo(3, 5); ctx.stroke();
  if (rotten) { ellipse(ctx, 2, 2, 2, 2, '#1a1208'); ctx.fillStyle = '#6a0000'; ctx.fillRect(-1, 10, 2, 9); }
  ctx.restore();
}

// c: corruption 0..1. look: player direction for eyeballs
export function flower(ctx, x, y, s, hue, t, c = 0, look = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const wilt = c > 0.4 ? (c - 0.4) * 1.6 : 0;
  ctx.strokeStyle = c > 0.6 ? '#4a5a2a' : '#4caf50'; ctx.lineWidth = 3;
  const sway = Math.sin(t * 2 + x) * 3 * (1 - c);
  const hx = sway + wilt * 10, hy = -34 + wilt * 12;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0, -18, hx, hy); ctx.stroke();
  const col = c > 0.7 ? `hsl(${hue}, 25%, 30%)` : `hsl(${hue}, ${85 - c * 60}%, ${78 - c * 30}%)`;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + (c > 0.7 ? Math.sin(t * 15 + i) * 0.1 : 0);
    ellipse(ctx, hx + Math.cos(a) * 7, hy + Math.sin(a) * 7, 6, 6, col);
  }
  if (c > 0.75) {
    ellipse(ctx, hx, hy, 6, 6, '#eee6d8');
    ellipse(ctx, hx + look * 2.5, hy, 2.6, 2.6, '#5a0000');
    ellipse(ctx, hx + look * 2.5, hy, 1.2, 1.2, '#000');
    ctx.fillStyle = '#7a0000'; ctx.fillRect(hx - 1, hy + 6, 2, 6 + Math.sin(t + x) * 2);
  } else {
    ellipse(ctx, hx, hy, 5, 5, '#ffd84a');
    if (c < 0.3) { ctx.fillStyle = '#6b4200'; ctx.fillRect(hx - 2.5, hy - 1.5, 1.4, 1.4); ctx.fillRect(hx + 1.2, hy - 1.5, 1.4, 1.4); }
  }
  ctx.restore();
}

export function tree(ctx, x, y, s, t, c = 0, look = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = c > 0.6 ? '#4a3626' : '#a0703f';
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-6, -60); ctx.lineTo(6, -60); ctx.lineTo(9, 0); ctx.fill();
  const leaf = c > 0.6 ? '#2f4a34' : `hsl(130, ${60 - c * 30}%, ${55 - c * 15}%)`;
  ellipse(ctx, -20, -70, 26, 22, leaf); ellipse(ctx, 20, -70, 26, 22, leaf); ellipse(ctx, 0, -92, 30, 26, leaf);
  if (c < 0.3) { ellipse(ctx, -14, -80, 4, 4, '#ff6b8b'); ellipse(ctx, 16, -95, 4, 4, '#ff6b8b'); ellipse(ctx, 6, -68, 4, 4, '#ff6b8b'); }
  if (c > 0.55) {
    for (const sx of [-7, 7]) {
      ellipse(ctx, sx, -40, 4, 5, '#e8e0d0');
      ellipse(ctx, sx + look * 2, -40, 1.8, 1.8, '#000');
    }
  }
  ctx.restore();
}

export function cloud(ctx, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = col;
  for (const [cx, cy, r] of [[0, 0, 22], [24, -8, 26], [50, 0, 20], [24, 6, 22]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  ctx.restore();
}

export function house(ctx, x, y, s, c = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = c > 0.6 ? '#6d5f66' : '#ffe4ee'; ctx.fillRect(-60, -80, 120, 80);
  ctx.fillStyle = c > 0.6 ? '#3d2730' : '#ff8fb1';
  ctx.beginPath(); ctx.moveTo(-72, -78); ctx.lineTo(0, -135); ctx.lineTo(72, -78); ctx.fill();
  ctx.fillStyle = c > 0.2 ? '#000' : '#b0703a'; ctx.fillRect(-14, -46, 28, 46);
  ctx.fillStyle = c > 0.4 ? '#120a0a' : '#bfe9ff';
  ctx.fillRect(-48, -62, 22, 20); ctx.fillRect(26, -62, 22, 20);
  if (c > 0.4) { ellipse(ctx, 37, -52, 3, 3, '#fff'); ellipse(ctx, 37, -52, 1.2, 1.2, '#000'); }
  ctx.restore();
}

// Smile sticker (the 3D collectible)
export function smiley(ctx, x, y, r) {
  ellipse(ctx, x, y, r, r, '#ffe14d', '#e0a800', r * 0.08);
  ellipse(ctx, x - r * 0.33, y - r * 0.15, r * 0.1, r * 0.16, '#3a2600');
  ellipse(ctx, x + r * 0.33, y - r * 0.15, r * 0.1, r * 0.16, '#3a2600');
  ctx.strokeStyle = '#3a2600'; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.45, 0.35, Math.PI - 0.35); ctx.stroke();
  ellipse(ctx, x - r * 0.58, y + r * 0.2, r * 0.13, r * 0.08, '#ff9e7a');
  ellipse(ctx, x + r * 0.58, y + r * 0.2, r * 0.13, r * 0.08, '#ff9e7a');
}

export function makeCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h); return c;
}
