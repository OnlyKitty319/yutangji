import {ScientificText} from './ScientificText';
import {useEffect,useReducer,useRef} from 'react';
import {dialogueAudio,dialogueText,type VoiceRole,type MusicMood} from './dialogueAudio';
import {continueWhenVisible,readingDelay} from './storyFlow';
export function DialoguePlayback({text,role,mood,identity,playerName,narration='',sceneKey='',onComplete}:{text:string;role:VoiceRole;mood:MusicMood;identity:string;playerName:string;narration?:string;sceneKey?:string;onComplete?:()=>void}){
 const [,redraw]=useReducer(n=>n+1,0);
 const lastScene=useRef('');
 const complete=useRef(onComplete);complete.current=onComplete;
 const replay=useRef<()=>void>(()=>{});const automatic=!!onComplete;
 useEffect(()=>dialogueAudio.subscribe(redraw),[]);
 useEffect(()=>{
  let active=true,run=0,cancelTimer=()=>{};
  const aside=sceneKey!==lastScene.current?narration:'';lastScene.current=sceneKey;
  const start=(intro=aside)=>{
   const current=++run;cancelTimer();dialogueAudio.setMood(mood);
   void dialogueAudio.say(text,role,playerName,intro).then(status=>{
    if(!active||current!==run||status==='cancelled'||!automatic)return;
    cancelTimer=continueWhenVisible(()=>complete.current?.(),status==='finished'?300:readingDelay(text));
   });
  };
  replay.current=()=>start(narration);
  const visibility=()=>{if(document.hidden){run++;cancelTimer();dialogueAudio.cancel();}else start('');};
  document.addEventListener('visibilitychange',visibility);start();
  return()=>{active=false;run++;cancelTimer();document.removeEventListener('visibilitychange',visibility);dialogueAudio.cancel();};
 },[text,role,mood,identity,playerName,narration,sceneKey,automatic]);
 useEffect(()=>()=>dialogueAudio.leave(),[]);
 const p=dialogueAudio.preferences;
 return <><div className="dialogue-audio" aria-label="声音控制"><button aria-label="重播对话" title="重播对话" onClick={()=>{dialogueAudio.unlock();replay.current();}}>▶</button><button aria-label="对白语音" aria-pressed={p.voice} title="对白语音" onClick={()=>{dialogueAudio.unlock();dialogueAudio.setPreferences({voice:!p.voice});replay.current();}}>{p.voice?'◖))':'◖×'}</button><button aria-label="背景音乐" aria-pressed={p.music} title="背景音乐" onClick={()=>{dialogueAudio.unlock();dialogueAudio.setPreferences({music:!p.music});}}>♫</button><button aria-label="对话字幕" aria-pressed={p.subtitles} title="对话字幕" onClick={()=>dialogueAudio.setPreferences({subtitles:!p.subtitles})}>字</button><input aria-label="音乐音量" type="range" min="0" max="1" step="0.02" value={p.volume} onChange={e=>dialogueAudio.setPreferences({volume:Number(e.target.value)})}/>{dialogueAudio.voiceError&&<span role="status" title="中文语音不可用，已保留对话字幕" aria-label="中文语音不可用，已保留对话字幕">◖!</span>}</div>{(p.subtitles||!p.voice||dialogueAudio.voiceError)&&<p className="spoken-line" aria-live="polite">{<ScientificText text={dialogueText(text)}/>}</p>}</>;
}
