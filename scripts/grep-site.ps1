param([string]$Pattern, [string]$File = 'main.js')
Set-Location 'C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE'
Select-String -Path $File -Pattern $Pattern | ForEach-Object {
  Write-Host ($_.LineNumber.ToString() + ': ' + $_.Line.Trim())
}
