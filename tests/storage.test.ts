import 'fake-indexeddb/auto';
import {describe,it,expect} from 'vitest';
import {dispatch,newGame} from '../src/engine';
import {persist,listSaves,decode} from '../src/storage';
describe('本地事务存档',()=>{
  it('自动档轮换保留上一份，手动档独立，读取不丢失状态',async()=>{const a=dispatch(newGame('存储验收'),{type:'start',density:'standard'},'start');await persist(a);await persist(a,'manual');const b=dispatch(a,{type:'advance',days:3},'next');await persist(b);const saves=await listSaves();expect(decode(saves.find(s=>s.slot==='auto')!.data)).toEqual(b);expect(decode(saves.find(s=>s.slot==='backup')!.data)).toEqual(a);expect(decode(saves.find(s=>s.slot==='manual')!.data)).toEqual(a);});
});
