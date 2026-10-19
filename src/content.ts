export const RULES = {
  version: '0.2.0', initialCash: 4_800_000, feedPrice: 800, maxDay: 84,
  depreciation: 120_000, minimumSaleDay: 45,
} as const;
export type EventId = 'prepare' | 'night' | 'family' | 'return' | 'promise' | 'sale' | 'funds' | 'limit';
export interface Choice { id: string; title: string; detail: string; cost?: number }
export const EVENTS: Record<EventId, {title:string; person:string; label:string; text:string; choices:Choice[]}> = {
  prepare: { title:'一场雨，三份承诺', person:'阿岚 · 家人', label:'事件链 01 / 提前准备', text:'第30—32日可能出现不利天气。租赁点还留着一套备用供电设备，老周也愿意帮忙。阿岚提醒你：第31日，说好一起回家吃饭。你准备怎样安排？', choices:[
    {id:'backup',title:'租备用供电',detail:'保障3夜供电，包含运行费；仍需巡查，不提升增氧能力。',cost:126000},
    {id:'friend',title:'请老周协助值守',detail:'支付服务费；第34日须回帮或另安排人手。无法解决停电。',cost:50000},
    {id:'self',title:'自己守塘',detail:'不增加现金支出；3夜值守消耗精力。停电仍会影响设备。'},
  ]},
  night: {title:'风起之前，再看一眼塘',person:'塘边手记',label:'事件链 02 / 管理选择',text:'天气窗口即将开始。现在可以调整策略，或者花钱获取一份新记录。预报说明的是可能性，不是已经发生的损失。',choices:[
    {id:'keep',title:'沿用当前策略',detail:'继续按已设定的投喂与增氧计划执行。'},
    {id:'cautious',title:'改用谨慎投喂',detail:'降低投喂与潜在生长速度；此策略持续到你再次修改。'},
    {id:'sample',title:'付费抽样再判断',detail:'更新规格与生物量估计；不会改善池塘本身。',cost:20000},
  ]},
  family: {title:'明天，能按约回家吗？',person:'阿岚 · 家人',label:'事件链 03 / 时间与生活',text:'家里已经开始准备明天的饭。你可以按约参加、请人替班，或认真商量改期。备用电源不能替你巡视，邻塘协助则已包含这段值守。',choices:[
    {id:'attend',title:'按约参加',detail:'完成约定。若没有老周协助，明日少一次额外巡查，响应能力降低。'},
    {id:'relief',title:'安排临时外援后参加',detail:'完成约定，并保留巡查覆盖。',cost:50000},
    {id:'postpone',title:'协商改到第39日',detail:'明天留守；新承诺将进入日历，需要随后兑现。'},
  ]},
  return: {title:'互助，也轮到你出一份力',person:'老周 · 邻塘经营者',label:'事件链 04 / 合作履约',text:'老周请你明天按约帮忙。这会占用一次额外巡查时段。你也可以安排他认可的人手，或协商延期。',choices:[
    {id:'help',title:'明天亲自回帮',detail:'消耗12点精力；明日少一次自己的额外巡查，完成合作承诺。'},
    {id:'pay',title:'安排替代人手',detail:'支付服务费，保留个人时间，完成合作承诺。',cost:50000},
    {id:'delay',title:'请求延到第40日',detail:'老周已同意这一次延期；到期仍须实际安排。'},
  ]},
  promise: {title:'约定的日子又到了',person:'承诺日历',label:'事件链 / 延迟后果',text:'之前改期的安排，现在需要做出最后选择。兑现会占用明天的个人巡查时段；再放下它，关系也会留下记录。',choices:[
    {id:'fulfill',title:'按新约定安排',detail:'消耗个人时段与12点精力；到期记为完成。'},
    {id:'break',title:'这次仍无法赴约',detail:'记录失约；家庭协作或下一造互助资格受到影响。'},
  ]},
  sale: {title:'先回款，还是再等一周？',person:'陈姐 · 收购商',label:'事件链 05 / 收获窗口',text:'今天有一份即时结清的报价。继续养可能增加重量，也会继续付出饲料、电费和时间。未来报价不保证更高。',choices:[
    {id:'sell',title:'按今日报价全塘出售',detail:'按实际起捕量结算，扣除800元起捕费用；结束本造。'},
    {id:'wait',title:'继续养，7日后复查',detail:'逐日运行并扣费；遇到预警或资金不足会提前暂停。'},
    {id:'sample',title:'先抽样，再做决定',detail:'支付检测费后回到本选择；同日不重复收费抽样。',cost:20000},
  ]},
  funds: {title:'下一日的资源不足',person:'经营提醒',label:'自动暂停',text:'系统没有扣款，也没有推进日期。请补充库存、修改运行策略或处理本造；不会自动借钱，也不会产生负数库存。',choices:[
    {id:'resume',title:'返回检查账本与策略',detail:'资源问题解决后可继续；继续不足时仍会暂停。'},
    {id:'exit',title:'提前清塘并结算',detail:'按现有在塘量和今日清塘折价结算，扣起捕费；未履行承诺保留在回顾中。'},
  ]},
  limit: {title:'这一造，该落下句点了',person:'塘边手记',label:'样例终点',text:'已到本样例第84日。现在完成全塘销售与账目结算，查看这一造如何改变资金和人与人的关系。',choices:[{id:'sell',title:'出售并完成复盘',detail:'按今日报价与实际起捕量结算，扣除800元起捕费用。'}]},
};
