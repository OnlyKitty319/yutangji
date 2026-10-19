[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
$ErrorActionPreference='Stop'
try {
  $taskSpeech=[Console]::In.ReadToEnd() | ConvertFrom-Json
  $taskRole=[string]$taskSpeech.role
  $taskProfile=$taskSpeech.profile
  $taskName=@{kangkang='Kangkang';huihui='Huihui';yaoyao='Yaoyao'}[[string]$taskProfile.voice]
  if(!$taskName){exit 1}
  $taskToken=New-Object -ComObject SAPI.SpObjectToken
  $taskToken.SetId('HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_zhCN_'+$taskName+'M')
  $taskSpeaker=New-Object -ComObject SAPI.SpVoice
  $taskSpeaker.Voice=$taskToken
  $taskStream=New-Object -ComObject SAPI.SpMemoryStream
  $taskStream.Format.Type=18
  $taskSpeaker.AudioOutputStream=$taskStream
  $taskSpeaker.Rate=[int]$taskProfile.sapiRate
  # 仅固定角色参数进入XML属性，用户文本全部转义，不能注入语音标记。
  $taskEscaped=[Security.SecurityElement]::Escape([string]$taskSpeech.text)
  $taskXml='<pitch absmiddle="'+[int]$taskProfile.sapiPitch+'">'+$taskEscaped+'</pitch>'
  $null=$taskSpeaker.Speak($taskXml,8)
  [byte[]]$taskPcm=$taskStream.GetData()
  # 内存PCM包装成16kHz/16位/单声道WAV，取消时不留下临时录音文件。
  $taskMemory=[IO.MemoryStream]::new()
  $taskWriter=[IO.BinaryWriter]::new($taskMemory)
  $taskWriter.Write([Text.Encoding]::ASCII.GetBytes('RIFF'));$taskWriter.Write([int](36+$taskPcm.Length))
  $taskWriter.Write([Text.Encoding]::ASCII.GetBytes('WAVEfmt '));$taskWriter.Write([int]16)
  $taskWriter.Write([int16]1);$taskWriter.Write([int16]1);$taskWriter.Write([int]16000);$taskWriter.Write([int]32000)
  $taskWriter.Write([int16]2);$taskWriter.Write([int16]16);$taskWriter.Write([Text.Encoding]::ASCII.GetBytes('data'))
  $taskWriter.Write([int]$taskPcm.Length);$taskWriter.Write($taskPcm);$taskWriter.Flush()
  [Console]::Out.Write([Convert]::ToBase64String($taskMemory.ToArray()))
  $taskWriter.Dispose();$taskMemory.Dispose()
} catch { exit 1 }
