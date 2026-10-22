Set-Location 'C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE'
$dir = 'C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE'
$p = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = 'cmd /c node scripts\pw-probe2.js > probe2-out.txt 2>&1'
  CurrentDirectory = $dir
}
Write-Host ('launched PID ' + $p.ProcessId + ' rc ' + $p.ReturnValue)
Start-Sleep -Seconds 20
if (Test-Path 'probe2-out.txt') { Get-Content 'probe2-out.txt' } else { Write-Host 'not yet...' }

