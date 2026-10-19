import type {Campaign,Action} from './campaign';
import {PREPARATION} from './campaignContent';
import {INTERLUDES} from './narrative';

export type Decision={key:string;revision:number;fromDay:number;day:number;cash:number;stock:number;condition:number;pressure:number;energy:number;family:number};
export const DECISION_KEYS=[
  ...PREPARATION.flatMap(s=>[...s.options.map(o=>`prep:${s.id}:${o.id}`),`advance:${s.id}`,`accept:${s.id}:pass`,`accept:${s.id}:fail`,`repair:${s.id}`]),
  ...INTERLUDES.flatMap(c=>c.options.map(o=>`talk:${c.id}:${o.id}`)),
  ...['drain:clean','drain:light','weather:backup','weather:watch','family:relief','family:explain','market:sell','market:wait','limit:sell','limit:stop','funds:retry','funds:sell','funds:stop'].map(k=>'choice:'+k),
  'health:test','health:ignore','health:manage','health:close',
  'stock:80000','stock:100000','strategy:careful','strategy:balanced','strategy:push','strategy:oxygen-on','strategy:oxygen-off','strategy:auto-on','strategy:auto-off',
  'lab-send:shrimp','lab-send:environment','lab-decision:continue','lab-decision:manage','lab-decision:close','survey-defer','advance:growing','sample','maintain','rest','clean','buy','harvest','stop',
] as const;
export function recordDecision(g:Campaign,before:Campaign,a:Action){
  if(!g.story||a.type==='register')return;
  let key:string=a.type;
  if(a.type==='lab-send')key='lab-send:'+a.sample;
  if(a.type==='lab-decision')key='lab-decision:'+a.id;
  if(a.type==='health')key='health:'+a.id;
  if(a.type==='prep')key=`prep:${a.step}:${a.option}`;
  if(a.type==='talk')key=`talk:${a.conversation}:${a.answer}`;
  if(a.type==='choice')key=`choice:${before.pending}:${a.id}`;
  if(a.type==='accept')key=`accept:${a.step}:${g.failed?'fail':'pass'}`;
  if(a.type==='repair')key=`repair:${a.step}`;
  if(a.type==='stock')key=`stock:${a.count}`;
  if(a.type==='advance')key='advance:'+(before.phase==='prep'?(before.job?.step??'P08'):'growing');
  if(a.type==='strategy')key='strategy:'+(a.enhanced!==before.enhanced?(a.enhanced?'oxygen-on':'oxygen-off'):a.autoBuy!==before.autoBuy?(a.autoBuy?'auto-on':'auto-off'):a.feed);
  const addedFunds=g.ledger.slice(before.ledger.length).filter(x=>x.kind==='funding').reduce((sum,x)=>sum+x.amount,0);
  g.decision={key,revision:g.revision,fromDay:before.day,day:g.day,cash:g.cash-before.cash-addedFunds,stock:g.stock-before.stock,condition:g.condition-before.condition,pressure:g.pressure-before.pressure,energy:g.energy-before.energy,family:g.family-before.family};
}
export function validateDecision(g:Campaign){
  const d=g.decision;if(d===undefined)return;
  if(!d||!DECISION_KEYS.includes(d.key)||d.revision!==g.revision||!Number.isInteger(d.day)||d.day!==g.day||!Number.isInteger(d.fromDay)||d.fromDay<0||d.fromDay>d.day)throw Error('选择回放记录损坏，请恢复备份。');
  for(const k of ['cash','stock','condition','pressure','energy','family'] as const)if(typeof d[k]!=='number'||!Number.isFinite(d[k])||Math.abs(d[k])>(k==='cash'||k==='stock'?1e9:100))throw Error('选择反馈数据损坏，请恢复备份。');
}
export function decisionEffects(d:Decision){
  const sign=(n:number)=>n>0?'+':'';
  const lines=[`第 ${d.fromDay} → ${d.day} 天`];
  if(d.cash)lines.push(`现金 ${d.cash>0?'+':'-'}¥${(Math.abs(d.cash)/100).toLocaleString('zh-CN',{maximumFractionDigits:2})}`);
  if(d.stock)lines.push(`饲料 ${sign(d.stock)}${(d.stock/1000).toFixed(1)} kg`);
  for(const [key,name] of [['condition','设备'],['pressure','环境压力'],['energy','精力'],['family','家庭协作']] as const)if(Math.abs(d[key])>=.05)lines.push(`${name} ${sign(d[key])}${d[key].toFixed(1)}`);
  return lines;
}
