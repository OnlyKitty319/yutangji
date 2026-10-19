import {EXTRA_SCENES,BRANCH_SCENES} from './sceneCatalog';
import {ILLNESSES} from './health';
import type {Campaign} from './campaign';

export const SCENES:Record<string,{name:string;caption:string}>={
  ...EXTRA_SCENES,
  'water-test':{name:'塘边 · 检测台',caption:'把看不见的变化，变成能比较的记录。'},
  'equipment-repair':{name:'机房 · 检修现场',caption:'设备停机后，才能认真检查每个零件。'},
  'feed-careful':{name:'投饵台 · 留有余量',caption:'少量计划，留意摄食，再决定下一餐。'},
  'feed-balanced':{name:'投饵台 · 日常节奏',caption:'把每一天的用量，与观察放在一起。'},
  'feed-push':{name:'料棚 · 加量的决定',caption:'更多的饲料，也意味着更重的负担。'},
  'power-backup':{name:'电源棚 · 风雨前的准备',caption:'备用设备已经就位，等着真正需要它的时刻。'},
  'supply-store':{name:'镇上 · 采购柜台',caption:'每一袋料，都要在账本上找到位置。'},
  'pond-drain':{name:'塘尾 · 排水口',caption:'沿着水流，检查那些容易被忽略的地方。'},
  'pond-dawn':{name:'家塘 · 晨光',caption:'沿着熟悉的塘埂，我回到了故事开始的地方。'},
  'pond-preparation':{name:'塘底 · 整备时节',caption:'水退下去，藏着的问题才慢慢露出来。'},
  'pond-stocking':{name:'塘口 · 第一批虾苗',caption:'新的水，新的记录。把这一造的希望放进塘里。'},
  'pond-evening':{name:'塘屋 · 夜灯',caption:'水车还在转，塘屋的灯也还亮着。'},
  'pond-rain':{name:'塘边 · 风雨将至',caption:'预报和准备，都要在真实到来的天气里接受检验。'},
  'family-table':{name:'家里 · 一顿晚饭',caption:'塘外的日子，也值得我认真赴约。'},
  'pond-harvest':{name:'塘口 · 出虾时分',caption:'收起一张网，也收起这一造做过的决定。'},
} as const;
export type SceneId=keyof typeof SCENES;
export type SceneContext={conversation?:string;menu?:string};
// 场景由存档中的阶段、事件和已兑现安排派生，刷新/恢复后保持一致。
// 家庭晚饭只在真实安排并兑现替班后出现，不把“没赴约”画成“已赴约”。
export function selectScene(g:Campaign,context:SceneContext={}):SceneId {
  if(g.phase==='ended')return g.result?.success?BRANCH_SCENES['ending:success']:g.health?.closed?'health-closure':g.result?.kind==='sale'?BRANCH_SCENES['ending:failure']:'pond-evening';
  if(g.laboratory?.decisionPending)return 'health-report';
  if(context.menu==='lab')return 'health-lab';
  if(g.health?.pending&&g.health.episode)return g.health.episode.stage==='report'?'health-report':ILLNESSES[g.health.episode.kind].scene;
  if(g.production?.surveyPending)return 'water-test';
  if(g.pending==='weather')return 'pond-rain';
  if(g.pending==='family')return 'pond-evening';
  if(g.pending==='market'||g.pending==='limit')return g.stockingDay!==null?'pond-dawn':'pond-preparation';
  if(context.conversation==='family-after')return g.delayed.some(t=>t.kind==='relief'&&t.done)?'family-table':'pond-evening';
  if(g.weatherDay>0&&g.day>=g.weatherDay&&g.day<g.weatherDay+3)return 'pond-rain';
  if(context.conversation==='arrival')return 'pond-dawn';
  if(context.conversation==='night-watch')return 'pond-evening';
  if(context.conversation==='first-water')return 'pond-stocking';
  if(context.menu&&BRANCH_SCENES['menu:'+context.menu]&&g.phase==='growing'&&!context.conversation)return BRANCH_SCENES['menu:'+context.menu];
  if(context.menu==='supplies')return 'water-test';
  if(context.menu==='equipment')return 'equipment-repair';
  if(context.menu==='sell')return 'supply-store';
  if(context.menu==='feed')return ('feed-'+g.feed) as SceneId;
  if(g.phase==='prep')return g.prepIndex<4?'pond-preparation':g.prepIndex>=8?'pond-stocking':'pond-dawn';
  if(context.menu==='stop')return 'pond-dawn';
  const culture=g.stockingDay===null?0:g.day-g.stockingDay;
  if(culture<7)return 'pond-stocking';
  // 叙事日夜是氛围镜头，不额外扣经营时间，不模拟未实现的小时系统。
  return g.day%3===0?'pond-evening':'pond-dawn';
}
