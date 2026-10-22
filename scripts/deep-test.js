/* ==========================================================================
   DEEP TEST — drives a headless Chromium via the DevTools protocol.
   Loads the site, scrolls through every chapter, reports the real state of
   each video (loaded / playing / advancing / scrubbed to the end) and the
   suite cards. Usage:
     node scripts\deep-test.js "C:\...\msedge.exe"
   ========================================================================== */
'use strict';
const http = require('http');
const { spawn } = require('child_process');

const EXE = process.argv[2] || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DBG = 9223;
const SITE = 'http://127.0.0.1:8000/';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function httpJson(path) {
  return new Promise((resolve, reject) => {
    const rq = http.request({ host: '127.0.0.1', port: DBG, path: path, method: 'GET' }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    rq.on('error', reject);
    rq.end();
  });
}

let ws, msgId = 0;
const pending = new Map();
const pageErrors = [];

function send(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve: resolve, reject: reject });
    ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout: ' + method)); } }, 20000);
  });
}

async function evaljs(expression) {
  const r = await send('Runtime.evaluate', { expression: expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.result && r.result.exceptionDetails) {
    throw new Error('page exception: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  }
  return r.result && r.result.result ? r.result.result.value : undefined;
}

const SNAP = `(function(){
  return Array.prototype.map.call(document.querySelectorAll('video'), function(v){
    return { clip: (v.closest('section')||{id:'?'}).id, src: (v.currentSrc||'').split('/').pop(),
             rs: v.readyState, t: Math.round(v.currentTime*100)/100,
             dur: isFinite(v.duration)? Math.round(v.duration*100)/100 : -1,
             paused: v.paused, live: v.classList.contains('is-live') };
  });
})()`;

async function main() {
  const browser = spawn(EXE, [
    '--headless=new', '--disable-gpu', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=' + DBG,
    '--user-data-dir=' + process.env.TEMP + '\\rajmahal-edge-test',
    '--no-first-run', '--window-size=1600,900', 'about:blank'
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 40; i++) {
    try { targets = await httpJson('/json/list'); if (targets && targets.length) break; } catch (e) { /* not up yet */ }
    await sleep(400);
  }
  if (!targets) throw new Error('browser debug endpoint never came up');
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');

  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')); });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      pageErrors.push(m.params.args.map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      pageErrors.push('EXCEPTION: ' + ((d.exception && d.exception.description) || d.text));
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');

  await send('Page.navigate', { url: SITE });
  await sleep(5000); /* preloader + settle */

  const report = [];
  const line = (ok, label, detail) => report.push((ok ? 'PASS' : 'FAIL') + '  ' + label + (detail ? '  |  ' + detail : ''));

  const state = await evaljs('JSON.stringify({w:innerWidth,h:innerHeight,ready:document.body.classList.contains("is-ready")})');
  console.log('page state: ' + state);
  const vh = await evaljs('innerHeight');

  /* ---- 1. HERO: scrub through the whole pin, video must reach its end ---- */
  for (let i = 0; i <= 10; i++) {
    await evaljs('window.scrollTo(0,' + Math.round((i * 3.8 * vh) / 10) + ')');
    await sleep(110);
  }
  await sleep(1300); /* let the lerp settle on the final frame */
  /* a seek into an unbuffered tail transiently drops readyState to HAVE_METADATA —
     poll until the frame is decodable instead of sampling one unlucky instant */
  let heroSnap = (await evaljs(SNAP)).find((v) => v.clip === 'hero');
  for (let i = 0; i < 20 && heroSnap && heroSnap.rs < 2; i++) {
    await sleep(400);
    heroSnap = (await evaljs(SNAP)).find((v) => v.clip === 'hero');
  }
  line(!!heroSnap && heroSnap.src.indexOf('01-hero-aerial') > -1 && heroSnap.rs >= 2, 'CH1 hero: clip 01 loaded + decodable', JSON.stringify(heroSnap));
  line(!!heroSnap && heroSnap.dur > 0 && heroSnap.t >= heroSnap.dur * 0.9, 'CH1 hero: scrub reaches video end at pin end', 't=' + (heroSnap && heroSnap.t) + 's / dur=' + (heroSnap && heroSnap.dur) + 's');
  /* ---- 2. ARRIVAL: preloaded + scrubbing ---- */
  const arrTop = await evaljs('(function(){var el=document.getElementById("arrival");return Math.round(el.getBoundingClientRect().top+scrollY);})()');
  const arrPre = (await evaljs(SNAP)).find((v) => v.clip === 'arrival');
  line(!!arrPre && arrPre.rs >= 2 && arrPre.src.indexOf('02-arrival') > -1, 'CH2 arrival: clip 02 preloaded ahead of its pin', JSON.stringify(arrPre));
  await evaljs('window.scrollTo(0,' + (arrTop + Math.round(1.8 * vh)) + ')');
  await sleep(1300);
  const arrMid = (await evaljs(SNAP)).find((v) => v.clip === 'arrival');
  line(!!arrMid && arrMid.t > 2 && arrMid.live, 'CH2 arrival: scrub mid-video + visible', 't=' + (arrMid && arrMid.t) + 's live=' + (arrMid && arrMid.live));

  /* ---- 3. DURBAR: loop must PLAY and ADVANCE ---- */
  const durTop = await evaljs('(function(){var el=document.getElementById("durbar");return Math.round(el.getBoundingClientRect().top+scrollY);})()');
  await evaljs('window.scrollTo(0,' + (durTop + Math.round(0.4 * vh)) + ')');
  await sleep(2200);
  const d1 = (await evaljs(SNAP)).find((v) => v.clip === 'durbar');
  await sleep(1100);
  const d2 = (await evaljs(SNAP)).find((v) => v.clip === 'durbar');
  line(!!d1 && d1.rs >= 2 && d1.src.indexOf('03-durbar') > -1, 'CH3 durbar: clip 03 loaded', JSON.stringify(d1));
  line(!!d2 && d2.paused === false, 'CH3 durbar: loop PLAYING');
  line(!!d2 && d2.t > d1.t, 'CH3 durbar: time advancing', d1.t + 's -> ' + d2.t + 's');

  /* ---- 4. SUITE: loop under the pin + cards fully visible ---- */
  const suiteStart = await evaljs('(function(){var el=document.getElementById("suite");return Math.round(el.getBoundingClientRect().top+scrollY);})()');
  await evaljs('window.scrollTo(0,' + (suiteStart + Math.round(0.5 * vh)) + ')');
  await sleep(2200);
  const s1 = (await evaljs(SNAP)).find((v) => v.clip === 'suite');
  await sleep(1100);
  const s2 = (await evaljs(SNAP)).find((v) => v.clip === 'suite');
  line(!!s1 && s1.rs >= 2 && s1.src.indexOf('04-royal') > -1, 'CH4 suite: clip 04 loaded under pin', JSON.stringify(s1));
  line(!!s2 && s2.paused === false, 'CH4 suite: loop PLAYING under pin');
  line(!!s2 && s2.t > s1.t, 'CH4 suite: time advancing', s1.t + 's -> ' + s2.t + 's');
  const cardState = await evaljs('(function(){return Array.prototype.map.call(document.querySelectorAll(".suite-card"),function(c){return getComputedStyle(c).opacity;}).join(",");})()');
  const cardsOk = cardState.split(',').length === 3 && cardState.split(',').every((o) => parseFloat(o) > 0.95);
  line(cardsOk, 'CH4 suite: all 3 cards fully visible mid-pin', 'opacities: ' + cardState);

  /* ---- 5. GARDENS: loop + arch clip-path ---- */
  const gStart = await evaljs('(function(){var el=document.getElementById("gardens");return Math.round(el.getBoundingClientRect().top+scrollY);})()');
  await evaljs('window.scrollTo(0,' + (gStart + Math.round(0.3 * vh)) + ')');
  await sleep(2200);
  const g1 = (await evaljs(SNAP)).find((v) => v.clip === 'gardens');
  await sleep(1100);
  const g2 = (await evaljs(SNAP)).find((v) => v.clip === 'gardens');
  const clipAt = (await evaljs('(document.getElementById("archReveal").style.clipPath||"").slice(0,50)')) || '';
  line(!!g1 && g1.rs >= 2 && g1.src.indexOf('05-pool') > -1, 'CH5 gardens: clip 05 loaded', JSON.stringify(g1));
  line(!!g2 && g2.paused === false, 'CH5 gardens: loop PLAYING');
  line(!!g2 && g2.t > g1.t, 'CH5 gardens: time advancing', g1.t + 's -> ' + g2.t + 's');
  line(clipAt.indexOf('path') > -1, 'CH5 gardens: cusped-arch clip-path applied', clipAt);

  /* ---- 6. FINALE: scrub ---- */
  const fStart = await evaljs('(function(){var el=document.getElementById("finale");return Math.round(el.getBoundingClientRect().top+scrollY);})()');
  await evaljs('window.scrollTo(0,' + (fStart + Math.round(2.5 * vh)) + ')');
  await sleep(1500);
  /* same readyState poll as CH1 — a fresh seek into an unbuffered range dips rs to 1 */
  let fin = (await evaljs(SNAP)).find((v) => v.clip === 'finale');
  for (let i = 0; i < 20 && fin && fin.rs < 2; i++) {
    await sleep(400);
    fin = (await evaljs(SNAP)).find((v) => v.clip === 'finale');
  }
  line(!!fin && fin.rs >= 2 && fin.src.indexOf('06-night') > -1, 'CH6 finale: clip 06 loaded', JSON.stringify(fin));
  line(!!fin && fin.t > 2, 'CH6 finale: scrub mid-video', 't=' + (fin && fin.t) + 's');

  /* ---- 7. page errors ---- */
  const realErrors = pageErrors.filter((e) => e.indexOf('[Rajmahal] asset missing') === -1);
  line(realErrors.length === 0, 'no page errors / exceptions', realErrors.join(' | ').slice(0, 300) || 'clean');

  console.log('');
  console.log('===== DEEP TEST REPORT =====');
  report.forEach((r) => console.log(r));
  const fails = report.filter((r) => r.indexOf('FAIL') === 0).length;
  console.log('===== ' + (report.length - fails) + ' passed, ' + fails + ' failed =====');

  try { ws.close(); } catch (e) {}
  try { browser.kill(); } catch (e) {}
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error('TEST CRASH: ' + e.message); process.exit(2); });
