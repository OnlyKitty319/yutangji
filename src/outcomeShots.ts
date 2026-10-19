import {BRANCH_SCENES} from './sceneCatalog';
import type {Campaign} from './campaign';
import {PREPARATION} from './campaignContent';
import {INTERLUDES} from './narrative';
import {SCENES,selectScene,type SceneId} from './storyScenes';

export type Shot={scene:SceneId;focus:'wide'|'left'|'right'|'detail';caption:string;title:string};
const shot=(scene:SceneId,title:string,caption:string,focus:Shot['focus']='wide'):Shot=>({scene,title,caption,focus});
const prepImages:SceneId[][]=[['pond-preparation','pond-drain'],['equipment-repair','power-backup'],['pond-drain','pond-preparation'],['pond-preparation','pond-drain'],['pond-stocking','pond-drain'],['water-test','pond-dawn'],['water-test'],['pond-evening','equipment-repair'],['pond-stocking']];
const talkImages:SceneId[][]=[['pond-drain','equipment-repair','pond-evening'],['water-test','pond-stocking'],['power-backup','equipment-repair','pond-evening'],['supply-store','water-test'],['family-table','pond-evening'],['pond-dawn','pond-evening','water-test']];
export const OUTCOME_SHOTS:Record<string,Shot>={
  'stock:80000':shot('pond-stocking','八万尾 · 留下余量','虾苗入塘，放苗后的经营计时开始。','left'),
  'stock:100000':shot('pond-stocking','十万尾 · 承担负荷','更多虾苗，也需要更多饲料与设备余量。','detail'),
  'strategy:careful':shot('feed-careful','我选择谨慎投喂','新的用量从下一日执行，今天不会重复投料。'),
  'strategy:balanced':shot('feed-balanced','我选择均衡投喂','计划已写下，次日按均衡用量执行。'),
  'strategy:push':shot('feed-push','我选择增加投喂','计划已更新，次日起增加消耗和底部负担。'),
  'strategy:oxygen-on':shot('equipment-repair','加强增氧 · 已排入计划','次日起增加设备运行和每日费用。','detail'),
  'strategy:oxygen-off':shot('pond-dawn','常规增氧 · 已排入计划','次日起恢复常规运行费用。','right'),
  'strategy:auto-on':shot('supply-store','我留下自动补料安排','只有库存不足且现金足够时，才会采购入库。','left'),
  'strategy:auto-off':shot('feed-careful','我决定亲自核对库存','缺料时暂停时间，等待我作决定。','detail'),
  sample:shot('water-test','新的一份抽样记录','检测更新了估计，实际在塘量仍需起捕核实。'),
  maintain:shot('equipment-repair','工具箱合上了','本次维护完成，真实恢复量写在下方。'),
  clean:shot('pond-drain','我处理了塘底负担','今天的维护已经完成，后续管理仍会改变环境。'),
  rest:shot('pond-evening','我把这班交给搭档','替班已付费，精力得到恢复。','detail'),
  buy:shot('supply-store','两百公斤饲料入库','采购已完成，库存与现金同时更新。'),
  harvest:shot('pond-harvest','我决定起网','实际收入和经营成本，现在一起接受检验。'),
  stop:shot('pond-evening','我决定止损','结束这一造，保留记录，留住下一次机会。','left'),
  'choice:drain:clean':shot('pond-drain','清理队完成了排水维护','本造的排水死角影响已减轻。'),
  'choice:drain:light':shot('feed-careful','我先把负荷降下来','切换谨慎投喂；排水死角仍然存在。'),
  'choice:weather:backup':shot('power-backup','备用电源准备就绪','已支付试机与燃料费用，覆盖这次天气窗口。'),
  'choice:weather:watch':shot('pond-rain','我留下守塘','付出精力，降低投喂；停电风险仍要面对。','detail'),
  'choice:family:relief':shot('equipment-repair','我先把替班约好','三天后才赴约。此刻仍在塘口确认交接。','left'),
  'choice:family:explain':shot('pond-evening','电话那头安静了一会儿','我决定留下，三天后会兑现这次安排的代价。','right'),
  'choice:market:sell':shot('pond-harvest','我接受了今天的报价','以实际起捕量完成结算。'),
  'choice:market:wait':shot('pond-dawn','我收起手机，继续养','今天没有成交，明天仍有成本和新的风险。','right'),
  'choice:limit:sell':shot('pond-harvest','第一百二十天 · 收网','最后一个经营决定，写进结算。'),
  'choice:limit:stop':shot('pond-evening','第一百二十天 · 放下','这一次以止损结束，投入仍然如实记录。'),
  'choice:funds:retry':shot('supply-store','我重新核对手头资源','没有额外补贴，能否继续取决于现金和饲料。','detail'),
  'choice:funds:sell':shot('pond-harvest','我选择回款','实际规格和今日价格决定本次收入。'),
  'choice:funds:stop':shot('pond-evening','我停止继续投入','清塘折价和费用都会进入最终账本。','detail'),
};
PREPARATION.forEach((s,i)=>{
  s.options.forEach((o,j)=>OUTCOME_SHOTS[`prep:${s.id}:${o.id}`]=shot(prepImages[i][j],o.name+' · 已安排',`我来到${SCENES[prepImages[i][j]].name}。费用已入账，作业还需要 ${o.days} 天，并未立即完成。`,j?'right':'left'));
  OUTCOME_SHOTS[`advance:${s.id}`]=shot(prepImages[i][0],s.name+' · 时间向前','我检查最新进度，再决定下一步。','wide');
  OUTCOME_SHOTS[`accept:${s.id}:pass`]=shot(i===8?'pond-stocking':'water-test',s.name+' · 验收通过','本阶段记录通过，可以进入下一项。','right');
  OUTCOME_SHOTS[`accept:${s.id}:fail`]=shot('pond-drain',s.name+' · 发现问题','检查没有通过，先按报告修复原因。','detail');
  OUTCOME_SHOTS[`repair:${s.id}`]=shot('equipment-repair',s.name+' · 返工安排','费用已支付，等待修复完成再重新验收。','detail');
});
INTERLUDES.forEach((c,i)=>c.options.forEach((o,j)=>OUTCOME_SHOTS[`talk:${c.id}:${o.id}`]=shot(talkImages[i][j],c.title+' · 我的回答',o.reply,(['left','right','detail'] as const)[j])));
OUTCOME_SHOTS['advance:growing']=shot('pond-dawn','日子向前走','经营记录已经更新，事件会中止连续观察。');
for(const [key,scene] of Object.entries(BRANCH_SCENES))if(OUTCOME_SHOTS[key])OUTCOME_SHOTS[key]={...OUTCOME_SHOTS[key],scene,focus:'wide'};
Object.assign(OUTCOME_SHOTS,{
 'lab-send:shrimp':shot('health-lab','虾体样送出','两天后回报，记录对应采样时的状态。'),
 'lab-send:environment':shot('water-test','环境样送出','环境样和虾体样分开解释。'),
 'lab-decision:continue':shot('health-ignore','我选择继续观察','风险不会因为读过报告而消失。'),
 'lab-decision:manage':shot('health-manage','管理与复测','安排七天支持管理，之后仍需复核。'),
 'lab-decision:close':shot('health-closure','我决定结束这一造','只计算剩余活虾，盈亏由实际收入和成本决定。'),
 'survey-defer':shot('pond-evening','我暂缓抽样','旧的存塘记录仍用于投喂，三天后再复核。'),
 'health:test':shot('health-lab','送检与排查','费用已入账，查看模拟检测结果后决定是否继续投入。'),
 'health:ignore':shot('health-ignore','我推迟了处理','没有获得治愈，下一经营日可能继续减产。'),
 'health:manage':shot('health-manage','应对已经安排','谨慎投喂与加强增氧已开启，仍可能损失，日常成本继续。'),
 'health:close':shot('health-closure','我决定抢收','人手已经到位。剩余活虾折价清算，损失留在账本里。'),
});
export function outcomeShot(g:Campaign):Shot|undefined{
  const d=g.decision;if(!d)return;
  let s=OUTCOME_SHOTS[d.key];if(!s)return;
  // 未赴约时不把愿望画成已回家；时间推进按真实事件和兑现状态选镜头。
  if(d.key.startsWith('talk:family-after')&&!g.delayed.some(x=>x.kind==='relief'&&x.done))s={...s,scene:BRANCH_SCENES['family-phone:'+d.key.split(':').at(-1)],caption:'我仍在塘边，通过电话说出这次回答。'};
  if(d.key==='advance:growing')s={...s,scene:g.delayed.some(x=>x.done&&x.kind==='relief'&&x.day>d.fromDay&&x.day<=d.day)?'family-table':g.health?.pending||g.pending||g.laboratory?.decisionPending||g.production?.surveyPending?selectScene(g):BRANCH_SCENES['advance:growing'],caption:g.health?.pending||g.pending||g.laboratory?.decisionPending||g.production?.surveyPending?'新的事件出现，我停下来听对方说。':d.day===d.fromDay?'时间尚未推进，需要先处理当前状态。':'这一段经营已执行，变化来自实际结算。'};
  if(d.key==='health:manage'&&g.health?.episode?.kind==='oxygen')s={...s,scene:'health-emergency'};
  if(d.key==='health:manage'&&g.health?.episode?.kind==='ehp')s={...s,scene:'health-stunted'};
  if(g.health?.closed)return {...s,scene:g.result?.success?'scene-099':'health-closure',title:g.result?.title??s.title,caption:'抢收已经完成，剩余活虾与这一造的支出一起进入结算。'};
  if(g.result&&g.result.kind==='stop')s={...s,scene:'pond-evening'};
  return s;
}
