# 🏛️ The Rajmahal Palace — cinematic scroll-driven website

A single-page, scroll-driven concept site for a fictional Indian lake-palace hotel.
Vanilla HTML + CSS + JS — no framework, no build step. GSAP + ScrollTrigger (CDN)
drive the pinned chapters; Lenis (CDN) provides inertial smooth-scroll. Scroll
position scrubs the drone videos frame-by-frame; interior loops autoplay while
in view.

## Run it

Any of these works:

```powershell
# simplest — just open it
start index.html

# better (recommended for video scrubbing)
python -m http.server 8000      # then open http://localhost:8000
npx serve .                     # alternative
```

Fonts and GSAP/Lenis load from CDNs, so the first view needs internet.

## What's wired where (filenames are the contract)

| File | Chapter | Behaviour |
|---|---|---|
| `assets/video/01-hero-aerial.mp4` | 01 Hero | scroll-scrubbed (pin 380vh) |
| `assets/video/02-arrival-gate.mp4` | 02 Arrival | scroll-scrubbed (pin 360vh) |
| `assets/video/03-durbar-lobby.mp4` | 03 Durbar Hall | autoplay loop, plays ≥50% in view |
| `assets/video/04-royal-suite.mp4` | 04 Suites | autoplay loop + parallax under the pinned card strip |
| `assets/video/05-pool-gardens.mp4` | 05 Gardens | autoplay loop inside the expanding cusped-arch clip-path |
| `assets/video/06-night-finale.mp4` | 06 Finale | scroll-scrubbed (pin 360vh) |
| `assets/images/poster.jpg` | hero | instant paint before clip 01 (also OG fallback) |
| `assets/images/poster-02…06.jpg` | chapters | `<video>` posters + reduced-motion / mobile fallbacks |
| `assets/images/og-image.jpg` | meta | 1200×630 social share |
| `assets/images/hero-mobile.jpg` | mobile | 1080×1920 vertical hero |
| `assets/images/suite-01…03.jpg` | chapter 4 | the three suite cards |

If a file is absent the site keeps working: that section shows a deep-sapphire +
gold-shimmer placeholder and the console logs what's missing
(`[Rajmahal] asset missing: …`).

## Project layout

```
├── index.html            all markup, one <section> per chapter
├── styles.css            design system + chapter styles
├── main.js               scrub engine, pins, preloader, cursor, chrome
├── ASSET-PROMPT-PACK.md  every generation prompt (Veo + stills)
├── scripts/
│   ├── process-assets.ps1    Windows pipeline (ffmpeg)
│   └── process-assets.sh     macOS / Linux pipeline
└── assets/
    ├── video/            optimized clips used by the site
    │   └── raw/          original Flow exports (kept safe)
    └── images/           posters, OG, mobile hero, suite stills
        └── raw/          original webp stills + contact sheet
```


