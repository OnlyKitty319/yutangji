$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskLines=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'audio-lines.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$taskOutput=Join-Path $taskRoot 'public/audio/voices'
$taskManifest=@{}
foreach($taskLine in $taskLines){$taskManifest[$taskLine.key]=@{text=$taskLine.text;files=@{}}}
$taskProfiles=Get-Content -LiteralPath (Join-Path $taskRoot 'src/voiceProfiles.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach($taskRole in @('chen','lan','ze','lin','zhou','male','female','narrator')){
 $taskProfile=$taskProfiles.$taskRole
 $taskName=@{kangkang='Kangkang';huihui='Huihui';yaoyao='Yaoyao'}[[string]$taskProfile.voice]
 $taskVoice=New-Object -ComObject SAPI.SpVoice
 $taskToken=New-Object -ComObject SAPI.SpObjectToken
 $taskToken.SetId('HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_zhCN_'+$taskName+'M')
 $taskVoice.Voice=$taskToken
 $taskVoice.Rate=[int]$taskProfile.sapiRate
 foreach($taskLine in $taskLines){
  $taskFile=$taskRole+'-v1-'+$taskLine.key+'.wav'
  $taskPath=Join-Path $taskOutput $taskFile
  if(!(Test-Path -LiteralPath $taskPath)){
   $taskStream=New-Object -ComObject SAPI.SpFileStream
   $taskStream.Format.Type=18
   $taskStream.Open($taskPath,3,$false)
   $taskVoice.AudioOutputStream=$taskStream
   $taskEscaped=[Security.SecurityElement]::Escape([string]$taskLine.text)
   $null=$taskVoice.Speak(('<pitch absmiddle="'+[int]$taskProfile.sapiPitch+'">'+$taskEscaped+'</pitch>'),8)
   $taskStream.Close()
  }
  $taskManifest[$taskLine.key].files[$taskRole]=$taskFile
 }
 Write-Output ($taskRole+': '+$taskLines.Count+' clips')
}
$taskJson=$taskManifest | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText((Join-Path $taskOutput 'manifest.json'),$taskJson,[Text.UTF8Encoding]::new($false))
