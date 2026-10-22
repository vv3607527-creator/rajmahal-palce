Set-Location 'C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE'
$c = (Invoke-WebRequest -Uri 'http://127.0.0.1:8000/main.js' -UseBasicParsing).Content
Write-Host ('served bytes: ' + $c.Length)
Write-Host ('has scrubTl: ' + ($c.Contains('function scrubTl')))
Write-Host ('has heroIntroTl kill: ' + $c.Contains('heroIntroTl.kill'))
Write-Host ('has pin onToggle loop: ' + $c.Contains('isLoop'))
Write-Host ('has old bindPinnedLoop: ' + $c.Contains('bindPinnedLoop'))
Write-Host ('has gated retry: ' + $c.Contains("shouldPlay === '1'"))
