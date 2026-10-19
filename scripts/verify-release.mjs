import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
const root=path.resolve('dist'),desktop=process.argv[2];
const walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(async x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]))).flat();
const files=await walk(root),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let compared=0;for(const f of files){const b=await fs.readFile(f);if(f.endsWith('.png')&&b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('图片头错误 '+f);if(desktop){const other=await fs.readFile(path.join(desktop,'resources/app/dist',path.relative(root,f)));if(hash(b)!==hash(other))throw Error('双端资源不一致 '+f);compared++;}}
// 检查实际生产构建的HTTP路径；这不能替代真实浏览器操作。
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let rel=url.pathname.replace(/^\/yutangji\//,'/');if(rel==='/')rel='/index.html';const target=path.resolve(root,'.'+rel);if(!target.startsWith(root+path.sep))throw Error('路径越界');res.end(await fs.readFile(target));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;let urls=0,httpError=null;
try{for(const prefix of ['/','/yutangji/']){const base=`http://127.0.0.1:${port}${prefix}`,page=await fetch(base);if(!page.ok)throw Error('首页失败');const html=await page.text();urls++;for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(match[1].startsWith('http'))continue;const r=await fetch(new URL(match[1],base));if(!r.ok)throw Error('构建资源404 '+match[1]);await r.arrayBuffer();urls++;}const png=path.relative(root,files.find(x=>x.includes(path.sep+'story'+path.sep)&&x.endsWith('.webp'))).replaceAll('\\','/');const r=await fetch(new URL(png,base));if(!r.ok)throw Error('场景图片404');await r.arrayBuffer();urls++;}}catch(e){if(e.cause?.code!=='EACCES')throw e;httpError='EACCES: 本机HTTP连接被环境限制';}finally{await new Promise(resolve=>server.close(resolve));}
const html=await fs.readFile(path.join(root,'index.html'),'utf8');let staticReferences=0;for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(m[1].startsWith('http'))continue;await fs.access(path.resolve(root,m[1]));staticReferences++;}
const report={version:'1.0.0-trial.3',files:files.length,png:files.filter(x=>x.endsWith('.png')).length,webp:files.filter(x=>x.endsWith('.webp')).length,desktopHashesCompared:compared,staticReferences,httpRequestsPassed:urls,httpError,realBrowserTested:false,exeLaunched:false};
await fs.writeFile('release-verification-1.0.0-trial.3.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
