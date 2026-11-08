// Act 2: the garden behind the cardboard. First person. Sunny only moves when you can't see it,
// and it hunts by sound. Hide in the cardboard boxes. Find the 5 smile stickers. Get back home.
import * as THREE from 'three';
import * as A from './art.js';
import { audio } from './audio.js';
import { input } from './input.js';
import * as RT from './real/textures.js';
import * as RN from './real/nature.js';
import * as RF from './real/fx.js';
import * as RP from './real/post.js';
import { buildSunny as buildRealSunny } from './real/sunny.js';

const $ = id => document.getElementById(id);
const BOUND = 44.3;
const START = new THREE.Vector3(0, 1.6, 39.5);
const BOARD_Z = 42;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function tex(canvas, repeat) {
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 4; return t;
}
const crayon = (lines, col = '#2a0a0a') => A.makeCanvas(512, 384, (ctx, w, h) => {
  ctx.fillStyle = '#f3ead2'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(120,90,40,0.15)'; for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 30, 2);
  ctx.fillStyle = col; ctx.font = 'bold 52px "Fredoka", "Comic Sans MS", sans-serif'; ctx.textAlign = 'center';
  lines.forEach((l, i) => { ctx.save(); ctx.translate(w / 2, 90 + i * 80); ctx.rotate((Math.random() - 0.5) * 0.08); ctx.fillText(l, 0, 0); ctx.restore(); });
  ctx.fillStyle = 'rgba(110,0,0,0.75)'; for (let i = 0; i < 4; i++) { const x = Math.random() * w; ctx.fillRect(x, 0, 5, 40 + Math.random() * 120); }
});

export class Horror3D {
  constructor(canvas, cuteCanvas, emit) {
    this.emit = emit;
    this.cuteCanvas = cuteCanvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.mobile = (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
    r.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? 1 : 1.5));
    r.setSize(innerWidth, innerHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05050a);
    this.scene.fog = new THREE.FogExp2(0x05050a, 0.058);
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.03, 300);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    addEventListener('resize', () => this.resize());
    this.ray = new THREE.Raycaster();
    this.tmp = new THREE.Vector3();
    this.built = false;
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
  }

  // compile every shader once up front
  warm() { try { this.renderer.compile(this.scene, this.camera); } catch (e) {} }

  get qualitySetting() { try { return localStorage.getItem('meadow_quality') || 'auto'; } catch (e) { return 'auto'; } }

  // ------------------------------------------------------------ world
  build() {
    if (this.built) return; this.built = true;
    const q = this.qualitySetting;
    const high = this.high = q === 'high' || (q === 'auto' && !this.mobile);
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio, high ? 1.5 : 1));
    r.shadowMap.enabled = high; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const S = this.scene, R = rng(777);
    this.circles = []; this.boxes = []; this.occluders = [];
    this.ambient = new THREE.HemisphereLight(0x323a5a, 0x0a0806, 0.9); S.add(this.ambient);
    const moon = this.moon = new THREE.DirectionalLight(0x7080b0, 0.55); moon.position.set(-20, 40, 10); S.add(moon);

    // Mochi's paw + the flashlight (the light lives at the lens, so shadows come from your hand)
    this.hand = RF.buildHand(this.camera, high);
    this.flashlight = this.hand.light;
    this.hand.rig.visible = false;

    // ground: mud, dead grass, puddles that catch the light
    const gs = RT.ground(high ? 1024 : 512, 22);
    const groundM = new THREE.MeshStandardMaterial({ ...gs, roughness: 1, metalness: 0 });
    groundM.normalScale.set(1.2, 1.2);
    const groundG = new THREE.PlaneGeometry(140, 140, 70, 70);
    const gp = groundG.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i); if (Math.abs(x) < 46 && Math.abs(y) < 46) gp.setZ(i, (Math.sin(x * 0.37) * Math.cos(y * 0.29) + Math.sin(x * 0.11 + y * 0.13)) * 0.06); }
    groundG.computeVertexNormals();
    const ground = new THREE.Mesh(groundG, groundM);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; S.add(ground);

    // stars
    const sp = []; for (let i = 0; i < 700; i++) { const a = R() * 6.28, b = R() * 1.2 + 0.15; sp.push(Math.cos(a) * Math.cos(b) * 150, Math.sin(b) * 150, Math.sin(a) * Math.cos(b) * 150); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    S.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8a8aa0, size: 1.3, sizeAttenuation: false, fog: false })));

    // weathered picket fence
    const posts = []; for (let k = -45; k <= 45; k += 0.6) posts.push([k, -45], [k, 45], [-45, k], [45, k]);
    const ws = RT.wood(256, [190, 182, 168]);
    const picketG = new THREE.BoxGeometry(0.14, 1.2, 0.05); picketG.translate(0, 0.6, 0);
    const fence = new THREE.InstancedMesh(picketG, new THREE.MeshStandardMaterial({ ...ws, roughness: 0.9 }), posts.length);
    const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion();
    posts.forEach(([x, z], i) => {
      qq.setFromEuler(new THREE.Euler((R() - 0.5) * 0.12, Math.abs(x) === 45 ? Math.PI / 2 : 0, (R() - 0.5) * 0.15));
      m4.compose(new THREE.Vector3(x, 0, z), qq, new THREE.Vector3(1, 0.8 + R() * 0.35, 1)); fence.setMatrixAt(i, m4);
    });
    fence.castShadow = fence.receiveShadow = high; S.add(fence);

    // points of interest
    const POI = this.POI = {
      house: new THREE.Vector3(0, 0, -22), swing: new THREE.Vector3(-24, 0, -8), picnic: new THREE.Vector3(25, 0, 16),
      bea: new THREE.Vector3(-20, 0, 24), pip: new THREE.Vector3(22, 0, -30)
    };
    this.buildHouse(POI.house); this.buildSwing(POI.swing); this.buildPicnic(POI.picnic); this.buildBea(POI.bea); this.buildPip(POI.pip);
    this.buildBoxes();

    // dead, twisted trees. Simple invisible trunks are used for line-of-sight tests.
    const bs = RT.bark(256);
    const barkM = new THREE.MeshStandardMaterial({ ...bs, color: 0x8a7a6a, roughness: 0.95 });
    barkM.normalScale.set(1.5, 1.5);
    const templates = RN.treeTemplates(high ? 7 : 4, barkM, !high);
    const proxyG = new THREE.CylinderGeometry(0.4, 0.5, 6, 6), proxyM = new THREE.MeshBasicMaterial();
    const eyeM = new THREE.MeshPhysicalMaterial({ map: RT.eyeball(), roughness: 0.15, clearcoat: 1 });
    const irisM = new THREE.MeshStandardMaterial({ map: RT.iris(), roughness: 0.1, transparent: true });
    this.treeEyes = [];
    let placed = 0;
    for (let tries = 0; placed < 75 && tries < 2000; tries++) {
      const x = (R() - 0.5) * 86, z = (R() - 0.5) * 86;
      if (Math.abs(x) < 4 && z > 26) continue;
      if (Object.values(POI).some(p => Math.hypot(p.x - x, p.z - z) < 7)) continue;
      if (this.circles.some(c => Math.hypot(c.x - x, c.z - z) < 4)) continue;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = R() * 6.28;
      const tm = new THREE.Mesh(templates[placed % templates.length], barkM); tm.scale.setScalar(0.85 + R() * 0.4);
      tm.castShadow = tm.receiveShadow = high; g.add(tm);
      const proxy = new THREE.Mesh(proxyG, proxyM); proxy.position.y = 3; proxy.visible = false; g.add(proxy); this.occluders.push(proxy);
      if (placed % 5 === 0) {
        // eyes grown into the bark
        const eyes = new THREE.Group(); eyes.position.set(0, 1.7 + R() * 0.6, 0);
        for (const s of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), eyeM); w.position.set(s * 0.12, 0, 0.36);
          const ir = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), irisM); ir.position.z = 0.088; w.add(ir);
          eyes.add(w);
        }
        g.add(eyes); this.treeEyes.push(eyes);
      }
      S.add(g); this.circles.push({ x, z, r: 0.55 }); placed++;
    }

    // dense grass that moves in the wind
    const avoid = (x, z) => this.boxes.some(b => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
    this.grass = RN.grassField(high ? 45000 : 7000, 90, avoid);
    this.grass.mesh.receiveShadow = high; S.add(this.grass.mesh);

    this.buildFlowers(R);
    this.buildCutouts(R);
    this.buildNotes();
    this.buildStickers();
    this.buildBatteries();
    this.buildBoard();
    this.buildDoor();
    this.buildSunny();

    // atmosphere
    this.mist = RF.buildMist(S, high ? 40 : 14, 88);
    this.dust = RF.buildDust(S, high ? 500 : 150);
    this.breath = RF.buildBreath(this.camera, S);
    this.breathT = 2;
    if (high) this.post = RP.buildPost(r, S, this.camera);

    // everything solid casts and catches shadows from the flashlight
    if (high) S.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.visible && !o.material.transparent && !(o.material.isMeshBasicMaterial)) { if (o.castShadow === false && o.userData.noShadow) return; o.castShadow = true; o.receiveShadow = true; } });
    this.hand.rig.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
  }

  buildHouse(p) {
    const wallM = new THREE.MeshStandardMaterial({ ...RT.wood(256, [170, 120, 135]), roughness: 0.9 }), roofM = new THREE.MeshStandardMaterial({ ...RT.wood(256, [80, 30, 40]), roughness: 0.85 });
    const g = new THREE.Group(); g.position.copy(p); this.scene.add(g);
    const walls = [[0, -3, 6.2, 0.2], [-3, 0, 0.2, 6.2], [3, 0, 0.2, 6.2], [-2, 3, 2.2, 0.2], [2, 3, 2.2, 0.2]];
    for (const [x, z, w, d] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), wallM); m.position.set(x, 1.5, z); g.add(m); this.occluders.push(m);
      this.boxes.push({ x0: p.x + x - w / 2, x1: p.x + x + w / 2, z0: p.z + z - d / 2, z1: p.z + z + d / 2 });
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.2), wallM); top.position.set(0, 2.6, 3); g.add(top);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.9, 2.6, 4), roofM); roof.position.y = 4.3; roof.rotation.y = Math.PI / 4; g.add(roof);
    const smear = A.makeCanvas(256, 256, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.clearRect(0, 0, 256, 256);
      ctx.fillStyle = '#5a0000'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(60 + i * 30, 120 + (i % 2) * 20, 14, 18, 0.3, 0, 7); ctx.fill(); ctx.fillRect(56 + i * 30, 130, 6, 80 + i * 10); }
      ctx.font = 'bold 34px sans-serif'; ctx.fillText('LET ME IN', 40, 60);
    });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial({ map: tex(smear), transparent: true }));
    sm.position.set(-2, 1.6, 3.12); g.add(sm);
  }

  buildSwing(p) {
    const m = new THREE.MeshStandardMaterial({ color: 0x4a3a30, metalness: 0.6, roughness: 0.7 });
    const g = new THREE.Group(); g.position.copy(p); this.scene.add(g);
    for (const s of [-1.6, 1.6]) for (const t of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2), m); leg.position.set(s, 1.5, t * 0.9); leg.rotation.x = t * 0.4; g.add(leg);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4), m); bar.rotation.z = Math.PI / 2; bar.position.y = 3; g.add(bar);
    this.swing = new THREE.Group(); this.swing.position.y = 3; g.add(this.swing);
    for (const s of [-0.35, 0.35]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.4), m); rope.position.set(s, -1.2, 0); this.swing.add(rope); }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.35), new THREE.MeshStandardMaterial({ color: 0x8a2030 })); seat.position.y = -2.4; this.swing.add(seat);
    const bunnyTex = tex(A.makeCanvas(256, 256, ctx => A.bunny(ctx, 128, 240, 3.2, { scribble: true, fur: '#d8d0d0' })));
    const doll = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: bunnyTex, alphaTest: 0.5, side: THREE.DoubleSide }));
    doll.position.set(0, -2.05, 0); this.swing.add(doll);
    this.circles.push({ x: p.x, z: p.z, r: 0.4 });
  }

  buildPicnic(p) {
    const blanket = A.makeCanvas(256, 256, ctx => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.fillStyle = (x + y) % 2 ? '#d8c8c8' : '#9a2a3a'; ctx.fillRect(x * 32, y * 32, 32, 32); }
      ctx.fillStyle = 'rgba(70,0,0,0.85)'; ctx.beginPath(); ctx.ellipse(150, 120, 70, 50, 0.4, 0, 7); ctx.fill();
    });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshStandardMaterial({ map: tex(blanket) }));
    b.rotation.x = -Math.PI / 2; b.position.set(p.x, 0.02, p.z); this.scene.add(b);
    const cupM = new THREE.MeshStandardMaterial({ color: 0xe8d8e0 });
    for (const [x, z] of [[-1, -0.8], [0.9, -1], [1, 0.9], [-0.8, 1]]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.16, 10), cupM); c.position.set(p.x + x, 0.1, p.z + z); this.scene.add(c);
    }
    // the "cake"
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14), new THREE.MeshStandardMaterial({ color: 0x6a0a10, roughness: 0.25 }));
    cake.position.set(p.x, 0.18, p.z); this.scene.add(cake);
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), new THREE.MeshStandardMaterial({ color: 0xe8e0c0 }));
      tooth.position.set(p.x + Math.cos(i) * 0.3, 0.42, p.z + Math.sin(i) * 0.3); this.scene.add(tooth);
    }
    this.circles.push({ x: p.x, z: p.z, r: 0.5 });
  }

  bloodPool(x, z, r) {
    if (!this.splats) this.splats = [1, 2, 3, 4].map(i => RT.splat(i));
    const M = this.high ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const mat = new M({ color: 0x2a0000, roughness: 0.06, metalness: 0.1, alphaMap: this.splats[(Math.random() * 4) | 0], transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, ...(this.high ? { clearcoat: 1, clearcoatRoughness: 0.05 } : {}) });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.4, r * 2.4), mat);
    m.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28); m.position.set(x, 0.02 + Math.random() * 0.006, z); m.userData.noShadow = true; this.scene.add(m);
  }

  // wet, glistening guts
  entrails(x, z, n = 3) {
    if (!this.fleshSet) this.fleshSet = RT.flesh(256);
    const M = this.high ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const mat = new M({ ...this.fleshSet, color: 0xc07070, roughness: 0.25, ...(this.high ? { clearcoat: 1, clearcoatRoughness: 0.1 } : {}) });
    for (let k = 0; k < n; k++) {
      const pts = []; let px = x, pz = z;
      for (let i = 0; i < 9; i++) { px += (Math.random() - 0.5) * 0.7; pz += (Math.random() - 0.5) * 0.7; pts.push(new THREE.Vector3(px, 0.06 + Math.random() * 0.05, pz)); }
      const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05 + Math.random() * 0.03, 8), mat);
      this.scene.add(t);
    }
  }

  buildBea(p) {
    const top = tex(A.makeCanvas(256, 160, ctx => { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 256, 160); ctx.clip(); A.bear(ctx, 128, 300, 4.2, { hollow: true, blood: true }); ctx.restore(); }));
    const bot = tex(A.makeCanvas(256, 160, ctx => { ctx.save(); ctx.translate(0, -160); A.bear(ctx, 128, 300, 4.2, { back: true, noBow: true }); ctx.restore(); ctx.fillStyle = '#7a0000'; for (let i = 0; i < 9; i++) ctx.fillRect(20 + i * 26, 0, 10, 14 + (i * 37) % 30); }));
    const mTop = new THREE.MeshStandardMaterial({ map: top, alphaTest: 0.4, side: THREE.DoubleSide });
    const mBot = new THREE.MeshStandardMaterial({ map: bot, alphaTest: 0.4, side: THREE.DoubleSide });
    const lower = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), mBot); lower.position.set(p.x, 0.5, p.z); lower.rotation.y = 0.4; this.scene.add(lower);
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), mTop); upper.position.set(p.x + 0.9, 0.06, p.z + 0.8); upper.rotation.set(-Math.PI / 2 + 0.15, 0, 0.6); this.scene.add(upper);
    const stuff = new THREE.MeshStandardMaterial({ color: 0x8a8078 });
    for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.06, 6, 5), stuff); s.position.set(p.x + (Math.random() - 0.2) * 1.4, 0.08, p.z + Math.random() * 1.2); this.scene.add(s); }
    this.bloodPool(p.x + 0.4, p.z + 0.5, 1.2); this.bloodPool(p.x - 0.8, p.z + 1.6, 0.5);
    this.entrails(p.x + 0.6, p.z + 0.7, 2);
  }

  buildPip(p) {
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.6, 16), new THREE.MeshStandardMaterial({ ...RT.bark(128), roughness: 0.95 }));
    stump.position.set(p.x, 0.3, p.z); this.scene.add(stump);
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3d76c8 }));
    hat.position.set(p.x, 0.6, p.z); this.scene.add(hat);
    const feather = new THREE.MeshStandardMaterial({ color: 0xd8b848, side: THREE.DoubleSide });
    for (let i = 0; i < 26; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.3), feather);
      f.position.set(p.x + (Math.random() - 0.5) * 3, 0.03 + Math.random() * 0.02, p.z + (Math.random() - 0.5) * 3); f.rotation.set(-Math.PI / 2, 0, Math.random() * 6); this.scene.add(f);
    }
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xc86a1a }));
    beak.position.set(p.x + 0.9, 0.08, p.z + 0.5); beak.rotation.z = Math.PI / 2; this.scene.add(beak);
    this.bloodPool(p.x + 0.3, p.z + 0.2, 1.6); this.bloodPool(p.x - 1.2, p.z + 1.4, 0.6);
    this.entrails(p.x + 0.9, p.z + 0.6, 3);
    // something was dragged away
    for (let i = 0; i < 9; i++) this.bloodPool(p.x - 1.5 - i * 1.1, p.z - 0.8 - i * 0.9, 0.35 - i * 0.02);
    this.circles.push({ x: p.x, z: p.z, r: 0.7 });
  }

  buildFlowers(R) {
    const petalTex = tex(A.makeCanvas(128, 128, ctx => {
      ctx.fillStyle = '#9a1a2a'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#4a0010'; ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(64, 128); let x = 64, y = 128; for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 30; y -= 22; ctx.lineTo(x, y); } ctx.stroke(); }
    }));
    const eyeTex = tex(A.makeCanvas(256, 128, ctx => {
      ctx.fillStyle = '#e8e0d0'; ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#a01010'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 30; i++) { ctx.beginPath(); let x = R() * 256, y = R() * 128; ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 20; y += (R() - 0.5) * 20; ctx.lineTo(x, y); } ctx.stroke(); }
      
    }));
    const fl = RT.flesh(256); this.fleshSet = fl;
    const PM = this.high ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const petalM = new PM({ ...fl, roughness: 0.3, side: THREE.DoubleSide, ...(this.high ? { clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.4, sheenColor: new THREE.Color(0xff6060) } : {}) });
    const stemM = new PM({ ...fl, color: 0x6a5040, roughness: 0.4, ...(this.high ? { clearcoat: 0.6 } : {}) });
    const eyeM = new PM({ map: RT.eyeball(), roughness: 0.1, ...(this.high ? { clearcoat: 1, clearcoatRoughness: 0.02 } : {}) });
    const irisM = new THREE.MeshStandardMaterial({ map: RT.iris(), roughness: 0.05, transparent: true }), pupilM = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const toothM = new THREE.MeshStandardMaterial({ color: 0xd8ccaa, roughness: 0.3 }), mouthM = new PM({ color: 0x200000, roughness: 0.05, ...(this.high ? { clearcoat: 1 } : {}) });
    const petalG = new THREE.SphereGeometry(0.5, 18, 12);
    const dripG = new THREE.SphereGeometry(0.035, 5, 4), dripM = new THREE.MeshStandardMaterial({ color: 0x3a0000, roughness: 0.05 });
    this.flowers = [];
    let n = 0;
    for (let tries = 0; n < 34 && tries < 1500; tries++) {
      const x = (R() - 0.5) * 84, z = (R() - 0.5) * 84;
      if (Math.abs(x) < 3 && z > 30) continue;
      if (this.circles.some(c => Math.hypot(c.x - x, c.z - z) < 2.5)) continue;
      if (Object.values(this.POI).some(p => Math.hypot(p.x - x, p.z - z) < 5)) continue;
      const h = 1.4 + R() * 1.8, sc = 0.7 + R() * 0.6;
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, h, 10, 6), stemM); stem.position.y = h / 2; g.add(stem);
      const head = new THREE.Group(); head.position.y = h; head.scale.setScalar(sc); g.add(head);
      const face = new THREE.Group(); head.add(face); // faces +z, gets turned to the player
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        const pe = new THREE.Mesh(petalG, petalM); pe.scale.set(0.5, 0.75, 0.13);
        pe.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, -0.05); pe.rotation.z = a - Math.PI / 2; face.add(pe);
      }
      const kind = n % 3 === 2 ? 'mouth' : 'eye';
      let eye = null;
      if (kind === 'eye') {
        eye = new THREE.Group(); face.add(eye);
        eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.33, 28, 20), eyeM));
        const iris = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), irisM); iris.position.z = 0.3; eye.add(iris);
        const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), pupilM); pupil.position.z = 0.312; eye.add(pupil);
      } else {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), mouthM); m.position.z = 0.06; face.add(m);
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2, t = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), toothM);
          t.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.08); t.rotation.z = a + Math.PI / 2; face.add(t);
        }
      }
      const drip = new THREE.Mesh(dripG, dripM); g.add(drip);
      this.scene.add(g);
      this.bloodPool(x + (R() - 0.5) * 0.4, z + (R() - 0.5) * 0.4, 0.4 + R() * 0.5);
      this.flowers.push({ g, head, face, eye, kind, h: h, drip, dripY: h, twitch: 0, nextTwitch: R() * 6, cool: 0, droop: R() * 0.6, base: R() * 6 });
      n++;
    }
  }

  buildBoxes() {
    const side = tex(A.makeCanvas(256, 256, ctx => {
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#6a4e30'; ctx.lineWidth = 3; ctx.strokeRect(6, 6, 244, 244);
      ctx.fillStyle = '#3a1a1a'; ctx.font = 'bold 40px "Fredoka", sans-serif'; ctx.fillText('MOCHI', 56, 120);
      ctx.fillStyle = '#c03050'; ctx.fillText('♥', 110, 170);
      ctx.fillStyle = '#000'; ctx.fillRect(40, 60, 176, 10);
    }));
    const m = new THREE.MeshStandardMaterial({ ...RT.cardboard(256), roughness: 0.95 });
    this.hideBoxes = [];
    for (const [x, z, ry] of [[-6, 30, 0.2], [14, 8, -0.4], [-14, -4, 0.6], [6, -12, 0], [-30, -26, 0.3], [32, -10, -0.2], [-8, -36, 0.1], [30, 34, 0.5]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.5), m); b.position.set(x, 0.7, z); b.rotation.y = ry; this.scene.add(b);
      this.occluders.push(b); this.circles.push({ x, z, r: 1.0 }); this.hideBoxes.push(b);
    }
  }

  buildCutouts(R) {
    const tx = tex(A.makeCanvas(256, 256, ctx => A.bunny(ctx, 128, 250, 3.3, { scribble: true, fur: '#e0d8d8' })));
    const m = new THREE.MeshStandardMaterial({ map: tx, alphaTest: 0.5, side: THREE.DoubleSide });
    this.cutouts = [];
    for (const [x, z] of [[8, 26], [-26, 10], [18, -18], [-12, -24], [34, 22], [-34, -12]]) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), m); c.position.set(x, 0.7, z); this.scene.add(c);
      this.cutouts.push(c);
    }
    this.stalker = this.cutouts[0];
  }

  buildNotes() {
    const notes = [
      [[-2.6, 34, 0.5], ['IT ONLY MOVES', 'WHEN YOU', 'DONT LOOK']],
      [[3, 30, -0.4], ['IT CAN HEAR', 'YOU RUN', 'crouch = C']],
      [[-4, 24, 0.2], ['HIDE IN THE', 'BOXES (E)', 'it cant see in']],
      [[2.5, 19, 0], ['find the 5', 'smiles and go', 'HOME']]
    ];
    const postM = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
    for (const [[x, z, ry], lines] of notes) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), postM); post.position.y = 0.7; g.add(post);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.82), new THREE.MeshStandardMaterial({ map: tex(crayon(lines)) })); sign.position.set(0, 1.35, 0.05); g.add(sign);
      this.scene.add(g);
    }
  }

  buildStickers() {
    const t = tex(A.makeCanvas(128, 128, ctx => A.smiley(ctx, 64, 64, 56)));
    const m = new THREE.SpriteMaterial({ map: t, fog: false });
    const P = this.POI;
    const spots = [['house', P.house.x, P.house.z - 1.2], ['swing', P.swing.x, P.swing.z + 1.6], ['picnic', P.picnic.x + 1, P.picnic.z],
      ['bea', P.bea.x + 0.8, P.bea.z + 0.6], ['pip', P.pip.x, P.pip.z]];
    this.stickers = spots.map(([id, x, z]) => {
      const s = new THREE.Sprite(m); s.scale.set(0.55, 0.55, 1); s.position.set(x, 1, z); this.scene.add(s);
      const l = new THREE.PointLight(0xffd060, 4, 7, 1.4); l.position.set(x, 1.2, z); this.scene.add(l);
      return { id, s, l, got: false };
    });
  }

  buildBatteries() {
    const m = new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x20a040, emissiveIntensity: 0.8 });
    this.batteries = [[-30, -30], [30, 2], [-9, 8], [10, -38], [-36, 6], [16, 30], [-20, -14], [38, -36]].map(([x, z]) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 10), m); b.position.set(x, 0.25, z); b.rotation.z = Math.PI / 2;
      this.scene.add(b); return { b, got: false };
    });
  }

  buildBoard() {
    this.cuteTex = tex(this.cuteCanvas);
    const N = 14, w = 16 / N;
    const backM = new THREE.MeshStandardMaterial({ color: 0x7a5c3c });
    const frontM = new THREE.MeshBasicMaterial({ map: this.cuteTex, fog: false, toneMapped: false });
    this.strips = [];
    this.board = new THREE.Group(); this.board.position.set(0, 0, BOARD_Z); this.scene.add(this.board);
    for (let i = 0; i < N; i++) {
      const g = new THREE.Group(); g.position.x = -8 + (i + 0.5) * w;
      const geo = new THREE.PlaneGeometry(w, 9); const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / N);
      const f = new THREE.Mesh(geo, frontM); f.position.y = 4.5; g.add(f);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w, 9), backM); b.position.set(0, 4.5, -0.04); b.rotation.y = Math.PI; g.add(b);
      this.board.add(g);
      this.strips.push({ g, delay: Math.random() * 0.9, vr: 0, rz: (Math.random() - 0.5) * 0.5 });
    }
  }

  buildDoor() {
    const c = A.makeCanvas(256, 384, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#ffd6ec');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      A.sun(ctx, 190, 70, 34, 0, { mood: 0 }); A.cloud(ctx, 30, 80, 0.8, '#fff');
      ctx.fillStyle = '#8ee28a'; ctx.fillRect(0, 300, w, 84);
      A.flower(ctx, 40, 305, 1, 330, 0); A.flower(ctx, 210, 305, 1, 50, 0);
      A.bear(ctx, 90, 305, 1.2, {}); A.duck(ctx, 160, 305, 1.1, { facing: -1 });
      ctx.fillStyle = '#ff7eb6'; ctx.font = 'bold 30px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HOME ♥', 128, 200);
    });
    this.door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), new THREE.MeshBasicMaterial({ map: tex(c), fog: false, toneMapped: false }));
    this.door.position.set(0, 1.7, BOARD_Z - 0.6); this.door.rotation.y = Math.PI; this.door.visible = false; this.scene.add(this.door);
    this.doorLight = new THREE.PointLight(0xffb0d8, 0, 16, 1); this.doorLight.position.set(0, 2, BOARD_Z - 2); this.scene.add(this.doorLight);
  }

  buildSunny() {
    const real = this.sunnyReal = buildRealSunny(this.high);
    this.sunny = real.group; this.head = real.head; this.sunnyBody = real.body; this.sunnyFace = real.face;
    this.headY = real.head.position.y;
    this.sunny.position.set(0, 0, 22);
    this.scene.add(this.sunny);
    this.newPose();
  }

  newPose() { this.sunnyReal.newPose(); this.headTilt = this.sunnyReal.pose.headTilt; }

  // ------------------------------------------------------------ phases
  startTransition() {
    this.build();
    this.phase = 'transition'; this.pt = 0;
    this.strips.forEach(s => { s.g.rotation.set(0, 0, 0); s.vr = 0; });
    this.board.visible = true;
    this.sunny.position.set(-9, 0, 30); this.sunny.visible = true;
    this.flashlight.intensity = 0;
    this.camera.fov = 50; this.camera.updateProjectionMatrix();
    const t = Math.tan(THREE.MathUtils.degToRad(25));
    this.fitD = Math.max(4.5 / t, 8 / (t * (innerWidth / innerHeight)));
    audio.startDrone();
  }

  startWake(save) {
    this.build();
    this.board.visible = true;
    this.strips.forEach(s => { s.g.rotation.set(Math.PI / 2 - 0.02, 0, s.rz); });
    this.stickerCount = 0;
    if (save && save.stickers) for (const s of this.stickers) if (save.stickers.includes(s.id)) this.takeSticker(s, true);
    this.phase = 'wake'; this.pt = 0; this.awake = false;
    this.camera.fov = 70; this.camera.updateProjectionMatrix();
    this.resetPlayer();
    this.sunny.position.set(0, 0, 21); this.sunny.visible = true;
    this.mon = { state: 'dormant', target: new THREE.Vector3(), unseen: 0, seenWas: false, stingCool: 0, lostT: 0, timer: 0, dormantT: 0, stepT: 0, sayCool: 0 };
    this.blackoutEv = null; this.fakeT = 30 + Math.random() * 20; this.boxSurprise = false; this.inHouse = false;
    audio.startDrone();
    $('blackout').classList.add('on');
    this.showPrompt('wakePrompt', true);
  }

  resetPlayer() {
    this.pl = { pos: START.clone(), yaw: 0, pitch: 0, stamina: 100, battery: Math.max(this.pl ? this.pl.battery : 100, 55), flash: true, hidden: null, crouch: false, stepT: 0, bob: 0, flicker: 0 };
    this.camera.position.copy(this.pl.pos); this.camera.rotation.set(0, 0, 0);
  }

  showPrompt(id, on) { const e = $(id); if (e) e.classList.toggle('hidden', !on); }

  sub(text, secs = 3.5, color) {
    const e = $('subs3d'); e.textContent = text; e.style.color = color || ''; e.classList.add('on');
    clearTimeout(this.subT); this.subT = setTimeout(() => e.classList.remove('on'), secs * 1000);
  }

  scareFlash(ms = 120) {
    const e = $('scare'); e.classList.add('on'); setTimeout(() => e.classList.remove('on'), ms);
  }

  clickedToWake() {
    if (this.phase === 'wake' && !this.awake) {
      this.awake = true; this.pt = 0; this.showPrompt('wakePrompt', false);
      $('blackout').classList.remove('on');
      $('hud3d').classList.remove('hidden');
      this.sub('Mochi: ...where... where am I?', 4);
    }
  }

  takeSticker(s, silent) {
    s.got = true; s.s.visible = false; s.l.visible = false; this.stickerCount++;
    $('smiles').textContent = `${this.stickerCount} / 5`;
    if (silent) return;
    audio.chime(true);
    this.saveProgress();
    const lines = ['Sunny felt that.', 'Sunny is getting angry.', 'it knows. it KNOWS.', 'one more. it is so close now.', 'GO HOME, MOCHI. RUN.'];
    this.sub(lines[this.stickerCount - 1], 4, '#ffcc66');
    setTimeout(() => this.say(['that was MINE.', 'give them BACK.', 'I can smell you, mochi.', 'you cannot leave the garden.', 'COME HOME, MOCHI.'][this.stickerCount - 1]), 1400);
    if (this.stickerCount === 3) setTimeout(() => this.startBlackout(), 3200);
    if (this.stickerCount === 2 || this.stickerCount === 4) setTimeout(() => { this.scareFlash(150); audio.stinger(); }, 900);
    if (this.mon.state === 'dormant') this.mon.state = 'patrol';
    if (this.stickerCount >= 5) {
      this.door.visible = true; this.doorLight.intensity = 30; this.mon.state = 'rage'; this.enrage();
      setTimeout(() => this.sub('The way home is open. Behind you. Where you woke up.', 5, '#ffb0d8'), 4200);
    } else {
      // it hears the chime
      this.mon.state = 'investigate'; this.mon.target.copy(this.pl.pos);
    }
  }

  say(text, sub = true) {
    audio.speak(text);
    if (sub) this.sub('Sunny: ' + text, 3.5, '#ff6a4a');
  }

  enrage() {
    // the garden turns red and everything screams
    this.scene.fog.color.setHex(0x1c0404); this.scene.background.setHex(0x1c0404);
    this.ambient.color.setHex(0x502020); this.raging = true;
  }

  startBlackout() {
    if (this.phase !== 'play' || this.blackoutEv) return;
    this.blackoutEv = { t: 0, stage: 0 };
    audio.noise(audio.now, 0.4, 0.6, 'lowpass', 300, 60); // the bulb pops
    this.sub('Your light died.', 3);
  }

  updateBlackout(dt) {
    const b = this.blackoutEv, pl = this.pl, cam = this.camera;
    b.t += dt;
    if (b.stage < 4) { this.flashlight.intensity = 0; this.ambient.intensity = 0.05; this.moon.intensity = 0; }
    audio.setBreath(1); audio.setHeart(0.85);
    if (b.stage === 0 && b.t > 1.4) { b.stage = 1; audio.sunStep(0.9, 0.7); }
    if (b.stage === 1 && b.t > 2.2) { b.stage = 2; audio.sunStep(-0.5, 0.9); }
    if (b.stage === 2 && b.t > 3.0) { b.stage = 3; audio.whisper(0); audio.speak('peekaboo.', { pitch: 0.05, rate: 0.5 }); }
    if (b.stage === 3 && b.t > 4.6) {
      // lights back... and it is RIGHT THERE
      b.stage = 4; this.ambient.intensity = 0.9; this.moon.intensity = 0.5;
      const f = cam.getWorldDirection(new THREE.Vector3()); f.y = 0; f.normalize();
      this.sunny.position.set(pl.pos.x + f.x * 1.7, pl.pos.y - 3.1, pl.pos.z + f.z * 1.7);
      this.newPose(); audio.stinger(); this.scareFlash(160);
    }
    if (b.stage === 4) this.flashlight.intensity = 45;
    if (b.stage === 4 && b.t > 6.2) {
      b.stage = 5; this.flashlight.intensity = 0;
      this.sunny.position.copy(this.farSpot()); audio.giggle(0, 0.35);
    }
    if (b.t > 6.6) { this.ambient.intensity = 0.9; this.moon.intensity = 0.5; this.blackoutEv = null; this.mon.state = 'chase'; this.mon.target.set(pl.pos.x, 0, pl.pos.z); }
  }

  saveProgress() {
    try { localStorage.setItem('meadow_progress', JSON.stringify({ stage: 'garden', stickers: this.stickers.filter(s => s.got).map(s => s.id) })); } catch (e) {}
  }

  // ------------------------------------------------------------ update
  update(dt) {
    if (!this.phase) return;
    this.pt += dt;
    const T = performance.now() / 1000;
    if (this.phase === 'transition') this.updateTransition(dt);
    else if (this.phase === 'wake') this.updateWake(dt);
    else if (this.phase === 'play') this.updatePlay(dt, T);
    else if (this.phase === 'caught') this.updateCaught(dt);
    else if (this.phase === 'exit') { this.camera.position.z += dt * 1.5; }
    this.animateWorld(dt, T);
    this.realFrame(dt, T);
    if (this.post) this.post.composer.render(dt); else this.renderer.render(this.scene, this.camera);
  }

  realFrame(dt, T) {
    const cam = this.camera;
    // the beam follows the bulb
    const k = this.flashlight.intensity / 45;
    this.hand.beam.visible = k > 0.02; this.hand.beamM.uniforms.uI.value = k; this.hand.beamM.uniforms.uTime.value = T;
    this.hand.lensM.color.setScalar(0.15 + Math.min(1, k) * 0.85);
    this.hand.rig.visible = this.phase === 'play' && !(this.pl && this.pl.hidden);
    this.grass.uniforms.uTime.value = T;
    this.mist.update(dt, 44); this.dust.update(cam.position, T); this.breath.update(dt);
    this.sunnyReal.animate(dt);
    if (this.post) {
      const u = this.post.cam, d = this.sunny ? this.sunny.position.distanceTo(cam.position) : 99;
      const near = this.phase === 'play' ? Math.max(0, 1 - d / 10) : 0;
      u.uTime.value = T % 100;
      u.uAb.value = 0.0015 + near * 0.012 + (this.phase === 'caught' ? 0.02 : 0);
      u.uRed.value = Math.max(this.raging ? 0.25 : 0, near * 0.45, this.phase === 'caught' ? 0.6 : 0);
      u.uGrain.value = 0.06 + near * 0.06;
      // motion blur when you whip around
      const turn = Math.abs(this.lastYaw === undefined ? 0 : (this.pl ? this.pl.yaw : 0) - this.lastYaw) / Math.max(dt, 0.001);
      this.lastYaw = this.pl ? this.pl.yaw : 0;
      this.post.blur.value += (Math.min(0.75, turn * 0.08) - this.post.blur.value) * Math.min(1, dt * 10);
    }
  }

  updateTransition(dt) {
    const t = this.pt, cam = this.camera, C = new THREE.Vector3(0, 4.5, BOARD_Z);
    this.cuteTex.needsUpdate = true;
    const shake = t < 1.6 ? t * 0.03 : (t > 6 && t < 7.6 ? 0.12 : 0.02);
    if (t < 1.6) {
      cam.position.set(0, 4.5, BOARD_Z + this.fitD); cam.lookAt(C);
    } else if (t < 7.6) {
      const k = Math.min(1, (t - 1.6) / 4.4), e = k * k * (3 - 2 * k);
      const a = -2.25 * e, r = this.fitD + (15 - this.fitD) * e;
      cam.position.set(Math.sin(a) * r, 4.5 + e * 1.5, BOARD_Z + Math.cos(a) * r); cam.lookAt(C);
      if (t > 4.6 && this.sunny.visible) { this.sunny.visible = false; }
    }
    cam.position.x += (Math.random() - 0.5) * shake; cam.position.y += (Math.random() - 0.5) * shake;
    this.head.lookAt(cam.position);
    if (t > 6) {
      if (!this.tore) { this.tore = true; audio.tear(); }
      for (const s of this.strips) {
        if (t - 6 < s.delay) continue;
        s.vr += dt * 4.5; s.g.rotation.x = Math.min(Math.PI / 2 - 0.02, s.g.rotation.x + s.vr * dt); s.g.rotation.z = s.rz * (s.g.rotation.x / 1.57);
      }
    }
    if (t > 7.6 && !this.cut) {
      // HARD CUT
      this.cut = true; $('scare').classList.add('on'); audio.scream(); audio.stopDrone();
      setTimeout(() => { $('scare').classList.remove('on'); $('blackout').classList.add('on'); }, 900);
      setTimeout(() => { this.emit('transitionDone'); }, 2600);
    }
  }

  updateWake(dt) {
    const cam = this.camera;
    if (!this.awake) { cam.position.set(START.x, 0.25, START.z); cam.rotation.set(0.4, 0, 1.2); return; }
    const k = Math.min(1, this.pt / 3), e = k * k * (3 - 2 * k);
    cam.position.set(START.x, 0.25 + (1.6 - 0.25) * e, START.z);
    cam.rotation.set(0.4 * (1 - e), 0, 1.2 * (1 - e) + Math.sin(this.pt * 3) * 0.03 * (1 - e));
    this.flashlight.intensity = k > 0.6 ? 45 : 0;
    if (this.pt > 3.2) {
      this.phase = 'play'; this.pt = 0;
      this.pl.pitch = 0; this.pl.yaw = 0;
      if (this.stickerCount === 0) setTimeout(() => this.sub('There is something standing out there.', 4), 1500);
      else { this.mon.state = this.stickerCount >= 5 ? 'rage' : 'patrol'; this.mon.dormantT = 99; this.sunny.position.copy(this.farSpot()); }
      if (this.stickerCount >= 5) { this.door.visible = true; this.doorLight.intensity = 30; this.enrage(); }
      else setTimeout(() => this.say('mochi... come out and play.'), 6000);
    }
  }

  farSpot() {
    for (let i = 0; i < 50; i++) {
      const p = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
      if (p.distanceTo(this.pl.pos) > 30 && this.free(p.x, p.z, 1)) return p;
    }
    return new THREE.Vector3(0, 0, -40);
  }

  free(x, z, r) {
    if (Math.abs(x) > BOUND || Math.abs(z) > BOUND) return false;
    if (this.circles.some(c => Math.hypot(c.x - x, c.z - z) < c.r + r)) return false;
    return !this.boxes.some(b => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r);
  }

  collide(p, r) {
    for (const c of this.circles) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 0.0001) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
    }
    for (const b of this.boxes) {
      if (p.x > b.x0 - r && p.x < b.x1 + r && p.z > b.z0 - r && p.z < b.z1 + r) {
        const ox = Math.min(p.x - (b.x0 - r), (b.x1 + r) - p.x), oz = Math.min(p.z - (b.z0 - r), (b.z1 + r) - p.z);
        if (ox < oz) p.x = (p.x - (b.x0 + b.x1) / 2 < 0) ? b.x0 - r : b.x1 + r;
        else p.z = (p.z - (b.z0 + b.z1) / 2 < 0) ? b.z0 - r : b.z1 + r;
      }
    }
    p.x = Math.max(-BOUND, Math.min(BOUND, p.x)); p.z = Math.max(-BOUND, Math.min(BOUND, p.z));
  }

  makeNoise(radius) {
    const m = this.mon; if (!m || m.state === 'dormant' || m.state === 'rage') return;
    if (this.sunny.position.distanceTo(this.pl.pos) < radius && m.state !== 'chase') { m.state = 'investigate'; m.target.copy(this.pl.pos); }
  }

  updatePlay(dt, T) {
    const pl = this.pl, cam = this.camera, m = this.mon;
    if (this.paused) return;
    // look
    pl.yaw -= input.mouseDX * 0.0022 + input.lookX * 2.6 * dt;
    pl.pitch -= input.mouseDY * 0.0022 + input.lookY * 2.0 * dt;
    pl.pitch = Math.max(-1.45, Math.min(1.45, pl.pitch));
    // flashlight
    if (input.flashPressed() && !pl.hidden) { pl.flash = !pl.flash; audio.click(); this.makeNoise(5); }
    if (pl.battery <= 0) pl.flash = false;
    if (pl.flash) pl.battery = Math.max(0, pl.battery - dt * 1.05);
    // hiding
    const nearBox = this.hideBoxes.find(b => Math.hypot(b.position.x - pl.pos.x, b.position.z - pl.pos.z) < 1.9);
    this.showPrompt('hidePrompt', !!(pl.hidden || nearBox));
    $('hidePrompt').textContent = this.mobile ? (pl.hidden ? '✋ climb out' : '✋ hide in box') : (pl.hidden ? 'E — climb out' : 'E — hide in box');
    if (input.interactPressed()) {
      if (pl.hidden) {
        const b = pl.hidden; pl.hidden = null; $('slit').classList.remove('on');
        pl.pos.set(b.position.x - Math.sin(pl.yaw) * 1.5, 1.6, b.position.z - Math.cos(pl.yaw) * 1.5);
        this.collide(pl.pos, 0.35); audio.thud(0);
      } else if (nearBox) {
        pl.hidden = nearBox; pl.flash = false; $('slit').classList.add('on'); audio.thud(0);
        // if it watched you climb in, it knows
        pl.seenHiding = m.state === 'chase' && this.sunny.position.distanceTo(pl.pos) < 9;
        if (!this.boxSurprise && this.stickerCount >= 1 && Math.random() < 0.5) {
          this.boxSurprise = true;
          setTimeout(() => { if (pl.hidden) { audio.whisper(0.6); audio.speak('this is MY box, mochi.', { pitch: 0.05, rate: 0.6, volume: 0.8 }); this.sub('something is in here with you', 3); } }, 1500);
        }
      }
    }
    let speed = 0, moving = false;
    if (pl.hidden) {
      pl.pos.set(pl.hidden.position.x, 0.95, pl.hidden.position.z);
      pl.stamina = Math.min(100, pl.stamina + dt * 20);
    } else {
      pl.crouch = input.crouch();
      const mx = input.moveX, my = input.moveY, len = Math.hypot(mx, my);
      moving = len > 0.1;
      const wantSprint = input.sprint() && moving && !pl.crouch && pl.stamina > 1;
      speed = pl.crouch ? 1.7 : wantSprint ? 6.0 : 3.4;
      if (wantSprint) pl.stamina = Math.max(0, pl.stamina - dt * 22); else pl.stamina = Math.min(100, pl.stamina + dt * 14);
      // stumbling: running in the dark, running near it, or running on empty
      if (pl.stumble > 0) { pl.stumble -= dt; speed *= 0.35; }
      else if (wantSprint && Math.random() < dt * (0.05 + (pl.stamina < 25 ? 0.25 : 0) + (this.sunny.position.distanceTo(pl.pos) < 8 ? 0.2 : 0))) {
        pl.stumble = 0.7; audio.step(1.6); audio.thud(0); this.makeNoise(14);
      }
      // smooth acceleration so you have weight
      const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw), rx = Math.cos(pl.yaw), rz = -Math.sin(pl.yaw);
      const nx = moving ? mx / Math.max(1, len) : 0, ny = moving ? my / Math.max(1, len) : 0;
      pl.vx = (pl.vx || 0) + (((fx * ny + rx * nx) * speed) - (pl.vx || 0)) * Math.min(1, dt * 9);
      pl.vz = (pl.vz || 0) + (((fz * ny + rz * nx) * speed) - (pl.vz || 0)) * Math.min(1, dt * 9);
      const v = Math.hypot(pl.vx, pl.vz);
      if (v > 0.05) {
        pl.pos.x += pl.vx * dt; pl.pos.z += pl.vz * dt;
        this.collide(pl.pos, 0.35);
        const before = Math.floor(pl.bob / Math.PI);
        pl.bob += dt * v * 2.3;
        if (Math.floor(pl.bob / Math.PI) !== before) {   // a foot hits the ground
          const loud = pl.crouch ? 0.25 : wantSprint ? 1.4 : 0.8;
          audio.step(loud); this.makeNoise(pl.crouch ? 2.5 : wantSprint ? 24 : 9);
        }
      }
      pl.speedNow = v; pl.sprinting = wantSprint;
      const eye = pl.crouch ? 0.95 : 1.6;
      pl.pos.y += (eye - pl.pos.y) * Math.min(1, dt * 10);
    }
    // head bob: drop on each step, sway side to side, tilt a little; heavier when running
    const vNow = pl.hidden ? 0 : (pl.speedNow || 0), amp = Math.min(1, vNow / 3.4) * (pl.sprinting ? 1.7 : pl.crouch ? 0.5 : 1);
    pl.amp = (pl.amp || 0) + (amp - (pl.amp || 0)) * Math.min(1, dt * 6);
    const bobY = -Math.abs(Math.sin(pl.bob)) * 0.055 * pl.amp, bobX = Math.sin(pl.bob) * 0.03 * pl.amp;
    const stum = pl.stumble > 0 ? Math.sin((0.7 - pl.stumble) / 0.7 * Math.PI) : 0;
    // breathing sway when standing still and scared
    const idle = Math.sin(performance.now() / 1000 * (1.2 + (audio.breath || 0) * 2)) * 0.006 * (1 + (audio.breath || 0) * 3);
    cam.position.copy(pl.pos);
    cam.position.x += Math.cos(pl.yaw) * bobX; cam.position.z -= Math.sin(pl.yaw) * bobX;
    cam.position.y += bobY + idle - stum * 0.45;
    cam.rotation.set(pl.pitch + stum * 0.35 + idle * 0.5, pl.yaw, Math.sin(pl.bob) * 0.012 * pl.amp + stum * 0.12);
    cam.updateMatrixWorld();
    // the paw lags behind your look and bounces with your steps
    const dyaw = pl.yaw - (pl.lastYaw ?? pl.yaw), dpit = pl.pitch - (pl.lastPitch ?? pl.pitch);
    pl.lastYaw = pl.yaw; pl.lastPitch = pl.pitch;
    const sw = this.hand.sway;
    sw.rotation.y += (Math.max(-0.25, Math.min(0.25, dyaw * 3)) - sw.rotation.y) * Math.min(1, dt * 8);
    sw.rotation.x += (Math.max(-0.25, Math.min(0.25, dpit * 3)) - sw.rotation.x) * Math.min(1, dt * 8);
    sw.position.set(Math.sin(pl.bob) * 0.012 * pl.amp, -Math.abs(Math.cos(pl.bob)) * 0.015 * pl.amp - stum * 0.08, 0);
    sw.rotation.z = Math.sin(pl.bob) * 0.04 * pl.amp + (pl.flicker > 0 ? (Math.random() - 0.5) * 0.1 : 0);
    // cold night: your breath shows
    this.breathT -= dt * (1 + (audio.breath || 0) * 2.5);
    if (this.breathT <= 0) { this.breathT = 3.2; if (!pl.hidden) this.breath.puff(0.7 + (audio.breath || 0)); }

    // flicker when it is close
    const dist = this.sunny.position.distanceTo(new THREE.Vector3(pl.pos.x, 0, pl.pos.z));
    pl.flicker -= dt;
    if (pl.flash && dist < 14 && pl.flicker < -0.2 && Math.random() < dt * (1 - dist / 14) * 3) pl.flicker = 0.08 + Math.random() * 0.25;
    const lightOn = pl.flash && pl.flicker <= 0;
    this.flashlight.intensity = lightOn ? 45 * (pl.battery < 15 ? 0.5 + Math.random() * 0.3 : 1) : 0;

    // pickups
    if (!pl.hidden) {
      for (const s of this.stickers) if (!s.got && Math.hypot(s.s.position.x - pl.pos.x, s.s.position.z - pl.pos.z) < 1.3) this.takeSticker(s);
      for (const b of this.batteries) if (!b.got && Math.hypot(b.b.position.x - pl.pos.x, b.b.position.z - pl.pos.z) < 1.2) {
        b.got = true; b.b.visible = false; pl.battery = Math.min(100, pl.battery + 45); audio.click(); this.sub('Batteries. +45%', 2, '#9f9');
      }
      if (this.door.visible && Math.hypot(pl.pos.x - this.door.position.x, pl.pos.z - this.door.position.z) < 1.6) {
        this.phase = 'exit'; audio.stopDrone(); audio.setHeart(0); $('whiteout').classList.add('on'); audio.chime(false);
        try { localStorage.removeItem('meadow_progress'); } catch (e) {}
        setTimeout(() => this.emit('escaped'), 2200);
        return;
      }
    }

    if (this.blackoutEv) { this.updateBlackout(dt); this.head.lookAt(cam.position); this.hud(dist); return; }
    this.updateSunny(dt, dist, lightOn);
    // footsteps right behind you that aren't there
    this.fakeT -= dt;
    if (this.fakeT <= 0) {
      this.fakeT = 35 + Math.random() * 35;
      if (this.stickerCount >= 1 && dist > 18) { audio.sunStep(0, 0.8); setTimeout(() => audio.sunStep(0.1, 0.9), 650); setTimeout(() => audio.whisper(0), 1200); }
    }
    // the playhouse door slams behind you
    const P = this.POI.house, inH = Math.abs(pl.pos.x - P.x) < 2.9 && pl.pos.z < P.z + 2.9 && pl.pos.z > P.z - 2.9;
    if (inH && !this.inHouse) { this.inHouse = true; setTimeout(() => { if (this.phase === 'play') { audio.thud(0); audio.thud(0); audio.giggle(0, 0.3); } }, 900); }
    if (!inH) this.inHouse = false;
    if (this.raging && Math.random() < dt * 0.35 && this.flowers.length) {
      const f = this.flowers[(Math.random() * this.flowers.length) | 0];
      const d = f.g.position.distanceTo(cam.position);
      if (d < 25) { f.twitch = 1; audio.flowerShriek(Math.max(-1, Math.min(1, (f.g.position.x - cam.position.x) / 10))); }
    }

    this.hud(dist);
  }

  hud(dist) {
    const pl = this.pl;
    $('battery').style.width = pl.battery + '%';
    $('battery').style.background = pl.battery < 20 ? '#d33' : '#8f8';
    $('stamina').style.width = pl.stamina + '%';
    audio.setHeart(Math.max(0, 1 - dist / 18));
    audio.setDroneTension(Math.max(0, 1 - dist / 25));
    $('vignette3d').style.opacity = 0.55 + Math.max(0, 1 - dist / 12) * 0.45;
    if (!this.blackoutEv) audio.setBreath(Math.max((60 - pl.stamina) / 60, 1 - dist / 10, pl.hidden && dist < 10 ? 0.7 : 0));
    // the closer it is, the more your eyes go wrong
    const k = Math.max(0, 1 - dist / 9), cv = this.renderer.domElement;
    if (k > 0.02 && !this.post) {
      cv.style.filter = `contrast(${1 + k * 0.5}) saturate(${1 - k * 0.7}) sepia(${k * 0.4})`;
      cv.style.transform = `translate(${(Math.random() - 0.5) * k * 10}px, ${(Math.random() - 0.5) * k * 10}px) scale(${1 + k * 0.03})`;
    } else if (k > 0.02) { cv.style.transform = `translate(${(Math.random() - 0.5) * k * 6}px, ${(Math.random() - 0.5) * k * 6}px)`; }
    else if (cv.style.filter || cv.style.transform) { cv.style.filter = ''; cv.style.transform = ''; }
  }

  isSeen(lightOn) {
    const cam = this.camera, pl = this.pl;
    const pts = [this.head.getWorldPosition(new THREE.Vector3()), this.sunnyBody.getWorldPosition(new THREE.Vector3()), this.sunny.position.clone().setY(0.6)];
    const fwd = cam.getWorldDirection(new THREE.Vector3());
    for (const p of pts) {
      const v = p.clone().project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02) continue;
      const to = p.clone().sub(cam.position), d = to.length();
      const lit = (lightOn && d < 32 && fwd.angleTo(to) < 0.52) || d < 5.5 || (pl.hidden && d < 8);
      if (!lit) continue;
      this.ray.set(cam.position, to.normalize()); this.ray.far = d - 0.3;
      const hits = this.ray.intersectObjects(this.occluders.filter(o => o !== (pl.hidden || null)), false);
      if (!hits.length) return true;
    }
    return false;
  }

  hasLOS(from, to) {
    const dir = to.clone().sub(from), d = dir.length();
    this.ray.set(from, dir.normalize()); this.ray.far = d;
    return !this.ray.intersectObjects(this.occluders, false).length;
  }

  updateSunny(dt, dist, lightOn) {
    const m = this.mon, S = this.sunny, pl = this.pl;
    m.stingCool -= dt;
    const seen = this.isSeen(lightOn);
    if (seen && !m.seenWas) {
      this.newPose();
      if (dist < 12 && m.stingCool <= 0 && m.state !== 'dormant') { audio.stinger(); m.stingCool = 7; }
      else if (dist < 20) audio.noise(audio.now, 0.08, 0.5, 'highpass', 2500);
    }
    m.seenWas = seen;
    this.head.lookAt(this.camera.position);
    this.head.rotateZ(this.headTilt || 0);

    if (m.state === 'dormant') {
      m.dormantT += dt;
      if (!seen) m.unseen += dt; else m.unseen = 0;
      if (m.unseen > 0.4 && S.position.distanceTo(new THREE.Vector3(0, 0, 21)) < 1) {
        S.position.copy(this.farSpot()); audio.giggle(Math.random() * 2 - 1, 0.2);
        this.sub('It moved when you looked away.', 4); setTimeout(() => audio.speak('hehehe.', { pitch: 0.05, rate: 0.5, volume: 0.7 }), 600);
      }
      if (m.dormantT > 35) m.state = 'patrol';
      return;
    }
    if (seen) { m.unseen = 0; return; } // frozen
    m.unseen += dt;

    // perception
    const plFeet = new THREE.Vector3(pl.pos.x, 0, pl.pos.z);
    const eye = S.position.clone().setY(3.2);
    const canSee = !pl.hidden && dist < (pl.flash ? 26 : pl.crouch ? 7 : 13) && this.hasLOS(eye, this.camera.position);
    if (m.state === 'rage') { m.target.copy(plFeet); }
    else if (canSee) { m.state = 'chase'; m.lostT = 0; m.target.copy(plFeet); }
    else if (m.state === 'chase') {
      m.lostT += dt;
      if (pl.hidden && !pl.seenHiding) { m.state = 'investigate'; }
      else if (m.lostT > 5) m.state = 'investigate';
      else m.target.copy(plFeet);
    }
    if (pl.hidden && pl.seenHiding && dist < 1.8) return this.caught();

    // where to go
    if (m.state === 'patrol' || (m.state === 'investigate' && S.position.distanceTo(m.target) < 1.5)) {
      if (m.state === 'investigate') { m.timer = 2; m.state = 'patrol'; }
      if (S.position.distanceTo(m.target) < 1.5 || m.timer <= 0) {
        // patrol somewhere near the player, it always drifts toward you
        const a = Math.random() * 6.28, r = 6 + Math.random() * 16;
        m.target.set(Math.max(-40, Math.min(40, pl.pos.x + Math.cos(a) * r)), 0, Math.max(-40, Math.min(40, pl.pos.z + Math.sin(a) * r)));
        m.timer = 12;
      }
    }
    m.timer -= dt;
    const speed = { patrol: 2.2, investigate: 3.4, chase: 4.3, rage: 5.0 }[m.state] + this.stickerCount * 0.25;
    const dir = m.target.clone().sub(S.position).setY(0);
    if (dir.length() > 0.1) {
      dir.normalize();
      S.position.addScaledVector(dir, speed * dt);
      this.collide(S.position, 0.45);
      S.rotation.y = Math.atan2(dir.x, dir.z);
    }
    // never let it get bored too far away
    if (dist > 36 && m.unseen > 3) {
      const back = new THREE.Vector3(Math.sin(pl.yaw), 0, Math.cos(pl.yaw)).multiplyScalar(20);
      const p = plFeet.clone().add(back);
      if (this.free(p.x, p.z, 1)) { S.position.copy(p); m.unseen = 0; }
    }
    // random dread
    if (Math.random() < dt * 0.04) audio.giggle(Math.random() * 2 - 1, 0.12 + Math.max(0, 1 - dist / 30) * 0.3);
    if (Math.random() < dt * 0.02) audio.whisper(Math.random() * 2 - 1);

    // you can hear exactly where it is
    m.stepT -= dt * speed;
    if (m.stepT <= 0) {
      m.stepT = 1.7;
      if (dist < 26) {
        const rel = S.position.clone().sub(this.camera.position).setY(0).normalize();
        const pan = rel.x * Math.cos(pl.yaw) - rel.z * Math.sin(pl.yaw);
        audio.sunStep(pan, Math.pow(1 - dist / 26, 1.5));
      }
    }
    m.sayCool -= dt;
    if (m.sayCool <= 0) {
      if (m.state === 'chase' && m.lostT === 0) { this.say(['I see you, mochi.', 'there you are.', 'dont run. dont RUN.'][(Math.random() * 3) | 0]); m.sayCool = 14; }
      else if (pl.hidden && dist < 7) { this.say(['where did you go?', 'I can hear your heart, mochi.', 'come out come out.'][(Math.random() * 3) | 0]); m.sayCool = 16; }
    }

    if (!pl.hidden && dist < 1.35) this.caught();
  }

  caught() {
    this.phase = 'caught'; this.pt = 0;
    if (this.pl.hidden) { this.pl.hidden = null; $('slit').classList.remove('on'); }
    this.showPrompt('hidePrompt', false);
    audio.scream(); audio.setHeart(0); audio.setBreath(0); setTimeout(() => audio.speak('found you.', { pitch: 0.05, rate: 0.6 }), 1300);
    this.flashlight.intensity = 45;
    $('redflash').classList.add('on');
    const S = this.sunny, cam = this.camera;
    const f = cam.getWorldDirection(new THREE.Vector3()); f.y = 0; f.normalize();
    S.position.copy(cam.position).addScaledVector(f, 1.3).setY(0);
    S.position.y = cam.position.y - 3.0;
  }

  updateCaught(dt) {
    const cam = this.camera, t = this.pt;
    this.head.lookAt(cam.position);
    const target = this.head.getWorldPosition(new THREE.Vector3());
    const look = new THREE.Matrix4().lookAt(cam.position, target, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(look);
    cam.quaternion.slerp(q, Math.min(1, dt * 14));
    this.head.scale.setScalar(1 + Math.min(1, t * 2) * 0.6);
    this.head.position.x = (Math.random() - 0.5) * 0.08; this.head.position.z = (Math.random() - 0.5) * 0.08 + Math.min(0.5, t);
    cam.position.x += (Math.random() - 0.5) * 0.04;
    if (t > 1.5 && !this.caughtShown) {
      this.caughtShown = true; $('redflash').classList.remove('on'); $('blackout').classList.add('on');
      $('caughtUI').classList.remove('hidden');
      document.exitPointerLock?.();
    }
  }

  retry() {
    this.caughtShown = false;
    $('caughtUI').classList.add('hidden'); $('blackout').classList.remove('on');
    this.head.scale.setScalar(1); this.head.position.set(0, this.headY, 0);
    this.resetPlayer();
    this.sunny.position.copy(this.farSpot());
    this.mon.state = this.stickerCount >= 5 ? 'rage' : 'patrol'; this.mon.timer = 0; this.mon.target.copy(this.sunny.position);
    this.mon.seenWas = false;
    this.phase = 'play'; this.pt = 0;
    audio.startDrone();
    this.sub('Mochi: ...not again. please not again.', 3);
  }

  animateWorld(dt, T) {
    const cam = this.camera.position;
    if (this.swing) {
      this.swing.rotation.x = Math.sin(T * 1.3) * 0.5;
      if (Math.random() < dt * 0.15 && cam.distanceTo(this.POI.swing) < 18) audio.tone(300 + Math.random() * 60, audio.now, 0.4, 'sawtooth', 0.03, null, 220);
    }
    for (const e of this.treeEyes || []) e.lookAt(cam);
    if (this.flowers) for (const f of this.flowers) {
      const dx = cam.x - f.g.position.x, dz = cam.z - f.g.position.z, d = Math.hypot(dx, dz);
      // heads slowly turn to the player; nearby ones snap
      const want = Math.atan2(dx, dz);
      let cur = f.head.rotation.y, diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
      f.head.rotation.y = cur + diff * Math.min(1, dt * (d < 6 ? 6 : 0.4));
      f.head.rotation.x = f.droop + Math.sin(T * 0.7 + f.base) * 0.05;
      f.nextTwitch -= dt;
      if (f.nextTwitch <= 0) { f.twitch = 0.35; f.nextTwitch = 2 + Math.random() * 7; }
      if (f.twitch > 0) { f.twitch -= dt; f.face.rotation.z = (Math.random() - 0.5) * 0.9; f.head.position.y = f.h + (Math.random() - 0.5) * 0.08; }
      else { f.face.rotation.z *= 0.9; f.head.position.y = f.h; }
      if (f.eye) f.eye.lookAt(cam);
      f.cool -= dt;
      if (this.phase === 'play' && d < 3.2 && f.cool <= 0) {
        f.cool = 25; f.twitch = 0.9;
        if (Math.random() < 0.6) { const pan = Math.max(-1, Math.min(1, -Math.sin(this.pl.yaw - want))); audio.flowerShriek(pan); }
      }
      f.dripY -= dt * (1.5 + f.dripY);
      if (f.dripY < 0) f.dripY = f.h - 0.3;
      f.drip.position.set(Math.sin(f.head.rotation.y) * 0.3, f.dripY, Math.cos(f.head.rotation.y) * 0.3);
    }
    if (this.cutouts && this.phase === 'play') {
      for (const c of this.cutouts) { const want = Math.atan2(cam.x - c.position.x, cam.z - c.position.z); c.rotation.y += Math.atan2(Math.sin(want - c.rotation.y), Math.cos(want - c.rotation.y)) * Math.min(1, dt * 0.8); }
      // the stalker cutout follows you once you have 2 smiles
      if (this.stickerCount >= 2 && Math.random() < dt * 0.08 && !this.pl.hidden) {
        const v = this.stalker.position.clone().project(this.camera);
        if (v.z > 1 || Math.abs(v.x) > 1.2) {
          const p = new THREE.Vector3(this.pl.pos.x + Math.sin(this.pl.yaw) * 3.5, 0.7, this.pl.pos.z + Math.cos(this.pl.yaw) * 3.5);
          if (this.free(p.x, p.z, 0.6)) { this.stalker.position.copy(p); this.stalker.rotation.y = this.pl.yaw + Math.PI; audio.whisper(0); }
        }
      }
    }
    if (this.stickers) for (const s of this.stickers) if (!s.got) { s.s.position.y = 1 + Math.sin(T * 2 + s.s.position.x) * 0.12; }
    if (this.door && this.door.visible) this.doorLight.intensity = 26 + Math.sin(T * 3) * 6;
  }
}
