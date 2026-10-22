/* ==========================================================================
   THE RAJMAHAL PALACE — full Playwright E2E suite (run: node scripts\playwright-test.js)
   Output: playwright-report.txt  ·  headless Edge (channel msedge, no download)
   ========================================================================== */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');

const URL = 'http://127.0.0.1:8000/';
const results = [];
const consoleIssues = [];
let passCount = 0, failCount = 0;

function report(name, ok, detail) {
  results.push((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
  if (ok) passCount++; else failCount++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({
    channel: 'msedge', headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--disable-features=CalculateNativeWinOcclusion']
  });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleIssues.push(m.type() + ': ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleIssues.push('pageerror: ' + String(e && e.message).slice(0, 200)));

  /* ---------- load ---------- */
  await page.goto(URL, { waitUntil: 'load', timeout: 40000 });
  const ready = await page.waitForFunction(() => document.body.classList.contains('is-ready'), null, { timeout: 25000 }).then(() => true).catch(() => false);
  report('preloader completes → body.is-ready', ready);
  await sleep(600);

  /* ---------- structure: 6 videos with roles ---------- */
  const vids = await page.evaluate(() => Array.from(document.querySelectorAll('video[data-src], video[src]')).map((v) => ({
    section: (v.closest('section') || { id: '?' }).id, role: v.dataset.clipRole || '', src: v.getAttribute('src') || v.dataset.src || ''
  })));
  report('6 chapter videos present', vids.length === 6, JSON.stringify(vids.map((v) => v.section + ':' + v.role)));
  const scrubIds = vids.filter((v) => v.role === 'scrub').map((v) => v.section);
  const loopIds = vids.filter((v) => v.role === 'loop').map((v) => v.section);
  report('3 scrub clips (hero/arrival/finale)', scrubIds.length === 3 && scrubIds.indexOf('hero') > -1 && scrubIds.indexOf('arrival') > -1 && scrubIds.indexOf('finale') > -1, scrubIds.join(','));
  report('3 loop clips (durbar/suite/gardens)', loopIds.length === 3, loopIds.join(','));

  /* ---------- pin geometry per chapter ---------- */
  const geo = await page.evaluate(() => {
    const map = {};
    window.ScrollTrigger.getAll().forEach((st) => {
      const id = st.trigger && st.trigger.id;
      if (id && st.pin && !map[id]) map[id] = { start: st.start, end: st.end };
    });
    return map;
  });
  const hero = geo.hero, arrival = geo.arrival, suite = geo.suite, gardens = geo.gardens, finale = geo.finale;
  report('pin geometry sane (5 pinned chapters)', !!(hero && arrival && suite && gardens && finale) &&
    [hero, arrival, suite, gardens, finale].every((g) => g.end > g.start + 1000),
    'hero:' + (hero && Math.round(hero.end - hero.start)) + ' arrival:' + (arrival && Math.round(arrival.end - arrival.start)) +
    ' suite:' + (suite && Math.round(suite.end - suite.start)) + ' gardens:' + (gardens && Math.round(gardens.end - gardens.start)) +
    ' finale:' + (finale && Math.round(finale.end - finale.start)));

  /* ---------- helper: wait until a video is actually usable ---------- */
  async function waitVideo(sectionId, predicate, timeout, what) {
    const ok = await page.waitForFunction((arg) => {
      const v = document.querySelector('#' + arg.id + ' video');
      if (!v) return false;
      try { return new Function('v', 'return (' + arg.pred + ');')(v); } catch (e) { return false; }
    }, { id: sectionId, pred: predicate }, { timeout: timeout, polling: 200 }).then(() => true).catch(() => false);
    if (!ok) report('video ready: ' + sectionId + ' (' + what + ')', false, 'timed out after ' + timeout + 'ms');
    return ok;
  }


  /* ================= CHAPTER 1 · HERO (scrub) ================= */
  await waitVideo('hero', 'v.readyState >= 2', 30000, 'canplay');
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(hero.start + (hero.end - hero.start) * 0.5));
  await sleep(500);
  const heroMid = await page.evaluate(() => {
    const v = document.querySelector('#hero video');
    return {
      t: v ? v.currentTime : -1, dur: v ? v.duration : -1,
      eyebrow: getComputedStyle(document.querySelector('#hero .hero__eyebrow')).opacity,
      cue: getComputedStyle(document.querySelector('#scrollCue')).opacity,
      line2: getComputedStyle(document.querySelector('#heroLine2')).opacity,
      line2Vis: getComputedStyle(document.querySelector('#heroLine2')).visibility
    };
  });
  report('hero: video scrubbing mid-pin (t > 1s)', heroMid.t > 1, 't=' + heroMid.t.toFixed(2) + 's / ' + heroMid.dur.toFixed(1) + 's');
  report('hero: intro text exits by mid-pin (eyebrow 0)', heroMid.eyebrow < 0.05, 'opacity=' + heroMid.eyebrow);
  report('hero: scroll cue hidden by mid-pin', heroMid.cue < 0.05, 'opacity=' + heroMid.cue);
  report('hero: line2 revealed mid-pin', parseFloat(heroMid.line2) > 0.9 && heroMid.line2Vis !== 'hidden', 'opacity=' + heroMid.line2);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(hero.end - 2));
  const heroSettled = await waitVideo('hero', 'v.duration > 0 && v.currentTime >= v.duration * 0.85', 9000, 'scrub reaches ~duration');
  const heroEnd = await page.evaluate(() => {
    const v = document.querySelector('#hero video');
    return { t: v.currentTime, dur: v.duration };
  });
  report('hero: clip reaches ~duration at pin end', heroSettled && heroEnd.t >= heroEnd.dur * 0.85, 't=' + heroEnd.t.toFixed(2) + ' / ' + heroEnd.dur.toFixed(2) + 's');

  /* ================= CHAPTER 2 · ARRIVAL (scrub) ================= */
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(arrival.start + 200));
  await sleep(300);
  await waitVideo('arrival', 'v.readyState >= 2', 30000, 'canplay (preload=none)');
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(arrival.start + (arrival.end - arrival.start) * 0.75));
  await sleep(700);
  const arrivalMid = await page.evaluate(() => {
    const v = document.querySelector('#arrival video');
    const words = Array.from(document.querySelectorAll('#arrival .arrival__title .word__inner'));
    return {
      t: v ? v.currentTime : -1, dur: v ? v.duration : -1,
      wordsVisible: words.length > 0 && words.every((w) => parseFloat(getComputedStyle(w).opacity) > 0.9),
      whisper: getComputedStyle(document.querySelector('#arrivalWhisper')).opacity,
      numeral: document.querySelector('#chapterNum') ? document.querySelector('#chapterNum').textContent : '?'
    };
  });
  report('arrival: video scrubbing mid-pin', arrivalMid.t > 0.5, 't=' + arrivalMid.t.toFixed(2) + 's / ' + arrivalMid.dur.toFixed(1) + 's');
  report('arrival: split-title words revealed', arrivalMid.wordsVisible);
  report('arrival: whisper line revealed (by 75% pin)', parseFloat(arrivalMid.whisper) > 0.9, 'opacity=' + arrivalMid.whisper);
  report('arrival: chapter numeral flipped to 02', arrivalMid.numeral === '02', 'shows "' + arrivalMid.numeral + '"');
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(arrival.end - 2));
  const arrivalSettled = await waitVideo('arrival', 'v.duration > 0 && v.currentTime >= v.duration * 0.85', 9000, 'scrub reaches ~duration');
  const arrivalEnd = await page.evaluate(() => { const v = document.querySelector('#arrival video'); return { t: v.currentTime, dur: v.duration }; });
  report('arrival: clip reaches ~duration at pin end', arrivalSettled && arrivalEnd.t >= arrivalEnd.dur * 0.85, 't=' + arrivalEnd.t.toFixed(2) + ' / ' + arrivalEnd.dur.toFixed(2) + 's');

  /* ================= CHAPTER 3 · DURBAR (unpinned loop) ================= */
  const durbarTop = await page.evaluate(() => { const el = document.querySelector('#durbar'); return Math.round(el.getBoundingClientRect().top + window.scrollY); });
  await page.evaluate((y) => window.scrollTo(0, y), durbarTop - 200);
  await sleep(400);
  await waitVideo('durbar', 'v.readyState >= 2', 30000, 'canplay (IO lazy)');
  await page.evaluate((y) => window.scrollTo(0, y), durbarTop + 100);
  await sleep(900);
  const durbarState = await page.evaluate(() => {
    const v = document.querySelector('#durbar video');
    return { playing: !!(v && !v.paused && !v.ended), t: v ? v.currentTime : -1 };
  });
  report('durbar: loop autoplays in view', durbarState.playing && durbarState.t > 0.1, 'playing=' + durbarState.playing + ' t=' + durbarState.t.toFixed(2));
  const durbarStats = await page.evaluate(() => Array.from(document.querySelectorAll('#durbar .stat__num')).map((el) => el.textContent));
  report('durbar: counters fired (non-zero)', durbarStats.length > 0 && durbarStats.some((s) => parseInt(s, 10) > 0), durbarStats.join('/'));

  /* ================= CHAPTER 4 · SUITE (pinned loop + track) ================= */
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(suite.start + (suite.end - suite.start) * 0.5));
  await sleep(1600);
  const suiteMid = await page.evaluate(() => {
    const v = document.querySelector('#suite video');
    const cards = Array.from(document.querySelectorAll('.suite-card'));
    const track = document.querySelector('#suiteTrack');
    return {
      playing: !!(v && !v.paused && !v.ended), t: v ? v.currentTime : -1,
      cardOps: cards.map((c) => Math.round(parseFloat(getComputedStyle(c).opacity) * 100) / 100),
      trackX: track ? getComputedStyle(track).transform : 'none'
    };
  });
  report('suite: loop plays while pinned', suiteMid.playing && suiteMid.t > 0.1, 'playing=' + suiteMid.playing + ' t=' + suiteMid.t.toFixed(2));
  report('suite: all cards revealed (opacity >= .95)', suiteMid.cardOps.length > 0 && suiteMid.cardOps.every((o) => o >= 0.95), suiteMid.cardOps.join(','));
  report('suite: horizontal track translated', suiteMid.trackX !== 'none' && suiteMid.trackX !== 'matrix(1, 0, 0, 1, 0, 0)', suiteMid.trackX.slice(0, 44));

  /* ================= CHAPTER 5 · GARDENS (pinned loop + arch) ================= */
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(gardens.start + (gardens.end - gardens.start) * 0.5));
  await sleep(1600);
  const gardensMid = await page.evaluate(() => {
    const v = document.querySelector('#gardens video');
    const reveal = document.querySelector('#archReveal');
    return {
      playing: !!(v && !v.paused && !v.ended), t: v ? v.currentTime : -1,
      clip: reveal ? (reveal.style.clipPath || getComputedStyle(reveal).clipPath) : 'MISSING',
      outline: document.querySelector('#archOutline') ? getComputedStyle(document.querySelector('#archOutline')).opacity : '?'
    };
  });
  report('gardens: loop plays while pinned', gardensMid.playing && gardensMid.t > 0.1, 'playing=' + gardensMid.playing + ' t=' + gardensMid.t.toFixed(2));
  report('gardens: cusped-arch clip-path applied mid-pin', gardensMid.clip.indexOf('path(') > -1, gardensMid.clip.slice(0, 60));
  report('gardens: arch outline visible mid-pin', parseFloat(gardensMid.outline) > 0.5, 'opacity=' + gardensMid.outline);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(gardens.end - 2));
  await sleep(700);
  const gardensEnd = await page.evaluate(() => {
    const reveal = document.querySelector('#archReveal');
    const r = reveal.getBoundingClientRect();
    return { full: Math.round(r.width) >= window.innerWidth - 4 && Math.round(r.height) >= window.innerHeight - 4, w: Math.round(r.width), h: Math.round(r.height) };
  });
  report('gardens: arch opens to full-bleed by pin end', gardensEnd.full, gardensEnd.w + 'x' + gardensEnd.h);

  /* ================= CHAPTER 6 · FINALE (scrub + CTA) ================= */
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(finale.start + 200));
  await sleep(300);
  await waitVideo('finale', 'v.readyState >= 2', 30000, 'canplay (preload=none)');
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(finale.start + (finale.end - finale.start) * 0.5));
  await sleep(700);
  const finaleMid = await page.evaluate(() => {
    const v = document.querySelector('#finale video');
    const titleWords = Array.from(document.querySelectorAll('#finale .finale__title .word__inner'));
    return { t: v ? v.currentTime : -1, dur: v ? v.duration : -1, words: titleWords.length > 0 && titleWords.every((w) => parseFloat(getComputedStyle(w).opacity) > 0.9) };
  });
  report('finale: video scrubbing mid-pin', finaleMid.t > 0.5, 't=' + finaleMid.t.toFixed(2) + 's / ' + finaleMid.dur.toFixed(1) + 's');
  report('finale: title words revealed', finaleMid.words);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(finale.end - 2));
  const finaleSettled = await waitVideo('finale', 'v.duration > 0 && v.currentTime >= v.duration * 0.85', 9000, 'scrub reaches ~duration');
  const finaleEnd = await page.evaluate(() => {
    const v = document.querySelector('#finale video');
    const cta = document.querySelector('#finale .finale__cta-wrap');
    return { t: v.currentTime, dur: v.duration, cta: cta ? getComputedStyle(cta).opacity : '?', ctaVis: cta ? getComputedStyle(cta).visibility : '?' };
  });
  report('finale: clip reaches ~duration at pin end', finaleSettled && finaleEnd.t >= finaleEnd.dur * 0.85, 't=' + finaleEnd.t.toFixed(2) + ' / ' + finaleEnd.dur.toFixed(2) + 's');
  report('finale: CTA revealed at pin end', parseFloat(finaleEnd.cta) > 0.9 && finaleEnd.ctaVis !== 'hidden', 'opacity=' + finaleEnd.cta);

  /* ---------- global hygiene ---------- */
  const hygiene = await page.evaluate(() => ({
    hOverflow: document.documentElement.scrollWidth - window.innerWidth,
    chapterNum: document.querySelector('#chapterNum') ? document.querySelector('#chapterNum').textContent : '?'
  }));
  report('no horizontal overflow', hygiene.hOverflow <= 2, 'excess=' + hygiene.hOverflow + 'px');
  report('chapter numeral ends at 06', hygiene.chapterNum === '06', 'shows "' + hygiene.chapterNum + '"');
  const errors = consoleIssues.filter((s) => s.indexOf('error') === 0 || s.indexOf('pageerror') === 0);
  const warnings = consoleIssues.filter((s) => s.indexOf('warning') === 0);
  report('zero console errors / pageerrors', errors.length === 0, errors.slice(0, 5).join(' | ') || 'clean');
  report('zero console warnings', warnings.length === 0, warnings.slice(0, 5).join(' | ') || 'clean');

  /* ---------- footer visible after finale ---------- */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(800);
  const foot = await page.evaluate(() => {
    const f = document.querySelector('#footer') || document.querySelector('footer');
    if (!f) return { found: false, top: -1 };
    return { found: true, top: Math.round(f.getBoundingClientRect().top) };
  });
  report('footer reachable at page end', foot.found && foot.top < 900, foot.found ? 'footer top=' + foot.top + 'px (viewport 900)' : 'no <footer> element');

  /* ---------- summary ---------- */
  const lines = [];
  lines.push('=== RAJMAHAL PALACE · PLAYWRIGHT E2E REPORT ===');
  lines.push('url: ' + URL + '   viewport 1600x900   headless Edge (channel msedge)');
  lines.push('date: ' + new Date().toISOString());
  lines.push('');
  results.forEach((r) => lines.push(r));
  lines.push('');
  lines.push('TOTAL: ' + passCount + ' passed, ' + failCount + ' failed, ' + results.length + ' checks');
  if (consoleIssues.length) { lines.push(''); lines.push('console capture:'); consoleIssues.forEach((c) => lines.push('  ' + c)); }
  lines.push('');
  lines.push('VERDICT: ' + (failCount === 0 ? 'ALL CHECKS PASSED' : failCount + ' FAILURES — SEE ABOVE'));
  fs.writeFileSync('playwright-report.txt', lines.join('\r\n'));
  console.log('WROTE playwright-report.txt');
  await browser.close();
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((e) => {
  const msg = 'CRASH: ' + (e && e.message ? e.message : String(e));
  console.error(msg);
  try { fs.writeFileSync('playwright-report.txt', 'CRASH\n' + msg + '\nPassed ' + passCount + ', failed ' + failCount + ' before crash.'); } catch (e2) {}
  process.exit(2);
});
