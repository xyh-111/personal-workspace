' Personal Workspace launcher
' Double-click this .vbs to start the dev server + open default browser
' No cmd.exe, no PowerShell, pure WScript

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' ---- paths ----
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
port      = 5173
url       = "http://localhost:" & port

' ---- check node ----
nodeOk = False
On Error Resume Next
WshShell.Run "node -v", 0, True
If Err.Number = 0 Then
    ' try to read version from a temp run
    Set exec = WshShell.Exec("node -v")
    If Not exec.StdOut.AtEndOfStream Then nodeVer = exec.StdOut.ReadLine()
    If Len(nodeVer) > 0 Then nodeOk = True
End If
On Error GoTo 0

If Not nodeOk Then
    MsgBox "Node.js not found." & vbCrLf & vbCrLf & _
           "Please install Node.js 18+ from https://nodejs.org/", _
           vbCritical, "Personal Workspace"
    WScript.Quit 1
End If

' ---- npm install if needed ----
If Not fso.FolderExists(fso.BuildPath(scriptDir, "node_modules")) Then
    MsgBox "First run detected. Installing dependencies...", vbInformation, "Personal Workspace"
    WshShell.CurrentDirectory = scriptDir
    rc = WshShell.Run("npm install --no-audit --no-fund", 1, True)
    If rc <> 0 Then
        MsgBox "npm install failed. Run manually: npm install", vbCritical, "Personal Workspace"
        WScript.Quit 1
    End If
End If

' ---- check if already running ----
alreadyUp = False
On Error Resume Next
Set http = CreateObject("MSXML2.XMLHTTP")
http.Open "GET", url, False
http.Send
If http.Status = 200 Then alreadyUp = True
On Error GoTo 0

If alreadyUp Then
    WshShell.Run url, 1, False
    WScript.Quit 0
End If

' ---- start vite (visible window so user can see logs & stop it) ----
WshShell.CurrentDirectory = scriptDir
viteCmd = "node node_modules\vite\bin\vite.js --host --port " & port
WshShell.Run viteCmd, 1, False   ' 1 = normal window, False = don't wait

' ---- wait up to 25s for ready ----
maxWait = 25
Set http = CreateObject("MSXML2.XMLHTTP")
For i = 1 To maxWait
    WScript.Sleep 1000
    On Error Resume Next
    http.Open "GET", url, False
    http.Send
    If http.Status = 200 Then
        On Error GoTo 0
        WshShell.Run url, 1, False
        MsgBox "Personal Workspace started successfully." & vbCrLf & _
               "  " & url & vbCrLf & vbCrLf & _
               "Close the Vite window to stop the server.", _
               vbInformation, "Personal Workspace"
        WScript.Quit 0
    End If
    On Error GoTo 0
Next

' timeout
MsgBox "Server did not start after " & maxWait & "s." & vbCrLf & vbCrLf & _
       "Try running manually:" & vbCrLf & _
       "  cd /d " & scriptDir & vbCrLf & _
       "  npm run dev", _
       vbExclamation, "Personal Workspace"
