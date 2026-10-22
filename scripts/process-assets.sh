#!/usr/bin/env bash
# =============================================================================
#  THE RAJMAHAL PALACE — asset pipeline (macOS / Linux)
#  1) Drop raw Flow/Veo exports into assets/video/raw/ (exact names):
#       01-hero-aerial.mp4  02-arrival-gate.mp4  03-durbar-lobby.mp4
#       04-royal-suite.mp4  05-pool-gardens.mp4  06-night-finale.mp4
#  2) Optional stills into assets/images/raw/ (webp/jpg/png, same clip names,
#     plus poster-mobile.* for the vertical hero)
#  3) bash scripts/process-assets.sh            (or add --skip-existing)
#  Requires ffmpeg + ffprobe on PATH (brew install ffmpeg).
# =============================================================================
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAWV="$ROOT/assets/video/raw"; VID="$ROOT/assets/video"
RAWI="$ROOT/assets/images/raw"; IMG="$ROOT/assets/images"
SKIP="${1:-}"
command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg not on PATH (brew install ffmpeg)"; exit 1; }
command -v ffprobe >/dev/null 2>&1 || { echo "ffprobe not on PATH"; exit 1; }
mkdir -p "$VID" "$IMG"

# scrub clips are played frame-by-frame by scroll -> dense keyframes (-g 1)
SCRUB="01-hero-aerial 02-arrival-gate 06-night-finale"
LOOPS="03-durbar-lobby 04-royal-suite 05-pool-gardens"

echo "-- videos --"
for name in $SCRUB $LOOPS; do
  src="$RAWV/$name.mp4"; dst="$VID/$name.mp4"
  [ -f "$src" ] || { echo "  MISSING raw: $name"; continue; }
  if [ "$SKIP" = "--skip-existing" ] && [ -f "$dst" ]; then echo "  skip: $name"; continue; fi
  case " $SCRUB " in
    *" $name "*)
      ffmpeg -y -v error -i "$src" -vf "scale=1920:-2" -g 1 -crf 20 -preset fast -pix_fmt yuv420p -movflags +faststart -an "$dst" ;;
    *)
      ffmpeg -y -v error -i "$src" -vf "scale=1920:-2" -crf 23 -preset medium -pix_fmt yuv420p -movflags +faststart -an "$dst" ;;
  esac
  echo "  done: $name"
done

echo "-- posters --"
POSTERS="01-hero-aerial:poster 02-arrival-gate:poster-02 03-durbar-lobby:poster-03 04-royal-suite:poster-04 05-pool-gardens:poster-05 06-night-finale:poster-06"
for pair in $POSTERS; do
  name="${pair%%:*}"; out="${pair##*:}"; dst="$IMG/$out.jpg"
  if [ "$SKIP" = "--skip-existing" ] && [ -f "$dst" ]; then continue; fi
  still=$(ls "$RAWI/$name".webp "$RAWI/$name".jpg "$RAWI/$name".png 2>/dev/null | head -n1)
  if [ -n "$still" ]; then
    ffmpeg -y -v error -i "$still" -q:v 2 "$dst"          # composed still first
  elif [ -f "$RAWV/$name.mp4" ]; then
    ffmpeg -y -v error -i "$RAWV/$name.mp4" -frames:v 1 -q:v 2 "$dst"   # else frame 0
  fi
  echo "  $out.jpg"
done

echo "-- og + mobile hero --"
if [ -f "$IMG/poster.jpg" ] && [ ! -f "$IMG/og-image.jpg" ]; then
  ffmpeg -y -v error -i "$IMG/poster.jpg" -vf "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630" -q:v 3 "$IMG/og-image.jpg"
  echo "  og-image.jpg"
fi
mob=$(ls "$RAWI"/poster-mobile.* 2>/dev/null | head -n1)
if [ -n "$mob" ] && [ ! -f "$IMG/hero-mobile.jpg" ]; then
  ffmpeg -y -v error -i "$mob" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -q:v 3 "$IMG/hero-mobile.jpg"
  echo "  hero-mobile.jpg"
fi

echo "-- suite stills (3:4 frames from clip 04) --"
if [ -f "$RAWV/04-royal-suite.mp4" ]; then
  d=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$RAWV/04-royal-suite.mp4")
  i=0
  for frac in 0.12 0.5 0.88; do
    i=$((i+1)); dst="$IMG/suite-0$i.jpg"
    if [ "$SKIP" = "--skip-existing" ] && [ -f "$dst" ]; then continue; fi
    t=$(awk "BEGIN{printf \"%.2f\", $d*$frac}")
    ffmpeg -y -v error -ss "$t" -i "$RAWV/04-royal-suite.mp4" -frames:v 1 -vf "crop=ih*3/4:ih,scale=900:1200" -q:v 3 "$dst"
    echo "  suite-0$i.jpg @ ${t}s"
  done
fi
echo "Pipeline complete."
