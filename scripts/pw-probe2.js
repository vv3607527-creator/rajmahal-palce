/* Hero text-timeline probe - node scripts\pw-probe2.js */
'use strict';
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const warns = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warns.push(m.type() + ': ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'), null, { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => window.scrollTo(0, 3420));
  await new Promise((r) => setTimeout(r, 120));
  const early = await page.evaluate(() => ({
    t: performance.now(),
    cueInline: (document.querySelector('#scrollCue').style.cssText || '(none)').slice(0, 100),
    cueComputed: getComputedStyle(document.querySelector('#scrollCue')).opacity,
    cueCount: document.querySelectorAll('#scrollCue').length,
    cueTweens: gsap.getTweensOf(document.querySelector('#scrollCue')).map(function (t) {
      return { prog: Math.round(t.progress() * 100) / 100, dur: Math.round(t.duration() * 100) / 100, realTargets: t.targets().length, autoAlphaTo: (t.vars.autoAlpha !== undefined ? t.vars.autoAlpha : t.vars.opacity) };
    })
  }));
  console.log('EARLY(+120ms): ' + JSON.stringify(early));
  await new Promise((r) => setTimeout(r, 1400));
  const late = await page.evaluate(() => ({
    t: performance.now(),
    cueInline: (document.querySelector('#scrollCue').style.cssText || '(none)').slice(0, 100),
    cueComputed: getComputedStyle(document.querySelector('#scrollCue')).opacity,
    cueTweens: gsap.getTweensOf(document.querySelector('#scrollCue')).map(function (t) {
      return { prog: Math.round(t.progress() * 100) / 100, dur: Math.round(t.duration() * 100) / 100, realTargets: t.targets().length, autoAlphaTo: (t.vars.autoAlpha !== undefined ? t.vars.autoAlpha : t.vars.opacity) };
    }),
    globalChildren: gsap.globalTimeline.getChildren(true, true, true).length
  }));
  console.log('LATE(+1520ms): ' + JSON.stringify(late));
  await page.screenshot({ path: 'probe2-hero-end.png' });

  const out = await page.evaluate(() => {
    const res = { scrollY: Math.round(scrollY), st: [], styles: {}, heroVideoT: 0 };
    window.ScrollTrigger.getAll().forEach((st) => {
      const id = st.trigger && (st.trigger.id || st.trigger.className || '?');
      if (id === 'hero' || (st.animation && String(st.animation.targets ? '' : ''))) {
        res.st.push({ trig: String(id), start: Math.round(st.start), end: Math.round(st.end), pin: !!st.pin, stProg: Math.round(st.progress * 1000) / 1000, animDur: st.animation ? Math.round(st.animation.duration() * 1000) / 1000 : null, animProg: st.animation ? Math.round(st.animation.progress() * 1000) / 1000 : null });
      }
    });
    const g = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).opacity : 'MISSING'; };
    res.styles = { eyebrow: g('#hero .hero__eyebrow'), title: g('#hero .hero__title'), cue: g('#scrollCue'), line2: g('#heroLine2'), wordInnerCount: document.querySelectorAll('#hero .hero__title .word__inner').length };
    const hv = document.querySelector('#hero video');
    res.heroVideoT = hv ? Math.round(hv.currentTime * 100) / 100 : -1;
    /* live tween introspection on #scrollCue + first title word */
    try {
      res.cueTweens = gsap.getTweensOf('#scrollCue').map(function (t) {
        return { inParent: !!(t.parent && t.parent.parent), prog: Math.round(t.progress() * 100) / 100, time: Math.round(t.time() * 100) / 100, dur: Math.round(t.duration() * 100) / 100, paused: t.paused(), autoAlphaTo: (t.vars.autoAlpha !== undefined ? t.vars.autoAlpha : t.vars.opacity), targets: t.targets ? t.targets.length : -1 };
      });
      var w = document.querySelector('#hero .hero__title .word__inner');
      if (w) { var tr = getComputedStyle(w).transform; res.word0Transform = tr === 'none' ? 'none' : tr.slice(0, 60); }
      var cueEl = document.querySelector('#scrollCue');
      res.cueInline = cueEl ? (cueEl.style.cssText || '(none)').slice(0, 120) : 'MISSING';
    } catch (e) { res.probeErr = e.message; }
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  console.log('--- gsap warnings ---');
  warns.slice(0, 10).forEach((w) => console.log(w));
  await browser.close();
}
main().catch((e) => { console.error('CRASH: ' + e.message); process.exit(2); });
