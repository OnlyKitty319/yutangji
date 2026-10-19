import {HEALTH_RULES,LEGACY_HEALTH_RULES} from './health';
import type {Campaign} from './campaign';

// 规则版本随存档固定；旧档仍按 earthen-1.0.0 结算。
export const CHALLENGE_RULES='earthen-challenge-1.0.0';
export const CHALLENGE_PROFIT=900000;
export const profitTarget=(g:Pick<Campaign,'rules'>)=>g.rules===HEALTH_RULES?0:g.rules===LEGACY_HEALTH_RULES?250000:CHALLENGE_PROFIT;
export const isChallenge=(g:Pick<Campaign,'rules'>)=>[CHALLENGE_RULES,HEALTH_RULES,LEGACY_HEALTH_RULES].includes(g.rules);
export const diseaseForced=(g:Campaign)=>!!(g.health?.closed&&g.health.episode&&g.health.episode.kind!=='oxygen');
// 新版只按利润判负；病害迫收影响收入，不额外判负。
export function settlementOutcome(g:Campaign,profit:number,harvest:number):'success'|'failure'|'cancelled'{
  if(profit<0)return 'failure';
  return g.stockingDay!==null&&harvest>0?'success':'cancelled';
}
export function challengeChecks(g:Campaign,profit:number){
  if(g.rules===HEALTH_RULES)return [{name:'结算不亏损',passed:profit>=0}];
  return [
    {name:`经营利润至少 ¥${(profitTarget(g)/100).toLocaleString('zh-CN')}`,passed:profit>=profitTarget(g)},
    {name:'设备完好度至少 70',passed:g.condition>=70},
    {name:'环境压力不高于 30',passed:g.pressure<=30},
    {name:'家庭协作至少 60',passed:g.family>=60},
    {name:'放苗后至少经营 75 天',passed:g.stockingDay!==null&&g.day-g.stockingDay>=75},
  ];
}
export const challengePassed=(g:Campaign,profit:number)=>!isChallenge(g)||challengeChecks(g,profit).every(c=>c.passed);
