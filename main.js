/* ==========================================================================
   THE RAJMAHAL PALACE — main.js
   Vanilla JS · GSAP ScrollTrigger · Lenis · no build step
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp01 = function (v) { return Math.min(1, Math.max(0, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var pad2 = function (n) { return String(n).padStart(2, '0'); };
  var f2 = function (n) { return Math.round(n * 100) / 100; };

  /* ---------------- environment ---------------- */
  var env = {
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    touch: matchMedia('(hover: none), (pointer: coarse)').matches,
    ios: /iP(hone|od|ad)/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    fileProtocol: location.protocol === 'file:'
  };
  /* Scroll-scrubbed video seeking is unreliable on iOS/touch — poster + Ken Burns there */
  env.canScrubVideo = !env.touch && !env.ios && !env.reduced;

  /* ---------------- asset manifest (wired by filename) ---------------- */
  var missing = [];

  function probeImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = src;
    });
  }

  function noteMissing(src) {
    if (src && missing.indexOf(src) === -1) missing.push(src);
    console.warn('[Rajmahal] asset missing: ' + src + ' — using sapphire placeholder');
  }

  function showFallback(media) {
    if (!media) return;
    media.classList.add('is-placeholder');
    var fb = $('.media__fallback', media);
    if (fb) fb.hidden = false;
  }

  function wireMedia() {
    /* videos: swap to placeholder on load error */
    $$('video[data-src]').forEach(function (v) {
      v.addEventListener('error', function () {
        v.dataset.failed = '1';
        noteMissing(v.dataset.src);
        v.style.display = 'none';
        showFallback(v.closest('.media') || v.parentElement);
      }, { once: true });
    });
    /* posters: hide if absent; if the clip is gone too, show fallback */
    $$('.media__poster').forEach(function (img) {
      img.addEventListener('error', function () {
        img.style.display = 'none';
        noteMissing(img.getAttribute('src'));
        var media = img.closest('.media');
        var video = media && $('video', media);
        if (!video || video.dataset.failed) showFallback(media);
      }, { once: true });
    });
    /* loop <video poster> attributes: drop broken ones quietly */
    $$('video[data-poster]').forEach(function (v) {
      probeImage(v.dataset.poster).then(function (ok) {
        if (!ok) { v.removeAttribute('poster'); noteMissing(v.dataset.poster); }
      });
    });
    /* meta fallback: og:image falls back to poster.jpg */
    var og = $('meta[property="og:image"]');
    if (og) probeImage('assets/images/og-image.jpg').then(function (ok) {
      if (!ok) og.setAttribute('content', 'assets/images/poster.jpg');
    });
  }

  function assignSrc(video) {
    if (!video || video.dataset.loaded || video.dataset.failed) return;
    var src = video.dataset.src;
    if (!src) return;
    video.dataset.loaded = '1';
    video.addEventListener('loadeddata', function () {
      video.classList.add('is-live'); /* gentle fade-in over the poster */
      if (video.dataset.shouldPlay === '1') tryPlay(video);
    }, { once: true });
    video.addEventListener('playing', function () {
      video.classList.add('is-live');
    }, { once: true });
    /* HTML uses preload="none" to keep initial page weight down — but the browser
       then fetches nothing until play()/load() is called. Scrubbed clips are never
       played (they are seeked), and pinned loops only play() once data exists —
       a deadlock. Force the fetch the moment a clip is wired. */
    video.preload = 'auto';
    video.src = src;
    try { video.load(); } catch (e) { /* resource selection race — src above still applies */ }
  }

  /* playback that survives the play()-vs-load() race: retry once data is ready.
     dataset.shouldPlay is the single source of truth — a pending play() that was
     paused off (e.g. by a transient toggle during refresh) must NOT resurrect
     itself from the canplay retry after the chapter toggle said "stop". */
  function tryPlay(video) {
    if (!video || video.dataset.failed || !video.dataset.loaded || !video.paused) return;
    var pr = video.play();
    if (pr && pr.catch) {
      pr.catch(function () {
        video.addEventListener('canplay', function () {
          if (video.dataset.shouldPlay === '1' && video.paused) {
            var p2 = video.play();
            if (p2 && p2.catch) p2.catch(function () {});
          }
        }, { once: true });
      });
    }
  }

  function logManifest() {
    console.log('%c\u2748 The Rajmahal Palace — asset manifest', 'color:#C9A96E;font-weight:bold');
    if (missing.length) {
      console.warn('Missing (' + missing.length + '): ' + missing.join(', ') + ' — sections use graceful placeholders.');
    } else {
      console.log('All assets present. Enjoy the descent.');
    }
    if (env.fileProtocol) {
      console.info('Tip: serve the folder for best video scrubbing — `npx serve` or `python -m http.server`.');
    }
  }
  /* ---------------- lenis (buttery inertia scroll) ---------------- */
  var lenis = null;
  function initLenis() {
    if (env.reduced || typeof Lenis === 'undefined' || typeof gsap === 'undefined') return;
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.4
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------- preloader ---------------- */
  function criticalAssetReady() {
    var img = probeImage('assets/images/poster.jpg');
    var vid = new Promise(function (resolve) {
      var v = $('#hero video');
      if (!v) { resolve(true); return; }
      var to = setTimeout(function () { resolve(true); }, 2600);
      v.addEventListener('loadeddata', function () { clearTimeout(to); resolve(true); }, { once: true });
      v.addEventListener('error', function () { clearTimeout(to); resolve(true); }, { once: true });
    });
    return Promise.all([img, vid]);
  }

  function runPreloader() {
    var pre = $('#preloader');
    if (env.reduced || typeof gsap === 'undefined') {
      if (pre) pre.style.display = 'none';
      document.body.classList.add('is-ready');
      return;
    }
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
    var letters = $$('.pl-letter');
    var countEl = $('#plCount');
    var counter = { v: 0 };
    var tick = function () { countEl.textContent = pad2(Math.round(counter.v)); };
    var minWait = new Promise(function (r) { setTimeout(r, 2050); });

    gsap.set(letters, { yPercent: 115 });
    gsap.timeline()
      .to(letters, { yPercent: 0, duration: 0.85, stagger: 0.055, ease: 'expo.out' }, 0.15)
      .fromTo('.preloader__rule i', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, 0.35)
      .fromTo('.preloader__tag', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0.55)
      .to(counter, { v: 96, duration: 1.6, ease: 'power1.inOut', onUpdate: tick }, 0.3);

    Promise.all([minWait, criticalAssetReady()]).then(function () {
      gsap.to(counter, { v: 100, duration: 0.3, ease: 'power1.out', onUpdate: tick });
      gsap.timeline({ delay: 0.15 })
        .to('.preloader__inner', { autoAlpha: 0, y: -26, duration: 0.45, ease: 'power2.in' })
        .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.85, ease: 'power4.inOut' }, '-=0.1')
        .add(function () {
          pre.style.display = 'none';
          document.body.classList.remove('is-locked');
          document.body.classList.add('is-ready');
          if (lenis) lenis.start();
          heroIntro();
          ScrollTrigger.refresh();
        }, '-=0.35');
    });
  }

  var heroIntroTl = null; /* kept so the hero scrub can cancel it if the user scrolls early */
  function heroIntro() {
    heroIntroTl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      .fromTo('#hero .hero__eyebrow > span', { yPercent: 130 }, { yPercent: 0, duration: 0.9 }, 0)
      .fromTo('#hero .hero__title .word__inner', { yPercent: 120 }, { yPercent: 0, duration: 1.15, stagger: 0.07 }, 0.12)
      .fromTo('#scrollCue', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.85);
  }

  /* ---------------- own splitter (masked word reveals) ---------------- */
  function splitWords(el) {
    var text = (el.dataset.originalText || el.textContent).trim().replace(/\s+/g, ' ');
    el.dataset.originalText = text;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var frag = document.createDocumentFragment();
    text.split(' ').forEach(function (word) {
      var outer = document.createElement('span');
      outer.className = 'word';
      outer.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.className = 'word__inner';
      inner.textContent = word;
      outer.appendChild(inner);
      frag.appendChild(outer);
      frag.appendChild(document.createTextNode(' '));
    });
    el.appendChild(frag);
  }
  function splitAll() { $$('[data-split]').forEach(splitWords); }

  /* ---------------- scrub engine (rAF-lerped video seeking) ---------------- */
  var scrubItems = [];

  function registerScrubVideo(video) {
    if (!video || !env.canScrubVideo) return;
    for (var i = 0; i < scrubItems.length; i++) if (scrubItems[i].video === video) return;
    scrubItems.push({ video: video, target: 0, current: -1 });
  }

  function setScrubTarget(video, p) {
    for (var i = 0; i < scrubItems.length; i++) {
      if (scrubItems[i].video === video) { scrubItems[i].target = clamp01(p); return; }
    }
  }

  function installScrubTicker() {
    gsap.ticker.add(function () {
      for (var i = 0; i < scrubItems.length; i++) {
        var v = scrubItems[i].video;
        if (v.dataset.failed) continue;
        if (v.readyState < 2) continue; /* no decodable frame yet — waits, then catches up */
        var d = v.duration;
        if (!isFinite(d) || d <= 0) continue;
        var t = scrubItems[i].target * d;
        if (scrubItems[i].current < 0) scrubItems[i].current = t;
        var diff = t - scrubItems[i].current;
        if (Math.abs(diff) < 0.0025) continue;
        scrubItems[i].current = Math.abs(diff) < 0.02 ? t : scrubItems[i].current + diff * 0.1; /* weighted lerp ≈0.1 */
        try { v.currentTime = Math.min(scrubItems[i].current, d - 0.001); } catch (e) { /* seek race */ }
      }
    });
  }
  /* ---------------- pin factory (locked chapters + gold progress hairline) ---------------- */
  /* ScrollTrigger's end "+=" parses plain numbers (px) — it does NOT understand "380vh".
     Convert data-scrub values to pixels ourselves (recalculated on refresh/resize). */
  function scrubDist(section) {
    var raw = String((section && section.dataset.scrub) || '350vh').trim();
    var n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) n = 350;
    if (raw.indexOf('vh') > -1 || raw.charAt(raw.length - 1) === '%') return (n / 100) * window.innerHeight;
    return n; /* already px */
  }

  function makePin(section, onUpdate, tl) {
    var video = $('video[data-src]', section);
    var fill = $('.progress-rail__fill', section);
    var isLoop = !!(video && video.dataset.clipRole === 'loop');
    var cfg = {
      trigger: section,
      start: 'top top',
      end: function () { return '+=' + scrubDist(section); },
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      /* loop clips inside pinned chapters are driven by THIS trigger — a separate
         ScrollTrigger on the pinned element measures unreliable start/end once pins
         exist (its toggle may never fire mid-pin). isActive here == exactly "pinned". */
      onToggle: function (self) {
        if (!isLoop) return;
        if (self.isActive) {
          video.dataset.shouldPlay = '1';
          if (!video.dataset.loaded && !video.dataset.failed) assignSrc(video);
          tryPlay(video); /* play() also kicks off loading under preload="none" */
        } else {
          video.dataset.shouldPlay = '0';
          if (!video.paused) video.pause();
        }
      },
      onUpdate: function (self) {
        var p = self.progress;
        if (section.dataset.clipRole === 'scrub') setScrubTarget(video, p);
        if (fill) gsap.set(fill, { scaleY: p });
        if (onUpdate) onUpdate(p, self);
      }
    };
    /* The chapter's text timeline rides the SAME trigger (scrubbed animation).
       A separate ScrollTrigger on an already-pinned element gets its start
       pushed past the pin by ScrollTrigger's pinned-element measurement →
       text would only animate AFTER the chapter unpins. One trigger = one geometry. */
    if (tl) { cfg.animation = tl; cfg.scrub = true; }
    var st = ScrollTrigger.create(cfg);
    if (section.dataset.clipRole === 'scrub') registerScrubVideo(video);
    return st;
  }

  /* Text timeline WITHOUT its own scrollTrigger — attach via makePin(section, fn, tl).
     overwrite:'auto' → if the user scrolls during heroIntro, these tweens evict the
     intro's active tweens on shared targets (.word__inner, #scrollCue) on first render. */
  function scrubTl() {
    return gsap.timeline({ defaults: { ease: 'none', overwrite: 'auto' } });
  }

  function applyKenBurns(section) {
    var poster = $('.media__poster', section);
    if (poster && !env.canScrubVideo) poster.classList.add('media__poster--kb');
  }

  /* ---------------- chapter 1 · hero ---------------- */
  function buildHero() {
    var section = $('#hero');
    applyKenBurns(section);
    var tl = scrubTl() /* scrub chains: positions are PIN FRACTIONS — pad to duration 1 */
      /* first scrub render cancels the intro outright: overwrite:'auto' only evicts
         ACTIVE tweens, so a not-yet-started intro cue tween would otherwise fade the
         scroll cue back in after the scrub hid it. Killing heroIntroTl is final. */
      .to('#hero .hero__eyebrow', { autoAlpha: 0, y: -30, duration: 0.1, onStart: function () { if (heroIntroTl) { heroIntroTl.kill(); heroIntroTl = null; } } }, 0.04)
      .to('#hero .hero__title .word__inner', { yPercent: -130, stagger: 0.035, duration: 0.22 }, 0.1)
      .to('#scrollCue', { autoAlpha: 0, duration: 0.06 }, 0.05)
      .fromTo('#heroLine2', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' }, 0.4)
      .to('#heroLine2', { autoAlpha: 0, y: -50, duration: 0.16, ease: 'power1.in' }, 0.8)
      .to({}, { duration: 0.01 }, 0.99); /* dummy tween pads total duration to exactly 1 (labels don't) */
    makePin(section, null, tl);
  }

  /* ---------------- chapter 2 · arrival ---------------- */
  function buildArrival() {
    var section = $('#arrival');
    applyKenBurns(section);
    var words = $$('#arrival .arrival__title .word__inner');
    var tl = scrubTl()
      .fromTo('#arrival .eyebrow > span', { yPercent: 130 }, { yPercent: 0, duration: 0.08, ease: 'power2.out' }, 0.02)
      .fromTo(words, function (i) { return { xPercent: i % 2 ? 44 : -44, autoAlpha: 0 }; },
        { xPercent: 0, autoAlpha: 1, duration: 0.3, stagger: 0.022, ease: 'power2.out' }, 0.06)
      .fromTo('#arrivalWhisper', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0.55)
      .fromTo('#jaliOverlay', { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 0.92, duration: 0.09, ease: 'power1.in' }, 0.86)
      .to('#jaliOverlay', { autoAlpha: 0, scale: 1, duration: 0.06, ease: 'power1.out' }, 0.95)
      .to({}, { duration: 0.01 }, 0.99);
    makePin(section, null, tl);
  }

  /* ---------------- chapter 3 · durbar hall (split layout, counters) ---------------- */
  function initDurbar() {
    var section = $('#durbar');
    if (!section) return;
    var panel = $('.durbar__panel', section);
    var video = $('video', section);
    gsap.from(panel, { xPercent: 7, autoAlpha: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: section, start: 'top 72%', once: true } });
    gsap.from($$('.durbar__title .word__inner', section), { yPercent: 120, duration: 1, ease: 'expo.out', stagger: 0.045,
      scrollTrigger: { trigger: section, start: 'top 68%', once: true } });
    gsap.from($$('.durbar__copy .line > span', section), { yPercent: 118, duration: 0.9, ease: 'power3.out', stagger: 0.06,
      scrollTrigger: { trigger: $('.durbar__copy', section), start: 'top 80%', once: true } });
    gsap.from($$('.text-link', section), { autoAlpha: 0, y: 18, duration: 0.8,
      scrollTrigger: { trigger: panel, start: 'top 55%', once: true } });
    if (video) gsap.fromTo(video, { scale: 1.08 }, { scale: 1, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 75%', once: true } });
    $$('.stat__num', section).forEach(function (el) {
      var end = parseFloat(el.dataset.count || '0');
      var o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(o, { v: end, duration: 1.9, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(o.v); } });
        } });
    });
  }

  /* ---------------- loop clips: lazy-load + robust play/pause ---------------- */
  /* The Durbar Hall is unpinned → plain IntersectionObserver works there.
      Suite/Gardens loops live inside PINNED chapters → they are driven
      deterministically by their chapter pin trigger's onToggle (see makePin). */
  function initLoops() {
    if (env.reduced) return;
    var vids = $$('video[data-clip-role="loop"]');
    vids.forEach(function (v) { v.dataset.shouldPlay = '0'; });
    var durbarV = $('#durbar video');
    if (!durbarV) return;
    if (!('IntersectionObserver' in window)) {
      durbarV.dataset.shouldPlay = '1';
      assignSrc(durbarV);
      durbarV.addEventListener('loadeddata', function () { tryPlay(durbarV); }, { once: true });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (!v.dataset.loaded && !v.dataset.failed) { v.dataset.shouldPlay = '1'; assignSrc(v); }
          if (en.intersectionRatio >= 0.5) tryPlay(v);
        } else {
          v.dataset.shouldPlay = '0';
          if (!v.paused) v.pause();
        }
      });
    }, { threshold: [0, 0.5] });
    io.observe(durbarV);
  }

  /* ---------------- preload only clip 01; the rest arrive just in time ---------------- */
  function lazyLoadScrubClips() {
    var heroV = $('#hero video');
    if (heroV && env.canScrubVideo) assignSrc(heroV); /* only clip 01 is eager */
    if (!env.canScrubVideo || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { assignSrc(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px 300% 0px' }); /* load ~3 viewports before the chapter pins */
    ['#arrival video', '#finale video'].forEach(function (sel) {
      var v = $(sel);
      if (v) io.observe(v);
    });
  }
  /* ---------------- chapter 4 · suite (pinned horizontal strip + parallax) ---------------- */
  function buildSuite() {
    var section = $('#suite');
    var pinEl = $('.pin', section);
    var video = $('video', section);
    var track = $('#suiteTrack');
    applyKenBurns(section);
    /* measure once + on refresh — never force layout inside the scroll loop */
    var trackDist = 0;
    var measureTrack = function () { trackDist = Math.max(0, track.scrollWidth - pinEl.clientWidth); };
    measureTrack();
    ScrollTrigger.addEventListener('refresh', measureTrack);
    var tl = scrubTl()
      .fromTo('#suite .eyebrow > span', { yPercent: 130 }, { yPercent: 0, duration: 0.05, ease: 'power2.out' }, 0.005)
      .fromTo('#suite .suite__title .word__inner', { yPercent: 120 }, { yPercent: 0, duration: 0.08, stagger: 0.01, ease: 'power2.out' }, 0.015)
      .fromTo($$('.suite-card'), { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.09, stagger: 0.02, ease: 'power2.out' }, 0.03)
      .to({}, { duration: 0.01 }, 0.99);
    makePin(section, function (p) {
      gsap.set(track, { x: -p * trackDist });
      if (video && !video.dataset.failed) gsap.set(video, { yPercent: lerp(-7, 7, p), scale: 1.16 });
    }, tl);
  }

  /* ---------------- chapter 5 · gardens (signature cusped-arch reveal) ---------------- */
  function cusps(x0, y0, x1, y1, foils, depth) {
    var d = '';
    for (var i = 1; i <= foils; i++) {
      var px0 = x0 + (x1 - x0) * (i - 1) / foils, py0 = y0 + (y1 - y0) * (i - 1) / foils;
      var px1 = x0 + (x1 - x0) * i / foils, py1 = y0 + (y1 - y0) * i / foils;
      var mx = (px0 + px1) / 2, my = (py0 + py1) / 2;
      var dx = px1 - px0, dy = py1 - py0;
      var len = Math.hypot(dx, dy) || 1;
      var ox = -dy / len, oy = dx / len;
      if (oy > 0) { ox = -ox; oy = -oy; } /* foil bulges upward */
      d += ' Q ' + f2(mx + ox * depth) + ' ' + f2(my + oy * depth) + ' ' + f2(px1) + ' ' + f2(py1);
    }
    return d;
  }

  function archWindowPath(el, g) {
    var W = el.clientWidth, H = el.clientHeight;
    var x = g.x * W, y = g.y * H, w = g.w * W, h = g.h * H;
    var by = y + h;
    var springY = y + h * g.spring;
    var apexX = x + w / 2, apexY = y + h * g.apex;
    var depth = w * 0.055 * g.flat;
    var F = 4; /* foils per shoulder */
    return 'M ' + f2(x) + ' ' + f2(by) +
           ' L ' + f2(x) + ' ' + f2(springY) +
           cusps(x, springY, apexX, apexY, F, depth) +
           cusps(apexX, apexY, x + w, springY, F, depth) +
           ' L ' + f2(x + w) + ' ' + f2(by) + ' Z';
  }

  function buildGardens() {
    var section = $('#gardens');
    var gVideo = $('#gardens video');
    var revealEl = $('#archReveal');
    var outlineSvg = $('#archOutline');
    var outlinePath = $('#archOutlinePath');
    var clipOK = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('clip-path', 'path("M 0 0 L 10 10")');
    /* window geometry: small cusped-arch window → full-bleed rectangle */
    var G0 = { x: 0.30, y: 0.24, w: 0.40, h: 0.52, spring: 0.58, apex: 0.05, flat: 1 };
    var G1 = { x: 0, y: 0, w: 1, h: 1, spring: 0, apex: 0, flat: 0 };
    var cur = { x: G0.x, y: G0.y, w: G0.w, h: G0.h, spring: G0.spring, apex: G0.apex, flat: G0.flat };
    var keys = Object.keys(G0);
    var easeIO = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
    var lastD = '';

    function apply(p) {
      if (!clipOK) { if (revealEl) revealEl.classList.add('arch-fallback'); if (outlineSvg) gsap.set(outlineSvg, { opacity: 0 }); return; }
      var e = easeIO(clamp01(p));
      for (var i = 0; i < keys.length; i++) { var k = keys[i]; cur[k] = lerp(G0[k], G1[k], e); }
      var d = archWindowPath(revealEl, cur);
      if (d !== lastD) {
        lastD = d;
        revealEl.style.clipPath = "path('" + d + "')";
        if (outlinePath) outlinePath.setAttribute('d', d);
      }
      if (outlineSvg) gsap.set(outlineSvg, { opacity: 1 - clamp01((p - 0.72) / 0.2) });
    }
    apply(0);
    var tl = scrubTl()
      .fromTo('#gardens .gardens__caption', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.02)
      .fromTo('#gardens .gardens__title .word__inner', { yPercent: 120 }, { yPercent: 0, duration: 0.08, stagger: 0.014, ease: 'power2.out' }, 0.03)
      .fromTo('#gardens .kw--1', { y: 110 }, { y: -140, duration: 0.9 }, 0)
      .fromTo('#gardens .kw--2', { y: 150 }, { y: -90, duration: 0.9 }, 0)
      .fromTo('#gardens .kw--3', { y: 80 }, { y: -190, duration: 0.9 }, 0)
      .to('#gardens .kw--1', { autoAlpha: 0, duration: 0.08 }, 0.84)
      .to('#gardens .kw--2', { autoAlpha: 0, duration: 0.08 }, 0.86)
      .to('#gardens .kw--3', { autoAlpha: 0, duration: 0.08 }, 0.88)
      .to('#gardens .gardens__caption', { autoAlpha: 0, y: -30, duration: 0.1, ease: 'power1.in' }, 0.8)
      .to({}, { duration: 0.01 }, 0.99);
    if (gVideo && !env.reduced) {
      tl.fromTo(gVideo, { scale: 1.14 }, { scale: 1, duration: 1 }, 0); /* slow settle across the whole pin */
    }
    makePin(section, apply, tl);
  }
  /* ---------------- chapter 6 · finale ---------------- */
  function buildFinale() {
    var section = $('#finale');
    applyKenBurns(section);
    var tl = scrubTl()
      .fromTo('#finale .eyebrow > span', { yPercent: 130 }, { yPercent: 0, duration: 0.07, ease: 'power2.out' }, 0.03)
      .fromTo('#finale .finale__title .word__inner', { autoAlpha: 0, y: 34 },
        { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.028, ease: 'power2.out' }, 0.12)
      .fromTo('#finale .finale__cta-wrap', { autoAlpha: 0, y: 44 },
        { autoAlpha: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0.68)
      .fromTo('#finaleNote', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.82)
      .to({}, { duration: 0.01 }, 0.99);
    makePin(section, null, tl);
  }

  function buildChapters() {
    buildHero(); buildArrival(); buildSuite(); buildGardens(); buildFinale();
  }

  /* ---------------- fixed chapter numeral (crossfades 01 → 06) ---------------- */
  function initChapterIndex() {
    var el = $('#chapterNum');
    if (!el) return;
    var current = '1';
    $$('.chapter').forEach(function (section) {
      ScrollTrigger.create({
        trigger: section, start: 'top 55%', end: 'bottom 55%',
        onToggle: function (self) {
          if (!self.isActive) return;
          var n = section.dataset.chapter;
          if (!n || n === current) return;
          current = n;
          gsap.timeline()
            .to(el, { yPercent: -110, autoAlpha: 0, duration: 0.28, ease: 'power2.in' })
            .add(function () { el.textContent = pad2(n); })
            .fromTo(el, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.34, ease: 'power2.out' });
        }
      });
    });
  }

  /* ---------------- nav (appears after hero · shrinks down · returns up) ---------------- */
  function initNav() {
    var nav = $('#nav');
    if (!nav) return;
    ScrollTrigger.create({
      trigger: '#hero', start: 'bottom top+=2',
      onEnter: function () { nav.classList.add('is-visible'); },
      onLeaveBack: function () { nav.classList.remove('is-visible', 'is-compact'); }
    });
    var lastY = 0;
    var onScroll = function (y) {
      if (y > lastY + 2 && y > 160) nav.classList.add('is-compact');
      else if (y < lastY - 2 || y <= 160) nav.classList.remove('is-compact');
      lastY = y;
    };
    if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
    else window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
    $$('[data-nav]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id.charAt(0) !== '#') return;
        var target = $(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
        else target.scrollIntoView({ behavior: env.reduced ? 'auto' : 'smooth' });
      });
    });
  }
  /* ---------------- footer ivory theme flip ---------------- */
  function initFooterFlip() {
    ScrollTrigger.create({
      trigger: '#footer', start: 'top 72%',
      onEnter: function () { document.body.classList.add('theme-ivory'); },
      onLeaveBack: function () { document.body.classList.remove('theme-ivory'); }
    });
  }

  /* ---------------- custom cursor (gold dot ↔ labelled ring) ---------------- */
  function initCursor() {
    var cursor = $('#cursor');
    if (!cursor) return;
    if (env.touch || env.reduced) { cursor.remove(); return; }
    var dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor), label = $('#cursorLabel');
    var tx = innerWidth / 2, ty = innerHeight / 2, rx = tx, ry = ty, seen = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; rx = tx; ry = ty; cursor.classList.add('is-active'); }
    });
    gsap.ticker.add(function () {
      rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;
      dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
    });
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      var inter = t.closest && t.closest('a, button, .suite-card, .text-link');
      var labelled = t.closest && t.closest('[data-cursor-label]');
      if (inter) {
        if (label) label.textContent = (inter.dataset && inter.dataset.cursorLabel) || 'VIEW';
        cursor.classList.add('is-label');
      } else if (labelled) {
        if (label) label.textContent = labelled.dataset.cursorLabel || 'VIEW';
        cursor.classList.add('is-label');
      } else {
        cursor.classList.remove('is-label');
      }
    });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.remove('is-active'); });
    document.documentElement.addEventListener('mouseenter', function () { if (seen) cursor.classList.add('is-active'); });
  }

  /* ---------------- magnetic CTA (follows cursor within ~12px) ---------------- */
  function initMagnetic() {
    if (env.touch || env.reduced) return;
    $$('[data-magnetic]').forEach(function (el) {
      var strength = 13;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        gsap.to(el, { x: dx * strength, y: dy * strength * 0.6, duration: 0.5, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }

  /* ---------------- reduced-motion experience (static posters + simple fades) ---------------- */
  function buildReduced() {
    var faders = $$('.eyebrow, .hero__title, .hero__line2, .arrival__title, .arrival__whisper, .durbar__panel, ' +
      '.suite__head, .suite-card, .gardens__caption, .finale__title, .finale__cta-wrap, .finale__note, ' +
      '.footer__title, .footer__cols, .footer__base, .text-link');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-inview'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    faders.forEach(function (el) { el.classList.add('will-fade'); io.observe(el); });
    $$('.stat__num').forEach(function (el) { el.textContent = el.dataset.count; });
    $$('.progress-rail, .scroll-cue__line i').forEach(function (el) { el.style.display = 'none'; });
  }

  /* ---------------- init ---------------- */
  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      document.documentElement.classList.add('no-motion');
      var pre0 = $('#preloader');
      if (pre0) pre0.style.display = 'none';
      document.body.classList.add('is-ready');
      console.warn('[Rajmahal] GSAP/Lenis CDN unavailable — rendering static experience.');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    gsap.defaults({ ease: 'power2.out' });
    initLenis();
    wireMedia();
    if (!env.reduced) {
      splitAll();
      installScrubTicker();
      buildChapters();      /* pins first — media wiring below is then position-stable */
      initDurbar();
      initLoops();
      lazyLoadScrubClips();
      initChapterIndex();
      initNav();
      initFooterFlip();
      initCursor();
      initMagnetic();
    } else {
      buildReduced();
    }
    runPreloader();
    logManifest();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();




