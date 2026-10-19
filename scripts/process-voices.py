"""角色音色后处理：实际重采样改变音高/音区，防止系统忽略音色参数。"""
from pathlib import Path
import json,wave,numpy as np
root=Path(__file__).resolve().parent.parent;d=root/'public/audio/voices'
profiles=json.loads((root/'src/voiceProfiles.json').read_text(encoding='utf8'))
manifest=json.loads((d/'manifest.json').read_text(encoding='utf8'));old=[]
for row in manifest.values():
 for role,name in list(row['files'].items()):
  if '-v2-' in name:continue
  source=d/name;destination=d/name.replace('-v1-','-v2-')
  assert source.resolve().parent==d.resolve() and '-v1-' in name
  with wave.open(str(source)) as w:
   assert w.getsampwidth()==2 and w.getnchannels()==1
   sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2')
  ratio=profiles[role]['renderPitch'];positions=np.arange(0,len(x)-1,ratio)
  y=np.interp(positions,np.arange(len(x)),x).round().clip(-32767,32767).astype('<i2')
  assert len(y)>100 and np.max(np.abs(y.astype(np.int32)))>100
  with wave.open(str(destination),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(y.tobytes())
  row['files'][role]=destination.name;old.append(source)
(d/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf8')
# 仅移除已成功转换的本次生成中间文件；旧版本分享包保留。
for path in old:path.unlink()
print(f'已处理{len(old)}个角色音频')
