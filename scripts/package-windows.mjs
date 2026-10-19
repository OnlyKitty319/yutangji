import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.resolve(process.argv[2]||path.join(root,'release','渔塘记-1.0.0-trial.3-Windows-x64'));
// 不覆盖已有发布目录，避免误删玩家或开发者的文件。
try{await fs.access(target);throw Error('输出目录已存在，请使用新的空目录：'+target);}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.cp(path.join(root,'node_modules','electron','dist'),target,{recursive:true});
await fs.rename(path.join(target,'electron.exe'),path.join(target,'渔塘记.exe'));
const appDir=path.join(target,'resources','app');await fs.mkdir(appDir,{recursive:true});
await fs.cp(path.join(root,'dist'),path.join(appDir,'dist'),{recursive:true});
await fs.cp(path.join(root,'desktop'),path.join(appDir,'desktop'),{recursive:true});
await fs.copyFile(path.join(root,'THIRD_PARTY_LICENSES.txt'),path.join(target,'THIRD_PARTY_LICENSES.txt'));
await fs.copyFile(path.join(root,'AUDIO_CREDITS.txt'),path.join(target,'AUDIO_CREDITS.txt'));
await fs.writeFile(path.join(appDir,'package.json'),JSON.stringify({name:'yutangji-earthen',productName:'渔塘记',version:'1.0.0-trial.3',main:'desktop/main.cjs'},null,2));
// Electron运行时自带的许可证必须随完整分享包保留。
const {rcedit}=await import('rcedit');
await rcedit(path.join(target,'渔塘记.exe'),{icon:path.join(root,'desktop','icon.ico'),'file-version':'1.0.0.0','product-version':'1.0.0.0','version-string':{ProductName:'渔塘记',FileDescription:'渔塘记',OriginalFilename:'渔塘记.exe',InternalName:'Yutangji',CompanyName:'渔塘记项目',LegalCopyright:'游戏素材与代码权利归各自权利人所有'}});
await fs.writeFile(path.join(target,'先读我.txt'),'渔塘记 · Windows x64\r\n完整解压本文件夹，然后双击“渔塘记.exe”。无需安装Node.js。\r\n分享时请发送整个压缩包，不要只发EXE。\r\n本包未作数字签名。\r\n存档位于 %APPDATA%\\Yutangji-Earthen-120 ，请在游戏存档页导出备份。\r\n网页和桌面进度不自动同步，可通过导出/导入转移。\r\n');
console.log(target);
