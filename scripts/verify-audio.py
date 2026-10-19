from pathlib import Path
import wave,json,hashlib
import numpy as np
root=Path(__file__).resolve().parent.parent
directory=root/'public/audio/voices'
manifest=json.loads((directory/'manifest.json').read_text(encoding='utf-8'))
expected={file for row in manifest.values() for file in row['files'].values()}
# 仅清理本工具生成、已不被清单引用的WAV；不触及旧交付包和其他资源。
for path in directory.glob('*.wav'):
 if path.name not in expected and path.stem.split('-')[0] in ['kangkang','huihui','yaoyao']:
  assert path.resolve().parent==directory.resolve()
  path.unlink()
duration=0;minimum=9999;maximum=0
for name in sorted(expected):
 with wave.open(str(directory/name),'rb') as wav:
  assert wav.getsampwidth()==2
  length=wav.getnframes()/wav.getframerate();assert .1<length<120
  samples=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2')
  assert np.max(np.abs(samples.astype(np.int32)))>100,name
  duration+=length;minimum=min(minimum,length);maximum=max(maximum,length)
music=[]
for name in [m+s for m in ['pond','evening','rain','disease','market','success','loss'] for s in ['', '-b']]:
 with wave.open(str(root/'public/audio/music'/(name+'.wav')),'rb') as wav:
  a=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').reshape(-1,2)
  assert wav.getnframes()/wav.getframerate()==48
  assert abs(a[0]).max()==0 and abs(a[-1]).max()==0
  assert np.abs(a.astype(np.int32)).max()<32767
  music.append({'name':name,'seconds':48,'peak':float(np.abs(a.astype(np.int32)).max())/32767,'rms':float(np.sqrt(np.mean((a.astype(float)/32767)**2)))})
roles=['chen','lan','ze','lin','zhou','male','female','narrator']
for row in manifest.values():
 assert set(row['files'])==set(roles)
 # 同一句八个输出须实际不同，防止复制同一音频冒充角色声音。
 assert len({hashlib.sha256((directory/row['files'][r]).read_bytes()).hexdigest() for r in roles})==8
for mood in ['pond','evening','rain','disease','market','success','loss']:
 assert (root/'public/audio/music'/f'{mood}.wav').read_bytes()!=(root/'public/audio/music'/f'{mood}-b.wav').read_bytes()
report={'version':'0.8.1','uniqueLines':len(manifest),'voiceFiles':len(expected),'distinctProfiles':8,'totalVoiceSeconds':round(duration,2),'minVoiceSeconds':minimum,'maxVoiceSeconds':maximum,'nonSilentVoiceFiles':len(expected),'music':music,'listenedOnDevice':False,'browserPlaybackTested':False,'exePlaybackTested':False}
(root/'audio-verification-0.8.1.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report))
