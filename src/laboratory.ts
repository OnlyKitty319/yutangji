import type {Campaign} from './campaign';
export type SampleKind='shrimp'|'environment';
export type LabReport={sample:SampleKind;sampled:number;reported:number;value:number|null;unit:'copies/mg tissue'|'copies/mL extract';trend:'first'|'up'|'down'|'stable'|'incomparable';status:'undetected'|'detected';loss:number};
export type Laboratory={version:1;rng:number;sampleRng:number;prepared:boolean;reservoir:number;viralLoad:number;managedUntil:number;lastSent:number;pending:null|{due:number;report:LabReport};reports:LabReport[];decisionPending:boolean};
export const newLaboratory=(seed:number):Laboratory=>({version:1,rng:seed,sampleRng:(seed^0x5bd1e995)>>>0||1,prepared:false,reservoir:0,viralLoad:0,managedUntil:0,lastSent:-1,pending:null,reports:[],decisionPending:false});
const rand=(l:Laboratory,key:'rng'|'sampleRng'='rng')=>{let x=l[key];x^=x<<13;x^=x>>>17;x^=x<<5;l[key]=x>>>0||1;return l[key]/4294967296;};
const clamp=(n:number,l:number,h:number)=>Math.min(h,Math.max(l,n));
// 只作游戏风险映射，不是现场清塘合格阈值或临床诊疗模型。
export function preparationRisk(g:Campaign){return .04+(g.choices.P01==='local'?.22:0)+(g.choices.P03==='basic'?.23:0)+(g.choices.P04==='standard'?.16:0)+(g.choices.P05==='rushed'?.2:0);}
export function stockLaboratory(g:Campaign){const l=g.laboratory;if(!l)return;l.prepared=true;l.reservoir=preparationRisk(g);l.viralLoad=rand(l)<l.reservoir?10**(2+rand(l)*1.5):0;}
export function sendSample(g:Campaign,sample:SampleKind){
 const l=g.laboratory;if(!l||g.phase==='ended'||sample==='shrimp'&&g.phase!=='growing')throw Error('当前没有可送检的样品。');
 if(l.pending||l.lastSent===g.day||l.decisionPending)throw Error('请先处理已有报告，或等待下一天再送样。');
 const underlying=sample==='shrimp'?l.viralLoad:(g.phase==='prep'?preparationRisk(g):l.reservoir)*10000;
 // 样品异质性与检测限为模拟参数；检测只读采样时的状态，不预知报告日。
 const measured=underlying*(.55+rand(l,'sampleRng')*.9),value=measured<100?null:Math.round(measured);
 const last=l.reports.filter(r=>r.sample===sample).at(-1);
 const trend:LabReport['trend']=!last?'first':last.value===null||value===null?'incomparable':value>last.value*1.5?'up':value<last.value/1.5?'down':'stable';
 l.pending={due:g.day+2,report:{sample,sampled:g.day,reported:g.day+2,value,unit:sample==='shrimp'?'copies/mg tissue':'copies/mL extract',status:value===null?'undetected':'detected',trend,loss:g.health?.lost??0}};l.lastSent=g.day;
 const e=g.health?.episode;if(e?.kind==='wssv'&&g.health?.pending){e.stage='active';g.health.pending=false;}
}
export function laboratoryDay(g:Campaign){
 const l=g.laboratory;if(!l)return;
 if(l.pending&&g.day>=l.pending.due){l.reports.push(l.pending.report);l.pending=null;l.decisionPending=true;g.log.push({day:g.day,title:'送样结果已回',text:reportText(g)});}
 if(g.phase!=='growing')return;
 const managed=l.managedUntil>=g.day,weather=g.weatherDay>0&&g.day>=g.weatherDay&&g.day<g.weatherDay+3;
 const p=g.production?.organic??0;
 if(l.viralLoad===0&&rand(l)<(.0006+l.reservoir*.008+(weather?.002:0))*(managed?.5:1))l.viralLoad=10**(2+rand(l)*1.5);
 if(l.viralLoad>0){const change=(managed?-.12:.15)+l.reservoir*.15+g.pressure/350+p/300+(weather?.12:0)+(rand(l)-.5)*.32;l.viralLoad=clamp(l.viralLoad*10**change,10,1e9);}
 const h=g.health;if(!h)return;let e=h.episode;
 if(l.viralLoad>=10000&&(!e||e.stage==='over'||e.kind==='ehp'&&e.stage==='active')){if(e?.kind==='ehp'&&!h.history.some(x=>x.kind==='ehp'))h.history.push({kind:'ehp',day:g.day,lost:e.loss,managed:e.managed});if(!h.checked.includes('wssv'))h.checked.push('wssv');h.episode=e={kind:'wssv',start:g.day,days:0,tested:false,managed:false,stage:'warning',loss:0};h.pending=true;g.log.push({day:g.day,title:'摄食与活力异常',text:'异常可能与病原或环境有关。可以送虾体样检测，等待结果期间塘口仍在变化。'});}
 if(e?.kind==='wssv'&&e.stage==='active'){
  e.days++;const base=l.viralLoad<1e4?.0005:l.viralLoad<1e5?.004:l.viralLoad<1e6?.06:.28;
  const lost=Math.min(g.count,Math.round(g.count*base*(managed?.65:1)*(.8+rand(l)*.4)));g.count-=lost;e.loss+=lost;h.lost+=lost;
  if(lost)g.log.push({day:g.day,title:'健康损失记录',text:`今日损失${lost.toLocaleString()}尾。新的损失进入存塘与成本判断。`});
  if(e.days>=3&&l.viralLoad<1e4){e.stage='over';if(!h.history.some(x=>x.kind==='wssv'))h.history.push({kind:'wssv',day:g.day,lost:e.loss,managed:e.managed});}
 }
}
export function labDecision(g:Campaign,id:'continue'|'manage'|'close'){
 const l=g.laboratory;if(!l?.decisionPending)throw Error('当前没有待回应的报告。');l.decisionPending=false;
 if(id==='manage'){l.managedUntil=g.day+7;g.feed='careful';g.enhanced=true;g.pressure=Math.max(0,g.pressure-12);}
 const e=g.health?.episode;if(e?.kind==='wssv'&&e.stage!=='over'){
  const positive=l.reports.at(-1)?.sample==='shrimp'&&l.reports.at(-1)?.status==='detected';e.tested=e.tested||positive;
  if(id==='manage'&&e.tested)e.managed=true;e.stage='active';g.health!.pending=false;
 }
 if(id==='close'&&g.health){g.health.closed=g.phase==='growing'&&(!!e&&e.stage!=='over'||l.reports.at(-1)?.sample==='shrimp'&&l.reports.at(-1)?.status==='detected');g.health.pending=false;}
}
export function reportText(g:Campaign){
 const r=g.laboratory?.reports.at(-1);if(!r)return '还没有送样报告。';
 const sample=r.sample==='shrimp'?'虾体附肢样':'塘底积水与底泥浸提样',unit=r.sample==='shrimp'?'拷贝/mg组织':'拷贝/mL浸提液';
 const value=r.value===null?`未检出（本次模拟检出限100 ${unit}）`:`${r.value.toExponential(2)} ${unit}`;
 const trend={first:'首次记录',up:'比上次同类样升高',down:'比上次同类样降低',stable:'与上次同类样接近',incomparable:'一份结果低于检出限，不能计算倍数'}[r.trend];
 const context=r.sample==='environment'?'环境检出不能直接判断虾体感染，需结合虾体样。':r.value===null?'未检出不能排除低载量或采样遗漏。':r.value>=1e5?'本次虾体载量偏高，继续养可能快速扩大损失。':'本次已检出，仍需看摄食、掉虾和后续复测。';
 return `模拟WSSV qPCR报告：第${r.sampled}天采样，第${r.reported}天回报；${sample}，${value}。${trend}。${context}`;
}
export function validateLaboratory(g:Campaign){
 const l=g.laboratory;if(l===undefined)return;const fail=()=>{throw Error('送样记录损坏，请恢复备份。');};
 const num=(n:number,min:number,max:number,int=false)=>Number.isFinite(n)&&n>=min&&n<=max&&(!int||Number.isInteger(n));
 if(!l||l.version!==1||!g.production||typeof l.prepared!=='boolean'||typeof l.decisionPending!=='boolean'||!num(l.rng,1,4294967295,true)||!num(l.sampleRng,1,4294967295,true)||!num(l.reservoir,0,1)||!num(l.viralLoad,0,1e9)||!num(l.managedUntil,0,127,true)||!num(l.lastSent,-1,g.day,true)||!Array.isArray(l.reports)||l.reports.length>121)fail();
 const check=(r:LabReport,pending=false)=>{if(!r||!['shrimp','environment'].includes(r.sample)||r.unit!==(r.sample==='shrimp'?'copies/mg tissue':'copies/mL extract')||!num(r.sampled,0,g.day,true)||!num(r.reported,r.sampled,pending?122:g.day,true)||r.reported!==r.sampled+2||r.value!==null&&!num(r.value,100,2e9,true)||r.status!==(r.value===null?'undetected':'detected')||!['first','up','down','stable','incomparable'].includes(r.trend)||!num(r.loss,0,g.initialCount,true))fail();};
 l.reports.forEach(r=>check(r));if(l.pending){check(l.pending.report,true);if(l.pending.due!==l.pending.report.reported||l.pending.due<=g.day&&g.phase!=='ended')fail();}
 if(l.decisionPending&&(!l.reports.length||g.phase==='ended'))fail();
}
