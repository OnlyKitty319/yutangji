// 只处理科学计数法和真正的上下标；普通金额、日期和角色名不改写。
const superChars='⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻',subChars='₀₁₂₃₄₅₆₇₈₉₊₋',normal='0123456789+-';
export const plainScript=(s:string)=>Array.from(s,c=>{const i=superChars.indexOf(c),j=subChars.indexOf(c);return i>=0?normal[i]:j>=0?normal[j]:c;}).join('');
export const scientificDisplay=(s:string)=>s.replace(/\b(\d+(?:\.\d+)?)[eE]([+-]?\d+)\b/g,(_,base,power)=>`${base} × 10^${Number(power)}`);
export function spokenNotation(s:string){return scientificDisplay(s).replace(/10\^([+-]?\d+)/g,(_,p)=>`10的${p.startsWith('-')?'负'+p.slice(1):p.replace(/^\+/,'')}次方`).replace(/10([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g,(_,p)=>`10的${plainScript(p).replace('-','负').replace('+','')}次方`).replace(/×/g,'乘以').replace(/m[³]/g,'立方米').replace(/m[²]/g,'平方米').replace(/mg\b/g,'毫克').replace(/mL\b/g,'毫升');}
