// Phone-sized touch playthrough: node tools/playtest/mobile.mjs (server running, MM_URL set)
import { open } from './harness.mjs';
const { ev, shot, sleep, check, done, touch, tapEl } = await open(import.meta.url, { mobile: true });
const center = async sel => ev(`const b=document.querySelector('${sel}').getBoundingClientRect(); return [b.x+b.width/2, b.y+b.height/2]`);
await sleep(2500);
await shot('00-title');
await ev('window.__mmCap = 0.4');
await tapEl('#playBtn');
await sleep(3500);
check(await ev(`return __mm.state`) === 'cute', 'started 2D by tapping Play');
check(await ev(`return getComputedStyle(document.getElementById('tbRight')).display !== 'none'`), '2D touch buttons visible');
await shot('01-day1');
// hold the right arrow
const [rx, ry] = await center('#tbRight');
const x0 = await ev(`return __mm.cute.p.x`);
await touch('touchStart', [[rx, ry]]); await sleep(1500); await touch('touchEnd', []);
const x1 = await ev(`return __mm.cute.p.x`);
check(x1 > x0 + 40, `right button walks (${x0} -> ${x1})`);
await shot('02-walked');
// tap to advance talk until free
for (let i = 0; i < 20; i++) { if (!await ev(`return !!(__mm.cute.script||__mm.cute.dialog||__mm.cute.waitT>0)`)) break; await touch('touchStart', [[420, 150]]); await sleep(60); await touch('touchEnd', []); await sleep(300); }
check(!await ev(`return !!(__mm.cute.dialog)`), 'tapping advances dialog');
// jump
const [jx, jy] = await center('#tbJump');
await touch('touchStart', [[jx, jy]]);
let vy = 440; for (let i = 0; i < 20 && vy >= 440; i++) { await sleep(60); vy = Math.min(vy, await ev(`return __mm.cute.p.y`)); }
await touch('touchEnd', []);
check(vy < 440, 'jump button jumps (' + vy + ')');
// garden
await ev(`__mm.startGarden(null)`);
for (let i = 0; i < 60 && await ev(`return document.getElementById('wakePrompt').classList.contains('hidden')`); i++) await sleep(500);
await tapEl('#wakePrompt');
for (let i = 0; i < 120 && await ev(`return __mm.horror.phase`) !== 'play'; i++) await sleep(500);
check(await ev(`return __mm.horror.phase`) === 'play', 'woke up by tapping');
check(await ev(`return getComputedStyle(document.getElementById('tbLight')).display !== 'none'`), '3D touch buttons visible');
await shot('03-garden');
// joystick: drag up on the left side
const z0 = await ev(`return __mm.horror.pl.pos.z`);
await touch('touchStart', [[150, 250]]); await sleep(50);
await touch('touchMove', [[150, 190]]); await sleep(1500);
await shot('04-stick');
await touch('touchEnd', []);
const z1 = await ev(`return __mm.horror.pl.pos.z`);
check(z1 < z0 - 0.5, `joystick moves forward (${z0} -> ${z1})`);
// look: drag on right side
const y0 = await ev(`return __mm.horror.pl.yaw`);
await touch('touchStart', [[600, 200]]); await sleep(50); await touch('touchMove', [[520, 200]]); await sleep(300); await touch('touchEnd', []);
const y1 = await ev(`return __mm.horror.pl.yaw`);
check(Math.abs(y1 - y0) > 0.1, `drag looks around (${y0} -> ${y1})`);
// flashlight toggle
const f0 = await ev(`return __mm.horror.pl.flash`);
await tapEl('#tbLight'); await sleep(300);
check(await ev(`return __mm.horror.pl.flash`) !== f0, 'light button toggles flashlight');
await tapEl('#tbLight'); await sleep(300);
// hide in a box
await ev(`const h=__mm.horror, b=h.hideBoxes[0]; h.pl.pos.set(b.position.x, 1.6, b.position.z + 1.5);`); await sleep(500);
await shot('05-boxprompt');
await tapEl('#tbHide'); await sleep(500);
check(await ev(`return !!__mm.horror.pl.hidden`), 'hide button hides');
await shot('06-hidden');
await tapEl('#tbHide'); await sleep(400);
check(!await ev(`return !!__mm.horror.pl.hidden`), 'hide button climbs out');
// blackout scare
await ev(`const h=__mm.horror; h.sunny.position.set(40,0,-40); h.startBlackout();`);
await sleep(2500); await shot('07-blackout');
await sleep(4000); await shot('08-after-blackout');
check(await ev(`return !__mm.horror.blackoutEv`), 'blackout ends');
await done();
