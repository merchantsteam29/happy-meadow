// Camera-side realism: flashlight in a paw, a visible beam, dust, ground mist, breath fog.
import * as THREE from 'three';
import * as T from './textures.js';

export function buildHand(camera, high) {
  const rig = new THREE.Group(); rig.position.set(0.24, -0.26, -0.42); camera.add(rig);
  const sway = new THREE.Group(); rig.add(sway);
  const metal = new THREE.MeshStandardMaterial({ color: 0x23262a, metalness: 0.85, roughness: 0.38 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.2, 16), metal); body.rotation.x = Math.PI / 2; sway.add(body);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 16), rubber); grip.rotation.x = Math.PI / 2; grip.position.z = 0.03; sway.add(grip);
  const headM = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.026, 0.06, 16), metal); headM.rotation.x = Math.PI / 2; headM.position.z = -0.12; sway.add(headM);
  const lensM = new THREE.MeshBasicMaterial({ color: 0xfff2d8 });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), lensM); lens.position.z = -0.151; lens.rotation.y = Math.PI; sway.add(lens);
  // Mochi's white paw wrapped around it
  const f = T.fur(128);
  const furM = new THREE.MeshStandardMaterial({ ...f, roughness: 0.95, color: 0xf2eeee, emissive: 0x2a2626 });
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 14), furM); paw.scale.set(1.05, 0.9, 1.5); paw.position.set(0.006, -0.01, 0.04); sway.add(paw);
  for (let i = 0; i < 3; i++) { const toe = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), furM); toe.position.set(-0.03, 0.022 - i * 0.022, 0.0 - i * 0.012); sway.add(toe); }
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.4, 14), furM); arm.rotation.x = Math.PI / 2 - 0.25; arm.position.set(0.03, -0.04, 0.26); sway.add(arm);
  // grime
  const dirt = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8, 0, 1.4, 1.2, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a0505, roughness: 0.2, transparent: true, opacity: 0.8 }));
  dirt.scale.copy(paw.scale); dirt.position.copy(paw.position); sway.add(dirt);
  rig.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

  // the light itself lives at the lens
  const light = new THREE.SpotLight(0xfff0d6, 45, 42, 0.48, 0.6, 1.35);
  light.position.set(0, 0, -0.16); sway.add(light);
  const target = new THREE.Object3D(); target.position.set(0, 0, -6); sway.add(target); light.target = target;
  if (high) {
    light.castShadow = true; light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.3; light.shadow.camera.far = 40; light.shadow.bias = -0.0004; light.shadow.normalBias = 0.03;
  }

  // visible beam: an open cone, additive, fading with distance and toward the edge
  const len = 13, beamG = new THREE.CylinderGeometry(0.03, len * Math.tan(0.45), len, 32, 1, true);
  beamG.translate(0, -len / 2, 0); beamG.rotateX(Math.PI / 2); // apex at origin, pointing -z
  const beamM = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uI: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying float vD; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vD = -position.z / ${len.toFixed(1)}; vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uI; uniform float uTime; varying float vD; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){ float edge = pow(abs(dot(vN, vV)), 1.6);
        float n = 0.75 + 0.25 * sin(vP.z * 1.3 + uTime * 0.7 + vP.x * 2.0);
        float a = edge * pow(1.0 - clamp(vD,0.0,1.0), 1.7) * 0.055 * uI * n;
        gl_FragColor = vec4(vec3(1.0, 0.93, 0.8) * a, a); }`
  });
  const beam = new THREE.Mesh(beamG, beamM); beam.position.z = -0.15; beam.renderOrder = 5; sway.add(beam);

  return { rig, sway, light, beam, lensM, setOn(on, k = 1) { light.intensity = on ? 45 * k : 0; beam.visible = on; beamM.uniforms.uI.value = k; lensM.color.setHex(on ? 0xfff2d8 : 0x222222); } , beamM };
}

export function buildDust(scene, count) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) p[i] = (Math.random() - 0.5) * 12;
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ size: 0.025, map: T.softDot(32), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xd8ccb0 });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
  return {
    pts, update(cam, t) {
      const a = g.attributes.position;
      for (let i = 0; i < count; i++) {
        let x = a.getX(i), y = a.getY(i), z = a.getZ(i);
        x += Math.sin(t * 0.3 + i) * 0.0015; y += Math.sin(t * 0.2 + i * 1.7) * 0.001 - 0.0004; z += Math.cos(t * 0.25 + i) * 0.0015;
        // keep them in a box around the camera
        const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
        if (Math.abs(dx) > 6) x -= Math.sign(dx) * 12; if (Math.abs(dy) > 3) y -= Math.sign(dy) * 6; if (Math.abs(dz) > 6) z -= Math.sign(dz) * 12;
        a.setXYZ(i, x, y, z);
      }
      a.needsUpdate = true;
    }
  };
}

export function buildMist(scene, count, area) {
  const tex = T.mist(256), out = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.05 + Math.random() * 0.05, depthWrite: false, color: 0x30303c });
    const s = new THREE.Sprite(m); const sz = 8 + Math.random() * 10; s.scale.set(sz, sz * 0.35, 1);
    s.position.set((Math.random() - 0.5) * area, 0.4 + Math.random() * 0.8, (Math.random() - 0.5) * area); scene.add(s);
    out.push({ s, vx: (Math.random() - 0.5) * 0.25, vz: (Math.random() - 0.5) * 0.25 });
  }
  return { update(dt, half) { for (const o of out) { o.s.position.x += o.vx * dt; o.s.position.z += o.vz * dt; if (Math.abs(o.s.position.x) > half) o.vx *= -1; if (Math.abs(o.s.position.z) > half) o.vz *= -1; } } };
}

export function buildBreath(camera, scene) {
  const tex = T.mist(128), pool = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, color: 0x8a909c }));
    s.visible = false; scene.add(s); pool.push({ s, t: 9, v: new THREE.Vector3() });
  }
  let next = 0;
  return {
    puff(strength = 1) {
      const p = pool[next++ % pool.length], dir = camera.getWorldDirection(new THREE.Vector3());
      p.t = 0; p.k = strength; p.s.visible = true;
      p.s.position.copy(camera.position).addScaledVector(dir, 0.35).add(new THREE.Vector3(0, -0.12, 0));
      p.v.copy(dir).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.08, 0));
    },
    update(dt) {
      for (const p of pool) {
        if (p.t > 2) { p.s.visible = false; continue; }
        p.t += dt; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(0.97);
        const sz = 0.15 + p.t * 0.45; p.s.scale.set(sz, sz, 1);
        p.s.material.opacity = Math.max(0, (1 - p.t / 2)) * 0.16 * p.k;
      }
    }
  };
}
