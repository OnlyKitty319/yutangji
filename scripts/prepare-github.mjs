import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'docs');
// GitHub Pages使用main分支docs目录；无需自定义收费构建服务。
// 不删除旧文件：拒绝覆盖，更新时先保存旧docs再以新空目录生成。
try{await fs.access(dest);throw Error('docs目录已存在，请先备份旧目录，再生成新版本。');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.cp(path.join(root,'dist'),dest,{recursive:true});
await fs.copyFile(path.join(root,'THIRD_PARTY_LICENSES.txt'),path.join(dest,'THIRD_PARTY_LICENSES.txt'));
await fs.writeFile(path.join(dest,'.nojekyll'),'');
console.log('GitHub Pages docs已准备：'+dest);
