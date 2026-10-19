import {defineConfig} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
// 开发源保留PNG，发布目录只保留已生成且同名的WebP；不改动源码原图。
export default defineConfig({base:'./',plugins:[{name:'compact-story-assets',async closeBundle(){
 const directory=path.resolve('dist/story');
 for(const name of await fs.readdir(directory)){
  if(!name.endsWith('.png'))continue;
  await fs.access(path.join(directory,name.replace(/\.png$/,'.webp')));
  await fs.unlink(path.join(directory,name));
 }
}}]});
