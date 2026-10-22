/* ==========================================================================
   PLAYWRIGHT TEST — real browser, real scrolling, screenshots + video states
   Run:   node scripts\pw-test.js
   Out:   pw-report.txt  +  test-screens\*.png
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SITE = 'http://127.0.0.1:8000/';
const OUT = path.join(__dirname, '..', 'test-screens');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const report = [];
const errors = [];
let page;

function line(ok, label, detail) {
  report.push((ok ? 'PASS' : 'FAIL') + '  ' + label + (detail ? '  |  ' + detail : ''));
  console.log(report[report.length - 1]);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function snapVideos() {
  return page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('video'), (v) => ({
    clip: (v.closest('section') || { id: '?' }).id,
    src: (v.currentSrc || '').split('/').pop(),
    rs: v.readyState,
    t: Math.round(v.currentTime * 100) / 100,
    dur: isFinite(v.duration) ? Math.round(v.duration * 100) / 100 : -1,
    paused: v.paused,
    live: v.classList.contains('is-live')
  })));
}
const find = (arr, id) => arr.find((v) => v.clip === id) || null;

async function docTop(id) {
  return page.evaluate((sel) => Math.round(document.querySelector(sel).getBoundingClientRect().top + window.scrollY), '#' + id);
}
async function scrollTo(y) { await page.evaluate((yy) => window.scrollTo(0, yy), Math.max(0, Math.round(y))); }

async function main() {
  let browser = null;
  const channels = ['msedge', 'chrome', ''];
  for (const ch of channels) {
    try {
      browser = await chromium.launch({ channel: ch || undefined, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
      console.log('browser channel: ' + (ch || 'bundled-chromium'));
      break;
    } catch (e) { console.log('channel "' + (ch || 'bundled') + '" failed: ' + String(e.message).split('\n')[0]); }
  }
  if (!browser) throw new Error('no chromium-based browser available');

  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto(SITE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'), null, { timeout: 15000 })
    .then(() => line(true, 'page loaded, preloader finished'))
    .catch(() => line(false, 'preloader finished (body.is-ready)', 'timed out waiting'));
  await sleep(800);

  const vh = await page.evaluate(() => innerHeight);
  console.log('viewport height: ' + vh);

  /* 1 - HERO: wheel-scroll like a user through the whole 380vh pin */
  for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, Math.round((3.9 * vh) / 14)); await sleep(120); }
  await sleep(1600);
  await scrollTo(3.8 * vh);
  await sleep(1500);
  const h = find(await snapVideos(), 'hero');
  line(!!h && h.src.indexOf('01-hero-aerial') > -1 && h.rs >= 2, 'CH1 hero: clip 01 loaded + decodable', JSON.stringify(h));
  line(!!h && h.dur > 0 && h.t >= h.dur * 0.9, 'CH1 hero: scrub reaches video end', 't=' + (h && h.t) + 's / dur=' + (h && h.dur) + 's');
  await page.screenshot({ path: path.join(OUT, 'ch1-hero-end.png') });

  /* 2 - ARRIVAL: preloaded + mid-pin scrub */
  const arrPre = find(await snapVideos(), 'arrival');
  line(!!arrPre && arrPre.rs >= 2 && arrPre.src.indexOf('02-arrival') > -1, 'CH2 arrival: clip 02 preloaded ahead of pin', JSON.stringify(arrPre));
  const arrTop = await docTop('arrival');
  await scrollTo(arrTop + 1.8 * vh);
  await sleep(1400);
  const arrMid = find(await snapVideos(), 'arrival');
  line(!!arrMid && arrMid.t > 2 && arrMid.live, 'CH2 arrival: scrub mid-video + visible', 't=' + (arrMid && arrMid.t) + 's live=' + (arrMid && arrMid.live));
  await page.screenshot({ path: path.join(OUT, 'ch2-arrival-mid.png') });
  /* 3 - DURBAR: loop plays */
  const durTop = await docTop('durbar');
  await scrollTo(durTop + 0.4 * vh);
  await sleep(2500);
  const d1 = find(await snapVideos(), 'durbar');
  await sleep(1100);
  const d2 = find(await snapVideos(), 'durbar');
  line(!!d1 && d1.rs >= 2 && d1.src.indexOf('03-durbar') > -1, 'CH3 durbar: clip 03 loaded', JSON.stringify(d1));
  line(!!d2 && d2.paused === false, 'CH3 durbar: loop PLAYING');
  line(!!d2 && d2.t > d1.t, 'CH3 durbar: time advancing', d1.t + 's -> ' + d2.t + 's');
  await page.screenshot({ path: path.join(OUT, 'ch3-durbar.png') });

  /* 4 - SUITE: loop under pin + cards */
  const suiteTop = await docTop('suite');
  await scrollTo(suiteTop + 0.5 * vh);
  await sleep(2500);
  const s1 = find(await snapVideos(), 'suite');
  await sleep(1100);
  const s2 = find(await snapVideos(), 'suite');
  line(!!s1 && s1.rs >= 2 && s1.src.indexOf('04-royal') > -1, 'CH4 suite: clip 04 loaded under pin', JSON.stringify(s1));
  line(!!s2 && s2.paused === false, 'CH4 suite: loop PLAYING under pin');
  line(!!s2 && s2.t > s1.t, 'CH4 suite: time advancing', s1.t + 's -> ' + s2.t + 's');
  const cards = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.suite-card'), (c) => getComputedStyle(c).opacity).join(','));
  line(cards.split(',').length === 3 && cards.split(',').every((o) => parseFloat(o) > 0.95), 'CH4 suite: 3 cards fully visible mid-pin', 'opacities ' + cards);
  await page.screenshot({ path: path.join(OUT, 'ch4-suite-mid.png') });
  /* fast-scroll resilience: jump deep into the pin, cards must be visible */
  await scrollTo(suiteTop + 2.2 * vh);
  await sleep(600);
  const cardsFast = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.suite-card'), (c) => getComputedStyle(c).opacity).join(','));
  line(cardsFast.split(',').every((o) => parseFloat(o) > 0.95), 'CH4 suite: cards visible after FAST scroll', 'opacities ' + cardsFast);
  await page.screenshot({ path: path.join(OUT, 'ch4-suite-fast.png') });

  /* 5 - GARDENS: arch + loop */
  const gTop = await docTop('gardens');
  await scrollTo(gTop + 0.3 * vh);
  await sleep(2500);
  const g1 = find(await snapVideos(), 'gardens');
  await sleep(1100);
  const g2 = find(await snapVideos(), 'gardens');
  line(!!g1 && g1.rs >= 2 && g1.src.indexOf('05-pool') > -1, 'CH5 gardens: clip 05 loaded', JSON.stringify(g1));
  line(!!g2 && g2.paused === false, 'CH5 gardens: loop PLAYING');
  line(!!g2 && g2.t > g1.t, 'CH5 gardens: time advancing', g1.t + 's -> ' + g2.t + 's');
  const clipMid = await page.evaluate(() => (document.getElementById('archReveal').style.clipPath || '').slice(0, 40));
  line(clipMid.indexOf('path') > -1, 'CH5 gardens: arch clip-path applied', clipMid);
  await page.screenshot({ path: path.join(OUT, 'ch5-gardens-arch.png') });

  /* 6 - FINALE: scrub */
  const fTop = await docTop('finale');
  await scrollTo(fTop + 2.5 * vh);
  await sleep(1600);
  const fin = find(await snapVideos(), 'finale');
  line(!!fin && fin.rs >= 2 && fin.src.indexOf('06-night') > -1, 'CH6 finale: clip 06 loaded', JSON.stringify(fin));
  line(!!fin && fin.t > 2, 'CH6 finale: scrub mid-video', 't=' + (fin && fin.t) + 's');
  await page.screenshot({ path: path.join(OUT, 'ch6-finale.png') });

  /* 7 - FOOTER: ivory flip */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1800);
  const ivory = await page.evaluate(() => document.body.classList.contains('theme-ivory'));
  line(ivory, 'FOOTER: ivory theme flip active');
  await page.screenshot({ path: path.join(OUT, 'ch7-footer.png') });

  /* errors */
  const realErrors = errors.filter((e) => e.indexOf('asset missing') === -1);
  line(realErrors.length === 0, 'no console/page errors', realErrors.slice(0, 3).join(' | ') || 'clean');

  const fails = report.filter((r) => r.startsWith('FAIL')).length;
  const passed = report.length - fails;
  report.push('', '===== ' + passed + ' passed, ' + fails + ' failed =====');
  fs.writeFileSync(path.join(__dirname, '..', 'pw-report.txt'), report.join('\n'));
  console.log('\n' + report.join('\n'));
  await browser.close();
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error('PW TEST CRASH: ' + e.message);
  try { fs.writeFileSync(path.join(__dirname, '..', 'pw-report.txt'), 'CRASH: ' + e.message + '\n' + report.join('\n')); } catch (x) {}
  process.exit(2);
});
