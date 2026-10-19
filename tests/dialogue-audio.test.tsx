import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {DialogueAudio,audioKey,dialogueText,readAudioPreferences,voiceStyle,MUSIC_PLAYLISTS,type VoiceRole} from '../src/dialogueAudio';
import {musicForScene,narrationForScene} from '../src/sceneAudio';
import {StoryScene} from '../src/StoryExperience';
import {newCampaign,dispatchCampaign} from '../src/campaign';
import fs from 'node:fs';
import {INTERLUDES,PREP_LINES} from '../src/narrative';
class FakeAudio{
 static all:FakeAudio[]=[];volume=1;loop=false;preload='';playbackRate=1;preservesPitch=true;paused=true;onended:(()=>void)|null=null;onerror:(()=>void)|null=null;
 constructor(public src:string){FakeAudio.all.push(this);}
 play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
beforeEach(()=>{FakeAudio.all=[];vi.stubGlobal('Audio',FakeAudio);vi.stubGlobal('document',{hidden:false});vi.stubGlobal('window',{});vi.stubGlobal('localStorage',{getItem:()=>null,setItem:vi.fn()});vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({})}));});
afterEach(()=>{vi.unstubAllGlobals();});
describe('对白语音与配乐',()=>{
 it('桌面动态台词应用角色音区，取消后迟到的合成结果不能播放',async()=>{
  window.yutangjiVoice={speak:async()=>'data:audio/wav;base64,UklGR',cancel:vi.fn()};const a=new DialogueAudio();a.unlock();const playing=a.say('今天一斤十八元。','zhou');await flush();const clip=FakeAudio.all.at(-1)!;expect(clip.preservesPitch).toBe(false);expect(clip.playbackRate).toBe(voiceStyle('zhou').renderPitch);clip.onended!();await playing;
  let finish!:(s:string)=>void;window.yutangjiVoice.speak=()=>new Promise<string>(r=>{finish=r;});const pending=a.say('旧的报价。','zhou');await flush();a.cancel();const count=FakeAudio.all.length;finish('data:audio/wav;base64,UklGR');await pending;expect(FakeAudio.all.length).toBe(count);
 });
 it('八个角色具有不同的音色参数，桌面与网页共用人物设定',()=>{
  const roles:VoiceRole[]=['chen','lan','ze','lin','zhou','male','female','narrator'];
  expect(new Set(roles.map(r=>JSON.stringify(voiceStyle(r)))).size).toBe(8);
  expect(new Set(roles.map(r=>{const p=voiceStyle(r);return [p.voice,p.sapiRate,p.sapiPitch].join(':');})).size).toBe(8);
  expect(JSON.parse(fs.readFileSync(new URL('../desktop/voiceProfiles.json',import.meta.url),'utf8'))).toEqual(Object.fromEntries(roles.map(r=>[r,voiceStyle(r)])));
 });
 it('每类音乐有两首有效曲目；播完轮换，静音与旧曲回调不会重新播放',()=>{
  for(const tracks of Object.values(MUSIC_PLAYLISTS)){expect(new Set(tracks).size).toBe(2);for(const name of tracks)expect(fs.existsSync(new URL('../public/audio/music/'+name+'.wav',import.meta.url))).toBe(true);}
  const a=new DialogueAudio();a.setMood('pond');a.unlock();const first=FakeAudio.all.at(-1)!;first.onended!();const next=FakeAudio.all.at(-1)!;expect(next.src).not.toBe(first.src);expect(next.paused).toBe(false);
  a.setMood('rain');const rain=FakeAudio.all.at(-1)!;next.onended!();expect(FakeAudio.all.at(-1)).toBe(rain);expect(next.paused).toBe(true);
  a.setPreferences({music:false});const count=FakeAudio.all.length;rain.onended!();expect(FakeAudio.all.length).toBe(count);a.setPreferences({music:true});expect(FakeAudio.all.at(-1)!.src).toContain('rain-b');a.leave();a.resumeMusic();expect(FakeAudio.all.every(x=>x.paused)).toBe(true);
 });
 it('后台暂停后恢复音乐；离开故事后不因返回前台而响起',()=>{
  const a=new DialogueAudio();a.setMood('evening');a.unlock();a.suspend();expect(FakeAudio.all.every(x=>x.paused)).toBe(true);a.resumeMusic();expect(FakeAudio.all.at(-1)!.paused).toBe(false);a.leave();a.resumeMusic();expect(FakeAudio.all.every(x=>x.paused)).toBe(true);
 });
 it('玩家、独立旁白、NPC按顺序播放，取消后旁白不能追加旧台词',async()=>{
  const calls:string[]=[];window.yutangjiVoice={speak:async(text,role)=>{calls.push(role+':'+text);return true;},cancel:vi.fn()};
  const a=new DialogueAudio();a.unlock();a.answer('我去塘边。','male');await a.say('来了啊。','chen','','天色暗了。');expect(calls).toEqual(['male:我去塘边。','narrator:天色暗了。','chen:来了啊。']);
  let finish!:(v:boolean)=>void;window.yutangjiVoice.speak=vi.fn(()=>new Promise<boolean>(r=>{finish=r;}));const pending=a.say('不应读到这句。','chen','','旁白被打断。');await flush();a.cancel();finish(true);await pending;expect(window.yutangjiVoice.speak).toHaveBeenCalledTimes(1);
 });
 it('病害和不同结局匹配不同音乐，音景选择不改变游戏状态',()=>{
  const g=newCampaign(),before=JSON.stringify(g);expect(musicForScene(g,'pond-dawn','chen')).toBe('pond');expect(musicForScene(g,'pond-rain','ze')).toBe('rain');expect(musicForScene(g,'pond-dawn','zhou')).toBe('market');
  const sick={...g,health:{...g.health,pending:true}} as typeof g;expect(musicForScene(sick,'pond-dawn','lan')).toBe('disease');
  expect(musicForScene({...g,phase:'ended',result:{success:true}} as typeof g,'ending','chen')).toBe('success');expect(musicForScene({...g,phase:'ended',result:{success:false}} as typeof g,'ending','chen')).toBe('loss');expect(JSON.stringify(g)).toBe(before);
 });
 it('开场、准备和人物支线有七个角色音色，旁白单独随包提供',()=>{
  const bank=JSON.parse(fs.readFileSync(new URL('../public/audio/voices/manifest.json',import.meta.url),'utf8'));
  for(const raw of [...PREP_LINES,...INTERLUDES.flatMap(c=>[c.text,...c.options.map(o=>o.reply)]),narrationForScene('pond-dawn')]){const text=dialogueText(raw),entry=bank[audioKey(text)];expect(entry,text).toBeDefined();expect(entry.text).toBe(text);for(const voice of ['chen','lan','ze','lin','zhou','male','female','narrator'])expect(fs.existsSync(new URL('../public/audio/voices/'+entry.files[voice],import.meta.url))).toBe(true);}
 });
 it('只去掉叙述包装，保留台词中的引用信息',()=>{
  expect(dialogueText('陈伯点点头：“别急，先看水。”')).toBe('别急，先看水。');
  expect(dialogueText('“可以问我。”她说，“最后你来决定。”')).toBe('可以问我。最后你来决定。');
  expect(dialogueText('最近的记录是“平稳”。今天怎么安排？')).toBe('最近的记录是平稳。今天怎么安排？');
 });
 it('损坏或越界音量偏好不会破坏游戏',()=>{expect(readAudioPreferences({getItem:()=>'{broken'}).voice).toBe(true);expect(readAudioPreferences({getItem:()=>'{"volume":9,"voice":false}'})).toMatchObject({volume:1,voice:false});});
 it('尚未交互时不自动发声；语音不能调用经营动作',async()=>{const a=new DialogueAudio();a.setMood('pond');await a.say('先看水。','chen');expect(FakeAudio.all.every(x=>x.paused)).toBe(true);expect(fetch).not.toHaveBeenCalled();});
 it('播放内置台词时压低音乐，结束后恢复；静音停止对白',async()=>{
  const line='先把这口塘看一遍。';vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({[audioKey(line)]:{text:line,files:{chen:'test.wav'}}})} as Response);
  const a=new DialogueAudio();a.setMood('pond');a.unlock();const promise=a.say(line,'chen');await flush();const music=FakeAudio.all.find(x=>x.src.includes('/music/'))!,voice=FakeAudio.all.find(x=>x.src.endsWith('test.wav'))!;expect(voice.playbackRate).toBe(1);expect(music.volume).toBeCloseTo(.28*.22);voice.onended!();await promise;expect(music.volume).toBe(.28);
  const another=a.say(line,'chen');await flush();a.setPreferences({voice:false});await another;expect(FakeAudio.all.at(-1)!.paused).toBe(true);
 });
 it('快速选择取消旧句，旧音频结束不能覆盖新句或恢复音乐',async()=>{
  const first='先把这口塘看一遍。',second='我们接着看看设备。';vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>Object.fromEntries([first,second].map(text=>[audioKey(text),{text,files:{chen:audioKey(text)+'.wav',ze:audioKey(text)+'.wav'}}]))} as Response);
  const a=new DialogueAudio();a.setMood('pond');a.unlock();const p1=a.say(first,'chen');await flush();const old=FakeAudio.all.at(-1)!;const p2=a.say(second,'ze');await flush();expect(old.paused).toBe(true);old.onended!();expect(await p1).toBe('cancelled');expect(FakeAudio.all.find(x=>x.src.includes('/music/'))!.volume).toBeCloseTo(.28*.22);FakeAudio.all.at(-1)!.onended!();await p2;expect(a.voiceError).toBe(false);
 });
 it('没有中文语音时保留字幕，离开页面停止音乐与对白',async()=>{const a=new DialogueAudio();a.unlock();await a.say('今天报价变化了。','zhou');expect(a.voiceError).toBe(true);a.leave();expect(FakeAudio.all.every(x=>x.paused)).toBe(true);});
 it('玩家回答先读一次，再读NPC回复；不重复保存或推进游戏',async()=>{
  const calls:string[]=[];window.yutangjiVoice={speak:async(text,role)=>{calls.push(role+':'+text);return true;},cancel:vi.fn()};const a=new DialogueAudio();a.unlock();a.answer('“我先看看水。”','female');await a.say('小满，跟我来。','lan','小满');expect(calls).toEqual(['female:我先看看水。','lan:你，跟我来。']);await a.say('跟我来。','lan');expect(calls).toHaveLength(3);
 });
 it('画面只保留对白和回答，删除旁白、效果提示和选项说明但不改分支',()=>{
  const g=dispatchCampaign(newCampaign(),{type:'register',name:'小满',gender:'female'},'reg'),original=JSON.stringify(g),noop=()=>{};
  const html=renderToStaticMarkup(<StoryScene g={g} disabled={false} onAction={async()=>true} onRestart={noop} onExport={noop} onHome={noop} onSave={noop}/>);
  expect(html).toContain('钥匙给你');expect(html).toContain('我想先把这一造稳稳做完');expect((html.match(/class="dialogue-choice"/g)||[]).length).toBe(3);expect(html).not.toContain('陈伯会记住');expect(html).not.toContain('我把行李放在塘屋门口');expect(html).not.toContain('decision-effects');expect(html).not.toContain('正在对我说');expect(html).toContain('背景音乐');expect(JSON.stringify(g)).toBe(original);
 });
});
