import {spokenNotation} from './textNotation';
import profiles from './voiceProfiles.json';
export type VoiceRole=keyof typeof profiles;
export type MusicMood='pond'|'rain'|'evening'|'disease'|'market'|'success'|'loss';
export const MUSIC_PLAYLISTS:Record<MusicMood,string[]>={pond:['pond','pond-b'],rain:['rain','rain-b'],evening:['evening','evening-b'],disease:['disease','disease-b'],market:['market','market-b'],success:['success','success-b'],loss:['loss','loss-b']};
export type AudioPreferences={voice:boolean;music:boolean;subtitles:boolean;volume:number};
export const DEFAULT_AUDIO:AudioPreferences={voice:true,music:true,subtitles:true,volume:.28};
export const voiceStyle=(role:VoiceRole)=>profiles[role];
export function dialogueText(raw:string){
 const quoted=[...raw.matchAll(/“([^”]+)”/g)].map(m=>m[1]);
 const narrated=/^(?:陈伯|许岚|阿泽|林婶|周启|她|他)[^“]{0,35}[：“]/.test(raw)||raw.startsWith('“');
 return (quoted.length&&narrated?quoted.join(''):raw).replace(/[“”]/g,'').replace(/→|↗/g,'').trim();
}
export const audioKey=(text:string)=>{let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16);};
export function readAudioPreferences(storage?:Pick<Storage,'getItem'>):AudioPreferences{
 try{const p=JSON.parse(storage?.getItem('yutangji-audio-v1')||'{}');return{voice:typeof p.voice==='boolean'?p.voice:true,music:typeof p.music==='boolean'?p.music:true,subtitles:typeof p.subtitles==='boolean'?p.subtitles:true,volume:Number.isFinite(p.volume)?Math.min(1,Math.max(0,p.volume)):.28};}catch{return{...DEFAULT_AUDIO};}
}
declare global {interface Window{yutangjiVoice?:{speak:(text:string,role:VoiceRole)=>Promise<boolean|string>;cancel:()=>void};}}
type Bank=Record<string,{text:string;files:Record<string,string>}>;
// 播放状态独立于游戏：读完、静音、重播都不推进时间或执行选择。
export class DialogueAudio {
 preferences:AudioPreferences={...DEFAULT_AUDIO};unlocked=false;voiceError=false;
 private generation=0;private clip?:HTMLAudioElement;private music?:HTMLAudioElement;private mood:MusicMood='pond';private listeners=new Set<()=>void>();private bank:Promise<Bank>|undefined;private pendingAnswer?:{text:string;role:VoiceRole};private speaking=false;private finish?:()=>void;
 subscribe=(f:()=>void)=>{this.listeners.add(f);return()=>{this.listeners.delete(f);};};
 private changed(){this.listeners.forEach(f=>f());}
 private active=false;private musicIndex:Partial<Record<MusicMood,number>>={};
 resumeMusic(){this.updateMusic();}
 init(){try{this.preferences=readAudioPreferences(window.localStorage);}catch{}this.changed();}
 unlock(){if(this.unlocked)return;this.unlocked=true;this.updateMusic();this.changed();}
 setPreferences(p:Partial<AudioPreferences>){this.preferences={...this.preferences,...p};try{localStorage.setItem('yutangji-audio-v1',JSON.stringify(this.preferences));}catch{}if(!this.preferences.voice)this.cancel();this.updateMusic();this.changed();}
 answer(text:string,role:VoiceRole){this.cancel();this.pendingAnswer={text:dialogueText(text),role};}
 cancel(){this.generation++;this.clip?.pause();this.clip=undefined;this.finish?.();this.finish=undefined;window.yutangjiVoice?.cancel();window.speechSynthesis?.cancel();this.speaking=false;this.updateMusic();}
 leave(){this.active=false;this.cancel();this.pendingAnswer=undefined;this.music?.pause();}
 suspend(){this.cancel();this.pendingAnswer=undefined;this.music?.pause();}
 setMood(mood:MusicMood){this.active=true;if(this.mood!==mood||!this.music){this.mood=mood;this.startTrack();}this.updateMusic();}
 private startTrack(){
  this.music?.pause();const tracks=MUSIC_PLAYLISTS[this.mood],index=this.musicIndex[this.mood]??0;
  const clip=new Audio(`./audio/music/${tracks[index%tracks.length]}.wav`);this.music=clip;clip.preload='none';
  // 每曲播完换下一曲；失效回调、离开页面或静音不能偷偷启动新音乐。
  clip.onended=()=>{if(this.music!==clip)return;this.musicIndex[this.mood]=(index+1)%tracks.length;if(this.active&&this.preferences.music&&!document.hidden){this.startTrack();this.updateMusic();}else this.music=undefined;};
 }
 private updateMusic(){if(!this.music&&this.active)this.startTrack();if(!this.music)return;this.music.volume=this.preferences.volume*(this.speaking?.22:1);if(this.active&&this.unlocked&&this.preferences.music&&!document.hidden)void this.music.play().catch(()=>{});else this.music.pause();}
 async say(text:string,role:VoiceRole,playerName='',narration=''){
  const answer=this.pendingAnswer;this.pendingAnswer=undefined;this.cancel();if(!this.unlocked||!this.preferences.voice||document.hidden)return 'silent' as const;
  const generation=this.generation;this.voiceError=false;this.speaking=true;this.updateMusic();this.changed();
  const lines=[...(answer?[answer]:[]),...(narration?[{text:narration,role:'narrator' as VoiceRole}]:[]),{text:dialogueText(text),role}];
  try{for(const line of lines){if(generation!==this.generation)break;const spoken=playerName?line.text.replaceAll(playerName,'你'):line.text;if(spoken&&!await this.play(spoken,line.role,generation))throw Error('speech unavailable');}}
  catch{if(generation===this.generation){this.voiceError=true;this.changed();}}
  finally{if(generation===this.generation){this.speaking=false;this.updateMusic();}}
  return generation!==this.generation?'cancelled' as const:this.voiceError?'failed' as const:'finished' as const;
 }
 private async play(text:string,role:VoiceRole,generation:number):Promise<boolean>{
  this.bank??=fetch('./audio/voices/manifest.json',{signal:AbortSignal.timeout(8000)}).then(r=>r.ok?r.json():{}).catch(()=>({}));
  const bank=await this.bank;if(generation!==this.generation)return true;
  const style=voiceStyle(role),entry=bank[audioKey(text)];
  if(entry?.text===text&&entry.files[role]){
   const okay=await new Promise<boolean>(resolve=>{const clip=new Audio('./audio/voices/'+entry.files[role]);this.clip=clip;const done=(okay:boolean)=>{clearTimeout(timer);resolve(okay);};const timer=setTimeout(()=>{clip.pause();done(false);},120000);this.finish=()=>done(true);clip.onended=()=>done(true);clip.onerror=()=>done(false);void clip.play().catch(()=>done(false));});
   if(okay||generation!==this.generation)return true;
  }
  text=spokenNotation(text);
  if(window.yutangjiVoice){
   const result=await window.yutangjiVoice.speak(text,role);if(generation!==this.generation)return true;
   if(typeof result==='string'){
    const okay=await new Promise<boolean>(resolve=>{const clip=new Audio(result);this.clip=clip;clip.preservesPitch=false;clip.playbackRate=style.renderPitch;const done=(v:boolean)=>{clearTimeout(timer);resolve(v);};const timer=setTimeout(()=>{clip.pause();done(false);},120000);this.finish=()=>done(true);clip.onended=()=>done(true);clip.onerror=()=>done(false);void clip.play().catch(()=>done(false));});
    if(okay||generation!==this.generation)return true;
   }else if(result)return true;
  }
  if(!window.speechSynthesis)return false;
  // 动态报价、名字和检测数字由系统中文语音朗读。无中文音色时保留字幕。
  const synth=window.speechSynthesis;let voices=synth.getVoices();
  if(!voices.length){await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);synth.removeEventListener('voiceschanged',done);resolve();};const timer=setTimeout(done,1200);synth.addEventListener('voiceschanged',done);});voices=synth.getVoices();}
  if(generation!==this.generation)return true;
  const zh=voices.filter(v=>/^zh|cmn/i.test(v.lang));if(!zh.length)return false;
  const preferred=zh.find(v=>v.name.toLowerCase().includes(style.voice))??zh.find(v=>v.localService)??zh[0];
  // 短句顺序播放，取消后旧回调不能继续排队。
  const chunks=text.match(/[^。！？；]+[。！？；]?/g)||[text];
  for(const chunk of chunks){if(generation!==this.generation)return true;const okay=await new Promise<boolean>(resolve=>{const u=new SpeechSynthesisUtterance(chunk);u.lang='zh-CN';u.voice=preferred;u.rate=style.rate;u.pitch=style.pitch;const done=(okay:boolean)=>{clearTimeout(timer);resolve(okay);};const timer=setTimeout(()=>{synth.cancel();done(false);},Math.max(10000,Math.min(60000,chunk.length*500)));u.onend=()=>done(true);u.onerror=()=>done(false);this.finish=()=>done(true);synth.speak(u);});if(!okay)return false;}return true;
 }
}
export const dialogueAudio=new DialogueAudio();
