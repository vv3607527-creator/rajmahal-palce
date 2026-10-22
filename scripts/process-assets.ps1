<#
  THE RAJMAHAL PALACE — asset pipeline
  ────────────────────────────────────
  1) Drop raw Flow/Veo exports into  assets\video\raw\  named exactly:
       01-hero-aerial.mp4  02-arrival-gate.mp4  03-durbar-lobby.mp4
       04-royal-suite.mp4  05-pool-gardens.mp4  06-night-finale.mp4
  2) Optional stills into assets\images\raw\ (webp/jpg/png, same clip names)
       e.g. 01-hero-aerial.webp  ·  poster-mobile.webp
  3) Run from the project root:
       powershell -ExecutionPolicy Bypass -File scripts\process-assets.ps1
       add -SkipExisting to keep files that are already processed
  Produces: optimized clips in assets\video\ and posters / og-image /
  mobile hero / three suite stills in assets\images\.
  Requires ffmpeg + ffprobe on PATH (winget install Gyan.FFmpeg).
#>
param([switch]$SkipExisting)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$rawV = Join-Path $root 'assets\video\raw'
$vid  = Join-Path $root 'assets\video'
$rawI = Join-Path $root 'assets\images\raw'
$img  = Join-Path $root 'assets\images'
# scrub clips are played frame-by-frame by scroll → dense keyframes (-g 1)
$scrub = @('01-hero-aerial', '02-arrival-gate', '06-night-finale')
$loops = @('03-durbar-lobby', '04-royal-suite', '05-pool-gardens')

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Host 'ffmpeg not found on PATH. Install: winget install Gyan.FFmpeg' -ForegroundColor Red
  exit 1
}
New-Item -ItemType Directory -Force -Path $vid, $img | Out-Null
function Get-Seconds($p) { [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $p) }

Write-Host '-- videos --' -ForegroundColor DarkGray
foreach ($n in ($scrub + $loops)) {
  $src = Join-Path $rawV ($n + '.mp4'); $dst = Join-Path $vid ($n + '.mp4')
  if (-not (Test-Path $src)) { Write-Host ('  MISSING raw: ' + $n) -ForegroundColor Yellow; continue }
  if ($SkipExisting -and (Test-Path $dst)) { Write-Host ('  skip: ' + $n) -ForegroundColor DarkGray; continue }
  if ($scrub -contains $n) {
    # dense keyframes so video.currentTime lands exactly where scroll puts it
    & ffmpeg -y -v error -i $src -vf 'scale=1920:-2' -g 1 -crf 20 -preset fast -pix_fmt yuv420p -movflags +faststart -an $dst
  } else {
    & ffmpeg -y -v error -i $src -vf 'scale=1920:-2' -crf 23 -preset medium -pix_fmt yuv420p -movflags +faststart -an $dst
  }
  Write-Host ('  done: ' + $n) -ForegroundColor Green
}

Write-Host '-- posters --' -ForegroundColor DarkGray
$map = @{
  '01-hero-aerial' = 'poster';     '02-arrival-gate' = 'poster-02'
  '03-durbar-lobby' = 'poster-03'; '04-royal-suite'  = 'poster-04'
  '05-pool-gardens' = 'poster-05'; '06-night-finale' = 'poster-06'
}
foreach ($k in $map.Keys) {
  $dst = Join-Path $img ($map[$k] + '.jpg')
  if ($SkipExisting -and (Test-Path $dst)) { continue }
  $still = Get-ChildItem $rawI -File -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -eq $k } | Select-Object -First 1
  if ($still) {
    & ffmpeg -y -v error -i $still.FullName -q:v 2 $dst                       # composed still first
  } elseif (Test-Path (Join-Path $rawV ($k + '.mp4'))) {
    & ffmpeg -y -v error -i (Join-Path $rawV ($k + '.mp4')) -frames:v 1 -q:v 2 $dst   # else frame 0
  }
  Write-Host ('  ' + $map[$k] + '.jpg') -ForegroundColor Green
}

Write-Host '-- og + mobile hero --' -ForegroundColor DarkGray
$ogDst = Join-Path $img 'og-image.jpg'
if (-not ($SkipExisting -and (Test-Path $ogDst)) -and (Test-Path (Join-Path $img 'poster.jpg'))) {
  & ffmpeg -y -v error -i (Join-Path $img 'poster.jpg') -vf 'scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630' -q:v 3 $ogDst
  Write-Host '  og-image.jpg' -ForegroundColor Green
}
$mobSrc = Get-ChildItem $rawI -File -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -like 'poster-mobile*' } | Select-Object -First 1
$mobDst = Join-Path $img 'hero-mobile.jpg'
if ($mobSrc -and -not ($SkipExisting -and (Test-Path $mobDst))) {
  & ffmpeg -y -v error -i $mobSrc.FullName -vf 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920' -q:v 3 $mobDst
  Write-Host '  hero-mobile.jpg' -ForegroundColor Green
}

Write-Host '-- suite stills (3:4 frames from clip 04) --' -ForegroundColor DarkGray
$suiteRaw = Join-Path $rawV '04-royal-suite.mp4'
if (Test-Path $suiteRaw) {
  $d = Get-Seconds $suiteRaw; $i = 0
  foreach ($frac in @(0.12, 0.5, 0.88)) {
    $i++
    $dst = Join-Path $img ('suite-0' + $i + '.jpg')
    if ($SkipExisting -and (Test-Path $dst)) { continue }
    $t = [math]::Round($d * $frac, 2)
    & ffmpeg -y -v error -ss $t -i $suiteRaw -frames:v 1 -vf 'crop=ih*3/4:ih,scale=900:1200' -q:v 3 $dst
    Write-Host ('  suite-0' + $i + '.jpg @ ' + $t + 's') -ForegroundColor Green
  }
}
Write-Host '-- summary --' -ForegroundColor DarkGray
Get-ChildItem $vid -File | ForEach-Object { '  assets/video/{0}  ({1} KB)' -f $_.Name, [math]::Round($_.Length / 1KB) }
Get-ChildItem $img -File | ForEach-Object { '  assets/images/{0}  ({1} KB)' -f $_.Name, [math]::Round($_.Length / 1KB) }
Write-Host 'Pipeline complete.' -ForegroundColor Cyan
