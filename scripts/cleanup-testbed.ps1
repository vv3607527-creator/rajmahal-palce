Set-Location 'C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE'
# kill stale test-edge (headless only)
$z = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*--headless*' }
Write-Host ('headless edge to kill: ' + ($z | Measure-Object).Count)
$z | ForEach-Object { Invoke-CimMethod -Query ("SELECT * FROM Win32_Process WHERE ProcessId=" + $_.ProcessId) -MethodName Terminate | Out-Null }
# kill stale node workers from this project only (never the Cline host)
$n = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*RAJMAHAL*' -and $_.CommandLine -notlike '*cline*' }
Write-Host ('stale project node to kill: ' + ($n | Measure-Object).Count)
$n | ForEach-Object { Invoke-CimMethod -Query ("SELECT * FROM Win32_Process WHERE ProcessId=" + $_.ProcessId) -MethodName Terminate | Out-Null }
Start-Sleep -Seconds 3
# restart the site server fresh
wscript.exe scripts\serve-hidden.vbs
Start-Sleep -Seconds 3
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 5
  Write-Host ('SERVER ' + $r.StatusCode)
} catch { Write-Host ('SERVER DOWN: ' + $_.Exception.Message) }
$os = Get-CimInstance Win32_OperatingSystem
Write-Host ('free RAM GB: ' + [math]::Round($os.FreePhysicalMemory/1MB, 1))
Write-Host ('msedge now: ' + (Get-Process msedge -ErrorAction SilentlyContinue | Measure-Object).Count + ' | node now: ' + (Get-Process node -ErrorAction SilentlyContinue | Measure-Object).Count)
