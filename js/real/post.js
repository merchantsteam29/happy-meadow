// Post-processing: bloom, turn motion blur, and a "real camera" pass (grain, vignette, aberration, red).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

class BlurPass extends Pass {
  constructor() {
    super();
    const opts = { type: THREE.HalfFloatType };
    this.old = new THREE.WebGLRenderTarget(innerWidth, innerHeight, opts);
    this.comp = new THREE.WebGLRenderTarget(innerWidth, innerHeight, opts);
    this.uniforms = { tOld: { value: null }, tNew: { value: null }, damp: { value: 0 } };
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D tOld; uniform sampler2D tNew; uniform float damp; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(tNew, vUv), texture2D(tOld, vUv), damp); }'
    }));
    this.copy = new FullScreenQuad(new THREE.MeshBasicMaterial());
  }
  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tOld.value = this.old.texture; this.uniforms.tNew.value = readBuffer.texture;
    renderer.setRenderTarget(this.comp); this.quad.render(renderer);
    this.copy.material.map = this.comp.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.copy.render(renderer);
    const t = this.old; this.old = this.comp; this.comp = t;
  }
  setSize(w, h) { this.old.setSize(w, h); this.comp.setSize(w, h); }
}

const CameraShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.07 }, uVig: { value: 1.1 }, uAb: { value: 0.0015 }, uRed: { value: 0 }, uDesat: { value: 0.25 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uAb, uRed, uDesat; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 61.0) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float d = length(c);
      vec2 off = c * uAb * (1.0 + d * 4.0);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(l), uDesat);
      col = mix(col, vec3(l * 1.3, l * 0.25, l * 0.2), uRed);
      col *= 1.0 - smoothstep(0.25, 0.85, d * uVig);
      col += (h(vUv * 800.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`
};

export function buildPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.35, 0.5, 0.92);
  composer.addPass(bloom);
  const blur = new BlurPass(); composer.addPass(blur);
  composer.addPass(new OutputPass());
  const cam = new ShaderPass(CameraShader); composer.addPass(cam);
  addEventListener('resize', () => composer.setSize(innerWidth, innerHeight));
  return { composer, bloom, blur: blur.uniforms.damp, cam: cam.uniforms };
}
