import { hash, validateGame, type Game } from './engine';
export const DB_NAME='yutangji-phase2-v1';
export type Slot='auto'|'backup'|'manual';
export interface SaveRecord {slot:Slot; savedAt:string; data:string}
export function encode(g:Game){validateGame(g);const payload=JSON.stringify(g);return JSON.stringify({format:'yutangji-save',version:1,checksum:hash(payload).toString(16),payload},null,2);}
export function decode(text:string):Game {
  if(text.length>4_000_000)throw new Error('存档文件过大，未导入。');
  let o;try{o=JSON.parse(text);}catch{throw new Error('文件不是有效的JSON存档，现有进度未改动。');}
  if(o?.format!=='yutangji-save'||o.version!==1||typeof o.payload!=='string')throw new Error('不支持此存档格式或版本；请保留原文件。');
  if(hash(o.payload).toString(16)!==o.checksum)throw new Error('存档校验码不符，文件可能损坏。请使用备份。');
  let g:unknown;try{g=JSON.parse(o.payload);}catch{throw new Error('存档内容损坏。');}validateGame(g);return g;
}
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{req.result.createObjectStore('saves',{keyPath:'slot'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error??new Error('无法打开本地存档'));req.onblocked=()=>reject(new Error('存档库被其他页面占用，请关闭旧页面后重试。'));
});}
export async function listSaves():Promise<SaveRecord[]>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('saves','readonly'),req=tx.objectStore('saves').getAll();tx.oncomplete=()=>{db.close();resolve(req.result);};tx.onerror=()=>{db.close();reject(tx.error);};});}
export async function persist(g:Game,slot:Slot='auto'):Promise<void>{const data=encode(g),db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');
  if(slot==='auto') {const get=store.get('auto');get.onsuccess=()=>{if(get.result){try{decode(get.result.data);store.put({...get.result,slot:'backup'});}catch{/* 保留已有的可恢复备份，绝不拿坏档覆盖它。 */}}store.put({slot,savedAt:new Date().toISOString(),data});};}
  else store.put({slot,savedAt:new Date().toISOString(),data});
  tx.oncomplete=()=>{db.close();resolve();};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error??new Error('存档写入失败'));};
});}
