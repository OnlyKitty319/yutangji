import {describe,it,expect} from 'vitest';
import {newCampaign,dispatchCampaign,feedPlan,cultureDay,quote,validateCampaign,type Campaign,type Action} from '../src/campaign';
import {PREPARATION} from '../src/campaignContent';
import {stageFcrRange,shrimpSize,sizePrice,referenceWeight,recordProductionSample,feedingAssessment} from '../src/production';
import {healthRisk,healthStep} from '../src/health';
import {encodeCampaign,decodeCampaign,emptyProfile} from '../src/campaignStorage';
const run=(g:Campaign,a:Action)=>dispatchCampaign(g,a,'070-'+g.revision);
function ready(seed='070'){
 let g=newCampaign(seed,seed,'production');g=run(g,{type:'register',name:'小满',gender:'female'});
 for(let i=0;i<9;i++){g=run(g,{type:'prep',step:PREPARATION[i].id,option:['survey','rebuild','self','basic','checked','recorded','test','watch','batch'][i]});while(!g.awaiting)g=run(g,{type:'advance',days:7});g=run(g,{type:'accept',step:PREPARATION[i].id});}
 return run(g,{type:'stock',count:80000});
}
function healthy(g:Campaign){g.health!.checked=['ahpnd','wssv','ehp','oxygen'];g.health!.history=g.health!.checked.map(kind=>({kind,day:g.day,lost:0,managed:true}));return g;}
describe('规格、阶段料比、残饵与存塘',()=>{
 it('清底同时移除部分沉积残饵，收费一次且不修改虾的存活数',()=>{
  let g=ready();g.production!.organic=80;g.bottom=70;const cash=g.cash,count=g.count;g=run(g,{type:'clean'});expect(g.production!.organic).toBe(44);expect(g.bottom).toBe(52);expect(g.cash).toBe(cash-50000);expect(g.count).toBe(count);expect(()=>run(g,{type:'clean'})).toThrow();
 });
 it('条/斤换算及阶段新增料比符合用户的四个锚点',()=>{
  for(const [size,low,high] of [[100,.65,.75],[60,.8,.9],[30,1.1,1.1],[20,1.3,1.3]]){expect(shrimpSize(500000/size)).toBeCloseTo(size);expect(stageFcrRange(500000/size).low).toBeCloseTo(low);expect(stageFcrRange(500000/size).high).toBeCloseTo(high);}
 });
 it('报价按同一地区的规格梯度，斤价转公斤价；缺失报价不作为零价',()=>{
  for(const [size,yuanJin] of [[100,8],[80,9],[60,10],[40,12],[30,18],[20,24],[15,27]])expect(sizePrice(500000/size)).toBe(yuanJin*200);
  expect(sizePrice(25000,4400)).toBeGreaterThan(4400);expect(sizePrice(7000)).toBeGreaterThan(sizePrice(5000));
 });
 it('累计总料不能冒充阶段新增料；净减重不输出虚假的高料比',()=>{
  const g=ready(),p=g.production!;g.lastSample=g.day;g.day+=7;p.sampleFeed=100000;p.sampleBiomass=200000;g.usedFeed=170000;g.observation={day:g.day,low:280000,high:320000,weight:5000,environment:'正常'};
  recordProductionSample(g);expect(p.stageFcr).toBe(.7);expect(p.stageDays).toBe(7);
  g.lastSample=g.day;g.day+=7;g.usedFeed+=70000;g.observation.low=180000;g.observation.high=220000;recordProductionSample(g);expect(p.stageFcr).toBeNull();expect(feedingAssessment(g)).toContain('不足以可靠计算');
 });
 it('抽样每七天暂停，可延后三天，且不能连点重复扣费',()=>{
  let g=run(healthy(ready()),{type:'advance',days:7});expect(cultureDay(g)).toBe(7);expect(g.production!.surveyPending).toBe(true);
  expect(run(g,{type:'advance',days:7}).day).toBe(g.day);g=run(g,{type:'survey-defer'});g=run(g,{type:'advance',days:7});expect(cultureDay(g)).toBe(10);expect(g.production!.surveyPending).toBe(true);
  const previous=g;g=run(g,{type:'sample'});expect(g.cash).toBe(previous.cash-20000);expect(g.production!.surveyPending).toBe(false);expect(dispatchCampaign(g,{type:'sample'},'070-'+previous.revision)).toBe(g);expect(()=>run(g,{type:'sample'})).toThrow();
 });
 it('投喂依据抽样，不偷读真实存活；重新抽样后降低过量计划和残饵',()=>{
  let g=healthy(ready());g.day+=50;g.weight=6000;g.count=80000;g=run(g,{type:'sample'});const original=feedPlan(g).total;g.count=30000;expect(feedPlan(g).total).toBe(original);
  g.day++;g.production!.nextSurvey=g.day+7;const stale=run(g,{type:'advance',days:1});let fresh=run(g,{type:'sample'});expect(feedPlan(fresh).total).toBeLessThan(original*.55);fresh=run(fresh,{type:'advance',days:1});expect(stale.production!.leftover).toBeGreaterThan(fresh.production!.leftover);
 });
 it('加料超过摄食上限不加速生长，残饵抬升环境负担和疾病风险',()=>{
  let base=healthy(ready());base.day+=50;base.weight=6000;base=run(base,{type:'sample'});base.production!.nextSurvey=base.day+7;
  let balanced=run(base,{type:'strategy',feed:'balanced',enhanced:false,autoBuy:true}),push=run(base,{type:'strategy',feed:'push',enhanced:false,autoBuy:true});
  for(let i=0;i<5;i++){balanced=run(balanced,{type:'advance',days:1});push=run(push,{type:'advance',days:1});}
  expect(push.weight).toBeLessThanOrEqual(balanced.weight+5);expect(push.production!.organic).toBeGreaterThan(balanced.production!.organic);expect(push.bottom).toBeGreaterThan(balanced.bottom);expect(healthRisk(push,'ahpnd')).toBeGreaterThan(healthRisk(balanced,'ahpnd'));
 });
 it('病害风险会在后续窗口复核，不是开局掷一次后永久免疫',()=>{
  const g=ready();g.day+=40;g.health!.checked=['ahpnd'];g.production!.checkedAt.ahpnd=g.day-14;healthStep(g);expect(g.production!.checkedAt.ahpnd).toBe(g.day);
 });
 it('生长曲线从放苗计时，病害和环境会降低实际生长',()=>{
  expect(referenceWeight(45)).toBe(5000);expect(referenceWeight(60)).toBe(8333);expect(referenceWeight(90)).toBe(16667);expect(referenceWeight(140)).toBe(25000);
  const g=healthy(ready());expect(cultureDay(g)).toBe(0);const stressed=structuredClone(g);stressed.pressure=100;expect(run(stressed,{type:'advance',days:1}).weight).toBeLessThan(run(g,{type:'advance',days:1}).weight);
 });
 it('规格成交价进入真实结算，支持大虾价格和存档往返，失败仍只看负利润',()=>{
  let g=ready();g.weight=25000;const rate=quote(g);g=run(g,{type:'harvest'});expect(g.result!.rate).toBe(rate);expect(g.result!.revenue).toBe(Math.round(g.result!.harvest*rate/1000));expect(g.result!.success).toBe(g.result!.profit>=0);validateCampaign(g);expect(decodeCampaign(encodeCampaign({game:g,profile:emptyProfile()})).game).toEqual(g);
 });
 it('存塘复核和阶段数据跨存档不丢失，损坏字段拒绝导入',()=>{
  const g=run(healthy(ready()),{type:'advance',days:7});expect(decodeCampaign(encodeCampaign({game:g,profile:emptyProfile()})).game).toEqual(g);
  for(const patch of [{leftover:-1},{nextSurvey:NaN},{fcrBasis:'cumulative'},{organic:Infinity},{sampleFeed:g.usedFeed+1}])expect(()=>validateCampaign({...g,production:{...g.production!,...patch}})).toThrow();
 });
 it('旧档保持原生产规则，新开局才启用新模型',()=>{const old=newCampaign('old','old','health');expect(old.production).toBeUndefined();expect(decodeCampaign(encodeCampaign({game:old,profile:emptyProfile()})).game).toEqual(old);expect(ready().production?.fcrBasis).toBe('incremental');});
 it('多种种子可从放苗走到结算，库存与账本始终守恒',()=>{
  const stats=[];for(let i=0;i<30;i++){let g=ready('070-full-'+i),guard=0;
   while(g.phase!=='ended'&&guard++<500){const e=g.health?.episode;if(g.laboratory?.decisionPending)g=run(g,{type:'lab-decision',id:'manage'});
    else if(g.health?.pending)g=run(g,{type:'health',id:e?.stage==='warning'?'test':'manage'});
    else if(g.pending)g=run(g,{type:'choice',id:g.pending==='weather'?'backup':g.pending==='family'?'relief':g.pending==='drain'?'clean':g.pending==='market'?'wait':g.pending==='funds'?'retry':'sell'});
    else if(g.production?.surveyPending)g=run(g,{type:'sample'});
    else if(g.condition<65&&g.lastMaintain!==g.day)g=run(g,{type:'maintain'});
    else if(g.bottom>25&&g.lastClean!==g.day)g=run(g,{type:'clean'});
    else g=run(g,{type:'advance',days:7});
   }
   expect(guard).toBeLessThan(500);validateCampaign(g);expect(g.result!.success).toBe(g.result!.profit>=0);stats.push({seed:i,profit:g.result!.profit/100,days:cultureDay(g),size:Math.round(shrimpSize(g.weight)),success:g.result!.success});
  }console.info('0.7.0 完整流程样本',JSON.stringify(stats));
 },30000);
});
