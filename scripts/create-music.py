"""原创48秒循环配乐；确定性合成，无外部采样或商业歌曲。"""
from pathlib import Path
import numpy as np, wave, json
out=Path(__file__).resolve().parent.parent/'public/audio/music';out.mkdir(parents=True,exist_ok=True)
rate=22050;duration=48;size=rate*duration
def freq(note):return 440*2**((note-69)/12)
def score(name,chords,melody,speed,brightness,bar_seconds=3,pulse=0):
 signal=np.zeros((size,2),np.float64)
 def note(midi,start,length,amp,pan,pad=False):
  n=min(int(length*rate),size-int(start*rate));t=np.arange(n)/rate
  if n<=0:return
  f=freq(midi)
  if pad:
   env=np.minimum(1,t/1.4)*np.minimum(1,(length-t)/1.8)
   tone=(np.sin(2*np.pi*f*t)+.15*np.sin(2*np.pi*f*2*t))*.5
  else:
   env=(1-np.exp(-t*90))*np.exp(-t/(length*.23))*np.clip((length-t)/.15,0,1)
   tone=np.sin(2*np.pi*f*t)+brightness*.22*np.sin(2*np.pi*f*2.002*t)+.06*np.sin(2*np.pi*f*3*t)
  voice=tone*env*amp;offset=int(start*rate)
  signal[offset:offset+n,0]+=voice*np.sqrt((1-pan)/2);signal[offset:offset+n,1]+=voice*np.sqrt((1+pan)/2)
 for bar in range(int(duration/bar_seconds)):
  chord=chords[(bar//2)%len(chords)];start=bar*bar_seconds;beat_time=bar_seconds/4
  for j,midi in enumerate(chord):note(midi,start,bar_seconds+.7,.045,(-.5+j*.3),True)
  note(chord[0]-12,start,bar_seconds*.9,.065,0)
  for beat in range(4):
   if (bar+beat)%3:note(chord[beat%len(chord)]+12,start+beat*beat_time,1.5,.08,(-.35 if beat%2 else .35))
   if pulse:note(chord[0]-12,start+beat*beat_time,.35,pulse,0)
  if bar%2==0:
   for j,midi in enumerate(melody[(bar//2)%len(melody)]):note(midi,start+j*beat_time*speed,2.5,.09,0)
 # 轻微延迟营造空间，首尾渐变避免循环接缝爆音。
 for delay,gain in [(.19,.15),(.37,.08)]:
  shift=int(delay*rate);signal[shift:]+=signal[:-shift]*gain
 fade=np.minimum(1,np.arange(size)/rate/1.5)*np.minimum(1,(size-1-np.arange(size))/rate/1.5)
 signal*=fade[:,None];peak=float(np.max(np.abs(signal)));signal*=.55/max(peak,1e-5)
 data=np.rint(np.clip(signal,-1,1)*32767).astype('<i2')
 with wave.open(str(out/(name+'.wav')),'wb') as wav:wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes(data.tobytes())
 return {'file':name+'.wav','seconds':duration,'sampleRate':rate,'peak':float(np.max(np.abs(data.astype(float))))/32767,'rms':float(np.sqrt(np.mean((data.astype(float)/32767)**2)))}
scores={
 'pond':([[50,57,62,66],[43,55,59,62],[47,54,59,62],[45,57,61,64]],[[74,78,76],[71,74,69],[74,76,78],[76,73,69]],1.5,.7,3,0),
 'evening':([[48,55,60,64],[45,52,57,60],[41,53,57,60],[43,55,59,62]],[[72,76],[69,72],[72,69],[67,71]],2,.4,4,0),
 'rain':([[50,57,60,65],[46,53,58,62],[43,50,58,62],[45,52,57,60]],[[74,72],[70,69],[67,70],[69,72]],2,.2,3,.025),
 'disease':([[45,52,58,60],[41,48,56,59],[43,50,56,60],[40,47,53,59]],[[69,70,65],[68,64],[67,68],[65,64,60]],1.2,.15,2.4,.075),
 'market':([[48,55,59,64],[50,57,60,65],[43,55,59,62],[45,52,60,64]],[[72,76,79],[77,74,72],[71,74,79],[76,72,69]],1,.9,2.4,.035),
 'success':([[48,55,60,64],[53,60,65,69],[55,62,67,71],[48,55,64,67]],[[72,76,79,84],[81,79,77],[79,83,86],[84,79,76]],1.2,1,3,0),
 'loss':([[45,52,57,60],[41,48,53,57],[43,50,55,58],[40,47,52,56]],[[72,69],[65,64],[67,62],[64,60]],2.5,.1,4,0)
}
rows=[]
for name,(chords,melody,speed,brightness,tempo,pulse) in scores.items():
 rows.append(score(name,chords,melody,speed,brightness,tempo,pulse))
 # 第二曲另用和声顺序、旋律方向、音区与配器亮度，非同一音轨改名。
 alternate=[[n+2 for n in chord] for chord in chords[2:]+chords[:2]]
 theme=[[n-5 for n in reversed(phrase)] for phrase in reversed(melody)]
 rows.append(score(name+'-b',alternate,theme,speed*.8,brightness*.65,tempo,pulse*.7))
(out/'credits.json').write_text(json.dumps({'composition':'渔塘记原创程序合成配乐，无外部采样','tracks':rows},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(rows))
