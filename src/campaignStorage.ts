import {hash,validateCampaign,type Campaign} from './campaign';
import {HEALTH_RULES,LEGACY_HEALTH_RULES} from './health';
export const CAMPAIGN_DB='yutangji-earthen-120-v1';
export type Profile={version:1;awards:{id:string;day:number;profit:number;mode:'greenhouse'}[]};
export type Bundle={game:Campaign;profile:Profile};
export type Slot='auto'|'backup'|'manual';
export type RecordSlot={slot:Slot;savedAt:string;data:string};
export const emptyProfile=():Profile=>({version:1,awards:[]});
export function validateProfile(p:Profile){if(!p||p.version!==1||!Array.isArray(p.awards)||p.awards.length>10000||p.awards.some(x=>!x||typeof x.id!=='string'||!x.id.endsWith(':settlement')||x.mode!=='greenhouse'||!Number.isInteger(x.day)||x.day<0||x.day>120||!Number.isInteger(x.profit)||x.profit<0||x.profit>1e9)||new Set(p.awards.map(x=>x.id)).size!==p.awards.length)throw Error('资格记录损坏，请恢复备份。');}
export function mergeProfile(a:Profile,b:Profile):Profile {validateProfile(a);validateProfile(b);return {version:1,awards:[...new Map([...a.awards,...b.awards].map(x=>[x.id,x])).values()]};}
export function reward(game:Campaign,profile:Profile):Profile {validateCampaign(game);validateProfile(profile);const r=game.result;if(!r?.success)return structuredClone(profile);return mergeProfile(profile,{version:1,awards:[{id:r.id,mode:'greenhouse',day:game.day,profit:r.profit}]});}
export function encodeCampaign(bundle:Bundle){validateCampaign(bundle.game);validateProfile(bundle.profile);const payload=JSON.stringify(bundle);return JSON.stringify({format:'yutangji-campaign',version:2,checksum:hash(payload).toString(16),payload},null,2);}
export function decodeCampaign(text:string):Bundle {
  if(text.length>4_000_000)throw Error('文件超过存档大小限制。');
  let o;try{o=JSON.parse(text);}catch{throw Error('文件不是有效存档。');}
  if(o?.format==='yutangji-save')throw Error('这是84天旧版存档，请使用“旧版84天存档入口”。不会修改原文件。');
  if(o?.format!=='yutangji-campaign'||o.version!==2||typeof o.payload!=='string')throw Error('不支持的存档版本，请保留原文件。');
  if(hash(o.payload).toString(16)!==o.checksum)throw Error('校验失败，存档可能损坏。请恢复备份。');
  let b;try{b=JSON.parse(o.payload);}catch{throw Error('存档内容损坏。');}validateCampaign(b?.game);validateProfile(b?.profile);
  // 已结算的历史记录不重判；进行中的0.6.0病害档升级胜负规则，原文件仍可恢复。
  if(b.game.rules===LEGACY_HEALTH_RULES&&b.game.phase!=='ended'){b.game.rules=HEALTH_RULES;validateCampaign(b.game);}
  return b;
}
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(CAMPAIGN_DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('saves',{keyPath:'slot'});r.result.createObjectStore('meta');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('请关闭其他旧页面再重试。'));});}
function recoverProfile(raw:unknown,records:RecordSlot[],incoming?:Profile):{profile:Profile;recovered:boolean}{
  try {const profile=raw===undefined?emptyProfile():raw as Profile;validateProfile(profile);return {profile,recovered:false};}
  catch {
    const candidates:Profile[]=[];
    for(const record of records){try{const b=decodeCampaign(record.data);candidates.push(reward(b.game,b.profile));}catch{/* 坏档不是资格证据。 */}}
    if(incoming){validateProfile(incoming);candidates.push(incoming);}
    if(!candidates.length)throw Error('资格索引损坏，且本地没有有效备份。请导入此前导出的完整存档，原数据已保留。');
    return {profile:candidates.reduce(mergeProfile,emptyProfile()),recovered:true};
  }
}
export async function loadCampaign():Promise<{records:RecordSlot[];profile:Profile;recovered:boolean}>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(['saves','meta'],'readonly');const saves=tx.objectStore('saves').getAll(),p=tx.objectStore('meta').get('profile');tx.oncomplete=()=>{db.close();try{resolve({records:saves.result,...recoverProfile(p.result,saves.result)});}catch(e){reject(e);}};tx.onerror=()=>{db.close();reject(tx.error);};});}
export async function persistCampaign(bundle:Bundle,slot:Slot='auto'):Promise<Profile>{validateCampaign(bundle.game);validateProfile(bundle.profile);const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['saves','meta'],'readwrite'),saves=tx.objectStore('saves'),meta=tx.objectStore('meta');let next=bundle.profile,problem:unknown;
  const p=meta.get('profile');p.onsuccess=()=>{const all=saves.getAll();all.onsuccess=()=>{try{const recovered=recoverProfile(p.result,all.result,bundle.profile);next=reward(bundle.game,mergeProfile(bundle.profile,recovered.profile));const data=encodeCampaign({game:bundle.game,profile:next});
    const put=()=>saves.put({slot,savedAt:new Date().toISOString(),data});
    if(slot==='auto'){const prev=saves.get('auto');prev.onsuccess=()=>{if(prev.result){try{decodeCampaign(prev.result.data);saves.put({...prev.result,slot:'backup'});}catch{/* 损坏自动档不覆盖有效备份。 */}}put();};}else put();
    if(recovered.recovered)meta.put({raw:p.result,savedAt:new Date().toISOString()},'damaged-profile');
    meta.put(next,'profile');
  }catch(e){problem=e;tx.abort();}};};
  tx.oncomplete=()=>{db.close();resolve(next);};tx.onabort=tx.onerror=()=>{db.close();reject(problem??tx.error??Error('保存失败'));};
});}
