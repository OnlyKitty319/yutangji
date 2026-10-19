import {HEALTH_RULES,LEGACY_HEALTH_RULES,newHealth,healthStep,healthGrowth,healthChoice,validateHealth,ILLNESSES,type Health} from './health';
import {recordDecision,validateDecision,type Decision} from './decision';
import {CHALLENGE_RULES,isChallenge,challengePassed,challengeChecks,settlementOutcome,diseaseForced} from './challenge';
import {CAMPAIGN_RULES,PREPARATION,FEEDS,type EventId} from './campaignContent';
import {availableConversation,validateNarrative,type Narrative,type Gender} from './narrative';
import {newProduction,productionFeed,productionDay,sizePrice,recordProductionSample,validateProduction,type Production} from './production';
import {newLaboratory,stockLaboratory,sendSample,laboratoryDay,labDecision,validateLaboratory,type Laboratory,type SampleKind} from './laboratory';
export type Feed = typeof FEEDS[number]['id'];
export interface Report {step:string;day:number;passed:boolean;text:string}
export interface Ledger {day:number;amount:number;kind:'expense'|'capital'|'feed'|'sale'|'funding';text:string}
export interface Log {day:number;title:string;text:string}
export interface Result {id:string;kind:'sale'|'stop';harvest:number;rate:number;revenue:number;costs:number;profit:number;success:boolean;outcome?:'success'|'failure'|'cancelled';survivors?:number;title:string;reasons:string[]}
export interface Campaign {
  production?:Production;
  laboratory?:Laboratory;
  story?:Narrative;
  decision?:Decision;
  health?:Health;
  schema:2;rules:string;id:string;seed:string;revision:number;commands:string[];
  mode:'earthen';phase:'prep'|'growing'|'ended';day:number;stockingDay:number|null;
  cash:number;debt:number;capital:number;stock:number;usedFeed:number;count:number;initialCount:number;weight:number;
  feed:Feed;enhanced:boolean;autoBuy:boolean;bottom:number;pressure:number;condition:number;energy:number;family:number;market:number;
  rng:{world:number;sample:number};prepIndex:number;accepted:string[];choices:Record<string,string>;
  job:null|{step:string;option:string;remaining:number;repair:boolean};awaiting:boolean;failed:boolean;reports:Report[];
  pending:EventId|null;seen:string[];weatherDay:number;backupUntil:number;drainCleaned:boolean;
  delayed:{id:string;day:number;kind:'relief'|'explain';done:boolean}[];
  observation:{day:number;low:number;high:number;weight:number;environment:string};
  lastSample:number;lastMaintain:number;lastRest:number;lastClean:number;ledger:Ledger[];log:Log[];
  history:{day:number;cash:number;stock:number;low:number;high:number}[];result:Result|null;
}
export type Action =
  |{type:'health';id:'test'|'ignore'|'manage'|'close'}
  |{type:'register';name:string;gender:Gender}|{type:'talk';conversation:string;answer:string}
  |{type:'prep';step:string;option:string}|{type:'accept';step:string}|{type:'repair';step:string}
  |{type:'stock';count:80000|100000}|{type:'advance';days:number}
  |{type:'strategy';feed:Feed;enhanced:boolean;autoBuy:boolean}|{type:'choice';id:string}
  |{type:'lab-send';sample:SampleKind}|{type:'lab-decision';id:'continue'|'manage'|'close'}
  |{type:'survey-defer'}
  |{type:'buy'|'sample'|'maintain'|'rest'|'clean'|'harvest'|'stop'};
export const INITIAL_CASH=4800000;
export const FEED_PRICE=800; // 分/kg；库存以克保存
const clamp=(n:number,l:number,h:number)=>Math.min(h,Math.max(l,n));
export function hash(s:string){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0||1;}
function random(g:Campaign,key:'world'|'sample'){let x=g.rng[key];x^=x<<13;x^=x>>>17;x^=x<<5;g.rng[key]=x>>>0||1;return g.rng[key]/4294967296;}
function log(g:Campaign,title:string,text:string){g.log.push({day:g.day,title,text});}
export const unlimitedFunds=(g:Pick<Campaign,'rules'>)=>g.rules===HEALTH_RULES;
// 周转金只用于完成付款，不计作销售收入或经营利润。
function pay(g:Campaign,amount:number,kind:Ledger['kind'],text:string){if(g.cash+amount<0){if(!unlimitedFunds(g))throw Error('现金不足，尚未执行。可调整计划或止损。');const extra=-(g.cash+amount);g.cash+=extra;g.ledger.push({day:g.day,amount:extra,kind:'funding',text:'追加周转金'});}g.cash+=amount;g.ledger.push({day:g.day,amount,kind,text});if(kind==='capital')g.capital-=amount;}
export function newCampaign(seed='塘边第一造',id=seed,challenge:boolean|'health'|'production'=false):Campaign {
  const production=challenge==='production';if(production)challenge='health';
  return {...(production?{production:newProduction(),laboratory:newLaboratory(hash(seed+'laboratory'))}:{}),schema:2,rules:challenge==='health'?HEALTH_RULES:challenge?CHALLENGE_RULES:CAMPAIGN_RULES,...(challenge==='health'?{health:newHealth(hash(seed+'health'))}:{}),id,seed,revision:0,commands:[],mode:'earthen',phase:'prep',day:0,stockingDay:null,
    cash:INITIAL_CASH,debt:0,capital:0,stock:0,usedFeed:0,count:0,initialCount:0,weight:80,feed:'balanced',enhanced:false,autoBuy:true,
    bottom:15,pressure:15,condition:90,energy:88,family:50,market:3400,rng:{world:hash(seed+'world'),sample:hash(seed+'sample')},
    prepIndex:0,accepted:[],choices:{},job:null,awaiting:false,failed:false,reports:[],pending:null,seen:[],weatherDay:0,backupUntil:0,drainCleaned:false,delayed:[],
    observation:{day:0,low:0,high:0,weight:80,environment:'尚未检测'},lastSample:-1,lastMaintain:-1,lastRest:-1,lastClean:-1,ledger:[],log:[{day:0,title:'接手家塘',text:'从已有土塘的勘察开始。所有金额、时长和生产参数均为游戏设定。'}],history:[],result:null};
}
export function cultureDay(g:Campaign){return g.stockingDay===null?0:g.day-g.stockingDay;}
export function survivalRate(g:Campaign){return g.initialCount&&!(g.phase==='ended'&&g.result?.survivors===undefined)?((g.result?.survivors??g.count)/g.initialCount*100):null;}
export function feedReference(day:number){const d=Math.max(1,day);return Math.round(d<=30?100+1600*Math.pow((d-1)/29,1.35):1700+50*(d-30));}
export function feedPlan(g:Campaign){if(g.production)return productionFeed(g,FEEDS.find(f=>f.id===g.feed)!.factor);const base=feedReference(cultureDay(g)+1),factor=FEEDS.find(f=>f.id===g.feed)!.factor;const perTenThousand=Math.round(base*factor);return {base,perTenThousand,total:Math.round(perTenThousand*g.initialCount/10000),meal:perTenThousand/4};}
export function runningCost(g:Campaign){return g.enhanced?13500:9500;}
export function operatingCosts(g:Campaign){return -g.ledger.filter(x=>x.kind==='expense').reduce((n,x)=>n+x.amount,0)+Math.round(g.usedFeed*FEED_PRICE/1000)+Math.round(g.capital*.1)+g.debt;}
export function quote(g:Campaign,weight=g.weight){return g.production?sizePrice(weight,g.market):g.market;}
export function environment(g:Campaign){return g.pressure>=60?'摄食减弱，环境承压':g.pressure>=35?'需要留意':'观察相对平稳';}
function buy(g:Campaign){pay(g,-160000,'feed','饲料入库200 kg');g.stock+=200000;}
function observe(g:Campaign){const mass=g.count*g.weight/1000,center=mass*(.9+random(g,'sample')*.2);g.observation={day:g.day,low:Math.round(center*.8),high:Math.round(center*1.2),weight:Math.round(g.weight*(.94+random(g,'sample')*.12)),environment:environment(g)};recordProductionSample(g);}
function finish(g:Campaign,normal:boolean){
  const revised=g.rules===HEALTH_RULES;
  if(g.health?.episode&&['ahpnd','wssv'].includes(g.health.episode.kind)&&g.health.episode.stage!=='over')g.health.closed=true;
  const healthClosure=!!g.health?.closed;
  if(healthClosure){if(!revised)g.count=0;const disposal=revised?120000:Math.min(g.cash,120000);pay(g,-disposal,'expense','停养处置费');}
  const sale=!healthClosure&&normal&&g.stockingDay!==null&&(revised||cultureDay(g)>=45);
  const harvest=g.stockingDay===null?0:Math.round(g.count*g.weight/1000),rate=sale?quote(g):Math.round(quote(g)*.65),revenue=Math.round(harvest*rate/1000);
  pay(g,revenue,'sale',healthClosure&&revised?'剩余活虾抢收清算':sale?'实际出虾收入':'准备结束 / 清塘收入');
  if(harvest>0){const fee=revised?80000:Math.min(g.cash,80000);pay(g,-fee,'expense','起捕费（应付¥800）');g.debt=80000-fee;}
  const costs=operatingCosts(g),profit=revenue-costs,outcome=revised?settlementOutcome(g,profit,harvest):undefined,success=revised?outcome==='success':sale&&harvest>0&&profit>=0&&g.debt===0&&g.accepted.length===PREPARATION.length&&challengePassed(g,profit);
  const reasons=[`经营${g.day}天，其中放苗后${cultureDay(g)}天；${g.accepted.length}/9项准备通过验收。`,
    g.choices.P01==='rebuild'?'系统整备投入较高，保留了设备余量和备用供电；仍支付运行和维护费用。':'局部修整节省了前期资金，排水死角通过后期维护或降低负荷应对。',
    `实际收入减已发生费用、已用饲料成本和设备本造10%折旧，经营利润为${(profit/100).toFixed(2)}元。剩余饲料与设备不算销售收入。`,
    sale?'你按当前规格与市场完成出售；继续等待的成本和风险在此停止。':'你选择或因时间预算结束而止损；未将未成熟在塘量当作成功。',
    g.delayed.some(x=>x.kind==='relief'&&x.done)?'你付费安排替班并兑现家庭约定。':g.delayed.some(x=>x.done)?'你选择留塘，家庭约定延后，这一代价保留在回顾中。':'家庭事件尚未发生或尚未到兑现日。'];
  if(isChallenge(g)&&!revised)reasons.push(...challengeChecks(g,profit).map(c=>(c.passed?'✓ 已达成：':'未达成：')+c.name));
  if(g.health?.episode)reasons.push(`本造健康风险：${g.health.episode.tested?ILLNESSES[g.health.episode.kind].name:'未确诊的健康异常'}；累计模拟损失 ${g.health.lost.toLocaleString()} 尾。${g.health.closed?'本造停养，未将病死虾作为正常商品出售。':'应对费用和减产均已进入账本。'}`);
  if(g.debt)reasons.push(`仍有起捕尾款${(g.debt/100).toFixed(2)}元未付，已计入成本，因此不能解锁。`);
  const concise=[...(diseaseForced(g)?['病害暴发，被迫提前抢收。']:[]),`本造${profit<0?'亏损':'盈利'} ¥${(Math.abs(profit)/100).toFixed(2)}${profit<0?'，未能守住这一造。':'。'}`,...(healthClosure?[`抢收仅计算剩余活虾，累计健康损失 ${g.health!.lost.toLocaleString()} 尾。`]:[]),...(g.debt?[`未付起捕费 ¥${(g.debt/100).toFixed(2)} 已计入成本。`]:[])];
  g.result={id:g.id+':settlement',kind:sale?'sale':'stop',harvest,rate,revenue,costs,profit,success,...(revised?{outcome,survivors:g.count}:{}),title:revised?(outcome==='cancelled'?'暂别塘口':profit<0?'本造亏损':diseaseForced(g)?'抢收之后 · 保住了利润':'把这一造收稳了'):healthClosure?(g.cash===0?'经营破产 · 停养清算':'病害或事故迫停 · 本造亏损'):success?(isChallenge(g)?'百里挑一 · 守住这一造':'把这一造收稳了'):sale?'出了虾，也留下功课':'止损，留住下一次机会',reasons:revised?(outcome==='cancelled'?['这一造尚未产生盈亏，可以随时重新开始。']:concise):reasons};
  g.count=0;g.phase='ended';if(g.production)g.production.surveyPending=false;if(g.laboratory)g.laboratory.decisionPending=false;if(g.health)g.health.pending=false;g.pending=null;g.job=null;g.awaiting=false;g.failed=false;
  log(g,'本造结算',revised?(profit<0?'本造亏损，经营记录已保留。':'本造收入与成本已结清。'):success?'经营成功，取得小棚资格。V2尚未发布。':'本次未取得小棚资格。复盘账本和选择，仍可重新开局。');
}
function trigger(g:Campaign){
  if(g.day>=120){g.pending='limit';return;}
  const d=cultureDay(g);
  if(d>=24&&g.choices.P01==='local'&&!g.seen.includes('drain'))g.pending='drain';
  else if(d>=32&&!g.seen.includes('weather')){g.pending='weather';g.weatherDay=g.day+3;}
  else if(d>=42&&!g.seen.includes('family'))g.pending='family';
  else if(g.day>=106&&!g.seen.includes('market'))g.pending='market';
}
function tick(g:Campaign):boolean {
  if(g.day>=120||g.pending||g.health?.pending||g.production?.surveyPending||g.laboratory?.decisionPending)return false;
  if(g.phase==='prep'){
    if(!g.job||g.awaiting)return false;
    g.day++;laboratoryDay(g);g.job.remaining--;g.energy=clamp(g.energy+1,0,100);
    if(g.job.remaining===0){g.awaiting=true;log(g,'作业完成，等待验收',PREPARATION[g.prepIndex].name+'尚未自动通过，请检查记录。');}
    if(g.day===120)g.pending='limit';return true;
  }
  const ration=feedPlan(g).total,needsBuy=g.stock<ration;
  if((needsBuy&&!g.autoBuy)||!unlimitedFunds(g)&&g.cash<runningCost(g)+(needsBuy?160000:0)){g.pending='funds';log(g,'时间暂停',unlimitedFunds(g)?'饲料不足，等待补料。':'下一日现金或饲料不足；未扣除本日资源。');return false;}
  if(needsBuy)buy(g);
  g.day++;pay(g,-runningCost(g),'expense',g.enhanced?'加强增氧与基础人工':'常规增氧与基础人工');g.stock-=ration;g.usedFeed+=ration;
  // 每日唯一生产结算：延迟安排 → 天气/设备 → 底部/环境 → 摄食生长/损失 → 市场/记录。
  for(const task of g.delayed.filter(x=>!x.done&&x.day<=g.day)){task.done=true;if(task.kind==='relief'){g.family=clamp(g.family+15,0,100);g.energy=clamp(g.energy+15,0,100);log(g,'替班到位，约定兑现','三天前支付的替班费用已生效，没有再次扣款。');}else{g.family=clamp(g.family-12,0,100);g.energy=clamp(g.energy-8,0,100);log(g,'这次仍留在塘边','没有安排替班，家庭协作下降，约定留待以后。');}}
  const weather=g.weatherDay>0&&g.day>=g.weatherDay&&g.day<g.weatherDay+3;
  const outage=weather&&random(g,'world')<.22,covered=g.backupUntil>=g.day;
  if(outage)log(g,'区域供电波动',covered?'本次备用电源维持设备运行，未额外扣产。':'缺少可用备用电源，影响进入今日环境结算。');
  const drain=g.choices.P01==='local'&&!g.drainCleaned;
  g.bottom=clamp(g.bottom+(g.production?-.5+g.production.organic*.12+Math.max(0,ration-g.production.leftover)/1000*.015:(g.feed==='push'?1.4:g.feed==='careful'?-.8:.2))+(drain?.4:0),0,100);
  const capacity=g.choices.P01==='rebuild'?7:3,load=g.initialCount===100000?3:1;
  g.pressure=clamp(g.pressure*.82+g.bottom*.055+load+(g.production?g.production.organic*.08:g.feed==='push'?5:0)+(isChallenge(g)?5:0)+(weather?(isChallenge(g)?12:8):0)+(outage&&!covered?25:0)+(g.condition<55?5:0)-capacity*(g.condition/100)-(g.enhanced?3:0),0,100);
  const production=g.production?productionDay(g,ration,weather):null;
  const growth=production?Math.min(production.growthCap*healthGrowth(g),ration/Math.max(1,g.count)*1000/production.conversion):Math.min(450,ration/Math.max(1,g.count)*1000/1.25)*(1-g.pressure/160)*healthGrowth(g);
  production?.record(growth*g.count/1000*production.conversion);
  g.weight=Math.round(clamp(g.weight+growth,80,45000));
  const loss=.0002+Math.max(0,g.pressure-(isChallenge(g)?30:40))*.00016*(.7+random(g,'world')*.6);
  g.count=Math.max(0,g.count-Math.round(g.count*loss));g.condition=clamp(g.condition-(isChallenge(g)?(g.enhanced?1.1:.85):(g.enhanced?.65:.4)),0,100);g.energy=clamp(g.energy+1,0,100);
  const healthLost=g.health?.lost??0;laboratoryDay(g);healthStep(g);
  if(g.production&&(g.health?.lost??0)>healthLost)g.production.nextSurvey=Math.min(g.production.nextSurvey,g.day);
  if(g.health?.episode&&g.count<g.initialCount*.18){g.health.closed=true;finish(g,false);return false;}
  g.market=Math.round(clamp(g.market+(random(g,'world')-.49)*170,2500,4400));
  if(g.production&&g.day>=g.production.nextSurvey&&g.day<120)g.production.surveyPending=true;
  if(cultureDay(g)%7===0){g.observation.environment=environment(g);log(g,'巡塘周记',environment(g)+'。规格和在塘量仍沿用上次抽样估计。');}
  const warnings=[['equipment',g.condition<60,'设备完好度低于60，建议安排维护。'],['load',g.pressure>=55,'摄食出现减弱迹象，可减料、加强增氧或检测。'],['liquidity',!unlimitedFunds(g)&&g.cash<runningCost(g)*7+320000,'现金不足以覆盖七天固定开支加两次补料。请查看库存、调整策略或考虑出虾。']] as const;
  let warned=false;for(const [id,test,text] of warnings){if(test&&!g.seen.includes(id)){g.seen.push(id);log(g,'管理预警',text);warned=true;}}
  g.history.push({day:g.day,cash:g.cash,stock:g.stock,low:g.observation.low,high:g.observation.high});trigger(g);return !warned&&!g.health?.pending&&!g.production?.surveyPending&&!g.laboratory?.decisionPending;
}
export function repairCost(g:Campaign){return g.prepIndex===4?30000:45000;}
export function weatherCost(g:Campaign){return g.choices.P01==='rebuild'?20000:90000;}
export function dispatchCampaign(current:Campaign,action:Action,command:string,expectedRevision=current.revision):Campaign {
  if(current.commands.includes(command)||expectedRevision!==current.revision)return current;
  // 角色资料是向后兼容的可选字段；旧档只补建角色，不重置天数、账本或资格。
  if(action.type==='register'||action.type==='talk'){
    const g=structuredClone(current);
    if(action.type==='register'){
      if(g.story)throw Error('已经建立角色档案，不能覆盖当前身份。');
      g.story={version:1,player:{name:action.name.trim(),gender:action.gender},memories:[]};
      validateNarrative(g.story,g.day);
      log(g,'角色建档',`${g.story.player.name}接过了塘口的钥匙。原有经营进度保留。`);
    }else{
      const scene=availableConversation(g),option=scene?.options.find(o=>o.id===action.answer);
      if(!g.story||!scene||scene.id!==action.conversation||!option)throw Error('这段对话当前不可用，或已经作答。');
      g.story.memories.push({id:scene.id,answer:option.id,day:g.day});
      log(g,scene.title,`${option.line} ${option.reply}`);
    }
    g.revision++;g.commands.push(command);g.commands=g.commands.slice(-200);recordDecision(g,current,action);validateCampaign(g);return g;
  }
  if(current.phase==='ended')throw Error('本造已结算，不能重复领取或继续生产。');
  const g=structuredClone(current);
  if(g.laboratory?.decisionPending&&!['lab-decision','stop'].includes(action.type))throw Error('请先回应送样报告。');
  if(g.health?.pending&&!['health','stop','lab-send','lab-decision'].includes(action.type))throw Error('请先回应健康异常，时间已暂停。');
  const prep=()=>{if(g.phase!=='prep'||g.pending)throw Error('当前不能执行前处理操作。');};
  const growing=()=>{if(g.phase!=='growing'||g.pending==='limit')throw Error('当前不能执行日常养成操作。');};
  if(action.type==='lab-send'){
    if(!['shrimp','environment'].includes(action.sample))throw Error('未知样品类型。');sendSample(g,action.sample);pay(g,-120000,'expense',action.sample==='shrimp'?'虾体样WSSV定量检测':'环境样WSSV定量检测');log(g,'样品送出','预计两天后回报，等待期间风险和日常成本继续。');
  }else if(action.type==='lab-decision'){
    if(!['continue','manage','close'].includes(action.id))throw Error('未知报告选择。');labDecision(g,action.id);if(action.id==='manage')pay(g,-220000,'expense','专业协助与七天生物安全管理');if(action.id==='close')finish(g,false);
  }else if(action.type==='health'){
    if(action.id==='test'&&g.laboratory&&g.health?.episode?.kind==='wssv'){sendSample(g,'shrimp');pay(g,-120000,'expense','虾体样WSSV定量检测');log(g,'样品送出','预计两天后回报，等待期间风险和日常成本继续。');}
    else healthChoice(g,action.id,(amount,text)=>pay(g,-amount,'expense',text));if(g.health?.closed)finish(g,false);}
  else if(action.type==='prep'){
    prep();const step=PREPARATION[g.prepIndex];if(!step||action.step!==step.id||g.job||g.awaiting)throw Error('请先完成当前作业与验收。');
    const option=step.options.find(x=>x.id===action.option);if(!option)throw Error('未知方案。');
    pay(g,-option.cost,option.capital?'capital':'expense',step.name+'：'+option.name);g.choices[step.id]=option.id;
    g.job={step:step.id,option:option.id,remaining:option.days,repair:false};
    if(step.id==='P02'&&option.id==='self')g.energy=clamp(g.energy-12,0,100);
    if(step.id==='P07'){if(option.id==='watch')g.energy=clamp(g.energy-8,0,100);else g.family=clamp(g.family+5,0,100);}
    if(step.id==='P03'&&option.id==='extra')g.bottom=5;
    log(g,'安排作业',`${step.name}：${option.name}，${option.days}天。费用已入账，完成后需验收。`);
  }else if(action.type==='accept'){
    prep();if(!g.job||!g.awaiting||g.failed||action.step!==g.job.step)throw Error('作业尚未完成或必须先修复。');
    const step=g.job.step;
    const failed=!g.job.repair&&((step==='P04'&&g.choices.P00==='walk'&&g.choices.P04==='standard')||(step==='P06'&&g.choices.P05==='rushed'));
    const text=failed?(step==='P04'?'发现未封闭的过滤接口，修复后再试。':'处理记录不全，需补做并取得新报告。'):'本阶段记录与当前作业匹配，通过游戏验收。';
    g.reports.push({step,day:g.day,passed:!failed,text});g.failed=failed;log(g,failed?'验收未通过':'验收通过',PREPARATION[g.prepIndex].name+'：'+text);
    if(!failed){g.accepted.push(step);g.prepIndex++;g.job=null;g.awaiting=false;}
  }else if(action.type==='repair'){
    prep();if(!g.job||!g.failed||action.step!==g.job.step)throw Error('没有需要返工的任务。');
    const cost=repairCost(g);pay(g,-cost,'expense','修复原因并重新检查');g.job={...g.job,repair:true,remaining:g.prepIndex===4?1:2};g.failed=false;g.awaiting=false;log(g,'返工已安排','先修复具体原因，等待完成后取得新的验收记录。');
  }else if(action.type==='stock'){
    prep();if(g.prepIndex!==9||g.job||g.accepted.length!==9)throw Error('九项准备未全部验收，不能放苗。');
    if(action.count!==80000&&action.count!==100000)throw Error('不支持的放苗数量。');
    if(g.day>=120)throw Error('本局时间预算已用完。');
    pay(g,-action.count*6,'expense',`本次核验苗批次，放苗${action.count/10000}万尾`);pay(g,-250000,'expense','本造塘租');buy(g);
    g.initialCount=g.count=action.count;g.stockingDay=g.day;g.phase='growing';stockLaboratory(g);observe(g);if(g.production)g.lastSample=g.day;log(g,'放苗完成',`经营第${g.day}天开始养殖计时，剩余${120-g.day}天。${g.production?'投喂依据抽样存塘量和阶段料比，每七天复核。':'投喂统一按初始放苗尾数计算。'}`);
  }else if(action.type==='advance'){
    if(!Number.isInteger(action.days)||action.days<1||action.days>7)throw Error('每次推进1—7天。');
    for(let i=0;i<action.days;i++){if(!tick(g)||g.pending||g.health?.pending||g.laboratory?.decisionPending||g.awaiting||g.phase==='ended')break;}
  }else if(action.type==='survey-defer'){
    growing();if(!g.production?.surveyPending)throw Error('当前没有待复核的存塘记录。');g.production.surveyPending=false;g.production.nextSurvey=g.day+3;log(g,'我延后了抽样','三天后再复核；投喂仍沿用旧抽样推算。');
  }else if(action.type==='strategy'){
    growing();if(!FEEDS.some(x=>x.id===action.feed)||typeof action.enhanced!=='boolean'||typeof action.autoBuy!=='boolean')throw Error('无效策略。');
    g.feed=action.feed;g.enhanced=action.enhanced;g.autoBuy=action.autoBuy;log(g,'管理策略更新',`${FEEDS.find(x=>x.id===g.feed)!.name}投喂，${g.enhanced?'加强':'常规'}增氧；次日起逐日执行。`);
  }else if(action.type==='choice'){
    const ev=g.pending;if(!ev)throw Error('当前没有等待选择的事件。');
    if(ev==='drain'){
      if(action.id==='clean'){pay(g,-80000,'expense','兑现排水死角清理安排');g.bottom=clamp(g.bottom-22,0,100);g.drainCleaned=true;}else if(action.id==='light')g.feed='careful';else throw Error('无效选择。');
    }else if(ev==='weather'){
      if(action.id==='backup'){pay(g,-weatherCost(g),'expense','本次天气窗口备用电源与燃料');g.backupUntil=g.weatherDay+3;}else if(action.id==='watch'){g.energy=clamp(g.energy-18,0,100);g.feed='careful';}else throw Error('无效选择。');
    }else if(ev==='family'){
      if(action.id!=='relief'&&action.id!=='explain')throw Error('无效选择。');
      if(action.id==='relief')pay(g,-45000,'expense','三天后家庭日程替班');g.delayed.push({id:g.id+':family',day:g.day+3,kind:action.id,done:false});
    }else if(ev==='market'||ev==='limit'){
      if(action.id==='sell')finish(g,true);else if(action.id==='stop'&&ev==='limit')finish(g,false);else if(action.id!=='wait'||ev!=='market')throw Error('无效选择。');
    }else if(ev==='funds'){if(action.id==='stop')finish(g,false);else if(action.id==='sell')finish(g,true);else if(action.id==='retry'){if(unlimitedFunds(g)&&g.stock<feedPlan(g).total)buy(g);}else throw Error('无效选择。');}
    if(!g.seen.includes(ev))g.seen.push(ev);g.pending=null;log(g,'事件选择已记录',`${ev==='family'?'家庭安排将在三天后兑现':ev==='drain'?'排水问题已选择应对路线':ev==='weather'?'天气准备已记录':'经营决定已记录'}。`);
  }else if(action.type==='harvest'){if(g.health?.episode&&g.health.episode.kind!=='ehp'&&g.health.episode.kind!=='oxygen'&&g.health.episode.stage!=='over')throw Error('急性病害尚未结束，可继续观察或选择病害抢收。');if(g.phase!=='growing'||g.rules!==HEALTH_RULES&&cultureDay(g)<45||g.pending&&g.pending!=='limit'&&g.pending!=='market')throw Error('请先处理当前事件，再安排出虾。');finish(g,true);
  }else if(action.type==='stop'){if(g.health?.episode&&g.health.episode.stage!=='over')g.health.closed=true;finish(g,false);
  }else{
    growing();
    if(action.type==='buy')buy(g);
    if(action.type==='sample'){if(g.lastSample===g.day)throw Error('今日已检测，记录已保留。');pay(g,-20000,'expense','抽样检测');observe(g);g.lastSample=g.day;log(g,'抽样记录',`${environment(g)}。估计区间不等于真实存活率，检测不直接改善生产。`);}
    if(action.type==='maintain'){if(g.lastMaintain===g.day)throw Error('今日已维护。');pay(g,-60000,'expense','设备维护');g.condition=clamp(g.condition+28,0,100);g.lastMaintain=g.day;log(g,'维护设备','恢复28点完好度；设备能力上限仍由整备方案决定。');}
    if(action.type==='rest'){if(g.lastRest===g.day)throw Error('今日已安排休息。');pay(g,-15000,'expense','休息替班');g.energy=clamp(g.energy+20,0,100);g.lastRest=g.day;}
    if(action.type==='clean'){if(g.lastClean===g.day)throw Error('今日已清理。');pay(g,-50000,'expense','底部维护');g.bottom=clamp(g.bottom-18,0,100);if(g.production)g.production.organic*=.55;g.lastClean=g.day;log(g,'底部维护','清除部分沉积残饵与底部负担，后续仍受投喂与排水条件影响。');}
  }
  g.revision++;g.commands.push(command);g.commands=g.commands.slice(-200);recordDecision(g,current,action);validateCampaign(g);return g;
}

export function validateCampaign(value:unknown):asserts value is Campaign {
  const fail=()=>{throw Error('存档内容不完整或规则不一致；请保留原文件，恢复备份。');};
  if(!value||typeof value!=='object')fail();const g=value as Campaign;
  if(g.schema!==2||![CAMPAIGN_RULES,CHALLENGE_RULES,HEALTH_RULES,LEGACY_HEALTH_RULES].includes(g.rules)||g.mode!=='earthen'||!['prep','growing','ended'].includes(g.phase))fail();
  const num=(n:unknown,min:number,max:number,integer=false)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))fail();};
  num(g.day,0,120,true);num(g.revision,0,1e7,true);num(g.cash,0,1e9,true);num(g.debt,0,80000,true);num(g.capital,0,1e8,true);num(g.stock,0,1e9,true);num(g.usedFeed,0,1e9,true);num(g.initialCount,0,100000,true);num(g.count,0,g.initialCount,true);num(g.weight,80,45000,true);num(g.market,2500,4400,true);num(g.prepIndex,0,9,true);
  if(g.story!==undefined)validateNarrative(g.story,g.day);
  validateDecision(g);
  validateHealth(g);
  validateProduction(g);
  validateLaboratory(g);
  for(const key of ['energy','condition','pressure','bottom','family'] as const)num(g[key],0,100);
  for(const key of ['awaiting','failed','enhanced','autoBuy','drainCleaned'] as const)if(typeof g[key]!=='boolean')fail();
  if(typeof g.id!=='string'||!g.id||g.id.length>150||typeof g.seed!=='string'||g.seed.length>80||!FEEDS.some(x=>x.id===g.feed))fail();
  if(!g.rng)fail();num(g.rng.world,1,4294967295,true);num(g.rng.sample,1,4294967295,true);
  if(g.stockingDay!==null)num(g.stockingDay,0,g.day,true);
  for(const key of ['lastSample','lastMaintain','lastRest','lastClean'] as const)num(g[key],-1,g.day,true);
  num(g.weatherDay,0,123,true);num(g.backupUntil,0,130,true);
  for(const key of ['commands','accepted','reports','seen','delayed','ledger','log','history'] as const)if(!Array.isArray(g[key])||g[key].length>10000)fail();
  if(g.commands.length>200||new Set(g.commands).size!==g.commands.length||g.commands.some(x=>typeof x!=='string')||g.seen.some(x=>typeof x!=='string'))fail();
  if(g.accepted.length!==g.prepIndex||g.accepted.some((x,i)=>x!==PREPARATION[i]?.id))fail();
  if(!g.choices||typeof g.choices!=='object'||Object.entries(g.choices).some(([k,v])=>!PREPARATION.find(s=>s.id===k)?.options.some(o=>o.id===v)))fail();
  if(g.accepted.some(id=>!g.choices[id]))fail();
  if(g.pending!==null&&!['drain','weather','family','market','funds','limit'].includes(g.pending))fail();
  if(g.job){if(g.phase!=='prep'||g.job.step!==PREPARATION[g.prepIndex]?.id||g.job.option!==g.choices[g.job.step]||typeof g.job.repair!=='boolean')fail();num(g.job.remaining,0,8,true);if((g.job.remaining===0)!==g.awaiting)fail();}else if(g.awaiting||g.failed)fail();
  if(g.failed&&(!g.awaiting||![4,6].includes(g.prepIndex)))fail();
  for(const r of g.reports){if(!r||!PREPARATION.some(s=>s.id===r.step)||typeof r.passed!=='boolean'||typeof r.text!=='string')fail();num(r.day,0,g.day,true);}
  if(g.accepted.some(id=>!g.reports.some(r=>r.step===id&&r.passed)))fail();
  for(const e of g.ledger){if(!e||!['expense','capital','feed','sale','funding'].includes(e.kind)||typeof e.text!=='string'||e.kind==='funding'&&!unlimitedFunds(g))fail();num(e.day,0,g.day,true);num(e.amount,-1e8,1e8,true);if((['sale','funding'].includes(e.kind)&&e.amount<0)||(!['sale','funding'].includes(e.kind)&&e.amount>0))fail();}
  if(INITIAL_CASH+g.ledger.reduce((n,e)=>n+e.amount,0)!==g.cash||-g.ledger.filter(e=>e.kind==='capital').reduce((n,e)=>n+e.amount,0)!==g.capital)fail();
  if(Math.round(-g.ledger.filter(e=>e.kind==='feed').reduce((n,e)=>n+e.amount,0)*1000/FEED_PRICE)!==g.stock+g.usedFeed)fail();
  for(const x of g.log){if(!x||typeof x.title!=='string'||typeof x.text!=='string')fail();num(x.day,0,g.day,true);}
  for(const x of g.history){if(!x)fail();num(x.day,0,g.day,true);num(x.cash,0,1e9,true);num(x.stock,0,1e9,true);num(x.low,0,1e9,true);num(x.high,x.low,1e9,true);}
  if(!g.observation)fail();num(g.observation.day,0,g.day,true);num(g.observation.low,0,1e9,true);num(g.observation.high,g.observation.low,1e9,true);num(g.observation.weight,0,50000,true);if(typeof g.observation.environment!=='string')fail();
  for(const x of g.delayed){if(!x||typeof x.id!=='string'||!['relief','explain'].includes(x.kind)||typeof x.done!=='boolean')fail();num(x.day,0,123,true);if(x.done&&x.day>g.day)fail();}
  if(new Set(g.delayed.map(x=>x.id)).size!==g.delayed.length)fail();
  if(g.phase==='prep'&&(g.stockingDay!==null||g.initialCount!==0||g.pending&&g.pending!=='limit'))fail();
  if(g.phase==='growing'&&(g.stockingDay===null||g.prepIndex!==9||![80000,100000].includes(g.initialCount)||g.job))fail();
  if(g.phase!=='ended'&&g.result!==null)fail();
  if(g.phase==='ended'){
    const r=g.result;if(!r||g.count!==0||g.pending||g.job)fail();
    if(r!.id!==g.id+':settlement'||!['sale','stop'].includes(r!.kind)||typeof r!.success!=='boolean'||typeof r!.title!=='string'||!Array.isArray(r!.reasons)||r!.reasons.some(x=>typeof x!=='string'))fail();
    num(r!.harvest,0,4500000,true);num(r!.revenue,0,1e9,true);num(r!.rate,0,g.production?10000:4400,true);
    if(r!.costs!==operatingCosts(g)||r!.profit!==r!.revenue-r!.costs||r!.revenue!==Math.round(r!.harvest*r!.rate/1000)||r!.revenue!==g.ledger.filter(e=>e.kind==='sale').reduce((n,e)=>n+e.amount,0))fail();
    if(g.rules===HEALTH_RULES){const expected=settlementOutcome(g,r!.profit,r!.harvest);if(r!.outcome!==expected||r!.success!==(expected==='success'))fail();num(r!.survivors!,0,g.initialCount,true);if(r!.harvest!==Math.round(r!.survivors!*g.weight/1000))fail();}
    else if(r!.success!==(r!.kind==='sale'&&r!.harvest>0&&r!.profit>=0&&g.debt===0&&g.prepIndex===9&&challengePassed(g,r!.profit))||r!.kind==='sale'&&cultureDay(g)<45)fail();
  }
}
