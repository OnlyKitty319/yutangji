import { describe,it,expect } from 'vitest';
import { dispatch,newGame,validateGame,dailyFeed,type Game,type Action } from '../src/engine';
import {encode,decode} from '../src/storage';
function step(g:Game,a:Action){return dispatch(g,a,'op-'+g.revision);}
function start(seed='验收-01'){return step(newGame(seed),{type:'start',density:'standard'});}
function choice(g:Game,id:string){return step(g,{type:'choice',choice:id});}
export function play(seed:string,late:boolean){let g=start(seed);let guard=0;while(g.phase!=='ended'&&guard++<200){
  if(g.pending){const c=g.pending==='prepare'?(late?'friend':'backup'):g.pending==='night'?'keep':g.pending==='family'?'relief':g.pending==='return'?'help':g.pending==='promise'?'fulfill':g.pending==='sale'?(late?'wait':'sell'):g.pending==='funds'?'exit':'sell';g=choice(g,c);}
  else if(late&&g.day>=67)g=step(g,{type:'harvest'});
  else g=step(g,{type:'advance',days:7});
}expect(guard).toBeLessThan(200);return g;}
describe('养殖与账本',()=>{
  it('开局投入、库存、现金正确，不能重复放苗',()=>{const g=start();expect(g.cash).toBe(3280000);expect(g.stock).toBe(400000);expect(()=>step(g,{type:'start',density:'small'})).toThrow();validateGame(g);});
  it('同种子与操作完全可复现',()=>{expect(play('复现',true)).toEqual(play('复现',true));});
  it('7日批量推进与逐日推进生产、账本一致',()=>{let a=start(),b=start();a=step(a,{type:'advance',days:7});for(let i=0;i<7;i++)b=step(b,{type:'advance',days:1});expect(a.day).toBe(7);for(const k of ['cash','stock','count','weight','usedFeed','rng','ledger','history','log'] as const)expect(a[k]).toEqual(b[k]);});
  it('加量短期有增长空间，但多耗料且累积负担',()=>{let a=start(),b=step(start(),{type:'strategy',feed:'push',aeration:'normal',autoBuy:true});a=step(a,{type:'advance',days:1});b=step(b,{type:'advance',days:1});expect(b.usedFeed).toBeGreaterThan(a.usedFeed);expect(b.bottom).toBeGreaterThan(a.bottom);expect(b.pressure).toBeGreaterThan(a.pressure);expect(b.weight).toBeGreaterThan(a.weight);});
  it('不同操作可到达两种结局，而且会有实际成本与履约差异',()=>{const early=play('验收-01',false),late=play('验收-01',true);expect(early.result?.day).toBe(60);expect(late.result?.day).toBe(67);expect(early.result?.title).not.toBe(late.result?.title);expect(early.result?.revenue).not.toBe(late.result?.revenue);expect(late.friend).toBe('done');expect(early.family).toBe('done');});
  it('多个种子都能完成一造且数值合法',()=>{for(let i=0;i<40;i++){const g=play('批次-'+i,i%2===0);expect(g.phase).toBe('ended');expect(g.result?.premature).toBe(false);validateGame(g);}});
  it('库存不足时不扣款、不推进、不推进随机数',()=>{let g=start();g=step(g,{type:'strategy',feed:'balanced',aeration:'normal',autoBuy:false});while(!g.pending)g=step(g,{type:'advance',days:1});expect(g.pending).toBe('funds');const before=g;g=choice(g,'resume');g=step(g,{type:'advance',days:1});expect(g.cash).toBe(before.cash);expect(g.rng).toEqual(before.rng);expect(g.day).toBe(before.day);expect(g.stock).toBeLessThan(dailyFeed(g));});
  it('同一操作ID重复提交不会重复扣款；过期状态版本拒绝',()=>{const a=start(),b=dispatch(a,{type:'buy'},'purchase-once');expect(dispatch(b,{type:'buy'},'purchase-once')).toBe(b);expect(()=>dispatch(b,{type:'buy'},'new',a.revision)).toThrow('过时');});
  it('同日检查不能重复刷取，抽样不改善真实生产状态',()=>{const a=start(),b=step(a,{type:'sample'});expect(b.cash).toBe(a.cash-20000);expect(b.count).toBe(a.count);expect(b.weight).toBe(a.weight);expect(b.pressure).toBe(a.pressure);expect(()=>step(b,{type:'sample'})).toThrow('今日已抽样');});
  it('结束后不允许再次出售或领取',()=>{const g=play('验收',false);expect(()=>step(g,{type:'harvest'})).toThrow('已结束');});
  it('主动提前退出有折价且结算完整',()=>{const g=step(start(),{type:'exit'});expect(g.result?.premature).toBe(true);expect(g.cash).toBeGreaterThanOrEqual(0);expect(g.count).toBe(0);validateGame(g);});
});
describe('事件与延迟后果',()=>{
  function until(g:Game,day:number){while(g.day<day&&!g.pending)g=step(g,{type:'advance',days:7});return g;}
  it('关键事件暂停，不会一键跳过家庭约定',()=>{let g=until(start(),28);expect(g.day).toBe(28);expect(g.pending).toBe('prepare');expect(()=>step(g,{type:'advance',days:7})).toThrow('当前事件');g=choice(g,'backup');g=until(g,29);expect(g.pending).toBe('night');g=choice(g,'keep');g=until(g,30);expect(g.pending).toBe('family');});
  it('改期承诺跨存档后只执行一次',()=>{let g=until(start(),28);g=choice(g,'friend');g=until(g,29);g=choice(g,'keep');g=until(g,30);g=choice(g,'postpone');g=until(g,33);g=choice(g,'delay');g=until(g,38);expect(g.pending).toBe('promise');g=choice(g,'fulfill');let b=decode(encode(g));g=step(g,{type:'advance',days:7});b=step(b,{type:'advance',days:7});expect(g).toEqual(b);expect(g.day).toBe(39);expect(g.family).toBe('done');expect(g.pending).toBe('promise');g=choice(g,'fulfill');g=step(g,{type:'advance',days:3});expect(g.friend).toBe('done');expect(g.log.filter(n=>n.title==='约定已兑现')).toHaveLength(2);});
  it('有外援赴约不再次计入缺人巡查的压力',()=>{let g=until(start(),28);g=choice(g,'backup');g=until(g,29);g=choice(g,'keep');g=until(g,30);let a=choice(g,'attend'),b=choice(g,'relief');a=step(a,{type:'advance',days:1});b=step(b,{type:'advance',days:1});expect(a.pressure).toBeGreaterThan(b.pressure);expect(a.family).toBe('done');expect(b.family).toBe('done');});
});
describe('存档格式与恢复',()=>{
  it('整条流程中的每个节点导入导出保持相同状态',()=>{let g=start();for(let i=0;i<20;i++){expect(decode(encode(g))).toEqual(g);if(g.pending)break;g=step(g,{type:'advance',days:3});}});
  it('损坏、非法字段、版本不兼容均拒绝',()=>{const s=encode(start());expect(()=>decode('{')).toThrow();const corrupt=JSON.parse(s);corrupt.checksum='broken';expect(()=>decode(JSON.stringify(corrupt))).toThrow('校验码');const bad=start();bad.cash=-1;expect(()=>encode(bad)).toThrow();const bad2=start();bad2.stock+=1;expect(()=>validateGame(bad2)).toThrow('库存');const bad3=start();bad3.rules='9.9';expect(()=>validateGame(bad3)).toThrow('版本');});
});
