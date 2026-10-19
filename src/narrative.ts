import type {Campaign} from './campaign';

export type Gender='male'|'female';
export type PersonId='chen'|'lan'|'ze'|'lin'|'zhou';
export type Narrative={version:1;player:{name:string;gender:Gender};memories:{id:string;answer:string;day:number}[]};
export const PEOPLE:Record<PersonId,{name:string;role:string;description:string}>={
  chen:{name:'陈伯',role:'老塘主 · 你的引路人',description:'慢性子，讲证据。嘴上不夸人，会把你做对的事记在心里。'},
  lan:{name:'许岚',role:'水质员 · 认真但不刻板',description:'习惯先问“你看见了什么”。不替你下决定，但愿意陪你查清原因。'},
  ze:{name:'阿泽',role:'机修师 · 你的同龄搭档',description:'爱开玩笑，真出故障时最先赶到。相信设备，也相信人要留余力。'},
  lin:{name:'林婶',role:'家人 · 等你回家的那盏灯',description:'知道养塘不容易，也不愿你把每一句“下次”都留给家里。'},
  zhou:{name:'周启',role:'收虾人 · 讲条件的生意伙伴',description:'报价爽快，承诺谨慎。会提醒你：纸上估计和实际起捕是两回事。'},
};
export const storyAsset=(id:string)=>`./story/${id}.webp`;
export type Conversation={id:string;speaker:PersonId;title:string;aside:string;text:string;options:{id:string;line:string;reply:string;note:string}[]};
export const INTERLUDES:Conversation[]=[
  {id:'arrival',speaker:'chen',title:'序章 · 回到塘边',aside:'我把行李放在塘屋门口。风里有一点咸味，陈伯把旧钥匙放进我手心。',text:'钥匙给你。这口塘不大，但你得自己拿主意。回来这一趟，你最想做成什么？',options:[
    {id:'steady',line:'“我想先把这一造稳稳做完。”',reply:'陈伯点点头：“稳不是不冒险，是知道自己能承受多少。”',note:'陈伯会记住我想稳稳起步。'},
    {id:'prove',line:'“我想证明，自己能把这里经营好。”',reply:'陈伯笑了：“行。不过别为了证明什么，连账本都不肯看。”',note:'陈伯会记住我的干劲。'},
    {id:'home',line:'“我想留下来，也多陪陪家里人。”',reply:'陈伯望向塘屋：“那就别只把日子记在塘里，也给家里留几页。”',note:'陈伯会记住我回来的理由。'}]},
  {id:'first-water',speaker:'lan',title:'第一章 · 水面之下',aside:'虾苗沉进水里，表面很快恢复平静。我忽然意识到，接下来很多变化都看不见。',text:'真正的日常现在开始了。你打算怎么了解这口塘？',options:[
    {id:'evidence',line:'“先记录，再根据观察调整。”',reply:'许岚把记录板递给我：“有记录，回头才能知道哪一步改变了结果。”',note:'许岚记住了我重视记录。'},
    {id:'ask',line:'“我会问你，也会自己学着判断。”',reply:'“可以问我，但最后的决定是你的。”她指了指水面，“从今天看到的开始。”',note:'许岚记住了我愿意请教。'}]},
  {id:'night-watch',speaker:'ze',title:'第二章 · 塘边夜话',aside:'傍晚的水车声慢慢盖过了虫鸣。阿泽收起工具，在塘埂上坐下来。',text:'小时候只觉得养塘的人自由。现在才发现，连想睡个整觉也得先安排好。你觉得最难的是什么？',options:[
    {id:'uncertainty',line:'“是做了准备，也不能保证结果。”',reply:'阿泽看着水车：“所以才得留余量。备用方案不是丢脸，是给自己留条路。”',note:'阿泽记住了我的担心。'},
    {id:'alone',line:'“是总想一个人把所有事扛下来。”',reply:'“那下次早点叫我。”他拍了拍工具箱，“帮忙也得提前安排，别等停电才想起来。”',note:'阿泽记住了我需要搭档。'},
    {id:'enjoy',line:'“辛苦归辛苦，我开始喜欢这里了。”',reply:'阿泽笑出声：“行啊。喜欢归喜欢，今晚该回去吃饭还是得回去。”',note:'阿泽记住了我的回答。'}]},
  {id:'market-talk',speaker:'zhou',title:'第三章 · 一个报价',aside:'周启沿塘走了一圈，没有急着报价。他问我要最近一次抽样记录。',text:'现在可以出虾了。再养也许规格更好，但成本和市场都在变。你准备拿什么做决定？',options:[
    {id:'cash',line:'“先看继续养下去，还能不能赚。”',reply:'周启说：“把每天的支出也算进去。卖得漂亮不如账算得清楚。”',note:'周启记住了我关注投入与收益。'},
    {id:'records',line:'“把抽样、成本和报价放在一起看。”',reply:'“这个思路好。”他提醒我，“抽样仍然只是估计，实际起捕才算数。”',note:'周启记住了我会比较证据。'}]},
  {id:'family-after',speaker:'lin',title:'第四章 · 留一盏灯',aside:'林婶把一碗热汤放到桌上。我想起前些天答应过家里的事。',text:'我知道你惦记塘里的虾。可日子不是等出了虾才开始过。下一次，你会怎么安排？',options:[
    {id:'plan',line:'“我会提前安排替班，不临时说下次。”',reply:'林婶说：“不用许大愿，能把说过的小事做到就好。”',note:'林婶记住了我愿意提前安排。'},
    {id:'honest',line:'“做不到的时候，我会早点说清楚。”',reply:'她点头：“说清楚，总比让人一直等着强。”',note:'林婶记住了我的坦诚。'}]},
  {id:'last-stretch',speaker:'chen',title:'终章前 · 这一造教我的事',aside:'日历上的空白越来越少。陈伯又沿着最初勘察的路线，陪我走了一遍。',text:'快到最后一段了。回头看，你还是刚回来时的想法吗？',options:[
    {id:'steady',line:'“更想稳住了，先把眼前的事做好。”',reply:'“那就记得，稳住也包括该停的时候肯停。”陈伯说。',note:'留下这一造的自我回顾。'},
    {id:'people',line:'“我发现，养塘也得把人照顾好。”',reply:'陈伯把手背在身后：“这句话，比你刚回来时多了点分量。”',note:'留下这一造的自我回顾。'},
    {id:'learn',line:'“我还有很多不会，但已经知道该问什么。”',reply:'他终于笑了：“知道该问什么，下一造就有了起点。”',note:'留下这一造的自我回顾。'}]},
];

// 剧情触发只读经营状态；支线选择不会暗中扣钱或改变养殖公式。
export function availableConversation(g:Campaign):Conversation|undefined {
  if(!g.story||g.pending||g.health?.pending||g.phase==='ended')return;
  const cd=g.stockingDay===null?-1:g.day-g.stockingDay;
  const thresholds:Record<string,boolean>={arrival:g.day===0,'first-water':cd>=0,'night-watch':cd>=15,'market-talk':cd>=45,'family-after':cd>=55,'last-stretch':cd>=75};
  return INTERLUDES.find(c=>thresholds[c.id]&&!g.story!.memories.some(m=>m.id===c.id));
}
export function validateNarrative(story:unknown,day:number):asserts story is Narrative {
  const s=story as Narrative;
  if(!s||s.version!==1||!s.player||!['male','female'].includes(s.player.gender)||typeof s.player.name!=='string'||!s.player.name.trim()||Array.from(s.player.name).length>12||/[\u0000-\u001f<>]/.test(s.player.name)||!Array.isArray(s.memories)||s.memories.length>INTERLUDES.length)throw Error('角色档案损坏，请恢复备份。');
  if(new Set(s.memories.map(m=>m.id)).size!==s.memories.length||s.memories.some(m=>!m||!Number.isInteger(m.day)||m.day<0||m.day>day||!INTERLUDES.find(c=>c.id===m.id)?.options.some(o=>o.id===m.answer)))throw Error('剧情记录损坏，请恢复备份。');
}
export const PREP_CAST:PersonId[]=['chen','ze','chen','chen','ze','lan','lan','lan','lan'];
export const PREP_LINES=[
  '先别急着买东西。塘尾还有积水，供电和排水的旧记录也不全。你想自己走一遍，还是请师傅一起看？',
  '我试过机器了，还能转。可排水死角和备用电源是两回事。你想先局部修整，还是这次多留一点设备余量？',
  '塘底得清理干净，谁来做都要验收。这两天你准备自己带着干，还是请队伍来帮忙？',
  '有些事急不来。给底部留够观察时间，后面才少一点猜测。你想按常规整备，还是多处理一下死角？',
  '滤网看着完整，接口也可能有旁路。我把账摊开给你：现在查，还是先按常规进水？',
  '我需要知道每一步什么时候做过。你愿意按记录完成，还是压缩一天？后面的复查会看这份记录。',
  '没测过，不能当作没问题。这次报告必须对应你实际做过的作业。准备安排复查了吗？',
  '水面平静，不等于状态稳定。接下来要连续观察三天。你自己盯，还是安排人一起记录？',
  '最后核验一次水体、设备和这批苗。通过以后，由你亲自确认数量。现在开始核验吗？',
];
