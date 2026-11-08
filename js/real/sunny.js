// Realistic Sunny: a starved, too-tall, hunched figure in a filthy torn sun-mascot costume
// and a cracked porcelain sun mask with a crown of splintered rays.
import * as THREE from 'three';
import * as T from './textures.js';

// dirty yellow felt with tears (alpha) and old blood
function costumeTex(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d');
  const a = document.createElement('canvas'); a.width = a.height = size; const actx = a.getContext('2d');
  const R = T.rng(77);
  ctx.fillStyle = '#7d6a2a'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) { ctx.fillStyle = `rgba(${R() * 60 | 0},${R() * 40 | 0},0,${R() * 0.25})`; ctx.fillRect(R() * size, R() * size, 1 + R() * 3, 1 + R() * 3); }
  for (let i = 0; i < 25; i++) { ctx.fillStyle = `rgba(${30 + R() * 40 | 0},${15 + R() * 15 | 0},5,${0.2 + R() * 0.35})`; ctx.beginPath(); ctx.ellipse(R() * size, R() * size, 6 + R() * 30, 4 + R() * 20, R() * 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(70,0,0,0.75)';
  for (let i = 0; i < 9; i++) { const x = R() * size; ctx.fillRect(x, 0, 3 + R() * 6, 30 + R() * size * 0.7); ctx.beginPath(); ctx.ellipse(x + 3, size * 0.25 + R() * size * 0.3, 10 + R() * 18, 6 + R() * 10, 0, 0, 7); ctx.fill(); }
  actx.fillStyle = '#fff'; actx.fillRect(0, 0, size, size); actx.fillStyle = '#000';
  for (let i = 0; i < 14; i++) { actx.beginPath(); actx.ellipse(R() * size, size * 0.2 + R() * size * 0.75, 3 + R() * 12, 5 + R() * 20, R() * 3, 0, 7); actx.fill(); }
  // ragged hem
  actx.beginPath(); actx.moveTo(0, size);
  for (let x = 0; x <= size; x += 6) actx.lineTo(x, size - 4 - R() * size * 0.25 * (Math.sin(x * 0.07) * 0.5 + 0.7));
  actx.lineTo(size, size); actx.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { map: t, alphaMap: new THREE.CanvasTexture(a) };
}

export function buildSunny(high) {
  const sk = T.skin(high ? 512 : 256), mk = T.mask(high ? 512 : 256), bk = T.bark(128);
  const skinM = new THREE.MeshStandardMaterial({ ...sk, roughness: 0.7, color: 0x857a68 });
  skinM.normalScale.set(1.4, 1.4);
  const maskM = new (high ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ ...mk, roughness: 1, ...(high ? { clearcoat: 0.6, clearcoatRoughness: 0.35 } : {}) });
  maskM.emissive = new THREE.Color(0x8a7040); maskM.emissiveMap = mk.map; maskM.emissiveIntensity = 0.22;
  const spikeM = new THREE.MeshStandardMaterial({ ...bk, color: 0xd0b070, roughness: 0.75 });
  const boneM = new THREE.MeshStandardMaterial({ color: 0xd8ccaa, roughness: 0.35 });
  const bloodM = new THREE.MeshPhysicalMaterial({ color: 0x3a0000, roughness: 0.08, clearcoat: 1 });
  const cos = costumeTex(256);
  const clothM = new THREE.MeshStandardMaterial({ ...cos, color: 0x9a8a68, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });

  const g = new THREE.Group();
  const shadow = o => { o.castShadow = true; return o; };
  const HIP = 1.92;

  // ---------- legs (on the root)
  const seg = (len, r0, r1) => {
    const geo = new THREE.CylinderGeometry(r1, r0, len, 10, 8); geo.translate(0, -len / 2, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = -p.getY(i) / len;
      // bony knob at the top, wasted in the middle, tendons
      const k = 1 + Math.exp(-Math.pow(y * 7, 2)) * 0.55 - Math.sin(y * Math.PI) * 0.18 + Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 3 + y * 6) * 0.04;
      p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
    }
    geo.computeVertexNormals();
    return shadow(new THREE.Mesh(geo, skinM));
  };
  const joint = (parent, y) => { const j = new THREE.Group(); j.position.y = y; parent.add(j); return j; };
  const knob = (parent, r) => { const k = shadow(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), skinM)); parent.add(k); return k; };

  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.12, HIP, 0); g.add(hip);
    hip.add(seg(0.98, 0.075, 0.045));
    const kn = joint(hip, -0.98); knob(kn, 0.055); kn.add(seg(0.95, 0.045, 0.028));
    const ank = joint(kn, -0.95); knob(ank, 0.035);
    const foot = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.3, 8), skinM)); foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.02, 0.1); ank.add(foot);
    for (let t = 0; t < 4; t++) { const toe = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.09, 5), skinM)); toe.rotation.x = Math.PI / 2 + 0.4; toe.position.set((t - 1.5) * 0.022, -0.04, 0.27); ank.add(toe); }
    legs.push({ hip, kn, ank });
  }

  // ---------- upper body hunches from the hips
  const upper = new THREE.Group(); upper.position.y = HIP; g.add(upper);
  const prof = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, y = t * 1.05;
    let r = 0.11 + Math.sin(t * Math.PI) * 0.08 + (t > 0.5 ? (t - 0.5) * 0.16 : 0);
    if (t > 0.9) r *= 1 - (t - 0.9) * 5;
    prof.push(new THREE.Vector2(Math.max(0.05, r), y));
  }
  const torsoG = new THREE.LatheGeometry(prof, 24);
  const tp = torsoG.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i), ang = Math.atan2(z, x);
    let k = 1;
    if (y > 0.42 && y < 0.95) k += Math.pow(Math.max(0, Math.sin(y * 46)), 3) * 0.12 * (z > -0.02 ? 1 : 0.5); // ribs
    if (y < 0.4) k -= 0.22 * (1 - y / 0.4) * (z > 0 ? 1 : 0);                                              // sunken belly
    if (z < 0) k += Math.exp(-Math.pow(x * 30, 2)) * 0.12 * Math.max(0, Math.sin(y * 38));                // spine bumps
    tp.setXYZ(i, x * k, y, z * k * 0.7);
  }
  torsoG.computeVertexNormals();
  const torso = shadow(new THREE.Mesh(torsoG, skinM)); upper.add(torso);
  const pelvis = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), skinM)); pelvis.scale.set(1.1, 0.6, 0.75); g.add(pelvis); pelvis.position.y = HIP;
  // collarbones
  for (const s of [-1, 1]) { const cb = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 6), skinM)); cb.rotation.z = Math.PI / 2 + s * 0.15; cb.position.set(s * 0.12, 0.98, 0.07); upper.add(cb); }
  // torn costume hanging off the shoulders
  const dressG = new THREE.CylinderGeometry(0.2, 0.46, 1.2, 28, 10, true); dressG.translate(0, -0.6, 0);
  const dp = dressG.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const x = dp.getX(i), y = dp.getY(i), z = dp.getZ(i), ang = Math.atan2(z, x), t = -y / 1.2;
    const k = 1 + Math.sin(ang * 9) * 0.07 * t + Math.sin(ang * 4 + y * 7) * 0.05;
    dp.setXYZ(i, x * k, y, z * k * 0.8);
  }
  dressG.computeVertexNormals();
  const dress = shadow(new THREE.Mesh(dressG, clothM)); dress.position.y = 1.02; upper.add(dress);

  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.96, 0); upper.add(sh);
    knob(sh, 0.06);
    sh.add(seg(0.88, 0.05, 0.035));
    const el = joint(sh, -0.88); knob(el, 0.045); el.add(seg(0.92, 0.04, 0.026));
    const wr = joint(el, -0.92); knob(wr, 0.03);
    const palm = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.025), skinM)); palm.position.y = -0.06; wr.add(palm);
    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const fb = joint(wr, -0.11); fb.position.x = (f - 1.5) * 0.02;
      fb.add(seg(0.22, 0.01, 0.007));
      const f2 = joint(fb, -0.22); f2.add(seg(0.18, 0.007, 0.004));
      const nail = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.06, 4), boneM); nail.position.y = -0.2; nail.rotation.x = Math.PI; f2.add(nail);
      fingers.push(fb, f2);
    }
    arms.push({ sh, el, wr, fingers, s });
  }

  // ---------- neck, head, mask
  const neckJ = new THREE.Group(); neckJ.position.y = 1.0; upper.add(neckJ);
  const neck = seg(0.36, 0.035, 0.05); neck.rotation.x = Math.PI; neckJ.add(neck);
  const head = new THREE.Group(); head.position.y = 3.42; g.add(head);
  const skull = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), skinM)); skull.scale.set(1, 1.15, 1.05); head.add(skull);
  const R = 0.46;
  const maskG = new THREE.SphereGeometry(R, 36, 28, Math.PI * 0.5 - 0.95, 1.9, Math.PI * 0.5 - 0.95, 1.9);
  const mp = maskG.attributes.position, muv = maskG.attributes.uv;
  for (let i = 0; i < mp.count; i++) muv.setXY(i, 0.5 + mp.getX(i) / (R * 1.62), 0.5 + mp.getY(i) / (R * 1.62));
  const maskMesh = shadow(new THREE.Mesh(maskG, maskM)); maskMesh.position.z = -0.22; head.add(maskMesh);
  // crown of splintered rays
  const rays = [];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + (Math.random() - 0.5) * 0.15, len = 0.45 + Math.random() * 0.6;
    const geo = new THREE.ConeGeometry(0.05 + Math.random() * 0.035, len, 5, 3);
    const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { p.setX(k, p.getX(k) + (Math.random() - 0.5) * 0.012); p.setZ(k, p.getZ(k) + (Math.random() - 0.5) * 0.012); }
    geo.computeVertexNormals();
    const sp = shadow(new THREE.Mesh(geo, spikeM));
    sp.position.set(Math.cos(a) * (0.44 + len / 2), Math.sin(a) * (0.44 + len / 2), -0.08);
    sp.rotation.z = a - Math.PI / 2 + (Math.random() - 0.5) * 0.3; sp.rotation.x = (Math.random() - 0.5) * 0.3;
    head.add(sp); rays.push(sp);
  }
  // teeth along the carved grin
  const toothG = new THREE.ConeGeometry(0.015, 0.055, 4);
  for (let i = -7; i <= 7; i++) {
    const u = i / 7, x = u * 0.2, yUp = -0.045 - (1 - u * u) * 0.055, yLo = -0.045 - (1 - u * u) * 0.13;
    for (const [y, flip] of [[yUp, 1], [yLo, -1]]) {
      const zs = Math.sqrt(Math.max(0, R * R - x * x - y * y)) - 0.22 + 0.006;
      const t = new THREE.Mesh(toothG, boneM); t.position.set(x, y - flip * 0.02, zs); t.rotation.x = flip > 0 ? Math.PI : 0; t.scale.setScalar(0.8 + Math.random() * 0.6);
      head.add(t);
    }
  }
  for (const s of [-1, 1]) {
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3020 }));
    gl.position.set(s * 0.11, 0.055, Math.sqrt(R * R - 0.015) - 0.22 + 0.004); head.add(gl);
  }
  const drips = [];
  for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), bloodM); head.add(d); drips.push({ d, y: Math.random(), x: (Math.random() - 0.5) * 0.25 }); }

  const pose = { headTilt: 0 };
  const neckWorld = new THREE.Vector3();
  function newPose() {
    upper.rotation.set(0.25 + Math.random() * 0.35, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3); // hunched
    for (const a of arms) {
      a.sh.rotation.set(-0.3 - Math.random() * 1.5 + upper.rotation.x * -0.6, 0, a.s * (0.05 + Math.random() * 0.7));
      a.el.rotation.set(-Math.random() * 1.8, 0, 0);
      a.wr.rotation.set((Math.random() - 0.5) * 1.0, 0, (Math.random() - 0.5) * 0.6);
      for (const f of a.fingers) f.rotation.x = -Math.random() * 1.1;
    }
    for (const l of legs) { const k = 0.15 + Math.random() * 0.5; l.hip.rotation.set(-k * 0.6 + (Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.15); l.kn.rotation.x = k; l.ank.rotation.x = -k * 0.4; }
    pose.headTilt = (Math.random() - 0.5) * 1.2;
    // the head rides on the bent neck
    upper.updateMatrixWorld(true);
    neckJ.localToWorld(neckWorld.set(0, 0.42, 0));
    g.worldToLocal(neckWorld); head.position.copy(neckWorld);
  }
  newPose();
  function animate(dt) {
    for (const k of drips) {
      k.y += dt * (0.25 + k.y);
      if (k.y > 1.2) { k.y = 0; k.x = (Math.random() - 0.5) * 0.25; }
      k.d.position.set(k.x, -0.12 - k.y * 0.7, 0.22);
    }
  }
  return { group: g, head, body: torso, face: maskMesh, newPose, pose, animate };
}
