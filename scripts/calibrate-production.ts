import fs from 'node:fs';
import {newCampaign,dispatchCampaign,hash,cultureDay,type Action} from '../src/campaign';
import {PREPARATION} from '../src/campaignContent';
// 样本策略与种子公开固定；不按目标通关率改写结算结果。
function simulate(seed:string,expert:boolean){
 let n=hash(seed+'policy');const rng=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};
 let g=newCampaign(seed,seed,'production');const run=(a:Action)=>{g=dispatchCampaign(g,a,'cal-'+g.revision);};
 const plan=['survey','rebuild','self','extra','checked','recorded','test','watch','batch'];
 for(let i=0;i<9;i++){const step=PREPARATION[i];run({type:'prep',step:step.id,option:expert?plan[i]:step.options[Math.floor(rng()*step.options.length)].id});while(!g.awaiting)run({type:'advance',days:7});run({type:'accept',step:step.id});if(g.failed){run({type:'repair',step:step.id});while(!g.awaiting)run({type:'advance',days:7});run({type:'accept',step:step.id});}}
 run({type:'stock',count:expert?100000:rng()<.5?80000:100000});
 run({type:'strategy',feed:expert?'balanced':(['careful','balanced','push'] as const)[Math.floor(rng()*3)],enhanced:expert?false:rng()<.5,autoBuy:true});
 let guard=0;while(g.phase!=='ended'&&guard++<700){
  if(g.laboratory?.decisionPending)run({type:'lab-decision',id:expert?'manage':'continue'});
  else if(g.health?.pending){const e=g.health.episode!;run({type:'health',id:expert?(e.stage==='warning'?(g.laboratory?.pending?'ignore':'test'):'manage'):'ignore'});}
  else if(g.pending)run({type:'choice',id:g.pending==='weather'?'backup':g.pending==='family'?'explain':g.pending==='drain'?'clean':g.pending==='market'?'wait':g.pending==='funds'?'retry':'sell'});
  else if(g.production?.surveyPending)run({type:expert?'sample':'survey-defer'});
  else if(expert&&g.feed==='balanced'&&g.production!.organic>8)run({type:'strategy',feed:'careful',enhanced:g.enhanced,autoBuy:true});
  else if(expert&&g.feed==='careful'&&g.production!.organic<3&&(!g.health?.episode||g.health.episode.stage==='over'))run({type:'strategy',feed:'balanced',enhanced:g.enhanced,autoBuy:true});
  else if(g.condition<(expert?75:50)&&g.lastMaintain!==g.day)run({type:'maintain'});
  else if(expert&&g.bottom>25&&g.lastClean!==g.day)run({type:'clean'});
  else run({type:'advance',days:1});
 }
 if(!g.result)throw Error('未完成：'+seed);
 return {seed,expert,profit:g.result.profit/100,success:g.result.success,days:cultureDay(g),weight:g.weight,survivors:g.result.survivors,costs:g.result.costs/100,revenue:g.result.revenue/100,health:g.health?.history.map(e=>e.kind),lastDisease:g.health?.episode?.kind};
}
const size=Number(process.argv[2]||100),prefix=process.argv[3]||'production-070';
const rows=[false,true].flatMap(expert=>Array.from({length:size},(_,i)=>simulate(prefix+'-'+(expert?'expert':'baseline')+'-'+i,expert)));
const summary=[false,true].map(expert=>{const r=rows.filter(x=>x.expert===expert);return{expert,size:r.length,successes:r.filter(x=>x.success).length,rate:r.filter(x=>x.success).length/r.length,minProfit:Math.min(...r.map(x=>x.profit)),maxProfit:Math.max(...r.map(x=>x.profit)),best:r.toSorted((a,b)=>b.profit-a.profit)[0]};});
fs.writeFileSync('production-calibration-0.7.0.json',JSON.stringify({version:'0.7.0',prefix,criterion:'profit >= 0',summary,rows},null,2));console.log(JSON.stringify(summary,null,2));
