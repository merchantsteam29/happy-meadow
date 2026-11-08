import { input } from './input.js';
import { audio } from './audio.js';
import { Cute2D } from './cute2d.js';
import { Horror3D } from './horror3d.js';
import * as A from './art.js';

const $ = id => document.getElementById(id);
const c2d = $('c2d'), c3d = $('c3d');
input.init();

let state = 'title';
const cute = new Cute2D(c2d, onEvent);
const horror = new Horror3D(c3d, c2d, onEvent);

function onEvent(name, arg) {
  if (name === 'levelDone') {
    if (arg < 2) cute.start(arg + 1);
  } else if (name === 'transition') {
    state = 'transition';
    audio.glitch(0.6);
    setTimeout(() => {
      c3d.classList.remove('hidden');
      c2d.classList.add('hidden');
      horror.startTransition();
      $('grain').style.opacity = 0.055;
    }, 1300);
  } else if (name === 'transitionDone') {
    startGarden(null);
  } else if (name === 'escaped') {
    state = 'ending';
    document.exitPointerLock?.();
    ['hud3d', 'vignette3d'].forEach(id => $(id).classList.add('hidden'));
    $('subs3d').classList.remove('on');
    c3d.classList.add('hidden'); c2d.classList.remove('hidden');
    $('grain').style.opacity = 0;
    $('blackout').classList.remove('on');
    cute.start('ending');
    setTimeout(() => $('whiteout').classList.remove('on'), 300);
  } else if (name === 'end') {
    setTimeout(() => { audio.stopMusic(); $('endUI').classList.remove('hidden'); state = 'end'; }, 2500);
  }
}

function startGarden(save) {
  state = 'horror';
  audio.stopMusic();
  c3d.classList.remove('hidden'); c2d.classList.add('hidden');
  $('vignette3d').classList.remove('hidden');
  $('grain').style.opacity = 0.055;
  horror.startWake(save);
}

// ---------- title ----------
let save = null;
try { save = JSON.parse(localStorage.getItem('meadow_progress') || 'null'); } catch (e) {}
if (save && save.stage === 'garden') { $('contBtn').classList.remove('hidden'); $('contBtn').textContent = 'Continue (the garden)'; }
const padLabel = () => $('padBtn').textContent = `Controllers: ${input.padsEnabled ? 'ON' : 'OFF'}`;
padLabel();
$('padBtn').onclick = () => { input.setPads(!input.padsEnabled); padLabel(); };
$('playBtn').onclick = async () => {
  audio.init();
  await document.fonts.ready;
  $('title').classList.add('hidden');
  c2d.classList.remove('hidden');
  state = 'cute';
  cute.start(0);
  input.endFrame();
};
$('contBtn').onclick = async () => {
  audio.init();
  await document.fonts.ready;
  $('title').classList.add('hidden');
  startGarden(save);
};
$('againBtn').onclick = () => { try { localStorage.removeItem('meadow_progress'); } catch (e) {} location.reload(); };
$('retryBtn').onclick = e => { e.stopPropagation(); wantLock(); horror.retry(); };

// ---------- pointer lock / pause ----------
function wantLock() { if (document.pointerLockElement) return; try { const p = c3d.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
$('wakePrompt').addEventListener('click', () => { wantLock(); horror.clickedToWake(); });
$('pausedUI').addEventListener('click', () => { wantLock(); });
document.addEventListener('pointerlockchange', () => {
  const locked = !!document.pointerLockElement;
  if (state !== 'horror') return;
  if (locked) { horror.paused = false; $('pausedUI').classList.add('hidden'); }
  else if (horror.phase === 'play' && input.padIndex < 0) { horror.paused = true; $('pausedUI').classList.remove('hidden'); audio.setHeart(0); }
});
c3d.addEventListener('click', () => { if (state === 'horror' && horror.phase === 'play') wantLock(); });

// ---------- scare image + grain ----------
function drawScare() {
  const sc = $('scare'); sc.width = innerWidth; sc.height = innerHeight;
  const ctx = sc.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, sc.width, sc.height);
  A.sun(ctx, sc.width / 2, sc.height / 2, Math.min(sc.width, sc.height) * 0.42, 0, { mood: 3 });
  ctx.fillStyle = 'rgba(160,0,0,0.25)'; ctx.fillRect(0, 0, sc.width, sc.height);
}
drawScare(); addEventListener('resize', drawScare);
const grain = $('grain'); grain.width = 160; grain.height = 90;
const gctx = grain.getContext('2d'), gimg = gctx.createImageData(160, 90);
let gframe = 0;
function updateGrain() {
  if (++gframe % 2) return;
  const d = gimg.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  gctx.putImageData(gimg, 0, 0);
}

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(window.__mmCap || 0.05, (now - last) / 1000); last = now;
  input.poll();
  if (state === 'cute' || state === 'ending') { cute.update(dt); cute.draw(); }
  else if (state === 'transition') { cute.update(dt); cute.draw(); horror.update(dt); }
  else if (state === 'horror') {
    // gamepad can wake / unpause without the mouse
    if (horror.phase === 'wake' && !horror.awake && (input.btnPressed(0) || input.keyPressed('Space', 'Enter'))) { wantLock(); horror.clickedToWake(); }
    if (horror.paused && input.pad && input.pad.pressed.size) { horror.paused = false; $('pausedUI').classList.add('hidden'); }
    if (horror.phase === 'caught' && horror.caughtShown && input.btnPressed(0)) { wantLock(); horror.retry(); }
    horror.update(dt);
  }
  if (state === 'transition' || state === 'horror') updateGrain();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// debug skips: ?day=3 or ?garden
const q = new URLSearchParams(location.search);
if (q.has('day')) $('playBtn').onclick = async () => { audio.init(); await document.fonts.ready; $('title').classList.add('hidden'); c2d.classList.remove('hidden'); state = 'cute'; cute.start(Math.max(0, Math.min(2, +q.get('day') - 1))); };
if (q.has('garden')) $('playBtn').onclick = async () => { audio.init(); await document.fonts.ready; $('title').classList.add('hidden'); startGarden(null); };

// test hook for headless playtests
if (q.has('test')) window.__mm = { cute, horror, audio, input, onEvent, startGarden, get state() { return state; }, set state(v) { state = v; } };
