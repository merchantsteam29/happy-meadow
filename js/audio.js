// All sound is synthesized with WebAudio. No files.

const MEL = [72, 76, 79, 76, 77, 76, 74, 72, 74, 77, 81, 77, 79, 77, 76, 74, 72, 76, 79, 84, 81, 79, 77, 76, 74, 76, 77, 74, 72, 0, 72, 0];
const BASS = [48, 0, 55, 0, 53, 0, 55, 0, 50, 0, 57, 0, 55, 0, 55, 0, 48, 0, 55, 0, 53, 0, 52, 0, 50, 0, 55, 0, 48, 0, 48, 0];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export const audio = {
  ctx: null, master: null, musicGain: null, sfxGain: null,
  music: null,         // { mode, step, next, corrupt }
  drone: null, heart: { level: 0, next: 0 },
  noiseBuf: null, dist: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0.32; this.musicGain.connect(this.master);
    this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(this.master);
    // echo for the music box
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = 0.37;
    const fb = ctx.createGain(); fb.gain.value = 0.45; this.delay.connect(fb); fb.connect(this.delay);
    this.delayOut = ctx.createGain(); this.delayOut.gain.value = 0.5; this.delay.connect(this.delayOut); this.delayOut.connect(this.musicGain);
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.dist = ctx.createWaveShaper();
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 12); }
    this.dist.curve = curve; this.dist.connect(this.sfxGain);
    setInterval(() => this.tick(), 25);
  },

  get now() { return this.ctx ? this.ctx.currentTime : 0; },

  tone(freq, t, dur, type = 'square', gain = 0.2, dest, slideTo, attack = 0.005) {
    const ctx = this.ctx; if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain); o.start(t); o.stop(t + dur + 0.05);
    return o;
  },

  noise(t, dur, gain = 0.2, filterType = 'bandpass', f0 = 1000, f1, q = 1, dest) {
    const ctx = this.ctx; if (!ctx) return;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(f0, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },

  // ---------- music ----------
  playMusic(mode = 'cute', corrupt = 0) {
    if (!this.ctx) return;
    this.music = { mode, step: 0, next: this.now + 0.1, corrupt };
  },
  setCorrupt(c) { if (this.music) this.music.corrupt = c; },
  stopMusic() { this.music = null; },

  tick() {
    const ctx = this.ctx; if (!ctx) return;
    const m = this.music;
    if (m) {
      const box = m.mode === 'box';
      const spb = (box ? 0.42 : 0.23) * (1 + m.corrupt * 0.35);
      while (m.next < ctx.currentTime + 0.12) {
        const i = m.step % MEL.length, c = m.corrupt;
        const drop = c > 0.3 && Math.random() < c * 0.25;
        const det = (Math.random() - 0.5) * c * 120;
        if (MEL[i] && !drop) {
          const f = mtof(MEL[i] + (box ? 12 : 0)) * Math.pow(2, det / 1200);
          if (box) {
            this.tone(f, m.next, 1.4, 'sine', 0.18, this.musicGain);
            this.tone(f, m.next, 1.4, 'sine', 0.12, this.delay);
            this.tone(f * 2.01, m.next, 0.5, 'sine', 0.04, this.musicGain);
          } else {
            this.tone(f, m.next, spb * 0.9, 'square', 0.09, this.musicGain);
            this.tone(f * 2, m.next, spb * 0.5, 'triangle', 0.05, this.musicGain);
          }
        }
        if (!box && BASS[i] && !(c > 0.5 && Math.random() < 0.3)) this.tone(mtof(BASS[i]) * Math.pow(2, -det / 2400), m.next, spb * 1.6, 'triangle', 0.16, this.musicGain);
        if (!box && i % 4 === 0 && c < 0.6) this.noise(m.next, 0.04, 0.06, 'highpass', 7000);
        m.next += spb; m.step++;
      }
    }
    this.breathTick();
    // heartbeat
    const h = this.heart;
    if (h.level > 0.02) {
      if (h.next < ctx.currentTime) h.next = ctx.currentTime + 0.05;
      while (h.next < ctx.currentTime + 0.1) {
        const g = 0.15 + h.level * 0.5;
        this.tone(62, h.next, 0.18, 'sine', g, this.sfxGain, 38);
        this.tone(58, h.next + 0.2, 0.2, 'sine', g * 0.75, this.sfxGain, 34);
        h.next += 1.15 - h.level * 0.75;
      }
    }
  },
  setHeart(level) { this.heart.level = Math.max(0, Math.min(1, level)); },

  // ---------- cute sfx ----------
  jump() { const t = this.now; this.tone(420, t, 0.14, 'square', 0.12, null, 760); },
  carrot(rotten) {
    const t = this.now;
    if (rotten) { this.noise(t, 0.25, 0.4, 'lowpass', 500, 120); this.tone(130, t, 0.25, 'sine', 0.3, null, 50); return; }
    this.tone(880, t, 0.1, 'triangle', 0.2); this.tone(1318, t + 0.07, 0.16, 'triangle', 0.2);
  },
  blip(pitch = 600) { this.tone(pitch * (0.95 + Math.random() * 0.1), this.now, 0.04, 'square', 0.04); },
  boing() { this.tone(200, this.now, 0.3, 'triangle', 0.25, null, 600); },
  win() { const t = this.now; [72, 76, 79, 84].forEach((n, i) => this.tone(mtof(n), t + i * 0.1, 0.3, 'triangle', 0.2)); },
  glitch(len = 0.2) {
    const t = this.now;
    for (let i = 0; i < 6; i++) this.tone(100 + Math.random() * 2000, t + i * len / 6, len / 6, 'square', 0.12);
    this.noise(t, len, 0.3, 'highpass', 2000);
  },

  // ---------- horror sfx ----------
  startDrone() {
    if (!this.ctx || this.drone) return;
    const ctx = this.ctx, t = this.now;
    const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.5, t + 4);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    lp.connect(out); out.connect(this.master);
    const oscs = [43.6, 44.1, 65.4, 87.9].map((f, i) => {
      const o = ctx.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i < 2 ? 0.12 : 0.06; o.connect(g); g.connect(lp); o.start(); return o;
    });
    const wind = ctx.createBufferSource(); wind.buffer = this.noiseBuf; wind.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.7;
    const wg = ctx.createGain(); wg.gain.value = 0.05; wind.connect(wf); wf.connect(wg); wg.connect(out); wind.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 300;
    lfo.connect(lg); lg.connect(wf.frequency); lfo.start();
    this.drone = { out, oscs, wind, lfo, lp };
  },
  setDroneTension(x) { if (this.drone) this.drone.lp.frequency.setTargetAtTime(240 + x * 900, this.now, 0.3); },
  stopDrone() {
    if (!this.drone) return;
    const d = this.drone; this.drone = null;
    d.out.gain.setTargetAtTime(0.0001, this.now, 0.3);
    setTimeout(() => { d.oscs.forEach(o => o.stop()); d.wind.stop(); d.lfo.stop(); }, 2000);
  },
  step(loud = 1) { this.noise(this.now, 0.09, 0.12 * loud, 'bandpass', 380 + Math.random() * 200, 160, 1.4); },
  stinger() {
    const t = this.now;
    [220, 233, 311, 330, 466, 622].forEach(f => this.tone(f * (1 + Math.random() * 0.01), t, 2.2, 'sawtooth', 0.12, this.dist, f * 0.7, 0.01));
    this.noise(t, 1.2, 0.6, 'highpass', 3000, 800);
  },
  scream() {
    const t = this.now;
    for (let i = 0; i < 5; i++) this.tone(700 + i * 137, t, 1.6, 'sawtooth', 0.5, this.dist, 180 + i * 40, 0.01);
    this.noise(t, 1.7, 1.2, 'bandpass', 2500, 400, 0.6, this.dist);
    this.tone(55, t, 1.5, 'square', 0.6, this.dist, 30, 0.01);
  },
  tear() { const t = this.now; this.noise(t, 1.6, 0.9, 'bandpass', 3500, 150, 2); this.noise(t + 0.3, 1.2, 0.6, 'lowpass', 900, 80); },
  chime(dark) {
    const t = this.now;
    [76, 79, 83, 88].forEach((n, i) => this.tone(mtof(n) * (dark ? 0.97 : 1), t + i * 0.09, 1.2, 'sine', 0.18));
    if (dark) this.tone(mtof(64) * 1.03, t + 0.4, 2, 'sine', 0.12);
  },
  click() { this.tone(2000, this.now, 0.02, 'square', 0.15); },
  giggle(pan = 0, vol = 0.3) {
    const ctx = this.ctx; if (!ctx) return;
    const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(this.sfxGain);
    const t = this.now;
    for (let i = 0; i < 6; i++) this.tone(900 - i * 40 + Math.random() * 60, t + i * 0.11, 0.09, 'triangle', vol, p, 700 - i * 40);
  },
  flowerShriek(pan = 0) {
    const ctx = this.ctx; if (!ctx) return;
    const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(this.sfxGain);
    const t = this.now;
    this.tone(1400, t, 0.7, 'sawtooth', 0.18, p, 500, 0.01);
    this.tone(1470, t, 0.7, 'sawtooth', 0.14, p, 530, 0.01);
    this.noise(t, 0.5, 0.25, 'bandpass', 3000, 900, 3, p);
  },
  squelch() { const t = this.now; this.noise(t, 0.35, 0.6, 'lowpass', 700, 90, 4); this.tone(90, t, 0.3, 'sine', 0.4, null, 40); },
  thud(pan = 0) {
    const ctx = this.ctx; if (!ctx) return;
    const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(this.sfxGain);
    const t = this.now; this.tone(90, t, 0.5, 'sine', 0.6, p, 30); this.noise(t, 0.2, 0.4, 'lowpass', 400, 100, 1, p);
  },
  // Sunny's heavy, wrong footsteps. pan -1..1, vol 0..1
  sunStep(pan = 0, vol = 1) {
    const ctx = this.ctx; if (!ctx || vol <= 0.01) return;
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(this.sfxGain);
    const t = this.now;
    this.tone(70, t, 0.35, 'sine', 0.7 * vol, p, 28);
    this.noise(t, 0.25, 0.5 * vol, 'lowpass', 600, 90, 1, p);
    if (Math.random() < 0.5) this.noise(t + 0.08, 0.12, 0.25 * vol, 'bandpass', 2800 + Math.random() * 1500, null, 8, p); // a joint cracking
  },
  // the player's breathing gets ragged when scared or out of breath
  setBreath(level) { this.breath = Math.max(0, Math.min(1, level)); },
  breathTick() {
    if (!this.ctx || !(this.breath > 0.15)) return;
    const t = this.now;
    if (!this.nextBreath || this.nextBreath < t) this.nextBreath = t + 0.05;
    if (this.nextBreath > t + 0.1) return;
    const b = this.breath, len = 0.9 - b * 0.5;
    this.noise(this.nextBreath, len * 0.55, 0.06 + b * 0.16, 'bandpass', 900 + b * 500, 600, 1.2);
    this.noise(this.nextBreath + len * 0.6, len * 0.45, 0.04 + b * 0.12, 'bandpass', 1300 + b * 400, 900, 1.5);
    this.nextBreath += len * 1.15;
  },
  // Sunny talks. Very low and slow, through the browser's speech voice.
  speak(text, { pitch = 0.05, rate = 0.72, volume = 1 } = {}) {
    try {
      const s = window.speechSynthesis; if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch; u.rate = rate; u.volume = volume;
      const vs = s.getVoices();
      const v = vs.find(v => /en/i.test(v.lang) && /male|david|daniel|fred|george|guy/i.test(v.name)) || vs.find(v => /en/i.test(v.lang));
      if (v) u.voice = v;
      s.speak(u);
    } catch (e) {}
  },
  whisper(pan = 0) {
    const ctx = this.ctx; if (!ctx) return;
    const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(this.sfxGain);
    const t = this.now;
    for (let i = 0; i < 4; i++) this.noise(t + i * 0.18, 0.16, 0.15, 'bandpass', 2500 + Math.random() * 2500, null, 6, p);
  }
};
