import type {Campaign} from './campaign';
export const LEGACY_HEALTH_RULES='earthen-health-1.0.0';
export const HEALTH_RULES='earthen-health-1.1.0';
export const isHealthRules=(rules:string)=>[HEALTH_RULES,LEGACY_HEALTH_RULES].includes(rules);
export type Illness='ahpnd'|'wssv'|'ehp'|'oxygen';
export type Health={version:1;rng:number;checked:Illness[];pending:boolean;lost:number;closed:boolean;episode:null|{kind:Illness;start:number;days:number;tested:boolean;managed:boolean;stage:'warning'|'report'|'active'|'over';loss:number};history:{kind:Illness;day:number;lost:number;managed:boolean}[]};
export const ILLNESSES:Record<Illness,{name:string;warning:string;report:string;scene:string}>={
  ahpnd:{name:'急性肝胰腺坏死病风险',warning:'早期摄食下降，料台出现异常虾。外观不足以确诊，需要送检并排查环境。',report:'报告检出了 AHPND。接下来几天可能掉得很快，得决定是继续应对，还是现在抢收。',scene:'health-ahpnd'},
  wssv:{name:'白斑病风险',warning:'连续天气波动后，摄食和活力明显下降。仅凭体表变化不能判断病原。',report:'报告检出了 WSSV。损失可能很快扩大，留给我们的时间不多了。',scene:'health-wssv'},
  ehp:{name:'EHP 生长停滞风险',warning:'连续抽样显示规格参差、生长偏慢。需要检查苗种记录、环境和病原。',report:'报告检出了 EHP。虾长得慢，规格拉不开，饲料和人工却还要继续花。',scene:'health-ehp'},
  oxygen:{name:'缺氧与环境事故',warning:'清晨出现异常聚边，设备负荷和环境压力偏高。必须尽快排查溶氧及设备。',report:'溶氧降下来了，设备和水体都需要马上处理。越拖，损失可能越大。',scene:'health-oxygen'},
};
export const newHealth=(rng:number):Health=>({version:1,rng,checked:[],pending:false,lost:0,closed:false,episode:null,history:[]});
const roll=(h:Health)=>{let x=h.rng;x^=x<<13;x^=x>>>17;x^=x<<5;h.rng=x>>>0||1;return h.rng/4294967296;};
// 以下概率、损耗与费用均为游戏平衡参数，并非现实发病率或治疗建议。
export function healthRisk(g:Campaign,kind:Illness){
  const dense=g.initialCount===100000?.08:0,rough=g.choices.P01==='local'?.09:0;
  const pollution=g.production?Math.min(.25,g.production.organic/160+g.bottom/500):0;
  const records=g.choices.P05==='rushed'?.12:0,water=g.choices.P04==='standard'?.06:0;
  if(kind==='ahpnd')return Math.min(.75,.15+dense+rough+records+water+pollution);
  if(kind==='wssv')return Math.min(.8,.18+dense+water+(g.backupUntil<g.day?.08:0)+g.pressure/400+pollution);
  if(kind==='ehp')return Math.min(.75,.18+dense+records+(g.choices.P03==='basic'?.08:0)+pollution/2);
  return Math.min(.9,.12+pollution+g.pressure/150+(g.condition<60?.2:0)+(g.enhanced?-.15:0));
}
export function healthGrowth(g:Campaign){const e=g.health?.episode;if(!e||e.stage!=='active')return 1;return e.kind==='ehp'?(e.managed?.5:.25):e.managed?.75:.35;}
export function healthStep(g:Campaign){
  const h=g.health;if(!h||!isHealthRules(g.rules)||g.phase!=='growing')return;
  const cd=g.day-g.stockingDay!;const e=h.episode;
  if(e?.kind==='wssv'&&g.laboratory&&e.stage!=='over')return;
  if(e&&e.stage==='active'){
    e.days++;
    const base=e.kind==='ahpnd'?(e.managed?.09:.34):e.kind==='wssv'?(e.managed?.13:.43):e.kind==='oxygen'?(e.managed?.025:.3):0;
    const lost=Math.min(g.count,Math.round(g.count*base*(.85+roll(h)*.3)));g.count-=lost;e.loss+=lost;h.lost+=lost;
    if(lost)g.log.push({day:g.day,title:'健康损失记录',text:`${e.tested?ILLNESSES[e.kind].name:'未确诊的健康异常'}：今日损失 ${lost.toLocaleString()} 尾。`});
    const duration=e.kind==='ehp'?120:e.kind==='oxygen'?3:6;
    if(e.days>=duration){e.stage='over';h.history.push({kind:e.kind,day:g.day,lost:e.loss,managed:e.managed});g.log.push({day:g.day,title:'风险窗口结束',text:'本轮损失已经保留。急性窗口结束不代表病原已被消除；后续仍按记录管理。'});}
    return;
  }
  if(e&&e.stage!=='over')return;
  const candidates:Illness[]=[];
  if(cd>=(g.laboratory?1:12))candidates.push('ahpnd');if(!g.laboratory&&cd>=38)candidates.push('wssv');if(cd>=(g.laboratory?1:55))candidates.push('ehp');if(cd>=30&&g.pressure>=35)candidates.push('oxygen');
  for(const kind of candidates){if(g.production){if(h.history.some(x=>x.kind===kind)||e?.kind===kind||g.production.checkedAt[kind]!==undefined&&g.day-g.production.checkedAt[kind]<(g.laboratory?1:14))continue;g.production.checkedAt[kind]=g.day;}else if(h.checked.includes(kind))continue;if(!h.checked.includes(kind))h.checked.push(kind);if(roll(h)<healthRisk(g,kind)*(g.laboratory?.prepared ? .04 : 1)){h.episode={kind,start:g.day,days:0,tested:false,managed:false,stage:'warning',loss:0};h.pending=true;g.log.push({day:g.day,title:'健康异常 · 暂停推进',text:ILLNESSES[kind].warning});break;}}
}
export function healthChoice(g:Campaign,id:string,pay:(amount:number,text:string)=>void){
  const h=g.health,e=h?.episode;if(!h?.pending||!e)throw Error('当前没有等待处理的健康事件。');
  if(id==='close'){h.closed=true;h.pending=false;return;}
  if(e.stage==='warning'){
    if(id==='test'){pay(120000,'健康异常送检与现场排查');e.tested=true;e.stage='report';g.log.push({day:g.day,title:'模拟检测结果',text:ILLNESSES[e.kind].report});return;}
    if(id!=='ignore')throw Error('未知健康选择。');
    e.stage='active';h.pending=false;g.log.push({day:g.day,title:'我暂时延后排查',text:'原因尚未确诊，风险仍可能持续。下一经营日开始记录损失。'});return;
  }
  if(e.stage!=='report')throw Error('当前不能执行该健康选择。');
  if(id==='manage'){pay(220000,'专业协助、隔离工具与环境管理');e.managed=true;g.feed='careful';g.enhanced=true;g.condition=Math.min(100,g.condition+10);g.pressure=Math.max(0,g.pressure-12);}
  else if(id!=='ignore')throw Error('未知健康选择。');
  e.stage='active';h.pending=false;g.log.push({day:g.day,title:e.managed?'应对已经安排':'暂缓应对',text:e.managed?'已投入管理费用，并改为谨慎投喂、加强增氧；仍可能损失，日常费用继续。':'不再投入应对费用，承担之后的减产和资金风险。'});
}
export function validateHealth(g:Campaign){
  const h=g.health,fail=()=>{throw Error('健康事件存档损坏，请恢复备份。');};
  if(!isHealthRules(g.rules)){if(h!==undefined)fail();return;}if(!h||h.version!==1)fail();if(!h)return;
  if(!Number.isInteger(h.rng)||h.rng<1||h.rng>4294967295||!Number.isInteger(h.lost)||h.lost<0||h.lost>g.initialCount||typeof h.closed!=='boolean'||typeof h.pending!=='boolean'||!Array.isArray(h.checked)||new Set(h.checked).size!==h.checked.length||h.checked.some(k=>!ILLNESSES[k])||!Array.isArray(h.history)||h.history.length>4)fail();
  const e=h.episode;
  if(e){if(!ILLNESSES[e.kind]||!h.checked.includes(e.kind)||!Number.isInteger(e.start)||e.start<0||e.start>g.day||!Number.isInteger(e.days)||e.days<0||e.days>120||!Number.isInteger(e.loss)||e.loss<0||e.loss>h.lost||!['warning','report','active','over'].includes(e.stage)||typeof e.tested!=='boolean'||typeof e.managed!=='boolean'||e.managed&&!e.tested)fail();}
  if(h.pending!==!!(e&&['warning','report'].includes(e.stage)&&!h.closed&&g.phase!=='ended'))fail();
  for(const x of h.history)if(!ILLNESSES[x.kind]||!Number.isInteger(x.day)||x.day<0||x.day>g.day||!Number.isInteger(x.lost)||x.lost<0||x.lost>h.lost||typeof x.managed!=='boolean')fail();
}
