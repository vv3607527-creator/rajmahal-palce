Set-Location 'C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE'
$dir = 'C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE'
$zombies = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*--headless*' }
$zombies | ForEach-Object { Write-Host ('killing headless edge PID ' + $_.ProcessId); Invoke-CimMethod -Query ("SELECT * FROM Win32_Process WHERE ProcessId=" + $_.ProcessId) -MethodName Terminate | Out-Null }
Start-Sleep -Seconds 2
$up = $false
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 3
  if ($r.StatusCode -eq 200) { $up = $true }
} catch { $up = $false }
if (-not $up) {
  Write-Host 'server down -> restarting via serve-hidden.vbs'
  wscript.exe scripts\serve-hidden.vbs
  Start-Sleep -Seconds 3
}
if (Test-Path 'playwright-report.txt') { Remove-Item 'playwright-report.txt' -Force }
$p = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = 'cmd /c node scripts\deep-test.js > test-report.txt 2>&1'
  CurrentDirectory = $dir
}
Write-Host ('launched deep-test PID ' + $p.ProcessId + ' rc ' + $p.ReturnValue)
Start-Sleep -Seconds 24
if (Test-Path 'test-report.txt') { Write-Host 'DEEP REPORT READY' } else { Write-Host 'still running...' }


