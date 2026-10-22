$dir = 'C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE'
Set-Location $dir
if (Test-Path 'push-log.txt') { Remove-Item 'push-log.txt' -Force }
# launcher exits immediately - the WMI child (git push) must never be in a killed process tree
$p = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = 'cmd /c set GIT_TERMINAL_PROMPT=0&& set GIT_TRACE=1&& set GIT_CURL_VERBOSE=1&& git -C "C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE" push -u origin main > push-log.txt 2>&1'
  CurrentDirectory = $dir
}
Write-Host ('push launched PID ' + $p.ProcessId + ' rc ' + $p.ReturnValue + ' - polling push-log.txt from now on')
