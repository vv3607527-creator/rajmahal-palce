/* Loop-video state probe - node scripts\pw-probe3.js */
'use strict';
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 160)));
  page.on('pageerror', (e) => logs.push('pageerror: ' + String(e && e.message).slice(0, 160)));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load', timeout: 40000 });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'), null, { timeout: 25000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));

  /* instrument: capture stacks when gardens video loads/plays */
  await page.evaluate(() => {
    window.__gLoad = '(none)';
    window.__gPlay = '(none)';
    const gv = document.querySelector('#gardens video');
    gv.addEventListener('loadstart', function () { if (window.__gLoad === '(none)') window.__gLoad = new Error('loadstart').stack; }, true);
    gv.addEventListener('play', function () { if (window.__gPlay === '(none)') window.__gPlay = new Error('play').stack; }, true);
    gv.addEventListener('loadeddata', function () { if (window.__gLoad === '(none)') window.__gLoad = 'loadeddata-no-loadstart'; }, true);
  });

  const dump = (label) => page.evaluate((lbl) => {
    const geo = {};
    window.ScrollTrigger.getAll().forEach((st) => {
      const id = st.trigger && st.trigger.id;
      if (id && st.pin && !geo[id]) geo[id] = { start: st.start, end: st.end };
    });
    const out = { label: lbl, scrollY: Math.round(scrollY), suite: {}, gardens: {} };
    ['suite', 'gardens'].forEach((id) => {
      const v = document.querySelector('#' + id + ' video');
      if (!v) { out[id] = { missing: true }; return; }
      out[id] = {
        paused: v.paused, t: Math.round(v.currentTime * 100) / 100, dur: Math.round((v.duration || -1) * 100) / 100,
        rs: v.readyState, net: v.networkState, src: (v.currentSrc || '').split('/').pop(),
        loaded: v.dataset.loaded || '', failed: v.dataset.failed || '', shouldPlay: v.dataset.shouldPlay || '',
        err: v.error ? (v.error.code + '/' + v.error.message) : 'null'
      };
    });
    return out;
  }, label);

  const geo = await page.evaluate(() => {
    const g = {};
    window.ScrollTrigger.getAll().forEach((st) => {
      const id = st.trigger && st.trigger.id;
      if (id && st.pin && !g[id]) g[id] = { start: st.start, end: st.end };
    });
    return g;
  });

  await page.evaluate((y) => window.scrollTo(0, y), Math.round(geo.suite.start + (geo.suite.end - geo.suite.start) * 0.5));
  await new Promise((r) => setTimeout(r, 400));
  console.log(JSON.stringify(await dump('suite-mid+400ms'), null, 1));
  await new Promise((r) => setTimeout(r, 1600));
  console.log(JSON.stringify(await dump('suite-mid+2000ms'), null, 1));

  await page.evaluate((y) => window.scrollTo(0, y), Math.round(geo.gardens.start + (geo.gardens.end - geo.gardens.start) * 0.5));
  await new Promise((r) => setTimeout(r, 400));
  console.log(JSON.stringify(await dump('gardens-mid+400ms'), null, 1));
  await new Promise((r) => setTimeout(r, 1600));
  console.log(JSON.stringify(await dump('gardens-mid+2000ms'), null, 1));
  const stacks = await page.evaluate(() => ({ load: window.__gLoad, play: window.__gPlay }));
  console.log('--- gardens loadstart stack ---');
  console.log(stacks.load);
  console.log('--- gardens play stack ---');
  console.log(stacks.play);
  console.log('--- console capture ---');
  logs.slice(0, 12).forEach((l) => console.log(l));
  await browser.close();
}
main().catch((e) => { console.error('CRASH: ' + e.message); process.exit(2); });
