$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gameRecord = Join-Path $gameRoot '.local/server.json'
if (-not (Test-Path -LiteralPath $gameRecord)) { Write-Host 'No game server was started by this launcher.'; exit 0 }
$gameInfo = Get-Content -LiteralPath $gameRecord -Raw | ConvertFrom-Json
$gameExpected = Join-Path $gameRoot 'serve.mjs'
if ($gameInfo.server -ne $gameExpected) { throw 'Server path does not match this game folder.' }
$gameProcess = Get-CimInstance Win32_Process -Filter ("ProcessId = " + [int]$gameInfo.processId)
if ($gameProcess -and $gameProcess.Name -eq 'node.exe' -and $gameProcess.CommandLine.Contains($gameExpected)) {
  Stop-Process -Id ([int]$gameInfo.processId)
  Write-Host 'Game server stopped. Your browser saves remain stored.'
} else { Write-Host 'The recorded game server is no longer running.' }
Remove-Item -LiteralPath $gameRecord
