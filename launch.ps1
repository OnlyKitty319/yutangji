$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gameUrl = 'http://127.0.0.1:4173'
try {
  $reply = Invoke-WebRequest -Uri "$gameUrl/health" -UseBasicParsing -TimeoutSec 2
  if ($reply.Content -eq 'yutangji-phase2') { Start-Process $gameUrl; exit 0 }
  throw 'Port 4173 is in use by another application.'
} catch {
  if ($_.Exception.Message -eq 'Port 4173 is in use by another application.') { throw }
}
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  Write-Host 'Please install Node.js 22 or newer, then launch again. https://nodejs.org/'
  exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $gameRoot 'dist/index.html'))) { throw 'Built game files are missing. Run npm ci and npm run build first.' }
$serverFile = Join-Path $gameRoot 'serve.mjs'
$gameProcess = Start-Process -FilePath $nodeCommand.Source -ArgumentList ('"' + $serverFile + '"') -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru
$gameLocal = Join-Path $gameRoot '.local'
New-Item -ItemType Directory -Path $gameLocal -Force | Out-Null
@{ processId = $gameProcess.Id; server = $serverFile } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $gameLocal 'server.json') -Encoding UTF8
for ($gameAttempt = 0; $gameAttempt -lt 20; $gameAttempt++) {
  Start-Sleep -Milliseconds 250
  try {
    $gameReply = Invoke-WebRequest -Uri "$gameUrl/health" -UseBasicParsing -TimeoutSec 1
    if ($gameReply.Content -eq 'yutangji-phase2') { Start-Process $gameUrl; exit 0 }
  } catch {}
  if ($gameProcess.HasExited) { break }
}
Write-Host 'Game server did not start. Check whether port 4173 is already in use.'
exit 1
