/* Layout / pin / Lenis probe - run: node scripts\pw-probe.js */
'use strict';
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'), null, { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));

  const snap = () => page.evaluate(() => {
    const out = { scrollHeight: document.body.scrollHeight, scrollY: Math.round(scrollY), sections: [], triggers: [], videos: [], lenis: null };
    document.querySelectorAll('main section[id]').forEach((s) => {
      const r = s.getBoundingClientRect();
      out.sections.push({ id: s.id, top: Math.round(r.top + scrollY), h: Math.round(r.height), dataScrub: s.dataset.scrub || '' });
    });
    if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((st) => out.triggers.push({ trig: (st.trigger && st.trigger.id) || '?', start: Math.round(st.start), end: Math.round(st.end), pinned: !!st.pin, progress: Math.round(st.progress * 100) / 100 }));
    document.querySelectorAll('video').forEach((v) => out.videos.push({ id: (v.closest('section') || {}).id, preload: v.preload, net: v.networkState, rs: v.readyState, srcSet: !!v.getAttribute('src'), cur: (v.currentSrc || '').split('/').pop() }));
    if (window.lenis) out.lenis = { target: Math.round(window.lenis.targetScroll), anim: Math.round(window.lenis.animatedScroll), actual: Math.round(window.lenis.actualScroll) };
    return out;
  });

  console.log('=== AT TOP ===');
  console.log(JSON.stringify(await snap(), null, 1));

  /* native jump test: does Lenis keep it? */
  await page.evaluate(() => window.scrollTo(0, 3000));
  await new Promise((r) => setTimeout(r, 600));
  const after600 = await page.evaluate(() => Math.round(scrollY));
  await new Promise((r) => setTimeout(r, 900));
  const after1500 = await page.evaluate(() => Math.round(scrollY));
  console.log('jump to 3000 -> after600ms: ' + after600 + ' | after1500ms: ' + after1500);

  console.log('=== AFTER JUMP 3000 ===');
  console.log(JSON.stringify(await snap(), null, 1));
  await browser.close();
}
main().catch((e) => { console.error('PROBE CRASH: ' + e.message); process.exit(2); });
