import {useRef,useState} from 'react';
import {PRODUCTS,product,type Product} from './supplyCatalog';
import {freshSupply,choose,options,result,encodeSupply,decodeSupply,STAGES,type Supply,type Scenario} from './supplyEngine';
import './supply.css';
const KEY='yutangji-supply-v1',BACKUP=KEY+'-backup';
const money=(v:number)=>'¥'+v.toLocaleString('zh-CN');
function load(){try{const raw=localStorage.getItem(KEY);return {state:raw?decodeSupply(raw):freshSupply(),error:''};}catch{return {state:freshSupply(),error:'选型进度未能读取。原记录已保留，请恢复备份、导入文件，或明确重开练习。'};}}
function Reference({p}:{p:Product}){return <article className="supply-reference"><h3>{p.name}</h3><p>{p.check}</p></article>}
export default function SupplyLab({writable}:{writable:boolean}){
  const [initial]=useState(load),[s,setS]=useState(initial.state),[warning,setWarning]=useState(initial.error);
  const current=useRef(s),blocked=useRef(!!initial.error);
  const [selected,setSelected]=useState<Record<number,string>>({0:'hxn3',1:'haid-feed',2:'xiaduobao'});
  const [saved,setSaved]=useState('');
  const [reset,setReset]=useState(false),[nextScenario,setNextScenario]=useState<Scenario>('regular');
  const upload=useRef<HTMLInputElement>(null),[incoming,setIncoming]=useState<Supply|null>(null);
  const category=(['seed','feed','health'] as const)[s.stage];
  const reference=selected[s.stage];const ending=result(s);
  function commit(next:Supply,recovery=false){
    if(!writable)return;
    if(blocked.current&&!recovery){setWarning('请先处理无法读取的进度，避免覆盖原记录。');return;}
    try{const old=localStorage.getItem(KEY);if(old){try{decodeSupply(old);localStorage.setItem(BACKUP,old);}catch{/* Preserve an unreadable original until an explicit recovery. */}}
      localStorage.setItem(KEY,encodeSupply(next));setSaved('选型练习已自动保存 · '+new Date().toLocaleTimeString('zh-CN'));setWarning('');blocked.current=false;
    }catch{setWarning('本地保存失败，当前操作仍可在本页继续，请导出选型存档。');if(recovery)blocked.current=false;}
    current.current=next;setS(next);
  }
  function act(id:string){try{commit(choose(current.current,{stage:s.stage,option:id,reference:s.stage<3?reference:''}));}catch(e){setWarning(e instanceof Error?e.message:'操作失败');}}
  function download(){const url=URL.createObjectURL(new Blob([encodeSupply(current.current)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='渔塘记-采购选型进度.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <div className="supply-lab">
    <p className="caption">独立采购练习，单独存档，不影响本造经营。</p>
      <section className="card supply-scenario"><div><b>一张采购单的七天</b><p>{s.scenario==='regular'?'配送按期，后批第5日到':'配送延迟，后批第7日到'}。第2–6日每天出库30 kg。</p></div><button className="secondary" disabled={!writable} onClick={()=>{setNextScenario(s.scenario==='regular'?'delayed':'regular');setReset(true);}}>重开 / 换场景</button></section>
      <ol className="supply-steps" aria-label="采购进度">{STAGES.map((name,i)=><li key={name} className={s.stage===i?'current':s.stage>i?'done':''} aria-current={s.stage===i?'step':undefined}><span>{s.stage>i?'✓':i+1}</span>{name}</li>)}</ol>
      <div className="supply-metrics"><div><small>采购现金 · 第{s.day}日</small><strong>{money(s.cash)}</strong><span>初始 ¥12,000</span></div><div><small>已到货库存</small><strong>{s.stock} kg</strong><span>已出库 {s.used} kg</span></div><div><small>个人精力</small><strong>{s.energy} / 100</strong></div><div><small>待付款 / 预留</small><strong>{money((s.delivery?1000:0)+s.reserved)}</strong></div></div>
      {warning&&<div role="alert" className="alert">{warning}</div>}
      {!writable&&<p className="alert">本页目前只读。关闭另一游玩页面后刷新，可以继续选型。</p>}
      {!ending?<section className="card supply-workbench"><div className="supply-context"><span className="eyebrow">DECISION 0{s.stage+1} / 05</span><h2>{['苗名之外，先看这一批','备齐，还是分批到货','先知道什么，再考虑买什么','早先的安排，现在有了回声','账算完了，时间给谁'][s.stage]}</h2><p>{['老周提醒你：品种是起点，交付批次还要单独核对。先选参考品种，再决定怎样完成采购核验。','本练习采购普通对虾配合饲料，选择一次备齐或分批到货。','现场变化待查。先选候选产品，再决定检测或预留预算；本步不购买、不施用产品。',`现在库存${s.stock} kg。${s.delivery?`后批100 kg确认第${s.delivery}日送达，到货再付¥1,000。`:'本次已无后续订单。'}${s.report?'复查记录已到达，可在下方时间轴查看。':'未购买检测服务，不能假装已经知道现场指标。'} 预留动保款将在本步解除。`,'七天的采购窗口结束。最后一项安排，是谁来做收尾，以及家里的约定如何交代。'][s.stage]}</p>
        {s.stage<3&&<><label className="supply-selector">{s.stage===0?'选择参考品种':s.stage===1?'查阅阶段用料':'选择待核对的健康产品'}<select value={reference} onChange={e=>setSelected({...selected,[s.stage]:e.target.value})}>{PRODUCTS.filter(p=>p.category===category).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><Reference p={product(reference)}/></>}
        {s.stage===3&&<div className="supply-pending"><b>剩余教学出库计划：60 kg</b><p>第7日到货无法补回第5–6日的缺口。</p></div>}
      </div><div className="supply-options">{options(s).map(o=><button key={o.id} disabled={!writable||blocked.current||s.cash-s.reserved<o.cost||s.energy<o.energy} onClick={()=>act(o.id)}><span><b>{o.title}</b><strong>{o.cost?money(o.cost):'不新增支出'}</strong></span><p>{o.detail}</p><small>精力 −{o.energy} →</small></button>)}</div></section>:<section className="card supply-ending"><span className="eyebrow">YOUR WEEK / 采购复盘</span><h2>{ending.title}</h2><p>{ending.reason}</p><div className="supply-recap"><p><b>现金：</b>¥12,000 − {money(ending.spent)} 已支出 = {money(s.cash)}。</p><p><b>库存：</b>累计到货 {s.used+s.stock} kg − 实际出库 {s.used} kg = 结余 {s.stock} kg；原计划缺口 {s.shortfall} kg。</p><p><b>动保：</b>参考 {product(s.choices[2].reference).name}；实际采购 0，实际施用 0。{s.report?'检测/复查服务产生了信息记录。':'选择核验标签并预留预算，预留款已释放。'}</p><p><b>生活：</b>{s.family?'你支付替班费，兑现了本周家庭约定。':'你自己收尾，与家人改期；本周约定仍未兑现。'}</p><p><b>为何有这个结果：</b>{s.choices[1].option==='bulk'?'集中采购占用更多前期资金与精力，货已提前到齐。':'分批采购保留了前期现金，但后批费用与到货日期都进入了后续结算。'}{s.choices[3].option==='express'?'应急采购增加40 kg库存，同时新增¥600支出。':''}</p></div><button className="primary" onClick={()=>{setNextScenario(s.scenario==='regular'?'delayed':'regular');setReset(true);}} disabled={!writable}>换个场景，再比较一次 →</button></section>}
      <details className="card supply-history" open={s.stage===5}><summary>采购时间轴与现金流水 · {s.ledger.length}条</summary>{s.ledger.length?s.ledger.map((l,i)=><article key={i}><small>第{l.day}日</small><div><b>{l.title} <span>{l.cash?money(l.cash):'无现金变化'}</span></b><p>{l.text}</p></div></article>):<p>暂无记录。</p>}</details>
      <section className="supply-save">{saved&&<p role="status">{saved}</p>}<div className="button-row"><button className="secondary" onClick={download}>导出选型进度</button><button className="secondary" disabled={!writable} onClick={()=>upload.current?.click()}>导入选型进度</button><button className="text-button" disabled={!writable} onClick={()=>{try{const raw=localStorage.getItem(BACKUP);if(!raw)throw new Error('尚无上一份备份');setIncoming(decodeSupply(raw));}catch(e){setWarning(String(e));}}}>恢复上一份备份</button></div><input ref={upload} hidden type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{if(f.size>20000)throw new Error('文件超过20KB，不是本样例进度');setIncoming(decodeSupply(await f.text()));}catch(err){setWarning(String(err));}}}/></section>
    {reset&&<div className="modal-backdrop"><section className="modal card" role="dialog" aria-modal="true" aria-label="重开采购练习"><h2>选择新的配送场景</h2><p>将替换本次选型进度，有效旧进度会保留为上一份备份。主游戏进度不受影响。</p><label>配送场景<select value={nextScenario} onChange={e=>setNextScenario(e.target.value as Scenario)}><option value="regular">配送按期 · 后批第5日到</option><option value="delayed">配送延迟 · 后批第7日到</option></select></label><div className="button-row"><button className="secondary" onClick={()=>setReset(false)}>取消</button><button className="primary" disabled={!writable} onClick={()=>{commit(freshSupply(nextScenario),true);setReset(false);}}>确认重开</button></div></section></div>}
    {incoming&&<div className="modal-backdrop"><section className="modal card" role="dialog" aria-modal="true" aria-label="恢复采购练习"><h2>恢复这份选型进度？</h2><p>第{incoming.day}日，已完成{incoming.stage}个选择。当前有效进度会先留作备份。</p><div className="button-row"><button className="secondary" onClick={()=>setIncoming(null)}>取消</button><button className="primary" disabled={!writable} onClick={()=>{commit(incoming,true);setIncoming(null);}}>确认恢复</button></div></section></div>}
  </div>;
}
