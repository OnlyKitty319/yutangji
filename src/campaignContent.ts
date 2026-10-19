// 金额（分）、时长和生产参数全部是游戏设定，不是现实作业方案。
export const CAMPAIGN_RULES = 'earthen-1.0.0';
export const MODES = [
  {id:'earthen',name:'土塘',version:'V1',released:true,description:'接手一口家塘。从勘察、整备开始，把第一造养到出虾。'},
  {id:'greenhouse',name:'小棚',version:'V2',released:false,description:'更紧凑的空间，更细致的日常管理。土塘成功后获得资格。'},
  {id:'elevated',name:'高位池',version:'V3',released:false,description:'更高的设施投入，更多关于负荷与周转的选择。'},
  {id:'industrial',name:'工厂化',version:'V4',released:false,description:'系统协同、生产组织与持续运行。留待未来篇章。'},
] as const;
export type PrepOption = {id:string;name:string;cost:number;days:number;detail:string;capital?:boolean};
export const PREPARATION: {id:string;name:string;question:string;gate:string;options:PrepOption[]}[] = [
  {id:'P00',name:'勘察与方案',question:'塘尾有积水，旧设备能转，但供电和排水记录不全。先摸清哪些问题？',gate:'现场勘察与待核实项已记录',options:[
    {id:'walk',name:'自己踏勘，列出疑点',cost:30000,days:2,detail:'花费较少；后续试运行还需核实隐蔽接口。'},
    {id:'survey',name:'请师傅一起勘察',cost:70000,days:2,detail:'多花¥400，提前查出过滤接口问题，后续复查省一天。'}]},
  {id:'P01',name:'基建设备整备',question:'排水死角不会自己消失。把钱花在改造上，还是给后续维护留出预算？',gate:'排水、过滤、增氧与供电试运行已记录',options:[
    {id:'local',name:'局部修整 · 低负荷经营',cost:220000,days:4,capital:true,detail:'保留排水死角；后期需清理。基础增氧、无备用电源。适合8万尾。'},
    {id:'rebuild',name:'系统整备 · 多留设备余量',cost:620000,days:6,capital:true,detail:'排水整备、较大增氧余量与备用电源；多用2天，仍需维护与燃料。'}]},
  {id:'P02',name:'清杂',question:'你可以亲自组织清理，也可以请工人帮助完成。',gate:'清理记录齐全并完成现场检查',options:[
    {id:'self',name:'自己组织清理',cost:50000,days:2,detail:'少花现金，消耗12点精力。'},
    {id:'crew',name:'请清理队协作',cost:90000,days:2,detail:'保留精力；同样需要现场验收。'}]},
  {id:'P03',name:'底质整备',question:'底部状态需要等待和检查，付费不能跳过必要的观察。',gate:'等待完成，底部检查留档',options:[
    {id:'basic',name:'常规整备与观察',cost:80000,days:7,detail:'完成七天任务；局部改造路线仍保留日后维护需求。'},
    {id:'extra',name:'加做死角处理',cost:140000,days:8,detail:'多1天、¥600，降低初期底部负担；不能永久免维护。'}]},
  {id:'P04',name:'进水与过滤',question:'滤网完整不等于接口没有旁路。是否把接口检查也做在前面？',gate:'进水与接口检查通过',options:[
    {id:'standard',name:'常规过滤与进水',cost:45000,days:2,detail:'若勘察未核实接口，验收时会要求修复后再试。'},
    {id:'checked',name:'加做接口检查',cost:65000,days:2,detail:'先修补隐蔽旁路，多¥200，减少返工等待。'}]},
  {id:'P05',name:'水体准备',question:'过程记录不全会影响后面的复查。选择作业组织方式。',gate:'任务完成、处理过程有记录',options:[
    {id:'recorded',name:'按记录完成作业',cost:90000,days:3,detail:'保留完整作业记录。'},
    {id:'rushed',name:'赶进度，压缩作业',cost:65000,days:2,detail:'先少花¥250、少1天；记录缺口会在残留复查时要求补做，未必更划算。'}]},
  {id:'P06',name:'残留复查',question:'“未检测”不是“未检出”。先取得对应本次作业的有效报告。',gate:'报告与当前处理记录对应',options:[
    {id:'test',name:'安排复查并留档',cost:30000,days:1,detail:'若上一阶段记录不全，必须先补做再复查，不能反复付款刷通过。'}]},
  {id:'P07',name:'做水稳水',question:'给观察留下连续时间，再决定是否适合进入试苗。',gate:'连续观察完成，预警已处理',options:[
    {id:'watch',name:'自己连续观察',cost:45000,days:3,detail:'消耗8点精力；记录有效后方可继续。'},
    {id:'assisted',name:'安排协作观察',cost:75000,days:3,detail:'多花¥300保留精力，增加家庭协作。'}]},
  {id:'P08',name:'试苗与放苗验收',question:'先核验水体、设备和本次苗种批次，再确认数量。',gate:'本次试苗与批次记录通过，等待玩家确认放苗',options:[
    {id:'batch',name:'试苗与批次核验',cost:40000,days:1,detail:'记录只对应本局当前苗批次；此阶段不扣苗款、不自动放苗。'}]},
];
export const FEEDS = [
  {id:'careful',name:'谨慎',factor:.8,range:'参考量的75%—90%',detail:'现金与底部负担较低，生长可能放慢。'},
  {id:'balanced',name:'均衡',factor:1,range:'参考量的90%—110%',detail:'兼顾生长与消耗，需结合观察调整。'},
  {id:'push',name:'加量',factor:1.2,range:'参考量的110%—125%',detail:'增加消耗和残饵负担，生长收益有上限。'},
] as const;
export const EVENTS = {
  drain:{title:'塘尾又留下一片积水',text:'勘察时留下的排水死角，现在遇上了持续投喂的负荷。选过局部修整的你，需要兑现后续维护安排。',choices:[
    {id:'clean',title:'请人清理并记录',detail:'¥800；底部负担降低，减轻本造死角影响，设备仍需维护。',cost:80000},
    {id:'light',title:'先降低负荷',detail:'立即改为谨慎投喂；底部负担缓慢下降，可能少长一些。',cost:0}]},
  weather:{title:'连续阴雨的预报',text:'未来几天可能有供电与增氧压力。预报并不意味着一定停电；准备也只能减少部分影响。',choices:[
    {id:'backup',title:'检修备用电源 / 租用并试机',detail:'已有备用设备¥200，否则¥900；覆盖本次天气窗口，燃料和试机已计费。',cost:0},
    {id:'watch',title:'自己留塘，降低投喂',detail:'精力−18；切换谨慎投喂，不能代替备用电源。',cost:0}]},
  family:{title:'答应家人的那一天',text:'林婶提醒你为家里留出半天。塘里也需要有人照应，选择会在三天后兑现。',choices:[
    {id:'relief',title:'安排替班，按时赴约',detail:'现在付¥450；三天后增加家庭协作并恢复精力。',cost:45000},
    {id:'explain',title:'说明情况，约好之后补上',detail:'现在不花钱；三天后消耗精力、协作下降，出虾复盘会保留这次选择。',cost:0}]},
  market:{title:'收购商发来询价',text:'报价随日期变化。当前估计不是保证收入：可以落袋，也可以承担后续成本继续养。',choices:[
    {id:'sell',title:'按今日报价出虾',detail:'按实际起捕量成交，起捕费¥800；立即结束本造。',cost:0},
    {id:'wait',title:'继续养，之后自行决定',detail:'继续承担每日成本、天气和市场变化；出虾按钮保持开放。',cost:0}]},
  funds:{title:'下一日资源不足',text:'时间已暂停，尚未扣除下一日费用。可先在经营区购料或调整策略，再继续；也可按当前条件止损。',choices:[
    {id:'retry',title:'已调整，重新检查',detail:'继续前检查现金和饲料，不凭空补贴或借款。',cost:0},
    {id:'sell',title:'按当前条件出虾回款',detail:'放苗满45天按正常报价成交；未满45天按清塘价结算。',cost:0},
    {id:'stop',title:'结束这一造并止损',detail:'在塘虾按今日报价65%出售，费用与未付尾款全部入账。',cost:0}]},
  limit:{title:'经营第120天，做最后的决定',text:'本局时间预算已用完。日期不会让虾自动成熟，按实际状态完成结算。',choices:[
    {id:'sell',title:'完成出虾结算',detail:'放苗满45天可正常出售；不足45天按清塘折价结算。',cost:0},
    {id:'stop',title:'止损结束',detail:'准备期结束或按65%清塘价结算；保留投入与历史记录。',cost:0}]},
} as const;
export type EventId = keyof typeof EVENTS;
