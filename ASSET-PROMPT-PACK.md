# 🏛️ THE RAJMAHAL PALACE — ASSET GENERATION PROMPT PACK (v2 · Production)

The complete asset list the website is wired against — exact prompts for Google
Flow (Veo 3.1), the **exact filenames + folders** the site expects, and the
one-command pipeline that makes scroll-scrubbed video buttery.

> **Golden rule:** the site finds media **purely by filename**. Generate → rename
> exactly → drop into `assets/video/raw/` → run the script. Anything missing never
> breaks the site — it falls back to a deep-sapphire + gold-shimmer placeholder
> and logs the missing file to the console.

## 0 · The 3-step workflow

**1 — Generate** every asset in Google Flow (labs.google/flow) with the prompts
in §3–§6. Download and **rename exactly** as in §1.

**2 — Process.** Drop raw videos into `assets/video/raw/`, then from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\process-assets.ps1
```

It re-encodes the scrub clips with dense keyframes (§7), converts the stills to
posters, crops the OG image + mobile hero, and prints a manifest.

**3 — Build.** The site is already wired to these exact filenames. Say "assets
are in" any time you regenerate something and it just works.

## 1 · Folder map — where every file lands

```
RAJMAHAL PALACE WEBSITE\
├── index.html / styles.css / main.js / README.md
├── ASSET-PROMPT-PACK.md                 ← this file
├── scripts\process-assets.ps1           ← Windows pipeline (ffmpeg)
├── scripts\process-assets.sh            ← macOS / Linux pipeline
└── assets\
    ├── video\
    │   ├── raw\                         ← ★ DROP RAW FLOW EXPORTS HERE ★
    │   │   ├── 01-hero-aerial.mp4 … 06-night-finale.mp4
    │   ├── 01-hero-aerial.mp4           ← optimized copies (script writes these)
    │   └── … 06-night-finale.mp4
    └── images\
        ├── raw\                         ← raw stills (webp) + contact sheet
        ├── poster.jpg                   ← hero instant-paint (REQUIRED)
        ├── poster-02.jpg … poster-06.jpg
        ├── og-image.jpg                 ← 1200×630 social share
        ├── hero-mobile.jpg              ← 1080×1920 mobile hero
        └── suite-01.jpg · suite-02.jpg · suite-03.jpg   ← optional 3:4 cards
```

⚠️ **Filenames are the wiring contract.** No `(1)` suffixes, no `_final`, no case changes.

## 2 · Flow settings cheat sheet (every video)

| Setting | Value |
|---|---|
| Model | **Veo 3.1 — Quality** (never "Fast" for these six) |
| Aspect | **16:9** for all six videos |
| Duration | **10s** for scrub clips 01 / 02 / 06; loops 03 / 04 / 05 may be 8s |
| Resolution | **Highest offered (4K ideal)** — the pipeline downscales to 1920px |
| Candidates | Generate **2–4 per prompt**, keep only what passes §9 |
| Consistency | If your Flow build offers **Ingredients / first-frame conditioning**: create `poster.jpg` first, then feed it as the first frame to every clip so the *same palace* appears in all six |

## 3 · 🎨 GLOBAL STYLE BLOCK — append VERBATIM to the END of every prompt

> Royal Indian palace-hotel aesthetic in the style of Rajasthani and Mughal heritage architecture: rose-pink sandstone and white Makrana marble, onion domes and chhatris (domed pavilions), scalloped cusped arches, jharokha balconies with intricate jali lattice screens, hand-carved stone elephant and horse statues, frescoed walls with gold leaf, brass urns with floating marigolds and rose petals. Set on a serene lake with lush royal gardens — fountains, reflecting pools, peacocks, mango and neem trees. Cinematic color grade: warm regal gold highlights, deep teal-sapphire shadows, gentle film grain, high dynamic range. Shot on cinema camera, 35mm anamorphic lens. Photorealistic, 8K architectural photography quality. Slow, perfectly smooth, constant-speed camera motion with zero shake. No people, no text, no watermarks.

## 4 · 🚫 NEGATIVE LINE — also append to every prompt

> No people, no humans, no hands, no silhouettes, no text, no letters, no numbers, no captions, no subtitles, no watermark, no logo, no UI overlays, no timestamps, no camera shake, no cuts, no transitions, no speed ramps, no modern objects (cars, motorboats, power lines, satellite dishes, air conditioners, visible drones).

## 5 · THE SIX CLIPS

| # | Exact filename | Website role | Camera move | Duration |
|---|---|---|---|---|
| 01 | `01-hero-aerial.mp4` | Hero — **scroll-scrubbed** | vertical drone descent | 10s |
| 02 | `02-arrival-gate.mp4` | Arrival — **scroll-scrubbed** | forward dolly to arch | 10s |
| 03 | `03-durbar-lobby.mp4` | Durbar Hall — **autoplay loop** | forward glide | 8–10s |
| 04 | `04-royal-suite.mp4` | Maharaja Suite — **autoplay loop** | lateral glide (R→L) | 8–10s |
| 05 | `05-pool-gardens.mp4` | Pool & Gardens — **autoplay loop** | water-level track (L→R) | 8–10s |
| 06 | `06-night-finale.mp4` | Night Finale — **scroll-scrubbed** | rise + pull-back | 10s |

Scrub clips are pinned and played frame-by-frame by scroll — motion must read
correctly at any speed. Loop clips autoplay muted on repeat. Loop prompts end
with a helper line so the last frame echoes the first (seamless looping).

### 5.1 · `01-hero-aerial.mp4` — THE REVEAL (scrubbed)

> Top-down aerial drone shot, God's-eye view directly above a magnificent Indian lake palace hotel at golden hour. The frame reveals the full property: a symmetrical palace of pink sandstone and white marble with clusters of onion domes and chhatris, a grand central courtyard with a charbagh garden (four-quadrant Mughal garden) split by water channels and fountains, a large ornate swimming pool bordered by carved stone elephants spouting water, and the palace edges meeting a mirror-still lake reflecting the amber sky. The drone slowly and steadily descends straight down from very high altitude, domes and carved details growing larger. Constant descent speed, no rotation, no tilt.

**Watch for:** rotation/tilt creep during descent — reject if the courtyard drifts off-center.

### 5.2 · `02-arrival-gate.mp4` — THE GRAND ENTRANCE (scrubbed)

> Slow forward dolly shot moving along a royal arrival path toward a monumental palace gateway: a towering cusped arch of carved sandstone flanked by two life-size hand-carved marble elephant statues with brass howdahs, rose petals scattered on polished stone, tall brass torch lamps with real flames flickering in slow motion, rows of royal palms and frangipani. Through the arch, a glimpse of a sunlit courtyard with a marble fountain perfectly centered in frame. Late afternoon light rakes gold across the carvings. Single continuous forward push at constant speed, ending just before passing through the arch.

**Watch for:** a sneaky cut as the camera nears the arch (regenerate); flame flicker should be slow, never strobing.

### 5.3 · `03-durbar-lobby.mp4` — THE DURBAR HALL (loop)

> Slow forward glide through an opulent palace durbar hall lobby: a soaring dome ceiling painted with intricate frescoes and gold leaf, an enormous Belgian crystal chandelier, polished white marble floor inlaid with black and jade geometric patterns reflecting everything like water, scalloped marble arches on both sides, carved stone deity and horse statues in illuminated alcoves, a grand brass urn overflowing with marigolds and lotus at center. Beyond the far arches, the shimmering lake glows in golden light. Sheer silk drapes breathe gently. Camera pushes forward toward the lake view at constant speed. The final framing should closely echo the opening frame so the shot can loop seamlessly.

**Watch for:** chandelier sparkle flickering too fast; end framing ≈ start framing.

### 5.4 · `04-royal-suite.mp4` — THE MAHARAJA SUITE (loop)

> Slow lateral dolly right-to-left through a maharaja palace suite at dusk: a four-poster bed with carved teak columns and embroidered silk canopy in ivory and gold, hand-painted miniature frescoes on the walls, a jharokha bay window with jali lattice framing the lake and sunset, a freestanding copper-and-marble bathtub near the window with rose petals floating on the water, warm candlelight and brass lanterns glowing, a Persian rug over marble floors. Golden-blue dusk light streams through the lattice casting intricate shadow patterns that drift slowly. Constant-speed glide, no rotation. The final framing should closely echo the opening frame so the shot can loop seamlessly.

**Watch for:** lattice shadows drifting in one consistent direction; zero camera rotation.

### 5.5 · `05-pool-gardens.mp4` — THE ROYAL POOL & GARDENS (loop)

> Slow low tracking shot gliding left-to-right at water level along a grand palace swimming pool at golden hour: mirror-still turquoise water reflecting scalloped marble arcades and domes, carved stone elephant statues gently spouting arcs of water in silky slow motion, floating trays of marigolds and rose petals drifting past the lens, a colonnaded pavilion at the far end, manicured Mughal gardens with fountains and a peacock walking in the distance. Warm underwater lighting beginning to glow. Steady dolly movement, constant speed throughout. The final framing should closely echo the opening frame so the shot can loop seamlessly.

**Watch for:** the peacock should stay distant; water arcs silky, not stuttering.

### 5.6 · `06-night-finale.mp4` — THE PALACE AT NIGHT (scrubbed)

> Slow rising and pulling-back aerial drone shot of the entire lake palace at night: every dome, chhatri and archway outlined in warm golden facade lighting, hundreds of brass oil lamps (diyas) tracing the courtyard water channels like rivers of fire, the pool glowing sapphire, fountains lit from within, and the palace's full reflection shimmering perfectly on the still black lake with a silver moon-path across the water. Camera ascends and retreats in one continuous constant-speed move until the whole glowing palace floats like a jewel in darkness. Clean starry sky above.

**Watch for:** the reflection must stay mirrored through the whole pull-back; no clouds swallowing the moon path.

## 6 · STILLS — Flow IMAGE mode (append Style Block + negative line to these too)

| Asset | Aspect / size | Prompt |
|---|---|---|
| `og-image.jpg` | 1200×630 (16:9) | "Wide symmetrical architectural photograph of the lake palace facade at golden hour reflected perfectly in still water, domes and chhatris against an amber sky, magazine cover quality" |
| `hero-mobile.jpg` | 1080×1920 (9:16) | "Vertical top-down aerial of the charbagh courtyard garden with water channels, fountains and the elephant-statue pool, golden hour" |
| `poster.jpg` | 16:9 | *Best: a composed still of the same scene as clip 01 (that's what ships). Pipeline fallback: first frame of the clip.* |
| `suite-01.jpg` | 3:4 portrait | "Luxurious palace suite interior at dusk, vertical composition: carved teak four-poster bed draped in a peacock-blue silk canopy with gold embroidery, marble floor with a jewel-toned Persian rug, jharokha window with jali lattice casting delicate shadow patterns, brass lanterns glowing warm, framed miniature paintings, fresh marigolds in a brass bowl. Intimate royal candlelit mood." |
| `suite-02.jpg` | 3:4 portrait | "Palace suite interior glowing in amber candlelight, vertical composition: hand-painted frescoes of courtly processions in gold and saffron, an antique carved wooden swing (jhula) with silk cushions, arched alcoves with brass oil lamps, inlaid marble floor, low table with rose petals and a silver tea service. Warm regal intimacy." |
| `suite-03.jpg` | 3:4 portrait | "A white marble pavilion room with cusped arches open onto a mirror-still lake at dawn, vertical composition: sheer ivory curtains breathing in the breeze, freestanding copper bathtub with floating rose petals and lotus flowers, black-and-white inlaid marble floor, soft pink-gold dawn light, distant domes reflected on the water." |

**Suite stills are optional** — if absent, the site renders the three suite cards
as typographic gold-on-sapphire panels. If present, they wire to this copy:

| File | Card title | Poetic line | Rate |
|---|---|---|---|
| `suite-01.jpg` | The Peacock Suite | "A canopy of peacock-blue silk above a bed where maharanas slept." | From ₹78,000 / night |
| `suite-02.jpg` | The Amber Suite | "Frescoed walls that have held a century of candlelight." | From ₹96,000 / night |
| `suite-03.jpg` | The Lotus Pavilion | "A private marble pavilion adrift on the lake." | From ₹1,20,000 / night |

## 7 · POST-PROCESSING — what the pipeline does

Browsers seek video to the nearest **keyframe**; Flow exports keyframe every few
seconds, which makes scroll-scrubbing jumpy. The pipeline re-encodes the scrub
clips (01 / 02 / 06) with `-g 1` — a keyframe on **every frame** — so
`video.currentTime` lands exactly where scroll puts it. Loop clips get a normal
high-quality encode + `+faststart`. It also converts stills → posters, crops
`og-image.jpg` (1200×630) + `hero-mobile.jpg` (1080×1920), and pulls three 3:4
suite stills from clip 04 (@ 12% / 50% / 88% of its duration).

```powershell
powershell -ExecutionPolicy Bypass -File scripts\process-assets.ps1              # full run
powershell -ExecutionPolicy Bypass -File scripts\process-assets.ps1 -SkipExisting  # fill gaps only
# macOS/Linux: bash scripts/process-assets.sh   (add --skip-existing)
```

**Manual equivalents:**

```bash
# Scrub clips — THE critical encode (this exact command also appears in the README):
ffmpeg -i in.mp4 -vf scale=1920:-2 -g 1 -crf 20 -movflags +faststart -an out.mp4

# Loop clips:
ffmpeg -i in.mp4 -vf scale=1920:-2 -crf 23 -preset medium -pix_fmt yuv420p -movflags +faststart -an out.mp4

# OG image (1200×630 center crop) and mobile hero (1080×1920):
ffmpeg -i poster.jpg -vf "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630" -q:v 3 og-image.jpg
ffmpeg -i poster-mobile.webp -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -q:v 3 hero-mobile.jpg
```

Notes: `-g 1` makes every frame a keyframe → bigger files (25–35 MB per 10s clip
at 1080p). `-crf 23` if you need them smaller — visually nearly identical.
`-an` strips audio (the site mutes everything anyway).

## 8 · REQUIRED vs OPTIONAL — and what happens if something is missing

| Asset | Status | If missing |
|---|---|---|
| 6 videos | **REQUIRED** for the full experience | Section renders an animated sapphire + gold-shimmer placeholder; console logs it |
| `poster.jpg` | **REQUIRED** | Hero paints a sapphire gradient until the video loads |
| `poster-02…06.jpg` | AUTO — pipeline | `<video>` shows no poster; mobile fallback uses a gradient |
| `og-image.jpg` | AUTO — pipeline | Meta tags fall back to `poster.jpg` |
| `hero-mobile.jpg` | AUTO — pipeline | Mobile hero falls back to `poster.jpg` / gradient |
| `suite-01…03.jpg` | **OPTIONAL** | Suite cards render as typographic gold-on-sapphire panels (still gorgeous) |

The site logs absent files like
`[Rajmahal] asset missing: assets/video/03-durbar-lobby.mp4 — using sapphire placeholder`
so you always know what's left to generate.

## 9 · ACCEPTANCE CHECKLIST — before you drop a clip in `raw/`

- [ ] **One unbroken camera move** — constant speed, no cuts, no speed ramps, no shake
- [ ] **No people, no text, no logos/watermarks** anywhere in frame
- [ ] Same palace family: pink sandstone + white marble, onion domes/chhatris, cusped arches
- [ ] Grade: warm gold highlights, teal-sapphire shadows — never flat daylight
- [ ] Scrub clips: spot-check frames at 0% / 50% / 100% — each sharp, exposed, composed
- [ ] Loop clips: last frame reasonably close to first
- [ ] Duration: 10s for scrub clips, ≥8s for loops

Fail any line → regenerate (that's why you generate 2–4 candidates).

## 10 · PROVENANCE — what was generated and wired for this build

| Flow export (original) | → | Canonical asset | Verified |
|---|---|---|---|
| `Drone_descending_over_lake_palace_….mp4` | → | `assets/video/01-hero-aerial.mp4` | 1920×1080 · 9.96s · dense keyframes |
| `Dolly_toward_palace_gateway_….mp4` | → | `assets/video/02-arrival-gate.mp4` | 1920×1080 · 10s · dense keyframes |
| `Palace_interior_architectural_view_….mp4` | → | `assets/video/03-durbar-lobby.mp4` | 1920×1080 · 10s · loop encode |
| `Palace_suite_at_dusk_….mp4` | → | `assets/video/04-royal-suite.mp4` | 1920×1080 · 10s · loop encode |
| `Palace_swimming_pool_tracking_shot_….mp4` | → | `assets/video/05-pool-gardens.mp4` | 1920×1080 · 9.96s · loop encode |
| `Illuminated_Indian_lake_palace_at_night_….mp4` | → | `assets/video/06-night-finale.mp4` | 1920×1080 · 10s · dense keyframes |
| `01…06-*.webp` stills | → | `poster.jpg` (1920×1080) + `poster-02…06.jpg` | ✓ |
| `poster-mobile.webp` | → | `hero-mobile.jpg` 1080×1920 | ✓ |
| `og-image.jpg` | → | cropped from the 2K hero still to 1200×630 | ✓ |
| clip 04 frames @ 1.2s / 5s / 8.8s | → | `suite-01…03.jpg` (900×1200, 3:4) | ✓ |

Originals are preserved in `assets/video/raw/` and `assets/images/raw/`.
`contact-sheet.jpg` (your generation aid) also lives in `assets/images/raw/`.

---

*The Rajmahal Palace — a fictional concept property. Site built with Claude; media generated with Google Flow (Veo).*



