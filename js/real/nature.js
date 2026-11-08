// Dead, twisted trees and dense wind-blown grass.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './textures.js';

// a tube along a curve that tapers from r0 to r1
function taperedTube(points, r0, r1, radial = 7, segs = 10) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position, p = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, rad = r0 + (r1 - r0) * t;
    curve.getPointAt(t, c);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(rad).add(c);
      pos.setXYZ(k, p.x, p.y, p.z);
    }
  }
  g.computeVertexNormals();
  // stretch bark UVs along the length
  const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 3, uv.getY(k));
  return g;
}

function branch(parts, start, dir, len, r0, depth, R) {
  const pts = [start.clone()];
  const d = dir.clone(), p = start.clone(), n = 4;
  for (let i = 0; i < n; i++) {
    d.add(new THREE.Vector3((R() - 0.5) * 0.5, (R() - 0.35) * 0.25, (R() - 0.5) * 0.5)).normalize();
    p.addScaledVector(d, len / n); pts.push(p.clone());
  }
  parts.push(taperedTube(pts, r0, r0 * 0.35, depth > 1 ? 7 : 4, depth > 1 ? 8 : 4));
  if (depth <= 0) return;
  const kids = depth > 1 ? 3 + ((R() * 3) | 0) : 2 + ((R() * 2) | 0);
  for (let k = 0; k < kids; k++) {
    const t = 0.35 + R() * 0.6, idx = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const nd = dir.clone().add(new THREE.Vector3((R() - 0.5) * 2, R() * 0.6 - 0.05, (R() - 0.5) * 2)).normalize();
    branch(parts, pts[idx], nd, len * (0.45 + R() * 0.25), r0 * 0.45, depth - 1, R);
  }
}

export function treeTemplates(count, barkMat, lowDetail) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const R = rng(100 + i), parts = [];
    const h = 5 + R() * 4;
    // trunk with a lean and a twist
    const trunk = [new THREE.Vector3(0, -0.3, 0)];
    const lean = new THREE.Vector3((R() - 0.5) * 0.8, 0, (R() - 0.5) * 0.8);
    for (let k = 1; k <= 5; k++) trunk.push(new THREE.Vector3(lean.x * k / 5 + (R() - 0.5) * 0.4, h * k / 5, lean.z * k / 5 + (R() - 0.5) * 0.4));
    parts.push(taperedTube(trunk, 0.42 + R() * 0.15, 0.12, 9, 14));
    // roots
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * 6.28 + R(), pts = [new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6), new THREE.Vector3(Math.cos(a) * 1.3, -0.1, Math.sin(a) * 1.3)];
      parts.push(taperedTube(pts, 0.22, 0.04, 5, 5));
    }
    const nb = 4 + ((R() * 3) | 0);
    for (let k = 0; k < nb; k++) {
      const t = 0.45 + R() * 0.5, y = h * t;
      const a = R() * 6.28, dir = new THREE.Vector3(Math.cos(a), 0.5 + R() * 0.6, Math.sin(a)).normalize();
      branch(parts, new THREE.Vector3(lean.x * t, y, lean.z * t), dir, 2.2 + R() * 2.2, 0.16 * (1.2 - t * 0.6), lowDetail ? 1 : 2, R);
    }
    const geo = mergeGeometries(parts.map(g => g.toNonIndexed ? g : g), false);
    out.push(geo);
  }
  return out;
}

// grass: an instanced, tapered, bent blade that sways in the wind
export function grassField(count, area, avoid) {
  const blade = new THREE.PlaneGeometry(0.07, 0.6, 1, 4);
  blade.translate(0, 0.3, 0);
  const pos = blade.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), t = y / 0.6;
    pos.setX(i, pos.getX(i) * (1 - t * 0.9));
    pos.setZ(i, t * t * 0.12);
  }
  blade.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a9070, roughness: 0.9, side: THREE.DoubleSide });
  const uniforms = { uTime: { value: 0 } };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 gw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(uTime * 1.6 + gw.x * 0.35 + gw.z * 0.27) * 0.6 + sin(uTime * 3.1 + gw.x * 1.3) * 0.25;
      float hh = position.y / 0.6;
      transformed.x += sway * 0.12 * hh * hh;
      transformed.z += sway * 0.05 * hh * hh;`);
  };
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const R = rng(55), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 3; tries++) {
    const x = (R() - 0.5) * area, z = (R() - 0.5) * area;
    if (avoid && avoid(x, z)) continue;
    q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.3, R() * 6.28, (R() - 0.5) * 0.3));
    const h = 0.5 + R() * 0.9; s.set(1 + R() * 0.6, h, 1);
    p.set(x, 0, z); m.compose(p, q, s); mesh.setMatrixAt(n, m);
    const dead = R();
    col.setRGB(0.16 + dead * 0.16, 0.2 + dead * 0.08, 0.08 + dead * 0.03); mesh.setColorAt(n, col);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, uniforms };
}
