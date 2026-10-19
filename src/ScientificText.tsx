import {Fragment} from 'react';
import {scientificDisplay,plainScript} from './textNotation';
export function ScientificText({text}:{text:string}){
 const value=scientificDisplay(text),pattern=/10\^([+-]?\d+)|([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)|([₀₁₂₃₄₅₆₇₈₉₊₋]+)/g;
 const parts=[];let start=0;
 for(const match of value.matchAll(pattern)){parts.push(value.slice(start,match.index));parts.push(<Fragment key={match.index}>{match[1]!==undefined?<>10<sup>{match[1]}</sup></>:match[2]?<sup>{plainScript(match[2])}</sup>:<sub>{plainScript(match[3])}</sub>}</Fragment>);start=match.index!+match[0].length;}
 parts.push(value.slice(start));return <>{parts}</>;
}
