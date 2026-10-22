' ============================================================
'  THE RAJMAHAL PALACE - hidden server launcher
'  Starts scripts\serve.js with NO visible window.
'  Run:   wscript.exe scripts\serve-hidden.vbs
'  Stop:  taskkill /IM node.exe /F   (or just tell Claude / restart)
' ============================================================
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE"
sh.Run "node ""C:\Users\venkatesh\Documents\RAJMAHAL PALACE WEBSITE\scripts\serve.js""", 0, False
