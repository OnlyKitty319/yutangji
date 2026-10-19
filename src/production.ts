import type {Campaign} from './campaign';

// 重量：毫克/尾；投料与存塘：克；报价：分/公斤。经验规格统一为条/斤。
export const GROWTH_POINTS = [[0,80],[1,87],[7,260],[15,800],[30,2500],[45,5000],[60,8333],[75,12500],[90,16667],[105,20000],[120,22100],[140,25000]] as const;
const FCR_POINTS = [[80,.7,.7],[5000,.65,.75],[500000/60,.8,.9],[500000/30,1.1,1.1],[25000,1.3,1.3],[45000,1.5,1.5]] as const;
// 游戏规格报价基准；保持各规格使用同一套价格口径。
export const PRICE_POINTS = [[0,0],[5000,1600],[6250,1800],[500000/60,2000],[12500,2400],[500000/30,3600],[25000,4800],[500000/15,5400],[45000,5400]] as const;
function interpolate(points:readonly (readonly number[])[],x:number,column=1){
  if(x<=points[0][0])return points[0][column];
  for(let i=1;i<points.length;i++)if(x<=points[i][0]){const a=points[i-1],b=points[i];return a[column]+(b[column]-a[column])*(x-a[0])/(b[0]-a[0]);}
  return points.at(-1)![column];
}
export const referenceWeight=(day:number)=>interpolate(GROWTH_POINTS,Math.max(0,day));
export const shrimpSize=(weight:number)=>weight>0?500000/weight:Infinity;
export const stageFcrRange=(weight:number)=>({low:interpolate(FCR_POINTS,weight,1),high:interpolate(FCR_POINTS,weight,2)});
export const stageFcr=(weight:number)=>{const r=stageFcrRange(weight);return (r.low+r.high)/2;};
export const sizePrice=(weight:number,market=3400)=>Math.round(interpolate(PRICE_POINTS,weight)*market/3400);
export type Production={version:1;fcrBasis:'incremental';nextSurvey:number;surveyPending:boolean;sampleFeed:number;sampleBiomass:number;stageFcr:number|null;stageDays:number;stageWeight:number;leftover:number;organic:number;checkedAt:Record<string,number>};
export const newProduction=():Production=>({version:1,fcrBasis:'incremental',nextSurvey:0,surveyPending:false,sampleFeed:0,sampleBiomass:0,stageFcr:null,stageDays:0,stageWeight:80,leftover:0,organic:0,checkedAt:{}});
export function estimatedStock(g:Campaign){
  const o=g.observation,weight=Math.max(80,o.weight),count=Math.min(g.initialCount,(o.low+o.high)/2*1000/weight);
  const cd=g.stockingDay===null?0:g.day-g.stockingDay,oldCd=g.stockingDay===null?0:o.day-g.stockingDay;
  // 仅从上次抽样推算；不会偷读真实存活尾数。掉虾后需要重新抽样。
  const projectedWeight=Math.min(45000,weight+Math.max(0,referenceWeight(cd)-referenceWeight(oldCd)));
  return {count,weight:projectedWeight,age:g.day-o.day};
}
export function productionFeed(g:Campaign,factor:number){
  const e=estimatedStock(g),cd=g.stockingDay===null?0:g.day-g.stockingDay;
  const gain=referenceWeight(cd+1)-referenceWeight(cd);
  const base=Math.round(gain/1000*10000*stageFcr(e.weight+gain/2));
  const perTenThousand=Math.round(base*factor);
  return {base,perTenThousand,total:Math.round(perTenThousand*e.count/10000),meal:perTenThousand/4};
}
export function productionDay(g:Campaign,ration:number,weather:boolean){
  const p=g.production!;const cd=g.day-g.stockingDay!;
  const potential=Math.max(0,referenceWeight(cd)-referenceWeight(cd-1));
  const growthCap=potential*Math.max(.15,1-g.pressure/160)*(weather?.8:1)*(g.initialCount===100000?.96:1);
  return {growthCap,conversion:stageFcr(g.weight+growthCap/2),record:(consumed:number)=>{
    p.leftover=Math.max(0,Math.round(ration-consumed));
    p.organic=Math.min(1000,p.organic*.93+p.leftover/1000);
  }};
}
export function recordProductionSample(g:Campaign){
  const p=g.production;if(!p)return;const biomass=(g.observation.low+g.observation.high)/2;
  const elapsed=g.day-g.lastSample,added=biomass-p.sampleBiomass;
  p.stageFcr=g.lastSample>=0&&elapsed>0&&added>Math.max(100,p.sampleBiomass*.05)?(g.usedFeed-p.sampleFeed)/added:null;
  p.stageDays=g.lastSample>=0?elapsed:0;p.stageWeight=g.observation.weight;
  p.sampleFeed=g.usedFeed;p.sampleBiomass=biomass;p.nextSurvey=g.day+7;p.surveyPending=false;
}
export function feedingAssessment(g:Campaign){
  const p=g.production;if(!p)return '';
  const tray=p.leftover>500?'料台还有明显残饵':p.leftover>50?'料台有少量残饵':'料台基本吃净';
  const r=stageFcrRange(p.stageWeight);
  const ratio=p.stageFcr===null?'这次净增重不足以可靠计算阶段料比':`最近${p.stageDays}天估算阶段料比${p.stageFcr.toFixed(2)}，该规格经验值${r.low.toFixed(2)}—${r.high.toFixed(2)}`;
  return tray+'。'+ratio+(p.stageFcr!==null&&p.stageFcr>r.high?'；偏高也可能来自掉虾或抽样误差，需要结合存塘和摄食复核。':'。');
}
export function validateProduction(g:Campaign){
  const p=g.production;if(p===undefined)return;
  const fail=()=>{throw Error('投喂与存塘记录损坏，请恢复备份。');};
  const finite=(n:number,min:number,max:number)=>Number.isFinite(n)&&n>=min&&n<=max;
  if(!p||p.version!==1||p.fcrBasis!=='incremental'||!g.health||typeof p.surveyPending!=='boolean')fail();
  if(!Number.isInteger(p.nextSurvey)||!finite(p.nextSurvey,0,127)||!Number.isInteger(p.stageDays)||!finite(p.stageDays,0,120)||!finite(p.stageWeight,0,50000)||!finite(p.sampleFeed,0,g.usedFeed)||!finite(p.sampleBiomass,0,1e9)||!finite(p.leftover,0,g.usedFeed)||!finite(p.organic,0,1000)||p.stageFcr!==null&&!finite(p.stageFcr,0,1e7))fail();
  if(!p.checkedAt||typeof p.checkedAt!=='object'||Object.entries(p.checkedAt).some(([k,v])=>!['ahpnd','wssv','ehp','oxygen'].includes(k)||!Number.isInteger(v)||!finite(v,0,g.day)))fail();
  if(p.surveyPending&&(g.phase!=='growing'||g.day<p.nextSurvey))fail();
}
