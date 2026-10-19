import { EVENTS, RULES, type EventId } from './content';
export type Feed = 'careful'|'balanced'|'push';
export type Aeration = 'normal'|'enhanced';
export type Status = 'pending'|'scheduled'|'done'|'broken';
export interface Entry {day:number; amount:number; category:string; text:string}
export interface Note {day:number; title:string; text:string; type:'info'|'warning'|'story'}
export interface Snapshot {day:number; cash:number; weight:number; stock:number; energy:number; pressure:string; biomassLow:number; biomassHigh:number}
export interface Observation {day:number; weight:number; low:number; high:number; environment:string}
export interface Effect {id:string; day:number; kind:'family'|'friend'; done:boolean}
export interface Result {title:string; day:number; harvest:number; revenue:number; costs:number; profit:number; cash:number; cause:string; premature:boolean}
export interface Game {
  schema:1; rules:string; seed:string; revision:number; day:number; phase:'setup'|'growing'|'ended';
  cash:number; stock:number; initialCount:number; count:number; weight:number; usedFeed:number;
  pressure:number; bottom:number; condition:number; energy:number; feed:Feed; aeration:Aeration; autoBuy:boolean;
  rng:{weather:number; market:number; sample:number}; stormNight:number; market:number;
  prep:'none'|'backup'|'friend'|'self'; family:Status; friend:Status; familyMode:string;
  promises:Effect[]; pending:EventId|null; seen:string[]; planDay:number; notices:string[];
  observation:Observation; lastInspect:number; lastSample:number; lastMaintain:number; lastRest:number;
  ledger:Entry[]; log:Note[]; history:Snapshot[]; commands:string[]; result:Result|null;
}
export type Action = {type:'start'; density:'small'|'standard'}|{type:'advance'; days:number}|{type:'choice'; choice:string}|{type:'strategy'; feed:Feed; aeration:Aeration; autoBuy:boolean}|{type:'buy'}|{type:'inspect'}|{type:'sample'}|{type:'maintain'}|{type:'rest'}|{type:'harvest'}|{type:'exit'};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function hash(s:string) {let h=2166136261; for (const c of s) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0 || 1;}
function random(g:Game,k:keyof Game['rng']) {let x=g.rng[k]; x^=x<<13;x^=x>>>17;x^=x<<5;g.rng[k]=x>>>0;return g.rng[k]/4294967296;}
function note(g:Game,title:string,text:string,type:Note['type']='info'){g.log.push({day:g.day,title,text,type});}
function cash(g:Game,amount:number,category:string,text:string){if(g.cash+amount<0) throw new Error('现金不足，操作未执行。'); g.cash+=amount;g.ledger.push({day:g.day,amount,category,text});}
function mark(g:Game,id:string){if(!g.seen.includes(id))g.seen.push(id);}
export function biomass(g:Game){return Math.round(g.count*g.weight/1000);}
export function quote(g:Game){return g.market;}
export function costs(g:Game){return -g.ledger.filter(e=>e.amount<0&&e.category!=='feed').reduce((a,e)=>a+e.amount,0)+Math.round(g.usedFeed*RULES.feedPrice/1000)+RULES.depreciation;}
export function estimate(g:Game){return {low:Math.round(g.observation.low*quote(g)/1000),high:Math.round(g.observation.high*quote(g)/1000)};}
export function newGame(seed='虾塘-2026'):Game {
  const g:Game={schema:1,rules:RULES.version,seed:seed.slice(0,80)||'虾塘-2026',revision:0,day:0,phase:'setup',cash:RULES.initialCash,stock:0,initialCount:0,count:0,weight:500,usedFeed:0,pressure:20,bottom:10,condition:88,energy:88,feed:'balanced',aeration:'normal',autoBuy:true,rng:{weather:hash(seed+'weather'),market:hash(seed+'market'),sample:hash(seed+'sample')},stormNight:0,market:2850,prep:'none',family:'pending',friend:'pending',familyMode:'none',promises:[],pending:null,seen:[],planDay:0,notices:[],observation:{day:0,weight:500,low:0,high:0,environment:'尚未放苗'},lastInspect:-1,lastSample:-1,lastMaintain:-1,lastRest:-1,ledger:[],log:[],history:[],commands:[],result:null};
  g.stormNight=random(g,'weather')<.35?30+Math.floor(random(g,'weather')*3):0;
  return g;
}
export function dailyFeed(g:Game){return Math.round(g.count*.28*1.35*({careful:.8,balanced:1,push:1.22}[g.feed]));}
export function dailyRunning(g:Game){return (g.aeration==='normal'?8500:13500)+3500;}
export function buyCost(){return 200*RULES.feedPrice;}
function buy(g:Game){cash(g,-buyCost(),'feed','购入饲料200千克');g.stock+=200000;}
function sample(g:Game,paid=true){if(paid){if(g.lastSample===g.day)throw new Error('今日已抽样，记录已保留。');cash(g,-20000,'sampling','抽样：规格与生物量估计');g.lastSample=g.day;}
  const trueMass=biomass(g), error=.85+random(g,'sample')*.3,center=trueMass*error;
  g.observation={day:g.day,weight:Math.round(g.weight*(.94+random(g,'sample')*.12)),low:Math.round(center*.8),high:Math.round(center*1.2),environment:pressureText(g.pressure)};
  note(g,'抽样记录已更新','估计含抽样误差，随时间推移会过时。检测本身不改善池塘。');
}
export function pressureText(n:number){return n>=65?'明显承压':n>=40?'需要留意':'相对平稳';}
function snapshot(g:Game){g.history.push({day:g.day,cash:g.cash,weight:g.observation.weight,stock:g.stock,energy:g.energy,pressure:g.observation.environment,biomassLow:g.observation.low,biomassHigh:g.observation.high});}
function finish(g:Game,premature=false){if(g.phase!=='growing')throw new Error('本造已经结算。');
  const mass=biomass(g),rate=premature?Math.round(g.market*.65):g.market;
  const revenue=Math.round(mass*rate/1000);
  // 起捕费用由交易收入先行抵扣；不足部分仅从可用现金支付，差额明确减免。
  cash(g,revenue,'sale',premature?'提前清塘收入（当日报价65%）':'全塘销售收入');
  const fee=Math.min(g.cash,80000);cash(g,-fee,'harvest','起捕费用');
  if(fee<80000)note(g,'小额尾款减免',`游戏救济规则：起捕费减免${((80000-fee)/100).toFixed(2)}元，无隐藏债务。`);
  const c=costs(g), title=premature?'止损，也是一次决定':g.day<=60?'先把这一造收稳':'再等一程，收下答案';
  g.result={title,day:g.day,harvest:mass,revenue,costs:c,profit:revenue-c,cash:g.cash,premature,cause:premature?'你选择提前结束，按清塘折价兑现现有生物量。':g.day<=60?'你在首个主要销售窗口或更早回款，停止了后续成本与风险。':'你承担了额外饲料、电费和时间，再按成交日条件出售。'};
  g.count=0;g.phase='ended';g.pending=null;g.planDay=0;
  note(g,'本造已结算',g.result.cause,'story');
}
function trigger(g:Game){
  const event=(id:EventId)=>{if(!g.seen.includes(id)){g.pending=id;return true;}return false;};
  if(g.day===28&&event('prepare'))return;
  if(g.day===29&&event('night'))return;
  if(g.day===30&&event('family'))return;
  if(g.day===33&&g.prep==='friend'&&event('return'))return;
  if(g.day===38&&g.familyMode==='postpone'&&!g.seen.includes('promise-family')){g.pending='promise';return;}
  if(g.day===39&&g.friend==='pending'&&g.seen.includes('friend-delay')&&!g.seen.includes('promise-friend')){g.pending='promise';return;}
  if(g.day===60&&event('sale'))return;
  if(g.day>=RULES.maxDay)g.pending='limit';
}
function tick(g:Game):boolean {
  const ration=dailyFeed(g), needBuy=g.stock<ration;
  if((needBuy&&!g.autoBuy)||g.cash<dailyRunning(g)+(needBuy?buyCost():0)) {g.pending='funds';note(g,'时间推进已暂停','下一日所需现金或饲料不足；本日未扣资源。','warning');return false;}
  g.day++; if(needBuy)buy(g);cash(g,-dailyRunning(g),'running',`${g.aeration==='normal'?'常规':'加强'}增氧与基础人工`);
  g.stock-=ration;g.usedFeed+=ration;
  const cloudy=g.day>=30&&g.day<=32, blackout=g.day===g.stormNight;
  const absent=g.promises.some(p=>p.day===g.day&&!p.done&&(p.kind==='friend'||(g.familyMode!=='relief'&&g.prep!=='friend')));
  const uncovered=(g.day===31&&g.familyMode==='attend'&&g.prep!=='friend')||absent;
  for(const p of g.promises.filter(p=>p.day===g.day&&!p.done)) {p.done=true;g[p.kind]='done';note(g,'约定已兑现',p.kind==='family'?'你按安排赴约，家庭协作得到保留。':'你履行了互助安排，留下下一造合作资格。','story');}
  const coverage=blackout&&g.prep!=='backup'?0:g.condition/100;
  const extra=(g.aeration==='enhanced'?7:0)*coverage;
  const stress=cloudy?9:0;
  const load=g.feed==='push'?5:g.feed==='careful'?-3:0;
  g.bottom=clamp(g.bottom+(g.feed==='push'?2:g.feed==='careful'?-1:0),0,100);
  g.pressure=clamp(Math.round(g.pressure*.87+stress+load+g.bottom*.025+3-extra+(blackout&&g.prep!=='backup'?24:0)+(uncovered?4:0)+(g.condition<55?4:0)),0,100);
  const growthFactor=clamp(1-g.pressure/160,.4,1);
  const growth=g.count===0?0:Math.round(Math.min(340,ration/1.35/g.count*1000)*growthFactor);
  g.weight=Math.min(40000,g.weight+growth);
  const draw=random(g,'weather');
  const lossRate=.00012+(g.pressure>50?(g.pressure-50)*.00015*(.6+draw*.8):0);
  g.count=Math.max(0,g.count-Math.floor(g.count*lossRate));
  g.condition=clamp(g.condition-(g.aeration==='enhanced'?0.6:0.4),0,100);
  const watch=cloudy&&g.prep==='self';g.energy=clamp(g.energy+(watch?-13:2)-(uncovered?2:0),0,100);
  // 精力低只降低观察质量/预警频率，不让操作失效，也不凭空扣产量。
  g.market=clamp(g.market+Math.round((random(g,'market')-.48)*150),2200,3800);
  if(blackout)note(g,'夜间区域停电',g.prep==='backup'?'备用供电维持了现有设备运行，环境仍按实际负荷结算。':'设备供电受到影响。环境负担已经进入统一生产计算，没有额外剧情扣产。','warning');
  else if(cloudy)note(g,'天气窗口记录','今晚未发生区域停电。天气与日常负荷仍在影响池塘。');
  if(g.day%7===0&&g.energy>=20){g.observation.environment=pressureText(g.pressure);note(g,'周度巡塘','观察：'+g.observation.environment+'。生物量仍沿用上次抽样，并非当前真值。');}
  if(g.pressure>=55&&!g.notices.includes('pressure')){g.notices.push('pressure');note(g,'摄食与环境预警','当前承压迹象较明显。可检查、调整投喂或加强增氧，效果有能力边界。','warning');}
  if(g.condition<60&&!g.notices.includes('equipment')){g.notices.push('equipment');note(g,'设备需要留意','完好度下降；维护可恢复设备能力，需要资金。','warning');}
  if(g.planDay===g.day){g.planDay=0;note(g,'到达复查日','之前安排的7日观察期已结束，可重新评估销售。','story');g.notices.push('checkpoint');}
  snapshot(g);trigger(g);return true;
}
function choose(g:Game,id:string){const e=g.pending;if(!e)throw new Error('当前没有待处理事件。');const option=EVENTS[e].choices.find(c=>c.id===id);if(!option)throw new Error('无效选项。');
  if(e==='night'&&id==='sample'&&g.lastSample===g.day)throw new Error('今日已抽样，可查看记录后选择其他应对。');
  if(e==='sale'&&id==='sample'){sample(g);return;}
  if(option.cost)cash(g,-option.cost,'service',EVENTS[e].title+'：'+option.title);
  g.pending=null;if(e!=='funds'&&e!=='promise')mark(g,e);
  note(g,EVENTS[e].title,`选择：${option.title}。${option.detail}`,'story');
  if(e==='prepare'){g.prep=id as Game['prep'];if(id==='friend')g.friend='pending';}
  if(e==='night'){if(id==='cautious')g.feed='careful';if(id==='sample'){g.lastSample=g.day;sample(g,false);}}
  if(e==='family'){
    g.familyMode=id;
    if(id==='postpone'){g.family='pending';}
    else {g.family='scheduled';g.promises.push({id:'family-original',day:31,kind:'family',done:false});}
  }
  if(e==='return'){
    if(id==='delay')mark(g,'friend-delay');
    else if(id==='help'){if(g.energy<12)throw new Error('精力不足12点，可先休息或安排替代人手。');g.energy-=12;g.friend='scheduled';g.promises.push({id:'friend-original',day:34,kind:'friend',done:false});}
    else g.friend='done';
  }
  if(e==='promise'){
    const who=g.day===38?'family':'friend';mark(g,'promise-'+who);
    if(id==='fulfill'){if(g.energy<12)throw new Error('精力不足12点，可先安排休息。');g.energy-=12;g[who]='scheduled';g.promises.push({id:'rescheduled-'+who,day:g.day+1,kind:who,done:false});}
    else g[who]='broken';
  }
  if(e==='sale'){if(id==='sell')finish(g);else if(id==='wait')g.planDay=g.day+7;}
  if(e==='funds'&&id==='exit')finish(g,true);
  if(e==='limit')finish(g);
}
export function dispatch(original:Game,action:Action,id:string,expected=original.revision):Game {
  if(original.commands.includes(id))return original;
  if(expected!==original.revision)throw new Error('此页面的进度已过时，请重新读取存档。');
  const g=structuredClone(original);
  if(g.phase==='ended')throw new Error('本造已结束，请在结算页查看复盘或开始新局。');
  if(g.phase==='setup'&&action.type!=='start')throw new Error('请先完成放苗准备。');
  if(action.type==='start'){
    if(g.phase!=='setup')throw new Error('已经放苗。');g.initialCount=action.density==='small'?80000:100000;g.count=g.initialCount;g.phase='growing';
    cash(g,-350000,'setup','整塘准备');cash(g,-250000,'rent','本造塘租');cash(g,-g.initialCount*6,'seed','虾苗投入');buy(g);buy(g);
    note(g,'接手家塘','已完成整塘、放苗并购入400千克饲料。家人约定在第31日；报价与所有养殖参数均为游戏设定。','story');sample(g,false);snapshot(g);
  } else if(action.type==='advance'){
    if(![1,3,7].includes(action.days))throw new Error('只能推进1、3或7日。');if(g.pending)throw new Error('请先处理当前事件。');
    for(let i=0;i<action.days;i++){const n=g.notices.length;if(!tick(g)||g.pending||g.notices.length>n)break;}
  } else if(action.type==='choice')choose(g,action.choice);
  else if(action.type==='strategy'){
    if(!['careful','balanced','push'].includes(action.feed)||!['normal','enhanced'].includes(action.aeration))throw new Error('策略参数无效。');
    g.feed=action.feed;g.aeration=action.aeration;g.autoBuy=action.autoBuy;note(g,'管理策略已调整','新策略从下一次推进开始执行。');
  } else if(action.type==='buy')buy(g);
  else if(action.type==='inspect'){
    if(g.lastInspect===g.day)throw new Error('今日已巡塘，请查看已有记录。');if(g.energy<8)throw new Error('精力不足，可先休息。');g.energy-=8;g.lastInspect=g.day;g.observation.environment=pressureText(g.pressure);note(g,'巡塘观察',g.observation.environment+'。观察无法给出真实存活率或诊断疾病。');
  } else if(action.type==='sample')sample(g);
  else if(action.type==='maintain'){
    if(g.lastMaintain===g.day)throw new Error('今日已维护。');cash(g,-60000,'maintenance','设备维护');g.condition=Math.min(100,g.condition+24);g.lastMaintain=g.day;note(g,'设备维护完成','完好度恢复24点，上限100；不会直接改善存活数量。');
  } else if(action.type==='rest'){
    if(g.lastRest===g.day)throw new Error('今日已安排休息。');cash(g,-15000,'service','休息时段的替班费用');g.energy=Math.min(100,g.energy+24);g.lastRest=g.day;note(g,'留一点时间给自己','支付替班费，恢复24点精力。');
  } else if(action.type==='harvest'){
    if(g.pending)throw new Error('请先处理当前事件，或使用事件内的销售选项。');if(g.day<RULES.minimumSaleDay)throw new Error('常规销售从第45日开放；也可选择提前清塘。');finish(g);
  } else if(action.type==='exit')finish(g,true);
  g.commands.push(id);g.revision++;validateGame(g);return g;
}
function assert(ok:unknown,message:string):asserts ok {if(!ok)throw new Error('存档校验失败：'+message);}
export function validateGame(value:unknown):asserts value is Game {
  assert(value&&typeof value==='object','缺少游戏对象');const g=value as Game;
  assert(g.schema===1&&g.rules===RULES.version,'不支持的存档或规则版本，请保留原文件');
  const num=(v:unknown,min:number,max:number,integer=true)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max&&(!integer||Number.isInteger(v));
  assert(typeof g.seed==='string'&&g.seed.length<=80,'种子');assert(['setup','growing','ended'].includes(g.phase),'阶段');
  for(const k of ['revision','day','cash','stock','initialCount','count','weight','usedFeed','market','planDay'] as const)assert(num(g[k],0,k==='cash'?1e10:1e9),k);
  assert(g.day<=84&&g.market>=2200&&g.market<=3800&&g.count<=g.initialCount&&g.initialCount<=100000&&g.weight<=40000,'生产边界');
  for(const k of ['pressure','bottom','condition','energy'] as const)assert(num(g[k],0,100,false),k);
  for(const k of ['lastInspect','lastSample','lastMaintain','lastRest'] as const)assert(num(g[k],-1,g.day),k);
  assert(['careful','balanced','push'].includes(g.feed)&&['normal','enhanced'].includes(g.aeration)&&typeof g.autoBuy==='boolean','策略');
  assert(['none','backup','friend','self'].includes(g.prep)&&['none','attend','relief','postpone'].includes(g.familyMode),'准备方式');
  assert(['pending','scheduled','done','broken'].includes(g.family)&&['pending','scheduled','done','broken'].includes(g.friend),'人物状态');
  assert(g.pending===null||Object.hasOwn(EVENTS,g.pending),'事件');assert([0,30,31,32].includes(g.stormNight),'天气');
  assert(g.rng&&Object.values(g.rng).length===3&&['weather','market','sample'].every(k=>num(g.rng[k as keyof Game['rng']],1,4294967295)),'随机状态');
  for(const k of ['seen','commands','notices'] as const)assert(Array.isArray(g[k])&&g[k].length<10000&&g[k].every(x=>typeof x==='string'&&x.length<200)&&new Set(g[k]).size===g[k].length,k);
  const obs=g.observation;assert(obs&&num(obs.day,0,g.day)&&num(obs.weight,0,50000)&&num(obs.low,0,1e10)&&num(obs.high,obs.low,1e10)&&typeof obs.environment==='string','观察记录');
  assert(Array.isArray(g.promises)&&g.promises.length<=10&&g.promises.every(p=>typeof p.id==='string'&&num(p.day,0,84)&&['family','friend'].includes(p.kind)&&typeof p.done==='boolean'&&(!p.done||p.day<=g.day)),'延迟效果');
  assert(new Set(g.promises.map(p=>p.id)).size===g.promises.length,'延迟效果重复');
  assert(Array.isArray(g.ledger)&&g.ledger.length<10000&&g.ledger.every(e=>num(e.day,0,g.day)&&num(e.amount,-1e10,1e10)&&typeof e.category==='string'&&typeof e.text==='string'),'账本');
  assert(RULES.initialCash+g.ledger.reduce((s,e)=>s+e.amount,0)===g.cash,'现金与流水不一致');
  const purchased=-g.ledger.filter(e=>e.category==='feed').reduce((a,e)=>a+e.amount,0)*1000/RULES.feedPrice;
  assert(purchased-g.usedFeed===g.stock,'库存与消耗不一致');
  assert(Array.isArray(g.log)&&g.log.length<10000&&g.log.every(e=>num(e.day,0,g.day)&&typeof e.title==='string'&&typeof e.text==='string'&&['info','warning','story'].includes(e.type)),'日志');
  assert(Array.isArray(g.history)&&g.history.length===(g.phase==='setup'?0:g.day+1)&&g.history.every((h,i)=>h.day===i&&num(h.cash,0,1e10)&&num(h.stock,0,1e10)&&num(h.weight,0,50000)&&num(h.energy,0,100,false)&&num(h.biomassLow,0,1e10)&&num(h.biomassHigh,h.biomassLow,1e10)&&typeof h.pressure==='string'),'历史记录');
  if(g.phase==='ended'){const r=g.result;assert(r&&g.pending===null&&g.count===0&&r.day===g.day&&r.cash===g.cash&&typeof r.title==='string'&&typeof r.cause==='string'&&typeof r.premature==='boolean','结算状态');assert(num(r.harvest,0,1e10)&&num(r.revenue,0,1e10)&&r.costs===costs(g)&&r.profit===r.revenue-r.costs&&r.revenue===g.ledger.filter(e=>e.category==='sale').reduce((a,e)=>a+e.amount,0),'结算账目');}
  else assert(g.result===null,'未结束却存在结算');
}
