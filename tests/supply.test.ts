import {describe,it,expect} from 'vitest';
import {freshSupply,choose,options,result,encodeSupply,decodeSupply,type Supply,type Scenario} from '../src/supplyEngine';
import {PRODUCTS,SOURCES} from '../src/supplyCatalog';
const ref=['hxn3','haid-feed','xiaduobao','',''];
const step=(s:Supply,option:string)=>choose(s,{stage:s.stage,option,reference:ref[s.stage]});
const play=(scenario:Scenario,choices=['service','bulk','test','keep','help'])=>choices.reduce(step,freshSupply(scenario));
describe('采购练习：可追溯资料与规则边界',()=>{
  it('资料ID不重复、来源齐全且外链只使用官方地址',()=>{
    expect(new Set(PRODUCTS.map(p=>p.id)).size).toBe(PRODUCTS.length);
    for(const p of PRODUCTS){expect(p.source.length).toBeGreaterThan(0);for(const id of p.source)expect(SOURCES[id]).toBeDefined();}
    for(const s of Object.values(SOURCES))if(s.url)expect(['www.haid.com','www.haid.cn','www.moa.gov.cn']).toContain(new URL(s.url).hostname);
  });
  it('更换现实品种不会改变虚构数值或产生品牌疗效',()=>{
    const a=choose(freshSupply(),{stage:0,option:'service',reference:'hxn2'}),b=choose(freshSupply(),{stage:0,option:'service',reference:'hxn3'});
    expect({...a,choices:[],ledger:[]}).toEqual({...b,choices:[],ledger:[]});
  });
  it('参考类别必须匹配，过期或重复选择不能重复结算',()=>{
    const s=step(freshSupply(),'service');
    expect(()=>choose(s,{stage:0,option:'service',reference:'hxn3'})).toThrow('过期');
    expect(()=>choose(s,{stage:1,option:'bulk',reference:'3201'})).toThrow('类别');
  });
});
describe('采购练习：资金、库存与延迟',()=>{
  it('后批先到货再出库；同一到货只扣一次，延迟局不能倒补',()=>{
    const a=play('regular',['visit','split','reserve','keep','self']);
    const b=play('delayed',['visit','split','reserve','keep','self']);
    expect(a.used).toBe(150);expect(a.stock).toBe(50);expect(a.shortfall).toBe(0);
    expect(b.used).toBe(100);expect(b.stock).toBe(100);expect(b.shortfall).toBe(50);
    expect(a.cash).toBe(b.cash);expect(b.ledger.filter(l=>l.title==='后批饲料到货')).toHaveLength(1);
    expect(result(a)?.title).not.toBe(result(b)?.title);
  });
  it('信息服务延期送达，不改变库存；预留款不是花费',()=>{
    let s=step(step(freshSupply(),'service'),'bulk');expect(s.evidence).toBe(1);
    const a=step(s,'test'),b=step(s,'reserve');
    expect(a.report).toBe(true);expect(b.report).toBe(false);expect(a.stock).toBe(b.stock);
    expect(b.cash).toBe(s.cash);expect(b.reserved).toBe(600);expect(step(b,'keep').reserved).toBe(0);
  });
  it('应急采购缓解缺口但有支出，家庭选择改变结局和现金',()=>{
    const a=play('delayed',['visit','split','test','keep','self']);
    const b=play('delayed',['visit','split','test','express','self']);
    expect(a.shortfall-b.shortfall).toBe(40);expect(a.cash-b.cash).toBe(600);
    const c=play('regular'),d=play('regular',['service','bulk','test','keep','self']);
    expect(c.family).toBe(true);expect(d.family).toBe(false);expect(d.cash-c.cash).toBe(200);
    expect(result(c)?.title).not.toBe(result(d)?.title);
  });
  it('穷举所有144条路径，资金守恒、库存守恒、无负数、都能结算',()=>{
    let count=0;
    function visit(s:Supply){
      expect(s.cash).toBe(12000+s.ledger.reduce((a,l)=>a+l.cash,0));
      expect(s.used+s.shortfall).toBe(Math.max(0,Math.min(s.day,6)-1)*30);
      expect(Math.min(s.cash,s.energy,s.stock,s.used,s.reserved)).toBeGreaterThanOrEqual(0);
      if(s.stage===5){count++;const bought=200+(s.choices[3].option==='express'?40:0);expect(s.used+s.stock).toBe(bought);expect(result(s)).not.toBeNull();return;}
      for(const o of options(s))visit(step(s,o.id));
    }
    visit(freshSupply('regular'));visit(freshSupply('delayed'));expect(count).toBe(144);
  });
});
describe('采购练习：保存恢复',()=>{
  it('每一步存档恢复后与连续游玩完全相同，延迟结果不重复',()=>{
    for(const scenario of ['regular','delayed'] as const){let a=freshSupply(scenario),b=freshSupply(scenario);for(const o of ['visit','split','test','express','help']){a=step(a,o);b=step(decodeSupply(encodeSupply(b)),o);expect(b).toEqual(a);}}
  });
  it('损坏、未知版本、超长及重复操作存档被拒绝；数值只从合法选择重建',()=>{
    expect(()=>decodeSupply('{')).toThrow();expect(()=>decodeSupply('{"version":9}')).toThrow();expect(()=>decodeSupply(' '.repeat(20001))).toThrow();
    const s=step(freshSupply(),'service'),x=JSON.parse(encodeSupply(s));x.cash=Infinity;expect(decodeSupply(JSON.stringify(x)).cash).toBe(s.cash);
    x.choices.push(x.choices[0]);expect(()=>decodeSupply(JSON.stringify(x))).toThrow();
  });
});
