import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {newCampaign,dispatchCampaign,validateCampaign,type Campaign,type Action} from '../src/campaign';
import {PREPARATION} from '../src/campaignContent';
import {preparationRisk,stockLaboratory,sendSample,laboratoryDay,reportText} from '../src/laboratory';
import {healthStep} from '../src/health';
import {encodeCampaign,decodeCampaign,emptyProfile} from '../src/campaignStorage';
import {StoryScene} from '../src/StoryExperience';
const run=(g:Campaign,a:Action)=>dispatchCampaign(g,a,'lab-'+g.revision);
function ready(seed='lab'){
 let g=newCampaign(seed,seed,'production');g=run(g,{type:'register',name:'送样验收',gender:'male'});
 for(let i=0;i<9;i++){g=run(g,{type:'prep',step:PREPARATION[i].id,option:['survey','rebuild','self','extra','checked','recorded','test','watch','batch'][i]});while(!g.awaiting)g=run(g,{type:'advance',days:7});g=run(g,{type:'accept',step:PREPARATION[i].id});}
 return run(g,{type:'stock',count:80000});
}
describe('持续风险与模拟定量送样',()=>{
 it('旧检测动作也必须等待，不绕过新送样流程或立即确诊',()=>{
  let g=ready();g.laboratory!.viralLoad=1e6;g.day++;laboratoryDay(g);const cash=g.cash;g=run(g,{type:'health',id:'test'});expect(g.cash).toBe(cash-120000);expect(g.laboratory!.pending!.due).toBe(g.day+2);expect(g.laboratory!.reports).toHaveLength(0);expect(g.health!.episode!.tested).toBe(false);
 });
 it('报告后抢收只由利润判定，不因检测阳性强制失败',()=>{
  let g=ready();g.weight=45000;g.laboratory!.viralLoad=2000;g=run(g,{type:'lab-send',sample:'shrimp'});g=run(g,{type:'advance',days:2});g=run(g,{type:'lab-decision',id:'close'});expect(g.result!.profit).toBeGreaterThan(0);expect(g.result!.success).toBe(true);expect(g.health!.closed).toBe(true);expect(g.result!.survivors).toBeGreaterThan(0);expect(()=>run(g,{type:'lab-decision',id:'close'})).toThrow();
 });
 it('前处理影响残留隐患，放苗起就有风险，不受第38天硬门槛限制',()=>{
  const good=ready(),poor=structuredClone(good);Object.assign(poor.choices,{P01:'local',P03:'basic',P04:'standard',P05:'rushed'});expect(preparationRisk(poor)).toBeGreaterThan(preparationRisk(good));stockLaboratory(poor);expect(poor.laboratory!.reservoir).toBeGreaterThan(good.laboratory!.reservoir);
  good.laboratory!.viralLoad=1e6;good.day++;laboratoryDay(good);expect(good.health!.episode?.kind).toBe('wssv');expect(good.health!.pending).toBe(true);
 });
 it('送样收费一次，耗时两天，回报冻结的是采样日状态',()=>{
  let g=ready();g.laboratory!.viralLoad=2000;const cash=g.cash;g=run(g,{type:'lab-send',sample:'shrimp'});expect(g.cash).toBe(cash-120000);const report=structuredClone(g.laboratory!.pending!.report);expect(g.laboratory!.reports).toHaveLength(0);expect(()=>run(g,{type:'lab-send',sample:'environment'})).toThrow();
  g.laboratory!.viralLoad=1e8;g=run(g,{type:'advance',days:1});if(g.health?.pending)g=run(g,{type:'health',id:'ignore'});g=run(g,{type:'advance',days:1});expect(g.laboratory!.reports.at(-1)).toEqual(report);expect(g.laboratory!.decisionPending).toBe(true);expect(g.laboratory!.viralLoad).toBeGreaterThan(report.value!);expect(()=>run(g,{type:'advance',days:1})).toThrow('请先回应送样报告');
 });
 it('等待期间会掉虾，读报告不会治疗；支持管理有费用和期限',()=>{
  let g=ready();g.laboratory!.viralLoad=1e7;g.day++;laboratoryDay(g);g=run(g,{type:'lab-send',sample:'shrimp'});const initial=g.count;g=run(g,{type:'advance',days:2});if(g.production!.surveyPending){g=run(g,{type:'sample'});g=run(g,{type:'advance',days:2});}expect(g.laboratory!.decisionPending).toBe(true);expect(g.count).toBeLessThan(initial);const count=g.count,load=g.laboratory!.viralLoad,cash=g.cash;g=run(g,{type:'lab-decision',id:'manage'});expect(g.count).toBe(count);expect(g.laboratory!.viralLoad).toBe(load);expect(g.cash).toBe(cash-220000);expect(g.laboratory!.managedUntil).toBe(g.day+7);expect(g.feed).toBe('careful');expect(g.enhanced).toBe(true);
 });
 it('同类样品才比较趋势；阴性与阳性不伪造百分比变化',()=>{
  const g=ready();g.laboratory!.viralLoad=0;sendSample(g,'shrimp');expect(g.laboratory!.pending!.report.value).toBeNull();g.day+=2;laboratoryDay(g);g.laboratory!.decisionPending=false;g.laboratory!.viralLoad=10000;sendSample(g,'shrimp');expect(g.laboratory!.pending!.report.trend).toBe('incomparable');g.day+=2;laboratoryDay(g);g.laboratory!.decisionPending=false;sendSample(g,'environment');expect(g.laboratory!.pending!.report.trend).toBe('first');expect(g.laboratory!.pending!.report.unit).toBe('copies/mL extract');
 });
 it('送样随机数不改变病害与天气随机序列，不能通过反复检测刷好运',()=>{
  const g=ready(),disease=g.laboratory!.rng,world=g.rng.world;sendSample(g,'shrimp');expect(g.laboratory!.rng).toBe(disease);expect(g.rng.world).toBe(world);
 });
 it('低载量回落后仍可再发生风险，EHP不能阻止后续白斑异常',()=>{
  const g=ready();g.health!.checked=['ehp'];g.health!.episode={kind:'ehp',start:g.day,days:1,tested:true,managed:true,stage:'active',loss:0};g.laboratory!.viralLoad=1e6;g.day++;laboratoryDay(g);expect(g.health!.episode?.kind).toBe('wssv');expect(g.health!.history.some(x=>x.kind==='ehp')).toBe(true);
  g.health!.episode!.stage='over';g.health!.pending=false;healthStep(g);delete g.decision;validateCampaign(g);
 });
 it('准备期也能送环境样，报告不把环境检出直接当虾体感染',()=>{
  let g=newCampaign('prep-lab','prep-lab','production');g=run(g,{type:'lab-send',sample:'environment'});g=run(g,{type:'prep',step:'P00',option:'survey'});g=run(g,{type:'advance',days:2});expect(g.laboratory!.decisionPending).toBe(true);expect(reportText(g)).toContain('环境检出不能直接判断虾体感染');g=run(g,{type:'lab-decision',id:'continue'});expect(g.health!.closed).toBe(false);
 });
 it('报告、待检样品和复测趋势均能保存恢复，拒绝单位和日期损坏',()=>{
  const g=run(ready(),{type:'lab-send',sample:'shrimp'});expect(decodeCampaign(encodeCampaign({game:g,profile:emptyProfile()})).game).toEqual(g);
  for(const patch of [{unit:'IU/mL'},{reported:g.day},{value:-1},{status:'unknown'}]){const bad=structuredClone(g);Object.assign(bad.laboratory!.pending!.report,patch);expect(()=>validateCampaign(bad)).toThrow();}
 });
 it('报告页面显示日期、样品、单位、趋势和三种真实选择',()=>{
  let g=ready();g.laboratory!.viralLoad=2000;g=run(g,{type:'lab-send',sample:'shrimp'});g=run(g,{type:'advance',days:2});delete g.decision;const no=()=>{};const html=renderToStaticMarkup(createElement(StoryScene,{g,disabled:false,onAction:async()=>true,onRestart:no,onExport:no,onHome:no,onSave:no}));expect(html).toContain('模拟WSSV qPCR报告');expect(html).toContain('拷贝/mg组织');expect(html).toContain('加强管理');expect(html).toContain('结束这一造');
 });
});
