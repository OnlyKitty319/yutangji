// A deterministic purchasing exercise. All amounts, schedules and outcomes are fictional.
// Product IDs identify reference cards only; they never change survival, growth or efficacy.
import { PRODUCTS, product } from './supplyCatalog';
export type Scenario='regular'|'delayed';
export type Decision={stage:number;option:string;reference:string};
export type Entry={day:number;title:string;cash:number;text:string};
export type Supply={version:1;scenario:Scenario;stage:number;day:number;cash:number;energy:number;stock:number;used:number;shortfall:number;reserved:number;evidence:number;family:boolean;delivery:number|null;report:boolean;reportDue:number|null;choices:Decision[];ledger:Entry[];slow:boolean;};
export const STAGES=['选苗与批次','饲料排程','动保与证据','到货复查','时间与生活'];
export const freshSupply=(scenario:Scenario='regular'):Supply=>({version:1,scenario,stage:0,day:0,cash:12000,energy:80,stock:0,used:0,shortfall:0,reserved:0,evidence:0,family:false,delivery:null,report:false,reportDue:null,choices:[],ledger:[],slow:false});
export type Option={id:string;title:string;cost:number;detail:string;energy:number};
export function options(s:Supply):Option[]{
  return [
    [{id:'service',title:'预约批次核验服务',cost:6200,energy:4,detail:'苗款与核验服务合计；第2日收到对应批次记录。少跑一趟，现金投入更多。'},
     {id:'visit',title:'亲自到场核对与提苗',cost:5600,energy:20,detail:'苗款与交通合计；当场记录批次。省下服务费，但占用自己的精力。'}],
    [{id:'bulk',title:'一次备齐 200 kg',cost:1600,energy:18,detail:'当天到货；单价¥8/kg。需要自己腾仓验收，整笔资金立即变成库存。'},
     {id:'split',title:'分两批，各 100 kg',cost:900,energy:6,detail:'首批¥9/kg；后批到货付¥1,000（含¥100运费），预计第5日，延迟局第7日。'}],
    [{id:'test',title:'先做检测，再讨论候选产品',cost:300,energy:8,detail:'第4日得到一份场景观察记录。购买信息服务，不购买或施用动保产品。'},
     {id:'reserve',title:'先核验标签，预留采购额',cost:0,energy:10,detail:'圈留¥600备用（仍属于现金）；暂不采购、不施用。没有新增检测结果。'},
     {id:'consult',title:'约技术员联合复查',cost:450,energy:2,detail:'第4日收到相同场景观察记录，并有人帮你整理材料；节省精力但服务费更高。'}],
    [{id:'keep',title:'按原排程等待',cost:0,energy:0,detail:'不加购；第5–6日各安排30 kg教学出库，不足部分记录为计划缺口。'},
     {id:'express',title:'应急加购 40 kg',cost:600,energy:4,detail:'第4日立即到货，¥15/kg含配送。缓解缺口，但多余部分仍占用库存资金。'},
     {id:'slow',title:'缩减两日出库安排',cost:0,energy:2,detail:'第5–6日各安排20 kg，原计划仍计30 kg；至少留下20 kg计划缺口，节省现金。'}],
    [{id:'help',title:'请人接班，按约回家',cost:200,energy:0,detail:'支付替班费完成本周收尾；家庭约定兑现。'},
     {id:'self',title:'自己收尾，与家人协商改期',cost:0,energy:14,detail:'省下替班费；本周家庭约定尚未兑现，记录中保留改期而不是记成完成。'}],
  ][s.stage]||[];
}
function record(s:Supply,title:string,cash:number,text:string){
  if(s.cash+cash<0)throw new Error('现金不足');
  s.cash+=cash;s.ledger.push({day:s.day,title,cash,text});
}
function advance(s:Supply,to:number){
  while(s.day<to){
    s.day++;
    if(s.delivery===s.day){record(s,'后批饲料到货',-1000,'100 kg入库，其中¥900为货款，¥100为运费。');s.stock+=100;s.delivery=null;}
    if(s.reportDue===s.day){s.report=true;s.reportDue=null;s.evidence+=1;record(s,'复查记录送达',0,s.scenario==='delayed'?'本场景出现运输延迟；观察记录要求继续核对现场条件，没有给出疾病诊断或用药结论。':'本场景配送按期；记录没有提供支持立即采购动保的新增依据，也不等于证明没有风险。');}
    if(s.day===2&&s.choices[0]?.option==='service'){s.evidence++;record(s,'批次核验资料送达',0,'游戏中的批次记录补齐；这不是现实检疫或健康保证。');}
    if(s.day>=2&&s.day<=6){
      const requested=s.slow&&s.day>=5?20:30,actual=Math.min(s.stock,requested);
      s.stock-=actual;s.used+=actual;s.shortfall+=30-actual;
      record(s,'教学出库',0,`原计划30 kg，实际出库${actual} kg${actual<30?'；差额记入计划缺口':''}。这不是现实投喂定额。`);
    }
  }
}
export function choose(s:Supply,decision:Decision):Supply{
  if(decision.stage!==s.stage)throw new Error('此选择已处理或已过期');
  const option=options(s).find(o=>o.id===decision.option);if(!option)throw new Error('未知选项');
  if(s.stage<3){const category=(['seed','feed','health'] as const)[s.stage];if(!PRODUCTS.some(p=>p.id===decision.reference&&p.category===category))throw new Error('资料类别不匹配');}
  else if(decision.reference!=='')throw new Error('此步骤不接受产品');
  if(s.energy<option.energy||s.cash-s.reserved<option.cost)throw new Error('可调度资金或精力不足');
  const n=structuredClone(s);n.choices.push({...decision});n.energy-=option.energy;
  record(n,option.title,-option.cost,`【游戏设定】${option.detail}${decision.reference?' 参考对象：'+product(decision.reference).name+'；价格属于虚构采购方案，不是该产品报价。':''}`);
  if(n.stage===0)n.evidence+=decision.option==='visit'?1:0;
  if(n.stage===1){n.stock+=decision.option==='bulk'?200:100;if(decision.option==='split')n.delivery=n.scenario==='regular'?5:7;}
  if(n.stage===2){if(decision.option==='reserve'){n.reserved=600;n.evidence++;}else n.reportDue=4;}
  if(n.stage===3){n.reserved=0;if(decision.option==='express')n.stock+=40;if(decision.option==='slow')n.slow=true;}
  if(n.stage===4)n.family=decision.option==='help';
  n.stage++;advance(n,[0,1,2,4,7,7][n.stage]);
  return n;
}
export function result(s:Supply){
  if(s.stage!==5)return null;
  return {title:s.shortfall>0?'库存接续留下了缺口':s.family?'货到齐，也赶上了约定':'排程完成，生活等待改期',
    reason:s.shortfall>0?`原定150 kg教学出库只完成${s.used} kg，缺口${s.shortfall} kg。${s.scenario==='delayed'&&s.choices[1].option==='split'?'后批第7日才到，错过第5–6日出库窗口。':''}${s.slow?'你主动缩减了两日安排。':''}`:'150 kg教学出库按计划完成；这个结果说明库存安排完成，不代表养殖成功或产量保证。',
    spent:12000-s.cash};
}
// Store only bounded decisions. Replaying makes edited cash, duplicate effects and stale states impossible to load.
export function encodeSupply(s:Supply){return JSON.stringify({version:1,scenario:s.scenario,choices:s.choices});}
export function decodeSupply(raw:string):Supply{
  if(raw.length>20000)throw new Error('选型存档过大');
  const x=JSON.parse(raw);if(!x||x.version!==1||!['regular','delayed'].includes(x.scenario)||!Array.isArray(x.choices)||x.choices.length>5)throw new Error('选型存档损坏或版本不兼容');
  let s=freshSupply(x.scenario);
  for(const d of x.choices){if(!d||!Number.isInteger(d.stage)||typeof d.option!=='string'||typeof d.reference!=='string')throw new Error('选择记录损坏');s=choose(s,d);}
  return s;
}
