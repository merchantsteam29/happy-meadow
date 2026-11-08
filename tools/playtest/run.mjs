// node tools/playtest/run.mjs  (server must be running: PORT=8093 node serve.js)
import { open } from './harness.mjs';
const { ev, shot, sleep, check, done, send } = await open(import.meta.url);
const key = async (code, ms = 80) => { await ev(`dispatchEvent(new KeyboardEvent('keydown',{code:'${code}'}))`); await sleep(ms); await ev(`dispatchEvent(new KeyboardEvent('keyup',{code:'${code}'}))`); };
await sleep(2500);
await shot('00-title');
await ev('window.__mmCap = 0.4');
await ev(`document.getElementById('playBtn').click()`);
await sleep(3500);
await shot('01-day1');
// walk right to Bea
await ev(`dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}))`); await sleep(2200); await ev(`dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD'}))`);
await sleep(800); await shot('02-bea');
const skipDialogs = async () => { for (let i = 0; i < 30; i++) { const busy = await ev(`return !!(__mm.cute.script||__mm.cute.dialog||__mm.cute.waitT>0)`); if (!busy) break; await key('Enter'); await sleep(250); } };
await skipDialogs();
for (const day of [0, 1, 2]) {
  await ev(`__mm.cute.start(${day}); __mm.cute.card=null;`);
  for (const x of [700, 1500, 2300, 2450]) {
    await ev(`const p=__mm.cute.p; p.x=${x}; p.y=440; p.vy=0;`); await sleep(500);
    await shot(`d${day + 1}-${x}`);
    await skipDialogs();
  }
  if (day < 2) { await ev(`const p=__mm.cute.p; p.x=2995;`); await sleep(400); }
}
await sleep(2600);
check(['transition', 'horror'].includes(await ev(`return __mm.state`)), 'transition started');
for (let i = 0; i < 8; i++) { await sleep(1000); await shot('t-' + i); }
for (let i = 0; i < 20 && await ev(`return __mm.state`) !== 'horror'; i++) await sleep(1000);
check(await ev(`return __mm.state`) === 'horror', 'in garden');
await ev(`document.getElementById('wakePrompt').click()`);
await sleep(4500);
await shot('g-wake');
await ev(`__mm.horror.paused=false; document.getElementById('pausedUI').classList.add('hidden')`);
// look around
for (const [yaw, n] of [[0, 'g-fwd'], [Math.PI / 2, 'g-left'], [Math.PI, 'g-back']]) { await ev(`__mm.horror.pl.yaw=${yaw}; __mm.horror.paused=false;`); await sleep(500); await shot(n); }
// teleport near a flower and the house
await ev(`const h=__mm.horror, f=h.flowers[0].g.position; h.pl.pos.set(f.x+2.5,1.6,f.z); h.pl.yaw=Math.PI/2; h.paused=false;`); await sleep(700); await shot('g-flower');
await ev(`const h=__mm.horror; h.pl.pos.set(0,1.6,-14); h.pl.yaw=0; h.paused=false;`); await sleep(700); await shot('g-house');
await ev(`const h=__mm.horror; h.pl.pos.set(-20,1.6,28); h.pl.yaw=0; h.paused=false;`); await sleep(700); await shot('g-bea');
// sunny in view, close
await ev(`const h=__mm.horror; h.mon.state='patrol'; h.pl.pos.set(0,1.6,10); h.pl.yaw=0; h.sunny.position.set(0,0,4); h.paused=false;`); await sleep(800); await shot('g-sunny');
const p1 = await ev(`return __mm.horror.sunny.position.z`);
await sleep(1000);
const p2 = await ev(`return __mm.horror.sunny.position.z`);
check(Math.abs(p1 - p2) < 0.01, 'sunny frozen while seen ' + p1 + ' ' + p2);
await ev(`__mm.horror.pl.yaw=Math.PI; __mm.horror.paused=false;`); await sleep(1200);
const p3 = await ev(`return __mm.horror.sunny.position.z`);
check(p3 > p2 + 0.3 || await ev(`return __mm.horror.phase`) === 'caught', 'sunny moves when unseen ' + p3);
await sleep(2500); await shot('g-caught');
console.log('phase', await ev(`return __mm.horror.phase`));
// collect all stickers, escape
await ev(`const h=__mm.horror; if(h.phase==='caught') h.retry(); for(const s of h.stickers) if(!s.got) h.takeSticker(s); h.sunny.position.set(40,0,-40); h.paused=false;`);
await sleep(500);
await ev(`const h=__mm.horror; h.pl.pos.set(0,1.6,38); h.pl.yaw=Math.PI; h.paused=false;`); await sleep(400); await shot('g-door');
await ev(`const h=__mm.horror; h.pl.pos.set(0,1.6,40.6); h.paused=false;`); await sleep(3500);
check(await ev(`return __mm.state`) === 'ending', 'ending');
await sleep(2000); await shot('e-1');
for (let i = 0; i < 12; i++) { await key('Enter'); await sleep(700); }
await sleep(4000); await shot('e-end');

await done();
