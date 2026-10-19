import ts from 'typescript';
import fs from 'node:fs';
const normalize=raw=>{const quoted=[...raw.matchAll(/“([^”]+)”/g)].map(m=>m[1]);const narrated=/^(?:陈伯|许岚|阿泽|林婶|周启|她|他)[^“]{0,35}[：“]/.test(raw)||raw.startsWith('“');return(quoted.length&&narrated?quoted.join(''):raw).replace(/[“”]/g,'').replace(/→|↗/g,'').trim();};
const hash=text=>{let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16);};
const texts=new Set();
for(const name of ['src/StoryExperience.tsx','src/narrative.ts','src/health.ts','src/campaignContent.ts','src/sceneAudio.ts']){
 const source=ts.createSourceFile(name,fs.readFileSync(name,'utf8'),ts.ScriptTarget.Latest,true,name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 function visit(node){if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){const value=normalize(node.text);if(value.length>=5&&/[。？！？，]/.test(value)&&/[\u4e00-\u9fff]/.test(value)&&!value.includes('<')&&!value.includes('className'))texts.add(value);}ts.forEachChild(node,visit);}visit(source);
}
const rows=[...texts].sort().map(text=>({key:hash(text),text}));
if(new Set(rows.map(x=>x.key)).size!==rows.length)throw Error('音频键冲突');
fs.mkdirSync('public/audio/voices',{recursive:true});
fs.writeFileSync('scripts/audio-lines.json',JSON.stringify(rows,null,2));console.log(rows.length+' 条静态文本');
